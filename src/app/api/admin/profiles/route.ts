import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// GET — list all job profiles (active + inactive)
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const profiles = await prisma.jobProfile.findMany({
      orderBy: [{ jobFamily: "asc" }, { seniorityLevel: "asc" }],
      include: { _count: { select: { campaigns: true, questions: true } } },
    });

    return NextResponse.json(profiles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — create a new job profile
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { jobFamily, seniorityLevel, displayNameEn, displayNameFr } = body;

    if (!jobFamily || !seniorityLevel || !displayNameEn) {
      return NextResponse.json({ error: "jobFamily, seniorityLevel and English display name are required" }, { status: 400 });
    }

    const profile = await prisma.jobProfile.create({
      data: {
        jobFamily,
        seniorityLevel,
        displayName: { en: displayNameEn, fr: displayNameFr ?? displayNameEn },
        isActive: true,
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A profile for this job family and seniority level already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
