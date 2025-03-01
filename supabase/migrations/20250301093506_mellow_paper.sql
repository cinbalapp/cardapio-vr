/*
  # Fix order_items constraint issue

  1. Changes
    - Modify the foreign key constraint on order_items to allow cascade delete
    - This ensures that when a dish is deleted, related order items are also deleted

  2. Security
    - No changes to RLS policies
*/

-- First, drop the existing constraint
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_dish_id_fkey;

-- Then add the constraint with CASCADE option
ALTER TABLE order_items
ADD CONSTRAINT order_items_dish_id_fkey
FOREIGN KEY (dish_id) 
REFERENCES optional_dishes(id)
ON DELETE CASCADE;