-- ==============================================================================
-- Script แก้ไขปัญหา Login เข้าสู่ระบบ (สมบูรณ์ 100%)
-- ล้างข้อมูลที่ตกค้าง และสร้าง User พร้อมตาราง auth.identities ครบถ้วน
-- ==============================================================================

DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  encrypted_pw TEXT;
BEGIN
  -- 1. ล้างข้อมูลเก่าที่ตกค้างออกก่อน
  DELETE FROM public.profiles WHERE username = 'Hatalu001';
  DELETE FROM auth.identities WHERE identity_data->>'email' = 'hatalu001@internal.mediahub.local' OR provider_id = 'hatalu001@internal.mediahub.local';
  DELETE FROM auth.users WHERE email = 'hatalu001@internal.mediahub.local';

  -- 2. เข้ารหัสรหัสผ่าน 'testmepls142'
  encrypted_pw := crypt('testmepls142', gen_salt('bf'));

  -- 3. สร้าง User ใน auth.users พร้อมคอลัมน์มาตรฐานครบถ้วน
  INSERT INTO auth.users (
    instance_id,
    id,
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
    email_change,
    email_change_token_new,
    recovery_token,
    is_super_admin,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'hatalu001@internal.mediahub.local',
    encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"Hatalu001","role":"dev"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    false,
    false
  );

  -- 4. สำคัญมาก: ใส่ข้อมูลลงใน auth.identities เพื่อให้ระบบ Auth ของ Supabase (GoTrue) ตรวจสอบผ่าน
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    format('{"sub":"%s","email":"%s"}', new_user_id, 'hatalu001@internal.mediahub.local')::jsonb,
    'email',
    new_user_id::text,
    now(),
    now(),
    now()
  );

  -- 5. ผูกข้อมูลลงใน public.profiles (มี username, password, role dev, premium_until)
  INSERT INTO public.profiles (
    id,
    username,
    role,
    password,
    premium_until,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    'Hatalu001',
    'dev',
    'testmepls142',
    null,
    now(),
    now()
  );

  RAISE NOTICE 'Dev user Hatalu001 created successfully with full identity!';
END $$;
