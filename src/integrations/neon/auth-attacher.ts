import { createMiddleware } from "@tanstack/react-start";
import { neonAuth } from "./auth";

export const attachNeonAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await neonAuth.getSession();
  const token = data.session?.access_token;
  return next({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
});

export const attachSupabaseAuth = attachNeonAuth;
