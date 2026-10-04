import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
  name: z.string().min(2).max(160),
  subcategory: z.string().min(2).max(80),
  short_description: z.string().max(300).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  unit: z.string().min(1).max(40),
  price_per_unit: z.number().nonnegative(),
  rate_basis: z.union([z.literal(1), z.literal(1000)]).optional(),
  min_quantity: z.number().int().positive(),
  max_quantity: z.number().int().positive(),
  avg_start_time: z.string().min(1).max(80),
  delivery_time: z.string().min(1).max(80),
  refill_available: z.boolean(),
  cancel_available: z.boolean(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  is_archived: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(100000),
  provider_id: z.string().uuid().nullable().optional(),
  provider_service_id: z.string().max(120).nullable().optional(),
  provider_cost: z.number().nonnegative().optional(),
  fulfilment_mode: z.enum(["manual", "provider"]).optional(),
});

export const getCatalogAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;
    // PostgREST caps a single response at 1000 rows, so page through the catalog.
    const allServices: unknown[] = [];
    for (let from = 0; from < 20000; from += 1000) {
      const { data: page, error } = await supabase
        .from("services")
        .select("*")
        .order("sort_order", { ascending: true })
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      allServices.push(...(page ?? []));
      if (!page || page.length < 1000) break;
    }
    const [categories, services, providers, staged, syncRuns] = await Promise.all([
      supabase.from("service_categories").select("*").order("sort_order", { ascending: true }),
      Promise.resolve({ data: allServices as never[], error: null }),
      supabase.from("providers").select("*").order("name", { ascending: true }),
      supabase
        .from("provider_services")
        .select("*")
        .order("last_seen_at", { ascending: false })
        .limit(3000),
      supabase
        .from("catalog_sync_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
    return {
      categories: categories.data ?? [],
      services: services.data ?? [],
      providers: providers.data ?? [],
      staged: staged.data ?? [],
      syncRuns: syncRuns.data ?? [],
    };
  });

export const saveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => serviceSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.max_quantity < data.min_quantity) {
      throw new Error("Maximum quantity must be greater than the minimum.");
    }
    const { id, ...fields } = data;
    const payload = {
      ...fields,
      provider_id: fields.provider_id ?? null,
      provider_service_id: fields.provider_service_id || null,
      provider_cost: fields.provider_cost ?? 0,
      fulfilment_mode: fields.provider_id ? (fields.fulfilment_mode ?? "provider") : "manual",
    };

    if (id) {
      const { error } = await context.supabase
        .from("services")
        .update(payload as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await context.supabase
      .from("services")
      .insert(payload as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const bulkUpdateServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(500),
        patch: z.object({
          is_active: z.boolean().optional(),
          is_archived: z.boolean().optional(),
          is_featured: z.boolean().optional(),
          refill_available: z.boolean().optional(),
          cancel_available: z.boolean().optional(),
          category_id: z.string().uuid().optional(),
          subcategory: z.string().min(2).max(80).optional(),
          delivery_time: z.string().min(1).max(80).optional(),
          avg_start_time: z.string().min(1).max(80).optional(),
          price_multiplier: z.number().positive().max(100).optional(),
        }),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { price_multiplier, ...patch } = data.patch;

    if (Object.keys(patch).length > 0) {
      const { error } = await context.supabase
        .from("services")
        .update(patch as never)
        .in("id", data.ids);
      if (error) throw new Error(error.message);
    }

    if (price_multiplier) {
      const { data: rows, error } = await context.supabase
        .from("services")
        .select("id, price_per_unit")
        .in("id", data.ids);
      if (error) throw new Error(error.message);
      for (const row of rows ?? []) {
        const next = Math.round(Number(row.price_per_unit) * price_multiplier * 10000) / 10000;
        const { error: updateError } = await context.supabase
          .from("services")
          .update({ price_per_unit: next })
          .eq("id", row.id);
        if (updateError) throw new Error(updateError.message);
      }
    }

    return { updated: data.ids.length };
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), hard: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    if (data.hard) {
      const { count, error: countError } = await context.supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("service_id", data.id);
      if (countError) throw new Error(countError.message);
      if ((count ?? 0) > 0) {
        throw new Error("This service has orders attached — archive it instead of deleting.");
      }
      const { error } = await context.supabase.from("services").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
      return { deleted: true };
    }

    const { error } = await context.supabase
      .from("services")
      .update({ is_archived: true, is_active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { archived: true };
  });

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        slug: z
          .string()
          .min(2)
          .max(80)
          .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
        name: z.string().min(2).max(120),
        tagline: z.string().max(200).optional().nullable(),
        description: z.string().max(2000).optional().nullable(),
        icon: z.string().min(1).max(60),
        accent: z.string().min(1).max(30),
        kind: z.enum(["platform", "solution"]),
        sort_order: z.number().int().min(0).max(10000),
        is_active: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...fields } = data;
    if (id) {
      const { error } = await context.supabase
        .from("service_categories")
        .update(fields as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await context.supabase
      .from("service_categories")
      .insert(fields as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const saveProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(2).max(120),
        slug: z
          .string()
          .min(2)
          .max(80)
          .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
        api_url: z.string().url().max(300).optional().nullable(),
        secret_name: z.string().max(120).optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
        status: z.enum(["disconnected", "testing", "connected"]),
        is_active: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...fields } = data;
    if (id) {
      const { error } = await context.supabase
        .from("providers")
        .update(fields as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await context.supabase
      .from("providers")
      .insert(fields as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const importServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        rows: z
          .array(serviceSchema.omit({ id: true }))
          .min(1)
          .max(500),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const rows = data.rows.map((r) => ({
      ...r,
      provider_id: r.provider_id ?? null,
      provider_service_id: r.provider_service_id || null,
      provider_cost: r.provider_cost ?? 0,
      fulfilment_mode: r.provider_id ? (r.fulfilment_mode ?? "provider") : "manual",
    }));
    const { error } = await context.supabase
      .from("services")
      .upsert(rows as never, { onConflict: "slug" });
    if (error) throw new Error(error.message);
    return { imported: rows.length };
  });

const verifiedSourceRowSchema = z.object({
  service: z.union([z.string(), z.number()]).transform(String),
  name: z.string().trim().min(2).max(300),
  type: z.string().trim().min(1).max(80),
  category: z.string().trim().min(2).max(200),
  rate: z.union([z.string(), z.number()]).transform(Number).refine(Number.isFinite),
  // SMM panel APIs quote `rate` per 1,000 units unless the export says otherwise.
  rate_basis: z.union([z.literal(1), z.literal(1000)]).optional(),
  min: z.union([z.string(), z.number()]).transform(Number).pipe(z.number().int().positive()),
  max: z.union([z.string(), z.number()]).transform(Number).pipe(z.number().int().positive()),
  unit: z.string().trim().min(1).max(40).optional(),
  refill: z.boolean().optional(),
  cancel: z.boolean().optional(),
  description: z.string().max(4000).optional(),
  average_start_time: z.string().max(80).optional(),
  average_delivery_time: z.string().max(80).optional(),
});

export const stageVerifiedProviderCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ provider_id: z.string().uuid(), rows: z.array(z.unknown()).min(1).max(3000) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: provider, error: providerError } = await context.supabase
      .from("providers")
      .select("id, name")
      .eq("id", data.provider_id)
      .maybeSingle();
    if (providerError) throw new Error(providerError.message);
    if (!provider) throw new Error("Choose a configured source before staging services.");

    const accepted: Array<Record<string, unknown>> = [];
    const failures: Array<{ row: number; reason: string }> = [];
    const missingMetadata = {
      description: 0,
      average_start_time: 0,
      average_delivery_time: 0,
      refill: 0,
      cancel: 0,
    };
    const seen = new Set<string>();

    data.rows.forEach((raw, index) => {
      const parsed = verifiedSourceRowSchema.safeParse(raw);
      if (!parsed.success) {
        failures.push({
          row: index + 1,
          reason: parsed.error.issues[0]?.message ?? "Invalid source row",
        });
        return;
      }
      const row = parsed.data;
      if (seen.has(row.service)) {
        failures.push({ row: index + 1, reason: `Duplicate source service ID ${row.service}` });
        return;
      }
      seen.add(row.service);
      if (row.max < row.min) {
        failures.push({ row: index + 1, reason: "Maximum quantity is below minimum quantity" });
        return;
      }
      if (!row.description) missingMetadata.description += 1;
      if (!row.average_start_time) missingMetadata.average_start_time += 1;
      if (!row.average_delivery_time) missingMetadata.average_delivery_time += 1;
      if (row.refill === undefined) missingMetadata.refill += 1;
      if (row.cancel === undefined) missingMetadata.cancel += 1;
      accepted.push({
        provider_id: data.provider_id,
        provider_service_id: row.service,
        source_name: row.name,
        source_category: row.category,
        source_type: row.type,
        source_rate: row.rate,
        source_rate_basis: row.rate_basis ?? 1000,
        source_unit: row.unit ?? null,
        source_description: row.description ?? null,
        source_start_time: row.average_start_time ?? null,
        source_delivery_time: row.average_delivery_time ?? null,
        min_quantity: row.min,
        max_quantity: row.max,
        refill_available: row.refill ?? null,
        cancel_available: row.cancel ?? null,
        raw_payload: raw,
        sync_status: "staged",
        last_seen_at: new Date().toISOString(),
      });
    });

    const logRun = async (rowsAccepted: number) => {
      await context.supabase.from("catalog_sync_runs").insert({
        provider_id: data.provider_id,
        actor_id: context.userId,
        kind: "stage",
        source_label: provider.name,
        rows_received: data.rows.length,
        rows_accepted: rowsAccepted,
        rows_failed: failures.length,
        report: { failures: failures.slice(0, 200), missingMetadata },
      } as never);
    };

    if (accepted.length === 0) {
      await logRun(0);
      return { staged: 0, failures, missingMetadata, provider: provider.name };
    }
    const { error } = await context.supabase
      .from("provider_services")
      .upsert(accepted as never, { onConflict: "provider_id,provider_service_id" });
    if (error) throw new Error(error.message);
    await logRun(accepted.length);
    return { staged: accepted.length, failures, missingMetadata, provider: provider.name };
  });

export const setStagedServiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(500),
        status: z.enum(["staged", "approved", "rejected"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("provider_services")
      .update({ sync_status: data.status })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { updated: data.ids.length };
  });

export const publishStagedServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        provider_id: z.string().uuid(),
        default_category_id: z.string().uuid(),
        archive_provisional: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabase } = context;

    const [{ data: provider }, { data: staged, error: stagedError }] = await Promise.all([
      supabase.from("providers").select("id, name, slug").eq("id", data.provider_id).maybeSingle(),
      supabase
        .from("provider_services")
        .select("*")
        .eq("provider_id", data.provider_id)
        .eq("sync_status", "approved")
        .limit(3000),
    ]);
    if (stagedError) throw new Error(stagedError.message);
    if (!provider) throw new Error("Choose a configured source first.");
    if (!staged || staged.length === 0) {
      throw new Error("No approved source rows to publish. Review and approve staged rows first.");
    }

    const { data: existing, error: existingError } = await supabase
      .from("services")
      .select("id, source_service_id, service_code, slug, catalog_source")
      .limit(5000);
    if (existingError) throw new Error(existingError.message);

    const bySourceId = new Map(
      (existing ?? [])
        .filter((s: any) => s.source_service_id)
        .map((s: any) => [String(s.source_service_id), s]),
    );
    const usedCodes = new Set((existing ?? []).map((s: any) => Number(s.service_code)));
    const usedSlugs = new Set((existing ?? []).map((s: any) => String(s.slug)));
    let nextCode = Math.max(0, ...Array.from(usedCodes)) + 1;

    const slugify = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 100) || "service";

    let created = 0;
    let updated = 0;
    const failures: Array<{ source_service_id: string; reason: string }> = [];
    const publishedSourceIds: string[] = [];

    for (const row of staged as any[]) {
      const sourceId = String(row.provider_service_id);
      const current = bySourceId.get(sourceId);
      const numericCode = Number(sourceId);
      let code = current?.service_code as number | undefined;
      if (!code) {
        code =
          Number.isInteger(numericCode) && numericCode > 0 && !usedCodes.has(numericCode)
            ? numericCode
            : nextCode++;
        usedCodes.add(code);
      }

      let slug = current?.slug as string | undefined;
      if (!slug) {
        const base = `${slugify(row.source_name)}-${sourceId}`;
        slug = base;
        let i = 2;
        while (usedSlugs.has(slug)) slug = `${base}-${i++}`;
        usedSlugs.add(slug);
      }

      const payload = {
        category_id: row.target_category_id ?? data.default_category_id,
        slug,
        service_code: code,
        name: row.source_name,
        subcategory: row.source_category,
        short_description: null,
        description: row.source_description ?? null,
        unit: row.source_unit ?? "unit",
        price_per_unit: Number(row.source_rate),
        rate_basis: Number(row.source_rate_basis) === 1 ? 1 : 1000,
        min_quantity: row.min_quantity,
        max_quantity: row.max_quantity,
        avg_start_time: row.source_start_time ?? "Not published by source",
        delivery_time: row.source_delivery_time ?? "Not published by source",
        refill_available: row.refill_available ?? false,
        cancel_available: row.cancel_available ?? false,
        is_active: true,
        is_featured: false,
        is_archived: false,
        sort_order: 100,
        catalog_source: "imported",
        source_service_id: sourceId,
        source_synced_at: new Date().toISOString(),
        provider_id: data.provider_id,
        provider_service_id: sourceId,
        fulfilment_mode: "manual",
      };

      if (current) {
        const { error } = await supabase
          .from("services")
          .update(payload as never)
          .eq("id", current.id);
        if (error) {
          failures.push({ source_service_id: sourceId, reason: error.message });
          continue;
        }
        updated += 1;
      } else {
        const { data: inserted, error } = await supabase
          .from("services")
          .insert(payload as never)
          .select("id")
          .single();
        if (error) {
          failures.push({ source_service_id: sourceId, reason: error.message });
          continue;
        }
        created += 1;
        await supabase
          .from("provider_services")
          .update({ mapped_service_id: inserted.id, sync_status: "published" } as never)
          .eq("id", row.id);
      }
      publishedSourceIds.push(sourceId);
    }

    let archived = 0;
    if (data.archive_provisional) {
      const { data: archivedRows, error } = await supabase
        .from("services")
        .update({ is_archived: true, is_active: false } as never)
        .eq("catalog_source", "neomart_provisional")
        .eq("is_archived", false)
        .select("id");
      if (error) throw new Error(error.message);
      archived = archivedRows?.length ?? 0;
    }

    const report = {
      published: publishedSourceIds.length,
      created,
      updated,
      archived,
      failures: failures.slice(0, 200),
    };

    await supabase.from("catalog_sync_runs").insert({
      provider_id: data.provider_id,
      actor_id: context.userId,
      kind: "publish",
      source_label: provider.name,
      rows_received: staged.length,
      rows_accepted: publishedSourceIds.length,
      rows_failed: failures.length,
      services_created: created,
      services_updated: updated,
      services_archived: archived,
      report,
    } as never);

    return report;
  });

export const getCatalogAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("services")
      .select(
        "id, catalog_source, source_service_id, price_per_unit, rate_basis, min_quantity, max_quantity, avg_start_time, delivery_time, description, category_id, is_archived",
      )
      .limit(5000);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as any[];
    const imported = rows.filter((r) => r.catalog_source === "imported");
    const provisional = rows.filter((r) => r.catalog_source !== "imported");
    const missing = (list: any[], field: string) =>
      list.filter((r) => !r[field] || r[field] === "Not published by source").length;
    return {
      total: rows.length,
      provisional: provisional.length,
      imported: imported.length,
      categories: new Set(rows.map((r) => r.category_id)).size,
      importedWithSourceId: imported.filter((r) => r.source_service_id).length,
      importedWithRanges: imported.filter(
        (r) => Number(r.min_quantity) > 0 && Number(r.max_quantity) >= Number(r.min_quantity),
      ).length,
      importedWithRates: imported.filter((r) => Number(r.price_per_unit) > 0).length,
      importedMissing: {
        description: missing(imported, "description"),
        avg_start_time: missing(imported, "avg_start_time"),
        delivery_time: missing(imported, "delivery_time"),
      },
    };
  });

export const applyCatalogMarkup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        percent: z.number().min(0.01).max(9900),
        mode: z.enum(["increase_by", "set_to"]),
        category_id: z.string().uuid().nullable().optional(),
        include_archived: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const multiplier =
      data.mode === "increase_by" ? 1 + data.percent / 100 : data.percent / 100;
    const { data: result, error } = await context.supabase.rpc("apply_catalog_markup", {
      _multiplier: Number(multiplier.toFixed(6)),
      ...(data.category_id ? { _category_id: data.category_id } : {}),
      _include_archived: data.include_archived ?? false,
    });
    if (error) throw new Error(error.message);
    return result as { updated: number; multiplier: number };
  });
