"use client"

import { useMemo, useState } from "react"
import { Settings, ShieldCheck, Users } from "lucide-react"
import { Search } from "lucide-react"
import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { AppLayout } from "@/components/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { useAppPreferences } from "@/components/app-preferences-provider"
import {
  approveAccessRequest,
  getAccessRequests,
  getManagedUsers,
  rejectAccessRequest,
  revokeManagedUserAccess,
  updateManagedUserVendor,
  type AccessRequest,
  type ManagedUser,
  type ManagedUserRole,
  updateManagedUserRole,
} from "@/lib/access-control"
import { getAllVendors, type Vendor } from "@/app/actions/vendors"
import { addStoredNotification, type AppNotification } from "@/lib/mock-data"

type UserRole = Extract<ManagedUserRole, "Admin" | "Resolver" | "Reporter">
type AssignableRole = Extract<ManagedUserRole, "Resolver" | "Reporter">

const ASSIGNABLE_ROLE_OPTIONS: AssignableRole[] = ["Resolver", "Reporter"]
const DIRECTORY_ROLE_OPTIONS: UserRole[] = ["Admin", "Resolver", "Reporter"]

function getRoleBadgeClass(role: UserRole): string {
  if (role === "Admin") return "bg-violet-100 text-violet-800 hover:bg-violet-100"
  if (role === "Resolver") return "bg-amber-100 text-amber-800 hover:bg-amber-100"
  return "bg-gray-100 text-gray-800 hover:bg-gray-100"
}

export default function AdminDashboardPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { userProfile } = useAuth()
  const { tx } = useAppPreferences()

  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [directoryUsers, setDirectoryUsers] = useState<ManagedUser[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [pendingRequest, setPendingRequest] = useState<AccessRequest | null>(null)
  const [selectedApprovalRole, setSelectedApprovalRole] = useState<AssignableRole>("Reporter")
  const [directorySearch, setDirectorySearch] = useState("")

  useEffect(() => {
    if (userProfile?.role && userProfile.role !== "Admin") {
      router.push("/")
      return
    }

    const loadAdminData = async () => {
      const [requests, users, allVendors] = await Promise.all([
        getAccessRequests(),
        getManagedUsers(),
        getAllVendors(),
      ])
      setAccessRequests(requests)
      setDirectoryUsers(users)
      setVendors(allVendors)
    }

    loadAdminData()
  }, [router, userProfile?.role])

  const filteredDirectoryUsers = useMemo(
    () => directoryUsers.filter((user) => {
      const searchLower = directorySearch.toLowerCase()
      const nameMatch = (user.name || "").toLowerCase().includes(searchLower)
      const emailMatch = user.email.toLowerCase().includes(searchLower)
      return nameMatch || emailMatch
    }),
    [directoryUsers, directorySearch],
  )

  const openApprovalDialog = (request: AccessRequest) => {
    setPendingRequest(request)
    setSelectedApprovalRole("Reporter")
    setApproveDialogOpen(true)
  }

  const handleApproveRequest = () => {
    if (!pendingRequest) return

    const run = async () => {
      const approvedRequest = await approveAccessRequest(pendingRequest.id, selectedApprovalRole)
      const [requests, users] = await Promise.all([getAccessRequests(), getManagedUsers()])
      setAccessRequests(requests)
      setDirectoryUsers(users)
      setApproveDialogOpen(false)
      setPendingRequest(null)

      if (approvedRequest) {
        const notification: AppNotification = {
          id: `notif-${Date.now()}`,
          userId: approvedRequest.userEmail,
          title: "Access Approved",
          message: `Your access request for ${approvedRequest.requestedApp} has been approved with ${selectedApprovalRole} role.`,
          isRead: false,
          createdAt: new Date().toISOString(),
          linkHref: "/issues",
        }
        await addStoredNotification(notification)
      }

      toast({
        title: "Access Request Approved",
        description: "User approved and role assigned successfully.",
      })
    }

    run()
  }

  const handleRejectRequest = (requestId: string) => {
    const run = async () => {
      const rejectedRequest = await rejectAccessRequest(requestId)
      const requests = await getAccessRequests()
      setAccessRequests(requests)

      if (rejectedRequest) {
        const notification: AppNotification = {
          id: `notif-${Date.now()}`,
          userId: rejectedRequest.userEmail,
          title: "Access Request Rejected",
          message: `Your request for ${rejectedRequest.requestedApp} was rejected by Admin.`,
          isRead: false,
          createdAt: new Date().toISOString(),
          linkHref: "/profile",
        }
        await addStoredNotification(notification)
      }

      toast({
        title: "Access Request Rejected",
        description: "The request has been rejected and removed.",
        variant: "destructive",
      })
    }

    run()
  }

  const handleDirectoryRoleChange = (userId: string, role: UserRole) => {
    const run = async () => {
      await updateManagedUserRole(userId, role)
      const users = await getManagedUsers()
      setDirectoryUsers(users)

      const updatedUser = users.find((user) => user.id === userId)
      if (updatedUser) {
        const notification: AppNotification = {
          id: `notif-${Date.now()}`,
          userId: updatedUser.email,
          title: "Role Updated",
          message: `Your role has been updated to ${role} by Admin.`,
          isRead: false,
          createdAt: new Date().toISOString(),
          linkHref: "/profile",
        }
        await addStoredNotification(notification)
      }

      toast({
        title: "Role Updated",
        description: "User role updated successfully.",
      })
    }

    run()
  }

  const handleRevokeAccess = (userId: string) => {
    const run = async () => {
      await revokeManagedUserAccess(userId)
      const users = await getManagedUsers()
      setDirectoryUsers(users)

      const updatedUser = users.find((user) => user.id === userId)
      if (updatedUser) {
        const notification: AppNotification = {
          id: `notif-${Date.now()}`,
          userId: updatedUser.email,
          title: "Access Revoked",
          message: "Your app access has been revoked by Admin.",
          isRead: false,
          createdAt: new Date().toISOString(),
          linkHref: "/profile",
        }
        await addStoredNotification(notification)
      }

      toast({
        title: "Access Revoked",
        description: "User access has been revoked.",
        variant: "destructive",
      })
    }

    run()
  }

  const handleVendorChange = (userId: string, vendorId: string | null) => {
    const run = async () => {
      await updateManagedUserVendor(userId, vendorId)
      const users = await getManagedUsers()
      setDirectoryUsers(users)

      const updatedUser = users.find((user) => user.id === userId)
      const vendorName = vendorId ? vendors.find((v) => v.id === vendorId)?.name : "None"

      if (updatedUser) {
        const notification: AppNotification = {
          id: `notif-${Date.now()}`,
          userId: updatedUser.email,
          title: "Vendor Assignment Updated",
          message: `Your vendor assignment has been updated to ${vendorName} by Admin.`,
          isRead: false,
          createdAt: new Date().toISOString(),
          linkHref: "/profile",
        }
        await addStoredNotification(notification)
      }

      toast({
        title: "Vendor Assigned",
        description: `Vendor assignment updated to ${vendorName}.`,
      })
    }

    run()
  }

  if (userProfile?.role && userProfile.role !== "Admin") {
    return (
      <AppLayout>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">{tx("Access denied", "অ্যাক্সেস নিষিদ্ধ")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {tx("Only Admin can access this page.", "শুধুমাত্র অ্যাডমিন এই পেইজে প্রবেশ করতে পারবেন।")}
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-7rem)] bg-gray-50 p-4 md:p-6">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gray-100 p-2 text-gray-700">
                  <Settings className="size-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900">{tx("System Administration", "সিস্টেম অ্যাডমিনিস্ট্রেশন")}</h1>
                  <p className="text-sm text-gray-600">{tx("Manage access requests and directory permissions.", "অ্যাক্সেস অনুরোধ ও ইউজার অনুমতি পরিচালনা করুন।")}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href="/dashboard/admin/apps">Manage Apps</Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href="/dashboard/admin/vendors">Manage Vendors</Link>
                </Button>
              </div>
            </div>
          </header>

          <Tabs defaultValue="access-requests" className="space-y-4">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100">
              <TabsTrigger value="access-requests" className="gap-2">
                <ShieldCheck className="size-4" />
                {tx("Access Requests", "অ্যাক্সেস অনুরোধ")}
              </TabsTrigger>
              <TabsTrigger value="user-directory" className="gap-2">
                <Users className="size-4" />
                {tx("User Directory", "ইউজার ডিরেক্টরি")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="access-requests">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900">{tx("Pending Access Requests", "অপেক্ষমাণ অ্যাক্সেস অনুরোধ")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-64">User Email</TableHead>
                          <TableHead className="min-w-48">{tx("Requested App", "অনুরোধকৃত অ্যাপ")}</TableHead>
                          <TableHead className="min-w-56 text-right">{tx("Actions", "অ্যাকশন")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accessRequests.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-10 text-center text-sm text-gray-500">
                              {tx("No pending access requests.", "কোনও অপেক্ষমাণ অ্যাক্সেস অনুরোধ নেই।")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          accessRequests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell className="font-medium text-gray-900">{request.userEmail}</TableCell>
                              <TableCell className="text-gray-700">{request.requestedApp}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                    onClick={() => openApprovalDialog(request)}
                                  >
                                    {tx("Approve & Assign Role", "অনুমোদন ও রোল নির্ধারণ")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRejectRequest(request.id)}
                                  >
                                    {tx("Reject", "প্রত্যাখ্যান")}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="user-directory">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <div className="space-y-4">
                    <CardTitle className="text-lg text-gray-900">{tx("All Users", "সব ব্যবহারকারী")}</CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 size-4 text-gray-400" />
                      <Input
                        placeholder={tx("Search by name or email...", "নাম বা ইমেইল দ্বারা অনুসন্ধান...")}
                        value={directorySearch}
                        onChange={(e) => setDirectorySearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-56">{tx("Name", "নাম")}</TableHead>
                          <TableHead className="min-w-64">User Email</TableHead>
                          <TableHead className="min-w-44">{tx("Current Role", "বর্তমান রোল")}</TableHead>
                          <TableHead className="min-w-40">Vendor Assignment</TableHead>
                          <TableHead className="min-w-28">{tx("Status", "স্ট্যাটাস")}</TableHead>
                          <TableHead className="min-w-44 text-right">{tx("Actions", "অ্যাকশন")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDirectoryUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium text-gray-900">{user.name || "—"}</TableCell>
                            <TableCell className="font-medium text-gray-900">{user.email}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge className={getRoleBadgeClass(user.role)}>{user.role}</Badge>
                                <Select
                                  value={user.role}
                                  onValueChange={(value) => handleDirectoryRoleChange(user.id, value as UserRole)}
                                >
                                  <SelectTrigger className="h-8 w-36 bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DIRECTORY_ROLE_OPTIONS.map((roleOption) => (
                                      <SelectItem key={roleOption} value={roleOption}>
                                        {roleOption}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.vendor_id || "__none__"}
                                onValueChange={(value) =>
                                  handleVendorChange(user.id, value === "__none__" ? null : value)
                                }
                              >
                                <SelectTrigger className="h-8 w-36 bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">None</SelectItem>
                                  {vendors.map((vendor) => (
                                    <SelectItem key={vendor.id} value={vendor.id}>
                                      {vendor.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge className={user.status === "active" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-red-100 text-red-800 hover:bg-red-100"}>
                                {user.status === "active" ? tx("Active", "সক্রিয়") : tx("Revoked", "বাতিল")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {user.status === "active" ? (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRevokeAccess(user.id)}
                                >
                                  {tx("Revoke Access", "অ্যাক্সেস বাতিল")}
                                </Button>
                              ) : (
                                <span className="text-sm text-gray-500">{tx("Access revoked", "অ্যাক্সেস বাতিল")}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tx("Approve and Assign Role", "অনুমোদন ও রোল নির্ধারণ")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-medium text-gray-900">{pendingRequest?.userEmail}</p>
              <p>{tx("Requested App", "অনুরোধকৃত অ্যাপ")}: {pendingRequest?.requestedApp}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800">{tx("Select Role", "রোল নির্বাচন করুন")}</p>
              <Select
                value={selectedApprovalRole}
                onValueChange={(value) => setSelectedApprovalRole(value as AssignableRole)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLE_OPTIONS.map((roleOption) => (
                    <SelectItem key={roleOption} value={roleOption}>
                      {roleOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                {tx("Cancel", "বাতিল")}
              </Button>
              <Button onClick={handleApproveRequest}>{tx("Confirm Approval", "অনুমোদন নিশ্চিত করুন")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
