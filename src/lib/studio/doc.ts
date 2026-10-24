/**
 * ระบบสร้างสื่อการสอน (Studio): โครงข้อมูลของสื่อ 1 ชิ้น = หลายหน้า แต่ละหน้ามีพื้นหลัง กรอบ และชิ้นงาน
 * หน่วยเป็นพิกเซลที่ 96 dpi (A4 = 794 x 1123) แปลงเป็น pt ตอนทำ PDF ด้วย x0.75
 * ข้อมูลทุกชิ้นผ่าน sanitizeDesign() ก่อนแสดงผลเสมอ (ทั้งของตัวเองและของคนอื่นใน Discover)
 */
import { mediaPrefix } from '@/lib/game-creator/prefix';
import { cleanGraph, type GraphSpec } from './graph';
import { cleanFlowHtml, cleanWordOpt, defaultWordOpt, type WordOpt } from './flow';
import { cleanLook, DEFAULT_LOOK, type CharLook } from './char';

export const MAX_PAGES = 30;
export const MAX_ITEMS = 300;
export const MAX_TEXT = 4000;

export interface PageSize {
  id: string;
  label: string;
  note: string;
  w: number;
  h: number;
}

export const SIZES: PageSize[] = [
  { id: 'a4p', label: 'A4 แนวตั้ง', note: 'ใบงาน ใบความรู้', w: 794, h: 1123 },
  { id: 'a4l', label: 'A4 แนวนอน', note: 'เกียรติบัตร ป้าย', w: 1123, h: 794 },
  { id: 'a5p', label: 'A5 แนวตั้ง', note: 'การ์ดครึ่ง A4', w: 559, h: 794 },
  { id: 'a3p', label: 'A3 แนวตั้ง', note: 'โปสเตอร์ บอร์ด', w: 1123, h: 1587 },
  { id: 'a6p', label: 'แฟลชการ์ด A6', note: 'บัตรคำ', w: 397, h: 559 },
  { id: 'slide', label: 'สไลด์ 16:9', note: 'ฉายหน้าห้อง', w: 1280, h: 720 },
  { id: 'square', label: 'จัตุรัส', note: 'โพสต์โซเชียล', w: 1080, h: 1080 },
];
export const DEFAULT_SIZE = SIZES[0];
export const CUSTOM_MIN = 200;
export const CUSTOM_MAX = 2400;

export const FONT_IDS = ['sarabun', 'thsarabun', 'kanit', 'prompt', 'mitr', 'noto', 'itim', 'mali', 'sriracha', 'chonburi', 'charm', 'pattaya', 'chakra', 'angsana'] as const;
export type FontId = (typeof FONT_IDS)[number];

export type Dash = 'solid' | 'dash' | 'dot';
export type Cap = 'none' | 'arrow' | 'dot';
export type WriteKind = 'lines' | 'dotted' | 'four' | 'grid' | 'dots' | 'box';
export type Pattern = 'none' | 'dots' | 'grid' | 'lines' | 'stripes' | 'checks';
export const BORDER_IDS = ['none', 'line', 'double', 'dash', 'round', 'dots', 'stars', 'wave', 'corner', 'hearts', 'flowers', 'zigzag', 'stamp', 'checker', 'rainbow', 'bubbles', 'ribbon', 'leaves', 'scallop'] as const;
export type BorderStyle = (typeof BORDER_IDS)[number];
/** ของตกแต่ง: กรอบ (ใช้ลายเดียวกับกรอบหน้า) เส้นคั่น เทปตกแต่ง มุมประดับ */
export const DIVIDER_IDS = ['d-dots', 'd-wave', 'd-zigzag', 'd-stars', 'd-hearts', 'd-ornament', 'd-scallop', 'd-flowers', 'd-arrows', 'd-stitch', 'd-vine', 'd-double'] as const;
export const TAPE_IDS = ['t-stripes', 't-dots', 't-grid', 't-plain'] as const;
export const CORNER_IDS = ['c-swirl', 'c-floral', 'c-triangle', 'c-dots'] as const;
export const DECO_IDS = [...BORDER_IDS.filter((x) => x !== 'none'), ...DIVIDER_IDS, ...TAPE_IDS, ...CORNER_IDS] as const;
export type DecoStyle = (typeof DECO_IDS)[number];
/** เอฟเฟกต์ที่ใส่ได้กับทุกชิ้น (CSS filter) */
export const FX_IDS = ['none', 'shadow', 'soft', 'lift', 'glow', 'neon', 'outline', 'echo', 'retro', 'gray', 'sepia', 'blur'] as const;
export type Fx = (typeof FX_IDS)[number];

interface Base {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  opacity: number;
  locked: boolean;
  fx: Fx;
  fxColor: string;
  /** กลุ่ม (Ctrl+G) ชิ้นที่ g เดียวกันถูกเลือก/ย้ายพร้อมกัน */
  g?: string;
}
export interface TextItem extends Base {
  type: 'text';
  text: string;
  font: FontId;
  size: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right';
  lh: number;
  ls: number;
  bg: string;
  stroke: string;
  strokeW: number;
  shadow: boolean;
}
export interface ShapeItem extends Base {
  type: 'shape';
  shape: string;
  fill: string;
  stroke: string;
  sw: number;
  dash: Dash;
}
export interface LineItem extends Base {
  type: 'line';
  stroke: string;
  sw: number;
  dash: Dash;
  start: Cap;
  end: Cap;
}
export interface ImageItem extends Base {
  type: 'image';
  src: string;
  radius: number;
  border: string;
  bw: number;
  flip: boolean;
}
export interface StickerItem extends Base {
  type: 'sticker';
  sticker: string;
  flip: boolean;
}
export interface TableItem extends Base {
  type: 'table';
  cells: string[][];
  stroke: string;
  sw: number;
  head: string;
  font: FontId;
  size: number;
  color: string;
  align: 'left' | 'center' | 'right';
}
export interface WriteItem extends Base {
  type: 'write';
  kind: WriteKind;
  gap: number;
  stroke: string;
  sw: number;
}
/** สื่อคณิต/วิทย์สำเร็จรูป ค่า a b c ใช้ต่างกันตามชนิด (ดู EDU_KINDS) */
export const EDU_IDS = ['numberline', 'clock', 'pie', 'bar', 'tenframe', 'dice', 'tally', 'ruler', 'coord', 'protractor', 'bond', 'blocks', 'money', 'hundred', 'balance', 'thermo', 'cylinder', 'moon', 'magnet'] as const;
export type EduKind = (typeof EDU_IDS)[number];
export interface EduItem extends Base {
  type: 'edu';
  kind: EduKind;
  a: number;
  b: number;
  c: number;
  labels: boolean;
  color: string;
  stroke: string;
}
/** ตัวละครแต่งเอง */
export interface CharItem extends Base {
  type: 'char';
  look: CharLook;
  flip: boolean;
}
/** ของตกแต่ง (กรอบ เส้นคั่น เทป มุมประดับ) */
export interface DecoItem extends Base {
  type: 'deco';
  style: DecoStyle;
  color: string;
  color2: string;
  sw: number;
}
/** สมการคณิตศาสตร์ (LaTeX วาดด้วย KaTeX) */
export interface MathItem extends Base {
  type: 'math';
  tex: string;
  color: string;
  size: number;
}
/** กราฟ/รูปคณิตศาสตร์ (ดู lib/studio/graph.ts) */
export interface GraphItem extends Base {
  type: 'graph';
  spec: GraphSpec;
}
export type Item = TextItem | ShapeItem | LineItem | ImageItem | StickerItem | TableItem | WriteItem | EduItem | CharItem | DecoItem | MathItem | GraphItem;
export type ItemType = Item['type'];

export interface PageBg {
  color: string;
  color2: string;
  angle: number;
  pattern: Pattern;
  pcolor: string;
}
export interface PageBorder {
  style: BorderStyle;
  color: string;
  w: number;
}
export interface Page {
  id: string;
  bg: PageBg;
  border: PageBorder;
  items: Item[];
}
export type EditMode = 'canvas' | 'word';
export interface Design {
  v: 1;
  size: { id: string; w: number; h: number };
  pages: Page[];
  /** โหมดที่เปิดค้างไว้ล่าสุด: ออกแบบอิสระ (Canva) / เอกสาร (Word) */
  mode: EditMode;
  /** เนื้อหาโหมดเอกสาร (HTML ที่กรองแล้ว) ไหลต่อเนื่องทุกหน้า อยู่ใต้ชิ้นงานของโหมด Canva */
  flow: string;
  /** ตั้งค่าหน้ากระดาษของโหมดเอกสาร (ขอบ หัว/ท้ายกระดาษ เลขหน้า) */
  word: WordOpt;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);

/* ------------------------------------------------------------------ ค่าเริ่มต้น */

export const blankBg = (): PageBg => ({ color: '#ffffff', color2: '', angle: 135, pattern: 'none', pcolor: '#d9d3f5' });
export const blankBorder = (): PageBorder => ({ style: 'none', color: '#7c5cf0', w: 4 });
export const blankPage = (): Page => ({ id: uid(), bg: blankBg(), border: blankBorder(), items: [] });

export function blankDesign(size: { id: string; w: number; h: number } = DEFAULT_SIZE): Design {
  return { v: 1, size: { id: size.id, w: size.w, h: size.h }, pages: [blankPage()], mode: 'canvas', flow: '', word: defaultWordOpt() };
}

const base = (x: number, y: number, w: number, h: number): Base => ({ id: uid(), x, y, w, h, rot: 0, opacity: 1, locked: false, fx: 'none', fxColor: '#2a2350' });

export function makeText(over: Partial<TextItem> = {}): TextItem {
  return {
    ...base(0, 0, 420, 60),
    type: 'text',
    text: 'พิมพ์ข้อความ',
    font: 'sarabun',
    size: 28,
    color: '#2a2350',
    bold: false,
    italic: false,
    underline: false,
    align: 'center',
    lh: 1.35,
    ls: 0,
    bg: '',
    stroke: '',
    strokeW: 0,
    shadow: false,
    ...over,
  };
}
export const makeShape = (shape: string, over: Partial<ShapeItem> = {}): ShapeItem => ({
  ...base(0, 0, 200, 200),
  type: 'shape',
  shape,
  fill: '#a78bfa',
  stroke: '#2a2350',
  sw: 0,
  dash: 'solid',
  ...over,
});
export const makeLine = (over: Partial<LineItem> = {}): LineItem => ({
  ...base(0, 0, 320, 24),
  type: 'line',
  stroke: '#2a2350',
  sw: 4,
  dash: 'solid',
  start: 'none',
  end: 'none',
  ...over,
});
export const makeImage = (src: string, w: number, h: number): ImageItem => ({ ...base(0, 0, w, h), type: 'image', src, radius: 0, border: '#ffffff', bw: 0, flip: false });
export const makeSticker = (sticker: string): StickerItem => ({ ...base(0, 0, 160, 160), type: 'sticker', sticker, flip: false });
export const makeTable = (rows: number, cols: number, over: Partial<TableItem> = {}): TableItem => ({
  ...base(0, 0, Math.min(640, cols * 150), rows * 48),
  type: 'table',
  cells: Array.from({ length: rows }, () => Array.from({ length: cols }, () => '')),
  stroke: '#2a2350',
  sw: 2,
  head: '#ede7ff',
  font: 'sarabun',
  size: 20,
  color: '#2a2350',
  align: 'center',
  ...over,
});
export const makeWrite = (kind: WriteKind, over: Partial<WriteItem> = {}): WriteItem => ({
  ...base(0, 0, 600, kind === 'box' ? 140 : 200),
  type: 'write',
  kind,
  gap: kind === 'four' ? 64 : kind === 'grid' || kind === 'dots' ? 32 : 44,
  stroke: kind === 'box' ? '#2a2350' : '#9b8fd0',
  sw: kind === 'box' ? 2.5 : 1.5,
  ...over,
});

/** พารามิเตอร์ที่ปรับได้ในแถบด้านบน (ค่าจริงถูกบีบให้อยู่ในช่วงด้วย clampEdu อีกชั้น) */
export interface EduParam {
  k: 'a' | 'b' | 'c';
  label: string;
  min: number;
  max: number;
  step?: number;
}
export type EduSubject = 'math' | 'sci';
export const EDU_KINDS: { kind: EduKind; label: string; subject: EduSubject; box: [number, number]; a: number; b: number; c: number; color: string; params: EduParam[]; labels?: boolean }[] = [
  { kind: 'numberline', label: 'เส้นจำนวน', subject: 'math', box: [640, 90], a: 0, b: 10, c: 1, color: '#7c5cf0', labels: true, params: [{ k: 'a', label: 'เริ่ม', min: -1000, max: 1000 }, { k: 'b', label: 'ถึง', min: -999, max: 2000 }, { k: 'c', label: 'ทีละ', min: 1, max: 1000 }] },
  { kind: 'clock', label: 'หน้าปัดนาฬิกา', subject: 'math', box: [260, 260], a: 3, b: 0, c: 0, color: '#ffd166', labels: true, params: [{ k: 'a', label: 'ชั่วโมง', min: 1, max: 12 }, { k: 'b', label: 'นาที', min: 0, max: 59, step: 5 }] },
  { kind: 'pie', label: 'เศษส่วนวงกลม', subject: 'math', box: [220, 220], a: 4, b: 1, c: 0, color: '#ff8fab', params: [{ k: 'a', label: 'แบ่ง', min: 1, max: 24 }, { k: 'b', label: 'ระบาย', min: 0, max: 24 }] },
  { kind: 'bar', label: 'เศษส่วนแถบ', subject: 'math', box: [520, 70], a: 5, b: 2, c: 0, color: '#7cc6ff', params: [{ k: 'a', label: 'แบ่ง', min: 1, max: 24 }, { k: 'b', label: 'ระบาย', min: 0, max: 24 }] },
  { kind: 'tenframe', label: 'กรอบสิบ', subject: 'math', box: [420, 170], a: 7, b: 0, c: 0, color: '#ff6b7a', params: [{ k: 'a', label: 'จำนวน', min: 0, max: 20 }] },
  { kind: 'dice', label: 'ลูกเต๋า', subject: 'math', box: [120, 120], a: 5, b: 0, c: 0, color: '#ffffff', params: [{ k: 'a', label: 'แต้ม', min: 1, max: 6 }] },
  { kind: 'tally', label: 'รอยขีดนับ', subject: 'math', box: [300, 100], a: 8, b: 0, c: 0, color: '#2a2350', params: [{ k: 'a', label: 'จำนวน', min: 1, max: 50 }] },
  { kind: 'ruler', label: 'ไม้บรรทัด (ซม.)', subject: 'math', box: [600, 80], a: 15, b: 0, c: 0, color: '#ffe066', labels: true, params: [{ k: 'a', label: 'ยาว (ซม.)', min: 5, max: 30 }] },
  { kind: 'coord', label: 'ระนาบพิกัด', subject: 'math', box: [420, 420], a: 5, b: 0, c: 0, color: '#7c5cf0', labels: true, params: [{ k: 'a', label: 'ช่วง ±', min: 2, max: 10 }] },
  { kind: 'protractor', label: 'ไม้โปรแทรกเตอร์', subject: 'math', box: [420, 230], a: 60, b: 0, c: 0, color: '#bde4ff', labels: true, params: [{ k: 'a', label: 'มุม (องศา)', min: 0, max: 180, step: 5 }] },
  { kind: 'bond', label: 'แผนภาพจำนวน', subject: 'math', box: [300, 240], a: 10, b: 6, c: 0, color: '#ffd166', params: [{ k: 'a', label: 'ผลรวม', min: 0, max: 999 }, { k: 'b', label: 'ส่วนที่ 1', min: 0, max: 999 }, { k: 'c', label: 'เว้นช่อง (0-3)', min: 0, max: 3 }] },
  { kind: 'blocks', label: 'บล็อกฐานสิบ', subject: 'math', box: [460, 240], a: 124, b: 0, c: 0, color: '#7cc6ff', labels: true, params: [{ k: 'a', label: 'จำนวน', min: 0, max: 999 }] },
  { kind: 'money', label: 'เหรียญและธนบัตร', subject: 'math', box: [520, 240], a: 87, b: 0, c: 0, color: '#ffd166', params: [{ k: 'a', label: 'จำนวนเงิน (บาท)', min: 1, max: 2000 }] },
  { kind: 'hundred', label: 'ตาราง 100 ช่อง', subject: 'math', box: [440, 440], a: 0, b: 0, c: 0, color: '#ffd166', params: [{ k: 'a', label: 'ระบายพหุคูณของ', min: 0, max: 20 }, { k: 'b', label: 'เว้นว่าง (%)', min: 0, max: 80, step: 10 }] },
  { kind: 'balance', label: 'ตาชั่งสองแขน', subject: 'sci', box: [420, 260], a: 5, b: 3, c: 0, color: '#ffd166', labels: true, params: [{ k: 'a', label: 'ซ้าย', min: 0, max: 99 }, { k: 'b', label: 'ขวา', min: 0, max: 99 }] },
  { kind: 'thermo', label: 'เทอร์โมมิเตอร์', subject: 'sci', box: [110, 360], a: 30, b: 0, c: 0, color: '#ff4d6d', labels: true, params: [{ k: 'a', label: 'อุณหภูมิ °C', min: -20, max: 50 }] },
  { kind: 'cylinder', label: 'กระบอกตวง', subject: 'sci', box: [150, 360], a: 60, b: 100, c: 0, color: '#7cc6ff', labels: true, params: [{ k: 'a', label: 'ปริมาตร (มล.)', min: 0, max: 1000, step: 5 }, { k: 'b', label: 'ความจุ (มล.)', min: 50, max: 1000, step: 50 }] },
  { kind: 'moon', label: 'ข้างขึ้นข้างแรม', subject: 'sci', box: [200, 240], a: 2, b: 0, c: 0, color: '#ffe680', labels: true, params: [{ k: 'a', label: 'ช่วง (0-7)', min: 0, max: 7 }] },
  { kind: 'magnet', label: 'แม่เหล็ก', subject: 'sci', box: [320, 110], a: 0, b: 0, c: 0, color: '#ff4d6d', labels: true, params: [{ k: 'a', label: 'แบบ (0 แท่ง / 1 เกือกม้า)', min: 0, max: 1 }] },
];
export const MOON_PHASES = ['เดือนมืด', 'ข้างขึ้นเสี้ยว', 'ข้างขึ้นครึ่งดวง', 'ข้างขึ้นค่อนดวง', 'เดือนเพ็ญ', 'ข้างแรมค่อนดวง', 'ข้างแรมครึ่งดวง', 'ข้างแรมเสี้ยว'];

export function makeEdu(kind: EduKind): EduItem {
  const d = EDU_KINDS.find((x) => x.kind === kind) ?? EDU_KINDS[0];
  return { ...base(0, 0, d.box[0], d.box[1]), type: 'edu', kind, a: d.a, b: d.b, c: d.c, labels: true, color: d.color, stroke: '#2a2350' };
}
export const makeChar = (look: CharLook = DEFAULT_LOOK): CharItem => ({ ...base(0, 0, 200, 300), type: 'char', look: structuredClone(look), flip: false });
/** กล่องเริ่มต้นของของตกแต่งแต่ละกลุ่ม */
export const makeMath = (tex: string, w: number, h: number, size = 36): MathItem => ({ ...base(0, 0, w, h), type: 'math', tex, color: '#2a2350', size });
export const makeGraph = (spec: GraphSpec, width = 420): GraphItem => ({ ...base(0, 0, width, (width * spec.h) / spec.w), type: 'graph', spec });

export function makeDeco(style: DecoStyle, color = '#7c5cf0', color2 = '#ffd166'): DecoItem {
  const box: [number, number] = style.startsWith('d-') ? [560, 40] : style.startsWith('t-') ? [220, 54] : style.startsWith('c-') ? [150, 150] : [420, 300];
  return { ...base(0, 0, box[0], box[1]), type: 'deco', style, color, color2, sw: style.startsWith('c-') ? 6 : 4 };
}

/** แก้ค่า a b c ให้อยู่ในช่วงที่วาดได้ของแต่ละชนิด */
export function clampEdu(kind: EduKind, a: number, b: number, c: number): [number, number, number] {
  const i = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));
  switch (kind) {
    case 'numberline': {
      const lo = i(a, -1000, 1000);
      const hi = i(b, lo + 1, lo + 1000);
      const st = i(c, 1, 1000);
      return [lo, Math.min(hi, lo + st * 40), st];
    }
    case 'clock':
      return [i(a, 1, 12), i(b, 0, 59), 0];
    case 'pie':
    case 'bar': {
      const n = i(a, 1, 24);
      return [n, i(b, 0, n), 0];
    }
    case 'tenframe':
      return [i(a, 0, 20), 0, 0];
    case 'dice':
      return [i(a, 1, 6), 0, 0];
    case 'tally':
      return [i(a, 1, 50), 0, 0];
    case 'ruler':
      return [i(a, 5, 30), 0, 0];
    case 'coord':
      return [i(a, 2, 10), 0, 0];
    case 'protractor':
      return [i(a, 0, 180), 0, 0];
    case 'bond': {
      const t = i(a, 0, 999);
      return [t, i(b, 0, t), i(c, 0, 3)];
    }
    case 'blocks':
      return [i(a, 0, 999), 0, 0];
    case 'money':
      return [i(a, 1, 2000), 0, 0];
    case 'hundred':
      return [i(a, 0, 20), i(b / 10, 0, 8) * 10, 0];
    case 'balance':
      return [i(a, 0, 99), i(b, 0, 99), 0];
    case 'thermo':
      return [i(a, -20, 50), 0, 0];
    case 'cylinder': {
      const cap = i(b / 50, 1, 20) * 50;
      return [i(a, 0, cap), cap, 0];
    }
    case 'moon':
      return [i(a, 0, 7), 0, 0];
    case 'magnet':
      return [i(a, 0, 1), 0, 0];
  }
}

/* ------------------------------------------------------------------ ตัวกรองข้อมูล */

const HEX = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
/** สีต้องเป็น #rrggbb(aa) เท่านั้น (กันการแอบใส่ url()/expression ลงใน style) ค่าว่าง = ไม่มี */
export const cleanColor = (v: unknown, fallback = ''): string => (typeof v === 'string' && HEX.test(v) ? v : fallback);
const num = (v: unknown, min: number, max: number, d: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : d;
  return Math.min(max, Math.max(min, n));
};
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const pick = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
const bool = (v: unknown) => v === true;

/** รูปต้องมาจากที่เก็บไฟล์ของเว็บเรา หรือเป็นรูป data: ที่ระบบสร้างเอง (QR) เท่านั้น */
export function cleanSrc(v: unknown): string {
  if (typeof v !== 'string') return '';
  const pre = mediaPrefix();
  if (pre && v.startsWith(pre) && /^[A-Za-z0-9._/-]+$/.test(v.slice(pre.length)) && !v.includes('..')) return v;
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= 200_000) return v;
  return '';
}

const DASH = ['solid', 'dash', 'dot'] as const;
const CAP = ['none', 'arrow', 'dot'] as const;
const ALIGN = ['left', 'center', 'right'] as const;
const WRITE = ['lines', 'dotted', 'four', 'grid', 'dots', 'box'] as const;
const PATTERN = ['none', 'dots', 'grid', 'lines', 'stripes', 'checks'] as const;
const ID = /^[a-z0-9-]{1,24}$/;

function cleanBase(r: Record<string, unknown>, W: number, H: number): Base {
  return {
    id: typeof r.id === 'string' && /^[a-z0-9]{4,24}$/.test(r.id) ? r.id : uid(),
    x: num(r.x, -W, W * 2, 0),
    y: num(r.y, -H, H * 2, 0),
    w: num(r.w, 4, 6000, 100),
    h: num(r.h, 2, 6000, 100),
    rot: num(r.rot, -360, 360, 0),
    opacity: num(r.opacity, 0.05, 1, 1),
    locked: bool(r.locked),
    fx: pick(r.fx, FX_IDS, 'none'),
    fxColor: cleanColor(r.fxColor, '#2a2350'),
    ...(typeof r.g === 'string' && /^[a-z0-9]{4,16}$/.test(r.g) ? { g: r.g } : {}),
  };
}

export function cleanItem(raw: unknown, W: number, H: number): Item | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const b = cleanBase(r, W, H);
  switch (r.type) {
    case 'text':
      return {
        ...b,
        type: 'text',
        text: str(r.text, MAX_TEXT),
        font: pick(r.font, FONT_IDS, 'sarabun'),
        size: num(r.size, 6, 400, 28),
        color: cleanColor(r.color, '#2a2350'),
        bold: bool(r.bold),
        italic: bool(r.italic),
        underline: bool(r.underline),
        align: pick(r.align, ALIGN, 'center'),
        lh: num(r.lh, 0.8, 3, 1.35),
        ls: num(r.ls, -5, 40, 0),
        bg: cleanColor(r.bg),
        stroke: cleanColor(r.stroke),
        strokeW: num(r.strokeW, 0, 30, 0),
        shadow: bool(r.shadow),
      };
    case 'shape':
      return {
        ...b,
        type: 'shape',
        shape: typeof r.shape === 'string' && ID.test(r.shape) ? r.shape : 'rect',
        fill: cleanColor(r.fill),
        stroke: cleanColor(r.stroke, '#2a2350'),
        sw: num(r.sw, 0, 60, 0),
        dash: pick(r.dash, DASH, 'solid'),
      };
    case 'line':
      return { ...b, type: 'line', stroke: cleanColor(r.stroke, '#2a2350'), sw: num(r.sw, 1, 60, 4), dash: pick(r.dash, DASH, 'solid'), start: pick(r.start, CAP, 'none'), end: pick(r.end, CAP, 'none') };
    case 'image': {
      const src = cleanSrc(r.src);
      if (!src) return null;
      return { ...b, type: 'image', src, radius: num(r.radius, 0, 50, 0), border: cleanColor(r.border, '#ffffff'), bw: num(r.bw, 0, 60, 0), flip: bool(r.flip) };
    }
    case 'sticker':
      return typeof r.sticker === 'string' && ID.test(r.sticker) ? { ...b, type: 'sticker', sticker: r.sticker, flip: bool(r.flip) } : null;
    case 'table': {
      const rows = Array.isArray(r.cells) ? r.cells.slice(0, 30) : [];
      const cols = Math.min(12, Math.max(1, ...rows.map((x) => (Array.isArray(x) ? x.length : 0))));
      if (!rows.length) return null;
      return {
        ...b,
        type: 'table',
        cells: rows.map((row) => Array.from({ length: cols }, (_, i) => str(Array.isArray(row) ? row[i] : '', 400))),
        stroke: cleanColor(r.stroke, '#2a2350'),
        sw: num(r.sw, 0, 12, 2),
        head: cleanColor(r.head),
        font: pick(r.font, FONT_IDS, 'sarabun'),
        size: num(r.size, 6, 120, 20),
        color: cleanColor(r.color, '#2a2350'),
        align: pick(r.align, ALIGN, 'center'),
      };
    }
    case 'edu': {
      const kind = pick(r.kind, EDU_IDS, 'numberline');
      const [a, bb, c] = clampEdu(kind, num(r.a, -1000, 1000, 0), num(r.b, -1000, 2000, 0), num(r.c, 0, 1000, 1));
      return { ...b, type: 'edu', kind, a, b: bb, c, labels: r.labels !== false, color: cleanColor(r.color, '#7c5cf0'), stroke: cleanColor(r.stroke, '#2a2350') };
    }
    case 'char':
      return { ...b, type: 'char', look: cleanLook(r.look), flip: bool(r.flip) };
    case 'deco':
      return (DECO_IDS as readonly string[]).includes(r.style as string)
        ? { ...b, type: 'deco', style: r.style as DecoStyle, color: cleanColor(r.color, '#7c5cf0'), color2: cleanColor(r.color2, '#ffd166'), sw: num(r.sw, 1, 40, 6) }
        : null;
    case 'write':
      return { ...b, type: 'write', kind: pick(r.kind, WRITE, 'lines'), gap: num(r.gap, 12, 200, 44), stroke: cleanColor(r.stroke, '#9b8fd0'), sw: num(r.sw, 0.5, 12, 1.5) };
    case 'math': {
      const tex = str(r.tex, 2000);
      return tex.trim() ? { ...b, type: 'math', tex, color: cleanColor(r.color, '#2a2350'), size: num(r.size, 8, 300, 36) } : null;
    }
    case 'graph':
      return { ...b, type: 'graph', spec: cleanGraph(r.spec) };
    default:
      return null;
  }
}

function cleanPage(raw: unknown, W: number, H: number): Page {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const bg = (r.bg && typeof r.bg === 'object' ? r.bg : {}) as Record<string, unknown>;
  const bd = (r.border && typeof r.border === 'object' ? r.border : {}) as Record<string, unknown>;
  const items = Array.isArray(r.items) ? r.items.slice(0, MAX_ITEMS) : [];
  return {
    id: typeof r.id === 'string' && /^[a-z0-9]{4,24}$/.test(r.id) ? r.id : uid(),
    bg: {
      color: cleanColor(bg.color, '#ffffff'),
      color2: cleanColor(bg.color2),
      angle: num(bg.angle, 0, 360, 135),
      pattern: pick(bg.pattern, PATTERN, 'none'),
      pcolor: cleanColor(bg.pcolor, '#d9d3f5'),
    },
    border: { style: pick(bd.style, BORDER_IDS, 'none'), color: cleanColor(bd.color, '#7c5cf0'), w: num(bd.w, 1, 40, 4) },
    items: items.map((x) => cleanItem(x, W, H)).filter((x): x is Item => !!x),
  };
}

export function sanitizeDesign(raw: unknown): Design {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const s = (r.size && typeof r.size === 'object' ? r.size : {}) as Record<string, unknown>;
  const preset = SIZES.find((x) => x.id === s.id);
  const w = Math.round(num(s.w, CUSTOM_MIN, CUSTOM_MAX, preset?.w ?? DEFAULT_SIZE.w));
  const h = Math.round(num(s.h, CUSTOM_MIN, CUSTOM_MAX, preset?.h ?? DEFAULT_SIZE.h));
  const size = { id: preset && preset.w === w && preset.h === h ? preset.id : 'custom', w, h };
  const pages = (Array.isArray(r.pages) ? r.pages.slice(0, MAX_PAGES) : []).map((p) => cleanPage(p, w, h));
  return { v: 1, size, pages: pages.length ? pages : [blankPage()], mode: r.mode === 'word' ? 'word' : 'canvas', flow: cleanFlowHtml(typeof r.flow === 'string' ? r.flow : '', cleanSrc), word: cleanWordOpt(r.word, cleanSrc) };
}

/** ไฟล์รูปในที่เก็บของเราที่สื่อชิ้นนี้ใช้ (ใช้ตอนลบสื่อ) */
export function designMediaPaths(d: Design): string[] {
  const pre = mediaPrefix();
  const flowImgs = [...[d.flow, d.word?.head, d.word?.foot].join('').matchAll(/<img src="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  return [...new Set([...d.pages.flatMap((p) => p.items).flatMap((i) => (i.type === 'image' ? [i.src] : [])), ...flowImgs].flatMap((src) => (pre && src.startsWith(pre) ? [src.slice(pre.length)] : [])))];
}

export const sizeLabel = (s: Design['size']) => SIZES.find((x) => x.id === s.id)?.label ?? `กำหนดเอง ${s.w} x ${s.h}`;
/** px (96 dpi) -> มิลลิเมตร ใช้แสดงขนาดกำหนดเอง */
export const pxToMm = (px: number) => Math.round((px / 96) * 25.4);
export const mmToPx = (mm: number) => Math.round((mm / 25.4) * 96);
