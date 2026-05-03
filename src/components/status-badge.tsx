import { cn } from "@/lib/utils"
import { statusConfig, severityConfig, categoryConfig } from "@/lib/mock-data"
import type { IssueStatus, Severity, Category } from "@/lib/mock-data"

interface StatusBadgeProps {
  status: IssueStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const defaultConfig = { 
    label: "Unknown", 
    bgColor: "bg-gray-100 border-gray-300", 
    color: "text-gray-800" 
  }
  const config = statusConfig[status] || defaultConfig
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.bgColor,
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  )
}

interface SeverityBadgeProps {
  severity: Severity
  showDot?: boolean
  className?: string
}

export function SeverityBadge({ severity, showDot = false, className }: SeverityBadgeProps) {
  const defaultConfig = { 
    label: "Unknown", 
    color: "text-gray-800", 
    dotColor: "bg-gray-400" 
  }
  const config = severityConfig[severity] || defaultConfig
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", config.color, className)}>
      {showDot && <span className={cn("size-2 rounded-full", config.dotColor)} />}
      {config.label}
    </span>
  )
}

interface CategoryBadgeProps {
  category: Category
  className?: string
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const defaultConfig = { 
    label: "Unknown", 
    color: "text-gray-800 bg-gray-50" 
  }
  const config = categoryConfig[category] || defaultConfig
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  )
}
