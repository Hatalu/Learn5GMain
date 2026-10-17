/**
 * ทดสอบตรรกะของคู่หู/สติกเกอร์/เกมประจำวัน/ฤดูกาล (ไม่ต้องใช้ฐานข้อมูลหรือเบราว์เซอร์)
 * รัน: npm run selftest
 */
import assert from 'node:assert/strict';
import { FREE_SET_LIMIT, FREE_UPLOAD_MB, MEMBER_UPLOAD_MB, creatorTier, fmtMB, quotaBytes, setsUsed } from '../src/lib/game-creator/quota';
import { normalizeGmail, signupSchema } from '../src/lib/validations/signup';
import {
  autoPickDaily,
  bkkParts,
  buddyStage,
  buildGreeting,
  eventOf,
  msUntilMidnight,
  phaseOf,
  seasonOf,
  shiftDate,
  stickerTier,
  unlockedHats,
} from '../src/lib/companion';
import {
  EMPTY_STATE,
  _setStateForTest,
  getSnapshot,
  isEnabled,
  mergeStates,
  recordPlay,
  recordVisit,
  sanitize,
  setColor,
  setHat,
} from '../src/lib/companion-store';
import { hasMembership } from '../src/lib/membership';
import { crc16, promptPayKind, promptPayPayload, maskPromptPay } from '../src/lib/promptpay';
import { extendUntil, maskedMatch, nameMatch, receiverMatches } from '../src/lib/server/payments';
import { NO_OFFER, PLANS, comparePrice, perDay, quote, saveBaht, welcomePrice } from '../src/lib/plans';
import { checkUnsubscribeToken, unsubscribeToken, winbackEmail } from '../src/lib/server/email';
import { MEMBER_PLAY_SECONDS, TRIAL_GRACE_SECONDS, TRIAL_SECONDS, signTrialToken, trialPublicJwk, verifyTrialToken } from '../src/lib/server/trial';
import { cleanModeSettings, modeFit, modeQuiz, scoreCap } from '../src/lib/game-creator/modes';
import { endlessIndex } from '../src/lib/game-creator/quiz';
import {
  checkAnswer,
  isTimeout,
  playableQuiz,
  publicQuestion,
  questionOrder,
  quizIssues,
  sanitizeQuiz,
  scoreFor,
  texToPlain,
  richToPlain,
} from '../src/lib/game-creator/quiz';
import { cleanBackground } from '../src/lib/game-creator/backgrounds';
import { cleanNickname, isRoomCode } from '../src/lib/game-creator/templates';
import { GEAR_SLOTS, cleanGear, gearCount, randomGear, sameGear } from '../src/lib/game-creator/gear';
import { MODE_MUSIC, TRACKS, cleanMusicSetting, roomTrack } from '../src/lib/music-tracks';
import { MODES } from '../src/lib/game-creator/modes';

let passed = 0;
const t = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};
const fresh = () => _setStateForTest({ ...EMPTY_STATE, createdAt: 1, plays: {}, visitDays: [] }, true);
const M = (id: string) => ({ id, title: `เกม ${id}`, icon_url: 'x.png', subject: 'คณิตศาสตร์' });
const MIN = 60 * 1000;

console.log('เวลา/ฤดู/วันสำคัญ');
t('เวลาไทย + ช่วงของวัน + ฤดู', () => {
  const p = bkkParts(new Date('2026-10-12T18:30:00Z')); // 01:30 เวลาไทย วันอังคาร
  assert.equal(p.date, '2026-10-13');
  assert.equal(p.hour, 1);
  assert.equal(p.weekday, 2);
  assert.equal(phaseOf(5), 'dawn');
  assert.equal(phaseOf(12), 'day');
  assert.equal(phaseOf(18), 'dusk');
  assert.equal(phaseOf(23), 'night');
  assert.equal(phaseOf(3), 'night');
  assert.equal(seasonOf(4), 'hot');
  assert.equal(seasonOf(8), 'rainy');
  assert.equal(seasonOf(12), 'cool');
  assert.equal(seasonOf(2), 'cool');
});

t('เวลาที่เหลือถึงเที่ยงคืน', () => {
  assert.equal(msUntilMidnight(bkkParts(new Date('2026-10-13T16:59:59Z'))), 1000); // 23:59:59 ไทย
  assert.equal(msUntilMidnight(bkkParts(new Date('2026-10-12T17:00:00Z'))), 24 * 3600 * 1000);
});

t('วันสำคัญ: สงกรานต์ ปีใหม่ วันครู วันเด็ก ลอยกระทง และวันธรรมดา', () => {
  const ev = (iso: string) => eventOf(bkkParts(new Date(iso)))?.key ?? null;
  assert.equal(ev('2026-04-14T05:00:00Z'), 'songkran');
  assert.equal(ev('2026-12-31T05:00:00Z'), 'newyear');
  assert.equal(ev('2027-01-01T05:00:00Z'), 'newyear');
  assert.equal(ev('2027-01-16T05:00:00Z'), 'teacher');
  assert.equal(ev('2026-01-10T05:00:00Z'), 'children'); // เสาร์ที่ 2 ของ ม.ค. 2026
  assert.equal(ev('2026-01-03T05:00:00Z'), null); // เสาร์แรก ไม่ใช่วันเด็ก
  assert.equal(ev('2027-01-09T05:00:00Z'), 'children');
  assert.equal(ev('2026-11-24T05:00:00Z'), 'krathong');
  assert.equal(ev('2026-08-12T05:00:00Z'), 'mother');
  assert.equal(ev('2026-12-05T05:00:00Z'), 'father');
  assert.equal(ev('2026-10-13T05:00:00Z'), null);
});

console.log('เกมประจำวัน');
t('เลือกอัตโนมัติ: คงที่ในวันเดียวกัน ไม่ซ้ำเมื่อวาน ว่างคืน null', () => {
  for (const n of [2, 3, 4, 5, 7]) {
    const set = Array.from({ length: n }, (_, i) => ({ id: `m${i}` }));
    let dd = '2026-02-27';
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const a = autoPickDaily(set, dd)!;
      const y = autoPickDaily(set, shiftDate(dd, -1))!;
      assert.notEqual(a.id, y.id, `n=${n} ซ้ำเมื่อวานที่ ${dd}`);
      if (i < n) seen.add(a.id);
      dd = shiftDate(dd, 1);
    }
    assert.ok(seen.size >= Math.min(n, 2));
  }
  const items = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
  assert.equal(autoPickDaily([], '2026-10-13'), null);
  assert.equal(autoPickDaily(items, '2026-10-13')?.id, autoPickDaily([...items].reverse(), '2026-10-13')?.id); // ไม่ขึ้นกับลำดับ
  let d = '2026-10-01';
  for (let i = 0; i < 400; i++) {
    const today = autoPickDaily(items, d)!;
    const yest = autoPickDaily(items, shiftDate(d, -1))!;
    assert.notEqual(today.id, yest.id, `ซ้ำกับเมื่อวานที่ ${d}`);
    d = shiftDate(d, 1);
  }
  assert.equal(autoPickDaily([{ id: 'only' }], '2026-10-13')?.id, 'only');
  assert.equal(shiftDate('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftDate('2026-03-01', -1), '2026-02-28');
});

console.log('ตัวละคร/สติกเกอร์');
t('ขั้นตัวละคร หมวก ระดับสติกเกอร์', () => {
  assert.equal(buddyStage(0).index, 0);
  assert.equal(buddyStage(11).index, 0);
  assert.equal(buddyStage(12).index, 1);
  assert.equal(buddyStage(90).next, null);
  assert.deepEqual(unlockedHats(0, 0), ['none']);
  assert.ok(unlockedHats(12, 0).includes('cap'));
  assert.ok(unlockedHats(0, 3).includes('cape'));
  assert.ok(unlockedHats(60, 0).includes('crown'));
  assert.equal(stickerTier(0), 0);
  assert.equal(stickerTier(1), 1);
  assert.equal(stickerTier(3), 2);
  assert.equal(stickerTier(5), 3);
});

t('เล่นครั้งแรกได้สติกเกอร์ +2 ดาว, เล่นรัวภายใน 10 นาทีไม่นับ', () => {
  fresh();
  const t0 = Date.parse('2026-10-13T05:00:00Z');
  const r1 = recordPlay(M('g1'), { now: t0 });
  assert.equal(r1.counted, true);
  assert.equal(r1.starsGained, 2);
  assert.ok(r1.newSticker);
  const r2 = recordPlay(M('g1'), { now: t0 + 3 * MIN });
  assert.equal(r2.counted, false);
  assert.equal(r2.starsGained, 0);
  assert.equal(getSnapshot().stars, 2);
  assert.equal(getSnapshot().plays.g1.c, 1);
});

t('เล่นซ้ำ +1, ครั้งที่ 3 ได้ระดับเงิน (+1+2), ครั้งที่ 5 ระดับทอง', () => {
  fresh();
  let now = Date.parse('2026-10-13T05:00:00Z');
  const step = () => {
    now += 11 * MIN;
    return recordPlay(M('g1'), { now });
  };
  recordPlay(M('g1'), { now }); // 1
  const r2 = step();
  assert.equal(r2.starsGained, 1);
  assert.equal(r2.tierUp, undefined);
  const r3 = step();
  assert.equal(r3.tierUp?.tier, 2);
  assert.equal(r3.starsGained, 3);
  step(); // 4
  const r5 = step();
  assert.equal(r5.tierUp?.tier, 3);
  assert.equal(getSnapshot().plays.g1.c, 5);
});

t('โบนัสเกมประจำวันได้ครั้งเดียวต่อวัน', () => {
  fresh();
  const now = Date.parse('2026-10-13T05:00:00Z');
  const a = recordPlay(M('d1'), { dailyId: 'd1', now });
  assert.equal(a.dailyBonus, true);
  assert.equal(a.starsGained, 2 + 3);
  const b = recordPlay(M('d1'), { dailyId: 'd1', now: now + 20 * MIN });
  assert.equal(b.dailyBonus, undefined);
  const c = recordPlay(M('d2'), { dailyId: 'd1', now: now + 40 * MIN });
  assert.equal(c.dailyBonus, undefined); // เล่นเกมอื่น ไม่ใช่เกมประจำวัน
  // ข้ามวัน ได้โบนัสอีกครั้ง
  const d = recordPlay(M('d1'), { dailyId: 'd1', now: now + 26 * 3600 * 1000 });
  assert.equal(d.dailyBonus, true);
});

t('ตัวละครโตเมื่อครบ 12 ดาว และแจ้ง evolved', () => {
  fresh();
  let now = Date.parse('2026-10-13T05:00:00Z');
  let evolved: string | undefined;
  for (let i = 0; i < 6 && !evolved; i++) {
    now += 11 * MIN;
    evolved = recordPlay(M(`g${i}`), { now }).evolved?.name; // เกมใหม่ทุกครั้ง +2 ดาว
  }
  assert.equal(evolved, 'ลูกน้อยจอมซน');
  assert.ok(getSnapshot().stars >= 12);
});

t('เช็คอินรายวัน +1 ครั้งเดียวต่อวัน และสวมหมวกที่ยังล็อกไม่ได้', () => {
  fresh();
  const a = recordVisit('2026-10-13');
  assert.equal(a.checkinStars, 1);
  assert.equal(a.firstEver, true);
  assert.equal(recordVisit('2026-10-13').checkinStars, 0);
  assert.equal(recordVisit('2026-10-14').checkinStars, 1);
  assert.equal(getSnapshot().stars, 2);
  assert.equal(setHat('crown'), false); // ยังไม่ถึง 60 ดาว
  assert.equal(setHat('none'), true);
  assert.equal(setHat('ไม่มีอยู่จริง'), false);
  recordVisit('2026-10-15'); // ครบ 3 วัน ปลดล็อกผ้าคลุม
  assert.equal(setHat('cape'), true);
  assert.equal(getSnapshot().hat, 'cape');
});

console.log('คำทักทาย');
t('คำทักทายสั้น (ไม่เกิน 2 บรรทัด) และตรงสถานการณ์', () => {
  const base = {
    parts: bkkParts(new Date('2026-10-13T03:00:00Z')), // 10:00 วันอังคาร
    phase: 'day' as const,
    event: null,
    firstVisit: false,
    visitDays: 3,
    lastPlayed: null,
    dailyTitle: null,
    dailyPlayedToday: false,
    checkinStars: 0,
    stage: 1,
  };
  const first = buildGreeting({ ...base, firstVisit: true });
  assert.match(first[0], /ปุ๋ง/);
  const g = buildGreeting({ ...base, dailyTitle: 'เกม A' });
  assert.ok(g.length <= 2 && g[0].includes('สวัสดีตอนเช้า') && g[0].includes('อังคาร') && g[1].includes('เกม A'));
  const y = buildGreeting({ ...base, lastPlayed: { title: 'เกม B', day: '2026-10-12' } });
  assert.match(y[1], /เมื่อวาน/);
  const ci = buildGreeting({ ...base, checkinStars: 1, dailyTitle: 'เกม A' });
  assert.match(ci[1], /\+1/);
  const night = buildGreeting({ ...base, parts: bkkParts(new Date('2026-10-13T15:30:00Z')), phase: 'night' }); // 22:30
  assert.match(night[1], /พัก/);
  const ev = buildGreeting({ ...base, event: eventOf(bkkParts(new Date('2026-04-14T05:00:00Z'))) });
  assert.match(ev[0], /สงกรานต์/);
  for (const l of [...first, ...g, ...y, ...ci, ...night, ...ev]) assert.ok(l.length <= 60, `ข้อความยาวเกิน: ${l}`);
});

console.log('โหมดล็อก (ไม่มีสิทธิ์ Premium) และการรวมข้อมูลหลายเครื่อง');
t('โหมดล็อก: ไม่ให้ดาว/สติกเกอร์/เช็คอิน/แต่งตัว และไม่แก้สถานะ', () => {
  _setStateForTest({ ...EMPTY_STATE, createdAt: 1 }, false);
  const r = recordPlay(M('g1'), { now: Date.parse('2026-10-13T05:00:00Z') });
  assert.equal(r.counted, false);
  assert.equal(r.starsGained, 0);
  assert.equal(recordVisit('2026-10-13').checkinStars, 0);
  assert.equal(setHat('cap'), false);
  setColor('pink');
  assert.equal(getSnapshot().stars, 0);
  assert.deepEqual(getSnapshot().plays, {});
  assert.equal(getSnapshot().color, 'violet');
  assert.equal(isEnabled(), false);
  _setStateForTest({ ...EMPTY_STATE, createdAt: 1 }, true);
  assert.equal(isEnabled(), true);
});

t('รวมข้อมูลสองเครื่อง: ไม่ทำให้ความก้าวหน้าหาย', () => {
  const play = (c: number, last: number) => ({ c, last, title: 't', icon: 'i', subject: 's' });
  const a = {
    ...EMPTY_STATE,
    createdAt: 100,
    savedAt: 1000,
    stars: 10,
    visitDays: ['2026-10-10', '2026-10-11'],
    plays: { g1: play(3, 500), g2: play(1, 300) },
    color: 'pink',
    hat: 'cap',
    dailyClaimed: '2026-10-11',
    lastPlayed: { id: 'g1', title: 't', at: 500, day: '2026-10-11' },
  };
  const b = {
    ...EMPTY_STATE,
    createdAt: 50,
    savedAt: 2000,
    stars: 14,
    visitDays: ['2026-10-11', '2026-10-12'],
    plays: { g1: play(2, 900), g3: play(4, 100) },
    color: 'sky',
    hat: 'none',
    dailyClaimed: '2026-10-12',
    lastPlayed: { id: 'g1', title: 't', at: 900, day: '2026-10-12' },
  };
  const m = mergeStates(a, b);
  assert.equal(m.stars, 14);
  assert.deepEqual(m.visitDays, ['2026-10-10', '2026-10-11', '2026-10-12']);
  assert.equal(m.plays.g1.c, 3); // มากกว่า
  assert.equal(m.plays.g1.last, 900); // ล่าสุด
  assert.equal(m.plays.g2.c, 1);
  assert.equal(m.plays.g3.c, 4);
  assert.equal(m.color, 'sky'); // ฝั่งที่แก้ล่าสุด
  assert.equal(m.hat, 'none');
  assert.equal(m.createdAt, 50);
  assert.equal(m.savedAt, 2000);
  assert.equal(m.dailyClaimed, '2026-10-12');
  assert.equal(m.lastPlayed?.at, 900);
  // สลับลำดับอาร์กิวเมนต์ ผลต้องเท่ากัน
  assert.deepEqual(mergeStates(b, a), m);
  // รวมกับข้อมูลว่าง = เท่าเดิม
  assert.equal(mergeStates(a, { ...EMPTY_STATE }).stars, 10);
});

t('sanitize: ตัดข้อมูลผิดรูป/เกินช่วง/ค่าแปลกปลอมออก', () => {
  const s = sanitize({
    stars: -5,
    color: 'hotpink',
    hat: 'rocket',
    visitDays: ['2026-10-12', 'x', 7],
    plays: { ok: { c: 2, last: 1, title: 'a', icon: 'b', subject: 'c' }, bad: { c: -1 }, huge: { c: 99999999 } },
    lastPlayed: { id: 5 },
    dailyClaimed: 12,
  });
  assert.equal(s.stars, 0);
  assert.equal(s.color, 'violet');
  assert.equal(s.hat, 'none');
  assert.deepEqual(s.visitDays, ['2026-10-12']);
  assert.deepEqual(Object.keys(s.plays), ['ok']);
  assert.equal(s.lastPlayed, null);
  assert.equal(s.dailyClaimed, null);
  assert.equal(sanitize(null).stars, 0);
  assert.equal(sanitize('ขยะ').createdAt, 0);
});

t('คำทักทายโหมดล็อก: ชวนสมัครสมาชิก และยังสั้น', () => {
  const g = buildGreeting({
    parts: bkkParts(new Date('2026-10-13T03:00:00Z')),
    phase: 'day',
    event: null,
    firstVisit: false,
    visitDays: 0,
    lastPlayed: null,
    dailyTitle: null,
    dailyPlayedToday: false,
    checkinStars: 0,
    stage: 0,
    locked: true,
  });
  assert.equal(g.length, 2);
  assert.match(g[1], /สมัครสมาชิก/);
  for (const l of g) assert.ok(l.length <= 60);
});

console.log('\nสมาชิก');
t('hasMembership: ผู้เยี่ยมชม/สมาชิกหมดอายุ/สมาชิกปกติ/dev', () => {
  const day = 24 * 60 * 60 * 1000;
  const future = new Date(Date.now() + 30 * day).toISOString();
  const past = new Date(Date.now() - day).toISOString();
  assert.equal(hasMembership(null), false);
  assert.equal(hasMembership(undefined), false);
  assert.equal(hasMembership({ role: 'member', premium_until: null }), false);
  assert.equal(hasMembership({ role: 'member', premium_until: '-' as unknown as string }), false);
  assert.equal(hasMembership({ role: 'member', premium_until: 'ขยะ' }), false);
  assert.equal(hasMembership({ role: 'member', premium_until: past }), false);
  assert.equal(hasMembership({ role: 'member', premium_until: future }), true);
  assert.equal(hasMembership({ role: 'dev', premium_until: null }), true);
});

console.log('\nทดลองเล่น');
process.env.TRIAL_SIGNING_SEED = process.env.TRIAL_SIGNING_SEED || 'selftest-seed';
t('โทเคนทดลองเล่น: เซ็นแล้วตรวจผ่าน และหมดอายุตามเวลา', () => {
  const now = 1_800_000_000_000;
  const { token, exp } = signTrialToken(now);
  assert.equal(exp, Math.floor(now / 1000) + TRIAL_SECONDS + TRIAL_GRACE_SECONDS);
  assert.ok(verifyTrialToken(token, now + 1000));
  assert.ok(verifyTrialToken(token, now + (TRIAL_SECONDS + TRIAL_GRACE_SECONDS - 1) * 1000));
  assert.equal(verifyTrialToken(token, now + (TRIAL_SECONDS + TRIAL_GRACE_SECONDS + 1) * 1000), null);
});

t('โทเคนทดลองเล่น: แก้ข้อมูล/ลายเซ็น/รูปแบบผิด ใช้ไม่ได้', () => {
  const now = 1_800_000_000_000;
  const { token } = signTrialToken(now);
  const [body, sig] = token.split('.');
  // ยืดเวลาหมดอายุเอง
  const forged = Buffer.from(JSON.stringify({ v: 1, exp: Math.floor(now / 1000) + 99999, n: 'aaaa' })).toString('base64url');
  assert.equal(verifyTrialToken(forged + '.' + sig, now), null);
  // ลายเซ็นเพี้ยน
  const bad = sig.slice(0, -2) + (sig.endsWith('AA') ? 'BB' : 'AA');
  assert.equal(verifyTrialToken(body + '.' + bad, now), null);
  for (const junk of ['', 'abc', 'a.b', '.', body + '.', '.' + sig]) assert.equal(verifyTrialToken(junk, now), null);
  // โทเคนต่างกันทุกครั้ง
  assert.notEqual(signTrialToken(now).token, signTrialToken(now).token);
});

t('โทเคนสมาชิกเล่นเต็ม: มีธง m=1 อายุ 4 ชั่วโมง ส่วนโทเคนทดลองไม่มีธงนี้ และแก้ธงไม่ได้', () => {
  const now = 1_800_000_000_000;
  const m = signTrialToken(now, { member: true });
  assert.equal(m.exp, Math.floor(now / 1000) + MEMBER_PLAY_SECONDS);
  assert.equal(MEMBER_PLAY_SECONDS, 4 * 3600);
  const p = verifyTrialToken(m.token, now + 1000);
  assert.ok(p);
  assert.equal(p!.m, 1);
  assert.ok(verifyTrialToken(m.token, now + (MEMBER_PLAY_SECONDS - 5) * 1000));
  assert.equal(verifyTrialToken(m.token, now + (MEMBER_PLAY_SECONDS + 5) * 1000), null);
  // โทเคนทดลองธรรมดาไม่มีธงสมาชิก
  assert.equal(verifyTrialToken(signTrialToken(now).token, now + 1000)!.m, undefined);
  // เอาลายเซ็นของโทเคนทดลองไปแปะกับข้อมูลสมาชิก (ปลอมสิทธิ์สมาชิก) ต้องไม่ผ่าน
  const trial = signTrialToken(now);
  const forged = Buffer.from(JSON.stringify({ v: 1, exp: Math.floor(now / 1000) + 3000, n: 'aaaa', m: 1 })).toString('base64url');
  assert.equal(verifyTrialToken(forged + '.' + trial.token.split('.')[1], now), null);
});

t('กุญแจสาธารณะเป็น EC P-256 และไม่เปิดเผยกุญแจส่วนตัว', () => {
  const k = trialPublicJwk() as Record<string, unknown>;
  assert.equal(k.kty, 'EC');
  assert.equal(k.crv, 'P-256');
  assert.equal(k.d, undefined);
});

console.log('\nชำระเงิน');
t('CRC16-CCITT ตามมาตรฐาน', () => {
  assert.equal(crc16('123456789'), '29B1');
});

t('QR พร้อมเพย์: เบอร์มือถือ/เลขบัตร ระบุยอด และ CRC ถูก', () => {
  const q = promptPayPayload('081-234-5678', 59);
  assert.ok(q.startsWith('000201010212'));
  assert.ok(q.includes('0016A000000677010111' + '01130066812345678'));
  assert.ok(q.includes('5303764'));
  assert.ok(q.includes('540559.00'));
  assert.ok(q.includes('5802TH'));
  assert.equal(q.slice(-4), crc16(q.slice(0, -4)));
  const id = promptPayPayload('1234567890123', 99);
  assert.ok(id.includes('02131234567890123'));
  assert.ok(id.includes('540599.00'));
  assert.equal(promptPayKind('0812345678'), 'phone');
  assert.equal(promptPayKind('12345'), null);
  assert.throws(() => promptPayPayload('123', 39));
  assert.throws(() => promptPayPayload('0812345678', 0));
  assert.equal(maskPromptPay('0812345678'), '081-xxx-5678');
});

t('เทียบเลขบัญชีที่ถูกปิดบางส่วน', () => {
  assert.equal(maskedMatch('xxx-x-x5678-x', '123-4-55678-9'), true);
  assert.equal(maskedMatch('xxx-x-x5679-x', '123-4-55678-9'), false);
  assert.equal(maskedMatch('xxx-x-x5678-9', '123-4-55678-9'), true);
  assert.equal(maskedMatch('xxx-xxx-5678', '0812345678'), true);
  assert.equal(maskedMatch('xxx-xxx-5679', '0812345678'), false);
  assert.equal(maskedMatch('xxx-xxx-xx78', '0812345678'), null); // เห็นเลขน้อยเกิน
  assert.equal(maskedMatch(undefined, '0812345678'), null);
});

t('เทียบชื่อผู้รับ (ชื่อในสลิปมักถูกตัด)', () => {
  assert.equal(nameMatch('นาย สมชาย ใ', 'นาย สมชาย ใจดี'), true);
  assert.equal(nameMatch('MR. SOMCHAI J', 'Somchai Jaidee'), true);
  assert.equal(nameMatch('นาง สมศรี', 'นาย สมชาย ใจดี'), false);
  assert.equal(nameMatch('นาย', 'นาย สมชาย'), false);
});

t('ผู้รับต้องตรงเลขบัญชี/พร้อมเพย์ที่ตั้งไว้ (ชื่อตรงอย่างเดียวไม่ผ่าน)', () => {
  const cfg = { enabled: true, promptpay_id: '0812345678', account_name: 'นาย สมชาย ใจดี', bank_name: 'กสิกรไทย', bank_account: '1234555678' };
  const r = (bank?: string, proxy?: string, th?: string) => ({ account: { name: { th }, bank: bank ? { account: bank } : undefined, proxy: proxy ? { account: proxy } : undefined } });
  assert.equal(receiverMatches(r('xxx-x-x5567-8'), null, cfg), true);
  assert.equal(receiverMatches(r('xxx-x-x5567-8', 'xxx-xxx-9999'), null, cfg), false); // ข้อมูลขัดกัน
  assert.equal(receiverMatches(r(undefined, 'xxx-xxx-5678'), null, cfg), true);
  assert.equal(receiverMatches(r('xxx-x-x9999-9', undefined, 'นาย สมชาย ใ'), null, cfg), false);
  assert.equal(receiverMatches(r(undefined, undefined, 'นาย สมชาย ใ'), null, cfg), false); // ชื่ออย่างเดียวไม่พอ
  assert.equal(receiverMatches(r(undefined, undefined, 'นาย ประยุทธ'), null, cfg), false);
  assert.equal(receiverMatches(r('xxx-x-x9999-9'), { bankNumber: 'x' }, cfg), true);
});

t('ต่ออายุสมาชิก: ต่อจากวันเดิมถ้ายังไม่หมด', () => {
  const now = Date.UTC(2026, 9, 15);
  const day = 86400000;
  assert.equal(extendUntil(null, 7, now), new Date(now + 7 * day).toISOString());
  assert.equal(extendUntil(new Date(now - day).toISOString(), 7, now), new Date(now + 7 * day).toISOString());
  assert.equal(extendUntil(new Date(now + 3 * day).toISOString(), 30, now), new Date(now + 33 * day).toISOString());
});

t('แพลนและราคา', () => {
  assert.deepEqual(PLANS.map((p) => [p.id, p.days, p.price]), [['day', 1, 19], ['egg', 7, 39], ['kid', 14, 59], ['grown', 30, 99]]);
  assert.equal(perDay(PLANS[3]), 3.3);
  // ราคาเทียบ = ซื้อแพลนรายวันต่อกัน (ราคาที่ขายจริง)
  assert.equal(comparePrice(PLANS[0]), null);
  assert.deepEqual(PLANS.slice(1).map((p) => [comparePrice(p), saveBaht(p)]), [[133, 94], [266, 207], [570, 471]]);
});

t('ส่วนลดบัญชีใหม่ปัดลง + โบนัสต่ออายุ', () => {
  assert.deepEqual(PLANS.map((p) => welcomePrice(p)), [13, 27, 41, 69]);
  const now = Date.now();
  const soon = new Date(now + 3600e3).toISOString();
  const past = new Date(now - 1000).toISOString();
  assert.deepEqual(quote(PLANS[1], NO_OFFER, now), { amount: 39, welcome: false, bonusDays: 0, days: 7 });
  assert.deepEqual(quote(PLANS[1], { welcomeEndsAt: soon, renewEndsAt: null }, now), { amount: 27, welcome: true, bonusDays: 0, days: 7 });
  assert.deepEqual(quote(PLANS[1], { welcomeEndsAt: past, renewEndsAt: null }, now).amount, 39);
  assert.deepEqual(quote(PLANS[3], { welcomeEndsAt: null, renewEndsAt: soon }, now), { amount: 99, welcome: false, bonusDays: 3, days: 33 });
  // แพลนรายวันไม่ได้โบนัสต่ออายุ
  assert.equal(quote(PLANS[0], { welcomeEndsAt: null, renewEndsAt: soon }, now).bonusDays, 0);
});

t('ลิงก์ยกเลิกรับอีเมล + เนื้อหาอีเมล', () => {
  const id = '11111111-2222-3333-4444-555555555555';
  const tok = unsubscribeToken(id);
  assert.ok(checkUnsubscribeToken(id, tok));
  assert.ok(!checkUnsubscribeToken('11111111-2222-3333-4444-555555555556', tok));
  assert.ok(!checkUnsubscribeToken(id, tok.slice(0, -1) + (tok.endsWith('A') ? 'B' : 'A')));
  const m = winbackEmail({ username: '<b>x</b>', sets: 4, bonusDays: 3, bonusUntil: new Date().toISOString(), site: 'https://s', unsubscribe: 'https://s/u' });
  assert.ok(m.subject.includes('4 ชุด'));
  assert.ok(m.html.includes('&lt;b&gt;x&lt;/b&gt;') && !m.html.includes('<b>x</b>'));
  assert.ok(m.html.includes('https://s/u') && m.html.includes('3 วันฟรี'));
});

console.log('\nระบบสร้างเกม (ควิซ)');
const PFX = 'https://abc.supabase.co/storage/v1/object/public/game-media/';
const UID = '11111111-2222-3333-4444-555555555555';
const goodImg = { kind: 'image', url: `${PFX}${UID}/a1.webp`, path: `${UID}/a1.webp`, w: 800, h: 600 };
const Q = (over: Record<string, unknown> = {}) => ({
  id: 'qqqq1',
  text: [{ t: 'x', v: 'ข้อใดเท่ากับ ' }, { t: 'm', v: '\\frac{1}{2}' }],
  media: null,
  choices: [
    { id: 'aaaa1', text: [{ t: 'x', v: '0.5' }], media: null, correct: true },
    { id: 'bbbb1', text: [{ t: 'x', v: '2' }], media: null, correct: false },
  ],
  multi: false,
  time: 20,
  points: 1,
  ...over,
});

t('sanitize: เก็บข้อความ/สูตร ตัดสิ่งแปลกปลอม', () => {
  const c = sanitizeQuiz({ questions: [Q({ text: [{ t: 'x', v: 'ก\u0000ข' }, { t: 'm', v: '\\sqrt{4}' }, { t: 'h', v: '<script>' }], time: 999, points: 7 })] }, PFX);
  assert.equal(c.questions.length, 1);
  assert.deepEqual(c.questions[0].text, [{ t: 'x', v: 'กข' }, { t: 'm', v: '\\sqrt{4}' }]);
  assert.equal(c.questions[0].time, 20); // ค่าที่ไม่อยู่ในตัวเลือก -> ค่าเริ่มต้น
  assert.equal(c.questions[0].points, 1);
});

t('sanitize: รูป/คลิปต้องมาจาก bucket ของเราและโฟลเดอร์ผู้ใช้เท่านั้น', () => {
  const ok = sanitizeQuiz({ questions: [Q({ media: goodImg })] }, PFX).questions[0].media;
  assert.equal(ok?.url, goodImg.url);
  const bad = [
    { ...goodImg, url: 'https://evil.example/x.png' },
    { ...goodImg, url: `${PFX}${UID}/other.webp` }, // url กับ path ไม่ตรงกัน
    { ...goodImg, url: `${PFX}../secret`, path: '../secret' },
    { ...goodImg, kind: 'audio' },
  ];
  bad.forEach((m) => assert.equal(sanitizeQuiz({ questions: [Q({ media: m })] }, PFX).questions[0].media, null));
});

t('คลิปเล่นได้ไม่เกิน 5 วินาที', () => {
  const v = { kind: 'video', url: `${PFX}${UID}/v.webm`, path: `${UID}/v.webm`, start: 3, end: 30 };
  const m = sanitizeQuiz({ questions: [Q({ media: v })] }, PFX).questions[0].media!;
  assert.equal(m.start, 3);
  assert.equal(m.end, 8);
  const m2 = sanitizeQuiz({ questions: [Q({ media: { ...v, start: 1, end: 3.5 } })] }, PFX).questions[0].media!;
  assert.equal(m2.end, 3.5);
});

t('หลายคำตอบถูก -> เปิดโหมดตอบได้หลายข้อเอง / id ซ้ำถูกแก้', () => {
  const c = sanitizeQuiz({ questions: [Q({ choices: [{ id: 'same1', text: 'ก', correct: true }, { id: 'same1', text: 'ข', correct: true }] })] }, PFX);
  assert.equal(c.questions[0].multi, true);
  assert.notEqual(c.questions[0].choices[0].id, c.questions[0].choices[1].id);
});

t('ตรวจคำตอบ: ต้องเลือกครบทุกข้อที่ถูก ไม่เกิน', () => {
  const q = sanitizeQuiz({ questions: [Q({ multi: true, choices: [{ id: 'aaaa1', text: 'ก', correct: true }, { id: 'bbbb1', text: 'ข', correct: true }, { id: 'cccc1', text: 'ค', correct: false }] })] }, PFX).questions[0];
  assert.equal(checkAnswer(q, ['aaaa1', 'bbbb1']), true);
  assert.equal(checkAnswer(q, ['bbbb1', 'aaaa1', 'bbbb1']), true);
  assert.equal(checkAnswer(q, ['aaaa1']), false);
  assert.equal(checkAnswer(q, ['aaaa1', 'bbbb1', 'cccc1']), false);
  assert.equal(checkAnswer(q, ['aaaa1', 'zzzz9']), false);
  assert.equal(checkAnswer(q, []), false);
});

t('คะแนน: ตอบเร็วได้มาก / ไม่คิดคะแนน / x2 / โบนัสติดกัน / หมดเวลา', () => {
  assert.equal(scoreFor({ time: 20, points: 1 }, true, 0, 0), 1000);
  assert.equal(scoreFor({ time: 20, points: 1 }, true, 20000, 0), 500);
  assert.equal(scoreFor({ time: 20, points: 1 }, true, 10000, 0), 750);
  assert.equal(scoreFor({ time: 20, points: 1 }, false, 0, 4), 0);
  assert.equal(scoreFor({ time: 20, points: 0 }, true, 0, 0), 0);
  assert.equal(scoreFor({ time: 20, points: 2 }, true, 0, 0), 2000);
  assert.equal(scoreFor({ time: 0, points: 1 }, true, 999999, 0), 1000);
  assert.equal(scoreFor({ time: 20, points: 1 }, true, 0, 2), 1200);
  assert.equal(scoreFor({ time: 20, points: 1 }, true, 0, 9), 1500);
  const q = sanitizeQuiz({ questions: [Q()] }, PFX).questions[0];
  assert.equal(isTimeout(q, 22000), false); // ยังอยู่ในเวลาเผื่อเน็ต
  assert.equal(isTimeout(q, 23000), true);
  assert.equal(isTimeout({ ...q, time: 0 }, 1e9), false);
});

t('คำถามที่ส่งให้ผู้เล่นไม่มีเฉลย + สลับแบบเดิมทุกครั้ง', () => {
  const q = sanitizeQuiz({ questions: [Q({ choices: 'abcdef'.split('').map((x, i) => ({ id: `${x}${x}${x}${x}1`, text: x, correct: i === 0 })) })] }, PFX).questions[0];
  const a = publicQuestion(q, 0, 1, { shuffleChoices: true, seed: 'p1', elapsedMs: 5 });
  const b = publicQuestion(q, 0, 1, { shuffleChoices: true, seed: 'p1', elapsedMs: 5 });
  assert.deepEqual(a.choices.map((c) => c.id), b.choices.map((c) => c.id));
  assert.equal(JSON.stringify(a).includes('correct'), false);
  assert.deepEqual(questionOrder(5, false, 'x'), [0, 1, 2, 3, 4]);
  assert.deepEqual(questionOrder(8, true, 'seed').slice().sort(), [0, 1, 2, 3, 4, 5, 6, 7]);
});

t('ข้อที่ยังไม่ครบไม่ถูกนำไปเล่น', () => {
  const c = sanitizeQuiz({ questions: [Q(), Q({ id: 'qqqq2', text: [] }), Q({ id: 'qqqq3', choices: [{ id: 'aaaa1', text: 'x', correct: false }, { id: 'bbbb1', text: 'y', correct: false }] })] }, PFX);
  assert.equal(playableQuiz(c).questions.length, 1);
  const iss = quizIssues(c);
  assert.ok(iss.some((i) => i.q === 1) && iss.some((i) => i.q === 2) && !iss.some((i) => i.q === 0));
});

t('ข้อความสั้นสำหรับรายการ: เศษส่วนอ่านออก', () => {
  assert.equal(texToPlain('\\frac{3}{4}+\\frac{1}{4}'), '3/4+1/4');
  assert.equal(richToPlain([{ t: 'x', v: 'ผล ' }, { t: 'm', v: '2\\times3' }]), 'ผล 2×3');
});

t('พื้นหลังห้อง/ชื่อเล่น/เลขห้อง', () => {
  assert.deepEqual(cleanBackground({ kind: 'preset', id: 'space' }, PFX), { kind: 'preset', id: 'space' });
  assert.deepEqual(cleanBackground({ kind: 'color', value: '#ABCDEF' }, PFX), { kind: 'color', value: '#abcdef' });
  assert.equal(cleanBackground({ kind: 'color', value: 'red;background:url(x)' }, PFX).kind, 'preset');
  assert.equal(cleanBackground({ kind: 'image', url: 'https://evil.example/a.png' }, PFX).kind, 'preset');
  assert.equal(cleanBackground({ kind: 'image', url: `${PFX}${UID}/bg.webp` }, PFX).kind, 'image');
  assert.equal(cleanNickname('  น้อง <b>ฟ้า</b>   ใส  '), 'น้อง bฟ้า/b ใส');
  assert.equal(cleanNickname('a'.repeat(40)).length, 16);
  assert.equal(isRoomCode('123456'), true);
  assert.equal(isRoomCode('12345a'), false);
  assert.equal(isRoomCode(123456), false);
});

console.log('\nรูปแบบการเล่น');
const vid = { kind: 'video', url: `${PFX}${UID}/v.mp4`, path: `${UID}/v.mp4`, start: 0, end: 4 };
const QS = (n: number, videoAt: number[] = []) =>
  sanitizeQuiz({ questions: Array.from({ length: n }, (_, i) => Q({ id: `qq${i}aa`, media: videoAt.includes(i) ? vid : null })) }, PFX);

t('ข้อจำกัดของแต่ละรูปแบบ: จำนวนข้อขั้นต่ำ + ข้ามข้อที่มีคลิป', () => {
  assert.equal(modeFit(QS(1), 'quiz').ok, true);
  assert.equal(modeFit(QS(2), 'cafe').ok, false);
  assert.equal(modeFit(QS(3), 'cafe').ok, true);
  assert.equal(modeFit(QS(4), 'tower').ok, false);
  assert.equal(modeFit(QS(5), 'racing').ok, true);
  const mixed = QS(6, [0, 1]);
  assert.equal(modeQuiz(mixed, 'quiz').questions.length, 6); // ควิซใช้คลิปได้
  assert.equal(modeQuiz(mixed, 'racing').questions.length, 4);
  const fit = modeFit(mixed, 'racing');
  assert.equal(fit.ok, false); // เหลือ 4 ข้อ ไม่ถึง 5
  assert.equal(fit.skippedVideo, 2);
});

t('คำถามวนซ้ำ: ครบทุกข้อในแต่ละรอบ และไม่ซ้ำติดกันตอนขึ้นรอบใหม่', () => {
  for (const n of [1, 2, 3, 7]) {
    for (let cyc = 0; cyc < 4; cyc++) {
      const round = Array.from({ length: n }, (_, i) => endlessIndex(n, cyc * n + i, 'seedX'));
      assert.deepEqual(round.slice().sort(), Array.from({ length: n }, (_, i) => i));
      if (cyc > 0 && n > 1) assert.notEqual(endlessIndex(n, cyc * n, 'seedX'), endlessIndex(n, cyc * n - 1, 'seedX'));
    }
  }
});

t('ตั้งค่าห้อง: เวลา/เส้นชัย ต้องเป็นค่าที่อนุญาต', () => {
  assert.deepEqual(cleanModeSettings('cafe', { duration: 300 }), { duration: 300, goal: 0 });
  assert.deepEqual(cleanModeSettings('cafe', { duration: 99999 }), { duration: 300, goal: 0 });
  assert.deepEqual(cleanModeSettings('racing', { goal: 20 }), { duration: 0, goal: 20 });
  assert.deepEqual(cleanModeSettings('racing', { goal: -5 }), { duration: 0, goal: 15 });
  assert.deepEqual(cleanModeSettings('quiz', { duration: 300, goal: 20 }), { duration: 0, goal: 0 });
});

t('เพดานคะแนนจากเกมในเครื่อง ขึ้นกับจำนวนข้อที่ตอบถูก', () => {
  assert.equal(scoreCap('cafe', 0), 400);
  assert.ok(scoreCap('cafe', 10) < scoreCap('cafe', 11));
  assert.ok(scoreCap('tower', 5) >= 5 * 450);
  assert.equal(scoreCap('quiz', 3), Number.MAX_SAFE_INTEGER);
  assert.ok(scoreCap('brawl', 0) >= 3000 && scoreCap('brawl', 10) > scoreCap('brawl', 9));
  assert.ok(scoreCap('fishing', 1) >= 80000, 'ปลาตัวหนักสุด x แม่เหล็ก ต้องไม่ถูกตัด');
  assert.ok(scoreCap('fishing', 0) < 40000, 'ยังไม่ตอบถูกเลย ต้องได้ปลาตัวใหญ่ไม่ได้');
});

t('รูปแบบใหม่ Monster Brawl / Fishing Frenzy: ข้อขั้นต่ำและไม่รองรับคลิป', () => {
  assert.equal(modeFit(QS(4), 'brawl').ok, false);
  assert.equal(modeFit(QS(5), 'brawl').ok, true);
  assert.equal(modeFit(QS(2), 'fishing').ok, false);
  assert.equal(modeFit(QS(3), 'fishing').ok, true);
  assert.equal(modeQuiz(QS(6, [0]), 'fishing').questions.length, 5);
  assert.deepEqual(cleanModeSettings('brawl', { duration: 600 }), { duration: 600, goal: 0 });
  assert.deepEqual(cleanModeSettings('fishing', { duration: 1 }), { duration: 300, goal: 0 });
});

t('เครื่องประดับ: รับเฉพาะเลขที่มีจริง ค่าอื่นกลายเป็น "ไม่ใส่"', () => {
  assert.deepEqual(cleanGear(null), { h: 0, o: 0, m: 0, i: 0 });
  assert.deepEqual(cleanGear({ h: 3, o: 1, m: 2, i: 4 }), { h: 3, o: 1, m: 2, i: 4 });
  assert.deepEqual(cleanGear({ h: 999, o: -1, m: 1.5, i: '2', x: 5 }), { h: 0, o: 0, m: 0, i: 0 });
  assert.deepEqual(cleanGear({ h: gearCount('h') - 1 }).h, gearCount('h') - 1);
  assert.equal(cleanGear({ h: gearCount('h') }).h, 0);
  for (const s of GEAR_SLOTS) assert.ok(s.items.length >= 8, `หมวด${s.name}ต้องมีของให้เลือกพอ`);
  for (let k = 0; k < 50; k++) {
    const g = randomGear();
    assert.deepEqual(cleanGear(g), g);
  }
  assert.ok(sameGear({ h: 1, o: 0, m: 0, i: 0 }, { h: 1 } as never));
});

t('เพลงประกอบ: ค่าที่ตั้งได้ และเพลงเริ่มต้นของทุกรูปแบบมีจริง', () => {
  assert.equal(cleanMusicSetting('off'), 'off');
  assert.equal(cleanMusicSetting('boss'), 'boss');
  assert.equal(cleanMusicSetting('../../etc'), 'auto');
  assert.equal(cleanMusicSetting(undefined), 'auto');
  for (const m of MODES) assert.ok(TRACKS.some((t) => t.id === MODE_MUSIC[m.id]), `เพลงของ ${m.id}`);
  assert.equal(roomTrack('off', 'quiz'), null);
  assert.equal(roomTrack('auto', 'brawl'), 'boss');
  assert.equal(roomTrack('lofi', 'brawl'), 'lofi');
  assert.equal(new Set(TRACKS.map((t) => t.id)).size, TRACKS.length);
  for (const tr of TRACKS) assert.match(tr.id, /^[a-z]+$/);
});

t('สิทธิ์ระบบสร้างเกม: ไม่ล็อกอิน/ทดลองเล่น = guest, ไม่เป็นสมาชิก = free, สมาชิก/Dev = member', () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();
  assert.equal(creatorTier(false, null), 'guest');
  assert.equal(creatorTier(true, null), 'guest');
  assert.equal(creatorTier(true, { role: 'member', premium_until: future, username: 'trial_ab12' }), 'guest');
  assert.equal(creatorTier(true, { role: 'member', premium_until: null, username: 'abc' }), 'free');
  assert.equal(creatorTier(true, { role: 'member', premium_until: past, username: 'abc' }), 'free');
  assert.equal(creatorTier(true, { role: 'member', premium_until: future, username: 'abc' }), 'member');
  assert.equal(creatorTier(true, { role: 'dev', premium_until: null, username: 'dev1' }), 'member');
});

t('โควต้า: guest ไม่มีพื้นที่ บัญชีฟรีน้อยกว่าสมาชิก และชุดคำถามฟรี 2 ชุด', () => {
  assert.equal(quotaBytes('guest'), 0);
  assert.equal(quotaBytes('free'), FREE_UPLOAD_MB * 1024 * 1024);
  assert.equal(quotaBytes('member'), MEMBER_UPLOAD_MB * 1024 * 1024);
  assert.ok(quotaBytes('free') < quotaBytes('member'));
  assert.equal(FREE_SET_LIMIT, 2); // ตรงกับตัวกันใน migration 019
  assert.equal(fmtMB(5 * 1024 * 1024), '5 MB');
  assert.equal(fmtMB(1.5 * 1024 * 1024), '1.5 MB');
  assert.equal(fmtMB(0), '0 MB');
  assert.equal(fmtMB(30 * 1024 * 1024), '30 MB');
});

t('สมัครบัญชีเอง: กติกาชื่อ/อีเมล/รหัสผ่าน', () => {
  const ok = { username: 'Kru_Ann-1', email: ' Kru.Ann+x@Gmail.COM ', password: 'abcd1234', confirm: 'abcd1234' };
  const r = signupSchema.safeParse(ok);
  assert.ok(r.success);
  if (r.success) assert.equal(normalizeGmail(r.data.email), 'kruann@gmail.com');
  const bad = (o: object) => !signupSchema.safeParse({ ...ok, ...o }).success;
  assert.ok(bad({ username: 'ab' }), 'ชื่อสั้นเกิน');
  assert.ok(bad({ username: 'a'.repeat(21) }), 'ชื่อยาวเกิน');
  assert.ok(bad({ username: 'สมชาย' }), 'ชื่อเป็นภาษาไทยไม่ได้ (ใช้เป็นอีเมลภายใน)');
  assert.ok(bad({ username: 'a b c' }), 'เว้นวรรคไม่ได้');
  assert.ok(bad({ username: 'trial_xyz' }), 'ชื่อ trial_ สงวนไว้');
  assert.ok(bad({ username: 'Admin' }), 'ชื่อสงวน');
  assert.ok(bad({ email: 'not-an-email' }));
  assert.ok(bad({ email: 'a@b' }));
  assert.ok(bad({ email: 'x@internal.mediahub.local' }));
  assert.ok(bad({ email: 'awdad@gmai.com' }), 'สะกดโดเมนผิด');
  assert.ok(bad({ email: 'someone@example.com' }), 'ต้องเป็น gmail เท่านั้น');
  assert.ok(bad({ email: 'someone@yahoo.com' }));
  assert.ok(bad({ email: 'someone@gmail.co' }));
  assert.ok(bad({ email: 'someone@gmail.com.evil.com' }));
  assert.ok(bad({ email: 'awdad@gmail.com' }), 'ชื่อสั้นกว่า 6 ตัว Gmail จริงไม่มี');
  assert.ok(bad({ password: 'short1' }), 'รหัสผ่านสั้นเกิน');
  assert.ok(bad({ password: 'a'.repeat(73), confirm: 'a'.repeat(73) }), 'รหัสผ่านยาวเกิน');
  assert.ok(bad({ confirm: 'abcd12345' }), 'รหัสผ่านสองช่องไม่ตรงกัน');
});

t('อีเมล Gmail: รูปแบบกลางกันสมัครซ้ำด้วยจุดและ +', () => {
  const key = 'kruann@gmail.com';
  for (const v of ['kruann@gmail.com', 'Kru.Ann@gmail.com', 'k.r.u.a.n.n@GMAIL.com', 'kruann+shop@gmail.com', 'kru.ann+a+b@gmail.com', '  KRUANN@gmail.com  ']) {
    assert.equal(normalizeGmail(v), key, v);
  }
  for (const v of ['', 'kruann', 'kruann@', '@gmail.com', '.kruann@gmail.com', 'kruann.@gmail.com', 'kru..ann@gmail.com', 'kru ann@gmail.com', 'kruann@googlemail.com', 'ครูแอน123@gmail.com', 'a'.repeat(31) + '@gmail.com']) {
    assert.equal(normalizeGmail(v), null, v);
  }
  assert.equal(normalizeGmail('a'.repeat(30) + '@gmail.com'), 'a'.repeat(30) + '@gmail.com');
});

t('บัญชีฟรี: สิทธิ์ 2 ชุดนับจากที่เคยสร้าง ลบแล้วไม่คืน', () => {
  assert.equal(setsUsed(undefined, 1), 1, 'ยังไม่รัน migration: ใช้จำนวนที่มีอยู่');
  assert.equal(setsUsed(null, 0), 0);
  assert.equal(setsUsed(2, 0), 2, 'สร้างครบ 2 แล้วลบหมด ยังนับว่าใช้ครบ');
  assert.ok(setsUsed(2, 0) >= FREE_SET_LIMIT);
  assert.ok(setsUsed(1, 1) < FREE_SET_LIMIT);
  assert.equal(setsUsed(1, 2), 2, 'ตัวเลขที่เคยสร้างน้อยกว่าที่มีอยู่จริง ใช้ค่าที่มากกว่า');
});

console.log(`\n${passed} tests passed`);
