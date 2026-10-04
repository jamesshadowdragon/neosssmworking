import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — NeoSMM" },
      { name: "description", content: "Request a password reset link for your NeoSMM account." },
      { property: "og:title", content: "Reset your password — NeoSMM" },
      { property: "og:description", content: "Request a NeoSMM password reset link." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("If that email exists, a reset link is on its way.");
  }

  return (
    <div className="aurora flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="panel w-full max-w-md p-8">
          {sent ? (
            <div className="space-y-4 text-center">
              <span className="brand-gradient mx-auto flex size-12 items-center justify-center rounded-2xl text-primary-foreground">
                <Mail className="size-6" />
              </span>
              <h1 className="font-display text-2xl font-bold">Check your inbox</h1>
              <p className="text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, we've sent a link to set a new
                password.
              </p>
              <Link
                to="/auth"
                search={{ mode: "login" }}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold">Forgot your password?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your account email and we'll send you a reset link.
              </p>
              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card py-2.5 pr-4 pl-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="brand-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />} Send reset link
                </button>
              </form>
              <p className="mt-6 text-center text-sm">
                <Link
                  to="/auth"
                  search={{ mode: "login" }}
                  className="text-muted-foreground hover:text-primary"
                >
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
