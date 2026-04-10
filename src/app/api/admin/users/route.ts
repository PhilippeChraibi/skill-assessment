import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import nodemailer from "nodemailer";

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

    // Send invite email
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      });
      const signInUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/auth/signin`;
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email.toLowerCase(),
        subject: "You've been invited to the Skill Assessment Platform",
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:auto">
            <h2>You've been invited</h2>
            <p>You have been added as <strong>${role}</strong> on the Skill Assessment Platform.</p>
            <p>Click below to sign in and get started:</p>
            <a href="${signInUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;font-weight:600">
              Sign In
            </a>
            <p style="color:#6b7280;font-size:12px;margin-top:24px">Enter your email address (${email.toLowerCase()}) to receive your magic sign-in link.</p>
          </div>
        `,
      });
    } catch {
      // Don't fail the invite if email fails
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
