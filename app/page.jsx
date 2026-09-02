"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Video,
  ShieldCheck,
  Tablet,
  Clock,
  Lock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChevronDown,
  Menu,
  X,
  PhoneCall,
  Radio,
  Star,
  Zap,
} from "lucide-react";
import { BRAND } from "@/lib/constants/brand";
import ThemeToggle from "@/components/common/ThemeToggle";

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [openFaq, setOpenFaq] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const faqs = [
    {
      q: "What is HostelConnect and how does it work?",
      a: "HostelConnect is an enterprise child-safe communication platform that converts standard hostel-owned tablets into locked calling kiosks. Young boarding students tap their photo and video call only verified parents. Zero browsers, zero social media, and strict server quotas.",
    },
    {
      q: "How do students make video calls from the kiosk?",
      a: "Students visit the designated dormitory tablet running in Kiosk Mode (/device). They select their profile picture, pick their verified parent, and start an encrypted video call. The session auto-terminates when the time quota ends.",
    },
    {
      q: "Are video calls encrypted and secure?",
      a: "Yes. All video and audio streams are routed through high-entropy, encrypted Jitsi video bridges with server-calculated durations and immutable audit logs.",
    },
    {
      q: "Can unauthorized people call the students?",
      a: "No. Only parents verified and approved by the hostel administration can be linked to a student. Unregistered phone numbers or accounts cannot connect to the kiosk.",
    },
    {
      q: "How does the subscription and billing work?",
      a: "We offer flexible monthly and annual plans powered by Razorpay. Annual plans include a 20% discount. You can upgrade, downgrade, or cancel your campus plan anytime.",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#141A21] text-[#1C252E] dark:text-white selection:bg-[#00A76F]/20 selection:text-[#00A76F] overflow-x-hidden">
      {/* ─── 1. TOP APP BAR ─── */}
      <header className="sticky top-0 z-50 bg-white/85 dark:bg-[#141A21]/85 backdrop-blur-xl border-b border-[#E5E8EB] dark:border-[#2E3844] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <motion.div
              whileHover={{ rotate: 8, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#00A76F] to-[#007856] text-white flex items-center justify-center shadow-lg shadow-[#00A76F]/25"
            >
              <Video className="w-5 h-5 sm:w-6 sm:h-6" />
            </motion.div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#1C252E] dark:text-white">
              {BRAND.name}
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#637381] dark:text-[#919EAB]">
            <a href="#features" className="hover:text-[#00A76F] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#00A76F] transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-[#00A76F] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#00A76F] transition-colors">FAQ</a>
          </nav>

          {/* Desktop Right Controls */}
          <div className="hidden sm:flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-sm font-bold text-[#1C252E] dark:text-white hover:bg-[#F4F6F8] dark:hover:bg-[#212B36] transition-all"
            >
              Sign In
            </Link>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/signup"
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#00A76F] hover:bg-[#007856] text-white shadow-lg shadow-[#00A76F]/25 transition-all flex items-center gap-1.5"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] text-[#1C252E] dark:text-white hover:bg-[#F4F6F8] dark:hover:bg-[#212B36] transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ─── Mobile Navigation Drawer ─── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="sm:hidden border-b border-[#E5E8EB] dark:border-[#2E3844] bg-white/95 dark:bg-[#141A21]/95 backdrop-blur-2xl overflow-hidden px-5 py-6 space-y-4"
            >
              <nav className="flex flex-col space-y-3 font-semibold text-sm text-[#637381] dark:text-[#919EAB]">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl hover:bg-[#F4F6F8] dark:hover:bg-[#212B36] hover:text-[#00A76F]"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl hover:bg-[#F4F6F8] dark:hover:bg-[#212B36] hover:text-[#00A76F]"
                >
                  How It Works
                </a>
                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl hover:bg-[#F4F6F8] dark:hover:bg-[#212B36] hover:text-[#00A76F]"
                >
                  Pricing
                </a>
                <a
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl hover:bg-[#F4F6F8] dark:hover:bg-[#212B36] hover:text-[#00A76F]"
                >
                  FAQ
                </a>
              </nav>

              <div className="pt-4 border-t border-[#E5E8EB] dark:border-[#2E3844] flex flex-col gap-2.5">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl text-center text-sm font-bold border border-[#E5E8EB] dark:border-[#2E3844] text-[#1C252E] dark:text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl text-center text-sm font-bold bg-[#00A76F] hover:bg-[#007856] text-white shadow-md shadow-[#00A76F]/20 flex items-center justify-center gap-1.5"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─── 2. HERO SECTION ─── */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-28 md:pt-28 md:pb-36 overflow-hidden">
        {/* Animated Background Glowing Orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[340px] sm:w-[600px] md:w-[850px] h-[350px] sm:h-[450px] bg-gradient-to-b from-[#00A76F]/15 via-[#5BE49B]/10 to-transparent dark:from-[#00A76F]/20 dark:via-[#004B34]/15 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6 sm:space-y-8"
        >
          {/* Tagline Badge */}
          <motion.div variants={itemVariants} className="inline-flex">
            <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#EAFBF1] dark:bg-[#00A76F]/15 border border-[#C8FACD] dark:border-[#00A76F]/30 text-[#007856] dark:text-[#5BE49B] text-xs font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00A76F] animate-pulse" />
              <span className="tracking-wide">SAFE VIDEO CALLING FOR RESIDENTIAL HOSTELS</span>
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-3xl xs:text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.15]"
          >
            Supervised Video Calls for{" "}
            <span className="bg-gradient-to-r from-[#00A76F] via-[#007856] to-[#004B34] dark:from-[#5BE49B] dark:to-[#00A76F] bg-clip-text text-transparent">
              Hostels & Boarding Schools
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-sm sm:text-base md:text-lg text-[#637381] dark:text-[#919EAB] max-w-2xl mx-auto leading-relaxed"
          >
            Transform hostel-owned tablets into locked, supervised video calling terminals. Students connect exclusively with verified parents — zero smartphones, zero social media risk.
          </motion.p>

          {/* Call to Actions */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-7 py-3.5 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl bg-[#00A76F] hover:bg-[#007856] text-white font-extrabold text-sm shadow-xl shadow-[#00A76F]/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                Start Free Campus Trial <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Link
                href="/device"
                className="w-full sm:w-auto px-7 py-3.5 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#212B36] hover:bg-[#F4F6F8] dark:hover:bg-[#2E3844] text-[#1C252E] dark:text-white border border-[#E5E8EB] dark:border-[#2E3844] font-extrabold text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Tablet className="w-4 h-4 text-[#00A76F]" /> Test Tablet Kiosk Mode
              </Link>
            </motion.div>
          </motion.div>

          {/* Live Product Preview Mockup with Levitating Hover */}
          <motion.div
            variants={itemVariants}
            className="pt-8 sm:pt-12 max-w-5xl mx-auto"
          >
            <motion.div
              whileHover={reduceMotion ? {} : { y: -6, scale: 1.01 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="p-2 sm:p-4 bg-gradient-to-b from-[#F4F6F8] to-[#E5E8EB] dark:from-[#1C252E] dark:to-[#141A21] rounded-2xl sm:rounded-3xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-2xl relative"
            >
              <div className="bg-white dark:bg-[#212B36] rounded-xl sm:rounded-2xl p-4 sm:p-8 text-left space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#F1F3F5] dark:border-[#2E3844]">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#00A76F]/10 text-[#00A76F] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-[#1C252E] dark:text-white">
                        Greenwood International Boarding School
                      </h3>
                      <p className="text-xs text-[#919EAB]">Dormitory A Kiosk Station • Live Encrypted Stream</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center self-start sm:self-auto gap-1.5 px-3 py-1 rounded-full bg-[#EAFBF1] dark:bg-[#00A76F]/20 text-[#007856] dark:text-[#5BE49B] text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#00A76F] animate-pulse" />
                    Supervised Window Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-4 rounded-xl bg-[#F4F6F8] dark:bg-[#1C252E] border border-[#E5E8EB] dark:border-[#2E3844] space-y-1">
                    <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider">Allowed Duration</span>
                    <p className="text-xl font-extrabold text-[#1C252E] dark:text-white">15 Minutes</p>
                    <p className="text-xs text-[#00A76F] font-semibold">Server-Enforced Timer</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F4F6F8] dark:bg-[#1C252E] border border-[#E5E8EB] dark:border-[#2E3844] space-y-1">
                    <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider">Guardian Verification</span>
                    <p className="text-xl font-extrabold text-[#1C252E] dark:text-white">Verified Parent</p>
                    <p className="text-xs text-[#00A76F] font-semibold">Zero Unknown Callers</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F4F6F8] dark:bg-[#1C252E] border border-[#E5E8EB] dark:border-[#2E3844] space-y-1">
                    <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider">Video Security</span>
                    <p className="text-xl font-extrabold text-[#1C252E] dark:text-white">Encrypted Jitsi</p>
                    <p className="text-xs text-[#00A76F] font-semibold">High-Entropy Bridge</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── 3. STATS STRIP ─── */}
      <section className="py-10 sm:py-14 border-y border-[#E5E8EB] dark:border-[#2E3844] bg-[#F4F6F8]/60 dark:bg-[#1C252E]/60 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="space-y-1"
            >
              <p className="text-3xl sm:text-4xl font-extrabold text-[#00A76F]">100+</p>
              <p className="text-xs font-bold text-[#919EAB] uppercase tracking-wider">Hostels & Schools</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-1"
            >
              <p className="text-3xl sm:text-4xl font-extrabold text-[#00A76F]">50,000+</p>
              <p className="text-xs font-bold text-[#919EAB] uppercase tracking-wider">Safe Call Minutes</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="space-y-1"
            >
              <p className="text-3xl sm:text-4xl font-extrabold text-[#00A76F]">10,000+</p>
              <p className="text-xs font-bold text-[#919EAB] uppercase tracking-wider">Verified Parents</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="space-y-1"
            >
              <p className="text-3xl sm:text-4xl font-extrabold text-[#00A76F]">99.9%</p>
              <p className="text-xs font-bold text-[#919EAB] uppercase tracking-wider">Uptime SLA</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 4. FEATURES GRID ─── */}
      <section id="features" className="py-16 sm:py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00A76F]">
              CORE CAPABILITIES
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Designed For Child Safety & Hostel Governance
            </h2>
            <p className="text-xs sm:text-sm text-[#637381] dark:text-[#919EAB]">
              Full multi-tenant data segregation, server-side duration control, and audit compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.35 }}
              className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] shadow-xs space-y-4 hover:shadow-lg hover:border-[#00A76F]/30 transition-all cursor-default"
            >
              <div className="w-12 h-12 rounded-xl bg-[#00A76F]/10 text-[#00A76F] flex items-center justify-center">
                <Tablet className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold">Child-Safe Tablet Kiosk</h3>
              <p className="text-xs sm:text-sm text-[#637381] dark:text-[#919EAB] leading-relaxed">
                Shared tablets are activated via temporary 6-digit codes. Students tap their photo and call only approved parent contacts.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] shadow-xs space-y-4 hover:shadow-lg hover:border-indigo-500/30 transition-all cursor-default"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold">Server-Enforced Quotas</h3>
              <p className="text-xs sm:text-sm text-[#637381] dark:text-[#919EAB] leading-relaxed">
                Call limits are calculated and enforced server-side. Hard 15/20 min timers automatically hang up the session when expired.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] shadow-xs space-y-4 hover:shadow-lg hover:border-emerald-500/30 transition-all cursor-default"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold">Supabase Row-Level Security</h3>
              <p className="text-xs sm:text-sm text-[#637381] dark:text-[#919EAB] leading-relaxed">
                Every hostel institution is strictly isolated. Wardens, parents, and admins only see authorized records.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 5. HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-16 sm:py-24 md:py-32 bg-[#F4F6F8] dark:bg-[#1C252E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00A76F]">
              SIMPLE 3-STEP WORKFLOW
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              How HostelConnect Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] space-y-4 shadow-xs"
            >
              <span className="text-3xl sm:text-4xl font-extrabold text-[#00A76F]">01</span>
              <h3 className="text-base sm:text-lg font-bold">Register Campus</h3>
              <p className="text-xs sm:text-sm text-[#637381] dark:text-[#919EAB] leading-relaxed">
                Sign up as hostel admin, enroll students, and link verified parent contact details.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] space-y-4 shadow-xs"
            >
              <span className="text-3xl sm:text-4xl font-extrabold text-[#00A76F]">02</span>
              <h3 className="text-base sm:text-lg font-bold">Activate Kiosks</h3>
              <p className="text-xs sm:text-sm text-[#637381] dark:text-[#919EAB] leading-relaxed">
                Generate a 6-digit code and open <span className="font-mono text-[#00A76F]">/device</span> on any tablet to lock into kiosk mode.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] space-y-4 shadow-xs"
            >
              <span className="text-3xl sm:text-4xl font-extrabold text-[#00A76F]">03</span>
              <h3 className="text-base sm:text-lg font-bold">Start Safe Calls</h3>
              <p className="text-xs sm:text-sm text-[#637381] dark:text-[#919EAB] leading-relaxed">
                Students tap their photo, select mom or dad, and video call with auto-reset timers.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 6. PRICING SECTION ─── */}
      <section id="pricing" className="py-16 sm:py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00A76F]">
              TRANSPARENT PLANS
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Campus Subscription Plans
            </h2>

            {/* Billing Toggle with Framer Motion Layout Animation */}
            <div className="inline-flex p-1 rounded-xl bg-[#F4F6F8] dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] relative">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`relative z-10 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  billingCycle === "monthly" ? "text-[#00A76F]" : "text-[#637381] dark:text-[#919EAB]"
                }`}
              >
                Monthly
                {billingCycle === "monthly" && (
                  <motion.div
                    layoutId="billingPill"
                    className="absolute inset-0 bg-white dark:bg-[#1C252E] rounded-lg shadow-xs -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`relative z-10 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  billingCycle === "yearly" ? "text-[#00A76F]" : "text-[#637381] dark:text-[#919EAB]"
                }`}
              >
                Yearly (Save 20%)
                {billingCycle === "yearly" && (
                  <motion.div
                    layoutId="billingPill"
                    className="absolute inset-0 bg-white dark:bg-[#1C252E] rounded-lg shadow-xs -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Starter */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] space-y-6 flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-4">
                <h3 className="text-lg sm:text-xl font-bold">Starter</h3>
                <p className="text-xs text-[#919EAB]">Ideal for small boarding dorms</p>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#1C252E] dark:text-white">
                  {billingCycle === "monthly" ? "₹2,499" : "₹24,990"}
                  <span className="text-xs font-normal text-[#919EAB]"> / {billingCycle === "monthly" ? "mo" : "yr"}</span>
                </div>
                <div className="pt-4 border-t border-[#F1F3F5] dark:border-[#2E3844] space-y-3 text-xs text-[#637381] dark:text-[#919EAB]">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F] shrink-0" /> Up to 50 Residents</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F] shrink-0" /> 2 Kiosk Tablets</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F] shrink-0" /> 1,000 Call Minutes / Month</div>
                </div>
              </div>
              <Link href="/signup" className="w-full py-3 rounded-xl bg-[#F4F6F8] dark:bg-[#1C252E] hover:bg-[#E5E8EB] text-center font-bold text-xs block transition-colors">
                Choose Starter
              </Link>
            </motion.div>

            {/* Growth */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#212B36] border-2 border-[#00A76F] space-y-6 flex flex-col justify-between shadow-xl relative"
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#00A76F] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                Most Popular
              </span>
              <div className="space-y-4">
                <h3 className="text-lg sm:text-xl font-bold">Growth</h3>
                <p className="text-xs text-[#919EAB]">Perfect for standard institutions</p>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#1C252E] dark:text-white">
                  {billingCycle === "monthly" ? "₹5,999" : "₹59,990"}
                  <span className="text-xs font-normal text-[#919EAB]"> / {billingCycle === "monthly" ? "mo" : "yr"}</span>
                </div>
                <div className="pt-4 border-t border-[#F1F3F5] dark:border-[#2E3844] space-y-3 text-xs text-[#637381] dark:text-[#919EAB]">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F] shrink-0" /> Up to 200 Residents</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F] shrink-0" /> 6 Kiosk Tablets</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F] shrink-0" /> 5,000 Call Minutes / Month</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F] shrink-0" /> Priority Warden Support</div>
                </div>
              </div>
              <Link href="/signup" className="w-full py-3 rounded-xl bg-[#00A76F] hover:bg-[#007856] text-white text-center font-bold text-xs shadow-lg shadow-[#00A76F]/25 block transition-colors">
                Choose Growth
              </Link>
            </motion.div>

            {/* Enterprise */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] space-y-6 flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-4">
                <h3 className="text-lg sm:text-xl font-bold">Enterprise</h3>
                <p className="text-xs text-[#919EAB]">For large multi-campus hostels</p>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#1C252E] dark:text-white">
                  {billingCycle === "monthly" ? "₹14,999" : "₹1,49,990"}
                  <span className="text-xs font-normal text-[#919EAB]"> / {billingCycle === "monthly" ? "mo" : "yr"}</span>
                </div>
                <div className="pt-4 border-t border-[#F1F3F5] dark:border-[#2E3844] space-y-3 text-xs text-[#637381] dark:text-[#919EAB]">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F] shrink-0" /> 1,000+ Residents</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F] shrink-0" /> 25 Kiosk Tablets</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F] shrink-0" /> 25,000 Call Minutes</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F] shrink-0" /> Dedicated Video Cluster</div>
                </div>
              </div>
              <Link href="/signup" className="w-full py-3 rounded-xl bg-[#F4F6F8] dark:bg-[#1C252E] hover:bg-[#E5E8EB] text-center font-bold text-xs block transition-colors">
                Contact Enterprise
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 7. FAQ SECTION ─── */}
      <section id="faq" className="py-16 sm:py-24 md:py-32 bg-[#F4F6F8] dark:bg-[#1C252E]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00A76F]">FAQ</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  className="w-full p-4 sm:p-5 text-left font-bold text-xs sm:text-sm flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <motion.div
                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-[#919EAB]" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-[#637381] dark:text-[#919EAB] leading-relaxed border-t border-[#F1F3F5] dark:border-[#2E3844] pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. FOOTER ─── */}
      <footer className="border-t border-[#E5E8EB] dark:border-[#2E3844] py-10 sm:py-12 bg-white dark:bg-[#141A21]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#919EAB]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#00A76F] text-white flex items-center justify-center shadow-xs">
              <Video className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-[#1C252E] dark:text-white">{BRAND.name}</span>
            <span>© 2026. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-5 sm:gap-6 flex-wrap justify-center font-medium">
            <Link href="/login" className="hover:text-[#00A76F] transition-colors">Sign In</Link>
            <Link href="/device" className="hover:text-[#00A76F] transition-colors">Kiosk Mode</Link>
            <Link href="/signup" className="hover:text-[#00A76F] transition-colors">Campus Signup</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
