"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, List, PlusCircle, User, ShieldCheck, BriefcaseBusiness } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
import { useAppPreferences } from "@/components/app-preferences-provider"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "My Issues", href: "/my-issues", icon: User },
  { name: "All Issues", href: "/issues", icon: List },
  { name: "Submit Issue", href: "/submit", icon: PlusCircle },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { userProfile } = useAuth()
  const { tx } = useAppPreferences()

  const sidebarItems = [
    ...navigation,
    ...(userProfile?.role === "Admin"
      ? [{ name: "Admin", href: "/dashboard/admin", icon: ShieldCheck }]
      : []),
    ...(userProfile?.role === "Vendor"
      ? [{ name: "Vendor Dashboard", href: "/vendor/dashboard", icon: BriefcaseBusiness }]
      : []),
  ]

  const resolveLabel = (name: string) => {
    if (name === "Dashboard") return tx("Dashboard", "ড্যাশবোর্ড")
    if (name === "My Issues") return tx("My Issues", "আমার ইস্যু")
    if (name === "All Issues") return tx("All Issues", "সব ইস্যু")
    if (name === "Submit Issue") return tx("Submit Issue", "ইস্যু জমা দিন")
    if (name === "Admin") return tx("Admin", "অ্যাডমিন")
    if (name === "Vendor Dashboard") return tx("Vendor Dashboard", "ভেন্ডর ড্যাশবোর্ড")
    return name
  }

  return (
    <aside className="fixed left-0 top-14 z-30 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r bg-card md:block">
      <nav className="flex flex-col gap-1 p-4">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              {resolveLabel(item.name)}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
