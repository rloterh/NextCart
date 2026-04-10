-- NEXCART GOVERNANCE WORKFLOW EXTENSIONS
-- Run after supabase-governance-foundation.sql

ALTER TABLE public.dispute_cases
  ADD COLUMN IF NOT EXISTS refund_decision TEXT NOT NULL DEFAULT 'under_review'
    CHECK (refund_decision IN ('under_review', 'approved', 'denied', 'issued')),
  ADD COLUMN IF NOT EXISTS refund_decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_hold_status TEXT NOT NULL DEFAULT 'clear'
    CHECK (payout_hold_status IN ('clear', 'hold_requested', 'on_hold', 'released')),
  ADD COLUMN IF NOT EXISTS payout_hold_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_dispute_cases_assigned_admin ON public.dispute_cases(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_dispute_cases_refund_decision ON public.dispute_cases(refund_decision);
CREATE INDEX IF NOT EXISTS idx_dispute_cases_payout_hold_status ON public.dispute_cases(payout_hold_status);
