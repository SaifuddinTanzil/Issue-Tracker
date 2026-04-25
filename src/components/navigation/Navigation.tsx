"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  ClipboardPenLine,
  LayoutDashboard,
  ChevronDown,
  User,
  LogOut,
  Settings,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

// ──────────────────────────────────────────────────────────
// Navigation Links Config
// ──────────────────────────────────────────────────────────

const NAV_LINKS = [
  {
    href: "/",
    label: "Report Issue",
    icon: ClipboardPenLine,
  },
  {
    href: "/dashboard",
    label: "Manager Board",
    icon: LayoutDashboard,
  },
] as const;

// ──────────────────────────────────────────────────────────
// Navigation Component
// ──────────────────────────────────────────────────────────

export default function Navigation() {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-surface-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* ── Left: Logo / Brand ── */}
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm shadow-primary-500/20">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-bold text-surface-900 tracking-tight">
                BRAC UAT Tracker
              </span>
              <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-600 ring-1 ring-inset ring-primary-500/20">
                MVP
              </span>
            </div>
          </Link>

          {/* ── Center: Navigation Links ── */}
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? "text-primary-700 bg-primary-50"
                        : "text-surface-500 hover:text-surface-800 hover:bg-surface-50"
                    }
                  `}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? "text-primary-600" : "text-surface-400"
                    }`}
                  />
                  <span>{link.label}</span>

                  {/* Active indicator bar */}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 translate-y-[calc(50%+5px)] rounded-full bg-primary-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── Right: User Profile ── */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="user-profile-trigger"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-50"
            >
              {/* Avatar */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-sm">
                <span className="text-xs font-bold">FA</span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-surface-800 leading-tight">
                  Farhan Ahmed
                </p>
                <p className="text-[10px] text-surface-400 leading-tight">
                  Manager
                </p>
              </div>
              <ChevronDown
                className={`hidden md:block h-3.5 w-3.5 text-surface-400 transition-transform duration-200 ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-surface-200 bg-white p-1.5 shadow-xl shadow-surface-900/10 animate-fade-in">
                {/* User info */}
                <div className="px-3 py-2.5 mb-1 border-b border-surface-100">
                  <p className="text-sm font-semibold text-surface-800">
                    Farhan Ahmed
                  </p>
                  <p className="text-xs text-surface-400">
                    farhan.ahmed@brac.net
                  </p>
                  <span className="mt-1.5 inline-flex items-center rounded-md bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700 ring-1 ring-inset ring-primary-500/20">
                    Admin / Manager
                  </span>
                </div>

                {/* Menu items */}
                <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-600 transition-colors hover:bg-surface-50 hover:text-surface-800">
                  <User className="h-3.5 w-3.5" />
                  My Profile
                </button>
                <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-600 transition-colors hover:bg-surface-50 hover:text-surface-800">
                  <Settings className="h-3.5 w-3.5" />
                  Settings
                </button>
                <div className="my-1 border-t border-surface-100" />
                <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger-500 transition-colors hover:bg-danger-50">
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
