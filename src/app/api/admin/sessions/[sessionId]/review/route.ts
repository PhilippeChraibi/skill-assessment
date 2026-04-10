import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "admin/sessions/review" });

// POST — submit integrity review decision
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { outcome, note } = body;

    if (!outcome || !["CLEARED", "INVALIDATED"].includes(outcome)) {
      return NextResponse.json({ error: "outcome must be CLEARED or INVALIDATED" }, { status: 400 });
    }

    const review = await prisma.integrityReview.create({
      data: {
        sessionId: sessionId,
        reviewerId: session.user.id,
        outcome,
        note: note ?? null,
      },
    });

    // Update session status based on review
    if (outcome === "INVALIDATED") {
      await prisma.assessmentSession.update({
        where: { id: sessionId },
        data: { status: "FLAGGED" },
      });
    }

    log.info(
      { sessionId: sessionId, outcome, reviewerId: session.user.id },
      "Integrity review submitted",
    );

    return NextResponse.json(review, { status: 201 });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to submit review");
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
