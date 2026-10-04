CREATE OR REPLACE FUNCTION public.apply_catalog_markup(
  _multiplier numeric,
  _category_id uuid DEFAULT NULL,
  _include_archived boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _admin_id uuid := auth.uid();
  _count integer;
BEGIN
  IF _admin_id IS NULL OR NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _multiplier IS NULL OR _multiplier <= 0 OR _multiplier > 100 THEN
    RAISE EXCEPTION 'Multiplier must be greater than 0 and at most 100';
  END IF;

  UPDATE public.services
    SET price_per_unit = round((price_per_unit * _multiplier)::numeric, 4)
    WHERE (_category_id IS NULL OR category_id = _category_id)
      AND (_include_archived OR is_archived = false);
  GET DIAGNOSTICS _count = ROW_COUNT;

  INSERT INTO public.admin_activity_logs(actor_id, action, entity_type, entity_id, details)
  VALUES (
    _admin_id,
    'catalog_markup_applied',
    'services',
    COALESCE(_category_id::text, 'all'),
    jsonb_build_object('multiplier', _multiplier, 'services_updated', _count, 'include_archived', _include_archived)
  );

  RETURN jsonb_build_object('updated', _count, 'multiplier', _multiplier);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_catalog_markup(numeric, uuid, boolean) TO authenticated;