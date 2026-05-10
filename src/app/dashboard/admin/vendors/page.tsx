"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Edit2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
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
import { AppLayout } from "@/components/app-layout"
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  createVendor,
  updateVendor,
  deleteVendor,
  getAllVendors,
  type Vendor,
  type VendorCreateInput,
} from "@/app/actions/vendors"

const vendorSchema = z.object({
  name: z.string().trim().min(1, "Vendor name is required"),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
})

type VendorFormValues = z.infer<typeof vendorSchema>

export default function VendorsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  })

  useEffect(() => {
    loadVendors()
  }, [])

  const loadVendors = async () => {
    try {
      setIsLoading(true)
      const data = await getAllVendors()
      setVendors(data)
    } catch (error) {
      toast({
        title: "Failed to load vendors",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddClick = () => {
    setFormMode("create")
    setSelectedVendor(null)
    form.reset({ name: "", email: "" })
    setFormOpen(true)
  }

  const handleEditClick = (vendor: Vendor) => {
    setFormMode("edit")
    setSelectedVendor(vendor)
    form.reset({
      name: vendor.name,
      email: vendor.email || "",
    })
    setFormOpen(true)
  }

  const handleDeleteClick = (vendor: Vendor) => {
    setVendorToDelete(vendor)
    setDeleteConfirmOpen(true)
  }

  const onSubmit = async (values: VendorFormValues) => {
    setIsSubmitting(true)
    try {
      const payload: VendorCreateInput = {
        name: values.name.trim(),
        email: values.email?.trim() || null,
      }

      if (formMode === "create") {
        await createVendor(payload)
        toast({
          title: "Vendor created",
          description: `${payload.name} has been added successfully.`,
        })
      } else if (selectedVendor) {
        await updateVendor(selectedVendor.id, payload)
        toast({
          title: "Vendor updated",
          description: `${payload.name} has been updated successfully.`,
        })
      }

      await loadVendors()
      setFormOpen(false)
      form.reset({ name: "", email: "" })
    } catch (error) {
      console.error("Vendor save error:", error)
      toast({
        title: "Failed to save vendor",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!vendorToDelete) return

    setIsDeleting(true)
    try {
      await deleteVendor(vendorToDelete.id)
      toast({
        title: "Vendor deleted",
        description: `${vendorToDelete.name} has been removed successfully.`,
      })
      await loadVendors()
      setDeleteConfirmOpen(false)
      setVendorToDelete(null)
    } catch (error) {
      toast({
        title: "Failed to delete vendor",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vendor Management</h1>
            <p className="text-muted-foreground">
              Manage vendor profiles and assign them to applications
            </p>
          </div>
          <Button onClick={handleAddClick} className="gap-2">
            <Plus className="size-4" />
            Add Vendor
          </Button>
        </div>

        {/* Vendors Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Loading vendors...
                  </TableCell>
                </TableRow>
              ) : vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No vendors found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {vendor.email || "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {vendor.created_at
                        ? new Date(vendor.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(vendor)}
                          className="gap-1"
                        >
                          <Edit2 className="size-4" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(vendor)}
                          className="gap-1"
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
      </div>

      {/* Add/Edit Vendor Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "Add New Vendor" : "Edit Vendor"}
            </DialogTitle>
            <DialogDescription>
              {formMode === "create"
                ? "Create a new vendor profile that can be assigned to applications."
                : "Update the vendor profile information."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Acme Technologies" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="contact@vendor.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Vendor"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{vendorToDelete?.name}</span>?
              This action cannot be undone. Any applications assigned to this vendor will have their vendor
              assignment cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
