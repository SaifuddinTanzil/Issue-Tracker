"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppLayout } from "@/components/app-layout"
import { getStoredNotifications, markAllNotificationsRead, type AppNotification } from "@/lib/mock-data"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    getStoredNotifications().then(data => {
      setNotifications(data)
      // Also mark them as read in the database since they are viewing the page
      markAllNotificationsRead()
    })
  }, [])

  const handleMarkAsRead = async () => {
    await markAllNotificationsRead()
    setNotifications(notifications.map(n => ({ ...n, isRead: true })))
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated on your issues and mentions
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleMarkAsRead}>
            Mark all as read
          </Button>
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border">
              You have no notifications.
            </div>
          ) : (
            notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`p-4 transition-colors hover:bg-muted/50 ${!notification.isRead ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                <Link href={notification.linkHref || "#"} className="flex flex-col gap-1 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <h3 className={`text-base ${!notification.isRead ? 'font-bold' : 'font-medium'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {new Date(notification.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <p className={`text-sm ${!notification.isRead ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {notification.message}
                  </p>
                </Link>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  )
}
