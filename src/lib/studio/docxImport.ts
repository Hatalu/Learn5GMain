/**
 * นำเข้าไฟล์ Word (.docx) เป็นเนื้อหาโหมดเอกสาร (HTML ที่ cleanFlowHtml รับ)
 * - สมการของ Word (OMML) และสมการ MathType (วัตถุ OLE) แปลงเป็นช่องสมการของเว็บ (data-tex) แก้ต่อได้
 * - เก็บตัวหนา/เอียง/ขีดเส้น/ขนาด/ฟอนต์/สี/จัดแนว/เยื้อง/ระยะก่อน-หลังย่อหน้า/ระยะบรรทัด/แรเงา/เส้นขอบย่อหน้า
 *   แท็บ (ตำแหน่งหยุดแท็บ ซ้าย/กลาง/ขวา) รายการ ตาราง (เส้นขอบ แรเงาช่อง ความกว้างคอลัมน์) รูป/รูปร่างที่ลอยอยู่ (ยึดกับย่อหน้า)
 *   ตัวแบ่งหน้า หัวท้ายกระดาษ (ช่องเลขหน้า PAGE) ระยะขอบ
 * - ค่าตั้งต้นจากสไตล์ (docDefaults > สไตล์ตาราง > สไตล์ย่อหน้าตามลำดับ basedOn > ค่าในย่อหน้า) แบบที่ Word คิด
 * - รูปส่งผ่าน addImage (เว็บ = อัปโหลดเข้าที่เก็บ, แอป = data URL) คืน '' = ทิ้งรูปนั้น
 * ไม่ใช้ DOM (ทดสอบใน selftest และใช้ได้ทั้งเว็บและแอป)
 */
import JSZip from 'jszip';
import { find, findAll, kid, kidsOf, parseXml, val, type XNode } from './xml';
import { ommlToTex } from './ommlTex';
import { oleEquationTex } from './mtef';
import { PAGE_FIELD, WORD_SINGLE } from './flow';

export type AddImage = (bytes: Uint8Array, mime: string) => Promise<string>;

export interface ImportStats {
  paragraphs: number;
  equations: number;
  /** สมการ MathType ที่แปลงไม่ได้ (ใส่ช่องสมการ ? แทน) */
  failedEq: number;
  images: number;
  /** รูปที่ใส่ไม่ได้ (EMF/WMF/ใหญ่เกิน/อัปโหลดไม่ผ่าน) */
  droppedImages: number;
  /** ไฟล์ยาวเกินที่เก็บได้ นำเข้าแค่ส่วนแรก */
  truncated?: boolean;
}
export interface ImportResult {
  html: string;
  head: string;
  foot: string;
  /** ระยะขอบ px (96 dpi) จากไฟล์ ไม่มี = undefined */
  margins?: { mt: number; mb: number; ml: number; mr: number };
  stats: ImportStats;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) => esc(s).replace(/"/g, '&quot;');
const num = (v: string | undefined) => (v && /^-?\d+(\.\d+)?$/.test(v) ? +v : undefined);
const twip = (v: string | undefined) => Math.round((num(v) ?? 0) / 15);
const r2 = (v: number) => Math.round(v * 100) / 100;
const ptToPx = (pt: number) => r2((pt * 4) / 3);
const emu = (v: string | undefined) => Math.round((num(v) ?? 0) / 9525);
const THAI = /[฀-๿]/;
const HEX6 = /^[0-9a-fA-F]{6}$/;

/** สีไฮไลต์ของ Word */
const HILITE: Record<string, string> = { yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff', blue: '#0000ff', red: '#ff0000', darkBlue: '#000080', darkCyan: '#008080', darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000', darkYellow: '#808000', darkGray: '#808080', lightGray: '#c0c0c0', black: '#000000' };
/** ฟอนต์ Symbol (w:sym) -> Unicode เฉพาะตัวที่ใช้บ่อยในเอกสารคณิต */
const SYMBOL_FONT: Record<number, string> = { 0xb4: '×', 0xb8: '÷', 0xb1: '±', 0xa3: '≤', 0xb3: '≥', 0xb9: '≠', 0xbb: '≈', 0xd6: '√', 0x70: 'π', 0x71: 'θ', 0x61: 'α', 0x62: 'β', 0x67: 'γ', 0x64: 'δ', 0x44: 'Δ', 0x6c: 'λ', 0x6d: 'μ', 0x73: 'σ', 0x53: 'Σ', 0x57: 'Ω', 0x77: 'ω', 0xa5: '∞', 0xb0: '°', 0xae: '→', 0xac: '←', 0xde: '⇒', 0xdb: '⇔', 0xce: '∈', 0xcf: '∉', 0xc8: '∪', 0xc7: '∩', 0xcc: '⊂', 0xcd: '⊆', 0xc6: '∅', 0xd0: '∠', 0x5e: '⊥', 0x2d: '−', 0xd7: '·', 0xbc: '…', 0x22: '∀', 0x24: '∃', 0x5c: '∴' };
/** รูปร่างของ Word (prstGeom) -> รูปร่างของเรา */
const GEOM: Record<string, string> = { rect: 'rect', roundRect: 'round', ellipse: 'circle', triangle: 'triangle', rtTriangle: 'rtriangle', diamond: 'diamond', pentagon: 'pentagon', hexagon: 'hexagon', octagon: 'octagon', parallelogram: 'parallel', trapezoid: 'trapezoid', star5: 'star', heart: 'heart', cloud: 'cloud', rightArrow: 'arrow', leftRightArrow: 'darrow', chevron: 'chevron', plus: 'plus', mathPlus: 'plus', moon: 'moon', donut: 'ring', frame: 'frame', line: 'ln', straightConnector1: 'ln' };

/* ---------------------------------------------------------------- สี (ธีม + lumMod/lumOff/shade/tint) */

function hexToRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const rgbHex = (c: number[]) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
function rgbToHsl([r, g, b]: number[]): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb([h, s, l]: number[]): number[] {
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
/** สีของ DrawingML (a:srgbClr / a:schemeClr / a:sysClr / a:prstClr + ตัวปรับ) */
function drawColor(n: XNode | undefined, theme: Map<string, string>): string | undefined {
  const c = n?.kids.find((k) => /^a:(srgbClr|schemeClr|sysClr|prstClr)$/.test(k.tag));
  if (!c) return undefined;
  let hex = c.tag === 'a:srgbClr' ? c.attrs.val : c.tag === 'a:sysClr' ? c.attrs.lastClr : c.tag === 'a:schemeClr' ? theme.get(c.attrs.val) : c.attrs.val === 'black' ? '000000' : c.attrs.val === 'white' ? 'ffffff' : undefined;
  if (!hex || !HEX6.test(hex)) return undefined;
  let rgb = hexToRgb(hex);
  const mod = (t: string) => {
    const v = num(kid(c, t)?.attrs.val);
    return v === undefined ? undefined : v / 100000;
  };
  const lm = mod('a:lumMod');
  const lo = mod('a:lumOff');
  if (lm !== undefined || lo !== undefined) {
    const [h, s, l] = rgbToHsl(rgb);
    rgb = hslToRgb([h, s, Math.max(0, Math.min(1, l * (lm ?? 1) + (lo ?? 0)))]) as [number, number, number];
  }
  const sh = mod('a:shade');
  if (sh !== undefined) rgb = rgb.map((v) => v * sh) as [number, number, number];
  const ti = mod('a:tint');
  if (ti !== undefined) rgb = rgb.map((v) => v + (255 - v) * (1 - ti)) as [number, number, number];
  hex = rgbHex(rgb);
  return hex;
}

/* ---------------------------------------------------------------- รูปแบบตัวอักษร */

interface RunFmt {
  b?: boolean;
  bCs?: boolean;
  i?: boolean;
  iCs?: boolean;
  u?: boolean;
  s?: boolean;
  va?: 'sup' | 'sub';
  sz?: number;
  szCs?: number;
  font?: string;
  fontCs?: string;
  color?: string;
  bg?: string;
}
const onOff = (n: XNode | undefined) => {
  if (!n) return undefined;
  const v = n.attrs['w:val'];
  return !(v === '0' || v === 'false' || v === 'off');
};
function readRpr(p: XNode | undefined): RunFmt {
  if (!p) return {};
  const f: RunFmt = {};
  const set = <K extends keyof RunFmt>(k: K, v: RunFmt[K] | undefined) => v !== undefined && (f[k] = v);
  set('b', onOff(kid(p, 'w:b')));
  set('bCs', onOff(kid(p, 'w:bCs')));
  set('i', onOff(kid(p, 'w:i')));
  set('iCs', onOff(kid(p, 'w:iCs')));
  const u = val(p, 'w:u');
  if (u !== undefined) f.u = u !== 'none';
  set('s', onOff(kid(p, 'w:strike')) ?? onOff(kid(p, 'w:dstrike')));
  const va = val(p, 'w:vertAlign');
  if (va === 'superscript') f.va = 'sup';
  else if (va === 'subscript') f.va = 'sub';
  const sz = Number(val(p, 'w:sz'));
  if (sz > 0) f.sz = sz / 2;
  const szCs = Number(val(p, 'w:szCs'));
  if (szCs > 0) f.szCs = szCs / 2;
  const rf = kid(p, 'w:rFonts');
  if (rf) {
    const a = rf.attrs['w:ascii'] || rf.attrs['w:hAnsi'];
    if (a) f.font = a;
    if (rf.attrs['w:cs']) f.fontCs = rf.attrs['w:cs'];
  }
  const c = val(p, 'w:color');
  if (c && HEX6.test(c)) f.color = `#${c.toLowerCase()}`;
  const h = val(p, 'w:highlight');
  if (h && HILITE[h]) f.bg = HILITE[h];
  const shd = kid(p, 'w:shd')?.attrs['w:fill'];
  if (!f.bg && shd && HEX6.test(shd) && shd.toLowerCase() !== 'ffffff') f.bg = `#${shd.toLowerCase()}`;
  return f;
}

/* ---------------------------------------------------------------- รูปแบบย่อหน้า */

interface Border {
  w: number;
  color: string;
  none?: boolean;
}
interface ParaFmt {
  before?: number;
  after?: number;
  line?: number;
  rule?: string;
  left?: number;
  first?: number;
  jc?: string;
  shd?: string;
  /** ตำแหน่งหยุดแท็บ (twip) -> ชนิด ('' = ล้างตำแหน่งที่สืบทอดมา) */
  tabs?: Record<string, string>;
  bdr?: Partial<Record<'top' | 'bottom' | 'left' | 'right', Border>>;
  pbb?: boolean;
}
/** เส้นขอบของ Word (w:top w:val w:sz=1/8 pt w:color) */
function readBorder(n: XNode | undefined): Border | undefined {
  if (!n) return undefined;
  const v = n.attrs['w:val'];
  if (!v || v === 'none' || v === 'nil') return { w: 0, color: '', none: true };
  const sz = num(n.attrs['w:sz']) ?? 4;
  const c = n.attrs['w:color'];
  return { w: Math.max(1, Math.round(((sz / 8) * 4) / 3)), color: c && HEX6.test(c) ? `#${c.toLowerCase()}` : '#000000' };
}
const borderCss = (b: Border | undefined) => (!b || b.none ? 'none' : `${b.w}px solid ${b.color}`);

function readPpr(p: XNode | undefined): ParaFmt {
  if (!p) return {};
  const f: ParaFmt = {};
  const sp = kid(p, 'w:spacing');
  if (sp) {
    if (sp.attrs['w:before'] !== undefined && sp.attrs['w:beforeAutospacing'] !== '1') f.before = twip(sp.attrs['w:before']);
    if (sp.attrs['w:after'] !== undefined && sp.attrs['w:afterAutospacing'] !== '1') f.after = twip(sp.attrs['w:after']);
    if (num(sp.attrs['w:line'])) {
      f.line = num(sp.attrs['w:line']);
      f.rule = sp.attrs['w:lineRule'] || 'auto';
    }
  }
  const ind = kid(p, 'w:ind');
  if (ind) {
    const l = ind.attrs['w:left'] ?? ind.attrs['w:start'];
    if (l !== undefined) f.left = twip(l);
    if (ind.attrs['w:hanging'] !== undefined) f.first = -twip(ind.attrs['w:hanging']);
    else if (ind.attrs['w:firstLine'] !== undefined) f.first = twip(ind.attrs['w:firstLine']);
  }
  const jc = val(p, 'w:jc');
  if (jc) f.jc = jc;
  const shd = kid(p, 'w:shd')?.attrs['w:fill'];
  if (shd && HEX6.test(shd)) f.shd = shd.toLowerCase() === 'ffffff' ? '' : `#${shd.toLowerCase()}`;
  else if (shd === 'auto') f.shd = '';
  const tabs = kid(p, 'w:tabs');
  if (tabs) {
    f.tabs = {};
    for (const t of kidsOf(tabs, 'w:tab')) {
      const pos = t.attrs['w:pos'];
      if (!pos || !/^-?\d+$/.test(pos)) continue;
      const v = t.attrs['w:val'] || 'left';
      f.tabs[pos] = v === 'clear' ? '' : v === 'center' ? 'c' : v === 'right' || v === 'end' ? 'r' : v === 'decimal' ? 'r' : v === 'bar' ? '' : 'l';
    }
  }
  const pb = kid(p, 'w:pBdr');
  if (pb) {
    f.bdr = {};
    for (const s of ['top', 'bottom', 'left', 'right'] as const) {
      const b = readBorder(kid(pb, `w:${s}`));
      if (b) f.bdr[s] = b;
    }
  }
  const pbb = onOff(kid(p, 'w:pageBreakBefore'));
  if (pbb !== undefined) f.pbb = pbb;
  return f;
}
/** รวมรูปแบบย่อหน้าชั้นบนทับชั้นล่าง (แท็บรวมกัน ตำแหน่งที่ล้างแล้วหายไป) */
function mergePpr(a: ParaFmt, b: ParaFmt): ParaFmt {
  const out: ParaFmt = { ...a, ...b };
  if (a.tabs || b.tabs) out.tabs = { ...(a.tabs ?? {}), ...(b.tabs ?? {}) };
  if (a.bdr || b.bdr) out.bdr = { ...(a.bdr ?? {}), ...(b.bdr ?? {}) };
  return out;
}

interface Style {
  based?: string;
  rpr: RunFmt;
  ppr: ParaFmt;
  /** สไตล์ตาราง: เส้นขอบ */
  tbl?: XNode;
}
type Ctx = { pb: boolean; fld: 0 | 1 | 2; instr: string; skip: boolean; tab: boolean };

/* ---------------------------------------------------------------- ตัวแปลง */

class Conv {
  stats: ImportStats = { paragraphs: 0, equations: 0, failedEq: 0, images: 0, droppedImages: 0 };
  styles = new Map<string, Style>();
  defRpr: RunFmt = {};
  defPpr: ParaFmt = {};
  defPara = '';
  defTable = '';
  /** ระยะแท็บตั้งต้น (px) จาก settings.xml */
  defTab = 48;
  theme = new Map<string, string>();
  rels = new Map<string, string>();
  /** numId -> (ระดับ -> ชนิดเลข) */
  nums = new Map<string, Map<string, string>>();
  /** สไตล์ย่อหน้าที่มาจากสไตล์ตารางรอบนอก (ใช้กับย่อหน้าในตาราง) */
  tblPpr: ParaFmt = {};
  /** ความสูง (pt) ของสมการ MathType บรรทัดเดียวที่ไม่มีเศษส่วน/ราก (ใช้เดาขนาดตัวอักษรสมการของทั้งไฟล์) */
  mtSizes: number[] = [];
  /** ความกว้างคอลัมน์ข้อความ (px) ใช้จัดรูปลอยแบบชิดกลาง/ขวา */
  colW = 624;
  constructor(
    public zip: JSZip,
    public addImage: AddImage
  ) {}

  styleRpr(id: string | undefined, depth = 0): RunFmt {
    const s = id ? this.styles.get(id) : undefined;
    if (!s || depth > 10) return {};
    return { ...this.styleRpr(s.based, depth + 1), ...s.rpr };
  }
  stylePpr(id: string | undefined, depth = 0): ParaFmt {
    const s = id ? this.styles.get(id) : undefined;
    if (!s || depth > 10) return {};
    return mergePpr(this.stylePpr(s.based, depth + 1), s.ppr);
  }
  styleTbl(id: string | undefined, depth = 0): XNode | undefined {
    const s = id ? this.styles.get(id) : undefined;
    if (!s || depth > 10) return undefined;
    return s.tbl ?? this.styleTbl(s.based, depth + 1);
  }

  async load(relsPath: string) {
    const th = await this.zip.file('word/theme/theme1.xml')?.async('string');
    if (th) {
      const cs = find(parseXml(th), 'a:clrScheme');
      for (const k of cs?.kids ?? []) {
        const c = k.kids[0];
        const hex = c?.attrs.val && c.tag === 'a:srgbClr' ? c.attrs.val : c?.attrs.lastClr;
        if (hex && HEX6.test(hex)) this.theme.set(k.tag.replace('a:', ''), hex);
      }
      // ชื่อเรียกแทนของ Word
      for (const [a, b] of [['tx1', 'dk1'], ['bg1', 'lt1'], ['tx2', 'dk2'], ['bg2', 'lt2']]) if (this.theme.has(b)) this.theme.set(a, this.theme.get(b)!);
    }
    const st = await this.zip.file('word/styles.xml')?.async('string');
    if (st) {
      const x = parseXml(st);
      this.defRpr = readRpr(find(find(x, 'w:rPrDefault'), 'w:rPr'));
      this.defPpr = readPpr(find(find(x, 'w:pPrDefault'), 'w:pPr'));
      for (const s of findAll(x, 'w:style')) {
        const id = s.attrs['w:styleId'];
        if (!id) continue;
        this.styles.set(id, { based: val(s, 'w:basedOn'), rpr: readRpr(kid(s, 'w:rPr')), ppr: readPpr(kid(s, 'w:pPr')), tbl: kid(s, 'w:tblPr') });
        if (s.attrs['w:default'] === '1' && s.attrs['w:type'] === 'paragraph') this.defPara = id;
        if (s.attrs['w:default'] === '1' && s.attrs['w:type'] === 'table') this.defTable = id;
      }
    }
    const se = await this.zip.file('word/settings.xml')?.async('string');
    const dt = se ? num(val(find(parseXml(se), 'w:settings'), 'w:defaultTabStop')) : undefined;
    if (dt && dt > 60) this.defTab = Math.round(dt / 15);
    await this.loadRels(relsPath);
    const nb = await this.zip.file('word/numbering.xml')?.async('string');
    if (nb) {
      const x = parseXml(nb);
      const abs = new Map<string, Map<string, string>>();
      for (const a of findAll(x, 'w:abstractNum')) {
        const lv = new Map<string, string>();
        for (const l of kidsOf(a, 'w:lvl')) lv.set(l.attrs['w:ilvl'] || '0', val(l, 'w:numFmt') || 'decimal');
        abs.set(a.attrs['w:abstractNumId'], lv);
      }
      for (const n of findAll(x, 'w:num')) {
        const lv = abs.get(val(n, 'w:abstractNumId') || '');
        if (lv) this.nums.set(n.attrs['w:numId'], lv);
      }
    }
  }
  async loadRels(path: string) {
    this.rels.clear();
    const r = await this.zip.file(path)?.async('string');
    if (!r) return;
    for (const x of findAll(parseXml(r), 'Relationship')) this.rels.set(x.attrs.Id, x.attrs.Target);
  }
  part(rid: string | undefined) {
    const t = rid ? this.rels.get(rid) : undefined;
    if (!t) return null;
    const p = t.startsWith('/') ? t.slice(1) : `word/${t}`.replace(/\/[^/]+\/\.\.\//g, '/');
    return this.zip.file(p);
  }

  /** ใส่รูป คืน src ('' = ใส่ไม่ได้) */
  async imageSrc(rid: string | undefined): Promise<string> {
    const f = this.part(rid);
    const m = f && /\.(png|jpe?g|gif|bmp|webp)$/i.exec(f.name);
    if (!f || !m) {
      this.stats.droppedImages++;
      return '';
    }
    const ext = m[1].toLowerCase();
    const src = await this.addImage(await f.async('uint8array'), `image/${ext === 'jpg' ? 'jpeg' : ext}`).catch(() => '');
    if (!src) {
      this.stats.droppedImages++;
      return '';
    }
    this.stats.images++;
    return src;
  }
  async image(rid: string | undefined, wPx?: number): Promise<string> {
    const src = await this.imageSrc(rid);
    if (!src) return '';
    const w = wPx && wPx > 4 ? Math.min(640, Math.round(wPx)) : 0;
    return `<img src="${escAttr(src)}"${w ? ` style="width: ${w}px"` : ''}>`;
  }

  async ole(obj: XNode): Promise<string> {
    const ole = find(obj, 'o:OLEObject');
    const prog = ole?.attrs.ProgID || '';
    if (/^Equation\./i.test(prog)) {
      const f = this.part(ole?.attrs['r:id']);
      const tex = f ? oleEquationTex(await f.async('uint8array')) : null;
      const st = find(obj, 'v:shape')?.attrs.style || '';
      const w = Number(/width:\s*([\d.]+)pt/.exec(st)?.[1] || 0);
      const h = Number(/height:\s*([\d.]+)pt/.exec(st)?.[1] || 0);
      // สมการเปล่า/ช่องว่าง (วัตถุเล็กมาก) แปลงไม่ได้ก็ไม่ต้องแสดงกล่อง ?
      if (!tex && w > 0 && w <= 12) return '';
      this.stats.equations++;
      if (!tex) this.stats.failedEq++;
      // ขนาดตัวอักษรของสมการเดาจากความสูงวัตถุ: บรรทัดเดียวไม่มีของสูง ≈ 1.08 เท่า, มีวงเล็บ ≈ 1.3 เท่า
      // สมการที่มีเศษส่วน/ราก/ยกกำลัง ใช้ค่ากลางของทั้งไฟล์ (@MT@)
      let size = '@MT@';
      if (tex && h > 0 && !/\\(frac|sqrt|left|sum|int|begin|overline|bar|hat|vec|binom|lim|prod)|[\^_]/.test(tex)) {
        const pt = /[()[\]]|\\[lr]vert/.test(tex) ? h / 1.3 : h / 1.08;
        if (!/[()[\]]|\\[lr]vert/.test(tex)) this.mtSizes.push(pt);
        size = `@MT:${r2(pt)}@`;
      }
      return `<span data-tex="${escAttr(tex || '\\boxed{?}')}"${w > 0 ? ` data-w="${Math.round(ptToPx(w))}"` : ''} style="font-size: ${size}"></span>`;
    }
    // วัตถุอื่น (Excel ฯลฯ) ใช้ภาพตัวอย่างถ้าเป็นรูปที่เปิดได้
    const im = find(obj, 'v:imagedata');
    return im ? this.image(im.attrs['r:id']) : '';
  }

  /** style ของช่วงตัวอักษร */
  runCss(text: string, f: RunFmt): string[] {
    const thai = THAI.test(text);
    // ไม่ระบุขนาดเลย = ใช้ขนาดตั้งต้นของเอกสาร
    const sz = (thai ? (f.szCs ?? f.sz) : (f.sz ?? f.szCs)) ?? 16;
    const font = thai ? (f.fontCs ?? f.font) : (f.font ?? f.fontCs);
    const st: string[] = [];
    // TH Sarabun = ฟอนต์ตั้งต้นของเอกสาร ไม่ต้องใส่ซ้ำทุกช่วง (ไฟล์ยาวจะได้ไม่เกินขนาดที่เก็บได้)
    if (font && /^[\w\s-]{1,40}$/.test(font) && !/^th sarabun/i.test(font)) st.push(`font-family: '${font}'`);
    if (Math.abs(sz - 16) > 0.01) st.push(`font-size: ${ptToPx(sz)}px`);
    // อักษรไทย (complex script) ใช้ตัวหนา/เอียงของ bCs/iCs แบบ Word
    if (thai ? (f.bCs ?? f.b) : (f.b ?? f.bCs)) st.push('font-weight: bold');
    if (thai ? (f.iCs ?? f.i) : (f.i ?? f.iCs)) st.push('font-style: italic');
    const dec = [f.u && 'underline', f.s && 'line-through'].filter(Boolean).join(' ');
    if (dec) st.push(`text-decoration: ${dec}`);
    if (f.color) st.push(`color: ${f.color}`);
    if (f.bg) st.push(`background-color: ${f.bg}`);
    return st;
  }
  /** รูปแบบสุดท้ายของตัวอักษรเป็น style + แท็ก */
  wrapRun(text: string, f: RunFmt): string {
    if (!text) return '';
    const st = this.runCss(text, f);
    let h = esc(text);
    if (st.length) h = `<span style="${st.join('; ')}">${h}</span>`;
    if (f.va) h = `<${f.va}>${h}</${f.va}>`;
    return h;
  }

  /** เนื้อในย่อหน้า (run, สมการ, ลิงก์ ...) */
  async inline(nodes: XNode[], base: RunFmt, after: string[], ctx: Ctx, para: ParaFmt): Promise<string> {
    let out = '';
    for (const n of nodes) {
      switch (n.tag) {
        case 'w:r': {
          const f = { ...base, ...this.styleRpr(val(kid(n, 'w:rPr'), 'w:rStyle')), ...readRpr(kid(n, 'w:rPr')) };
          let text = '';
          const flush = () => {
            if (!ctx.skip) out += this.wrapRun(text, f);
            text = '';
          };
          for (const k of n.kids) {
            if (k.tag === 'w:fldChar') {
              // ฟิลด์ของ Word: begin > คำสั่ง > separate > ผลที่บันทึกไว้ > end (ช่อง PAGE = เลขหน้าจริงของแต่ละหน้า)
              flush();
              const t = k.attrs['w:fldCharType'];
              if (t === 'begin') {
                ctx.fld = 1;
                ctx.instr = '';
              } else if (t === 'separate') {
                ctx.fld = 2;
                if (/^\s*PAGE\b/i.test(ctx.instr)) {
                  const st = this.runCss('1', f);
                  out += st.length ? PAGE_FIELD.replace('contenteditable', `style="${st.join('; ')}" contenteditable`) : PAGE_FIELD;
                  ctx.skip = true;
                }
              } else if (t === 'end') {
                ctx.fld = 0;
                ctx.skip = false;
              }
            } else if (k.tag === 'w:instrText') ctx.instr += k.text;
            else if (ctx.fld === 1) continue;
            else if (k.tag === 'w:t') text += k.text;
            else if (k.tag === 'w:tab' || k.tag === 'w:ptab') {
              flush();
              if (!ctx.skip) out += '<span data-tab="1"></span>';
              ctx.tab = true;
            } else if (k.tag === 'w:noBreakHyphen') text += '-';
            else if (k.tag === 'w:sym') {
              const code = parseInt(k.attrs['w:char'] || '', 16);
              const ch = SYMBOL_FONT[code & 0xff];
              if (ch && /symbol/i.test(k.attrs['w:font'] || 'Symbol')) text += ch;
            } else if (k.tag === 'w:br' || k.tag === 'w:cr') {
              flush();
              if (k.attrs['w:type'] === 'page') ctx.pb = true;
              else if (!ctx.skip) out += '<br>';
            } else if (k.tag === 'w:drawing' || k.tag === 'w:pict' || k.tag === 'mc:AlternateContent') {
              flush();
              out += await this.drawing(k, after, para);
            } else if (k.tag === 'w:object') {
              flush();
              out += await this.ole(k);
            }
          }
          flush();
          break;
        }
        case 'm:oMath':
        case 'm:oMathPara': {
          const tex = ommlToTex(n);
          this.stats.equations++;
          if (tex) out += `<span data-tex="${escAttr(tex)}"></span>`;
          break;
        }
        case 'w:fldSimple': {
          if (/^\s*PAGE\b/i.test(n.attrs['w:instr'] || '')) out += PAGE_FIELD;
          else out += await this.inline(n.kids, base, after, ctx, para);
          break;
        }
        case 'w:hyperlink':
        case 'w:ins':
        case 'w:smartTag':
        case 'w:customXml':
        case 'w:bdo':
        case 'w:dir':
          out += await this.inline(n.kids, base, after, ctx, para);
          break;
        case 'w:sdt':
          out += await this.inline(kid(n, 'w:sdtContent')?.kids ?? [], base, after, ctx, para);
          break;
      }
    }
    // ช่วงติดกันที่สไตล์เดียวกันรวมเป็นช่วงเดียว
    for (let prev = ''; prev !== out; ) {
      prev = out;
      out = out.replace(/(<span style="([^"]*)">[^<]*)<\/span><span style="\2">/g, '$1');
    }
    return out;
  }

  /** ตำแหน่ง (px) ของรูป/รูปร่างที่ลอยอยู่ เทียบกับกล่องย่อหน้าที่ยึด */
  anchorPos(a: XNode, w: number, para: ParaFmt): { x: number; y: number } {
    const ph = kid(a, 'wp:positionH');
    const pv = kid(a, 'wp:positionV');
    const left = para.left ?? 0;
    let x = emu(kid(ph, 'wp:posOffset')?.text);
    const al = kid(ph, 'wp:align')?.text;
    if (al === 'center') x = (this.colW - w) / 2;
    else if (al === 'right' || al === 'outside') x = this.colW - w;
    else if (al) x = 0;
    const fromH = ph?.attrs.relativeFrom || 'column';
    // page / leftMargin: นับจากขอบกระดาษ (ขอบซ้ายของคอลัมน์ = ระยะขอบซ้าย ~96px)
    if (fromH === 'page' || fromH === 'leftMargin') x -= 96;
    if (fromH !== 'character') x -= left;
    let y = emu(kid(pv, 'wp:posOffset')?.text);
    if (kid(pv, 'wp:align')) y = 0;
    return { x: Math.round(x), y: Math.round(y) };
  }

  /** รูป (DrawingML / VML) รูปร่าง และกล่องข้อความ (ย้ายเนื้อหาไปเป็นย่อหน้าต่อท้าย) */
  async drawing(n: XNode, after: string[], para: ParaFmt): Promise<string> {
    const alt = n.tag === 'mc:AlternateContent' ? (kid(n, 'mc:Choice') ?? kid(n, 'mc:Fallback')) : n;
    const anchor = find(alt, 'wp:anchor');
    const ext = find(alt, 'wp:extent');
    const cx = emu(ext?.attrs.cx);
    const cy = emu(ext?.attrs.cy);
    let html = '';
    const wsp = find(alt, 'wps:wsp');
    if (wsp) {
      // รูปร่างของ Word: สี่เหลี่ยม/วงรี ฯลฯ ใช้รูปร่างแบบยึดกับย่อหน้าของเรา
      const sp = kid(wsp, 'wps:spPr');
      const style = kid(wsp, 'wps:style');
      const geom = find(sp, 'a:prstGeom')?.attrs.prst || 'rect';
      const shape = GEOM[geom];
      const fillRef = num(kid(style, 'a:fillRef')?.attrs.idx) ?? 0;
      const lnRef = num(kid(style, 'a:lnRef')?.attrs.idx) ?? 0;
      const fill = kid(sp, 'a:noFill') ? 'none' : (drawColor(kid(sp, 'a:solidFill'), this.theme) ?? (fillRef > 0 && !kid(sp, 'a:gradFill') ? drawColor(kid(style, 'a:fillRef'), this.theme) : undefined) ?? (kid(sp, 'a:gradFill') ? drawColor(find(sp, 'a:gs'), this.theme) : 'none'));
      const ln = kid(sp, 'a:ln');
      const lnNone = !!kid(ln, 'a:noFill') || (!ln && !lnRef);
      const stroke = lnNone ? 'none' : (drawColor(kid(ln, 'a:solidFill'), this.theme) ?? drawColor(kid(style, 'a:lnRef'), this.theme) ?? '#000000');
      const sw = lnNone ? 0 : Math.max(1, Math.min(24, Math.round(emu(ln?.attrs.w) || (lnRef >= 3 ? 2 : 1))));
      if (shape && cx > 0 && cy > 0 && (fill !== 'none' || stroke !== 'none')) {
        const ar = Math.max(0.02, Math.min(60, cx / cy));
        const wrap = anchor ? (anchor.attrs.behindDoc === '1' ? 'behind' : 'front') : '';
        const pos = anchor ? this.anchorPos(anchor, cx, para) : null;
        const st = [`width: ${Math.min(2000, cx)}px`, ...(pos ? [`left: ${pos.x}px`, `top: ${pos.y}px`] : [])];
        html = `<span data-shape="${shape}" data-fill="${fill}" data-stroke="${stroke}" data-sw="${sw}" data-ar="${r2(ar)}"${wrap ? ` data-wrap="${wrap}"` : ''} style="${st.join('; ')}"></span>`;
      }
      const tx = find(wsp, 'w:txbxContent');
      if (tx) after.push(await this.blocks(tx.kids));
      return html;
    }
    const tx = find(alt, 'w:txbxContent');
    if (tx) {
      after.push(await this.blocks(tx.kids));
      return '';
    }
    const blip = find(alt, 'a:blip');
    if (blip) {
      if (anchor && cx > 0 && !find(alt, 'wpg:wgp') && !find(alt, 'wpc:wpc')) {
        // รูปลอย: วางตำแหน่งเดิมเทียบกับย่อหน้า (ไม่ดันข้อความ)
        const src = await this.imageSrc(blip.attrs['r:embed']);
        if (!src) return '';
        const pos = this.anchorPos(anchor, cx, para);
        const wrap = anchor.attrs.behindDoc === '1' ? 'behind' : 'front';
        return `<img src="${escAttr(src)}" data-wrap="${wrap}" data-rel="p" style="width: ${Math.min(2000, cx)}px; left: ${pos.x}px; top: ${pos.y}px">`;
      }
      return this.image(blip.attrs['r:embed'], cx > 0 ? cx : undefined);
    }
    const im = find(alt, 'v:imagedata');
    if (im) {
      const w = /width:\s*([\d.]+)pt/.exec(find(alt, 'v:shape')?.attrs.style || '');
      return this.image(im.attrs['r:id'], w ? ptToPx(+w[1]) : undefined);
    }
    return '';
  }

  async para(p: XNode): Promise<{ html: string; num?: { id: string; lvl: number; fmt: string } }> {
    this.stats.paragraphs++;
    const ppr = kid(p, 'w:pPr');
    const sid = val(ppr, 'w:pStyle') || this.defPara;
    const pf = mergePpr(mergePpr(mergePpr(this.defPpr, this.tblPpr), this.stylePpr(sid)), readPpr(ppr));
    const base = { ...this.defRpr, ...this.styleRpr(sid), ...readRpr(kid(ppr, 'w:rPr')) };
    // เครื่องหมายย่อหน้าไม่ใช่ตัวอักษรจริง ใช้แค่สีหรือขนาดของย่อหน้าว่าง
    const after: string[] = [];
    const ctx: Ctx = { pb: false, fld: 0, instr: '', skip: false, tab: false };
    let body = await this.inline(
      p.kids.filter((k) => k.tag !== 'w:pPr'),
      { ...this.defRpr, ...this.styleRpr(sid) },
      after,
      ctx,
      pf
    );
    const st: string[] = [];
    const numPr = kid(ppr, 'w:numPr');
    const jc = pf.jc;
    if (jc === 'center') st.push('text-align: center');
    else if (jc === 'right' || jc === 'end') st.push('text-align: right');
    else if (jc === 'both' || jc === 'distribute') st.push('text-align: justify');
    else if (!jc && p.kids.length === 2 && kid(p, 'm:oMathPara')) st.push('text-align: center');
    if (!numPr) {
      const left = Math.max(-200, Math.min(600, pf.left ?? 0));
      if (left) st.push(`margin-left: ${left}px`);
      if (pf.first) st.push(`text-indent: ${pf.first}px`);
    }
    if (pf.before && pf.before > 0) st.push(`padding-top: ${pf.before}px`);
    if (pf.after && pf.after > 0) st.push(`padding-bottom: ${pf.after}px`);
    if (pf.line && pf.rule === 'auto' && Math.abs(pf.line - 240) > 6) st.push(`line-height: ${((pf.line / 240) * WORD_SINGLE).toFixed(2)}`);
    else if (pf.line && pf.rule === 'exact') st.push(`line-height: ${Math.round(pf.line / 15)}px`);
    if (pf.shd) st.push(`background-color: ${pf.shd}`);
    for (const s of ['top', 'bottom', 'left', 'right'] as const) {
      const b = pf.bdr?.[s];
      if (b && !b.none) st.push(`border-${s}: ${borderCss(b)}`);
    }
    if (!body) {
      // ย่อหน้าว่าง: คงขนาดตัวอักษร (ความสูงบรรทัด) ของย่อหน้า
      const sz = base.szCs ?? base.sz;
      body = sz && Math.abs(sz - 16) > 0.01 ? `<span style="font-size: ${ptToPx(sz)}px"><br></span>` : '<br>';
    }
    let attrs = st.length ? ` style="${st.join('; ')}"` : '';
    if (ctx.tab) {
      // ตำแหน่งหยุดแท็บ (px จากขอบซ้ายของคอลัมน์) + จุดหยุดที่ระยะเยื้องของย่อหน้าแบบแขวน
      const stops = Object.entries(pf.tabs ?? {})
        .filter(([, k]) => k)
        .map(([pos, k]) => [Math.round(+pos / 15), k] as const);
      if ((pf.first ?? 0) < 0 && pf.left && !stops.some(([x]) => x === pf.left)) stops.push([pf.left, 'l']);
      stops.sort((a, b) => a[0] - b[0]);
      const tabs = stops.slice(0, 20).map(([x, k]) => `${k}${x}`);
      if (this.defTab !== 48) tabs.push(`d${this.defTab}`);
      if (tabs.length) attrs += ` data-tabs="${tabs.join(' ')}"`;
    }
    let html = `<p${attrs}>${body}</p>`;
    if (pf.pbb) html = `<div data-pb="1"></div>${html}`;
    if (ctx.pb || kid(ppr, 'w:sectPr')) html = `${html}<div data-pb="1"></div>`;
    html += after.join('');
    const numId = val(numPr, 'w:numId');
    if (numPr && numId && numId !== '0') {
      const lvl = Number(val(numPr, 'w:ilvl') || 0);
      return { html, num: { id: numId, lvl, fmt: this.nums.get(numId)?.get(String(lvl)) || 'decimal' } };
    }
    return { html };
  }

  async table(t: XNode): Promise<string> {
    const tpr = kid(t, 'w:tblPr');
    const sid = val(tpr, 'w:tblStyle') || this.defTable;
    // เส้นขอบ: ของตาราง > สไตล์ตาราง (ไม่มีทั้งคู่ = ไม่มีเส้นแบบ Word "Normal Table")
    const tb = kid(tpr, 'w:tblBorders');
    const sb = kid(this.styleTbl(sid), 'w:tblBorders');
    const side = (s: string) => readBorder(kid(tb, `w:${s}`)) ?? readBorder(kid(sb, `w:${s}`)) ?? { w: 0, color: '', none: true };
    const tbB = { top: side('top'), bottom: side('bottom'), left: readBorder(kid(tb, 'w:left')) ?? readBorder(kid(tb, 'w:start')) ?? side('left'), right: side('right'), insideH: side('insideH'), insideV: side('insideV') };
    const grid = kidsOf(kid(t, 'w:tblGrid'), 'w:gridCol').map((g) => twip(g.attrs['w:w']));
    const rows = kidsOf(t, 'w:tr').map((tr) => {
      let col = 0;
      return kidsOf(tr, 'w:tc').map((tc) => {
        const pr = kid(tc, 'w:tcPr');
        const span = Math.max(1, Number(val(pr, 'w:gridSpan')) || 1);
        const vm = kid(pr, 'w:vMerge');
        const cell = { tc, col, span, vm: vm ? (vm.attrs['w:val'] === 'restart' ? 'restart' : 'cont') : '' };
        col += span;
        return cell;
      });
    });
    const ncol = Math.max(grid.length, ...rows.map((r) => r.reduce((a, c) => a + c.span, 0)));
    const saved = this.tblPpr;
    this.tblPpr = this.stylePpr(sid);
    const total = grid.reduce((a, b) => a + b, 0);
    let out = `<table${total > 40 && total < 2000 ? ` style="width: ${total}px"` : ''}><tbody>`;
    for (let r = 0; r < rows.length; r++) {
      out += '<tr>';
      for (const c of rows[r]) {
        if (c.vm === 'cont') continue;
        let rs = 1;
        if (c.vm === 'restart') while (rows[r + rs]?.some((x) => x.col === c.col && x.vm === 'cont')) rs++;
        const pr = kid(c.tc, 'w:tcPr');
        const cb = kid(pr, 'w:tcBorders');
        const edge = (s: 'top' | 'bottom' | 'left' | 'right') => {
          const own = readBorder(kid(cb, `w:${s}`)) ?? (s === 'left' ? readBorder(kid(cb, 'w:start')) : s === 'right' ? readBorder(kid(cb, 'w:end')) : undefined);
          if (own) return own;
          const outer = s === 'top' ? r === 0 : s === 'bottom' ? r + rs >= rows.length : s === 'left' ? c.col === 0 : c.col + c.span >= ncol;
          return outer ? tbB[s] : s === 'top' || s === 'bottom' ? tbB.insideH : tbB.insideV;
        };
        const e = { top: borderCss(edge('top')), right: borderCss(edge('right')), bottom: borderCss(edge('bottom')), left: borderCss(edge('left')) };
        const st: string[] = ['padding: 0px 7px'];
        if (e.top === e.right && e.top === e.bottom && e.top === e.left) st.push(`border: ${e.top}`);
        else for (const s of ['top', 'right', 'bottom', 'left'] as const) st.push(`border-${s}: ${e[s]}`);
        const w = r === 0 ? grid.slice(c.col, c.col + c.span).reduce((a, b) => a + b, 0) : 0;
        if (w > 0) st.push(`width: ${w}px`);
        const fill = kid(pr, 'w:shd')?.attrs['w:fill'];
        if (fill && HEX6.test(fill) && fill.toLowerCase() !== 'ffffff') st.push(`background-color: #${fill.toLowerCase()}`);
        const va = val(pr, 'w:vAlign');
        if (va === 'center' || va === 'bottom') st.push(`vertical-align: ${va === 'center' ? 'middle' : 'bottom'}`);
        const inner = await this.blocks(c.tc.kids.filter((k) => k.tag !== 'w:tcPr'));
        out += `<td style="${st.join('; ')}"${c.span > 1 ? ` colspan="${Math.min(c.span, 99)}"` : ''}${rs > 1 ? ` rowspan="${Math.min(rs, 99)}"` : ''}>${inner || '<p><br></p>'}</td>`;
      }
      out += '</tr>';
    }
    this.tblPpr = saved;
    return out + '</tbody></table>';
  }

  /** ลำดับบล็อก (ย่อหน้า ตาราง) รวมย่อหน้าที่เป็นรายการต่อกันเป็น ul/ol */
  async blocks(nodes: XNode[]): Promise<string> {
    let out = '';
    let list: { id: string; tag: string; items: string[] } | null = null;
    const close = () => {
      if (list) out += `<${list.tag}>${list.items.join('')}</${list.tag}>`;
      list = null;
    };
    for (const n of nodes) {
      if (n.tag === 'w:p') {
        const p = await this.para(n);
        if (p.num) {
          const tag = p.num.fmt === 'bullet' ? 'ul' : 'ol';
          if (!list || list.id !== p.num.id || list.tag !== tag) {
            close();
            list = { id: p.num.id, tag, items: [] };
          }
          const pad = p.num.lvl > 0 ? ` style="margin-left: ${p.num.lvl * 32}px${p.num.fmt === 'thaiNumbers' ? '; list-style-type: thai' : ''}"` : p.num.fmt === 'thaiNumbers' ? ' style="list-style-type: thai"' : '';
          const inner = p.html.replace(/^(<div data-pb="1"><\/div>)?<p[^>]*>/, '').replace(/<\/p>([\s\S]*)$/, '');
          const rest = /<\/p>([\s\S]*)$/.exec(p.html)?.[1] ?? '';
          (list as { items: string[] }).items.push(`<li${pad}>${inner}</li>`);
          if (rest) {
            close();
            out += rest;
          }
          continue;
        }
        close();
        out += p.html;
      } else if (n.tag === 'w:tbl') {
        close();
        out += await this.table(n);
      } else if (n.tag === 'w:sdt') {
        close();
        out += await this.blocks(kid(n, 'w:sdtContent')?.kids ?? []);
      } else if (n.tag === 'w:customXml' || n.tag === 'w:ins') {
        close();
        out += await this.blocks(n.kids);
      } else if (n.tag === 'm:oMathPara') {
        close();
        const tex = ommlToTex(n);
        this.stats.equations++;
        out += `<p style="text-align: center"><span data-tex="${escAttr(tex)}"></span></p>`;
      }
    }
    close();
    return out;
  }

  /** หัว/ท้ายกระดาษแบบ default ของ section สุดท้าย */
  async headFoot(sect: XNode | undefined, tag: 'w:headerReference' | 'w:footerReference'): Promise<string> {
    const ref = kidsOf(sect, tag).find((x) => (x.attrs['w:type'] || 'default') === 'default');
    const f = this.part(ref?.attrs['r:id']);
    if (!f) return '';
    const x = parseXml(await f.async('string'));
    const root = find(x, tag === 'w:headerReference' ? 'w:hdr' : 'w:ftr');
    const saved = new Map(this.rels);
    await this.loadRels(f.name.replace(/([^/]+)$/, '_rels/$1.rels'));
    const html = root ? await this.blocks(root.kids) : '';
    this.rels = saved;
    // หัวกระดาษไม่มีระยะหลังย่อหน้า (ไม่ดันเนื้อหา)
    return html.replace(/^(<p><br><\/p>)+|(<p><br><\/p>)+$/g, '');
  }

  /** ขนาดตัวอักษรสมการ MathType ของทั้งไฟล์ (ค่ากลางของสมการบรรทัดเดียว) */
  mtPt(): number {
    const s = [...this.mtSizes].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : 12;
  }
}

/** ขนาด HTML สูงสุดที่นำเข้า (ตัวกรองรับ 400,000 ตัว และสื่อทั้งชิ้นเก็บได้ไม่เกิน 900KB) */
export const MAX_IMPORT = process.env.NEXT_PUBLIC_L5G_APP ? 24_000_000 : 330_000;

/** ตัดเนื้อหาที่ยาวเกินที่รอยต่อบล็อกชั้นนอกสุด (ไม่ตัดกลางแท็ก/ตาราง/รายการ) */
export function cutBlocks(html: string, max: number): string {
  if (html.length <= max) return html;
  const re = /<(\/?)(table|ul|ol)\b[^>]*>|<\/p>|<div data-pb="1"><\/div>/g;
  let depth = 0;
  let cut = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && re.lastIndex <= max) {
    if (m[2]) depth += m[1] ? -1 : 1;
    if (depth === 0) cut = re.lastIndex;
  }
  return html.slice(0, cut);
}

/** แปลงไฟล์ .docx เป็นเนื้อหาโหมดเอกสาร */
export async function docxToFlow(data: ArrayBuffer | Uint8Array, addImage: AddImage): Promise<ImportResult> {
  const zip = await JSZip.loadAsync(data);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('not-docx');
  const c = new Conv(zip, addImage);
  await c.load('word/_rels/document.xml.rels');
  const doc = parseXml(await docFile.async('string'));
  const body = find(doc, 'w:body');
  if (!body) throw new Error('not-docx');
  const sect = kid(body, 'w:sectPr');
  const mar = kid(sect, 'w:pgMar');
  const margins = mar ? { mt: twip(mar.attrs['w:top']), mb: twip(mar.attrs['w:bottom']), ml: twip(mar.attrs['w:left'] ?? mar.attrs['w:start']), mr: twip(mar.attrs['w:right'] ?? mar.attrs['w:end']) } : undefined;
  const pw = twip(kid(sect, 'w:pgSz')?.attrs['w:w']) || 794;
  if (margins) c.colW = Math.max(200, pw - margins.ml - margins.mr);
  const all = await c.blocks(body.kids);
  const head = await c.headFoot(sect, 'w:headerReference');
  const foot = await c.headFoot(sect, 'w:footerReference');
  // ขนาดสมการ: ค่ากลางของทั้งไฟล์ ยกเว้นสมการที่ใหญ่กว่าค่ากลางเกิน 20% (เช่นสมการในหัวข้อตัวใหญ่) ใช้ขนาดของตัวเอง
  const mid = c.mtPt();
  const px = (pt: number) => `${ptToPx(Math.max(8, Math.min(28, pt)))}px`;
  const fix = (h: string) => h.replace(/@MT@/g, px(mid)).replace(/@MT:([\d.]+)@/g, (_, v: string) => px(+v > mid * 1.2 ? +v : mid));
  const html = cutBlocks(fix(all), MAX_IMPORT);
  c.stats.truncated = html.length < fix(all).length;
  return { html, head: fix(head), foot: fix(foot), margins, stats: c.stats };
}
