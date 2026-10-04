import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShoppingBag,
  Wallet,
  Users,
  Layers,
  Settings,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  Edit,
  Save,
  Loader2,
  DollarSign,
  Plus,
} from "lucide-react";
import { DashboardShell, StatCard, StatusBadge, EmptyState } from "@/components/dashboard/DashboardShell";
import { CatalogManager } from "@/components/admin/CatalogManager";
import {
  getAdminOverview,
  updateOrderStatus,
  reviewDeposit,
  adjustBalance,
  savePaymentMethod,
} from "@/lib/admin.functions";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Admin Portal — NeoSMM" }],
  }),
  component: AdminPortalPage,
});

type Tab = "overview" | "orders" | "deposits" | "customers" | "catalog" | "payment-methods" | "activity";

function AdminPortalPage() {
  const queryClient = useQueryClient();

  const fetchAdmin = useServerFn(getAdminOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchAdmin(),
    staleTime: 10_000,
  });

  const updateStatusFn = useServerFn(updateOrderStatus);
  const reviewDepositFn = useServerFn(reviewDeposit);
  const adjustBalanceFn = useServerFn(adjustBalance);
  const savePaymentMethodFn = useServerFn(savePaymentMethod);

  const [currentTab, setCurrentTab] = useState<Tab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Modal for adjusting balance
  const [adjustModalUser, setAdjustModalUser] = useState<any | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(50);
  const [adjustDescription, setAdjustDescription] = useState("");

  const orders = data?.orders ?? [];
  const customers = data?.customers ?? [];
  const deposits = data?.deposits ?? [];
  const paymentMethods = data?.paymentMethods ?? [];
  const activity = data?.activity ?? [];
  const settings = data?.settings;

  const pendingDeposits = deposits.filter((d) => d.status === "pending");
  const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "processing");
  const totalVolume = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  async function handleUpdateOrderStatus(
    orderId: string,
    status: "pending" | "processing" | "completed" | "cancelled" | "refunded",
  ) {
    setBusyAction(orderId);
    try {
      await updateStatusFn({ data: { order_id: orderId, status } });
      toast.success(`Order status updated to ${status}`);
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update order status.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReviewDeposit(depositId: string, decision: "approved" | "rejected") {
    setBusyAction(depositId);
    try {
      await reviewDepositFn({
        data: {
          deposit_id: depositId,
          decision,
          admin_notes: `Processed by administrator`,
        },
      });
      toast.success(
        decision === "approved"
          ? "Deposit approved and balance credited atomically!"
          : "Deposit marked as rejected.",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to process deposit.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAdjustBalanceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustModalUser || adjustAmount === 0) return;

    setBusyAction("adjust");
    try {
      await adjustBalanceFn({
        data: {
          user_id: adjustModalUser.id,
          amount: Number(adjustAmount),
          description: adjustDescription.trim() || "Manual admin adjustment",
        },
      });
      toast.success(`Adjusted balance for ${adjustModalUser.email}`);
      setAdjustModalUser(null);
      setAdjustDescription("");
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to adjust balance.");
    } finally {
      setBusyAction(null);
    }
  }

  const field =
    "w-full rounded-xl border border-input bg-card py-2 px-3 text-xs outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40";

  return (
    <DashboardShell
      title="Administrator Control Portal"
      description="Manage orders, review deposits, adjust balances, configure catalog rates, and monitor logs."
      isAdmin={true}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border pb-3 scrollbar-none">
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "orders", label: `Orders (${orders.length})`, icon: ShoppingBag },
            {
              id: "deposits",
              label: `Deposits ${pendingDeposits.length > 0 ? `(${pendingDeposits.length} Pending)` : `(${deposits.length})`}`,
              icon: Wallet,
            },
            { id: "customers", label: `Customers (${customers.length})`, icon: Users },
            { id: "catalog", label: "Catalog & Pricing", icon: Layers },
            { id: "payment-methods", label: "Payment Methods", icon: Settings },
            { id: "activity", label: "Activity Audit", icon: ShieldCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCurrentTab(tab.id as Tab)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                currentTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="size-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {currentTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Orders"
                value={orders.length}
                hint={`${pendingOrders.length} pending / in-progress`}
                icon={ShoppingBag}
              />
              <StatCard
                label="Pending Deposits"
                value={pendingDeposits.length}
                hint="Awaiting verification"
                icon={Wallet}
              />
              <StatCard
                label="Registered Users"
                value={customers.length}
                hint="Active customer accounts"
                icon={Users}
              />
              <StatCard
                label="Total Platform Volume"
                value={formatCurrency(totalVolume)}
                hint="Gross order throughput"
                icon={DollarSign}
              />
            </div>

            {/* Quick Deposit Approvals Queue */}
            {pendingDeposits.length > 0 && (
              <div className="panel p-6 space-y-4 border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-amber-500" />
                    <h3 className="font-display font-bold text-sm text-foreground">
                      Pending Deposits Requiring Review ({pendingDeposits.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentTab("deposits")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View all deposits &rarr;
                  </button>
                </div>

                <div className="divide-y divide-border/60">
                  {pendingDeposits.slice(0, 4).map((dep) => (
                    <div
                      key={dep.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground">
                          Request #{dep.request_number} •{" "}
                          <span className="text-emerald-500 font-bold">
                            +{formatCurrency(Number(dep.amount))}
                          </span>{" "}
                          via {(dep as any).payment_methods?.name || "Payment"}
                        </p>
                        <p className="font-mono text-muted-foreground text-[11px] truncate max-w-md">
                          Ref: {dep.payment_reference}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busyAction === dep.id}
                          onClick={() => handleReviewDeposit(dep.id, "approved")}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span>Approve & Credit</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyAction === dep.id}
                          onClick={() => handleReviewDeposit(dep.id, "rejected")}
                          className="flex items-center gap-1 rounded-lg bg-destructive px-3 py-1.5 font-semibold text-white hover:bg-destructive/90 disabled:opacity-50"
                        >
                          <XCircle className="size-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Orders Management */}
        {currentTab === "orders" && (
          <div className="space-y-4">
            <div className="panel overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Target Link</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Current Status</th>
                    <th className="px-4 py-3">Change Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        #{order.order_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground max-w-[160px] truncate">
                        {order.service_name_snapshot || (order as any).services?.name || "Service"}
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate">
                        <a
                          href={order.target_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-primary hover:underline"
                        >
                          {order.target_link}
                        </a>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {Number(order.quantity).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        {formatCurrency(Number(order.total_amount))}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          disabled={busyAction === order.id}
                          value={order.status}
                          onChange={(e) =>
                            handleUpdateOrderStatus(order.id, e.target.value as any)
                          }
                          className="rounded-lg border border-border bg-card px-2 py-1 text-xs outline-none focus:border-primary"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Deposits Review */}
        {currentTab === "deposits" && (
          <div className="space-y-4">
            <div className="panel overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-4 py-3">Request #</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Reference / TxID</th>
                    <th className="px-4 py-3">Proof</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deposits.map((dep) => (
                    <tr key={dep.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        #{dep.request_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {(dep as any).payment_methods?.name || "Deposit"}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-500">
                        +{formatCurrency(Number(dep.amount))}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground max-w-[200px] truncate select-all">
                        {dep.payment_reference}
                      </td>
                      <td className="px-4 py-3">
                        {dep.proof_path ? (
                          <span className="text-primary font-semibold">Attached</span>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={dep.status} />
                      </td>
                      <td className="px-4 py-3">
                        {dep.status === "pending" ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={busyAction === dep.id}
                              onClick={() => handleReviewDeposit(dep.id, "approved")}
                              className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={busyAction === dep.id}
                              onClick={() => handleReviewDeposit(dep.id, "rejected")}
                              className="rounded bg-destructive px-2.5 py-1 text-[11px] font-bold text-white hover:bg-destructive/90 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px] font-medium capitalize">
                            {dep.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(dep.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Customers */}
        {currentTab === "customers" && (
          <div className="space-y-4">
            <div className="panel overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-4 py-3">Customer Email</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Current Balance</th>
                    <th className="px-4 py-3">Registered Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">{cust.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{cust.full_name || "—"}</td>
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {formatCurrency(Number(cust.balance))}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(cust.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustModalUser(cust);
                            setAdjustAmount(25);
                          }}
                          className="brand-gradient rounded-lg px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90"
                        >
                          Adjust Balance
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Catalog & Pricing Manager */}
        {currentTab === "catalog" && <CatalogManager />}

        {/* Tab 6: Payment Methods Configuration */}
        {currentTab === "payment-methods" && (
          <div className="panel p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="font-display font-bold text-base text-foreground">
                Payment Gateways & Crypto Configuration
              </h3>
              <p className="text-xs text-muted-foreground">
                Active destination wallet addresses and UPI configuration.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {paymentMethods.map((pm) => (
                <div key={pm.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-sm text-foreground">
                      {pm.name}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        pm.is_enabled
                          ? "bg-emerald-500/20 text-emerald-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {pm.is_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>
                      <strong>Network:</strong> {pm.network || "Standard"}
                    </p>
                    <p className="font-mono text-[11px] break-all">
                      <strong>Destination:</strong> {pm.destination}
                    </p>
                    <p>
                      <strong>Limits:</strong> ${Number(pm.min_amount)} – ${Number(pm.max_amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 7: Activity Audit Log */}
        {currentTab === "activity" && (
          <div className="panel overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Entity ID</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activity.map((act) => (
                  <tr key={act.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{act.action}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">
                      {act.entity_type}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{act.entity_id}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(act.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Adjust Balance Modal */}
        {adjustModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="panel max-w-md w-full p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-display font-bold text-base text-foreground">
                  Adjust Customer Balance
                </h3>
                <button
                  type="button"
                  onClick={() => setAdjustModalUser(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-semibold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAdjustBalanceSubmit} className="space-y-4">
                <div className="text-xs space-y-1">
                  <p>
                    <strong>Customer:</strong> {adjustModalUser.email}
                  </p>
                  <p>
                    <strong>Current Balance:</strong>{" "}
                    {formatCurrency(Number(adjustModalUser.balance))}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    Adjustment Amount (Use positive to add, negative to deduct)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(parseFloat(e.target.value) || 0)}
                    className={field}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    Reason / Description
                  </label>
                  <input
                    type="text"
                    value={adjustDescription}
                    onChange={(e) => setAdjustDescription(e.target.value)}
                    placeholder="Bonus credit, manual refund, etc."
                    className={field}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdjustModalUser(null)}
                    className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busyAction === "adjust" || adjustAmount === 0}
                    className="brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    {busyAction === "adjust" && <Loader2 className="size-3.5 animate-spin" />}
                    <span>Confirm Adjustment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
