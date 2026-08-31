import { NextResponse } from "next/server";
import { activateDeviceWithCode } from "@/lib/services/device.service";
import { deviceActivationSchema } from "@/lib/validators";

export async function POST(request) {
  try {
    const body = await request.json();
    const parseResult = deviceActivationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error?.errors?.[0]?.message || "Invalid activation code" },
      }, { status: 400 });
    }

    const { code } = parseResult.data;
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "";

    const activation = await activateDeviceWithCode({
      code,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Device activated successfully",
      data: activation,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: { code: "ACTIVATION_FAILED", message: err.message },
    }, { status: 400 });
  }
}
