/*
  # Setup admin user and permissions
  
  1. Changes
    - Creates the initial admin user with proper authentication
    - Sets up necessary permissions and roles
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create admin user if it doesn't exist
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'cinbalcardapio@gmail.com'
  ) THEN
    new_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      is_super_admin
    )
    VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'cinbalcardapio@gmail.com',
      crypt('admin123', gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'provider', 'email',
        'providers', array['email']
      ),
      jsonb_build_object(
        'role', 'admin'
      ),
      NOW(),
      NOW(),
      encode(gen_random_bytes(32), 'hex'),
      TRUE
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      new_user_id,
      new_user_id,
      jsonb_build_object(
        'sub', new_user_id::text,
        'email', 'cinbalcardapio@gmail.com'
      ),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
  END IF;
END $$;