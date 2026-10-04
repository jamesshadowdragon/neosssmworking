import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Loader2, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";
import { exchangeGoogleCode } from "@/lib/account.functions";
import { neonAuth } from "@/integrations/neon/auth";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: AuthCallbackPage,
});

// Cache exchanged codes in memory across Strict Mode remounts
const processedCodes = new Set<string>();

function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying Google authorization...");
  const [isAdmin, setIsAdmin] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    async function handleAuth() {
      if (startedRef.current) return;
      startedRef.current = true;

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          throw new Error(`Google authorization error: ${error}`);
        }

        if (!code) {
          throw new Error("No authorization code received from Google.");
        }

        // Check if user is already authenticated
        const { data: existingSession } = await neonAuth.getSession();
        if (existingSession?.session?.user) {
          const user = existingSession.session.user;
          const adminCheck = user.role === "admin";
          const destination = adminCheck ? "/admin" : "/dashboard";
          setStatus("success");
          setMessage(`Signed in successfully as ${user.email}`);
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(
                { type: "OAUTH_AUTH_SUCCESS", session: existingSession.session, user },
                "*",
              );
              window.close();
              setTimeout(() => {
                try {
                  window.close();
                } catch {}
              }, 200);
              return;
            }
          } catch {}
          setTimeout(() => {
            try {
              window.close();
            } catch {}
            if (!window.opener || window.opener.closed) {
              window.location.replace(destination);
            }
          }, 300);
          return;
        }

        processedCodes.add(code);
        setMessage("Exchanging authorization code with Google...");
        const redirectUri = `${window.location.origin}/auth/callback`;

        const { user, session } = await exchangeGoogleCode({
          data: { code, redirectUri },
        });

        neonAuth.setSession(session);
        const adminCheck = user.role === "admin";
        setIsAdmin(adminCheck);
        setStatus("success");
        setMessage(`Signed in successfully as ${user.email}`);

        // Set handoff signals across storage, broadcast, and postMessage
        try {
          localStorage.setItem(
            "neosmm_oauth_complete",
            JSON.stringify({ session, user, timestamp: Date.now() }),
          );
        } catch {}

        if (typeof BroadcastChannel !== "undefined") {
          try {
            const ch = new BroadcastChannel("neosmm_auth_sync");
            ch.postMessage({ type: "AUTH_STATE_CHANGE", session, user });
            setTimeout(() => {
              try {
                ch.close();
              } catch {}
            }, 1000);
          } catch {}
        }

        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(
              {
                type: "OAUTH_AUTH_SUCCESS",
                session,
                user,
              },
              "*",
            );
            window.close();
            setTimeout(() => {
              try {
                window.close();
              } catch {}
            }, 200);
            return;
          } catch {}
        }

        const destination = adminCheck ? "/admin" : "/dashboard";

        // If no opener (opened in primary tab), navigate to destination
        setTimeout(() => {
          try {
            window.close();
          } catch {}
          if (!window.opener || window.opener.closed) {
            window.location.replace(destination);
          }
        }, 400);
      } catch (err: any) {
        // If code was already redeemed and session is valid in storage/cookie, treat as success
        try {
          const { data: current } = await neonAuth.getSession();
          if (current?.session?.user) {
            const user = current.session.user;
            const dest = user.role === "admin" ? "/admin" : "/dashboard";
            if (window.opener && !window.opener.closed) {
              try {
                window.opener.postMessage(
                  { type: "OAUTH_AUTH_SUCCESS", session: current.session, user },
                  "*",
                );
                window.close();
                return;
              } catch {}
            }
            window.location.replace(dest);
            return;
          }
        } catch {}

        setStatus("error");
        setMessage(err.message || "Failed to complete Google authentication.");
      }
    }

    handleAuth();
  }, []);

  const destination = isAdmin ? "/admin" : "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="panel w-full max-w-md p-8 text-center shadow-xl">
        {status === "loading" && (
          <div className="space-y-4">
            <div className="brand-gradient mx-auto flex size-14 items-center justify-center rounded-2xl text-primary-foreground shadow-lg shadow-primary/20">
              <Loader2 className="size-7 animate-spin" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Authenticating with Google
            </h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground/80">Logging you in securely...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 className="size-7" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Authentication Complete
            </h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            {isAdmin && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <ShieldCheck className="size-3.5" />
                Administrator privileges active
              </div>
            )}
            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    window.close();
                  } catch {}
                  window.location.replace(destination);
                }}
                className="brand-gradient inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-95"
              >
                <span>Continue to {isAdmin ? "Admin Portal" : "Dashboard"}</span>
                <ArrowRight className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    window.close();
                  } catch {}
                }}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Close Window
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
              <AlertTriangle className="size-7" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">Authentication Error</h1>
            <p className="text-sm text-destructive">{message}</p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => window.location.replace("/auth")}
                className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Return to Sign in
              </button>
              {typeof window !== "undefined" && window.opener && (
                <button
                  type="button"
                  onClick={() => window.close()}
                  className="rounded-xl bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Close Window
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
