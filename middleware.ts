import { authMiddleware } from '@clerk/nextjs/edge';

export default authMiddleware({
  publicRoutes: ["/", "/api/webhook/clerk"]
});

// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}; 