/*
  # Initial Schema Setup for Restaurante Benito Gomes

  1. New Tables
    - `admin_settings`
      - `id` (uuid, primary key)
      - `opening_time` (time)
      - `closing_time` (time)
      - `updated_at` (timestamp)
    
    - `main_dishes`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `image_url` (text)
      - `day_of_week` (integer, 1-6)
      - `created_at` (timestamp)
    
    - `optional_dishes`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `image_url` (text)
      - `day_of_week` (integer, 1-6)
      - `created_at` (timestamp)
    
    - `orders`
      - `id` (uuid, primary key)
      - `user_name` (text)
      - `registration` (text)
      - `observations` (text)
      - `created_at` (timestamp)
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key)
      - `dish_id` (uuid, foreign key)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated admin access
    - Add policies for public read access where needed
*/

-- Admin Settings Table
CREATE TABLE admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_time time NOT NULL,
  closing_time time NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage settings"
  ON admin_settings
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "Public can view settings"
  ON admin_settings
  FOR SELECT
  TO anon
  USING (true);


-- Main Dishes Table
CREATE TABLE main_dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE main_dishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only specific admins can manage settings"
ON admin_settings
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));


CREATE POLICY "Public can view main dishes"
  ON main_dishes
  FOR SELECT
  TO anon
  USING (true);

-- Optional Dishes Table
CREATE TABLE optional_dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE optional_dishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage optional dishes"
  ON optional_dishes
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "Public can view optional dishes"
  ON optional_dishes
  FOR SELECT
  TO anon
  USING (true);

-- Orders Table
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  dish_id uuid NOT NULL,
  dish_type text CHECK (dish_type IN ('main', 'optional')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create orders"
ON orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Order Items Table
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  dish_id uuid REFERENCES optional_dishes(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create order items"
  ON order_items
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Insert default admin settings
INSERT INTO admin_settings (opening_time, closing_time)
VALUES ('08:00', '18:00')
ON CONFLICT DO NOTHING;