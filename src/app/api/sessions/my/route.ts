import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// GET /api/sessions/my — return all assessment sessions for the authenticated candidate
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const sessions = await prisma.assessmentSession.findMany({
      where: {
        candidateId: session.user.id,
        deletedAt: null,
      },
      include: {
        jobProfile: {
          select: {
            displayName: true,
            track: true,
            band: true,
            bandLabel: true,
          },
        },
        campaign: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sessions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
