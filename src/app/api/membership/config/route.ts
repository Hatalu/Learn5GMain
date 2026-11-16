import { NextResponse } from 'next/server';
import { easySlipConfigured, getPaymentSettings } from '@/lib/server/payments';
import { getEntTable } from '@/lib/server/entitlements';
import { promptPayKind } from '@/lib/promptpay';

export const dynamic = 'force-dynamic';

/**
 * ข้อมูลหน้าแพ็กเกจ (ไม่เปิดเผยเลขบัญชี)
 * - ready: เปิดรับชำระออนไลน์แล้วหรือยัง
 * - ents: สิทธิ์ของทุกแพ็กเกจ (ตาราง plan_entitlements)
 */
export async function GET() {
  const [s, ents] = await Promise.all([getPaymentSettings().catch(() => null), getEntTable()]);
  const ready = !!s && s.enabled && !!promptPayKind(s.promptpay_id || '') && !!s.account_name && easySlipConfigured();
  return NextResponse.json({ ready, ents, now: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, no-store' } });
}
