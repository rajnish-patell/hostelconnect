import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const timestamp = new Date().toISOString();
  let dbStatus = "healthy";

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("plans").select("id").limit(1);
    if (error && error.code !== "PGRST116") {
      dbStatus = "degraded";
    }
  } catch {
    dbStatus = "unavailable";
  }

  return NextResponse.json({
    status: "ok",
    app: "HostelConnect",
    version: "1.0.0",
    timestamp,
    services: {
      database: dbStatus,
      video: process.env.JITSI_DOMAIN ? "configured" : "default (meet.jit.si)",
      email: process.env.RESEND_API_KEY ? "configured" : "dev-mock-mode",
      payments: process.env.RAZORPAY_KEY_ID ? "configured" : "unconfigured",
    },
  });
}
