import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "admin/campaigns/[id]" });

// GET — single campaign with stats
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        jobProfile: true,
        createdBy: { select: { name: true, email: true } },
        sessions: {
          where: { deletedAt: null },
          include: {
            candidate: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to get campaign");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — update campaign
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();

    const campaign = await prisma.campaign.update({
      where: { id: params.id },
      data: {
        name: body.name,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        maxAttempts: body.maxAttempts,
        settings: body.settings,
        isArchived: body.isArchived,
      },
    });

    return NextResponse.json(campaign);
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to update campaign");
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
