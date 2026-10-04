import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { neon as supabase } from "@/integrations/neon";

export type Category = Database["public"]["Tables"]["service_categories"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];

export const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const [categories, services] = await Promise.all([
    supabase
      .from("service_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .eq("is_archived", false)
      .order("sort_order", { ascending: true }),
  ]);

  if (categories.error) throw new Error(categories.error.message);

  return {
    categories: (categories.data ?? []) as Category[],
    services: (services.data ?? []) as Service[],
  };
});

export const getService = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { data: service, error } = await supabase
      .from("services")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .eq("is_archived", false)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!service) return null;

    const { data: category } = await supabase
      .from("service_categories")
      .select("*")
      .eq("id", service.category_id)
      .maybeSingle();

    const { data: related } = await supabase
      .from("services")
      .select("*")
      .eq("category_id", service.category_id)
      .eq("is_active", true)
      .neq("id", service.id)
      .order("sort_order", { ascending: true })
      .limit(3);

    return {
      service: service as Service,
      category: (category ?? null) as Category | null,
      related: (related ?? []) as Service[],
    };
  });

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        name: z.string().min(2).max(120),
        email: z.string().email().max(200),
        subject: z.string().max(200).optional(),
        message: z.string().min(10).max(4000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { error } = await supabase.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      subject: data.subject ?? null,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const catalogQueryOptions = {
  queryKey: ["catalog"],
  queryFn: () => listCatalog(),
  staleTime: 5 * 60 * 1000,
};

export const serviceQueryOptions = (slug: string) => ({
  queryKey: ["service", slug],
  queryFn: () => getService({ data: { slug } }),
  staleTime: 5 * 60 * 1000,
});
