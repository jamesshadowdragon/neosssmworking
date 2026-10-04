import { neon } from "@neondatabase/serverless";
import { SEED_CATEGORIES, SEED_SERVICES, SEED_PAYMENT_METHODS } from "./seed-data";
import { ADMIN_EMAILS, isAdminEmail } from "@/lib/admin-config";
import crypto from "node:crypto";
import fs from "node:fs";

export interface NeonQueryResult<T = any> {
  data: T | null;
  error: { message: string } | null;
  count?: number | null;
}

// In-memory state store for zero-config fallback or instant dev preview
class LocalDataStore {
  profiles: Map<string, any> = new Map();
  user_roles: Map<string, any> = new Map();
  service_categories: Map<string, any> = new Map();
  services: Map<string, any> = new Map();
  orders: Map<string, any> = new Map();
  transactions: Map<string, any> = new Map();
  deposit_requests: Map<string, any> = new Map();
  payment_methods: Map<string, any> = new Map();
  verified_transactions: Map<string, any> = new Map();
  upi_transactions_log: Map<string, any> = new Map();
  support_tickets: Map<string, any> = new Map();
  ticket_messages: Map<string, any> = new Map();
  contact_messages: Map<string, any> = new Map();
  admin_activity_logs: Map<string, any> = new Map();
  providers: Map<string, any> = new Map();
  provider_services: Map<string, any> = new Map();
  catalog_sync_runs: Map<string, any> = new Map();
  website_settings: Map<string, any> = new Map();
  storage_files: Map<string, { buffer: Buffer; contentType?: string }> = new Map();

  orderSequence: number = 1000;
  depositSequence: number = 1000;

  constructor() {
    this.seed();
  }

  seed() {
    // Seed admin profile
    const adminId = "00000000-0000-4000-8000-000000000001";
    this.profiles.set(adminId, {
      id: adminId,
      email: "admin@neosmm.site",
      full_name: "NeoSMM Admin",
      avatar_url: null,
      balance: 1000.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    this.user_roles.set(`${adminId}:admin`, {
      id: "role-admin-1",
      user_id: adminId,
      role: "admin",
      created_at: new Date().toISOString(),
    });

    // Seed Main Admin: neomart981@gmail.com
    const neomartId = "00000000-0000-4000-8000-000000000010";
    this.profiles.set(neomartId, {
      id: neomartId,
      email: "neomart981@gmail.com",
      full_name: "NeoMart Owner",
      avatar_url: null,
      balance: 5000.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    this.user_roles.set(`${neomartId}:admin`, {
      id: "role-admin-neomart",
      user_id: neomartId,
      role: "admin",
      created_at: new Date().toISOString(),
    });

    // Seed Temporary Admin: voidlureee@gmail.com
    const voidlureId = "00000000-0000-4000-8000-000000000011";
    this.profiles.set(voidlureId, {
      id: voidlureId,
      email: "voidlureee@gmail.com",
      full_name: "Voidlureee Admin (Temp)",
      avatar_url: null,
      balance: 5000.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    this.user_roles.set(`${voidlureId}:admin`, {
      id: "role-admin-voidlureee",
      user_id: voidlureId,
      role: "admin",
      created_at: new Date().toISOString(),
    });

    // Seed demo customer
    const customerId = "00000000-0000-4000-8000-000000000002";
    this.profiles.set(customerId, {
      id: customerId,
      email: "customer@neosmm.site",
      full_name: "Demo Customer",
      avatar_url: null,
      balance: 150.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    this.user_roles.set(`${customerId}:user`, {
      id: "role-user-1",
      user_id: customerId,
      role: "user",
      created_at: new Date().toISOString(),
    });

    // Seed categories
    for (const cat of SEED_CATEGORIES) {
      this.service_categories.set(cat.id, {
        ...cat,
        created_at: new Date().toISOString(),
      });
    }

    // Seed services
    for (const svc of SEED_SERVICES) {
      const cat = SEED_CATEGORIES.find((c) => c.slug === svc.category_slug);
      const catId = cat ? cat.id : SEED_CATEGORIES[0].id;
      this.services.set(svc.id, {
        id: svc.id,
        category_id: catId,
        slug: svc.slug,
        name: svc.name,
        short_description: svc.short_description,
        description: svc.description,
        unit: svc.unit,
        price_per_unit: svc.price_per_unit,
        rate_basis: svc.rate_basis,
        min_quantity: svc.min_quantity,
        max_quantity: svc.max_quantity,
        delivery_time: svc.delivery_time,
        features: svc.features,
        is_featured: svc.is_featured,
        sort_order: svc.sort_order,
        is_active: svc.is_active,
        is_archived: svc.is_archived,
        catalog_source: svc.catalog_source,
        service_code: 100 + svc.sort_order,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Seed payment methods
    for (const pm of SEED_PAYMENT_METHODS) {
      this.payment_methods.set(pm.id, {
        ...pm,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Seed website settings
    this.website_settings.set("primary", {
      id: "primary",
      site_name: "NeoSMM",
      hero_title: "Next-Gen SMM & Digital Growth Platform",
      hero_subtitle:
        "Instant delivery, transparent rates, verified providers, and 24/7 automated order routing.",
      contact_email: "support@neosmm.site",
      currency_code: "USD",
      is_registration_open: true,
      support_telegram: "@NeoSMMSupport",
      support_whatsapp: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}

const memoryStore = new LocalDataStore();

export function getDatabaseUrl(): string | undefined {
  let url =
    process.env["DATABASE_URL"] || process.env["NEON_DATABASE_URL"] || process.env["POSTGRES_URL"];
  if (!url && typeof process !== "undefined" && typeof process.cwd === "function") {
    try {
      const envPath = `${process.cwd()}/.env`;
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        const match = content.match(/DATABASE_URL=["']?([^"'\n\r]+)["']?/);
        if (match?.[1]) {
          url = match[1].trim();
        }
      }
    } catch {}
  }
  return url;
}

export function getJwtSecret(): string {
  let secret = process.env["JWT_SECRET"];
  if (!secret && typeof process !== "undefined" && typeof process.cwd === "function") {
    try {
      const envPath = `${process.cwd()}/.env`;
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        const match = content.match(/JWT_SECRET=["']?([^"'\n\r]+)["']?/);
        if (match?.[1]) {
          secret = match[1].trim();
        }
      }
    } catch {}
  }
  return secret || "GrzICFPT5s4AEUfGUHU73rUzfgfNW0C3VsvXhyvfUrt";
}

// Check if Neon connection is available
export function isNeonConnected(): boolean {
  const url = getDatabaseUrl();
  return Boolean(url && url.startsWith("postgres"));
}

let neonClientInstance: ReturnType<typeof neon> | null = null;
let schemaInitialized = false;

function getNeonSql() {
  const url = getDatabaseUrl();
  if (!url) return null;
  if (!neonClientInstance) {
    neonClientInstance = neon(url);
  }
  return neonClientInstance;
}

export async function ensureNeonSchema() {
  const sql = getNeonSql();
  if (!sql || schemaInitialized) return;

  try {
    // Create base tables individually if they do not exist
    await sql`
      CREATE TABLE IF NOT EXISTS service_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text NOT NULL UNIQUE,
        name text NOT NULL,
        tagline text,
        description text,
        icon text NOT NULL DEFAULT 'sparkles',
        accent text NOT NULL DEFAULT 'blue',
        kind text NOT NULL DEFAULT 'platform',
        sort_order int NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS services (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id uuid NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
        slug text NOT NULL UNIQUE,
        name text NOT NULL,
        short_description text,
        description text,
        unit text NOT NULL DEFAULT 'unit',
        price_per_unit numeric(12,4) NOT NULL DEFAULT 0,
        rate_basis int NOT NULL DEFAULT 1,
        service_code int,
        subcategory text,
        min_quantity int NOT NULL DEFAULT 1,
        max_quantity int NOT NULL DEFAULT 100000,
        delivery_time text NOT NULL DEFAULT '24-72 hours',
        features jsonb NOT NULL DEFAULT '[]'::jsonb,
        is_active boolean NOT NULL DEFAULT true,
        is_featured boolean NOT NULL DEFAULT false,
        is_archived boolean NOT NULL DEFAULT false,
        catalog_source text NOT NULL DEFAULT 'neosmm_core',
        source_service_id text,
        source_sync_at timestamptz,
        sort_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE,
        full_name text,
        avatar_url text,
        password_hash text,
        balance numeric(14,2) NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        role text NOT NULL DEFAULT 'user',
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_id, role)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code text NOT NULL UNIQUE,
        name text NOT NULL,
        kind text NOT NULL,
        network text,
        instructions text,
        destination text,
        min_amount numeric(14,2) NOT NULL DEFAULT 1,
        max_amount numeric(14,2) NOT NULL DEFAULT 10000,
        is_enabled boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number serial UNIQUE,
        user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        service_id uuid NOT NULL REFERENCES services(id),
        target_link text NOT NULL,
        quantity int NOT NULL,
        unit_price numeric(12,4) NOT NULL,
        total_amount numeric(14,2) NOT NULL,
        rate_basis_snapshot int NOT NULL DEFAULT 1,
        service_name_snapshot text,
        category_name_snapshot text,
        service_code_snapshot int,
        service_price_basis_snapshot numeric(12,4),
        client_request_id uuid,
        status text NOT NULL DEFAULT 'pending',
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        type text NOT NULL,
        amount numeric(14,2) NOT NULL,
        balance_after numeric(14,2) NOT NULL,
        description text,
        reference text,
        status text NOT NULL DEFAULT 'completed',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS deposit_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        request_number serial UNIQUE,
        user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        payment_method_id uuid NOT NULL REFERENCES payment_methods(id),
        amount numeric(14,2) NOT NULL,
        payment_reference text NOT NULL,
        proof_path text,
        status text NOT NULL DEFAULT 'pending',
        customer_notes text,
        admin_notes text,
        reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
        reviewed_at timestamptz,
        transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        subject text NOT NULL,
        category text NOT NULL DEFAULT 'general',
        status text NOT NULL DEFAULT 'open',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        body text NOT NULL,
        is_staff boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        email text NOT NULL,
        subject text,
        message text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
        action text NOT NULL,
        entity_type text NOT NULL,
        entity_id text,
        details jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS providers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        slug text NOT NULL UNIQUE,
        api_url text,
        api_key_secret_name text,
        status text NOT NULL DEFAULT 'disconnected',
        last_synced_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS provider_services (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        service_id text NOT NULL,
        name text NOT NULL,
        type text,
        category_name text,
        rate numeric(12,4) NOT NULL,
        min int,
        max int,
        dripfeed boolean DEFAULT false,
        refill boolean DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS catalog_sync_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id uuid REFERENCES providers(id) ON DELETE SET NULL,
        actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
        kind text NOT NULL,
        rows_received int NOT NULL DEFAULT 0,
        rows_accepted int NOT NULL DEFAULT 0,
        rows_failed int NOT NULL DEFAULT 0,
        services_created int NOT NULL DEFAULT 0,
        services_updated int NOT NULL DEFAULT 0,
        services_archived int NOT NULL DEFAULT 0,
        report jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS website_settings (
        id text PRIMARY KEY,
        site_name text NOT NULL DEFAULT 'NeoSMM',
        hero_title text,
        hero_subtitle text,
        contact_email text,
        currency_code text NOT NULL DEFAULT 'USD',
        is_registration_open boolean NOT NULL DEFAULT true,
        support_telegram text,
        support_whatsapp text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS payment_proofs (
        path text PRIMARY KEY,
        content_type text,
        data_base64 text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS verified_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_hash text UNIQUE NOT NULL,
        payment_method_id uuid NOT NULL,
        user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        deposit_request_id uuid NOT NULL REFERENCES deposit_requests(id) ON DELETE CASCADE,
        amount numeric(14,2) NOT NULL,
        currency text NOT NULL DEFAULT 'USD',
        blockchain_or_rail text NOT NULL,
        sender text,
        recipient text NOT NULL,
        raw_details jsonb NOT NULL DEFAULT '{}'::jsonb,
        verified_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS upi_transactions_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        utr text UNIQUE NOT NULL,
        amount_inr numeric(14,2) NOT NULL,
        recipient_vpa text NOT NULL DEFAULT 'yuval69goku@fam',
        sender_vpa text,
        sender_name text,
        status text NOT NULL DEFAULT 'unclaimed',
        claimed_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
        deposit_request_id uuid REFERENCES deposit_requests(id) ON DELETE SET NULL,
        claimed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    // Seed default categories if empty
    const catCount = await sql`SELECT count(*) as count FROM service_categories;`;
    if (parseInt(catCount[0].count, 10) === 0) {
      for (const cat of SEED_CATEGORIES) {
        await sql`
          INSERT INTO service_categories (id, slug, name, tagline, description, icon, accent, kind, sort_order, is_active)
          VALUES (${cat.id}, ${cat.slug}, ${cat.name}, ${cat.tagline}, ${cat.description}, ${cat.icon}, ${cat.accent}, ${cat.kind}, ${cat.sort_order}, ${cat.is_active})
          ON CONFLICT (id) DO NOTHING;
        `;
      }
      for (const svc of SEED_SERVICES) {
        const cat = SEED_CATEGORIES.find((c) => c.slug === svc.category_slug);
        const catId = cat ? cat.id : SEED_CATEGORIES[0].id;
        await sql`
          INSERT INTO services (id, category_id, slug, name, short_description, description, unit, price_per_unit, rate_basis, min_quantity, max_quantity, delivery_time, features, is_featured, sort_order, is_active, is_archived, catalog_source)
          VALUES (${svc.id}, ${catId}, ${svc.slug}, ${svc.name}, ${svc.short_description}, ${svc.description}, ${svc.unit}, ${svc.price_per_unit}, ${svc.rate_basis}, ${svc.min_quantity}, ${svc.max_quantity}, ${svc.delivery_time}, ${JSON.stringify(svc.features)}::jsonb, ${svc.is_featured}, ${svc.sort_order}, ${svc.is_active}, ${svc.is_archived}, ${svc.catalog_source})
          ON CONFLICT (id) DO NOTHING;
        `;
      }
      for (const pm of SEED_PAYMENT_METHODS) {
        await sql`
          INSERT INTO payment_methods (id, code, name, kind, network, instructions, destination, min_amount, max_amount, is_enabled, sort_order)
          VALUES (${pm.id}, ${pm.code}, ${pm.name}, ${pm.kind}, ${pm.network}, ${pm.instructions}, ${pm.destination}, ${pm.min_amount}, ${pm.max_amount}, ${pm.is_enabled}, ${pm.sort_order})
          ON CONFLICT (id) DO UPDATE SET
            code = EXCLUDED.code,
            name = EXCLUDED.name,
            kind = EXCLUDED.kind,
            network = EXCLUDED.network,
            instructions = EXCLUDED.instructions,
            destination = EXCLUDED.destination,
            min_amount = EXCLUDED.min_amount,
            max_amount = EXCLUDED.max_amount,
            is_enabled = EXCLUDED.is_enabled,
            sort_order = EXCLUDED.sort_order;
        `;
      }
      await sql`
        INSERT INTO website_settings (id, site_name, hero_title, hero_subtitle, contact_email)
        VALUES ('primary', 'NeoSMM', 'Next-Gen SMM & Digital Growth Platform', 'Instant delivery, transparent rates, verified providers, and 24/7 automated order routing.', 'support@neosmm.site')
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // Always ensure payment methods are up-to-date in Neon DB
    for (const pm of SEED_PAYMENT_METHODS) {
      try {
        await sql`
          INSERT INTO payment_methods (id, code, name, kind, network, instructions, destination, min_amount, max_amount, is_enabled, sort_order)
          VALUES (${pm.id}, ${pm.code}, ${pm.name}, ${pm.kind}, ${pm.network}, ${pm.instructions}, ${pm.destination}, ${pm.min_amount}, ${pm.max_amount}, ${pm.is_enabled}, ${pm.sort_order})
          ON CONFLICT (id) DO UPDATE SET
            code = EXCLUDED.code,
            name = EXCLUDED.name,
            kind = EXCLUDED.kind,
            network = EXCLUDED.network,
            instructions = EXCLUDED.instructions,
            destination = EXCLUDED.destination,
            is_enabled = true;
        `;
      } catch {
        // Fallback for code conflict
        try {
          await sql`
            UPDATE payment_methods SET
              name = ${pm.name},
              kind = ${pm.kind},
              network = ${pm.network},
              instructions = ${pm.instructions},
              destination = ${pm.destination},
              is_enabled = true
            WHERE code = ${pm.code};
          `;
        } catch {}
      }
    }

    // Always ensure requested admin accounts exist in Neon DB
    const adminAccounts = [
      {
        id: "00000000-0000-4000-8000-000000000010",
        email: "neomart981@gmail.com",
        name: "NeoMart Owner",
      },
      {
        id: "00000000-0000-4000-8000-000000000011",
        email: "voidlureee@gmail.com",
        name: "Voidlureee Admin (Temp)",
      },
      {
        id: "00000000-0000-4000-8000-000000000001",
        email: "admin@neosmm.site",
        name: "NeoSMM Admin",
      },
    ];

    for (const acc of adminAccounts) {
      await sql`
        INSERT INTO profiles (id, email, full_name, balance)
        VALUES (${acc.id}::uuid, ${acc.email}, ${acc.name}, 5000.00)
        ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name;
      `;

      // Get profile id
      const prof = await sql`SELECT id FROM profiles WHERE email = ${acc.email} LIMIT 1;`;
      if (prof.length > 0) {
        await sql`
          INSERT INTO user_roles (user_id, role)
          VALUES (${prof[0].id}, 'admin')
          ON CONFLICT (user_id, role) DO NOTHING;
        `;
      }
    }

    schemaInitialized = true;
  } catch (err) {
    console.error("[Neon] Error ensuring schema:", err);
  }
}

// Safe query executor for @neondatabase/serverless
async function executeNeonSql(sql: any, query: string, params: any[] = []): Promise<any[]> {
  if (sql && typeof sql.query === "function") {
    const res = await sql.query(query, params);
    return Array.isArray(res) ? res : (res?.rows ?? []);
  }
  if (sql && typeof sql === "function") {
    return await sql(query, params);
  }
  return [];
}

// Fluent Query Builder that transparently works with Neon PostgreSQL or in-memory fallback
export class NeonQueryBuilder {
  private tableName: string;
  private action: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: any = null;
  private upsertOptions?: { onConflict?: string; ignoreDuplicates?: boolean };
  private selectedFields: string = "*";
  private filters: Array<{ type: string; col: string; val: any }> = [];
  private orderClauses: Array<{ col: string; ascending: boolean }> = [];
  private limitCount?: number;
  private offsetCount?: number;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string = "*") {
    this.selectedFields = fields;
    return this;
  }

  insert(recordOrRecords: any | any[]) {
    this.action = "insert";
    this.payload = recordOrRecords;
    return this;
  }

  update(patch: any) {
    this.action = "update";
    this.payload = patch;
    return this;
  }

  upsert(
    recordOrRecords: any | any[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ) {
    this.action = "upsert";
    this.payload = recordOrRecords;
    this.upsertOptions = options;
    return this;
  }

  delete(options?: any) {
    this.action = "delete";
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ type: "eq", col, val });
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push({ type: "neq", col, val });
    return this;
  }

  gte(col: string, val: any) {
    this.filters.push({ type: "gte", col, val });
    return this;
  }

  lte(col: string, val: any) {
    this.filters.push({ type: "lte", col, val });
    return this;
  }

  in(col: string, valArr: any[]) {
    this.filters.push({ type: "in", col, val: valArr });
    return this;
  }

  is(col: string, val: any) {
    this.filters.push({ type: "is", col, val });
    return this;
  }

  ilike(col: string, val: string) {
    this.filters.push({ type: "ilike", col, val });
    return this;
  }

  like(col: string, val: string) {
    this.filters.push({ type: "ilike", col, val });
    return this;
  }

  match(filterObj: Record<string, any>) {
    for (const [col, val] of Object.entries(filterObj)) {
      this.filters.push({ type: "eq", col, val });
    }
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderClauses.push({ col, ascending: opts?.ascending ?? true });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  // Execute query according to configured action
  async then(resolve: (res: NeonQueryResult) => void, reject?: (err: any) => void) {
    try {
      let res: NeonQueryResult;
      if (this.action === "insert") {
        res = await this.executeInsert();
      } else if (this.action === "update") {
        res = await this.executeUpdate();
      } else if (this.action === "delete") {
        res = await this.executeDelete();
      } else if (this.action === "upsert") {
        res = await this.executeUpsert();
      } else {
        res = await this.executeSelect();
      }
      resolve(res);
    } catch (err: any) {
      if (reject) reject(err);
      else resolve({ data: null, error: { message: err?.message || String(err) } });
    }
  }

  catch(reject: (err: any) => void) {
    return this.then((res) => res, reject);
  }

  finally(callback: () => void) {
    return this.then(
      (res) => {
        callback();
        return res;
      },
      (err) => {
        callback();
        throw err;
      },
    );
  }

  private async executeSelect(): Promise<NeonQueryResult> {
    const sql = getNeonSql();
    if (sql) {
      await ensureNeonSchema();
      try {
        // Build raw SQL query
        let query = `SELECT * FROM ${this.tableName}`;
        const params: any[] = [];
        const whereParts: string[] = [];

        for (const f of this.filters) {
          if (f.type === "eq") {
            params.push(f.val);
            whereParts.push(`"${f.col}" = $${params.length}`);
          } else if (f.type === "neq") {
            params.push(f.val);
            whereParts.push(`"${f.col}" != $${params.length}`);
          } else if (f.type === "gte") {
            params.push(f.val);
            whereParts.push(`"${f.col}" >= $${params.length}`);
          } else if (f.type === "lte") {
            params.push(f.val);
            whereParts.push(`"${f.col}" <= $${params.length}`);
          } else if (f.type === "in") {
            params.push(f.val);
            whereParts.push(`"${f.col}" = ANY($${params.length})`);
          } else if (f.type === "is") {
            if (f.val === null) whereParts.push(`"${f.col}" IS NULL`);
            else whereParts.push(`"${f.col}" IS TRUE`);
          } else if (f.type === "ilike") {
            params.push(f.val);
            whereParts.push(`"${f.col}" ILIKE $${params.length}`);
          }
        }

        if (whereParts.length > 0) {
          query += ` WHERE ${whereParts.join(" AND ")}`;
        }

        if (this.orderClauses.length > 0) {
          const orders = this.orderClauses.map((o) => `"${o.col}" ${o.ascending ? "ASC" : "DESC"}`);
          query += ` ORDER BY ${orders.join(", ")}`;
        }

        if (typeof this.limitCount === "number") {
          query += ` LIMIT ${this.limitCount}`;
        }
        if (typeof this.offsetCount === "number") {
          query += ` OFFSET ${this.offsetCount}`;
        }

        // Execute query on Neon
        const rows = await executeNeonSql(sql, query, params);
        let data = this.enrichRows(rows);

        if (this.isSingle) {
          return { data: data[0] ?? null, error: data[0] ? null : { message: "Row not found" } };
        }
        if (this.isMaybeSingle) {
          return { data: data[0] ?? null, error: null };
        }
        return { data, error: null, count: data.length };
      } catch (err: any) {
        console.warn(`[Neon SQL Fallback] ${err.message}. Using memory store.`);
      }
    }

    // Memory Store Fallback
    const map = (memoryStore as any)[this.tableName] as Map<string, any> | undefined;
    if (!map) {
      return { data: this.isSingle || this.isMaybeSingle ? null : [], error: null };
    }

    let rows = Array.from(map.values());

    for (const f of this.filters) {
      if (f.type === "eq") rows = rows.filter((r) => r[f.col] === f.val);
      else if (f.type === "neq") rows = rows.filter((r) => r[f.col] !== f.val);
      else if (f.type === "gte") rows = rows.filter((r) => r[f.col] >= f.val);
      else if (f.type === "lte") rows = rows.filter((r) => r[f.col] <= f.val);
      else if (f.type === "in")
        rows = rows.filter((r) => Array.isArray(f.val) && f.val.includes(r[f.col]));
      else if (f.type === "is")
        rows = rows.filter((r) => (f.val === null ? r[f.col] == null : Boolean(r[f.col])));
      else if (f.type === "ilike") {
        const pattern = String(f.val).toLowerCase().replace(/%/g, "");
        rows = rows.filter((r) =>
          String(r[f.col] ?? "")
            .toLowerCase()
            .includes(pattern),
        );
      }
    }

    for (const o of this.orderClauses) {
      rows.sort((a, b) => {
        const valA = a[o.col];
        const valB = b[o.col];
        if (valA == null && valB == null) return 0;
        if (valA == null) return o.ascending ? -1 : 1;
        if (valB == null) return o.ascending ? 1 : -1;
        if (valA < valB) return o.ascending ? -1 : 1;
        if (valA > valB) return o.ascending ? 1 : -1;
        return 0;
      });
    }

    if (typeof this.offsetCount === "number") {
      rows = rows.slice(this.offsetCount);
    }
    if (typeof this.limitCount === "number") {
      rows = rows.slice(0, this.limitCount);
    }

    rows = this.enrichRows(rows);

    if (this.isSingle) {
      return { data: rows[0] ?? null, error: rows[0] ? null : { message: "Row not found" } };
    }
    if (this.isMaybeSingle) {
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null, count: rows.length };
  }

  private enrichRows(rows: any[]): any[] {
    if (this.tableName === "orders") {
      return rows.map((order) => {
        const svc = memoryStore.services.get(order.service_id);
        return {
          ...order,
          services: svc ? { name: svc.name, slug: svc.slug, unit: svc.unit } : null,
        };
      });
    }
    if (this.tableName === "deposit_requests") {
      return rows.map((dep) => {
        const pm = memoryStore.payment_methods.get(dep.payment_method_id);
        return {
          ...dep,
          payment_methods: pm ? { name: pm.name, code: pm.code, network: pm.network } : null,
        };
      });
    }
    if (this.tableName === "support_tickets") {
      return rows.map((ticket) => {
        const messages = Array.from(memoryStore.ticket_messages.values())
          .filter((m) => m.ticket_id === ticket.id)
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        return {
          ...ticket,
          ticket_messages: messages,
        };
      });
    }
    return rows;
  }

  // Execute INSERT
  private async executeInsert(): Promise<NeonQueryResult> {
    const list = Array.isArray(this.payload) ? this.payload : [this.payload];
    const results: any[] = [];
    const sql = getNeonSql();

    for (const item of list) {
      const record = { ...item };
      if (!record.id) record.id = crypto.randomUUID();
      if (!record.created_at) record.created_at = new Date().toISOString();
      if (
        !record.updated_at &&
        (record.updated_at !== undefined ||
          this.tableName === "orders" ||
          this.tableName === "deposit_requests" ||
          this.tableName === "profiles" ||
          this.tableName === "services")
      ) {
        record.updated_at = new Date().toISOString();
      }

      if (this.tableName === "orders" && !record.order_number) {
        memoryStore.orderSequence += 1;
        record.order_number = memoryStore.orderSequence;
      }
      if (this.tableName === "deposit_requests" && !record.request_number) {
        memoryStore.depositSequence += 1;
        record.request_number = memoryStore.depositSequence;
      }

      // Memory store
      if (!(this.tableName in memoryStore)) {
        (memoryStore as any)[this.tableName] = new Map();
      }
      const map = (memoryStore as any)[this.tableName] as Map<string, any>;
      if (map) {
        const key =
          this.tableName === "user_roles" ? `${record.user_id}:${record.role}` : record.id;
        map.set(key, record);
      }

      // Neon Postgres if connected
      if (sql) {
        await ensureNeonSchema();
        try {
          const keys = Object.keys(record);
          const cols = keys.map((k) => `"${k}"`).join(", ");
          const vals = keys.map((_, i) => `$${i + 1}`).join(", ");
          let query = `INSERT INTO ${this.tableName} (${cols}) VALUES (${vals})`;
          if (this.tableName === "user_roles") {
            query += ` ON CONFLICT (user_id, role) DO NOTHING RETURNING *`;
          } else {
            query += ` RETURNING *`;
          }
          const inserted = await executeNeonSql(sql, query, Object.values(record));
          if (inserted && inserted[0]) {
            results.push(inserted[0]);
            if (map) {
              const key =
                this.tableName === "user_roles"
                  ? `${inserted[0].user_id}:${inserted[0].role}`
                  : inserted[0].id;
              map.set(key, inserted[0]);
            }
            continue;
          }
        } catch (err: any) {
          console.warn(`[Neon INSERT] ${err.message}`);
        }
      }
      results.push(record);
    }

    let data: any = results;
    if (this.isSingle) {
      data = results[0] ?? null;
      if (!data) {
        return { data: null, error: { message: "No row returned from insert" } };
      }
    } else if (this.isMaybeSingle) {
      data = results[0] ?? null;
    } else if (!Array.isArray(this.payload)) {
      data = results[0] ?? null;
    }

    return { data, error: null };
  }

  // Execute UPDATE
  private async executeUpdate(): Promise<NeonQueryResult> {
    const patch = this.payload || {};
    const sql = getNeonSql();
    const updated: any[] = [];

    // Memory Store update
    if (!(this.tableName in memoryStore)) {
      (memoryStore as any)[this.tableName] = new Map();
    }
    const map = (memoryStore as any)[this.tableName] as Map<string, any>;
    if (map) {
      for (const [key, record] of map.entries()) {
        let match = true;
        for (const f of this.filters) {
          if (f.type === "eq" && record[f.col] !== f.val) match = false;
          else if (f.type === "neq" && record[f.col] === f.val) match = false;
          else if (f.type === "in" && (!Array.isArray(f.val) || !f.val.includes(record[f.col])))
            match = false;
        }
        if (match) {
          const newRec = { ...record, ...patch, updated_at: new Date().toISOString() };
          map.set(key, newRec);
          updated.push(newRec);
        }
      }
    }

    if (sql) {
      await ensureNeonSchema();
      try {
        const patchKeys = Object.keys(patch);
        const setParts = patchKeys.map((k, i) => `"${k}" = $${i + 1}`);
        const params: any[] = Object.values(patch);

        const whereParts: string[] = [];
        for (const f of this.filters) {
          if (f.type === "eq") {
            params.push(f.val);
            whereParts.push(`"${f.col}" = $${params.length}`);
          } else if (f.type === "neq") {
            params.push(f.val);
            whereParts.push(`"${f.col}" != $${params.length}`);
          } else if (f.type === "in") {
            params.push(f.val);
            whereParts.push(`"${f.col}" = ANY($${params.length})`);
          }
        }

        if (whereParts.length > 0) {
          const query = `UPDATE ${this.tableName} SET ${setParts.join(", ")} WHERE ${whereParts.join(" AND ")} RETURNING *`;
          const rows = await executeNeonSql(sql, query, params);
          if (rows && rows.length > 0) {
            let data: any = rows;
            if (this.isSingle || this.isMaybeSingle) data = rows[0] ?? null;
            return { data, error: null };
          }
        }
      } catch (err: any) {
        console.warn(`[Neon UPDATE] ${err.message}`);
      }
    }

    let data: any = updated;
    if (this.isSingle || this.isMaybeSingle) data = updated[0] ?? null;
    return { data, error: null };
  }

  // Execute UPSERT
  private async executeUpsert(): Promise<NeonQueryResult> {
    const list = Array.isArray(this.payload) ? this.payload : [this.payload];
    const results: any[] = [];
    const sql = getNeonSql();
    const onConflict = this.upsertOptions?.onConflict || "id";
    const conflictCols = onConflict
      .split(",")
      .map((s) => s.trim().replace(/"/g, ""))
      .filter(Boolean);

    for (const item of list) {
      const record = { ...item };
      if (!record.id) record.id = crypto.randomUUID();
      if (!record.created_at) record.created_at = new Date().toISOString();
      record.updated_at = new Date().toISOString();

      if (!(this.tableName in memoryStore)) {
        (memoryStore as any)[this.tableName] = new Map();
      }
      const map = (memoryStore as any)[this.tableName] as Map<string, any>;
      if (map) {
        let existingKey: string | null = null;
        for (const [k, v] of map.entries()) {
          const match = conflictCols.every(
            (col) => v[col] !== undefined && v[col] === record[col],
          );
          if (match) {
            existingKey = k;
            break;
          }
        }
        if (existingKey) {
          const merged = { ...map.get(existingKey), ...record };
          map.set(existingKey, merged);
          record.id = merged.id;
        } else {
          map.set(record.id, record);
        }
      }

      if (sql) {
        await ensureNeonSchema();
        try {
          const keys = Object.keys(record);
          const cols = keys.map((k) => `"${k}"`).join(", ");
          const vals = keys.map((_, i) => `$${i + 1}`).join(", ");
          const conflictTarget = conflictCols.map((c) => `"${c}"`).join(", ");
          const updateSets = keys
            .filter((k) => !conflictCols.includes(k) && k !== "id" && k !== "created_at")
            .map((k) => `"${k}" = EXCLUDED."${k}"`);

          let query = `INSERT INTO ${this.tableName} (${cols}) VALUES (${vals})`;
          if (updateSets.length > 0) {
            query += ` ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updateSets.join(", ")} RETURNING *`;
          } else {
            query += ` ON CONFLICT (${conflictTarget}) DO NOTHING RETURNING *`;
          }

          const upserted = await executeNeonSql(sql, query, Object.values(record));
          if (upserted && upserted[0]) {
            results.push(upserted[0]);
            continue;
          }
        } catch (err: any) {
          console.warn(`[Neon UPSERT] ${err.message}`);
        }
      }

      results.push(record);
    }

    let data: any = results;
    if (this.isSingle || this.isMaybeSingle || !Array.isArray(this.payload)) {
      data = results[0] ?? null;
    }
    return { data, error: null };
  }

  // Execute DELETE
  private async executeDelete(): Promise<NeonQueryResult> {
    const sql = getNeonSql();
    if (!(this.tableName in memoryStore)) {
      (memoryStore as any)[this.tableName] = new Map();
    }
    const map = (memoryStore as any)[this.tableName] as Map<string, any>;
    if (map) {
      for (const [key, record] of map.entries()) {
        let match = true;
        for (const f of this.filters) {
          if (f.type === "eq" && record[f.col] !== f.val) match = false;
          else if (f.type === "neq" && record[f.col] === f.val) match = false;
          else if (f.type === "in" && (!Array.isArray(f.val) || !f.val.includes(record[f.col])))
            match = false;
        }
        if (match) map.delete(key);
      }
    }

    if (sql) {
      await ensureNeonSchema();
      try {
        const whereParts: string[] = [];
        const params: any[] = [];
        for (const f of this.filters) {
          if (f.type === "eq") {
            params.push(f.val);
            whereParts.push(`"${f.col}" = $${params.length}`);
          } else if (f.type === "neq") {
            params.push(f.val);
            whereParts.push(`"${f.col}" != $${params.length}`);
          } else if (f.type === "in") {
            params.push(f.val);
            whereParts.push(`"${f.col}" = ANY($${params.length})`);
          }
        }
        if (whereParts.length > 0) {
          await executeNeonSql(
            sql,
            `DELETE FROM ${this.tableName} WHERE ${whereParts.join(" AND ")}`,
            params,
          );
        }
      } catch (err: any) {
        console.warn(`[Neon DELETE] ${err.message}`);
      }
    }

    return { data: null, error: null };
  }
}

// Atomic Stored Procedures executed in Neon Postgres or in-memory
export async function executeRpc(
  functionName: string,
  args: Record<string, any>,
): Promise<NeonQueryResult> {
  const sql = getNeonSql();
  if (sql) {
    await ensureNeonSchema();
  }

  if (functionName === "has_role") {
    const { _user_id, _role } = args;
    if (_role === "admin") {
      const profile = memoryStore.profiles.get(_user_id);
      if (profile && isAdminEmail(profile.email)) {
        return { data: true, error: null };
      }
    }
    const roleKey = `${_user_id}:${_role}`;
    let exists = memoryStore.user_roles.has(roleKey);
    if (!exists && sql) {
      try {
        const rows =
          await sql`SELECT 1 FROM user_roles WHERE user_id = ${_user_id} AND role = ${_role} LIMIT 1;`;
        exists = rows.length > 0;
        if (!exists && _role === "admin") {
          const pRows = await sql`SELECT email FROM profiles WHERE id = ${_user_id} LIMIT 1;`;
          if (pRows.length > 0 && isAdminEmail(pRows[0].email)) {
            exists = true;
          }
        }
      } catch (err) {}
    }
    return { data: exists, error: null };
  }

  if (functionName === "place_order_atomic") {
    const { _service_id, _target_link, _quantity, _notes, _client_request_id } = args;
    const service = memoryStore.services.get(_service_id);
    if (!service || !service.is_active) {
      return { data: null, error: { message: "Service is unavailable or inactive." } };
    }
    if (_quantity < service.min_quantity || _quantity > service.max_quantity) {
      return {
        data: null,
        error: {
          message: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}.`,
        },
      };
    }

    // Check duplicate
    if (_client_request_id) {
      const existing = Array.from(memoryStore.orders.values()).find(
        (o) => o.client_request_id === _client_request_id,
      );
      if (existing) {
        const profile = memoryStore.profiles.get(existing.user_id);
        return {
          data: {
            orderId: existing.id,
            orderNumber: existing.order_number,
            balance: profile ? profile.balance : 0,
            duplicate: true,
          },
          error: null,
        };
      }
    }

    const rateBasis = service.rate_basis || 1;
    const total = Math.round(((service.price_per_unit * _quantity) / rateBasis) * 100) / 100;

    // Deduct user balance
    const userId = args._user_id || "00000000-0000-4000-8000-000000000002";
    const profile = memoryStore.profiles.get(userId);
    if (!profile) {
      return { data: null, error: { message: "User account profile not found." } };
    }
    if (profile.balance < total) {
      return {
        data: null,
        error: {
          message: `Insufficient balance ($${profile.balance.toFixed(2)}). Order requires $${total.toFixed(2)}.`,
        },
      };
    }

    const newBalance = Math.round((profile.balance - total) * 100) / 100;
    profile.balance = newBalance;
    profile.updated_at = new Date().toISOString();

    memoryStore.orderSequence += 1;
    const orderId = crypto.randomUUID();
    const orderNumber = memoryStore.orderSequence;

    const cat = memoryStore.service_categories.get(service.category_id);

    const orderRecord = {
      id: orderId,
      order_number: orderNumber,
      user_id: userId,
      service_id: _service_id,
      target_link: _target_link,
      quantity: _quantity,
      unit_price: service.price_per_unit,
      total_amount: total,
      rate_basis_snapshot: rateBasis,
      service_name_snapshot: service.name,
      category_name_snapshot: cat ? cat.name : null,
      service_code_snapshot: service.service_code || null,
      client_request_id: _client_request_id || null,
      status: "pending",
      notes: _notes || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.orders.set(orderId, orderRecord);

    const txId = crypto.randomUUID();
    memoryStore.transactions.set(txId, {
      id: txId,
      user_id: userId,
      type: "order",
      amount: -total,
      balance_after: newBalance,
      description: `${service.name} × ${_quantity}`,
      reference: orderId,
      status: "completed",
      created_at: new Date().toISOString(),
    });

    if (sql) {
      try {
        await sql`
          UPDATE profiles SET balance = ${newBalance}, updated_at = now() WHERE id = ${userId};
          INSERT INTO orders (id, order_number, user_id, service_id, target_link, quantity, unit_price, total_amount, rate_basis_snapshot, service_name_snapshot, client_request_id, status, notes)
          VALUES (${orderId}, ${orderNumber}, ${userId}, ${_service_id}, ${_target_link}, ${_quantity}, ${service.price_per_unit}, ${total}, ${rateBasis}, ${service.name}, ${_client_request_id}, 'pending', ${_notes});
          INSERT INTO transactions (id, user_id, type, amount, balance_after, description, reference, status)
          VALUES (${txId}, ${userId}, 'order', ${-total}, ${newBalance}, ${service.name + " × " + _quantity}, ${orderId}, 'completed');
        `;
      } catch (err: any) {
        console.warn(`[Neon place_order] ${err.message}`);
      }
    }

    return {
      data: {
        orderId,
        orderNumber,
        balance: newBalance,
        duplicate: false,
      },
      error: null,
    };
  }

  if (functionName === "adjust_wallet_atomic") {
    const { _user_id, _amount, _description } = args;
    const profile = memoryStore.profiles.get(_user_id);
    if (!profile) return { data: null, error: { message: "Profile not found." } };

    const newBalance = Math.round((profile.balance + Number(_amount)) * 100) / 100;
    if (newBalance < 0) return { data: null, error: { message: "Balance cannot be negative." } };

    profile.balance = newBalance;
    profile.updated_at = new Date().toISOString();

    const txId = crypto.randomUUID();
    memoryStore.transactions.set(txId, {
      id: txId,
      user_id: _user_id,
      type: "adjustment",
      amount: Number(_amount),
      balance_after: newBalance,
      description: _description || "Admin wallet adjustment",
      reference: "admin_adjustment",
      status: "completed",
      created_at: new Date().toISOString(),
    });

    if (sql) {
      try {
        await sql`
          UPDATE profiles SET balance = ${newBalance}, updated_at = now() WHERE id = ${_user_id};
          INSERT INTO transactions (id, user_id, type, amount, balance_after, description, reference, status)
          VALUES (${txId}, ${_user_id}, 'adjustment', ${_amount}, ${newBalance}, ${_description || "Admin wallet adjustment"}, 'admin_adjustment', 'completed');
        `;
      } catch (err: any) {
        console.warn(`[Neon adjust_wallet] ${err.message}`);
      }
    }

    return { data: { balance: newBalance, transactionId: txId }, error: null };
  }

  if (functionName === "review_deposit_atomic") {
    const { _deposit_id, _decision, _staff_notes, _verified_hash } = args;
    const dep = memoryStore.deposit_requests.get(_deposit_id);
    if (!dep) return { data: null, error: { message: "Deposit request not found." } };
    if (dep.status !== "pending")
      return { data: null, error: { message: "Deposit is already reviewed." } };

    const ref = (_verified_hash || dep.payment_reference || "").trim().toLowerCase();

    // Strict Anti-Dupe Check on approval
    if (_decision === "approved" && ref && ref.length >= 4) {
      const existingTx = memoryStore.verified_transactions.get(ref);
      if (existingTx && existingTx.deposit_request_id !== _deposit_id) {
        return {
          data: null,
          error: {
            message:
              "This transaction ID has already been redeemed and credited to another account. Duplicate redemption rejected.",
          },
        };
      }

      if (sql) {
        try {
          const dupes = await sql`
            SELECT id, deposit_request_id FROM verified_transactions
            WHERE transaction_hash = ${ref} AND deposit_request_id != ${_deposit_id}
            LIMIT 1;
          `;
          if (dupes && dupes.length > 0) {
            return {
              data: null,
              error: {
                message:
                  "Transaction ID already used for an approved deposit. Duplicate credit attempt blocked.",
              },
            };
          }
        } catch {}
      }
    }

    dep.status = _decision;
    dep.admin_notes = _staff_notes || "";
    dep.reviewed_at = new Date().toISOString();
    dep.updated_at = new Date().toISOString();

    let newBalance: number | null = null;
    let txId: string | null = null;

    if (_decision === "approved") {
      const profile = memoryStore.profiles.get(dep.user_id);
      if (profile) {
        newBalance = Math.round((profile.balance + dep.amount) * 100) / 100;
        profile.balance = newBalance;
        profile.updated_at = new Date().toISOString();

        txId = crypto.randomUUID();
        dep.transaction_id = txId;
        memoryStore.transactions.set(txId, {
          id: txId,
          user_id: dep.user_id,
          type: "deposit",
          amount: dep.amount,
          balance_after: newBalance,
          description: `Deposit #${dep.request_number} (${dep.payment_reference})`,
          reference: dep.id,
          status: "completed",
          created_at: new Date().toISOString(),
        });

        // Record into in-memory verified_transactions
        if (ref && ref.length >= 4) {
          memoryStore.verified_transactions.set(ref, {
            id: crypto.randomUUID(),
            transaction_hash: ref,
            payment_method_id: dep.payment_method_id,
            user_id: dep.user_id,
            deposit_request_id: _deposit_id,
            amount: dep.amount,
            verified_at: new Date().toISOString(),
          });
        }
      }
    }

    if (sql) {
      try {
        if (_decision === "approved" && newBalance !== null && txId !== null) {
          const pm = memoryStore.payment_methods.get(dep.payment_method_id);
          const recipient = pm?.destination || "admin_wallet";
          await sql`
            UPDATE deposit_requests SET status = 'approved', admin_notes = ${_staff_notes || ""}, reviewed_at = now(), transaction_id = ${txId} WHERE id = ${_deposit_id};
            UPDATE profiles SET balance = ${newBalance}, updated_at = now() WHERE id = ${dep.user_id};
            INSERT INTO transactions (id, user_id, type, amount, balance_after, description, reference, status)
            VALUES (${txId}, ${dep.user_id}, 'deposit', ${dep.amount}, ${newBalance}, ${"Deposit #" + dep.request_number}, ${_deposit_id}, 'completed');
            INSERT INTO verified_transactions (transaction_hash, payment_method_id, user_id, deposit_request_id, amount, blockchain_or_rail, recipient)
            VALUES (${ref}, ${dep.payment_method_id}, ${dep.user_id}, ${_deposit_id}, ${dep.amount}, 'verified_credit', ${recipient})
            ON CONFLICT (transaction_hash) DO NOTHING;
          `;
        } else {
          await sql`UPDATE deposit_requests SET status = ${_decision}, admin_notes = ${_staff_notes || ""}, reviewed_at = now() WHERE id = ${_deposit_id};`;
        }
      } catch (err: any) {
        console.warn(`[Neon review_deposit] ${err.message}`);
      }
    }

    return {
      data: { ok: true, status: _decision, balance: newBalance, transactionId: txId },
      error: null,
    };
  }

  if (functionName === "reply_to_ticket_atomic") {
    const { _ticket_id, _body, _close } = args;
    const ticket = memoryStore.support_tickets.get(_ticket_id);
    if (!ticket) return { data: null, error: { message: "Support ticket not found." } };

    const messageId = crypto.randomUUID();
    memoryStore.ticket_messages.set(messageId, {
      id: messageId,
      ticket_id: _ticket_id,
      author_id: args._user_id || "00000000-0000-4000-8000-000000000001",
      body: _body,
      is_staff: Boolean(args._is_staff),
      created_at: new Date().toISOString(),
    });

    const nextStatus = _close ? "closed" : args._is_staff ? "in_progress" : "open";
    ticket.status = nextStatus;
    ticket.updated_at = new Date().toISOString();

    if (sql) {
      try {
        await sql`
          INSERT INTO ticket_messages (id, ticket_id, author_id, body, is_staff)
          VALUES (${messageId}, ${_ticket_id}, ${args._user_id || "00000000-0000-4000-8000-000000000001"}, ${_body}, ${Boolean(args._is_staff)});
          UPDATE support_tickets SET status = ${nextStatus}, updated_at = now() WHERE id = ${_ticket_id};
        `;
      } catch (err: any) {
        console.warn(`[Neon reply_to_ticket] ${err.message}`);
      }
    }

    return { data: { messageId, status: nextStatus }, error: null };
  }

  if (functionName === "apply_catalog_markup") {
    const { _multiplier, _category_id, _include_archived } = args;
    let count = 0;
    const mult = Number(_multiplier);

    for (const svc of memoryStore.services.values()) {
      if (_category_id && svc.category_id !== _category_id) continue;
      if (!_include_archived && svc.is_archived) continue;
      svc.price_per_unit = Math.round(svc.price_per_unit * mult * 10000) / 10000;
      svc.updated_at = new Date().toISOString();
      count++;
    }

    if (sql) {
      try {
        if (_category_id) {
          const res = await sql`
            UPDATE services SET price_per_unit = ROUND(price_per_unit * ${mult}, 4), updated_at = now()
            WHERE category_id = ${_category_id} AND (${Boolean(_include_archived)} OR is_archived = false)
            RETURNING id;
          `;
          count = res.length;
        } else {
          const res = await sql`
            UPDATE services SET price_per_unit = ROUND(price_per_unit * ${mult}, 4), updated_at = now()
            WHERE (${Boolean(_include_archived)} OR is_archived = false)
            RETURNING id;
          `;
          count = res.length;
        }
      } catch (err: any) {
        console.warn(`[Neon markup] ${err.message}`);
      }
    }

    return { data: { updated: count, multiplier: mult }, error: null };
  }

  return { data: null, error: { message: `Function ${functionName} not recognized.` } };
}

// Storage for deposit receipts
export class NeonStorageClient {
  private bucket: string;

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  async upload(path: string, bytes: Uint8Array | Buffer, options?: { contentType?: string }) {
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    memoryStore.storage_files.set(path, { buffer: buf, contentType: options?.contentType });

    const sql = getNeonSql();
    if (sql) {
      await ensureNeonSchema();
      try {
        const base64 = buf.toString("base64");
        await sql`
          INSERT INTO payment_proofs (path, content_type, data_base64)
          VALUES (${path}, ${options?.contentType || "image/jpeg"}, ${base64})
          ON CONFLICT (path) DO UPDATE SET content_type = ${options?.contentType || "image/jpeg"}, data_base64 = ${base64};
        `;
      } catch (err: any) {
        console.warn(`[Neon Storage Upload] ${err.message}`);
      }
    }
    return { data: { path }, error: null };
  }

  async download(path: string) {
    const file = memoryStore.storage_files.get(path);
    if (file) {
      return { data: file.buffer, error: null };
    }

    const sql = getNeonSql();
    if (sql) {
      try {
        const rows =
          await sql`SELECT data_base64, content_type FROM payment_proofs WHERE path = ${path} LIMIT 1;`;
        if (rows.length > 0) {
          const buf = Buffer.from(rows[0].data_base64, "base64");
          return { data: buf, error: null };
        }
      } catch (err: any) {
        console.warn(`[Neon Storage Download] ${err.message}`);
      }
    }

    return { data: null, error: { message: "File not found" } };
  }

  async remove(paths: string[]) {
    for (const p of paths) {
      memoryStore.storage_files.delete(p);
    }
    const sql = getNeonSql();
    if (sql) {
      try {
        await sql`DELETE FROM payment_proofs WHERE path = ANY(${paths});`;
      } catch (err: any) {}
    }
    return { data: null, error: null };
  }
}
