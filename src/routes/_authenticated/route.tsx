import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

function AuthenticatedLayout() {
  return <Outlet />;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // During SSR, do not prematurely redirect to /auth; allow client hydration with localStorage session
    if (typeof window === "undefined") {
      return {};
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { mode: "login", redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});
