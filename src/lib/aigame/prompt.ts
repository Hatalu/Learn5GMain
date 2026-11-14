/**
 * ประกอบ prompt สร้างเกมสำหรับ Gemini (Canvas) จากเกมที่เลือก + วิชา/ชั้น/เรื่อง + แหล่งคำถาม + ลูกเล่นที่ครูเลือก
 * prompt เป็นภาษาอังกฤษ (Gemini ทำตามคำสั่งยาวๆ ได้แม่นกว่า) แต่สั่งให้ข้อความในเกมเป็นภาษาที่ครูเลือก
 * จุดสำคัญ: เรื่องจังหวะเกม (เกมที่ Gemini สร้างจากคำสั่งสั้นมักเร็วจนโจทย์ผ่านไปในเสี้ยววินาที)
 * จึงส่งเวลาทุกตัวเป็นตัวเลขใน CONFIG + บังคับ state machine / dt เป็นวินาที / rAF วงเดียว
 * ฟังก์ชันล้วน ไม่แตะ DOM (selftest เรียกได้)
 */
import { GRADES, LANGS, LEVELS, SUBJECTS, gradeEn, gradeLabel, subjectOf, type SubjectId } from '@/lib/worksheet/options';
import { cleanText } from '@/lib/worksheet/recipe';
import { richToPlain } from '@/lib/game-creator/quiz';
import type { QuizContent } from '@/lib/game-creator/types';
import { AI_GAMES, gameById, type AiGame } from './games';

/** คำถามแบบเรียบที่ใช้ทั้ง prompt และเกมตัวอย่าง */
export interface GItem {
  q: string;
  /** ตัวเลือก (ข้อพิมพ์คำตอบ = ว่าง) */
  choices: string[];
  /** ลำดับตัวเลือกที่ถูก (มากกว่า 1 = ต้องเลือกครบ) */
  correct: number[];
  /** คำตอบที่ยอมรับ (ข้อพิมพ์คำตอบ) */
  accept?: string[];
  /** ต้นฉบับมีรูป/คลิปประกอบที่ไม่ได้แนบไปด้วย */
  media?: boolean;
}

export type Source = 'ai' | 'bank' | 'mine';

/* ---------------------------------------------------------------- ลูกเล่นที่ครูปรับได้ */

interface Opt<T extends string | number = string> {
  id: T;
  th: string;
  /** คำอธิบายสั้นใต้ปุ่ม (ไม่บังคับ) */
  sub?: string;
  en: string;
}

/** ความเร็วเกม: f = ตัวคูณเวลา (มาก = ช้า) */
export const PACES = [
  { id: 'calm', th: 'ช้า สบายๆ', sub: 'ป.1-2 / อ่านช้า', en: 'calm (young or slow readers)', f: 1.4, up: 1.15, read: 4, perChar: 0.08 },
  { id: 'normal', th: 'ปกติ', en: 'normal', f: 1, up: 1.25, read: 3, perChar: 0.06 },
  { id: 'fast', th: 'เร็ว ท้าทาย', sub: 'เด็กโต / ทบทวน', en: 'fast (confident players)', f: 0.75, up: 1.4, read: 2.5, perChar: 0.05 },
] as const;
export type PaceId = (typeof PACES)[number]['id'];

export const TIMERS: Opt<number>[] = [
  { id: 0, th: 'ไม่จับเวลา', en: 'none' },
  { id: 30, th: '30 วิ', en: '30 s' },
  { id: 20, th: '20 วิ', en: '20 s' },
  { id: 15, th: '15 วิ', en: '15 s' },
];

export const LIVES: Opt[] = [
  { id: 'off', th: 'ไม่มีหัวใจ', en: 'off' },
  { id: 'on', th: '3 หัวใจ', sub: 'หมดแล้วไม่จบเกม', en: '3 hearts' },
];

export const MODES: Opt<'solo' | 'duel' | 'class'>[] = [
  { id: 'solo', th: 'เล่นคนเดียว', en: 'Single player.' },
  { id: 'duel', th: 'ผลัดกัน 2 คน', en: 'Two players on one device take turns, one question each, with separate scores and a clear "Player 1 / Player 2" turn banner. The result screen compares both players.' },
  {
    id: 'class',
    th: 'ทั้งห้อง',
    sub: 'จอโปรเจกเตอร์',
    en: 'Whole-class projector mode: question text at least 40 px and answer labels at least 32 px, 2-4 teams (chosen on the start screen) take turns question by question, a big team scoreboard, and the teacher operates the game.',
  },
];
export type ModeId = (typeof MODES)[number]['id'];

export const ARTS: (Opt & { en3d: string })[] = [
  {
    id: 'cartoon',
    th: 'การ์ตูนน่ารัก',
    en: 'Cozy cute cartoon: bright pastel palette, thick dark outlines (3-4 px), soft drop shadows, rounded shapes, big expressive eyes on characters.',
    en3d: 'Cute low-poly toy style: rounded primitives, MeshToonMaterial or soft MeshStandardMaterial, pastel colors, gentle rim light.',
  },
  {
    id: 'pixel',
    th: 'พิกเซลย้อนยุค',
    en: 'Retro pixel art: draw the game world on a small offscreen canvas (about 320 px wide) and scale it up with image smoothing off; a limited 16-color palette and chunky outlines. Keep Thai text in the normal readable font, not pixelated.',
    en3d: 'Voxel style: build every model from small cubes with flat colors, crisp edges, no smoothing.',
  },
  {
    id: 'paper',
    th: 'กระดาษตัดแปะ',
    en: 'Paper craft: flat shapes with slightly uneven cut edges, a subtle paper texture (drawn noise), layered shadows like stacked paper, warm craft colors.',
    en3d: 'Paper cut-out diorama: flat-shaded thin boxes and planes, MeshLambertMaterial, craft colors, soft shadows between layers.',
  },
  {
    id: 'clay',
    th: 'ดินน้ำมัน',
    en: 'Clay / plasticine: very rounded blobby shapes, soft gradients and inner highlights, gentle squash animations, warm saturated colors.',
    en3d: 'Claymation look: smooth spheres and capsules, MeshStandardMaterial with roughness about 0.8, warm key light.',
  },
  {
    id: 'neon',
    th: 'นีออนกลางคืน',
    en: 'Neon night: dark navy background, glowing outlines (shadowBlur / drop-shadow), vivid cyan, pink and yellow accents. Text always sits on solid panels for contrast.',
    en3d: 'Neon night: dark scene with fog, emissive materials on edges and rings, vivid cyan, pink and yellow accents. Labels on solid panels for contrast.',
  },
];

export const HEROES: Opt[] = [
  { id: 'auto', th: 'ให้ AI เลือก', en: 'an original cute mascot that fits the scene' },
  { id: 'cat', th: 'แมวส้ม', en: 'a chubby orange cat' },
  { id: 'elephant', th: 'ช้างน้อย', en: 'a small friendly Thai elephant wearing a little hat' },
  { id: 'robot', th: 'หุ่นยนต์', en: 'a round little robot with a screen face' },
  { id: 'dino', th: 'ไดโนเสาร์', en: 'a baby green dinosaur' },
  { id: 'astronaut', th: 'นักบินอวกาศ', en: 'a kid astronaut in a round helmet' },
  { id: 'rabbit', th: 'กระต่าย', en: 'a white rabbit with a red scarf' },
];

export const EXTRAS: Opt[] = [
  { id: 'tts', th: 'อ่านโจทย์ออกเสียง', en: 'Read aloud: read each question with the Web Speech API (speechSynthesis) in the game language, with a speaker button to replay it. If no voice is available, hide the button and keep playing.' },
  { id: 'explain', th: 'อธิบายเฉลย', en: 'Explanations: after every correct answer show a one-line "why" for 2 seconds (add an "explain" field to every question).' },
  { id: 'power', th: 'ไอเท็มช่วย', en: 'Helper items earned by streaks (never random): 50/50 (removes half the wrong choices), slow-motion (halves all speeds for one question) and an extra hint. Max 3 held; tap an icon in the HUD to use one.' },
  { id: 'boss', th: 'ด่านบอสท้ายเกม', en: 'Friendly boss round at the end: a big cute boss with a health bar; every correct answer is a hit. It uses the questions the player missed (or 3 random ones if none were missed).' },
  { id: 'map', th: 'แผนที่ด่าน', en: 'Stage map: split the questions into 3 stages shown on a small drawn world map; each finished stage unlocks the next with a short celebration.' },
  { id: 'sticker', th: 'สมุดสะสมสติกเกอร์', en: 'Sticker book: finishing a stage or a 5-answer streak earns the next sticker in a fixed order (drawn in code, never random). The book is saved in localStorage and opens from the start screen.' },
  { id: 'cert', th: 'เกียรติบัตรท้ายเกม', en: 'Certificate: on the result screen the player types a name and gets a pretty certificate with stars, score, topic and date, plus a print button (print-only CSS).' },
  { id: 'best', th: 'สถิติคะแนนสูงสุด', en: 'Best score: keep the top 5 scores in localStorage and show them on the start and result screens.' },
];
export const EXTRA_MAX = 4;

/* ---------------------------------------------------------------- สูตรเกม */

export interface GameRecipe {
  game: string;
  s: SubjectId;
  g: number;
  /** id เรื่องใน SUBJECTS ('' = ใช้ custom) */
  topic: string;
  custom: string;
  lv: (typeof LEVELS)[number]['id'];
  lang: (typeof LANGS)[number]['id'];
  /** จำนวนข้อเมื่อให้ AI แต่งเอง */
  count: number;
  source: Source;
  note: string;
  pace: PaceId;
  /** วินาทีต่อข้อ (0 = ไม่จับเวลา) */
  timer: number;
  lives: 'off' | 'on';
  mode: ModeId;
  art: string;
  hero: string;
  extras: string[];
}

export const COUNT_OPTIONS = [5, 10, 15, 20];
export const NOTE_MAX = 200;

export const defaultGameRecipe = (game = AI_GAMES[0].id): GameRecipe => ({
  game,
  s: 'math',
  g: 3,
  topic: 'mult',
  custom: '',
  lv: 'easy',
  lang: 'th',
  count: 10,
  source: 'ai',
  note: '',
  pace: 'normal',
  timer: 0,
  lives: 'off',
  mode: 'solo',
  art: 'cartoon',
  hero: 'auto',
  extras: [],
});

/** เรื่องที่เหมาะกับชั้นนี้ (ถ้าไม่มีเลยคืนทั้งหมดของวิชา) */
export function topicsFor(s: SubjectId, g: number) {
  const all = subjectOf(s).topics;
  const fit = all.filter((t) => g >= t.g[0] && g <= t.g[1]);
  return fit.length ? fit : all;
}

const pick = <T extends string | number>(list: readonly { id: T }[], v: unknown, d: T): T => (list.some((x) => x.id === v) ? (v as T) : d);

export function cleanGameRecipe(raw: Partial<GameRecipe>): GameRecipe {
  const d = defaultGameRecipe();
  const s = SUBJECTS.some((x) => x.id === raw.s) ? (raw.s as SubjectId) : d.s;
  const g = GRADES.includes(Number(raw.g)) ? Number(raw.g) : d.g;
  const topics = subjectOf(s).topics;
  const extras = Array.isArray(raw.extras) ? [...new Set(raw.extras)].filter((x) => EXTRAS.some((e) => e.id === x)).slice(0, EXTRA_MAX) : [];
  return {
    game: gameById(raw.game)?.id ?? d.game,
    s,
    g,
    topic: topics.some((t) => t.id === raw.topic) ? String(raw.topic) : '',
    custom: cleanText(raw.custom, 60),
    lv: LEVELS.some((l) => l.id === raw.lv) ? (raw.lv as GameRecipe['lv']) : d.lv,
    lang: LANGS.some((l) => l.id === raw.lang) ? (raw.lang as GameRecipe['lang']) : d.lang,
    count: COUNT_OPTIONS.includes(Number(raw.count)) ? Number(raw.count) : d.count,
    source: raw.source === 'bank' || raw.source === 'mine' ? raw.source : 'ai',
    note: stripEmoji(String(raw.note ?? '')).slice(0, NOTE_MAX),
    pace: pick(PACES, raw.pace, d.pace),
    // เกมจับคู่ไม่มีจังหวะต่อข้อ: ไม่จับเวลา
    timer: gameById(raw.game)?.noRead ? 0 : pick(TIMERS, Number(raw.timer), d.timer),
    lives: pick(LIVES, raw.lives, d.lives) as GameRecipe['lives'],
    mode: pick(MODES, raw.mode, d.mode),
    art: pick(ARTS, raw.art, d.art),
    hero: pick(HEROES, raw.hero, d.hero),
    extras,
  };
}

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]/gu;
export const stripEmoji = (s: string) => s.replace(EMOJI, '').replace(/[ \t]+/g, ' ').trim();
export const hasEmoji = (s: string) => /\p{Extended_Pictographic}/u.test(s);

const plain = (r: Parameters<typeof richToPlain>[0]) => stripEmoji(richToPlain(r, 600));

/** แปลงชุดคำถามของเว็บเป็นข้อแบบเรียบ ข้อที่ไม่มีข้อความ (รูปอย่างเดียว) ถูกข้ามและนับไว้ */
export function quizToItems(c: QuizContent): { items: GItem[]; skipped: number } {
  const items: GItem[] = [];
  let skipped = 0;
  for (const q of c.questions) {
    const text = plain(q.text);
    if (!text) {
      skipped++;
      continue;
    }
    if (q.kind === 'text') {
      const accept = (q.answers || []).map((a) => stripEmoji(a)).filter(Boolean);
      if (!accept.length) {
        skipped++;
        continue;
      }
      items.push({ q: text, choices: [], correct: [], accept, media: !!q.media || undefined });
      continue;
    }
    const choices = q.choices.map((ch) => plain(ch.text));
    // ตัวเลือกที่เป็นรูปอย่างเดียว ส่งเป็นข้อความไม่ได้ ข้ามทั้งข้อ
    if (choices.length < 2 || choices.some((x) => !x)) {
      skipped++;
      continue;
    }
    const correct = q.choices.flatMap((ch, i) => (ch.correct ? [i] : []));
    if (!correct.length) {
      skipped++;
      continue;
    }
    items.push({ q: text, choices, correct, media: !!q.media || undefined });
  }
  return { items, skipped };
}

export const topicLabel = (r: GameRecipe) => {
  const t = subjectOf(r.s).topics.find((x) => x.id === r.topic);
  return r.custom || t?.th || 'เรื่องทั่วไปของวิชานี้';
};

function itemLine(it: GItem): string {
  const o: Record<string, unknown> = { q: it.q };
  if (it.accept) {
    o.type = 'text';
    o.accept = it.accept;
  } else {
    o.choices = it.choices;
    if (it.correct.length > 1) o.answers = it.correct;
    else o.answer = it.correct[0];
  }
  return '  ' + JSON.stringify(o) + ',';
}

const bullets = (a: string[]) => a.map((x) => `- ${x}`).join('\n');
const num = (a: string[]) => a.map((x, i) => `${i + 1}. ${x}`).join('\n');
const r1 = (n: number) => Math.round(n * 10) / 10;

/** ข้อความบนจอที่สั่งให้ใช้ตรงตัว (กัน Gemini ทำ UI เป็นภาษาอังกฤษ) */
const UI_WORDS = {
  th: ['เริ่มเล่น', 'วิธีเล่น', 'พร้อมแล้ว!', 'หยุดพัก', 'เล่นต่อ', 'เริ่มใหม่', 'เสียง', 'ความเร็ว', 'คะแนน', 'คำใบ้', 'ถูกต้อง! เก่งมาก', 'เกือบแล้ว ลองอีกครั้งนะ', 'เล่นอีกครั้ง'],
  en: ['Start', 'How to play', 'Ready!', 'Pause', 'Resume', 'Restart', 'Sound', 'Speed', 'Score', 'Hint', 'Correct! Great job!', 'So close, try again!', 'Play again'],
} as const;

/** ชื่อ CONFIG ทั้งหมดที่ข้อความของเกมอ้างถึง */
export const configRefs = (g: AiGame) => [...new Set(JSON.stringify(g).match(/CONFIG\.\w+/g) || [])].map((x) => x.slice(7));

/** บล็อก CONFIG: เวลาทุกตัว (วินาที) คูณตามความเร็วที่เลือก */
export function configBlock(r: GameRecipe, game: AiGame): string {
  const p = PACES.find((x) => x.id === r.pace)!;
  const refs = configRefs(game);
  const L: string[] = [];
  const add = (k: string, v: number, why: string) => L.push(`  ${k}: ${v}, // ${why}`);
  if (!game.noRead) {
    add('readMinSec', p.read, 'READ phase: minimum seconds the question is shown big before anything moves');
    add('readPerCharSec', p.perChar, 'READ phase: extra seconds per character of a long question');
  }
  add('inputLockSec', 0.4, 'ignore taps for this long after a question becomes playable');
  add('feedbackCorrectSec', 1.5, 'celebration after a correct answer before the next question');
  add('feedbackWrongSec', 1, 'soft feedback after a wrong answer, then the same question continues');
  if (refs.includes('maxSpeedUp')) add('maxSpeedUp', p.up, 'speed-ups from streaks can never exceed this multiple of the base speed');
  for (const [k, [v, why]] of Object.entries(game.cfg)) add(k, r1(v * p.f), why);
  add('timerSec', r.timer, r.timer ? 'per-question time bar (soft: running out only removes the speed bonus)' : '0 = no time limit');
  add('lives', r.lives === 'on' ? 3 : 0, r.lives === 'on' ? 'hearts (running out never ends the game)' : '0 = no hearts');
  return ['const CONFIG = {', ...L, '};'].join('\n');
}

export interface PromptExtra {
  /** ข้อจากชุดคำถาม (source bank/mine) */
  items?: GItem[];
  setTitle?: string;
  skipped?: number;
}

/** prompt ภาษาอังกฤษแบบละเอียด ให้ Gemini สร้างเกม HTML ไฟล์เดียวที่เล่นได้จริงใน Canvas */
export function buildGamePrompt(raw: GameRecipe, extra: PromptExtra = {}): string {
  const r = cleanGameRecipe(raw);
  const game: AiGame = gameById(r.game)!;
  const subj = subjectOf(r.s);
  const level = LEVELS.find((l) => l.id === r.lv)!;
  const topicRow = subj.topics.find((x) => x.id === r.topic);
  const topic = topicLabel(r);
  const topicFull = !r.custom && topicRow ? `${topic} (${topicRow.en})` : topic;
  const items = r.source === 'ai' ? [] : extra.items || [];
  const useSet = items.length > 0;
  const is3d = game.dim === '3D';
  const hasText = items.some((x) => x.accept);
  const hasMulti = items.some((x) => x.correct.length > 1);
  const hasMedia = items.some((x) => x.media);
  const art = ARTS.find((a) => a.id === r.art)!;
  const hero = HEROES.find((h) => h.id === r.hero)!;
  const mode = game.modes?.[r.mode] || MODES.find((m) => m.id === r.mode)!.en;
  const extras = EXTRAS.filter((e) => r.extras.includes(e.id));
  const explain = r.extras.includes('explain');

  const langLine =
    r.lang === 'th'
      ? 'All on-screen text is in Thai (buttons, instructions, feedback, hints). Only the title screen may also show the English game name.'
      : r.lang === 'en'
        ? 'All on-screen text is in simple English that fits the grade.'
        : 'Buttons and instructions are bilingual: Thai first, with English below in smaller text. Each question stays in its own language.';
  const words = r.lang === 'en' ? UI_WORDS.en : r.lang === 'th' ? UI_WORDS.th : UI_WORDS.th.map((w, i) => `${w} / ${UI_WORDS.en[i]}`);
  const qLang = r.lang === 'en' ? 'simple English' : r.lang === 'th' ? 'Thai' : 'the language that fits the content (English for English lessons, otherwise Thai)';
  const fields = `"hint"${explain ? ' and "explain"' : ''}`;

  const qBlock = useSet
    ? [
        `Use ALL ${items.length} questions below${extra.setTitle ? ` (from the teacher's set "${stripEmoji(extra.setTitle)}")` : ''}. Do not change any question, choice or answer, and do not drop any question.`,
        '- "answer" is the index of the correct choice (starting at 0).' + (hasMulti ? ' "answers" lists several correct choices: the player must pick every one of them to pass (one at a time is fine).' : ''),
        ...(hasText ? ['- type "text" was a typed-answer question: in this game, invent 2-3 believable wrong choices yourself and use the first "accept" value as the correct choice.'] : []),
        ...(hasMedia ? ['- Some questions had a picture in the original that is not included; text only is fine.'] : []),
        `- Add a ${fields} field to every question yourself: the hint guides the thinking in one short sentence and never gives the answer away${explain ? '; the explanation says why the answer is right in one line' : ''}.`,
        '- Write fractions as a/b in the data but render them nicely (stacked fractions if possible); render powers as superscripts.',
        '- Shuffle the question order and the choice order every new game, and always check answers against the original data.',
        '',
        'const QUESTIONS = [',
        ...items.map(itemLine),
        '];',
      ].join('\n')
    : [
        `Write ${r.count} questions in ${qLang} on "${topicFull}" for ${subj.en}, ${gradeEn(r.g)}, ${level.en}.`,
        '- Correct according to the Thai national core curriculum, using words and situations Thai children of this age know.',
        '- 3-4 choices per question, exactly one correct. Wrong choices come from real, common misconceptions, not random values.',
        '- Short questions (one line if possible). Each answer is short enough to sit on a game object (about 20 characters at most).',
        '- Order from easy to hard, no duplicates. Double-check every answer before writing it into the code.',
        `- Every question has a ${fields} field: the hint guides the thinking in one short sentence and never gives the answer away${explain ? '; the explanation says why the answer is right in one line' : ''}.`,
        '',
        `Data format: const QUESTIONS = [ { "q": "...", "choices": ["...", "..."], "answer": 0, "hint": "..."${explain ? ', "explain": "..."' : ''} }, ... ];`,
      ].join('\n');

  const flow = game.noRead
    ? 'START -> HOWTO -> PLAY -> FEEDBACK -> (PLAY | RESULT), plus PAUSED'
    : 'START -> HOWTO -> READ -> PLAY -> FEEDBACK -> (READ of the next question | RESULT), plus PAUSED';

  const pacing = [
    'Put the CONFIG object below at the very top of the script, exactly as written, and read EVERY timing from it. Never hard-code another duration or speed anywhere.',
    `Use one explicit state machine: ${flow}. Keep it in one variable and change it only through a setState() function that also cancels every timer and timeout of the previous state.`,
    game.noRead
      ? 'This game has no READ phase because the questions are printed on the cards; nothing moves on its own, so the player can take as long as needed.'
      : 'READ: the question appears big in the center of the screen. No answer objects exist yet and nothing moves. READ lasts max(CONFIG.readMinSec, number of characters x CONFIG.readPerCharSec) seconds; after 1 second the player may tap a "ready" button to skip the rest. Then the question shrinks into the top HUD, where it stays visible for the whole PLAY phase, and PLAY starts.',
    'PLAY never ends on its own. A question ends ONLY when the correct answer is given. Answer objects that leave the screen or pass the player come back (loop or respawn); never auto-skip a question and never count a "miss" as an answer.',
    'FEEDBACK: correct = celebrate for CONFIG.feedbackCorrectSec seconds, then go to the next question. Wrong = soft feedback for CONFIG.feedbackWrongSec seconds, then the same question continues. Input is ignored during FEEDBACK and for CONFIG.inputLockSec seconds after a question becomes playable.',
    'Movement uses delta time in SECONDS: dt = Math.min((now - last) / 1000, 0.05). Speeds come from CONFIG as "seconds to cross a distance" (speed = distance / CONFIG.xxxSec), so the pace is identical on every screen size and on 60, 120 or 144 Hz displays. Never move objects by a fixed number of pixels per frame.',
    'Exactly ONE requestAnimationFrame loop for the whole page: start it once on load and guard it with a flag. Restarting the game only resets the game state; it never starts a second loop (a second loop doubles the speed, the most common bug in these games). Pause updates while PAUSED or when the tab is hidden (visibilitychange), and reset the last timestamp when resuming.',
    'Each question is answered exactly once. Give every question a unique token and ignore any timer, animation end or collision that belongs to an old token. Never check collisions or answers on the frame an object is created.',
    'Use Pointer Events (pointerdown) only, never touch and click together (that causes double taps). Every hit area is at least 48 x 48 px, larger than the drawing if needed.',
    'Size the canvas from its container after the page and fonts load and again on every resize (devicePixelRatio, capped at 2). The game starts only after the player taps the start button.',
    'The pause menu has a speed slider from 0.5x to 1.5x (default 1x) that live-scales every CONFIG duration (slower = longer), plus a sound on/off switch.',
    'Adaptive difficulty only as written in the game rules, always capped by the CONFIG limits. After 2 wrong answers in a row, go back to the base speed and make the next hint clearer.',
  ];

  const settings = [
    `Players: ${mode}`,
    r.timer
      ? 'Time limit: show a time bar for each question (CONFIG.timerSec). Answering before it empties gives a speed bonus. When it empties nothing is lost: the bar turns gray, the hint appears, and the question stays until it is answered correctly. The bar is frozen during READ, FEEDBACK and PAUSED.'
      : 'Time limit: none. Do not add any timer.',
    r.lives === 'on'
      ? 'Hearts: show CONFIG.lives hearts in the HUD. A wrong answer costs one heart. At 0 hearts the game does NOT end: the mascot cheers the player on, and 2 correct answers in a row refill all hearts.'
      : 'Hearts: none. A mistake only resets the combo.',
    extras.length
      ? `Extra features (build them only after the core game works and looks finished; keep each one small and simple):\n${extras.map((e) => `  - ${e.en}`).join('\n')}`
      : 'Extra features: none. Do not add extra systems; spend the effort on gameplay and visuals.',
  ];

  return `You are a senior HTML5 game developer and an illustrator of children's games. Build a complete, polished and truly playable learning game for Thai school children as ONE self-contained HTML file that runs immediately in Gemini Canvas.

Priorities, in this order: (1) the game is playable and fair at a child's pace, (2) it looks beautiful, like a finished commercial kids' game, (3) extra features. Never sacrifice (1) or (2) for (3).

# 1. Lesson
- Subject: ${subj.en} (${subj.th})
- Grade: ${gradeLabel(r.g)}, ${gradeEn(r.g)}
- Topic: ${topicFull}
- Difficulty: ${level.en}
- Game speed chosen by the teacher: ${PACES.find((p) => p.id === r.pace)!.en}
- On-screen language: ${langLine}${r.note ? `\n- Teacher's note (written in Thai; follow it when it is safe and fits the game): ${r.note}` : ''}

# 2. Pacing and playability (MOST IMPORTANT)
Games generated from short prompts often run far too fast: questions flash past in a fraction of a second and nobody can play. Prevent that with these rules:
${num(pacing)}

${configBlock(r, game)}

# 3. The game: "${game.en}" (Thai name: "${game.name}"), ${game.dim}
Scene: ${game.scene}
${
  is3d
    ? 'Technology: a real 3D game built with three.js r160, loaded as an ES module through an importmap from https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js. Build every model from primitives (box, sphere, cylinder, cone, torus, capsule); no external model or texture files. Lighting: HemisphereLight plus a DirectionalLight with soft shadows (1024 shadow map), and fog for depth. Answer labels must be crisp: draw them on a CanvasTexture at 2x resolution after the Thai font has loaded (document.fonts.load), on planes or sprites that face the camera, or use HTML labels positioned by projecting 3D points. renderer.setPixelRatio(Math.min(devicePixelRatio, 2)). If WebGL is unavailable, show one friendly message instead of crashing.'
    : 'Technology: a 2D game drawn with Canvas 2D (or inline SVG). Every picture is drawn in code; no image files.'
}

## Core mechanics
${bullets(game.core)}

## Controls (touch, mouse and keyboard must all work)
${bullets(game.controls)}

## Difficulty curve
${bullets(game.progression)}

# 4. Visual direction (make it gorgeous)
- Art style: ${is3d ? art.en3d : art.en}
- Mascot: ${hero.en}. It appears on the start screen, reacts to every answer (cheers when correct, an encouraging face when wrong) and is the player character if the game has one.
- Build the scene in layers: far background, middle layer with gentle parallax or idle motion, the play layer, a few foreground details, then the UI. No flat empty backgrounds.
- Draw every character and object with care: outlines, 2-3 tones (base, shadow, highlight), a soft ground shadow and an idle animation (bob, blink, sway). Never use plain rectangles or bare circles as placeholder art.
- One consistent palette of 5-6 colors that suits the style; different answers get clearly different colors.
- Readability first: question text at least 24 px on phones and 30 px on desktop, answer labels at least 20 px and 26 px, strong contrast (dark text on light panels or the reverse). Long answers wrap or shrink to fit inside their object. Thai text is never clipped: leave room above and below for Thai vowel and tone marks.
- Font: load "Mali" from Google Fonts (fallback sans-serif) and wait for document.fonts.ready before the first draw.
- Game feel:
${game.juice.map((j) => `  - ${j}`).join('\n')}
  - Thick, squishy buttons that squash and stretch when pressed.
  - Sparkles on correct answers, a small smoke puff on wrong ones, "+points" text that floats up.
  - Smooth screen transitions (0.3 s fade or slide).
- Respect prefers-reduced-motion: reduce shaking and flashing.

# 5. Questions
${qBlock}

The game reads questions only from QUESTIONS, placed near the top of the script so the teacher can edit them.

# 6. Learning inside the game
- Answering IS the game action described above, never a quiz pop-up on top of the game.
- A wrong answer is never game over: the mascot encourages the player and shows the one-line hint.
- A second wrong answer on the same question gently highlights the correct answer with a one-line reason.
- The result screen lists every missed question with its correct answer.

# 7. Teacher's settings
${bullets(settings)}

# 8. Screens
1. Start: the English title "${game.en}" and the Thai name "${game.name}" in big letters, the animated scene and mascot, a big start button and a sound switch.
2. How to play, shown not told: the first question is played for real with a pointing hand or arrow and one short line per step. No long instruction pages.
3. Game HUD: score, question number / total, combo and a pause button${r.timer ? ', the time bar' : ''}${r.lives === 'on' ? ', hearts' : ''}.
4. Pause: resume, restart, sound, speed slider.
5. Result: 1-3 stars by accuracy, score, number correct, the missed questions with their correct answers, and a play-again button.
- One idea per text bubble, at most 2 short lines.
- Use these exact words for the UI: ${words.map((w) => `"${w}"`).join(', ')}.

# 9. Sound
- Every sound is synthesized with the Web Audio API: soft pops, glass chimes, gentle correct/wrong tones, and a short looping background tune at low volume.
- Start audio only after the first tap. If Web Audio is unavailable, the game keeps working silently.

# 10. Hard rules
- NO EMOJI anywhere: not in text, buttons, characters, scores or rewards. Draw every icon with SVG, Canvas or CSS.
- No external image or audio files. Allowed from CDNs: Google Fonts${is3d ? ' and three.js' : ''} only. No ads, logins, chat, loot boxes or random prizes.
- Child-friendly: nothing scary or violent.
- Responsive: phone portrait, phone landscape, iPad and desktop. It fits the window with no scrolling and nothing cut off. Set touch-action: none on the game area and prevent pinch-zoom and page scrolling while playing.
- Smooth 60 fps on an average phone; keep particle counts modest.

# 11. Delivery
- One complete HTML file (HTML + CSS + JavaScript). No TODOs, no placeholders, nothing left out.
- At the top of the script: a short comment on how to edit QUESTIONS and CONFIG, then CONFIG, then QUESTIONS.
- Before you answer, play-test it in your head with timestamps: a 7-year-old taps Start, plays question 1 (one wrong answer, then the right one), then question 2. Check that each question stays on screen and readable until it is answered, that nothing moves before the child could read the question, that only the correct answer ends a question, that only one game loop runs, that there are no console errors, and that everything fits a 375 x 667 phone screen. Fix anything that fails, then output the file.`;
}

/* ---------------------------------------------------------------- prompt แก้เกมต่อ (วางต่อในแชตเดิมของ Gemini) */

export const FIXES: { id: string; th: string; en: string }[] = [
  {
    id: 'slow',
    th: 'เกมเร็วไป โจทย์ผ่านไปเร็ว',
    en: 'The game is far too fast: questions disappear before children can read them. Fix the pacing: every question starts with a READ phase (question big in the center, nothing moving) for at least CONFIG.readMinSec seconds; a question may only end when the correct answer is given; moving answers that leave the screen come back; use delta time in seconds clamped to 0.05; make sure only ONE requestAnimationFrame loop exists (guard it so restarting never starts a second loop) and clear all timers when the question changes. Then multiply every duration in CONFIG by 1.5. Keep QUESTIONS unchanged and send the full updated file.',
  },
  {
    id: 'pretty',
    th: 'ภาพยังไม่สวย',
    en: 'Make the visuals much more beautiful without changing the gameplay or QUESTIONS: a layered background with gentle parallax, characters and objects with outlines, shading, highlights, soft shadows and idle animations, particles on correct answers, thick squishy buttons, one consistent pastel palette, and readable large text on solid panels. Send the full updated file.',
  },
  {
    id: 'tap',
    th: 'กดแล้วไม่ตอบสนอง',
    en: 'Some taps and clicks do not register. Use pointerdown events only, make every hit area at least 48 x 48 px, make sure no invisible overlay or canvas sits on top of the buttons, and lock input only during FEEDBACK. Keep everything else the same and send the full updated file.',
  },
  {
    id: 'phone',
    th: 'มือถือเล่นไม่สะดวก',
    en: 'Make it play well on a phone in portrait and landscape: everything fits the screen with no scrolling or cut-off text, the play area resizes on rotation, buttons are at least 48 px, text at least 20 px, touch-action: none on the game area, and no accidental zoom. Send the full updated file.',
  },
  {
    id: 'blank',
    th: 'จอขาว / เกมค้าง',
    en: 'The game shows a blank screen or freezes. Find and fix every JavaScript error. Size the canvas after the page and fonts have loaded and on resize, keep everything in one HTML file, start the game loop once, and start gameplay only after the start button is tapped. Send the full updated file.',
  },
  {
    id: 'more',
    th: 'ขอด่านและความท้าทายเพิ่ม',
    en: 'Add more variety while keeping the same pacing rules and CONFIG: split the game into 3 stages with a new background color theme each, a short celebration between stages, and a final bonus stage that replays the questions the player missed. Keep QUESTIONS unchanged and send the full updated file.',
  },
];
