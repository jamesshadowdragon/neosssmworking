import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  ArrowRight,
  Sparkles,
  Zap,
  Filter,
  CheckCircle2,
  Layers,
  ChevronRight,
} from "lucide-react";
import { PublicShell, PageHeader } from "@/components/site/PublicShell";
import { listCatalog } from "@/lib/catalog.functions";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Services & Pricing Catalog — NeoSMM" },
      {
        name: "description",
        content:
          "Browse our complete catalog of social media marketing and growth services with transparent rates and fast delivery.",
      },
    ],
  }),
  component: ServicesCatalogPage,
});

function ServicesCatalogPage() {
  const fetchCatalog = useServerFn(listCatalog);
  const { data: catalog, isLoading } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => fetchCatalog(),
    staleTime: 60_000,
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = catalog?.categories ?? [];
  const services = catalog?.services ?? [];

  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      const matchesCategory =
        selectedCategory === "all" ||
        svc.category_id === selectedCategory ||
        svc.category_slug === selectedCategory;

      const matchesQuery =
        !searchQuery ||
        svc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (svc.short_description &&
          svc.short_description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (svc.description && svc.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesQuery;
    });
  }, [services, selectedCategory, searchQuery]);

  return (
    <PublicShell>
      <PageHeader
        eyebrow="Complete Catalog"
        title="Explore High-Speed Growth Services"
        description="Transparent rates, instant fulfillment dispatch, and dedicated order tracking across every major platform."
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 space-y-8">
        {/* Filter bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services by keyword..."
              className="w-full rounded-xl border border-border bg-card py-2.5 pr-4 pl-10 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Platforms
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors capitalize ${
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Services List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="panel h-48 animate-pulse p-6 bg-muted/40" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="panel p-12 text-center space-y-3">
            <p className="font-display font-bold text-lg text-foreground">No services found</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search keyword or selecting a different platform category.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((svc) => (
              <div
                key={svc.id}
                className="panel flex flex-col justify-between p-6 hover:border-primary/40 transition-all hover:shadow-lg space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary capitalize">
                      {svc.category_slug || "Service"}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {svc.delivery_time || "Instant Start"}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground line-clamp-1">
                    {svc.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {svc.short_description || svc.description}
                  </p>

                  {svc.features && Array.isArray(svc.features) && svc.features.length > 0 && (
                    <ul className="space-y-1.5 pt-1">
                      {svc.features.slice(0, 3).map((feat, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground"
                        >
                          <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                          <span className="truncate">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground">Rate</span>
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
                    <span>View Service</span>
                    <ChevronRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
