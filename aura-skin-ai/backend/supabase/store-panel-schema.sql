-- =============================================================================
-- AuraSkin AI — Store Partner Panel Tables & RLS
-- Run this in Supabase Dashboard → SQL Editor (after auth-profiles and public-panel)
-- =============================================================================

-- Store profiles: one row per store partner (profile id = store profile id)
CREATE TABLE IF NOT EXISTS store_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  store_name text,
  store_description text,
  address text,
  city text,
  latitude numeric,
  longitude numeric,
  contact_number text,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

-- Inventory: store's product listings (pending → admin approve → approved)
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stock_quantity integer NOT NULL DEFAULT 0,
  price_override numeric,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, product_id)
);

-- Orders: user purchases from a store
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  order_status text NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled')),
  total_amount numeric NOT NULL DEFAULT 0,
  tracking_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order line items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  price numeric NOT NULL
);

-- Store notifications (new order, status updates, etc.)
CREATE TABLE IF NOT EXISTS store_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  type text,
  message text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE store_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_notifications ENABLE ROW LEVEL SECURITY;

-- Store can only access own store_profile
CREATE POLICY "Store can read own profile" ON store_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Store can insert own profile" ON store_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Store can update own profile" ON store_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Store can only access own inventory
CREATE POLICY "Store can read own inventory" ON inventory
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_profiles sp WHERE sp.id = store_id AND sp.id = auth.uid())
  );
CREATE POLICY "Store can insert own inventory" ON inventory
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM store_profiles sp WHERE sp.id = store_id AND sp.id = auth.uid())
  );
CREATE POLICY "Store can update own inventory" ON inventory
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM store_profiles sp WHERE sp.id = store_id AND sp.id = auth.uid())
  );
CREATE POLICY "Store can delete own inventory" ON inventory
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM store_profiles sp WHERE sp.id = store_id AND sp.id = auth.uid())
  );

-- Store can only access own orders (backend uses service role; policies for future client use)
CREATE POLICY "Store can read own orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_profiles sp WHERE sp.id = store_id AND sp.id = auth.uid())
  );
CREATE POLICY "Store can update own orders" ON orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM store_profiles sp WHERE sp.id = store_id AND sp.id = auth.uid())
  );

-- Order items: readable/insertable in context of order (service role used by backend)
CREATE POLICY "Store can read order_items for own orders" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN store_profiles sp ON sp.id = o.store_id AND sp.id = auth.uid()
      WHERE o.id = order_items.order_id
    )
  );

-- Store can only access own notifications
CREATE POLICY "Store can read own notifications" ON store_notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM store_profiles sp WHERE sp.id = store_id AND sp.id = auth.uid())
  );
CREATE POLICY "Store can update own notifications" ON store_notifications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM store_profiles sp WHERE sp.id = store_id AND sp.id = auth.uid())
  );

-- Allow inserts for order_items and orders from backend (e.g. when user places order)
CREATE POLICY "Service can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert order_items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert store_notifications" ON store_notifications FOR INSERT WITH CHECK (true);

-- Users can read their own orders
CREATE POLICY "User can read own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_inventory_store_id ON inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_store_notifications_store_id ON store_notifications(store_id);
