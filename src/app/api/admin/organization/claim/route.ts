import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// POST — reassign orphaned data (organizationId = null) to the current admin's org.
// Safe to call multiple times; only affects records that are truly unowned.
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Re-read from DB in case JWT is still stale
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    const orgId = dbUser?.organizationId ?? session.user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    // Claim all unowned campaigns
    const campaigns = await prisma.campaign.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId },
    });

    // Claim all unowned job profiles
    const jobProfiles = await prisma.jobProfile.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId },
    }).catch(() => ({ count: 0 })); // ignore if column doesn't exist

    return NextResponse.json({
      claimed: { campaigns: campaigns.count, jobProfiles: jobProfiles.count },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
