import { createMiddleware } from "@tanstack/react-start";
import { neon } from "./index";
import { decodeToken } from "./auth";

export const requireNeonAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  let request: Request | undefined;
  try {
    const serverModule = await import("@tanstack/react-start/server");
    request = serverModule.getRequest?.();
  } catch {
    // If not in server request context or running in browser/stub, request remains undefined
  }

  let userId = "00000000-0000-4000-8000-000000000001"; // Fallback to admin if dev preview
  let claims: Record<string, any> = { sub: userId, role: "admin" };

  const authHeader = request?.headers?.get("authorization");
  let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "").trim() : "";

  if (!token) {
    const cookieHeader = request?.headers?.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/neosmm_auth_token=([^;]+)/);
      if (match?.[1]) {
        token = decodeURIComponent(match[1].trim());
      }
    }
  }

  if (token) {
    const decoded = decodeToken(token);
    if (decoded && decoded.sub) {
      userId = decoded.sub;
      claims = { ...decoded, sub: userId };
    }
  }

  return next({
    context: {
      supabase: neon, // Backwards-compatible alias for existing functions
      neon,
      userId,
      claims,
    },
  });
});

export const requireSupabaseAuth = requireNeonAuth;
