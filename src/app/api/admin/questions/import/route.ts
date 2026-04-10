import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "admin/questions/import" });

// POST — bulk import questions from JSON
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const questions: Array<{
      jobProfileId: string;
      language?: string;
      questionType: string;
      dimension: string;
      domainTag: string;
      difficultyWeight?: number;
      content: Record<string, unknown>;
      variantGroupId?: string;
    }> = body.questions;

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "No questions provided" }, { status: 400 });
    }

    const created = await prisma.question.createMany({
      data: questions.map((q) => ({
        jobProfileId: q.jobProfileId,
        language: q.language ?? "en",
        questionType: q.questionType as any,
        dimension: q.dimension as any,
        domainTag: q.domainTag,
        difficultyWeight: q.difficultyWeight ?? 1.0,
        content: JSON.parse(JSON.stringify(q.content)),
        variantGroupId: q.variantGroupId,
      })),
    });

    log.info({ count: created.count }, "Bulk imported questions");

    return NextResponse.json({ imported: created.count }, { status: 201 });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to import questions");
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
