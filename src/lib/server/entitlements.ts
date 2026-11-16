import { getAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_ENTS, entTableFrom, type EntTable } from '@/lib/entitlements';

let cache: { at: number; t: EntTable } | null = null;
const TTL = 30 * 1000;

/** ตารางสิทธิ์ของทุกแพ็กเกจ (แคช 30 วิ, ยังไม่รัน migration 030 = ค่าเริ่มต้น) */
export async function getEntTable(fresh = false): Promise<EntTable> {
  if (!fresh && cache && Date.now() - cache.at < TTL) return cache.t;
  try {
    const { data, error } = await getAdminClient().from('plan_entitlements').select('*');
    const t = error ? DEFAULT_ENTS : entTableFrom(data);
    cache = { at: Date.now(), t };
    return t;
  } catch {
    return DEFAULT_ENTS;
  }
}

export const clearEntCache = () => {
  cache = null;
};
