"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export interface Vendor {
  id: string
  name: string
  email: string | null
  created_at: string | null
}

export interface VendorCreateInput {
  name: string
  email?: string | null
}

function normalizeText(value?: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
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

  const role = profile?.role?.toString().trim().toLowerCase()
  if (role !== "admin") {
    throw new Error("Access denied: Admin only")
  }

  return supabase
}

/**
 * Fetch all vendors from the database
 */
export async function getAllVendors(): Promise<Vendor[]> {
  const supabase = await requireAdminClient()

  const { data, error } = await supabase
    .from("vendors")
    .select("id, name, email, created_at")
    .order("name", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    created_at: row.created_at,
  }))
}

/**
 * Create a new vendor
 */
export async function createVendor(input: VendorCreateInput): Promise<Vendor> {
  const supabase = await requireAdminClient()

  const payload = {
    name: input.name.trim(),
    email: normalizeText(input.email),
  }

  if (!payload.name) {
    throw new Error("Vendor name is required")
  }

  const { data, error } = await supabase
    .from("vendors")
    .insert(payload)
    .select("id, name, email, created_at")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/admin/vendors")
  revalidatePath("/dashboard/admin/apps")

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    created_at: data.created_at,
  }
}

/**
 * Update an existing vendor
 */
export async function updateVendor(id: string, input: VendorCreateInput): Promise<Vendor> {
  const supabase = await requireAdminClient()

  const payload = {
    name: input.name.trim(),
    email: normalizeText(input.email),
  }

  if (!payload.name) {
    throw new Error("Vendor name is required")
  }

  const { data, error } = await supabase
    .from("vendors")
    .update(payload)
    .eq("id", id)
    .select("id, name, email, created_at")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/admin/vendors")
  revalidatePath("/dashboard/admin/apps")

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    created_at: data.created_at,
  }
}

/**
 * Delete a vendor
 */
export async function deleteVendor(id: string): Promise<string> {
  const supabase = await requireAdminClient()

  const { error } = await supabase.from("vendors").delete().eq("id", id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/admin/vendors")
  revalidatePath("/dashboard/admin/apps")

  return id
}
