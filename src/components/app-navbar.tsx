"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, ChevronDown, Bell } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { applications, getStoredNotifications, markAllNotificationsRead, type AppNotification } from "@/lib/mock-data"
import { useAuth } from "@/components/auth-provider"
import { useEffect } from "react"

export function AppNavbar() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { user, userProfile, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    getStoredNotifications().then(setNotifications)
  }, [])

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const recentNotifications = notifications.slice(0, 3)

  const handleNotificationsOpen = async (isOpen: boolean) => {
    if (isOpen && unreadCount > 0) {
      // Optimistically update UI
      setNotifications(notifications.map(n => ({ ...n, isRead: true })))
      await markAllNotificationsRead()
    }
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b bg-card">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        {/* Mobile menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-56 p-0">
            <div className="border-b px-6 py-4">
              <span className="text-lg font-bold text-primary">BRAC UAT</span>
            </div>
            <nav className="flex flex-col gap-1 p-4">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/issues"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Issues
              </Link>
              <Link
                href="/submit"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Submit Issue
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">BRAC UAT</span>
        </Link>

        {/* Right: Notifications & User Avatar */}
        <div className="ml-auto flex items-center gap-2">
          
          <DropdownMenu onOpenChange={handleNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-600 border border-white"></span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between p-2">
                <h4 className="font-semibold text-sm">Notifications</h4>
              </div>
              <DropdownMenuSeparator />
              {recentNotifications.length > 0 ? (
                <div className="flex flex-col gap-1 py-1">
                  {recentNotifications.map((notification) => (
                    <DropdownMenuItem key={notification.id} asChild>
                      <Link href={notification.linkHref || "#"} className="flex flex-col items-start px-3 py-2 cursor-pointer">
                        <span className="text-sm font-medium">{notification.title}</span>
                        <span className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              ) : (
                <div className="py-4 px-2 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              )}
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                  <Link href="/notifications">See all notifications</Link>
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{userProfile?.name || user?.email?.split('@')[0] || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer w-full">Profile / Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
