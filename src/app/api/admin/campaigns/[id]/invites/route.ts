import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "admin/campaigns/[id]/invites" });

// POST — generate invite links (bulk from email CSV)
export async function POST(
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
      select: { inviteToken: true, name: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await req.json();
    const emails: string[] = body.emails ?? [];

    if (emails.length === 0) {
      // Just return the campaign invite link
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      return NextResponse.json({
        inviteUrl: `${baseUrl}/invite/${campaign.inviteToken}`,
        inviteToken: campaign.inviteToken,
      });
    }

    // Ensure candidate users exist for each email
    const results = await Promise.all(
      emails.map(async (email: string) => {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed) return null;

        // Upsert user as CANDIDATE
        await prisma.user.upsert({
          where: { email: trimmed },
          create: { email: trimmed, role: "CANDIDATE" },
          update: {},
        });

        const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
        return {
          email: trimmed,
          inviteUrl: `${baseUrl}/invite/${campaign.inviteToken}`,
        };
      }),
    );

    return NextResponse.json({
      invites: results.filter(Boolean),
      inviteToken: campaign.inviteToken,
      campaignName: campaign.name,
    });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to generate invites");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
