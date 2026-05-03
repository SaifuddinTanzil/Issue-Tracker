export type VendorStatus = "open" | "in-progress" | "blocked" | "ready-for-retest" | "closed" | "other";

export const VENDOR_ALLOWED_STATUS_OPTIONS = [
  { value: "in-progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "ready-for-retest", label: "Ready for Retest" },
] as const;

export type VendorAllowedStatus = (typeof VENDOR_ALLOWED_STATUS_OPTIONS)[number]["value"];

export type VendorTicket = {
  id: string;
  title: string;
  priority: string;
  status: VendorStatus;
  applicationName: string;
  environment: string;
  browser: string;
  os: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  vendorId: string;
};

type GenericRow = Record<string, unknown>;

function readText(row: GenericRow, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

function normalizeStatus(value: string): VendorStatus {
  const cleaned = value.trim().toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
  if (cleaned === "open") return "open";
  if (cleaned === "in-progress") return "in-progress";
  if (cleaned === "blocked") return "blocked";
  if (cleaned === "ready-for-retest") return "ready-for-retest";
  if (cleaned === "closed") return "closed";
  return "other";
}

function normalizePriority(value: string): string {
  if (!value.trim()) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function resolveBrowser(row: GenericRow): string {
  const explicit = readText(row, ["browser", "browser_name"]);
  if (explicit) return explicit;
  const systemMetadata = row.systemMetadata as Record<string, unknown> | undefined;
  if (systemMetadata && typeof systemMetadata.userAgent === "string" && systemMetadata.userAgent.trim()) {
    return systemMetadata.userAgent;
  }
  return "Unknown";
}

function resolveOS(row: GenericRow): string {
  const explicit = readText(row, ["os", "platform"]);
  if (explicit) return explicit;
  const systemMetadata = row.systemMetadata as Record<string, unknown> | undefined;
  if (systemMetadata && typeof systemMetadata.platform === "string" && systemMetadata.platform.trim()) {
    return systemMetadata.platform;
  }
  return "Unknown";
}

function resolveSteps(row: GenericRow): string {
  const stepsArray = row.reproductionSteps;
  if (Array.isArray(stepsArray)) {
    const lines = stepsArray
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return lines.join("\n") || "No steps provided.";
  }

  const stepsText = readText(row, ["steps_to_reproduce", "stepsToReproduce", "reproduction_steps"], "");
  if (stepsText) return stepsText;

  return "No steps provided.";
}

export function mapVendorTicket(row: GenericRow): VendorTicket {
  return {
    id: readText(row, ["id"], "N/A"),
    title: readText(row, ["title"], "Untitled issue"),
    priority: normalizePriority(readText(row, ["priority", "severity"], "")),
    status: normalizeStatus(readText(row, ["status"], "")),
    applicationName: readText(row, ["app_name", "application", "application_name"], "Unknown app"),
    environment: readText(row, ["environment"], "Unknown"),
    browser: resolveBrowser(row),
    os: resolveOS(row),
    stepsToReproduce: resolveSteps(row),
    expectedResult: readText(row, ["expectedResult", "expected_result"], "Not provided."),
    actualResult: readText(row, ["actualResult", "actual_result"], "Not provided."),
    vendorId: readText(row, ["vendor_id", "vendor", "company_name"], ""),
  };
}

export function readVendorIdentifier(profile: Record<string, unknown> | null): string {
  if (!profile) return "";
  const vendorId = profile.vendor_id;
  if (typeof vendorId === "string" && vendorId.trim()) return vendorId.trim();
  const companyName = profile.company_name;
  if (typeof companyName === "string" && companyName.trim()) return companyName.trim();
  return "";
}

export function filterTicketsForVendor(rows: GenericRow[], vendorIdentifier: string): GenericRow[] {
  if (!vendorIdentifier.trim()) return rows;
  const expected = vendorIdentifier.trim().toLowerCase();

  return rows.filter((row) => {
    const vendorValue = readText(row, ["vendor_id", "vendor", "company_name"]).toLowerCase();
    const appValue = readText(row, ["app_name", "application", "application_name"]).toLowerCase();
    return vendorValue === expected || appValue === expected;
  });
}

export function statusPillClass(status: VendorStatus): string {
  if (status === "open") return "border-red-200 bg-red-50 text-red-700";
  if (status === "ready-for-retest") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "in-progress") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (status === "blocked") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "closed") return "border-zinc-200 bg-zinc-100 text-zinc-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function statusLabel(status: VendorStatus): string {
  if (status === "ready-for-retest") return "Ready for Retest";
  if (status === "in-progress") return "In Progress";
  if (status === "blocked") return "Blocked";
  if (status === "open") return "Open";
  if (status === "closed") return "Closed";
  return "Other";
}