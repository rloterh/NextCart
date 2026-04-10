-- ============================================
-- NEXCART GOVERNANCE FOUNDATION
-- Phase 4: Moderation, disputes, and audit visibility
-- ============================================

CREATE TABLE IF NOT EXISTS public.dispute_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'vendor_action_required', 'refund_pending', 'resolved', 'dismissed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  issue_type TEXT NOT NULL CHECK (issue_type IN ('refund_request', 'delivery_issue', 'product_issue', 'return_dispute', 'payout_hold')),
  summary TEXT NOT NULL,
  requested_resolution TEXT,
  vendor_notes TEXT,
  admin_notes TEXT,
  resolution TEXT,
  refund_amount NUMERIC(10,2),
  assigned_admin_id UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_cases_status ON public.dispute_cases(status);
CREATE INDEX IF NOT EXISTS idx_dispute_cases_order ON public.dispute_cases(order_id);
CREATE INDEX IF NOT EXISTS idx_dispute_cases_store ON public.dispute_cases(store_id);
CREATE INDEX IF NOT EXISTS idx_dispute_cases_priority ON public.dispute_cases(priority);

DROP TRIGGER IF EXISTS set_updated_at_dispute_cases ON public.dispute_cases;
CREATE TRIGGER set_updated_at_dispute_cases
  BEFORE UPDATE ON public.dispute_cases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.dispute_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage dispute cases" ON public.dispute_cases;
CREATE POLICY "Admins manage dispute cases" ON public.dispute_cases
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Vendors can view own dispute cases" ON public.dispute_cases;
CREATE POLICY "Vendors can view own dispute cases" ON public.dispute_cases
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = dispute_cases.store_id
        AND stores.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Buyers can view own dispute cases" ON public.dispute_cases;
CREATE POLICY "Buyers can view own dispute cases" ON public.dispute_cases
  FOR SELECT USING (buyer_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view admin actions" ON public.admin_actions;
CREATE POLICY "Admins can view admin actions" ON public.admin_actions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can insert admin actions" ON public.admin_actions;
CREATE POLICY "Admins can insert admin actions" ON public.admin_actions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    AND admin_id = auth.uid()
  );
