"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  createApp,
  updateApp,
  type AppRecord,
  type AppUpsertInput,
  type VendorOption,
} from "@/app/actions/apps"

const appSchema = z.object({
  name: z.string().trim().min(1, "App name is required"),
  short_name: z.string().trim().max(50, "Short name must be 50 characters or fewer").optional().or(z.literal("")),
  vendor_id: z.string().optional().nullable(),
})

type AppFormValues = z.infer<typeof appSchema>

interface AppFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  vendors: VendorOption[]
  app?: AppRecord | null
  onSaved: (app: AppRecord) => Promise<void> | void
}

export function AppForm({ open, onOpenChange, mode, vendors, app, onSaved }: AppFormProps) {
  const { toast } = useToast()

  const form = useForm<AppFormValues>({
    resolver: zodResolver(appSchema),
    defaultValues: {
      name: "",
      short_name: "",
      vendor_id: "__none__",
    },
  })

  useEffect(() => {
    if (!open) return

    form.reset({
      name: app?.name ?? "",
      short_name: app?.short_name ?? "",
      vendor_id: app?.vendor_id ?? "__none__",
    })
  }, [app, form, open])

  const handleSubmit = async (values: AppFormValues) => {
    const payload: AppUpsertInput = {
      name: values.name.trim(),
      short_name: values.short_name?.trim() || null,
      vendor_id:
        values.vendor_id === "__none__"
          ? null
          : values.vendor_id?.trim()
          ? values.vendor_id.trim()
          : null,
    }

    try {
      const savedApp = mode === "create"
        ? await createApp(payload)
        : await updateApp(app?.id ?? 0, payload)

      await onSaved(savedApp)
      onOpenChange(false)
      form.reset({ name: "", short_name: "", vendor_id: "__none__" })

      toast({
        title: mode === "create" ? "App created" : "App updated",
        description: `${savedApp.name} has been saved successfully.`,
      })
    } catch (error) {
      toast({
        title: "Unable to save app",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  const dialogTitle = mode === "create" ? "Add New App" : "Edit App"
  const dialogDescription =
    mode === "create"
      ? "Register a new application and assign the vendor group responsible for it."
      : "Update the application routing details and vendor assignment."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    App Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Customer Relationship Manager" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="short_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="CRM" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vendor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Vendor (optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "__none__"}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a vendor (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None (Internal App)</SelectItem>
                      {vendors.length === 0 ? (
                        <SelectItem disabled value="__empty__">
                          No other vendors available
                        </SelectItem>
                      ) : (
                        vendors.map((vendor) => (
                          <SelectItem key={vendor.vendor_id} value={vendor.vendor_id}>
                            {vendor.vendor_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : mode === "create" ? "Create App" : "Update App"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}