import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// GET — full session detail for admin review
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const assessmentSession = await prisma.assessmentSession.findUnique({
      where: { id: params.sessionId },
      include: {
        candidate: { select: { name: true, email: true, preferredLanguage: true } },
        jobProfile: true,
        campaign: { select: { name: true, organizationId: true } },
        answers: {
          include: { question: { select: { id: true, questionType: true, domainTag: true, dimension: true, content: true } } },
          orderBy: { createdAt: "asc" },
        },
        integrityReviews: {
          include: { reviewer: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!assessmentSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(assessmentSession);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
