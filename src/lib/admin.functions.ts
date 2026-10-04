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

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;

    const [
      orders,
      profiles,
      services,
      tickets,
      contacts,
      deposits,
      paymentMethods,
      activity,
      transactions,
      settings,
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("*, services(name, unit)")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("services").select("id, name, slug, is_active, price_per_unit"),
      supabase
        .from("support_tickets")
        .select("*, ticket_messages(id, body, is_staff, created_at, author_id)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("deposit_requests")
        .select("*, payment_methods(name, code, network)")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("payment_methods").select("*").order("sort_order"),
      supabase
        .from("admin_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250),
      supabase.from("website_settings").select("*").eq("id", "primary").maybeSingle(),
    ]);

    return {
      orders: orders.data ?? [],
      customers: profiles.data ?? [],
      services: services.data ?? [],
      tickets: tickets.data ?? [],
      contacts: contacts.data ?? [],
      deposits: deposits.data ?? [],
      paymentMethods: paymentMethods.data ?? [],
      activity: activity.data ?? [],
      transactions: transactions.data ?? [],
      settings: settings.data,
    };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        order_id: z.string().uuid(),
        status: z.enum(["pending", "processing", "completed", "cancelled", "refunded"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);
    const { error: logError } = await context.supabase.from("admin_activity_logs").insert({
      actor_id: context.userId,
      action: "order_status_updated",
      entity_type: "order",
      entity_id: data.order_id,
      details: { status: data.status },
    });
    if (logError) throw new Error(logError.message);
    return { ok: true };
  });

export const adjustBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        user_id: z.string().uuid(),
        amount: z.number().refine((v) => v !== 0, "Amount must not be zero"),
        description: z.string().max(200).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: result, error } = await context.supabase.rpc("adjust_wallet_atomic", {
      _user_id: data.user_id,
      _amount: data.amount,
      _description: data.description ?? "Manual balance adjustment",
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const reviewDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        deposit_id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        admin_notes: z.string().trim().max(1000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: result, error } = await context.supabase.rpc("review_deposit_atomic", {
      _deposit_id: data.deposit_id,
      _decision: data.decision,
      _admin_notes: data.admin_notes ?? "",
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const savePaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(2).max(80),
        network: z.string().trim().max(80).nullable(),
        destination: z.string().trim().max(500).nullable(),
        instructions: z.string().trim().max(2000).nullable(),
        min_amount: z.number().positive(),
        max_amount: z.number().positive(),
        is_enabled: z.boolean(),
      })
      .refine((value) => value.max_amount >= value.min_amount, {
        message: "Maximum amount must be at least the minimum amount.",
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("payment_methods")
      .update({
        name: data.name,
        network: data.network || null,
        destination: data.destination || null,
        instructions: data.instructions || null,
        min_amount: data.min_amount,
        max_amount: data.max_amount,
        is_enabled: data.is_enabled,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    const { error: logError } = await context.supabase.from("admin_activity_logs").insert({
      actor_id: context.userId,
      action: "payment_method_updated",
      entity_type: "payment_method",
      entity_id: data.id,
      details: { enabled: data.is_enabled, name: data.name },
    });
    if (logError) throw new Error(logError.message);
    return { ok: true };
  });

export const replyToTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        ticket_id: z.string().uuid(),
        body: z.string().trim().min(2).max(4000),
        close: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: result, error } = await context.supabase.rpc("reply_to_ticket_atomic", {
      _ticket_id: data.ticket_id,
      _body: data.body,
      _close: data.close,
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const saveWebsiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        brand_name: z.string().trim().min(2).max(80),
        logo_url: z.string().trim().max(500).nullable(),
        support_email: z.string().email().max(200).nullable(),
        announcement: z.string().trim().max(500).nullable(),
        announcement_enabled: z.boolean(),
        currency: z.string().trim().min(3).max(3),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("website_settings")
      .update(data)
      .eq("id", "primary");
    if (error) throw new Error(error.message);
    const { error: logError } = await context.supabase.from("admin_activity_logs").insert({
      actor_id: context.userId,
      action: "branding_updated",
      entity_type: "website_settings",
      entity_id: "primary",
      details: { brand_name: data.brand_name, announcement_enabled: data.announcement_enabled },
    });
    if (logError) throw new Error(logError.message);
    return { ok: true };
  });

export const getDepositProofUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ deposit_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: deposit, error } = await context.supabase
      .from("deposit_requests")
      .select("proof_path")
      .eq("id", data.deposit_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!deposit?.proof_path) throw new Error("This request has no uploaded proof.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("payment-proofs")
      .createSignedUrl(deposit.proof_path, 300);
    if (signedError) throw new Error(signedError.message);
    return { url: signed.signedUrl };
  });
