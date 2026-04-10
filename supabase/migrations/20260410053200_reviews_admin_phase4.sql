-- ============================================
-- NEXCART DATABASE SCHEMA v3
-- Phase 4: Reviews, Admin, Moderation
-- Run AFTER Phase 1 + v2 schemas
-- ============================================

-- ============================================
-- REVIEWS
-- ============================================

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT TRUE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- ============================================
-- ADMIN ACTIONS LOG
-- ============================================

CREATE TABLE public.admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_reviews_product ON public.reviews(product_id);
CREATE INDEX idx_reviews_store ON public.reviews(store_id);
CREATE INDEX idx_reviews_user ON public.reviews(user_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_reviews_visible ON public.reviews(is_visible) WHERE is_visible = TRUE;
CREATE INDEX idx_admin_actions_entity ON public.admin_actions(entity_type, entity_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER set_updated_at_reviews
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Update product rating on review insert/update/delete
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER AS $$
DECLARE
  pid UUID;
  sid UUID;
BEGIN
  pid = COALESCE(NEW.product_id, OLD.product_id);
  sid = COALESCE(NEW.store_id, OLD.store_id);

  -- Update product
  UPDATE public.products SET
    rating_avg = COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM public.reviews WHERE product_id = pid AND is_visible = TRUE), 0),
    rating_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = pid AND is_visible = TRUE)
  WHERE id = pid;

  -- Update store
  UPDATE public.stores SET
    rating_avg = COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM public.reviews WHERE store_id = sid AND is_visible = TRUE), 0),
    rating_count = (SELECT COUNT(*) FROM public.reviews WHERE store_id = sid AND is_visible = TRUE)
  WHERE id = sid;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Reviews: anyone can view visible reviews
CREATE POLICY "Anyone can view visible reviews" ON public.reviews FOR SELECT USING (is_visible = TRUE);
-- Reviews: authenticated users can insert (one per product)
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Reviews: users can update own reviews
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (user_id = auth.uid());
-- Reviews: admins can manage all
CREATE POLICY "Admins manage reviews" ON public.reviews FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admin actions: only admins
CREATE POLICY "Admins only" ON public.admin_actions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
