import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { neonAuth } from "@/integrations/neon/auth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: z.object({
    mode: z.enum(["login", "register"]).optional(),
    redirect: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — NeoSMM" },
      {
        name: "description",
        content: "Sign in to NeoSMM or create an account to order managed social media services.",
      },
      { property: "og:title", content: "Sign in — NeoSMM" },
      { property: "og:description", content: "Access your NeoSMM dashboard." },
    ],
  }),
  component: AuthPage,
});

function safePath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function GoogleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.27v3.13C3.25 21.32 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.61H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.39l4.01-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.68 1.27 6.61l4.01 3.13c.95-2.84 3.6-4.99 6.72-4.99z"
      />
    </svg>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(search.mode ?? "login");
  const [form, setForm] = useState({ email: "", password: "", fullName: "" });
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const target = safePath(search.redirect);
  const popupRef = useRef<Window | null>(null);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    if (!loading && user && !isNavigatingRef.current) {
      isNavigatingRef.current = true;
      const dest = user.role === "admin" && target === "/dashboard" ? "/admin" : target;
      window.location.replace(dest);
    }
  }, [loading, user, target]);

  // Listen for OAuth message from Google popup, storage events, and broadcast channel
  useEffect(() => {
    let active = true;

    const handleSuccess = (session: any, signedUser: any) => {
      if (!active || isNavigatingRef.current) return;
      isNavigatingRef.current = true;

      // Close the popup window if still open
      try {
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
      } catch {}

      try {
        localStorage.removeItem("neosmm_oauth_complete");
      } catch {}

      neonAuth.setSession(session);
      toast.success(`Signed in as ${signedUser?.email || "User"}`);
      const isAdmin = signedUser?.role === "admin" || session?.user?.role === "admin";
      const dest = isAdmin ? "/admin" : target;
      window.location.replace(dest);
    };

    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "OAUTH_AUTH_SUCCESS" && event.data?.session) {
        const signedUser = event.data.user || event.data.session.user;
        handleSuccess(event.data.session, signedUser);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        (event.key === "neosmm_neon_auth_session" || event.key === "neosmm_oauth_complete") &&
        event.newValue
      ) {
        try {
          const payload = JSON.parse(event.newValue);
          const session = payload.session || payload;
          const u = payload.user || session?.user;
          if (u) {
            handleSuccess(session, u);
          }
        } catch {}
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    window.addEventListener("storage", handleStorage);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel("neosmm_auth_sync");
        channel.onmessage = (event) => {
          if (event.data?.type === "AUTH_STATE_CHANGE" && event.data?.session?.user) {
            handleSuccess(event.data.session, event.data.session.user);
          }
        };
      } catch {}
    }

    return () => {
      active = false;
      window.removeEventListener("message", handleOAuthMessage);
      window.removeEventListener("storage", handleStorage);
      try {
        channel?.close();
      } catch {}
    };
  }, [navigate, target]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}${target}`,
            data: { full_name: form.fullName },
          },
        });
        if (error) throw error;
        toast.success("Welcome to NeoSMM. Your account is ready!");
        navigate({ to: target, replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        toast.success("Signed in.");
        navigate({ to: target, replace: true });
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function handleGoogleLogin() {
    const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
    if (clientId && clientId.length > 5) {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "select_account",
      });
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      const authWindow = window.open(
        authUrl,
        "google_oauth_popup",
        "width=560,height=680,menubar=no,toolbar=no",
      );
      popupRef.current = authWindow;

      if (!authWindow) {
        toast.error("Please allow popups to continue with Google Sign-in.");
      } else {
        toast.info("Connecting to Google...");

        try {
          localStorage.removeItem("neosmm_oauth_complete");
        } catch {}

        // Fast polling checking both keys: neosmm_oauth_complete and neosmm_neon_auth_session
        const pollTimer = setInterval(() => {
          try {
            const rawComplete = localStorage.getItem("neosmm_oauth_complete");
            if (rawComplete) {
              const parsed = JSON.parse(rawComplete);
              if (parsed?.session?.user) {
                clearInterval(pollTimer);
                try {
                  localStorage.removeItem("neosmm_oauth_complete");
                } catch {}
                try {
                  authWindow.close();
                } catch {}
                if (popupRef.current && !popupRef.current.closed) {
                  try {
                    popupRef.current.close();
                  } catch {}
                }
                neonAuth.setSession(parsed.session);
                toast.success(`Signed in as ${parsed.session.user.email}`);
                const isAdmin = parsed.session.user.role === "admin";
                window.location.replace(isAdmin ? "/admin" : target);
                return;
              }
            }

            const raw = localStorage.getItem("neosmm_neon_auth_session");
            if (raw) {
              const session = JSON.parse(raw);
              if (session?.user) {
                clearInterval(pollTimer);
                try {
                  authWindow.close();
                } catch {}
                if (popupRef.current && !popupRef.current.closed) {
                  try {
                    popupRef.current.close();
                  } catch {}
                }
                neonAuth.setSession(session);
                toast.success(`Signed in as ${session.user.email}`);
                const isAdmin = session.user.role === "admin";
                window.location.replace(isAdmin ? "/admin" : target);
                return;
              }
            }

            if (authWindow && authWindow.closed) {
              clearInterval(pollTimer);
            }
          } catch {}
        }, 300);

        setTimeout(() => clearInterval(pollTimer), 120000);
      }
    } else {
      toast.error(
        "Google Sign-In is temporarily unavailable. Please sign in with email and password.",
      );
    }
  }

  const field =
    "w-full rounded-xl border border-input bg-card py-2.5 pr-4 pl-10 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40";

  return (
    <div className="aurora flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <Logo />
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="panel w-full max-w-md p-8">
          {checkEmail ? (
            <div className="space-y-4 text-center">
              <span className="brand-gradient mx-auto flex size-12 items-center justify-center rounded-2xl text-primary-foreground">
                <Mail className="size-6" />
              </span>
              <h1 className="font-display text-2xl font-bold">Confirm your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to <strong>{form.email}</strong>. Click it to activate
                your NeoSMM account, then sign in.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCheckEmail(false);
                  setMode("login");
                }}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "login"
                  ? "Sign in to manage your orders, wallet and reports."
                  : "Start ordering managed social media work in minutes."}
              </p>

              {/* Primary Google Login Button */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted hover:border-border/80 shadow-sm"
                >
                  <GoogleIcon className="size-5" />
                  <span>Continue with Google</span>
                </button>
              </div>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or with email{" "}
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                {(["login", "register"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      mode === m
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "login" ? "Sign in" : "Register"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Full name
                    </label>
                    <div className="relative">
                      <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        placeholder="Alex Rivers"
                        className={field}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@domain.com"
                      className={field}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      className={field}
                    />
                  </div>
                </div>

                {mode === "login" && (
                  <div className="text-right">
                    <Link
                      to="/forgot-password"
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="brand-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {mode === "login" ? "Sign in" : "Create account"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                By continuing you agree to our{" "}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
