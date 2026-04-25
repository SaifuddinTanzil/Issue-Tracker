"use client"

import { useState } from "react"
import { AppNavbar } from "@/components/app-navbar"
import { AppSidebar } from "@/components/app-sidebar"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-muted/40">
      <AppNavbar />
      <AppSidebar />
      <main className="pt-14 md:pl-56">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  )
}
