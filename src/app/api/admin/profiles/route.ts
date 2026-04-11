import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// GET — list all profiles grouped by track, with question counts
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const profiles = await prisma.jobProfile.findMany({
      orderBy: [{ track: "asc" }, { band: "asc" }],
      include: {
        _count: { select: { campaigns: true, questions: true } },
      },
    });

    return NextResponse.json(profiles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function makeSlug(track: string, band: number, displayNameEn: string): string {
  const trackPart = track.toLowerCase().replace(/_/g, "-");
  const namePart = displayNameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${trackPart}-b${band}-${namePart}`;
}

// POST — create a new profile
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { track, band, sector, displayNameEn, displayNameFr, bandLabel, typicalTitles, typicalYears } = body;

    if (!track || !band || !sector || !displayNameEn || !bandLabel) {
      return NextResponse.json(
        { error: "track, band, sector, displayNameEn and bandLabel are required" },
        { status: 400 },
      );
    }

    const slug = makeSlug(track, Number(band), displayNameEn);

    const profile = await prisma.jobProfile.create({
      data: {
        slug,
        track,
        band: Number(band),
        sector,
        displayName: { en: displayNameEn, fr: displayNameFr ?? displayNameEn },
        bandLabel,
        typicalTitles: typicalTitles ?? [],
        typicalYears: typicalYears ?? "",
        isActive: true,
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A profile with this name already exists for this track/band. Use a different display name." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
