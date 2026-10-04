import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: Admin access required");
}

// Get all products
export const getProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  });

// Create new product
export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        name: z.string().trim().min(1).max(200),
        service_id: z.string().uuid(),
        service_name: z.string().trim().min(1).max(200),
        max_quantity: z.number().int().positive(),
        price_per_unit: z.number().positive(),
        description: z.string().trim().max(1000).optional(),
        is_active: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: newProduct, error } = await context.supabase
      .from("products")
      .insert({
        name: data.name,
        service_id: data.service_id,
        service_name: data.service_name,
        max_quantity: data.max_quantity,
        price_per_unit: data.price_per_unit,
        description: data.description || null,
        is_active: data.is_active,
        created_by: context.userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Log activity
    await context.supabase.from("admin_activity_logs").insert({
      actor_id: context.userId,
      action: "product_created",
      entity_type: "product",
      entity_id: newProduct.id,
      details: { name: data.name, service_name: data.service_name },
    });

    return newProduct;
  });

// Update product
export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(200),
        service_id: z.string().uuid(),
        service_name: z.string().trim().min(1).max(200),
        max_quantity: z.number().int().positive(),
        price_per_unit: z.number().positive(),
        description: z.string().trim().max(1000).optional(),
        is_active: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { error } = await context.supabase
      .from("products")
      .update({
        name: data.name,
        service_id: data.service_id,
        service_name: data.service_name,
        max_quantity: data.max_quantity,
        price_per_unit: data.price_per_unit,
        description: data.description || null,
        is_active: data.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);

    // Log activity
    await context.supabase.from("admin_activity_logs").insert({
      actor_id: context.userId,
      action: "product_updated",
      entity_type: "product",
      entity_id: data.id,
      details: { name: data.name },
    });

    return { ok: true };
  });

// Delete single product
export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { error } = await context.supabase.from("products").delete().eq("id", data.id);

    if (error) throw new Error(error.message);

    // Log activity
    await context.supabase.from("admin_activity_logs").insert({
      actor_id: context.userId,
      action: "product_deleted",
      entity_type: "product",
      entity_id: data.id,
      details: { deleted_at: new Date().toISOString() },
    });

    return { ok: true };
  });

// Bulk delete products
export const bulkDeleteProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { error } = await context.supabase
      .from("products")
      .delete()
      .in("id", data.ids);

    if (error) throw new Error(error.message);

    // Log activity
    await context.supabase.from("admin_activity_logs").insert({
      actor_id: context.userId,
      action: "products_bulk_deleted",
      entity_type: "product",
      entity_id: "multiple",
      details: { count: data.ids.length, deleted_at: new Date().toISOString() },
    });

    return { ok: true, deletedCount: data.ids.length };
  });

// Toggle product active status
export const toggleProductStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { error } = await context.supabase
      .from("products")
      .update({ is_active: data.is_active })
      .eq("id", data.id);

    if (error) throw new Error(error.message);

    // Log activity
    await context.supabase.from("admin_activity_logs").insert({
      actor_id: context.userId,
      action: "product_status_toggled",
      entity_type: "product",
      entity_id: data.id,
      details: { is_active: data.is_active },
    });

    return { ok: true };
  });
