-- ==============================================================================
-- Educational Media Hub: Seed Script (SQL)
-- Creates initial Dev Account (Hatalu001) & Demo Educational Media
-- Includes: username, password, role, premium_until
-- ==============================================================================

DO $$
DECLARE
  dev_user_id UUID;
  encrypted_pw TEXT;
BEGIN
  -- 1. Check if auth user already exists for Hatalu001
  SELECT id INTO dev_user_id 
  FROM auth.users 
  WHERE email = 'hatalu001@internal.mediahub.local' 
  LIMIT 1;

  -- If not exists, insert into auth.users safely
  IF dev_user_id IS NULL THEN
    dev_user_id := gen_random_uuid();
    -- Hash initial password 'testmepls142' with blowfish
    encrypted_pw := crypt('testmepls142', gen_salt('bf'));

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) VALUES (
      dev_user_id,
      '00000000-0000-0000-0000-000000000000',
      'hatalu001@internal.mediahub.local',
      encrypted_pw,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"username":"Hatalu001","role":"dev"}',
      now(),
      now(),
      'authenticated',
      'authenticated',
      ''
    );

    RAISE NOTICE 'Created auth user for Hatalu001 with ID %', dev_user_id;
  ELSE
    RAISE NOTICE 'Found existing auth user for Hatalu001 with ID %', dev_user_id;
  END IF;

  -- 2. Insert or update into public.profiles (with password and premium_until)
  INSERT INTO public.profiles (
    id, 
    username, 
    role, 
    password, 
    premium_until, 
    created_at, 
    updated_at
  )
  VALUES (
    dev_user_id, 
    'Hatalu001', 
    'dev', 
    'testmepls142', 
    null, 
    now(), 
    now()
  )
  ON CONFLICT (id) DO UPDATE SET 
    role = 'dev', 
    username = 'Hatalu001',
    password = 'testmepls142';

  RAISE NOTICE 'Profile for Hatalu001 is ready with role "dev"';

  -- 3. Insert Demo Media (3 items for initial testing UI)
  IF NOT EXISTS (SELECT 1 FROM public.media LIMIT 1) THEN
    INSERT INTO public.media (
      id,
      title,
      description,
      icon_url,
      subject,
      grade_level,
      media_type,
      game_url,
      view_count,
      created_by,
      created_at
    ) VALUES
    (
      gen_random_uuid(),
      '[Demo] เกมคณิตศาสตร์: ผจญภัยดินแดนตัวเลข',
      'เกมฝึกทักษะการคิดเลขเร็ว บวก ลบ คูณ หาร ผ่านด่านการผจญภัยสุดสนุก เสริมสร้างเชาวน์ปัญญาและตรรกะทางคณิตศาสตร์',
      'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=600&auto=format&fit=crop&q=80',
      'คณิตศาสตร์',
      ARRAY['ป.3', 'ป.4', 'ป.5'],
      'เกม',
      'https://mathsframe.co.uk/',
      142,
      dev_user_id,
      now() - interval '2 days'
    ),
    (
      gen_random_uuid(),
      '[Demo] สื่อ Interactive: สำรวจระบบสุริยะจักรวาล',
      'สื่อการสอน 3D จำลองการโคจรของดวงดาวในระบบสุริยะ ช่วยให้ผู้เรียนเข้าใจขนาด วงโคจร และคุณลักษณะเฉพาะของดาวเคราะห์แต่ละดวง',
      'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&auto=format&fit=crop&q=80',
      'วิทยาศาสตร์',
      ARRAY['ป.4', 'ป.5', 'ป.6'],
      'สื่อ Interactive',
      'https://solarsystem.nasa.gov/',
      256,
      dev_user_id,
      now() - interval '1 day'
    ),
    (
      gen_random_uuid(),
      '[Demo] Vocab Quest: ตะลุยคำศัพท์ภาษาอังกฤษ',
      'แบบฝึกหัดและเกมจับคู่คำศัพท์ หมวดสัตว์ สิ่งของ และชีวิตประจำวัน พร้อมระบบออกเสียงมาตรฐาน เพิ่มคลังคำศัพท์อย่างสนุกสนาน',
      'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&auto=format&fit=crop&q=80',
      'ภาษาอังกฤษ',
      ARRAY['ป.1', 'ป.2', 'ป.3'],
      'แบบฝึกหัด',
      'https://learnenglishkids.britishcouncil.org/',
      89,
      dev_user_id,
      now()
    );
    RAISE NOTICE 'Demo media items inserted successfully';
  END IF;

END $$;
