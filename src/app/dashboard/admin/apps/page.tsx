import { AppLayout } from "@/components/app-layout"
import { AppsManagement } from "@/components/admin/AppsManagement"
import { getAppsPageData } from "@/app/actions/apps"
import { createClient } from "@/lib/supabase/server"

export default async function AdminAppsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <AppLayout>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need to sign in as an administrator to manage apps.
          </p>
        </div>
      </AppLayout>
    )
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (error || (profile?.role ?? "").toString().toLowerCase() !== "admin") {
    return (
      <AppLayout>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Only administrators can manage application routing and vendor assignments.
          </p>
        </div>
      </AppLayout>
    )
  }

  const data = await getAppsPageData()

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl">
        <AppsManagement apps={data.apps} vendors={data.vendors} />
      </div>
    </AppLayout>
  )
}