"use client";

import React, { useState } from "react";
import { User, Phone, Mail, Lock, ShieldCheck, CheckCircle2, Save, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ParentSettingsPage() {
  const [phone, setPhone] = useState("+91 98765 43210");
  const [altPhone, setAltPhone] = useState("+91 91234 56789");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsReminders, setSmsReminders] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Parent Account & Security</h1>
        <p className="text-sm text-slate-500">Update verified contact numbers, alerts, and authentication preferences</p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Your contact settings have been successfully updated.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="p-6 space-y-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="w-5 h-5 text-[#00A76F]" /> Verified Calling Phone Numbers
          </CardTitle>
          <p className="text-xs text-slate-500">
            Hostel calling kiosks display this phone number to wardens when authenticating parent connections.
          </p>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="primaryPhone">Primary Phone Number (Verified)</Label>
              <Input
                id="primaryPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="altPhone">Alternate / Emergency Contact Number</Label>
              <Input
                id="altPhone"
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                className="font-bold"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#00A76F]" /> Notification Channels
          </CardTitle>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifs}
                onChange={(e) => setEmailNotifs(e.target.checked)}
                className="w-4 h-4 rounded text-[#00A76F] focus:ring-[#00A76F]"
              />
              <div>
                <p className="text-sm font-bold">Email Notifications via Resend</p>
                <p className="text-xs text-slate-500">Receive immediate call invite links and time slot reminders</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={smsReminders}
                onChange={(e) => setSmsReminders(e.target.checked)}
                className="w-4 h-4 rounded text-[#00A76F] focus:ring-[#00A76F]"
              />
              <div>
                <p className="text-sm font-bold">In-App Alerts</p>
                <p className="text-xs text-slate-500">Display instant banners in your parent portal when your child initiates a call</p>
              </div>
            </label>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="bg-[#00A76F] hover:bg-[#007856] text-white font-bold px-8 py-3 rounded-xl shadow-md shadow-[#00A76F]/25 gap-2">
            <Save className="w-4 h-4" /> Save Profile Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}
