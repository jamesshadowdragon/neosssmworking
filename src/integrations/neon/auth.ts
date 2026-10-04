import { ADMIN_EMAILS, isAdminEmail } from "@/lib/admin-config";

export interface NeonUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  role?: string;
  created_at?: string;
}

export interface NeonSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: NeonUser;
}

export interface AuthResponse {
  data: {
    user: NeonUser | null;
    session: NeonSession | null;
  };
  error: { message: string } | null;
}

type AuthChangeEvent = "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED" | "TOKEN_REFRESHED";
type AuthStateCallback = (event: AuthChangeEvent, session: NeonSession | null) => void;

const SESSION_STORAGE_KEY = "neosmm_neon_auth_session";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function createToken(user: NeonUser): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role ?? "user",
      full_name: user.user_metadata?.full_name ?? "",
      avatar_url: user.user_metadata?.avatar_url ?? "",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    }),
  );
  const signature = btoa("neosmm_neon_token_sig");
  return `${header}.${payload}.${signature}`;
}

export function decodeToken(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = atob(parts[1]);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

class NeonAuthClient {
  private listeners: Set<AuthStateCallback> = new Set();
  private currentSession: NeonSession | null = null;

  constructor() {
    if (isBrowser()) {
      try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          this.currentSession = JSON.parse(stored);
        }
      } catch {}

      // Cross-window and popup storage synchronization
      try {
        window.addEventListener("storage", (e) => {
          if (e.key === SESSION_STORAGE_KEY) {
            if (e.newValue) {
              try {
                this.currentSession = JSON.parse(e.newValue);
                this.notify("SIGNED_IN");
              } catch {}
            } else {
              this.currentSession = null;
              this.notify("SIGNED_OUT");
            }
          }
        });
      } catch {}

      // BroadcastChannel for cross-tab and cross-popup auth synchronization
      if (typeof BroadcastChannel !== "undefined") {
        try {
          const channel = new BroadcastChannel("neosmm_auth_sync");
          channel.onmessage = (event) => {
            if (event.data?.type === "AUTH_STATE_CHANGE") {
              this.currentSession = event.data.session ?? null;
              this.notify(this.currentSession ? "SIGNED_IN" : "SIGNED_OUT");
            }
          };
        } catch {}
      }
    }
  }

  private notify(event: AuthChangeEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event, this.currentSession);
      } catch (err) {
        console.error("Auth listener error:", err);
      }
    }
  }

  async getSession(): Promise<{ data: { session: NeonSession | null }; error: null }> {
    if (isBrowser()) {
      try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (
            parsed &&
            (!this.currentSession || this.currentSession.access_token !== parsed.access_token)
          ) {
            this.currentSession = parsed;
          }
        } else if (typeof document !== "undefined" && document.cookie) {
          const match = document.cookie.match(/neosmm_neon_auth_session=([^;]+)/);
          if (match?.[1]) {
            const parsed = JSON.parse(decodeURIComponent(match[1]));
            if (parsed && parsed.user) {
              this.currentSession = parsed;
              localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed));
            }
          }
        }
      } catch {}
    }
    return { data: { session: this.currentSession }, error: null };
  }

  async getUser(): Promise<{ data: { user: NeonUser | null }; error: null }> {
    const { data } = await this.getSession();
    return { data: { user: data.session?.user ?? null }, error: null };
  }

  setSession(session: NeonSession | null): void {
    this.currentSession = session;
    if (isBrowser()) {
      try {
        if (session) {
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
          document.cookie = `neosmm_auth_token=${session.access_token}; path=/; max-age=604800; SameSite=None; Secure`;
          document.cookie = `neosmm_neon_auth_session=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=604800; SameSite=None; Secure`;
        } else {
          localStorage.removeItem(SESSION_STORAGE_KEY);
          localStorage.removeItem("neosmm_oauth_complete");
          document.cookie = `neosmm_auth_token=; path=/; max-age=0; SameSite=None; Secure`;
          document.cookie = `neosmm_neon_auth_session=; path=/; max-age=0; SameSite=None; Secure`;
        }
      } catch {}

      if (typeof BroadcastChannel !== "undefined") {
        try {
          const channel = new BroadcastChannel("neosmm_auth_sync");
          channel.postMessage({ type: "AUTH_STATE_CHANGE", session });
          channel.close();
        } catch {}
      }
    }
    this.notify(session ? "SIGNED_IN" : "SIGNED_OUT");
  }

  async signUp(params: {
    email: string;
    password?: string;
    options?: {
      data?: { full_name?: string; avatar_url?: string };
      emailRedirectTo?: string;
    };
  }): Promise<AuthResponse> {
    const email = params.email.trim().toLowerCase();
    const fullName = params.options?.data?.full_name?.trim() || email.split("@")[0];

    function generateUuid(): string {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    const isAdmin = isAdminEmail(email);
    const userId = isAdmin
      ? email === "neomart981@gmail.com"
        ? "00000000-0000-4000-8000-000000000010"
        : email === "voidlureee@gmail.com"
          ? "00000000-0000-4000-8000-000000000011"
          : "00000000-0000-4000-8000-000000000001"
      : generateUuid();

    const user: NeonUser = {
      id: userId,
      email,
      user_metadata: { full_name: fullName, avatar_url: params.options?.data?.avatar_url },
      role: isAdmin ? "admin" : "user",
      created_at: new Date().toISOString(),
    };

    const token = createToken(user);
    const session: NeonSession = {
      access_token: token,
      token_type: "bearer",
      expires_in: 3600 * 24 * 7,
      user,
    };

    this.setSession(session);
    return { data: { user, session }, error: null };
  }

  async signInWithPassword(params: { email: string; password?: string }): Promise<AuthResponse> {
    const email = params.email.trim().toLowerCase();
    const isAdmin = isAdminEmail(email);

    let userId = "00000000-0000-4000-8000-000000000002";
    let role = "user";
    let fullName = email.split("@")[0];

    if (isAdmin) {
      role = "admin";
      if (email === "neomart981@gmail.com") {
        userId = "00000000-0000-4000-8000-000000000010";
        fullName = "NeoMart Owner";
      } else if (email === "voidlureee@gmail.com") {
        userId = "00000000-0000-4000-8000-000000000011";
        fullName = "Voidlureee Admin (Temp)";
      } else {
        userId = "00000000-0000-4000-8000-000000000001";
        fullName = "NeoSMM Admin";
      }
    }

    const user: NeonUser = {
      id: userId,
      email,
      user_metadata: { full_name: fullName },
      role,
      created_at: new Date().toISOString(),
    };

    const token = createToken(user);
    const session: NeonSession = {
      access_token: token,
      token_type: "bearer",
      expires_in: 3600 * 24 * 7,
      user,
    };

    this.setSession(session);
    return { data: { user, session }, error: null };
  }

  async signInWithOAuth(params: {
    provider: string;
    options?: { redirectTo?: string; queryParams?: Record<string, string> };
  }): Promise<{ data: { provider: string; url?: string }; error: { message: string } | null }> {
    if (params.provider === "google") {
      const redirectUri =
        params.options?.redirectTo ||
        (isBrowser() ? `${window.location.origin}/auth/callback` : "/auth/callback");

      return {
        data: {
          provider: "google",
          url: `/auth/callback?redirect=${encodeURIComponent(redirectUri)}`,
        },
        error: null,
      };
    }
    return { data: { provider: params.provider }, error: { message: "Provider not supported" } };
  }

  async signOut(): Promise<{ error: null }> {
    this.setSession(null);
    return { error: null };
  }

  async updateUser(attributes: {
    password?: string;
    data?: { full_name?: string; avatar_url?: string };
  }): Promise<AuthResponse> {
    if (!this.currentSession) {
      return { data: { user: null, session: null }, error: { message: "Not signed in" } };
    }

    if (attributes.data) {
      this.currentSession.user.user_metadata = {
        ...this.currentSession.user.user_metadata,
        ...attributes.data,
      };
      this.setSession(this.currentSession);
      this.notify("USER_UPDATED");
    }

    return { data: { user: this.currentSession.user, session: this.currentSession }, error: null };
  }

  async resetPasswordForEmail(email: string, options?: any): Promise<{ data: {}; error: null }> {
    return { data: {}, error: null };
  }

  onAuthStateChange(callback: AuthStateCallback): {
    data: { subscription: { unsubscribe: () => void } };
  } {
    this.listeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners.delete(callback);
          },
        },
      },
    };
  }
}

export const neonAuth = new NeonAuthClient();
