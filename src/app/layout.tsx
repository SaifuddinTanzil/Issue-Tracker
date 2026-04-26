import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { AppPreferencesProvider } from "@/components/app-preferences-provider";
import { Toaster } from "@/components/ui/toaster";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "BRAC UAT Tracker",
  description:
    "Centralized UAT Issue Tracker for submitting, triaging, and managing quality-assurance issues across applications and environments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background antialiased selection:bg-primary/20" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AppPreferencesProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </AppPreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
