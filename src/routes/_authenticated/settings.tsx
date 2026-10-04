import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  User,
  Mail,
  Shield,
  Lock,
  Save,
  Loader2,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getAccountOverview, updateProfile } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{ title: "Settings & Profile — NeoSMM" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();

  const fetchOverview = useServerFn(getAccountOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["account-overview"],
    queryFn: () => fetchOverview(),
    staleTime: 15_000,
  });

  const saveProfile = useServerFn(updateProfile);

  const profile = data?.profile;
  const roles = data?.roles ?? [];
  const isAdmin = roles.includes("admin");

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busyProfile, setBusyProfile] = useState(false);
  const [busyPassword, setBusyPassword] = useState(false);

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;

    setBusyProfile(true);
    try {
      await saveProfile({ data: { full_name: fullName.trim() } });
      toast.success("Profile name updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["account-overview"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setBusyProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setBusyPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated successfully!");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setBusyPassword(false);
    }
  }

  const field =
    "w-full rounded-xl border border-input bg-card py-2.5 px-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40";

  return (
    <DashboardShell
      title="Account Settings"
      description="Manage your profile information and account security settings."
      isAdmin={isAdmin}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Card */}
        <div className="panel p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">
                Profile Information
              </h2>
              <p className="text-xs text-muted-foreground">
                Update your display name and review account status.
              </p>
            </div>
            {isAdmin && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <ShieldCheck className="size-3.5" />
                Administrator
              </span>
            )}
          </div>

          <form onSubmit={handleUpdateName} className="space-y-4 max-w-md">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">
                Account Email (Read-only)
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  readOnly
                  value={profile?.email || ""}
                  className={`${field} pl-10 bg-muted/50 cursor-not-allowed text-muted-foreground`}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">
                Full Display Name
              </label>
              <div className="relative">
                <User className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Name"
                  className={`${field} pl-10`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busyProfile}
              className="brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busyProfile ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>Save Name</span>
            </button>
          </form>
        </div>

        {/* Password Security Card */}
        <div className="panel p-6 sm:p-8 space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="font-display text-lg font-bold text-foreground">Security & Password</h2>
            <p className="text-xs text-muted-foreground">
              Update your account password for enhanced security.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${field} pl-10`}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${field} pl-10`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busyPassword || !password}
              className="brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busyPassword ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <KeyRound className="size-3.5" />
              )}
              <span>Update Password</span>
            </button>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}
