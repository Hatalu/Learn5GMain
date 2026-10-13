/**
 * ชุดทดสอบตรรกะสำคัญ (ไม่ต้องใช้ฐานข้อมูล)  รัน: npm run selftest
 */
import assert from 'node:assert/strict';
import {
  bangkokDate,
  buddyStage,
  daysBetween,
  isoWeekKey,
  liveStreak,
  missionsForDay,
  newlyEarnedBadges,
  starsFromAccuracy,
  unlockedHats,
  updateStreak,
} from '../src/lib/gamify';
import {
  hashPin,
  normalizeCode,
  randomCode,
  randomPin,
  rateLimit,
  signPlayToken,
  verifyPin,
  verifyPlayToken,
} from '../src/lib/server/security';
import { registerSchema, resultSchema, patchStudentSchema } from '../src/lib/validations/platform';

process.env.PLAY_TOKEN_SECRET = 'test-secret-for-selftest';
let passed = 0;
const t = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};

console.log('gamify');
t('daysBetween / isoWeekKey', () => {
  assert.equal(daysBetween('2026-10-11', '2026-10-13'), 2);
  assert.equal(isoWeekKey('2026-10-13'), '2026-W42');
  assert.equal(bangkokDate(new Date('2026-10-12T18:30:00Z')), '2026-10-13'); // 01:30 เวลาไทย
});

t('streak: ต่อเนื่อง / ซ้ำวันเดิม / วันพักฟรี / ขาดนาน', () => {
  const base = { streak: 3, best: 3, lastDate: '2026-10-12', lastFreezeWeek: null };
  assert.equal(updateStreak(base, '2026-10-13').streak, 4); // วันถัดไป
  assert.equal(updateStreak(base, '2026-10-12').streak, 3); // วันเดียวกัน ไม่เพิ่ม
  const freeze = updateStreak({ ...base, lastDate: '2026-10-11' }, '2026-10-13'); // ขาด 1 วัน
  assert.equal(freeze.streak, 4);
  assert.equal(freeze.lastFreezeWeek, '2026-W42');
  const second = updateStreak({ ...freeze, lastDate: '2026-10-13' }, '2026-10-15'); // ขาดอีกในสัปดาห์เดียวกัน
  assert.equal(second.streak, 1);
  assert.equal(updateStreak(base, '2026-10-20').streak, 1); // ขาดนาน
  assert.equal(updateStreak({ streak: 0, best: 0, lastDate: null, lastFreezeWeek: null }, '2026-10-13').streak, 1);
  assert.equal(updateStreak({ ...base, best: 9 }, '2026-10-20').best, 9); // best ไม่ลด
});

t('liveStreak แสดงผลถูกเมื่อยังไม่ได้เล่นวันนี้', () => {
  const s = { streak: 5, best: 5, lastDate: '2026-10-12', lastFreezeWeek: null };
  assert.equal(liveStreak(s, '2026-10-13'), 5);
  assert.equal(liveStreak(s, '2026-10-14'), 5); // ใช้วันพักฟรีได้
  assert.equal(liveStreak(s, '2026-10-17'), 0);
});

t('ดาวจากความแม่นยำ + ตัวละคร + หมวก', () => {
  assert.equal(starsFromAccuracy(9, 10), 3);
  assert.equal(starsFromAccuracy(7, 10), 2);
  assert.equal(starsFromAccuracy(4, 10), 1);
  assert.equal(starsFromAccuracy(1, 10), 0);
  assert.equal(starsFromAccuracy(0, 0), 0);
  assert.equal(buddyStage(0).index, 0);
  assert.equal(buddyStage(12).index, 1);
  assert.equal(buddyStage(90).next, null);
  assert.deepEqual(unlockedHats(0, 0), ['none']);
  assert.ok(unlockedHats(60, 3).includes('crown'));
  assert.ok(unlockedHats(0, 3).includes('cape'));
});

t('ภารกิจรายวันคงที่ในวันเดียวกัน และไม่ซ้ำกัน', () => {
  const a = missionsForDay('2026-10-13').map((m) => m.key);
  const b = missionsForDay('2026-10-13').map((m) => m.key);
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, 3);
});

t('ตรา: ได้ครั้งเดียว ไม่ได้ซ้ำ', () => {
  const ctx = { starsTotal: 12, playsTotal: 4, bestStreak: 1, distinctMedia: 3, distinctSubjects: 1, hasPerfect: true };
  const first = newlyEarnedBadges(ctx, new Set()).map((b) => b.key);
  assert.ok(first.includes('first_play') && first.includes('stars_10') && first.includes('perfect') && first.includes('explorer_3'));
  assert.equal(newlyEarnedBadges(ctx, new Set(first)).length, 0);
});

console.log('security');
t('PIN: hash ไม่ซ้ำ, ตรวจถูก/ผิด, รูปแบบเสียหายไม่ crash', () => {
  const h1 = hashPin('1234');
  const h2 = hashPin('1234');
  assert.notEqual(h1, h2); // salt ต่างกัน
  assert.ok(verifyPin('1234', h1));
  assert.ok(!verifyPin('1235', h1));
  assert.ok(!verifyPin('1234', 'garbage'));
  assert.ok(!verifyPin('1234', 'scrypt$aa$bb'));
});

t('รหัสนักเรียน/PIN สุ่ม รูปแบบถูก ไม่มีตัวอักษรสับสน', () => {
  for (let i = 0; i < 200; i++) {
    assert.match(randomCode(6), /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    assert.match(randomPin(), /^\d{4}$/);
  }
  assert.equal(normalizeCode(' ab-c 123 '), 'ABC123');
});

t('โทเคนการเล่น: ถูกต้อง / ปลอม / แก้ไข / หมดอายุ', () => {
  const tok = signPlayToken({ s: 'stu', m: 'med', p: 'ses' });
  const ok = verifyPlayToken(tok);
  assert.ok(ok && ok.s === 'stu' && ok.m === 'med' && ok.p === 'ses');

  const [body, sig] = tok.split('.');
  const forged = Buffer.from(JSON.stringify({ s: 'other', m: 'med', p: 'ses', e: 9999999999 })).toString('base64url');
  assert.equal(verifyPlayToken(`${forged}.${sig}`), null); // เปลี่ยน payload ไม่ผ่าน
  assert.equal(verifyPlayToken(`${body}.${sig.slice(0, -2)}xx`), null); // ลายเซ็นผิด
  assert.equal(verifyPlayToken('abc'), null);
  assert.equal(verifyPlayToken(signPlayToken({ s: 'a', m: 'b', p: 'c' }, -10)), null); // หมดอายุ
});

t('rate limit', () => {
  const key = `selftest:${Math.random()}`;
  assert.ok(rateLimit(key, 3, 1000));
  assert.ok(rateLimit(key, 3, 1000));
  assert.ok(rateLimit(key, 3, 1000));
  assert.ok(!rateLimit(key, 3, 1000));
});

console.log('validation');
t('สมัครเอง: ห้ามสมัครเป็น dev/student และต้องยอมรับข้อตกลง', () => {
  const base = { email: 'A@B.com', password: 'longenough1', displayName: 'ครูใจดี', acceptTerms: true };
  assert.ok(registerSchema.safeParse({ ...base, role: 'teacher' }).success);
  assert.ok(registerSchema.safeParse({ ...base, role: 'parent' }).success);
  assert.ok(!registerSchema.safeParse({ ...base, role: 'dev' }).success);
  assert.ok(!registerSchema.safeParse({ ...base, role: 'student' }).success);
  assert.ok(!registerSchema.safeParse({ ...base, role: 'teacher', acceptTerms: false }).success);
  assert.ok(!registerSchema.safeParse({ ...base, role: 'teacher', password: 'short' }).success);
  assert.equal(registerSchema.parse({ ...base, role: 'teacher' }).email, 'a@b.com');
  assert.ok(!registerSchema.safeParse({ ...base, role: 'teacher', displayName: '<script>' }).success);
});

t('ผลจากเกม: ตรวจช่วงค่า', () => {
  const tok = 'x'.repeat(30);
  assert.ok(resultSchema.safeParse({ token: tok, correct: 5, total: 6, stars: 3 }).success);
  assert.ok(!resultSchema.safeParse({ token: tok, stars: 9 }).success);
  assert.ok(!resultSchema.safeParse({ token: tok, score: -1 }).success);
  assert.ok(!resultSchema.safeParse({ token: tok, durationSec: 999999 }).success);
});

t('แก้ข้อมูลนักเรียน: เฉพาะ action ที่กำหนด', () => {
  assert.ok(patchStudentSchema.safeParse({ action: 'reset_pin' }).success);
  assert.ok(patchStudentSchema.safeParse({ action: 'set_limit', minutes: 30 }).success);
  assert.ok(patchStudentSchema.safeParse({ action: 'set_limit', minutes: null }).success);
  assert.ok(!patchStudentSchema.safeParse({ action: 'set_limit', minutes: 1 }).success);
  assert.ok(!patchStudentSchema.safeParse({ action: 'set_role', role: 'dev' }).success);
});

console.log(`\n${passed} tests passed`);
