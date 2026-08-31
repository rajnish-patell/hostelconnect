"use client";

import React, { useState } from "react";
import { Building, Plus, Users, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState([
    { id: "1", name: "Dorm 101", floor: "Ground Floor", capacity: 4, occupied: 3 },
    { id: "2", name: "Dorm 102", floor: "Ground Floor", capacity: 4, occupied: 4 },
    { id: "3", name: "Dorm 201", floor: "First Floor", capacity: 6, occupied: 5 },
    { id: "4", name: "Dorm 202", floor: "First Floor", capacity: 6, occupied: 2 },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [floor, setFloor] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    const newRoom = {
      id: Date.now().toString(),
      name,
      floor: floor || "Ground Floor",
      capacity: Number(capacity),
      occupied: 0,
    };
    setRooms([...rooms, newRoom]);
    setShowModal(false);
    setName("");
    setFloor("");
    setSuccessMsg(`Room "${name}" created successfully.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Rooms & Dormitories</h1>
          <p className="text-sm text-slate-500">Manage residential blocks, floors, and student room assignments</p>
        </div>

        <Button onClick={() => setShowModal(true)} className="bg-[#00A76F] hover:bg-[#007856] font-bold rounded-xl gap-1.5 shadow-md shadow-[#00A76F]/25 text-white">
          <Plus className="w-4 h-4" /> Add New Dorm
        </Button>
      </div>

      {successMsg && (
        <div className="p-4 bg-[#EAFBF1] dark:bg-[#00A76F]/10 border border-[#C8FACD] dark:border-[#00A76F]/20 text-[#007856] dark:text-[#5BE49B] rounded-2xl flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-[#00A76F] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {rooms.map((room) => (
          <Card key={room.id} className="p-6 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#EAFBF1] dark:bg-[#00A76F]/20 text-[#00A76F] flex items-center justify-center font-bold">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{room.name}</h3>
                  <p className="text-xs text-slate-500">{room.floor}</p>
                </div>
              </div>
              <Badge variant={room.occupied >= room.capacity ? "destructive" : "secondary"}>
                {room.occupied >= room.capacity ? "Full" : "Available"}
              </Badge>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" /> Residents:
              </span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">
                {room.occupied} / {room.capacity}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Dorm Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-white dark:bg-slate-900 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg">Add Dormitory Room</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3.5">
              <div className="space-y-1">
                <Label>Room / Dorm Name *</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Block B - Room 204" />
              </div>

              <div className="space-y-1">
                <Label>Floor / Wing</Label>
                <Input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g. 2nd Floor, West Wing" />
              </div>

              <div className="space-y-1">
                <Label>Bed Capacity</Label>
                <Input type="number" min={1} max={20} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </div>

              <div className="flex gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="w-full">
                  Cancel
                </Button>
                <Button type="submit" className="w-full bg-[#00A76F] hover:bg-[#007856] text-white font-bold shadow-md shadow-[#00A76F]/25">
                  Save Room
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
