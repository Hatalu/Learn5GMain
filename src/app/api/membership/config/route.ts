import { NextResponse } from 'next/server';
import { PLANS } from '@/lib/plans';
import { easySlipConfigured, getPaymentSettings } from '@/lib/server/payments';
import { promptPayKind } from '@/lib/promptpay';

export const dynamic = 'force-dynamic';

/** ข้อมูลสาธารณะของหน้าสมัครสมาชิก (ไม่เปิดเผยเลขบัญชี) */
export async function GET() {
  const s = await getPaymentSettings().catch(() => null);
  const ready = !!s && s.enabled && !!promptPayKind(s.promptpay_id || '') && !!s.account_name && easySlipConfigured();
  return NextResponse.json({
    ready,
    accountName: ready ? s?.account_name : null,
    bankName: ready ? s?.bank_name : null,
    plans: PLANS.map(({ id, name, days, price }) => ({ id, name, days, price })),
  });
}
