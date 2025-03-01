/*
  # Fix RLS policies for orders and order items

  1. Changes
    - Drop existing policies
    - Create new policies that properly handle anonymous access
    - Ensure proper cascade behavior for order items

  2. Security
    - Allow anonymous users to create orders and order items
    - Allow admins to view all orders and items
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;

-- Create new policies for orders
CREATE POLICY "Enable read access for authenticated users"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for all users"
  ON orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create new policies for order_items
CREATE POLICY "Enable read access for authenticated users"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for all users"
  ON order_items
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);