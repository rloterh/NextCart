-- NEXCART ORDERS SCHEMA — Run AFTER Phase 1 schema

CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL, line1 TEXT NOT NULL, line2 TEXT,
  city TEXT NOT NULL, state TEXT, postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US', phone TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  status public.order_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(12,2) NOT NULL,
  shipping_cost NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  platform_fee NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  shipping_address JSONB NOT NULL,
  tracking_number TEXT, tracking_url TEXT, notes TEXT,
  shipped_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  product_name TEXT NOT NULL, variant_name TEXT, product_image TEXT,
  quantity INTEGER NOT NULL, unit_price NUMERIC(12,2) NOT NULL, total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;
CREATE OR REPLACE FUNCTION public.generate_order_number() RETURNS TRIGGER AS $$
BEGIN NEW.order_number = 'NC-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0'); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

CREATE OR REPLACE FUNCTION public.update_store_order_stats() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    UPDATE public.stores SET total_orders = total_orders + 1, total_revenue = total_revenue + NEW.total - NEW.platform_fee WHERE id = NEW.store_id;
    UPDATE public.products SET sale_count = sale_count + oi.quantity FROM public.order_items oi WHERE oi.order_id = NEW.id AND products.id = oi.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_order_confirmed AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_store_order_stats();

CREATE TRIGGER set_updated_at_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_addresses_user ON public.addresses(user_id);
CREATE INDEX idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX idx_orders_store ON public.orders(store_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_number ON public.orders(order_number);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own addresses" ON public.addresses FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Buyers view own orders" ON public.orders FOR SELECT USING (buyer_id = auth.uid());
CREATE POLICY "Vendors view store orders" ON public.orders FOR SELECT USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Vendors update store orders" ON public.orders FOR UPDATE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "System can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage all orders" ON public.orders FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Order items follow order access" ON public.order_items FOR SELECT USING (order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid() OR store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())));
CREATE POLICY "System can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
