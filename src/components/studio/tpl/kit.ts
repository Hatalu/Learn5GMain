import { blankBg, blankBorder, makeEdu, makeLine, makeShape, makeSticker, makeTable, makeText, makeWrite, SIZES, uid, type Design, type EduKind, type Item, type LineItem, type Page, type TableItem, type TextItem } from '@/lib/studio/doc';
import { defaultWordOpt } from '@/lib/studio/flow';

/** หมวดของแม่แบบ (ลำดับนี้ = ลำดับปุ่มกรองและหัวข้อในหน้ารวม) */
export const TEMPLATE_CATS = [
  { id: 'sheet', label: 'ใบงานทั่วไป' },
  { id: 'test', label: 'แบบทดสอบ/ประเมิน' },
  { id: 'math', label: 'คณิตศาสตร์' },
  { id: 'thai', label: 'ภาษาไทย' },
  { id: 'eng', label: 'ภาษาอังกฤษ' },
  { id: 'sci', label: 'วิทยาศาสตร์' },
  { id: 'org', label: 'แผนผังความคิด' },
  { id: 'class', label: 'จัดการชั้นเรียน' },
  { id: 'card', label: 'บัตรคำ/การ์ด' },
  { id: 'decor', label: 'ป้าย/เกียรติบัตร' },
  { id: 'slide', label: 'สไลด์' },
] as const;
export type TemplateCat = (typeof TEMPLATE_CATS)[number]['id'];

/** แม่แบบเริ่มต้น: กดแล้วได้สื่อพร้อมแก้ต่อ (ทุกชิ้นแก้/ลบได้) */
export interface Template {
  id: string;
  label: string;
  note: string;
  cat: TemplateCat;
  sizeId: string;
  accent: string;
  make: () => Design;
}

export const at = <T extends Item>(it: T, x: number, y: number, w?: number, h?: number): T => ({ ...it, x, y, w: w ?? it.w, h: h ?? it.h });
export const page = (items: Item[], over: Partial<Page> = {}): Page => ({ id: uid(), bg: blankBg(), border: blankBorder(), items, ...over });
export const design = (sizeId: string, pages: Page[]): Design => {
  const s = SIZES.find((x) => x.id === sizeId) ?? SIZES[0];
  return { v: 1, size: { id: s.id, w: s.w, h: s.h }, pages, mode: 'canvas', flow: '', word: defaultWordOpt() };
};
export const nameLine = (y: number, w = 714, x = 40) =>
  at(makeText({ text: 'ชื่อ ........................................................  ชั้น ...............  เลขที่ ...........', size: 20, align: 'left', font: 'sarabun' }), x, y, w);

/** หัวกระดาษแถบสี: ป้ายเล็ก + ชื่อใหญ่ + สติกเกอร์มุมขวา */
export const header = (tag: string, title: string, fill: string, color: string, sticker: string, W = 794): Item[] => [
  at(makeShape('round', { fill, sw: 0 }), 40, 36, W - 80, 110),
  at(makeText({ text: tag, size: 22, color, bold: true, font: 'kanit', align: 'left' }), 64, 48, W - 260),
  at(makeText({ text: title, size: 38, bold: true, font: 'kanit', align: 'left' }), 64, 80, W - 260),
  at(makeSticker(sticker), W - 150, 26, 100, 100),
];
export const badge = (n: number | string, bg: string, x: number, y: number) => at(makeText({ text: String(n), size: 22, bold: true, color: '#ffffff', bg }), x, y, 52);
export const label = (text: string, color: string, y: number, x = 40, w = 714) => at(makeText({ text, size: 26, bold: true, color, font: 'kanit', align: 'left' }), x, y, w);
export const lines = (x: number, y: number, w: number, h: number, gap = 44) => at(makeWrite('lines', { gap }), x, y, w, h);

/** ข้อความชิดซ้าย */
export const txt = (text: string, size: number, x: number, y: number, w: number, over: Partial<TextItem> = {}) => at(makeText({ text, size, align: 'left', ...over }), x, y, w);
/** กล่องมุมมน */
export const box = (fill: string, stroke: string, x: number, y: number, w: number, h: number, dash: 'solid' | 'dash' | 'dot' = 'solid') =>
  at(makeShape('round', { fill, stroke: stroke || '#2a2350', sw: stroke ? 2.5 : 0, dash }), x, y, w, h);
export const sticker = (id: string, x: number, y: number, s = 100) => at(makeSticker(id), x, y, s, s);
export const edu = (kind: EduKind, x: number, y: number, w: number, h: number, a: number, b = 0, c = 0) => at({ ...makeEdu(kind), a, b, c }, x, y, w, h);
/** ตารางพร้อมข้อความ: rows[0] = หัวตาราง */
export const table = (rows: string[][], x: number, y: number, w: number, h: number, over: Partial<TableItem> = {}) => {
  const t = makeTable(rows.length, rows[0].length, over);
  t.cells = rows.map((r) => [...r]);
  return at(t, x, y, w, h);
};
/** ตารางเปล่า n แถว (มีหัว) */
export const blankRows = (head: string[], n: number, first?: (i: number) => string) => [head, ...Array.from({ length: n }, (_, i) => head.map((_, c) => (c === 0 && first ? first(i) : '')))];
/** เส้นจากจุดถึงจุด: เส้นแนวนอนหมุนรอบจุดกลาง */
export const lineBetween = (x1: number, y1: number, x2: number, y2: number, over: Partial<LineItem> = {}): LineItem => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  return { ...at(makeLine({ stroke: '#475569', sw: 3, ...over }), (x1 + x2) / 2 - len / 2, (y1 + y2) / 2 - 10, len, 20), rot: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI };
};
export const arrow = (x1: number, y1: number, x2: number, y2: number, stroke = '#475569') => lineBetween(x1, y1, x2, y2, { stroke, end: 'arrow' });
/** เส้นตัด (ประ) แนวนอน/ตั้ง สำหรับการ์ดที่ต้องตัดแยก */
export const cutH = (y: number, W: number) => at(makeLine({ stroke: '#94a3b8', sw: 1.5, dash: 'dash' }), 0, y - 10, W, 20);
export const cutV = (x: number, H: number) => lineBetween(x, 0, x, H, { stroke: '#94a3b8', sw: 1.5, dash: 'dash' });

/** แบบฝึกคิดเลข 20 ข้อ 2 คอลัมน์ */
export function drillItems(probs: string[], font: TextItem['font'] = 'prompt'): Item[] {
  const out: Item[] = probs.slice(0, 20).map((p, i) => txt(`${i + 1}.   ${p} = ________`, 28, i < 10 ? 60 : 430, 280 + (i % 10) * 80, 330, { font }));
  out.push(lineBetween(405, 270, 405, 1070, { stroke: '#cbd5e1', sw: 2, dash: 'dash' }));
  return out;
}
