import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// GET — fetch current candidate's profile
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json(profile ?? null);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — save demographics (create or update)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const {
      yearsOfExperience,
      country,
      industrySector,
      ageRange,
      gender,
      educationLevel,
      certifications,
      teamSize,
      completed, // true = mark onboarding done, false/omitted = save draft
    } = body;

    const profile = await prisma.candidateProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        yearsOfExperience,
        country,
        industrySector,
        ageRange,
        gender,
        educationLevel,
        certifications: certifications ?? [],
        teamSize,
        onboardingCompletedAt: completed ? new Date() : null,
      },
      update: {
        yearsOfExperience,
        country,
        industrySector,
        ageRange,
        gender,
        educationLevel,
        certifications: certifications ?? [],
        teamSize,
        onboardingCompletedAt: completed ? new Date() : undefined,
      },
    });

    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
