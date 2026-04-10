import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// POST — invite HR user to org
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const body = await req.json();
    const { email, role, name } = body;

    if (!email || !role || !["HR", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "email and role (HR|ADMIN) required" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      create: {
        email: email.toLowerCase(),
        name,
        role,
        organizationId: session.user.organizationId,
      },
      update: {
        role,
        organizationId: session.user.organizationId,
        name: name ?? undefined,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
