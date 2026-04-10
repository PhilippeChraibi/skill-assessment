import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// PATCH — update display name or isActive
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
    const { displayNameEn, displayNameFr, isActive } = body;

    const existing = await prisma.jobProfile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const currentName = existing.displayName as Record<string, string>;

    const profile = await prisma.jobProfile.update({
      where: { id },
      data: {
        isActive: isActive ?? existing.isActive,
        displayName: {
          en: displayNameEn ?? currentName.en,
          fr: displayNameFr ?? currentName.fr,
        },
      },
    });

    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — remove a profile (only if no campaigns or questions reference it)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const campaignCount = await prisma.campaign.count({ where: { jobProfileId: id } });
    const questionCount = await prisma.question.count({ where: { jobProfileId: id } });

    if (campaignCount > 0 || questionCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: this profile is used by ${campaignCount} campaign(s) and ${questionCount} question(s). Deactivate it instead.` },
        { status: 409 },
      );
    }

    await prisma.jobProfile.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
