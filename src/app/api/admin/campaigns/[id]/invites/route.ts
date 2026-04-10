import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import nodemailer from "nodemailer";

const log = logger.child({ route: "admin/campaigns/[id]/invites" });

// POST — create candidate accounts and send invite emails
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { inviteToken: true, name: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await req.json();
    const emails: string[] = body.emails ?? [];

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invite/${campaign.inviteToken}`;
    const signInUrl = `${baseUrl}/auth/signin`;

    if (emails.length === 0) {
      return NextResponse.json({ inviteUrl, inviteToken: campaign.inviteToken });
    }

    // Set up email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    // Create accounts and send invite emails
    const results = await Promise.all(
      emails.map(async (email: string) => {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed) return null;

        // Upsert candidate user
        await prisma.user.upsert({
          where: { email: trimmed },
          create: { email: trimmed, role: "CANDIDATE" },
          update: {},
        });

        // Send invite email
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: trimmed,
            subject: `You've been invited to take an assessment – ${campaign.name}`,
            html: `
              <div style="font-family:sans-serif;max-width:500px;margin:auto">
                <h2>You've been invited to take an assessment</h2>
                <p>You have been invited to complete the <strong>${campaign.name}</strong> assessment.</p>
                <p>To get started:</p>
                <ol style="color:#374151;line-height:1.8">
                  <li>Go to: <a href="${signInUrl}">${signInUrl}</a></li>
                  <li>Enter your email address: <strong>${trimmed}</strong></li>
                  <li>You will receive a 6-digit code — enter it to sign in</li>
                  <li>Your assessment will be available in your dashboard</li>
                </ol>
                <p style="color:#6b7280;font-size:12px;margin-top:24px">
                  If you have any questions, please contact your administrator.
                </p>
              </div>
            `,
            text: `You've been invited to take the ${campaign.name} assessment.\n\nTo sign in:\n1. Go to ${signInUrl}\n2. Enter your email: ${trimmed}\n3. Enter the 6-digit code you receive by email\n4. Your assessment will be in your dashboard.`,
          });
        } catch (emailErr: any) {
          log.warn({ email: trimmed, error: emailErr.message }, "Failed to send invite email");
        }

        return { email: trimmed, inviteUrl };
      }),
    );

    return NextResponse.json({
      invites: results.filter(Boolean),
      inviteToken: campaign.inviteToken,
      campaignName: campaign.name,
      count: results.filter(Boolean).length,
    });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to generate invites");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
