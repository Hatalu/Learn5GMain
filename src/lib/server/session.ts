import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { Profile, UserRole } from '@/types/database';
import { apiError, isSameOrigin } from './security';

export interface AuthContext {
  userId: string;
  profile: Profile;
}

/** ผู้ใช้ที่ล็อกอินอยู่ + โปรไฟล์ (อ่านด้วยสิทธิ์ server เพื่อไม่ติด RLS) */
export async function getAuth(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const admin = getAdminClient();
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!profile) return null;
  return { userId: user.id, profile: profile as Profile };
}

type Guard = { ok: true; auth: AuthContext } | { ok: false; res: ReturnType<typeof apiError> };

/** ตรวจ: ล็อกอินแล้ว + บทบาทตรงตามที่อนุญาต + (ถ้าเป็นคำขอเปลี่ยนข้อมูล) มาจากเว็บเราเอง */
export async function guard(req: NextRequest, roles: UserRole[]): Promise<Guard> {
  if (!isSameOrigin(req)) return { ok: false, res: apiError(403, 'คำขอไม่ถูกต้อง') };
  const auth = await getAuth();
  if (!auth) return { ok: false, res: apiError(401, 'กรุณาเข้าสู่ระบบ') };
  if (!roles.includes(auth.profile.role)) {
    return { ok: false, res: apiError(403, 'คุณไม่มีสิทธิ์ใช้งานส่วนนี้') };
  }
  return { ok: true, auth };
}

/** ผู้ใหญ่ที่จัดการนักเรียนได้ */
export const GUARDIAN_ROLES: UserRole[] = ['parent', 'teacher', 'member', 'dev'];

export function isPremiumActive(profile: Pick<Profile, 'role' | 'premium_until'>): boolean {
  if (profile.role === 'dev') return true;
  if (!profile.premium_until) return false;
  const t = new Date(profile.premium_until).getTime();
  return !isNaN(t) && t > Date.now();
}

/** ตรวจว่าผู้ใหญ่คนนี้เป็นเจ้าของนักเรียน (หรือเป็น Dev) */
export async function loadOwnedStudent(auth: AuthContext, studentId: string): Promise<Profile | null> {
  const admin = getAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .eq('role', 'student')
    .maybeSingle();
  if (!data) return null;
  if (auth.profile.role !== 'dev' && data.owner_id !== auth.userId) return null;
  return data as Profile;
}

export async function logSecurityEvent(kind: string, actorId: string | null, detail?: string) {
  try {
    await getAdminClient()
      .from('security_events')
      .insert({ kind, actor_id: actorId, detail: detail?.slice(0, 300) ?? null });
  } catch {
    // ไม่ให้การบันทึกล้มเหลวทำให้คำขอหลักล้มเหลว
  }
}
