import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { checkRateLimit } from "@/lib/auth-utils";
import { submitAnswer } from "@/services/session-manager";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "submit-answer" });

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Rate limit: 30 submissions per minute per user
    if (!checkRateLimit(`answer:${session.user.id}`, 30, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const {
      questionId,
      rawAnswer,
      selectedOptions,
      timeSpentSeconds,
      keystrokeCadenceData,
      pastedCharCount,
      focusLossCount,
      focusLossDuration,
    } = body;

    if (!questionId) {
      return NextResponse.json({ error: "questionId required" }, { status: 400 });
    }

    const answer = await submitAnswer({
      sessionId: params.sessionId,
      candidateId: session.user.id,
      questionId,
      rawAnswer,
      selectedOptions,
      timeSpentSeconds: timeSpentSeconds ?? 0,
      keystrokeCadenceData,
      pastedCharCount,
      focusLossCount,
      focusLossDuration,
    });

    return NextResponse.json({
      answerId: answer.id,
      submittedAt: answer.submittedAt,
    });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to submit answer");
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
