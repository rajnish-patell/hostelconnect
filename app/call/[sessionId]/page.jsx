"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import JitsiMeetingWrapper from "@/components/video/JitsiMeeting";

export default function CallSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.sessionId;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    async function fetchSession() {
      if (!sessionId) return;
      try {
        const res = await fetch(`/api/calls/${sessionId}`);
        let json = null;
        if (res.headers.get("content-type")?.includes("application/json")) {
          json = await res.json();
        }

        if (!res.ok || !json?.success || !json?.data) {
          throw new Error(json?.error?.message || "Failed to load call session");
        }

        setSession(json.data);
      } catch (err) {
        setErrorMsg(err.message || "Could not connect to call room");
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#202124] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#00A76F]/20 border border-[#00A76F]/30 flex items-center justify-center animate-pulse">
          <Loader2 className="w-8 h-8 text-[#00A76F] animate-spin" />
        </div>
        <p className="text-base font-extrabold text-white tracking-tight">Connecting Encrypted Video Room...</p>
        <p className="text-xs text-[#9aa0a6]">Zero external login required</p>
      </div>
    );
  }

  if (errorMsg || !session) {
    return (
      <div className="h-screen w-screen bg-[#202124] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="p-5 rounded-3xl bg-red-500/15 text-red-400 mb-4 border border-red-500/25">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold">Call Session Ended or Unavailable</h2>
        <p className="text-xs text-[#9aa0a6] max-w-md mt-1 mb-6">{errorMsg || "This video calling session is no longer active."}</p>
        <Button onClick={() => router.push("/parent")} className="bg-[#00A76F] hover:bg-[#007856] rounded-xl font-bold text-xs h-11 px-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to Dashboard
        </Button>
      </div>
    );
  }

  const studentName = session?.student
    ? `${session.student.first_name || ""} ${session.student.last_name || ""}`.trim()
    : "Student";
  const parentName = session?.parent
    ? `${session.parent.first_name || ""} ${session.parent.last_name || ""}`.trim()
    : "Parent";

  return (
    <div className="h-screen w-screen bg-[#202124] text-white overflow-hidden p-0 sm:p-2">
      <JitsiMeetingWrapper
        sessionId={session.id}
        meetingId={session.meeting_id}
        studentName={studentName}
        parentName={parentName}
        isStudent={false}
        maxDurationMinutes={session.max_duration_minutes || 15}
        onCallEnded={() => router.push("/parent/calls")}
      />
    </div>
  );
}
