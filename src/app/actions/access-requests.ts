"use server"

import { createClient } from "@/lib/supabase/server"

export interface SubmitAccessRequestInput {
  requestedApp: string
}

export interface AccessRequestRecord {
  id: string
  user_id: string
  app_id: string
  created_at: string
  status: string
}

function readText(row: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return fallback
}

async function getUserOrThrow() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error("Not Authenticated")
  }

  return { supabase, user }
}

export async function submitAccessRequest(input: SubmitAccessRequestInput): Promise<AccessRequestRecord> {
  const { supabase, user } = await getUserOrThrow()

  const { data: appByName, error: lookupByNameError } = await supabase
    .from("apps")
    .select("id, name")
    .eq("name", input.requestedApp)
    .maybeSingle()

  if (lookupByNameError) {
    throw new Error(`Failed to resolve app by name: ${lookupByNameError.message}`)
  }

  const appId = appByName?.id ?? null

  if (!appId) {
    throw new Error("Selected application was not found")
  }

  const payload = {
    app_id: appId,
    user_id: user.id,
  }

  const { data, error } = await supabase
    .from("app_access_requests")
    .insert(payload)
    .select("id, user_id, app_id, created_at, status")
    .single()

  console.error("SUPABASE ERROR:", error)

  if (error || !data) {
    throw new Error(`Failed to submit access request: ${error?.message ?? "unknown error"}`)
  }

  try {
    const { data: admins, error: adminsError } = await supabase
      .from("users")
      .select("id")
      .eq("role", "admin")

    if (adminsError) {
      throw adminsError
    }

    if (Array.isArray(admins)) {
      for (const admin of admins) {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: admin.id,
            title: "New Access Request",
            message: `User ${user.id} requested access to app ${appId}.`,
            is_read: false,
            created_at: new Date().toISOString(),
          })

        console.error("SUPABASE ERROR:", notificationError)
      }
    }
  } catch (notificationError) {
    console.error("Failed to create notification for access request:", notificationError)
  }

  return {
    id: readText(data as Record<string, unknown>, ["id"]),
    user_id: readText(data as Record<string, unknown>, ["user_id"]),
    app_id: readText(data as Record<string, unknown>, ["app_id"]),
    created_at: readText(data as Record<string, unknown>, ["created_at"]),
    status: readText(data as Record<string, unknown>, ["status"]),
  }
}
