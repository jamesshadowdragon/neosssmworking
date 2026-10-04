import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — NeoSMM" },
      { name: "description", content: "Choose a new password for your NeoSMM account." },
      { property: "og:title", content: "Set a new password — NeoSMM" },
      { property: "og:description", content: "Choose a new NeoSMM password." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    navigate({ to: "/dashboard", replace: true });
  }

  const field =
    "w-full rounded-xl border border-input bg-card py-2.5 pr-4 pl-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";

  return (
    <div className="aurora flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="panel w-full max-w-md p-8">
          <h1 className="font-display text-2xl font-bold">Set a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ready
              ? "Choose a password of at least 8 characters."
              : "Open this page from the reset link in your email to continue."}
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                required
                minLength={8}
                type="password"
                placeholder="New password"
                className={field}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                required
                minLength={8}
                type="password"
                placeholder="Confirm new password"
                className={field}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={busy || !ready}
              className="brand-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Update password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
