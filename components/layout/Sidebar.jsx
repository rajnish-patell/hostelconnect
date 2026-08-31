"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Tablet,
  Calendar,
  CreditCard,
  Building,
  PhoneCall,
  Shield,
  FileText,
  Settings,
  ChevronRight,
  Folder,
  BarChart3,
} from "lucide-react";
import { BRAND } from "@/lib/constants/brand";

export default function Sidebar({ user, profile, isOpen, onClose }) {
  const pathname = usePathname();
  const role = profile?.role || "PARENT";

  const getNavSections = () => {
    if (role === "SUPER_ADMIN") {
      return [
        {
          title: "OVERVIEW",
          items: [
            { label: "Analytics", href: "/super-admin", icon: BarChart3 },
            { label: "Campuses & Hostels", href: "/super-admin/hostels", icon: Building },
          ],
        },
        {
          title: "MANAGEMENT",
          items: [
            { label: "Subscription Tiers", href: "/super-admin/plans", icon: CreditCard },
            { label: "Audit Logs", href: "/super-admin/audit-logs", icon: Shield },
            { label: "Settings", href: "/super-admin/settings", icon: Settings },
          ],
        },
      ];
    }

    if (role === "HOSTEL_ADMIN") {
      return [
        {
          title: "OVERVIEW",
          items: [
            { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
            { label: "Call History", href: "/admin/calls", icon: PhoneCall },
          ],
        },
        {
          title: "MANAGEMENT",
          items: [
            { label: "Students & Parents", href: "/admin/students", icon: Users },
            { label: "Calling Kiosks", href: "/admin/devices", icon: Tablet },
            { label: "Dormitory Rooms", href: "/admin/rooms", icon: Building },
          ],
        },
        {
          title: "CONFIG",
          items: [
            { label: "Schedule & Quotas", href: "/admin/schedules", icon: Calendar },
            { label: "Billing & Plans", href: "/admin/billing", icon: CreditCard },
            { label: "Settings", href: "/admin/settings", icon: Settings },
          ],
        },
      ];
    }

    if (role === "WARDEN" || role === "STAFF") {
      return [
        {
          title: "OPERATIONS",
          items: [
            { label: "Warden Desk", href: "/staff", icon: LayoutDashboard },
            { label: "Calling Terminal", href: "/device", icon: Tablet },
          ],
        },
      ];
    }

    // Default: PARENT
    return [
      {
        title: "OVERVIEW",
        items: [
          { label: "My Children", href: "/parent", icon: LayoutDashboard },
          { label: "Call History", href: "/parent/calls", icon: PhoneCall },
        ],
      },
      {
        title: "SERVICES",
        items: [
          { label: "Book Video Slot", href: "/parent/book", icon: Calendar },
          { label: "Account", href: "/parent/settings", icon: Settings },
        ],
      },
    ];
  };

  const sections = getNavSections();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#1C252E]/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-[280px] bg-white dark:bg-[#1C252E] border-r border-dashed border-[#E5E8EB] dark:border-[#2E3844] transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* ─── Logo ─── */}
        <div className="h-[72px] px-6 flex items-center gap-3 border-b border-dashed border-[#E5E8EB] dark:border-[#2E3844]">
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
              <path d="M6 12C6 8 10 4 14 8C18 12 14 16 18 20C22 24 26 20 26 16" stroke="#00A76F" strokeWidth="4" strokeLinecap="round"/>
              <circle cx="28" cy="14" r="3" fill="#00A76F"/>
            </svg>
            <div>
              <span className="font-extrabold text-[15px] text-[#1C252E] dark:text-white tracking-tight block leading-tight">
                {BRAND.name}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00A76F] leading-none">
                {role.replace("_", " ")}
              </span>
            </div>
          </Link>
        </div>

        {/* ─── User Mini Profile ─── */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F4F6F8] dark:bg-[#212B36]">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00A76F] to-[#007856] text-white font-bold text-sm flex items-center justify-center flex-shrink-0 ring-2 ring-white dark:ring-[#2E3844]">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#1C252E] dark:text-white truncate">
                {profile?.full_name || "User"}
              </p>
              <p className="text-[11px] text-[#919EAB] truncate">
                {user?.email || "user@example.com"}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Navigation Groups ─── */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#919EAB]">
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-[rgba(0,167,111,0.08)] text-[#00A76F] font-bold"
                        : "text-[#637381] hover:bg-[#F4F6F8] dark:hover:bg-[#212B36] hover:text-[#1C252E] dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-[18px] h-[18px] ${
                          isActive ? "text-[#00A76F]" : "text-[#919EAB]"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-[#00A76F]" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* ─── Bottom Kiosk Card ─── */}
        <div className="p-4 mt-auto">
          <div className="p-4 rounded-2xl bg-[#F4F6F8] dark:bg-[#212B36] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#00A76F]/12 text-[#00A76F] flex items-center justify-center">
              <Tablet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1C252E] dark:text-white">Kiosk Mode</p>
              <p className="text-xs text-[#919EAB] mt-0.5">Launch the shared tablet terminal for students.</p>
            </div>
            <Link
              href="/device"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00A76F] hover:text-[#007856] transition-colors"
            >
              Open Terminal <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
