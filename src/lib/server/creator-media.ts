import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { MEDIA_BUCKET } from '@/lib/game-creator/prefix';
import { creatorTier, quotaBytes, type CreatorTier } from '@/lib/game-creator/quota';

/** ผู้ใช้ที่ล็อกอินอยู่ + ระดับสิทธิ์ (guest = ไม่ได้ล็อกอินหรือเป็นบัญชีทดลอง) */
export async function getCreator(): Promise<{ id: string; username: string; tier: CreatorTier } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from('profiles').select('username, role, premium_until').eq('id', user.id).maybeSingle();
  if (!p) return null;
  const tier = creatorTier(true, p);
  if (tier === 'guest') return null;
  return { id: user.id, username: p.username, tier };
}

export interface StoredFile {
  name: string;
  size: number;
  created: number;
}

/** ไฟล์ทั้งหมดในโฟลเดอร์ของผู้ใช้ใน bucket (ขนาดจริงจาก Storage ไม่ใช่ตัวเลขที่ผู้ใช้แจ้งมา) */
export async function listUserFiles(uid: string): Promise<StoredFile[]> {
  const admin = getAdminClient();
  const out: StoredFile[] = [];
  for (let offset = 0; offset < 5000; offset += 1000) {
    const { data, error } = await admin.storage.from(MEDIA_BUCKET).list(uid, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error || !data) break;
    for (const f of data) {
      const meta = (f.metadata || {}) as { size?: number };
      if (!f.name || f.id === null) continue; // โฟลเดอร์ย่อย
      out.push({ name: f.name, size: Number(meta.size) || 0, created: f.created_at ? new Date(f.created_at).getTime() : 0 });
    }
    if (data.length < 1000) break;
  }
  return out;
}

export const usedBytes = (files: StoredFile[]) => files.reduce((n, f) => n + f.size, 0);

/**
 * ลบไฟล์ที่ไม่มีเกม/ห้องไหนอ้างถึงแล้ว เพื่อคืนโควต้า
 * - ข้ามไฟล์ที่เพิ่งอัปโหลดภายใน minAgeMs (เผื่อกำลังแก้ไขเกมอยู่แต่ยังไม่ได้บันทึก)
 * - ข้ามไฟล์ใน keep (ที่ตัวแก้ไขที่เปิดอยู่ใช้งาน)
 * ต้องรัน migration 019 (ฟังก์ชัน media_in_use) ถ้ายังไม่มีจะไม่ลบอะไรเลย
 */
export async function sweepUnused(uid: string, opts: { minAgeMs: number; keep?: string[] }): Promise<{ removed: number; freed: number; ok: boolean }> {
  const admin = getAdminClient();
  const { data, error } = await admin.rpc('media_in_use', { p_uid: uid });
  if (error) return { removed: 0, freed: 0, ok: false };
  const used = new Set<string>((data as { path: string }[] | null)?.map((r) => r.path.split('/').pop() || '') || []);
  (opts.keep || []).forEach((k) => used.add(k.split('/').pop() || ''));
  const now = Date.now();
  const files = await listUserFiles(uid);
  const dead = files.filter((f) => !used.has(f.name) && now - f.created >= opts.minAgeMs);
  if (!dead.length) return { removed: 0, freed: 0, ok: true };
  const { error: rmErr } = await admin.storage.from(MEDIA_BUCKET).remove(dead.map((f) => `${uid}/${f.name}`));
  if (rmErr) return { removed: 0, freed: 0, ok: false };
  return { removed: dead.length, freed: usedBytes(dead), ok: true };
}

export { quotaBytes };
