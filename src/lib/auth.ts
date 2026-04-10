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
      // Custom sender to disable Resend click tracking (which breaks magic link tokens)
      async sendVerificationRequest({ identifier: email, url, provider }) {
        const transporter = nodemailer.createTransport(provider.server as nodemailer.TransportOptions);
        await transporter.sendMail({
          from: provider.from,
          to: email,
          subject: "Sign in to Skill Assessment Platform",
          headers: {
            // Disable Resend click tracking so the magic link token is not wrapped/corrupted
            "X-Resend-Track-Clicks": "false",
            "X-Resend-Track-Opens": "false",
          },
          text: `Sign in to the Skill Assessment Platform\n\nCopy and paste this URL into your browser to sign in:\n${url}\n\nThis link expires in 24 hours and can only be used once.\nIf you did not request this, you can safely ignore this email.`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:auto">
              <h2>Sign in to Skill Assessment Platform</h2>
              <p>Click the button below to complete your sign in. This link expires in 24 hours.</p>
              <a href="${process.env.NEXTAUTH_URL}/auth/verify?data=${encodeURIComponent(Buffer.from(url).toString('base64'))}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
                Complete Sign In
              </a>
              <p style="color:#6b7280;font-size:13px">Or copy and paste this URL directly into your browser:</p>
              <p style="color:#6b7280;font-size:12px;word-break:break-all">${url}</p>
              <p style="color:#6b7280;font-size:12px;margin-top:24px">If you did not request this email, you can safely ignore it.</p>
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
