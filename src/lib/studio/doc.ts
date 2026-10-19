/**
 * ระบบสร้างสื่อการสอน (Studio): โครงข้อมูลของสื่อ 1 ชิ้น = หลายหน้า แต่ละหน้ามีพื้นหลัง กรอบ และชิ้นงาน
 * หน่วยเป็นพิกเซลที่ 96 dpi (A4 = 794 x 1123) แปลงเป็น pt ตอนทำ PDF ด้วย x0.75
 * ข้อมูลทุกชิ้นผ่าน sanitizeDesign() ก่อนแสดงผลเสมอ (ทั้งของตัวเองและของคนอื่นใน Discover)
 */
import { mediaPrefix } from '@/lib/game-creator/prefix';
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

export const FONT_IDS = ['sarabun', 'kanit', 'prompt', 'mitr', 'noto', 'itim', 'mali', 'sriracha', 'chonburi', 'charm', 'pattaya', 'chakra'] as const;
export type FontId = (typeof FONT_IDS)[number];

export type Dash = 'solid' | 'dash' | 'dot';
export type Cap = 'none' | 'arrow' | 'dot';
export type WriteKind = 'lines' | 'dotted' | 'four' | 'grid' | 'dots' | 'box';
export type Pattern = 'none' | 'dots' | 'grid' | 'lines' | 'stripes' | 'checks';
export type BorderStyle = 'none' | 'line' | 'double' | 'dash' | 'round' | 'dots' | 'stars' | 'wave' | 'corner';

interface Base {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  opacity: number;
  locked: boolean;
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
export type EduKind = 'numberline' | 'clock' | 'pie' | 'bar' | 'tenframe' | 'dice' | 'tally' | 'ruler' | 'coord';
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
export type Item = TextItem | ShapeItem | LineItem | ImageItem | StickerItem | TableItem | WriteItem | EduItem | CharItem;
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
export interface Design {
  v: 1;
  size: { id: string; w: number; h: number };
  pages: Page[];
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);

/* ------------------------------------------------------------------ ค่าเริ่มต้น */

export const blankBg = (): PageBg => ({ color: '#ffffff', color2: '', angle: 135, pattern: 'none', pcolor: '#d9d3f5' });
export const blankBorder = (): PageBorder => ({ style: 'none', color: '#7c5cf0', w: 4 });
export const blankPage = (): Page => ({ id: uid(), bg: blankBg(), border: blankBorder(), items: [] });

export function blankDesign(size: { id: string; w: number; h: number } = DEFAULT_SIZE): Design {
  return { v: 1, size: { id: size.id, w: size.w, h: size.h }, pages: [blankPage()] };
}

const base = (x: number, y: number, w: number, h: number): Base => ({ id: uid(), x, y, w, h, rot: 0, opacity: 1, locked: false });

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

export const EDU_KINDS: { kind: EduKind; label: string; box: [number, number]; a: number; b: number; c: number; color: string }[] = [
  { kind: 'numberline', label: 'เส้นจำนวน', box: [640, 90], a: 0, b: 10, c: 1, color: '#7c5cf0' },
  { kind: 'clock', label: 'หน้าปัดนาฬิกา', box: [260, 260], a: 3, b: 0, c: 0, color: '#ffd166' },
  { kind: 'pie', label: 'เศษส่วนวงกลม', box: [220, 220], a: 4, b: 1, c: 0, color: '#ff8fab' },
  { kind: 'bar', label: 'เศษส่วนแถบ', box: [520, 70], a: 5, b: 2, c: 0, color: '#7cc6ff' },
  { kind: 'tenframe', label: 'กรอบสิบ', box: [420, 170], a: 7, b: 0, c: 0, color: '#ff6b7a' },
  { kind: 'dice', label: 'ลูกเต๋า', box: [120, 120], a: 5, b: 0, c: 0, color: '#ffffff' },
  { kind: 'tally', label: 'รอยขีดนับ', box: [300, 100], a: 8, b: 0, c: 0, color: '#2a2350' },
  { kind: 'ruler', label: 'ไม้บรรทัด (ซม.)', box: [600, 80], a: 15, b: 0, c: 0, color: '#ffe066' },
  { kind: 'coord', label: 'ระนาบพิกัด', box: [420, 420], a: 5, b: 0, c: 0, color: '#7c5cf0' },
];

export function makeEdu(kind: EduKind): EduItem {
  const d = EDU_KINDS.find((x) => x.kind === kind) ?? EDU_KINDS[0];
  return { ...base(0, 0, d.box[0], d.box[1]), type: 'edu', kind, a: d.a, b: d.b, c: d.c, labels: true, color: d.color, stroke: '#2a2350' };
}
export const makeChar = (look: CharLook = DEFAULT_LOOK): CharItem => ({ ...base(0, 0, 200, 300), type: 'char', look: structuredClone(look), flip: false });

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
const BORDER = ['none', 'line', 'double', 'dash', 'round', 'dots', 'stars', 'wave', 'corner'] as const;
const ID = /^[a-z0-9-]{1,24}$/;
const EDU = ['numberline', 'clock', 'pie', 'bar', 'tenframe', 'dice', 'tally', 'ruler', 'coord'] as const;

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
      const kind = pick(r.kind, EDU, 'numberline');
      const [a, bb, c] = clampEdu(kind, num(r.a, -1000, 1000, 0), num(r.b, -1000, 2000, 0), num(r.c, 0, 1000, 1));
      return { ...b, type: 'edu', kind, a, b: bb, c, labels: r.labels !== false, color: cleanColor(r.color, '#7c5cf0'), stroke: cleanColor(r.stroke, '#2a2350') };
    }
    case 'char':
      return { ...b, type: 'char', look: cleanLook(r.look), flip: bool(r.flip) };
    case 'write':
      return { ...b, type: 'write', kind: pick(r.kind, WRITE, 'lines'), gap: num(r.gap, 12, 200, 44), stroke: cleanColor(r.stroke, '#9b8fd0'), sw: num(r.sw, 0.5, 12, 1.5) };
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
    border: { style: pick(bd.style, BORDER, 'none'), color: cleanColor(bd.color, '#7c5cf0'), w: num(bd.w, 1, 40, 4) },
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
  return { v: 1, size, pages: pages.length ? pages : [blankPage()] };
}

/** ไฟล์รูปในที่เก็บของเราที่สื่อชิ้นนี้ใช้ (ใช้ตอนลบสื่อ) */
export function designMediaPaths(d: Design): string[] {
  const pre = mediaPrefix();
  return [...new Set(d.pages.flatMap((p) => p.items).flatMap((i) => (i.type === 'image' && pre && i.src.startsWith(pre) ? [i.src.slice(pre.length)] : [])))];
}

export const sizeLabel = (s: Design['size']) => SIZES.find((x) => x.id === s.id)?.label ?? `กำหนดเอง ${s.w} x ${s.h}`;
/** px (96 dpi) -> มิลลิเมตร ใช้แสดงขนาดกำหนดเอง */
export const pxToMm = (px: number) => Math.round((px / 96) * 25.4);
export const mmToPx = (mm: number) => Math.round((mm / 25.4) * 96);
