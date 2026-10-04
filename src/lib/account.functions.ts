import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminEmail } from "@/lib/admin-config";
import { neonAdmin } from "@/integrations/neon";
import { createToken, type NeonSession, type NeonUser } from "@/integrations/neon/auth";

export const getAccountOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profile, orders, transactions, roles] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("orders")
        .select("*, services(name, slug, unit)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    if (profile.error) throw new Error(profile.error.message);

    return {
      profile: profile.data,
      orders: orders.data ?? [],
      transactions: transactions.data ?? [],
      roles: (roles.data ?? []).map((r) => r.role as string),
    };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ full_name: z.string().min(2).max(120) }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.full_name })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        service_id: z.string().uuid(),
        target_link: z.string().url().max(500),
        quantity: z.number().int().positive().max(1_000_000),
        notes: z.string().max(1000).optional(),
        client_request_id: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("place_order_atomic", {
      _service_id: data.service_id,
      _target_link: data.target_link,
      _quantity: data.quantity,
      _notes: data.notes ?? "",
      _client_request_id: data.client_request_id,
    });
    if (error) throw new Error(error.message);
    if (!result || Array.isArray(result) || typeof result !== "object") {
      throw new Error("The order could not be confirmed.");
    }
    const orderId = typeof result["orderId"] === "string" ? result["orderId"] : null;
    const orderNumber = typeof result["orderNumber"] === "number" ? result["orderNumber"] : null;
    const balance = typeof result["balance"] === "number" ? result["balance"] : null;
    if (!orderId || orderNumber === null || balance === null) {
      throw new Error("The order response was incomplete.");
    }
    return { orderId, orderNumber, balance, duplicate: result["duplicate"] === true };
  });

export const getWalletFunding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [methods, deposits] = await Promise.all([
      context.supabase
        .from("payment_methods")
        .select("id, code, name, kind, network, instructions, destination, min_amount, max_amount")
        .eq("is_enabled", true)
        .order("sort_order"),
      context.supabase
        .from("deposit_requests")
        .select("*, payment_methods(name, code, network)")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (methods.error) throw new Error(methods.error.message);
    if (deposits.error) throw new Error(deposits.error.message);
    return { methods: methods.data ?? [], deposits: deposits.data ?? [] };
  });

export const createAutoDetectDepositSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        payment_method_id: z.string().uuid(),
        base_amount: z.number().positive().min(5).max(50_000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Fetch payment method
    const { data: method, error: methodError } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("id", data.payment_method_id)
      .eq("is_enabled", true)
      .maybeSingle();

    if (methodError) throw new Error(methodError.message);
    if (!method) throw new Error("Payment method not available.");

    if (
      data.base_amount < Number(method.min_amount) ||
      data.base_amount > Number(method.max_amount)
    ) {
      throw new Error(`Amount must be between $${method.min_amount} and $${method.max_amount}.`);
    }

    // 2. Generate a unique fractional amount for this person / deposit to avoid collisions
    const { data: recentPending } = await supabase
      .from("deposit_requests")
      .select("amount")
      .eq("payment_method_id", method.id)
      .eq("status", "pending")
      .limit(100);

    const takenAmounts = new Set((recentPending ?? []).map((d: any) => Number(d.amount)));

    let exactAmount = Number(data.base_amount);
    let attempts = 0;
    while (attempts < 50) {
      // Add random fractional cents between 0.11 and 0.97
      const randomCents = Math.floor(Math.random() * 87 + 11) / 100;
      const candidate = Math.round((Number(data.base_amount) + randomCents) * 100) / 100;
      if (!takenAmounts.has(candidate)) {
        exactAmount = candidate;
        break;
      }
      attempts++;
    }

    // 3. Currency / Fiat calculation (for UPI: 1 USD = 89.50 INR)
    const isUpi = method.kind === "upi" || method.code === "upi_pay";
    const inrRate = 89.5;
    const fiatAmount = isUpi ? Math.round(exactAmount * inrRate * 100) / 100 : exactAmount;

    // 4. Generate unique tracking reference: e.g. "NEO-94812"
    const randomTag = Math.floor(10000 + Math.random() * 90000);
    const trackingRef = `NEO-${randomTag}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes window

    const metadata = {
      mode: "auto_detect",
      base_amount: data.base_amount,
      exact_amount: exactAmount,
      fiat_amount: fiatAmount,
      fiat_currency: isUpi ? "INR" : "USD",
      exchange_rate: isUpi ? inrRate : 1.0,
      tracking_ref: trackingRef,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    };

    // 5. Create pending deposit request in database
    const { data: deposit, error: insertError } = await supabase
      .from("deposit_requests")
      .insert({
        user_id: userId,
        payment_method_id: method.id,
        amount: exactAmount,
        payment_reference: trackingRef,
        customer_notes: JSON.stringify(metadata),
        status: "pending",
      })
      .select("id, request_number")
      .single();

    if (insertError) throw new Error(insertError.message);

    // 6. Build dynamic payment URI for QR code
    let qrUri = method.destination || "";
    if (isUpi) {
      const upiParams = new URLSearchParams({
        pa: method.destination || "yuval69goku@fam",
        pn: "NeoSMM",
        am: fiatAmount.toFixed(2),
        cu: "INR",
        tn: `NeoSMM Deposit #${deposit.request_number} (${trackingRef})`,
      });
      qrUri = `upi://pay?${upiParams.toString()}`;
    }

    return {
      deposit_id: deposit.id,
      request_number: deposit.request_number,
      base_amount: data.base_amount,
      exact_amount: exactAmount,
      fiat_amount: fiatAmount,
      fiat_currency: isUpi ? "INR" : "USD",
      exchange_rate: isUpi ? inrRate : 1.0,
      tracking_ref: trackingRef,
      expires_at: expiresAt.toISOString(),
      destination: method.destination,
      network: method.network,
      method_name: method.name,
      method_kind: method.kind,
      instructions: method.instructions,
      qr_uri: qrUri,
    };
  });

export const checkAutoDepositStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        deposit_id: z.string().uuid(),
        payment_reference: z.string().trim().max(160).optional(),
        confirm_transfer: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Fetch deposit
    const { data: deposit, error } = await supabase
      .from("deposit_requests")
      .select("*, payment_methods(name, code, kind, destination)")
      .eq("id", data.deposit_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!deposit) throw new Error("Deposit request not found.");

    // If already approved, return success with current balance
    if (deposit.status === "approved") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .maybeSingle();

      return {
        status: "approved",
        verified: true,
        amount: deposit.amount,
        balance: profile?.balance ?? 0,
        message: `Payment of $${deposit.amount} is verified and credited!`,
      };
    }

    if (deposit.status === "rejected") {
      return {
        status: "rejected",
        verified: false,
        message: deposit.admin_notes || "Deposit was rejected.",
      };
    }

    // 2. Parse metadata and check expiration
    let metadata: any = {};
    try {
      if (deposit.customer_notes) {
        metadata = JSON.parse(deposit.customer_notes);
      }
    } catch {}

    const expiresAt = metadata.expires_at ? new Date(metadata.expires_at) : null;
    const isExpired = expiresAt ? Date.now() > expiresAt.getTime() : false;

    if (isExpired) {
      await supabase
        .from("deposit_requests")
        .update({ status: "rejected", admin_notes: "Auto-detect window expired (30m limit)." })
        .eq("id", deposit.id);

      return {
        status: "expired",
        verified: false,
        message:
          "Payment session expired. Please start a new deposit session for a refreshed exact amount.",
      };
    }

    // 3. Server-authoritative Automated Blockchain & Banking Verification:
    const userRef = data.payment_reference?.trim();

    if (!userRef && !data.confirm_transfer) {
      return {
        status: "pending",
        verified: false,
        message: `Listening for transfer of exactly $${deposit.amount}... Enter your Transaction Hash or UPI UTR to verify.`,
        expires_in_seconds: expiresAt
          ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
          : 1800,
      };
    }

    if (!userRef || userRef.length < 4) {
      return {
        status: "pending",
        verified: false,
        message: "Please enter your transaction hash (TxID) or 12-digit UPI UTR to trigger verification.",
      };
    }

    // Update payment_reference on deposit request
    await supabase
      .from("deposit_requests")
      .update({ payment_reference: userRef })
      .eq("id", deposit.id);

    // Run real-time blockchain / UPI verification!
    const { verifyPaymentTransaction } = await import("@/lib/payment-verifier");
    const verification = await verifyPaymentTransaction({
      paymentMethod: deposit.payment_methods,
      txReference: userRef,
      expectedAmountUsd: Number(deposit.amount),
      userId,
      depositId: deposit.id,
    });

    if (verification.verified && verification.status === "approved") {
      // Execute server-authoritative atomic balance credit
      const { data: reviewResult, error: reviewError } = await supabase.rpc(
        "review_deposit_atomic",
        {
          _deposit_id: deposit.id,
          _decision: "approved",
          _staff_notes: `[Verified by ${verification.source}] Received $${verification.detectedAmount ?? deposit.amount} (${deposit.payment_methods?.name}). Hash/UTR: ${verification.txHash || userRef}`,
          _verified_hash: verification.txHash || userRef,
        },
      );

      if (reviewError) {
        throw new Error(reviewError.message || "Auto-verification transaction failed.");
      }

      return {
        status: "approved",
        verified: true,
        amount: deposit.amount,
        balance: reviewResult?.balance ?? 0,
        transaction_id: reviewResult?.transactionId,
        message:
          verification.message ||
          `Payment of $${deposit.amount} verified and credited to your wallet!`,
      };
    }

    if (verification.status === "rejected") {
      return {
        status: "rejected",
        verified: false,
        message: verification.message,
      };
    }

    // Still pending (e.g. UPI waiting for bank statement match, or crypto block confirmation in progress)
    return {
      status: "pending",
      verified: false,
      message: verification.message,
      expires_in_seconds: expiresAt
        ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
        : 1800,
    };
  });

export const cancelAutoDepositSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        deposit_id: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("deposit_requests")
      .update({ status: "rejected", admin_notes: "Cancelled by user to pick a different amount." })
      .eq("id", data.deposit_id)
      .eq("user_id", userId)
      .eq("status", "pending");

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createDepositRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        payment_method_id: z.string().uuid(),
        amount: z.number().positive().max(1_000_000),
        payment_reference: z.string().trim().min(3).max(160),
        customer_notes: z.string().trim().max(1000).optional(),
        proof_data_url: z.string().max(7_100_000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: method, error: methodError } = await context.supabase
      .from("payment_methods")
      .select("id, min_amount, max_amount")
      .eq("id", data.payment_method_id)
      .eq("is_enabled", true)
      .maybeSingle();
    if (methodError) throw new Error(methodError.message);
    if (!method) throw new Error("That payment method is not currently available.");
    if (data.amount < Number(method.min_amount) || data.amount > Number(method.max_amount)) {
      throw new Error(
        `Amount must be between ${Number(method.min_amount)} and ${Number(method.max_amount)}.`,
      );
    }
    const normalizedReference = data.payment_reference.trim().toLowerCase();

    // Check against verified_transactions table
    const { data: alreadyVerified } = await context.supabase
      .from("verified_transactions")
      .select("id")
      .eq("transaction_hash", normalizedReference)
      .maybeSingle();

    if (alreadyVerified) {
      throw new Error(
        "This transaction reference has already been redeemed and credited. Duplicate submissions are strictly blocked.",
      );
    }

    const { data: duplicate, error: duplicateError } = await context.supabase
      .from("deposit_requests")
      .select("id, request_number, status")
      .eq("payment_method_id", data.payment_method_id)
      .ilike("payment_reference", normalizedReference)
      .in("status", ["pending", "approved"])
      .maybeSingle();
    if (duplicateError) throw new Error(duplicateError.message);
    if (duplicate) {
      throw new Error(
        `That payment reference is already attached to request #${duplicate.request_number}.`,
      );
    }
    let proofPath: string | null = null;
    if (data.proof_data_url) {
      const match = data.proof_data_url.match(
        /^data:(image\/(?:png|jpeg|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/,
      );
      if (!match) throw new Error("Proof must be a PNG, JPEG, WebP, or PDF file.");
      const contentType = match[1];
      const payload = match[2];
      if (!contentType || !payload) throw new Error("Payment proof encoding is invalid.");
      const bytes = Buffer.from(payload, "base64");
      if (bytes.length > 5 * 1024 * 1024) throw new Error("Payment proof must be 5MB or smaller.");
      const imageSubtype = contentType.split("/")[1];
      const extension =
        contentType === "application/pdf" ? "pdf" : imageSubtype === "jpeg" ? "jpg" : imageSubtype;
      if (!extension) throw new Error("Payment proof file type is invalid.");
      proofPath = `${context.userId}/${crypto.randomUUID()}.${extension}`;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: uploadError } = await supabaseAdmin.storage
        .from("payment-proofs")
        .upload(proofPath, bytes, {
          contentType,
          upsert: false,
        });
      if (uploadError) throw new Error(`Payment proof upload failed: ${uploadError.message}`);
    }
    const { data: deposit, error } = await context.supabase
      .from("deposit_requests")
      .insert({
        user_id: context.userId,
        payment_method_id: data.payment_method_id,
        amount: data.amount,
        payment_reference: normalizedReference,
        customer_notes: data.customer_notes || null,
        proof_path: proofPath,
      })
      .select("id, request_number")
      .single();
    if (error) {
      if (proofPath) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.storage.from("payment-proofs").remove([proofPath]);
      }
      throw new Error(error.message);
    }
    return deposit;
  });

export const createSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        subject: z.string().min(4).max(180),
        category: z.string().min(2).max(60),
        message: z.string().min(10).max(4000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({ user_id: userId, subject: data.subject, category: data.category })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: messageError } = await supabase
      .from("ticket_messages")
      .insert({ ticket_id: ticket.id, author_id: userId, body: data.message });
    if (messageError) throw new Error(messageError.message);

    return { ticketId: ticket.id };
  });

export const listSupportTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("support_tickets")
      .select("*, ticket_messages(id, body, is_staff, created_at)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const replyToSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        ticket_id: z.string().uuid(),
        body: z.string().trim().min(2).max(4000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("reply_to_ticket_atomic", {
      _ticket_id: data.ticket_id,
      _body: data.body,
      _close: false,
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const exchangeGoogleCode = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        code: z.string().min(1),
        redirectUri: z.string().url(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const clientId = process.env["GOOGLE_CLIENT_ID"] || process.env["VITE_GOOGLE_CLIENT_ID"];
    const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];

    if (!clientId || !clientSecret) {
      throw new Error(
        "Google OAuth credentials missing in .env. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      );
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: data.code,
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        redirect_uri: data.redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[Google OAuth] Token exchange error:", errBody);
      throw new Error(`Google token exchange failed: ${tokenRes.statusText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      throw new Error("Failed to fetch Google user profile");
    }

    const userInfo = (await userInfoRes.json()) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    };

    const email = userInfo.email.trim().toLowerCase();
    const fullName = userInfo.name || email.split("@")[0];
    const avatarUrl = userInfo.picture;
    const isAdmin = isAdminEmail(email);

    // Generate a deterministic valid UUID for Google accounts
    let userId = "";
    if (isAdmin) {
      if (email === "neomart981@gmail.com") {
        userId = "00000000-0000-4000-8000-000000000010";
      } else if (email === "voidlureee@gmail.com") {
        userId = "00000000-0000-4000-8000-000000000011";
      } else {
        userId = "00000000-0000-4000-8000-000000000001";
      }
    } else {
      // Deterministic UUID from Google sub so returning users keep same ID
      let hash = "";
      try {
        const cryptoMod = await import("node:crypto");
        hash = cryptoMod.default
          .createHash("sha256")
          .update(`google_user_${userInfo.sub}`)
          .digest("hex");
      } catch {
        const str = `google_user_${userInfo.sub}`;
        let h1 = 0xdeadbeef;
        let h2 = 0x41c64e6d;
        for (let i = 0; i < str.length; i++) {
          const ch = str.charCodeAt(i);
          h1 = Math.imul(h1 ^ ch, 2654435761);
          h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        hash = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(32, "0");
      }
      userId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    }

    const role = isAdmin ? "admin" : "user";

    try {
      const { data: existing } = await neonAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existing?.id) {
        userId = existing.id;
        await neonAdmin
          .from("profiles")
          .update({
            full_name: fullName,
            avatar_url: avatarUrl ?? null,
          })
          .eq("id", userId);
      } else {
        await neonAdmin.from("profiles").insert({
          id: userId,
          email,
          full_name: fullName,
          avatar_url: avatarUrl ?? null,
          balance: isAdmin ? 5000.0 : 0.0,
        });
      }

      const { data: roleData } = await neonAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", role)
        .maybeSingle();

      if (!roleData) {
        await neonAdmin.from("user_roles").insert({
          user_id: userId,
          role,
        });
      }
    } catch (dbErr) {
      console.warn("[Google OAuth] DB upsert:", dbErr);
    }

    const user: NeonUser = {
      id: userId,
      email,
      user_metadata: {
        full_name: fullName,
        avatar_url: avatarUrl,
      },
      role,
      created_at: new Date().toISOString(),
    };

    const jwtToken = createToken(user);
    const session: NeonSession = {
      access_token: jwtToken,
      token_type: "bearer",
      expires_in: 3600 * 24 * 7,
      user,
    };

    return { user, session };
  });
