-- Snapshot product title on each line (checkout + webhooks already send this field)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name text;
