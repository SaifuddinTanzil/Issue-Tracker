"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import type { IssueStatus, Severity, Category, Environment } from "@/lib/mock-data"

export interface CreateIssueInput {
  applicationId: string
  environment: string
  module: string
  title: string
  category: string
  severity: string
  expectedResult: string
  actualResult: string
  reproductionSteps: string[]
  attachments: string[]
  systemMetadata?: {
    userAgent: string
    platform: string
    language: string
    screenResolution: string
    timestamp: string
  }
}

export interface CreatedIssue {
  id: string
  title: string
  application: string
  status: IssueStatus
  severity: Severity
  category: Category
  environment: Environment
  assignedTo: string
  reporter: string
  reporterId?: string
  reporterEmail?: string
  createdAt: string
  module: string
  expectedResult: string
  actualResult: string
  reproductionSteps: string[]
  attachments: string[]
  vendorId?: string
}

function readText(row: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return fallback
}

function readStringArray(row: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = row[key]
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string")
    }
  }
  return []
}

function extractMissingColumn(errorMessage: string): string | null {
  const match = errorMessage.match(/Could not find the '([^']+)' column/i)
  return match?.[1] ?? null
}

function normalizeIssueRow(row: Record<string, unknown>): CreatedIssue {
  return {
    id: readText(row, ["id"], ""),
    title: readText(row, ["title"], "Untitled issue"),
    application: readText(row, ["application", "app_name", "application_name"], "Unknown App"),
    status: readText(row, ["status"], "open") as IssueStatus,
    severity: readText(row, ["severity"], "medium") as Severity,
    category: readText(row, ["category"], "bug") as Category,
    environment: readText(row, ["environment"], "Ho-uat") as Environment,
    assignedTo: readText(row, ["assignedTo", "assigned_to", "assignee", "assigned_user"], "Unassigned"),
    reporter: readText(row, ["reporter", "reporter_email"], "Unknown User"),
    reporterId: readText(row, ["reporterId", "reporter_user_id", "reporter_id"], "") || undefined,
    reporterEmail: readText(row, ["reporterEmail", "reporter_email"], "") || undefined,
    createdAt: readText(row, ["createdAt", "created_at"], new Date().toISOString()),
    module: readText(row, ["module"], "General"),
    expectedResult: readText(row, ["expectedResult", "expected_result"], ""),
    actualResult: readText(row, ["actualResult", "actual_result"], ""),
    reproductionSteps: readStringArray(row, ["reproductionSteps", "reproduction_steps"]),
    attachments: readStringArray(row, ["attachments"]),
    vendorId: readText(row, ["vendorId", "vendor_id"], "") || undefined,
  }
}

async function insertWithFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const mutablePayload: Record<string, unknown> = { ...payload }

  for (let attempt = 0; attempt < 14; attempt++) {
    const { data, error } = await supabase.from("issues").insert([mutablePayload]).select("*").single()

    if (!error) {
      return (data ?? {}) as Record<string, unknown>
    }

    const missingColumn = extractMissingColumn(error.message)
    if (!missingColumn || !(missingColumn in mutablePayload)) {
      throw new Error(`Failed to insert issue: ${error.message}`)
    }

    delete mutablePayload[missingColumn]
  }

  throw new Error("Failed to insert issue: too many schema mismatch retries")
}

async function getSignedInUserOrThrow(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error("Unauthorized: no active session")
  }

  return user
}

async function getManagedProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email?: string | null,
) {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, role, assigned_apps, vendor_id")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`)
  }

  return {
    id: userId,
    email: (data?.email as string | null | undefined) ?? email ?? "",
    role: ((data?.role as string | null | undefined) ?? "reporter").toLowerCase(),
    assignedApps: Array.isArray(data?.assigned_apps)
      ? data.assigned_apps.filter((item): item is string => typeof item === "string")
      : [],
    vendorId: (data?.vendor_id as string | null | undefined) ?? null,
  }
}

async function listAccessibleAppNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: { role: string; assignedApps: string[]; vendorId: string | null },
): Promise<string[]> {
  if (profile.role === "admin") {
    const { data, error } = await supabase.from("apps").select("name")
    if (error) throw new Error(`Failed to list apps: ${error.message}`)
    return Array.isArray(data) ? data.map((row) => String(row.name)).filter(Boolean) : []
  }

  const appSet = new Set<string>(profile.assignedApps)

  if (profile.vendorId) {
    const { data, error } = await supabase
      .from("apps")
      .select("name")
      .eq("vendor_id", profile.vendorId)

    if (error) throw new Error(`Failed to list vendor apps: ${error.message}`)

    if (Array.isArray(data)) {
      for (const row of data) {
        if (row?.name) appSet.add(String(row.name))
      }
    }
  }

  return Array.from(appSet)
}

export async function getMyIssues(): Promise<CreatedIssue[]> {
  const supabase = await createClient()
  const user = await getSignedInUserOrThrow(supabase)

  const orFilter = [
    `reporter_id.eq.${user.id}`,
    `reporter_user_id.eq.${user.id}`,
    user.email ? `reporter_email.eq.${user.email}` : null,
  ]
    .filter(Boolean)
    .join(",")

  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .or(orFilter)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to load my issues: ${error.message}`)
  }

  return Array.isArray(data) ? data.map((row) => normalizeIssueRow(row as Record<string, unknown>)) : []
}

export async function getAllIssues(): Promise<CreatedIssue[]> {
  const supabase = await createClient()
  const user = await getSignedInUserOrThrow(supabase)
  const profile = await getManagedProfile(supabase, user.id, user.email)

  if (profile.role === "admin") {
    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(`Failed to load issues: ${error.message}`)
    }

    return Array.isArray(data) ? data.map((row) => normalizeIssueRow(row as Record<string, unknown>)) : []
  }

  const accessibleApps = await listAccessibleAppNames(supabase, profile)
  const collected: Record<string, unknown>[] = []

  if (accessibleApps.length > 0) {
    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .in("app_name", accessibleApps)

    if (error) {
      throw new Error(`Failed to load app-scope issues: ${error.message}`)
    }

    if (Array.isArray(data)) {
      collected.push(...(data as Record<string, unknown>[]))
    }
  }

  if (profile.vendorId) {
    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .eq("vendor_id", profile.vendorId)

    if (error) {
      throw new Error(`Failed to load vendor-scope issues: ${error.message}`)
    }

    if (Array.isArray(data)) {
      collected.push(...(data as Record<string, unknown>[]))
    }
  }

  const deduped = new Map<string, Record<string, unknown>>()
  for (const row of collected) {
    const key = readText(row, ["id"], "")
    if (key) deduped.set(key, row)
  }

  return Array.from(deduped.values())
    .map((row) => normalizeIssueRow(row))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function createIssue(input: CreateIssueInput): Promise<CreatedIssue> {
  const supabase = await createClient()

  const user = await getSignedInUserOrThrow(supabase)

  const fallbackName = user.email?.split("@")[0] || "Reporter"
  await supabase.from("users").upsert({
    id: user.id,
    email: user.email,
    name: fallbackName,
    avatar: fallbackName.slice(0, 2).toUpperCase(),
    role: "Reporter",
  })

  const { data: appRow, error: appError } = await supabase
    .from("apps")
    .select("id, name, vendor_id")
    .eq("id", input.applicationId)
    .maybeSingle()

  if (appError) {
    throw new Error(`Failed to resolve application: ${appError.message}`)
  }

  if (!appRow) {
    throw new Error("Selected application was not found")
  }

  const payload: Record<string, unknown> = {
    title: input.title,
    app_name: appRow.name,
    status: "open",
    severity: input.severity || "medium",
    category: input.category || "bug",
    environment: input.environment || "Ho-uat",
    assigned_to: "Unassigned",
    reporter: user.email || fallbackName,
    reporter_id: user.id,
    reporter_user_id: user.id,
    reporter_email: user.email || null,
    created_at: new Date().toISOString(),
    module: input.module || "General",
    expected_result: input.expectedResult || "",
    actual_result: input.actualResult || "",
    reproduction_steps: input.reproductionSteps || [],
    attachments: input.attachments || [],
    vendor_id: appRow.vendor_id ?? null,
    systemMetadata: input.systemMetadata ?? null,
  }

  const inserted = await insertWithFallback(supabase, payload)

  revalidatePath("/issues")
  revalidatePath("/my-issues")
  revalidatePath("/dashboard/issues/all")
  revalidatePath("/dashboard/issues/my-issues")

  return normalizeIssueRow(inserted)
}
