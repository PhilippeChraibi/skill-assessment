import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import nodemailer from "nodemailer";

// GET — list all candidates in the org
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const candidates = await prisma.user.findMany({
      where: {
        role: "CANDIDATE",
        organizationId: session.user.organizationId ?? undefined,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        jobTitle: true,
        company: true,
        createdAt: true,
        emailVerified: true,
        candidateProfile: {
          select: {
            onboardingCompletedAt: true,
            yearsOfExperience: true,
            country: true,
            industrySector: true,
            certifications: true,
          },
        },
        sessions: {
          where: { deletedAt: null },
          select: { id: true, status: true, overallScore: true, completedAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(candidates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — invite a candidate
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await req.json();
    const { email, name, jobTitle, company } = body;

    if (!email || !jobTitle || !company) {
      return NextResponse.json({ error: "email, jobTitle and company are required" }, { status: 400 });
    }

    const candidate = await prisma.user.upsert({
      where: { email: email.trim().toLowerCase() },
      create: {
        email: email.trim().toLowerCase(),
        name: name?.trim() || null,
        role: "CANDIDATE",
        organizationId: session.user.organizationId,
        jobTitle: jobTitle.trim(),
        company: company.trim(),
      },
      update: {
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        name: name?.trim() || undefined,
        organizationId: session.user.organizationId,
      },
    });

    // Send invite email
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        auth: { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD },
      });
      const signInUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/auth/signin`;
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: candidate.email,
        subject: "You've been invited to take a skill assessment",
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:auto">
            <h2>You've been invited to take a skill assessment</h2>
            <p>Hello${name ? ` ${name.trim()}` : ""},</p>
            <p>You have been invited to complete a skill assessment on the Skill Assessment Platform.</p>
            <p>To get started:</p>
            <ol style="color:#374151;line-height:1.8">
              <li>Go to: <a href="${signInUrl}">${signInUrl}</a></li>
              <li>Enter your email address: <strong>${candidate.email}</strong></li>
              <li>You will receive a 6-digit code — enter it to sign in</li>
              <li>Your assessment will be available in your dashboard</li>
            </ol>
            <p style="color:#6b7280;font-size:12px;margin-top:24px">
              If you have any questions, please contact your administrator.
            </p>
          </div>
        `,
      });
    } catch {
      // Don't fail if email fails
    }

    return NextResponse.json(candidate, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
