"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Video, Clock, PhoneCall, ShieldCheck, Search, Tablet, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingState from "@/components/common/LoadingState";
import StatusBadge from "@/components/common/StatusBadge";
import { formatDuration } from "@/lib/utils";

export default function StaffOperationsPage() {
  const [calls, setCalls] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [callsRes, studentsRes] = await Promise.all([
          fetch("/api/calls?limit=10"),
          fetch("/api/students"),
        ]);
        if (callsRes.ok && callsRes.headers.get("content-type")?.includes("application/json")) {
          const callsJson = await callsRes.json();
          if (callsJson.success) setCalls(callsJson.data || []);
        }
        if (studentsRes.ok && studentsRes.headers.get("content-type")?.includes("application/json")) {
          const studentsJson = await studentsRes.json();
          if (studentsJson.success) setStudents(studentsJson.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <LoadingState message="Loading warden operational panel..." />;

  const activeCalls = calls.filter((c) => c.status === "IN_PROGRESS" || c.status === "READY");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Warden Calling Desk</h1>
          <p className="text-sm text-slate-500">Supervise student calls, verify identity, and monitor active sessions</p>
        </div>

        <Link href="/device" target="_blank">
          <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl gap-2 shadow-md">
            <Tablet className="w-4 h-4" /> Open Student Kiosk Tablet
          </Button>
        </Link>
      </div>

      {/* Active Live Calls Monitor */}
      <Card className="p-6 space-y-4 border-[#00A76F]/30 bg-[#EAFBF1]/30 dark:bg-[#00A76F]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#00A76F] animate-ping" />
            <CardTitle className="text-lg">Live Active Sessions ({activeCalls.length})</CardTitle>
          </div>
        </div>

        {activeCalls.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">No active video calls in progress right now.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCalls.map((call) => (
              <div key={call.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {call.student?.first_name} ↔ {call.parent?.first_name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Session: {call.meeting_id}</p>
                </div>
                <Link href={`/call/${call.id}`}>
                  <Button size="sm" className="bg-[#00A76F] hover:bg-[#007856] rounded-lg text-xs font-bold gap-1 text-white shadow-md shadow-[#00A76F]/25">
                    <Video className="w-3.5 h-3.5" /> Supervise
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Student List for Instant Call Initiation */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Registered Students ({students.length})</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <Card key={student.id} className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">{student.first_name} {student.last_name || ""}</h4>
                <p className="text-xs text-slate-500">Roll: {student.admission_number}</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                  {student.student_guardians?.length || 0} verified guardian(s)
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                Grade {student.class_grade || "—"}
              </Badge>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
