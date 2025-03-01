/*
  # Add salads table

  1. New Tables
    - `salads`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text)
      - `image_url` (text)
      - `day_of_week` (integer, 1-6)
      - `created_at` (timestamptz)
  2. Security
    - Enable RLS on `salads` table
    - Add policies for authenticated users to manage salads
    - Add policies for anonymous users to view salads
*/

-- Create salads table
CREATE TABLE IF NOT EXISTS salads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
  created_at timestamptz DEFAULT now()
);

-- Enable row level security
ALTER TABLE salads ENABLE ROW LEVEL SECURITY;

-- Create policies for salads table
CREATE POLICY "Admin can manage salads"
  ON salads
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Public can view salads"
  ON salads
  FOR SELECT
  TO anon
  USING (true);

-- Insert sample salads for each day of the week
INSERT INTO salads (name, description, day_of_week) VALUES
('Salada Verde', 'Alface, rúcula, agrião, pepino e molho de ervas', 1),
('Salada Tropical', 'Alface, manga, abacaxi, tomate cereja e molho de iogurte', 2),
('Salada Mediterrânea', 'Alface, tomate, pepino, azeitonas, queijo feta e azeite de oliva', 3),
('Salada Caesar', 'Alface romana, croutons, parmesão e molho caesar', 4),
('Salada Caprese', 'Tomate, mussarela de búfala, manjericão e azeite de oliva', 5),
('Salada Mista', 'Mix de folhas verdes, cenoura ralada, beterraba, tomate e molho de limão', 6);