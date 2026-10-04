import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  ExternalLink,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell, StatusBadge, EmptyState } from "@/components/dashboard/DashboardShell";
import { getAccountOverview } from "@/lib/account.functions";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [{ title: "My Orders — NeoSMM" }],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const fetchOverview = useServerFn(getAccountOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["account-overview"],
    queryFn: () => fetchOverview(),
    staleTime: 15_000,
  });

  const orders = data?.orders ?? [];
  const roles = data?.roles ?? [];
  const isAdmin = roles.includes("admin");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const serviceName =
        o.service_name_snapshot || (o as any).services?.name || "";
      const matchesSearch =
        !searchQuery ||
        String(o.order_number).includes(searchQuery) ||
        serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.target_link.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  return (
    <DashboardShell
      title="Orders History"
      description="Track the real-time fulfillment status of all your submitted growth campaigns."
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
      <div className="space-y-6">
        {/* Filters and search bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order # or URL..."
              className="w-full rounded-xl border border-input bg-card py-2.5 pr-4 pl-9 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
            {["all", "pending", "processing", "completed", "cancelled", "refunded"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap capitalize transition-colors ${
                  statusFilter === st
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <EmptyState
            title="No orders found"
            body={
              searchQuery || statusFilter !== "all"
                ? "Try clearing your filters or search keywords."
                : "You have not placed any orders yet."
            }
            action={
              <Link
                to="/new-order"
                className="brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                <PlusCircle className="size-3.5" />
                <span>Place an Order</span>
              </Link>
            }
          />
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Target Link</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Placed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => {
                  const sName =
                    order.service_name_snapshot || (order as any).services?.name || "Service";
                  return (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        #{order.order_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                        {sName}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={order.target_link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-primary hover:underline truncate"
                          >
                            {order.target_link}
                          </a>
                          <button
                            type="button"
                            onClick={() => copyText(order.target_link, order.id)}
                            className="text-muted-foreground hover:text-foreground shrink-0 p-1"
                            title="Copy URL"
                          >
                            {copiedId === order.id ? (
                              <Check className="size-3 text-emerald-500" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-medium">
                        {Number(order.quantity).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        {formatCurrency(Number(order.total_amount))}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
