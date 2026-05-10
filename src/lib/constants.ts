import type { Application, IssueCategory, IssueSeverity, Environment } from "@/types";

// ── Mock Applications ──
export const APPLICATIONS: Application[] = [
  { id: 1, name: "Customer Relationship Manager", code: "CRM" },
  { id: 2, name: "Enterprise Resource Planning", code: "ERP" },
  { id: 3, name: "Human Capital Management", code: "HCM" },
  { id: 4, name: "Supply Chain Portal", code: "SCP" },
  { id: 5, name: "Business Intelligence Dashboard", code: "BID" },
];

// ── Environments ──
export const ENVIRONMENTS: { value: Environment; label: string }[] = [
  { value: "UAT", label: "Ho-uat" },
  { value: "Staging", label: "field-uat" },
  { value: "Prod", label: "production" },
];

// ── Issue Categories ──
export const CATEGORIES: IssueCategory[] = [
  { id: 1, label: "Bug", slug: "bug" },
  { id: 2, label: "UI/UX", slug: "ui-ux" },
  { id: 3, label: "Suggestion", slug: "suggestion" },
];

// ── Severity Levels ──
export const SEVERITIES: IssueSeverity[] = [
  { id: 1, label: "Low", slug: "low" },
  { id: 2, label: "Medium", slug: "medium" },
  { id: 3, label: "High", slug: "high" },
];

// ── File Upload Constraints ──
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ACCEPTED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/webm",
];
