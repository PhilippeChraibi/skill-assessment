import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// GET — fetch full candidate record with demographics and sessions
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const candidate = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        candidateProfile: true,
        sessions: {
          where: { deletedAt: null },
          include: {
            campaign: { select: { id: true, name: true } },
            jobProfile: {
              select: { id: true, displayName: true, track: true, band: true, bandLabel: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json(candidate);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — update candidate info (name, jobTitle, company)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, jobTitle, company } = body;

    const candidate = await prisma.user.update({
      where: { id },
      data: {
        name: name ?? undefined,
        jobTitle: jobTitle ?? undefined,
        company: company ?? undefined,
      },
    });

    return NextResponse.json(candidate);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — soft delete candidate
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
