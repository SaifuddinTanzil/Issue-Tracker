"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export interface AppRecord {
  id: number
  name: string
  short_name: string | null
  vendor_id: string | null
  vendor_name: string | null
  created_at: string | null
}

export interface VendorOption {
  vendor_id: string
  vendor_name: string
}

export interface AppsPageData {
  apps: AppRecord[]
  vendors: VendorOption[]
}

export interface AppUpsertInput {
  name: string
  short_name?: string | null
  vendor_id: string
}

function normalizeText(value?: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getVendorDisplayName(
  row: Pick<VendorOption, "vendor_name"> & { email?: string | null; vendor_id: string },
) {
  return row.vendor_name?.trim() || row.email?.split("@")[0] || row.vendor_id
}

async function requireAdminClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if ((profile?.role ?? "").toString().toLowerCase() !== "admin") {
    throw new Error("Unauthorized")
  }

  return supabase
}

async function getVendorOptions() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, vendor_id")
    .not("vendor_id", "is", null)

  if (error) {
    throw new Error(error.message)
  }

  const vendorMap = new Map<string, VendorOption>()

  for (const row of data ?? []) {
    const vendorId = row.vendor_id?.trim()
    if (!vendorId) continue

    const role = (row.role ?? "").toString().toLowerCase()
    if (role !== "resolver" && role !== "vendor" && role !== "admin") {
      continue
    }

    if (vendorMap.has(vendorId)) continue

    vendorMap.set(vendorId, {
      vendor_id: vendorId,
      vendor_name: getVendorDisplayName({
        vendor_name: row.name,
        email: row.email,
        vendor_id: vendorId,
      }),
    })
  }

  return Array.from(vendorMap.values()).sort((left, right) =>
    left.vendor_name.localeCompare(right.vendor_name),
  )
}

export async function getAppsPageData(): Promise<AppsPageData> {
  const supabase = await createClient()

  const [{ data: apps, error: appsError }, vendors] = await Promise.all([
    supabase
      .from("apps")
      .select("id, name, short_name, vendor_id, created_at")
      .order("name", { ascending: true }),
    getVendorOptions(),
  ])

  if (appsError) {
    throw new Error(appsError.message)
  }

  const vendorLookup = new Map(vendors.map((vendor) => [vendor.vendor_id, vendor.vendor_name]))

  return {
    apps: (apps ?? []).map((app) => ({
      id: app.id,
      name: app.name,
      short_name: normalizeText(app.short_name),
      vendor_id: app.vendor_id,
      vendor_name: app.vendor_id ? vendorLookup.get(app.vendor_id) ?? app.vendor_id : null,
      created_at: app.created_at,
    })),
    vendors,
  }
}

export async function createApp(input: AppUpsertInput): Promise<AppRecord> {
  const supabase = await requireAdminClient()

  const payload = {
    name: input.name.trim(),
    short_name: normalizeText(input.short_name),
    vendor_id: input.vendor_id.trim(),
  }

  const { data, error } = await supabase
    .from("apps")
    .insert(payload)
    .select("id, name, short_name, vendor_id, created_at")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const vendors = await getVendorOptions()
  const vendorName = vendors.find((vendor) => vendor.vendor_id === data.vendor_id)?.vendor_name ?? data.vendor_id

  revalidatePath("/dashboard/admin/apps")

  return {
    id: data.id,
    name: data.name,
    short_name: normalizeText(data.short_name),
    vendor_id: data.vendor_id,
    vendor_name: vendorName,
    created_at: data.created_at,
  }
}

export async function updateApp(id: number, input: AppUpsertInput): Promise<AppRecord> {
  const supabase = await requireAdminClient()

  const payload = {
    name: input.name.trim(),
    short_name: normalizeText(input.short_name),
    vendor_id: input.vendor_id.trim(),
  }

  const { data, error } = await supabase
    .from("apps")
    .update(payload)
    .eq("id", id)
    .select("id, name, short_name, vendor_id, created_at")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const vendors = await getVendorOptions()
  const vendorName = vendors.find((vendor) => vendor.vendor_id === data.vendor_id)?.vendor_name ?? data.vendor_id

  revalidatePath("/dashboard/admin/apps")

  return {
    id: data.id,
    name: data.name,
    short_name: normalizeText(data.short_name),
    vendor_id: data.vendor_id,
    vendor_name: vendorName,
    created_at: data.created_at,
  }
}

export async function deleteApp(id: number): Promise<number> {
  const supabase = await requireAdminClient()

  const { error } = await supabase.from("apps").delete().eq("id", id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/admin/apps")

  return id
}