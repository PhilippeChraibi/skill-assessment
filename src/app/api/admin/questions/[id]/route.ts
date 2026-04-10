import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "admin/questions/[id]" });

// GET — single question
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const question = await prisma.question.findUnique({
      where: { id },
      include: { jobProfile: true },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Get variants
    let variants: unknown[] = [];
    if (question.variantGroupId) {
      variants = await prisma.question.findMany({
        where: {
          variantGroupId: question.variantGroupId,
          id: { not: question.id },
        },
        select: { id: true, language: true, content: true },
      });
    }

    return NextResponse.json({ ...question, variants });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to get question");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — update question
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();

    const question = await prisma.question.update({
      where: { id },
      data: {
        content: body.content,
        domainTag: body.domainTag,
        difficultyWeight: body.difficultyWeight,
        dimension: body.dimension,
        questionType: body.questionType,
        isActive: body.isActive,
        variantGroupId: body.variantGroupId,
        language: body.language,
      },
    });

    return NextResponse.json(question);
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to update question");
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE — soft-delete (deactivate)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.question.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to delete question");
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
