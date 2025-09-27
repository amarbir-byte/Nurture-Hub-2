-- Seed data for local development
-- This file is automatically run when using `supabase db seed`

-- Insert sample users (for local development only)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'demo@nurturehub.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NULL,
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Demo User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Get the user ID for the demo user
DO $$
DECLARE
  demo_user_id UUID;
BEGIN
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@nurturehub.com';
  
  -- Insert sample properties
  INSERT INTO public.properties (
    user_id,
    address,
    status,
    price,
    bedrooms,
    bathrooms,
    property_type,
    description,
    suburb,
    city,
    postal_code,
    lat,
    lng,
    created_at,
    updated_at
  ) VALUES 
  (
    demo_user_id,
    '123 Queen Street, Auckland Central, Auckland, 1010',
    'listed',
    850000.00,
    3,
    2,
    'apartment',
    'Modern apartment in the heart of Auckland CBD with stunning city views.',
    'Auckland Central',
    'Auckland',
    '1010',
    -36.8485,
    174.7633,
    NOW(),
    NOW()
  ),
  (
    demo_user_id,
    '45 Ponsonby Road, Ponsonby, Auckland, 1021',
    'listed',
    1200000.00,
    4,
    3,
    'house',
    'Beautiful Victorian villa in trendy Ponsonby with original features.',
    'Ponsonby',
    'Auckland',
    '1021',
    -36.8509,
    174.7435,
    NOW(),
    NOW()
  ),
  (
    demo_user_id,
    '78 Remuera Road, Remuera, Auckland, 1050',
    'sold',
    2100000.00,
    5,
    4,
    'house',
    'Luxury family home in prestigious Remuera with pool and tennis court.',
    'Remuera',
    'Auckland',
    '1050',
    -36.8748,
    174.7855,
    NOW(),
    NOW()
  );

  -- Insert sample contacts
  INSERT INTO public.contacts (
    user_id,
    name,
    email,
    phone,
    address,
    suburb,
    city,
    postal_code,
    notes,
    contact_type,
    temperature,
    contact_source,
    tags,
    lat,
    lng,
    created_at,
    updated_at
  ) VALUES 
  (
    demo_user_id,
    'John Smith',
    'john.smith@email.com',
    '+64 21 123 4567',
    '12 Fraser Road, Papatoetoe, Manukau, Auckland, 2025',
    'Papatoetoe',
    'Manukau',
    '2025',
    'Interested in 3-bedroom properties under $800k',
    'buyer',
    'hot',
    'manual',
    ARRAY['first-time-buyer', 'pre-approved'],
    -36.9689,
    174.8403,
    NOW(),
    NOW()
  ),
  (
    demo_user_id,
    'Sarah Johnson',
    'sarah.j@email.com',
    '+64 22 987 6543',
    '45 Mount Eden Road, Mount Eden, Auckland, 1024',
    'Mount Eden',
    'Auckland',
    '1024',
    'Looking to sell family home and downsize',
    'seller',
    'warm',
    'referral',
    ARRAY['downsizing', 'family-home'],
    -36.8774,
    174.7654,
    NOW(),
    NOW()
  ),
  (
    demo_user_id,
    'Mike Chen',
    'mike.chen@email.com',
    '+64 27 555 1234',
    '89 Newmarket Road, Newmarket, Auckland, 1023',
    'Newmarket',
    'Auckland',
    '1023',
    'Investor looking for rental properties',
    'buyer',
    'cold',
    'campaign',
    ARRAY['investor', 'rental-property'],
    -36.8694,
    174.7750,
    NOW(),
    NOW()
  ),
  (
    demo_user_id,
    'Emma Wilson',
    'emma.wilson@email.com',
    '+64 21 456 7890',
    '156 Parnell Road, Parnell, Auckland, 1052',
    'Parnell',
    'Auckland',
    '1052',
    'Both buying and selling - relocating from Wellington',
    'both',
    'hot',
    'import',
    ARRAY['relocating', 'wellington'],
    -36.8564,
    174.7781,
    NOW(),
    NOW()
  );

  -- Insert sample templates
  INSERT INTO public.templates (
    user_id,
    name,
    content,
    category,
    placeholders,
    is_default,
    usage_count,
    created_at,
    updated_at
  ) VALUES 
  (
    demo_user_id,
    'New Listing Alert',
    'Hi {{name}}, I have a new {{property_type}} listing in {{suburb}} that might interest you. {{bedrooms}} bedrooms, {{bathrooms}} bathrooms, priced at ${{price}}. Would you like to schedule a viewing?',
    'property',
    ARRAY['name', 'property_type', 'suburb', 'bedrooms', 'bathrooms', 'price'],
    false,
    0,
    NOW(),
    NOW()
  ),
  (
    demo_user_id,
    'Follow-up After Viewing',
    'Hi {{name}}, thank you for viewing the property at {{address}} yesterday. I wanted to follow up and see if you have any questions or if you''d like to make an offer. Please let me know how I can help!',
    'follow_up',
    ARRAY['name', 'address'],
    false,
    0,
    NOW(),
    NOW()
  ),
  (
    demo_user_id,
    'Market Update',
    'Hi {{name}}, I wanted to share the latest market insights for {{suburb}}. Property values have increased by {{market_change}}% this quarter. Would you like to discuss how this affects your property goals?',
    'marketing',
    ARRAY['name', 'suburb', 'market_change'],
    false,
    0,
    NOW(),
    NOW()
  );

END $$;
