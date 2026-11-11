/**
 * "สูตร" ใบงาน = ตัวเลือกที่ครูแต่งในตู้ + ตัวประกอบ prompt ภาษาอังกฤษสำหรับ Gemini
 * ทำงานในเครื่องทั้งหมด ไม่เรียก AI ฝั่งเรา · cleanRecipe ใช้ทุกที่ที่รับสูตรจากภายนอก (URL, API, ฐานข้อมูล)
 */
import {
  ACTIVITIES,
  COUNT_MAX,
  COUNT_MIN,
  CUSTOM_MAX,
  FRAMES,
  LANGS,
  LEVELS,
  NOTE_MAX,
  STYLES,
  SUBJECTS,
  THEMES,
  activitiesFor,
  gradeEn,
  gradeLabel,
  subjectOf,
  type SubjectId,
} from './options';

export interface Recipe {
  v: 1;
  /** วิชา */
  s: SubjectId;
  /** ชั้น 1-12 */
  g: number;
  /** id หัวข้อ หรือ 'custom' */
  tp: string;
  /** หัวข้อพิมพ์เอง */
  cu: string;
  /** กิจกรรม */
  a: string;
  th: string;
  st: string;
  fr: string;
  o: 'p' | 'l';
  n: number;
  lv: string;
  lang: string;
  /** ตัวอักษรใหญ่ (ป.ต้น) */
  big: boolean;
  /** ช่องชื่อ ชั้น เลขที่ */
  name: boolean;
  score: boolean;
  sticker: boolean;
  mascot: boolean;
  /** หน้าเฉลย */
  key: boolean;
  /** blank = เว้นช่องให้ครูพิมพ์เอง (แนะนำ เพราะ AI วาดตัวหนังสือไทยเพี้ยนบ่อย) / ai = ให้ AI เขียนข้อความ */
  txt: 'blank' | 'ai';
  /** ชื่อใบงาน (ว่าง = ตั้งจากหัวข้อ) */
  title: string;
  /** สิ่งที่ครูอยากเพิ่ม */
  note: string;
}

export const defaultRecipe = (): Recipe => ({
  v: 1,
  s: 'math',
  g: 3,
  tp: 'frac',
  cu: '',
  a: 'color',
  th: 'space',
  st: 'cartoon',
  fr: 'theme',
  o: 'p',
  n: 8,
  lv: 'easy',
  lang: 'th',
  big: false,
  name: true,
  score: true,
  sticker: true,
  mascot: true,
  key: false,
  txt: 'blank',
  title: '',
  note: '',
});

/** ข้อความที่ครูพิมพ์: เก็บไทย อังกฤษ จีน ญี่ปุ่น ตัวเลข เครื่องหมายพื้นฐาน (ตัดอิโมจิ เครื่องหมายคำพูด ขึ้นบรรทัด) */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v
    .replace(/[^฀-๿぀-ヿ一-鿿A-Za-z0-9 .,!?()+\-=/:%×÷]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

const pickId = (v: unknown, ids: readonly string[], d: string) => (typeof v === 'string' && ids.includes(v) ? v : d);
const flag = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

/** ตรวจ/ซ่อมสูตรจากที่ใดก็ได้ ได้สูตรที่ใช้ได้เสมอ */
export function cleanRecipe(raw: unknown): Recipe {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = defaultRecipe();
  const s = pickId(r.s, SUBJECTS.map((x) => x.id), d.s) as SubjectId;
  const subj = subjectOf(s);
  const g = Math.min(12, Math.max(1, Math.round(Number(r.g)) || d.g));
  const tp = pickId(r.tp, [...subj.topics.map((x) => x.id), 'custom'], subj.topics[0].id);
  const cu = cleanText(r.cu, CUSTOM_MAX);
  const acts = activitiesFor(s).map((x) => x.id);
  const n = Math.round(Number(r.n));
  return {
    v: 1,
    s,
    g,
    tp: tp === 'custom' && !cu ? subj.topics[0].id : tp,
    cu,
    a: pickId(r.a, acts, acts[0]),
    th: pickId(r.th, THEMES.map((x) => x.id), d.th),
    st: pickId(r.st, STYLES.map((x) => x.id), d.st),
    fr: pickId(r.fr, FRAMES.map((x) => x.id), d.fr),
    o: r.o === 'l' ? 'l' : 'p',
    n: Number.isFinite(n) ? Math.min(COUNT_MAX, Math.max(COUNT_MIN, n)) : d.n,
    lv: pickId(r.lv, LEVELS.map((x) => x.id), d.lv),
    lang: pickId(r.lang, LANGS.map((x) => x.id), d.lang),
    big: flag(r.big, d.big),
    name: flag(r.name, d.name),
    score: flag(r.score, d.score),
    sticker: flag(r.sticker, d.sticker),
    mascot: flag(r.mascot, d.mascot),
    key: flag(r.key, d.key),
    txt: r.txt === 'ai' ? 'ai' : 'blank',
    title: cleanText(r.title, 40),
    note: cleanText(r.note, NOTE_MAX),
  };
}

export const topicOf = (r: Recipe) => {
  if (r.tp === 'custom') return { th: r.cu, en: r.cu };
  const tp = subjectOf(r.s).topics.find((x) => x.id === r.tp);
  return tp ? { th: tp.th, en: tp.en } : { th: '', en: '' };
};

export const titleOf = (r: Recipe) => r.title || `ใบงาน ${topicOf(r).th}`.trim();

const find = <T extends { id: string }>(list: readonly T[], id: string) => list.find((x) => x.id === id) || list[0];

/** ภาษาของข้อความบนกระดาษ: วิชาภาษาต่างประเทศใช้ไทยคู่ภาษานั้น */
function langLine(r: Recipe): string {
  if (r.s === 'chinese') return 'Instructions in Thai; practice content in Simplified Chinese characters with pinyin.';
  if (r.s === 'japanese') return 'Instructions in Thai; practice content in Japanese kana or kanji with romaji.';
  return `Language of all text on the page: ${find(LANGS, r.lang).en}.`;
}

/**
 * จำนวนชิ้นที่วาดในพื้นที่เนื้อหา: ใช้ร่วมกันทั้งกระดาษตัวอย่าง (PaperPreview) และ prompt
 * ให้ภาพตัวอย่างบนเว็บกับสิ่งที่สั่ง Gemini ตรงกัน
 */
export function itemCount(a: string, n: number): number {
  switch (a) {
    case 'match':
      return Math.min(n, 10);
    case 'reading':
    case 'cutpaste':
      return Math.min(n, 5);
    case 'numline':
      return Math.min(n, 6);
    case 'wordsearch':
    case 'crossword':
    case 'table':
    case 'lablog':
    case 'exercise':
    case 'sequence':
    case 'draw':
      return Math.min(n, 9);
    case 'comic':
      return 4;
    case 'mindmap':
      return Math.min(Math.max(n, 4), 8);
    case 'plate':
      return 5;
    case 'trace':
    case 'tian':
    case 'kana':
      return Math.min(Math.max(3, Math.ceil(n / 2)), 8); // จำนวนแถวของตาราง
    default:
      return n;
  }
}

/** โครงพื้นที่เนื้อหาของแต่ละกิจกรรม เขียนตามที่ PaperPreview วาดทุกจุด (แก้ที่หนึ่งต้องแก้อีกที่ด้วย) */
function bodySpec(a: string, n: number, big: boolean): string {
  const k = itemCount(a, n);
  const rowsOf = (what: string) => `${k} evenly spaced numbered rows filling the whole area from top to bottom; each row: the number in a small filled circle at the left, ${what}`;
  const grid = (cols: number, guide: string, model: string) =>
    `a grid of large equal squares, ${cols} per row and ${k} rows, filling the area; ${guide}in every row the first square shows a model ${model}, the second square shows the same ${model} in light dotted outline for tracing, the other squares are empty`;
  switch (a) {
    case 'match':
      return `two columns of ${k} empty rounded boxes, one column on the left edge and one on the right edge, each box with a small dot on the side facing the center; a wide empty gap between the columns for drawing lines, with two example dotted lines already connecting pairs`;
    case 'circle':
      return rowsOf('a long writing line, then three empty answer circles in a row at the right end');
    case 'tf':
      return rowsOf('a long writing line, then two empty answer circles at the right end (one for true, one for false)');
    case 'color':
      return 'one large oval picture split into 4 regions filling the upper 80% of the area, with one region already colored as an example; below it a color key row of 4 boxes, each with a small color dot';
    case 'maze':
      return 'one large square maze filling the area, a start circle at the top-left corner and a goal flag at the bottom-right corner';
    case 'wordsearch':
      return `a 10 x 10 letter grid on the left two-thirds with one example word highlighted, and ${k} short blank lines for the word list on the right`;
    case 'crossword':
      return `a crossword grid of empty squares on the left two-thirds and ${k} numbered blank clue lines on the right`;
    case 'trace':
      return grid(6, '', big ? 'big letter' : 'letter');
    case 'tian':
      return grid(7, 'every square has a dotted cross guide (tian zi ge); ', 'Chinese character');
    case 'kana':
      return grid(7, 'every square has a dotted cross guide; ', 'kana character');
    case 'sequence':
    case 'draw':
      return `${k} equal rounded picture boxes in a 3-column grid filling the area, each with one simple theme picture in the center and a small empty number box in its bottom-right corner`;
    case 'comic':
      return 'a 2 x 2 grid of comic panels filling the area, each panel with an empty speech bubble at the top-left and one simple theme picture';
    case 'mindmap':
      return `a central oval filled with the accent color, with ${k} straight branches to ${k} empty ovals spread evenly around it`;
    case 'reading':
      return `a tinted passage box filling the top 40% of the area with lines for the story, then ${k} numbered questions below, each with an answer line`;
    case 'table':
    case 'lablog':
      return `a table filling the area with 4 columns and ${k} empty rows below a header row filled with the accent color`;
    case 'exercise':
      return `a table filling the area with a header row in the accent color and ${k} rows; the first column shows one simple stick-figure exercise pose per row, then 7 day columns with empty checkboxes`;
    case 'plate':
      return 'one large round plate split into 5 colored slices (the five food groups) in the center, and 5 short label lines in a row below it';
    case 'numline':
      return `${k} numbered number lines across the full width, each with 11 evenly spaced tick marks; the first line has one example hop arc`;
    case 'cutpaste':
      return `upper two-thirds: ${k} numbered rows, each with a writing line and a dashed empty paste box at the right; then one dashed cut line across the page; bottom: 4 picture cards with dashed borders, each with one simple theme picture`;
    default:
      return rowsOf('a long writing line, and a dashed answer box at the right end');
  }
}

/** ประกอบ prompt ภาษาอังกฤษ (โมเดลภาพเข้าใจดีกว่า) บอกโครงหน้าละเอียดตามกระดาษตัวอย่าง ข้อความไทยใส่ในเครื่องหมายคำพูด */
export function buildPrompt(raw: Recipe): string {
  const r = cleanRecipe(raw);
  const subj = subjectOf(r.s);
  const topic = topicOf(r);
  const act = find(ACTIVITIES, r.a);
  const theme = find(THEMES, r.th);
  const style = find(STYLES, r.st);
  const frame = find(FRAMES, r.fr);
  const level = find(LEVELS, r.lv);
  const orient = r.o === 'l' ? 'landscape' : 'portrait';
  const title = titleOf(r);
  const blank = r.txt === 'blank';

  // โครงหน้าบนลงล่าง ตรงกับ PaperPreview
  const zones: string[] = [];
  zones.push(
    `Title banner: a rounded bar across the full width at the top (about 9% of the page height), filled with the main color, a small white theme icon at its left end${
      blank ? ', the rest of the banner left empty (no words)' : `, the title "${title}" in big white letters`
    }${r.score ? '; to the right of the banner, a round empty score circle with a thick accent-color ring' : ''}.`
  );
  if (r.name) zones.push('Name row: one thin row with three short dotted lines labeled "ชื่อ", "ชั้น" and "เลขที่".');
  if (r.mascot)
    zones.push(
      `Instruction row: one cute original mascot (a round friendly face) at the left, next to a long rounded instruction bubble spanning the width${blank ? ', left empty' : ' with one very short instruction'}.`
    );
  zones.push(`Main area (the rest of the page, about 65% of its height): ${bodySpec(r.a, r.n, r.big)}.`);
  const foot: string[] = [];
  if (r.sticker) foot.push('a round reward star sticker at the bottom-right corner');
  if (r.key) foot.push('a small dark tag at the bottom-left reading "+ เฉลย"');
  if (foot.length) zones.push(`Bottom: ${foot.join('; ')}.`);

  const colors = style.bw ? 'Colors: black, white and light gray only.' : `Colors: main ${theme.pal[0]}, accent ${theme.pal[1]}, page margin tint ${theme.pal[2]}.`;

  const lines = [
    `Create a printable A4 ${orient} worksheet image for Thai students in ${gradeEn(r.g)}.`,
    `Subject: ${subj.en}. Topic: ${topic.en}. Activity: ${act.en}. Difficulty: ${level.en}.`,
    langLine(r),
    `Theme: ${theme.en}. Art style: ${style.en}.`,
    `Follow this exact page layout from top to bottom. Keep these proportions and do not add, remove or move sections:`,
    ...zones.map((z, i) => `${i + 1}. ${z}`),
    `Page: a white content panel with a margin tinted around it; border: ${frame.en}${frame.id === 'theme' ? ' (small icons evenly spaced along the edge only)' : ''}. Keep decorations inside the margin, the content area stays clean.`,
    colors,
    r.big ? 'Use extra large numbers and big answer spaces for young children.' : 'Use large, clear numbers and plenty of answer space.',
    blank
      ? 'Text: write no words anywhere except the three labels and the item numbers. Leave every box, bubble and line empty so the teacher can type the Thai text later.'
      : 'Text: write every Thai word with correct Thai spelling and tone marks. Keep sentences very short.',
  ];
  if (r.key) lines.push('Also make a matching answer key version of the same page.');
  if (r.note) lines.push(`Teacher request: ${r.note}.`);
  lines.push(
    style.bw ? 'Keep it black and white with thin clean lines, ready to color.' : 'Flat, clean shapes so it prints well. High contrast for numbers.',
    'Avoid: copyrighted or famous characters, brand logos, watermarks, signatures, photo-realism, scary images, tiny text, clutter, extra sections.',
    `Output: one high resolution image with an exact A4 ${orient} aspect ratio (${r.o === 'l' ? '297 x 210' : '210 x 297'}).`
  );
  return lines.join('\n');
}

/** ป้ายสรุปสูตรสั้นๆ (ภาษาไทย) ใช้ในการ์ดผลงาน */
export function recipeChips(raw: Recipe): string[] {
  const r = cleanRecipe(raw);
  return [subjectOf(r.s).th, gradeLabel(r.g), topicOf(r).th, find(ACTIVITIES, r.a).th, find(THEMES, r.th).th, find(STYLES, r.st).th].filter(Boolean);
}

/* ---------------------------------------------------------------- สุ่มชุด / ชุดสำเร็จรูป */

type Rng = () => number;
const one = <T,>(list: readonly T[], rnd: Rng): T => list[Math.floor(rnd() * list.length) % list.length];

/** ปุ่มลูกเต๋า: สุ่มทั้งชุด แต่หัวข้อเหมาะกับชั้น (เก็บวิชา/ชั้นเดิมถ้าล็อกไว้) */
export function randomRecipe(rnd: Rng = Math.random, keep?: Partial<Pick<Recipe, 's' | 'g'>>): Recipe {
  const s = keep?.s || one(SUBJECTS, rnd).id;
  const subj = subjectOf(s);
  const g = keep?.g || 1 + Math.floor(rnd() * 6);
  const fit = subj.topics.filter((x) => g >= x.g[0] && g <= x.g[1]);
  return cleanRecipe({
    ...defaultRecipe(),
    s,
    g,
    tp: one(fit.length ? fit : subj.topics, rnd).id,
    a: one(activitiesFor(s), rnd).id,
    th: one(THEMES, rnd).id,
    st: one(STYLES, rnd).id,
    fr: one(FRAMES, rnd).id,
    n: 5 + Math.floor(rnd() * 8),
    lv: one(LEVELS, rnd).id,
    big: g <= 2,
    mascot: rnd() > 0.3,
    sticker: rnd() > 0.4,
  });
}

export interface Preset {
  id: string;
  th: string;
  r: Partial<Recipe>;
}

export const PRESETS: Preset[] = [
  { id: 'p1-trace', th: 'คัดลายมือ ป.1 ประหยัดหมึก', r: { s: 'thai', g: 1, tp: 'consonant', a: 'trace', th: 'garden', st: 'bw', big: true, n: 6 } },
  { id: 'space-color', th: 'ระบายสีตามคำตอบ ธีมอวกาศ', r: { s: 'math', g: 2, tp: 'addsub', a: 'color', th: 'space', st: 'cartoon', n: 10 } },
  { id: 'eng-match', th: 'จับคู่คำศัพท์สัตว์', r: { s: 'eng', g: 2, tp: 'animals', a: 'match', th: 'farm', st: 'pastel', n: 8, lang: 'bi' } },
  { id: 'sci-lab', th: 'ใบบันทึกการทดลอง', r: { s: 'sci', g: 5, tp: 'mixture', a: 'lablog', th: 'robot', st: 'flat', n: 5 } },
  { id: 'cn-tian', th: 'คัดอักษรจีน ตาราง 田', r: { s: 'chinese', g: 3, tp: 'cn-num', a: 'tian', th: 'thai', st: 'minimal', n: 10 } },
  { id: 'jp-kana', th: 'ฝึกเขียนฮิรางานะ', r: { s: 'japanese', g: 4, tp: 'jp-hira', a: 'kana', th: 'garden', st: 'water', n: 10 } },
  { id: 'health-plate', th: 'จานอาหาร 5 หมู่', r: { s: 'health', g: 2, tp: 'food5', a: 'plate', th: 'sweets', st: 'cartoon', n: 5 } },
  { id: 'pe-cards', th: 'การ์ดท่าออกกำลังกาย 7 วัน', r: { s: 'pe', g: 4, tp: 'warmup', a: 'exercise', th: 'sports', st: 'flat', n: 6, o: 'l' } },
  { id: 'social-map', th: 'แผนที่และทิศ เขาวงกต', r: { s: 'social', g: 4, tp: 'map', a: 'maze', th: 'city', st: 'doodle', n: 6 } },
  { id: 'read', th: 'อ่านจับใจความ ลอยกระทง', r: { s: 'thai', g: 4, tp: 'readth', a: 'reading', th: 'loykrathong', st: 'water', n: 5 } },
];

export const presetRecipe = (p: Preset) => cleanRecipe({ ...defaultRecipe(), ...p.r });

/* ---------------------------------------------------------------- ส่งสูตรผ่าน URL (?r=) */

export function encodeRecipe(r: Recipe): string {
  const bytes = new TextEncoder().encode(JSON.stringify(cleanRecipe(r)));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeRecipe(s: string): Recipe | null {
  try {
    if (!/^[A-Za-z0-9_-]{1,2000}$/.test(s)) return null;
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    return cleanRecipe(JSON.parse(json));
  } catch {
    return null;
  }
}
