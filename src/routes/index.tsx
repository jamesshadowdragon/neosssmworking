import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Zap,
  TrendingUp,
  Layers,
  Clock,
  CreditCard,
  Headphones,
  Flame,
  Globe,
  Star,
} from "lucide-react";
import { PublicShell } from "@/components/site/PublicShell";
import { listCatalog } from "@/lib/catalog.functions";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NeoSMM — Next-Gen Social Media Marketing Platform" },
      {
        name: "description",
        content:
          "NeoSMM is the premium social media growth platform. Fast automated fulfillment, transparent rates, crypto & UPI funding, and 24/7 support.",
      },
      { property: "og:title", content: "NeoSMM — Next-Gen Social Media Marketing Platform" },
      {
        property: "og:description",
        content:
          "High-speed growth, verified services, crypto & UPI wallet funding, and complete transparency.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const fetchCatalog = useServerFn(listCatalog);
  const { data: catalog } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => fetchCatalog(),
    staleTime: 60_000,
  });

  const featuredServices = (catalog?.services ?? []).slice(0, 6);

  return (
    <PublicShell>
      {/* Hero Section */}
      <section className="aurora relative overflow-hidden border-b border-border/70 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary backdrop-blur-md animate-in fade-in slide-in-from-top-3">
              <Sparkles className="size-3.5" />
              <span>Next-Generation Growth Infrastructure</span>
            </div>

            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl text-foreground">
              Scale Your Brand <br className="hidden sm:inline" />
              <span className="brand-gradient-text">Without Limits</span>
            </h1>

            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
              Automated high-speed social media services across Instagram, YouTube, TikTok, Telegram,
              X, Discord & more. Transparent rates, instant wallet funding, and 100% order
              reliability.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/auth"
                search={{ mode: "register" }}
                className="brand-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-95 hover:scale-[1.02]"
              >
                <span>Get Started in Seconds</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 backdrop-blur-md px-6 py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-muted hover:border-border/80"
              >
                <span>View Full Catalog</span>
              </Link>
            </div>

            {/* Quick trust metrics */}
            <div className="grid grid-cols-2 gap-4 pt-10 sm:grid-cols-4 border-t border-border/50 text-center">
              <div>
                <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">100K+</p>
                <p className="text-xs text-muted-foreground mt-1">Orders Delivered</p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">99.9%</p>
                <p className="text-xs text-muted-foreground mt-1">Fulfillment Rate</p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">&lt; 60s</p>
                <p className="text-xs text-muted-foreground mt-1">Average Start Time</p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">24/7</p>
                <p className="text-xs text-muted-foreground mt-1">Support Available</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why NeoSMM Highlights */}
      <section className="py-20 border-b border-border/70 bg-surface/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Built for Performance
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              Everything You Need to Dominate Socials
            </h2>
            <p className="text-sm text-muted-foreground">
              Engineered from the ground up for agencies, creators, and marketers who demand speed and
              precision.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="panel p-6 space-y-3 hover:border-primary/40 transition-colors">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Zap className="size-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">Lightning Dispatch</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Automated order routing starts delivering your requested services within minutes of
                order submission.
              </p>
            </div>

            <div className="panel p-6 space-y-3 hover:border-primary/40 transition-colors">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <CreditCard className="size-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">
                Crypto & UPI Payments
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Fund your wallet effortlessly with USDT (BEP-20), Bitcoin, Solana, Litecoin, or
                instant UPI (GPay, PhonePe, Paytm).
              </p>
            </div>

            <div className="panel p-6 space-y-3 hover:border-primary/40 transition-colors">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">
                Atomic Balance Protection
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every transaction is backed by Postgres database atomic guarantees. Cancelled or
                incomplete orders refund instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Services Preview */}
      <section className="py-20 border-b border-border/70">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Popular Services
              </span>
              <h2 className="font-display text-3xl font-bold text-foreground mt-1">
                Hand-Picked Growth Solutions
              </h2>
            </div>
            <Link
              to="/services"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <span>Explore all services</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredServices.map((svc) => (
              <div
                key={svc.id}
                className="panel flex flex-col justify-between p-6 hover:border-primary/40 transition-all hover:shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary capitalize">
                      {svc.category_slug || "Social"}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {svc.delivery_time || "Fast Delivery"}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground line-clamp-1">
                    {svc.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {svc.short_description || svc.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">Starting from</span>
                    <p className="font-display text-lg font-bold text-foreground">
                      {formatCurrency(Number(svc.price_per_unit))}
                      <span className="text-xs font-normal text-muted-foreground">
                        {" "}
                        / {svc.unit || "unit"}
                      </span>
                    </p>
                  </div>
                  <Link
                    to="/services/$slug"
                    params={{ slug: svc.slug }}
                    className="brand-gradient inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <span>Order Now</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-b border-border/70 bg-surface/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Simple 3-Step Process
            </span>
            <h2 className="font-display text-3xl font-bold text-foreground">How NeoSMM Works</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3 relative">
            <div className="panel p-6 text-center space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl brand-gradient text-primary-foreground font-display font-bold text-lg shadow-md">
                1
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">Deposit Funds</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add balance easily using Crypto (USDT BEP-20, BTC, SOL, LTC) or instant UPI. Your wallet
                is credited promptly upon verification.
              </p>
            </div>

            <div className="panel p-6 text-center space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl brand-gradient text-primary-foreground font-display font-bold text-lg shadow-md">
                2
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">Pick a Service</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Select your target platform and service, enter your profile or post link, and choose
                the desired quantity.
              </p>
            </div>

            <div className="panel p-6 text-center space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl brand-gradient text-primary-foreground font-display font-bold text-lg shadow-md">
                3
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">Track Live Growth</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Watch your order progress live in your personal customer dashboard with real-time status
                updates and delivery reporting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="aurora py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-6">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-foreground">
            Ready to Accelerate Your Social Growth?
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Join hundreds of creators, agencies, and businesses scaling with NeoSMM today.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Link
              to="/auth"
              search={{ mode: "register" }}
              className="brand-gradient inline-flex items-center gap-2 rounded-xl px-7 py-4 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/20 hover:opacity-90"
            >
              <span>Create Free Account</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
