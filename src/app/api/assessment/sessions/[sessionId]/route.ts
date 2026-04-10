import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { startSession } from "@/services/session-manager";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "assessment/sessions/[sessionId]" });

// GET — fetch session state
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const assessmentSession = await prisma.assessmentSession.findUnique({
      where: { id: params.sessionId },
      include: {
        campaign: {
          select: { name: true, settings: true },
        },
        jobProfile: {
          select: { jobFamily: true, seniorityLevel: true, displayName: true },
        },
      },
    });

    if (!assessmentSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (assessmentSession.candidateId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const answeredCount = await prisma.answer.count({
      where: { sessionId: params.sessionId, submittedAt: { not: null } },
    });

    const totalQuestions = (assessmentSession.questionSequence as string[])?.length ?? 0;

    return NextResponse.json({
      id: assessmentSession.id,
      status: assessmentSession.status,
      campaignName: assessmentSession.campaign.name,
      jobProfile: assessmentSession.jobProfile,
      campaignSettings: assessmentSession.campaign.settings,
      answeredCount,
      totalQuestions,
      startedAt: assessmentSession.startedAt,
    });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to get session");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — start the session
export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();

    if (body.action === "start") {
      const updated = await startSession(params.sessionId, session.user.id);
      return NextResponse.json({ status: updated.status, startedAt: updated.startedAt });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to update session");
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
