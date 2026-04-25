import { supabase } from "./supabase"

export type IssueStatus = "open" | "triaged" | "in-progress" | "ready-for-retest" | "closed" | "needs-info" | "rejected"
export type Severity = "low" | "medium" | "high"
export type Category = "bug" | "ui-ux" | "performance" | "suggestion"
export type Environment = "uat" | "staging" | "production"

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

export const issues: Issue[] = [
  {
    id: "UAT-001",
    title: "Login button not responsive on mobile devices",
    application: "BRAC Microfinance Portal",
    status: "open",
    severity: "high",
    category: "ui-ux",
    environment: "uat",
    assignedTo: "Sarah Ahmed",
    reporter: "Rafiq Hassan",
    createdAt: "2024-01-15",
    module: "Authentication",
    expectedResult: "Login button should be clickable on all mobile devices",
    actualResult: "Button is unresponsive on iOS Safari and some Android browsers",
    reproductionSteps: [
      "Open the application on a mobile device",
      "Navigate to the login page",
      "Enter valid credentials",
      "Attempt to click the login button",
    ],
    attachments: ["/placeholder.svg", "/placeholder.svg"],
    systemMetadata: {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      platform: "iPhone",
      language: "en-US",
      screenResolution: "390x844",
      timestamp: "2024-01-15T09:23:14Z",
    }
  },
  {
    id: "UAT-002",
    title: "Dashboard charts fail to load with large datasets",
    application: "HR Management System",
    status: "in-progress",
    severity: "medium",
    category: "performance",
    environment: "uat",
    assignedTo: "Nadia Khan",
    reporter: "Imran Ali",
    createdAt: "2024-01-14",
    module: "Dashboard",
    expectedResult: "Charts should load within 3 seconds regardless of dataset size",
    actualResult: "Charts timeout after 30 seconds with datasets over 10,000 records",
    reproductionSteps: [
      "Login to HR Management System",
      "Navigate to Analytics Dashboard",
      "Select date range spanning 2+ years",
      "Observe loading behavior",
    ],
    attachments: ["/placeholder.svg"],
  },
  {
    id: "UAT-003",
    title: "Export to PDF generates corrupted files",
    application: "Inventory Tracker",
    status: "ready-for-retest",
    severity: "high",
    category: "bug",
    environment: "staging",
    assignedTo: "Rafiq Hassan",
    reporter: "Sarah Ahmed",
    createdAt: "2024-01-13",
    module: "Reports",
    expectedResult: "PDF exports should open correctly in all PDF readers",
    actualResult: "PDF files are corrupted when report contains images",
    reproductionSteps: [
      "Generate an inventory report with product images",
      "Click Export to PDF button",
      "Download the generated file",
      "Attempt to open in Adobe Reader",
    ],
    attachments: ["/placeholder.svg", "/placeholder.svg", "/placeholder.svg"],
  },
  {
    id: "UAT-004",
    title: "Add dark mode toggle to settings",
    application: "Customer Relations Portal",
    status: "open",
    severity: "low",
    category: "suggestion",
    environment: "uat",
    assignedTo: "Imran Ali",
    reporter: "Nadia Khan",
    createdAt: "2024-01-12",
    module: "Settings",
    expectedResult: "Users should be able to toggle between light and dark modes",
    actualResult: "No dark mode option available",
    reproductionSteps: [
      "Navigate to Settings page",
      "Look for appearance or theme options",
    ],
    attachments: [],
  },
  {
    id: "UAT-005",
    title: "Search results pagination breaks after filter change",
    application: "BRAC Microfinance Portal",
    status: "triaged",
    severity: "medium",
    category: "bug",
    environment: "uat",
    assignedTo: "Sarah Ahmed",
    reporter: "Fatima Begum",
    createdAt: "2024-01-11",
    module: "Search",
    expectedResult: "Pagination should reset to page 1 when filters are changed",
    actualResult: "Stays on current page showing incorrect or no results",
    reproductionSteps: [
      "Perform a search query",
      "Navigate to page 3 of results",
      "Apply a new filter",
      "Observe pagination state",
    ],
    attachments: ["/placeholder.svg"],
  },
  {
    id: "UAT-006",
    title: "Form validation messages appear in wrong language",
    application: "HR Management System",
    status: "closed",
    severity: "low",
    category: "ui-ux",
    environment: "production",
    assignedTo: "Nadia Khan",
    reporter: "Rafiq Hassan",
    createdAt: "2024-01-10",
    module: "Forms",
    expectedResult: "Validation messages should match selected language",
    actualResult: "Messages always appear in English regardless of language setting",
    reproductionSteps: [
      "Change language to Bengali",
      "Navigate to any form",
      "Submit with invalid data",
      "Check validation message language",
    ],
    attachments: [],
  },
  {
    id: "UAT-007",
    title: "Session timeout not working correctly",
    application: "Inventory Tracker",
    status: "in-progress",
    severity: "high",
    category: "bug",
    environment: "uat",
    assignedTo: "Imran Ali",
    reporter: "Sarah Ahmed",
    createdAt: "2024-01-09",
    module: "Authentication",
    expectedResult: "Session should expire after 30 minutes of inactivity",
    actualResult: "Session never expires, even after hours of inactivity",
    reproductionSteps: [
      "Login to the application",
      "Leave the browser idle for 1 hour",
      "Attempt to perform any action",
      "Observe that session is still active",
    ],
    attachments: ["/placeholder.svg"],
  },
  {
    id: "UAT-008",
    title: "Customer data not syncing between modules",
    application: "Customer Relations Portal",
    status: "open",
    severity: "high",
    category: "bug",
    environment: "staging",
    assignedTo: "Fatima Begum",
    reporter: "Imran Ali",
    createdAt: "2024-01-08",
    module: "Data Sync",
    expectedResult: "Customer updates should reflect across all modules instantly",
    actualResult: "Changes take up to 24 hours to propagate",
    reproductionSteps: [
      "Update customer information in CRM module",
      "Check customer info in Billing module",
      "Verify same customer in Support module",
      "Note discrepancies in data",
    ],
    attachments: ["/placeholder.svg", "/placeholder.svg"],
  },
]

export type IssueComment = typeof commentsData[0];

const commentsData = [
  {
    id: "comment-1",
    issueId: "UAT-001",
    user: users[0],
    content: "I've confirmed this issue on iPhone 13 and Samsung Galaxy S21. The button appears clickable but doesn't trigger any action.",
    createdAt: "2024-01-15T10:30:00",
  },
  {
    id: "comment-2",
    issueId: "UAT-001",
    user: users[2],
    content: "This seems related to the CSS touch-action property. I'll investigate further and update.",
    createdAt: "2024-01-15T14:45:00",
  },
  {
    id: "comment-3",
    issueId: "UAT-001",
    user: users[1],
    content: "We should prioritize this as it's affecting all mobile users trying to log in.",
    createdAt: "2024-01-16T09:15:00",
  },
]

export const comments: IssueComment[] = commentsData;

export const mockNotifications: AppNotification[] = [
  {
    id: "notif-1",
    userId: "user-1", // Sarah Ahmed
    title: "New Issue Assigned",
    message: "You have been assigned to UAT-001: Login button not responsive.",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    linkHref: "/issues/UAT-001"
  },
  {
    id: "notif-2",
    userId: "user-1",
    title: "New Comment",
    message: "Nadia Khan commented on UAT-002.",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    linkHref: "/issues/UAT-002"
  },
  {
    id: "notif-3",
    userId: "user-1",
    title: "Issue Status Changed",
    message: "UAT-003 status changed to Ready for Retest.",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    linkHref: "/issues/UAT-003"
  },
  {
    id: "notif-4",
    userId: "user-1",
    title: "New Comment",
    message: "Rafiq Hassan replied to your comment on UAT-005.",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    linkHref: "/issues/UAT-005"
  }
]

export const statusConfig: Record<IssueStatus, { label: string; color: string; bgColor: string }> = {
  open: { label: "Open", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200" },
  triaged: { label: "Triaged", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200" },
  "in-progress": { label: "In Progress", color: "text-indigo-700", bgColor: "bg-indigo-50 border-indigo-200" },
  "ready-for-retest": { label: "Ready for Retest", color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200" },
  "needs-info": { label: "Needs Info", color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200" },
  rejected: { label: "Rejected", color: "text-red-700", bgColor: "bg-red-50 border-red-200" },
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
  performance: { label: "Performance", color: "text-amber-700 bg-amber-50" },
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

// ── Supabase Helpers ──

export async function getStoredIssues(): Promise<Issue[]> {
  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .order('createdAt', { ascending: false });
    
  if (error) {
    console.error("Error fetching issues from Supabase:", error);
    return [];
  }
  return data as Issue[];
}

export async function addStoredIssue(issue: Issue): Promise<void> {
  const { error } = await supabase
    .from('issues')
    .insert([issue]);
    
  if (error) {
    console.error("Error inserting issue into Supabase:", error);
  }
}

export async function getStoredComments(issueId?: string): Promise<IssueComment[]> {
  let query = supabase.from('comments').select('*').order('createdAt', { ascending: true });
  
  if (issueId) {
    query = query.eq('issueId', issueId);
  }
  
  const { data, error } = await query;
    
  if (error) {
    console.error("Error fetching comments from Supabase:", error);
    return [];
  }
  return data as IssueComment[];
}

export async function addStoredComment(comment: IssueComment): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .insert([comment]);
    
  if (error) {
    console.error("Error inserting comment into Supabase:", error);
  }
}

export async function getStoredNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('createdAt', { ascending: false });
    
  if (error) {
    console.error("Error fetching notifications from Supabase:", error);
    return [];
  }
  return data as AppNotification[];
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ isRead: true })
    .eq('isRead', false);
    
  if (error) {
    console.error("Error updating notifications in Supabase:", error);
  }
}
