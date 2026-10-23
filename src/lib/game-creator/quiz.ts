/**
 * ตรรกะของ Template "ควิซ" (ใช้ได้ทั้งฝั่งเบราว์เซอร์และเซิร์ฟเวอร์ ไม่มี I/O)
 * - sanitizeQuiz: ทำความสะอาดเนื้อหาที่มาจากผู้ใช้ (ห้ามเชื่อ jsonb ตรงๆ)
 * - quizIssues: สิ่งที่ยังไม่ครบ (ใช้ในหน้าแก้ไข + ก่อนเปิดห้อง)
 * - checkAnswer / scoreFor: ตรวจคำตอบและคิดคะแนน (ฝั่งเซิร์ฟเวอร์เป็นตัวจริง)
 */
import type { MediaRef, PointsMode, PublicQuestion, QuizChoice, QuizContent, QuizQuestion, Rich, Seg } from './types';

/** คำตอบแบบพิมพ์: จำนวน/ความยาวสูงสุด */
export const ANSWER_MAX = 6;
export const ANSWER_CHARS = 60;

export const LIMITS = {
  questions: 100,
  choicesMin: 2,
  choicesMax: 6,
  questionChars: 400,
  choiceChars: 160,
  texChars: 400,
  segs: 60,
  title: 80,
} as const;

/** คลิปในโจทย์ยาวได้ไม่เกิน 30 วินาที (ตัดในเครื่องตอนอัปโหลด) */
export const VIDEO_MAX_SECONDS = 30;
/** คลิปเสียงยาวได้ไม่เกิน 60 วินาที */
export const AUDIO_MAX_SECONDS = 60;
export const TIME_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 0] as const;
export const DEFAULT_TIME = 20;
/** เวลาเผื่อเน็ตช้าหลังหมดเวลา (มิลลิวินาที) */
export const TIME_GRACE_MS = 2500;

export const uid = (n = 10) => {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  const r = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(n)) : null;
  for (let i = 0; i < n; i++) s += a[(r ? r[i] : Math.floor(Math.random() * 256)) % a.length];
  return s;
};

/* ------------------------------- Rich text ------------------------------- */

export const richFromText = (s: string): Rich => (s ? [{ t: 'x', v: s }] : []);

export function richLength(r: Rich): number {
  return r.reduce((n, s) => n + (s.t === 'x' ? s.v.length : 3), 0);
}

export function richIsEmpty(r: Rich | null | undefined): boolean {
  return !r || !r.some((s) => (s.t === 'x' ? s.v.trim() !== '' : s.v.trim() !== ''));
}

/** ข้อความล้วน (ใช้เป็นชื่อในรายการ/ค้นหา) สูตรแสดงเป็น [สูตร] แบบสั้น */
export function richToPlain(r: Rich, max = 80): string {
  const s = r
    .map((x) => (x.t === 'x' ? x.v : texToPlain(x.v)))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/** แปลง LaTeX อย่างง่ายเป็นข้อความอ่านได้ (เช่น \frac{1}{2} -> 1/2) สำหรับตัวอย่างสั้นๆ */
export function texToPlain(tex: string): string {
  let s = tex;
  for (let i = 0; i < 4; i++) s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2');
  return s
    .replace(/\\sqrt\{([^{}]*)\}/g, '√$1')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\cdot/g, '·')
    .replace(/\\pi/g, 'π')
    .replace(/\\le(q)?/g, '≤')
    .replace(/\\ge(q)?/g, '≥')
    .replace(/\\neq?/g, '≠')
    .replace(/\^\{([^{}]*)\}/g, '^$1')
    .replace(/\\left|\\right/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .trim();
}

const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function cleanRich(input: unknown, maxChars: number): Rich {
  if (!Array.isArray(input)) return typeof input === 'string' ? richFromText(input.replace(CTRL, '').slice(0, maxChars)) : [];
  const out: Seg[] = [];
  let used = 0;
  for (const raw of input.slice(0, LIMITS.segs)) {
    if (!raw || typeof raw !== 'object') continue;
    const t = (raw as Seg).t;
    const v = (raw as Seg).v;
    if (typeof v !== 'string') continue;
    if (t === 'x') {
      const room = maxChars - used;
      if (room <= 0) break;
      const text = v.replace(CTRL, '').replace(/\r\n?/g, '\n').slice(0, room);
      if (!text) continue;
      used += text.length;
      const prev = out[out.length - 1];
      if (prev && prev.t === 'x') prev.v += text;
      else out.push({ t: 'x', v: text });
    } else if (t === 'm') {
      const tex = v.replace(CTRL, '').slice(0, LIMITS.texChars).trim();
      if (!tex) continue;
      used += 3;
      out.push({ t: 'm', v: tex });
    }
  }
  return out;
}

/* ------------------------------- Media ------------------------------- */

function cleanMedia(input: unknown, mediaPrefix: string): MediaRef | null {
  if (!input || typeof input !== 'object') return null;
  const m = input as Partial<MediaRef>;
  if (m.kind !== 'image' && m.kind !== 'video' && m.kind !== 'audio') return null;
  if (typeof m.url !== 'string' || typeof m.path !== 'string') return null;
  if (m.url.length > 600 || m.path.length > 300) return null;
  if (!mediaPrefix || !m.url.startsWith(mediaPrefix)) return null;
  if (m.url.slice(mediaPrefix.length) !== m.path) return null;
  if (!/^[0-9a-f-]{36}\/[A-Za-z0-9_.-]{1,120}$/.test(m.path)) return null;
  const out: MediaRef = { kind: m.kind, url: m.url, path: m.path };
  const num = (x: unknown, lo: number, hi: number) => (typeof x === 'number' && isFinite(x) ? Math.min(hi, Math.max(lo, x)) : undefined);
  const w = num(m.w, 1, 10000);
  const h = num(m.h, 1, 10000);
  if (w && h) {
    out.w = Math.round(w);
    out.h = Math.round(h);
  }
  if (m.kind === 'video') {
    const start = num(m.start, 0, 36000) ?? 0;
    let end = num(m.end, 0, 36000) ?? start + VIDEO_MAX_SECONDS;
    if (end <= start || end - start > VIDEO_MAX_SECONDS + 0.05) end = start + VIDEO_MAX_SECONDS;
    out.start = Math.round(start * 100) / 100;
    out.end = Math.round(end * 100) / 100;
  }
  return out;
}

/* ------------------------------- Sanitize ------------------------------- */

const cleanId = (x: unknown) => (typeof x === 'string' && /^[a-z0-9]{4,16}$/.test(x) ? x : uid());

export function newChoice(correct = false, text = ''): QuizChoice {
  return { id: uid(), text: richFromText(text), media: null, correct };
}

export function newQuestion(): QuizQuestion {
  return {
    id: uid(),
    text: [],
    media: null,
    choices: [newChoice(true), newChoice(), newChoice(), newChoice()],
    multi: false,
    time: DEFAULT_TIME,
    points: 1,
  };
}

export function emptyQuiz(): QuizContent {
  return { v: 1, questions: [newQuestion()] };
}

export function sanitizeQuiz(input: unknown, mediaPrefix: string): QuizContent {
  const raw = input && typeof input === 'object' ? (input as Partial<QuizContent>) : {};
  const qs = Array.isArray(raw.questions) ? raw.questions.slice(0, LIMITS.questions) : [];
  const seenQ = new Set<string>();
  const questions: QuizQuestion[] = [];
  for (const q0 of qs) {
    if (!q0 || typeof q0 !== 'object') continue;
    const q = q0 as Partial<QuizQuestion>;
    let id = cleanId(q.id);
    while (seenQ.has(id)) id = uid();
    seenQ.add(id);
    const seenC = new Set<string>();
    const choices: QuizChoice[] = (Array.isArray(q.choices) ? q.choices.slice(0, LIMITS.choicesMax) : []).flatMap((c0) => {
      if (!c0 || typeof c0 !== 'object') return [];
      const c = c0 as Partial<QuizChoice>;
      let cid = cleanId(c.id);
      while (seenC.has(cid)) cid = uid();
      seenC.add(cid);
      return [{ id: cid, text: cleanRich(c.text, LIMITS.choiceChars), media: cleanMedia(c.media, mediaPrefix), correct: c.correct === true }];
    });
    const time = TIME_OPTIONS.includes(q.time as (typeof TIME_OPTIONS)[number]) ? (q.time as number) : DEFAULT_TIME;
    const points: PointsMode = q.points === 0 || q.points === 2 ? q.points : 1;
    let multi = q.multi === true;
    if (!multi && choices.filter((c) => c.correct).length > 1) multi = true;
    const media = cleanMedia(q.media, mediaPrefix);
    if (q.kind === 'text') {
      const answers = cleanAnswers(q.answers);
      questions.push({ id, text: cleanRich(q.text, LIMITS.questionChars), media, choices: [], multi: false, time, points, kind: 'text', answers });
      continue;
    }
    // ตัวเลือกมีได้แต่รูป/คลิป (เสียงใส่ในตัวเลือกไม่ได้)
    for (const c of choices) if (c.media?.kind === 'audio') c.media = null;
    questions.push({ id, text: cleanRich(q.text, LIMITS.questionChars), media, choices, multi, time, points });
  }
  return { v: 1, questions };
}

function cleanAnswers(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  const out: string[] = [];
  for (const a of x.slice(0, ANSWER_MAX)) {
    if (typeof a !== 'string') continue;
    const v = a.replace(CTRL, '').replace(/\s+/g, ' ').trim().slice(0, ANSWER_CHARS);
    if (v && !out.some((o) => normAnswer(o) === normAnswer(v))) out.push(v);
  }
  return out;
}

/** เทียบคำตอบแบบพิมพ์: ไม่สนตัวพิมพ์ใหญ่เล็ก ช่องว่าง จุดท้าย และเลขไทย/อารบิก */
export function normAnswer(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[\u0E50-\u0E59]/g, (d) => String(d.charCodeAt(0) - 0x0e50))
    .toLowerCase()
    .replace(/[\s\u200b]+/g, '')
    .replace(/[.,!?。]+$/, '');
}

export const isTextQ = (q: Pick<QuizQuestion, 'kind'>) => q.kind === 'text';

/** ตั้งเป็นคำถามถูก-ผิด (ตัวเลือก 2 ข้อ) */
export function trueFalseChoices(correctTrue = true): QuizChoice[] {
  return [newChoice(correctTrue, 'ถูก'), newChoice(!correctTrue, 'ผิด')];
}

export function cleanTitle(s: unknown): string {
  return typeof s === 'string' ? s.replace(CTRL, '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.title) : '';
}

/* ------------------------------- ตรวจความครบ ------------------------------- */

export interface Issue {
  q: number; // ลำดับคำถาม (เริ่ม 0)
  msg: string;
}

export const choiceFilled = (c: QuizChoice) => !richIsEmpty(c.text) || !!c.media;

export function quizIssues(content: QuizContent): Issue[] {
  const out: Issue[] = [];
  if (!content.questions.length) out.push({ q: -1, msg: 'ยังไม่มีคำถามเลย' });
  content.questions.forEach((q, i) => {
    if (richIsEmpty(q.text) && !q.media) out.push({ q: i, msg: 'ยังไม่ได้ใส่โจทย์' });
    if (isTextQ(q)) {
      if (!q.answers?.some((a) => a.trim())) out.push({ q: i, msg: 'ยังไม่ได้ใส่คำตอบที่ถูก' });
      return;
    }
    const filled = q.choices.filter(choiceFilled);
    if (filled.length < LIMITS.choicesMin) out.push({ q: i, msg: 'ต้องมีตัวเลือกอย่างน้อย 2 ข้อ' });
    if (q.choices.some((c) => !choiceFilled(c))) out.push({ q: i, msg: 'มีตัวเลือกที่ยังว่าง' });
    if (!q.choices.some((c) => c.correct && choiceFilled(c))) out.push({ q: i, msg: 'ยังไม่ได้เลือกคำตอบที่ถูก' });
  });
  return out;
}

/** เนื้อหาที่พร้อมเล่น: ตัดตัวเลือกว่างทิ้ง ข้ามคำถามที่ไม่สมบูรณ์ */
export function playableQuiz(content: QuizContent): QuizContent {
  const questions = content.questions
    .map((q) => ({ ...q, choices: q.choices.filter(choiceFilled) }))
    .filter((q) => (!richIsEmpty(q.text) || q.media) && (isTextQ(q) ? !!q.answers?.some((a) => a.trim()) : q.choices.length >= LIMITS.choicesMin && q.choices.some((c) => c.correct)));
  return { v: 1, questions };
}

export function quizCover(content: QuizContent): string | null {
  for (const q of content.questions) {
    if (q.media?.kind === 'image') return q.media.url;
  }
  for (const q of content.questions) for (const c of q.choices) if (c.media?.kind === 'image') return c.media.url;
  return null;
}

export function mediaPaths(content: QuizContent): string[] {
  const s = new Set<string>();
  content.questions.forEach((q) => {
    if (q.media) s.add(q.media.path);
    q.choices.forEach((c) => c.media && s.add(c.media.path));
  });
  return Array.from(s);
}

/* ------------------------------- การเล่น ------------------------------- */

/** สุ่มแบบกำหนด seed ได้ (mulberry32) ให้ผลซ้ำได้เมื่อรีเฟรช */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function questionOrder(n: number, shuffle: boolean, seed: string): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  return shuffle ? shuffled(idx, seeded(hashSeed(seed))) : idx;
}

/**
 * โหมดเกม: คำถามวนซ้ำไม่จำกัด สลับลำดับใหม่ทุกรอบ (ไม่ให้ข้อเดิมโผล่ติดกันตอนขึ้นรอบใหม่)
 * คืนลำดับข้อในชุดคำถาม (index) ของคำตอบลำดับที่ pos
 */
export function endlessIndex(n: number, pos: number, seed: string): number {
  if (n <= 0) return 0;
  const cycle = Math.floor(pos / n);
  // ไล่สร้างลำดับทีละรอบ (รอบก่อนหน้าอาจถูกสลับมาแล้ว จึงต้องเทียบกับลำดับที่ใช้จริง)
  let order: number[] = [];
  let prevLast = -1;
  for (let c = Math.max(0, cycle - 50); c <= cycle; c++) {
    order = questionOrder(n, true, `${seed}:c${c}`);
    if (n > 1 && order[0] === prevLast) [order[0], order[1]] = [order[1], order[0]];
    prevLast = order[n - 1];
  }
  return order[pos % n];
}

export function publicQuestion(
  q: QuizQuestion,
  index: number,
  total: number,
  opts: { shuffleChoices: boolean; seed: string; elapsedMs: number }
): PublicQuestion {
  const choices = q.choices.map((c) => ({ id: c.id, text: c.text, media: c.media }));
  return {
    id: q.id,
    index,
    total,
    text: q.text,
    media: q.media,
    choices: opts.shuffleChoices ? shuffled(choices, seeded(hashSeed(`${opts.seed}:${q.id}`))) : choices,
    multi: q.multi,
    time: q.time,
    points: q.points,
    ...(isTextQ(q) ? { kind: 'text' as const } : {}),
    elapsedMs: Math.max(0, Math.round(opts.elapsedMs)),
  };
}

export function correctIds(q: QuizQuestion): string[] {
  return q.choices.filter((c) => c.correct).map((c) => c.id);
}

/** ถูก = เลือกครบทุกข้อที่ถูกและไม่เลือกข้อผิดเลย */
export function checkAnswer(q: QuizQuestion, picks: string[]): boolean {
  if (isTextQ(q)) {
    const got = normAnswer(String(picks[0] || '').slice(0, ANSWER_CHARS * 2));
    return !!got && (q.answers || []).some((a) => normAnswer(a) === got);
  }
  const want = new Set(correctIds(q));
  const got = new Set(picks.filter((p) => q.choices.some((c) => c.id === p)));
  if (!want.size || want.size !== got.size) return false;
  for (const id of Array.from(want)) if (!got.has(id)) return false;
  return true;
}

export function isTimeout(q: QuizQuestion, elapsedMs: number): boolean {
  return q.time > 0 && elapsedMs > q.time * 1000 + TIME_GRACE_MS;
}

/**
 * คะแนน: ตอบถูก 500–1000 ตามความเร็ว (ไม่จำกัดเวลา = 1000) + โบนัสตอบถูกติดกัน 100/ข้อ (สูงสุด 500)
 * โหมดสองเท่าคูณ 2 / ไม่คิดคะแนน = 0
 */
export function scoreFor(q: Pick<QuizQuestion, 'time' | 'points'>, correct: boolean, elapsedMs: number, streakBefore: number): number {
  if (!correct || q.points === 0) return 0;
  let base = 1000;
  if (q.time > 0) {
    const frac = Math.min(1, Math.max(0, elapsedMs / (q.time * 1000)));
    base = Math.round(1000 * (1 - frac / 2));
  }
  const bonus = Math.min(500, streakBefore * 100);
  return (base + bonus) * q.points;
}

export function pointsLabel(p: PointsMode): string {
  return p === 0 ? 'ไม่คิดคะแนน' : p === 2 ? 'คะแนน x2' : 'คะแนนปกติ';
}

export function timeLabel(t: number): string {
  if (!t) return 'ไม่จำกัด';
  return t >= 60 && t % 60 === 0 ? `${t / 60} นาที` : `${t} วินาที`;
}
