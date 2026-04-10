import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Admin routes: require ADMIN or HR role
    if (pathname.startsWith("/admin")) {
      if (token?.role !== "ADMIN" && token?.role !== "HR") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // Assessment routes: require CANDIDATE role (or ADMIN for preview)
    if (pathname.startsWith("/assessment")) {
      if (token?.role !== "CANDIDATE" && token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // CSRF protection header check for API routes
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
      const origin = req.headers.get("origin");
      const host = req.headers.get("host");
      if (origin && host && !origin.includes(host)) {
        return NextResponse.json({ error: "CSRF check failed" }, { status: 403 });
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Public routes that don't need auth
        if (
          pathname === "/" ||
          pathname.startsWith("/auth/") ||
          pathname.startsWith("/invite/") ||
          pathname.startsWith("/_next/") ||
          pathname.startsWith("/api/auth/")
        ) {
          return true;
        }
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    // Match all routes except static files and public assets
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
