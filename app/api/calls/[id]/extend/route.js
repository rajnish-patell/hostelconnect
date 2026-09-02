import { NextResponse } from "next/server";
import { extendCallSession } from "@/lib/services/call.service";
import { requireCallAccess } from "@/lib/auth/rbac";
import { extendCallSchema } from "@/lib/validators";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { user } = await requireCallAccess(id);

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional; defaults to 5 minutes
    }

    const validation = extendCallSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid call extension parameters",
            details: validation.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { extensionMinutes } = validation.data;
    const updated = await extendCallSession(id, {
      extensionMinutes,
      requestedByUserId: user.id,
    });

    logger.info("Call session extended successfully", {
      sessionId: id,
      userId: user.id,
      extensionMinutes,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Call extended by ${extensionMinutes} minutes.`,
    });
  } catch (err) {
    logger.error("Call extension failed", err);
    const { response, status } = formatErrorResponse(err);
    return NextResponse.json(response, { status });
  }
}
