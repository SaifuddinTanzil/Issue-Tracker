"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  ChevronDown,
  Circle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getManagedUserByEmail } from "@/lib/access-control";
import { getIssuesForUser, type Issue } from "@/lib/mock-data";

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

type TicketStatus =
  | "Open"
  | "In Progress"
  | "Ready for Retest"
  | "Blocked"
  | "Closed";

type TicketSeverity = "Low" | "Medium" | "High";

type TicketCategory = "Bug" | "UI/UX" | "Suggestion";

interface KanbanTicket {
  id: string;
  title: string;
  applicationName: string;
  category: TicketCategory;
  severity: TicketSeverity;
  status: TicketStatus;
  reporterName: string;
}

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────

const KANBAN_COLUMNS: TicketStatus[] = [
  "Open",
  "In Progress",
  "Ready for Retest",
  "Blocked",
  "Closed",
];

const COLUMN_META: Record<
  TicketStatus,
  { icon: typeof Circle; colorClass: string; bgClass: string; dotColor: string }
> = {
  Open: {
    icon: Circle,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-50 border-blue-200",
    dotColor: "bg-blue-500",
  },
  "In Progress": {
    icon: Clock,
    colorClass: "text-violet-600",
    bgClass: "bg-violet-50 border-violet-200",
    dotColor: "bg-violet-500",
  },
  "Ready for Retest": {
    icon: RotateCcw,
    colorClass: "text-teal-600",
    bgClass: "bg-teal-50 border-teal-200",
    dotColor: "bg-teal-500",
  },
  Blocked: {
    icon: AlertTriangle,
    colorClass: "text-amber-600",
    bgClass: "bg-amber-50 border-amber-200",
    dotColor: "bg-amber-500",
  },
  Closed: {
    icon: CheckCircle2,
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50 border-emerald-200",
    dotColor: "bg-emerald-500",
  },
};

const SEVERITY_CONFIG: Record<
  TicketSeverity,
  { bg: string; text: string; ring: string }
> = {
  High: {
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-600/20",
  },
  Medium: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-600/20",
  },
  Low: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-600/20",
  },
};

const APP_COLORS: Record<string, string> = {
  CRM: "bg-blue-100 text-blue-700",
  ERP: "bg-purple-100 text-purple-700",
  HCM: "bg-pink-100 text-pink-700",
  SCP: "bg-orange-100 text-orange-700",
  BID: "bg-cyan-100 text-cyan-700",
};

// ──────────────────────────────────────────────────────────
// Mock Data — 8 diverse tickets
// ──────────────────────────────────────────────────────────

const INITIAL_TICKETS: KanbanTicket[] = [
  {
    id: "UAT-1001",
    title: "Login page crashes on invalid SSO token refresh",
    applicationName: "CRM",
    category: "Bug",
    severity: "High",
    status: "Open",
    reporterName: "Sarah Chen",
  },
  {
    id: "UAT-1002",
    title: "Dashboard chart tooltips are clipped on mobile viewport",
    applicationName: "BID",
    category: "UI/UX",
    severity: "Medium",
    status: "Open",
    reporterName: "James Rodriguez",
  },
  {
    id: "UAT-1003",
    title: "Payroll export takes over 45 seconds for 500+ records",
    applicationName: "HCM",
    category: "Suggestion",
    severity: "High",
    status: "In Progress",
    reporterName: "Anika Patel",
  },
  {
    id: "UAT-1004",
    title: "Add bulk-action checkboxes to inventory grid view",
    applicationName: "SCP",
    category: "Suggestion",
    severity: "Low",
    status: "Blocked",
    reporterName: "Marcus Liu",
  },
  {
    id: "UAT-1005",
    title: "Form validation error messages overlap input labels",
    applicationName: "ERP",
    category: "UI/UX",
    severity: "Medium",
    status: "In Progress",
    reporterName: "Rachel Foster",
  },
  {
    id: "UAT-1006",
    title: "Contact merge duplicates linked activities in timeline",
    applicationName: "CRM",
    category: "Bug",
    severity: "High",
    status: "In Progress",
    reporterName: "David Kim",
  },
  {
    id: "UAT-1007",
    title: "Employee onboarding wizard skips step 3 on Firefox",
    applicationName: "HCM",
    category: "Bug",
    severity: "Medium",
    status: "Ready for Retest",
    reporterName: "Olivia Santos",
  },
  {
    id: "UAT-1008",
    title: "Report scheduling now correctly handles timezone offsets",
    applicationName: "BID",
    category: "Bug",
    severity: "Low",
    status: "Closed",
    reporterName: "Thomas Wright",
  },
];

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────

export default function ManagerKanbanDashboard() {
  const { user, userProfile } = useAuth();
  const [tickets, setTickets] = useState<KanbanTicket[]>([]);
  const [filterApp, setFilterApp] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Load tickets based on user role and assigned apps
  useEffect(() => {
    const loadTickets = async () => {
      setIsLoading(true);
      try {
        const managedUser = await getManagedUserByEmail(user?.email);
        const role = (managedUser?.role || userProfile?.role || "Reporter") as "Admin" | "Resolver" | "Reporter";
        const assignedApps = managedUser?.assignedApps || [];

        // Get issues filtered by user role and assigned apps
        const issues = await getIssuesForUser(role, assignedApps);

        // Convert Issue objects to KanbanTicket format
        const kbTickets: KanbanTicket[] = issues.map((issue: Issue) => ({
          id: issue.id,
          title: issue.title,
          applicationName: issue.application,
          category: issue.category as TicketCategory,
          severity: issue.severity as TicketSeverity,
          status: getStatusForKanban(issue.status),
          reporterName: issue.reporter,
        }));

        setTickets(kbTickets);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.email) {
      loadTickets();
    }
  }, [user?.email, userProfile?.role]);

  // Helper to map Issue status to KanbanTicket status
  function getStatusForKanban(issueStatus: string): TicketStatus {
    const statusMap: Record<string, TicketStatus> = {
      "open": "Open",
      "in-progress": "In Progress",
      "blocked": "Blocked",
      "ready-for-retest": "Ready for Retest",
      "closed": "Closed",
    };
    return statusMap[issueStatus] || "Open";
  }

  // Unique application names for filter dropdown
  const applicationOptions = useMemo(() => {
    const names = [...new Set(tickets.map((t) => t.applicationName))];
    return names.sort();
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchApp = filterApp === "all" || t.applicationName === filterApp;
      const matchSev =
        filterSeverity === "all" || t.severity === filterSeverity;
      return matchApp && matchSev;
    });
  }, [tickets, filterApp, filterSeverity]);

  // Move ticket to a new status
  const moveTicket = (ticketId: string, direction: "prev" | "next") => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        const idx = KANBAN_COLUMNS.indexOf(t.status);
        const newIdx =
          direction === "next"
            ? Math.min(idx + 1, KANBAN_COLUMNS.length - 1)
            : Math.max(idx - 1, 0);
        return { ...t, status: KANBAN_COLUMNS[newIdx] };
      })
    );
  };

  // Count tickets per column (filtered)
  const columnCounts = useMemo(() => {
    const counts: Record<TicketStatus, number> = {
      Open: 0,
      "In Progress": 0,
      "Ready for Retest": 0,
      Blocked: 0,
      Closed: 0,
    };
    filteredTickets.forEach((t) => counts[t.status]++);
    return counts;
  }, [filteredTickets]);

  const isFilterActive = filterApp !== "all" || filterSeverity !== "all";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading Kanban board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* ── Filter Control Bar ── */}
      <div className="sticky top-14 z-20 border-b border-surface-200 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 items-center gap-3">
            <div className="flex items-center gap-1.5 text-surface-500">
              <Filter className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Filters
              </span>
            </div>

            <div className="h-4 w-px bg-surface-200" />

            {/* Application Filter */}
            <div className="relative">
              <select
                id="filter-application"
                value={filterApp}
                onChange={(e) => setFilterApp(e.target.value)}
                className="appearance-none rounded-md border border-surface-200 bg-white pl-3 pr-8 py-1.5 text-xs font-medium text-surface-700 shadow-sm transition-all hover:border-surface-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
              >
                <option value="all">All Applications</option>
                {applicationOptions.map((app) => (
                  <option key={app} value={app}>
                    {app}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-surface-400" />
            </div>

            {/* Severity Filter */}
            <div className="relative">
              <select
                id="filter-severity"
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="appearance-none rounded-md border border-surface-200 bg-white pl-3 pr-8 py-1.5 text-xs font-medium text-surface-700 shadow-sm transition-all hover:border-surface-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
              >
                <option value="all">All Severities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-surface-400" />
            </div>

            {/* Active filter indicator + reset */}
            {isFilterActive && (
              <button
                onClick={() => {
                  setFilterApp("all");
                  setFilterSeverity("all");
                }}
                className="flex items-center gap-1 rounded-md bg-primary-50 px-2.5 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
              >
                <RotateCcw className="h-3 w-3" />
                Clear filters
              </button>
            )}

            <div className="ml-auto hidden sm:flex items-center gap-1 text-xs text-surface-400">
              <Search className="h-3 w-3" />
              <span>
                Showing{" "}
                <span className="font-semibold text-surface-600">
                  {filteredTickets.length}
                </span>{" "}
                of {tickets.length} tickets
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Kanban Board ── */}
      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-5 gap-4 min-h-[calc(100vh-10rem)]">
          {KANBAN_COLUMNS.map((column) => {
            const meta = COLUMN_META[column];
            const Icon = meta.icon;
            const cardsInColumn = filteredTickets.filter(
              (t) => t.status === column
            );

            return (
              <div key={column} className="flex flex-col min-w-0">
                {/* Column Header */}
                <div
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 mb-3 ${meta.bgClass}`}
                >
                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${meta.colorClass}`} />
                  <h2
                    className={`text-xs font-bold uppercase tracking-wider truncate ${meta.colorClass}`}
                  >
                    {column}
                  </h2>
                  <span
                    className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full text-[10px] font-bold ${meta.colorClass} ${meta.bgClass}`}
                  >
                    {columnCounts[column]}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex flex-1 flex-col gap-2.5 rounded-lg bg-surface-100/60 p-2 overflow-y-auto">
                  {cardsInColumn.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-surface-200 p-4">
                      <p className="text-[11px] text-surface-400 text-center">
                        No tickets
                      </p>
                    </div>
                  ) : (
                    cardsInColumn.map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        onMove={moveTicket}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Ticket Card Component
// ──────────────────────────────────────────────────────────

function TicketCard({
  ticket,
  onMove,
}: {
  ticket: KanbanTicket;
  onMove: (id: string, dir: "prev" | "next") => void;
}) {
  const statusIdx = KANBAN_COLUMNS.indexOf(ticket.status);
  const canMovePrev = statusIdx > 0;
  const canMoveNext = statusIdx < KANBAN_COLUMNS.length - 1;
  const sevConfig = SEVERITY_CONFIG[ticket.severity];
  const appColor = APP_COLORS[ticket.applicationName] ?? "bg-gray-100 text-gray-700";

  return (
    <div className="group relative rounded-lg border border-surface-200 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md hover:border-surface-300 hover:-translate-y-0.5">
      {/* Ticket ID + Category */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-surface-400 tracking-wide">
          {ticket.id}
        </span>
        <span className="text-[10px] font-medium text-surface-500 bg-surface-50 px-1.5 py-0.5 rounded">
          {ticket.category}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-xs font-semibold text-surface-800 leading-snug mb-2.5 line-clamp-2">
        {ticket.title}
      </h3>

      {/* Badges Row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {/* Application Badge */}
        <span
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ring-current/10 ${appColor}`}
        >
          {ticket.applicationName}
        </span>

        {/* Severity Badge */}
        <span
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${sevConfig.bg} ${sevConfig.text} ${sevConfig.ring}`}
        >
          {ticket.severity}
        </span>
      </div>

      {/* Reporter + Movement Controls */}
      <div className="flex items-center justify-between border-t border-surface-100 pt-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-100 text-surface-500">
            <User className="h-2.5 w-2.5" />
          </div>
          <span className="text-[10px] text-surface-500 truncate">
            {ticket.reporterName}
          </span>
        </div>

        {/* Arrow Buttons */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onMove(ticket.id, "prev")}
            disabled={!canMovePrev}
            title={
              canMovePrev
                ? `Move to ${KANBAN_COLUMNS[statusIdx - 1]}`
                : "Already at first status"
            }
            className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
              canMovePrev
                ? "text-surface-500 hover:bg-primary-50 hover:text-primary-600 cursor-pointer"
                : "text-surface-200 cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onMove(ticket.id, "next")}
            disabled={!canMoveNext}
            title={
              canMoveNext
                ? `Move to ${KANBAN_COLUMNS[statusIdx + 1]}`
                : "Already at last status"
            }
            className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
              canMoveNext
                ? "text-surface-500 hover:bg-primary-50 hover:text-primary-600 cursor-pointer"
                : "text-surface-200 cursor-not-allowed"
            }`}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
