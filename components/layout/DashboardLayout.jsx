"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import IncomingCallNotification from "@/components/common/IncomingCallNotification";

export default function DashboardLayout({ children, user, profile }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-[#F4F6F8] dark:bg-[#141A21] flex">
      {/* Global Realtime Incoming Video Call Ringing Prompt */}
      <IncomingCallNotification user={user} profile={profile} />
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
        <motion.main
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-[1280px] w-full mx-auto"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
