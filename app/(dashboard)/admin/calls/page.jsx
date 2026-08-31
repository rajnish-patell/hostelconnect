"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Video, Clock, Search, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import { formatDuration } from "@/lib/utils";

export default function AdminCallsPage() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calls?limit=30");
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const json = await res.json();
        if (json.success) setCalls(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const filtered = calls.filter((c) => {
    const term = search.toLowerCase().trim();
    const cleanTerm = term.replace(/[^a-z0-9]/g, "");

    const student = `${c.student?.first_name || ""} ${c.student?.last_name || ""}`.toLowerCase();
    const adm = (c.student?.admission_number || "").toLowerCase();
    const parent = `${c.parent?.first_name || ""} ${c.parent?.last_name || ""}`.toLowerCase();
    const phone = (c.parent?.phone || "").replace(/\D/g, "");
    const meetingId = (c.meeting_id || "").toLowerCase();
    const notes = (c.notes || "").toLowerCase();

    const matchesSearch =
      !term ||
      student.includes(term) ||
      adm.includes(term) ||
      parent.includes(term) ||
      (cleanTerm && phone.includes(cleanTerm)) ||
      meetingId.includes(term) ||
      notes.includes(term);

    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Supervised Call Logs & Audit</h1>
          <p className="text-sm text-slate-500">Immutable records of all student-parent video calling sessions</p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchCalls} className="rounded-xl gap-1 font-bold">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <Input
            placeholder="Search by student or parent name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 px-4 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 text-sm font-semibold"
        >
          <option value="ALL">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="READY">Ready to Call</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <LoadingState message="Loading call history..." />
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-slate-500">
          No call sessions match your filter criteria.
        </Card>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Parent</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Duration</th>
                  <th className="px-5 py-4">Meeting Reference</th>
                  <th className="px-5 py-4">Date & Time</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                      {call.student?.first_name} {call.student?.last_name || ""}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {call.parent?.first_name} {call.parent?.last_name || ""}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={call.status} />
                    </td>
                    <td className="px-5 py-4 font-mono font-medium">
                      {formatDuration(call.duration_seconds)}
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                      {call.meeting_id}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(call.created_at).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {call.status === "READY" || call.status === "IN_PROGRESS" ? (
                        <Link href={`/call/${call.id}`}>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 font-bold rounded-lg text-xs gap-1">
                            <Video className="w-3.5 h-3.5" /> Supervise
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-slate-400 font-medium">Archived</span>
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
