"use client";

import { ChangePasswordForm } from "@/components/settings/change-password-form";

export default function UpdatePasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <ChangePasswordForm
          title="Create a New Password"
          description="Choose a secure password to finish resetting your account."
          submitLabel="Save New Password"
          successMessage="Your password has been updated. Redirecting to the dashboard."
          redirectTo="/dashboard"
        />
      </div>
    </main>
  );
}