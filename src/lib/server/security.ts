import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/* ตอบ error แบบเดียวกันทุก API                                        */
/* ------------------------------------------------------------------ */

export function apiError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** แปลง error ของฐานข้อมูลให้เป็นข้อความที่เข้าใจง่าย (ไม่เปิดเผยรายละเอียดภายใน) */
export function friendlyDbError(err: unknown): string {
  const msg = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : '';
  if (/relation .* does not exist|schema cache|Could not find the table|column .* does not exist|Could not find the .* column/i.test(msg)) {
    return 'ระบบฐานข้อมูลยังไม่ได้อัปเดต กรุณาให้ผู้ดูแลรันไฟล์ supabase/migrations/004_learning_platform.sql';
  }
  return 'เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง';
}

/* ------------------------------------------------------------------ */
/* กัน CSRF: คำขอที่เปลี่ยนข้อมูลต้องมาจากหน้าเว็บของเราเอง             */
/* ------------------------------------------------------------------ */

export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return req.method === 'GET' || req.method === 'HEAD';
  try {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* จำกัดความถี่ (ในหน่วยความจำ; กันการยิงรัวเบื้องต้น)                    */
/* ------------------------------------------------------------------ */

const buckets = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 5000) {
    Array.from(buckets.entries()).forEach(([k, v]) => {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    });
  }
  return true;
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/* ------------------------------------------------------------------ */
/* รหัสนักเรียน / PIN                                                  */
/* ------------------------------------------------------------------ */

// ตัดตัวที่สับสน (0 O 1 I L) ออก เด็กอ่านผิดน้อยลง
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function randomCode(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function randomPin(): string {
  return String(crypto.randomInt(0, 10000)).padStart(4, '0');
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pin, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const candidate = crypto.scryptSync(pin, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

/** อีเมลภายในของนักเรียน (ไม่ใช่อีเมลจริง ไม่มีใครส่งเมลถึง) */
export function studentEmail(code: string): string {
  return `s-${code.toLowerCase()}@kid.learn5g.local`;
}

/* ------------------------------------------------------------------ */
/* โทเคนการเล่น (เกมใช้รายงานผลกลับมา)                                  */
/* ------------------------------------------------------------------ */

export interface PlayTokenPayload {
  s: string; // student id
  m: string; // media id
  p: string; // play session id
  e: number; // expires (unix seconds)
}

function tokenSecret(): Buffer {
  const base = process.env.PLAY_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base) throw new Error('Missing PLAY_TOKEN_SECRET');
  return crypto.createHash('sha256').update(`l5g-play-token:${base}`).digest();
}

const b64u = (b: Buffer) => b.toString('base64url');

export function signPlayToken(payload: Omit<PlayTokenPayload, 'e'>, ttlSec = 4 * 3600): string {
  const body = b64u(Buffer.from(JSON.stringify({ ...payload, e: Math.floor(Date.now() / 1000) + ttlSec })));
  const sig = b64u(crypto.createHmac('sha256', tokenSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyPlayToken(token: string): PlayTokenPayload | null {
  try {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = crypto.createHmac('sha256', tokenSecret()).update(body).digest();
    const given = Buffer.from(sig, 'base64url');
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as PlayTokenPayload;
    if (!payload.s || !payload.m || !payload.p || payload.e < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}
