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
import { ENGINE_CSS, ENGINE_HTML, ENGINE_JS, HOOKS_JS } from './engine';

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

/** ข้อความบนจอ (ส่งเป็น const WORDS ในโค้ด กัน Gemini ทำ UI เป็นภาษาอังกฤษ) */
const UI_WORDS: Record<string, [string, string]> = {
  start: ['เริ่มเล่น', 'Start'],
  ready: ['พร้อมแล้ว!', 'Ready!'],
  pause: ['หยุดพัก', 'Pause'],
  resume: ['เล่นต่อ', 'Resume'],
  restart: ['เริ่มใหม่', 'Restart'],
  sound: ['เสียง', 'Sound'],
  speed: ['ความเร็ว', 'Speed'],
  score: ['คะแนน', 'Score'],
  correct: ['ถูกต้อง! เก่งมาก', 'Correct! Great job!'],
  wrong: ['เกือบแล้ว ลองอีกครั้งนะ', 'So close, try again!'],
  reveal: ['คำตอบคือ', 'The answer is'],
  again: ['เล่นอีกครั้ง', 'Play again'],
};

export function wordsBlock(lang: GameRecipe['lang']): string {
  const pick = ([th, en]: [string, string]) => (lang === 'en' ? en : lang === 'th' ? th : th + ' / ' + en);
  return ['const WORDS = {', ...Object.entries(UI_WORDS).map(([k, v]) => '  ' + k + ': ' + JSON.stringify(pick(v)) + ','), '};'].join('\n');
}

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
  const qLang = r.lang === 'en' ? 'simple English' : r.lang === 'th' ? 'Thai' : 'the language that fits the content (English for English lessons, otherwise Thai)';
  const fields = `"hint"${explain ? ' and "explain"' : ''}`;

  const qBlock = useSet
    ? [
        `Use ALL ${items.length} questions below${extra.setTitle ? ` (from the teacher's set "${stripEmoji(extra.setTitle)}")` : ''}. Do not change any question, choice or answer, and do not drop any question.`,
        '- "answer" is the index of the correct choice (starting at 0).' + (hasMulti ? ' "answers" lists several correct choices: the player must pick every one of them to pass (one at a time is fine).' : ''),
        ...(hasText ? ['- type "text" was a typed-answer question: rewrite each of these items in QUESTIONS as a normal choice item (keep q, put the first "accept" value plus 2-3 believable wrong choices in "choices", and set "answer"), because the engine needs choices.'] : []),
        ...(hasMedia ? ['- Some questions had a picture in the original that is not included; text only is fine.'] : []),
        `- Add a ${fields} field to every question yourself: the hint guides the thinking in one short sentence and never gives the answer away${explain ? '; the explanation says why the answer is right in one line' : ''}.`,
        '- Write fractions as a/b in the data but render them nicely (stacked fractions if possible); render powers as superscripts.',
        '- The engine shuffles the question order and the choice order every game; keep the data order as given.',
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

  const rules = [
    'Build the game ON the starter engine below. Copy the engine code exactly; only fill in the Hooks object, the scene, the art and the CSS. Do not rewrite the engine, do not add a second game loop, do not add setTimeout/setInterval for game logic (use after(sec, fn) and tween() from the engine).',
    'Copy the WHOLE engine, from the STARTER ENGINE line to the END OF STARTER ENGINE line. Check before answering that your file defines every one of these: safe, txt, attr, store, ease, shuffle, G, boot, after, tween, setState, pause, prepare, readTime, startGame, nextQuestion, beginPlay, answer, endGame, say, hud, frame, Sound, on. A missing boot gives "boot is not defined" and the Start button does nothing.',
    'Never put onclick="..." attributes in the HTML. The engine wires every button with addEventListener, which also works inside <script type="module"> (inline onclick handlers fail there, which is why "Start" did nothing in earlier attempts).',
    'Anything that is hidden must use display: none (or pointer-events: none). An invisible layer with opacity 0 that covers the screen blocks every tap. #fx, decorations and speech bubbles must have pointer-events: none.',
    'The question text lives in the HTML element #qtext (the engine fills it). Do not draw the question on a canvas. Answer labels are real HTML/SVG text too.',
    'A question ends ONLY when answer(i) returns true for its last correct choice; the engine then moves to the next question by itself. Call answer(i) exactly once per hit (on impact for things that fly), never every frame.',
    'All movement uses the dt passed to Hooks.update (game seconds, already 0 while paused and scaled by the speed slider). Speeds come from CONFIG as "seconds to cross a distance" (speed = distance / CONFIG.xxxSec), so the pace is the same on every screen and on 60, 120 or 144 Hz displays.',
    'Nothing is spawned during READ: spawn(q) is called when PLAY starts. From then on every answer must be on screen and tappable within 1 second (enter with a quick eased pop-in, then move at the CONFIG pace); no empty waiting time. Answer objects that leave the screen or pass the player come back (loop or respawn).',
    'Use pointerdown for taps on game objects (no separate touchstart + click). Every tap target is at least 48 x 48 px, larger than the drawing if needed.',
    'Wrap anything optional (fonts, audio, localStorage, speechSynthesis, vibration) in safe(() => ...) so a blocked feature can never stop the game. Never await fonts or audio before the game can start.',
    'Adaptive difficulty only as written in the game rules, always capped by the CONFIG limits. Read G.combo and G.wrongRow from the engine.',
  ];

  const settings = [
    `Players: ${mode}`,
    r.timer
      ? 'Time limit: the engine runs a time bar (CONFIG.timerSec) and gives a speed bonus. When it empties nothing is lost: the hint appears and the question stays until answered. Style the bar nicely.'
      : 'Time limit: none. Do not add any timer.',
    r.lives === 'on'
      ? 'Hearts: the engine counts G.hearts (CONFIG.lives); draw them in #hearts. At 0 hearts the game does NOT end; the mascot cheers the player on and 2 correct answers in a row refill them (the engine does this).'
      : 'Hearts: none. A mistake only resets the combo.',
    extras.length
      ? `Extra features (build them only after the core game works and looks finished; keep each one small and simple):\n${extras.map((e) => `  - ${e.en}`).join('\n')}`
      : 'Extra features: none. Do not add extra systems; spend the effort on gameplay and visuals.',
  ];

  const fence = '```';
  return `You are a senior HTML5 game developer and an illustrator of children's games. Build a complete, polished, truly playable learning game for Thai school children as ONE self-contained HTML file that runs immediately in Gemini Canvas.

Output: a CODE canvas holding one complete HTML file that starts with <!DOCTYPE html>, so Canvas runs it as an app with a preview. Never a text document.

Priorities, in this order: (1) it works and is fun at a child's pace, (2) it looks cute, soft and smooth like a finished commercial kids' game, (3) extra features. Never sacrifice (1) or (2) for (3).

# 1. Lesson
- Subject: ${subj.en} (${subj.th})
- Grade: ${gradeLabel(r.g)}, ${gradeEn(r.g)}
- Topic: ${topicFull}
- Difficulty: ${level.en}
- Game speed chosen by the teacher: ${PACES.find((p) => p.id === r.pace)!.en}
- On-screen language: ${langLine}${r.note ? `\n- Teacher's note (written in Thai; follow it when it is safe and fits the game): ${r.note}` : ''}

# 2. Rules that make it work (MOST IMPORTANT)
Earlier games made from prompts like this had a Start button that did nothing, no question on screen, questions that never moved on, and questions that flashed past too fast. These rules prevent all of that:
${num(rules)}

# 3. The game: "${game.en}" (Thai name: "${game.name}"), ${game.dim}
Scene: ${game.scene}
${
  is3d
    ? 'Technology: a real 3D game built with three.js r160, loaded with an importmap ({"imports": {"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}) and <script type="module">. Put the three.js renderer canvas inside #world; keep the HUD, question card, answer labels and screens as HTML on top (labels are HTML elements positioned each frame by projecting 3D points with vector.project(camera)). Build every model from primitives (box, sphere, cylinder, cone, torus, capsule) with rounded, chunky proportions; no external model or texture files. Lighting: HemisphereLight plus a DirectionalLight with soft shadows (1024 shadow map), fog for depth, renderer.setPixelRatio(Math.min(devicePixelRatio, 2)), resize with the window. Camera framing: a third-person camera behind and above the player, looking ahead down the track, so the player character fills only about 15% of the screen height near the bottom and the oncoming answers are clearly visible in the middle of the screen; nothing may block the view of the answers. Answer labels: HTML plates projected onto the objects, scaled with distance; labels of far objects fade in only when they are close enough to read, and labels must never overlap each other. Keep the scene light (low-poly, at most a few hundred meshes, reuse geometries and materials) so it stays smooth on school tablets. Load three.js with a dynamic import inside try/catch (const THREE = await import("three")); if it or WebGL fails, show a friendly message in #world instead of a blank page.'
    : 'Technology: 2D built with HTML + inline SVG sprites inside #world, moved every frame with transform: translate3d(...) rotate(...) scale(...) (GPU-smooth, crisp vector art, perfect Thai text, and each sprite gets its own pointerdown listener). Use the #fx canvas only for particles. No image files.'
}

## Core mechanics
${bullets(game.core)}

## Controls (touch, mouse and keyboard must all work)
${bullets(game.controls)}

## Difficulty curve
${bullets(game.progression)}

## Make every answer feel fun (4 beats)
- Anticipation: the mascot or object winds up (lean back, squash, puff cheeks, aim) for about 0.15 s.
- Action: the throw/swing/flight moves along an eased curve (never a straight teleport).
- Impact: a hit stop of 60 ms, a burst of particles, a sound and a small screen shake (skipped for prefers-reduced-motion).
- Reaction: the target and the mascot react with personality (dizzy stars, happy jump, giggle, wobble).
- The world is alive between answers: idle animations, ambient creatures, light wind, and the small surprise events listed in the mechanics.

# 4. Visual direction: cute, soft and smooth
- Art style: ${is3d ? art.en3d : art.en}
- Mascot: ${hero.en}. Cute proportions: a big round head (about 60% of the height), large round eyes with two white highlight dots, small smile, pink blush ovals, short rounded limbs. It appears on the start screen, cheers on correct answers, makes an encouraging face on wrong ones, and speaks the hints through #bubble.
- Shapes: everything rounded (rounded rects, circles, blobs, stroke-linejoin round). Outlines use a darker shade of the fill color, not pure black. Every object has 3 tones (base, shadow, highlight), a soft oval ground shadow and a gentle gradient on large shapes.
- Smooth motion: nothing ever teleports or snaps. Use tween() with ease.outBack for pop-ins, ease.inOutSine for floating, ease.outElastic for bouncy rewards. Every visible object has an idle animation (bob, breathe, blink every 3-5 s, sway) with different phases so the scene never looks frozen.
- Scene in layers: sky/background gradient, far shapes with slow parallax, the play layer, a few foreground details, then the UI.
- One pastel palette of 5-6 colors; answers get clearly different colors.
- Readability: question text at least 24 px on phones and 30 px on desktop on a solid rounded card; answer labels at least 20 px on solid label plates; strong contrast. Long text wraps or shrinks to fit. Thai text is never clipped: line-height at least 1.5 and padding above and below for vowel and tone marks.
- Font: load "Mali" from Google Fonts with a <link> tag, font-family: 'Mali', sans-serif. Do not wait for it.
- UI: thick, squishy buttons (big radius, 4-6 px bottom shadow) that squash on press and spring back. Screens slide or fade in over 0.3 s.
- Game feel for this game:
${game.juice.map((j) => `  - ${j}`).join('\n')}
- Respect prefers-reduced-motion: reduce shaking and flashing.

# 5. Questions
${qBlock}

# 6. Learning inside the game
- Answering IS the game action above, never a quiz pop-up on top of the game.
- A wrong answer is never game over: the engine shows the hint in #bubble; the mascot looks encouraging.
- On the second wrong answer the engine reveals the answer in #bubble; also make the correct object glow.
- The result screen lists every missed question with its correct answer (the engine fills #missed; style it).

# 7. Teacher's settings
${bullets(settings)}

# 8. Screens (the engine shows and hides them; you design them)
1. #screen-start: the title "${game.en}" and the Thai name "${game.name}" in big letters, the animated mascot and scene, the big #btn-start button, and #btn-sound.
2. How to play, shown not told: during the first question, a pointing hand animates over the correct kind of action with one short line in #bubble. No instruction pages.
3. #hud: score, question number / total, combo and #btn-pause${r.timer ? ', the time bar' : ''}${r.lives === 'on' ? ', hearts' : ''}. #qcard holds the question (big in the middle during READ, near the top during PLAY) and #btn-ready.
4. #screen-pause: #btn-resume, #btn-restart, #btn-sound2 and the #speed slider (0.5x to 1.5x).
5. #screen-result: 1-3 stars from #stars[data-stars], #result-score, #result-count, the #missed list and #btn-again.
- One idea per text bubble, at most 2 short lines. Every button label comes from WORDS.

# 9. Sound
- The engine's Sound object plays tap, pop, correct, wrong and win sounds. Add a soft looping background tune (a few Web Audio notes, low volume) and game-specific sounds the same way, all inside safe().

# 10. Hard rules
- NO EMOJI anywhere: not in text, buttons, characters, scores or rewards. Draw every icon with SVG or CSS.
- No external image or audio files. Allowed from CDNs: Google Fonts${is3d ? ' and three.js' : ''} only. No ads, logins, chat, loot boxes or random prizes.
- Child-friendly: nothing scary or violent.
- Responsive: phone portrait, phone landscape, iPad and desktop. Lay out from the window size on load and on resize; nothing scrolls and nothing is cut off.
- Smooth 60 fps on an average phone; keep particle counts modest.

# 11. Starter engine (use exactly; fill in the Hooks)
File order: <head> with the Mali font link${is3d ? ' and the three.js importmap' : ''}, then <style> (the engine CSS below + your styles), then the body HTML below with every screen filled in, then ONE <script${is3d ? ' type="module"' : ''}> that contains, in order: CONFIG, QUESTIONS, WORDS, the engine, your game code, and the Hooks object followed by boot().

${fence}js
${configBlock(r, game)}

${wordsBlock(r.lang)}
${fence}

Engine CSS:
${fence}css
${ENGINE_CSS}
${fence}

Body HTML (fill in the screens; keep every id):
${fence}html
${ENGINE_HTML}
${fence}

Engine JavaScript (copy exactly):
${fence}js
${ENGINE_JS}
${fence}

Hooks to fill in (keep the names; the engine calls them):
${fence}js
${HOOKS_JS}
${fence}

# 12. Delivery
- Output format: create the game as a CODE canvas containing the raw HTML source, starting with <!DOCTYPE html> and ending with </html>, so Gemini Canvas can run and preview it as an app. Do NOT create a text document, do not explain the code in the canvas, and do not split it into several files.
- One complete HTML file. No TODOs, no placeholders, no "add more here", nothing left out.
- A short comment at the top of the script explains how to edit QUESTIONS and CONFIG.
- Before answering, test it in your head step by step: the page loads with no error; tapping Start leaves the start screen; question 1 appears big, then moves up while the answers appear and move at the CONFIG pace; a wrong hit shows the hint and the game continues; a correct hit celebrates and question 2 appears; after the last question the result screen appears and Play again works; everything fits a 375 x 667 phone. Fix anything that fails, then output the whole file.`;
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
    id: 'start',
    th: 'กด Start ไม่ได้',
    en: 'The Start button does nothing. Fix it: remove every onclick="..." attribute and wire buttons with addEventListener in the script (inline handlers do not work inside <script type="module">); make sure no invisible layer covers the button (hidden layers must use display: none, decorations and particle canvases pointer-events: none); wrap fonts, audio and localStorage in try/catch so an error cannot stop startGame(); check the browser console and fix every error. Send the full updated file.',
  },
  {
    id: 'noq',
    th: 'ไม่มีโจทย์ขึ้น',
    en: 'No question appears on screen. Show the current question as HTML text in a big rounded card (#qtext), not drawn on a canvas: big in the center during the reading phase, then near the top while playing, always above the game layer (higher z-index) with dark text on a light card. Make sure QUESTIONS is defined before the game starts and each question is read from it. Send the full updated file.',
  },
  {
    id: 'next',
    th: 'ตอบแล้วไม่ไปข้อต่อไป',
    en: 'After answering, the game does not go to the next question. Make one function answer(i) that is called exactly once per hit; when it is correct, celebrate for 1.5 seconds and then call nextQuestion(), which clears the old answer objects, loads the next item from QUESTIONS, shows it, and spawns new answer objects; after the last question show the result screen. Use timers that run inside the game loop (not setTimeout that can be lost) and remember the question number so old timers cannot interfere. Send the full updated file.',
  },
  {
    id: 'fun',
    th: 'เกมยังไม่สนุก ลูกเล่นน้อย',
    en: 'The game feels stiff and plain. Without changing QUESTIONS or the pacing, add life: make every answer an action with anticipation, an eased flight, impact particles and a funny reaction; add idle animations to everything (bob, blink, sway); add an ambient event every few seconds (wind gust, a passing creature, a bonus item that is never an answer); make the mascot react to every answer. Send the full updated file.',
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
