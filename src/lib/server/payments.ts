/**
 * ระบบชำระเงินสมาชิก (ฝั่งเซิร์ฟเวอร์เท่านั้น)
 * - ตั้งค่าบัญชีรับเงินอยู่ในตาราง payment_settings (อ่าน/เขียนผ่าน service role)
 * - ตรวจสลิปด้วย EasySlip API v2 แล้วเช็กซ้ำเองอีกชั้น: ยอดตรง, ผู้รับตรง, เวลาโอนอยู่ในช่วงคำสั่งซื้อ, สลิปไม่เคยใช้
 */
import { getAdminClient } from '@/lib/supabase/admin';

export const ORDER_PAY_MINUTES = 30; // อายุ QR
export const ORDER_UPLOAD_HOURS = 24; // ส่งสลิปได้ภายในกี่ชั่วโมงหลังสร้างคำสั่งซื้อ
const EASYSLIP_URL = 'https://api.easyslip.com/v2/verify/bank';

export interface PaymentSettings {
  enabled: boolean;
  promptpay_id: string | null;
  account_name: string | null;
  bank_name: string | null;
  bank_account: string | null;
  updated_at?: string;
}

export async function getPaymentSettings(): Promise<PaymentSettings | null> {
  const { data, error } = await getAdminClient()
    .from('payment_settings')
    .select('enabled, promptpay_id, account_name, bank_name, bank_account, updated_at')
    .eq('id', 1)
    .maybeSingle();
  if (error) return null;
  return (data as PaymentSettings) || null;
}

export const easySlipConfigured = () => !!process.env.EASYSLIP_API_KEY;

/* ------------------------------------------------------------------ */
/* เทียบผู้รับเงินในสลิปกับบัญชีที่ตั้งไว้                               */
/* ------------------------------------------------------------------ */

/**
 * เทียบเลขที่ถูกปิดบางส่วน (เช่น xxx-x-x5678-x) กับเลขจริง โดยชิดขวา
 * คืน true = ตรง (เห็นตัวเลขอย่างน้อย 3 หลักและตรงทุกหลัก), false = ไม่ตรง, null = ข้อมูลไม่พอ
 */
export function maskedMatch(masked?: string | null, real?: string | null): boolean | null {
  if (!masked || !real) return null;
  const m = masked.toLowerCase().replace(/[^0-9x]/g, '');
  const r = real.replace(/\D/g, '');
  if (!m || !r) return null;
  let visible = 0;
  for (let i = 1; i <= m.length; i++) {
    const c = m[m.length - i];
    if (c === 'x') continue;
    const rc = r[r.length - i];
    if (rc === undefined || c !== rc) return false;
    visible++;
  }
  return visible >= 3 ? true : null;
}

const TITLES = /^(นางสาว|นาง|นาย|น\.ส\.|ด\.ช\.|ด\.ญ\.|mrs\.?|mr\.?|ms\.?|miss)\s*/i;
const normName = (s?: string | null) =>
  (s || '')
    .trim()
    .replace(TITLES, '')
    .toLowerCase()
    .replace(/[^a-z฀-๿]/g, '');

/** ชื่อในสลิปมักถูกตัดท้าย จึงเทียบแบบขึ้นต้นตรงกัน (อย่างน้อย 3 ตัวอักษร) */
export function nameMatch(slipName?: string | null, configured?: string | null): boolean {
  const a = normName(slipName);
  const b = normName(configured);
  if (a.length < 3 || b.length < 3) return false;
  return b.startsWith(a) || a.startsWith(b);
}

interface SlipParty {
  account?: {
    name?: { th?: string; en?: string };
    bank?: { type?: string; account?: string };
    proxy?: { type?: string; account?: string };
  };
}

export function receiverMatches(
  receiver: SlipParty | undefined,
  matchedAccount: unknown,
  s: PaymentSettings
): boolean {
  if (matchedAccount) return true; // EasySlip จับคู่กับบัญชีที่ลงทะเบียนไว้แล้ว
  const acc = receiver?.account;
  const checks = [maskedMatch(acc?.bank?.account, s.bank_account), maskedMatch(acc?.proxy?.account, s.promptpay_id)];
  // ต้องยืนยันด้วยเลขบัญชี/เลขพร้อมเพย์เท่านั้น ไม่ยอมรับการเทียบชื่ออย่างเดียว
  // (คนชื่อคล้ายกันอาจโอนเข้าบัญชีตัวเองแล้วอ้างว่าจ่ายแล้ว)
  return checks.includes(true) && !checks.includes(false);
}

/* ------------------------------------------------------------------ */
/* EasySlip                                                            */
/* ------------------------------------------------------------------ */

export interface SlipResult {
  ok: boolean;
  code?: string;
  message?: string;
  isDuplicate?: boolean;
  matchedAccount?: unknown;
  amount?: number;
  transRef?: string;
  date?: string;
  senderName?: string;
  receiver?: SlipParty;
}

export async function verifySlip(image: Blob, filename: string, expectAmount: number): Promise<SlipResult> {
  const key = process.env.EASYSLIP_API_KEY;
  if (!key) return { ok: false, code: 'NOT_CONFIGURED', message: 'ระบบตรวจสลิปยังไม่พร้อม' };
  const fd = new FormData();
  fd.append('image', image, filename);
  fd.append('checkDuplicate', 'true');
  fd.append('matchAccount', 'true');
  fd.append('matchAmount', expectAmount.toFixed(2));
  let res: Response;
  try {
    res = await fetch(EASYSLIP_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
      cache: 'no-store',
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    return { ok: false, code: 'NETWORK', message: 'เชื่อมต่อระบบตรวจสลิปไม่ได้' };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let j: any = null;
  try {
    j = await res.json();
  } catch {
    /* ว่าง */
  }
  if (!res.ok || !j?.success || !j?.data?.rawSlip) {
    return { ok: false, code: j?.error?.code || `HTTP_${res.status}`, message: j?.error?.message };
  }
  const d = j.data;
  const raw = d.rawSlip;
  return {
    ok: true,
    isDuplicate: !!d.isDuplicate,
    matchedAccount: d.matchedAccount ?? null,
    amount: Number(d.amountInSlip ?? raw.amount?.amount),
    transRef: String(raw.transRef || ''),
    date: raw.date,
    senderName: raw.sender?.account?.name?.th || raw.sender?.account?.name?.en || '',
    receiver: raw.receiver,
  };
}

/** ข้อความภาษาไทยสำหรับรหัสข้อผิดพลาดของ EasySlip */
export function slipErrorText(code?: string): string {
  switch (code) {
    case 'SLIP_NOT_FOUND':
      return 'ไม่พบ QR บนสลิป ลองครอปให้เห็น QR ชัดๆ แล้วส่งใหม่';
    case 'SLIP_PENDING':
      return 'ธนาคารยังไม่ยืนยันรายการ รอ 2-3 นาทีแล้วส่งใหม่อีกครั้ง';
    case 'IMAGE_SIZE_TOO_LARGE':
      return 'รูปใหญ่เกิน 4MB';
    case 'INVALID_IMAGE_FORMAT':
      return 'ไฟล์นี้ไม่ใช่รูปสลิป';
    case 'NOT_CONFIGURED':
      return 'ระบบตรวจสลิปยังไม่เปิดใช้งาน ติดต่อแอดมินทางเพจ';
    case 'NETWORK':
      return 'เชื่อมต่อระบบตรวจสลิปไม่ได้ ลองใหม่อีกครั้ง';
    default:
      return 'ตรวจสลิปไม่สำเร็จ ลองใหม่อีกครั้ง หรือติดต่อแอดมินทางเพจ';
  }
}

/** วันหมดอายุใหม่: ต่อจากวันหมดอายุเดิมถ้ายังไม่หมด ไม่งั้นนับจากตอนนี้ */
export function extendUntil(current: string | null | undefined, days: number, now = Date.now()): string {
  const cur = current ? new Date(current).getTime() : NaN;
  const base = !isNaN(cur) && cur > now ? cur : now;
  return new Date(base + days * 86400000).toISOString();
}
