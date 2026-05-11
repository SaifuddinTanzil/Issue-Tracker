"use client";

import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirm") as HTMLInputElement).value;
    
    if (password !== confirm) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }
    
    // Create the public.user profile
    if (data.user) {
      const { error: profileError } = await supabase.from('users').upsert({
        id: data.user.id,
        email: data.user.email,
        name: email.split('@')[0], // Use part of email as mock name
        avatar: email.substring(0, 2).toUpperCase(),
        role: 'Reporter'
      });

      if (profileError) {
        setError(`Account created, but profile sync failed: ${profileError.message}`)
        setIsLoading(false)
        return
      }
    }

    setSuccess(true);
    setIsLoading(false);
    
    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center space-y-2 pb-4 pt-8">
          <h1 className="text-2xl font-semibold">BRAC UAT</h1>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-500/15 text-emerald-600 text-sm p-3 rounded-md">
                Account created successfully! Redirecting to login...
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input id="confirm" name="confirm" type="password" placeholder="••••••••" required />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col items-center gap-2">
            <Button type="submit" className="w-full" disabled={isLoading || success}>
              {isLoading ? "Creating..." : "Create Account"}
            </Button>

            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary underline underline-offset-2">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
