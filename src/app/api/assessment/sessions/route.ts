import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { createSession } from "@/services/session-manager";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "POST /api/assessment/sessions" });

// POST /api/assessment/sessions — create a new assessment session from invite token
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { inviteToken } = body;

    if (!inviteToken) {
      return NextResponse.json({ error: "Invite token required" }, { status: 400 });
    }

    // Find campaign by invite token
    const campaign = await prisma.campaign.findUnique({
      where: { inviteToken },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
    }

    const assessmentSession = await createSession(session.user.id, campaign.id);

    return NextResponse.json({ sessionId: assessmentSession.id, status: assessmentSession.status });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to create session");
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
