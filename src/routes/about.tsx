import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Zap, Globe, Users, ArrowRight, Award, Lock } from "lucide-react";
import { PublicShell, PageHeader, Prose } from "@/components/site/PublicShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — NeoSMM" },
      {
        name: "description",
        content:
          "Discover how NeoSMM empowers creators, brands, and agencies with reliable, automated social media marketing infrastructure.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PublicShell>
      <PageHeader
        eyebrow="Our Mission"
        title="Built for Creators, Agencies & Scale"
        description="NeoSMM was created to solve the reliability problem in social growth with automated routing, transparent rates, and real-time fulfillment tracking."
      />

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 space-y-16">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="panel p-6 space-y-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Zap className="size-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">Next-Gen Speed</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Our direct API dispatch system ensures your orders start processing within minutes of
              placement, without manual delays.
            </p>
          </div>

          <div className="panel p-6 space-y-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Lock className="size-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">Zero Risk Guarantee</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every deposit and order balance is protected with atomic transactions. In the rare event
              an order cannot be completed, funds refund instantly.
            </p>
          </div>

          <div className="panel p-6 space-y-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
              <Globe className="size-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">Global Coverage</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fulfilling campaigns across Instagram, YouTube, TikTok, Telegram, X, Discord, Facebook,
              and LinkedIn worldwide.
            </p>
          </div>
        </div>

        <div className="panel p-8 sm:p-12 space-y-6">
          <h2 className="font-display text-2xl font-bold text-foreground">
            The NeoSMM Infrastructure Standard
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Traditional SMM panels frequently suffer from failed deliveries, locked balances, and
            unresponsive support. NeoSMM operates on modern cloud infrastructure with automated
            failover, verified quality providers, and strict SLAs.
          </p>
          <div className="pt-2">
            <Link
              to="/auth"
              search={{ mode: "register" }}
              className="brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              <span>Join NeoSMM Platform</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
