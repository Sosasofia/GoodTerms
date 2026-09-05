import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/groups(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/groups",
  "/api/groups/join",
  "/api/groups/(.*)",
  "/api/groups/join(.*)",
  "/api/settlements(.*)",
  "/api/demo/clone(.*)",
  "/api/cron/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
