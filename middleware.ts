import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: [
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/metrics",
    "/api/health",
    "/_next(.*)",  // Allow Next.js static files
    "/favicon.ico"
  ],
  // Routes that can always be accessed, and have
  // no authentication information
  ignoredRoutes: [
    "/(.*).png",
    "/(.*).ico",
    "/(.*).svg",
    "/(.*).jpg",
    "/(.*).css",
    "/(.*).js",
    "/api/metrics",
    "/_next/static/(.*)"  // Explicitly allow Next.js static files
  ],
  debug: process.env.NODE_ENV === 'development'
});

// Matcher ensures middleware runs on the correct routes
export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}; 