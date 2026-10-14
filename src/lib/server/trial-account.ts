import crypto from 'crypto';
import { createMemberAccount, getAdminClient, deleteMember } from '@/lib/supabase/admin';

/** บัญชีทดลองเล่นมีอายุ 2 นาที 10 วินาที แล้วถูกลบ */
export const TRIAL_ACCOUNT_SECONDS = 130;
export const TRIAL_PREFIX = 'trial_';

/** ลบบัญชีทดลองที่หมดอายุแล้วทั้งหมด (เรียกทุกครั้งที่มีคนเริ่มทดลอง กันบัญชีค้าง) */
export async function sweepTrialAccounts(): Promise<number> {
  const admin = getAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('id, premium_until')
    .like('username', TRIAL_PREFIX + '%')
    .eq('role', 'member')
    .lt('premium_until', new Date().toISOString())
    .limit(50);
  let n = 0;
  for (const p of data || []) {
    try { await deleteMember(p.id); n++; } catch { /* ข้าม */ }
  }
  return n;
}

/** สร้างบัญชีชั่วคราว (รหัสสุ่ม) ที่เป็นสมาชิกถึงเวลาหมดอายุ */
export async function createTrialAccount(n: string) {
  const username = TRIAL_PREFIX + n;
  const password = crypto.randomBytes(18).toString('base64url');
  const until = new Date(Date.now() + TRIAL_ACCOUNT_SECONDS * 1000).toISOString();
  await createMemberAccount(username, password, 'member', until);
  return { username, password };
}

/** ลบบัญชีทดลองตามรหัส n (ลบได้เฉพาะ username ที่ขึ้นต้นด้วย trial_) */
export async function deleteTrialAccount(n: string): Promise<boolean> {
  if (!/^[0-9a-f]{12}$/.test(n)) return false;
  const { data } = await getAdminClient().from('profiles').select('id').eq('username', TRIAL_PREFIX + n).maybeSingle();
  if (!data) return false;
  await deleteMember(data.id);
  return true;
}
