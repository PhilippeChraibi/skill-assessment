import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { generateCandidateReport } from "@/services/report-generator";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "GET /api/reports/[sessionId]" });

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check ownership: candidate can see their own, ADMIN/HR can see any in their org
    const assessmentSession = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      select: {
        candidateId: true,
        campaign: { select: { organizationId: true } },
      },
    });

    if (!assessmentSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const isOwner = assessmentSession.candidateId === session.user.id;
    const isOrgAdmin =
      (session.user.role === "ADMIN" || session.user.role === "HR") &&
      session.user.organizationId === assessmentSession.campaign.organizationId;

    if (!isOwner && !isOrgAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const report = await generateCandidateReport(sessionId);

    return NextResponse.json(report);
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to generate report");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
