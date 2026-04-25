"use client"

import { useEffect, useState } from "react"

import { AlertCircle, Clock, CheckCircle2, RefreshCw, Archive } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppLayout } from "@/components/app-layout"
import { StatsCard } from "@/components/stats-card"
import { RecentIssuesTable } from "@/components/recent-issues-table"
import { getIssueStats, getStoredIssues, type Issue } from "@/lib/mock-data"

export default function DashboardPage() {
  const [localIssues, setLocalIssues] = useState<Issue[]>([])
  
  useEffect(() => {
    getStoredIssues().then(setLocalIssues)
  }, [])

  const stats = getIssueStats(localIssues)

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of UAT issues across all applications
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatsCard
            title="Total Issues"
            value={stats.total}
            icon={Archive}
            iconColor="text-foreground"
          />
          <StatsCard
            title="Open"
            value={stats.open}
            icon={AlertCircle}
            iconColor="text-blue-600"
          />
          <StatsCard
            title="In Progress"
            value={stats.inProgress}
            icon={Clock}
            iconColor="text-indigo-600"
          />
          <StatsCard
            title="Ready for Retest"
            value={stats.readyForRetest}
            icon={RefreshCw}
            iconColor="text-emerald-600"
          />
          <StatsCard
            title="Closed"
            value={stats.closed}
            icon={CheckCircle2}
            iconColor="text-gray-600"
          />
        </div>

        {/* Recent Issues Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentIssuesTable />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}