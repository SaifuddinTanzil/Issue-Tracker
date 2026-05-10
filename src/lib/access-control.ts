import { supabase } from './supabase'

export type ManagedUserRole = "Admin" | "Resolver" | "Reporter"

export interface ManagedUser {
  id: string
  email: string
  name?: string
  role: ManagedUserRole
  status: "active" | "revoked"
  assignedApps: string[]
  vendor_id?: string | null
}

export interface AccessRequest {
  id: string
  userEmail: string
  requestedApp: string
  createdAt: string
  status: "pending" | "approved" | "rejected"
}

/**
 * Normalizes a Supabase users row to ManagedUser interface
 */
function normalizeUserRow(row: any): ManagedUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name || '',
    role: (row.role || 'Reporter') as ManagedUserRole,
    status: row.status === 'revoked' ? 'revoked' : 'active',
    assignedApps: Array.isArray(row.assigned_apps) ? row.assigned_apps : [],
    vendor_id: row.vendor_id || null,
  }
}

/**
 * Fetch all managed users from Supabase
 */
export async function getManagedUsers(): Promise<ManagedUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, status, assigned_apps, vendor_id')
  
  if (error || !Array.isArray(data)) return []
  
  return data.map(row => normalizeUserRow(row))
}

/**
 * Update user roles and settings in Supabase
 */
export async function setManagedUsers(users: ManagedUser[]): Promise<void> {
  // Note: This function updates roles via individual user updates
  // In production, you'd implement a batch update or use RPC
  for (const user of users) {
    const { error } = await supabase
      .from('users')
      .update({
        role: user.role,
        status: user.status,
        assigned_apps: user.assignedApps,
      })
      .eq('id', user.id)
    
    if (error) {
      console.error(`Failed to update user ${user.id}:`, error)
    }
  }
}

/**
 * Fetch pending access requests from Supabase (if table exists)
 */
export async function getAccessRequests(): Promise<AccessRequest[]> {
  const { data, error } = await supabase
    .from('access_requests')
    .select('id, user_email, requested_app, created_at, status')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  
  if (error || !Array.isArray(data)) return []
  
  return data.map(row => ({
    id: row.id,
    userEmail: row.user_email,
    requestedApp: row.requested_app,
    createdAt: row.created_at,
    status: row.status,
  }))
}

/**
 * Update access requests in Supabase
 */
export async function setAccessRequests(requests: AccessRequest[]): Promise<void> {
  for (const request of requests) {
    const { error } = await supabase
      .from('access_requests')
      .update({
        status: request.status,
      })
      .eq('id', request.id)
    
    if (error) {
      console.error(`Failed to update access request ${request.id}:`, error)
    }
  }
}

/**
 * Submit a new access request to Supabase
 */
export async function submitAccessRequest(userEmail: string, requestedApp: string): Promise<AccessRequest> {
  const now = new Date().toISOString()
  const newRequest: AccessRequest = {
    id: `req-${Date.now()}`,
    userEmail,
    requestedApp,
    createdAt: now,
    status: "pending",
  }

  const { error } = await supabase
    .from('access_requests')
    .insert({
      id: newRequest.id,
      user_email: userEmail,
      requested_app: requestedApp,
      created_at: now,
      status: 'pending',
    })

  if (error) {
    console.error('Failed to submit access request:', error)
  }

  return newRequest
}

/**
 * Approve an access request and update user role/apps
 */
export async function approveAccessRequest(
  requestId: string,
  role: Exclude<ManagedUserRole, "Admin">
): Promise<AccessRequest | null> {
  // Fetch the request
  const { data: requestData, error: fetchError } = await supabase
    .from('access_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (fetchError || !requestData) return null

  // Mark request as approved
  const { error: updateError } = await supabase
    .from('access_requests')
    .update({ status: 'approved' })
    .eq('id', requestId)

  if (updateError) {
    console.error('Failed to approve access request:', updateError)
    return null
  }

  // Update or create user with assigned app
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', requestData.user_email)
    .single()

  if (existingUser) {
    const assignedApps = Array.isArray(existingUser.assigned_apps)
      ? existingUser.assigned_apps
      : []
    
    if (!assignedApps.includes(requestData.requested_app)) {
      assignedApps.push(requestData.requested_app)
    }

    await supabase
      .from('users')
      .update({
        role,
        status: 'active',
        assigned_apps: assignedApps,
      })
      .eq('id', existingUser.id)
  } else {
    await supabase
      .from('users')
      .insert({
        email: requestData.user_email,
        name: requestData.user_email.split('@')[0],
        role,
        status: 'active',
        assigned_apps: [requestData.requested_app],
      })
  }

  return {
    id: requestData.id,
    userEmail: requestData.user_email,
    requestedApp: requestData.requested_app,
    createdAt: requestData.created_at,
    status: 'approved',
  }
}

/**
 * Reject an access request
 */
export async function rejectAccessRequest(requestId: string): Promise<AccessRequest | null> {
  const { data: requestData } = await supabase
    .from('access_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (!requestData) return null

  const { error } = await supabase
    .from('access_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId)

  if (error) {
    console.error('Failed to reject access request:', error)
  }

  return {
    id: requestData.id,
    userEmail: requestData.user_email,
    requestedApp: requestData.requested_app,
    createdAt: requestData.created_at,
    status: 'rejected',
  }
}

/**
 * Update a user's role in Supabase
 */
export async function updateManagedUserRole(userId: string, role: ManagedUserRole): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)

  if (error) {
    console.error('Failed to update user role:', error)
  }
}

/**
 * Revoke a user's access
 */
export async function revokeManagedUserAccess(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      status: 'revoked',
      assigned_apps: [],
    })
    .eq('id', userId)

  if (error) {
    console.error('Failed to revoke user access:', error)
  }
}

/**
 * Assign apps to a user
 */
export async function assignManagedUserApps(userId: string, apps: string[]): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ assigned_apps: apps })
    .eq('id', userId)

  if (error) {
    console.error('Failed to assign apps to user:', error)
  }
}

/**
 * Get a user by email from Supabase
 */
export async function getManagedUserByEmail(email?: string | null): Promise<ManagedUser | null> {
  if (!email) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, status, assigned_apps, vendor_id')
    .eq('email', email)
    .single()

  if (error || !data) return null

  return normalizeUserRow(data)
}

/**
 * Get allowed apps for a user based on their role and vendor assignment
 * - Admin: Returns ["*"] (access to all apps)
 * - Resolver: Returns apps matching their vendor_id
 * - Reporter: Returns their assigned apps from database
 */
export async function getAllowedAppsForUser(email?: string | null, fallbackRole?: string): Promise<string[]> {
  if (!email) return []

  const user = await getManagedUserByEmail(email)
  const role = user?.role ?? (fallbackRole as ManagedUserRole | undefined)

  if (!role) return []

  // Admin sees all apps
  if (role === "Admin") {
    const { data, error } = await supabase
      .from('apps')
      .select('name')
      .order('name', { ascending: true })

    if (error || !Array.isArray(data)) return ["*"]

    return data.length > 0 ? data.map(app => app.name) : ["*"]
  }

  // Resolver sees apps matching their vendor_id
  if (role === "Resolver" && user?.vendor_id) {
    const { data, error } = await supabase
      .from('apps')
      .select('name')
      .eq('vendor_id', user.vendor_id)
      .order('name', { ascending: true })

    if (error || !Array.isArray(data)) return []

    return data.map(app => app.name)
  }

  // Reporter sees only their assigned apps from database
  return Array.isArray(user?.assignedApps) ? user.assignedApps : []
}

export function canUpdateIssue(role?: string | null): boolean {
  return role === "Admin" || role === "Resolver"
}

export function canDeleteIssue(role?: string | null): boolean {
  return role === "Admin"
}
