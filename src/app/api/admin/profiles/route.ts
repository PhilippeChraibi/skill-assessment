import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// GET — list all job profiles
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const profiles = await prisma.jobProfile.findMany({
      where: { isActive: true },
      orderBy: [{ jobFamily: "asc" }, { seniorityLevel: "asc" }],
    });

    return NextResponse.json(profiles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
