"use client"

import { useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCopy,
  Clock3,
  FileImage,
  Paperclip,
  UserRound,
  XCircle,
} from "lucide-react"

import { AppLayout } from "@/components/app-layout"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: string
  name: string
  role: "Reporter" | "Vendor" | "Developer"
  email: string
  avatarFallback: string
}

type TicketStatus = "Open" | "In Progress" | "Ready for Retest" | "Closed"

interface Comment {
  id: string
  type: "comment"
  author: User
  body: string
  createdAt: string
  notifyReporter: boolean
  attachmentName?: string
}

interface SystemEvent {
  id: string
  type: "system"
  actorName: string
  message: string
  createdAt: string
}

interface Ticket {
  id: string
  title: string
  applicationName: string
  environment: "Staging" | "UAT" | "Production"
  module: string
  reporter: User
  createdAt: string
  category: "UI/UX" | "Functional" | "Performance" | "Security"
  severity: "Low" | "Medium" | "High" | "Critical"
  expectedResult: string
  actualResult: string
  reproductionSteps: string[]
  screenshotUrl: string
  status: TicketStatus
  assigneeId: string
}

type FeedItem = Comment | SystemEvent

const VENDOR_USER: User = {
  id: "vendor-01",
  name: "Vendor Resolver",
  role: "Vendor",
  email: "resolver@vendor.example",
  avatarFallback: "VR",
}

const DEV_USERS: User[] = [
  {
    id: "unassigned",
    name: "Unassigned",
    role: "Developer",
    email: "",
    avatarFallback: "UN",
  },
  {
    id: "dev-user-a",
    name: "Dev User A",
    role: "Developer",
    email: "dev.a@vendor.example",
    avatarFallback: "DA",
  },
  {
    id: "dev-user-b",
    name: "Dev User B",
    role: "Developer",
    email: "dev.b@vendor.example",
    avatarFallback: "DB",
  },
]

const reporterUser: User = {
  id: "tester-19",
  name: "Aisha Rahman",
  role: "Reporter",
  email: "aisha.rahman@uat.example",
  avatarFallback: "AR",
}

const mockTicket: Ticket = {
  id: "UAT-842",
  title: "Save action freezes CRM profile drawer after inline edit",
  applicationName: "CRM System",
  environment: "Staging",
  module: "Customer 360 > Profile Drawer",
  reporter: reporterUser,
  createdAt: "2026-04-19T09:32:00.000Z",
  category: "UI/UX",
  severity: "High",
  expectedResult:
    "After editing the customer phone number and clicking Save, the drawer should close in under 1 second and display an updated success chip in the record timeline.",
  actualResult:
    "The drawer becomes unresponsive for 12-15 seconds, the Save button remains in loading state, and the customer timeline entry is never created until a full page refresh.",
  reproductionSteps: [
    "Log in as a UAT tester and open CRM System in Staging.",
    "Navigate to Customer 360 and open any existing customer profile drawer.",
    "Update the phone number field and click Save.",
    "Immediately try to click Close or navigate to another tab.",
    "Observe freeze and missing timeline update.",
  ],
  screenshotUrl:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='720'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' x2='100%25' y1='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23f8fafc'/%3E%3Cstop offset='100%25' stop-color='%23e2e8f0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='720' fill='url(%23g)'/%3E%3Crect x='80' y='80' width='1040' height='560' rx='16' fill='%23ffffff' stroke='%23d1d5db'/%3E%3Crect x='120' y='140' width='420' height='40' rx='8' fill='%23e5e7eb'/%3E%3Crect x='120' y='200' width='960' height='260' rx='12' fill='%23f3f4f6'/%3E%3Crect x='120' y='490' width='220' height='56' rx='10' fill='%23ef4444' fill-opacity='0.15'/%3E%3Ctext x='120' y='580' fill='%234b5563' font-size='28' font-family='Arial'%3EStaging screenshot: Save freeze state%3C/text%3E%3C/svg%3E",
  status: "In Progress",
  assigneeId: "dev-user-a",
}

const initialFeed: FeedItem[] = [
  {
    id: "evt-001",
    type: "system",
    actorName: "Vendor Resolver",
    message: "changed status from Open to In Progress",
    createdAt: "2026-04-20T08:00:00.000Z",
  },
  {
    id: "cmt-001",
    type: "comment",
    author: reporterUser,
    body: "It broke when I clicked save. I can reproduce this on every profile update attempt.",
    createdAt: "2026-04-20T08:11:00.000Z",
    notifyReporter: false,
  },
  {
    id: "cmt-002",
    type: "comment",
    author: VENDOR_USER,
    body: "We identified a race condition around the profile mutation callback. Patch is in progress.",
    createdAt: "2026-04-20T09:26:00.000Z",
    notifyReporter: true,
  },
]

const oneDayMs = 1000 * 60 * 60 * 24

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function TicketResolutionPage() {
  const params = useParams<{ id: string }>()
  const issueId = params?.id ?? mockTicket.id

  const [ticket, setTicket] = useState<Ticket>({
    ...mockTicket,
    id: issueId,
  })
  const [feedItems, setFeedItems] = useState<FeedItem[]>(initialFeed)
  const [commentInput, setCommentInput] = useState("")
  const [notifyReporter, setNotifyReporter] = useState(true)
  const [attachedProofName, setAttachedProofName] = useState("")

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()

  const daysOpen = useMemo(() => {
    const createdAtMs = new Date(ticket.createdAt).getTime()
    return Math.max(1, Math.floor((Date.now() - createdAtMs) / oneDayMs))
  }, [ticket.createdAt])

  const sortedFeed = useMemo(() => {
    return [...feedItems].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
  }, [feedItems])

  const appendSystemEvent = (message: string) => {
    const event: SystemEvent = {
      id: `evt-${Date.now()}`,
      type: "system",
      actorName: VENDOR_USER.name,
      message,
      createdAt: new Date().toISOString(),
    }
    setFeedItems((prev) => [...prev, event])
  }

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/dashboard/issues/${ticket.id}`

    try {
      await navigator.clipboard.writeText(link)
      toast({
        title: "Link copied",
        description: "Ticket URL is now in your clipboard.",
      })
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard access was blocked in this browser context.",
        variant: "destructive",
      })
    }
  }

  const handleStatusChange = (nextStatus: TicketStatus) => {
    if (nextStatus === ticket.status) {
      return
    }

    const previousStatus = ticket.status
    setTicket((prev) => ({ ...prev, status: nextStatus }))
    appendSystemEvent(`changed status from ${previousStatus} to ${nextStatus}`)

    if (nextStatus === "Ready for Retest") {
      toast({
        title: "Status updated",
        description:
          "Retest alert automatically sent to Reporter.",
      })
      return
    }

    toast({
      title: "Status updated",
      description: `Ticket moved to ${nextStatus}.`,
    })
  }

  const handleAssigneeChange = (assigneeId: string) => {
    const previousAssignee =
      DEV_USERS.find((user) => user.id === ticket.assigneeId)?.name ?? "Unassigned"
    const nextAssignee =
      DEV_USERS.find((user) => user.id === assigneeId)?.name ?? "Unassigned"

    if (previousAssignee === nextAssignee) {
      return
    }

    setTicket((prev) => ({ ...prev, assigneeId }))
    appendSystemEvent(`reassigned ticket from ${previousAssignee} to ${nextAssignee}`)

    toast({
      title: "Assignee updated",
      description: `Ticket assigned to ${nextAssignee}.`,
    })
  }

  const handleAttachmentPick = () => {
    fileInputRef.current?.click()
  }

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setAttachedProofName(file.name)
    toast({
      title: "Proof attached",
      description: `${file.name} added to your next update.`,
    })

    event.target.value = ""
  }

  const handlePostUpdate = () => {
    const trimmed = commentInput.trim()
    if (!trimmed) {
      toast({
        title: "Add a message",
        description: "Type an update before posting.",
        variant: "destructive",
      })
      return
    }

    const comment: Comment = {
      id: `cmt-${Date.now()}`,
      type: "comment",
      author: VENDOR_USER,
      body: trimmed,
      createdAt: new Date().toISOString(),
      notifyReporter,
      attachmentName: attachedProofName || undefined,
    }

    setFeedItems((prev) => [...prev, comment])
    setCommentInput("")
    setAttachedProofName("")

    if (notifyReporter) {
      toast({
        title: "Update posted",
        description: "Update posted and Reporter notified.",
      })
      return
    }

    toast({
      title: "Update posted",
      description: "Update posted without sending reporter email.",
    })
  }

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-7rem)] bg-gray-50 p-4 md:p-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <header className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span>Dashboard</span>
              <span>/</span>
              <span>Issues</span>
              <span>/</span>
              <span className="font-medium text-gray-900">{ticket.id}</span>
            </div>

            <div className="flex flex-col items-start gap-2 lg:items-center">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 md:text-2xl">
                {ticket.title}
              </h1>
              <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                {ticket.applicationName}
              </Badge>
            </div>

            <div className="flex items-center justify-start gap-3 lg:justify-end">
              <Button variant="outline" onClick={handleCopyLink} className="gap-2">
                <ClipboardCopy className="size-4" />
                Copy Ticket Link
              </Button>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="size-5 text-gray-700" />
                <span className="absolute right-1 top-1 size-2 rounded-full bg-red-500" />
              </Button>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[7fr_3fr]">
            <section className="space-y-6">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="space-y-4">
                  <CardTitle className="text-lg text-gray-900">Bug Report Evidence</CardTitle>
                  <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-2 xl:grid-cols-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Environment</Badge>
                      <span className="font-medium text-gray-900">{ticket.environment}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Module/Page</Badge>
                      <span className="font-medium text-gray-900">{ticket.module}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Reporter</Badge>
                      <span className="font-medium text-gray-900">{ticket.reporter.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Date Submitted</Badge>
                      <span className="font-medium text-gray-900">{formatDateTime(ticket.createdAt)}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                        <CheckCircle2 className="size-4" />
                        Expected Result
                      </div>
                      <p className="text-sm leading-relaxed text-emerald-900">{ticket.expectedResult}</p>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50/70 p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-800">
                        <XCircle className="size-4" />
                        Actual Result
                      </div>
                      <p className="text-sm leading-relaxed text-red-900">{ticket.actualResult}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900">Reproduction Steps</h3>
                    <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
                      {ticket.reproductionSteps.map((step, index) => (
                        <li key={`${step}-${index}`}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900">Evidence Screenshot</h3>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="group relative block w-full overflow-hidden rounded-lg border border-gray-200 bg-white text-left focus:outline-none focus:ring-2 focus:ring-gray-400"
                        >
                          <img
                            src={ticket.screenshotUrl}
                            alt="Reporter evidence screenshot"
                            className="h-52 w-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
                          />
                          <div className="pointer-events-none absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/40 to-transparent p-3">
                            <span className="rounded bg-black/60 px-2 py-1 text-xs text-white">Click to zoom</span>
                            <FileImage className="size-4 text-white" />
                          </div>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[92vh] w-[96vw] max-w-6xl overflow-hidden border-0 bg-black p-0 sm:rounded-xl">
                        <img
                          src={ticket.screenshotUrl}
                          alt="Reporter evidence screenshot enlarged"
                          className="h-full max-h-[92vh] w-full object-contain"
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900">Audit & Communication Feed</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-[320px] rounded-lg border border-gray-200 bg-gray-50/60 p-3">
                    <div className="space-y-3 pr-2">
                      {sortedFeed.map((item) => {
                        if (item.type === "system") {
                          return (
                            <div
                              key={item.id}
                              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                            >
                              <p>
                                <span className="font-semibold">{item.actorName}</span> {item.message}
                              </p>
                              <p className="mt-1 text-xs text-amber-700">{formatDateTime(item.createdAt)}</p>
                            </div>
                          )
                        }

                        return (
                          <div key={item.id} className="rounded-md border border-gray-200 bg-white p-3">
                            <div className="flex items-start gap-3">
                              <Avatar className="size-8 border border-gray-200">
                                <AvatarFallback className="bg-gray-100 text-xs text-gray-700">
                                  {item.author.avatarFallback}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="text-sm font-semibold text-gray-900">{item.author.name}</span>
                                  <span className="text-xs text-gray-500">{formatDateTime(item.createdAt)}</span>
                                  {item.notifyReporter && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Reporter Notified
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-1 text-sm text-gray-700">{item.body}</p>
                                {item.attachmentName && (
                                  <p className="mt-2 inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                                    <Paperclip className="size-3" />
                                    {item.attachmentName}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>

                  <Separator />

                  <div className="space-y-3">
                    <Label htmlFor="resolution-update" className="text-sm font-medium text-gray-900">
                      Resolution Update
                    </Label>
                    <Textarea
                      id="resolution-update"
                      placeholder="Share investigation notes, patch details, and retest instructions for the reporter..."
                      value={commentInput}
                      onChange={(event) => setCommentInput(event.target.value)}
                      className="min-h-28 bg-white"
                    />

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap items-center gap-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAttachmentChange}
                          className="hidden"
                        />
                        <Button type="button" variant="outline" size="icon" onClick={handleAttachmentPick}>
                          <Paperclip className="size-4" />
                        </Button>
                        {attachedProofName ? (
                          <span className="text-xs text-gray-600">Attached: {attachedProofName}</span>
                        ) : (
                          <span className="text-xs text-gray-500">Attach proof-of-fix screenshot</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          id="notify-reporter"
                          checked={notifyReporter}
                          onCheckedChange={setNotifyReporter}
                        />
                        <Label htmlFor="notify-reporter" className="text-sm text-gray-700">
                          Notify Reporter via Email
                        </Label>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="button" onClick={handlePostUpdate}>
                        Post Update
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <aside className="lg:sticky lg:top-20 lg:self-start">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900">Control Panel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-800">Status</Label>
                    <Select value={ticket.status} onValueChange={(value) => handleStatusChange(value as TicketStatus)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Ready for Retest">Ready for Retest</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-800">Assignee</Label>
                    <Select value={ticket.assigneeId} onValueChange={handleAssigneeChange}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEV_USERS.map((developer) => (
                          <SelectItem key={developer.id} value={developer.id}>
                            {developer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Read-only Metadata</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">Category: {ticket.category}</Badge>
                      <Badge
                        className={
                          ticket.severity === "Critical"
                            ? "bg-red-100 text-red-800 hover:bg-red-100"
                            : ticket.severity === "High"
                              ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                              : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                        }
                      >
                        Severity: {ticket.severity}
                      </Badge>
                    </div>

                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock3 className="size-4" />
                        <span>
                          <strong>{daysOpen}</strong> days open
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-2 text-xs text-gray-600">
                      <p className="flex items-center gap-1">
                        <UserRound className="size-3.5" />
                        Reporter: {ticket.reporter.name}
                      </p>
                      <p className="flex items-center gap-1">
                        <CalendarDays className="size-3.5" />
                        Created: {formatDateTime(ticket.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
