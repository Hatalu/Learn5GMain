import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { buddySchema, firstIssue } from '@/lib/validations/platform';
import { apiError, friendlyDbError } from '@/lib/server/security';
import { guard } from '@/lib/server/session';
import { loadStats } from '@/lib/server/progress';
import { unlockedHats, Hat } from '@/lib/gamify';

/** เปลี่ยนสีตัวละครและหมวก/เครื่องแต่งตัว (ต้องปลดล็อกแล้วเท่านั้น) */
export async function POST(req: NextRequest) {
  const g = await guard(req, ['student']);
  if (!g.ok) return g.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, 'ข้อมูลไม่ถูกต้อง');
  }
  const parsed = buddySchema.safeParse(body);
  if (!parsed.success) return apiError(400, firstIssue(parsed.error));

  try {
    const admin = getAdminClient();
    const stats = await loadStats(admin, g.auth.userId);
    const update: Record<string, unknown> = { student_id: g.auth.userId, updated_at: new Date().toISOString() };

    if (parsed.data.color) update.buddy_color = parsed.data.color;
    if (parsed.data.hat) {
      const allowed = unlockedHats(stats.stars_total + stats.bonus_stars, stats.best_streak);
      if (!allowed.includes(parsed.data.hat as Hat)) return apiError(403, 'ยังไม่ปลดล็อกของชิ้นนี้นะ');
      update.buddy_hat = parsed.data.hat === 'none' ? null : parsed.data.hat;
    }

    const { error } = await admin.from('student_stats').upsert(update, { onConflict: 'student_id' });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(500, friendlyDbError(err));
  }
}
