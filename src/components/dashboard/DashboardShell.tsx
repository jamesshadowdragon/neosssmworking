import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  Shield,
  ShoppingBag,
  Wallet,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/new-order", label: "New order", icon: PlusCircle },
  { to: "/orders", label: "Orders", icon: ShoppingBag },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardShell({
  children,
  title,
  description,
  actions,
  isAdmin = false,
}: {
  children: ReactNode;
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
  isAdmin?: boolean | undefined;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-2",
          )}
          activeProps={{ className: "bg-primary/15 text-primary" }}
        >
          <item.icon className="size-4 shrink-0" />
          {!collapsed && item.label}
        </Link>
      ))}
      {isAdmin && (
        <Link
          to="/admin"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "mt-2 flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-2",
          )}
          activeProps={{ className: "bg-primary/15 text-primary" }}
        >
          <Shield className="size-4 shrink-0" />
          {!collapsed && "Admin"}
        </Link>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 transition-all lg:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <div className="flex items-center justify-between">
          <Logo compact={collapsed} />
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-sidebar-border text-muted-foreground hover:bg-sidebar-accent"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
        {nav}
        <button
          type="button"
          onClick={signOut}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
            collapsed && "justify-center px-2",
          )}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && "Sign out"}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 left-0 flex h-full w-72 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-sidebar-border text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            {nav}
            <button
              type="button"
              onClick={signOut}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-destructive"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-4" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate font-display text-xl font-bold">{title}</h1>
                {description && (
                  <p className="truncate text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-primary" />}
      </div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-success/15 text-success",
    processing: "bg-primary/15 text-primary",
    pending: "bg-warning/15 text-warning",
    answered: "bg-success/15 text-success",
    approved: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
    refunded: "bg-destructive/15 text-destructive",
    open: "bg-primary/15 text-primary",
    closed: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium capitalize",
        map[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center gap-3 p-12 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="panel divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/5 animate-pulse rounded bg-muted" />
          <div className="ml-auto h-6 w-20 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}
