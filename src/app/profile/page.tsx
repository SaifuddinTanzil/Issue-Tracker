"use client";

import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react";
import { useRouter } from "next/navigation";

import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import { applications, addStoredNotification } from "@/lib/mock-data"
import { submitAccessRequest } from "@/lib/access-control"
import { useAppPreferences } from "@/components/app-preferences-provider"
import { ChangePasswordForm } from "@/components/settings/change-password-form"

export default function ProfilePage() {
  const router = useRouter();
  const { user, userProfile, refreshProfile, signOut, updateProfile } = useAuth();
  const { tx } = useAppPreferences()
  const supabase = createClient();

  const [fullName, setFullName] = useState(userProfile?.name || user?.email?.split('@')[0] || "");
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [requestedApp, setRequestedApp] = useState("")
  const [requestMsg, setRequestMsg] = useState("")

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.name || user?.email?.split('@')[0] || "");
    } else if (user?.email) {
      setFullName(user.email.split('@')[0]);
    }
  }, [userProfile, user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSuccessMsg("");
    
    const { error } = await supabase.from('users').upsert({ 
      id: user.id,
      email: user.email,
      name: fullName,
      avatar: userProfile?.avatar || fullName.substring(0, 2).toUpperCase(),
      role: userProfile?.role || 'Reporter'
    });
    
    if (!error) {
      // Optimistically update context so UI (navbar, other components) reflect the new name immediately
      updateProfile({ name: fullName, avatar: userProfile?.avatar || fullName.substring(0, 2).toUpperCase() });
      // Refresh from DB to ensure consistency
      await refreshProfile();
      setSuccessMsg("Profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
    
    setIsSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleAccessRequest = async () => {
    if (!user?.email || !requestedApp) return

    await submitAccessRequest(user.email, requestedApp)
    await addStoredNotification({
      id: `notif-${Date.now()}`,
      userId: "admin@company.com",
      title: "New Access Request",
      message: `${user.email} requested access to ${requestedApp}.`,
      isRead: false,
      createdAt: new Date().toISOString(),
      linkHref: "/dashboard/admin",
    })

    setRequestMsg(tx("Access request submitted to Admin.", "অ্যাক্সেস অনুরোধ অ্যাডমিনের কাছে পাঠানো হয়েছে।"))
    setRequestedApp("")
    setTimeout(() => setRequestMsg(""), 3000)
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl pt-4">
        <Card>
          <CardHeader className="flex flex-col space-y-2">
            <h2 className="text-xl font-semibold">{tx("Account Settings", "অ্যাকাউন্ট সেটিংস")}</h2>
            <p className="text-sm text-muted-foreground">
              {tx("View and edit your basic profile information.", "আপনার প্রোফাইল তথ্য দেখুন এবং সম্পাদনা করুন।")}
            </p>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            {successMsg && (
              <div className="md:col-span-2 bg-emerald-500/15 text-emerald-600 text-sm p-3 rounded-md">
                {successMsg}
              </div>
            )}
            {requestMsg && (
              <div className="md:col-span-2 bg-blue-500/15 text-blue-600 text-sm p-3 rounded-md">
                {requestMsg}
              </div>
            )}
            {/* Read‑only Email */}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={userProfile?.email || user?.email || ""} readOnly disabled className="bg-muted" />
            </div>

            {/* Read‑only Role */}
            <div className="space-y-1">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={userProfile?.role || "Reporter"} readOnly disabled className="bg-muted" />
            </div>

            {/* Editable Full Name */}
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2 md:col-span-2 border-t pt-4">
              <Label>{tx("Request App Access", "অ্যাপ অ্যাক্সেস অনুরোধ")}</Label>
              <div className="flex flex-col gap-2 md:flex-row">
                <Select value={requestedApp} onValueChange={setRequestedApp}>
                  <SelectTrigger className="md:w-[320px]">
                    <SelectValue placeholder={tx("Select an application", "একটি অ্যাপ নির্বাচন করুন")} />
                  </SelectTrigger>
                  <SelectContent>
                    {applications.map((app) => (
                      <SelectItem key={app.id} value={app.name}>
                        {app.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={handleAccessRequest} disabled={!requestedApp}>
                  {tx("Request Access", "অ্যাক্সেস অনুরোধ")}
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 md:flex-row md:justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setFullName(userProfile?.name || user?.email?.split('@')[0] || "")} disabled={isSaving}>
                {tx("Cancel", "বাতিল")}
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? tx("Saving...", "সংরক্ষণ হচ্ছে...") : tx("Save Changes", "পরিবর্তন সংরক্ষণ")}
              </Button>
            </div>
            <Button
              variant="destructive"
              onClick={handleSignOut}
            >
              {tx("Sign Out", "সাইন আউট")}
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-6">
          <ChangePasswordForm
            title={tx("Change Password", "পাসওয়ার্ড পরিবর্তন")}
            description={tx(
              "Use a strong password that you do not reuse elsewhere.",
              "একটি শক্তিশালী পাসওয়ার্ড ব্যবহার করুন যা অন্য কোথাও ব্যবহার করেন না।"
            )}
            submitLabel={tx("Update Password", "পাসওয়ার্ড আপডেট")}
            successMessage={tx("Your password was updated successfully.", "আপনার পাসওয়ার্ড সফলভাবে আপডেট হয়েছে।")}
          />
        </div>
      </div>
    </AppLayout>
  );
}
