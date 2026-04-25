// ──────────────────────────────────────────────────────────
// TypeScript Interfaces — aligned with relational DB schema
// ──────────────────────────────────────────────────────────

/** Represents a selectable application in the system. */
export interface Application {
  id: number;
  name: string;
  code: string; // short identifier, e.g. "CRM"
}

/** Environment where the issue was observed. */
export type Environment = "UAT" | "Staging" | "Prod";

/** Category of the reported issue. */
export interface IssueCategory {
  id: number;
  label: string;
  slug: string;
}

/** Severity level of the issue. */
export interface IssueSeverity {
  id: number;
  label: string;
  slug: string;
}

/** The final validated payload sent on form submission. */
export interface IssueSubmissionPayload {
  applicationId: number;
  environment: Environment;
  title: string;
  categoryId: number;
  severityId: number;
  expectedResult: string;
  actualResult: string;
  reproductionSteps: string;
  attachment: File | null;
  cannotProvideScreenshot: boolean;
  /** Auto-captured metadata (browser, OS, etc.) */
  systemMetadata: SystemMetadata;
}

/** Browser / OS metadata auto-captured on submit. */
export interface SystemMetadata {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  timestamp: string;
}
