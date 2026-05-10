import { supabase } from "./supabase"

export type IssueStatus = "open" | "in-progress" | "ready-for-retest" | "blocked" | "closed"
export type Severity = "low" | "medium" | "high"
export type Category = "bug" | "ui-ux" | "suggestion"
export type Environment = "Ho-uat" | "field-uat" | "production"

export interface Issue {
  id: string
  title: string
  application: string
  status: IssueStatus
  severity: Severity
  category: Category
  environment: Environment
  assignedTo: string
  reporter: string
  createdAt: string
  module: string
  expectedResult: string
  actualResult: string
  reproductionSteps: string[]
  attachments: string[]
  vendorId?: string
  systemMetadata?: {
    userAgent: string
    platform: string
    language: string
    screenResolution: string
    timestamp: string
  }
}

export interface Application {
  id: string
  name: string
  shortName: string
}

export interface User {
  id: string
  name: string
  avatar: string
  email: string
}

export interface AppNotification {
  id: string
  userId: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  linkHref?: string
}

// Kept applications and users so your UI dropdowns still have options
export const applications: Application[] = [
  { id: "app-1", name: "BRAC Microfinance Portal", shortName: "MFP" },
  { id: "app-2", name: "HR Management System", shortName: "HRMS" },
  { id: "app-3", name: "Inventory Tracker", shortName: "INV" },
  { id: "app-4", name: "Customer Relations Portal", shortName: "CRP" },
]

export const users: User[] = [
  { id: "user-1", name: "Sarah Ahmed", avatar: "SA", email: "sarah@brac.net" },
  { id: "user-2", name: "Rafiq Hassan", avatar: "RH", email: "rafiq@brac.net" },
  { id: "user-3", name: "Nadia Khan", avatar: "NK", email: "nadia@brac.net" },
  { id: "user-4", name: "Imran Ali", avatar: "IA", email: "imran@brac.net" },
  { id: "user-5", name: "Fatima Begum", avatar: "FB", email: "fatima@brac.net" },
]

// 🚀 CLEAN SLATE: All legacy dummy data removed to prevent UI crashes
export const issues: Issue[] = []

export type IssueComment = any; // Type simplified for clean slate
const commentsData: IssueComment[] = []
export const comments: IssueComment[] = commentsData;

export const mockNotifications: AppNotification[] = []

export const statusConfig: Record<IssueStatus, { label: string; color: string; bgColor: string }> = {
  open: { label: "Open", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200" },
  "in-progress": { label: "In Progress", color: "text-indigo-700", bgColor: "bg-indigo-50 border-indigo-200" },
  "ready-for-retest": { label: "Ready for Retest", color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200" },
  blocked: { label: "Blocked", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200" },
  closed: { label: "Closed", color: "text-gray-700", bgColor: "bg-gray-100 border-gray-300" },
}

export const severityConfig: Record<Severity, { label: string; color: string; dotColor: string }> = {
  low: { label: "Low", color: "text-gray-600", dotColor: "bg-gray-400" },
  medium: { label: "Medium", color: "text-amber-600", dotColor: "bg-amber-500" },
  high: { label: "High", color: "text-red-600", dotColor: "bg-red-500" },
}

export const categoryConfig: Record<Category, { label: string; color: string }> = {
  bug: { label: "Bug", color: "text-red-700 bg-red-50" },
  "ui-ux": { label: "UI/UX", color: "text-blue-700 bg-blue-50" },
  suggestion: { label: "Suggestion", color: "text-emerald-700 bg-emerald-50" },
}

export function getIssueStats(filteredIssues: Issue[] = issues) {
  return {
    total: filteredIssues.length,
    open: filteredIssues.filter((i) => i.status === "open").length,
    inProgress: filteredIssues.filter((i) => i.status === "in-progress").length,
    readyForRetest: filteredIssues.filter((i) => i.status === "ready-for-retest").length,
    closed: filteredIssues.filter((i) => i.status === "closed").length,
  }
}

type SupabaseRow = Record<string, unknown>

function readText(row: SupabaseRow, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return fallback
}

function readStringArray(row: SupabaseRow, keys: string[]): string[] {
  for (const key of keys) {
    const value = row[key]
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string")
    }
  }
  return []
}

function normalizeIssueRow(row: SupabaseRow): Issue {
  return {
    id: readText(row, ["id"], ""),
    title: readText(row, ["title"], "Untitled issue"),
    application: readText(row, ["application", "app_name", "application_name"], "Unknown App"),
    status: readText(row, ["status"], "open") as IssueStatus,
    severity: readText(row, ["severity"], "medium") as Severity,
    category: readText(row, ["category"], "bug") as Category,
    environment: readText(row, ["environment"], "Ho-uat") as Environment,
    assignedTo: readText(row, ["assignedTo", "assigned_to"], "Unassigned"),
    reporter: readText(row, ["reporter"], "Unknown User"),
    createdAt: readText(row, ["createdAt", "created_at"], new Date().toISOString()),
    module: readText(row, ["module"], "General"),
    expectedResult: readText(row, ["expectedResult", "expected_result"], ""),
    actualResult: readText(row, ["actualResult", "actual_result"], ""),
    reproductionSteps: readStringArray(row, ["reproductionSteps", "reproduction_steps"]),
    attachments: readStringArray(row, ["attachments"]),
    vendorId: readText(row, ["vendorId", "vendor_id"], "") || undefined,
    systemMetadata: (row.systemMetadata as Issue["systemMetadata"]) ?? undefined,
  }
}

function normalizeCommentRow(row: SupabaseRow): IssueComment {
  return {
    ...row,
    id: readText(row, ["id"], ""),
    issueId: readText(row, ["issueId", "issue_id"], ""),
    userId: readText(row, ["userId", "user_id"], ""),
    content: readText(row, ["content"], ""),
    is_internal: Boolean(row.is_internal),
    createdAt: readText(row, ["createdAt", "created_at"], new Date().toISOString()),
    updatedAt: readText(row, ["updatedAt", "updated_at"], new Date().toISOString()),
  }
}

function normalizeNotificationRow(row: SupabaseRow): AppNotification {
  return {
    id: readText(row, ["id"], ""),
    userId: readText(row, ["userId", "user_id"], ""),
    title: readText(row, ["title"], ""),
    message: readText(row, ["message"], ""),
    isRead: Boolean(row.isRead ?? row.is_read),
    createdAt: readText(row, ["createdAt", "created_at"], new Date().toISOString()),
    linkHref: readText(row, ["linkHref", "link_href"], "") || undefined,
  }
}

export async function getStoredIssues(): Promise<Issue[]> {
  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .order("created_at", { ascending: false })

  if (error || !Array.isArray(data)) {
    return []
  }

  return data.map((row) => normalizeIssueRow(row as SupabaseRow))
}

export async function addStoredIssue(issue: Issue): Promise<void> {
  const payload = {
    ...issue,
    vendor_id: issue.vendorId ?? null,
    app_name: issue.application,
    created_at: issue.createdAt,
    assigned_to: issue.assignedTo,
    expected_result: issue.expectedResult,
    actual_result: issue.actualResult,
    reproduction_steps: issue.reproductionSteps,
  }

  const { error } = await supabase
    .from("issues")
    .insert([payload])

  if (error) {
    console.error("Failed to insert issue:", error)
  }
}

export async function updateStoredIssue(issueId: string, updates: Partial<Issue>): Promise<void> {
  const payload: Record<string, unknown> = {
    ...updates,
  }

  if (updates.vendorId !== undefined) payload.vendor_id = updates.vendorId
  if (updates.application !== undefined) payload.app_name = updates.application
  if (updates.createdAt !== undefined) payload.created_at = updates.createdAt
  if (updates.assignedTo !== undefined) payload.assigned_to = updates.assignedTo
  if (updates.expectedResult !== undefined) payload.expected_result = updates.expectedResult
  if (updates.actualResult !== undefined) payload.actual_result = updates.actualResult
  if (updates.reproductionSteps !== undefined) payload.reproduction_steps = updates.reproductionSteps

  const { error } = await supabase
    .from("issues")
    .update(payload)
    .eq("id", issueId)

  if (error) {
    console.error("Failed to update issue:", error)
  }
}

export async function deleteStoredIssue(issueId: string): Promise<void> {
  const { error } = await supabase
    .from("issues")
    .delete()
    .eq("id", issueId)

  if (error) {
    console.error("Failed to delete issue:", error)
  }
}

export async function getStoredComments(issueId?: string): Promise<IssueComment[]> {
  let query = supabase
    .from("comments")
    .select("*")
    .order("created_at", { ascending: true })

  if (issueId) {
    query = query.eq("issue_id", issueId)
  }

  const { data, error } = await query

  if (error || !Array.isArray(data)) {
    return []
  }

  return data.map((row) => normalizeCommentRow(row as SupabaseRow))
}

export async function addStoredComment(comment: IssueComment): Promise<void> {
  const payload = {
    ...comment,
    issue_id: comment.issueId,
    user_id: comment.userId,
    is_internal: Boolean(comment.is_internal ?? comment.isInternal),
    created_at: comment.createdAt,
    updated_at: comment.updatedAt,
  }

  const { error } = await supabase
    .from("comments")
    .insert([payload])

  if (error) {
    console.error("Failed to insert comment:", error)
  }
}

export async function getStoredNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("userId", userId)
    .order("created_at", { ascending: false })

  if (error || !Array.isArray(data)) {
    return []
  }

  return data.map((row) => normalizeNotificationRow(row as SupabaseRow))
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ isRead: true })
    .eq("isRead", false)

  if (error) {
    console.error("Failed to mark notifications read:", error)
  }
}

export async function addStoredNotification(notification: AppNotification): Promise<void> {
  const payload = {
    ...notification,
    user_id: notification.userId,
    link_href: notification.linkHref,
    is_read: notification.isRead,
    created_at: notification.createdAt,
  }

  const { error } = await supabase
    .from("notifications")
    .insert([payload])

  if (error) {
    console.error("Failed to insert notification:", error)
  }
}

/**
 * Get issues filtered by user role and assigned apps.
 * - Admin role: returns all issues
 * - Reporter/Resolver: returns only issues from their assigned apps
 */
export async function getIssuesForUser(
  userRole: "Admin" | "Resolver" | "Reporter",
  assignedApps: string[],
  vendorId?: string,
): Promise<Issue[]> {
  const allIssues = await getStoredIssues()

  // Admin sees all issues
  if (userRole === "Admin") {
    return allIssues
  }

  // Resolver: return issues for the vendor OR assigned apps
  if (userRole === "Resolver") {
    return allIssues.filter(
      (issue) => (vendorId && (issue as any).vendorId === vendorId) || assignedApps.includes(issue.application),
    )
  }

  // Reporter: only issues from their assigned apps
  return allIssues.filter((issue) => assignedApps.includes(issue.application))
}