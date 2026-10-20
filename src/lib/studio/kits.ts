/**
 * ชุดเครื่องมือสร้างใบงานอัตโนมัติ แยกตามวิชา: กรอกค่าในฟอร์มสั้นๆ แล้วได้ชิ้นงานที่แก้ไขต่อได้ทุกชิ้น
 * ไม่มี DOM (ทดสอบได้ใน selftest) ฟอร์มสร้างจาก fields เอง ไม่ต้องเขียน UI แยกทีละเครื่องมือ
 */
import { ABC_WORDS, answerSheet, arithProblems, scrambleWord, THAI_CONSONANTS, timesTable, wordSearch } from './gen';
import { makeDeco, makeEdu, makeLine, makeShape, makeTable, makeText, makeWrite, type Item, type TableItem, type TextItem } from './doc';

export type KitSubject = 'all' | 'math' | 'sci' | 'thai' | 'eng';
export const KIT_SUBJECTS: { id: KitSubject; label: string }[] = [
  { id: 'all', label: 'ทุกวิชา' },
  { id: 'math', label: 'คณิตศาสตร์' },
  { id: 'sci', label: 'วิทยาศาสตร์' },
  { id: 'thai', label: 'ภาษาไทย' },
  { id: 'eng', label: 'ภาษาอังกฤษ' },
];

export type KitValue = string | number | boolean;
export type KitField = { k: string; label: string } & (
  | { type: 'text'; def: string; rows?: number }
  | { type: 'num'; def: number; min: number; max: number }
  | { type: 'select'; def: string; options: [string, string][] }
  | { type: 'check'; def: boolean }
);
export interface Kit {
  id: string;
  subjects: KitSubject[];
  label: string;
  note: string;
  fields: KitField[];
  build: (v: Record<string, KitValue>, W: number, H: number, rand: () => number) => { items: Item[]; warn?: string };
}

/* ------------------------------------------------------------------ ตัวช่วยจัดวาง */

const M = 56;
const INK = '#2a2350';
const SOFT = ['#ede7ff', '#ffe4ec', '#dff4ff', '#fff3c4', '#dcfce7', '#ffe8d6'];
const str = (v: KitValue) => String(v ?? '');
const int = (v: KitValue, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number(v) || lo)));
const words = (v: KitValue, max = 30) => [...new Set(str(v).split(/[,\n]/).map((s) => s.trim()).filter(Boolean))].slice(0, max);
const rows = (v: KitValue, max = 30) => str(v).split('\n').map((s) => s.trim()).filter(Boolean).slice(0, max);
const pairs = (v: KitValue, max = 12) =>
  rows(v, max)
    .map((l) => l.split(/\s*[=:|]\s*/))
    .filter((p) => p.length >= 2 && p[0] && p[1])
    .map((p) => [p[0], p.slice(1).join(' ')] as [string, string]);
function shuffle<T>(a: T[], rand: () => number): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
const at = <T extends Item>(it: T, x: number, y: number, w?: number, h?: number): T => ({ ...it, x, y, ...(w !== undefined ? { w } : {}), ...(h !== undefined ? { h } : {}) });
const title = (text: string, W: number, y = 44, color = '#7c5cf0'): Item => at(makeText({ text, size: 34, bold: true, font: 'kanit', color }), M, y, W - 2 * M);
const para = (text: string, x: number, y: number, w: number, over: Partial<TextItem> = {}): Item => at(makeText({ text, size: 20, align: 'left', ...over }), x, y, w);
const grid = (cells: string[][], over: Partial<TableItem> = {}): TableItem => {
  const t = makeTable(cells.length, cells[0].length, over);
  t.cells = cells;
  return t;
};
/** กล่องข้อความมีพื้น (รูปทรงมุมมน + ข้อความกึ่งกลาง) */
function node(text: string, cx: number, cy: number, w: number, h: number, fill: string, size = 22): Item[] {
  return [at(makeShape('round', { fill, stroke: INK, sw: 3 }), cx - w / 2, cy - h / 2, w, h), at(makeText({ text, size, bold: true }), cx - w / 2 + 8, cy - size * 0.72, w - 16)];
}
/** ลูกศรจากจุดหนึ่งไปอีกจุด (เส้นหมุนตามมุม) */
function arrow(x1: number, y1: number, x2: number, y2: number, color = INK): Item {
  const len = Math.max(20, Math.hypot(x2 - x1, y2 - y1));
  const rot = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return at(makeLine({ stroke: color, sw: 4, end: 'arrow', rot }), (x1 + x2) / 2 - len / 2, (y1 + y2) / 2 - 12, len, 24);
}
const nameLine = (W: number, y: number): Item => para('ชื่อ ..............................................  ชั้น ...........  เลขที่ ........', M, y, W - 2 * M, { size: 18 });

/* ------------------------------------------------------------------ เครื่องมือ */

export const KITS: Kit[] = [
  /* ---------------- ทุกวิชา */
  {
    id: 'header',
    subjects: ['all'],
    label: 'หัวใบงาน',
    note: 'ชื่อใบงาน วิชา ช่องชื่อ และช่องคะแนน',
    fields: [
      { k: 'title', label: 'ชื่อใบงาน', type: 'text', def: 'ใบงานที่ 1 เรื่อง ' },
      { k: 'sub', label: 'วิชา / ชั้น', type: 'text', def: 'วิชาคณิตศาสตร์ ชั้นประถมศึกษาปีที่ 3' },
      { k: 'score', label: 'คะแนนเต็ม', type: 'num', def: 10, min: 0, max: 100 },
    ],
    build: (v, W) => {
      const full = int(v.score, 0, 100);
      const items: Item[] = [
        at(makeText({ text: str(v.title) || 'ใบงาน', size: 34, bold: true, font: 'kanit', color: '#7c5cf0', align: 'left' }), M, 40, W - 2 * M - (full ? 150 : 0)),
        para(str(v.sub), M, 92, W - 2 * M - (full ? 150 : 0), { color: '#5b5285', size: 18 }),
        nameLine(W, 128),
        at(makeDeco('d-ornament', '#7c5cf0', '#ffd166'), M, 170, W - 2 * M, 30),
      ];
      if (full) items.push(...node(`คะแนน\n...... / ${full}`, W - M - 64, 78, 128, 78, '#fff3c4', 18));
      return { items };
    },
  },
  {
    id: 'mcq',
    subjects: ['all'],
    label: 'ข้อสอบปรนัย',
    note: 'ช่องคำถาม + ตัวเลือก จัดเรียงพอดีหน้า',
    fields: [
      { k: 'n', label: 'จำนวนข้อ', type: 'num', def: 5, min: 1, max: 15 },
      { k: 'k', label: 'ตัวเลือก', type: 'select', def: '4', options: [['3', '3 ตัวเลือก'], ['4', '4 ตัวเลือก'], ['5', '5 ตัวเลือก']] },
      { k: 'lang', label: 'ตัวอักษร', type: 'select', def: 'th', options: [['th', 'ก ข ค ง'], ['en', 'A B C D']] },
    ],
    build: (v, W, H) => {
      const n = int(v.n, 1, 15);
      const k = int(v.k, 3, 5);
      const heads = (v.lang === 'en' ? ['A', 'B', 'C', 'D', 'E'] : ['ก', 'ข', 'ค', 'ง', 'จ']).slice(0, k);
      const step = Math.min(150, (H - 150) / n);
      const items: Item[] = [title('จงเลือกคำตอบที่ถูกต้องที่สุด', W)];
      for (let i = 0; i < n; i++) {
        const y = 110 + i * step;
        items.push(para(`${i + 1}. ...............................................................................................`, M, y, W - 2 * M, { size: 20 }));
        const opts = heads.map((h) => `${h}. ........................`);
        items.push(para(k > 3 ? `${opts.slice(0, 2).join('        ')}\n${opts.slice(2).join('        ')}` : opts.join('        '), M + 30, y + 36, W - 2 * M - 30, { size: 18, lh: 1.7 }));
      }
      return { items };
    },
  },
  {
    id: 'truefalse',
    subjects: ['all'],
    label: 'ถูก / ผิด',
    note: 'วงเล็บหน้าข้อให้เขียนถูกหรือผิด',
    fields: [
      { k: 'n', label: 'จำนวนข้อ', type: 'num', def: 10, min: 1, max: 20 },
      { k: 'items', label: 'ข้อความ (บรรทัดละข้อ เว้นว่างได้)', type: 'text', def: '', rows: 3 },
    ],
    build: (v, W, H) => {
      const given = rows(v.items, 20);
      const n = Math.max(given.length, int(v.n, 1, 20));
      const lines = Array.from({ length: n }, (_, i) => `(          ) ${i + 1}. ${given[i] || '....................................................................................'}`);
      return { items: [title('ทำเครื่องหมาย ถูก หรือ ผิด หน้าข้อความ', W), para(lines.join('\n'), M, 110, W - 2 * M, { size: Math.min(22, (H - 160) / n / 2.1), lh: 2.1 })] };
    },
  },
  {
    id: 'matching',
    subjects: ['all', 'eng', 'thai', 'sci'],
    label: 'จับคู่',
    note: 'พิมพ์คู่ละบรรทัด เช่น cat = แมว ระบบสลับฝั่งขวาให้',
    fields: [{ k: 'pairs', label: 'คู่คำ (ซ้าย = ขวา)', type: 'text', def: 'cat = แมว\ndog = สุนัข\nbird = นก\nfish = ปลา\nlion = สิงโต', rows: 4 }],
    build: (v, W, H, rand) => {
      const ps = pairs(v.pairs, 10);
      if (!ps.length) return { items: [], warn: 'ใส่คู่คำอย่างน้อย 1 คู่ เช่น cat = แมว' };
      const right = shuffle(
        ps.map((p) => p[1]),
        rand
      );
      const step = Math.min(96, (H - 160) / ps.length);
      const bw = (W - 2 * M) * 0.36;
      const items: Item[] = [title('จับคู่ให้ถูกต้อง', W)];
      ps.forEach((p, i) => {
        const cy = 140 + i * step + step / 2;
        items.push(...node(`${i + 1}. ${p[0]}`, M + bw / 2, cy, bw, Math.min(64, step - 14), SOFT[i % SOFT.length], 20));
        items.push(...node(`${'กขคงจฉชซฌญ'[i]}. ${right[i]}`, W - M - bw / 2, cy, bw, Math.min(64, step - 14), SOFT[(i + 3) % SOFT.length], 20));
        items.push(at(makeShape('circle', { fill: INK }), M + bw + 14, cy - 7, 14, 14), at(makeShape('circle', { fill: INK }), W - M - bw - 28, cy - 7, 14, 14));
      });
      return { items };
    },
  },
  {
    id: 'fillblank',
    subjects: ['all', 'eng', 'thai', 'sci'],
    label: 'เติมคำในช่องว่าง',
    note: 'ใส่คำตอบใน [วงเล็บเหลี่ยม] ระบบเว้นช่องและทำกล่องคำให้',
    fields: [{ k: 'text', label: 'ประโยค (บรรทัดละข้อ)', type: 'text', def: 'I [like] apples.\nThe sun is [hot].\nพืชต้องการ[น้ำ]และแสงแดด', rows: 4 }],
    build: (v, W, H) => {
      const ss = rows(v.text, 20);
      const answers: string[] = [];
      const lines = ss.map((s, i) => `${i + 1}. ${s.replace(/\[([^\]]{1,40})\]/g, (_, w: string) => (answers.push(w.trim()), ' ______________ '))}`);
      const items: Item[] = [title('เติมคำในช่องว่างให้ถูกต้อง', W)];
      if (answers.length) items.push(...node(`กล่องคำ:  ${[...answers].sort().join('     ')}`, W / 2, 128, W - 2 * M, 54, '#fff3c4', 20));
      items.push(para(lines.join('\n'), M, 180, W - 2 * M, { size: Math.min(24, (H - 220) / Math.max(1, lines.length) / 2.2), lh: 2.2 }));
      return { items, warn: answers.length ? undefined : 'ยังไม่มีคำใน [ ] ระบบจะไม่เว้นช่องว่างให้' };
    },
  },
  {
    id: 'mindmap',
    subjects: ['all', 'sci', 'thai'],
    label: 'แผนผังความคิด',
    note: 'หัวข้อกลาง + กิ่งรอบๆ',
    fields: [
      { k: 'center', label: 'หัวข้อกลาง', type: 'text', def: 'สัตว์' },
      { k: 'branches', label: 'กิ่ง (คั่นด้วยจุลภาค)', type: 'text', def: 'สัตว์บก, สัตว์น้ำ, สัตว์ปีก, สัตว์เลื้อยคลาน, แมลง', rows: 2 },
    ],
    build: (v, W, H) => {
      const bs = words(v.branches, 8);
      const n = Math.max(bs.length, 1);
      const cx = W / 2;
      const cy = H / 2;
      const rx = W / 2 - M - 90;
      const ry = Math.min(H / 2 - M - 60, rx * 1.1);
      const items: Item[] = [];
      bs.forEach((b, i) => {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const x = cx + rx * Math.cos(a);
        const y = cy + ry * Math.sin(a);
        items.push(at(makeLine({ stroke: '#9b8fd0', sw: 5, rot: (Math.atan2(y - cy, x - cx) * 180) / Math.PI }), (cx + x) / 2 - Math.hypot(x - cx, y - cy) / 2, (cy + y) / 2 - 12, Math.hypot(x - cx, y - cy), 24));
        items.push(...node(b, x, y, 170, 70, SOFT[i % SOFT.length], 20));
      });
      items.push(at(makeShape('cloud', { fill: '#ffd166', stroke: INK, sw: 3 }), cx - 130, cy - 80, 260, 160), at(makeText({ text: str(v.center) || 'หัวข้อ', size: 30, bold: true, font: 'kanit' }), cx - 110, cy - 22, 220));
      return { items };
    },
  },
  {
    id: 'venn',
    subjects: ['all', 'sci'],
    label: 'แผนภาพเวนน์',
    note: 'เปรียบเทียบสองสิ่ง ส่วนที่ซ้อน = เหมือนกัน',
    fields: [
      { k: 'a', label: 'ซ้าย', type: 'text', def: 'แมว' },
      { k: 'b', label: 'ขวา', type: 'text', def: 'สุนัข' },
    ],
    build: (v, W) => {
      const d = Math.min(W * 0.55, 480);
      const cx = W / 2;
      const y = 150;
      return {
        items: [
          title(`เปรียบเทียบ ${str(v.a)} กับ ${str(v.b)}`, W),
          at(makeShape('circle', { fill: '#7cc6ff', stroke: INK, sw: 3, opacity: 0.45 }), cx - d * 0.78, y, d, d),
          at(makeShape('circle', { fill: '#ff8fab', stroke: INK, sw: 3, opacity: 0.45 }), cx - d * 0.22, y, d, d),
          at(makeText({ text: str(v.a), size: 28, bold: true, font: 'kanit' }), cx - d * 0.78 + 20, y + 40, d * 0.5),
          at(makeText({ text: str(v.b), size: 28, bold: true, font: 'kanit' }), cx + d * 0.28 - 20, y + 40, d * 0.5),
          at(makeText({ text: 'เหมือนกัน', size: 20, bold: true, color: '#5b5285' }), cx - 70, y + 40, 140),
        ],
      };
    },
  },
  {
    id: 'kwl',
    subjects: ['all'],
    label: 'ตาราง KWL',
    note: 'รู้อะไรแล้ว / อยากรู้อะไร / ได้เรียนรู้อะไร',
    fields: [{ k: 'topic', label: 'หัวข้อ', type: 'text', def: 'เรื่อง ระบบสุริยะ' }],
    build: (v, W, H) => {
      const t = grid([['K รู้อะไรแล้ว', 'W อยากรู้อะไร', 'L ได้เรียนรู้อะไร'], ...Array.from({ length: 9 }, () => ['', '', ''])], { head: '#ede7ff', size: 20 });
      return { items: [title(`ตาราง KWL ${str(v.topic)}`, W), nameLine(W, 96), at(t, M, 140, W - 2 * M, Math.min(H - 200, 640))] };
    },
  },
  {
    id: 'rubric',
    subjects: ['all'],
    label: 'เกณฑ์การให้คะแนน',
    note: 'ตาราง Rubric 4 ระดับ',
    fields: [{ k: 'items', label: 'หัวข้อประเมิน (บรรทัดละหัวข้อ)', type: 'text', def: 'ความถูกต้องของเนื้อหา\nความสวยงาม\nความคิดสร้างสรรค์\nการส่งงานตรงเวลา', rows: 4 }],
    build: (v, W) => {
      const its = rows(v.items, 12);
      const t = grid([['หัวข้อ', '4 ดีมาก', '3 ดี', '2 พอใช้', '1 ปรับปรุง'], ...(its.length ? its : ['']).map((x) => [x, '', '', '', ''])], { size: 18 });
      return { items: [title('เกณฑ์การให้คะแนน', W), at(t, M, 110, W - 2 * M, (t.cells.length) * 64)] };
    },
  },
  {
    id: 'timetable',
    subjects: ['all'],
    label: 'ตารางเรียน',
    note: 'วันจันทร์-ศุกร์ ตามจำนวนคาบ',
    fields: [{ k: 'n', label: 'จำนวนคาบ', type: 'num', def: 6, min: 3, max: 10 }],
    build: (v, W) => {
      const n = int(v.n, 3, 10);
      const t = grid([['วัน / คาบ', ...Array.from({ length: n }, (_, i) => String(i + 1))], ...['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'].map((d) => [d, ...Array(n).fill('')])], { size: 18, head: '#dff4ff' });
      return { items: [title('ตารางเรียน', W), at(t, M, 110, W - 2 * M, 6 * 80)] };
    },
  },
  {
    id: 'reward',
    subjects: ['all'],
    label: 'ตารางสะสมดาว',
    note: 'ให้ดาว/สติกเกอร์ทุกครั้งที่ทำดี',
    fields: [
      { k: 'n', label: 'จำนวนนักเรียน', type: 'num', def: 10, min: 1, max: 25 },
      { k: 'c', label: 'จำนวนช่อง', type: 'num', def: 8, min: 3, max: 11 },
    ],
    build: (v, W, H) => {
      const n = int(v.n, 1, 25);
      const c = int(v.c, 3, 11);
      const t = grid([['ชื่อ', ...Array.from({ length: c }, (_, i) => String(i + 1))], ...Array.from({ length: n }, () => Array(c + 1).fill(''))], { size: 16, head: '#fff3c4' });
      return { items: [title('ตารางสะสมดาวเด็กดี', W, 44, '#e07a12'), at(t, M, 110, W - 2 * M, Math.min(H - 160, (n + 1) * 48))] };
    },
  },
  {
    id: 'flashcards',
    subjects: ['all', 'eng', 'thai'],
    label: 'บัตรคำ',
    note: 'บัตรคำขอบเส้นประ พิมพ์แล้วตัดได้เลย',
    fields: [
      { k: 'words', label: 'คำ (คั่นด้วยจุลภาค)', type: 'text', def: 'apple, banana, cat, dog, egg, fish', rows: 2 },
      { k: 'cols', label: 'จำนวนคอลัมน์', type: 'select', def: '2', options: [['1', '1'], ['2', '2'], ['3', '3']] },
    ],
    build: (v, W, H) => {
      const ws = words(v.words, 24);
      if (!ws.length) return { items: [], warn: 'ใส่คำอย่างน้อย 1 คำ' };
      const cols = int(v.cols, 1, 3);
      const r = Math.ceil(ws.length / cols);
      const cw = (W - 2 * M) / cols;
      const ch = Math.min(220, (H - 2 * M) / r);
      const items: Item[] = [];
      ws.forEach((w, i) => {
        const x = M + (i % cols) * cw;
        const y = M + Math.floor(i / cols) * ch;
        items.push(at(makeShape('round', { fill: SOFT[i % SOFT.length], stroke: '#9b8fd0', sw: 2, dash: 'dash' }), x + 6, y + 6, cw - 12, ch - 12));
        const size = Math.min(64, ch * 0.32, (cw / Math.max(3, w.length)) * 1.4);
        items.push(at(makeText({ text: w, size, bold: true, font: 'kanit' }), x + 16, y + ch / 2 - size * 0.7, cw - 32));
      });
      return { items };
    },
  },
  {
    id: 'wordsearch',
    subjects: ['thai', 'eng', 'all'],
    label: 'ตารางค้นหาคำ',
    note: 'ใช้ได้ทั้งคำไทยและอังกฤษ',
    fields: [
      { k: 'words', label: 'คำศัพท์ (คั่นด้วยจุลภาค)', type: 'text', def: 'CAT, DOG, BIRD, FISH, LION', rows: 2 },
      { k: 'size', label: 'ขนาด', type: 'select', def: '10', options: [['8', '8 x 8'], ['10', '10 x 10'], ['12', '12 x 12'], ['14', '14 x 14']] },
      { k: 'hard', label: 'ยาก (ย้อนกลับ/ทแยงทุกทิศ)', type: 'check', def: false },
    ],
    build: (v, W, H, rand) => {
      const size = int(v.size, 8, 14);
      const ws = wordSearch(words(v.words, 20), size, !!v.hard, rand);
      const side = Math.min(W - 80, H * 0.55, size * 46);
      const t = grid(ws.grid, { head: '', size: Math.round((side / size) * 0.5), sw: 1.5, stroke: '#9b8fd0' });
      const x = (W - side) / 2;
      return {
        items: [title('ค้นหาคำศัพท์', W), at(t, x, 130, side, side), para('คำที่ต้องหา: ' + ws.placed.join('   '), x, 150 + side, side)],
        warn: ws.skipped.length ? 'ใส่ไม่ได้ (ยาวเกินตาราง): ' + ws.skipped.join(', ') : undefined,
      };
    },
  },
  {
    id: 'scramble',
    subjects: ['thai', 'eng'],
    label: 'เรียงตัวอักษรให้เป็นคำ',
    note: 'สลับตัวอักษรของคำให้เด็กเรียงใหม่',
    fields: [{ k: 'words', label: 'คำ (คั่นด้วยจุลภาค)', type: 'text', def: 'apple, school, teacher, pencil', rows: 2 }],
    build: (v, W, H, rand) => {
      const ws = words(v.words, 15);
      const lines = ws.map((w, i) => `${i + 1}.   ${scrambleWord(w, rand).join(' / ')}     →   ______________________`);
      return { items: [title('เรียงตัวอักษรให้เป็นคำที่ถูกต้อง', W), para(lines.join('\n'), M, 110, W - 2 * M, { size: Math.min(24, (H - 160) / Math.max(1, lines.length) / 2.2), lh: 2.2 })] };
    },
  },
  {
    id: 'vocab',
    subjects: ['eng', 'thai'],
    label: 'ตารางคำศัพท์',
    note: 'คำศัพท์ = ความหมาย หรือเว้นความหมายให้เด็กเติม',
    fields: [
      { k: 'pairs', label: 'คำศัพท์ = ความหมาย (บรรทัดละคำ)', type: 'text', def: 'red = สีแดง\nblue = สีน้ำเงิน\ngreen = สีเขียว', rows: 4 },
      { k: 'blank', label: 'เว้นช่องความหมายให้เติม', type: 'check', def: false },
    ],
    build: (v, W) => {
      const ps = pairs(v.pairs, 25);
      const list = ps.length ? ps : words(v.pairs, 25).map((w) => [w, ''] as [string, string]);
      const t = grid([['ที่', 'คำศัพท์', 'ความหมาย'], ...list.map((p, i) => [String(i + 1), p[0], v.blank ? '' : p[1]])], { size: 20 });
      return { items: [title('คำศัพท์น่ารู้', W), at(t, M, 110, W - 2 * M, t.cells.length * 50)] };
    },
  },
  {
    id: 'tracing',
    subjects: ['thai', 'eng'],
    label: 'ฝึกคัดลายมือ',
    note: 'ตัวอย่างสีเข้ม 1 ครั้ง ตามด้วยตัวจางให้ลากตาม',
    fields: [
      { k: 'words', label: 'คำ (คั่นด้วยจุลภาค)', type: 'text', def: 'แม่, พ่อ, ครู, Apple', rows: 2 },
      { k: 'font', label: 'ตัวอักษร', type: 'select', def: 'sarabun', options: [['sarabun', 'สารบรรณ'], ['itim', 'ลายมือ'], ['mali', 'กลมมน'], ['prompt', 'หัวกลม']] },
    ],
    build: (v, W, H) => {
      const ws = words(v.words, 10);
      const font = (['sarabun', 'itim', 'mali', 'prompt'].includes(str(v.font)) ? v.font : 'sarabun') as TextItem['font'];
      const step = Math.min(130, (H - 160) / Math.max(1, ws.length));
      const size = Math.min(48, step * 0.42);
      const items: Item[] = [title('ฝึกคัดลายมือ', W), nameLine(W, 92)];
      ws.forEach((w, i) => {
        const y = 140 + i * step;
        items.push(at(makeWrite('lines', { gap: step * 0.62, stroke: '#c9c2ea' }), M, y, W - 2 * M, step * 0.62));
        const reps = Math.max(1, Math.floor((W - 2 * M - 40) / ((w.length + 2) * size * 0.62)) - 1);
        items.push(at(makeText({ text: w, size, font, align: 'left', color: INK, bold: true }), M, y + step * 0.62 - size * 1.3, (W - 2 * M) * 0.3));
        items.push(at(makeText({ text: Array(reps).fill(w).join('    '), size, font, align: 'left', color: '#c9c2ea' }), M + (W - 2 * M) * 0.3, y + step * 0.62 - size * 1.3, (W - 2 * M) * 0.7));
      });
      return { items };
    },
  },
  {
    id: 'consonants',
    subjects: ['thai'],
    label: 'ตารางพยัญชนะ ก-ฮ',
    note: 'พยัญชนะ 44 ตัว พร้อมชื่อเรียก หรือเว้นให้เติม',
    fields: [{ k: 'mode', label: 'แบบ', type: 'select', def: 'full', options: [['full', 'ตัวอักษร + ชื่อ'], ['letter', 'ตัวอักษรอย่างเดียว'], ['blank', 'เว้นบางช่องให้เติม']] }],
    build: (v, W, H, rand) => {
      const cols = 6;
      const cells = THAI_CONSONANTS.map((c) => (v.mode === 'letter' ? c.split(' ')[0] : v.mode === 'blank' && rand() < 0.35 ? '' : c));
      while (cells.length % cols) cells.push('');
      const t = grid(
        Array.from({ length: cells.length / cols }, (_, r) => cells.slice(r * cols, r * cols + cols)),
        { head: '', size: v.mode === 'letter' ? 40 : 22, font: 'sarabun' }
      );
      return { items: [title('พยัญชนะไทย ก - ฮ', W, 44, '#e8456b'), at(t, M, 110, W - 2 * M, Math.min(H - 150, 8 * 110))] };
    },
  },
  {
    id: 'spelling',
    subjects: ['thai'],
    label: 'แจกลูกสะกดคำ',
    note: 'แยกพยัญชนะต้น สระ ตัวสะกด วรรณยุกต์',
    fields: [{ k: 'words', label: 'คำ (คั่นด้วยจุลภาค)', type: 'text', def: 'กิน, นอน, เดิน, ม้า, บ้าน', rows: 2 }],
    build: (v, W) => {
      const ws = words(v.words, 15);
      const t = grid([['คำ', 'พยัญชนะต้น', 'สระ', 'ตัวสะกด', 'วรรณยุกต์'], ...(ws.length ? ws : ['']).map((w) => [w, '', '', '', ''])], { size: 20, head: '#ffe4ec' });
      return { items: [title('แจกลูกสะกดคำ', W, 44, '#e8456b'), nameLine(W, 92), at(t, M, 140, W - 2 * M, t.cells.length * 56)] };
    },
  },
  {
    id: 'sentence',
    subjects: ['thai', 'eng'],
    label: 'แต่งประโยคจากคำ',
    note: 'คำละ 2 บรรทัดให้เด็กเขียน',
    fields: [{ k: 'words', label: 'คำ (คั่นด้วยจุลภาค)', type: 'text', def: 'โรงเรียน, เพื่อน, ขยัน', rows: 2 }],
    build: (v, W, H) => {
      const ws = words(v.words, 8);
      const step = Math.min(170, (H - 160) / Math.max(1, ws.length));
      const items: Item[] = [title('แต่งประโยคจากคำที่กำหนด', W)];
      ws.forEach((w, i) => {
        const y = 110 + i * step;
        items.push(para(`${i + 1}. คำว่า  "${w}"`, M, y, W - 2 * M, { size: 22, bold: true }));
        items.push(at(makeWrite('lines', { gap: Math.min(48, step * 0.32) }), M + 20, y + 36, W - 2 * M - 20, Math.min(96, step * 0.64)));
      });
      return { items };
    },
  },
  {
    id: 'abc',
    subjects: ['eng'],
    label: 'ตาราง ABC',
    note: 'ตัวพิมพ์ใหญ่-เล็ก พร้อมคำศัพท์ (เลือกได้)',
    fields: [{ k: 'withWords', label: 'ใส่คำศัพท์ด้วย', type: 'check', def: true }],
    build: (v, W, H) => {
      const cols = 5;
      const cells = ABC_WORDS.map((w, i) => {
        const L = String.fromCharCode(65 + i);
        return v.withWords ? `${L}${L.toLowerCase()}  ${w}` : `${L} ${L.toLowerCase()}`;
      });
      while (cells.length % cols) cells.push('');
      const t = grid(
        Array.from({ length: cells.length / cols }, (_, r) => cells.slice(r * cols, r * cols + cols)),
        { head: '', size: v.withWords ? 18 : 34, font: 'kanit' }
      );
      return { items: [title('A B C', W, 44, '#2a73d9'), at(t, M, 110, W - 2 * M, Math.min(H - 150, 6 * 120))] };
    },
  },

  /* ---------------- คณิตศาสตร์ */
  {
    id: 'arith',
    subjects: ['math'],
    label: 'โจทย์เลขสุ่ม',
    note: 'บวก ลบ คูณ หาร สุ่มใหม่ได้ทุกครั้ง พร้อมเฉลยท้ายหน้า',
    fields: [
      { k: 'op', label: 'การคำนวณ', type: 'select', def: '+', options: [['+', 'บวก'], ['-', 'ลบ'], ['x', 'คูณ'], ['/', 'หาร'], ['mix', 'คละ']] },
      { k: 'digits', label: 'จำนวนหลัก', type: 'select', def: '2', options: [['1', '1 หลัก'], ['2', '2 หลัก'], ['3', '3 หลัก'], ['4', '4 หลัก']] },
      { k: 'n', label: 'จำนวนข้อ', type: 'num', def: 20, min: 4, max: 40 },
      { k: 'layout', label: 'รูปแบบ', type: 'select', def: 'col', options: [['col', 'ตั้งหลัก'], ['row', 'แนวนอน']] },
      { k: 'key', label: 'ใส่เฉลยท้ายหน้า', type: 'check', def: true },
    ],
    build: (v, W, H, rand) => {
      const ps = arithProblems(str(v.op), int(v.digits, 1, 4), int(v.n, 4, 40), rand);
      const items: Item[] = [title('ฝึกคิดเลข', W, 40, '#e07a12'), nameLine(W, 88)];
      if (v.layout === 'row') {
        const half = Math.ceil(ps.length / 2);
        const col = (from: number, to: number) => ps.slice(from, to).map((p, i) => `${from + i + 1})  ${p.a} ${p.sym} ${p.b} = ________`).join('\n');
        const size = Math.min(26, (H - 220) / half / 2.1);
        items.push(para(col(0, half), M, 140, (W - 2 * M) / 2, { size, lh: 2.1 }), para(col(half, ps.length), W / 2, 140, (W - 2 * M) / 2, { size, lh: 2.1 }));
      } else {
        const cols = int(v.digits, 1, 4) >= 3 ? 4 : 5;
        const cw = (W - 2 * M) / cols;
        const rowH = Math.min(150, (H - 230) / Math.ceil(ps.length / cols));
        const size = Math.min(28, rowH * 0.2, cw * 0.16);
        ps.forEach((p, i) => {
          const x = M + (i % cols) * cw;
          const y = 140 + Math.floor(i / cols) * rowH;
          items.push(para(`${i + 1})`, x, y, 40, { size: size * 0.7, color: '#9b8fd0' }));
          items.push(at(makeText({ text: `${p.a}\n${p.sym}  ${p.b}`, size, align: 'right', lh: 1.25 }), x + 20, y, cw * 0.62));
          items.push(at(makeLine({ sw: 2.5 }), x + 24, y + size * 2.7, cw * 0.6, 12));
        });
      }
      if (v.key) items.push(para('เฉลย  ' + ps.map((p, i) => `${i + 1}) ${p.ans}`).join('   '), M, H - 80, W - 2 * M, { size: 12, color: '#9b8fd0' }));
      return { items };
    },
  },
  {
    id: 'times',
    subjects: ['math'],
    label: 'ตารางสูตรคูณ',
    note: 'เว้นคำตอบให้เติม หรือใส่ไว้เป็นเฉลย',
    fields: [
      { k: 'n', label: 'แม่', type: 'num', def: 2, min: 2, max: 25 },
      { k: 'show', label: 'ใส่คำตอบ', type: 'check', def: false },
    ],
    build: (v, W) => {
      const n = int(v.n, 2, 25);
      const t = grid(timesTable(n, 12, !!v.show), { head: '', size: 24, align: 'left' });
      return { items: [title(`สูตรคูณแม่ ${n}`, W, 50, '#e07a12'), at(t, (W - 360) / 2, 130, 360, 12 * 52)] };
    },
  },
  {
    id: 'compare',
    subjects: ['math'],
    label: 'เปรียบเทียบจำนวน',
    note: 'เติม > < หรือ = ลงในวงกลม',
    fields: [
      { k: 'digits', label: 'จำนวนหลัก', type: 'select', def: '2', options: [['1', '1 หลัก'], ['2', '2 หลัก'], ['3', '3 หลัก'], ['4', '4 หลัก']] },
      { k: 'n', label: 'จำนวนข้อ', type: 'num', def: 12, min: 4, max: 24 },
    ],
    build: (v, W, H, rand) => {
      const d = int(v.digits, 1, 4);
      const lo = d === 1 ? 0 : 10 ** (d - 1);
      const hi = 10 ** d - 1;
      const n = int(v.n, 4, 24);
      const r = () => lo + Math.floor(rand() * (hi - lo + 1));
      const lines = Array.from({ length: n }, (_, i) => {
        const a = r();
        const b = rand() < 0.15 ? a : r();
        return `${i + 1})   ${a}   ◯   ${b}`;
      });
      const half = Math.ceil(n / 2);
      const size = Math.min(28, (H - 200) / half / 2.2);
      return {
        items: [
          title('เปรียบเทียบจำนวน  เติม >  <  หรือ  =', W, 44, '#e07a12'),
          para(lines.slice(0, half).join('\n'), M, 120, (W - 2 * M) / 2, { size, lh: 2.2 }),
          para(lines.slice(half).join('\n'), W / 2, 120, (W - 2 * M) / 2, { size, lh: 2.2 }),
        ],
      };
    },
  },
  {
    id: 'placevalue',
    subjects: ['math'],
    label: 'ตารางหลักและค่าประจำหลัก',
    note: 'สุ่มจำนวนหรือพิมพ์เอง',
    fields: [
      { k: 'nums', label: 'จำนวน (เว้นว่าง = สุ่ม)', type: 'text', def: '' },
      { k: 'n', label: 'จำนวนข้อ (ถ้าสุ่ม)', type: 'num', def: 8, min: 1, max: 15 },
      { k: 'show', label: 'ใส่คำตอบ', type: 'check', def: false },
    ],
    build: (v, W, _H, rand) => {
      const given = words(v.nums, 15).map((x) => int(x.replace(/\D/g, ''), 0, 9999));
      const list = given.length ? given : Array.from({ length: int(v.n, 1, 15) }, () => 10 + Math.floor(rand() * 9990));
      const digit = (x: number, p: number) => String(Math.floor(x / p) % 10);
      const t = grid([['จำนวน', 'หลักพัน', 'หลักร้อย', 'หลักสิบ', 'หลักหน่วย'], ...list.map((x) => [String(x), ...(v.show ? [1000, 100, 10, 1].map((p) => digit(x, p)) : ['', '', '', ''])])], { size: 22 });
      return { items: [title('หลักและค่าประจำหลัก', W, 44, '#e07a12'), at(t, M, 120, W - 2 * M, t.cells.length * 56)] };
    },
  },
  {
    id: 'fractions',
    subjects: ['math'],
    label: 'ระบายสีเศษส่วน',
    note: 'วงกลมแบ่งส่วน ให้เขียนเศษส่วนที่ระบาย',
    fields: [{ k: 'n', label: 'จำนวนข้อ', type: 'num', def: 6, min: 2, max: 12 }],
    build: (v, W, H, rand) => {
      const n = int(v.n, 2, 12);
      const cols = 3;
      const cw = (W - 2 * M) / cols;
      const rh = Math.min(260, (H - 140) / Math.ceil(n / cols));
      const s = Math.min(cw * 0.6, rh * 0.62);
      const items: Item[] = [title('เขียนเศษส่วนของส่วนที่ระบายสี', W, 44, '#e07a12')];
      for (let i = 0; i < n; i++) {
        const parts = 2 + Math.floor(rand() * 7);
        const e = makeEdu('pie');
        e.a = parts;
        e.b = 1 + Math.floor(rand() * parts);
        const x = M + (i % cols) * cw;
        const y = 110 + Math.floor(i / cols) * rh;
        items.push(at(e, x + (cw - s) / 2, y, s, s), para(`${i + 1})  ______`, x, y + s + 8, cw, { align: 'center', size: 20 }));
      }
      return { items };
    },
  },
  {
    id: 'clocks',
    subjects: ['math'],
    label: 'อ่านเวลา',
    note: 'นาฬิกาสุ่มเวลา ให้เขียนเวลา',
    fields: [
      { k: 'n', label: 'จำนวนข้อ', type: 'num', def: 6, min: 2, max: 12 },
      { k: 'step', label: 'นาที', type: 'select', def: '15', options: [['60', 'ตรงชั่วโมง'], ['30', 'ครึ่งชั่วโมง'], ['15', 'ทุก 15 นาที'], ['5', 'ทุก 5 นาที']] },
    ],
    build: (v, W, H, rand) => {
      const n = int(v.n, 2, 12);
      const st = int(v.step, 5, 60);
      const cols = 3;
      const cw = (W - 2 * M) / cols;
      const rh = Math.min(280, (H - 140) / Math.ceil(n / cols));
      const s = Math.min(cw * 0.66, rh * 0.68);
      const items: Item[] = [title('นาฬิกาบอกเวลาเท่าไร', W, 44, '#e07a12')];
      for (let i = 0; i < n; i++) {
        const e = makeEdu('clock');
        e.a = 1 + Math.floor(rand() * 12);
        e.b = st >= 60 ? 0 : Math.floor(rand() * (60 / st)) * st;
        const x = M + (i % cols) * cw;
        const y = 110 + Math.floor(i / cols) * rh;
        items.push(at(e, x + (cw - s) / 2, y, s, s), para(`${i + 1})  ____ : ____ น.`, x, y + s + 8, cw, { align: 'center', size: 20 }));
      }
      return { items };
    },
  },
  {
    id: 'answersheet',
    subjects: ['all'],
    label: 'กระดาษคำตอบแบบฝน',
    note: 'สูงสุด 60 ข้อ แบ่งเป็นตารางละ 20 ข้อ',
    fields: [
      { k: 'n', label: 'จำนวนข้อ', type: 'num', def: 20, min: 1, max: 60 },
      { k: 'k', label: 'ตัวเลือก', type: 'select', def: '4', options: [['3', '3 ตัวเลือก'], ['4', '4 ตัวเลือก'], ['5', '5 ตัวเลือก']] },
      { k: 'lang', label: 'ตัวอักษร', type: 'select', def: 'th', options: [['th', 'ก ข ค ง'], ['en', 'A B C D']] },
    ],
    build: (v, W) => {
      const tables = answerSheet(int(v.n, 1, 60), int(v.k, 3, 5), v.lang === 'en' ? 'en' : 'th');
      const cols = tables.length;
      const tw = Math.min(300, (W - 80 - (cols - 1) * 24) / cols);
      const items: Item[] = [title('กระดาษคำตอบ', W, 50, INK), nameLine(W, 96)];
      tables.forEach((cells, i) => items.push(at(grid(cells, { size: 18, head: '#ede7ff' }), (W - (tw * cols + 24 * (cols - 1))) / 2 + i * (tw + 24), 140, tw, cells.length * 36)));
      return { items };
    },
  },

  /* ---------------- วิทยาศาสตร์ */
  {
    id: 'lifecycle',
    subjects: ['sci'],
    label: 'วัฏจักร',
    note: 'ขั้นตอนเรียงเป็นวงกลมพร้อมลูกศร',
    fields: [
      { k: 'title', label: 'ชื่อวัฏจักร', type: 'text', def: 'วัฏจักรชีวิตของผีเสื้อ' },
      { k: 'stages', label: 'ขั้นตอน (คั่นด้วยจุลภาค)', type: 'text', def: 'ไข่, หนอน, ดักแด้, ผีเสื้อ', rows: 2 },
    ],
    build: (v, W, H) => {
      const ss = words(v.stages, 8);
      const n = Math.max(ss.length, 2);
      const cx = W / 2;
      const cy = Math.min(H / 2, 140 + (W / 2 - M));
      const R = Math.min(W / 2 - M - 90, H / 2 - 160);
      const items: Item[] = [title(str(v.title) || 'วัฏจักร', W, 44, '#2f9e6e')];
      const pt = (i: number): [number, number] => {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
      };
      ss.forEach((s, i) => {
        const [x, y] = pt(i);
        const [x2, y2] = pt(i + 1);
        const k = 0.36;
        items.push(arrow(x + (x2 - x) * k, y + (y2 - y) * k, x + (x2 - x) * (1 - k), y + (y2 - y) * (1 - k), '#2f9e6e'));
        items.push(...node(s, x, y, 170, 80, SOFT[i % SOFT.length], 22));
      });
      return { items };
    },
  },
  {
    id: 'foodchain',
    subjects: ['sci'],
    label: 'ห่วงโซ่อาหาร / ลำดับขั้น',
    note: 'กล่องเรียงต่อกันด้วยลูกศร',
    fields: [{ k: 'stages', label: 'ลำดับ (คั่นด้วยจุลภาค)', type: 'text', def: 'หญ้า, ตั๊กแตน, กบ, งู, เหยี่ยว', rows: 2 }],
    build: (v, W) => {
      const ss = words(v.stages, 10);
      const per = Math.min(4, Math.max(1, ss.length));
      const bw = (W - 2 * M - (per - 1) * 50) / per;
      const items: Item[] = [title('ห่วงโซ่อาหาร', W, 44, '#2f9e6e')];
      ss.forEach((s, i) => {
        const r = Math.floor(i / per);
        const c = i % per;
        const x = M + c * (bw + 50) + bw / 2;
        const y = 170 + r * 150;
        items.push(...node(s, x, y, bw, 84, SOFT[i % SOFT.length], 22));
        if (i < ss.length - 1) items.push(c === per - 1 ? arrow(x, y + 46, M + bw / 2, y + 104, '#2f9e6e') : arrow(x + bw / 2 + 4, y, x + bw / 2 + 46, y, '#2f9e6e'));
      });
      return { items };
    },
  },
  {
    id: 'experiment',
    subjects: ['sci'],
    label: 'บันทึกการทดลอง',
    note: 'หัวข้อครบตามกระบวนการทางวิทยาศาสตร์',
    fields: [{ k: 'title', label: 'ชื่อการทดลอง', type: 'text', def: 'การทดลองเรื่อง ' }],
    build: (v, W, H) => {
      const heads = ['ปัญหา', 'สมมติฐาน', 'ตัวแปรต้น', 'ตัวแปรตาม', 'ตัวแปรควบคุม', 'อุปกรณ์', 'วิธีการทดลอง', 'ผลการทดลอง', 'สรุปผล'];
      const step = (H - 170) / heads.length;
      const items: Item[] = [title(str(v.title) || 'บันทึกการทดลอง', W, 40, '#2f9e6e'), nameLine(W, 88)];
      heads.forEach((h, i) => {
        const y = 130 + i * step;
        items.push(para(h, M, y, 220, { size: 20, bold: true, color: '#2f9e6e' }));
        items.push(at(makeWrite('dotted', { gap: Math.min(40, step / 2) }), M, y + 30, W - 2 * M, Math.max(28, step - 36)));
      });
      return { items };
    },
  },
  {
    id: 'observe',
    subjects: ['sci', 'all'],
    label: 'ตารางบันทึกผล',
    note: 'ตั้งชื่อคอลัมน์เองได้',
    fields: [
      { k: 'cols', label: 'คอลัมน์ (คั่นด้วยจุลภาค)', type: 'text', def: 'วันที่, สิ่งที่สังเกต, ผลที่ได้' },
      { k: 'n', label: 'จำนวนแถว', type: 'num', def: 8, min: 1, max: 25 },
    ],
    build: (v, W) => {
      const cs = words(v.cols, 8);
      const head = cs.length ? cs : ['วันที่', 'สิ่งที่สังเกต', 'ผลที่ได้'];
      const n = int(v.n, 1, 25);
      const t = grid([head, ...Array.from({ length: n }, () => Array(head.length).fill(''))], { size: 18, head: '#dcfce7' });
      return { items: [title('ตารางบันทึกผลการสังเกต', W, 44, '#2f9e6e'), at(t, M, 110, W - 2 * M, (n + 1) * 52)] };
    },
  },
  {
    id: 'classify',
    subjects: ['sci', 'all'],
    label: 'จำแนกประเภท',
    note: 'กล่องคำด้านบน ให้เขียนลงกลุ่มที่ถูกต้อง',
    fields: [
      { k: 'groups', label: 'กลุ่ม (คั่นด้วยจุลภาค)', type: 'text', def: 'สิ่งมีชีวิต, สิ่งไม่มีชีวิต' },
      { k: 'words', label: 'คำที่ต้องจำแนก', type: 'text', def: 'แมว, ก้อนหิน, ต้นไม้, ดินสอ, ปลา, โต๊ะ', rows: 2 },
    ],
    build: (v, W, _H, rand) => {
      const gs = words(v.groups, 4);
      const ws = shuffle(words(v.words, 20), rand);
      const head = gs.length ? gs : ['กลุ่มที่ 1', 'กลุ่มที่ 2'];
      const n = Math.max(4, Math.ceil(ws.length / head.length) + 1);
      const t = grid([head, ...Array.from({ length: n }, () => Array(head.length).fill(''))], { size: 20, head: '#dcfce7' });
      return {
        items: [title('จำแนกให้ถูกกลุ่ม', W, 44, '#2f9e6e'), ...node(ws.join('     '), W / 2, 140, W - 2 * M, 70, '#fff3c4', 20), at(t, M, 200, W - 2 * M, (n + 1) * 56)],
      };
    },
  },
  {
    id: 'labels',
    subjects: ['sci'],
    label: 'ป้ายชี้ส่วนประกอบ',
    note: 'ช่องวางรูปตรงกลาง + ป้ายชี้รอบๆ (เว้นว่างให้เติมได้)',
    fields: [
      { k: 'title', label: 'ชื่อภาพ', type: 'text', def: 'ส่วนประกอบของพืช' },
      { k: 'parts', label: 'ป้าย (คั่นด้วยจุลภาค เว้นว่าง = ช่องเปล่า)', type: 'text', def: 'ดอก, ใบ, ลำต้น, ราก', rows: 2 },
      { k: 'blank', label: 'ให้เด็กเติมชื่อเอง', type: 'check', def: false },
    ],
    build: (v, W, H) => {
      const ps = words(v.parts, 8);
      const n = Math.max(ps.length, 4);
      const box = Math.min(W - 2 * M - 360, H - 300);
      const bx = (W - box) / 2;
      const by = 130;
      const items: Item[] = [
        title(str(v.title) || 'ส่วนประกอบ', W, 44, '#2f9e6e'),
        at(makeShape('round', { fill: '#f7f5ff', stroke: '#9b8fd0', sw: 3, dash: 'dash' }), bx, by, box, box),
        at(makeText({ text: 'วางรูปที่นี่\n(อัปโหลด หรือสติกเกอร์)', size: 18, color: '#9b8fd0' }), bx + 20, by + box / 2 - 30, box - 40),
      ];
      for (let i = 0; i < n; i++) {
        const left = i % 2 === 0;
        const y = by + 40 + Math.floor(i / 2) * ((box - 80) / Math.max(1, Math.ceil(n / 2) - 1 || 1));
        const lx = left ? M + 75 : W - M - 75;
        items.push(arrow(left ? lx + 80 : lx - 80, y, left ? bx + box * 0.3 : bx + box * 0.7, y, '#2f9e6e'));
        items.push(...node(v.blank ? '.................' : ps[i] || '.................', lx, y, 150, 56, SOFT[i % SOFT.length], 20));
      }
      return { items };
    },
  },
];

export const kitDefaults = (k: Kit): Record<string, KitValue> => Object.fromEntries(k.fields.map((f) => [f.k, f.def]));
