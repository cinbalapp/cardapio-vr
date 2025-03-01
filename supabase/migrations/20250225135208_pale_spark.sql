/*
  # Add orders table

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `user_name` (text)
      - `registration` (text)
      - `observations` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `orders` table
    - Add policy for public order creation
    - Add policy for admin to view all orders
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  registration text NOT NULL,
  observations text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create orders
CREATE POLICY "Anyone can create orders"
  ON orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users (admins) to view all orders
CREATE POLICY "Admins can view all orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure order_items references the correct table and has proper policies
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_order_id_fkey,
  ADD CONSTRAINT order_items_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id)
  ON DELETE CASCADE;

-- Allow anyone to create order items
CREATE POLICY "Anyone can create order items"
  ON order_items
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users (admins) to view all order items
CREATE POLICY "Admins can view all order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (true);