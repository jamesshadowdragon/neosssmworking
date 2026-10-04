import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  Zap,
  ArrowLeft,
  Calculator,
} from "lucide-react";
import { PublicShell, PageHeader } from "@/components/site/PublicShell";
import { getService } from "@/lib/catalog.functions";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/services/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — NeoSMM Service` },
      {
        name: "description",
        content: "View service specifications, pricing, delivery speed, and place your order.",
      },
    ],
  }),
  component: ServiceDetailPage,
});

function ServiceDetailPage() {
  const { slug } = useParams({ from: "/services/$slug" });
  const fetchService = useServerFn(getService);

  const { data, isLoading, error } = useQuery({
    queryKey: ["service", slug],
    queryFn: () => fetchService({ data: { slug } }),
  });

  const [quantity, setQuantity] = useState(1);

  if (isLoading) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <div className="h-6 w-32 bg-muted animate-pulse mx-auto rounded mb-4" />
          <div className="h-12 w-64 bg-muted animate-pulse mx-auto rounded" />
        </div>
      </PublicShell>
    );
  }

  const service = data?.service;
  const category = data?.category;
  const related = data?.related ?? [];

  if (!service) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
          <h1 className="font-display text-2xl font-bold text-foreground">Service Not Found</h1>
          <p className="text-sm text-muted-foreground">
            The requested service may have been archived or renamed.
          </p>
          <Link
            to="/services"
            className="brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Services
          </Link>
        </div>
      </PublicShell>
    );
  }

  const rateBasis = service.rate_basis || 1;
  const unitPrice = Number(service.price_per_unit);
  const totalCost = Math.round(((unitPrice * quantity) / rateBasis) * 100) / 100;

  return (
    <PublicShell>
      <PageHeader
        eyebrow={category?.name || "Service Details"}
        title={service.name}
        description={service.short_description || service.description}
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-6">
          <Link
            to="/services"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to all services
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="panel p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">Service Overview</h2>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {service.description ||
                    service.short_description ||
                    "High quality, verified service delivery tailored for maximum engagement and algorithmic retention."}
                </p>
              </div>

              {service.features && Array.isArray(service.features) && service.features.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Included Features & Guarantees
                  </h3>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {service.features.map((feat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 rounded-lg border border-border bg-card/50 p-3 text-xs text-foreground font-medium"
                      >
                        <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Specifications Table */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Service Specifications
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Delivery Speed</span>
                    <p className="font-display font-bold text-sm text-foreground">
                      {service.delivery_time || "24-72 hours"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Min Quantity</span>
                    <p className="font-display font-bold text-sm text-foreground">
                      {service.min_quantity.toLocaleString()} {service.unit}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Max Quantity</span>
                    <p className="font-display font-bold text-sm text-foreground">
                      {service.max_quantity.toLocaleString()} {service.unit}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Quick Order Calculator Sidebar */}
          <div className="space-y-6">
            <div className="panel p-6 sm:p-7 space-y-6 sticky top-24">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="text-xs font-semibold text-muted-foreground">Service Rate</span>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold text-foreground">
                    {formatCurrency(unitPrice)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    per {rateBasis > 1 ? `${rateBasis} ` : ""}
                    {service.unit}
                  </p>
                </div>
              </div>

              {/* Interactive Quantity Simulator */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Calculate Total:</span>
                  <span className="text-muted-foreground text-[11px]">
                    Min: {service.min_quantity} | Max: {service.max_quantity}
                  </span>
                </label>
                <input
                  type="number"
                  min={service.min_quantity}
                  max={service.max_quantity}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
                />

                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">Estimated Cost:</span>
                  <span className="font-display text-lg font-bold text-foreground">
                    {formatCurrency(totalCost)}
                  </span>
                </div>
              </div>

              <Link
                to="/new-order"
                className="brand-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
              >
                <span>Place Order in Dashboard</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
