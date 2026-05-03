import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";
import {
  filterTicketsForVendor,
  mapVendorTicket,
  readVendorIdentifier,
  statusLabel,
  statusPillClass,
  type VendorAllowedStatus,
} from "@/lib/vendor";
import { VendorStatusSelect } from "@/components/vendor/vendor-status-select";

type VendorTicketPageProps = {
  params: Promise<{ id: string }>;
};

function toAllowedStatus(status: string): VendorAllowedStatus {
  if (status === "ready-for-retest") return "ready-for-retest";
  if (status === "blocked") return "blocked";
  return "in-progress";
}

export default async function VendorTicketPage({ params }: VendorTicketPageProps) {
  const { id } = await params;
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
      <main className="mx-auto w-full max-w-5xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>This view is restricted to Vendor users.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const vendorIdentifier = readVendorIdentifier(resolvedProfile);

  const { data, error } = await supabase.from("issues").select("*").eq("id", id).maybeSingle();
  if (error) {
    notFound();
  }

  if (!data) {
    notFound();
  }

  const visibleRows = filterTicketsForVendor([data as Record<string, unknown>], vendorIdentifier);
  if (visibleRows.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Ticket not available</CardTitle>
            <CardDescription>
              This ticket is outside your vendor scope or no longer available.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const ticket = mapVendorTicket(visibleRows[0]);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Vendor Ticket</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {ticket.id} - {ticket.title}
          </h1>
        </div>
        <Link href="/vendor/dashboard" className="text-sm font-medium text-primary underline underline-offset-4">
          Back to Dashboard
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Metadata</CardTitle>
              <CardDescription>Read-only UAT context provided by BRAC testers.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="application">App Name</Label>
                <Input id="application" value={ticket.applicationName} readOnly />
              </div>
              <div className="space-y-1">
                <Label htmlFor="environment">Environment</Label>
                <Input id="environment" value={ticket.environment} readOnly />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="browser">Browser / User Agent</Label>
                <Input id="browser" value={ticket.browser} readOnly />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="os">OS / Platform</Label>
                <Input id="os" value={ticket.os} readOnly />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="steps">Steps to Reproduce</Label>
                <Textarea id="steps" value={ticket.stepsToReproduce} readOnly className="min-h-44" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expected vs Actual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Expected Result</h3>
                <p className="text-sm">{ticket.expectedResult}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Actual Result</h3>
                <p className="text-sm">{ticket.actualResult}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status Workflow</CardTitle>
              <CardDescription>
                Vendor updates are limited to In Progress, Blocked, and Ready for Retest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current Status</p>
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusPillClass(ticket.status)}`}>
                  {statusLabel(ticket.status)}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Priority</p>
                <Badge variant="outline">{ticket.priority}</Badge>
              </div>

              <VendorStatusSelect issueId={ticket.id} initialStatus={toAllowedStatus(ticket.status)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}