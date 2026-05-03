import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { filterTicketsForVendor, mapVendorTicket, readVendorIdentifier, statusLabel, statusPillClass } from "@/lib/vendor";

export default async function VendorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
  const resolvedProfile = (profile ?? null) as Record<string, unknown> | null;
  const role = typeof resolvedProfile?.role === "string" ? resolvedProfile.role : "";

  if (role.toLowerCase() !== "vendor") {
    return (
      <main className="mx-auto w-full max-w-6xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>This area is available only for users with the Vendor role.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const vendorIdentifier = readVendorIdentifier(resolvedProfile);

  const { data: issueRows, error } = await supabase.from("issues").select("*");
  const safeRows = Array.isArray(issueRows) ? (issueRows as Record<string, unknown>[]) : [];
  const vendorScopedRows = filterTicketsForVendor(safeRows, vendorIdentifier);
  const tickets = vendorScopedRows.map(mapVendorTicket);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vendor Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Showing issues assigned to your vendor scope{vendorIdentifier ? ` (${vendorIdentifier})` : ""}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Tickets</CardTitle>
          <CardDescription>
            {error
              ? "Unable to load tickets right now."
              : `${tickets.length} ticket${tickets.length === 1 ? "" : "s"} found for your company.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">
                    <Link href={`/vendor/ticket/${ticket.id}`} className="text-primary underline-offset-4 hover:underline">
                      {ticket.id}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[460px] truncate" title={ticket.title}>
                    {ticket.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ticket.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusPillClass(ticket.status)}`}>
                      {statusLabel(ticket.status)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {!error && tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No tickets are currently assigned to your vendor scope.
                  </TableCell>
                </TableRow>
              ) : null}
              {error ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-destructive">
                    {error.message}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}