import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "./auth";
import { UserRole } from "@/generated/prisma";
import { logger } from "./logger";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new AuthError("Authentication required", 401);
  }
  return session;
}

export async function requireRole(...roles: UserRole[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    throw new AuthError("Insufficient permissions", 403);
  }
  return session;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// Higher-order function wrapping API route handlers with auth + error handling
type ApiHandler = (
  req: NextRequest,
  context: { params: Record<string, string> },
) => Promise<NextResponse>;

export function withAuth(handler: ApiHandler, ...roles: UserRole[]): ApiHandler {
  return async (req, context) => {
    try {
      const session = await getSession();
      if (!session?.user) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      if (roles.length > 0 && !roles.includes(session.user.role)) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
      return await handler(req, context);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
      }
      logger.error({ error }, "Unhandled API error");
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

// Rate limiting utility (simple in-memory, replace with Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60_000,
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}
