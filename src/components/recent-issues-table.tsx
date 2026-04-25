"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { StatusBadge, SeverityBadge } from "@/components/status-badge"
import { issues, getStoredIssues, type Issue } from "@/lib/mock-data"

export function RecentIssuesTable() {
  const [localIssues, setLocalIssues] = useState<Issue[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getStoredIssues().then(data => {
      setLocalIssues(data)
      setIsLoading(false)
    })
  }, [])

  const recentIssues = localIssues.slice(0, 6)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[300px]">Title</TableHead>
          <TableHead>Application</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Assigned To</TableHead>
          <TableHead className="text-right">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
              Loading recent issues...
            </TableCell>
          </TableRow>
        ) : recentIssues.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
              No recent issues.
            </TableCell>
          </TableRow>
        ) : (
          recentIssues.map((issue) => (
          <TableRow key={issue.id} className="cursor-pointer hover:bg-muted/50">
            <TableCell>
              <Link
                href={`/issues/${issue.id}`}
                className="font-medium hover:underline"
              >
                <span className="text-muted-foreground mr-2">{issue.id}</span>
                {issue.title}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="font-normal">
                {issue.application}
              </Badge>
            </TableCell>
            <TableCell>
              <StatusBadge status={issue.status} />
            </TableCell>
            <TableCell>
              <SeverityBadge severity={issue.severity} showDot />
            </TableCell>
            <TableCell className="text-muted-foreground">{issue.assignedTo}</TableCell>
            <TableCell className="text-right text-muted-foreground">
              {new Date(issue.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </TableCell>
          </TableRow>
        )))}
      </TableBody>
    </Table>
  )
}
