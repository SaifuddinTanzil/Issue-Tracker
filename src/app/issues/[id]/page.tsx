"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Send, Trash2, Calendar, User, Monitor } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth-provider"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { AppLayout } from "@/components/app-layout"
import { StatusBadge, SeverityBadge, CategoryBadge } from "@/components/status-badge"
import {
  users,
  statusConfig,
  severityConfig,
  categoryConfig,
  addStoredNotification,
  deleteStoredIssue,
  updateStoredIssue,
  type AppNotification,
  type IssueStatus,
  type Severity,
  type Category,
} from "@/lib/mock-data"
import { getStoredIssues, getStoredComments, addStoredComment, type Issue, type IssueComment } from "@/lib/mock-data"
import { useToast } from "@/hooks/use-toast"
import { canDeleteIssue, canUpdateIssue, getAllowedAppsForUser, getManagedUserByEmail } from "@/lib/access-control"
import { useAppPreferences } from "@/components/app-preferences-provider"

export default function IssueDetailPage() {
  const params = useParams()
  const router = useRouter()
  const issueId = params.id as string
  const { user, userProfile } = useAuth()
  const { toast } = useToast()
  const { tx } = useAppPreferences()

  const [allIssues, setAllIssues] = useState<Issue[]>([])
  const [localComments, setLocalComments] = useState<IssueComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [allowedApps, setAllowedApps] = useState<string[]>([])
  const [resolvedRole, setResolvedRole] = useState<string>("Reporter")

  const [status, setStatus] = useState<IssueStatus>("open")
  const [severity, setSeverity] = useState<Severity>("low")
  const [category, setCategory] = useState<Category>("bug")
  const [assignedTo, setAssignedTo] = useState("Unassigned")
  const [newComment, setNewComment] = useState("")
  const [isSavingUpdates, setIsSavingUpdates] = useState(false)

  useEffect(() => {
    Promise.all([
      getStoredIssues(),
      getStoredComments(issueId)
    ]).then(([issuesData, commentsData]) => {
      setAllIssues(issuesData)
      setLocalComments(commentsData)
      
      const foundIssue = issuesData.find((i) => i.id === issueId) || issuesData[0]
      if (foundIssue) {
        setStatus(foundIssue.status)
        setSeverity(foundIssue.severity)
        setCategory(foundIssue.category)
        setAssignedTo(foundIssue.assignedTo)
      }
      setIsLoading(false)
    })
  }, [issueId])

  useEffect(() => {
    const loadPermissions = async () => {
      const managedUser = await getManagedUserByEmail(user?.email)
      const role = managedUser?.role || userProfile?.role || "Reporter"
      setResolvedRole(role)

      const apps = await getAllowedAppsForUser(user?.email, role)
      setAllowedApps(apps)
    }

    loadPermissions()
  }, [user?.email, userProfile?.role])

  const issue = allIssues.find((i) => i.id === issueId) || allIssues[0]
  const canEditIssue = canUpdateIssue(resolvedRole)
  const canRemoveIssue = canDeleteIssue(resolvedRole)
  const canViewIssue = allowedApps.includes("*") || allowedApps.includes(issue?.application)

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Loading issue...</p>
        </div>
      </AppLayout>
    )
  }

  if (!issue) {
    return (
      <AppLayout>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Issue not found</h2>
          <Button className="mt-4" onClick={() => router.push("/issues")}>Back to Issues</Button>
        </div>
      </AppLayout>
    )
  }

  // Governance Rules
  const currentUserRole: string = resolvedRole || userProfile?.role || "Reporter"
  const currentUserName = userProfile?.name || user?.email?.split('@')[0] || "Unknown"
  const isReporter = issue.reporter === currentUserName || issue.reporter === user?.email || issue.reporter === user?.id
  const isAdminOrManager = currentUserRole === "Admin" || currentUserRole === "Manager"

  const isStatusOptionDisabled = (optionStatus: string) => {
    // Only Reporter or Admin can close tickets
    if (optionStatus === "closed" && !isReporter && currentUserRole !== "Admin") {
      return true
    }
    // Only Admin/Manager can move to Triaged or Rejected
    if ((optionStatus === "triaged" || optionStatus === "rejected") && !isAdminOrManager) {
      return true
    }
    return false
  }

  const handleDelete = () => {
    if (!canRemoveIssue) {
      toast({
        title: "Permission denied",
        description: "Only Admin can delete issues.",
        variant: "destructive",
      })
      return
    }

    deleteStoredIssue(issue.id)
    const notification: AppNotification = {
      id: `notif-${Date.now()}`,
      userId: issue.reporter,
      title: "Issue Deleted",
      message: `${issue.id} was deleted by Admin.`,
      isRead: false,
      createdAt: new Date().toISOString(),
      linkHref: "/issues",
    }
    addStoredNotification(notification)
    router.push("/issues")
  }

  const handleCommentSubmit = async () => {
    if (newComment.trim()) {
      const newCommentObj = {
        id: `comment-${Date.now()}`,
        issueId: issue.id,
        user: { 
          id: user?.id || 'temp', 
          name: currentUserName, 
          email: user?.email || '', 
          avatar: userProfile?.avatar || currentUserName.substring(0, 2).toUpperCase() 
        },
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
      }
      setLocalComments([...localComments, newCommentObj])
      setNewComment("")
      await addStoredComment(newCommentObj)
      await addStoredNotification({
        id: `notif-${Date.now()}`,
        userId: issue.reporter,
        title: "New Comment",
        message: `${currentUserName} commented on ${issue.id}.`,
        isRead: false,
        createdAt: new Date().toISOString(),
        linkHref: `/issues/${issue.id}`,
      })
    }
  }

  const handleSaveTicketUpdates = async () => {
    if (!canEditIssue) {
      toast({
        title: "Permission denied",
        description: "Your role cannot update this ticket.",
        variant: "destructive",
      })
      return
    }

    setIsSavingUpdates(true)

    // Mock persistence: apply sidebar edits to the local issue list.
    setAllIssues((prevIssues) =>
      prevIssues.map((item) =>
        item.id === issue.id
          ? {
              ...item,
              status,
              severity,
              category,
              assignedTo,
            }
          : item,
      ),
    )

    await updateStoredIssue(issue.id, {
      status,
      severity,
      category,
      assignedTo,
    })

    const notification: AppNotification = {
      id: `notif-${Date.now()}`,
      userId: issue.reporter,
      title: "Issue Updated",
      message: `${issue.id} was updated (${status}).`,
      isRead: false,
      createdAt: new Date().toISOString(),
      linkHref: `/issues/${issue.id}`,
    }
    await addStoredNotification(notification)

    await new Promise((resolve) => setTimeout(resolve, 450))
    setIsSavingUpdates(false)

    toast({
      title: "Ticket updated",
      description: "Changes saved and notification queued.",
    })
  }

  if (!isLoading && issue && !canViewIssue) {
    return (
      <AppLayout>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Access denied</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not currently have access to this application's tickets.
          </p>
          <Button className="mt-4" onClick={() => router.push("/issues")}>Back to Issues</Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Back Button */}
        <div>
          <Link
            href="/issues"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {tx("Back to Issues", "ইস্যু তালিকায় ফিরে যান")}
          </Link>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left Column - Issue Details */}
          <div className="space-y-6">
            {/* Header */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-start gap-3">
                  <Badge variant="secondary" className="shrink-0">
                    {issue.application}
                  </Badge>
                  <CategoryBadge category={issue.category} />
                </div>
                <div className="mt-2">
                  <h1 className="text-xl font-bold leading-tight">
                    <span className="text-muted-foreground mr-2">{issue.id}</span>
                    {issue.title}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center gap-1.5">
                    <User className="size-3.5" />
                    <span>Reported by {issue.reporter}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    <span>
                      {new Date(issue.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Issue Body */}
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Expected Result
                  </h3>
                  <p className="text-sm leading-relaxed">{issue.expectedResult}</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Actual Result
                  </h3>
                  <p className="text-sm leading-relaxed">{issue.actualResult}</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Reproduction Steps
                  </h3>
                  <ol className="list-decimal list-inside space-y-1.5 text-sm">
                    {issue.reproductionSteps.map((step, index) => (
                      <li key={index} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Attachments */}
            {issue.attachments.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    Attachments ({issue.attachments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {issue.attachments.map((attachment, index) => {
                      const isDataUrl = attachment.startsWith("data:")
                      return (
                        <Dialog key={index}>
                          <DialogTrigger asChild>
                            <button
                              type="button"
                              className="group relative block aspect-video w-full overflow-hidden rounded-lg border bg-muted text-left"
                            >
                              {isDataUrl ? (
                                <img
                                  src={attachment}
                                  alt={`Attachment ${index + 1}`}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                  <span className="text-xs">Screenshot {index + 1}</span>
                                </div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                <span className="text-xs font-medium text-white">Click to zoom</span>
                              </div>
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl p-2">
                            {isDataUrl ? (
                              <img
                                src={attachment}
                                alt={`Attachment ${index + 1} enlarged`}
                                className="h-auto w-full rounded-md object-contain"
                              />
                            ) : (
                              <div className="flex h-56 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                                No preview available
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity / Comments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Comments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {localComments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="size-8 shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {comment.user.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{comment.user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                    {localComments.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        No comments yet. Be the first to comment.
                      </p>
                    )}
                  </div>
                </ScrollArea>

                {/* Comment Input */}
                <div className="flex gap-3 border-t pt-4">
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      SA
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-20 resize-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleCommentSubmit}
                        disabled={!newComment.trim()}
                      >
                        <Send className="mr-1.5 size-3.5" />
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </label>
                  <Select value={status} onValueChange={(v) => setStatus(v as IssueStatus)}>
                    <SelectTrigger className="w-full" disabled={!canEditIssue}>
                      <SelectValue>
                        <StatusBadge status={status} />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem 
                          key={key} 
                          value={key}
                          disabled={isStatusOptionDisabled(key)}
                        >
                          <StatusBadge status={key as IssueStatus} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Severity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Severity
                  </label>
                  <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
                    <SelectTrigger className="w-full" disabled={!canEditIssue}>
                      <SelectValue>
                        <SeverityBadge severity={severity} showDot />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(severityConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <SeverityBadge severity={key as Severity} showDot />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Category
                  </label>
                  <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                    <SelectTrigger className="w-full" disabled={!canEditIssue}>
                      <SelectValue>
                        <CategoryBadge category={category} />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <CategoryBadge category={key as Category} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assigned To */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Assigned To
                  </label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger className="w-full" disabled={!canEditIssue}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.name}>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-5">
                              <AvatarFallback className="bg-muted text-[10px]">
                                {user.avatar}
                              </AvatarFallback>
                            </Avatar>
                            {user.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Environment & Module Info */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Environment</span>
                    <span className="font-medium capitalize">{issue.environment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Module</span>
                    <span className="font-medium">{issue.module}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSaveTicketUpdates}
                  disabled={isSavingUpdates || !canEditIssue}
                >
                  {isSavingUpdates ? "Saving..." : "Save Ticket Updates"}
                </Button>
              </CardContent>
            </Card>

            {/* System Metadata (Auto-Captured) */}
            {issue.systemMetadata && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Monitor className="size-4 text-muted-foreground" />
                    System Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">OS/Platform</span>
                    <span className="font-medium text-right max-w-[150px] truncate" title={issue.systemMetadata.platform}>
                      {issue.systemMetadata.platform}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Resolution</span>
                    <span className="font-medium">{issue.systemMetadata.screenResolution}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Language</span>
                    <span className="font-medium">{issue.systemMetadata.language}</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <span className="text-muted-foreground block">User Agent</span>
                    <p className="text-xs font-mono bg-muted p-2 rounded text-muted-foreground break-all">
                      {issue.systemMetadata.userAgent}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delete Button */}
            {canRemoveIssue && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 size-4" />
                    {tx("Delete Issue", "ইস্যু মুছুন")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Issue</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this issue? This action cannot be undone
                      and all associated comments and attachments will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
