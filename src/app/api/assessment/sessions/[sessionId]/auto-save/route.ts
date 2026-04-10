import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { savePartialAnswer } from "@/services/session-manager";

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { questionId, rawAnswer, selectedOptions, keystrokeCadenceData } = body;

    await savePartialAnswer(
      params.sessionId,
      session.user.id,
      questionId,
      rawAnswer,
      selectedOptions,
      keystrokeCadenceData,
    );

    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ saved: false }, { status: 500 });
  }
}
