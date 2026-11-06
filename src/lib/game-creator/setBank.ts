/**
 * คลังแม่แบบชุดคำถาม ป.1–ม.6 (500+ ชุด): โหลดแบบ dynamic import เท่านั้น (ข้อมูลใหญ่)
 * ที่มา: แม่แบบเดิม 9 ชุด (setTemplates.ts) + คลังกลาง ป.1–6 (bank/math science english คัดลอกจาก New Game/คลังข้อมูลเนื้อและโจทย์)
 * + คลัง ม.1–6 (bank/hi-*) · คณิต/วิทย์คำนวณ = gen สุ่มแบบมีเมล็ด (ชุดเดิมได้ข้อเดิมทุกครั้ง) แยก 3 ระดับ
 */
import { DEFAULT_TIME, newChoice, uid } from './quiz';
import type { QuizContent, Rich } from './types';
import { SET_TEMPLATES, buildSetTemplate, rich, type SetSubject } from './setTemplates';
import { math } from './bank/math.mjs';
import { science } from './bank/science.mjs';
import { english } from './bank/english.mjs';
import { mathHi } from './bank/hi-math.mjs';
import { scienceHi } from './bank/hi-science.mjs';
import { scienceHiFacts } from './bank/hi-sci-facts.mjs';
import { englishHi } from './bank/hi-english.mjs';
import { thai } from './bank/thai.mjs';
import { social } from './bank/social.mjs';
import { rng } from './bank/util.mjs';

export interface SetMeta {
  id: string;
  subject: SetSubject;
  /** ชั้น 1-12 (ป.1 = 1, ม.1 = 7) ช่วงชั้นใช้ g..g2 */
  g: number;
  g2?: number;
  cat: string;
  /** ระดับความยาก (เฉพาะชุดที่สร้างจากตัวสุ่ม) */
  level?: 1 | 2 | 3;
  title: string;
  note: string;
  sample: string;
  count: number;
}

export const SET_CATS: Record<SetSubject, { id: string; label: string }[]> = {
  math: [
    { id: 'num', label: 'จำนวนและการดำเนินการ' },
    { id: 'alg', label: 'พีชคณิต' },
    { id: 'geo', label: 'การวัดและเรขาคณิต' },
    { id: 'stat', label: 'สถิติและความน่าจะเป็น' },
  ],
  sci: [
    { id: 'life', label: 'สิ่งมีชีวิต' },
    { id: 'matter', label: 'สารและสมบัติของสาร' },
    { id: 'phys', label: 'แรงและพลังงาน' },
    { id: 'earth', label: 'โลกและอวกาศ' },
  ],
  eng: [
    { id: 'vocab', label: 'คำศัพท์' },
    { id: 'grammar', label: 'ไวยากรณ์' },
    { id: 'comm', label: 'การสื่อสาร' },
    { id: 'read', label: 'การอ่าน' },
  ],
  thai: [
    { id: 'word', label: 'คำและภาษา' },
    { id: 'gram', label: 'หลักภาษา' },
    { id: 'read', label: 'การอ่าน' },
    { id: 'lit', label: 'วรรณคดีและการเขียน' },
  ],
  social: [
    { id: 'civic', label: 'หน้าที่พลเมือง' },
    { id: 'hist', label: 'ประวัติศาสตร์' },
    { id: 'geo', label: 'ภูมิศาสตร์' },
    { id: 'econ', label: 'เศรษฐศาสตร์' },
  ],
};
export const LEVEL_LABEL = ['', 'เริ่มต้น', 'ฝึกฝน', 'ท้าทาย'];
export const gradeLabel = (g: number, g2?: number) => {
  const one = (x: number) => (x <= 6 ? `ป.${x}` : `ม.${x - 6}`);
  return g2 && g2 !== g ? `${one(g)}-${g2 <= 6 ? g2 : g2 - 6}` : one(g);
};

type Tuple = [number, string, string, string[], string];
type GenQ = { q: string; a: string; w: string[] };
type Rng = ReturnType<typeof rng>;
interface Topic {
  id: string;
  name: string;
  cat?: string;
  qs?: Tuple[];
  gen?: (d: number, r: Rng) => GenQ;
}
type Bank = Record<number, Topic[]>;

/** หมวดของหัวข้อ ป.1–6 จากคลังกลาง (คลังเดิมไม่มี cat) */
function catOf(subject: SetSubject, t: Topic): string {
  if (t.cat) return t.cat;
  const n = t.name;
  if (subject === 'math') {
    if (/แผนภูมิ|ตาราง/.test(n)) return 'stat';
    if (/แบบรูป|อัตราส่วน/.test(n)) return 'alg';
    if (/รูป|มุม|เส้น|วงกลม|พื้นที่|ปริมาตร|ความยาว|น้ำหนัก|ชั่ง|วัด|เวลา|เงิน/.test(n)) return 'geo';
    return 'num';
  }
  if (subject === 'sci') {
    if (/ร่างกาย|พืช|สัตว์|สิ่งมีชีวิต|ชีวิต|จำแนก|ปรับตัว|พันธุ|ย่อย|จำเป็น/.test(n)) return 'life';
    if (/วัสดุ|สสาร|สารผสม|ของสาร/.test(n)) return 'matter';
    if (/แรง|แม่เหล็ก|พลังงาน|แสง|เสียง|ไฟฟ้า|โน้มถ่วง/.test(n)) return 'phys';
    return 'earth';
  }
  if (/^(prep3|can4|compare5|past5|irreg6|future6|super6)$/.test(t.id)) return 'grammar';
  if (/^(greet2|direct5|time4e)$/.test(t.id)) return 'comm';
  return 'vocab';
}

const LEGACY_CAT: Record<string, string> = { 'm-add-sub': 'num', 'm-times': 'num', 'm-fraction': 'num', 's-living': 'life', 's-matter': 'matter', 's-earth': 'earth', 'e-words': 'vocab', 'e-daily': 'comm', 'e-grammar': 'grammar' };

const SOURCES: [SetSubject, Bank][] = [
  ['math', math as unknown as Bank],
  ['math', mathHi as unknown as Bank],
  ['sci', science as unknown as Bank],
  ['sci', scienceHi as unknown as Bank],
  ['sci', scienceHiFacts as unknown as Bank],
  ['eng', english as unknown as Bank],
  ['eng', englishHi as unknown as Bank],
  ['thai', thai as unknown as Bank],
  ['social', social as unknown as Bank],
];

const PER_SET = 10;
const MIN_SET = 8;
const hash = (s: string) => Array.from(s).reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 2166136261);

/** ตัวสุ่มบางตัวใส่จุลภาคเฉพาะตัวลวง (fmt) แต่คำตอบถูกไม่ใส่ = เดาได้จากรูปแบบ: ทำให้เหมือนกันทุกตัวเลือก */
const commas = (s: unknown) => (String(s).startsWith('$') ? String(s) : String(s).replace(/(?<![\d.,])\d{4,}(?![\d,])/g, (x) => Number(x).toLocaleString('en-US')));

/** สร้างข้อจากหัวข้อ: [คำถาม, ถูก, ตัวลวง...] */
function topicQs(t: Topic, level: number | undefined, seed: string): [string, string, string[]][] {
  if (t.qs) return t.qs.map((x) => [x[1], x[2], x[3]]);
  const r = rng(hash(seed));
  const out: [string, string, string[]][] = [];
  const seen = new Set<string>();
  // level 0 = รวมทุกระดับ (หัวข้อที่โจทย์แต่ละระดับมีไม่กี่แบบ)
  for (let k = 0; k < 120 && out.length < PER_SET; k++) {
    const q = t.gen!(level || (k % 3) + 1, r);
    const key = `${q.q}|${q.a}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([q.q, commas(q.a), q.w.map(commas)]);
  }
  return out;
}

interface Entry {
  meta: SetMeta;
  topic?: Topic;
}
let cache: Map<string, Entry> | null = null;

function index(): Map<string, Entry> {
  if (cache) return cache;
  const m = new Map<string, Entry>();
  for (const t of SET_TEMPLATES) {
    const [a, b] = t.grade.replace('ป.', '').split('-').map(Number);
    m.set(t.id, { meta: { id: t.id, subject: t.subject, g: a, g2: b, cat: LEGACY_CAT[t.id] || SET_CATS[t.subject][0].id, title: t.title, note: t.note, sample: t.qs[0][0], count: t.qs.length } });
  }
  for (const [subject, bank] of SOURCES) {
    for (const [gs, topics] of Object.entries(bank)) {
      const g = Number(gs);
      for (const t of topics) {
        const cat = catOf(subject, t);
        const base = `${subject[0]}${g}-${t.id}`;
        if (t.gen) {
          const lv3 = ([1, 2, 3] as const).map((lv) => topicQs(t, lv, `${base}-${lv}`));
          if (lv3.some((qs) => qs.length < MIN_SET)) {
            // โจทย์บางระดับมีไม่กี่แบบ: ทำชุดเดียวรวมทุกระดับ
            const id = `${base}-0`;
            const qs = topicQs(t, 0, id);
            m.set(id, { topic: t, meta: { id, subject, g, cat, title: t.name, note: 'รวมทุกระดับ ง่ายถึงท้าทาย', sample: qs[0]?.[0] || '', count: qs.length } });
            continue;
          }
          lv3.forEach((qs, i) => {
            const lv = (i + 1) as 1 | 2 | 3;
            const id = `${base}-${lv}`;
            m.set(id, { topic: t, meta: { id, subject, g, cat, level: lv, title: t.name, note: `ระดับ${LEVEL_LABEL[lv]} โจทย์ไม่ซ้ำกัน`, sample: qs[0]?.[0] || '', count: qs.length } });
          });
        } else {
          m.set(base, { topic: t, meta: { id: base, subject, g, cat, title: t.name, note: 'ไล่จากง่ายไปท้าทาย', sample: t.qs![0][1], count: t.qs!.length } });
        }
      }
    }
  }
  cache = m;
  return m;
}

export function allSets(): SetMeta[] {
  return Array.from(index().values(), (e) => e.meta);
}

/** ตัวเลือกที่เป็นเศษส่วนล้วน (3/4, -2/5, 1 1/2) แสดงเป็นสูตร */
function cell(s: string): Rich {
  const f = /^(-?)(?:(\d+) )?(\d+)\/(\d+)$/.exec(s);
  if (f) return [{ t: 'm', v: `${f[1]}${f[2] || ''}\\frac{${f[3]}}{${f[4]}}` }];
  return rich(s);
}

export function buildSet(id: string): { title: string; content: QuizContent } | null {
  const e = index().get(id);
  if (!e) return null;
  if (!e.topic) {
    const t = SET_TEMPLATES.find((x) => x.id === id)!;
    return { title: t.title, content: buildSetTemplate(t) };
  }
  const r = rng(hash(id + ':pos'));
  const questions = topicQs(e.topic, e.meta.level, id).map(([q, right, wrong]) => {
    const w = Array.from(new Set(wrong.map(String))).filter((x) => x && x !== right).slice(0, 3);
    const choices = w.map((x) => ({ ...newChoice(false), text: cell(x) }));
    choices.splice(r.int(0, choices.length), 0, { ...newChoice(true), text: cell(right) });
    return { id: uid(), text: rich(q), media: null, choices, multi: false, time: DEFAULT_TIME, points: 1 as const };
  });
  const lv = e.meta.level ? ` (${LEVEL_LABEL[e.meta.level]})` : '';
  return { title: `${e.meta.title}${lv} ${gradeLabel(e.meta.g)}`.slice(0, 80), content: { v: 1, questions } };
}
