import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes: marketing pages, auth pages, job browsing (read-only),
// webhooks and cron (protected by signatures/secrets instead of sessions).
const isPublicRoute = createRouteMatcher([
  "/",
  "/how-it-works",
  "/privacy",
  "/terms",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/jobs",
  "/jobs/(.*)",
  "/api/webhooks/(.*)",
  "/api/cron/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
