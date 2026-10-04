-- Providers (third-party marketing APIs). Credentials stay in server secrets, never here.
CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  api_url text,
  status text NOT NULL DEFAULT 'disconnected',
  secret_name text,
  notes text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.providers TO authenticated;
GRANT ALL ON public.providers TO service_role;

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage providers" ON public.providers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER providers_updated_at BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Service catalog metadata used by the reseller-style service table
CREATE SEQUENCE IF NOT EXISTS public.service_code_seq START 1001;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS service_code integer NOT NULL DEFAULT nextval('public.service_code_seq'),
  ADD COLUMN IF NOT EXISTS subcategory text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS avg_start_time text NOT NULL DEFAULT '0-6 hours',
  ADD COLUMN IF NOT EXISTS refill_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancel_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_service_id text,
  ADD COLUMN IF NOT EXISTS provider_cost numeric(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fulfilment_mode text NOT NULL DEFAULT 'manual';

ALTER SEQUENCE public.service_code_seq OWNED BY public.services.service_code;

CREATE UNIQUE INDEX IF NOT EXISTS services_service_code_key ON public.services(service_code);
CREATE INDEX IF NOT EXISTS services_subcategory_idx ON public.services(subcategory);

-- Human-friendly sequential order numbers
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 100001;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number integer NOT NULL DEFAULT nextval('public.order_number_seq');

ALTER SEQUENCE public.order_number_seq OWNED BY public.orders.order_number;

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key ON public.orders(order_number);

-- Admins need full write access to the catalog tables (policies already exist for ALL)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;
