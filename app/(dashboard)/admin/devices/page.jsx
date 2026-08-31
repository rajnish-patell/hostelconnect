"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Tablet, Plus, KeyRound, ShieldCheck, CheckCircle2, AlertCircle, X, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [deviceDesc, setDeviceDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [newActivation, setNewActivation] = useState(null);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/devices");
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const json = await res.json();
        if (json.success) setDevices(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const hostelId = devices[0]?.hostel_id || "a0000000-0000-0000-0000-000000000001";

      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostelId,
          name: deviceName,
          description: deviceDesc,
          deviceType: "tablet",
        }),
      });

      let json = null;
      if (res.headers.get("content-type")?.includes("application/json")) {
        json = await res.json();
      }
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || "Failed to register kiosk tablet");
      }

      setNewActivation(json.data);
      setShowAddModal(false);
      setDeviceName("");
      setDeviceDesc("");
      fetchDevices();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Hostel Calling Kiosks</h1>
          <p className="text-sm text-slate-500">Manage shared tablets and temporary activation codes</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/device" target="_blank">
            <Button variant="outline" className="rounded-xl gap-1.5 font-bold">
              <ExternalLink className="w-4 h-4" /> Open Kiosk View
            </Button>
          </Link>
          <Button onClick={() => setShowAddModal(true)} className="bg-[#00A76F] hover:bg-[#007856] font-bold rounded-xl gap-1.5 shadow-md shadow-[#00A76F]/25 text-white">
            <Plus className="w-4 h-4" /> Register New Tablet
          </Button>
        </div>
      </div>

      {/* Generated Code Alert */}
      {newActivation && (
        <div className="p-6 bg-gradient-to-r from-[#00A76F] to-[#007856] text-white rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold uppercase tracking-wider">
              <KeyRound className="w-4 h-4" /> Tablet Activation Code
            </div>
            <h3 className="text-2xl font-black mt-1">
              Code: <span className="font-mono tracking-widest text-amber-300">{newActivation.activationCode}</span>
            </h3>
            <p className="text-xs text-emerald-50 mt-1">
              Enter this code on the tablet browser at <span className="font-mono underline">/device</span> to securely lock and activate it.
            </p>
          </div>
          <Button
            onClick={() => setNewActivation(null)}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold rounded-xl"
          >
            Dismiss
          </Button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-semibold">
          <AlertCircle className="w-5 h-5" /> {errorMsg}
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading kiosk devices..." />
      ) : devices.length === 0 ? (
        <EmptyState
          icon={Tablet}
          title="No calling kiosks registered"
          description="Register your first shared tablet or laptop to enable student calling."
          actionLabel="Register Tablet"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {devices.map((device) => {
            const activeCode = device.device_activation_codes?.find((c) => !c.used_at && new Date(c.expires_at) > new Date());
            return (
              <Card key={device.id} className="p-6 flex flex-col justify-between space-y-4 hover:shadow-lg transition-shadow">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
                        <Tablet className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                          {device.name}
                        </h3>
                        <p className="text-xs text-slate-500">{device.description || "Shared dormitory kiosk"}</p>
                      </div>
                    </div>
                    <Badge variant={device.status === "ACTIVE" ? "success" : "secondary"}>
                      {device.status}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {device.status === "ACTIVE" ? "Online & Ready" : "Awaiting Activation"}
                      </span>
                    </div>

                    {activeCode && (
                      <div className="flex items-center justify-between bg-amber-500/10 p-2 rounded-xl text-amber-700 dark:text-amber-300 font-medium">
                        <span>Activation Code:</span>
                        <span className="font-mono font-bold tracking-wider">{activeCode.code}</span>
                      </div>
                    )}

                    {device.last_seen_at && (
                      <div className="flex items-center justify-between">
                        <span>Last Active:</span>
                        <span>{new Date(device.last_seen_at).toLocaleTimeString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <Link href="/device" target="_blank">
                    <Button variant="outline" size="sm" className="w-full rounded-xl text-xs font-bold gap-1">
                      <ExternalLink className="w-3.5 h-3.5" /> Open Tablet Screen
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Register Tablet */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-white dark:bg-slate-900 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg">Register Shared Kiosk Tablet</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterDevice} className="space-y-3.5">
              <div className="space-y-1">
                <Label>Device Name *</Label>
                <Input required value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="e.g. Block A Lobby Tablet" />
              </div>

              <div className="space-y-1">
                <Label>Description / Location</Label>
                <Input value={deviceDesc} onChange={(e) => setDeviceDesc(e.target.value)} placeholder="e.g. Warden Office Desk 1" />
              </div>

              <div className="flex gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="w-full">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="w-full bg-[#00A76F] hover:bg-[#007856] text-white font-bold shadow-md shadow-[#00A76F]/25">
                  {submitting ? "Registering..." : "Generate Activation Code"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
