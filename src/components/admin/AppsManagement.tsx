"use client"

import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { AppForm } from "@/components/admin/AppForm"
import {
  deleteApp,
  type AppRecord,
  type AppsPageData,
  type VendorOption,
} from "@/app/actions/apps"
import { useToast } from "@/hooks/use-toast"

interface AppsManagementProps extends AppsPageData {}

function formatVendorLabel(vendor?: string | null) {
  return vendor?.trim() || "Unassigned"
}

function sortApps(apps: AppRecord[]) {
  return [...apps].sort((left, right) => left.name.localeCompare(right.name))
}

export function AppsManagement({ apps: initialApps, vendors: initialVendors }: AppsManagementProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [apps, setApps] = useState<AppRecord[]>(initialApps)
  const [vendors, setVendors] = useState<VendorOption[]>(initialVendors)
  const [formOpen, setFormOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<AppRecord | null>(null)
  const [deletingApp, setDeletingApp] = useState<AppRecord | null>(null)

  useEffect(() => {
    setApps(initialApps)
    setVendors(initialVendors)
  }, [initialApps, initialVendors])

  const vendorById = useMemo(
    () => new Map(vendors.map((vendor) => [vendor.vendor_id, vendor.vendor_name])),
    [vendors],
  )

  const openCreateDialog = () => {
    setEditingApp(null)
    setFormOpen(true)
  }

  const openEditDialog = (app: AppRecord) => {
    setEditingApp(app)
    setFormOpen(true)
  }

  const handleSaved = async (savedApp: AppRecord) => {
    setApps((current) => {
      const exists = current.some((item) => item.id === savedApp.id)
      const next = exists
        ? current.map((item) => (item.id === savedApp.id ? savedApp : item))
        : [...current, savedApp]

      return sortApps(next)
    })

    router.refresh()
  }

  const handleDelete = async () => {
    if (!deletingApp) return

    try {
      await deleteApp(deletingApp.id)
      setApps((current) => current.filter((item) => item.id !== deletingApp.id))
      setDeletingApp(null)
      router.refresh()

      toast({
        title: "App deleted",
        description: `${deletingApp.name} was removed from routing.`,
      })
    } catch (error) {
      toast({
        title: "Unable to delete app",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-4 border-b bg-gradient-to-r from-background to-muted/30 pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">Apps Management</CardTitle>
              <CardDescription className="max-w-2xl">
                Register applications, assign vendor groups, and keep routing data in sync without touching SQL.
              </CardDescription>
            </div>

            <Button onClick={openCreateDialog} className="w-full md:w-auto">
              <Plus className="size-4" />
              Add New App
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{apps.length} apps</Badge>
            <Badge variant="secondary">{vendors.length} vendors</Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-hidden rounded-b-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App Name</TableHead>
                  <TableHead>Short Name</TableHead>
                  <TableHead>Assigned Vendor</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-16 text-center text-muted-foreground">
                      No apps have been configured yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  apps.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium leading-none">{app.name}</p>
                          <p className="text-xs text-muted-foreground">ID #{app.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{app.short_name || "-"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{formatVendorLabel(vendorById.get(app.vendor_id ?? "") ?? app.vendor_name)}</p>
                          {app.vendor_id ? (
                            <p className="text-xs text-muted-foreground">{app.vendor_id}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(app)}>
                            <Pencil className="size-4" />
                            Edit
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeletingApp(app)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AppForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editingApp ? "edit" : "create"}
        app={editingApp}
        vendors={vendors}
        onSaved={handleSaved}
      />

      <AlertDialog open={Boolean(deletingApp)} onOpenChange={(open) => !open && setDeletingApp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete App</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deletingApp?.name ?? "this app"} from the routing table.
              Existing issues tied to this app will keep their historical data, but the app will no longer be available for new routing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}