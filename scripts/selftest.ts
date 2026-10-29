/**
 * ทดสอบตรรกะของคู่หู/สติกเกอร์/เกมประจำวัน/ฤดูกาล (ไม่ต้องใช้ฐานข้อมูลหรือเบราว์เซอร์)
 * รัน: npm run selftest
 */
import assert from 'node:assert/strict';
import { answerOf, quizPages } from '../src/lib/studio/fromQuiz';
import { cleanGraph, compileExpr, defaultShape, graphToSvg, GRAPH_TEMPLATES, intersections, parseEquation, shapeFacts, shapeText, texToExpr, type GShape } from '../src/lib/studio/graph';
import { PAGE_FIELD, parseTabs, tabWidth, cleanFlowHtml, cleanWordOpt, defaultWordOpt, flowIsEmpty, pageLabel, stripPageField, withPageField } from '../src/lib/studio/flow';
import { mathmlToOmml } from '../src/lib/studio/omml';
import JSZip from 'jszip';
import { parseXml } from '../src/lib/studio/xml';
import { ommlToTex } from '../src/lib/studio/ommlTex';
import { mtefToTex, oleEquationTex } from '../src/lib/studio/mtef';
import { textToFlow } from '../src/lib/studio/textImport';
import { cutBlocks, docxToFlow } from '../src/lib/studio/docxImport';
import { prepTex } from '../src/lib/mathTex';
import katex from 'katex';
import { MATH_DEFAULTS, WORD_KEYS, assignMath, comboLabel, comboOf, conflictOf, mathKeyOf } from '../src/lib/studio/keys';
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
import { TURF_CELLS, cleanModeSettings, isWorldMode, modeFit, modeQuiz, scoreCap } from '../src/lib/game-creator/modes';
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
import { ALL_MEDIA_TYPES, ALL_SUBJECTS, GAME_FILTER_TYPES } from '../src/types/database';
import { CHAPTERS, STEPS } from '../src/components/tour/steps';
import { mediaSchema } from '../src/lib/validations/media';
import { FREE_DESIGN_LIMIT } from '../src/lib/game-creator/quota';
import { blankDesign, cleanSrc, designMediaPaths, MAX_PAGES, sanitizeDesign, SIZES } from '../src/lib/studio/doc';
import { buildPdf, jpegSize } from '../src/lib/studio/pdf';
import { answerSheet, arithProblems, cellsOf, scrambleWord, THAI_CONSONANTS, timesTable, wordSearch } from '../src/lib/studio/gen';
import { KITS, kitDefaults } from '../src/lib/studio/kits';
import { ACCS, ANIMAL_PRESETS, CHAR_PRESETS, POSES, SPECIES, cleanLook, toggleAcc, withSpecies } from '../src/lib/studio/char';
import { clampEdu, DECO_IDS, EDU_KINDS, makeDeco, makeEdu } from '../src/lib/studio/doc';
import { mediaPrefix } from '../src/lib/game-creator/prefix';
import { TEMPLATES } from '../src/components/studio/templates';
import { STICKERS } from '../src/components/studio/stickers';

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
  // ไม่พึ่งค่าใน .env.local (รันที่ไหนก็ผ่าน)
  process.env.EMAIL_LINK_SECRET = process.env.EMAIL_LINK_SECRET || 'selftest-email-secret';
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
    { ...goodImg, kind: 'pdf' },
  ];
  bad.forEach((m) => assert.equal(sanitizeQuiz({ questions: [Q({ media: m })] }, PFX).questions[0].media, null));
});

t('คลิปเล่นได้ไม่เกิน 30 วินาที', () => {
  const v = { kind: 'video', url: `${PFX}${UID}/v.webm`, path: `${UID}/v.webm`, start: 3, end: 90 };
  const m = sanitizeQuiz({ questions: [Q({ media: v })] }, PFX).questions[0].media!;
  assert.equal(m.start, 3);
  assert.equal(m.end, 33);
  const m2 = sanitizeQuiz({ questions: [Q({ media: { ...v, start: 1, end: 3.5 } })] }, PFX).questions[0].media!;
  assert.equal(m2.end, 3.5);
});

t('คำถามแบบพิมพ์คำตอบ: ตัวกรอง ตรวจคำตอบ และคลิปเสียง', () => {
  const raw = Q({ kind: 'text', answers: ['  สิบสอง ', '12', '12.', '', 7, 'x'.repeat(200)], choices: [{ id: 'aaaa1', text: 'ก', correct: true }] });
  const q = sanitizeQuiz({ questions: [raw] }, PFX).questions[0];
  assert.equal(q.kind, 'text');
  assert.deepEqual(q.choices, [], 'ข้อพิมพ์คำตอบไม่มีตัวเลือก');
  assert.equal(q.answers?.[0], 'สิบสอง');
  assert.equal(q.answers?.includes('12.'), false, 'คำตอบซ้ำแบบเดียวกันถูกตัด');
  assert.ok((q.answers || []).every((a) => a.length <= 60));
  assert.equal(checkAnswer(q, ['สิบ สอง']), true);
  assert.equal(checkAnswer(q, ['๑๒']), true, 'เลขไทยเทียบเท่าเลขอารบิก');
  assert.equal(checkAnswer(q, ['12!']), true);
  assert.equal(checkAnswer(q, ['13']), false);
  assert.equal(checkAnswer(q, ['']), false);
  assert.equal(checkAnswer(q, []), false);
  const pub = publicQuestion(q, 0, 1, { shuffleChoices: false, seed: 's', elapsedMs: 0 });
  assert.equal(pub.kind, 'text');
  assert.equal(JSON.stringify(pub).includes('สิบสอง'), false, 'ผู้เล่นไม่เห็นเฉลย');
  // ยังไม่ใส่คำตอบ = ยังไม่ครบ และไม่ถูกนำไปเล่น
  const empty = sanitizeQuiz({ questions: [Q({ kind: 'text', answers: [] })] }, PFX);
  assert.equal(playableQuiz(empty).questions.length, 0);
  assert.ok(quizIssues(empty).some((x) => x.msg.includes('คำตอบ')));
  // คลิปเสียงใส่ในโจทย์ได้ แต่ใส่ในตัวเลือกไม่ได้
  const au = { kind: 'audio', url: `${PFX}${UID}/s.mp3`, path: `${UID}/s.mp3` };
  const qa = sanitizeQuiz({ questions: [Q({ media: au, choices: [{ id: 'aaaa1', text: 'ก', correct: true, media: au }, { id: 'bbbb1', text: 'ข' }] })] }, PFX).questions[0];
  assert.equal(qa.media?.kind, 'audio');
  assert.equal(qa.choices[0].media, null);
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

t('ตั้งค่าห้อง: เวลา/เส้นชัย/ทีม ต้องเป็นค่าที่อนุญาต', () => {
  assert.deepEqual(cleanModeSettings('cafe', { duration: 300 }), { duration: 300, goal: 0, teams: 0 });
  assert.deepEqual(cleanModeSettings('cafe', { duration: 99999 }), { duration: 300, goal: 0, teams: 0 });
  assert.deepEqual(cleanModeSettings('racing', { goal: 20 }), { duration: 0, goal: 20, teams: 0 });
  assert.deepEqual(cleanModeSettings('racing', { goal: -5 }), { duration: 0, goal: 15, teams: 0 });
  assert.deepEqual(cleanModeSettings('quiz', { duration: 300, goal: 20 }), { duration: 0, goal: 0, teams: 0 });
  // แบ่งทีมได้เฉพาะศึกยึดอาณาจักร และเฉพาะ 2/3/4 ทีม
  assert.equal(cleanModeSettings('turf', { teams: 3 }).teams, 3);
  assert.equal(cleanModeSettings('turf', { teams: 9 }).teams, 0);
  assert.equal(cleanModeSettings('cafe', { teams: 2 }).teams, 0);
});

t('รูปแบบใหม่ ศึกยึดอาณาจักร / เกาะมหาสมบัติ: รองรับคลิป เพดานคะแนนตามข้อที่ถูก', () => {
  const vq = { ...QS(3), questions: QS(3).questions.map((q, k) => (k === 0 ? { ...q, media: { kind: 'video' as const, url: 'x', path: 'x', start: 0, end: 20 } } : q)) };
  for (const m of ['turf', 'treasure'] as const) {
    assert.equal(modeFit(QS(2), m).ok, false);
    assert.equal(modeFit(vq, m).usable, 3, 'ไม่ตัดข้อที่มีคลิป');
    assert.ok(scoreCap(m, 0) > 0 && scoreCap(m, 5) > scoreCap(m, 4));
  }
  assert.ok(scoreCap('turf', 1000) <= TURF_CELLS, 'ยึดได้ไม่เกินจำนวนช่องในแผนที่');
  assert.ok(isWorldMode('turf') && isWorldMode('treasure') && !isWorldMode('racing'));
  assert.ok(MODE_MUSIC.turf && MODE_MUSIC.treasure);
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
  assert.deepEqual(cleanModeSettings('brawl', { duration: 600 }), { duration: 600, goal: 0, teams: 0 });
  assert.deepEqual(cleanModeSettings('fishing', { duration: 1 }), { duration: 300, goal: 0, teams: 0 });
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

t('คลังเกม: ตัวกรองประเภทไม่มีแบบทดสอบ/แบบฝึกหัด', () => {
  assert.ok(!GAME_FILTER_TYPES.includes('แบบทดสอบ'));
  assert.ok(!GAME_FILTER_TYPES.includes('แบบฝึกหัด'));
  assert.ok(GAME_FILTER_TYPES.includes('เกม'));
  assert.equal(GAME_FILTER_TYPES.length, ALL_MEDIA_TYPES.length - 2);
});

t('ทัวร์แนะนำเว็บ: ลำดับหน้า ภาพรวมรูปแบบเกม และจบที่ฉากเลือก', () => {
  const ids = STEPS.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
  // ลำดับหน้า: หน้าหลัก > สร้างเกม > สมาชิก (ไม่ย้อนไปมา)
  const order = ['/home', '/create', '/studio', '/membership'];
  const seq = STEPS.map((x) => order.indexOf(x.path));
  assert.ok(seq.every((v) => v >= 0));
  assert.ok(seq.every((v, i) => i === 0 || v >= seq[i - 1]));
  // ไม่มีคลังวิดีโอ/เอกสารแล้ว
  assert.ok(!ids.includes('videos') && !ids.includes('docs'));
  // รูปแบบเกมโชว์แค่ภาพรวมขั้นเดียว ไม่ไล่ทีละแบบ
  assert.ok(ids.includes('modes'));
  assert.ok(!ids.some((id) => id.startsWith('mode-')));
  // ทุกขั้นเดินเองได้ ยกเว้นฉากสุดท้ายที่รอผู้ใช้เลือก
  const last = STEPS[STEPS.length - 1];
  assert.ok(last.final && !last.target && last.path === '/membership');
  for (const x of STEPS.slice(0, -1)) {
    assert.ok(!x.final && x.ms >= 3000 && x.ms <= 8000, x.id);
    assert.ok(CHAPTERS[x.chapter], x.id);
    assert.ok(x.title.length > 0 && x.text.length <= 60, x.id);
  }
  // ไม่ช้า/ไม่เร็วเกิน: เวลาโชว์รวมราว 1 นาที
  const total = STEPS.reduce((a, x) => a + x.ms, 0);
  assert.ok(total >= 35_000 && total <= 90_000, String(total));
});

t('สร้างสื่อ: ตัวกรองข้อมูลกันสคริปต์/สไตล์แปลกปลอม และรูปจากเว็บอื่น', () => {
  const evil = {
    v: 1,
    size: { id: 'a4p', w: 99999, h: -5 },
    pages: [
      {
        id: 'x" onload="1',
        bg: { color: 'red;background:url(https://evil.example/t.png)', pattern: 'hack', pcolor: 'expression(alert(1))', color2: '#ff00ff' },
        border: { style: 'line', color: '#12345', w: 999 },
        items: [
          { type: 'text', text: '<img src=x onerror=alert(1)>', font: 'comic', size: 1e9, color: 'url(javascript:alert(1))', align: 'justify', x: 'a' },
          { type: 'image', src: 'https://evil.example/a.png' },
          { type: 'image', src: 'javascript:alert(1)' },
          { type: 'image', src: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' },
          { type: 'image', src: 'data:image/png;base64,iVBORw0KGgo=' },
          { type: 'sticker', sticker: '../../etc' },
          { type: 'shape', shape: 'star', fill: '#abcdef', sw: 5000 },
          { type: 'script', src: 'x' },
          { type: 'table', cells: [['a', 'b'], ['c']], stroke: '#000000' },
        ],
      },
    ],
  };
  const d = sanitizeDesign(evil);
  assert.equal(d.size.w, 2400);
  assert.equal(d.size.h, 200);
  assert.equal(d.size.id, 'custom');
  const p = d.pages[0];
  assert.match(p.id, /^[a-z0-9]+$/);
  assert.equal(p.bg.color, '#ffffff');
  assert.equal(p.bg.pattern, 'none');
  assert.equal(p.bg.pcolor, '#d9d3f5');
  assert.equal(p.bg.color2, '#ff00ff');
  assert.equal(p.border.color, '#7c5cf0');
  assert.equal(p.border.w, 40);
  const [txt, ...rest] = p.items;
  assert.equal(txt.type, 'text');
  if (txt.type === 'text') {
    assert.equal(txt.text, '<img src=x onerror=alert(1)>'); // เก็บเป็นตัวอักษรธรรมดา แสดงผลแบบ text ไม่ใช่ HTML
    assert.equal(txt.font, 'sarabun');
    assert.equal(txt.size, 400);
    assert.equal(txt.color, '#2a2350');
    assert.equal(txt.align, 'center');
    assert.equal(txt.x, 0);
  }
  // เหลือ: รูป png ที่ระบบสร้าง, รูปทรง, ตาราง (รูปเว็บอื่น/javascript:/svg, สติกเกอร์ปลอม, ชนิดแปลก ถูกตัดทิ้ง)
  assert.deepEqual(rest.map((i) => i.type), ['image', 'shape', 'table']);
  const shape = rest[1];
  if (shape.type === 'shape') assert.equal(shape.sw, 60);
  const table = rest[2];
  if (table.type === 'table') assert.deepEqual(table.cells, [['a', 'b'], ['c', '']]);
  // ไฟล์จากที่เก็บของเราผ่าน แต่ห้ามไต่โฟลเดอร์
  const pre = mediaPrefix();
  if (pre) {
    assert.equal(cleanSrc(pre + 'abc/x1.webp'), pre + 'abc/x1.webp');
    assert.equal(cleanSrc(pre + '../secret.png'), '');
    assert.deepEqual(designMediaPaths(sanitizeDesign({ pages: [{ items: [{ type: 'image', src: pre + 'u1/a.webp' }, { type: 'image', src: pre + 'u1/a.webp' }] }] })), ['u1/a.webp']);
  }
  // จำนวนหน้า/ชิ้นมีเพดาน
  assert.equal(sanitizeDesign({ pages: Array.from({ length: 50 }, () => ({})) }).pages.length, MAX_PAGES);
  assert.equal(sanitizeDesign(null).pages.length, 1);
  assert.equal(FREE_DESIGN_LIMIT, 3);
});

t('สร้างสื่อ: ค่าเริ่มต้น A4 แนวตั้ง และแม่แบบทุกอันผ่านตัวกรองครบไม่ตกหล่น', () => {
  const b = blankDesign();
  assert.equal(b.size.id, 'a4p');
  assert.deepEqual([b.size.w, b.size.h], [794, 1123]);
  assert.equal(sanitizeDesign(JSON.parse(JSON.stringify(b))).size.id, 'a4p');
  for (const s of SIZES) assert.ok(s.w >= 200 && s.h >= 200 && s.w <= 2400 && s.h <= 2400, s.id);
  const stickerIds = new Set(STICKERS.map((x) => x.id));
  assert.equal(stickerIds.size, STICKERS.length);
  for (const tp of TEMPLATES) {
    const d = tp.make();
    const back = sanitizeDesign(JSON.parse(JSON.stringify(d)));
    assert.equal(back.size.id, tp.sizeId, tp.id);
    assert.deepEqual(back.pages.map((p) => p.items.length), d.pages.map((p) => p.items.length), tp.id);
    for (const it of d.pages.flatMap((p) => p.items)) if (it.type === 'sticker') assert.ok(stickerIds.has(it.sticker), `${tp.id}: ${it.sticker}`);
  }
});

t('สร้างสื่อ: ไฟล์ PDF ถูกโครงสร้าง (xref ชี้ตำแหน่งวัตถุตรง)', () => {
  // JPEG ปลอมที่มีหัว SOF0 กว้าง 3 สูง 2
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x02, 0x00, 0x03, 0x01, 0x01, 0x11, 0x00, 0xff, 0xd9]);
  assert.deepEqual(jpegSize(jpeg), { w: 3, h: 2 });
  assert.equal(jpegSize(new Uint8Array([1, 2, 3])), null);
  const pdf = buildPdf([
    { jpeg, wPt: 595.5, hPt: 842.25 },
    { jpeg, wPt: 595.5, hPt: 842.25 },
  ]);
  const txt = Buffer.from(pdf).toString('latin1');
  assert.ok(txt.startsWith('%PDF-1.4'));
  assert.ok(txt.trimEnd().endsWith('%%EOF'));
  assert.match(txt, /\/Count 2/);
  const start = Number(/startxref\n(\d+)/.exec(txt)![1]);
  assert.ok(txt.slice(start).startsWith('xref'));
  const offs = txt.slice(start).split('\n').slice(3, 3 + 8).map((l) => Number(l.slice(0, 10)));
  offs.forEach((o, i) => assert.ok(txt.slice(o).startsWith(`${i + 1} 0 obj`), `obj ${i + 1}`));
  assert.match(txt, /\/Width 3 \/Height 2/);
  assert.throws(() => buildPdf([{ jpeg: new Uint8Array([1, 2]), wPt: 1, hPt: 1 }]));
});

t('สร้างสื่อ: ตารางค้นหาคำ วางคำครบและอ่านเจอในตาราง (ไทย/อังกฤษ)', () => {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const en = wordSearch(['cat', 'dog', 'bird', 'fish', 'lion'], 10, false, rand);
  assert.equal(en.grid.length, 10);
  assert.ok(en.grid.every((r) => r.length === 10 && r.every((c) => /^[A-Z]$/.test(c))));
  assert.deepEqual(en.placed.sort(), ['bird', 'cat', 'dog', 'fish', 'lion']);
  const lines = (g: string[][]) => {
    const n = g.length;
    const out: string[] = [];
    for (let r = 0; r < n; r++) out.push(g[r].join(''));
    for (let c = 0; c < n; c++) out.push(g.map((r) => r[c]).join(''));
    for (let k = -n; k <= n; k++) out.push(g.map((r, i) => r[i + k] ?? '').join(''));
    return out.join('|');
  };
  for (const w of en.placed) assert.ok(lines(en.grid).includes(w.toUpperCase()), w);
  assert.deepEqual(cellsOf('กิน'), ['กิ', 'น']);
  const th = wordSearch(['แมว', 'ปลา', 'นก'], 8, false, rand);
  assert.equal(th.placed.length, 3);
  assert.ok(th.grid.flat().every((c) => /[\u0E00-\u0E7F]/.test(c)));
  assert.deepEqual(wordSearch(['ABCDEFGHIJKLMNOPQRSTU'], 8, false, rand).skipped, ['ABCDEFGHIJKLMNOPQRSTU']);
});

t('สร้างสื่อ: กระดาษคำตอบ สูตรคูณ และค่าตัวเลขของสื่อคณิตอยู่ในช่วงที่วาดได้', () => {
  const a = answerSheet(45, 4, 'th');
  assert.equal(a.length, 3);
  assert.deepEqual(a[0][0], ['ข้อ', 'ก', 'ข', 'ค', 'ง']);
  assert.equal(a[2].length, 6);
  assert.deepEqual(answerSheet(3, 5, 'en')[0][0], ['No.', 'A', 'B', 'C', 'D', 'E']);
  assert.deepEqual(timesTable(3, 12)[11], ['3 × 12 =', '']);
  assert.deepEqual(timesTable(3, 2, true)[1], ['3 × 2 =', '6']);
  assert.deepEqual(clampEdu('clock', 99, -5, 0), [12, 0, 0]);
  assert.deepEqual(clampEdu('pie', 4, 9, 0), [4, 4, 0]);
  const nl = clampEdu('numberline', 0, 100000, 1);
  assert.ok(nl[1] - nl[0] <= 40);
  for (const k of EDU_KINDS) {
    const e = makeEdu(k.kind);
    assert.deepEqual(clampEdu(e.kind, e.a, e.b, e.c), [e.a, e.b, e.c], k.kind);
    const back = sanitizeDesign({ pages: [{ items: [e] }] }).pages[0].items[0];
    assert.equal(back.type, 'edu', k.kind);
  }
});

t('สร้างสื่อ: ตัวละครแต่งเอง กรองค่าแปลกปลอม และกติกาเครื่องประดับ', () => {
  const bad = cleanLook({ skin: 'url(x)', hair: '<script>', eyes: 'big', accs: ['cap', 'beanie', 'glasses', 'sunglasses', 'book', 'nope'], l: { sh: 9999, el: -9999 } });
  assert.equal(bad.skin, CHAR_PRESETS[0].look.skin);
  assert.equal(bad.hair, 'short');
  assert.equal(bad.eyes, 'big');
  assert.deepEqual(bad.accs.sort(), ['beanie', 'book', 'sunglasses']);
  assert.deepEqual(bad.l, { sh: 180, el: -160 });
  assert.deepEqual(toggleAcc(['cap'], 'gradcap'), ['gradcap']);
  assert.deepEqual(toggleAcc(['cap', 'bow'], 'cap'), ['bow']);
  assert.ok(ACCS.length >= 15 && POSES.length >= 8);
  for (const p of CHAR_PRESETS) assert.deepEqual(cleanLook(JSON.parse(JSON.stringify(p.look))), p.look, p.id);
  const it = sanitizeDesign({ pages: [{ items: [{ type: 'char', look: { hairColor: '#123456' } }] }] }).pages[0].items[0];
  assert.ok(it.type === 'char' && it.look.hairColor === '#123456');
});

t('สร้างสื่อ: สัตว์แต่งเองได้ ชนิดแปลกปลอมกลายเป็นคน และสัตว์สำเร็จรูปผ่านตัวกรอง', () => {
  assert.equal(cleanLook({ species: 'dragon' }).species, 'human');
  assert.equal(cleanLook({}).species, 'human');
  const cat = withSpecies(cleanLook({}), 'cat');
  assert.equal(cat.species, 'cat');
  assert.equal(cat.skin, SPECIES.find((x) => x.id === 'cat')!.fur);
  assert.equal(cat.hair, 'bald');
  assert.equal(withSpecies(cat, 'human').hair, 'short');
  assert.ok(SPECIES.length >= 15);
  for (const p of ANIMAL_PRESETS) {
    assert.notEqual(p.look.species, 'human', p.id);
    assert.deepEqual(cleanLook(JSON.parse(JSON.stringify(p.look))), p.look, p.id);
  }
});

t('สร้างสื่อ: เครื่องมือสร้างใบงานทุกตัวสร้างชิ้นงานที่ผ่านตัวกรองครบทุกชิ้น', () => {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  assert.ok(KITS.length >= 30);
  assert.equal(new Set(KITS.map((k) => k.id)).size, KITS.length);
  for (const k of KITS) {
    const out = k.build(kitDefaults(k), 794, 1123, rand);
    assert.ok(out.items.length > 0, k.id);
    const back = sanitizeDesign({ size: { id: 'a4p', w: 794, h: 1123 }, pages: [{ items: out.items }] }).pages[0].items;
    assert.equal(back.length, out.items.length, k.id);
  }
});

t('สร้างสื่อ: โจทย์เลขลบไม่ติดลบ หารลงตัว สลับตัวอักษรครบ และของตกแต่ง/เอฟเฟกต์ถูกกรอง', () => {
  let seed = 3;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const p of arithProblems('-', 3, 40, rand)) assert.ok(p.ans >= 0 && p.a - p.b === p.ans);
  for (const p of arithProblems('/', 2, 40, rand)) assert.ok(p.a === p.b * p.ans && p.ans >= 10 && p.ans <= 99);
  for (const p of arithProblems('+', 1, 40, rand)) assert.ok(p.a >= 1 && p.a <= 9 && p.ans === p.a + p.b);
  assert.deepEqual(scrambleWord('teacher', rand).sort(), cellsOf('teacher').sort());
  assert.deepEqual(scrambleWord('โรงเรียน', rand).sort(), cellsOf('โรงเรียน').sort());
  assert.equal(THAI_CONSONANTS.length, 44);
  for (const id of DECO_IDS) assert.equal(sanitizeDesign({ pages: [{ items: [makeDeco(id)] }] }).pages[0].items[0].type, 'deco', id);
  assert.equal(sanitizeDesign({ pages: [{ items: [{ type: 'deco', style: 'evil' }] }] }).pages[0].items.length, 0);
  const fx = (v: unknown, c?: unknown) => sanitizeDesign({ pages: [{ items: [{ type: 'sticker', sticker: 'star', fx: v, fxColor: c }] }] }).pages[0].items[0];
  assert.equal(fx('glow', '#ff0000').fx, 'glow');
  assert.equal(fx('glow', 'red;x').fxColor, '#2a2350');
  assert.equal(fx('url(x)').fx, 'none');
  assert.equal(FREE_DESIGN_LIMIT, 3);
  assert.ok(EDU_KINDS.length >= 19 && EDU_KINDS.every((k) => k.params.length > 0));
});

t('ชุดคำถามเป็นใบงาน: แบ่งหน้าไม่ล้น ข้อความครบ เฉลยถูก และผ่านตัวกรองสื่อ', () => {
  const rich = (v: string) => [{ t: 'x' as const, v }];
  const qs = Array.from({ length: 23 }, (_, i) => ({
    id: `q${i}`,
    text: rich(i === 4 ? 'ข้อยาว '.repeat(60) : `โจทย์ข้อ ${i + 1}`),
    media: null,
    multi: i === 7,
    time: 20,
    points: 1 as const,
    choices: ['ก', 'ข', 'ค', 'ง'].map((c, k) => ({ id: `c${i}${k}`, text: rich(`ตัวเลือก ${c}`), media: null, correct: k === i % 4 || (i === 7 && k === 3) })),
  }));
  qs.push({ ...qs[0], id: 'empty', text: [], choices: qs[0].choices.map((c) => ({ ...c, text: [] })) });
  const pages = quizPages('ทดสอบ', { v: 1, questions: qs }, 794, 1123, { answers: true, header: true });
  assert.ok(pages.length >= 3, `pages ${pages.length}`);
  const body = pages.slice(0, -1);
  for (const pg of body) for (const it of pg.items) assert.ok(it.y >= 0 && it.y + it.h <= 1123 + 200, `${it.type} y=${it.y}`);
  const allText = body.flatMap((p) => p.items).map((it) => (it.type === 'text' ? it.text : '')).join('\n');
  for (let i = 1; i <= 23; i++) assert.ok(allText.includes(`${i}. `), `ข้อ ${i}`);
  assert.ok(!allText.includes('24. '), 'ข้อว่างต้องถูกข้าม');
  assert.equal(answerOf(qs[1]), 'ข');
  assert.equal(answerOf(qs[7]), 'ง');
  assert.equal(answerOf({ ...qs[7], choices: qs[7].choices.map((c, k) => ({ ...c, correct: k === 0 || k === 3 })) }), 'ก, ง');
  const key = pages[pages.length - 1].items.map((it) => (it.type === 'text' ? it.text : '')).join('\n');
  assert.ok(key.includes('เฉลย') && key.includes('2. ข') && key.includes('23. ค'));
  const back = sanitizeDesign({ size: { id: 'a4p', w: 794, h: 1123 }, pages });
  assert.equal(back.pages.length, pages.length);
  assert.equal(back.pages.reduce((n, p) => n + p.items.length, 0), pages.reduce((n, p) => n + p.items.length, 0));
  assert.equal(quizPages('x', { v: 1, questions: [] }, 794, 1123, { answers: true, header: true }).length, 0);
  assert.equal(quizPages('x', { v: 1, questions: qs }, 794, 1123, { answers: false, header: false }).length, pages.length - 1);
});

t('กราฟ: ตัวแปลสมการแบบ Desmos, ตัวกรองข้อมูลกราฟ และแม่แบบทุกแบบวาดได้', () => {
  const ev = (s: string, x = 0, y = 0, p: Record<string, number> = {}) => compileExpr(s).fn(x, y, p);
  assert.equal(ev('2x^2', 3), 18);
  assert.equal(ev('-x^2', 3), -9);
  assert.ok(Math.abs(ev('sin 2x', Math.PI / 4) - 1) < 1e-12);
  assert.equal(ev('3/4x', 4), 3);
  assert.equal(ev('2|x|', -3), 6);
  assert.equal(ev('(x+1)(x-1)', 3), 8);
  assert.equal(ev('ax+b', 2, 0, { a: 3, b: 1 }), 7);
  assert.equal(ev('xy', 2, 5), 10);
  const k = (s: string) => {
    const r = parseEquation(s);
    return r.ok ? r.kind : 'err';
  };
  assert.equal(k('y = x^2'), 'y');
  assert.equal(k('x = y^2'), 'x');
  assert.equal(k('x^2/9 + y^2/4 = 1'), 'implicit');
  assert.equal(k('f(x) = 2x'), 'y');
  assert.equal(k('y = (x'), 'err');
  assert.equal(k('y = 2 $ 3'), 'err');
  assert.equal(k('alert(1)'), 'y');
  const r = parseEquation('y = a x^2 + b x + c');
  assert.ok(r.ok && r.params.join() === 'a,b,c');
  const hits = intersections('y = x^2', 'y = x + 2', -5, 5);
  assert.deepEqual(hits.map((h) => Math.round(h[0] * 1e6) / 1e6), [-1, 2]);
  const evil = cleanGraph({ w: 1e9, objs: [{ kind: 'text', x: 0, y: 0, text: '<script>alert(1)</script>', color: 'red;x' }, { kind: 'seg', a: 'zz', b: 'yy' }, { kind: 'bogus' }] });
  assert.equal(evil.objs.length, 1);
  assert.equal(evil.w, 2400);
  assert.equal(evil.objs[0].color, '#111111');
  const svg = graphToSvg(evil);
  assert.ok(!svg.includes('<script') && svg.includes('&lt;script&gt;'));
  for (const tpl of GRAPH_TEMPLATES) {
    const g = tpl.make();
    const c = cleanGraph(JSON.parse(JSON.stringify(g)));
    assert.equal(c.objs.length, g.objs.length, tpl.id);
    assert.ok(!/NaN|Infinity/.test(graphToSvg(c)), tpl.id);
  }
  const d = sanitizeDesign({ pages: [{ items: [{ type: 'graph', spec: GRAPH_TEMPLATES[0].make() }, { type: 'math', tex: '\\frac{1}{2}' }, { type: 'math', tex: '   ' }] }] });
  assert.deepEqual(d.pages[0].items.map((x) => x.type), ['graph', 'math']);
});

t('โหมดเอกสาร: ตัวกรอง HTML ตัดสคริปต์/ลิงก์/รูปภายนอก เก็บสมการและกราฟ', () => {
  const ok = (v: string) => (v.startsWith('https://ok/') ? v : '');
  const c = (h: string) => cleanFlowHtml(h, ok);
  assert.equal(c('<p>a<script>alert(1)</script>b</p>'), '<p>ab</p>');
  assert.equal(c('<img src="x" onerror="alert(1)">'), '');
  assert.equal(c('<img src="https://ok/a.png" onerror="alert(1)">'), '<img src="https://ok/a.png">');
  assert.equal(c('<a href="javascript:alert(1)">x</a>'), 'x');
  assert.equal(c('<p style="color: red; background: url(x); position: fixed">t</p>'), '<p style="color: red">t</p>');
  assert.equal(c('<iframe src="x"></iframe><p>ok</p>'), '<p>ok</p>');
  assert.equal(c('1 < 2 & 3'), '1 &lt; 2 & 3');
  const math = c('<p>x <span data-tex="\\frac{1}{2}" contenteditable="false"><span class="katex"><span>1</span></span></span> y</p>');
  assert.equal(math, '<p>x <span data-tex="\\frac{1}{2}" contenteditable="false"></span> y</p>');
  const g = c(`<figure data-graph='${JSON.stringify(GRAPH_TEMPLATES[0].make()).replace(/'/g, '&#39;')}'><svg><text>x</text></svg></figure><p>after</p>`);
  assert.ok(g.startsWith('<figure data-graph="') && g.endsWith('</figure><p>after</p>'));
  assert.equal(c('<figure data-graph="not json"></figure><p>z</p>'), '<p>z</p>');
  // การจัดวางแบบ Word: เก็บตำแหน่ง/ขนาด และค่าจัดวางที่รู้จักเท่านั้น
  assert.equal(c('<img src="https://ok/a.png" data-wrap="behind" style="left: 120px; top: 40px; width: 300px; z-index: 99">'), '<img src="https://ok/a.png" data-wrap="behind" style="left: 120px; top: 40px; width: 300px">');
  assert.equal(c('<img src="https://ok/a.png" data-wrap="fixed">'), '<img src="https://ok/a.png">');
  const gw = c(`<figure data-graph='${JSON.stringify(GRAPH_TEMPLATES[0].make()).replace(/'/g, '&#39;')}' data-wrap="front"></figure>`);
  assert.ok(gw.includes('data-wrap="front"'));
  assert.ok(flowIsEmpty('<p><br></p>') && !flowIsEmpty('<p>ก</p>') && !flowIsEmpty('<span data-tex="x"></span>'));
  const d = sanitizeDesign({ mode: 'word', flow: '<h1>หัวเรื่อง</h1><script>x</script>' });
  assert.equal(d.mode, 'word');
  assert.equal(d.flow, '<h1>หัวเรื่อง</h1>');
});

t('โหมดเอกสาร: รูปร่าง หัว/ท้ายกระดาษ เลขหน้า และขอบแบบ Word', () => {
  const c = (h: string) => cleanFlowHtml(h, () => '');
  // รูปร่าง: เก็บเฉพาะรหัสรูป/สี #hex/ความหนา/สัดส่วนที่ถูกต้อง เนื้อหาข้างใน (SVG) ทิ้ง
  const sh = c('<figure data-shape="star" data-fill="#fde68a" data-stroke="red" data-sw="99" data-ar="1.5" data-wrap="front" style="left: 10px; top: 20px; width: 120px" onclick="x"><svg><script>x</script></svg></figure>');
  assert.equal(sh, '<figure data-shape="star" data-fill="#fde68a" data-ar="1.5" data-wrap="front" style="left: 10px; top: 20px; width: 120px" contenteditable="false"></figure>');
  assert.equal(c('<figure data-shape="<x>"></figure><p>a</p>'), '<p>a</p>');
  assert.equal(c('<figure data-fill="#000000"></figure><p>a</p>'), '<p>a</p>', 'ไม่มีรหัสรูป = ทิ้ง');
  // เอกสารเก่า (ไม่มีค่าตั้งหน้า) คงขอบเดิม เอกสารใหม่ใช้ขอบ 1 นิ้วแบบ Word
  const old = cleanWordOpt(undefined);
  assert.equal(old.std, false);
  assert.equal(old.mt, 72);
  assert.equal(defaultWordOpt().ml, 96);
  assert.equal(sanitizeDesign({}).word.std, false);
  const o = cleanWordOpt({ std: true, mt: 9999, head: '<p>วิชา<img src="https://evil/x.png"><script>x</script></p>', foot: '<p>ท้าย<img src="https://ok/a.png"></p>', num: 'bottom', numFmt: 'of', numStart: 3, numFirst: false, ml: -5 });
  assert.equal(o.mt, 300);
  assert.equal(o.ml, 0);
  assert.equal(o.head, '<p>วิชา</p>', 'หัวกระดาษผ่านตัวกรองเดียวกับเนื้อหา');
  assert.equal(cleanWordOpt({ foot: '<p>ท้าย<img src="https://ok/a.png"></p>' }, (v) => (v.startsWith('https://ok/') ? v : '')).foot, '<p>ท้าย<img src="https://ok/a.png"></p>');
  // รูปร่างแบบยึดกับย่อหน้า (span) และ span ทั่วไปห้ามติดค่าจัดวาง
  assert.equal(c('<p>ก<span data-shape="heart" data-ar="2" data-wrap="front" style="left: 5px; top: 6px; width: 80px"><svg></svg></span></p>'), '<p>ก<span data-shape="heart" data-ar="2" data-wrap="front" style="left: 5px; top: 6px; width: 80px" contenteditable="false"></span></p>');
  assert.equal(c('<p><span data-wrap="front" style="color: red">x</span></p>'), '<p><span style="color: red">x</span></p>');
  assert.ok(!flowIsEmpty('<p><img src="x"></p>') && !flowIsEmpty('<p><span data-shape="star"></span></p>'), 'รูป/รูปร่างอย่างเดียวไม่ใช่เอกสารว่าง');
  // ช่องเลขหน้าในหัว/ท้ายกระดาษ: เก็บแค่ช่อง ข้างในทิ้ง, ย้ายเลขหน้าเข้าหัวกระดาษ, เอาออกได้
  assert.equal(c('<p>หน้า <span data-pg="1" onclick="x"><b>9</b></span></p>'), '<p>หน้า ' + PAGE_FIELD + '</p>');
  assert.ok(!flowIsEmpty('<p>' + PAGE_FIELD + '</p>'));
  const wo = { ...defaultWordOpt(), num: 'top' as const, head: '<p>คณิต</p>' };
  const hh = withPageField(wo, 'head');
  assert.ok(hh.startsWith('<p>คณิต</p>') && hh.includes(PAGE_FIELD) && withPageField(wo, 'foot') === '');
  assert.equal(withPageField({ ...wo, head: hh }, 'head'), hh, 'ไม่ใส่ช่องซ้ำ');
  assert.equal(stripPageField(c(hh)), '<p>คณิต</p>');
  assert.equal(c('<p><span data-pg="1" style="font-size: 28px; font-family: var(--sf-angsana); position: fixed">9</span></p>'), '<p><span data-pg="1" style="font-size: 28px; font-family: var(--sf-angsana)" contenteditable="false">#</span></p>', 'ช่องเลขหน้าเก็บฟอนต์/ขนาดของตัวเอง');
  // ฟอนต์เก็บแบบไม่ผูกกับ build: ชื่อ next/font และชื่อจาก Word แปลงเป็น var(--sf-...)
  assert.equal(c('<p><span style="font-family: &quot;TH SarabunPSK&quot;, &quot;TH Sarabun New&quot;, __Sarabun_7b1c3a, __Sarabun_Fallback_7b1c3a">ก</span></p>'), '<p><span style="font-family: var(--sf-thsarabun)">ก</span></p>');
  assert.equal(c('<span style="font-family: __Chakra_Petch_9f2e1d, __Chakra_Petch_Fallback_9f2e1d">x</span>'), '<span style="font-family: var(--sf-chakra)">x</span>');
  assert.equal(c('<span style="font-family: Arial">x</span>'), '<span style="font-family: Arial">x</span>');
  assert.equal(pageLabel(o, 0, 4), 'หน้า 3 จาก 6');
  assert.equal(pageLabel({ ...o, numFmt: 'thai' }, 9, 10), '๑๒');
  assert.equal(cleanWordOpt({ num: 'side', numFmt: 'x', numStart: 1.5 }).num, 'none');
});

t('สูตร: ภาษาไทยในสูตรวาดได้ (ห่อเป็นข้อความ) และ \middle ของช่องสูตร', () => {
  const src = String.raw`A\times B=\left\lbrace a\,\middle{\vert}\,a\in Aและb\in B\right\rbrace`;
  const p = prepTex(src);
  assert.ok(p.includes('\\text{และ}') && p.includes('\\middle\\vert') && !p.includes('\\middle{'));
  assert.doesNotThrow(() => katex.renderToString(p, { throwOnError: true, strict: 'ignore' }));
  // ข้อความที่อยู่ใน \text อยู่แล้วไม่ห่อซ้ำ
  assert.equal(prepTex(String.raw`\text{ร้อยละ}=\frac{ส่วน ทั้งหมด}{2}`), String.raw`\text{ร้อยละ}=\frac{\text{ส่วน ทั้งหมด}}{2}`);
  assert.equal(prepTex('x+y'), 'x+y');
});

t('คัดลอกไป Word: สมการแปลงเป็น OMML ของ Word', () => {
  const om = (tex: string) => mathmlToOmml(katex.renderToString(tex, { output: 'mathml' }));
  const q = om(String.raw`x=\frac{-b\pm\sqrt{b^{2}-4ac}}{2a}`);
  assert.ok(q.startsWith('<m:oMath xmlns:m="http://schemas.microsoft.com/office/2004/12/omml">'));
  assert.ok(q.includes('<m:f><m:num>') && q.includes('<m:rad>') && q.includes('<m:sSup>'));
  assert.ok(!q.includes('annotation') && !q.includes('frac'), 'ไม่มีต้นฉบับ LaTeX ปนในสมการ');
  assert.ok(om(String.raw`\sqrt[3]{8}`).includes('<m:deg><m:r><m:t xml:space="preserve">3</m:t></m:r></m:deg>'));
  assert.ok(om(String.raw`\sum_{i=1}^{n} i`).includes('<m:nary>'));
  assert.ok(om(String.raw`\begin{bmatrix}1&2\\3&4\end{bmatrix}`).includes('<m:m><m:mr>'));
  assert.ok(om('a<b').includes('&lt;'), 'อักขระพิเศษถูก escape');
  assert.equal(mathmlToOmml('ไม่ใช่สมการ'), '');
});

t('แป้นลัด: แปลงปุ่ม เช็กซ้ำ/ห้ามใช้ และตั้งแม่แบบสมการ', () => {
  const ev = (code: string, m: Partial<{ ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey: boolean }> = {}) => ({ ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, code, ...m });
  assert.equal(comboOf(ev('KeyE', { ctrlKey: true })), 'Ctrl+KeyE');
  assert.equal(comboOf(ev('KeyE', { metaKey: true, shiftKey: true })), 'Ctrl+Shift+KeyE');
  assert.equal(comboOf(ev('ControlLeft', { ctrlKey: true })), null);
  assert.equal(comboLabel('Ctrl+Shift+Period'), 'Ctrl + Shift + .');
  assert.equal(new Set(WORD_KEYS.map((k) => k.combo)).size, WORD_KEYS.length, 'แป้นลัด Word ห้ามซ้ำกันเอง');
  const s = { ...MATH_DEFAULTS };
  assert.equal(conflictOf(s, 'Ctrl+KeyC', 'x')?.kind, 'reserved');
  assert.equal(conflictOf(s, 'KeyQ', 'x')?.kind, 'reserved');
  assert.equal(conflictOf(s, 'Enter', 'x')?.kind, 'reserved');
  const frac = '\\frac{#0}{#?}';
  assert.deepEqual(conflictOf(s, s[frac], '\\sqrt{#0}'), { kind: 'math', ins: frac });
  assert.equal(conflictOf(s, s[frac], frac), null, 'ปุ่มเดิมของตัวเองไม่นับว่าซ้ำ');
  const s2 = assignMath(s, '\\sqrt{#0}', s[frac]);
  assert.equal(s2['\\sqrt{#0}'], 'Ctrl+KeyF');
  assert.equal(s2[frac], undefined, 'ตัวที่ซ้ำถูกปิด');
  assert.equal(mathKeyOf(s2, 'Ctrl+KeyF'), '\\sqrt{#0}');
});

t('กราฟ: รูปทรงเฉพาะสร้างสมการที่วาดได้ และค่าจากตัวกรองตรงกับรูปทรง', () => {
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  const cases: [GShape, number, number][] = [
    // จุดที่ต้องอยู่บนเส้น (สมการ implicit = 0 / y = f(x))
    [{ ...defaultShape('circle'), h: -1, v: 2, r: 2.5 }, 1.5, 2],
    [{ ...defaultShape('ellipse'), h: 1, a: 4, b: 2 }, 5, 0],
    [{ ...defaultShape('ellipse'), h: 1, a: 4, b: 2, vert: true }, 3, 0],
    [{ ...defaultShape('hyperbola'), a: 2, b: 3 }, 2, 0],
    [{ ...defaultShape('hyperbola'), a: 2, b: 3, vert: true, v: -2 }, 0, 0],
  ];
  for (const [s, x, y] of cases) {
    const r = parseEquation(shapeText(s));
    assert.ok(r.ok && r.kind === 'implicit', shapeText(s));
    if (r.ok) assert.ok(near(r.fn(x, y, {}), 0), `${shapeText(s)} @ (${x}, ${y})`);
  }
  const par = parseEquation(shapeText({ ...defaultShape('parabola'), a: -0.5, h: 2, v: 1 }));
  assert.ok(par.ok && par.kind === 'y' && near(par.fn(4, 0, {}), -1), 'พาราโบลา y = -0.5(x-2)^2 + 1');
  const px = parseEquation(shapeText({ ...defaultShape('parabolaX'), a: 0.25, h: -3 }));
  assert.ok(px.ok, 'พาราโบลาตะแคง');
  const ln = parseEquation(shapeText({ ...defaultShape('line'), a: -2, b: 3 }));
  assert.ok(ln.ok && near(ln.fn(1, 0, {}), 1), 'เส้นตรง y = -2x + 3');
  assert.ok(parseEquation(shapeText({ ...defaultShape('line'), a: 0, b: 3 })).ok, 'เส้นตรงแนวนอน');
  // ตัวกรอง: ครึ่งแกนติดลบกลายเป็นบวก และสมการถูกสร้างใหม่จากรูปทรง (แก้ข้อความเองไม่ได้)
  const g = cleanGraph({ objs: [{ kind: 'expr', text: 'y = evil', shape: { k: 'ellipse', a: -3, b: 2 } }] });
  const e = g.objs[0];
  assert.ok(e.kind === 'expr' && e.shape?.a === 3 && e.text === shapeText(e.shape));
  assert.ok(shapeFacts({ ...defaultShape('ellipse'), a: 5, b: 3 }).some((f) => f.includes('(-4, 0)') && f.includes('(4, 0)')), 'โฟกัสวงรี');
  // สูตรจาก MathType เป็นสมการกราฟ
  const tq = (tex: string, x: number) => {
    const r = parseEquation(texToExpr(tex));
    assert.ok(r.ok, tex + ' -> ' + texToExpr(tex));
    return r.ok ? r.fn(x, 0, {}) : NaN;
  };
  assert.ok(near(tq('y=\\frac{1}{2}x^{2}', 4), 8));
  assert.ok(near(tq('y=\\sqrt{x}+\\left(x-1\\right)', 9), 11));
  assert.ok(near(tq('y=\\sqrt[3]{x}', 27), 3));
  assert.ok(near(tq('y=2\\cdot\\sin\\left(\\pi x\\right)', 0.5), 2));
  assert.ok(near(tq('y=\\dfrac{x+1}{\\frac{1}{2}}', 1), 4));
  // รูปวาดอิสระ: ตัวกรองรับเฉพาะพิกัดตัวเลข สีผิดถูกแทน และวาดออกมาเป็น SVG
  const dg = cleanGraph({ objs: [{ kind: 'draw', shape: 'rect', pts: [[10, 10], ['x', 3], [90, 60]], color: 'red;evil', fill: '#ff0000' }, { kind: 'draw', shape: 'line', pts: [[1, 1]] }] });
  assert.equal(dg.objs.length, 1);
  const d0 = dg.objs[0];
  assert.ok(d0.kind === 'draw' && d0.pts.length === 2 && d0.color !== 'red;evil');
  assert.ok(graphToSvg(dg).includes('<rect x="10" y="10" width="80" height="50"'));
});

console.log('นำเข้าไฟล์ Word / MathType / ข้อความ');
t('OMML ของ Word เป็น LaTeX (เศษส่วน ยกกำลัง ราก วงเล็บ ผลรวม ภาษาไทย)', () => {
  const om = (xml: string) => ommlToTex(parseXml(`<m:oMath>${xml}</m:oMath>`).kids[0]);
  const r = (s: string, sty = '') => `<m:r>${sty ? `<m:rPr><m:sty m:val="${sty}"/></m:rPr>` : ''}<m:t>${s}</m:t></m:r>`;
  assert.equal(om(`<m:f><m:num>${r('1')}</m:num><m:den>${r('2')}</m:den></m:f>`), '\\frac{1}{2}');
  assert.equal(om(`<m:sSup><m:e>${r('x')}</m:e><m:sup>${r('2')}</m:sup></m:sSup>`), '{x}^{2}');
  assert.equal(om(`<m:sSub><m:e>${r('a')}</m:e><m:sub>${r('n')}</m:sub></m:sSub>`), '{a}_{n}');
  assert.equal(om(`<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${r('x')}</m:e></m:rad>`), '\\sqrt{x}');
  assert.equal(om(`<m:rad><m:deg>${r('3')}</m:deg><m:e>${r('8')}</m:e></m:rad>`), '\\sqrt[3]{8}');
  assert.ok(om(`<m:d><m:e>${r('x+1')}</m:e></m:d>`).startsWith('\\left( x+1'));
  assert.equal(om(`<m:d><m:dPr><m:begChr m:val="{"/><m:endChr m:val=""/></m:dPr><m:e>${r('x')}</m:e></m:d>`), '\\left\\{ x \\right.');
  const sum = om(`<m:nary><m:naryPr><m:chr m:val="∑"/></m:naryPr><m:sub>${r('i=1')}</m:sub><m:sup>${r('n')}</m:sup><m:e>${r('i')}</m:e></m:nary>`);
  assert.equal(sum, '\\sum_{i=1}^{n} i');
  assert.equal(om(r('2×3≤π')), '2\\times 3\\le \\pi');
  // ภาษาไทยในสมการอยู่ใน \text{} (KaTeX วาดได้) และชื่อฟังก์ชันเป็นตัวตรง
  assert.equal(om(r('พื้นที่') + r('=') + r('ab')), '\\text{พื้นที่}=ab');
  assert.equal(om(`<m:func><m:fName>${r('sin', 'p')}</m:fName><m:e>${r('x')}</m:e></m:func>`), '\\sin x');
  for (const tex of ['\\frac{1}{2}', sum, '\\text{พื้นที่}=ab']) katex.renderToString(tex, { throwOnError: true, strict: 'ignore' });
});
t('MathType (MTEF v5) เป็น LaTeX', () => {
  const s = (str: string) => [...Buffer.from(str, 'latin1'), 0];
  const ch = (c: string, face = 131) => [2, 0, face, c.charCodeAt(0), 0];
  const bytes = [
    ...[5, 1, 0, 7, 4], ...s('DSMT7'), 1,
    1, 0,
    ...ch('x'),
    3, 0, 29, 0, 0, 1, 1, 1, 0, ...ch('2', 136), 0, 0,
    ...ch('+', 134),
    3, 0, 11, 0, 0, 1, 0, ...ch('1', 136), 0, 1, 0, ...ch('2', 136), 0, 0,
    0,
    0,
  ];
  assert.equal(mtefToTex(new Uint8Array(bytes)), 'x^{2}+\\frac{1}{2}');
  assert.equal(mtefToTex(new Uint8Array([9, 9, 9])), null);
  assert.equal(oleEquationTex(new Uint8Array(600)), null);
});
t('ข้อความ/Markdown: สูตร $...$ เป็นช่องสมการ หัวข้อ รายการ ตาราง', () => {
  const h = textToFlow('# บทที่ 1\nพื้นที่ $\\frac{1}{2}bh$ ตร.ซม.\n- ข้อแรก **สำคัญ**\n- ข้อสอง\n\n$$x^2+1$$\n| a | b |\n|---|---|\n| 1 | 2 |', true);
  assert.ok(h.includes('font-weight: bold">บทที่ 1</p>'));
  assert.ok(h.includes('<span data-tex="\\frac{1}{2}bh"></span>'));
  assert.ok(h.includes('<ul><li>ข้อแรก <b>สำคัญ</b></li><li>ข้อสอง</li></ul>'));
  assert.ok(h.includes('<p style="text-align: center"><span data-tex="x^2+1"></span></p>'));
  assert.ok(h.includes('<table><tbody><tr><td><p>a</p></td>'));
  const clean = cleanFlowHtml(h, () => '');
  assert.ok(clean.includes('data-tex="\\frac{1}{2}bh" contenteditable="false"'));
  assert.equal(textToFlow('<b>x</b>', false), '<p>&lt;b&gt;x&lt;/b&gt;</p>');
});
t('ตัดเนื้อหาที่ยาวเกินที่รอยต่อบล็อก (ไม่ตัดกลางตาราง)', () => {
  const html = '<p>a</p><table><tbody><tr><td><p>b</p></td></tr></tbody></table><p>c</p>';
  assert.equal(cutBlocks(html, 1000), html);
  assert.equal(cutBlocks(html, 30), '<p>a</p>');
  assert.equal(cutBlocks(html, html.length - 2), '<p>a</p><table><tbody><tr><td><p>b</p></td></tr></tbody></table>');
});

// ไฟล์ docx จำลอง (มีสมการ Word + ภาษาไทย + ตัวหนา + กึ่งกลาง + ตาราง)
(async () => {
  const zip = new JSZip();
  zip.file(
    'word/document.xml',
    `<?xml version="1.0"?><w:document xmlns:w="w" xmlns:m="m"><w:body>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr><w:t>ใบงาน</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">หาค่า </w:t></w:r><m:oMath><m:f><m:num><m:r><m:t>3</m:t></m:r></m:num><m:den><m:r><m:t>4</m:t></m:r></m:den></m:f></m:oMath></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>ก</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:gridSpan w:val="2"/></w:tcPr><w:p><w:r><w:t>ข</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:sectPr><w:pgMar w:top="1440" w:bottom="1440" w:left="1800" w:right="1800"/></w:sectPr></w:body></w:document>`
  );
  const r = await docxToFlow(await zip.generateAsync({ type: 'uint8array' }), async () => '');
  const html = cleanFlowHtml(r.html, () => '');
  assert.ok(html.includes('<p style="text-align: center"><span style="font-size: 26.67px; font-weight: bold">ใบงาน</span></p>'), html);
  assert.ok(html.includes('หาค่า <span data-tex="\\frac{3}{4}" contenteditable="false"></span>'));
  // ไม่มีสไตล์ตาราง = ไม่มีเส้น (แบบ Normal Table ของ Word) ระยะในช่องแบบ Word
  assert.ok(html.includes('<td style="padding: 0px 7px; border: none" colspan="2"><p>ข</p></td>'), html);
  assert.deepEqual(r.margins, { mt: 96, mb: 96, ml: 120, mr: 120 });
  assert.equal(r.stats.equations, 1);
  passed++;
  console.log('  ok  ไฟล์ Word จำลองนำเข้าครบ (สมการ ตัวหนา ขนาด กึ่งกลาง ตาราง ระยะขอบ)');

  // รูปแบบจากไฟล์ Word: แท็บ ระยะย่อหน้า เส้นขอบ รูปลอยยึดย่อหน้า ขนาดสมการ (ผ่านตัวกรอง ห้ามเกินที่อนุญาต)
  {
    const c = (h: string) => cleanFlowHtml(h, (v) => (v.startsWith('https://ok/') ? v : ''));
    assert.equal(c('<p data-tabs="l47 c301 d48" style="padding-top: 4px; padding-bottom: 11px; border-top: 1px solid #000000"><span data-tab="1">x<b>y</b></span>a</p>'), '<p data-tabs="l47 c301 d48" style="padding-top: 4px; padding-bottom: 11px; border-top: 1px solid #000000"><span data-tab="1" contenteditable="false"></span>a</p>');
    assert.equal(c('<p data-tabs="x1 onload">a</p>'), '<p>a</p>', 'ตำแหน่งแท็บผิดรูปแบบ = ทิ้ง');
    assert.equal(c('<p><img src="https://ok/a.png" data-rel="p" data-wrap="behind" style="width: 20px; left: -3px; top: 4px"><span data-rel="p">b</span></p>'), '<p><img src="https://ok/a.png" data-rel="p" data-wrap="behind" style="width: 20px; left: -3px; top: 4px"><span>b</span></p>');
    assert.equal(c('<span data-tex="x" data-w="12" style="font-size: 17px; color: red"></span>'), '<span data-tex="x" data-w="12" style="font-size: 17px" contenteditable="false"></span>');
    assert.equal(c('<span data-tex="x" data-w="12x" style="border: 1px solid url(x)"></span>'), '<span data-tex="x" contenteditable="false"></span>');
    const tb = parseTabs('l47 c301 r450 d40');
    assert.equal(tabWidth(10, 0, tb), 37);
    assert.equal(tabWidth(100, 20, tb), 191, 'แท็บกลาง: ข้อความอยู่กึ่งกลางตำแหน่ง');
    assert.equal(tabWidth(400, 30, tb), 20, 'แท็บขวา: ข้อความชิดขวาที่ตำแหน่ง');
    assert.equal(tabWidth(460, 0, tb), 20, 'เลยตำแหน่งสุดท้าย = ระยะแท็บตั้งต้น');
    passed++;
    console.log('  ok  รูปแบบจาก Word (แท็บ ระยะย่อหน้า รูปลอย ขนาดสมการ) ผ่านตัวกรอง');
  }
  {
    const { TEMPLATES, TEMPLATE_CATS } = await import('../src/components/studio/templates');
    const { BORDER_IDS, EDU_IDS, FONT_IDS } = await import('../src/lib/studio/doc');
    const fs = await import('node:fs');
    // อ่าน id จากไฟล์ตรงๆ (stickers.tsx มี JSX ไม่ import ในสคริปต์นี้)
    const idsIn = (f: string) => new Set([...fs.readFileSync(f, 'utf8').matchAll(/id: '([a-z0-9-]+)'/g)].map((m) => m[1]));
    const stickers = idsIn('src/components/studio/stickers.tsx');
    const shapes = idsIn('src/components/studio/shapes.ts');
    const cats = new Set<string>(TEMPLATE_CATS.map((c) => c.id));
    assert.ok(TEMPLATES.length >= 100, `แม่แบบ ${TEMPLATES.length}`);
    assert.equal(new Set(TEMPLATES.map((t) => t.id)).size, TEMPLATES.length, 'id แม่แบบซ้ำ');
    for (const t of TEMPLATES) {
      assert.ok(cats.has(t.cat), `${t.id}: หมวด ${t.cat}`);
      const d = t.make();
      assert.equal(d.size.id, t.sizeId, `${t.id}: ขนาดหน้า`);
      for (const p of d.pages) {
        assert.ok((BORDER_IDS as readonly string[]).includes(p.border.style), `${t.id}: กรอบ ${p.border.style}`);
        for (const it of p.items) {
          const where = `${t.id}/${it.type}@${Math.round(it.x)},${Math.round(it.y)}`;
          if (it.type === 'sticker') assert.ok(stickers.has(it.sticker), `${where}: สติกเกอร์ ${it.sticker}`);
          if (it.type === 'shape') assert.ok(shapes.has(it.shape), `${where}: รูปทรง ${it.shape}`);
          if (it.type === 'edu') assert.ok((EDU_IDS as readonly string[]).includes(it.kind), `${where}: ${it.kind}`);
          if (it.type === 'text') assert.ok((FONT_IDS as readonly string[]).includes(it.font), `${where}: ฟอนต์ ${it.font}`);
          if (it.type === 'table') assert.ok(it.cells.every((r) => r.length === it.cells[0].length), `${where}: แถวตารางยาวไม่เท่ากัน`);
          if (it.rot) continue; // ชิ้นที่หมุน (เส้นเฉียง/ข้อความกลับหัว) ตรวจด้วยตา
          assert.ok(it.x >= -0.5 && it.y >= -0.5 && it.x + it.w <= d.size.w + 0.5 && it.y + it.h <= d.size.h + 0.5, `${where}: ล้นหน้า ${it.w}x${it.h}`);
        }
      }
    }
    passed++;
    console.log(`  ok  แม่แบบ ${TEMPLATES.length} แบบ: id/หมวด/สติกเกอร์/รูปทรง/ฟอนต์ถูกต้อง และไม่ล้นหน้า`);
  }
  console.log(`\n${passed} tests passed`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
