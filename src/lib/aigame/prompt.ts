/**
 * ประกอบ prompt สร้างเกมสำหรับ Gemini (Canvas) จากเกมที่เลือก + วิชา/ชั้น/เรื่อง + แหล่งคำถาม
 * ฟังก์ชันล้วน ไม่แตะ DOM (selftest เรียกได้)
 */
import { GRADES, LANGS, LEVELS, SUBJECTS, gradeLabel, subjectOf, type SubjectId } from '@/lib/worksheet/options';
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
});

/** เรื่องที่เหมาะกับชั้นนี้ (ถ้าไม่มีเลยคืนทั้งหมดของวิชา) */
export function topicsFor(s: SubjectId, g: number) {
  const all = subjectOf(s).topics;
  const fit = all.filter((t) => g >= t.g[0] && g <= t.g[1]);
  return fit.length ? fit : all;
}

export function cleanGameRecipe(raw: Partial<GameRecipe>): GameRecipe {
  const d = defaultGameRecipe();
  const s = SUBJECTS.some((x) => x.id === raw.s) ? (raw.s as SubjectId) : d.s;
  const g = GRADES.includes(Number(raw.g)) ? Number(raw.g) : d.g;
  const topics = subjectOf(s).topics;
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
  };
}

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D]/gu;
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

export interface PromptExtra {
  /** ข้อจากชุดคำถาม (source bank/mine) */
  items?: GItem[];
  setTitle?: string;
  skipped?: number;
}

/** prompt ภาษาไทยแบบละเอียด ให้ Gemini สร้างเกม HTML ไฟล์เดียวที่เล่นได้ทันทีใน Canvas */
export function buildGamePrompt(raw: GameRecipe, extra: PromptExtra = {}): string {
  const r = cleanGameRecipe(raw);
  const game: AiGame = gameById(r.game)!;
  const subj = subjectOf(r.s);
  const level = LEVELS.find((l) => l.id === r.lv)!;
  const lang = LANGS.find((l) => l.id === r.lang)!;
  const topic = topicLabel(r);
  const age = `${r.g + 5}-${r.g + 6} ปี`;
  const items = r.source === 'ai' ? [] : extra.items || [];
  const useSet = items.length > 0;
  const is3d = game.dim === '3D';
  const hasText = items.some((x) => x.accept);
  const hasMulti = items.some((x) => x.correct.length > 1);
  const hasMedia = items.some((x) => x.media);
  const langLine =
    r.lang === 'th'
      ? 'ข้อความทุกอย่างในเกมเป็นภาษาไทย'
      : r.lang === 'en'
        ? 'ข้อความในเกมและคำถามเป็นภาษาอังกฤษง่ายๆ ตามระดับชั้น'
        : 'คำถาม/ตัวเลือกใช้ภาษาที่ตรงกับเนื้อหา ส่วนปุ่ม คำสั่ง และคำใบ้มีทั้งไทยและอังกฤษ (ไทยก่อน)';

  const qBlock = useSet
    ? [
        `ใช้ชุดคำถามนี้ทั้งหมด ${items.length} ข้อ${extra.setTitle ? ` (ชุด "${stripEmoji(extra.setTitle)}")` : ''} ห้ามแก้เนื้อหาคำถามและเฉลย ห้ามตัดข้อทิ้ง`,
        'answer = ลำดับตัวเลือกที่ถูก (เริ่มนับที่ 0)' + (hasMulti ? ' / answers = ข้อที่มีคำตอบถูกหลายตัว ต้องเลือกให้ครบทุกตัวที่ถูกจึงผ่าน' : ''),
        ...(hasText ? ['ข้อที่มี type "text" = ข้อพิมพ์ตอบในต้นฉบับ: ในเกมนี้ให้สร้างตัวลวงที่สมเหตุสมผล 2-3 ตัวเพิ่มเอง แล้วใช้ accept ตัวแรกเป็นคำตอบที่ถูก'] : []),
        ...(hasMedia ? ['บางข้อในต้นฉบับมีรูปประกอบที่ไม่ได้แนบมา: ใช้ข้อความอย่างเดียวได้เลย'] : []),
        'เศษส่วนเขียนเป็น a/b และเลขยกกำลังเป็นตัวยก ให้แสดงผลให้อ่านง่าย (เศษส่วนแนวตั้งถ้าทำได้)',
        'สลับลำดับข้อและลำดับตัวเลือกทุกครั้งที่เริ่มเกมใหม่ (แต่ตรวจคำตอบจากข้อมูลเดิมให้ถูก)',
        '',
        'const QUESTIONS = [',
        ...items.map(itemLine),
        '];',
      ].join('\n')
    : [
        `ให้แต่งคำถามเองจำนวน ${r.count} ข้อ เรื่อง "${topic}" วิชา${subj.th} ชั้น${gradeLabel(r.g)} ระดับ${level.th}`,
        '- ถูกต้องตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐานของไทย ใช้คำและบริบทที่เด็กไทยวัยนี้คุ้นเคย',
        '- ข้อละ 3-4 ตัวเลือก ถูกเพียง 1 ตัว ตัวลวงมาจากความเข้าใจผิดที่เด็กพบบ่อยจริง (ไม่ใช่ตัวลวงมั่วๆ)',
        '- คำถามสั้น อ่านจบในบรรทัดเดียวถ้าทำได้ คำตอบสั้นพอที่จะวางบนวัตถุในเกม (ไม่เกิน ~20 ตัวอักษร)',
        '- ไล่จากง่ายไปยาก ไม่มีข้อซ้ำ ตรวจคำตอบทุกข้อซ้ำอีกครั้งก่อนใส่ในโค้ด',
        '- แต่ละข้อมีคำใบ้ (hint) 1 ประโยคที่ชี้วิธีคิด ไม่บอกคำตอบตรงๆ',
        '',
        'รูปแบบข้อมูล: const QUESTIONS = [ { "q": "...", "choices": ["...", "..."], "answer": 0, "hint": "..." }, ... ];',
      ].join('\n');

  return `คุณคือทีมพัฒนาเกมการศึกษาสำหรับเด็ก (Game Designer + Frontend Developer + Sound Designer) ช่วยสร้าง "เกมการเรียนรู้" ที่เล่นได้จริงทันทีใน Canvas เป็นไฟล์ HTML ไฟล์เดียว

# 1. ข้อมูลบทเรียน
- วิชา: ${subj.th}
- ระดับชั้น: ${gradeLabel(r.g)} (อายุประมาณ ${age})
- เรื่อง: ${topic}
- ความยาก: ${level.th}
- ภาษา: ${langLine}${r.note ? `\n- สิ่งที่ครูต้องการเพิ่ม: ${r.note}` : ''}

# 2. เกมที่ต้องสร้าง: "${game.name}" (${game.en}) แบบ ${game.dim}
แนวคิด: ${game.pitch}
ฉาก: ${game.scene}
${is3d ? 'เป็นเกม 3D จริง ใช้ three.js (ESM จาก https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js ผ่าน importmap) โมเดลสร้างจากรูปทรงพื้นฐาน (box/sphere/cylinder) สไตล์ low-poly น่ารัก แสง Hemisphere + Directional มีเงาเบาๆ ถ้า WebGL ใช้ไม่ได้ ให้แสดงข้อความสั้นๆ และเล่นแบบ 2D (มุมมองจากด้านบน) แทน' : 'เป็นเกม 2D วาดด้วย SVG หรือ Canvas 2D ภาพเวกเตอร์สดใส ขอบหนา เงาทึบ สไตล์การ์ตูนน่ารัก (cozy cute)'}

## กลไกหลัก
${bullets(game.core)}

## การควบคุม (ต้องใช้ได้ทั้งนิ้ว เมาส์ และคีย์บอร์ด)
${bullets(game.controls)}

## ความยากและการเติบโต (Adaptive Difficulty)
${bullets(game.progression)}
- ปรับตามผู้เล่นอัตโนมัติ: ตอบถูกติดกันยากขึ้นทีละนิด ตอบผิดติดกันง่ายลงและให้คำใบ้ชัดขึ้น

# 3. คำถามที่ใช้ในเกม
${qBlock}

วางข้อมูลคำถามไว้บนสุดของสคริปต์ในตัวแปร QUESTIONS เพื่อให้ครูแก้ไขต่อเองได้ง่าย และตัวเกมต้องอ่านข้อมูลจากตัวแปรนี้เท่านั้น

# 4. การเรียนรู้ในเกม (สำคัญมาก)
- คำถามต้องเป็นส่วนหนึ่งของกลไกเกม (ตอบถูก = เกิดผลในเกมจริง) ไม่ใช่ป๊อปอัปข้อสอบแปะทับ
- ตอบผิดไม่มี Game Over: แสดง feedback แบบนุ่มนวล (ตัวละครให้กำลังใจ) + คำใบ้ 1 บรรทัด แล้วให้ลองใหม่
- ผิดข้อเดิมครั้งที่ 2: ไฮไลต์ตัวเลือกที่ถูกเบาๆ แล้วอธิบายสั้นๆ ว่าทำไม
- ข้อที่ผิดเก็บไว้ทบทวนซ้ำตอนท้ายเกม 1 รอบ

# 5. โครงหน้าจอ
1. หน้าเริ่ม: ชื่อเกม "${game.en}" + ชื่อไทย "${game.name}" ตัวใหญ่ มีแอนิเมชันฉาก ปุ่ม "เริ่มเล่น" ใหญ่ ปุ่มเปิด/ปิดเสียง
2. สอนเล่นแบบ Show, don't tell: เล่นจริงข้อแรกพร้อมลูกศร/มือชี้ และข้อความสั้นไม่เกิน 1 บรรทัดต่อขั้น (ห้ามหน้าคู่มือยาว)
3. หน้าเกม: แถบบนแสดงคะแนน ข้อที่ / ทั้งหมด คอมโบ และปุ่มหยุดชั่วคราว
4. หยุดชั่วคราว: เล่นต่อ / เริ่มใหม่ / เปิด-ปิดเสียง
5. หน้าสรุป: ดาว 1-3 ดวงตามความแม่นยำ คะแนน จำนวนข้อถูก รายการข้อที่ผิดพร้อมคำตอบที่ถูก ปุ่ม "เล่นอีกครั้ง"
6. ข้อความในเกมสั้น 1 ความคิดต่อ 1 กล่องข้อความ ไม่เกิน 2 บรรทัด

# 6. ภาพ เสียง และความรู้สึกของเกม (Game Feel)
${bullets(game.juice)}
- ปุ่มนูนหนานุ่ม กดแล้วยุบ-เด้งแบบเยลลี่ (squash & stretch) ทุกปุ่ม
- เอฟเฟกต์ดาววิ้งวับตอนตอบถูก ควันปุ๊งตอนผิด ตัวเลขคะแนนลอยขึ้น
- เสียงทั้งหมดสังเคราะห์ด้วย Web Audio API (pop ฟองสบู่ กระดิ่งแก้ว เสียงถูก/ผิดแบบนุ่ม) + เพลงพื้นหลังสั้นๆ วนได้ เริ่มเสียงหลังผู้เล่นแตะครั้งแรก และถ้า Web Audio ใช้ไม่ได้ เกมต้องเล่นต่อได้ปกติ
- ฟอนต์ไทยอ่านง่าย (โหลด "Mali" หรือ "Kanit" จาก Google Fonts และมี fallback เป็น sans-serif)
- รองรับ prefers-reduced-motion (ลดการสั่น/กะพริบ)

# 7. กฎเหล็ก
- ห้ามใช้อิโมจิทุกกรณี (ทั้งในข้อความ ปุ่ม ตัวละคร คะแนน รางวัล) ใช้ SVG/Canvas/CSS วาดเองทั้งหมด
- ไม่มีไฟล์รูปหรือเสียงภายนอก${is3d ? ' (ยกเว้น three.js และฟอนต์จาก CDN)' : ' (ยกเว้นฟอนต์จาก CDN)'} ไม่มีโฆษณา ไม่มีระบบล็อกอิน ไม่มีแชท ไม่มีการสุ่มกล่องรางวัล
- เนื้อหาเหมาะกับเด็ก ไม่น่ากลัว ไม่รุนแรง
- Responsive: เล่นได้ดีทั้งมือถือแนวตั้ง มือถือแนวนอน iPad และคอม ปรับขนาดตามหน้าต่างทันที ปุ่ม/เป้าหมายที่แตะต้องใหญ่อย่างน้อย 48px ไม่มีอะไรล้นหรือถูกตัดขอบ
- ป้องกันการแตะซ้อน (ตอบแล้วล็อกจนกว่าแอนิเมชันจบ) และป้องกันการซูม/เลื่อนหน้าโดยไม่ตั้งใจระหว่างเล่น (touch-action: none บนพื้นที่เกม)
- ใช้ requestAnimationFrame และหยุดเกมอัตโนมัติเมื่อสลับแท็บ ลื่นไหล 60fps บนมือถือทั่วไป

# 8. ส่งมอบ
- โค้ดครบในไฟล์ HTML เดียว (HTML + CSS + JavaScript) รันได้ทันทีใน Canvas ไม่มี TODO หรือส่วนที่ละไว้
- คอมเมนต์ภาษาไทยสั้นๆ อธิบายแต่ละส่วน และบอกวิธีแก้ QUESTIONS ไว้ด้านบนสุด
- ก่อนส่ง ตรวจเองว่า: เล่นจนจบได้ทุกข้อ ตรวจคำตอบถูกทุกข้อ ไม่มีอิโมจิ ไม่มี error ใน console และหน้าจอมือถือแนวตั้งไม่มีอะไรทับกัน`;
}
