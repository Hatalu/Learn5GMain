/**
 * เนื้อหาของ "เกมตัวอย่าง" ให้ตรงกับตัวเลือกของครู: วิชา + ชั้น + เรื่อง + ความยาก
 * - เลือกตอบ: ดึงชุดจากคลังชุดคำถามของเว็บ (setBank) ที่ตรงชั้น/เรื่อง/ระดับที่สุด (ไม่มีก็ใช้ตัวอย่างของวิชา)
 * - จัดกลุ่ม/เรียงลำดับ: คณิตสร้างโจทย์จากชั้น+เรื่อง+ระดับ (สุ่มแบบมีเมล็ด ได้ชุดเดิมทุกครั้ง) วิชาอื่นใช้ชุดตามเรื่อง
 *   แล้วตามช่วงชั้น แล้วค่อยใช้ชุดตัวอย่างของวิชา · ความยากตัดจำนวนหมวด/ขั้นลง
 * ฟังก์ชันล้วน (selftest เรียกได้) ยกเว้น demoItems ที่โหลดคลังแบบ dynamic
 */
import { LEVELS, gradeLabel, subjectOf, type SubjectId } from '@/lib/worksheet/options';
import type { Act } from './games';
import { quizToItems, topicLabel, type GameRecipe, type GItem } from './prompt';
import { ORDER_SAMPLES, SAMPLES, SORT_SAMPLES } from './samples';

const BANK = new Set<SubjectId>(['math', 'sci', 'eng', 'thai', 'social']);

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const lvOf = (r: GameRecipe) => Math.max(0, LEVELS.findIndex((l) => l.id === r.lv)) as 0 | 1 | 2;

const sortSet = (cats: string[], items: [string, number][]): GItem[] => items.map(([q, k]) => ({ q, choices: cats, correct: [k] }));
const ord = (q: string, ...steps: string[]): GItem => ({ q, choices: steps, correct: steps.map((_, i) => i), ordered: true });

/* ---------------------------------------------------------------- จัดกลุ่ม: ชุดตามเรื่อง */

const SORT_TOPIC: Record<string, GItem[]> = {
  living: sortSet(['สิ่งมีชีวิต', 'ไม่มีชีวิต'], [['สุนัข', 0], ['ก้อนหิน', 1], ['ต้นมะม่วง', 0], ['ดินสอ', 1], ['เห็ด', 0], ['เก้าอี้', 1], ['ปลาทอง', 0], ['รถยนต์', 1]]),
  plants: sortSet(['ราก', 'ลำต้น', 'ใบ', 'ดอก'], [['ดูดน้ำจากดิน', 0], ['ลำเลียงน้ำ', 1], ['สร้างอาหาร', 2], ['สืบพันธุ์', 3], ['ยึดต้นกับดิน', 0], ['มีปากใบ', 2], ['มีเกสร', 3], ['ค้ำจุนกิ่งก้าน', 1]]),
  animalsci: sortSet(['เลี้ยงลูกด้วยนม', 'สัตว์ปีก', 'เลื้อยคลาน'], [['แมว', 0], ['ไก่', 1], ['จิ้งจก', 2], ['ช้าง', 0], ['นกกระจอก', 1], ['งู', 2], ['วาฬ', 0], ['เป็ด', 1], ['เต่า', 2]]),
  matter: sortSet(['ของแข็ง', 'ของเหลว', 'แก๊ส'], [['น้ำแข็ง', 0], ['นม', 1], ['ไอน้ำ', 2], ['ก้อนหิน', 0], ['น้ำมันพืช', 1], ['ลมในลูกโป่ง', 2], ['ไม้บรรทัด', 0], ['น้ำผลไม้', 1], ['ออกซิเจน', 2]]),
  solar: sortSet(['ดาวเคราะห์', 'ไม่ใช่ดาวเคราะห์'], [['ดาวอังคาร', 0], ['ดวงอาทิตย์', 1], ['ดาวพฤหัสบดี', 0], ['ดวงจันทร์', 1], ['ดาวศุกร์', 0], ['ดาวหาง', 1], ['โลก', 0], ['อุกกาบาต', 1]]),
  electric: sortSet(['ตัวนำไฟฟ้า', 'ฉนวนไฟฟ้า'], [['ลวดทองแดง', 0], ['ยางลบ', 1], ['ช้อนเหล็ก', 0], ['ไม้บรรทัดพลาสติก', 1], ['ตะปู', 0], ['แก้วน้ำ', 1], ['กุญแจ', 0], ['ผ้าเช็ดหน้า', 1]]),
  words: sortSet(['คำนาม', 'คำกริยา', 'คำวิเศษณ์'], [['บ้าน', 0], ['วิ่ง', 1], ['สวย', 2], ['ครู', 0], ['กิน', 1], ['เร็ว', 2], ['แมว', 0], ['นอน', 1], ['สูง', 2]]),
  matra: sortSet(['แม่กง', 'แม่กน', 'แม่กม'], [['ลิง', 0], ['บิน', 1], ['ส้ม', 2], ['ช้าง', 0], ['จาน', 1], ['ลม', 2], ['ถุง', 0], ['คน', 1], ['ผม', 2]]),
  vowel: sortSet(['สระเสียงสั้น', 'สระเสียงยาว'], [['กะ', 0], ['กา', 1], ['กิ', 0], ['กี', 1], ['กุ', 0], ['กู', 1], ['เกะ', 0], ['เก', 1]]),
  past: sortSet(['Present', 'Past'], [['go', 0], ['went', 1], ['eat', 0], ['ate', 1], ['see', 0], ['saw', 1], ['play', 0], ['played', 1]]),
  verbs: sortSet(['Noun', 'Verb'], [['dog', 0], ['run', 1], ['book', 0], ['eat', 1], ['apple', 0], ['swim', 1], ['school', 0], ['jump', 1]]),
  regions: sortSet(['ภาคเหนือ', 'ภาคอีสาน', 'ภาคใต้'], [['เชียงใหม่', 0], ['ขอนแก่น', 1], ['ภูเก็ต', 2], ['น่าน', 0], ['อุดรธานี', 1], ['สงขลา', 2], ['ลำปาง', 0], ['อุบลราชธานี', 1], ['กระบี่', 2]]),
  economy: sortSet(['รายรับ', 'รายจ่าย'], [['เงินเดือน', 0], ['ค่าอาหาร', 1], ['ขายของ', 0], ['ค่าน้ำไฟ', 1], ['ดอกเบี้ยเงินฝาก', 0], ['ค่าเดินทาง', 1], ['เงินรางวัล', 0], ['ซื้อเสื้อผ้า', 1]]),
  environment: sortSet(['ขยะเปียก', 'รีไซเคิล', 'ขยะอันตราย'], [['เปลือกกล้วย', 0], ['ขวดพลาสติก', 1], ['ถ่านไฟฉาย', 2], ['เศษผัก', 0], ['กระป๋อง', 1], ['หลอดไฟ', 2], ['เศษอาหาร', 0], ['กระดาษ', 1], ['กระป๋องสเปรย์', 2]]),
  asean: sortSet(['อาเซียน', 'ไม่ใช่อาเซียน'], [['เวียดนาม', 0], ['ญี่ปุ่น', 1], ['ลาว', 0], ['จีน', 1], ['มาเลเซีย', 0], ['อินเดีย', 1], ['ฟิลิปปินส์', 0], ['เกาหลีใต้', 1]]),
};

/* ---------------------------------------------------------------- เรียงลำดับ: ชุดตามเรื่อง */

const ORDER_TOPIC: Record<string, GItem[]> = {
  lifecycle: [ord('วัฏจักรชีวิตของกบ', 'ไข่', 'ลูกอ๊อด', 'ลูกกบมีขา', 'กบ'), ord('วัฏจักรชีวิตผีเสื้อ', 'ไข่', 'หนอน', 'ดักแด้', 'ผีเสื้อ'), ord('วัฏจักรชีวิตไก่', 'ไข่', 'ลูกเจี๊ยบ', 'ไก่รุ่น', 'ไก่โต')],
  plants: [ord('การเติบโตของพืช', 'เมล็ด', 'งอกราก', 'ต้นกล้า', 'ออกดอก', 'ติดผล')],
  water: [ord('วัฏจักรน้ำ', 'น้ำระเหย', 'ไอน้ำลอยขึ้น', 'ควบแน่นเป็นเมฆ', 'ฝนตก'), ord('น้ำแข็งได้รับความร้อน', 'น้ำแข็ง', 'น้ำ', 'ไอน้ำ')],
  matter: [ord('น้ำแข็งได้รับความร้อน', 'น้ำแข็ง', 'น้ำ', 'ไอน้ำ'), ord('ไอน้ำเย็นลง', 'ไอน้ำ', 'หยดน้ำ', 'น้ำแข็ง')],
  solar: [ord('เรียงจากใกล้ดวงอาทิตย์', 'ดาวพุธ', 'ดาวศุกร์', 'โลก', 'ดาวอังคาร'), ord('เรียงจากใกล้ดวงอาทิตย์', 'ดาวพฤหัสบดี', 'ดาวเสาร์', 'ดาวยูเรนัส', 'ดาวเนปจูน')],
  moon: [ord('ดวงจันทร์ในหนึ่งเดือน', 'ขึ้น 1 ค่ำ', 'ขึ้น 8 ค่ำ', 'ขึ้น 15 ค่ำ', 'แรม 8 ค่ำ', 'แรม 15 ค่ำ')],
  history: [ord('เรียงสมัยจากเก่าไปใหม่', 'สุโขทัย', 'อยุธยา', 'ธนบุรี', 'รัตนโกสินทร์')],
  sentence: [ord('เรียงคำให้เป็นประโยค', 'น้อง', 'ชอบ', 'กิน', 'มะม่วง'), ord('เรียงคำให้เป็นประโยค', 'แมว', 'นอน', 'ใต้', 'โต๊ะ')],
  past: [ord('Put the words in order', 'I', 'went', 'to', 'school'), ord('Put the words in order', 'She', 'played', 'with', 'me')],
  myself: [ord('เรียงจากเล็กไปใหญ่', 'ตัวเรา', 'ครอบครัว', 'โรงเรียน', 'ชุมชน')],
  map: [ord('เรียงจากเล็กไปใหญ่', 'หมู่บ้าน', 'ตำบล', 'อำเภอ', 'จังหวัด', 'ประเทศ')],
};

/* ---------------------------------------------------------------- ช่วงชั้นสูง (เมื่อไม่มีชุดตามเรื่อง) */

const SORT_UPPER: Partial<Record<SubjectId, GItem[]>> = {
  sci: SORT_TOPIC.electric,
  eng: SORT_TOPIC.past,
  thai: SORT_TOPIC.words,
  social: SORT_TOPIC.economy,
};
const ORDER_UPPER: Partial<Record<SubjectId, GItem[]>> = {
  sci: ORDER_TOPIC.water,
  eng: ORDER_TOPIC.past,
  thai: ORDER_TOPIC.sentence,
  social: ORDER_TOPIC.history,
};

/* ---------------------------------------------------------------- คณิต: สร้างโจทย์ */

const fmt = (n: number) => n.toLocaleString('en-US');
function uniqNums(r: () => number, k: number, lo: number, hi: number) {
  const s = new Set<number>();
  while (s.size < k) s.add(lo + Math.floor(r() * (hi - lo + 1)));
  return [...s];
}

function mathSort(r: GameRecipe): GItem[] {
  const R = rng(`${r.g}-${r.topic}-${r.lv}-sort`);
  const lv = lvOf(r);
  const N = 10;
  const t = r.custom ? '' : r.topic;
  if (t === 'frac') {
    const out: [string, number][] = [];
    for (let i = 0; i < N; i++) {
      const d = 2 + Math.floor(R() * (lv ? 9 : 5));
      const k = i % 3;
      const n = k === 0 ? 1 + Math.floor(R() * (d - 1)) : k === 1 ? d : d + 1 + Math.floor(R() * d);
      out.push([`${n}/${d}`, k]);
    }
    return sortSet(['น้อยกว่า 1', 'เท่ากับ 1', 'มากกว่า 1'], out);
  }
  if (t === 'dec' || t === 'pct') {
    const vals = uniqNums(R, N, 1, lv === 2 ? 999 : 99).map((v) => v / (lv === 2 ? 1000 : 100)).filter((v) => v !== 0.5);
    return sortSet(['น้อยกว่า 0.5', 'มากกว่า 0.5'], vals.map((v) => [String(v), v < 0.5 ? 0 : 1]));
  }
  if (t === 'mult' || t === 'div') {
    const m = [2, 3, 7][lv];
    const vals = uniqNums(R, N, m, m * (lv ? 15 : 10));
    return sortSet([`หาร ${m} ลงตัว`, `หาร ${m} ไม่ลงตัว`], vals.map((v) => [String(v), v % m ? 1 : 0]));
  }
  if (t === 'shape2d' || t === 'shape3d')
    return sortSet(['สามเหลี่ยม', 'สี่เหลี่ยม', 'วงกลม'], [['มี 3 มุม', 0], ['มี 4 ด้าน', 1], ['ไม่มีมุม', 2], ['มี 3 ด้าน', 0], ['มุมฉาก 4 มุม', 1], ['ขอบโค้งรอบตัว', 2], ['ป้ายเตือนทางม้าลาย', 0], ['หน้าต่าง', 1], ['ล้อรถ', 2]]);
  if (t === 'integer' || r.g >= 7) {
    const span = [10, 30, 99][lv];
    const out: [string, number][] = [];
    for (let i = 0; i < N; i++) {
      const a = Math.round((R() - 0.5) * 2 * span) || 1;
      let b = Math.round((R() - 0.5) * 2 * span) || -1;
      if (a + b === 0) b += 1;
      out.push([`${a} + (${b})`, a + b > 0 ? 0 : 1]);
    }
    return sortSet(['ผลเป็นบวก', 'ผลเป็นลบ'], out);
  }
  if (r.g >= 4) {
    const vals = uniqNums(R, N, 2, [30, 60, 100][lv]);
    const prime = (v: number) => v > 1 && [...Array(Math.floor(Math.sqrt(v)) - 1)].every((_, i) => v % (i + 2) !== 0);
    return sortSet(['จำนวนเฉพาะ', 'ไม่ใช่จำนวนเฉพาะ'], vals.map((v) => [String(v), prime(v) ? 0 : 1]));
  }
  const vals = uniqNums(R, N, 1, [20, 100, 1000][lv]);
  return sortSet(['จำนวนคู่', 'จำนวนคี่'], vals.map((v) => [fmt(v), v % 2 ? 1 : 0]));
}

function mathOrder(r: GameRecipe): GItem[] {
  const R = rng(`${r.g}-${r.topic}-${r.lv}-order`);
  const lv = lvOf(r);
  const steps = 3 + lv;
  const t = r.custom ? '' : r.topic;
  const out: GItem[] = [];
  for (let k = 0; k < 4; k++) {
    const up = k % 2 === 0;
    const dir = up ? 'เรียงจากน้อยไปมาก' : 'เรียงจากมากไปน้อย';
    let vals: number[];
    let show: (v: number) => string = fmt;
    if (t === 'frac') {
      const d = lv ? 12 : 8;
      vals = uniqNums(R, steps, 1, d - 1);
      show = (v) => `${v}/${d}`;
    } else if (t === 'dec' || t === 'pct') {
      vals = uniqNums(R, steps, 1, lv === 2 ? 999 : 99).map((v) => v / (lv === 2 ? 1000 : 100));
      show = (v) => String(v);
    } else if (t === 'time') {
      vals = uniqNums(R, steps, 12, 46).map((v) => v * 30);
      show = (v) => `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')} น.`;
    } else if (t === 'integer' || r.g >= 7) {
      vals = uniqNums(R, steps, -[10, 30, 99][lv], [10, 30, 99][lv]);
    } else {
      const hi = r.g <= 1 ? [20, 50, 100][lv] : r.g <= 3 ? [100, 1000, 10000][lv] : [10000, 100000, 1000000][lv];
      vals = uniqNums(R, steps, 1, hi);
    }
    vals.sort((a, b) => (up ? a - b : b - a));
    out.push(ord(t === 'time' ? 'เรียงเวลาจากเช้าไปเย็น' : dir, ...vals.map(show)));
    if (t === 'time') out[out.length - 1].choices.sort();
  }
  return out;
}

/* ---------------------------------------------------------------- ตัดตามความยาก */

function trimSort(items: GItem[], lv: number): GItem[] {
  const cats = items[0]?.choices || [];
  if (lv > 0 || cats.length <= 2) return items;
  // ง่าย: เหลือ 2 หมวดแรก
  const keep = cats.slice(0, 2);
  return items.filter((it) => it.correct[0] < 2).map((it) => ({ ...it, choices: keep }));
}
const trimOrder = (items: GItem[], lv: number) => items.map((it) => {
  const n = Math.min(it.choices.length, [3, 4, 9][lv]);
  return n === it.choices.length ? it : { ...it, choices: it.choices.slice(0, n), correct: it.correct.slice(0, n) };
});

/** เนื้อหาจัดกลุ่ม/เรียงลำดับของเกมตัวอย่าง (ซิงก์) */
export function actItems(r: GameRecipe, act: Exclude<Act, 'pick'>): GItem[] {
  const lv = lvOf(r);
  const topic = r.custom ? '' : r.topic;
  if (act === 'sort') {
    const base = r.s === 'math' ? mathSort(r) : SORT_TOPIC[topic] || (r.g >= 4 && SORT_UPPER[r.s]) || SORT_SAMPLES[r.s];
    return trimSort(base, lv);
  }
  const base = r.s === 'math' ? mathOrder(r) : ORDER_TOPIC[topic] || (r.g >= 4 && ORDER_UPPER[r.s]) || ORDER_SAMPLES[r.s];
  return trimOrder(base, lv);
}

/* ---------------------------------------------------------------- เลือกตอบ: จากคลังชุดคำถาม */

/** คะแนนความตรงของชุดกับเรื่อง (คำย่อยของชื่อเรื่องที่พบในชื่อ/คำอธิบายชุด) */
const STOP = new Set(['การ', 'และ', 'ของ', 'อย่าง', 'ง่าย', 'เบื้องต้น', 'ต่างๆ', 'ใน', 'ที่', 'กับ']);
export function topicScore(topic: string, text: string): number {
  // ภาษาไทยไม่เว้นวรรค: ตัดคำก่อน (ไม่มีตัวตัดคำ = แบ่งตามช่องว่างอย่างเดียว)
  const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
  const words = seg ? [...seg.segment(topic)].filter((x) => x.isWordLike).map((x) => x.segment) : topic.split(/\s+/);
  return [...new Set(words)].filter((w) => w.length >= 2 && !STOP.has(w)).reduce((s, w) => s + (text.includes(w) ? w.length : 0), 0);
}

export async function pickItems(r: GameRecipe): Promise<GItem[]> {
  if (!BANK.has(r.s)) return SAMPLES[r.s];
  const { allSets, buildSet } = await import('@/lib/game-creator/setBank');
  const lv = lvOf(r) + 1;
  const topic = r.custom || topicLabel(r);
  const pool = allSets().filter((m) => m.subject === r.s);
  let best = pool[0];
  let bs = -Infinity;
  // ตรงเรื่องสำคัญที่สุด แล้วชั้นใกล้ที่สุด แล้วระดับตรง
  for (const m of pool) {
    const gap = r.g < m.g ? m.g - r.g : r.g > (m.g2 || m.g) ? r.g - (m.g2 || m.g) : 0;
    const s = topicScore(topic, `${m.title} ${m.note} ${m.cat}`) * 10 - gap * 6 + (m.level === lv ? 3 : m.level ? 0 : 1);
    if (s > bs) {
      bs = s;
      best = m;
    }
  }
  const set = best ? buildSet(best.id) : null;
  const items = set ? quizToItems(set.content).items.filter((x) => x.choices.length >= 2) : [];
  return items.length >= 3 ? items : SAMPLES[r.s];
}

/** ชื่อสั้นๆ ของเนื้อหาที่เกมตัวอย่างใช้ (โชว์ใต้เกม) */
export const demoTopicLine = (r: GameRecipe) => `${subjectOf(r.s).th} ${gradeLabel(r.g)} · ${topicLabel(r)} · ${LEVELS[lvOf(r)].th}`;
