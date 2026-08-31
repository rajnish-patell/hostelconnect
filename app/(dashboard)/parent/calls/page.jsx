"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Video, Clock, ArrowLeft, RefreshCw, Search, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import { formatDuration, formatTimeSafe, formatDateSafe } from "@/lib/utils";

export default function ParentCallsHistoryPage() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [mounted, setMounted] = useState(false);

  const fetchCalls = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calls?page=${pageNum}&limit=25`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setCalls(json.data);
          setPage(pageNum);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchCalls(1);
  }, []);

  const cleanTerm = search.toLowerCase().trim();
  const filteredCalls = calls.filter((c) => {
    if (!cleanTerm) return true;
    const student = `${c.student?.first_name || ""} ${c.student?.last_name || ""}`.toLowerCase();
    const adm = (c.student?.admission_number || "").toLowerCase();
    const hostel = (c.hostel?.name || "").toLowerCase();
    const notes = (c.notes || "").toLowerCase();
    return student.includes(cleanTerm) || adm.includes(cleanTerm) || hostel.includes(cleanTerm) || notes.includes(cleanTerm);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/parent" className="text-xs text-[#00A76F] hover:underline flex items-center gap-1 font-bold">
              <ArrowLeft className="w-3 h-3" /> Back to Overview
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1C252E] dark:text-white">
            Call History & Logs 📞
          </h1>
          <p className="text-xs text-[#919EAB]">Records of all scheduled and completed video sessions</p>
        </div>

        <Button variant="outline" size="sm" onClick={() => fetchCalls(page)} className="rounded-xl gap-1 font-bold cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#212B36] rounded-2xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-xs">
        <Search className="w-4 h-4 text-[#919EAB] ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search call logs by child name, admission ID, or notes..."
          className="flex-1 bg-transparent text-sm text-[#1C252E] dark:text-white placeholder:text-[#919EAB] focus:outline-none font-medium"
        />
      </div>

      {loading && !mounted ? (
        <LoadingState message="Loading call history..." />
      ) : filteredCalls.length === 0 ? (
        <Card className="p-12 text-center text-[#919EAB] rounded-2xl border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#212B36]">
          <PhoneCall className="w-10 h-10 text-[#919EAB] mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-[#1C252E] dark:text-white">No call sessions found</p>
          <p className="text-xs text-[#919EAB] mt-1">Book a video slot from the &quot;Book Video Slot&quot; menu to schedule your first call.</p>
        </Card>
      ) : (
        <div className="rounded-2xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#212B36] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F8]/60 dark:bg-[#1C252E]/60 text-[#919EAB] uppercase font-bold border-b border-[#F1F3F5] dark:border-[#2E3844]">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Hostel / Campus</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Duration</th>
                  <th className="px-5 py-4">Date & Time</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5] dark:divide-[#2E3844]">
                {filteredCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-[#F4F6F8]/50 dark:hover:bg-[#2E3844]/40 transition-colors">
                    <td className="px-5 py-4 font-bold text-[#1C252E] dark:text-white">
                      {call.student?.first_name || "Student"} {call.student?.last_name || ""}
                    </td>
                    <td className="px-5 py-4 text-[#637381] dark:text-[#919EAB]">
                      {call.hostel?.name || "Gurukul Campus"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={call.status} />
                    </td>
                    <td className="px-5 py-4 font-mono font-medium">
                      {formatDuration(call.duration_seconds || 0)}
                    </td>
                    <td className="px-5 py-4 text-[#919EAB]" suppressHydrationWarning>
                      {formatDateSafe(call.started_at || call.created_at)} • {formatTimeSafe(call.started_at || call.created_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {call.status === "READY" || call.status === "IN_PROGRESS" ? (
                        <Link href={`/call/${call.id}`}>
                          <Button size="sm" className="bg-[#00A76F] hover:bg-[#007856] text-white font-bold rounded-xl gap-1 text-xs cursor-pointer">
                            <Video className="w-3.5 h-3.5" /> Join Room
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-[#919EAB] font-medium">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
