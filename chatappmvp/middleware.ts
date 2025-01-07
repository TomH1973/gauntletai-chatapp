import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";

// Configure Redis and rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
});

// Input validation schemas
const schemas = {
  createThread: z.object({
    title: z.string().min(1).max(100),
    participantIds: z.array(z.string()).min(1),
  }),
  createMessage: z.object({
    content: z.string().min(1).max(1000),
    threadId: z.string(),
  }),
};

export async function middleware(req: NextRequest) {
  // Skip rate limiting for public routes 
  if (req.nextUrl.pathname.startsWith("/api/")) {
    try {
      // Get client IP from various headers
      const forwardedFor = req.headers.get("x-forwarded-for");
      const realIp = req.headers.get("x-real-ip");
      const ip = forwardedFor?.split(",")[0] || realIp || "127.0.0.1";

      const { success, limit, reset, remaining } = await ratelimit.limit(ip);

      if (!success) {
        return new NextResponse("Too Many Requests", {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        });
      }

      // Validate request body for specific routes
      if (req.method === "POST") {
        const body = await req.json();

        if (req.nextUrl.pathname === "/api/threads") {
          const result = schemas.createThread.safeParse(body);
          if (!result.success) {
            return new NextResponse("Invalid Input", { status: 400 });
          }
        }

        if (req.nextUrl.pathname === "/api/messages") {
          const result = schemas.createMessage.safeParse(body);
          if (!result.success) {
            return new NextResponse("Invalid Input", { status: 400 });
          }
        }
      }
    } catch (error) {
      console.error("Middleware error:", error);
      return new NextResponse("Internal Server Error", { status: 500 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

