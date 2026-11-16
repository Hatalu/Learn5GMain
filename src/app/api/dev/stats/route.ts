import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyDev } from '@/lib/server/dev-auth';
import { tierOf, type Tier } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

/** ตัวเลขสรุปหน้า Dev: บัญชี แยกตามแพ็กเกจ ผลงาน งานนวัตกรรมที่ค้าง */
export async function GET() {
  const c = await verifyDev();
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: c.status });
  const admin = getAdminClient();
  const count = async (table: string) => {
    const { count: n } = await admin.from(table).select('id', { count: 'exact', head: true });
    return n || 0;
  };
  const [{ data: profiles }, games, designs, innov] = await Promise.all([
    admin.from('profiles').select('*').not('username', 'like', 'trial\\_%'),
    count('user_games'),
    count('user_designs'),
    admin.from('innovation_requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'working', 'revision']),
  ]);
  const byTier: Record<Tier, number> = { free: 0, plus: 0, pro: 0, master: 0 };
  for (const p of profiles || []) if (p.role !== 'dev') byTier[tierOf(p)]++;
  return NextResponse.json({
    accounts: (profiles || []).length,
    byTier,
    games,
    designs,
    innovationOpen: innov.error ? null : innov.count || 0,
  });
}
