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
