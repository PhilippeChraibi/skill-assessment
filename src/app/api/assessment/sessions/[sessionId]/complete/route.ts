import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { completeSession } from "@/services/session-manager";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "complete-session" });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const completed = await completeSession(sessionId, session.user.id);

    return NextResponse.json({
      status: completed.status,
      overallScore: completed.overallScore,
      completedAt: completed.completedAt,
    });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to complete session");
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
