import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "admin/questions/import" });

// POST — bulk import questions from JSON
// Each question may optionally include profileAssignments: [{profileId, difficultyWeight?}]
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const questions: Array<{
      language?: string;
      questionType: string;
      dimension: string;
      domainTag: string;
      difficultyWeight?: number;
      content: Record<string, unknown>;
      variantGroupId?: string;
      profileAssignments?: Array<{ profileId: string; difficultyWeight?: number; proficiencyTarget?: string }>;
    }> = body.questions;

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "No questions provided" }, { status: 400 });
    }

    let importedCount = 0;
    for (const q of questions) {
      await prisma.question.create({
        data: {
          language: q.language ?? "en",
          questionType: q.questionType as any,
          dimension: q.dimension as any,
          domainTag: q.domainTag,
          difficultyWeight: q.difficultyWeight ?? 1.5,
          content: JSON.parse(JSON.stringify(q.content)),
          variantGroupId: q.variantGroupId,
          profiles: q.profileAssignments?.length
            ? {
                create: q.profileAssignments.map((a) => ({
                  profileId: a.profileId,
                  difficultyWeight: a.difficultyWeight ?? q.difficultyWeight ?? 1.5,
                  proficiencyTarget: a.proficiencyTarget ?? "P",
                })),
              }
            : undefined,
        },
      });
      importedCount++;
    }

    log.info({ count: importedCount }, "Bulk imported questions");

    return NextResponse.json({ imported: importedCount }, { status: 201 });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to import questions");
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
