import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pin = searchParams.get("pin")?.trim();
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!pin || !email || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "Invalid code format." }, { status: 400 });
  }

  // Look up PIN mapping stored by sendVerificationRequest
  const entry = await prisma.verificationToken.findFirst({
    where: {
      identifier: `pin:${pin}:${email}`,
      expires: { gt: new Date() },
    },
  });

  if (!entry) {
    return NextResponse.json({ error: "Code not found or expired. Please request a new sign-in email." }, { status: 404 });
  }

  // Delete the PIN mapping — it can only be used once
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: entry.identifier, token: entry.token } },
  });

  // Build the NextAuth callback URL using the raw token
  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/email?token=${encodeURIComponent(entry.token)}&email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent("/auth/redirect")}`;

  return NextResponse.json({ callbackUrl });
}
