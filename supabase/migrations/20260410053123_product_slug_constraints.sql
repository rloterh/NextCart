-- NEXCART PRODUCT SLUG CONSTRAINTS
-- Run after the base marketplace schemas.

WITH ranked_products AS (
  SELECT
    id,
    slug,
    row_number() OVER (PARTITION BY store_id, slug ORDER BY created_at, id) AS duplicate_rank
  FROM public.products
)
UPDATE public.products AS products
SET slug = ranked_products.slug || '-' || ranked_products.duplicate_rank
FROM ranked_products
WHERE products.id = ranked_products.id
  AND ranked_products.duplicate_rank > 1;

DROP INDEX IF EXISTS idx_products_slug;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON public.products(store_id, slug);
