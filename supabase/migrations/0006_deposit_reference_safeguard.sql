-- Prevent a payment transaction reference from being reused for the same payment method.
CREATE UNIQUE INDEX IF NOT EXISTS deposit_requests_method_reference_unique
  ON public.deposit_requests (payment_method_id, lower(btrim(payment_reference)));
