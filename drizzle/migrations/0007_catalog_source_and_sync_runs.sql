-- Mark catalog provenance so provisional Neo Mart data is never confused with imported source data
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS catalog_source text NOT NULL DEFAULT 'neomart_provisional',
  ADD COLUMN IF NOT EXISTS source_service_id text,
  ADD COLUMN IF NOT EXISTS source_synced_at timestamptz;

ALTER TABLE public.services
  ADD CONSTRAINT services_catalog_source_check
  CHECK (catalog_source IN ('neomart_provisional', 'imported'));

CREATE UNIQUE INDEX IF NOT EXISTS services_source_service_id_key
  ON public.services (source_service_id)
  WHERE source_service_id IS NOT NULL;

-- Extra verified source fields on the staging table
ALTER TABLE public.provider_services
  ADD COLUMN IF NOT EXISTS source_rate_basis integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS source_start_time text,
  ADD COLUMN IF NOT EXISTS source_delivery_time text,
  ADD COLUMN IF NOT EXISTS source_description text,
  ADD COLUMN IF NOT EXISTS source_unit text,
  ADD COLUMN IF NOT EXISTS target_category_id uuid REFERENCES public.service_categories(id);

ALTER TABLE public.provider_services
  ADD CONSTRAINT provider_services_rate_basis_check
  CHECK (source_rate_basis IN (1, 1000));

-- Audit trail for every staging / publish run
CREATE TABLE IF NOT EXISTS public.catalog_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.providers(id),
  actor_id uuid REFERENCES auth.users(id),
  kind text NOT NULL CHECK (kind IN ('stage', 'publish')),
  source_label text NOT NULL,
  rows_received integer NOT NULL DEFAULT 0,
  rows_accepted integer NOT NULL DEFAULT 0,
  rows_failed integer NOT NULL DEFAULT 0,
  services_created integer NOT NULL DEFAULT 0,
  services_updated integer NOT NULL DEFAULT 0,
  services_archived integer NOT NULL DEFAULT 0,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.catalog_sync_runs TO authenticated;
GRANT ALL ON public.catalog_sync_runs TO service_role;

ALTER TABLE public.catalog_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read catalog sync runs" ON public.catalog_sync_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert catalog sync runs" ON public.catalog_sync_runs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));