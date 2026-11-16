import { createClient } from '@/lib/supabase/server';

/** ตรวจว่าผู้เรียกเป็น Dev (ทุก API ใน /api/dev ต้องเรียก) */
export async function verifyDev(): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'กรุณาเข้าสู่ระบบ' };
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!p || p.role !== 'dev') return { ok: false, status: 403, error: 'สำหรับ Dev เท่านั้น' };
  return { ok: true, userId: user.id };
}
