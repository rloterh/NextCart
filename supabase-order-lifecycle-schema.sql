-- NEXCART ORDER LIFECYCLE EXTENSIONS
-- Run after the base marketplace schemas.

ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'packed';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'delivery_failed';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'return_initiated';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'reshipping';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'return_approved';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'return_in_transit';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'return_received';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS out_for_delivery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reshipping_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_initiated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_in_transit_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_received_at TIMESTAMPTZ;
