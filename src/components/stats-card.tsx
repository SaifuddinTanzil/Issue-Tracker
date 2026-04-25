import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: number
  icon: LucideIcon
  iconColor?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatsCard({ title, value, icon: Icon, iconColor = "text-muted-foreground" }: StatsCardProps) {
  return (
    <Card className="py-4">
      <CardContent className="px-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={cn("rounded-lg bg-muted p-2.5", iconColor)}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
