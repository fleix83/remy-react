-- Migrate existing users from PHP application to Supabase
-- Note: Passwords will need to be reset as we can't migrate hashed passwords

-- User 1: pandoc
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'pandoc@example.com', crypt('password123', gen_salt('bf')), NOW(),
  NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"username":"pandoc"}',
  '2024-07-02 11:11:30', NOW(), '', '', '', ''
);

-- User 3: Klaus & Klaus (moderator)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'fleix@gmx.ch', crypt('password123', gen_salt('bf')), NOW(),
  NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"username":"Klaus & Klaus"}',
  '2024-07-02 20:12:53', NOW(), '', '', '', ''
);

-- User 4: Flux (moderator)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'flux@gmx.ch', crypt('password123', gen_salt('bf')), NOW(),
  NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"username":"Flux"}',
  '2024-08-01 21:04:44', NOW(), '', '', '', ''
);

-- User 6: Admina (admin)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'admina@admin.ch', crypt('password123', gen_salt('bf')), NOW(),
  NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"username":"Admina"}',
  '2024-09-18 22:07:45', NOW(), '', '', '', ''
);

-- User 58: Lina
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'asdfa@asfa.com', crypt('password123', gen_salt('bf')), NOW(),
  NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"username":"Lina"}',
  '2024-10-08 18:18:39', NOW(), '', '', '', ''
);

-- The trigger will automatically create profiles in public.users
-- Now update the profiles with the correct data

-- Update Klaus & Klaus profile
UPDATE public.users SET 
  avatar_url = 'uploads/avatars/2.png',
  bio = 'Ein wenig und ein wenig mehr über mich.',
  role = 'moderator'
WHERE email = 'fleix@gmx.ch';

-- Update Flux profile
UPDATE public.users SET 
  avatar_url = 'uploads/avatars/8.png',
  bio = 'Seit drei Jahren in Therapie bei Dr. Müller oder heisst er Meier?',
  role = 'moderator'
WHERE email = 'flux@gmx.ch';

-- Update Admina profile
UPDATE public.users SET 
  avatar_url = 'uploads/avatars/6.png',
  bio = 'Ich bin einer der Admins und auch ein User.',
  role = 'admin'
WHERE email = 'admina@admin.ch';

-- Update Lina profile
UPDATE public.users SET 
  avatar_url = 'uploads/avatars/default-avatar.png'
WHERE email = 'asdfa@asfa.com';