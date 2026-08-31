"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Video, Clock, ArrowLeft, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import { formatDuration } from "@/lib/utils";

export default function ParentCallsHistoryPage() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });

  const fetchCalls = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calls?page=${pageNum}&limit=25`);
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const json = await res.json();
        if (json.success) {
          setCalls(json.data || []);
          setPagination(json.pagination || { totalPages: 1 });
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
          <p className="text-xs text-[#919EAB]">Immutable records of all supervised video calls</p>
        </div>

        <Button variant="outline" size="sm" onClick={() => fetchCalls(page)} className="rounded-xl gap-1 font-bold">
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

      {loading ? (
        <LoadingState message="Loading call history..." />
      ) : filteredCalls.length === 0 ? (
        <Card className="p-12 text-center text-[#919EAB] rounded-2xl border-[#E5E8EB] dark:border-[#2E3844]">
          No call sessions match your search.
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
                  <th className="px-5 py-4">Started At</th>
                  <th className="px-5 py-4">Ended At</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5] dark:divide-[#2E3844]">
                {filteredCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-[#F4F6F8]/50 dark:hover:bg-[#2E3844]/40 transition-colors">
                    <td className="px-5 py-4 font-bold text-[#1C252E] dark:text-white">
                      {call.student?.first_name} {call.student?.last_name || ""}
                    </td>
                    <td className="px-5 py-4 text-[#637381] dark:text-[#919EAB]">
                      {call.hostel?.name || "Campus Main"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={call.status} />
                    </td>
                    <td className="px-5 py-4 font-mono font-medium">
                      {formatDuration(call.duration_seconds)}
                    </td>
                    <td className="px-5 py-4 text-[#919EAB]">
                      {call.started_at ? new Date(call.started_at).toLocaleTimeString("en-IN") : "—"}
                    </td>
                    <td className="px-5 py-4 text-[#919EAB]">
                      {call.ended_at ? new Date(call.ended_at).toLocaleTimeString("en-IN") : "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {call.status === "READY" || call.status === "IN_PROGRESS" ? (
                        <Link href={`/call/${call.id}`}>
                          <Button size="sm" className="bg-[#00A76F] hover:bg-[#007856] text-white font-bold rounded-xl gap-1 text-xs">
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
