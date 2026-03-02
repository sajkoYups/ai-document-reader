import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Protect the main app route
    "/app(.*)",
    // Protect API routes
    "/api/(.*)",
  ],
};
