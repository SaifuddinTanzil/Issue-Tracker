import { supabase } from "./supabase"

export type IssueStatus = "open" | "in-progress" | "ready-for-retest" | "closed"
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

const STORAGE_KEYS = {
  issues: "uat:issues",
  comments: "uat:comments",
  notifications: "uat:notifications",
} as const

const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

function canUseLocalStorage() {
  return typeof window !== "undefined"
}

function readFromLocalStorage<T>(key: string, fallback: T): T {
  if (!canUseLocalStorage()) return fallback

  const raw = window.localStorage.getItem(key)
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeToLocalStorage<T>(key: string, value: T): void {
  if (!canUseLocalStorage()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function ensureMockDataSeeded(): void {
  if (!canUseLocalStorage()) return

  // Only seed local mock data when Supabase is NOT configured.
  if (hasSupabaseConfig) return

  if (!window.localStorage.getItem(STORAGE_KEYS.issues)) {
    writeToLocalStorage(STORAGE_KEYS.issues, issues)
  }

  if (!window.localStorage.getItem(STORAGE_KEYS.comments)) {
    writeToLocalStorage(STORAGE_KEYS.comments, commentsData)
  }

  if (!window.localStorage.getItem(STORAGE_KEYS.notifications)) {
    writeToLocalStorage(STORAGE_KEYS.notifications, mockNotifications)
  }
}

// ── Supabase Helpers ──

export async function getStoredIssues(): Promise<Issue[]> {
  ensureMockDataSeeded()

  if (!hasSupabaseConfig) {
    return readFromLocalStorage<Issue[]>(STORAGE_KEYS.issues, issues)
  }

  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .order('createdAt', { ascending: false });
    
  if (error) {
    return readFromLocalStorage<Issue[]>(STORAGE_KEYS.issues, issues)
  }
  const resolvedIssues = (data as Issue[] | null) ?? []
  // Always persist and return what Supabase returns (allow empty arrays when DB is empty)
  writeToLocalStorage(STORAGE_KEYS.issues, resolvedIssues)
  return resolvedIssues
}

export async function addStoredIssue(issue: Issue): Promise<void> {
  ensureMockDataSeeded()

  if (!hasSupabaseConfig) {
    const localIssues = readFromLocalStorage<Issue[]>(STORAGE_KEYS.issues, issues)
    writeToLocalStorage(STORAGE_KEYS.issues, [issue, ...localIssues])
    return
  }

  // Map camelCase vendorId to DB column vendor_id and ensure app_name is set
  const payload = {
    ...issue,
    vendor_id: (issue as any).vendorId ?? null,
    app_name: issue.application,
  }

  const { error } = await supabase
    .from('issues')
    .insert([payload]);
    
  if (error) {
    const localIssues = readFromLocalStorage<Issue[]>(STORAGE_KEYS.issues, issues)
    writeToLocalStorage(STORAGE_KEYS.issues, [issue, ...localIssues])
    return
  }

  const localIssues = readFromLocalStorage<Issue[]>(STORAGE_KEYS.issues, issues)
  writeToLocalStorage(STORAGE_KEYS.issues, [issue, ...localIssues.filter((item) => item.id !== issue.id)])
}

export async function updateStoredIssue(issueId: string, updates: Partial<Issue>): Promise<void> {
  ensureMockDataSeeded()

  if (hasSupabaseConfig) {
    await supabase
      .from('issues')
      .update(updates)
      .eq('id', issueId)
  }

  const localIssues = readFromLocalStorage<Issue[]>(STORAGE_KEYS.issues, issues)
  const nextIssues = localIssues.map((issue) =>
    issue.id === issueId
      ? {
          ...issue,
          ...updates,
        }
      : issue,
  )
  writeToLocalStorage(STORAGE_KEYS.issues, nextIssues)
}

export async function deleteStoredIssue(issueId: string): Promise<void> {
  ensureMockDataSeeded()

  if (hasSupabaseConfig) {
    await supabase
      .from('issues')
      .delete()
      .eq('id', issueId)
  }

  const localIssues = readFromLocalStorage<Issue[]>(STORAGE_KEYS.issues, issues)
  writeToLocalStorage(
    STORAGE_KEYS.issues,
    localIssues.filter((issue) => issue.id !== issueId),
  )
}

export async function getStoredComments(issueId?: string): Promise<IssueComment[]> {
  ensureMockDataSeeded()

  if (!hasSupabaseConfig) {
    const localComments = readFromLocalStorage<IssueComment[]>(STORAGE_KEYS.comments, commentsData)
    return issueId
      ? localComments.filter((comment) => comment.issueId === issueId)
      : localComments
  }

  let query = supabase.from('comments').select('*').order('createdAt', { ascending: true });
  
  if (issueId) {
    query = query.eq('issueId', issueId);
  }
  
  const { data, error } = await query;
    
  if (error) {
    const localComments = readFromLocalStorage<IssueComment[]>(STORAGE_KEYS.comments, commentsData)
    return issueId
      ? localComments.filter((comment) => comment.issueId === issueId)
      : localComments
  }
  const resolvedComments = (data as IssueComment[] | null) ?? []
  // Persist whatever the DB returned (including empty arrays)
  writeToLocalStorage(STORAGE_KEYS.comments, resolvedComments)
  return issueId
    ? resolvedComments.filter((comment) => comment.issueId === issueId)
    : resolvedComments
}

export async function addStoredComment(comment: IssueComment): Promise<void> {
  ensureMockDataSeeded()

  if (!hasSupabaseConfig) {
    const localComments = readFromLocalStorage<IssueComment[]>(STORAGE_KEYS.comments, commentsData)
    writeToLocalStorage(STORAGE_KEYS.comments, [...localComments, comment])
    return
  }

  const { error } = await supabase
    .from('comments')
    .insert([comment]);
    
  if (error) {
    const localComments = readFromLocalStorage<IssueComment[]>(STORAGE_KEYS.comments, commentsData)
    writeToLocalStorage(STORAGE_KEYS.comments, [...localComments, comment])
    return
  }

  const localComments = readFromLocalStorage<IssueComment[]>(STORAGE_KEYS.comments, commentsData)
  writeToLocalStorage(STORAGE_KEYS.comments, [...localComments, comment])
}

export async function getStoredNotifications(userId?: string): Promise<AppNotification[]> {
  ensureMockDataSeeded()

  if (!hasSupabaseConfig) {
    // Mock data: filter by userId if provided
    if (userId) {
      return mockNotifications.filter(n => n.userId === userId)
    }
    return readFromLocalStorage<AppNotification[]>(STORAGE_KEYS.notifications, mockNotifications)
  }

  // Build Supabase query with proper user filtering
  let query = supabase
    .from('notifications')
    .select('*')

  // If userId is provided, filter to that user only
  if (userId) {
    query = query.eq('userId', userId)
  }

  const { data, error } = await query.order('createdAt', { ascending: false });
    
  if (error) {
    // Fallback to localStorage
    if (userId) {
      return mockNotifications.filter(n => n.userId === userId)
    }
    return readFromLocalStorage<AppNotification[]>(STORAGE_KEYS.notifications, mockNotifications)
  }
  const resolvedNotifications = (data as AppNotification[] | null) ?? []
  // Persist and return DB notifications even if empty
  writeToLocalStorage(STORAGE_KEYS.notifications, resolvedNotifications)
  if (userId) {
    return resolvedNotifications.filter(n => n.userId === userId)
  }
  return resolvedNotifications
}

export async function markAllNotificationsRead(): Promise<void> {
  ensureMockDataSeeded()

  if (hasSupabaseConfig) {
    await supabase
      .from('notifications')
      .update({ isRead: true })
      .eq('isRead', false)
  }

  const notifications = readFromLocalStorage<AppNotification[]>(STORAGE_KEYS.notifications, mockNotifications)
  const nextNotifications = notifications.map((notification) => ({
    ...notification,
    isRead: true,
  }))
  writeToLocalStorage(STORAGE_KEYS.notifications, nextNotifications)
}

export async function addStoredNotification(notification: AppNotification): Promise<void> {
  ensureMockDataSeeded()

  if (hasSupabaseConfig) {
    await supabase
      .from('notifications')
      .insert([notification])
  }

  const notifications = readFromLocalStorage<AppNotification[]>(STORAGE_KEYS.notifications, mockNotifications)
  writeToLocalStorage(STORAGE_KEYS.notifications, [notification, ...notifications])
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