import { createClient } from "@/lib/supabase/server"

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-muted/40 p-6">
        <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center rounded-lg border bg-card p-6 shadow-sm">
          <div>
            <h1 className="text-xl font-semibold">Access denied</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You need to sign in as an administrator to access this area.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (error || (profile?.role ?? "").toString().toLowerCase() !== "admin") {
    return (
      <div className="min-h-screen bg-muted/40 p-6">
        <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center rounded-lg border bg-card p-6 shadow-sm">
          <div>
            <h1 className="text-xl font-semibold">Access denied</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Only administrators can manage this section.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return children
}