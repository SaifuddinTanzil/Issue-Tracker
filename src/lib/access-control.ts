export type ManagedUserRole = "Admin" | "Manager" | "Resolver" | "Reporter"

export interface ManagedUser {
  id: string
  email: string
  role: ManagedUserRole
  status: "active" | "revoked"
  assignedApps: string[]
}

export interface AccessRequest {
  id: string
  userEmail: string
  requestedApp: string
  createdAt: string
  status: "pending" | "approved" | "rejected"
}

const USERS_KEY = "uat:managed-users"
const REQUESTS_KEY = "uat:access-requests"

const defaultManagedUsers: ManagedUser[] = [
  {
    id: "usr-001",
    email: "admin@company.com",
    role: "Admin",
    status: "active",
    assignedApps: ["BRAC Microfinance Portal", "HR Management System", "Inventory Tracker", "Customer Relations Portal"],
  },
  {
    id: "usr-002",
    email: "manager.ops@company.com",
    role: "Manager",
    status: "active",
    assignedApps: ["BRAC Microfinance Portal", "HR Management System", "Inventory Tracker", "Customer Relations Portal"],
  },
  {
    id: "usr-003",
    email: "resolver.crmsquad@vendor.com",
    role: "Resolver",
    status: "active",
    assignedApps: ["BRAC Microfinance Portal"],
  },
  {
    id: "usr-004",
    email: "reporter.uat@company.com",
    role: "Reporter",
    status: "active",
    assignedApps: ["BRAC Microfinance Portal"],
  },
]

const defaultAccessRequests: AccessRequest[] = [
  {
    id: "req-001",
    userEmail: "maria.hossain@vendor.com",
    requestedApp: "BRAC Microfinance Portal",
    createdAt: new Date().toISOString(),
    status: "pending",
  },
  {
    id: "req-002",
    userEmail: "rakib.rahman@uat.com",
    requestedApp: "HR Management System",
    createdAt: new Date().toISOString(),
    status: "pending",
  },
]

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback

  const raw = window.localStorage.getItem(key)
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!isBrowser()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function ensureSeeded(): void {
  if (!isBrowser()) return

  if (!window.localStorage.getItem(USERS_KEY)) {
    writeJson(USERS_KEY, defaultManagedUsers)
  }

  if (!window.localStorage.getItem(REQUESTS_KEY)) {
    writeJson(REQUESTS_KEY, defaultAccessRequests)
  }
}

export async function getManagedUsers(): Promise<ManagedUser[]> {
  ensureSeeded()
  return readJson<ManagedUser[]>(USERS_KEY, defaultManagedUsers)
}

export async function setManagedUsers(users: ManagedUser[]): Promise<void> {
  writeJson(USERS_KEY, users)
}

export async function getAccessRequests(): Promise<AccessRequest[]> {
  ensureSeeded()
  return readJson<AccessRequest[]>(REQUESTS_KEY, defaultAccessRequests).filter((request) => request.status === "pending")
}

export async function setAccessRequests(requests: AccessRequest[]): Promise<void> {
  writeJson(REQUESTS_KEY, requests)
}

export async function submitAccessRequest(userEmail: string, requestedApp: string): Promise<AccessRequest> {
  const nextRequest: AccessRequest = {
    id: `req-${Date.now()}`,
    userEmail,
    requestedApp,
    createdAt: new Date().toISOString(),
    status: "pending",
  }

  const requests = await getAccessRequests()
  await setAccessRequests([nextRequest, ...requests])
  return nextRequest
}

export async function approveAccessRequest(requestId: string, role: Exclude<ManagedUserRole, "Admin">): Promise<AccessRequest | null> {
  const requests = await getAccessRequests()
  const request = requests.find((item) => item.id === requestId)

  if (!request) {
    return null
  }

  const nextRequests = requests.filter((item) => item.id !== requestId)
  await setAccessRequests(nextRequests)

  const users = await getManagedUsers()
  const existing = users.find((user) => user.email.toLowerCase() === request.userEmail.toLowerCase())

  if (existing) {
    const nextUsers = users.map((user) => {
      if (user.id !== existing.id) return user
      return {
        ...user,
        role,
        status: "active" as const,
        assignedApps: user.assignedApps.includes(request.requestedApp)
          ? user.assignedApps
          : [...user.assignedApps, request.requestedApp],
      }
    })
    await setManagedUsers(nextUsers)
  } else {
    await setManagedUsers([
      ...users,
      {
        id: `usr-${Date.now()}`,
        email: request.userEmail,
        role,
        status: "active",
        assignedApps: [request.requestedApp],
      },
    ])
  }

  return request
}

export async function rejectAccessRequest(requestId: string): Promise<AccessRequest | null> {
  const requests = await getAccessRequests()
  const request = requests.find((item) => item.id === requestId)
  if (!request) return null

  await setAccessRequests(requests.filter((item) => item.id !== requestId))
  return request
}

export async function updateManagedUserRole(userId: string, role: ManagedUserRole): Promise<void> {
  const users = await getManagedUsers()
  const nextUsers = users.map((user) => (user.id === userId ? { ...user, role } : user))
  await setManagedUsers(nextUsers)
}

export async function revokeManagedUserAccess(userId: string): Promise<void> {
  const users = await getManagedUsers()
  const nextUsers = users.map((user) =>
    user.id === userId
      ? {
          ...user,
          status: "revoked" as const,
          assignedApps: [],
        }
      : user,
  )
  await setManagedUsers(nextUsers)
}

export async function assignManagedUserApps(userId: string, apps: string[]): Promise<void> {
  const users = await getManagedUsers()
  const nextUsers = users.map((user) =>
    user.id === userId
      ? {
          ...user,
          assignedApps: apps,
        }
      : user,
  )
  await setManagedUsers(nextUsers)
}

export async function getManagedUserByEmail(email?: string | null): Promise<ManagedUser | null> {
  if (!email) return null
  const users = await getManagedUsers()
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null
}

export async function getAllowedAppsForUser(email?: string | null, fallbackRole?: string): Promise<string[]> {
  const user = await getManagedUserByEmail(email)

  const role = user?.role ?? (fallbackRole as ManagedUserRole | undefined)
  if (!role) return []

  if (role === "Admin" || role === "Manager") {
    return ["*"]
  }

  return user?.assignedApps ?? []
}

export function canUpdateIssue(role?: string | null): boolean {
  return role === "Admin" || role === "Manager" || role === "Resolver"
}

export function canDeleteIssue(role?: string | null): boolean {
  return role === "Admin"
}
