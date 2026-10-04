import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  PlusCircle,
  Link2,
  AlertCircle,
  CheckCircle2,
  Wallet,
  Loader2,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { listCatalog } from "@/lib/catalog.functions";
import { placeOrder, getAccountOverview } from "@/lib/account.functions";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/new-order")({
  head: () => ({
    meta: [{ title: "New Order — NeoSMM" }],
  }),
  component: NewOrderPage,
});

function NewOrderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchCatalog = useServerFn(listCatalog);
  const { data: catalog, isLoading: loadingCatalog } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => fetchCatalog(),
    staleTime: 60_000,
  });

  const fetchOverview = useServerFn(getAccountOverview);
  const { data: accountData } = useQuery({
    queryKey: ["account-overview"],
    queryFn: () => fetchOverview(),
    staleTime: 15_000,
  });

  const submitOrder = useServerFn(placeOrder);

  const categories = catalog?.categories ?? [];
  const services = catalog?.services ?? [];
  const balance = Number(accountData?.profile?.balance ?? 0);
  const roles = accountData?.roles ?? [];
  const isAdmin = roles.includes("admin");

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [targetLink, setTargetLink] = useState("");
  const [quantity, setQuantity] = useState<number>(100);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // Set initial category if not set
  const activeCategoryId = selectedCategoryId || (categories[0]?.id ?? "");

  const categoryServices = useMemo(() => {
    return services.filter((s) => s.category_id === activeCategoryId);
  }, [services, activeCategoryId]);

  // Active service
  const activeService = useMemo(() => {
    if (selectedServiceId) {
      const found = services.find((s) => s.id === selectedServiceId);
      if (found) return found;
    }
    return categoryServices[0] ?? services[0] ?? null;
  }, [services, categoryServices, selectedServiceId]);

  const unitPrice = activeService ? Number(activeService.price_per_unit) : 0;
  const rateBasis = activeService?.rate_basis || 1;
  const totalCost = Math.round(((unitPrice * quantity) / rateBasis) * 100) / 100;
  const hasEnoughBalance = balance >= totalCost;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeService) {
      toast.error("Please select a service.");
      return;
    }

    if (!targetLink || !targetLink.startsWith("http")) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }

    if (quantity < activeService.min_quantity || quantity > activeService.max_quantity) {
      toast.error(
        `Quantity must be between ${activeService.min_quantity} and ${activeService.max_quantity}`,
      );
      return;
    }

    if (!hasEnoughBalance) {
      toast.error("Insufficient balance. Please add funds to your wallet.");
      return;
    }

    setBusy(true);
    try {
      const clientRequestId = crypto.randomUUID();
      const result = await submitOrder({
        data: {
          service_id: activeService.id,
          target_link: targetLink.trim(),
          quantity: Number(quantity),
          notes: notes.trim() || undefined,
          client_request_id: clientRequestId,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["account-overview"] });
      toast.success(`Order #${result.orderNumber} placed successfully!`);
      navigate({ to: "/orders", replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to place order.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-input bg-card py-2.5 px-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40";

  return (
    <DashboardShell
      title="Create New Order"
      description="Select a service, provide your target link, and start instant automated delivery."
      isAdmin={isAdmin}
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Order Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="panel p-6 sm:p-8 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Category Selection */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    1. Select Category / Platform
                  </label>
                  <select
                    value={activeCategoryId}
                    onChange={(e) => {
                      setSelectedCategoryId(e.target.value);
                      setSelectedServiceId("");
                    }}
                    className={field}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service Selection */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    2. Select Service
                  </label>
                  <select
                    value={activeService?.id ?? ""}
                    onChange={(e) => {
                      setSelectedServiceId(e.target.value);
                      const svc = services.find((s) => s.id === e.target.value);
                      if (svc) {
                        setQuantity(svc.min_quantity || 100);
                      }
                    }}
                    className={field}
                  >
                    {categoryServices.map((svc) => (
                      <option key={svc.id} value={svc.id}>
                        {svc.name} — {formatCurrency(Number(svc.price_per_unit))} / {svc.unit}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Link */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    3. Target Link / URL
                  </label>
                  <div className="relative">
                    <Link2 className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="url"
                      required
                      value={targetLink}
                      onChange={(e) => setTargetLink(e.target.value)}
                      placeholder="https://instagram.com/p/..."
                      className={`${field} pl-10`}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Ensure the post, channel, or profile is public before submitting.
                  </p>
                </div>

                {/* Quantity */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground">4. Quantity</label>
                    {activeService && (
                      <span className="text-[11px] text-muted-foreground">
                        Min: {activeService.min_quantity} | Max:{" "}
                        {activeService.max_quantity.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    min={activeService?.min_quantity ?? 1}
                    max={activeService?.max_quantity ?? 1000000}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className={field}
                  />
                </div>

                {/* Optional Notes */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    5. Additional Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Custom comments, drip instructions, or reference notes..."
                    className={field}
                  />
                </div>

                {/* Balance Warning if Insufficient */}
                {!hasEnoughBalance && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3">
                    <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-destructive">Insufficient Balance</p>
                      <p className="text-muted-foreground">
                        Order total is <strong>{formatCurrency(totalCost)}</strong>, but your wallet
                        has <strong>{formatCurrency(balance)}</strong>.
                      </p>
                      <Link
                        to="/wallet"
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline pt-1"
                      >
                        <span>Deposit funds via Crypto / UPI</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy || !hasEnoughBalance || !activeService}
                  className="brand-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <PlusCircle className="size-4" />
                  )}
                  <span>Confirm and Place Order ({formatCurrency(totalCost)})</span>
                </button>
              </form>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-6">
            <div className="panel p-6 space-y-6">
              <h3 className="font-display text-base font-bold text-foreground">Order Summary</h3>

              <div className="space-y-3 divide-y divide-border text-xs">
                <div className="flex justify-between pb-2">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-semibold text-foreground max-w-[150px] truncate text-right">
                    {activeService?.name || "None selected"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-semibold text-foreground">
                    {quantity.toLocaleString()} {activeService?.unit || "units"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Rate Basis</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(unitPrice)} / {rateBasis > 1 ? `${rateBasis} ` : ""}
                    {activeService?.unit}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Delivery Speed</span>
                  <span className="font-semibold text-foreground">
                    {activeService?.delivery_time || "Instant start"}
                  </span>
                </div>
                <div className="flex justify-between pt-3 text-sm">
                  <span className="font-bold text-foreground">Total Cost</span>
                  <span className="font-display font-bold text-primary text-base">
                    {formatCurrency(totalCost)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-muted/40 p-4 space-y-2 border border-border text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Your Balance</span>
                  <span className="font-semibold text-foreground">{formatCurrency(balance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Remaining After Order</span>
                  <span
                    className={`font-semibold ${
                      balance - totalCost >= 0 ? "text-emerald-500" : "text-destructive"
                    }`}
                  >
                    {formatCurrency(balance - totalCost)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
