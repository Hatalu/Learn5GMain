import type { SupabaseClient } from '@supabase/supabase-js';

export type SyncStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error' | 'missing';

interface DbError {
  code?: string;
  message?: string;
}

/** ตารางยังไม่ถูกสร้าง (ยังไม่ได้รัน migration 006) */
export function isMissingTable(e: DbError | null | undefined): boolean {
  if (!e) return false;
  return (
    e.code === '42P01' ||
    e.code === 'PGRST205' ||
    /companion_data|schema cache|does not exist/i.test(e.message || '')
  );
}

export async function fetchRemote(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: unknown | null; error: DbError | null }> {
  const { data, error } = await supabase
    .from('companion_data')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  return { data: data ? (data as { data: unknown }).data : null, error };
}

export async function saveRemote(
  supabase: SupabaseClient,
  userId: string,
  state: unknown
): Promise<DbError | null> {
  const { error } = await supabase
    .from('companion_data')
    .upsert({ user_id: userId, data: state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  return error;
}
