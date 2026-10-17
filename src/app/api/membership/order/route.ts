import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { NO_OFFER, planById, quote } from '@/lib/plans';
import { offerFor, offersReady } from '@/lib/server/offers';
import { maskPromptPay, promptPayKind, promptPayPayload } from '@/lib/promptpay';
import { ORDER_PAY_MINUTES, easySlipConfigured, getPaymentSettings } from '@/lib/server/payments';
import { clientIp, isSameOrigin, limit } from '@/lib/server/rate-limit';
import { verifyTurnstile } from '@/lib/server/turnstile';

export const dynamic = 'force-dynamic';

/** สร้างคำสั่งซื้อ + QR พร้อมเพย์ระบุยอด (ราคาคิดจากฝั่งเซิร์ฟเวอร์เท่านั้น) */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const ip = clientIp(req);
  if (!(await limit(`order:${ip}`, 10, 10 * 60 * 1000)) || !(await limit(`order-day:${ip}`, 40, 24 * 3600 * 1000))) {
    return NextResponse.json({ error: 'สร้างคำสั่งซื้อบ่อยเกินไป รอสักครู่แล้วลองใหม่นะ' }, { status: 429 });
  }

  let planId = '';
  let cf = '';
  try {
    const b = await req.json();
    planId = String(b?.plan || '');
    cf = String(b?.cf || '');
  } catch {
    /* ว่าง */
  }
  if (!(await verifyTurnstile(cf, ip))) return NextResponse.json({ error: 'ยืนยันว่าไม่ใช่บอทไม่สำเร็จ รีเฟรชหน้าแล้วลองใหม่นะ' }, { status: 403 });
  const plan = planById(planId);
  if (!plan) return NextResponse.json({ error: 'ไม่พบแพลนนี้' }, { status: 400 });
  const v2 = await offersReady().catch(() => false);
  if (plan.id === 'day' && !v2) return NextResponse.json({ error: 'แพลนรายวันยังไม่เปิด เลือกแพลนอื่นก่อนนะ' }, { status: 400 });

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

  // ราคา/วันแถมคิดจากข้อมูลในฐานข้อมูลเท่านั้น
  const offer = user && v2 ? await offerFor(user.id).catch(() => NO_OFFER) : NO_OFFER;
  const q = quote(plan, offer);

  const now = Date.now();
  const expiresAt = new Date(now + ORDER_PAY_MINUTES * 60 * 1000).toISOString();
  const { data: order, error } = await getAdminClient()
    .from('payment_orders')
    .insert({
      user_id: user?.id ?? null,
      username,
      plan: plan.id,
      days: plan.days,
      amount: q.amount,
      expires_at: expiresAt,
      ip,
      ...(v2 ? { promo: q.welcome ? 'welcome' : q.bonusDays ? 'renew' : null, list_amount: plan.price, bonus_days: q.bonusDays } : {}),
    })
    .select('id, created_at')
    .single();
  if (error || !order) return NextResponse.json({ error: 'สร้างคำสั่งซื้อไม่สำเร็จ ลองใหม่อีกครั้ง' }, { status: 500 });

  const payload = promptPayPayload(s.promptpay_id as string, q.amount);
  const qr = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 560,
    color: { dark: '#1d1a3a', light: '#ffffff' },
  });

  return NextResponse.json({
    orderId: order.id,
    plan: plan.id,
    amount: q.amount,
    listAmount: plan.price,
    days: q.days,
    bonusDays: q.bonusDays,
    welcome: q.welcome,
    qr,
    expiresAt,
    accountName: s.account_name,
    bankName: s.bank_name,
    promptpay: maskPromptPay(s.promptpay_id as string),
    forUsername: username,
  });
}
