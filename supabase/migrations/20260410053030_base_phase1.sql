-- ============================================
-- NEXCART DATABASE SCHEMA
-- Phase 1: Users, Stores, Products, Categories
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE public.user_role AS ENUM ('buyer', 'vendor', 'admin');
CREATE TYPE public.vendor_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE public.product_status AS ENUM ('draft', 'active', 'paused', 'archived');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');

-- ============================================
-- PROFILES
-- ============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role public.user_role NOT NULL DEFAULT 'buyer',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- STORES (vendor storefronts)
-- ============================================

CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  status public.vendor_status NOT NULL DEFAULT 'pending',
  stripe_account_id TEXT,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{"shipping": true, "returns": true}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CATEGORIES
-- ============================================

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PRODUCTS
-- ============================================

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  price NUMERIC(12,2) NOT NULL,
  compare_at_price NUMERIC(12,2),
  cost_price NUMERIC(12,2),
  sku TEXT,
  barcode TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  track_inventory BOOLEAN DEFAULT TRUE,
  status public.product_status NOT NULL DEFAULT 'draft',
  images TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  sale_count INTEGER DEFAULT 0,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

-- ============================================
-- PRODUCT VARIANTS (size, color, etc.)
-- ============================================

CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price_adjustment NUMERIC(12,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  options JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- WISHLISTS
-- ============================================

CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_stores_owner ON public.stores(owner_id);
CREATE INDEX idx_stores_slug ON public.stores(slug);
CREATE INDEX idx_stores_status ON public.stores(status);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_products_store ON public.products(store_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_slug ON public.products(store_id, slug);
CREATE INDEX idx_products_featured ON public.products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_price ON public.products(price);
CREATE INDEX idx_products_search ON public.products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_wishlists_user ON public.wishlists(user_id);
CREATE INDEX idx_variants_product ON public.product_variants(product_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_stores BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'buyer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Stores
CREATE POLICY "Anyone can view approved stores" ON public.stores FOR SELECT USING (status = 'approved' OR owner_id = auth.uid());
CREATE POLICY "Vendors can manage own store" ON public.stores FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "Admins can manage all stores" ON public.stores FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Categories
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Products
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (status = 'active' OR store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Vendors can manage own products" ON public.products FOR ALL USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
);
CREATE POLICY "Admins can manage all products" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Variants
CREATE POLICY "Variants follow product access" ON public.product_variants FOR SELECT USING (
  product_id IN (SELECT id FROM public.products WHERE status = 'active')
);
CREATE POLICY "Vendors can manage own variants" ON public.product_variants FOR ALL USING (
  product_id IN (SELECT id FROM public.products WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
);

-- Wishlists
CREATE POLICY "Users can manage own wishlist" ON public.wishlists FOR ALL USING (user_id = auth.uid());

-- ============================================
-- SEED CATEGORIES
-- ============================================

INSERT INTO public.categories (name, slug, description, sort_order) VALUES
  ('Electronics', 'electronics', 'Gadgets, devices, and tech accessories', 1),
  ('Fashion', 'fashion', 'Clothing, shoes, and accessories', 2),
  ('Home & Living', 'home-living', 'Furniture, decor, and kitchen essentials', 3),
  ('Sports & Outdoors', 'sports-outdoors', 'Fitness gear, camping, and sports equipment', 4),
  ('Books & Media', 'books-media', 'Books, music, movies, and digital content', 5),
  ('Beauty & Health', 'beauty-health', 'Skincare, wellness, and personal care', 6);

-- Sub-categories
INSERT INTO public.categories (name, slug, parent_id, sort_order)
SELECT 'Smartphones', 'smartphones', id, 1 FROM public.categories WHERE slug = 'electronics';
INSERT INTO public.categories (name, slug, parent_id, sort_order)
SELECT 'Laptops', 'laptops', id, 2 FROM public.categories WHERE slug = 'electronics';
INSERT INTO public.categories (name, slug, parent_id, sort_order)
SELECT 'Audio', 'audio', id, 3 FROM public.categories WHERE slug = 'electronics';
INSERT INTO public.categories (name, slug, parent_id, sort_order)
SELECT 'Men', 'men', id, 1 FROM public.categories WHERE slug = 'fashion';
INSERT INTO public.categories (name, slug, parent_id, sort_order)
SELECT 'Women', 'women', id, 2 FROM public.categories WHERE slug = 'fashion';
INSERT INTO public.categories (name, slug, parent_id, sort_order)
SELECT 'Accessories', 'accessories', id, 3 FROM public.categories WHERE slug = 'fashion';

-- ============================================
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
