CREATE OR REPLACE FUNCTION public.place_order_atomic(
  _service_id uuid,
  _target_link text,
  _quantity integer,
  _notes text,
  _client_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _service public.services%ROWTYPE;
  _profile public.profiles%ROWTYPE;
  _category_name text;
  _total numeric(14,2);
  _new_balance numeric(14,2);
  _order public.orders%ROWTYPE;
  _inserted boolean := false;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _client_request_id IS NULL THEN RAISE EXCEPTION 'A request identifier is required.'; END IF;

  SELECT * INTO _service FROM public.services
    WHERE id = _service_id AND is_active = true AND is_archived = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'This service is no longer available.'; END IF;
  IF _quantity < _service.min_quantity OR _quantity > _service.max_quantity THEN
    RAISE EXCEPTION 'Quantity must be between % and %.', _service.min_quantity, _service.max_quantity;
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer profile not found.'; END IF;

  SELECT * INTO _order FROM public.orders
    WHERE user_id = _user_id AND client_request_id = _client_request_id;
  IF FOUND THEN
    RETURN jsonb_build_object('orderId', _order.id, 'orderNumber', _order.order_number, 'balance', _profile.balance, 'duplicate', true);
  END IF;

  _total := round((_service.price_per_unit * _quantity)::numeric, 2);
  IF _profile.balance < _total THEN RAISE EXCEPTION 'Not enough wallet balance for this order.'; END IF;
  SELECT name INTO _category_name FROM public.service_categories WHERE id = _service.category_id;

  INSERT INTO public.orders (
    user_id, service_id, target_link, quantity, unit_price, total_amount, notes, status,
    client_request_id, service_name_snapshot, service_code_snapshot, category_name_snapshot,
    service_description_snapshot, requirements_snapshot, delivery_time_snapshot
  ) VALUES (
    _user_id, _service.id, _target_link, _quantity, _service.price_per_unit, _total, NULLIF(_notes, ''), 'pending',
    _client_request_id, _service.name, _service.service_code, _category_name,
    _service.description, _service.features, _service.delivery_time
  )
  ON CONFLICT (user_id, client_request_id) WHERE client_request_id IS NOT NULL DO NOTHING
  RETURNING * INTO _order;

  IF NOT FOUND THEN
    SELECT * INTO _order FROM public.orders
      WHERE user_id = _user_id AND client_request_id = _client_request_id;
    RETURN jsonb_build_object('orderId', _order.id, 'orderNumber', _order.order_number, 'balance', _profile.balance, 'duplicate', true);
  END IF;

  _new_balance := _profile.balance - _total;
  UPDATE public.profiles SET balance = _new_balance WHERE id = _user_id;
  INSERT INTO public.transactions(user_id, type, amount, balance_after, description, reference, status)
  VALUES (_user_id, 'order', -_total, _new_balance, _service.name || ' × ' || _quantity, _order.id::text, 'completed');

  RETURN jsonb_build_object('orderId', _order.id, 'orderNumber', _order.order_number, 'balance', _new_balance, 'duplicate', false);
END;
$$;
REVOKE ALL ON FUNCTION public.place_order_atomic(uuid, text, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order_atomic(uuid, text, integer, text, uuid) TO authenticated;