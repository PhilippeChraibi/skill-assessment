import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// GET — list sessions with filters
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(req.url);
    const campaignId = url.searchParams.get("campaignId");
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "50");

    const where: Record<string, unknown> = { deletedAt: null };
    if (campaignId) where.campaignId = campaignId;
    if (status) where.status = status;

    // Restrict to org if not super admin
    if (session.user.organizationId) {
      where.campaign = { organizationId: session.user.organizationId };
    }

    const [sessions, total] = await Promise.all([
      prisma.assessmentSession.findMany({
        where,
        include: {
          candidate: { select: { name: true, email: true } },
          jobProfile: { select: { jobFamily: true, seniorityLevel: true, displayName: true } },
          campaign: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.assessmentSession.count({ where }),
    ]);

    return NextResponse.json({ sessions, total, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
