"use client";

import React, { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({ children, user, profile }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F6F8] dark:bg-[#141A21] flex">
      {/* Minimals Sidebar */}
      <Sidebar
        user={user}
        profile={profile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[280px] transition-all">
        {/* Minimals Top Header */}
        <Header
          user={user}
          profile={profile}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        {/* Dynamic Page Canvas */}
        <main className="flex-1 p-5 sm:p-8 max-w-[1200px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
