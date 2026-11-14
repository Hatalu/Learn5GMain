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
import { buildDict, checkText, ruleCheck, suggest } from '../src/lib/studio/thaiSpell';
import { FONT_IDS } from '../src/lib/studio/doc';
import katex from 'katex';
import { MATH_DEFAULTS, WORD_KEYS, assignMath, comboLabel, comboOf, conflictOf, mathKeyOf } from '../src/lib/studio/keys';
import { FREE_SET_LIMIT, FREE_UPLOAD_MB, MEMBER_UPLOAD_MB, creatorTier, fmtMB, quotaBytes, setsUsed } from '../src/lib/game-creator/quota';
import { normalizeGmail, signupSchema } from '../src/lib/validations/signup';
import { SHOWCASE_MAX, showcaseRows } from '../src/lib/game-creator/showcase';
import { bkkParts, eventOf, phaseOf, seasonOf } from '../src/lib/bkk-time';
import { hasMembership } from '../src/lib/membership';
import { CircleDraw, Swipe } from '../src/lib/game-creator/ar/inputs';
import { CODE_ABC, isCode, makeCode, normCode } from '../src/lib/redeem';
import { crc16, promptPayKind, promptPayPayload, maskPromptPay } from '../src/lib/promptpay';
import { extendUntil, maskedMatch, nameMatch, receiverMatches } from '../src/lib/server/payments';
import { NO_OFFER, PLANS, comparePrice, perDay, quote, saveBaht, welcomePrice } from '../src/lib/plans';
import { checkUnsubscribeToken, unsubscribeToken, winbackEmail } from '../src/lib/server/email';
import { MEMBER_PLAY_SECONDS, TRIAL_GRACE_SECONDS, TRIAL_SECONDS, signTrialToken, trialPublicJwk, verifyTrialToken } from '../src/lib/server/trial';
import { TURF_CELLS, cleanModeSettings, isWorldMode, modeFit, modeQuiz, scoreCap } from '../src/lib/game-creator/modes';
import { BOSS_SPEED, EGG_BIOMES, EGG_MAX_VALUE, EGG_SLOTS_RARITY, RARITY, SIZE_MAX, SIZE_MIN, eggEpoch, eggKg, pickEggType, takeWins } from '../src/lib/game-creator/eggValues';
import { GEAR_BASE } from '../src/lib/game-creator/gear';
import { BodySmoother, Dwell, Follow, Hold, OneEuro, aimFromHand, arAnswerPoints, arStars, assignSides, bothUp, raised, tip, toBody, toScreen, type Body, type Lm } from '../src/lib/game-creator/arPose';
import { AR_DEFAULTS, arQuery, parseArSettings } from '../src/lib/game-creator/arSettings';
import { Clap, DEFAULT_MOTIONS, Gestures, chargePose, jumping, leanOf, motionOn, shieldPose, spreadPose, victoryPose } from '../src/lib/game-creator/ar/gestures';
import { LANDS, MAGIC_BOSSES, PETS, SPELLS, answerPoints as mkPoints, bossHpFor, bossStart, cleanLook as mkCleanLook, effects as mkEffects, landOpen, landStars, nextLand, nextSpell, openSpells, pickAtk as mkPickAtk, spellDamage } from '../src/lib/game-creator/magic/data';
import { EMPTY_MAGIC, cleanMagic } from '../src/lib/game-creator/magic/save';
import * as OG from '../src/lib/game-creator/ocean/data';
import { EMPTY_OCEAN, cleanOcean } from '../src/lib/game-creator/ocean/save';
import * as GH from '../src/lib/game-creator/ghost/data';
import { EMPTY_GHOST, cleanGhost } from '../src/lib/game-creator/ghost/save';
import { BOSSES, bossById, bossHp, bossQuestions, defended, pickAttack, shotDamage } from '../src/lib/game-creator/ar/boss';
import { Combo } from '../src/lib/game-creator/ar/combo';
import { POWERS, Powers, earnedPowers } from '../src/lib/game-creator/ar/powerups';
import { cleanUps, upCost, upEffects } from '../src/lib/game-creator/ar/upgrades';
import { ALL_STAGES, nextStage, unlocked } from '../src/lib/game-creator/ar/map';
import { ZERO_STATS, addStats, allCorrectRounds, cleanMission, dailyFor, stageQuests } from '../src/lib/game-creator/ar/missions';
import { memberOf, ranks, teamMode, teamOf } from '../src/lib/game-creator/ar/teams';
import { EMPTY_SAVE, cleanSave, rollDay } from '../src/lib/game-creator/ar/save';
import { Quality, faceScore, pickBody, toLock } from '../src/lib/game-creator/ar/quality';
import { HATS2, ITEMS2, MASKS2, OUTFITS2 } from '../src/components/creator/gearExtra';
import { endlessIndex } from '../src/lib/game-creator/quiz';
import { SHEET_HEAD, TEMPLATE_ROWS, buildCsv, decodeText, parseCsv, quizToRows, richToCell, rowsToQuestions, xlsxRows } from '../src/lib/game-creator/quizSheet';
import {
  checkAnswer,
  isTimeout,
  playableQuiz,
  publicQuestion,
  quickCheck,
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
import { STICKERS, STICKER_CATS, stickerById } from '../src/components/studio/stickers';
import { MORE_STICKERS } from '../src/components/studio/stix';

let passed = 0;
const t = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};
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

console.log('ห้องเลี้ยงปุ๋ง/ปริศนา/รายงาน');
t('ผลงานครูหน้าแรก: ไม่ส่งเฉลย/ชื่อเจ้าของ ตัดของซ้ำ ของน้อยไม่โชว์', () => {
  const row = (i: number, extra = {}) => ({ id: 'g' + i, title: 'ชุด ' + i, question_count: 10, cover_url: null, content: { secret: 1 }, owner_name: 'ครู', ...extra });
  assert.deepEqual(showcaseRows([row(1), row(2)]), []);
  const out = showcaseRows([row(1), row(1), row(2), row(3), row(4, { title: 'ทดสอบ' }), row(5, { question_count: 2 })]);
  assert.deepEqual(out.map((x) => x.id), ['g1', 'g2', 'g3']);
  for (const x of out) assert.deepEqual(Object.keys(x).sort(), ['cover_url', 'id', 'question_count', 'title']);
  assert.equal(showcaseRows(Array.from({ length: 30 }, (_, i) => row(i))).length, SHOWCASE_MAX);
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
  // ลิมิต/ปริพันธ์/ยกกำลัง ไม่หลุดเป็น "_x 4..." แบบเดิม
  assert.equal(texToPlain('\\lim_{x\\to 4}(-3x - 1)=?'), 'lim(x→4) (-3x - 1)=?');
  assert.equal(texToPlain('\\lim_{x\\to 3}\\frac{x^2-9}{x-3}=?'), 'lim(x→3) (x²-9)/(x-3)=?');
  assert.equal(texToPlain('\\int_{0}^{5}8x\\,dx=?'), '∫[0→5] 8x dx=?');
  assert.equal(texToPlain('\\int_{0}^{4}3x^{2}\\,dx=?'), '∫[0→4] 3x² dx=?');
  assert.equal(texToPlain('\\log_{2}32-\\log_{2}4'), 'log₂32-log₂4');
  assert.equal(texToPlain('\\det\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}'), 'det[1 2; 3 4]');
  assert.equal(texToPlain('x^{10}+y_{n+1}\\le\\pi'), 'x¹⁰+yₙ₊₁≤π');
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
  assert.deepEqual(cleanModeSettings('cafe', { duration: 300 }), { duration: 300, goal: 0, teams: 0, reset: 0 });
  assert.deepEqual(cleanModeSettings('cafe', { duration: 99999 }), { duration: 300, goal: 0, teams: 0, reset: 0 });
  assert.deepEqual(cleanModeSettings('racing', { goal: 20 }), { duration: 0, goal: 20, teams: 0, reset: 0 });
  assert.deepEqual(cleanModeSettings('racing', { goal: -5 }), { duration: 0, goal: 15, teams: 0, reset: 0 });
  assert.deepEqual(cleanModeSettings('quiz', { duration: 300, goal: 20 }), { duration: 0, goal: 0, teams: 0, reset: 0 });
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
  assert.deepEqual(cleanModeSettings('brawl', { duration: 600 }), { duration: 600, goal: 0, teams: 0, reset: 0 });
  assert.deepEqual(cleanModeSettings('fishing', { duration: 1 }), { duration: 300, goal: 0, teams: 0, reset: 0 });
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
  // สติกเกอร์ชุดเพิ่ม 300+ (4 พ.ย. 2026): ค้นหาได้ทุกตัว ไม่มีอิโมจิ หมวดมีอยู่จริง
  assert.ok(MORE_STICKERS.length >= 300 && STICKERS.length >= 400, `stickers ${STICKERS.length}`);
  const cats = new Set(STICKER_CATS.map((c) => c.id));
  for (const st of STICKERS) {
    assert.ok(st.label.trim() && cats.has(st.cat), st.id);
    assert.ok(!/\p{Extended_Pictographic}|[↔☐]/u.test(`${st.label} ${st.tags ?? ''}`), st.id);
  }
  for (const st of MORE_STICKERS) assert.ok(st.tags?.trim(), `${st.id}: tags`);
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
    const stickers = new Set(STICKERS.map((x) => x.id));
    const shapes = idsIn('src/components/studio/shapes.ts');
    const cats = new Set<string>(TEMPLATE_CATS.map((c) => c.id));
    assert.ok(TEMPLATES.length >= 340, `แม่แบบ ${TEMPLATES.length}`);
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
  {
    // ขโมยไข่บอสหลับ: ตารางไข่ 11 ชนิด, สุ่มชนิดตรงระดับ, ใครขโมยก่อนได้ไป, เพดานคะแนน
    assert.equal(EGG_SLOTS_RARITY.length, 11);
    assert.deepEqual(['common', 'rare', 'legend', 'secret'].map((r) => EGG_SLOTS_RARITY.filter((x) => x === r).length), [5, 3, 2, 1]);
    assert.equal(EGG_SLOTS_RARITY[pickEggType(0, 0)], 'common');
    assert.equal(EGG_SLOTS_RARITY[pickEggType(0.999, 0.5)], 'secret');
    for (let i = 0; i < 500; i++) {
      const t = pickEggType(Math.random(), Math.random());
      assert.ok(t >= 0 && t < 11);
    }
    assert.ok(takeWins(100, 5, 200, 1) && !takeWins(200, 1, 100, 5) && takeWins(100, 1, 100, 5) && !takeWins(100, 5, 100, 1));
    assert.ok(isWorldMode('egg'));
    // น้ำหนัก: ไบโอมไกล/หายาก/ใหญ่ = หนักกว่า, ไม่เกินเพดาน
    assert.ok(eggKg(4, 10, SIZE_MAX) === EGG_MAX_VALUE || eggKg(4, 10, SIZE_MAX) <= EGG_MAX_VALUE);
    assert.ok(eggKg(0, 0, SIZE_MIN) >= 1);
    for (let t = 1; t < EGG_BIOMES; t++) assert.ok(eggKg(t, 0, 1) > eggKg(t - 1, 0, 1) && BOSS_SPEED[t] > BOSS_SPEED[t - 1]);
    assert.ok(eggKg(2, 10, 1) > eggKg(2, 8, 1) && eggKg(2, 8, 1) > eggKg(2, 5, 1) && eggKg(2, 5, 1) > eggKg(2, 0, 1));
    assert.ok(eggKg(1, 0, SIZE_MAX) > eggKg(1, 0, SIZE_MIN));
    assert.ok(scoreCap('egg', 3) >= 3 * EGG_MAX_VALUE);
    assert.equal(eggEpoch(1000 + 119999, 1000, 120), 0);
    assert.equal(eggEpoch(1000 + 120000, 1000, 120), 1);
    assert.equal(cleanModeSettings('egg', { reset: 180 }).reset, 180);
    assert.equal(cleanModeSettings('egg', { reset: 7 }).reset, 120);
    // แฟชั่นชุดที่ 2: ชื่อกับภาพต้องครบคู่กัน
    const n = (k: 'h' | 'o' | 'm' | 'i') => GEAR_SLOTS.find((x) => x.key === k)!.items.length;
    assert.equal(n('h'), GEAR_BASE.h + HATS2.length);
    assert.equal(n('o'), GEAR_BASE.o + OUTFITS2.length);
    assert.equal(n('m'), GEAR_BASE.m + MASKS2.length);
    assert.equal(n('i'), GEAR_BASE.i + ITEMS2.length);
    assert.ok([HATS2, OUTFITS2, MASKS2, ITEMS2].every((a) => a.length >= 30));
    passed++;
    console.log('  ok  ขโมยไข่: ตารางไข่ น้ำหนักตามไบโอม/ขนาด รอบไข่ ตัดสินขโมยพร้อมกัน เพดานคะแนน + แฟชั่นครบคู่');
  }
  {
    // สงครามอวกาศ AR: แปลงพิกัดกล้อง (cover + กระจก), เลือกมือ, กรอบเอื้อม, ค้างเป้า, แบ่งทีม, คัดข้อเลือกตอบ
    // วิดีโอ 1280x720 บนจอ 800x800 แบบ cover: scale 1.111, ตัดซ้ายขวา (1422-800)/2 = 311px
    const view = { vw: 1280, vh: 720, cw: 800, ch: 800, mirror: true };
    const c = toScreen(0.5, 0.5, view);
    assert.ok(Math.abs(c.x - 400) < 1e-6 && Math.abs(c.y - 400) < 1e-6);
    const l = toScreen(0.25, 0, { ...view, mirror: false });
    assert.ok(Math.abs(l.x - (-311.11 + 0.25 * 1422.22)) < 0.05 && Math.abs(l.y) < 1e-6);
    // กระจก: ซ้ายของกล้อง = ขวาของจอ
    assert.ok(toScreen(0.2, 0.5, view).x > 400 && toScreen(0.8, 0.5, view).x < 400);

    // ร่างจำลอง (พิกัดกล้อง ก่อนกลับกระจก) ไหล่ที่ x 0.45/0.55 y 0.5
    const pose = (cx: number, opt: { lHandY?: number; rHandY?: number } = {}): Lm[] => {
      const L: Lm[] = Array.from({ length: 33 }, () => ({ x: cx, y: 0.5, visibility: 0.2 }));
      const set = (i: number, x: number, y: number) => (L[i] = { x, y, visibility: 0.95 });
      set(0, cx, 0.36);
      set(11, cx + 0.05, 0.5);
      set(12, cx - 0.05, 0.5);
      set(13, cx + 0.09, 0.62);
      set(14, cx - 0.09, 0.62);
      set(15, cx + 0.1, opt.lHandY ?? 0.75);
      set(16, cx - 0.1, opt.rHandY ?? 0.75);
      set(23, cx + 0.04, 0.8);
      set(24, cx - 0.04, 0.8);
      return L;
    };
    assert.equal(toBody(pose(0.5).map((p, i) => (i === 11 ? { ...p, visibility: 0.1 } : p)), view), null);
    const down = toBody(pose(0.5), view)!;
    assert.ok(down && down.sw > 50);
    // ปล่อยแขนข้างตัว = ไม่เล็ง, ยกมือ = เล็ง (สองมือแยกกัน)
    assert.ok(!raised(down, 'l') && !raised(down, 'r'));
    const both = toBody(pose(0.5, { rHandY: 0.4, lHandY: 0.38 }), view)!;
    assert.ok(raised(both, 'l') && raised(both, 'r'));
    assert.ok(bothUp(toBody(pose(0.5, { rHandY: 0.2, lHandY: 0.2 }), view)!));
    assert.ok(!bothUp(both));
    // จุดเล็งตรงมือพอดี (gain 1) และสองมือเล็งคนละจุดได้พร้อมกัน
    const full = { x: 0, y: 0, w: 800, h: 800 };
    const tr = tip(both, 'r')!;
    const ar = aimFromHand(both, 'r', 1, full)!;
    const al = aimFromHand(both, 'l', 1, full)!;
    assert.ok(Math.abs(ar.x - tr.x) < 1e-6 && Math.abs(ar.y - tr.y) < 1e-6);
    assert.ok(al.x < 400 && ar.x > 400); // มือซ้ายของเด็กอยู่ซ้ายจอ (กระจก)
    assert.equal(aimFromHand(down, 'r', 1, full), null);
    // ยืดจากไหล่: ไกลจากไหล่กว่ามือจริง, และไม่หลุดนอกฝั่ง
    const g = aimFromHand(both, 'r', 1.5, full)!;
    assert.ok(Math.hypot(g.x - both.cx, g.y - both.cy) > Math.hypot(ar.x - both.cx, ar.y - both.cy));
    const half = { x: 0, y: 200, w: 400, h: 400 };
    const cl = aimFromHand(both, 'r', 1, half)!;
    assert.ok(cl.x === 400 && cl.y >= 200);

    // กรองร่างกาย: มือนิ่งแต่ผลตรวจสั่น ±8px -> หลังกรองสั่นไม่เกิน 3px, ขยับจริงตามทัน
    const sm = new BodySmoother();
    let t0 = 0;
    let dev = 0;
    for (let i = 0; i < 60; i++) {
      t0 += 33;
      const jit = toBody(pose(0.5, { rHandY: 0.4 + (i % 2 ? 0.01 : -0.01) }), view)!;
      const out = sm.smooth(jit, t0);
      if (i > 15) dev = Math.max(dev, Math.abs(out.pts[16].y - toBody(pose(0.5, { rHandY: 0.4 }), view)!.pts[16].y));
    }
    assert.ok(dev < 3, 'smoothed jitter ' + dev);
    let moved = 0;
    for (let i = 0; i < 15; i++) {
      t0 += 33;
      moved = sm.smooth(toBody(pose(0.5, { rHandY: 0.15 }), view)!, t0).pts[16].y;
    }
    assert.ok(Math.abs(moved - toBody(pose(0.5, { rHandY: 0.15 }), view)!.pts[16].y) < 6);
    // ข้อมือหายแวบเดียว (ความชัดต่ำ) ใช้ตำแหน่งเดิม ไม่กระโดด
    t0 += 33;
    const hidden = pose(0.5, { rHandY: 0.15 }).map((p, i) => (i === 16 ? { x: 0.1, y: 0.9, visibility: 0.1 } : p));
    assert.ok(Math.abs(sm.smooth(toBody(hidden, view)!, t0).pts[16].y - moved) < 1e-6);
    // จอวาดไหลตามทุกเฟรม: เข้าใกล้เป้าเร็วแต่ไม่กระโดด
    const fl = new Follow(26);
    fl.step(0, 0, 0.016);
    fl.step(100, 0, 0.016);
    assert.ok(fl.x > 20 && fl.x < 50);
    for (let i = 0; i < 20; i++) fl.step(100, 0, 0.016);
    assert.ok(fl.x > 99);

    // แบ่งทีม: คนจอซ้าย = ทีม 0 (กล้องกลับกระจก: x กล้องมาก = จอซ้าย), ฝั่งละคนที่ไหล่กว้างสุด
    const bL = toBody(pose(0.75), view)!;
    const bR = toBody(pose(0.25), view)!;
    // คนยืนไกลกว่า (ตัวเล็กลงครึ่งหนึ่ง) ฝั่งขวาเหมือนกัน
    const bR2 = toBody(pose(0.5).map((p) => ({ ...p, x: 0.25 + (p.x - 0.5) * 0.5, y: 0.5 + (p.y - 0.5) * 0.5 })), view)!;
    const sides = assignSides([bR2, bL, bR], 400, 2);
    assert.ok(sides[0] === bL && sides[1] === bR);
    assert.equal(assignSides([bR2, bR], 400, 1)[0], bR);

    // ค้างเป้า 850ms ถึงเลือก, มือแกว่งออกแวบเดียวไม่ล้างหลอด, ออกนอก 1.3r = เลิกเล็ง
    const d = new Dwell(850);
    const T = [{ id: 'a', x: 100, y: 100, r: 40 }, { id: 'b', x: 300, y: 100, r: 40 }];
    let fired: string | null = null;
    for (let i = 0; i < 10 && !fired; i++) fired = d.update({ x: 105, y: 100 }, T, 50);
    assert.equal(fired, null);
    d.update({ x: 148, y: 100 }, T, 50); // ขอบนอก r แต่ยังใน 1.3r = ยังเล็งตัวเดิม
    assert.equal(d.hover, 'a');
    d.update(null, T, 50);
    assert.ok((d.prog.get('a') || 0) > 0.3);
    for (let i = 0; i < 20 && !fired; i++) fired = d.update({ x: 100, y: 100 }, T, 50);
    assert.equal(fired, 'a');
    assert.equal(d.update({ x: 300, y: 100 }, T, 50), null); // พักหลังเลือก

    // One Euro: สั่นเล็กๆ ถูกกรองเหลือน้อย, ขยับไกลตามทัน
    const f = new OneEuro();
    let out = 0;
    let maxDev = 0;
    for (let i = 0; i < 60; i++) {
      out = f.filter(500 + (i % 2 ? 6 : -6), 1 / 30);
      if (i > 10) maxDev = Math.max(maxDev, Math.abs(out - 500));
    }
    assert.ok(maxDev < 3);
    for (let i = 0; i < 30; i++) out = f.filter(900, 1 / 30);
    assert.ok(out > 880);
    const h = new Hold(3, 3);
    assert.ok(!h.update(true) && !h.update(true) && h.update(true) && h.update(false) && !h.update(false) === false);

    // คะแนน: ถูกครั้งแรก 100 + ไวสุด 20, ถูกหลังผิด 50, ดาว
    assert.equal(arAnswerPoints(true, 0, 20000), 120);
    assert.equal(arAnswerPoints(true, 20000, 20000), 100);
    assert.equal(arAnswerPoints(false, 0, 20000), 50);
    assert.deepEqual([arStars(9, 10), arStars(6, 10), arStars(1, 10), arStars(0, 10)], [3, 2, 1, 0]);

    // ชุดคำถาม: AR ใช้เฉพาะข้อเลือกตอบ 1 คำตอบ ไม่มีคลิป และเปิดห้องไม่ได้ (เล่นในเครื่องเดียว)
    const ch = (id: string, ok: boolean) => ({ id, text: [{ t: 'x' as const, v: id }], media: null, correct: ok });
    const mk = (id: string, extra: object = {}) => ({ id, text: [{ t: 'x' as const, v: 'q' }], media: null, choices: [ch('a', true), ch('b', false)], multi: false, time: 20, points: 1 as const, ...extra });
    const content = { v: 1 as const, questions: [mk('1'), mk('2'), mk('3', { multi: true, choices: [ch('a', true), ch('b', true)] }), mk('4', { kind: 'text', answers: ['x'], choices: [] }), mk('5', { media: { kind: 'video', url: 'u', path: 'p' } })] };
    assert.deepEqual(modeQuiz(content as never, 'ar').questions.map((q) => q.id), ['1', '2']);
    assert.equal(modeFit(content as never, 'ar').ok, false);
    assert.equal(MODES.find((m) => m.id === 'ar')?.playType, 'local');
    assert.deepEqual(parseArSettings((k) => ({ teams: '2', n: '15', t: '30', lv: '2', music: 'boss', m: '3', b: 'golem', mo: '9', sn: '2' })[k] ?? null), { teams: 2, members: 3, count: 15, time: 30, level: 2, boss: 'golem', motions: 9, sens: 2, music: 'boss', style: 0 });
    assert.deepEqual(parseArSettings((k) => ({ teams: '5', n: '7', t: '-1', lv: 'x', music: '<b>', m: '9', b: '<x>', mo: '99', sn: '' })[k] ?? null), AR_DEFAULTS);
    assert.equal(parseArSettings((k) => ({ teams: '4' })[k] ?? null).teams, 4);
    // URL เดิมก่อนมีค่าใหม่ยังอ่านได้ ค่าใหม่เป็นค่าเริ่มต้น
    assert.deepEqual(parseArSettings(new URLSearchParams(arQuery('x', AR_DEFAULTS)).get.bind(new URLSearchParams(arQuery('x', AR_DEFAULTS)))), AR_DEFAULTS);
    passed++;
    console.log('  ok  สงครามอวกาศ AR: พิกัดกล้อง cover+กระจก เล็งสองมือ กรองร่างกายกันสั่น ค้างเป้า แบ่งทีม คะแนน คัดข้อ');
  }
  {
    // AR ระบบเสริม: ท่าทาง บอส คอมโบ ไอเทม อัปเกรด แผนที่ ภารกิจ ทีม ที่เก็บในเครื่อง
    const body = (cx: number, cy: number, sw: number, L: [number, number], R: [number, number]): Body => {
      const pts = Array.from({ length: 33 }, () => ({ x: cx, y: cy + sw * 2, v: 1 }));
      pts[0] = { x: cx, y: cy - sw * 0.8, v: 1 };
      pts[11] = { x: cx - sw / 2, y: cy, v: 1 };
      pts[12] = { x: cx + sw / 2, y: cy, v: 1 };
      pts[15] = pts[19] = { x: L[0], y: L[1], v: 1 };
      pts[16] = pts[20] = { x: R[0], y: R[1], v: 1 };
      return { pts, cx, cy, sw };
    };
    const base = { cx: 500, cy: 300, sw: 100 };
    const rest = body(500, 300, 100, [450, 500], [550, 500]);
    assert.equal(leanOf(rest, base), 0);
    assert.equal(leanOf(body(430, 300, 100, [400, 500], [480, 500]), base), -1);
    assert.equal(leanOf(body(570, 300, 100, [520, 500], [600, 500]), base), 1);
    assert.equal(leanOf(body(530, 300, 100, [480, 500], [560, 500]), base, 0.5), 1);
    assert.ok(jumping(body(500, 260, 100, [450, 460], [550, 460]), base) && !jumping(rest, base));
    assert.ok(shieldPose(body(500, 300, 100, [490, 380], [520, 380])) && !shieldPose(rest));
    assert.ok(victoryPose(body(500, 300, 100, [350, 150], [650, 150])) && !victoryPose(body(500, 300, 100, [480, 150], [520, 150])));
    assert.ok(!chargePose(body(500, 300, 100, [350, 150], [650, 150])) && chargePose(body(500, 300, 100, [470, 150], [530, 150])));
    const g = new Gestures();
    for (let i = 0; i < 10; i++) g.calibrate(rest);
    const ev: string[] = [];
    for (let i = 0; i < 5; i++) ev.push(...g.update(body(420, 300, 100, [380, 500], [470, 500]), 1000 + i * 33));
    assert.deepEqual(ev, ['dodgeL']);
    assert.equal(g.lean, -1);
    assert.equal(motionOn(DEFAULT_MOTIONS, 'jump'), false);
    assert.equal(motionOn(DEFAULT_MOTIONS, 'shield'), true);

    assert.ok(BOSSES.length >= 3 && new Set(BOSSES.map((b) => b.id)).size === BOSSES.length);
    assert.deepEqual([bossQuestions(10), bossQuestions(3), bossQuestions(2), bossQuestions(30)], [3, 2, 2, 10]);
    assert.equal(bossHp(bossById('jelly'), 3, 2), 132);
    assert.equal(pickAttack(bossById('mecha'), (m) => m === 'dodge'), 'lane');
    assert.equal(pickAttack(bossById('jelly'), (m) => m === 'shield'), 'wide');
    assert.equal(pickAttack(bossById('jelly'), () => false), null);
    const st = { lean: 0 as -1 | 0 | 1, shield: false, jumpAt: -1e9, now: 5000 };
    assert.ok(defended('lane', -1, { ...st, lean: 1 }) && !defended('lane', -1, { ...st, lean: -1 }) && !defended('lane', 1, st));
    assert.ok(defended('wide', 1, { ...st, shield: true }) && !defended('wide', 1, st));
    assert.ok(defended('ground', 1, { ...st, jumpAt: 4600 }) && !defended('ground', 1, { ...st, jumpAt: 4000 }));
    assert.deepEqual([shotDamage(0, false), shotDamage(4, false), shotDamage(0, true)], [10, 20, 20]);

    const cb = new Combo();
    for (let i = 0; i < 5; i++) cb.onAnswer(true);
    assert.equal(cb.answerMult, 1.4);
    let fresh = false;
    for (let i = 0; i < 10; i++) fresh = cb.onShot() || fresh;
    assert.ok(fresh && cb.superOn && cb.supers === 1);
    assert.equal(cb.shootMult, 3);
    cb.onMiss();
    assert.ok(!cb.superOn && cb.shoot === 0 && cb.answerMult === 1.4);
    assert.ok(cb.onRoundEnd(true) && cb.perfect === 1);
    assert.ok(!cb.onRoundEnd(false));
    assert.deepEqual([cb.perfect as number, cb.perfects], [0, 1]);
    cb.onAnswer(false);
    assert.equal(cb.answer, 0);

    assert.equal(POWERS.length, 5);
    assert.deepEqual(earnedPowers({ correct: true, firstTry: true, fast: true, answerCombo: 3, energyRatio: 0.3 }), ['double', 'speed', 'restore']);
    assert.deepEqual(earnedPowers({ correct: true, firstTry: false, fast: true, answerCombo: 5, energyRatio: 1 }), ['laser']);
    assert.deepEqual(earnedPowers({ correct: false, firstTry: true, fast: true, answerCombo: 3, energyRatio: 0 }), []);
    const pw = new Powers();
    pw.add('double');
    pw.add('shield');
    pw.add('shield');
    pw.add('restore');
    assert.ok(pw.has('double') && !pw.has('restore') && pw.got === 4);
    pw.endQuestion();
    pw.endQuestion();
    pw.endQuestion();
    assert.ok(!pw.has('double') && pw.useShield() && pw.useShield() && !pw.useShield());

    assert.deepEqual([upCost(0), upCost(4)], [30, 150]);
    assert.deepEqual(cleanUps({ laser: 9, shield: -1, engine: '2', energy: 'x' }), { laser: 5, shield: 0, engine: 2, energy: 0 });
    const ue = upEffects({ laser: 5, shield: 3, engine: 5, energy: 5 });
    assert.ok(ue.dwellMs >= 600 && ue.hitMs >= 150 && ue.chargeS > 0.3 && ue.startShield === 2 && ue.shots === 5);

    assert.equal(ALL_STAGES.length, 15);
    assert.equal(new Set(ALL_STAGES.map((s) => s.id)).size, 15);
    assert.ok(ALL_STAGES.every((s) => BOSSES.some((b) => b.id === s.boss) && s.level >= 0 && s.level <= 2));
    assert.ok(unlocked({}, 'p1s1') && !unlocked({}, 'p1s2') && unlocked({ p1s1: 1 }, 'p1s2') && unlocked({}, 'p5s3', true));
    assert.equal(nextStage({ p1s1: 2 }).id, 'p1s2');

    const d1 = dailyFor('2026-10-31');
    assert.equal(d1.length, 3);
    assert.deepEqual(dailyFor('2026-10-31'), d1);
    assert.equal(new Set(d1.map((m) => m.type)).size, 3);
    assert.deepEqual(dailyFor('2026-10-31', [{ type: 'boss', target: 2, reward: 50 }]), [{ type: 'boss', target: 2, reward: 50 }]);
    assert.deepEqual(addStats({ ...ZERO_STATS, combo: 4, correct: 2 }, { combo: 3, correct: 5 }), { ...ZERO_STATS, combo: 4, correct: 7 });
    assert.deepEqual(cleanMission({ type: 'x', target: 1, reward: 1 }), null);
    assert.deepEqual(cleanMission({ type: 'meteor', target: 9999, reward: 1 }), { type: 'meteor', target: 500, reward: 5 });
    assert.equal(allCorrectRounds([[true, true], [true, false], [true, true]], 2, false), 2);
    assert.equal(allCorrectRounds([[true], [true], [true], [false], [true], [true]], 3, true), 1);
    assert.ok(stageQuests(2, true).every((q) => q.coop) && !stageQuests(1, false).some((q) => q.coop));

    assert.deepEqual([teamMode(0), teamMode(2), teamMode(3), teamMode(4)], ['solo', 'split', 'relay', 'relay']);
    assert.deepEqual([0, 1, 2, 3, 4].map((q) => teamOf(3, 0, q)), [0, 1, 2, 0, 1]);
    assert.deepEqual([0, 1].map((s) => teamOf(2, s, 7)), [0, 1]);
    assert.deepEqual([0, 3, 6, 9].map((q) => memberOf(3, q, 2)), [0, 1, 0, 1]);
    assert.deepEqual([0, 1, 2].map((q) => memberOf(2, q, 3)), [0, 1, 2]);
    assert.deepEqual(ranks([50, 80, 50]).map((r) => [r.team, r.rank]), [[1, 1], [0, 2], [2, 2]]);

    const sv = cleanSave({ coins: -5, ups: { laser: 2 }, stars: { p1s1: 9, bad: 3 }, sets: { p1s1: '11111111-1111-1111-1111-111111111111', p1s2: 'x' }, custom: [{ type: 'boss', target: 1, reward: 10 }, 'junk'], ach: ['b1', 'nope'], openAll: 'yes', day: '2026-10-30', today: { correct: 5 }, claimed: [0, 9] });
    assert.equal(sv.coins, 0);
    assert.deepEqual(sv.stars, { p1s1: 3 });
    assert.deepEqual(Object.keys(sv.sets), ['p1s1']);
    assert.deepEqual(sv.custom, [{ type: 'boss', target: 1, reward: 10 }]);
    assert.deepEqual(sv.ach, ['b1']);
    assert.equal(sv.openAll, false);
    const rolled = rollDay({ ...EMPTY_SAVE(), day: '2026-10-30', today: { ...ZERO_STATS, correct: 5 }, claimed: [0] }, new Date(2026, 9, 31));
    assert.ok(rolled.day === '2026-10-31' && rolled.today.correct === 0 && rolled.claimed.length === 0);
    passed++;
    console.log('  ok  AR ระบบเสริม: ท่าทาง บอส คอมโบ ไอเทม อัปเกรด แผนที่ ภารกิจ ทีม ข้อมูลในเครื่อง');
  }
  {
    // AR คุณภาพการตรวจ: หน้าถูกบัง/ตัวสั่น เตือนเมื่อเป็นติดกัน, ล็อกผู้เล่นคนเดิม ไม่ให้คนข้างหลังแย่ง
    const mk = (cx: number, cy: number, sw: number, face = 1): Body => {
      const pts = Array.from({ length: 33 }, () => ({ x: cx, y: cy, v: 1 }));
      for (const i of [0, 2, 5, 9, 10]) pts[i] = { x: cx, y: cy - sw, v: face };
      return { pts, cx, cy, sw };
    };
    assert.equal(faceScore(mk(0, 0, 100)), 1);
    assert.equal(faceScore(mk(0, 0, 100, 0.2)), 0.2);
    const qa = new Quality(600, 400);
    for (let t2 = 0; t2 < 500; t2 += 50) assert.equal(qa.update(mk(500, 300, 100, 0.1), 1000 + t2), null);
    assert.equal(qa.update(mk(500, 300, 100, 0.1), 1700), 'face');
    qa.update(mk(500, 300, 100), 1750);
    assert.equal(qa.update(mk(500, 300, 100), 2000), 'face');
    assert.equal(qa.update(mk(500, 300, 100), 2200), null);
    const qs = new Quality(300, 300);
    let got: string | null = null;
    for (let i = 0; i < 20; i++) got = qs.update(mk(i % 2 ? 300 : 700, 300, 100), 5000 + i * 50) || got;
    assert.equal(got, 'shaky');
    const qn = new Quality(300, 300);
    for (let i = 0; i < 20; i++) assert.equal(qn.update(mk(500 + i * 2, 300, 100), 9000 + i * 50), null);
    // เอียงหลบเร็ว (0.6 ไหล่ใน 300ms ไปกลับ) และกระโดด (0.4 ไหล่ขึ้นลงใน 500ms) ต้องไม่ถูกเตือนว่าสั่น
    const ql = new Quality(600, 400);
    for (let i = 0; i <= 24; i++) {
      const ph = (i % 12) / 6;
      assert.equal(ql.update(mk(500 - 60 * (ph <= 1 ? ph : 2 - ph), 300, 100), 20000 + i * 50), null);
    }
    const qj = new Quality(600, 400);
    for (let i = 0; i <= 20; i++) assert.equal(qj.update(mk(500, 300 - 40 * Math.sin(((i % 10) / 10) * Math.PI), 100), 30000 + i * 50), null);
    const me = mk(500, 300, 100);
    const big = mk(150, 320, 140);
    assert.equal(pickBody([me, big], null, 0), big);
    assert.equal(pickBody([big, mk(520, 305, 104)], toLock(me, 0), 100)?.cx, 520);
    assert.equal(pickBody([big], toLock(me, 0), 100), null);
    assert.equal(pickBody([big], toLock(me, 0), 900), big);

    // ลายนิ้วมือคำตอบ: รู้ถูก/ผิดในเครื่องได้ ไม่มีรหัสคำตอบตรงๆ ในข้อมูลที่ส่ง
    const ch2 = (id: string, ok: boolean) => ({ id, text: [{ t: 'x' as const, v: id }], media: null, correct: ok });
    const base = { id: 'q1', text: [{ t: 'x' as const, v: 'q' }], media: null, time: 20, points: 1 as const };
    const pq = publicQuestion({ ...base, choices: [ch2('a', false), ch2('b', true), ch2('c', false)], multi: false }, 0, 1, { shuffleChoices: false, seed: 's', elapsedMs: 0 });
    assert.ok(quickCheck(pq, ['b']) === true && quickCheck(pq, ['a']) === false && quickCheck(pq, []) === false);
    assert.ok(!JSON.stringify(pq.chk).includes('"b"'));
    const pm = publicQuestion({ ...base, choices: [ch2('a', true), ch2('b', true), ch2('c', false)], multi: true }, 0, 1, { shuffleChoices: false, seed: 's', elapsedMs: 0 });
    assert.ok(quickCheck(pm, ['b', 'a']) === true && quickCheck(pm, ['a']) === false && quickCheck(pm, ['a', 'b', 'c']) === false);
    const pt = publicQuestion({ ...base, choices: [], multi: false, kind: 'text', answers: ['Cat'] }, 0, 1, { shuffleChoices: false, seed: 's', elapsedMs: 0 });
    assert.ok(quickCheck(pt, ['  cat ']) === true && quickCheck(pt, ['dog']) === false && quickCheck(pt, ['']) === false);
    assert.equal(quickCheck({ kind: undefined }, ['a']), null);
    passed++;
    console.log('  ok  AR คุณภาพการตรวจ + ล็อกผู้เล่น / ตรวจคำตอบทันทีด้วยลายนิ้วมือ');
  }
  {
    // Magic Kingdom AR: ท่ากางแขน/ปรบมือ (แกน AR กลาง) ข้อมูลดินแดน เวท คะแนน บอส ข้อมูลในเครื่อง โหมด/URL
    const bd = (L: [number, number], R: [number, number]): Body => {
      const pts = Array.from({ length: 33 }, () => ({ x: 500, y: 300, v: 1 }));
      pts[15] = { x: L[0], y: L[1], v: 1 };
      pts[16] = { x: R[0], y: R[1], v: 1 };
      pts[19] = { x: L[0], y: L[1], v: 1 };
      pts[20] = { x: R[0], y: R[1], v: 1 };
      return { pts, cx: 500, cy: 300, sw: 100 };
    };
    assert.ok(spreadPose(bd([350, 300], [650, 310])));
    assert.ok(!spreadPose(bd([440, 300], [560, 300])), 'มือชิดตัว ไม่ใช่ตัว T');
    assert.ok(!spreadPose(bd([350, 150], [650, 150])), 'มือสูงเหนือหัว ไม่ใช่ตัว T');
    const cl = new Clap();
    assert.equal(cl.update(bd([400, 320], [600, 320]), 0), false);
    assert.equal(cl.update(bd([495, 320], [505, 320]), 200), true);
    assert.equal(cl.update(bd([495, 320], [505, 320]), 260), false, 'ประกบค้าง = ไม่นับซ้ำ');
    const cl2 = new Clap();
    cl2.update(bd([400, 320], [600, 320]), 0);
    assert.equal(cl2.update(bd([495, 320], [505, 320]), 900), false, 'ประกบช้า = โล่ ไม่ใช่ปรบมือ');
    assert.equal(LANDS.length, 6);
    assert.ok(LANDS.every((l) => MAGIC_BOSSES.some((b) => b.id === l.boss)));
    assert.equal(SPELLS.length, 7);
    assert.ok(landOpen({}, 'castle') && !landOpen({}, 'forest') && landOpen({ castle: 1 }, 'forest') && landOpen({}, 'dark', true));
    assert.equal(nextLand({ castle: 2 }).id, 'forest');
    assert.deepEqual(openSpells(0), ['fire', 'earth']);
    assert.equal(nextSpell(0)?.id, 'ice');
    assert.equal(nextSpell(1000), null);
    // คะแนนความรู้มากกว่าคะแนนการเล่นเสมอ: ข้อถูก 100+ / โจมตี 10 คริสตัล 20
    assert.equal(mkPoints(true, 0, 20000, 1), 120);
    assert.equal(mkPoints(true, 20000, 20000, 1), 100);
    assert.equal(mkPoints(true, 20000, 20000, 9), 150);
    assert.equal(mkPoints(false, 0, 20000, 5), 50);
    assert.deepEqual([landStars(9, 10), landStars(6, 10), landStars(1, 10), landStars(0, 10)], [3, 2, 1, 0]);
    assert.deepEqual([bossStart(10), bossStart(3), bossStart(2)], [6, 1, 1]);
    // ไม่มีอัปเกรด (ลูกเวท 3 ลูก x ลูกไฟ 10): 3 ดินแดนแรกตอบถูก 80% ก็ล้มบอส, ทุกบอสล้มได้ถ้าถูกครบ
    const fx0 = mkEffects({ power: 0, defense: 0, energy: 0, speed: 0, knowledge: 0 }, 'cat');
    MAGIC_BOSSES.slice(0, 3).forEach((b) => assert.ok(bossHpFor(b, 4, 1) <= 4 * 0.8 * fx0.bolts * spellDamage('fire', fx0) * 1.05, b.id));
    for (const b of MAGIC_BOSSES) assert.ok(bossHpFor(b, 4, 1) <= 4 * fx0.bolts * spellDamage('fire', fx0), b.id);
    assert.equal(spellDamage('earth', fx0), 0);
    assert.ok(spellDamage('rainbow', fx0) > spellDamage('fire', fx0) * 2);
    assert.equal(mkEffects({ power: 0, defense: 0, energy: 0, speed: 0, knowledge: 0 }, 'phoenix').hearts, 4);
    let seq: string[] = [];
    for (let i = 0; i < 20; i++) seq = [...seq.slice(-2), mkPickAtk(MAGIC_BOSSES[0], seq as never, () => 0)];
    assert.ok(seq.includes('shield'));
    const sv = cleanMagic({ coins: -5, knowledge: 12.7, pets: ['dragon', 'x'], pet: 'unicorn', bolt: 'rainbow', stars: { castle: 9, nope: 1 }, sets: { castle: 'bad', forest: '11111111-1111-1111-1111-111111111111' }, look: { g: 1, robe: 99 } });
    assert.equal(sv.coins, 0);
    assert.equal(sv.knowledge, 12);
    assert.deepEqual(sv.pets, ['cat', 'dragon']);
    assert.equal(sv.pet, 'cat');
    assert.equal(sv.bolt, 'fire');
    assert.deepEqual(sv.stars, { castle: 3 });
    assert.deepEqual(Object.keys(sv.sets), ['forest']);
    assert.equal(sv.look.g, 1);
    assert.equal(sv.look.robe, 0);
    assert.deepEqual(cleanMagic(null), EMPTY_MAGIC());
    assert.deepEqual(mkCleanLook({ g: 3 }).g, 0);
    assert.ok(PETS.some((p) => p.cost === 0));
    // URL ตั้งค่า: บอสต้องอยู่ในรายการของเกมนั้น, แบบการเล่น 0-2
    const q = new URLSearchParams(arQuery('11111111-1111-1111-1111-111111111111', { ...AR_DEFAULTS, boss: 'dragon', style: 2 }));
    const ids = MAGIC_BOSSES.map((b) => b.id);
    assert.equal(parseArSettings((k) => q.get(k), ids).boss, 'dragon');
    assert.equal(parseArSettings((k) => q.get(k), ids).style, 2);
    assert.equal(parseArSettings((k) => q.get(k)).boss, 'auto', 'บอสของอีกเกม = ตามด่าน');
    assert.equal(parseArSettings((k) => (k === 'st' ? '9' : null)).style, 0);
    assert.equal(MODES.find((m) => m.id === 'magic')?.playType, 'local');
    passed++;
    console.log('  ok  Magic Kingdom AR: ท่ากางแขน/ปรบมือ ดินแดน เวท คะแนน บอส ข้อมูลในเครื่อง URL');
  }
  {
    // Ocean Guardian AR: พื้นที่ บอส การ์ดสัตว์ พลัง และคะแนนความรู้หนักกว่าการเล่นเสมอ
    assert.equal(OG.ZONES.length, 8);
    assert.equal(OG.OCEAN_BOSSES.length, 5);
    assert.equal(OG.ANIMALS.length, 8);
    assert.ok(OG.ZONES.every((z) => OG.OCEAN_BOSSES.some((b) => b.id === z.boss)));
    assert.ok(OG.zoneOpen({}, 'reef') && !OG.zoneOpen({}, 'deep') && OG.zoneOpen({ reef: 1 }, 'deep') && OG.zoneOpen({}, 'palace', true));
    assert.equal(OG.nextZone({ reef: 2 }).id, 'deep');
    assert.deepEqual(OG.openPowers(0), ['wave', 'shield']);
    assert.equal(OG.nextPower(1000), null);
    // ข้อไหนก็ได้: เก็บขยะ/หีบ/ว่ายหลบ + ช่วยสัตว์/ปะการัง รวมแล้วน้อยกว่าคะแนนตอบถูกครั้งแรก (100)
    for (let n = 0; n < 24; n++) assert.ok(OG.maxPlayFor(n) < OG.OG_POINTS.correct, `ข้อ ${n}: ${OG.maxPlayFor(n)}`);
    assert.ok([0, 1, 2].every((n) => OG.answerPoints(true, 20000, 20000, 1) > OG.maxPlayFor(n)));
    const maxFx = OG.effects({ power: 5, defense: 5, energy: 5, speed: 5, knowledge: 5 }, OG.POWERS.map((p) => p.id));
    assert.ok(OG.maxBattlePlay(maxFx, 9, 2.2 * 0.8) < OG.OG_POINTS.correct, 'รอบสู้บอสอัปเกรดเต็ม ยังน้อยกว่าตอบถูก 1 ข้อ');
    assert.deepEqual([0, 1, 2, 3].map(OG.specialOf), [null, 'coral', 'rescue', null]);
    assert.deepEqual([0, 1].map(OG.roundOf), ['trash', 'swim']);
    assert.equal(OG.hasChest(0), true);
    assert.equal(OG.hasChest(2), false);
    // การ์ดสัตว์: ได้ตัวที่ยังไม่มีก่อน
    assert.notEqual(OG.rescueAnimal(0, 0, ['turtle']).id, 'turtle');
    assert.equal(OG.rescueAnimal(0, 5, OG.ANIMALS.map((a) => a.id)).id, OG.ANIMALS[5].id);
    const fx0 = OG.effects({ power: 0, defense: 0, energy: 0, speed: 0, knowledge: 0 }, ['wave']);
    for (const b of OG.OCEAN_BOSSES) assert.ok(OG.bossHpFor(b, 4, 1) <= 4 * fx0.bolts * OG.waveDamage('wave', fx0.power), b.id);
    assert.equal(OG.waveDamage('shield', 1), 0);
    assert.equal(OG.effects({ power: 0, defense: 0, energy: 0, speed: 0, knowledge: 0 }, ['double']).coin, 2);
    assert.deepEqual([OG.reefPct(3, 4), OG.reefPct(9, 4), OG.reefPct(0, 0)], [75, 100, 0]);
    const sv = cleanOcean({ coins: -1, cards: ['dolphin', 'x', 'dolphin'], items: { pearl: 3, bad: 9 }, reef: { reef: 140, nope: 5 }, stars: { deep: 2 }, sets: { reef: '11111111-1111-1111-1111-111111111111', deep: 'bad' }, look: { suit: 99, gear: 2 } });
    assert.equal(sv.coins, 0);
    assert.deepEqual(sv.cards, ['dolphin']);
    assert.deepEqual(sv.items, { pearl: 3, shell: 0, coral: 0, crystal: 0 });
    assert.deepEqual(sv.reef, { reef: 100 });
    assert.deepEqual(Object.keys(sv.sets), ['reef']);
    assert.equal(sv.look.suit, 0);
    assert.equal(sv.look.gear, 2);
    assert.deepEqual(cleanOcean(null), EMPTY_OCEAN());
    assert.equal(MODES.find((m) => m.id === 'ocean')?.playType, 'local');
    passed++;
    console.log('  ok  Ocean Guardian AR: พื้นที่ บอส การ์ดสัตว์ พลัง คะแนนการเล่นต่อข้อ < ความรู้ ข้อมูลในเครื่อง');
  }
  {
    // Ghost Hunter AR: สถานที่ ผีสะสม อุปกรณ์ เลเวล ไฟฉาย จุดอ่อนบอส คะแนน
    assert.equal(GH.PLACES.length, 8);
    assert.equal(GH.GHOST_BOSSES.length, 5);
    assert.equal(GH.GHOSTS.length, 9);
    assert.equal(GH.GEARS.length, 8);
    assert.ok(GH.PLACES.every((p) => GH.GHOST_BOSSES.some((b) => b.id === p.boss) && p.ghosts.every((x) => GH.GHOSTS.some((y) => y.id === x))));
    assert.ok(GH.placeOpen({}, 'school') && !GH.placeOpen({}, 'mansion') && GH.placeOpen({ school: 1 }, 'mansion'));
    assert.equal(GH.nextPlace({ school: 3 }).id, 'mansion');
    assert.deepEqual(GH.openGears(0), ['flashlight', 'beam', 'shield']);
    assert.deepEqual([0, 9, 10, 70, 999].map(GH.hunterLevel), [0, 0, 1, 4, 4]);
    // ราชาผี (ตำนาน) ได้เฉพาะข้อที่ 7, 14...
    const dim = GH.placeById('dimension');
    assert.ok([0, 1, 2, 3, 4, 5].every((n) => GH.ghostFor(dim, n) !== 'king'));
    assert.equal(GH.ghostFor(dim, 6), [...dim.ghosts][6 % 3]);
    for (let n = 0; n < 24; n++) assert.ok(GH.maxPlayFor(n) < GH.GH_POINTS.correct, `ข้อ ${n}: ${GH.maxPlayFor(n)}`);
    const maxFx = GH.effects({ power: 5, range: 5, speed: 5, trap: 5, slots: 5 }, GH.GEARS.map((g) => g.id));
    assert.ok(GH.maxBattlePlay(maxFx, 9, 2.2 * 0.8) < GH.GH_POINTS.correct);
    assert.equal(maxFx.hearts, 5);
    assert.ok(maxFx.light > GH.effects({ power: 0, range: 0, speed: 0, trap: 0, slots: 0 }, []).light);
    assert.equal(GH.beamDamage('beam', 1, 0, true), 2 * GH.beamDamage('beam', 1, 0, false));
    assert.equal(GH.beamDamage('shield', 1), 0);
    const fx0 = GH.effects({ power: 0, range: 0, speed: 0, trap: 0, slots: 0 }, ['beam']);
    for (const b of GH.GHOST_BOSSES) assert.ok(GH.bossHpFor(b, 4, 1) <= 4 * fx0.bolts * GH.beamDamage('beam', fx0.power), b.id);
    assert.ok(GH.lit(100, 100, 50, 140, 100, 30) && !GH.lit(100, 100, 50, 200, 100, 30));
    const sv = cleanGhost({ caught: { baby: 3, nope: 2, king: 0 }, stars: { school: 7 }, look: { hat: 2, coat: 40 }, sets: { mansion: '11111111-1111-1111-1111-111111111111' } });
    assert.deepEqual(sv.caught, { baby: 3 });
    assert.deepEqual(sv.stars, { school: 3 });
    assert.equal(sv.look.hat, 2);
    assert.equal(sv.look.coat, 0);
    assert.deepEqual(Object.keys(sv.sets), ['mansion']);
    assert.deepEqual(cleanGhost(undefined), EMPTY_GHOST());
    assert.equal(MODES.find((m) => m.id === 'ghost')?.playType, 'local');
    passed++;
    console.log('  ok  Ghost Hunter AR: สถานที่ ผีสะสม อุปกรณ์ เลเวล ไฟฉาย จุดอ่อน คะแนนการเล่นต่อข้อ < ความรู้');
  }
  {
    // นำเข้า/ส่งออกคำถามเป็น CSV/XLSX
    const qs = rowsToQuestions(
      parseCsv(buildCsv(TEMPLATE_ROWS)).map((r, i) => [i + 1, r]),
      ''
    );
    assert.equal(qs.length, 4, 'หัวตารางถูกข้าม');
    assert.ok(qs.every((r) => r.q && !r.errs.length));
    assert.deepEqual(qs[0].q!.text[1], { t: 'm', v: '\\frac{1}{2}' });
    assert.equal(qs[1].q!.multi, true);
    assert.deepEqual(qs[1].q!.choices.filter((c) => c.correct).map((c) => richToCell(c.text)), ['2', '8']);
    assert.equal(qs[3].q!.kind, 'text');
    assert.deepEqual(qs[3].q!.answers, ['12', 'สิบสอง']);
    // ส่งออกแล้วนำเข้ากลับได้เหมือนเดิม (คอมมา เครื่องหมายคำพูด ขึ้นบรรทัดใหม่ เศษส่วน สูตร Excel)
    const src = sanitizeQuiz(
      {
        v: 1,
        questions: [
          { id: 'aaaa1', text: [{ t: 'x', v: 'ก, "ข"\nค ' }, { t: 'm', v: 'x^2' }], media: null, multi: false, time: 45, points: 1, choices: [{ id: 'c1', text: [{ t: 'x', v: '3/4' }], media: null, correct: true }, { id: 'c2', text: [{ t: 'x', v: '=1+1' }], media: null, correct: false }, { id: 'c3', text: [{ t: 'x', v: '-5' }], media: null, correct: false }] },
          { id: 'aaaa2', text: [{ t: 'x', v: 'พิมพ์ 007' }], media: null, multi: false, time: 0, points: 1, choices: [], kind: 'text', answers: ['007', '1-2'] },
        ],
      },
      ''
    );
    const csv = buildCsv(quizToRows(src.questions));
    assert.ok(csv.startsWith('﻿'), 'มี BOM');
    assert.ok(csv.includes(`,'=1+1,`) && csv.includes('"=""3/4"""') && csv.includes(',-5,'));
    const back = rowsToQuestions(parseCsv(csv).map((r, i) => [i + 1, r]), '');
    assert.equal(back.length, 2);
    assert.deepEqual(back[0].q!.text, src.questions[0].text);
    assert.deepEqual(back[0].q!.choices.map((c) => richToCell(c.text)), ['3/4', '=1+1', '-5']);
    assert.equal(back[0].q!.time, 45);
    assert.deepEqual(back[1].q!.answers, ['007', '1-2']);
    assert.equal(back[1].q!.time, 0);
    const odd = ['9:15', '1.50', '1 1/2', '50%', '1,000', '1e5', '12', '-5', '0.5'];
    const oddCsv = buildCsv([odd]);
    assert.ok(oddCsv.includes(',12,-5,0.5\r\n') && oddCsv.includes('"=""9:15"""'), 'เลขธรรมดาไม่ห่อ ค่าที่ Excel แปลงได้ห่อ');
    assert.deepEqual(parseCsv(oddCsv)[0], odd);
    // หัวตารางหลังแถวว่าง
    assert.equal(rowsToQuestions([[1, ['']], [2, SHEET_HEAD], [3, ['1+1', '2', '3', '', '', '', '', '1']]], '').length, 1);
    // ตัวคั่น ; และ Windows-874 (Excel ไทยบันทึก CSV ธรรมดา)
    assert.deepEqual(parseCsv('a;"b;c"\r\n'), [['a', 'b;c']]);
    const tis = Uint8Array.from([0xa1, 0x2c, 0xa2]); // ก,ข
    assert.equal(decodeText(tis), 'ก,ข');
    // แถวมีปัญหา: บอกเหตุ ไม่ล้ม
    const bad = rowsToQuestions(
      [
        [1, ['', 'a', 'b', '', '', '', '', '1', '20', '']],
        [2, ['โจทย์', 'a', '', '', '', '', '', '3', '7', 'xx']],
        [3, ['โจทย์', 'a', 'b', '', '', '', '', '', '', '']],
        [4, ['', '', '', '']],
      ],
      ''
    );
    assert.equal(bad.length, 3, 'แถวว่างข้าม');
    assert.ok(bad.every((r) => !r.q && r.errs.length));
    assert.ok(bad[0].errs.includes('ยังไม่ได้ใส่โจทย์'));
    assert.ok(bad[1].errs.some((e) => e.includes('ชนิด')) && bad[1].errs.some((e) => e.startsWith('เวลา')));
    assert.ok(bad[2].errs.includes('ยังไม่ได้เลือกคำตอบที่ถูก'));
    // xlsx: ช่องว่างข้ามคอลัมน์ + shared string แบบหลายช่วง + inlineStr
    const zip = new JSZip();
    zip.file('xl/workbook.xml', '<workbook><sheets><sheet name="A" sheetId="1" r:id="rId1"/></sheets></workbook>');
    zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="/xl/worksheets/s.xml"/></Relationships>');
    zip.file('xl/sharedStrings.xml', '<sst><si><r><t>2 + </t></r><r><t>2 = ?</t></r></si><si><t>4</t></si></sst>');
    zip.file('xl/worksheets/s.xml', '<worksheet><sheetData><row r="3"><c r="A3" t="s"><v>0</v></c><c r="B3" t="s"><v>1</v></c><c r="C3" t="inlineStr"><is><t>5</t></is></c><c r="H3"><v>1</v></c></row></sheetData></worksheet>');
    const xr = await xlsxRows(await zip.generateAsync({ type: 'uint8array' }));
    assert.equal(xr[0][0], 3);
    const xq = rowsToQuestions(xr, '');
    assert.equal(richToCell(xq[0].q!.text), '2 + 2 = ?');
    assert.deepEqual(xq[0].q!.choices.map((c) => [richToCell(c.text), c.correct]), [['4', true], ['5', false]]);
    passed++;
    console.log('  ok  นำเข้า/ส่งออกคำถาม CSV/XLSX: แม่แบบ ส่งออก-นำเข้ากลับ กัน Excel แปลงค่า Windows-874 แถวผิด');
  }
  {
    // วาดวงรอบเป้า: ครบ ~1.6PI = เลือก / วาดนอกวงแหวน = ไม่นับ / ค้างนิ่งเฉยๆ = ไม่เลือก
    const T = [{ id: 'a', x: 0, y: 0, r: 50 }, { id: 'b', x: 400, y: 0, r: 50 }];
    const cd = new CircleDraw();
    let got: string | null = null;
    for (let i = 0; i <= 40 && !got; i++) got = cd.update({ x: Math.cos(i * 0.16) * 70, y: Math.sin(i * 0.16) * 70 }, T, 33);
    assert.equal(got, 'a');
    const still = new CircleDraw();
    for (let i = 0; i < 90; i++) assert.equal(still.update({ x: 60, y: 0 }, T, 33), null);
    const far = new CircleDraw();
    for (let i = 0; i < 60; i++) assert.equal(far.update({ x: Math.cos(i * 0.16) * 200, y: Math.sin(i * 0.16) * 200 }, T, 33), null);
    // ปัด: เร็วพอ + เริ่มนอกเป้า = เลือก / ช้า = ไม่เลือก / โบกกลับทันที = ติดพัก
    const sw = new Swipe(() => 600);
    let hit: string | null = null;
    for (let x = -200; x <= 200 && !hit; x += 40) hit = sw.update({ x, y: 0 }, T, 33);
    assert.equal(hit, 'a');
    let again: string | null = null;
    for (let x = 200; x >= -200; x -= 40) again = again || sw.update({ x, y: 0 }, T, 33);
    assert.equal(again, null);
    const slow = new Swipe(() => 600);
    for (let x = -200; x <= 200; x += 5) assert.equal(slow.update({ x, y: 0 }, T, 33), null);
    // โค้ดสมาชิก 10 หลัก: ไม่มีตัวอ่านสับสน
    const code = makeCode(new Uint8Array(Array.from({ length: 24 }, (_, i) => (i * 37) % 248)));
    assert.ok(isCode(code));
    assert.ok(!/[01OIL]/.test(CODE_ABC));
    assert.equal(normCode(' abcde-fghjk '), 'ABCDEFGHJK');
    assert.ok(!isCode('ABCDEFGHJ0'));
    assert.equal(makeCode(new Uint8Array([250, 251, 252])), '');
    passed++;
    console.log('  ok  ท่าเลือกเป้าแต่ละเกม AR (วาดวง/ปัด) + โค้ดสมาชิก 10 หลัก');
  }
  {
    // แม่แบบชุดคำถาม: ทุกวิชามี ผ่านตัวกรองครบ 1 ข้อถูกต่อข้อ ตำแหน่งข้อถูกไม่ซ้ำที่เดิมตลอด
    const { SET_TEMPLATES, SET_SUBJECTS, buildSetTemplate } = await import('../src/lib/game-creator/setTemplates');
    const { sanitizeQuiz: clean, quizIssues: issues } = await import('../src/lib/game-creator/quiz');
    for (const s of SET_SUBJECTS.filter((x) => x.id !== 'thai' && x.id !== 'social')) assert.ok(SET_TEMPLATES.some((t) => t.subject === s.id), `ไม่มีแม่แบบวิชา ${s.id}`);
    assert.equal(new Set(SET_TEMPLATES.map((t) => t.id)).size, SET_TEMPLATES.length);
    for (const t of SET_TEMPLATES) {
      const c = clean(buildSetTemplate(t), '');
      assert.equal(c.questions.length, t.qs.length, t.id);
      assert.deepEqual(issues(c), [], t.id);
      for (const q of c.questions) assert.equal(q.choices.filter((x) => x.correct).length, 1, t.id);
      assert.ok(new Set(c.questions.map((q) => q.choices.findIndex((x) => x.correct))).size > 1, t.id);
    }
    passed++;
    console.log('  ok  แม่แบบชุดคำถามแยกวิชา: ครบทุกวิชา ผ่านตัวกรอง ข้อถูก 1 ตัวเลือก');
  }
  {
    // คลังแม่แบบ ป.1–ม.6: 500+ ชุด ทุกชั้นทุกวิชา ข้อสร้างซ้ำได้เหมือนเดิม ตัวเลือกไม่ซ้ำ ไม่มีอิโมจิ/ค่าพัง
    const { allSets, buildSet, SET_CATS } = await import('../src/lib/game-creator/setBank');
    const { sanitizeQuiz: clean, quizIssues: issues } = await import('../src/lib/game-creator/quiz');
    const sets = allSets();
    assert.ok(sets.length >= 550, `แม่แบบมี ${sets.length} ชุด`);
    for (const sub of ['thai', 'social'] as const) for (let g = 1; g <= 6; g++) assert.ok(sets.filter((s) => s.subject === sub && s.g === g).length >= 4, sub + g);
    assert.equal(new Set(sets.map((s) => s.id)).size, sets.length);
    for (const sub of ['math', 'sci', 'eng'] as const) for (let g = 1; g <= 12; g++) assert.ok(sets.some((s) => s.subject === sub && s.g <= g && g <= (s.g2 || s.g)), `ไม่มี ${sub} ชั้น ${g}`);
    const txt = (r: { v: string }[]) => r.map((s) => s.v).join('');
    for (const m of sets) {
      assert.ok(SET_CATS[m.subject].some((c) => c.id === m.cat), m.id);
      const b = buildSet(m.id)!;
      assert.equal(JSON.stringify(buildSet(m.id)!.content.questions.map((q) => [q.text, q.choices.map((c) => [c.text, c.correct])])), JSON.stringify(b.content.questions.map((q) => [q.text, q.choices.map((c) => [c.text, c.correct])])), m.id);
      const c = clean(b.content, '');
      assert.ok(c.questions.length >= 8, m.id);
      assert.deepEqual(issues(c), [], m.id);
      for (const q of b.content.questions) {
        const all = JSON.stringify(q);
        assert.ok(!/\p{Extended_Pictographic}|NaN|undefined|Infinity/u.test(all), `${m.id}: ${txt(q.text)}`);
        assert.equal(q.choices.filter((x) => x.correct).length, 1, m.id);
        const ts = q.choices.map((x) => JSON.stringify(x.text));
        assert.equal(new Set(ts).size, ts.length, `${m.id} ตัวเลือกซ้ำ: ${txt(q.text)}`);
      }
    }
    assert.equal(buildSet('nope'), null);
    // ปกชุดคำถาม: รับเฉพาะสติกเกอร์ของเว็บ หรือรูปในที่เก็บของเรา
    const { parseCover, cleanCover } = await import('../src/lib/game-creator/cover');
    const pre = 'https://x.supabase.co/storage/v1/object/public/game-media/';
    const uidp = '0b9a2c1e-1111-2222-3333-444455556666/abc.webp';
    assert.equal(parseCover('st:pencil:2', pre)?.kind, 'sticker');
    assert.equal(parseCover('st:pencil:9', pre), null);
    assert.equal(parseCover(pre + uidp, pre)?.kind, 'image');
    assert.equal(parseCover('https://evil.example/a.png', pre), null);
    assert.equal(parseCover(pre + '../x.png', pre), null);
    assert.equal(cleanCover('javascript:alert(1)', pre), undefined);
    const withCover = clean({ v: 1, questions: [], cover: pre + uidp }, pre);
    assert.equal(withCover.cover, pre + uidp);
    assert.equal(clean({ v: 1, questions: [], cover: 'https://evil.example/a.png' }, pre).cover, undefined);
    const { mediaPaths: paths, quizCover: qc } = await import('../src/lib/game-creator/quiz');
    assert.deepEqual(paths(withCover), [uidp]);
    assert.equal(qc(withCover), pre + uidp);
    passed++;
    console.log(`  ok  คลังแม่แบบ ป.1–ม.6 ${sets.length} ชุด ครบทุกชั้น/วิชา + ไอคอนปกชุดคำถาม`);
  }
  {
    // รายงานผลหลังเล่น: ข้อยาก/ง่าย รายบุคคล ตอบหลายครั้ง (โหมดวนซ้ำ) + ไฟล์ Excel + แบ่งภาษาเสียงอ่าน
    const { buildReport, reportSheets } = await import('../src/lib/game-creator/report');
    const qs = [0, 1, 2].map((i) => ({ i, label: `โจทย์ ${i + 1}`, answer: 'ก', choices: [{ id: 'a', label: 'ก' }, { id: 'b', label: 'ข' }] }));
    const ps = [
      { id: 'p1', nickname: 'มด', score: 300 },
      { id: 'p2', nickname: 'ปู', score: 100 },
      { id: 'p3', nickname: 'ไม่ได้ตอบ', score: 0 },
    ];
    const A = (p: string, q: number, c: boolean, picks: string[] = [c ? 'a' : 'b']) => ({ p, q, c, picks, ms: 2000 });
    const r = buildReport(qs, ps, [A('p1', 0, true), A('p1', 1, true), A('p1', 2, true), A('p2', 0, true), A('p2', 1, false), A('p2', 1, false), A('p2', 2, false, []), A('kicked', 0, false)]);
    assert.equal(r.questions[0].pct, 100);
    assert.equal(r.questions[1].pct, 33);
    assert.deepEqual(r.questions[1].wrongTop, { label: 'ข', n: 2 });
    assert.equal(r.questions[2].wrongTop?.label, 'ไม่ได้ตอบ (หมดเวลา)');
    assert.equal(r.summary.hardest[0].i, 1);
    assert.equal(r.summary.easiest[0].i, 0);
    assert.equal(r.summary.attempts, 7, 'ไม่นับคำตอบของผู้เล่นที่ถูกเชิญออก');
    assert.equal(r.summary.answered, 2);
    const p2 = r.players.find((p) => p.id === 'p2')!;
    assert.deepEqual(p2.cells, ['ถูก', 'ผิด 2/2', 'ผิด']);
    assert.deepEqual(p2.wrong, [1, 2]);
    assert.deepEqual(r.summary.needHelp.map((p) => p.id), ['p2']);
    assert.equal(r.players[0].id, 'p1');
    assert.equal(r.players.find((p) => p.id === 'p3')!.pct, null);
    const sheets = reportSheets(r, 'ทดสอบ');
    assert.equal(sheets.length, 3);
    assert.equal(sheets[2].rows[0].length, 4);
    const { buildXlsx } = await import('../src/lib/game-creator/xlsxWrite');
    const { xlsxRows } = await import('../src/lib/game-creator/quizSheet');
    const blob = await buildXlsx(sheets);
    const back = await xlsxRows(new Uint8Array(await blob.arrayBuffer()));
    assert.ok(back.some(([, row]) => row.includes('โจทย์ 2') && row.includes('ข (2)')), 'อ่านไฟล์ Excel กลับได้');
    const { speechRuns } = await import('../src/components/creator/SpeakButton');
    assert.deepEqual(speechRuns('เลือกคำที่ถูก: She ___ to school. 1. go'), [
      { lang: 'th-TH', text: 'เลือกคำที่ถูก:' },
      { lang: 'en-US', text: 'She ___ to school. 1. go' },
    ]);
    // ตัวเลข/เครื่องหมายล้วนอ่านด้วยภาษาของข้อความข้างๆ (ไม่สลับเป็นเสียงอังกฤษกลางประโยคไทย)
    assert.deepEqual(speechRuns('25 + 13 เท่ากับเท่าไร. 1. 38'), [{ lang: 'th-TH', text: '25 + 13 เท่ากับเท่าไร. 1. 38' }]);
    assert.deepEqual(speechRuns('7 x 8 = ?'), [{ lang: 'en-US', text: '7 x 8 = ?' }]);
    passed++;
    console.log('  ok  รายงานผลหลังเล่น (รายข้อ/รายบุคคล/Excel) + แบ่งภาษาเสียงอ่านโจทย์');
  }
  {
    const SS = await import('../src/lib/game-creator/shape/settings');
    const fs = await import('node:fs');
    const path = await import('node:path');
    const EMO = /\p{Extended_Pictographic}|️/u;
    const files = ['src/lib/game-creator/shape/settings.ts', 'src/components/creator/games/shape/ShapeGame.tsx', 'src/components/creator/games/shape/ShapeSetup.tsx', 'src/components/creator/games/shape/KidStage.tsx', 'src/components/creator/games/shape/shape.css', 'src/app/play/shape/page.tsx'];
    for (const f of files) assert.ok(!EMO.test(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')), `${f} มีอิโมจิ`);
    // ชุดคำถามมีได้สูงสุด 6 ตัวเลือก ทุกตัวเลือกต้องมีท่าไม่ซ้ำกัน
    assert.equal(SS.CHOICE_POSES.length, 6);
    assert.equal(new Set(SS.CHOICE_POSES.map((p) => JSON.stringify([p.la, p.ra, p.ll, p.dy]))).size, 6);
    assert.equal(new Set(SS.CHOICE_POSES.map((p) => p.name)).size, 6);
    // แตะทีม: ต่อท้าย / แตะซ้ำเอาออก ทีมหลังขยับอันดับ
    assert.deepEqual(SS.toggleTeam([1, 3], 0), [1, 3, 0]);
    assert.deepEqual(SS.toggleTeam([1, 3, 0], 1), [3, 0]);
    // คะแนน
    assert.deepEqual([0, 1, 2, 3, 7].map((r) => SS.pointsFor(r, true)), [10, 8, 6, 5, 5]);
    assert.deepEqual([0, 1, 7].map((r) => SS.pointsFor(r, false)), [10, 10, 10]);
    assert.deepEqual(SS.totals([{ teams: [2, 0], order: true }, { teams: [0, 1], order: false }, { teams: [], order: true }], 3), [18, 10, 10]);
    assert.deepEqual(SS.ranks([18, 10, 10]), [1, 2, 2]);
    assert.equal(SS.teamName(1), 'ทีม B');
    // URL ไป-กลับ + ค่าแปลกปลอม
    const s = { teams: 6, count: 10, order: false, music: 'happy' };
    const qs = new URLSearchParams(SS.shapeQuery('x', s));
    assert.deepEqual(SS.parseShapeSettings((k) => qs.get(k)), s);
    const bad = new URLSearchParams('teams=99&n=7&music=<b>');
    assert.deepEqual(SS.parseShapeSettings((k) => bad.get(k)), SS.SHAPE_DEFAULTS);
    passed++;
    console.log('  ok  มนุษย์สร้างรูป: ท่าครบทุกตัวเลือก อันดับ คะแนน ไม่มีอิโมจิ');
  }
  {
    // ตรวจคำผิดไทย: กฎสะกด + พจนานุกรม (ใช้พจนานุกรมจริงที่เสิร์ฟให้เบราว์เซอร์)
    assert.equal(ruleCheck('สวัสดี'), null);
    assert.equal(ruleCheck('สิทธิ์'), null, 'ิ์ ถูกต้อง');
    assert.equal(ruleCheck('เเล้ว')?.fix, 'แ', 'เเ -> แ');
    assert.ok(ruleCheck('ก้่'), 'วรรณยุกต์ซ้อน');
    assert.ok(ruleCheck('ิก'), 'ขึ้นต้นด้วยสระบน');
    const { readFileSync } = await import('node:fs');
    buildDict(readFileSync(new URL('../public/dict/th-words.txt', import.meta.url), 'utf8').split('\n'));
    assert.deepEqual(checkText('ห้องเรียนอนุบาล สวัสดีครับ วันนี้อากาศดี'), []);
    assert.ok(checkText('คณิตสาตร์สนุกมาก').length > 0, 'สาตร์ ผิด');
    assert.ok(suggest('สาตร์', 8).length > 0);
    assert.deepEqual(checkText('ฟอนต์เรนจ์'), [], 'ทับศัพท์ลงท้ายการันต์ไม่ขีด');
    assert.equal(new Set(FONT_IDS).size, FONT_IDS.length, 'ฟอนต์ไม่ซ้ำ');
    passed++;
    console.log('  ok  ตรวจคำผิดไทย: กฎสะกด + พจนานุกรม + ฟอนต์ไม่ซ้ำ');
  }
  {
    const { deviceLabel, cleanVisitPath } = await import('../src/lib/visit-device');
    assert.equal(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Version/17.0 Mobile/15E148 Safari/604.1'), 'มือถือ · Safari');
    assert.equal(deviceLabel('Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit Chrome/120.0 Safari/537.36'), 'แท็บเล็ต · Chrome');
    assert.equal(deviceLabel('Mozilla/5.0 (Windows NT 10.0) AppleWebKit Chrome/120.0 Safari/537.36 Edg/120.0'), 'คอม · Edge');
    assert.equal(deviceLabel('Mozilla/5.0 (Linux; Android 13) Mobile Safari Line/13.1'), 'มือถือ · LINE');
    assert.equal(cleanVisitPath('/play?code=123456'), '/play');
    assert.equal(cleanVisitPath('//evil.com'), null);
    assert.equal(cleanVisitPath('https://x'), null);
    passed++;
    console.log('  ok  บันทึกการเข้าเว็บ: ป้ายเครื่อง + path ไม่มี query');
  }
  {
    const O = await import('../src/lib/worksheet/options');
    const R = await import('../src/lib/worksheet/recipe');
    const C = await import('../src/lib/worksheet/contest');
    // 9 วิชาตามที่ผู้ใช้สั่ง ทุกวิชามีหัวข้อ + กิจกรรม id ไม่ซ้ำ
    assert.deepEqual(O.SUBJECTS.map((s) => s.id).sort(), ['chinese', 'eng', 'health', 'japanese', 'math', 'pe', 'sci', 'social', 'thai']);
    for (const s of O.SUBJECTS) {
      assert.ok(s.topics.length >= 8, s.id);
      assert.equal(new Set(s.topics.map((t) => t.id)).size, s.topics.length, s.id);
      for (const t of s.topics) assert.match(t.id, /^[a-z0-9-]+$/, t.id);
      assert.ok(O.activitiesFor(s.id).length >= 16, s.id);
    }
    for (const list of [O.ACTIVITIES, O.THEMES, O.STYLES, O.FRAMES, O.DECOS, O.HEADS, O.SCENES, O.PATTERNS, O.CHARS, O.LAYOUTS, O.LOOKS] as unknown as { id: string }[][]) assert.equal(new Set(list.map((x) => x.id)).size, list.length);
    // ห้ามอิโมจิ/ลูกศรที่กลายเป็นอิโมจิ ในข้อความทุกตัวเลือกและ prompt
    const bad = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}↔️]/u;
    assert.ok(!bad.test(JSON.stringify([O.SUBJECTS, O.ACTIVITIES, O.THEMES, O.STYLES, O.FRAMES, R.PRESETS, O.HEADS, O.SCENES, O.PATTERNS, O.CHARS, O.LAYOUTS])));
    // cleanRecipe: ค่าขยะได้สูตรที่ใช้ได้, ไปกลับผ่าน URL ได้ค่าเดิม, prompt คงที่
    const junk = R.cleanRecipe({ s: 'x', g: 99, a: 'tian', n: 500, txt: 'evil', note: 'hi "there"\n<script>', cu: '' });
    assert.equal(junk.s, 'math');
    assert.equal(junk.g, 12);
    assert.notEqual(junk.a, 'tian'); // กิจกรรมเฉพาะจีน ใช้กับคณิตไม่ได้
    assert.equal(junk.n, O.COUNT_MAX);
    assert.equal(junk.txt, 'blank');
    assert.ok(!/["<>\n]/.test(junk.note));
    assert.equal(R.cleanRecipe({ s: 'chinese', a: 'tian' }).a, 'tian');
    assert.equal(R.cleanRecipe({ tp: 'custom', cu: '' }).tp, 'count'); // พิมพ์เองแต่ว่าง = กลับเป็นหัวข้อแรก
    for (let i = 0; i < 60; i++) {
      let seed = i * 7919 + 1;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const r = R.randomRecipe(rnd);
      assert.deepEqual(R.decodeRecipe(R.encodeRecipe(r)), r);
      const p = R.buildPrompt(r);
      assert.equal(p, R.buildPrompt(R.cleanRecipe(JSON.parse(JSON.stringify(r)))));
      assert.ok(!bad.test(p) && p.includes('A4') && p.length < 8000);
    }
    for (const p of R.PRESETS) assert.equal(R.presetRecipe(p).a, p.r.a, p.id); // ชุดสำเร็จรูปไม่ถูกซ่อมทิ้ง
    assert.equal(R.decodeRecipe('***'), null);
    assert.ok(R.buildPrompt({ ...R.defaultRecipe(), txt: 'blank' }).includes('Leave every box'));
    // prompt บอกโครงหน้าตามกระดาษตัวอย่าง: จำนวนชิ้นเท่ากับ itemCount, ช่องที่ปิดไว้ไม่ถูกสั่ง
    const lay = R.buildPrompt({ ...R.defaultRecipe(), a: 'match', n: 14, score: false, mascot: false });
    assert.ok(lay.includes(`${R.itemCount('match', 14)} empty rounded boxes`) && lay.includes('EXACT LAYOUT'));
    assert.ok(!lay.includes('score circle') && !lay.includes('mascot'));
    assert.equal(R.itemCount('fill', 17), 17);
    // ธีม+ของตกแต่งเพิ่ม 70+ แบบ (เดิม 16 ธีม) ทุกชิ้นมีหมวด/ไอคอนที่วาดได้
    const L = await import('../src/lib/worksheet/layout');
    assert.ok(O.THEMES.length - 16 + O.DECOS.length >= 70);
    for (const t of O.THEMES) {
      assert.ok(O.THEME_CATS.some((c) => c.id === t.cat), t.id);
      assert.ok(t.motif === '' || (O.MOTIFS as readonly string[]).includes(t.motif), t.id);
      for (const c of t.pal) assert.match(c, /^#[0-9a-f]{6}$/, t.id);
    }
    for (const d of O.DECOS) {
      assert.ok((O.MOTIFS as readonly string[]).includes(d.motif) && O.DECO_PLACES.some((p) => p.id === d.place), d.id);
      assert.ok(d.color === 'a' || d.color === 'b' || /^#[0-9a-f]{6}$/.test(d.color), d.id);
    }
    for (const m of O.MOTIFS) assert.ok(O.MOTIF_EN[m], m);
    assert.deepEqual(R.cleanRecipe({ dz: ['d-heart-c', 'x', 'd-heart-c', 'd-star-c', 'd-bow-c', 'd-crown-c'] }).dz, ['d-heart-c', 'd-star-c', 'd-bow-c']);
    // ลูกเต๋า: วิชา/ชั้นคงเดิม และแท็บอื่นเปลี่ยนเฉพาะช่องของแท็บนั้น
    const base = R.cleanRecipe({ ...R.defaultRecipe(), s: 'sci', g: 5, tp: 'solar', a: 'lablog', th: 'robot', st: 'flat' });
    for (let i = 0; i < 40; i++) {
      let seed = i * 104729 + 3;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (const part of ['subject', 'topic', 'act', 'look', 'theme', 'style', 'page', 'extra'] as const) {
        const x = R.randomPart(base, part, rnd, part === 'theme' ? ['ocean', 'beach'] : undefined);
        assert.equal(x.s, 'sci');
        assert.equal(x.g, 5);
        const changed = (Object.keys(base) as (keyof typeof base)[]).filter((k) => JSON.stringify(x[k]) !== JSON.stringify(base[k]));
        const allow: Record<string, string[]> = { topic: ['tp', 'cu'], act: ['a', 'n', 'lv'], look: ['th', 'hd', 'fr', 'sc', 'pt', 'ch', 'mascot'], theme: ['th'], style: ['st', 'fr', 'hd', 'sc', 'pt'], page: ['o', 'lang', 'big'], extra: ['name', 'score', 'mascot', 'sticker', 'key', 'dz', 'ch'] };
        if (part !== 'subject') for (const k of changed) assert.ok(allow[part].includes(k), `${part} changed ${k}`);
        if (part === 'theme') assert.ok(['ocean', 'beach'].includes(x.th));
      }
    }
    // prompt บอกตำแหน่งเป็นมิลลิเมตรจาก geometry ตัวเดียวกับกระดาษตัวอย่าง
    const rr = R.cleanRecipe({ ...R.defaultRecipe(), dz: ['d-heart-c'] });
    const gg = L.geometry(rr);
    const pp = R.buildPrompt(rr);
    assert.ok(pp.includes(`y ${gg.body.y} to ${Math.round((gg.body.y + gg.body.h) * 10) / 10} mm`));
    assert.ok(pp.includes(`radius ${gg.score!.r} mm`) && pp.includes('heart') && pp.includes('EXACT LAYOUT'));
    assert.equal(L.decoPoints('corners', 210, 297, 10).length, 4);
    // แบบสำเร็จรูป 500+ (ผู้ใช้สั่ง 13 พ.ย. 2026): นับจากรายการจริง ทุกแบบต่างกันจริง ผ่าน cleanRecipe และส่งผ่านลิงก์ได้
    assert.ok(O.LOOKS.length >= 500, `looks ${O.LOOKS.length}`);
    assert.equal(O.LOOKS.length, O.THEMES.length * O.LAYOUTS.length);
    const lookSig = new Set<string>();
    const artIds = new Set([...(await import('../src/lib/studio/char')).ANIMAL_PRESETS, ...(await import('../src/lib/studio/char')).CHAR_PRESETS].map((x) => x.id));
    for (const c of O.CHARS) assert.ok(artIds.has(c.id) && c.en.length > 20, c.id); // ทุกตัวมีภาพให้วาด + คำบรรยาย
    for (const y of O.LAYOUTS) {
      assert.ok(O.HEADS.some((x) => x.id === y.hd) && O.FRAMES.some((x) => x.id === y.fr) && O.SCENES.some((x) => x.id === y.sc) && O.PATTERNS.some((x) => x.id === y.pt), y.id);
    }
    assert.equal(new Set(O.LAYOUTS.map((y) => [y.hd, y.fr, y.sc, y.pt].join())).size, O.LAYOUTS.length);
    for (const l of O.LOOKS) {
      const x = R.applyLook(R.defaultRecipe(), l);
      assert.equal(x.th, l.theme.id);
      assert.equal(x.hd, l.layout.hd);
      assert.equal(x.ch, l.ch);
      assert.deepEqual(R.cleanRecipe(JSON.parse(JSON.stringify(x))), x);
      assert.equal(R.lookOf(x)?.id, l.id);
      const enc = R.encodeRecipe(x);
      assert.ok(enc.length <= 2000 && R.decodeRecipe(enc)?.hd === x.hd, l.id);
      lookSig.add([x.th, x.hd, x.fr, x.sc, x.pt].join());
      const gl = L.geometry(x);
      assert.ok(gl.body.h >= 120 && gl.body.y + gl.body.h <= gl.H - gl.m, l.id); // เนื้อหายังมีที่พอ ไม่ล้นแผ่น
      if (gl.char) assert.ok(gl.char.box.y + gl.char.box.h <= gl.body.y && gl.char.bubble.x >= gl.char.box.x + gl.char.box.w, l.id);
      if (gl.scene.top) assert.ok(gl.scene.top.y + gl.scene.top.h <= gl.head.y, l.id);
      if (gl.scene.bottom) assert.ok(gl.scene.bottom.y >= gl.body.y + gl.body.h, l.id);
    }
    assert.equal(lookSig.size, O.LOOKS.length);
    // สูตรเก่า (ก่อนมีช่อง hd/sc/pt/ch) ได้หน้าตาเดิม: ไม่มีฉาก ไม่มีตัวการ์ตูน prompt แบบเดิม
    const old = R.cleanRecipe({ v: 1, s: 'math', g: 3, tp: 'frac', a: 'color', th: 'space', st: 'cartoon', fr: 'theme', mascot: true });
    assert.deepEqual([old.hd, old.sc, old.pt, old.ch], ['bar', 'none', 'plain', '']);
    const og = L.geometry(old);
    assert.ok(!og.rich && og.mascot && !og.char && og.head.y === 16 && og.body.y === 72);
    const op = R.buildPrompt(old);
    assert.ok(op.includes('do not add, remove or move anything') && op.includes('7 mm corner radius') && op.includes('one original mascot face') && !op.includes('decoration strip'));
    // แบบใหม่: prompt บอกทรงหัว ตัวการ์ตูน ฉาก ตามตำแหน่งเดียวกับกระดาษตัวอย่าง และไม่ห้ามตกแต่ง
    const nw = R.applyLook(R.defaultRecipe(), O.lookById('ocean.hill')!);
    const ng = L.geometry(nw);
    const np = R.buildPrompt(nw);
    assert.ok(ng.rich && ng.char && ng.scene.bottom);
    assert.ok(np.includes('paint-blob') && np.includes(ng.char!.en) && np.includes('Bottom decoration strip') && np.includes(`y ${ng.scene.bottom!.y} to`));
    assert.ok(!np.includes('do not add, remove or move anything') && !np.includes('extra decorations') && np.includes('EXACT LAYOUT'));
    // อันดับ: ใจมากก่อน เท่ากัน = ส่งก่อนชนะ, 1 คน 1 รางวัล, 0 ใจไม่ได้รางวัล
    const rows = [
      { id: 'a', owner_id: 'u1', created_at: '2026-11-02', like_count: 5 },
      { id: 'b', owner_id: 'u2', created_at: '2026-11-01', like_count: 5 },
      { id: 'c', owner_id: 'u1', created_at: '2026-11-01', like_count: 4 },
      { id: 'd', owner_id: 'u3', created_at: '2026-11-03', like_count: 0 },
    ];
    assert.deepEqual(C.rankEntries(rows).map((r) => r.id), ['b', 'a', 'c', 'd']);
    assert.deepEqual(C.pickWinners(rows, 3).map((r) => r.id), ['b', 'a']);
    assert.deepEqual(C.cleanPrizes([90, '60', -5, 9]), [90, 60, 0]);
    const ct = { starts_at: '2026-11-10T00:00:00Z', ends_at: '2026-11-20T00:00:00Z', awarded_at: null };
    assert.equal(C.phaseOf(ct, Date.parse('2026-11-09T00:00:00Z')), 'soon');
    assert.equal(C.phaseOf(ct, Date.parse('2026-11-15T00:00:00Z')), 'open');
    assert.equal(C.phaseOf(ct, Date.parse('2026-11-20T00:00:00Z')), 'ended');
    assert.equal(C.phaseOf({ ...ct, awarded_at: 'x' }), 'awarded');
    passed++;
    console.log('  ok  ตู้ใบงาน AI: 9 วิชา ตัวเลือก/prompt ไม่มีอิโมจิ สูตรไปกลับ URL + อันดับประกวด');
  }
  {
    // สร้างเกมด้วย AI: ทุกเกม x ทุกวิชา prompt ครบ ไม่มีอิโมจิ ใช้ชุดคำถามแล้วมีครบทุกข้อ
    const G = await import('../src/lib/aigame/games');
    const P = await import('../src/lib/aigame/prompt');
    const S = await import('../src/lib/aigame/samples');
    const O = await import('../src/lib/worksheet/options');
    const ids = G.AI_GAMES.map((g) => g.id);
    assert.equal(new Set(ids).size, ids.length, 'id เกมซ้ำ');
    assert.ok(G.AI_GAMES.length >= 8 && G.AI_GAMES.some((g) => g.dim === '3D') && G.AI_GAMES.some((g) => g.dim === '2D'));
    for (const g of G.AI_GAMES) {
      const text = [g.name, g.pitch, g.fit, g.scene, ...g.how, ...g.core, ...g.controls, ...g.progression, ...g.juice].join(' ');
      assert.ok(!P.hasEmoji(text), g.id);
      for (const s of O.SUBJECTS) {
        const r = P.cleanGameRecipe({ game: g.id, s: s.id, g: 4, topic: P.topicsFor(s.id, 4)[0].id });
        const p = P.buildGamePrompt(r);
        assert.ok(!P.hasEmoji(p), `${g.id}/${s.id} emoji`);
        assert.ok(p.includes(g.name) && p.includes(s.th) && p.includes('ป.4') && p.includes(P.topicLabel(r)), `${g.id}/${s.id}`);
        assert.ok(p.includes('const QUESTIONS') && p.includes('ห้ามใช้อิโมจิ'));
        assert.equal(p.includes('three.js'), g.dim === '3D');
      }
      for (const items of Object.values(S.SAMPLES)) for (const it of items) assert.ok(it.choices[it.correct[0]] !== undefined && !P.hasEmoji(it.q));
    }
    // ชุดคำถามของเว็บ: ทุกข้อเข้า prompt, ข้อพิมพ์ตอบ/หลายคำตอบ/รูปอย่างเดียว
    const quiz = {
      v: 1 as const,
      questions: [
        { id: 'a', text: [{ t: 'x' as const, v: 'ครึ่งของ ' }, { t: 'm' as const, v: '\\frac{1}{2}' }], media: null, multi: false, time: 20, points: 1 as const, choices: [{ id: '1', text: [{ t: 'x' as const, v: '1/4' }], media: null, correct: true }, { id: '2', text: [{ t: 'x' as const, v: '1' }], media: null, correct: false }] },
        { id: 'b', text: [{ t: 'x' as const, v: 'เลือกจำนวนคู่' }], media: null, multi: true, time: 20, points: 1 as const, choices: [2, 3, 4].map((n) => ({ id: String(n), text: [{ t: 'x' as const, v: String(n) }], media: null, correct: n % 2 === 0 })) },
        { id: 'c', text: [{ t: 'x' as const, v: 'สะกด cat' }], media: null, multi: false, time: 20, points: 1 as const, choices: [], kind: 'text' as const, answers: ['cat'] },
        { id: 'd', text: [], media: null, multi: false, time: 20, points: 1 as const, choices: [] },
      ],
    };
    const { items, skipped } = P.quizToItems(quiz);
    assert.equal(items.length, 3);
    assert.equal(skipped, 1);
    assert.deepEqual(items[1].correct, [0, 2]);
    assert.deepEqual(items[2].accept, ['cat']);
    const p = P.buildGamePrompt(P.cleanGameRecipe({ game: 'balloon', s: 'math', g: 3, source: 'mine' }), { items, setTitle: 'ชุดทดสอบ' });
    for (const it of items) assert.ok(p.includes(JSON.stringify(it.q)), it.q);
    assert.ok(p.includes('"answers":[0,2]') && p.includes('"type":"text"') && p.includes('ชุดทดสอบ') && p.includes('ทั้งหมด 3 ข้อ'));
    assert.ok(!p.includes('ให้แต่งคำถามเอง'));
    // ค่าแปลกปลอมกลับเป็นค่าเริ่มต้น และตัดอิโมจิจากข้อความครู
    const bad = P.cleanGameRecipe({ game: 'zzz', s: 'xx' as never, g: 99, count: 7, note: 'สนุก\u{1F600}มาก' });
    assert.equal(bad.game, G.AI_GAMES[0].id);
    assert.equal(bad.s, 'math');
    assert.equal(bad.count, 10);
    assert.ok(!P.hasEmoji(bad.note) && bad.note.includes('สนุก'));
    passed++;
    console.log('  ok  สร้างเกมด้วย AI: 8 เกม x 9 วิชา prompt ครบ ไม่มีอิโมจิ ชุดคำถามเข้าครบทุกข้อ');
  }
  console.log(`\n${passed} tests passed`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
