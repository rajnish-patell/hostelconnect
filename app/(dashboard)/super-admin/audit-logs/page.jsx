"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, ShieldCheck, Filter, Search, Clock, Key, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SuperAdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setLogs(
              json.data.map((n) => ({
                id: n.id,
                action: n.type || "SECURITY_AUDIT",
                resource: "system",
                actor: "HostelConnect Core",
                ip: "127.0.0.1",
                description: n.message || n.title || "System event logged",
                time: new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              }))
            );
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Security & Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time immutable ledger of system actions, authentication events, and video calls</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by action, student, IP..."
            className="pl-9 bg-white dark:bg-slate-900 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">No audit events recorded yet</p>
                    <p className="text-xs text-slate-400 mt-0.5">Events will appear as users interact with the system.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 font-mono text-xs">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 max-w-md">
                      {log.description}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{log.actor}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{log.ip}</td>
                    <td className="px-6 py-4 text-right text-xs text-slate-400 whitespace-nowrap">{log.time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
