/**
 * ข้อเสนอสมาชิก (ฝั่งเซิร์ฟเวอร์เท่านั้น) — ตัดสินจากข้อมูลในฐานข้อมูล ไม่เชื่อค่าที่หน้าเว็บส่งมา
 * - ส่วนลดบัญชีใหม่: บัญชีอายุไม่เกิน WELCOME_HOURS และยังไม่เคยจ่ายเงินเลย
 * - โบนัสต่ออายุ: วันนี้อยู่ในช่วง RENEW_WINDOW_DAYS ก่อน/หลังวันหมดอายุสมาชิก
 */
import { getAdminClient } from '@/lib/supabase/admin';
import { NO_OFFER, Offer, RENEW_WINDOW_DAYS, WELCOME_HOURS } from '@/lib/plans';
import { TRIAL_PREFIX } from '@/lib/server/trial-account';

const DAY = 86400000;
let readyAt = 0;

/** migration 020 รันแล้วหรือยัง (ถ้ายัง: ไม่มีแพลนรายวัน/ข้อเสนอ แต่ระบบจ่ายเงินเดิมยังใช้ได้) */
export async function offersReady(): Promise<boolean> {
  if (Date.now() - readyAt < 5 * 60 * 1000) return true;
  const { error } = await getAdminClient().from('payment_orders').select('promo, list_amount, bonus_days, email').limit(1);
  if (error) return false;
  readyAt = Date.now();
  return true;
}

export async function offerFor(userId: string | null | undefined, now = Date.now()): Promise<Offer> {
  if (!userId || !(await offersReady())) return NO_OFFER;
  const admin = getAdminClient();
  const { data: p } = await admin.from('profiles').select('username, role, created_at, premium_until').eq('id', userId).maybeSingle();
  if (!p || p.role === 'dev' || String(p.username || '').startsWith(TRIAL_PREFIX)) return NO_OFFER;

  const created = new Date(p.created_at).getTime();
  const welcomeEnd = created + WELCOME_HOURS * 3600 * 1000;
  if (!isNaN(created) && welcomeEnd > now) {
    const { count } = await admin.from('payment_orders').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'paid');
    if ((count ?? 1) === 0) return { welcomeEndsAt: new Date(welcomeEnd).toISOString(), renewEndsAt: null };
  }

  const until = p.premium_until ? new Date(p.premium_until).getTime() : NaN;
  if (!isNaN(until) && now >= until - RENEW_WINDOW_DAYS * DAY && now < until + RENEW_WINDOW_DAYS * DAY) {
    return { welcomeEndsAt: null, renewEndsAt: new Date(until + RENEW_WINDOW_DAYS * DAY).toISOString() };
  }
  return NO_OFFER;
}
