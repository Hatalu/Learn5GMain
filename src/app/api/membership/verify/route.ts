import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { nextTerm, planById } from '@/lib/plans';
import {
  ORDER_UPLOAD_HOURS,
  getPaymentSettings,
  receiverMatches,
  slipErrorText,
  verifySlip,
} from '@/lib/server/payments';
import { clientIp, isSameOrigin, limit } from '@/lib/server/rate-limit';
import { verifyTurnstile } from '@/lib/server/turnstile';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 4 * 1024 * 1024;

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/**
 * ส่งสลิปเพื่อยืนยันการชำระเงิน
 * ลำดับ: ตรวจคำขอ → ตรวจคำสั่งซื้อ → (ผู้สมัครใหม่) ตรวจชื่อบัญชีว่าง → EasySlip → เช็กยอด/ผู้รับ/เวลา/สลิปซ้ำ
 *       → จองคำสั่งซื้อด้วย trans_ref (unique กันใช้สลิปซ้ำแม้ส่งพร้อมกัน) → เปิด/ต่ออายุสมาชิก
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return fail('คำขอไม่ถูกต้อง', 403);
  const ip = clientIp(req);
  if (!(await limit(`verify:${ip}`, 8, 10 * 60 * 1000)) || !(await limit(`verify-day:${ip}`, 40, 24 * 3600 * 1000))) return fail('ส่งสลิปบ่อยเกินไป รอสักครู่แล้วลองใหม่นะ', 429);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('ข้อมูลไม่ถูกต้อง');
  }
  const orderId = String(form.get('orderId') || '');
  const file = form.get('slip');
  if (!UUID.test(orderId)) return fail('ไม่พบคำสั่งซื้อ');
  if (!(await verifyTurnstile(String(form.get('cf') || ''), ip))) return fail('ยืนยันว่าไม่ใช่บอทไม่สำเร็จ รีเฟรชหน้าแล้วลองใหม่นะ', 403);
  if (!(file instanceof Blob) || file.size === 0) return fail('แนบรูปสลิปก่อนนะ');
  if (file.size > MAX_BYTES) return fail('รูปใหญ่เกิน 4MB');
  if (!IMAGE_TYPES.includes(file.type)) return fail('รองรับเฉพาะรูป JPG PNG WEBP');

  const admin = getAdminClient();
  const { data: order } = await admin.from('payment_orders').select('*').eq('id', orderId).maybeSingle();
  if (!order) return fail('ไม่พบคำสั่งซื้อ');
  if (order.status === 'paid') return fail('คำสั่งซื้อนี้ชำระเรียบร้อยแล้ว');
  const created = new Date(order.created_at).getTime();
  if (Date.now() - created > ORDER_UPLOAD_HOURS * 3600 * 1000) return fail('คำสั่งซื้อนี้หมดอายุแล้ว สร้างใหม่อีกครั้งนะ');
  if (order.attempts >= 8) return fail('ส่งสลิปผิดหลายครั้งเกินไป ติดต่อแอดมินทางเพจพร้อมสลิปนะ');
  const plan = planById(order.plan);
  // ยอดในคำสั่งซื้อต้องตรงกับราคาแพ็กเกจที่ระบบคิดได้เองเท่านั้น (คำสั่งซื้อแพลนเก่า = ไม่ผ่าน)
  const amount = Number(order.amount);
  if (!plan || !order.user_id) return fail('คำสั่งซื้อนี้ใช้ไม่ได้แล้ว สร้างใหม่อีกครั้งนะ');
  if (amount !== plan.price) return fail('คำสั่งซื้อไม่ถูกต้อง');

  const settings = await getPaymentSettings();
  if (!settings || !settings.enabled) return fail('ระบบชำระเงินปิดอยู่ ติดต่อแอดมินทางเพจ', 503);

  const bumpAttempt = (msg: string) =>
    admin.from('payment_orders').update({ attempts: order.attempts + 1, last_error: msg.slice(0, 200) }).eq('id', orderId);

  const slip = await verifySlip(file, 'slip', amount);
  if (!slip.ok) {
    const msg = slipErrorText(slip.code);
    if (slip.code !== 'NOT_CONFIGURED' && slip.code !== 'NETWORK') await bumpAttempt(`${slip.code}`);
    return fail(msg, slip.code === 'NOT_CONFIGURED' ? 503 : 400);
  }

  // 1) สลิปเคยใช้ในระบบเราแล้วหรือยัง
  if (!slip.transRef) {
    await bumpAttempt('no transRef');
    return fail('อ่านเลขอ้างอิงสลิปไม่ได้ ลองส่งรูปที่ชัดขึ้น');
  }
  const { data: used } = await admin.from('payment_orders').select('id').eq('trans_ref', slip.transRef).maybeSingle();
  if (used) {
    await bumpAttempt('duplicate slip');
    return fail('สลิปนี้ถูกใช้ไปแล้ว');
  }
  // (EasySlip บอกว่าซ้ำ แต่ไม่มีในระบบเรา = เคยตรวจแล้วขั้นตอนถัดไปล้มเหลว จึงให้ลองต่อได้)

  // 2) ยอดเงินต้องตรงเป๊ะ
  if (!(Math.abs((slip.amount ?? 0) - amount) < 0.005)) {
    await bumpAttempt(`amount ${slip.amount}`);
    return fail(`ยอดในสลิปคือ ${slip.amount} บาท แต่คำสั่งซื้อนี้ ${amount} บาท`);
  }

  // 3) ผู้รับเงินต้องเป็นบัญชีที่ตั้งไว้
  if (!receiverMatches(slip.receiver, slip.matchedAccount, settings)) {
    await bumpAttempt('receiver mismatch');
    return fail('บัญชีผู้รับในสลิปไม่ตรงกับบัญชีของเว็บ');
  }

  // 4) เวลาโอนต้องอยู่หลังสร้างคำสั่งซื้อ และก่อน QR หมดอายุ
  const slipTime = slip.date ? new Date(slip.date).getTime() : NaN;
  const expires = new Date(order.expires_at).getTime();
  if (isNaN(slipTime) || slipTime < created - 2 * 60 * 1000 || slipTime > Math.max(expires, Date.now()) + 2 * 60 * 1000) {
    await bumpAttempt(`slip time ${slip.date}`);
    return fail('เวลาโอนในสลิปไม่ตรงกับคำสั่งซื้อนี้ (ต้องโอนหลังจากกดสมัคร)');
  }
  if (slipTime > expires + 2 * 60 * 1000) {
    await bumpAttempt('paid after expiry');
    return fail('โอนหลังจาก QR หมดอายุ ติดต่อแอดมินทางเพจพร้อมสลิปนะ');
  }

  // 5) จองคำสั่งซื้อ (unique trans_ref + เงื่อนไข status = pending กันประมวลผลซ้ำ)
  const { data: claimed, error: claimErr } = await admin
    .from('payment_orders')
    .update({
      status: 'paid',
      trans_ref: slip.transRef,
      slip_amount: slip.amount,
      slip_date: new Date(slipTime).toISOString(),
      sender_name: (slip.senderName || '').slice(0, 120),
      paid_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (claimErr || !claimed) {
    return fail(claimErr?.code === '23505' ? 'สลิปนี้ถูกใช้ไปแล้ว' : 'คำสั่งซื้อนี้ถูกดำเนินการแล้ว');
  }

  const unclaim = (msg: string) =>
    admin
      .from('payment_orders')
      .update({ status: 'pending', trans_ref: null, paid_at: null, last_error: msg.slice(0, 200) })
      .eq('id', orderId);

  // 6) เปิด/ต่ออายุแพ็กเกจ (เปลี่ยนแพ็กเกจกลางรอบ = แปลงวันที่เหลือตามมูลค่า ดู nextTerm)
  try {
    const { data: p } = await admin.from('profiles').select('*').eq('id', order.user_id).single();
    if (!p) throw new Error('ไม่พบบัญชี');
    let until = p.premium_until as string;
    let carriedDays = 0;
    if (p.role !== 'dev') {
      const t = nextTerm({ plan: p.plan, until: p.premium_until }, plan.id);
      until = t.until;
      carriedDays = t.carriedDays;
      const { error: upErr } = await admin.from('profiles').update({ premium_until: until, plan: plan.id }).eq('id', order.user_id);
      if (upErr) throw upErr;
    }
    await admin.from('payment_orders').update({ premium_until: until }).eq('id', orderId);
    return NextResponse.json({ ok: true, username: p.username, premiumUntil: until, plan: plan.id, carriedDays });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error';
    await unclaim(`activate failed: ${msg}`);
    return fail('ชำระเงินสำเร็จแต่เปิดสิทธิ์ไม่สำเร็จ ส่งสลิปเดิมอีกครั้ง หรือติดต่อแอดมินทางเพจ', 500);
  }
}
