import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { getCurrentQuestion } from "@/services/session-manager";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "current-question" });

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

    const result = await getCurrentQuestion(sessionId, session.user.id);

    if (result.done) {
      return NextResponse.json({
        done: true,
        questionIndex: result.questionIndex,
        totalQuestions: result.totalQuestions,
      });
    }

    // Strip correctAnswer and rubric from the question sent to client
    const question = result.question!;
    const content = question.content as Record<string, unknown>;
    const clientContent: Record<string, unknown> = {
      stem: content.stem,
      options: content.options,
      context: content.context,
      guidanceWordCount: content.guidanceWordCount,
    };

    return NextResponse.json({
      done: false,
      question: {
        id: question.id,
        questionType: question.questionType,
        dimension: question.dimension,
        domainTag: question.domainTag,
        content: clientContent,
      },
      questionIndex: result.questionIndex,
      totalQuestions: result.totalQuestions,
      nextQuestionId: result.nextQuestionId,
    });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to get current question");
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
