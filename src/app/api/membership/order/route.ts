import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { planById } from '@/lib/plans';
import { maskPromptPay, promptPayKind, promptPayPayload } from '@/lib/promptpay';
import { ORDER_PAY_MINUTES, easySlipConfigured, getPaymentSettings } from '@/lib/server/payments';
import { clientIp, isSameOrigin, rateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

/** สร้างคำสั่งซื้อ + QR พร้อมเพย์ระบุยอด (ราคาคิดจากฝั่งเซิร์ฟเวอร์เท่านั้น) */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const ip = clientIp(req);
  if (!rateLimit(`order:${ip}`, 12, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'สร้างคำสั่งซื้อบ่อยเกินไป รอสักครู่แล้วลองใหม่นะ' }, { status: 429 });
  }

  let planId = '';
  try {
    planId = String((await req.json())?.plan || '');
  } catch {
    /* ว่าง */
  }
  const plan = planById(planId);
  if (!plan) return NextResponse.json({ error: 'ไม่พบแพลนนี้' }, { status: 400 });

  const s = await getPaymentSettings().catch(() => null);
  if (!s || !s.enabled || !promptPayKind(s.promptpay_id || '') || !s.account_name || !easySlipConfigured()) {
    return NextResponse.json({ error: 'ระบบชำระเงินยังไม่เปิด ติดต่อสมัครทางเพจได้เลย' }, { status: 503 });
  }

  // ผู้ที่ล็อกอินอยู่: ผูกคำสั่งซื้อกับบัญชีนั้น (ต่ออายุ) / ผู้เยี่ยมชม: สร้างบัญชีตอนชำระสำเร็จ
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let username: string | null = null;
  if (user) {
    const { data: p } = await supabase.from('profiles').select('username, role').eq('id', user.id).maybeSingle();
    if (p?.role === 'dev') return NextResponse.json({ error: 'บัญชี Dev ใช้งานได้ทุกอย่างอยู่แล้ว' }, { status: 400 });
    if (String(p?.username || '').startsWith('trial_')) return NextResponse.json({ error: 'บัญชีทดลองสมัครไม่ได้' }, { status: 400 });
    username = p?.username ?? null;
  }

  const now = Date.now();
  const expiresAt = new Date(now + ORDER_PAY_MINUTES * 60 * 1000).toISOString();
  const { data: order, error } = await getAdminClient()
    .from('payment_orders')
    .insert({
      user_id: user?.id ?? null,
      username,
      plan: plan.id,
      days: plan.days,
      amount: plan.price,
      expires_at: expiresAt,
      ip,
    })
    .select('id, created_at')
    .single();
  if (error || !order) return NextResponse.json({ error: 'สร้างคำสั่งซื้อไม่สำเร็จ ลองใหม่อีกครั้ง' }, { status: 500 });

  const payload = promptPayPayload(s.promptpay_id as string, plan.price);
  const qr = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 560,
    color: { dark: '#1d1a3a', light: '#ffffff' },
  });

  return NextResponse.json({
    orderId: order.id,
    plan: plan.id,
    amount: plan.price,
    days: plan.days,
    qr,
    expiresAt,
    accountName: s.account_name,
    bankName: s.bank_name,
    promptpay: maskPromptPay(s.promptpay_id as string),
    forUsername: username,
  });
}
