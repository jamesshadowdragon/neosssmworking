CREATE OR REPLACE FUNCTION public.adjust_wallet_atomic(
  _user_id uuid,
  _amount numeric,
  _description text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid := auth.uid();
  _balance numeric(14,2);
  _new_balance numeric(14,2);
  _transaction_id uuid;
BEGIN
  IF _admin_id IS NULL OR NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _amount = 0 THEN RAISE EXCEPTION 'Amount must not be zero'; END IF;

  SELECT balance INTO _balance FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found'; END IF;

  _new_balance := round((_balance + _amount)::numeric, 2);
  IF _new_balance < 0 THEN RAISE EXCEPTION 'Balance cannot go negative'; END IF;

  UPDATE public.profiles SET balance = _new_balance WHERE id = _user_id;
  INSERT INTO public.transactions(user_id, type, amount, balance_after, description, status)
  VALUES (
    _user_id,
    CASE WHEN _amount > 0 THEN 'credit' ELSE 'debit' END,
    _amount,
    _new_balance,
    COALESCE(NULLIF(_description, ''), 'Manual balance adjustment'),
    'completed'
  ) RETURNING id INTO _transaction_id;

  INSERT INTO public.admin_activity_logs(actor_id, action, entity_type, entity_id, details)
  VALUES (
    _admin_id,
    'wallet_adjusted',
    'profile',
    _user_id::text,
    jsonb_build_object('amount', _amount, 'balance_after', _new_balance, 'transaction_id', _transaction_id)
  );

  RETURN jsonb_build_object('balance', _new_balance, 'transactionId', _transaction_id);
END;
$$;
REVOKE ALL ON FUNCTION public.adjust_wallet_atomic(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_wallet_atomic(uuid, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reply_to_ticket_atomic(
  _ticket_id uuid,
  _body text,
  _close boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_id uuid := auth.uid();
  _ticket public.support_tickets%ROWTYPE;
  _is_admin boolean;
  _message_id uuid;
  _next_status text;
BEGIN
  IF _actor_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF length(trim(_body)) < 2 OR length(_body) > 4000 THEN RAISE EXCEPTION 'Reply must be between 2 and 4000 characters'; END IF;

  _is_admin := public.has_role(_actor_id, 'admin');
  SELECT * INTO _ticket FROM public.support_tickets WHERE id = _ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  IF NOT _is_admin AND _ticket.user_id <> _actor_id THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF NOT _is_admin AND _ticket.status = 'closed' THEN RAISE EXCEPTION 'This ticket is closed'; END IF;

  INSERT INTO public.ticket_messages(ticket_id, author_id, body, is_staff)
  VALUES (_ticket_id, _actor_id, trim(_body), _is_admin)
  RETURNING id INTO _message_id;

  _next_status := CASE
    WHEN _is_admin AND _close THEN 'closed'
    WHEN _is_admin THEN 'answered'
    ELSE 'open'
  END;
  UPDATE public.support_tickets SET status = _next_status WHERE id = _ticket_id;

  IF _is_admin THEN
    INSERT INTO public.admin_activity_logs(actor_id, action, entity_type, entity_id, details)
    VALUES (_actor_id, CASE WHEN _close THEN 'ticket_closed' ELSE 'ticket_replied' END, 'support_ticket', _ticket_id::text, '{}'::jsonb);
  END IF;

  RETURN jsonb_build_object('messageId', _message_id, 'status', _next_status);
END;
$$;
REVOKE ALL ON FUNCTION public.reply_to_ticket_atomic(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reply_to_ticket_atomic(uuid, text, boolean) TO authenticated;