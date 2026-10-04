import { neonAdmin } from "@/integrations/neon";
import { isAdminEmail } from "@/lib/admin-config";
import { createToken, type NeonSession, type NeonUser } from "@/integrations/neon/auth";

export function renderCallbackHtml(params: {
  status: "success" | "error";
  message?: string;
  session?: NeonSession;
  user?: NeonUser;
}): string {
  const isSuccess = params.status === "success";
  const user = params.user;
  const session = params.session;
  const isAdmin = user?.role === "admin";
  const destination = isAdmin ? "/admin" : "/dashboard";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${isSuccess ? "Authentication Successful — NeoSMM" : "Authentication Error — NeoSMM"}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #090d16;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 1.5rem;
    }
    .panel {
      width: 100%;
      max-width: 440px;
      background: #0e1526;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 1.25rem;
      padding: 2.25rem 2rem;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .icon {
      width: 58px;
      height: 58px;
      margin: 0 auto 1.25rem;
      border-radius: 1.1rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-success {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .icon-error {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid rgba(16, 185, 129, 0.2);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
    }
    p {
      margin: 0 0 1.25rem;
      font-size: 0.875rem;
      color: #94a3b8;
      line-height: 1.5;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.65rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 0.75rem;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      border: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: #ffffff;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.1);
      margin-left: 0.5rem;
    }
    .btn:hover { opacity: 0.9; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      border-radius: 9999px;
      border: 1px solid rgba(99, 102, 241, 0.3);
      background: rgba(99, 102, 241, 0.1);
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #818cf8;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <div class="panel">
    ${
      isSuccess
        ? `
      <div class="icon icon-success">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h1>Authentication Complete</h1>
      <p>Signed in successfully as <strong>${escapeHtml(user?.email || "User")}</strong>.<br />Closing this window and logging you in...</p>
      ${
        isAdmin
          ? `<div class="badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Administrator privileges active
            </div>`
          : ""
      }
      <div style="margin-top: 1rem; display: flex; justify-content: center; gap: 0.5rem;">
        <button type="button" class="btn btn-primary" onclick="tryCloseOrGo()">
          Continue to ${isAdmin ? "Admin Portal" : "Dashboard"}
        </button>
        <button type="button" class="btn btn-secondary" onclick="window.close()">
          Close Window
        </button>
      </div>
    `
        : `
      <div class="icon icon-error">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h1>Authentication Error</h1>
      <p style="color: #f87171;">${escapeHtml(params.message || "Failed to complete Google authentication.")}</p>
      <div style="margin-top: 1.25rem;">
        <a href="/auth" class="btn btn-primary">Return to Sign In</a>
        <button type="button" class="btn btn-secondary" onclick="window.close()">Close Window</button>
      </div>
    `
    }
  </div>

  <script>
    (function() {
      var isSuccess = ${isSuccess};
      var session = ${JSON.stringify(session ?? null)};
      var user = ${JSON.stringify(user ?? null)};
      var destination = ${JSON.stringify(destination)};

      function tryCloseOrGo() {
        try { window.close(); } catch(e) {}
        if (!window.opener || window.opener.closed) {
          window.location.replace(destination);
        }
      }
      window.tryCloseOrGo = tryCloseOrGo;

      if (isSuccess && session && user) {
        // 1. Sync across localStorage
        try {
          localStorage.setItem("neosmm_neon_auth_session", JSON.stringify(session));
          localStorage.setItem("neosmm_oauth_complete", JSON.stringify({
            session: session,
            user: user,
            timestamp: Date.now()
          }));
        } catch (e) {}

        // 2. BroadcastChannel
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            var ch = new BroadcastChannel("neosmm_auth_sync");
            ch.postMessage({ type: "AUTH_STATE_CHANGE", session: session, user: user });
            setTimeout(function() { try { ch.close(); } catch(e) {} }, 1500);
          }
        } catch (e) {}

        // 3. postMessage to window.opener
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({
              type: "OAUTH_AUTH_SUCCESS",
              session: session,
              user: user
            }, "*");
          }
        } catch (e) {}

        // 4. If window has an opener (popup mode), close the window promptly
        if (window.opener && !window.opener.closed) {
          try {
            window.close();
          } catch (e) {}
          setTimeout(function() {
            try { window.close(); } catch(e) {}
          }, 200);
        } else {
          // Direct navigation in tab without opener: navigate smoothly to destination
          setTimeout(function() {
            window.location.replace(destination);
          }, 350);
        }
      }
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function handleGoogleCallback(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return new Response(
      renderCallbackHtml({
        status: "error",
        message: `Google authorization denied: ${errorDescription || error}`,
      }),
      {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }

  if (!code) {
    return new Response(
      renderCallbackHtml({
        status: "error",
        message: "No authorization code received from Google.",
      }),
      {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }

  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    return new Response(
      renderCallbackHtml({
        status: "error",
        message:
          "Google OAuth credentials missing on the server. Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured.",
      }),
      {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }

  // Derive redirect URI
  const proto =
    request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const standardRedirectUri = `${proto}://${host}/auth/callback`;

  const appUrl = (process.env.APP_URL || "").trim().replace(/\/$/, "");
  const envRedirectUri = appUrl ? `${appUrl}/auth/callback` : "";

  const candidateUris = Array.from(
    new Set([standardRedirectUri, envRedirectUri, `${url.origin}/auth/callback`]),
  ).filter(Boolean);

  let tokenData: { access_token?: string; [key: string]: unknown } | null = null;
  let lastError = "";

  for (const redirectUri of candidateUris) {
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      });

      if (tokenRes.ok) {
        tokenData = (await tokenRes.json()) as { access_token?: string; [key: string]: unknown };
        break;
      } else {
        const body = await tokenRes.text();
        lastError = body;
        console.warn(
          `[Google OAuth] Exchange attempt with redirect_uri=${redirectUri} failed:`,
          body,
        );
        if (!body.includes("redirect_uri_mismatch")) {
          break;
        }
      }
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  if (!tokenData || !tokenData.access_token) {
    return new Response(
      renderCallbackHtml({
        status: "error",
        message: `Failed to exchange authorization code with Google: ${lastError || "Unknown error"}`,
      }),
      {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }

  // Fetch Google User Profile
  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userInfoRes.ok) {
    return new Response(
      renderCallbackHtml({
        status: "error",
        message: "Failed to fetch Google user profile.",
      }),
      {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }

  const userInfo = (await userInfoRes.json()) as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  };

  const email = (userInfo.email || "").trim().toLowerCase();
  const fullName = userInfo.name || email.split("@")[0];
  const avatarUrl = userInfo.picture;
  const isAdmin = isAdminEmail(email);

  // Deterministic UUID for user
  let userId = "";
  if (isAdmin) {
    if (email === "neomart981@gmail.com") {
      userId = "00000000-0000-4000-8000-000000000010";
    } else if (email === "voidlureee@gmail.com") {
      userId = "00000000-0000-4000-8000-000000000011";
    } else {
      userId = "00000000-0000-4000-8000-000000000001";
    }
  } else {
    try {
      const cryptoMod = await import("node:crypto");
      const hash = cryptoMod.default
        .createHash("sha256")
        .update(`google_user_${userInfo.sub}`)
        .digest("hex");
      userId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    } catch {
      userId = "00000000-0000-4000-8000-" + userInfo.sub.padStart(12, "0").slice(-12);
    }
  }

  const role = isAdmin ? "admin" : "user";

  // Upsert profile in Neon DB
  try {
    const { data: existing } = await neonAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing?.id) {
      userId = existing.id;
      await neonAdmin
        .from("profiles")
        .update({
          full_name: fullName,
          avatar_url: avatarUrl ?? null,
        })
        .eq("id", userId);
    } else {
      await neonAdmin.from("profiles").insert({
        id: userId,
        email,
        full_name: fullName,
        avatar_url: avatarUrl ?? null,
        balance: isAdmin ? 5000.0 : 0.0,
      });
    }

    const { data: roleData } = await neonAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", role)
      .maybeSingle();

    if (!roleData) {
      await neonAdmin.from("user_roles").insert({
        user_id: userId,
        role,
      });
    }
  } catch (dbErr) {
    console.warn("[Google OAuth] Neon DB profile upsert:", dbErr);
  }

  const user: NeonUser = {
    id: userId,
    email,
    user_metadata: {
      full_name: fullName,
      avatar_url: avatarUrl,
    },
    role,
    created_at: new Date().toISOString(),
  };

  const jwtToken = createToken(user);
  const session: NeonSession = {
    access_token: jwtToken,
    token_type: "bearer",
    expires_in: 3600 * 24 * 7,
    user,
  };

  const html = renderCallbackHtml({
    status: "success",
    session,
    user,
  });

  const headers = new Headers();
  headers.set("content-type", "text/html; charset=utf-8");
  headers.append(
    "Set-Cookie",
    `neosmm_auth_token=${jwtToken}; Path=/; Max-Age=604800; SameSite=None; Secure`,
  );
  headers.append(
    "Set-Cookie",
    `neosmm_neon_auth_session=${encodeURIComponent(JSON.stringify(session))}; Path=/; Max-Age=604800; SameSite=None; Secure`,
  );

  return new Response(html, {
    status: 200,
    headers,
  });
}
