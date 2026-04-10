import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import nodemailer from "nodemailer";
import { prisma } from "./db";
import { logger } from "./logger";
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM ?? "noreply@assessment.example.com",
      // Custom verification: send a 6-digit PIN instead of a magic link URL.
      // This prevents corporate email security (Microsoft Safe Links) from
      // pre-visiting and consuming the token before the user can click it.
      async sendVerificationRequest({ identifier: email, url, provider }) {
        // Extract the raw token from the NextAuth callback URL
        const rawToken = new URL(url).searchParams.get("token") ?? "";

        // Generate a 6-digit PIN
        const pin = String(Math.floor(100000 + Math.random() * 900000));

        // Store PIN → rawToken mapping in DB so we can look it up when user enters the PIN
        await prisma.verificationToken.create({
          data: {
            identifier: `pin:${pin}:${email}`,
            token: rawToken,
            expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          },
        });

        const enterCodeUrl = `${process.env.NEXTAUTH_URL}/auth/enter-code`;

        const transporter = nodemailer.createTransport(provider.server as nodemailer.TransportOptions);
        await transporter.sendMail({
          from: provider.from,
          to: email,
          subject: "Your sign-in code – Skill Assessment Platform",
          text: `Your sign-in code for the Skill Assessment Platform is:\n\n${pin}\n\nGo to ${enterCodeUrl} and enter your email address and this code.\n\nThis code expires in 15 minutes and can only be used once.\nIf you did not request this, you can safely ignore this email.`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:auto">
              <h2 style="margin-bottom:8px">Sign in to Skill Assessment Platform</h2>
              <p style="color:#374151">Enter the code below on the sign-in page to complete your authentication.</p>
              <div style="margin:24px 0;padding:20px;background:#f3f4f6;border-radius:12px;text-align:center">
                <p style="margin:0 0 4px;font-size:13px;color:#6b7280;letter-spacing:0.05em">YOUR SIGN-IN CODE</p>
                <p style="margin:0;font-size:40px;font-weight:700;letter-spacing:0.15em;color:#111827">${pin}</p>
              </div>
              <p style="color:#374151;font-size:14px">
                Go to the sign-in page and enter your email address and this code:
              </p>
              <p style="margin:0 0 24px">
                <a href="${enterCodeUrl}" style="color:#2563eb">${enterCodeUrl}</a>
              </p>
              <p style="color:#9ca3af;font-size:12px">This code expires in 15 minutes and can only be used once.<br>If you did not request this, you can safely ignore this email.</p>
            </div>
          `,
        });
      },
    }),
    // Optional: Google OAuth for HR/Admin SSO
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.preferredLanguage = user.preferredLanguage;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.organizationId = token.organizationId;
      session.user.preferredLanguage = token.preferredLanguage;
      return session;
    },
    async signIn({ user }) {
      logger.info({ userId: user.id, email: user.email }, "User signed in");
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      logger.info({ userId: user.id, email: user.email }, "New user created");
    },
  },
};
