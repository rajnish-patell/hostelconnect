"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Clock, Save, Plus, Trash2, CheckCircle2, AlertCircle, ShieldCheck, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingState from "@/components/common/LoadingState";

export default function AdminSchedulesPage() {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Hostel Schedule Settings
  const [maxCallDuration, setMaxCallDuration] = useState(15);
  const [maxCallsPerStudentPerDay, setMaxCallsPerStudentPerDay] = useState(2);
  const [maxCallsPerParentPerDay, setMaxCallsPerParentPerDay] = useState(3);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("21:00");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [emergencyCallsEnabled, setEmergencyCallsEnabled] = useState(true);

  // Blocked Dates / Holidays
  const [blockedDates, setBlockedDates] = useState([]);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg("Call schedule configuration updated and active across all kiosk tablets.");
      setTimeout(() => setSuccessMsg(null), 4000);
    }, 600);
  };

  const handleAddBlockedDate = (e) => {
    e.preventDefault();
    if (!newDate) return;
    setBlockedDates([...blockedDates, { date: newDate, reason: newReason || "Dormitory Maintenance" }]);
    setNewDate("");
    setNewReason("");
  };

  const handleRemoveBlockedDate = (index) => {
    setBlockedDates(blockedDates.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Call Schedule & Quota Rules</h1>
        <p className="text-sm text-slate-500 mt-1">Configure calling hours, duration limits, timezones, and blocked dates</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Core Quotas Card */}
        <Card className="p-6 space-y-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#00A76F]" /> Calling Quota & Duration Limits
          </CardTitle>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="maxDuration">Max Duration per Call</Label>
              <select
                id="maxDuration"
                value={maxCallDuration}
                onChange={(e) => setMaxCallDuration(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 text-sm font-bold"
              >
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes (Standard)</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes (Extended)</option>
              </select>
              <p className="text-[11px] text-slate-400">Server automatically terminates call when reached</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="callsPerStudent">Max Calls / Student / Day</Label>
              <Input
                id="callsPerStudent"
                type="number"
                min={1}
                max={10}
                value={maxCallsPerStudentPerDay}
                onChange={(e) => setMaxCallsPerStudentPerDay(Number(e.target.value))}
                className="font-bold"
              />
              <p className="text-[11px] text-slate-400">Daily quota per resident</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="callsPerParent">Max Calls / Parent / Day</Label>
              <Input
                id="callsPerParent"
                type="number"
                min={1}
                max={10}
                value={maxCallsPerParentPerDay}
                onChange={(e) => setMaxCallsPerParentPerDay(Number(e.target.value))}
                className="font-bold"
              />
              <p className="text-[11px] text-slate-400">Daily quota per verified parent</p>
            </div>
          </div>
        </Card>

        {/* Operating Window Card */}
        <Card className="p-6 space-y-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#00A76F]" /> Daily Calling Time Window
          </CardTitle>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Start Time (Hostel Local)</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endTime">End Time (Hostel Local)</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone">Hostel Timezone</Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 text-sm font-bold"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="emergencyToggle"
              checked={emergencyCallsEnabled}
              onChange={(e) => setEmergencyCallsEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-[#00A76F] focus:ring-[#00A76F]"
            />
            <Label htmlFor="emergencyToggle" className="cursor-pointer font-medium">
              Allow emergency override calls outside regular calling hours
            </Label>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading} className="bg-[#00A76F] hover:bg-[#007856] text-white font-bold px-8 py-3 rounded-xl shadow-md shadow-[#00A76F]/25 gap-2">
            <Save className="w-4 h-4" /> Save Calling Schedule
          </Button>
        </div>
      </form>

      {/* Blocked Dates & Holidays */}
      <Card className="p-6 space-y-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Moon className="w-5 h-5 text-purple-600" /> Holiday & Blocked Calling Dates
        </CardTitle>
        <p className="text-xs text-slate-500">Days when calling kiosks are disabled for exams, festivals, or scheduled outages.</p>

        <form onSubmit={handleAddBlockedDate} className="flex flex-col sm:flex-row gap-3 pt-2">
          <Input
            type="date"
            required
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="sm:w-48 font-bold"
          />
          <Input
            placeholder="Reason (e.g. Mid-Term Examination)"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="outline" className="font-bold rounded-xl gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> Block Date
          </Button>
        </form>

        <div className="space-y-2 pt-2">
          {blockedDates.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-slate-900 dark:text-white">{item.date}</span>
                <span className="text-slate-600 dark:text-slate-400">— {item.reason}</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemoveBlockedDate(idx)}
                className="h-8 w-8 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
