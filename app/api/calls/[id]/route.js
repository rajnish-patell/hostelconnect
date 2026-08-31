import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    const { data: session, error } = await admin
      .from("call_sessions")
      .select("*, student:students(*), parent:parents(*), hostel:hostels(*)")
      .eq("id", id)
      .single();

    if (error || !session) {
      return NextResponse.json({
        success: false,
        error: { code: "CALL_NOT_FOUND", message: "Call session not found" },
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: { code: "SERVER_ERROR", message: err.message },
    }, { status: 500 });
  }
}
