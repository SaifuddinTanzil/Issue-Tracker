"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Search, X } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AppLayout } from "@/components/app-layout"
import { useAuth } from "@/components/auth-provider"
import { useAppPreferences } from "@/components/app-preferences-provider"
import { StatusBadge, SeverityBadge, CategoryBadge } from "@/components/status-badge"
import {
  issues,
  getStoredIssues,
  applications,
  statusConfig,
  severityConfig,
  categoryConfig,
  type IssueStatus,
  type Severity,
  type Category,
  type Issue,
} from "@/lib/mock-data"
import { getAllowedAppsForUser } from "@/lib/access-control"

const environments = [
  { value: "uat", label: "UAT" },
  { value: "staging", label: "Staging" },
  { value: "production", label: "Production" },
]

export default function IssuesPage() {
  const { user, userProfile } = useAuth()
  const { tx } = useAppPreferences()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all")
  const [applicationFilter, setApplicationFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  const [localIssues, setLocalIssues] = useState<Issue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [allowedApps, setAllowedApps] = useState<string[]>([])

  useEffect(() => {
    getStoredIssues().then(data => {
      setLocalIssues(data)
      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    getAllowedAppsForUser(user?.email, userProfile?.role).then(setAllowedApps)
  }, [user?.email, userProfile?.role])

  const hasMultiAppAccess = allowedApps.includes("*") || allowedApps.length > 1
  const singleAppName = "BRAC Microfinance Portal"
  const visibleApplications = allowedApps.includes("*")
    ? applications
    : applications.filter((app) => allowedApps.includes(app.name))

  const filteredIssues = useMemo(() => {
    const scopedIssues =
      allowedApps.includes("*")
        ? localIssues
        : localIssues.filter((issue) => allowedApps.includes(issue.application))

    return scopedIssues.filter((issue) => {
      const matchesSearch =
        searchQuery === "" ||
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.id.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || issue.status === statusFilter
      const matchesSeverity = severityFilter === "all" || issue.severity === severityFilter
      const matchesCategory = categoryFilter === "all" || issue.category === categoryFilter
      const matchesEnvironment = environmentFilter === "all" || issue.environment === environmentFilter
      const matchesApplication = applicationFilter === "all" || issue.application === applicationFilter

      return matchesSearch && matchesStatus && matchesSeverity && matchesCategory && matchesEnvironment && matchesApplication
    })
  }, [localIssues, allowedApps, searchQuery, statusFilter, severityFilter, categoryFilter, environmentFilter, applicationFilter])

  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage)
  const paginatedIssues = filteredIssues.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const hasActiveFilters =
    statusFilter !== "all" ||
    severityFilter !== "all" ||
    categoryFilter !== "all" ||
    environmentFilter !== "all" ||
    applicationFilter !== "all"

  const clearFilters = () => {
    setStatusFilter("all")
    setSeverityFilter("all")
    setCategoryFilter("all")
    setEnvironmentFilter("all")
    setApplicationFilter("all")
    setCurrentPage(1)
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{tx("Issues", "ইস্যু")}</h1>
            <p className="text-muted-foreground">
              {hasMultiAppAccess ? (
                tx("Browse and triage issues across all applications", "সব অ্যাপ্লিকেশনের ইস্যু দেখুন ও সাজান")
              ) : (
                <>{tx("Issues for", "ইস্যু:")} <span className="font-medium text-foreground">{singleAppName}</span></>
              )}
            </p>
          </div>
          <Link href="/submit">
            <Button>{tx("Submit Issue", "ইস্যু জমা দিন")}</Button>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={applicationFilter}
            onValueChange={(value) => {
              setApplicationFilter(value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Application" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Applications</SelectItem>
              {visibleApplications.map((app) => (
                <SelectItem key={app.id} value={app.name}>
                  {app.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={severityFilter}
            onValueChange={(value) => {
              setSeverityFilter(value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              {Object.entries(severityConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={categoryFilter}
            onValueChange={(value) => {
              setCategoryFilter(value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Category</SelectItem>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={environmentFilter}
            onValueChange={(value) => {
              setEnvironmentFilter(value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Environments</SelectItem>
              {environments.map((env) => (
                <SelectItem key={env.value} value={env.value}>
                  {env.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2 text-muted-foreground">
              <X className="mr-1 size-4" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Issues Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[320px]">Title</TableHead>
                <TableHead>Application</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Loading issues from database...
                  </TableCell>
                </TableRow>
              ) : paginatedIssues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {tx("No issues found matching your criteria.", "আপনার ফিল্টার অনুযায়ী কোনও ইস্যু পাওয়া যায়নি।")}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedIssues.map((issue) => (
                  <TableRow key={issue.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/issues/${issue.id}`} className="block">
                        <span className="text-muted-foreground mr-2 text-xs">{issue.id}</span>
                        <span className="font-medium hover:underline">{issue.title}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal text-xs">
                        {issue.application}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={issue.category} />
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={issue.severity} showDot />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={issue.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {issue.assignedTo}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {new Date(issue.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredIssues.length)} of{" "}
                {filteredIssues.length} issues
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      className="w-8"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
