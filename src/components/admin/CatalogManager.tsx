import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Download, Loader2, Plus, Upload, X } from "lucide-react";
import {
  applyCatalogMarkup,
  bulkUpdateServices,
  deleteService,
  getCatalogAdmin,
  importServices,
  setStagedServiceStatus,
  saveCategory,
  saveProvider,
  saveService,
  stageVerifiedProviderCatalog,
  publishStagedServices,
} from "@/lib/catalog-admin.functions";
import { EmptyState, TableSkeleton } from "@/components/dashboard/DashboardShell";
import { formatCurrency, formatRate } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

const control =
  "w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40";

const emptyService = {
  category_id: "",
  slug: "",
  name: "",
  subcategory: "General",
  short_description: "",
  description: "",
  unit: "unit",
  price_per_unit: 0,
  rate_basis: 1000,
  min_quantity: 1,
  max_quantity: 10000,
  avg_start_time: "0-6 hours",
  delivery_time: "24-72 hours",
  refill_available: false,
  cancel_available: false,
  is_active: true,
  is_featured: false,
  is_archived: false,
  sort_order: 100,
  provider_id: "",
  provider_service_id: "",
  provider_cost: 0,
};

export function CatalogManager() {
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getCatalogAdmin);
  const saveServiceFn = useServerFn(saveService);
  const bulkFn = useServerFn(bulkUpdateServices);
  const deleteFn = useServerFn(deleteService);
  const saveCategoryFn = useServerFn(saveCategory);
  const saveProviderFn = useServerFn(saveProvider);
  const importFn = useServerFn(importServices);
  const stageFn = useServerFn(stageVerifiedProviderCatalog);
  const stageStatusFn = useServerFn(setStagedServiceStatus);
  const publishFn = useServerFn(publishStagedServices);
  const fileRef = useRef<HTMLInputElement>(null);
  const sourceFileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["catalog-admin"],
    queryFn: () => loadFn(),
    retry: false,
  });

  const [view, setView] = useState<"services" | "categories" | "providers" | "import / sync">(
    "services",
  );
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [editingCategory, setEditingCategory] = useState<AnyRow | null>(null);
  const [editingProvider, setEditingProvider] = useState<AnyRow | null>(null);
  const [multiplier, setMultiplier] = useState("1.00");
  const [sourceProviderId, setSourceProviderId] = useState("");
  const [stageReport, setStageReport] = useState<AnyRow | null>(null);
  const [selectedStaged, setSelectedStaged] = useState<string[]>([]);
  const [publishCategoryId, setPublishCategoryId] = useState("");
  const [archiveProvisional, setArchiveProvisional] = useState(false);
  const [publishReport, setPublishReport] = useState<AnyRow | null>(null);
  const [markupPercent, setMarkupPercent] = useState("150");
  const [markupMode, setMarkupMode] = useState<"increase_by" | "set_to">("increase_by");
  const [markupCategory, setMarkupCategory] = useState("");

  const categories: AnyRow[] = data?.categories ?? [];
  const services: AnyRow[] = data?.services ?? [];
  const providers: AnyRow[] = data?.providers ?? [];
  const staged: AnyRow[] = data?.staged ?? [];
  const syncRuns: AnyRow[] = (data as AnyRow)?.syncRuns ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["catalog-admin"] });
    queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };

  const markupFn = useServerFn(applyCatalogMarkup);
  const markupMutation = useMutation({
    mutationFn: () =>
      markupFn({
        data: {
          percent: Number(markupPercent),
          mode: markupMode,
          category_id: markupCategory || null,
        } as any,
      }),
    onSuccess: (result: AnyRow) => {
      toast.success(`Prices updated for ${Number(result.updated).toLocaleString()} services.`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const serviceMutation = useMutation({
    mutationFn: (payload: AnyRow) => saveServiceFn({ data: payload as any }),
    onSuccess: () => {
      toast.success("Service saved.");
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkMutation = useMutation({
    mutationFn: (patch: AnyRow) => bulkFn({ data: { ids: selected, patch } as any }),
    onSuccess: () => {
      toast.success("Services updated.");
      setSelected([]);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (vars: { id: string; hard?: boolean }) => deleteFn({ data: vars }),
    onSuccess: () => {
      toast.success("Service removed from the catalog.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categoryMutation = useMutation({
    mutationFn: (payload: AnyRow) => saveCategoryFn({ data: payload as any }),
    onSuccess: () => {
      toast.success("Category saved.");
      setEditingCategory(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const providerMutation = useMutation({
    mutationFn: (payload: AnyRow) => saveProviderFn({ data: payload as any }),
    onSuccess: () => {
      toast.success("Provider saved.");
      setEditingProvider(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: (rows: AnyRow[]) => importFn({ data: { rows } as any }),
    onSuccess: (result: any) => {
      toast.success(`${result.imported} services imported.`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stageMutation = useMutation({
    mutationFn: (rows: unknown[]) => stageFn({ data: { provider_id: sourceProviderId, rows } }),
    onSuccess: (result) => {
      setStageReport(result);
      toast.success(
        `${result.staged} verified source rows staged; the live catalog was not changed.`,
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      publishFn({
        data: {
          provider_id: sourceProviderId,
          default_category_id: publishCategoryId,
          archive_provisional: archiveProvisional,
        },
      }),
    onSuccess: (result) => {
      setPublishReport(result as AnyRow);
      toast.success(
        `${result.published} source services published (${result.created} new, ${result.updated} updated). Order history untouched.`,
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stageStatusMutation = useMutation({
    mutationFn: (status: "staged" | "approved" | "rejected") =>
      stageStatusFn({ data: { ids: selectedStaged, status } }),
    onSuccess: (result) => {
      toast.success(`${result.updated} staged rows updated. No live services were activated.`);
      setSelectedStaged([]);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return services
      .filter((s) => (categoryFilter ? s.category_id === categoryFilter : true))
      .filter((s) =>
        term
          ? `${s.name} ${s.slug} ${s.subcategory} ${s.service_code}`.toLowerCase().includes(term)
          : true,
      );
  }, [services, search, categoryFilter]);

  function exportCatalog() {
    const rows = filtered.map((s) => ({
      category_id: s.category_id,
      slug: s.slug,
      name: s.name,
      subcategory: s.subcategory,
      short_description: s.short_description,
      description: s.description,
      unit: s.unit,
      price_per_unit: Number(s.price_per_unit),
      rate_basis: Number(s.rate_basis ?? 1),
      min_quantity: s.min_quantity,
      max_quantity: s.max_quantity,
      avg_start_time: s.avg_start_time,
      delivery_time: s.delivery_time,
      refill_available: s.refill_available,
      cancel_available: s.cancel_available,
      is_active: s.is_active,
      is_featured: s.is_featured,
      is_archived: s.is_archived,
      sort_order: s.sort_order,
      provider_id: s.provider_id,
      provider_service_id: s.provider_service_id,
      provider_cost: Number(s.provider_cost ?? 0),
    }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neo-mart-services-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("The file must contain a list of services.");
      importMutation.mutate(parsed);
    } catch (e) {
      toast.error((e as Error).message || "That file could not be read.");
    }
  }

  async function onSourceFile(file: File) {
    try {
      if (!sourceProviderId) throw new Error("Choose the source provider first.");
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed))
        throw new Error("The authorized source file must contain a JSON list.");
      stageMutation.mutate(parsed);
    } catch (e) {
      toast.error((e as Error).message || "That source file could not be read.");
    }
  }

  if (error)
    return <EmptyState title="Couldn't load the catalog" body={(error as Error).message} />;
  if (isLoading) return <TableSkeleton rows={8} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["services", "categories", "providers", "import / sync"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
              view === v
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "services" && (
        <>
          <div className="panel space-y-3 p-4">
            <div>
              <h3 className="font-display text-sm font-semibold">Bulk price adjustment</h3>
              <p className="text-xs text-muted-foreground">
                Changes the selling rate of live services. Existing orders keep the price they were
                originally charged.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-muted-foreground">
                Action
                <select
                  value={markupMode}
                  onChange={(e) => setMarkupMode(e.target.value as "increase_by" | "set_to")}
                  className={`${control} mt-1 w-56`}
                >
                  <option value="increase_by">Increase prices by</option>
                  <option value="set_to">Set prices to</option>
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                Percent
                <input
                  type="number"
                  min="0.01"
                  step="1"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(e.target.value)}
                  className={`${control} mt-1 w-32`}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Apply to
                <select
                  value={markupCategory}
                  onChange={(e) => setMarkupCategory(e.target.value)}
                  className={`${control} mt-1 w-56`}
                >
                  <option value="">Every service</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={markupMutation.isPending || !(Number(markupPercent) > 0)}
                onClick={() => {
                  const factor =
                    markupMode === "increase_by"
                      ? 1 + Number(markupPercent) / 100
                      : Number(markupPercent) / 100;
                  if (
                    !window.confirm(
                      `Multiply every affected service price by ${factor.toFixed(2)}× ? This cannot be undone automatically.`,
                    )
                  )
                    return;
                  markupMutation.mutate();
                }}
                className="brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {markupMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Apply
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {Number(markupPercent) > 0
                ? `Every affected price will be multiplied by ${(markupMode === "increase_by"
                    ? 1 + Number(markupPercent) / 100
                    : Number(markupPercent) / 100
                  ).toFixed(2)}×.`
                : "Enter a percentage above zero."}
            </p>
          </div>

          <div className="panel flex flex-wrap items-center gap-3 p-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, slug or ID"
              className={`${control} min-w-[200px] flex-1`}
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`${control} w-52`}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setEditing({ ...emptyService, category_id: categories[0]?.id ?? "" })}
              className="brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="size-4" /> New service
            </button>
            <button
              type="button"
              onClick={exportCatalog}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              <Download className="size-4" /> Export
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              <Upload className="size-4" /> Import NeoSMM JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImportFile(file);
                e.target.value = "";
              }}
            />
          </div>

          {selected.length > 0 && (
            <div className="panel flex flex-wrap items-center gap-2 p-4 text-sm">
              <span className="font-medium">{selected.length} selected</span>
              <button
                className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent"
                onClick={() => bulkMutation.mutate({ is_active: true, is_archived: false })}
              >
                Enable
              </button>
              <button
                className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent"
                onClick={() => bulkMutation.mutate({ is_active: false })}
              >
                Disable
              </button>
              <button
                className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent"
                onClick={() => bulkMutation.mutate({ is_featured: true })}
              >
                Feature
              </button>
              <button
                className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent"
                onClick={() => bulkMutation.mutate({ is_archived: true, is_active: false })}
              >
                Archive
              </button>
              <span className="ml-2 flex items-center gap-2">
                <input
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value)}
                  className="w-20 rounded-lg border border-input bg-card px-2 py-1 text-xs"
                />
                <button
                  className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent"
                  onClick={() => {
                    const value = Number(multiplier);
                    if (!value || value <= 0) {
                      toast.error("Enter a price multiplier above 0.");
                      return;
                    }
                    bulkMutation.mutate({ price_multiplier: value });
                  }}
                >
                  Apply price ×
                </button>
              </span>
              <button
                className="ml-auto text-xs text-muted-foreground hover:underline"
                onClick={() => setSelected([])}
              >
                Clear
              </button>
            </div>
          )}

          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.length > 0 && selected.length === filtered.length}
                      onChange={(e) =>
                        setSelected(e.target.checked ? filtered.map((s) => s.id) : [])
                      }
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">ID</th>
                  <th className="px-3 py-3 font-medium">Service</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Price</th>
                  <th className="px-3 py-3 font-medium">Min / Max</th>
                  <th className="px-3 py-3 font-medium">Provider</th>
                  <th className="px-3 py-3 font-medium">State</th>
                  <th className="px-3 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s) => (
                  <tr key={s.id} className={s.is_archived ? "opacity-50" : undefined}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(s.id)}
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                      {s.service_code}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.subcategory}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {categories.find((c) => c.id === s.category_id)?.name ?? "—"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {formatRate(s.price_per_unit, s.rate_basis, s.unit)}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {s.min_quantity.toLocaleString()} / {s.max_quantity.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {s.provider_id
                        ? (providers.find((p) => p.id === s.provider_id)?.name ?? "Provider")
                        : "Manual"}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {s.is_archived ? "Archived" : s.is_active ? "Live" : "Disabled"}
                      {s.is_featured && <span className="ml-1 text-primary">★</span>}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <button
                        className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-accent"
                        onClick={() =>
                          setEditing({
                            ...s,
                            price_per_unit: Number(s.price_per_unit),
                            provider_cost: Number(s.provider_cost ?? 0),
                            provider_id: s.provider_id ?? "",
                            provider_service_id: s.provider_service_id ?? "",
                            short_description: s.short_description ?? "",
                            description: s.description ?? "",
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="ml-2 rounded-lg border border-border px-3 py-1 text-xs text-destructive hover:bg-accent"
                        onClick={() => deleteMutation.mutate({ id: s.id })}
                      >
                        Archive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === "categories" && (
        <>
          <button
            type="button"
            onClick={() =>
              setEditingCategory({
                slug: "",
                name: "",
                tagline: "",
                description: "",
                icon: "sparkles",
                accent: "blue",
                kind: "platform",
                sort_order: 100,
                is_active: true,
              })
            }
            className="brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> New category
          </button>
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Kind</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Services</th>
                  <th className="px-4 py-3 font-medium">State</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{c.kind}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.sort_order}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {services.filter((s) => s.category_id === c.id).length}
                    </td>
                    <td className="px-4 py-3 text-xs">{c.is_active ? "Live" : "Hidden"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-accent"
                        onClick={() =>
                          setEditingCategory({
                            ...c,
                            tagline: c.tagline ?? "",
                            description: c.description ?? "",
                          })
                        }
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === "providers" && (
        <>
          <div className="panel p-5 text-sm text-muted-foreground">
            Providers are the third-party marketing suppliers NeoSMM can route orders to. Store the
            mapping here; API keys live in server-side secrets only and are never sent to customers.
            Services without a connected provider stay marked as manual fulfilment.
          </div>
          <button
            type="button"
            onClick={() =>
              setEditingProvider({
                name: "",
                slug: "",
                api_url: "",
                secret_name: "",
                notes: "",
                status: "disconnected",
                is_active: false,
              })
            }
            className="brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> New provider
          </button>
          {providers.length === 0 ? (
            <EmptyState
              title="No providers connected"
              body="Every service is fulfilled manually by the NeoSMM team until a provider is added and connected."
            />
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Provider</th>
                    <th className="px-4 py-3 font-medium">API</th>
                    <th className="px-4 py-3 font-medium">Secret</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Mapped services</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {providers.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-xs text-muted-foreground">
                        {p.api_url ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {p.secret_name ?? "Not set"}
                      </td>
                      <td className="px-4 py-3 text-xs capitalize">{p.status}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {services.filter((s) => s.provider_id === p.id).length}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-accent"
                          onClick={() =>
                            setEditingProvider({
                              ...p,
                              api_url: p.api_url ?? "",
                              secret_name: p.secret_name ?? "",
                              notes: p.notes ?? "",
                            })
                          }
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === "import / sync" && (
        <div className="space-y-4">
          <div className="panel border-warning/40 bg-warning/5 p-5">
            <h3 className="font-semibold">Current catalog provenance</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Provisional NeoSMM services</p>
                <p className="font-display text-xl font-semibold">
                  {services.filter((s) => s.catalog_source !== "imported").length}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Imported from a source</p>
                <p className="font-display text-xl font-semibold">
                  {services.filter((s) => s.catalog_source === "imported").length}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Staged source rows</p>
                <p className="font-display text-xl font-semibold">{staged.length}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Provisional services are NeoSMM placeholders — their names, rates and quantity limits
              are ours, not any external panel&apos;s. To replace them, add the source as a
              provider, upload its authorized service export (JSON array with{" "}
              <code>service, name, category, rate, min, max</code> and optionally{" "}
              <code>
                rate_basis, unit, description, refill, cancel, average_start_time,
                average_delivery_time
              </code>
              ), review the staged rows, then publish. Publishing never edits existing orders — they
              keep the rate and total they were charged.
            </p>
          </div>

          <div className="panel p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 text-primary" />
              <div>
                <h3 className="font-semibold">1 · Stage an authorized export</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload only an authorized JSON response or export. Rows are validated and staged
                  for review; this cannot alter the live NeoSMM catalog or historical orders. Rates
                  are stored exactly as the source quotes them, with their own per-1,000 or per-unit
                  basis.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <select
                className={control}
                value={sourceProviderId}
                onChange={(e) => setSourceProviderId(e.target.value)}
              >
                <option value="">Choose source provider</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!sourceProviderId || stageMutation.isPending}
                onClick={() => sourceFileRef.current?.click()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/50 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                {stageMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}{" "}
                Stage authorized JSON
              </button>
              <input
                ref={sourceFileRef}
                className="hidden"
                type="file"
                accept="application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onSourceFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          {stageReport && (
            <div className="panel grid gap-3 p-5 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Accepted</p>
                <p className="font-display text-xl font-semibold">{stageReport.staged}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Failed rows</p>
                <p className="font-display text-xl font-semibold">{stageReport.failures.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Missing metadata</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {Object.entries(stageReport.missingMetadata)
                    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${value}`)
                    .join(" · ")}
                </p>
              </div>
              {stageReport.failures.length > 0 && (
                <div className="sm:col-span-3">
                  <p className="mb-1 text-xs font-medium text-destructive">Import failures</p>
                  <div className="max-h-32 overflow-y-auto rounded-md bg-destructive/5 p-3 font-mono text-xs">
                    {stageReport.failures.slice(0, 100).map((failure: AnyRow) => (
                      <p key={`${failure.row}-${failure.reason}`}>
                        Row {failure.row}: {failure.reason}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {selectedStaged.length > 0 && (
            <div className="panel flex flex-wrap items-center gap-2 p-4 text-sm">
              <span>{selectedStaged.length} selected</span>
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1.5 text-xs"
                onClick={() => stageStatusMutation.mutate("approved")}
              >
                Mark reviewed
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1.5 text-xs"
                onClick={() => stageStatusMutation.mutate("rejected")}
              >
                Reject
              </button>
              <span className="text-xs text-muted-foreground">
                Review status never activates a live service.
              </span>
            </div>
          )}
          {staged.length === 0 ? (
            <EmptyState
              title="No source rows staged"
              body="An authorized JShopSMM API response or export is still required."
            />
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedStaged.length === staged.length && staged.length > 0}
                        onChange={(e) =>
                          setSelectedStaged(e.target.checked ? staged.map((row) => row.id) : [])
                        }
                      />
                    </th>
                    <th className="px-4 py-3">Source ID</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Range</th>
                    <th className="px-4 py-3">Metadata</th>
                    <th className="px-4 py-3">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {staged.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedStaged.includes(row.id)}
                          onChange={(e) =>
                            setSelectedStaged(
                              e.target.checked
                                ? [...selectedStaged, row.id]
                                : selectedStaged.filter((id) => id !== row.id),
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{row.provider_service_id}</td>
                      <td className="max-w-[280px] px-4 py-3 font-medium">{row.source_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.source_category}</td>
                      <td className="px-4 py-3">
                        {formatCurrency(row.source_rate)}
                        <span className="block text-[11px] text-muted-foreground">
                          {Number(row.source_rate_basis) === 1 ? "per unit" : "per 1,000"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {row.min_quantity.toLocaleString()}–{row.max_quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        Refill{" "}
                        {row.refill_available == null ? "?" : row.refill_available ? "yes" : "no"} ·
                        Cancel{" "}
                        {row.cancel_available == null ? "?" : row.cancel_available ? "yes" : "no"}
                      </td>
                      <td className="px-4 py-3 text-xs capitalize">{row.sync_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="panel p-5">
            <h3 className="font-semibold">2 · Publish reviewed rows into the live catalog</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Only rows you marked reviewed are published. Each service keeps the source&apos;s own
              ID, rate, rate basis, minimum, maximum and metadata. Fields the source never published
              are stored as &quot;Not published by source&quot; — nothing is invented. Fulfilment
              stays manual until a provider order API is configured and tested.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                className={control}
                value={publishCategoryId}
                onChange={(e) => setPublishCategoryId(e.target.value)}
              >
                <option value="">Fallback category for new services</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <label className="flex shrink-0 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={archiveProvisional}
                  onChange={(e) => setArchiveProvisional(e.target.checked)}
                />
                Archive provisional NeoSMM services
              </label>
              <button
                type="button"
                disabled={
                  !sourceProviderId ||
                  !publishCategoryId ||
                  publishMutation.isPending ||
                  staged.filter((r) => r.sync_status === "approved").length === 0
                }
                onClick={() => publishMutation.mutate()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {publishMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Publish reviewed rows
              </button>
            </div>
            {publishReport && (
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                {(
                  [
                    ["Published", publishReport.published],
                    ["Created", publishReport.created],
                    ["Updated", publishReport.updated],
                    ["Archived provisional", publishReport.archived],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-display text-xl font-semibold">{value as number}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {syncRuns.length > 0 && (
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Received</th>
                    <th className="px-4 py-3">Accepted</th>
                    <th className="px-4 py-3">Failed</th>
                    <th className="px-4 py-3">Created / updated / archived</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {syncRuns.map((run) => (
                    <tr key={run.id}>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(run.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 capitalize">{run.kind}</td>
                      <td className="px-4 py-3">{run.source_label}</td>
                      <td className="px-4 py-3">{run.rows_received}</td>
                      <td className="px-4 py-3">{run.rows_accepted}</td>
                      <td className="px-4 py-3">{run.rows_failed}</td>
                      <td className="px-4 py-3 text-xs">
                        {run.services_created} / {run.services_updated} / {run.services_archived}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editing && (
        <Drawer
          title={editing.id ? "Edit service" : "New service"}
          onClose={() => setEditing(null)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              serviceMutation.mutate({
                ...(editing.id ? { id: editing.id } : {}),
                category_id: editing.category_id,
                slug: editing.slug,
                name: editing.name,
                subcategory: editing.subcategory,
                short_description: editing.short_description || null,
                description: editing.description || null,
                unit: editing.unit,
                price_per_unit: Number(editing.price_per_unit),
                rate_basis: Number(editing.rate_basis) === 1000 ? 1000 : 1,
                min_quantity: Number(editing.min_quantity),
                max_quantity: Number(editing.max_quantity),
                avg_start_time: editing.avg_start_time,
                delivery_time: editing.delivery_time,
                refill_available: !!editing.refill_available,
                cancel_available: !!editing.cancel_available,
                is_active: !!editing.is_active,
                is_featured: !!editing.is_featured,
                is_archived: !!editing.is_archived,
                sort_order: Number(editing.sort_order),
                provider_id: editing.provider_id || null,
                provider_service_id: editing.provider_service_id || null,
                provider_cost: Number(editing.provider_cost || 0),
              });
            }}
          >
            <Field label="Name">
              <input
                required
                className={control}
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Slug (URL)">
                <input
                  required
                  className={control}
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                />
              </Field>
              <Field label="Subcategory">
                <input
                  required
                  className={control}
                  value={editing.subcategory}
                  onChange={(e) => setEditing({ ...editing, subcategory: e.target.value })}
                />
              </Field>
              <Field label="Platform / section">
                <select
                  className={control}
                  value={editing.category_id}
                  onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Unit">
                <input
                  required
                  className={control}
                  value={editing.unit}
                  onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                />
              </Field>
              <Field label="Rate (USD, exactly as the source quotes it)">
                <input
                  required
                  type="number"
                  step="0.0001"
                  className={control}
                  value={editing.price_per_unit}
                  onChange={(e) => setEditing({ ...editing, price_per_unit: e.target.value })}
                />
              </Field>
              <Field label="Rate applies to">
                <select
                  className={control}
                  value={String(editing.rate_basis ?? 1)}
                  onChange={(e) => setEditing({ ...editing, rate_basis: Number(e.target.value) })}
                >
                  <option value="1000">Per 1,000 units</option>
                  <option value="1">Per single unit</option>
                </select>
              </Field>
              <Field label="Sort order">
                <input
                  type="number"
                  className={control}
                  value={editing.sort_order}
                  onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })}
                />
              </Field>
              <Field label="Minimum quantity">
                <input
                  required
                  type="number"
                  className={control}
                  value={editing.min_quantity}
                  onChange={(e) => setEditing({ ...editing, min_quantity: e.target.value })}
                />
              </Field>
              <Field label="Maximum quantity">
                <input
                  required
                  type="number"
                  className={control}
                  value={editing.max_quantity}
                  onChange={(e) => setEditing({ ...editing, max_quantity: e.target.value })}
                />
              </Field>
              <Field label="Average start time">
                <input
                  required
                  className={control}
                  value={editing.avg_start_time}
                  onChange={(e) => setEditing({ ...editing, avg_start_time: e.target.value })}
                />
              </Field>
              <Field label="Average delivery time">
                <input
                  required
                  className={control}
                  value={editing.delivery_time}
                  onChange={(e) => setEditing({ ...editing, delivery_time: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Short description">
              <input
                className={control}
                value={editing.short_description}
                onChange={(e) => setEditing({ ...editing, short_description: e.target.value })}
              />
            </Field>
            <Field label="Full description">
              <textarea
                rows={4}
                className={control}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Provider">
                <select
                  className={control}
                  value={editing.provider_id}
                  onChange={(e) => setEditing({ ...editing, provider_id: e.target.value })}
                >
                  <option value="">Manual fulfilment</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Provider service ID">
                <input
                  className={control}
                  value={editing.provider_service_id}
                  onChange={(e) => setEditing({ ...editing, provider_service_id: e.target.value })}
                />
              </Field>
              <Field label="Provider cost per unit (USD)">
                <input
                  type="number"
                  step="0.0001"
                  className={control}
                  value={editing.provider_cost}
                  onChange={(e) => setEditing({ ...editing, provider_cost: e.target.value })}
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <Toggle
                label="Refill available"
                checked={!!editing.refill_available}
                onChange={(v) => setEditing({ ...editing, refill_available: v })}
              />
              <Toggle
                label="Cancellation available"
                checked={!!editing.cancel_available}
                onChange={(v) => setEditing({ ...editing, cancel_available: v })}
              />
              <Toggle
                label="Enabled"
                checked={!!editing.is_active}
                onChange={(v) => setEditing({ ...editing, is_active: v })}
              />
              <Toggle
                label="Featured"
                checked={!!editing.is_featured}
                onChange={(v) => setEditing({ ...editing, is_featured: v })}
              />
              <Toggle
                label="Archived"
                checked={!!editing.is_archived}
                onChange={(v) => setEditing({ ...editing, is_archived: v })}
              />
            </div>

            <SubmitRow pending={serviceMutation.isPending} onCancel={() => setEditing(null)} />
          </form>
        </Drawer>
      )}

      {editingCategory && (
        <Drawer
          title={editingCategory.id ? "Edit category" : "New category"}
          onClose={() => setEditingCategory(null)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              categoryMutation.mutate({
                ...(editingCategory.id ? { id: editingCategory.id } : {}),
                slug: editingCategory.slug,
                name: editingCategory.name,
                tagline: editingCategory.tagline || null,
                description: editingCategory.description || null,
                icon: editingCategory.icon,
                accent: editingCategory.accent,
                kind: editingCategory.kind,
                sort_order: Number(editingCategory.sort_order),
                is_active: !!editingCategory.is_active,
              });
            }}
          >
            <Field label="Name">
              <input
                required
                className={control}
                value={editingCategory.name}
                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Slug">
                <input
                  required
                  className={control}
                  value={editingCategory.slug}
                  onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                />
              </Field>
              <Field label="Kind">
                <select
                  className={control}
                  value={editingCategory.kind}
                  onChange={(e) => setEditingCategory({ ...editingCategory, kind: e.target.value })}
                >
                  <option value="platform">Platform</option>
                  <option value="solution">Solution</option>
                </select>
              </Field>
              <Field label="Icon">
                <input
                  className={control}
                  value={editingCategory.icon}
                  onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                />
              </Field>
              <Field label="Sort order">
                <input
                  type="number"
                  className={control}
                  value={editingCategory.sort_order}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, sort_order: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Tagline">
              <input
                className={control}
                value={editingCategory.tagline}
                onChange={(e) =>
                  setEditingCategory({ ...editingCategory, tagline: e.target.value })
                }
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={3}
                className={control}
                value={editingCategory.description}
                onChange={(e) =>
                  setEditingCategory({ ...editingCategory, description: e.target.value })
                }
              />
            </Field>
            <Toggle
              label="Visible in the catalog"
              checked={!!editingCategory.is_active}
              onChange={(v) => setEditingCategory({ ...editingCategory, is_active: v })}
            />
            <SubmitRow
              pending={categoryMutation.isPending}
              onCancel={() => setEditingCategory(null)}
            />
          </form>
        </Drawer>
      )}

      {editingProvider && (
        <Drawer
          title={editingProvider.id ? "Edit provider" : "New provider"}
          onClose={() => setEditingProvider(null)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              providerMutation.mutate({
                ...(editingProvider.id ? { id: editingProvider.id } : {}),
                name: editingProvider.name,
                slug: editingProvider.slug,
                api_url: editingProvider.api_url || null,
                secret_name: editingProvider.secret_name || null,
                notes: editingProvider.notes || null,
                status: editingProvider.status,
                is_active: !!editingProvider.is_active,
              });
            }}
          >
            <Field label="Provider name">
              <input
                required
                className={control}
                value={editingProvider.name}
                onChange={(e) => setEditingProvider({ ...editingProvider, name: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Slug">
                <input
                  required
                  className={control}
                  value={editingProvider.slug}
                  onChange={(e) => setEditingProvider({ ...editingProvider, slug: e.target.value })}
                />
              </Field>
              <Field label="Status">
                <select
                  className={control}
                  value={editingProvider.status}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, status: e.target.value })
                  }
                >
                  <option value="disconnected">Disconnected</option>
                  <option value="testing">Testing</option>
                  <option value="connected">Connected</option>
                </select>
              </Field>
            </div>
            <Field label="API endpoint">
              <input
                className={control}
                placeholder="https://provider.example/api/v2"
                value={editingProvider.api_url}
                onChange={(e) =>
                  setEditingProvider({ ...editingProvider, api_url: e.target.value })
                }
              />
            </Field>
            <Field label="Secret name (API key is stored in server secrets, not here)">
              <input
                className={control}
                placeholder="PROVIDER_API_KEY"
                value={editingProvider.secret_name}
                onChange={(e) =>
                  setEditingProvider({ ...editingProvider, secret_name: e.target.value })
                }
              />
            </Field>
            <Field label="Notes">
              <textarea
                rows={3}
                className={control}
                value={editingProvider.notes}
                onChange={(e) => setEditingProvider({ ...editingProvider, notes: e.target.value })}
              />
            </Field>
            <Toggle
              label="Active"
              checked={!!editingProvider.is_active}
              onChange={(v) => setEditingProvider({ ...editingProvider, is_active: v })}
            />
            <SubmitRow
              pending={providerMutation.isPending}
              onCancel={() => setEditingProvider(null)}
            />
          </form>
        </Drawer>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function SubmitRow({ pending, onCancel }: { pending: boolean; onCancel: () => void }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={pending}
        className="brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />} Save
      </button>
    </div>
  );
}

function Drawer({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-sm">
      <div className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border p-1.5 hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
