import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { NeonSession as Session, NeonUser as User } from "@/integrations/neon/auth";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("neosmm_neon_auth_session");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.user) {
            return { session: parsed, user: parsed.user, loading: false };
          }
        }
      } catch {}
    }
    return { session: null, user: null, loading: true };
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, user: session?.user ?? null, loading: false });
    });

    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, user: data.session?.user ?? null, loading: false });
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return { session: null, user: null, loading: true };
  }
  return context;
}
