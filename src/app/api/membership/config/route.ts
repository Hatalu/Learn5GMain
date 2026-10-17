import { NextResponse } from 'next/server';
import { NO_OFFER } from '@/lib/plans';
import { createClient } from '@/lib/supabase/server';
import { easySlipConfigured, getPaymentSettings } from '@/lib/server/payments';
import { offerFor, offersReady } from '@/lib/server/offers';
import { promptPayKind } from '@/lib/promptpay';

export const dynamic = 'force-dynamic';

/**
 * ข้อมูลหน้าสมัครสมาชิก (ไม่เปิดเผยเลขบัญชี)
 * - ready: เปิดรับชำระออนไลน์แล้วหรือยัง
 * - dayPlan: มีแพลนรายวันให้ซื้อหรือยัง (ต้องรัน migration 020)
 * - offer: ข้อเสนอของผู้ที่ล็อกอินอยู่ (ส่วนลดบัญชีใหม่ / โบนัสต่ออายุ)
 */
export async function GET() {
  const s = await getPaymentSettings().catch(() => null);
  const ready = !!s && s.enabled && !!promptPayKind(s.promptpay_id || '') && !!s.account_name && easySlipConfigured();
  const v2 = await offersReady().catch(() => false);

  let offer = NO_OFFER;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) offer = await offerFor(user.id);
  } catch {
    /* ไม่มีข้อเสนอ */
  }

  return NextResponse.json(
    {
      ready,
      dayPlan: v2,
      offer,
      now: new Date().toISOString(),
      accountName: ready ? s?.account_name : null,
      bankName: ready ? s?.bank_name : null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
