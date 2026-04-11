import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "admin/campaigns" });

// GET — list campaigns for admin's org
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        organizationId: session.user.organizationId ?? undefined,
        isArchived: false,
      },
      include: {
        jobProfile: { select: { id: true, track: true, band: true, bandLabel: true, displayName: true } },
        createdBy: { select: { name: true, email: true } },
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Add completion stats
    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        const completedCount = await prisma.assessmentSession.count({
          where: { campaignId: c.id, status: "COMPLETED", deletedAt: null },
        });
        return { ...c, completedCount };
      }),
    );

    return NextResponse.json(enriched);
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to list campaigns");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — create campaign
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: "No organization assigned" }, { status: 400 });
    }

    const body = await req.json();
    const { name, jobProfileId, startsAt, endsAt, maxAttempts, settings } = body;

    if (!name || !jobProfileId || !startsAt || !endsAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        organizationId: session.user.organizationId,
        createdByAdminId: session.user.id,
        jobProfileId,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        maxAttempts: maxAttempts ?? 1,
        settings: settings ?? {},
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to create campaign");
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
