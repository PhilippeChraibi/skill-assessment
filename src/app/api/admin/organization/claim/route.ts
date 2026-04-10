import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// POST — reassign all campaigns not already in the current admin's org.
// Handles the case where campaigns were created under a previous/different org.
// Safe to call multiple times (idempotent — second call reassigns 0 records).
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Re-read from DB in case JWT is still stale after org creation
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    const orgId = dbUser?.organizationId ?? session.user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    // Reassign all campaigns that belong to a different (old) organization.
    // This covers campaigns created when the admin had no org (filter was bypassed)
    // or when a previous org existed and a new one was just created.
    const campaigns = await prisma.campaign.updateMany({
      where: { NOT: { organizationId: orgId } },
      data: { organizationId: orgId },
    });

    return NextResponse.json({
      claimed: { campaigns: campaigns.count },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
