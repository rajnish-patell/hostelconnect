"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Video,
  ShieldCheck,
  Tablet,
  Clock,
  Lock,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Zap,
  Star,
  ChevronDown,
  Building,
  CreditCard,
  ExternalLink,
  Shield,
  Layers,
} from "lucide-react";
import { BRAND } from "@/lib/constants/brand";
import ThemeToggle from "@/components/common/ThemeToggle";

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      q: "What is HostelConnect and how does it work?",
      a: "HostelConnect is a child-safe communication platform that converts standard hostel-owned tablets into locked calling kiosks. Young boarding students tap their photo and video call only verified parents. Zero browsers, zero social media, and strict server quotas."
    },
    {
      q: "How do students make video calls from the kiosk?",
      a: "Students visit the designated dormitory tablet running in Kiosk Mode (/device). They select their profile picture, pick their verified parent, and start an encrypted video call. The session auto-terminates when the time quota ends."
    },
    {
      q: "Are video calls encrypted and secure?",
      a: "Yes. All video and audio streams are routed through high-entropy, encrypted Jitsi video bridges with server-calculated durations and immutable audit logs."
    },
    {
      q: "Can unauthorized people call the students?",
      a: "No. Only parents verified and approved by the hostel administration can be linked to a student. Unregistered phone numbers or accounts cannot connect to the kiosk."
    },
    {
      q: "How does the subscription and billing work?",
      a: "We offer flexible monthly and annual plans powered by Razorpay. Annual plans include a 20% discount. You can upgrade, downgrade, or cancel your campus plan anytime."
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#141A21] text-[#1C252E] dark:text-white">
      {/* ─── 1. TOP APP BAR ─── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#141A21]/90 backdrop-blur-md border-b border-[#E5E8EB] dark:border-[#2E3844]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00A76F] text-white flex items-center justify-center shadow-md shadow-[#00A76F]/25">
              <Video className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-[#1C252E] dark:text-white">
              {BRAND.name}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#637381] dark:text-[#919EAB]">
            <a href="#features" className="hover:text-[#00A76F] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#00A76F] transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-[#00A76F] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#00A76F] transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-sm font-bold text-[#1C252E] dark:text-white hover:bg-[#F4F6F8] dark:hover:bg-[#212B36] transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#00A76F] hover:bg-[#007856] text-white shadow-lg shadow-[#00A76F]/25 transition-all flex items-center gap-1.5"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── 2. HERO SECTION ─── */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#00A76F]/5 dark:bg-[#00A76F]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EAFBF1] dark:bg-[#00A76F]/15 border border-[#C8FACD] dark:border-[#00A76F]/30 text-[#007856] dark:text-[#5BE49B] text-xs font-bold">
            <Sparkles className="w-4 h-4 text-[#00A76F]" />
            <span>ENTERPRISE SAFE VIDEO CALLING FOR RESIDENTIAL SCHOOLS</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.15]">
            Safe, Supervised Video Calls for{" "}
            <span className="text-[#00A76F]">Hostels & Boarding Schools</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[#637381] dark:text-[#919EAB] max-w-2xl mx-auto leading-relaxed">
            Transform hostel-owned tablets into locked, supervised video calling terminals. Students connect exclusively with verified parents — zero smartphones, zero social media risk.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#00A76F] hover:bg-[#007856] text-white font-bold text-sm shadow-xl shadow-[#00A76F]/25 flex items-center justify-center gap-2 transition-all"
            >
              Start Free Campus Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/device"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white dark:bg-[#212B36] hover:bg-[#F4F6F8] dark:hover:bg-[#2E3844] text-[#1C252E] dark:text-white border border-[#E5E8EB] dark:border-[#2E3844] font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all"
            >
              <Tablet className="w-4 h-4 text-[#00A76F]" /> Test Tablet Kiosk Mode
            </Link>
          </div>

          {/* Live Product Preview Mockup */}
          <div className="pt-10 max-w-5xl mx-auto">
            <div className="p-3 bg-[#F4F6F8] dark:bg-[#1C252E] rounded-3xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-2xl">
              <div className="bg-white dark:bg-[#212B36] rounded-2xl p-6 sm:p-8 text-left space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F1F3F5] dark:border-[#2E3844]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#00A76F]/10 text-[#00A76F] flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[#1C252E] dark:text-white">
                        Greenwood International Boarding School
                      </h3>
                      <p className="text-xs text-[#919EAB]">Dormitory A Kiosk Station • Live Encrypted Stream</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAFBF1] dark:bg-[#00A76F]/20 text-[#007856] dark:text-[#5BE49B] text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#00A76F] animate-pulse" />
                    Supervised Window Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#F4F6F8] dark:bg-[#1C252E] border border-[#E5E8EB] dark:border-[#2E3844]">
                    <span className="text-xs font-semibold text-[#919EAB]">Allowed Duration</span>
                    <p className="text-xl font-extrabold text-[#1C252E] dark:text-white mt-1">15 Minutes</p>
                    <p className="text-xs text-[#00A76F] font-semibold mt-0.5">Server-Enforced Timer</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F4F6F8] dark:bg-[#1C252E] border border-[#E5E8EB] dark:border-[#2E3844]">
                    <span className="text-xs font-semibold text-[#919EAB]">Guardian Verification</span>
                    <p className="text-xl font-extrabold text-[#1C252E] dark:text-white mt-1">Verified Parent</p>
                    <p className="text-xs text-[#00A76F] font-semibold mt-0.5">Zero Unknown Callers</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F4F6F8] dark:bg-[#1C252E] border border-[#E5E8EB] dark:border-[#2E3844]">
                    <span className="text-xs font-semibold text-[#919EAB]">Video Security</span>
                    <p className="text-xl font-extrabold text-[#1C252E] dark:text-white mt-1">Encrypted Jitsi</p>
                    <p className="text-xs text-[#00A76F] font-semibold mt-0.5">High-Entropy Bridge</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. STATS STRIP ─── */}
      <section className="py-12 border-y border-[#E5E8EB] dark:border-[#2E3844] bg-[#F4F6F8]/50 dark:bg-[#1C252E]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#00A76F]">100+</p>
              <p className="text-xs font-bold text-[#919EAB] uppercase tracking-wider mt-1">Hostels & Schools</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#00A76F]">50,000+</p>
              <p className="text-xs font-bold text-[#919EAB] uppercase tracking-wider mt-1">Safe Call Minutes</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#00A76F]">10,000+</p>
              <p className="text-xs font-bold text-[#919EAB] uppercase tracking-wider mt-1">Verified Parents</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#00A76F]">99.9%</p>
              <p className="text-xs font-bold text-[#919EAB] uppercase tracking-wider mt-1">Uptime SLA</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. FEATURES GRID ─── */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00A76F]">
              CORE CAPABILITIES
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Designed For Child Safety & Hostel Governance
            </h2>
            <p className="text-sm text-[#637381] dark:text-[#919EAB]">
              Full multi-tenant data segregation, server-side duration control, and audit compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] shadow-sm space-y-4 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#00A76F]/10 text-[#00A76F] flex items-center justify-center">
                <Tablet className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Child-Safe Tablet Kiosk</h3>
              <p className="text-sm text-[#637381] dark:text-[#919EAB] leading-relaxed">
                Shared tablets are activated via temporary 6-digit codes. Students tap their photo and call only approved parent contacts.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] shadow-sm space-y-4 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Server-Enforced Quotas</h3>
              <p className="text-sm text-[#637381] dark:text-[#919EAB] leading-relaxed">
                Call limits are calculated and enforced server-side. Hard 15/20 min timers automatically hang up the session when expired.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] shadow-sm space-y-4 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Supabase Row-Level Security</h3>
              <p className="text-sm text-[#637381] dark:text-[#919EAB] leading-relaxed">
                Every hostel institution is strictly isolated. Wardens, parents, and admins only see authorized records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-20 md:py-28 bg-[#F4F6F8] dark:bg-[#1C252E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00A76F]">
              SIMPLE 3-STEP WORKFLOW
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              How HostelConnect Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] space-y-4">
              <span className="text-4xl font-extrabold text-[#00A76F]">01</span>
              <h3 className="text-lg font-bold">Register Campus</h3>
              <p className="text-sm text-[#637381] dark:text-[#919EAB] leading-relaxed">
                Sign up as hostel admin, enroll students, and link verified parent contact details.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] space-y-4">
              <span className="text-4xl font-extrabold text-[#00A76F]">02</span>
              <h3 className="text-lg font-bold">Activate Kiosks</h3>
              <p className="text-sm text-[#637381] dark:text-[#919EAB] leading-relaxed">
                Generate a 6-digit code and open <span className="font-mono text-[#00A76F]">/device</span> on any tablet to lock into kiosk mode.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] space-y-4">
              <span className="text-4xl font-extrabold text-[#00A76F]">03</span>
              <h3 className="text-lg font-bold">Start Safe Calls</h3>
              <p className="text-sm text-[#637381] dark:text-[#919EAB] leading-relaxed">
                Students tap their photo, select mom or dad, and video call with auto-reset timers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. PRICING SECTION ─── */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00A76F]">
              TRANSPARENT PLANS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Campus Subscription Plans
            </h2>

            {/* Toggle */}
            <div className="inline-flex p-1 rounded-xl bg-[#F4F6F8] dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844]">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-white dark:bg-[#1C252E] text-[#00A76F] shadow-xs"
                    : "text-[#637381] dark:text-[#919EAB]"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  billingCycle === "yearly"
                    ? "bg-white dark:bg-[#1C252E] text-[#00A76F] shadow-xs"
                    : "text-[#637381] dark:text-[#919EAB]"
                }`}
              >
                Yearly (Save 20%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] space-y-6 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Starter</h3>
                <p className="text-xs text-[#919EAB]">Ideal for small boarding dorms</p>
                <div className="text-4xl font-extrabold text-[#1C252E] dark:text-white">
                  {billingCycle === "monthly" ? "₹2,499" : "₹24,990"}
                  <span className="text-xs font-normal text-[#919EAB]"> / {billingCycle === "monthly" ? "mo" : "yr"}</span>
                </div>
                <div className="pt-4 border-t border-[#F1F3F5] dark:border-[#2E3844] space-y-3 text-xs text-[#637381] dark:text-[#919EAB]">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F]" /> Up to 50 Residents</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F]" /> 2 Kiosk Tablets</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F]" /> 1,000 Call Minutes / Month</div>
                </div>
              </div>
              <Link href="/signup" className="w-full py-3 rounded-xl bg-[#F4F6F8] dark:bg-[#1C252E] hover:bg-[#E5E8EB] text-center font-bold text-xs block transition-colors">
                Choose Starter
              </Link>
            </div>

            {/* Growth */}
            <div className="p-8 rounded-2xl bg-white dark:bg-[#212B36] border-2 border-[#00A76F] space-y-6 flex flex-col justify-between shadow-xl relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#00A76F] text-white text-[10px] font-bold uppercase tracking-wider">
                Most Popular
              </span>
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Growth</h3>
                <p className="text-xs text-[#919EAB]">Perfect for standard institutions</p>
                <div className="text-4xl font-extrabold text-[#1C252E] dark:text-white">
                  {billingCycle === "monthly" ? "₹5,999" : "₹59,990"}
                  <span className="text-xs font-normal text-[#919EAB]"> / {billingCycle === "monthly" ? "mo" : "yr"}</span>
                </div>
                <div className="pt-4 border-t border-[#F1F3F5] dark:border-[#2E3844] space-y-3 text-xs text-[#637381] dark:text-[#919EAB]">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F]" /> Up to 200 Residents</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F]" /> 6 Kiosk Tablets</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F]" /> 5,000 Call Minutes / Month</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F]" /> Priority Warden Support</div>
                </div>
              </div>
              <Link href="/signup" className="w-full py-3 rounded-xl bg-[#00A76F] hover:bg-[#007856] text-white text-center font-bold text-xs shadow-lg shadow-[#00A76F]/25 block transition-colors">
                Choose Growth
              </Link>
            </div>

            {/* Enterprise */}
            <div className="p-8 rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] space-y-6 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Enterprise</h3>
                <p className="text-xs text-[#919EAB]">For large multi-campus hostels</p>
                <div className="text-4xl font-extrabold text-[#1C252E] dark:text-white">
                  {billingCycle === "monthly" ? "₹14,999" : "₹1,49,990"}
                  <span className="text-xs font-normal text-[#919EAB]"> / {billingCycle === "monthly" ? "mo" : "yr"}</span>
                </div>
                <div className="pt-4 border-t border-[#F1F3F5] dark:border-[#2E3844] space-y-3 text-xs text-[#637381] dark:text-[#919EAB]">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F]" /> 1,000+ Residents</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F]" /> 25 Kiosk Tablets</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F]" /> 25,000 Call Minutes</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#00A76F]" /> Dedicated Video Cluster</div>
                </div>
              </div>
              <Link href="/signup" className="w-full py-3 rounded-xl bg-[#F4F6F8] dark:bg-[#1C252E] hover:bg-[#E5E8EB] text-center font-bold text-xs block transition-colors">
                Contact Enterprise
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. FAQ SECTION ─── */}
      <section id="faq" className="py-20 md:py-28 bg-[#F4F6F8] dark:bg-[#1C252E]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00A76F]">FAQ</span>
            <h2 className="text-3xl font-extrabold tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  className="w-full p-5 text-left font-bold text-sm flex items-center justify-between gap-4"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#919EAB] transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-xs text-[#637381] dark:text-[#919EAB] leading-relaxed border-t border-[#F1F3F5] dark:border-[#2E3844] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. FOOTER ─── */}
      <footer className="border-t border-[#E5E8EB] dark:border-[#2E3844] py-12 bg-white dark:bg-[#141A21]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#919EAB]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#00A76F] text-white flex items-center justify-center">
              <Video className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-[#1C252E] dark:text-white">{BRAND.name}</span>
            <span>© 2026. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-[#00A76F]">Sign In</Link>
            <Link href="/device" className="hover:text-[#00A76F]">Kiosk Mode</Link>
            <Link href="/signup" className="hover:text-[#00A76F]">Campus Signup</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
