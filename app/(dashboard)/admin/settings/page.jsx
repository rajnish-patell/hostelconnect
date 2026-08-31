"use client";

import React, { useState } from "react";
import { Settings, Save, CheckCircle2, Building, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AdminSettingsPage() {
  const [hostelName, setHostelName] = useState("Greenwood Residential Campus");
  const [campusCode, setCampusCode] = useState("GW-01");
  const [supportEmail, setSupportEmail] = useState("admin@greenwood.edu");
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Hostel Settings & Identity</h1>
        <p className="text-sm text-slate-500">Configure institution branding, campus code, and emergency contacts</p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Hostel settings updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="p-6 space-y-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building className="w-5 h-5 text-[#00A76F]" /> General Campus Details
          </CardTitle>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="hostelName">Hostel / School Full Name</Label>
              <Input
                id="hostelName"
                value={hostelName}
                onChange={(e) => setHostelName(e.target.value)}
                required
                className="font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="campusCode">Institution Campus Code</Label>
              <Input
                id="campusCode"
                value={campusCode}
                onChange={(e) => setCampusCode(e.target.value)}
                required
                className="font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supportEmail">Administrative Contact Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                required
                className="font-bold"
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 font-bold px-8 py-3 rounded-xl shadow-md gap-2">
            <Save className="w-4 h-4" /> Save Hostel Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}
