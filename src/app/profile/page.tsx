"use client";

import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, userProfile, refreshProfile, signOut, updateProfile } = useAuth();
  const supabase = createClient();

  const [fullName, setFullName] = useState(userProfile?.name || user?.email?.split('@')[0] || "");
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.name);
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
      role: userProfile?.role || 'Tester'
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

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl pt-4">
        <Card>
          <CardHeader className="flex flex-col space-y-2">
            <h2 className="text-xl font-semibold">Account Settings</h2>
            <p className="text-sm text-muted-foreground">
              View and edit your basic profile information.
            </p>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            {successMsg && (
              <div className="md:col-span-2 bg-emerald-500/15 text-emerald-600 text-sm p-3 rounded-md">
                {successMsg}
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
              <Input id="role" value={userProfile?.role || "Tester"} readOnly disabled className="bg-muted" />
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
          </CardContent>

          <CardFooter className="flex flex-col gap-2 md:flex-row md:justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setFullName(userProfile?.name || user?.email?.split('@')[0] || "")} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
            <Button
              variant="destructive"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}
