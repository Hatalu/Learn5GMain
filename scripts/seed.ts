import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local first, fallback to .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const devUsername = process.env.SEED_DEV_USERNAME || 'Hatalu001';
const devPassword = process.env.SEED_DEV_PASSWORD || 'testmepls142';

if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('your-project-id')) {
  console.error('\n❌ Missing or default Supabase credentials in .env.local!');
  console.error('Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runSeed() {
  console.log('🚀 Starting Database & Dev Account Seeding...');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);

  // 1. Ensure Storage Bucket exists
  console.log('\n📦 Checking Storage Bucket: media-icons...');
  const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
  if (bucketListError) {
    console.warn('⚠️ Could not list buckets (check permissions):', bucketListError.message);
  } else {
    const bucketExists = buckets?.some((b) => b.name === 'media-icons');
    if (!bucketExists) {
      const { error: createBucketError } = await supabase.storage.createBucket('media-icons', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });
      if (createBucketError) {
        console.warn('⚠️ Bucket creation notice:', createBucketError.message);
      } else {
        console.log('✅ Created storage bucket "media-icons" (Public)');
      }
    } else {
      console.log('✅ Bucket "media-icons" is ready.');
    }
  }

  // 2. Setup Dev User
  const devEmail = `${devUsername.toLowerCase()}@internal.mediahub.local`;
  console.log(`\n👤 Setting up Dev User: ${devUsername} (${devEmail})...`);

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', devUsername)
    .maybeSingle();

  let devUserId: string;

  if (existingProfile) {
    devUserId = existingProfile.id;
    console.log(`ℹ️ Profile for ${devUsername} already exists (ID: ${devUserId})`);
    
    // Ensure role is dev
    if (existingProfile.role !== 'dev') {
      await supabase.from('profiles').update({ role: 'dev' }).eq('id', devUserId);
      console.log('✅ Updated role to "dev"');
    }
  } else {
    // Check if auth user exists
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existingAuthUser = listData?.users?.find((u) => u.email === devEmail);

    if (existingAuthUser) {
      devUserId = existingAuthUser.id;
      console.log(`ℹ️ Auth user already exists (ID: ${devUserId})`);
    } else {
      // Create user in Supabase Auth
      const { data: createdAuth, error: createAuthError } = await supabase.auth.admin.createUser({
        email: devEmail,
        password: devPassword,
        email_confirm: true,
        user_metadata: {
          username: devUsername,
          role: 'dev',
        },
      });

      if (createAuthError || !createdAuth.user) {
        throw new Error(`Failed to create Auth user: ${createAuthError?.message}`);
      }

      devUserId = createdAuth.user.id;
      console.log(`✅ Auth user created successfully (ID: ${devUserId})`);
    }

    // Insert or update profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: devUserId,
      username: devUsername,
      role: 'dev',
      password: devPassword,
      premium_until: null,
    });

    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    console.log(`✅ Dev profile created for ${devUsername} with role "dev"`);
  }

  // 3. Check and Insert Demo Media
  console.log('\n📚 Checking Demo Media...');
  const { count, error: countError } = await supabase
    .from('media')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.warn('⚠️ Could not check media count:', countError.message);
  } else if ((count || 0) === 0) {
    console.log('🌱 Inserting 3 Demo Educational Media items...');
    const demoItems = [
      {
        title: '[Demo] เกมคณิตศาสตร์: ผจญภัยดินแดนตัวเลข',
        description: 'เกมฝึกทักษะการคิดเลขเร็ว บวก ลบ คูณ หาร ผ่านด่านการผจญภัยสุดสนุก เสริมสร้างเชาวน์ปัญญาและตรรกะทางคณิตศาสตร์',
        icon_url: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=600&auto=format&fit=crop&q=80',
        subject: 'คณิตศาสตร์',
        grade_level: ['ป.3', 'ป.4', 'ป.5'],
        media_type: 'เกม',
        game_url: 'https://mathsframe.co.uk/',
        view_count: 142,
        created_by: devUserId,
      },
      {
        title: '[Demo] สื่อ Interactive: สำรวจระบบสุริยะจักรวาล',
        description: 'สื่อการสอน 3D จำลองการโคจรของดวงดาวในระบบสุริยะ ช่วยให้ผู้เรียนเข้าใจขนาด วงโคจร และคุณลักษณะเฉพาะของดาวเคราะห์แต่ละดวง',
        icon_url: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&auto=format&fit=crop&q=80',
        subject: 'วิทยาศาสตร์',
        grade_level: ['ป.4', 'ป.5', 'ป.6'],
        media_type: 'สื่อ Interactive',
        game_url: 'https://solarsystem.nasa.gov/',
        view_count: 256,
        created_by: devUserId,
      },
      {
        title: '[Demo] Vocab Quest: ตะลุยคำศัพท์ภาษาอังกฤษ',
        description: 'แบบฝึกหัดและเกมจับคู่คำศัพท์ หมวดสัตว์ สิ่งของ และชีวิตประจำวัน พร้อมระบบออกเสียงมาตรฐาน เพิ่มคลังคำศัพท์อย่างสนุกสนาน',
        icon_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&auto=format&fit=crop&q=80',
        subject: 'ภาษาอังกฤษ',
        grade_level: ['ป.1', 'ป.2', 'ป.3'],
        media_type: 'แบบฝึกหัด',
        game_url: 'https://learnenglishkids.britishcouncil.org/',
        view_count: 89,
        created_by: devUserId,
      },
    ];

    const { error: insertError } = await supabase.from('media').insert(demoItems);
    if (insertError) {
      console.error('❌ Failed to insert demo media:', insertError.message);
    } else {
      console.log('✅ Demo media inserted successfully!');
    }
  } else {
    console.log(`ℹ️ Media already exists (${count} items found). Skipping demo insert.`);
  }

  console.log('\n🎉 Seed process completed successfully!');
  console.log('----------------------------------------------------');
  console.log('🔑 Login Credentials:');
  console.log(`   Username: ${devUsername}`);
  console.log(`   Password: ${devPassword}`);
  console.log(`   Role:     dev`);
  console.log('----------------------------------------------------\n');
}

runSeed().catch((err) => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});
