"use client";

import React, { useState } from "react";
import { Settings, Save, CheckCircle2, Server, Shield, Video, Bell, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SuperAdminSettingsPage() {
  const [jitsiDomain, setJitsiDomain] = useState("meet.jit.si");
  const [allowPublicSignup, setAllowPublicSignup] = useState(true);
  const [defaultDuration, setDefaultDuration] = useState(15);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Platform Configuration & Video Bridge</h1>
        <p className="text-sm text-slate-500">Global defaults, self-hosted Jitsi domain, and security policies</p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Platform settings updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="p-6 space-y-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Video className="w-5 h-5 text-[#00A76F]" /> Video Conferencing Infrastructure
          </CardTitle>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="jitsiDomain">Jitsi Domain Bridge</Label>
              <Input
                id="jitsiDomain"
                value={jitsiDomain}
                onChange={(e) => setJitsiDomain(e.target.value)}
                required
                className="font-mono font-bold"
                placeholder="meet.jit.si or meet.yourdomain.com"
              />
              <p className="text-xs text-slate-400">
                You can switch between cloud Jitsi or your private self-hosted JaaS cluster.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="defaultDuration">Default Call Session Limit (Minutes)</Label>
              <Input
                id="defaultDuration"
                type="number"
                min={5}
                max={60}
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(Number(e.target.value))}
                className="font-bold"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" /> Registration & Tenancy Policies
          </CardTitle>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowPublicSignup}
                onChange={(e) => setAllowPublicSignup(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              <div>
                <p className="text-sm font-bold">Allow Public Parent / Hostel Signup</p>
                <p className="text-xs text-slate-500">Allow users to register accounts directly via the landing page</p>
              </div>
            </label>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 font-bold px-8 py-3 rounded-xl shadow-md gap-2">
            <Save className="w-4 h-4" /> Save Global Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}
