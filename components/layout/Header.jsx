"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Bell,
  Search,
  LogOut,
  Settings,
  User,
  ChevronDown,
  X,
  Users,
  Building,
  Video,
  Calendar,
  CreditCard,
  Tablet,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/common/ThemeToggle";

export default function Header({ user, profile, onOpenSidebar }) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  // ─── Global Command / Search Modal State (⌘K) ───
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchData, setSearchData] = useState({ students: [], hostels: [] });

  const supabase = createClient();

  // Keyboard shortcut listener (Cmd+K / Ctrl+K or Esc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  // Load search data when modal opens
  useEffect(() => {
    if (isSearchOpen) {
      async function loadQuickData() {
        try {
          const [studRes, hostRes] = await Promise.allSettled([
            fetch("/api/devices/directory"),
            fetch("/api/hostels"),
          ]);

          let students = [];
          let hostels = [];

          if (studRes.status === "fulfilled" && studRes.value.ok) {
            const json = await studRes.value.json();
            if (json?.success && Array.isArray(json.data)) students = json.data;
          }

          if (hostRes.status === "fulfilled" && hostRes.value.ok) {
            const json = await hostRes.value.json();
            if (json?.success && Array.isArray(json.data)) hostels = json.data;
          }

          setSearchData({ students, hostels });
        } catch (e) {
          console.error("Global search data load error:", e);
        }
      }
      loadQuickData();
    }
  }, [isSearchOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Quick Navigation Links
  const quickLinks = [
    { title: "Student & Parent Roster", href: "/admin/students", icon: Users, role: "HOSTEL_ADMIN" },
    { title: "Onboard Schools & Hostels", href: "/super-admin/hostels", icon: Building, role: "SUPER_ADMIN" },
    { title: "Book Video Call", href: "/parent/book", icon: Video, role: "PARENT" },
    { title: "Student Calling Kiosk Tablet", href: "/device", icon: Tablet, role: "ALL" },
    { title: "Calling Schedules & Limits", href: "/admin/schedules", icon: Calendar, role: "HOSTEL_ADMIN" },
    { title: "Wallet & Billing Recharges", href: "/admin/billing", icon: CreditCard, role: "HOSTEL_ADMIN" },
    { title: "System Audit Logs", href: "/super-admin/audit-logs", icon: ShieldCheck, role: "SUPER_ADMIN" },
  ];

  // Filter Quick Search Items
  const cleanQ = searchQuery.toLowerCase().trim();

  const filteredStudents = Array.isArray(searchData?.students)
    ? searchData.students.filter((s) => {
        if (!cleanQ) return false;
        const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
        const adm = (s.admission_number || "").toLowerCase();
        const parentPhone = s.guardians?.map((g) => g.parent?.phone || "").join(" ") || "";
        return name.includes(cleanQ) || adm.includes(cleanQ) || parentPhone.includes(cleanQ);
      })
    : [];

  const filteredHostels = Array.isArray(searchData?.hostels)
    ? searchData.hostels.filter((h) => {
        if (!cleanQ) return false;
        const name = (h.name || "").toLowerCase();
        const code = (h.code || "").toLowerCase();
        const city = (h.metadata?.city || h.address?.city || "").toLowerCase();
        return name.includes(cleanQ) || code.includes(cleanQ) || city.includes(cleanQ);
      })
    : [];

  const filteredLinks = quickLinks.filter((link) => {
    if (!cleanQ) return true;
    return link.title.toLowerCase().includes(cleanQ);
  });

  return (
    <header className="sticky top-0 z-30 h-[72px] w-full bg-white/80 dark:bg-[#161C24]/80 backdrop-blur-md border-b border-dashed border-[#E5E8EB] dark:border-[#2E3844] transition-all flex items-center justify-between px-6">
      {/* Left: Menu + Interactive Search Bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-2 rounded-lg text-[#637381] hover:bg-[#F4F6F8] dark:hover:bg-[#212B36] lg:hidden focus:outline-none transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* 🔍 Mobile Search Icon Button */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="sm:hidden p-2 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#212B36] text-[#637381] hover:text-[#00A76F] shadow-xs cursor-pointer flex items-center justify-center"
          title="Search"
        >
          <Search className="w-4 h-4 text-[#00A76F]" />
        </button>

        {/* 🔍 Desktop Interactive Global Search Button (Opens ⌘K Palette) */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F4F6F8] dark:bg-[#212B36] text-[13px] text-[#919EAB] font-medium cursor-pointer hover:bg-[#E5E8EB] dark:hover:bg-[#2E3844] border border-[#E5E8EB] dark:border-[#2E3844] transition-all hover:border-[#00A76F]/50 shadow-xs"
        >
          <Search className="w-4 h-4 text-[#00A76F]" />
          <span className="text-[#637381] dark:text-[#919EAB]">Search students, schools, calls...</span>
          <kbd className="ml-4 px-2 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-[#141A21] border border-[#E5E8EB] dark:border-[#454F5B] rounded-md text-[#637381] dark:text-[#919EAB] shadow-xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowNotifs(!showNotifs); setShowMenu(false); }}
            className="p-2.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#212B36] text-[#637381] dark:text-[#919EAB] hover:text-[#00A76F] shadow-xs relative transition-colors cursor-pointer flex items-center justify-center"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF5630] ring-2 ring-white dark:ring-[#161C24]" />
          </button>

          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute right-0 mt-2 w-[340px] rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] shadow-[var(--shadow-dropdown)] z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F3F5] dark:border-[#2E3844]">
                  <div>
                    <h6 className="text-sm font-bold text-[#1C252E] dark:text-white">Notifications</h6>
                    <p className="text-xs text-[#919EAB]">You have 2 unread messages</p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#FF5630]/10 text-[#FF5630]">
                    2 New
                  </span>
                </div>

                <div className="divide-y divide-[#F1F3F5] dark:divide-[#2E3844]">
                  <div className="px-5 py-3 hover:bg-[#F4F6F8] dark:hover:bg-[#2E3844] transition-colors flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#00A76F]/10 text-[#00A76F] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1C252E] dark:text-white">Kiosk Online</p>
                      <p className="text-xs text-[#919EAB] mt-0.5">Lobby Tablet 1 activated and ready</p>
                      <p className="text-[11px] text-[#919EAB] mt-1">2 min ago</p>
                    </div>
                  </div>
                  <div className="px-5 py-3 hover:bg-[#F4F6F8] dark:hover:bg-[#2E3844] transition-colors flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FFAB00]/10 text-[#FFAB00] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1C252E] dark:text-white">Quota Update</p>
                      <p className="text-xs text-[#919EAB] mt-0.5">Daily calling window opens at 08:00 AM</p>
                      <p className="text-[11px] text-[#919EAB] mt-1">1 hr ago</p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-[#F1F3F5] dark:border-[#2E3844]">
                  <button type="button" className="w-full text-center text-sm font-bold text-[#00A76F] hover:text-[#007856] transition-colors cursor-pointer">
                    View All
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Avatar & Menu */}
        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => { setShowMenu(!showMenu); setShowNotifs(false); }}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#F4F6F8] dark:hover:bg-[#212B36] transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00A76F] to-[#007856] text-white font-bold text-sm flex items-center justify-center ring-2 ring-white dark:ring-[#2E3844] shadow-sm">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute right-0 mt-2 w-[220px] rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] shadow-[var(--shadow-dropdown)] z-50 overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-[#F1F3F5] dark:border-[#2E3844]">
                  <p className="text-sm font-bold text-[#1C252E] dark:text-white truncate">
                    {profile?.full_name || "User"}
                  </p>
                  <p className="text-xs text-[#919EAB] truncate mt-0.5">
                    {user?.email || "user@example.com"}
                  </p>
                </div>

                <div className="p-2">
                  <Link
                    href="/admin/settings"
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#637381] hover:bg-[#F4F6F8] dark:hover:bg-[#2E3844] rounded-lg transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                </div>

                <div className="p-2 border-t border-[#F1F3F5] dark:border-[#2E3844]">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-[#FF5630] hover:bg-[#FF5630]/8 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── LIVE COMMAND PALETTE / GLOBAL SEARCH MODAL (⌘K) ─── */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsSearchOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative z-10 w-full max-w-2xl bg-white dark:bg-[#212B36] rounded-3xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-2xl overflow-hidden"
            >
              {/* Search Input Bar */}
              <div className="p-4 border-b border-[#F1F3F5] dark:border-[#2E3844] flex items-center gap-3">
                <Search className="w-5 h-5 text-[#00A76F] shrink-0 ml-2" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students, parents, campuses, or commands..."
                  className="flex-1 bg-transparent text-base text-[#1C252E] dark:text-white placeholder:text-[#919EAB] focus:outline-none font-bold py-1"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-1 rounded-lg text-[#919EAB] hover:text-[#1C252E] dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#F4F6F8] dark:bg-[#141A21] text-[#919EAB] hover:text-[#1C252E] dark:hover:text-white border border-[#E5E8EB] dark:border-[#2E3844] cursor-pointer"
                >
                  ESC
                </button>
              </div>

              {/* Search Results List */}
              <div className="max-h-[420px] overflow-y-auto p-4 space-y-4">
                {/* 1. Students Results */}
                {filteredStudents.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#919EAB] px-2 block">
                      Students & Parents ({filteredStudents.length})
                    </span>
                    <div className="space-y-1.5">
                      {filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setIsSearchOpen(false);
                            router.push(`/admin/students?search=${encodeURIComponent(s.admission_number || s.first_name)}`);
                          }}
                          className="w-full p-3 rounded-2xl bg-[#F4F6F8] dark:bg-[#141A21] hover:bg-[#EAFBF1] dark:hover:bg-[#00A76F]/10 border border-transparent hover:border-[#00A76F]/30 text-left flex items-center justify-between transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#00A76F] text-white flex items-center justify-center font-bold text-sm shrink-0">
                              {s.first_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-[#1C252E] dark:text-white group-hover:text-[#00A76F]">
                                {s.first_name} {s.last_name || ""}
                              </p>
                              <p className="text-xs text-[#919EAB]">
                                ID: <span className="font-mono text-[#00A76F] font-semibold">{s.admission_number}</span> • Grade {s.class_grade || "1"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-[#00A76F] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                              View Roster <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Schools / Hostels Results */}
                {filteredHostels.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#919EAB] px-2 block">
                      Schools & Campuses ({filteredHostels.length})
                    </span>
                    <div className="space-y-1.5">
                      {filteredHostels.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            setIsSearchOpen(false);
                            router.push(`/super-admin/hostels?search=${encodeURIComponent(h.name)}`);
                          }}
                          className="w-full p-3 rounded-2xl bg-[#F4F6F8] dark:bg-[#141A21] hover:bg-[#EAFBF1] dark:hover:bg-[#00A76F]/10 border border-transparent hover:border-[#00A76F]/30 text-left flex items-center justify-between transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                              <Building className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-[#1C252E] dark:text-white group-hover:text-[#00A76F]">
                                {h.name}
                              </p>
                              <p className="text-xs text-[#919EAB]">
                                Code: <span className="font-mono text-indigo-500 font-semibold">{h.code}</span> • {h.city || "Residential Campus"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-indigo-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                              Manage <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Navigation Commands */}
                <div className="space-y-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#919EAB] px-2 block">
                    Quick Navigation Commands
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredQuickLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <button
                          key={link.href}
                          type="button"
                          onClick={() => {
                            setIsSearchOpen(false);
                            router.push(link.href);
                          }}
                          className="p-3 rounded-2xl bg-[#F4F6F8] dark:bg-[#141A21] hover:bg-[#EAFBF1] dark:hover:bg-[#00A76F]/10 border border-transparent hover:border-[#00A76F]/30 text-left flex items-center gap-3 transition-all cursor-pointer group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-[#00A76F]/10 text-[#00A76F] flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-[#1C252E] dark:text-white group-hover:text-[#00A76F] truncate">
                            {link.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Bottom Tip Bar */}
              <div className="p-3 bg-[#F4F6F8] dark:bg-[#141A21] border-t border-[#F1F3F5] dark:border-[#2E3844] flex items-center justify-between text-[11px] text-[#919EAB] px-5">
                <span>Tip: Type student ID or phone number to jump straight to their record</span>
                <kbd className="font-mono bg-white dark:bg-[#212B36] px-2 py-0.5 rounded border border-[#E5E8EB] dark:border-[#2E3844]">ESC to close</kbd>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
