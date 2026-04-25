"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  FileText,
  Info,
  Loader2,
  Monitor,
  Send,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

import { issueFormSchema, type IssueFormData } from "@/lib/schema";
import { issues, addStoredIssue, type Issue, type Severity, type Category, type Environment as MockEnv } from "@/lib/mock-data";
import {
  APPLICATIONS,
  ENVIRONMENTS,
  CATEGORIES,
  SEVERITIES,
  MAX_FILE_SIZE_MB,
  ACCEPTED_FILE_TYPES,
} from "@/lib/constants";
import type { SystemMetadata } from "@/types";

// ─── Helpers ──────────────────────────────────────────────

function captureSystemMetadata(): SystemMetadata {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${window.screen.width}×${window.screen.height}`,
    timestamp: new Date().toISOString(),
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Sub-Components ───────────────────────────────────────

interface FormFieldWrapperProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function FormFieldWrapper({
  id,
  label,
  required,
  error,
  hint,
  children,
}: FormFieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-surface-700"
      >
        {label}
        {required && <span className="ml-0.5 text-danger-500">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="flex items-center gap-1 text-xs text-surface-400">
          <Info className="h-3 w-3 shrink-0" />
          {hint}
        </p>
      )}
      {error && (
        <p
          className="flex items-center gap-1 text-xs font-medium text-danger-500 animate-fade-in"
          role="alert"
        >
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Toast Component ──────────────────────────────────────

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
}

function Toast({ message, visible, onClose }: ToastProps) {
  if (!visible) return null;
  return (
    <div className="fixed top-6 right-6 z-50 animate-slide-up">
      <div className="flex items-center gap-3 rounded-xl border border-success-500/20 bg-success-50 px-5 py-3.5 shadow-lg shadow-success-500/10">
        <CheckCircle2 className="h-5 w-5 text-success-600" />
        <span className="text-sm font-medium text-success-600">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 rounded-lg p-1 text-success-600/60 transition-colors hover:bg-success-500/10 hover:text-success-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Severity Badge ───────────────────────────────────────

function SeverityIndicator({ severityId }: { severityId: number }) {
  const map: Record<number, { color: string; label: string }> = {
    1: { color: "bg-emerald-400", label: "Low" },
    2: { color: "bg-amber-400", label: "Medium" },
    3: { color: "bg-red-400", label: "High" },
  };
  const entry = map[severityId];
  if (!entry) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-surface-500">
      <span className={`inline-block h-2 w-2 rounded-full ${entry.color}`} />
      {entry.label} severity selected
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function IssueSubmissionForm() {
  const [toastVisible, setToastVisible] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<IssueFormData>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      applicationId: undefined,
      environment: undefined,
      title: "",
      categoryId: undefined,
      severityId: undefined,
      expectedResult: "",
      actualResult: "",
      reproductionSteps: "",
      attachment: null,
      cannotProvideScreenshot: false,
    },
    mode: "onTouched",
  });

  const categoryId = watch("categoryId");
  const severityId = watch("severityId");
  const cannotProvide = watch("cannotProvideScreenshot");

  const isUiUx = categoryId === 2;
  const isBugOrFunctional = categoryId === 1; // Bug maps to id 1

  // ── File Handling ──

  const handleFileSelect = useCallback(
    (file: File | null) => {
      setAttachedFile(file);
      setValue("attachment", file, { shouldValidate: true });
    },
    [setValue]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const removeFile = useCallback(() => {
    handleFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [handleFileSelect]);

  // ── Submit Handler ──

  const onSubmit = async (data: IssueFormData) => {
    // Simulate async network request
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const metadata = captureSystemMetadata();
    
    // Map form data to our mock Issue interface
    const app = APPLICATIONS.find(a => a.id === data.applicationId);
    const cat = CATEGORIES.find(c => c.id === data.categoryId);
    const sev = SEVERITIES.find(s => s.id === data.severityId);

    const envMap: Record<string, MockEnv> = {
      "UAT": "uat",
      "Staging": "staging",
      "Prod": "production"
    };

    const newIssue: Issue = {
      id: `UAT-${String(issues.length + 1).padStart(3, '0')}`,
      title: data.title,
      application: app?.name || "Unknown App",
      status: "open",
      severity: (sev?.slug as Severity) || "medium",
      category: (cat?.slug as Category) || "bug",
      environment: envMap[data.environment] || "uat",
      assignedTo: "Unassigned",
      reporter: "Sarah Ahmed",
      createdAt: new Date().toISOString(),
      module: "General",
      expectedResult: data.expectedResult,
      actualResult: data.actualResult,
      reproductionSteps: data.reproductionSteps.split('\n').filter(s => s.trim()),
      attachments: data.attachment ? ["/placeholder.svg"] : [],
      systemMetadata: metadata
    };

    // Save to localStorage so it persists across page navigations and reloads
    addStoredIssue(newIssue);

    console.log("──── ✅ Issue Successfully Added to Mock Store ────");
    console.log(JSON.stringify(newIssue, null, 2));
    console.log("───────────────────────────────────");

    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);

    // Reset form
    reset();
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Auto-dismiss toast ──
  useEffect(() => {
    if (toastVisible) {
      const t = setTimeout(() => setToastVisible(false), 4000);
      return () => clearTimeout(t);
    }
  }, [toastVisible]);

  // ── Input style helpers ──

  const inputBase =
    "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-surface-800 shadow-sm transition-all duration-200 placeholder:text-surface-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 focus:outline-none disabled:opacity-50";
  const inputError = "border-danger-500 focus:border-danger-500 focus:ring-danger-100";
  const inputNormal = "border-surface-300 hover:border-surface-400";
  const selectClass = "appearance-none pr-10";

  function cls(fieldName: keyof IssueFormData) {
    return `${inputBase} ${errors[fieldName] ? inputError : inputNormal}`;
  }

  return (
    <>
      <Toast
        message="Issue submitted successfully!"
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />

      <form
        id="issue-submission-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-8"
      >
        {/* ── Section: Context ── */}
        <fieldset className="space-y-5">
          <legend className="flex items-center gap-2 text-base font-bold text-surface-800">
            <Monitor className="h-4.5 w-4.5 text-primary-500" />
            Issue Context
          </legend>
          <p className="text-sm text-surface-500 -mt-2">
            Identify where the issue was discovered.
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Application */}
            <FormFieldWrapper
              id="applicationId"
              label="Application"
              required
              error={errors.applicationId?.message}
            >
              <div className="relative">
                <select
                  id="applicationId"
                  {...register("applicationId", { valueAsNumber: true })}
                  className={`${cls("applicationId")} ${selectClass}`}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select application…
                  </option>
                  {APPLICATIONS.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.code} — {app.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              </div>
            </FormFieldWrapper>

            {/* Environment */}
            <FormFieldWrapper
              id="environment"
              label="Environment"
              required
              error={errors.environment?.message}
            >
              <div className="relative">
                <select
                  id="environment"
                  {...register("environment")}
                  className={`${cls("environment")} ${selectClass}`}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select environment…
                  </option>
                  {ENVIRONMENTS.map((env) => (
                    <option key={env.value} value={env.value}>
                      {env.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              </div>
            </FormFieldWrapper>
          </div>
        </fieldset>

        <hr className="border-surface-200" />

        {/* ── Section: Issue Details ── */}
        <fieldset className="space-y-5">
          <legend className="flex items-center gap-2 text-base font-bold text-surface-800">
            <FileText className="h-4.5 w-4.5 text-primary-500" />
            Issue Details
          </legend>
          <p className="text-sm text-surface-500 -mt-2">
            Describe the issue thoroughly so it can be triaged effectively.
          </p>

          {/* Title */}
          <FormFieldWrapper
            id="title"
            label="Issue Title"
            required
            error={errors.title?.message}
            hint="Write a concise, descriptive title (5–200 characters)."
          >
            <input
              id="title"
              type="text"
              placeholder="e.g. Login button unresponsive on UAT after password reset"
              {...register("title")}
              className={cls("title")}
              maxLength={200}
            />
          </FormFieldWrapper>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Category */}
            <FormFieldWrapper
              id="categoryId"
              label="Category"
              required
              error={errors.categoryId?.message}
            >
              <div className="relative">
                <select
                  id="categoryId"
                  {...register("categoryId", { valueAsNumber: true })}
                  className={`${cls("categoryId")} ${selectClass}`}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select category…
                  </option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              </div>
            </FormFieldWrapper>

            {/* Severity */}
            <FormFieldWrapper
              id="severityId"
              label="Severity"
              required
              error={errors.severityId?.message}
            >
              <div className="relative">
                <select
                  id="severityId"
                  {...register("severityId", { valueAsNumber: true })}
                  className={`${cls("severityId")} ${selectClass}`}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select severity…
                  </option>
                  {SEVERITIES.map((sev) => (
                    <option key={sev.id} value={sev.id}>
                      {sev.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              </div>
              {severityId && <SeverityIndicator severityId={severityId} />}
            </FormFieldWrapper>
          </div>

          {/* Expected Result */}
          <FormFieldWrapper
            id="expectedResult"
            label="Expected Result"
            required
            error={errors.expectedResult?.message}
            hint="What should have happened?"
          >
            <textarea
              id="expectedResult"
              rows={3}
              placeholder="Describe the expected behavior…"
              {...register("expectedResult")}
              className={`${cls("expectedResult")} resize-y`}
              maxLength={2000}
            />
          </FormFieldWrapper>

          {/* Actual Result */}
          <FormFieldWrapper
            id="actualResult"
            label="Actual Result"
            required
            error={errors.actualResult?.message}
            hint="What actually happened?"
          >
            <textarea
              id="actualResult"
              rows={3}
              placeholder="Describe the actual behavior that occurred…"
              {...register("actualResult")}
              className={`${cls("actualResult")} resize-y`}
              maxLength={2000}
            />
          </FormFieldWrapper>

          {/* Reproduction Steps */}
          <FormFieldWrapper
            id="reproductionSteps"
            label="Reproduction Steps"
            required
            error={errors.reproductionSteps?.message}
            hint={
              isBugOrFunctional && cannotProvide
                ? "⚠ Minimum 50 characters required when no screenshot is provided."
                : "Provide step-by-step instructions to reproduce this issue."
            }
          >
            <textarea
              id="reproductionSteps"
              rows={4}
              placeholder={`1. Navigate to…\n2. Click on…\n3. Observe that…`}
              {...register("reproductionSteps")}
              className={`${cls("reproductionSteps")} resize-y`}
              maxLength={5000}
            />
          </FormFieldWrapper>
        </fieldset>

        <hr className="border-surface-200" />

        {/* ── Section: Attachments ── */}
        <fieldset className="space-y-5">
          <legend className="flex items-center gap-2 text-base font-bold text-surface-800">
            <CloudUpload className="h-4.5 w-4.5 text-primary-500" />
            Attachment
            {isUiUx && (
              <span className="ml-2 rounded-full bg-danger-50 px-2.5 py-0.5 text-xs font-semibold text-danger-500">
                Required for UI/UX
              </span>
            )}
          </legend>

          {isUiUx && (
            <div className="flex items-start gap-2 rounded-lg border border-danger-500/20 bg-danger-50 p-3 text-sm text-danger-600 animate-fade-in">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Attachments are <strong>strictly required</strong> for UI/UX
                issues. Please upload a screenshot or recording.
              </span>
            </div>
          )}

          {/* Drop Zone */}
          <div
            className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
              dragOver
                ? "border-primary-400 bg-primary-50 scale-[1.01]"
                : errors.attachment
                ? "border-danger-500 bg-danger-50/30"
                : "border-surface-300 bg-surface-50 hover:border-primary-300 hover:bg-primary-50/30"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            {!attachedFile ? (
              <div className="space-y-2">
                <CloudUpload className="mx-auto h-8 w-8 text-surface-400" />
                <p className="text-sm text-surface-600">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-semibold text-primary-600 underline-offset-2 hover:underline focus:outline-none"
                  >
                    Click to upload
                  </button>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-surface-400">
                  PNG, JPEG, GIF, WebP, PDF, MP4, WebM — max {MAX_FILE_SIZE_MB}
                  MB
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-medium text-surface-800">
                      {attachedFile.name}
                    </p>
                    <p className="text-xs text-surface-400">
                      {formatFileSize(attachedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-500"
                  aria-label="Remove attached file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              id="attachment"
              type="file"
              accept={ACCEPTED_FILE_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                handleFileSelect(file);
              }}
            />
          </div>
          {errors.attachment?.message && (
            <p className="flex items-center gap-1 text-xs font-medium text-danger-500 animate-fade-in">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {errors.attachment.message}
            </p>
          )}

          {/* Checkbox: Cannot Provide Screenshot (visible for Bug) */}
          {isBugOrFunctional && (
            <label
              htmlFor="cannotProvideScreenshot"
              className="flex items-start gap-2.5 cursor-pointer animate-fade-in"
            >
              <input
                id="cannotProvideScreenshot"
                type="checkbox"
                {...register("cannotProvideScreenshot")}
                className="mt-0.5 h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-200"
              />
              <span className="text-sm text-surface-600">
                I cannot provide a screenshot for this issue.
                <span className="block text-xs text-surface-400 mt-0.5">
                  If checked, reproduction steps must be at least 50 characters.
                </span>
              </span>
            </label>
          )}
        </fieldset>

        <hr className="border-surface-200" />

        {/* ── System Metadata Indicator ── */}
        <div className="flex items-start gap-2.5 rounded-lg border border-surface-200 bg-surface-50 p-3.5">
          <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-surface-400" />
          <div>
            <p className="text-xs font-medium text-surface-500">
              System Metadata (Browser, OS) will be auto-captured upon
              submission.
            </p>
            <p className="text-xs text-surface-400 mt-0.5">
              Includes: User Agent, Platform, Language, Screen Resolution, and
              Timestamp.
            </p>
          </div>
        </div>

        {/* ── Submit Button ── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              reset();
              setAttachedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="rounded-lg border border-surface-300 bg-white px-5 py-2.5 text-sm font-medium text-surface-600 shadow-sm transition-all duration-200 hover:bg-surface-50 hover:border-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            Reset
          </button>
          <button
            id="submit-issue-btn"
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-500/25 transition-all duration-200 hover:from-primary-700 hover:to-primary-600 hover:shadow-lg hover:shadow-primary-500/30 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Issue
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}
