-- ============================================
-- NEXCART REVIEW FEEDBACK EXTENSION
-- Helpful vote persistence for review trust surfaces
-- Run AFTER supabase-schema-v3.sql
-- ============================================

CREATE TABLE IF NOT EXISTS public.review_helpful_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review ON public.review_helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_user ON public.review_helpful_votes(user_id);

ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own review helpful votes"
  ON public.review_helpful_votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own review helpful votes"
  ON public.review_helpful_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage review helpful votes"
  ON public.review_helpful_votes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
