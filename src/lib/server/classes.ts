import { getAdminClient } from '@/lib/supabase/admin';
import { AuthContext } from './session';

export interface ClassRow {
  id: string;
  teacher_id: string;
  name: string;
  grade: string | null;
  archived: boolean;
  created_at: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

/** โหลดห้องเรียนของครูคนนี้ (Dev เปิดดูได้ทุกห้อง) */
export async function loadOwnClass(auth: AuthContext, classId: string): Promise<ClassRow | null> {
  if (!isUuid(classId)) return null;
  const admin = getAdminClient();
  const { data } = await admin.from('classes').select('*').eq('id', classId).maybeSingle();
  if (!data) return null;
  if (auth.profile.role !== 'dev' && data.teacher_id !== auth.userId) return null;
  return data as ClassRow;
}
