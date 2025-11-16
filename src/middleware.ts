import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Paths that should always be accessible
const publicPaths = [
	"/api/auth/status",
	"/api/auth/setup",
	"/api/auth/login",
	"/api/auth/logout",
	"/api/auth/refresh",
	"/login",
];

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Allow public paths
	if (publicPaths.some((path) => pathname.startsWith(path))) {
		return NextResponse.next();
	}

	// Allow static files and Next.js internals
	if (
		pathname.startsWith("/_next") ||
		pathname.startsWith("/favicon.ico") ||
		pathname.includes(".")
	) {
		return NextResponse.next();
	}

	// Auth check happens in layout.tsx server component
	// Middleware just handles routing
	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public files (public directory)
		 */
		"/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
	],
	runtime: "nodejs",
};
