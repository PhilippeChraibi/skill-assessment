import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// GET — org info
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      include: {
        users: {
          where: { deletedAt: null },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(org);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — create organization and link to current admin user
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (session.user.organizationId) {
      return NextResponse.json({ error: "Already has an organization" }, { status: 400 });
    }

    const body = await req.json();
    const { name } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    const org = await prisma.organization.create({
      data: { name: name.trim() },
    });

    // Link the current admin user to the new organization
    await prisma.user.update({
      where: { id: session.user.id },
      data: { organizationId: org.id },
    });

    return NextResponse.json(org, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — update org branding
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const body = await req.json();

    const org = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        name: body.name,
        logoUrl: body.logoUrl,
        branding: body.branding,
        retentionDays: body.retentionDays,
      },
    });

    return NextResponse.json(org);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
