import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "admin/questions" });

// GET — list questions with filters
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(req.url);
    const jobProfileId = url.searchParams.get("jobProfileId");
    const language = url.searchParams.get("language");
    const dimension = url.searchParams.get("dimension");
    const questionType = url.searchParams.get("questionType");
    const domainTag = url.searchParams.get("domainTag");
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "50");

    const where: Record<string, unknown> = {};
    if (jobProfileId) where.jobProfileId = jobProfileId;
    if (language) where.language = language;
    if (dimension) where.dimension = dimension;
    if (questionType) where.questionType = questionType;
    if (domainTag) where.domainTag = domainTag;

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          jobProfile: { select: { jobFamily: true, seniorityLevel: true } },
        },
        orderBy: [{ domainTag: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.question.count({ where }),
    ]);

    // Compute quality indicators: variant count per variantGroupId
    const variantGroups = questions
      .filter((q) => q.variantGroupId)
      .map((q) => q.variantGroupId!);
    const uniqueGroups = [...new Set(variantGroups)];
    const variantCounts: Record<string, number> = {};

    if (uniqueGroups.length > 0) {
      const counts = await prisma.question.groupBy({
        by: ["variantGroupId"],
        where: { variantGroupId: { in: uniqueGroups } },
        _count: true,
      });
      for (const c of counts) {
        if (c.variantGroupId) variantCounts[c.variantGroupId] = c._count;
      }
    }

    const enriched = questions.map((q) => ({
      ...q,
      variantCount: q.variantGroupId ? (variantCounts[q.variantGroupId] ?? 1) : 1,
      needsMoreVariants: q.variantGroupId
        ? (variantCounts[q.variantGroupId] ?? 1) < 3
        : true,
    }));

    return NextResponse.json({ questions: enriched, total, page, limit });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to list questions");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — create question
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const {
      jobProfileId, language, questionType, dimension,
      domainTag, difficultyWeight, content, variantGroupId,
    } = body;

    if (!jobProfileId || !questionType || !dimension || !domainTag || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const question = await prisma.question.create({
      data: {
        jobProfileId,
        language: language ?? "en",
        questionType,
        dimension,
        domainTag,
        difficultyWeight: difficultyWeight ?? 1.0,
        content,
        variantGroupId: variantGroupId ?? undefined,
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to create question");
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
