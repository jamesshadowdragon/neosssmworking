import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Wallet,
  ShoppingBag,
  Clock,
  ArrowRight,
  PlusCircle,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { DashboardShell, StatCard, StatusBadge, EmptyState } from "@/components/dashboard/DashboardShell";
import { getAccountOverview } from "@/lib/account.functions";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — NeoSMM" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const fetchOverview = useServerFn(getAccountOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["account-overview"],
    queryFn: () => fetchOverview(),
    staleTime: 15_000,
  });

  const profile = data?.profile;
  const orders = data?.orders ?? [];
  const transactions = data?.transactions ?? [];
  const roles = data?.roles ?? [];
  const isAdmin = roles.includes("admin") || profile?.email?.includes("admin") || profile?.email === "neomart981@gmail.com" || profile?.email === "voidlureee@gmail.com";

  const balance = Number(profile?.balance ?? 0);
  const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "processing").length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  return (
    <DashboardShell
      title="Dashboard"
      description={`Welcome back, ${profile?.full_name || profile?.email?.split("@")[0] || "User"}`}
      isAdmin={isAdmin}
      actions={
        <Link
          to="/new-order"
          className="brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
        >
          <PlusCircle className="size-3.5" />
          <span>New Order</span>
        </Link>
      }
    >
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="panel p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-semibold">Available Balance</p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wallet className="size-4" />
              </div>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-foreground">
              {formatCurrency(balance)}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <Link
                to="/wallet"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>Add funds</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>

          <StatCard
            label="In-Progress Orders"
            value={pendingOrders}
            hint="Currently being delivered"
            icon={Clock}
          />
          <StatCard
            label="Completed Orders"
            value={completedOrders}
            hint="Delivered successfully"
            icon={CheckCircle2}
          />
          <StatCard
            label="Total Platform Spend"
            value={formatCurrency(totalSpent)}
            hint="Lifetime order volume"
            icon={TrendingUp}
          />
        </div>

        {/* Quick Actions / Callout */}
        <div className="panel aurora p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-primary/20">
          <div className="space-y-1">
            <h3 className="font-display text-base font-bold text-foreground">
              Instant Order Dispatch Ready
            </h3>
            <p className="text-xs text-muted-foreground max-w-xl">
              Choose from hundreds of social growth services with automated fulfillment. Balance is
              protected with atomic guarantees.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/wallet"
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
            >
              Deposit Crypto / UPI
            </Link>
            <Link
              to="/new-order"
              className="brand-gradient rounded-xl px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              Start New Order
            </Link>
          </div>
        </div>

        {/* Recent Orders Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">Recent Orders</h2>
            <Link
              to="/orders"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>View all orders ({orders.length})</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {orders.length === 0 ? (
            <EmptyState
              title="No orders placed yet"
              body="You haven't submitted any growth orders. Place your first order to get started."
              action={
                <Link
                  to="/new-order"
                  className="brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  <PlusCircle className="size-3.5" />
                  <span>Create First Order</span>
                </Link>
              }
            />
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Order #</th>
                    <th className="px-4 py-3 font-semibold">Service</th>
                    <th className="px-4 py-3 font-semibold">Target Link</th>
                    <th className="px-4 py-3 font-semibold">Quantity</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">
                        #{order.order_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {order.service_name_snapshot || (order as any).services?.name || "Service"}
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate text-muted-foreground">
                        <a
                          href={order.target_link}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <span className="truncate">{order.target_link}</span>
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {Number(order.quantity).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatCurrency(Number(order.total_amount))}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
