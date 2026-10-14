/**
 * โทเคน "ทดลองเล่น" ที่เซ็นลายเซ็น ECDSA P-256 โดยเซิร์ฟเวอร์
 *
 * - เว็บหลักเซ็นด้วยกุญแจส่วนตัว (คำนวณจาก seed ฝั่งเซิร์ฟเวอร์ ไม่เคยออกไปนอกเซิร์ฟเวอร์)
 * - เกมแต่ละเกมฝังเฉพาะ "กุญแจสาธารณะ" ไว้ตรวจลายเซ็นเองด้วย WebCrypto (ไม่ต้องเรียกเซิร์ฟเวอร์,
 *   ไม่ต้องไว้ใจโดเมนใดๆ) โทเคนมีเวลาหมดอายุ จึงใช้เล่นได้แค่ช่วงทดลอง
 * - ปลอมโทเคนไม่ได้ถ้าไม่มีกุญแจส่วนตัว
 *
 * โครงสร้าง: base64url(JSON{v,exp,n}) + "." + base64url(ลายเซ็นแบบ r||s 64 ไบต์)
 */
import crypto from 'crypto';

export const TRIAL_SECONDS = 120;
/** เผื่อเวลาโหลดเกม: โทเคนหมดอายุหลังจากเวลาทดลองจริงอีกเท่านี้ */
export const TRIAL_GRACE_SECONDS = 45;

function seedScalar(): Buffer {
  const base = process.env.TRIAL_SIGNING_SEED || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base) throw new Error('Missing TRIAL_SIGNING_SEED / SUPABASE_SERVICE_ROLE_KEY');
  return crypto.createHash('sha256').update(`l5g-trial-v1:${base}`).digest();
}

let cached: { priv: crypto.KeyObject; jwk: { kty: 'EC'; crv: 'P-256'; x: string; y: string } } | null = null;

function keys() {
  if (cached) return cached;
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.setPrivateKey(seedScalar());
  const pub = ecdh.getPublicKey(); // 04 || X(32) || Y(32)
  const x = pub.subarray(1, 33).toString('base64url');
  const y = pub.subarray(33, 65).toString('base64url');
  const priv = crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', x, y, d: ecdh.getPrivateKey().toString('base64url') },
    format: 'jwk',
  });
  cached = { priv, jwk: { kty: 'EC', crv: 'P-256', x, y } };
  return cached;
}

/** กุญแจสาธารณะ (JWK) ที่ต้องฝังในเกมทุกเกม */
export function trialPublicJwk() {
  return keys().jwk;
}

export interface TrialPayload {
  v: 1;
  exp: number; // unix seconds
  n: string;
}

export function signTrialToken(nowMs = Date.now()): { token: string; exp: number; n: string } {
  const exp = Math.floor(nowMs / 1000) + TRIAL_SECONDS + TRIAL_GRACE_SECONDS;
  const n = crypto.randomBytes(6).toString('hex');
  const payload: TrialPayload = { v: 1, exp, n };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.sign('sha256', Buffer.from(body), { key: keys().priv, dsaEncoding: 'ieee-p1363' });
  return { token: `${body}.${sig.toString('base64url')}`, exp, n };
}

/** ตรวจโทเคน (ใช้ในเทสต์ — ในเกมจริงทำฝั่งเบราว์เซอร์ด้วย WebCrypto ตามตรรกะเดียวกัน) */
export function verifyTrialToken(token: string, nowMs = Date.now()): TrialPayload | null {
  try {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const pubKey = crypto.createPublicKey({ key: keys().jwk, format: 'jwk' });
    const ok = crypto.verify('sha256', Buffer.from(body), { key: pubKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url'));
    if (!ok) return null;
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TrialPayload;
    if (p.v !== 1 || typeof p.exp !== 'number' || p.exp * 1000 <= nowMs) return null;
    return p;
  } catch {
    return null;
  }
}
