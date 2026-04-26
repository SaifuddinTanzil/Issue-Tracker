"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload, AlertTriangle, ImageIcon, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { AppLayout } from "@/components/app-layout"
import { useAuth } from "@/components/auth-provider"
import { applications, categoryConfig, addStoredIssue, getStoredIssues, addStoredNotification, type Issue, type Severity, type Category, type Environment } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { getAllowedAppsForUser } from "@/lib/access-control"

const environments = [
  { value: "uat", label: "UAT" },
  { value: "staging", label: "Staging" },
  { value: "production", label: "Production" },
]

export default function SubmitIssuePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    application: "",
    environment: "",
    module: "",
    title: "",
    category: "",
    severity: "medium",
    expectedResult: "",
    actualResult: "",
    reproductionSteps: "",
  })
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [submitted, setSubmitted] = useState(false)
  const { user, userProfile } = useAuth()
  const [allowedApps, setAllowedApps] = useState<string[]>([])

  useEffect(() => {
    getAllowedAppsForUser(user?.email, userProfile?.role).then(setAllowedApps)
  }, [user?.email, userProfile?.role])

  const visibleApplications = allowedApps.includes("*")
    ? applications
    : applications.filter((app) => allowedApps.includes(app.name))

  const isUIUXCategory = formData.category === "ui-ux"
  const hasFiles = files.length > 0

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)])
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files as FileList)])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Convert files to base64 data URLs so they persist in localStorage
    const fileDataUrls: string[] = []
    for (const file of files) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      fileDataUrls.push(dataUrl)
    }

    // Build the Issue object
    const existingIssues = await getStoredIssues()
    const app = applications.find(a => a.id === formData.application)

    const newIssue: Issue = {
      id: `UAT-${String(existingIssues.length + 1).padStart(3, '0')}`,
      title: formData.title,
      application: app?.name || "Unknown App",
      status: "open",
      severity: (formData.severity as Severity) || "medium",
      category: (formData.category as Category) || "bug",
      environment: (formData.environment as Environment) || "uat",
      assignedTo: "Unassigned",
      reporter: userProfile?.name || user?.email || "Unknown User",
      createdAt: new Date().toISOString(),
      module: formData.module || "General",
      expectedResult: formData.expectedResult,
      actualResult: formData.actualResult,
      reproductionSteps: formData.reproductionSteps.split('\n').filter(s => s.trim()),
      attachments: fileDataUrls,
      systemMetadata: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timestamp: new Date().toISOString(),
      }
    }

    await addStoredIssue(newIssue)
    await addStoredNotification({
      id: `notif-${Date.now()}`,
      userId: "admin@company.com",
      title: "New Issue Submitted",
      message: `${newIssue.reporter} submitted ${newIssue.id} in ${newIssue.application}.`,
      isRead: false,
      createdAt: new Date().toISOString(),
      linkHref: `/issues/${newIssue.id}`,
    })

    // Show success message
    setSubmitted(true)

    // Redirect after a short delay so user sees the message
    setTimeout(() => {
      router.push("/issues")
    }, 2000)
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submit New Issue</h1>
          <p className="text-muted-foreground">
            Report a bug, suggestion, or any issue found during UAT testing
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Success Toast */}
          {submitted && (
            <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 shadow-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">Issue reported successfully!</span>
              </div>
            </div>
          )}

          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Issue Details</CardTitle>
              <CardDescription>
                Provide complete information to help the team resolve the issue quickly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Context Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Context
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="application">
                      Application <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.application}
                      onValueChange={(value) => updateField("application", value)}
                    >
                      <SelectTrigger id="application">
                        <SelectValue placeholder="Select application" />
                      </SelectTrigger>
                      <SelectContent>
                        {visibleApplications.map((app) => (
                          <SelectItem key={app.id} value={app.id}>
                            {app.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!allowedApps.includes("*") && visibleApplications.length === 0 && (
                      <p className="text-xs text-destructive">
                        You have no app access. Request app access from Profile page first.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="environment">
                      Environment <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.environment}
                      onValueChange={(value) => updateField("environment", value)}
                    >
                      <SelectTrigger id="environment">
                        <SelectValue placeholder="Select environment" />
                      </SelectTrigger>
                      <SelectContent>
                        {environments.map((env) => (
                          <SelectItem key={env.value} value={env.value}>
                            {env.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="module">Module / Page</Label>
                  <Input
                    id="module"
                    placeholder="e.g., Dashboard, Login Page, Reports"
                    value={formData.module}
                    onChange={(e) => updateField("module", e.target.value)}
                  />
                </div>
              </div>

              {/* The Problem Section */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  The Problem
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Issue Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Brief description of the issue"
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category">
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => updateField("category", value)}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Severity <span className="text-destructive">*</span>
                    </Label>
                    <ToggleGroup
                      type="single"
                      value={formData.severity}
                      onValueChange={(value) => value && updateField("severity", value)}
                      className="justify-start"
                    >
                      <ToggleGroupItem
                        value="low"
                        className="data-[state=on]:bg-gray-100 data-[state=on]:text-gray-700"
                      >
                        Low
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="medium"
                        className="data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700"
                      >
                        Medium
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="high"
                        className="data-[state=on]:bg-red-100 data-[state=on]:text-red-700"
                      >
                        High
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>
              </div>

              {/* Details & Evidence Section */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Details & Evidence
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="expectedResult">Expected Result</Label>
                  <Textarea
                    id="expectedResult"
                    placeholder="What should have happened?"
                    value={formData.expectedResult}
                    onChange={(e) => updateField("expectedResult", e.target.value)}
                    className="min-h-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actualResult">Actual Result</Label>
                  <Textarea
                    id="actualResult"
                    placeholder="What actually happened?"
                    value={formData.actualResult}
                    onChange={(e) => updateField("actualResult", e.target.value)}
                    className="min-h-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reproductionSteps">Reproduction Steps</Label>
                  <Textarea
                    id="reproductionSteps"
                    placeholder="Step-by-step instructions to reproduce the issue..."
                    value={formData.reproductionSteps}
                    onChange={(e) => updateField("reproductionSteps", e.target.value)}
                    className="min-h-24"
                  />
                </div>

                {/* File Upload Area */}
                <div className="space-y-2">
                  <Label>Attachments</Label>
                  <div
                    className={cn(
                      "relative rounded-lg border-2 border-dashed p-6 transition-colors",
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-muted-foreground/50"
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      multiple
                      onChange={handleFileInput}
                      className="absolute inset-0 cursor-pointer opacity-0"
                      accept="image/*,.pdf,.doc,.docx"
                    />
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <div className="rounded-full bg-muted p-3">
                        <Upload className="size-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Drop files here or click to upload
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, PDF up to 10MB
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Uploaded Files */}
                  {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <ImageIcon className="size-4 text-muted-foreground" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="h-6 px-2 text-muted-foreground hover:text-destructive"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* UI/UX Screenshot Warning */}
                  {isUIUXCategory && !hasFiles && (
                    <Alert className="mt-4 border-amber-200 bg-amber-50">
                      <AlertTriangle className="size-4 text-amber-600" />
                      <AlertTitle className="text-amber-800">Screenshot Required</AlertTitle>
                      <AlertDescription className="text-amber-700">
                        A screenshot is mandatory for UI/UX category issues. Please attach at least one image showing the problem.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 border-t pt-6">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !formData.application ||
                    !formData.environment ||
                    !formData.title ||
                    !formData.category ||
                    (isUIUXCategory && !hasFiles)
                  }
                >
                  Submit Issue
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppLayout>
  )
}
