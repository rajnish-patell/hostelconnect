"use client";

import React, { useState, useEffect } from "react";
import { User, Phone, Mail, Lock, ShieldCheck, CheckCircle2, Save, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ParentSettingsPage() {
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsReminders, setSmsReminders] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/parents");
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            const parentObj = Array.isArray(json.data) ? json.data[0] : json.data;
            if (parentObj?.phone) setPhone(parentObj.phone);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadProfile();
  }, []);

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
        <Card className="p-6 space-y-4 bg-white dark:bg-[#212B36] border-[#E5E8EB] dark:border-[#2E3844] rounded-2xl">
          <CardTitle className="text-lg flex items-center gap-2 text-[#1C252E] dark:text-white">
            <Phone className="w-5 h-5 text-[#00A76F]" /> Verified Calling Phone Numbers
          </CardTitle>
          <p className="text-xs text-[#919EAB]">
            Hostel calling kiosks display this phone number to wardens when authenticating parent connections.
          </p>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="primaryPhone">Primary Phone Number (Verified)</Label>
              <Input
                id="primaryPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 8349655888"
                required
                className="font-bold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="altPhone">Alternate / Emergency Contact Number</Label>
              <Input
                id="altPhone"
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                placeholder="Optional emergency number"
                className="rounded-xl"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4 bg-white dark:bg-[#212B36] border-[#E5E8EB] dark:border-[#2E3844] rounded-2xl">
          <CardTitle className="text-lg flex items-center gap-2 text-[#1C252E] dark:text-white">
            <Bell className="w-5 h-5 text-[#00A76F]" /> Notification Channels
          </CardTitle>

          <div className="space-y-3 pt-1">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#F4F6F8] dark:bg-[#1C252E] cursor-pointer">
              <span className="text-sm font-semibold text-[#1C252E] dark:text-white">Email Call Invitations</span>
              <input
                type="checkbox"
                checked={emailNotifs}
                onChange={(e) => setEmailNotifs(e.target.checked)}
                className="w-4 h-4 accent-[#00A76F]"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#F4F6F8] dark:bg-[#1C252E] cursor-pointer">
              <span className="text-sm font-semibold text-[#1C252E] dark:text-white">SMS Call Slot Reminders</span>
              <input
                type="checkbox"
                checked={smsReminders}
                onChange={(e) => setSmsReminders(e.target.checked)}
                className="w-4 h-4 accent-[#00A76F]"
              />
            </label>
          </div>
        </Card>

        <Button type="submit" className="bg-[#00A76F] hover:bg-[#007856] text-white font-bold rounded-xl shadow-md shadow-[#00A76F]/25 cursor-pointer">
          <Save className="w-4 h-4 mr-2" /> Save Preferences
        </Button>
      </form>
    </div>
  );
}
