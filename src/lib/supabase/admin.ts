import { createClient } from '@supabase/supabase-js';
import { Profile, UserRole } from '@/types/database';

export function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase Service Role Key is required on server for admin operations.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Maps a username to internal email for Supabase Auth
 */
export function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@internal.mediahub.local`;
}

/**
 * Creates a new member using Supabase Admin API
 */
export async function createMemberAccount(
  username: string,
  password: string,
  role: UserRole,
  premiumUntil?: string | null
) {
  const admin = getAdminClient();
  const email = usernameToEmail(username);

  // Check if username already exists in profiles
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle();

  if (existingProfile) {
    throw new Error(`ชื่อผู้ใช้ "${username}" มีอยู่ในระบบแล้ว กรุณาเลือกชื่ออื่น`);
  }

  // Create Auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username: username.trim(),
      role,
    },
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'ไม่สามารถสร้างผู้ใช้งานในระบบ Auth ได้');
  }

  // Create profile record (storing username, role, password, and premium_until)
  const { data: profileData, error: profileError } = await admin
    .from('profiles')
    .insert({
      id: authData.user.id,
      username: username.trim(),
      role,
      password,
      premium_until: premiumUntil ? new Date(premiumUntil).toISOString() : null,
    })
    .select()
    .single();

  if (profileError) {
    // Clean up created auth user if profile insert failed
    await admin.auth.admin.deleteUser(authData.user.id);
    throw new Error(`ไม่สามารถสร้างโปรไฟล์ได้: ${profileError.message}`);
  }

  return profileData as Profile;
}

/**
 * Count active Dev accounts in the system (Safety check)
 */
export async function getDevCount(): Promise<number> {
  const admin = getAdminClient();
  const { count, error } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'dev');

  if (error) throw error;
  return count || 0;
}

/**
 * Updates a member's username, role, or premium_until safely
 */
export async function updateMember(
  userId: string,
  newUsername: string,
  newRole: UserRole,
  newPremiumUntil?: string | null
) {
  const admin = getAdminClient();

  // Get current member info
  const { data: current, error: getError } = await admin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (getError || !current) {
    throw new Error('ไม่พบข้อมูลสมาชิกที่ต้องการแก้ไข');
  }

  // Safety rule: Cannot demote the last dev
  if (current.role === 'dev' && newRole === 'member') {
    const devCount = await getDevCount();
    if (devCount <= 1) {
      throw new Error('ไม่สามารถลดสิทธิ์ Dev คนสุดท้ายได้ เนื่องจากระบบต้องมี Dev อย่างน้อย 1 คน');
    }
  }

  // If username changed, check uniqueness
  if (current.username.toLowerCase() !== newUsername.toLowerCase()) {
    const { data: conflict } = await admin
      .from('profiles')
      .select('id')
      .ilike('username', newUsername)
      .neq('id', userId)
      .maybeSingle();

    if (conflict) {
      throw new Error(`ชื่อผู้ใช้ "${newUsername}" มีคนใช้งานแล้ว`);
    }

    // Update email in Auth as well
    const newEmail = usernameToEmail(newUsername);
    await admin.auth.admin.updateUserById(userId, {
      email: newEmail,
      user_metadata: { username: newUsername, role: newRole },
    });
  } else {
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: { username: newUsername, role: newRole },
    });
  }

  // Update profile
  const { data: updated, error: updateError } = await admin
    .from('profiles')
    .update({
      username: newUsername.trim(),
      role: newRole,
      premium_until: newPremiumUntil ? new Date(newPremiumUntil).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (updateError) throw updateError;
  return updated as Profile;
}

/**
 * Resets a member's password and updates profile
 */
export async function resetMemberPassword(userId: string, newPassword: string) {
  const admin = getAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    throw new Error(`ไม่สามารถรีเซ็ตรหัสผ่านได้: ${error.message}`);
  }

  // Update password field in profiles table
  await admin
    .from('profiles')
    .update({
      password: newPassword,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  return true;
}

/**
 * Deletes a member safely
 */
export async function deleteMember(userId: string) {
  const admin = getAdminClient();

  const { data: member, error: findError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (findError || !member) {
    throw new Error('ไม่พบข้อมูลสมาชิกที่ต้องการลบ');
  }

  // Safety rule: Cannot delete the last dev
  if (member.role === 'dev') {
    const devCount = await getDevCount();
    if (devCount <= 1) {
      throw new Error('ไม่สามารถลบ Dev คนสุดท้ายของระบบได้');
    }
  }

  // Delete profile first
  await admin.from('profiles').delete().eq('id', userId);

  // Delete auth user
  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    throw new Error(`ลบผู้ใช้ไม่สำเร็จ: ${authError.message}`);
  }

  return true;
}
