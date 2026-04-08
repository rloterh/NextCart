-- NEXCART ORDER FINANCE RECONCILIATION
-- Run after the base marketplace schemas.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_transfer_status TEXT,
  ADD COLUMN IF NOT EXISTS payout_reconciled_at TIMESTAMPTZ;
