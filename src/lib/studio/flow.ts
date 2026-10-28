/**
 * โหมดเอกสาร (แบบ Word): เนื้อหาไหลต่อเนื่องเป็น HTML ที่จำกัดแท็ก/สไตล์ ตัดหน้าให้เองตามขนาดกระดาษ
 * ตัวกรอง HTML เขียนเองแบบรายการอนุญาต (สื่อ Public คนอื่นเปิดดูได้ ห้ามมีสคริปต์/ลิงก์/รูปนอกที่เก็บของเรา)
 * ไม่มี DOM ในส่วนตัวกรอง (ทดสอบได้ใน selftest)
 */
import { cleanGraph } from './graph';

/** ขอบกระดาษรุ่นแรก (px ที่ 96 dpi) ใช้กับเอกสารเก่าที่ยังไม่มีค่าตั้งหน้า และช่องว่างระหว่างแผ่นในจอแก้ไข */
export const FLOW_MARGIN = { x: 76, y: 72 };
export const FLOW_GAP = 28;
/** บรรทัดเดี่ยวของ Word กับฟอนต์ TH Sarabun 16pt สูง 21pt (วัดจาก Word จริง) = 1.31 เท่าของขนาดตัวอักษร */
export const WORD_SINGLE = 1.31;
/** ความยาว HTML สูงสุดของเนื้อหา: เว็บเก็บรูปเป็นลิงก์ (ฐานข้อมูลรับสื่อไม่เกิน 900KB) แอปออฟไลน์ฝังรูปเป็น data URL ในไฟล์ จึงยาวกว่ามาก */
export const FLOW_MAX = process.env.NEXT_PUBLIC_L5G_APP ? 25_000_000 : 400_000;

/**
 * ตั้งค่าหน้ากระดาษแบบ Word: ระยะขอบ หัว/ท้ายกระดาษ เลขหน้า
 * std = เอกสารใหม่ใช้ค่ามาตรฐาน Word (ขอบ 1 นิ้ว, TH Sarabun, ระยะบรรทัดเดี่ยว) ส่วนเอกสารเก่าคงหน้าตาเดิม
 */
export interface WordOpt {
  std: boolean;
  mt: number;
  mb: number;
  ml: number;
  mr: number;
  /** หัว/ท้ายกระดาษเป็นเนื้อหาแบบเดียวกับเอกสาร (ข้อความ รูป สมการ) ซ้ำทุกหน้า */
  head: string;
  foot: string;
  num: 'none' | 'top' | 'bottom';
  numAlign: 'left' | 'center' | 'right';
  numFmt: 'n' | 'thai' | 'page' | 'of';
  numStart: number;
  /** แสดงเลขหน้า/หัวท้ายกระดาษที่หน้าแรกด้วย (Word: หน้าแรกแตกต่าง) */
  numFirst: boolean;
}
export const NUM_FMTS: { id: WordOpt['numFmt']; label: string }[] = [
  { id: 'n', label: '1' },
  { id: 'thai', label: '๑' },
  { id: 'page', label: 'หน้า 1' },
  { id: 'of', label: 'หน้า 1 จาก 5' },
];
/** ระยะขอบสำเร็จรูปแบบ Word (px) */
export const MARGIN_PRESETS: { id: string; label: string; m: [number, number, number, number] }[] = [
  { id: 'normal', label: 'ปกติ (2.54 ซม.)', m: [96, 96, 96, 96] },
  { id: 'narrow', label: 'แคบ (1.27 ซม.)', m: [48, 48, 48, 48] },
  { id: 'moderate', label: 'ปานกลาง', m: [96, 96, 72, 72] },
  { id: 'wide', label: 'กว้าง', m: [96, 96, 192, 192] },
  { id: 'thai', label: 'หนังสือราชการ (บน 2.5 ซ้าย 3 ขวา 2 ซม.)', m: [94, 76, 113, 76] },
];
export const defaultWordOpt = (std = true): WordOpt => ({
  std,
  ...(std ? { mt: 96, mb: 96, ml: 96, mr: 96 } : { mt: FLOW_MARGIN.y, mb: FLOW_MARGIN.y, ml: FLOW_MARGIN.x, mr: FLOW_MARGIN.x }),
  head: '',
  foot: '',
  num: 'none',
  numAlign: 'center',
  numFmt: 'n',
  numStart: 1,
  numFirst: true,
});
const pickS = <T extends string>(v: unknown, ok: readonly T[], d: T): T => (ok.includes(v as T) ? (v as T) : d);
/** ค่าที่ไม่มี (เอกสารเก่า) = ค่ารุ่นแรก ไม่ให้หน้าตาเอกสารเดิมเปลี่ยน · src = ตัวตรวจรูป (ไม่ส่ง = ไม่รับรูป) */
export function cleanWordOpt(raw: unknown, src: SrcCheck = () => ''): WordOpt {
  const hf = (v: unknown) => (typeof v === 'string' && v ? cleanFlowHtml(v.slice(0, 40_000), src) : '');
  if (!raw || typeof raw !== 'object') return defaultWordOpt(false);
  const r = raw as Record<string, unknown>;
  const d = defaultWordOpt(r.std === true);
  const m = (v: unknown, def: number) => (typeof v === 'number' && isFinite(v) ? Math.round(Math.max(0, Math.min(300, v))) : def);
  const st = Number(r.numStart);
  return {
    std: d.std,
    mt: m(r.mt, d.mt),
    mb: m(r.mb, d.mb),
    ml: m(r.ml, d.ml),
    mr: m(r.mr, d.mr),
    head: hf(r.head),
    foot: hf(r.foot),
    num: pickS(r.num, ['none', 'top', 'bottom'] as const, 'none'),
    numAlign: pickS(r.numAlign, ['left', 'center', 'right'] as const, 'center'),
    numFmt: pickS(r.numFmt, ['n', 'thai', 'page', 'of'] as const, 'n'),
    numStart: Number.isInteger(st) ? Math.max(0, Math.min(9999, st)) : 1,
    numFirst: r.numFirst !== false,
  };
}
const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';
/** ข้อความเลขหน้าของหน้าที่ i (เริ่ม 0) จากทั้งหมด total หน้า */
export function pageLabel(o: WordOpt, i: number, total: number): string {
  const n = o.numStart + i;
  const last = o.numStart + total - 1;
  if (o.numFmt === 'thai') return String(n).replace(/\d/g, (c) => THAI_DIGITS[+c]);
  if (o.numFmt === 'page') return `หน้า ${n}`;
  if (o.numFmt === 'of') return `หน้า ${n} จาก ${last}`;
  return String(n);
}
/** ช่องเลขหน้าในหัว/ท้ายกระดาษ (แบบฟิลด์ PAGE ของ Word) ตัวเลขจริงใส่ตอนวาดแต่ละหน้า */
export const PAGE_FIELD = '<span data-pg="1" contenteditable="false">#</span>';
export const hasPageField = (html: string) => html.includes('data-pg=');
/** เลขหน้าที่เลือกจากเมนู ย้ายเข้าไปเป็นช่องในหัว/ท้ายกระดาษ จะได้พิมพ์ข้อความต่อกันได้ */
export function withPageField(o: WordOpt, part: 'head' | 'foot'): string {
  const html = o[part];
  if (o.num !== (part === 'head' ? 'top' : 'bottom') || hasPageField(html)) return html;
  return html + `<p style="text-align: ${o.numAlign}">${PAGE_FIELD}</p>`;
}
/** เอาช่องเลขหน้าออก (เปลี่ยนตำแหน่ง/ไม่ใส่เลขหน้า) */
export const stripPageField = (html: string) => html.replace(/<span data-pg="1"[^>]*>[^<]*<\/span>/g, '').replace(/<p[^>]*>(\s|<br>)*<\/p>/g, '');

/** รูปร่างแบบ Word (วาดลงหน้ากระดาษ): สีพื้น/เส้นเป็น #hex เท่านั้น */
const SHAPE_ID = /^[a-z0-9]{1,16}$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

const TAGS = new Set(['p', 'div', 'br', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup', 'span', 'font', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr', 'img', 'figure', 'blockquote']);
const VOID = new Set(['br', 'hr', 'img']);
const STYLE_PROPS = new Set(['color', 'background-color', 'font-size', 'font-family', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line', 'text-align', 'line-height', 'margin-left', 'padding-left', 'width', 'vertical-align', 'left', 'top', 'list-style-type', 'text-indent', 'padding', 'padding-top', 'padding-bottom', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left']);
/** การจัดวางรูป/กราฟกับข้อความ (แบบ Word): ล้อมซ้าย/ขวา, หลังข้อความ, หน้าข้อความ (ไม่มี = อยู่ในบรรทัด) */
export const WRAPS = ['left', 'right', 'behind', 'front'] as const;

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** ชื่อฟอนต์ (จากเอกสารรุ่นก่อน/วางจาก Word) ที่รู้จัก แปลงเป็น var(--sf-<id>) ที่ไม่ผูกกับ build */
const KNOWN_FONTS: Record<string, string> = {
  'th sarabunpsk': 'thsarabun',
  'th sarabun new': 'thsarabun',
  'th sarabun psk': 'thsarabun',
  'angsana new': 'angsana',
  angsanaupc: 'angsana',
  sarabun: 'sarabun',
  kanit: 'kanit',
  prompt: 'prompt',
  mitr: 'mitr',
  'noto sans thai': 'noto',
  itim: 'itim',
  mali: 'mali',
  sriracha: 'sriracha',
  chonburi: 'chonburi',
  charm: 'charm',
  pattaya: 'pattaya',
  'chakra petch': 'chakra',
};
export function stableFont(val: string): string {
  if (/^var\(--sf-[a-z]+\)$/.test(val)) return val;
  const first = val.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  // ชื่อจาก next/font เช่น __Chakra_Petch_1a2b3c
  const name = (/^__(.+?)_(Fallback_)?[0-9a-f]{4,}$/i.exec(first)?.[1] ?? first).replace(/_/g, ' ').toLowerCase();
  const id = KNOWN_FONTS[name];
  return id ? `var(--sf-${id})` : val;
}

function cleanStyle(v: string): string {
  const out: string[] = [];
  for (const decl of v.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    let val = decl.slice(i + 1).trim();
    if (prop === 'font-family') val = stableFont(val);
    if (!STYLE_PROPS.has(prop) || !val || val.length > 120) continue;
    // ห้าม url() / expression / ตัวอักษรแปลก
    if (/url|expression|javascript|@|\\|[<>{}]/i.test(val)) continue;
    if (!/^[#\w\s.,%()'"-]+$/.test(val)) continue;
    out.push(`${prop}: ${val}`);
  }
  return out.join('; ');
}

/** รูปในโหมดเอกสาร: เฉพาะไฟล์ในที่เก็บของเรา หรือ data:image ขนาดเล็ก (ส่งตัวตรวจเข้ามาจาก doc.ts) */
export type SrcCheck = (v: string) => string;

/** ทำความสะอาด HTML ของโหมดเอกสาร: เก็บเฉพาะแท็ก/แอตทริบิวต์ที่อนุญาต ข้อความทั้งหมดถูก escape */
export function cleanFlowHtml(html: string, cleanSrc: SrcCheck): string {
  const src = String(html || '').slice(0, FLOW_MAX);
  const out: string[] = [];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>|([^<]+)|(<)/g;
  let m: RegExpExecArray | null;
  // แท็กที่ห้ามและเนื้อหาข้างในทิ้งทั้งก้อน (นับชั้นแท็กชื่อเดียวกันที่ซ้อนอยู่ข้างใน)
  let skip: string | null = null;
  let depth = 0;
  const startSkip = (t: string) => {
    skip = t;
    depth = 1;
  };
  while ((m = re.exec(src))) {
    if (m[5]) {
      if (!skip) out.push('&lt;');
      continue;
    }
    if (m[4] !== undefined) {
      // ช่องว่างไร้ความกว้าง (ตัวช่วยเคอร์เซอร์ตอนตั้งขนาดตัวอักษร) ไม่ต้องเก็บ
      if (!skip) out.push(m[4].replace(/>/g, '&gt;').replace(/\u200b/g, ''));
      continue;
    }
    if (!m[2]) continue;
    const close = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (skip) {
      if (tag === skip && !VOID.has(tag)) depth += close ? -1 : 1;
      if (depth <= 0) skip = null;
      continue;
    }
    if (tag === 'script' || tag === 'style' || tag === 'textarea' || tag === 'iframe' || tag === 'object' || tag === 'svg' || tag === 'math') {
      if (!close) startSkip(tag);
      continue;
    }
    if (!TAGS.has(tag)) continue;
    if (close) {
      if (!VOID.has(tag)) out.push(`</${tag}>`);
      continue;
    }
    const attrs: string[] = [];
    const ar = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let a: RegExpExecArray | null;
    let tex = '';
    let pg = false;
    let tab = false;
    let dw = '';
    let graph = '';
    const shape: string[] = [];
    while ((a = ar.exec(m[3] || ''))) {
      const name = a[1].toLowerCase();
      const val = decode(a[2] ?? a[3] ?? a[4] ?? '');
      if (name === 'style') {
        const st = cleanStyle(val);
        if (st) attrs.push(`style="${escAttr(st)}"`);
      } else if (name === 'data-tex' && tag === 'span') {
        tex = val.slice(0, 2000);
      } else if (name === 'data-pg' && tag === 'span') {
        pg = true;
      } else if (name === 'data-w' && tag === 'span' && /^\d{1,4}$/.test(val)) {
        dw = val;
      } else if (name === 'data-tab' && tag === 'span') {
        tab = true;
      } else if (name === 'data-tabs' && /^(p|li|div|h[1-3]|blockquote)$/.test(tag) && /^([lcrd]-?\d{1,4} ?){1,21}$/.test(val)) {
        attrs.push(`data-tabs="${val.trim()}"`);
      } else if (name === 'data-rel' && val === 'p' && (tag === 'img' || tag === 'span')) {
        attrs.push('data-rel="p"');
      } else if (name === 'data-graph' && tag === 'figure') {
        try {
          graph = JSON.stringify(cleanGraph(JSON.parse(val)));
        } catch {
          graph = '';
        }
      } else if ((tag === 'figure' || tag === 'span') && name === 'data-shape' && SHAPE_ID.test(val)) {
        shape.unshift(`data-shape="${val}"`);
      } else if ((tag === 'figure' || tag === 'span') && (name === 'data-fill' || name === 'data-stroke') && (HEX.test(val) || val === 'none')) {
        shape.push(`${name}="${val}"`);
      } else if ((tag === 'figure' || tag === 'span') && name === 'data-sw' && /^\d{1,2}$/.test(val) && +val <= 24) {
        shape.push(`data-sw="${val}"`);
      } else if ((tag === 'figure' || tag === 'span') && name === 'data-ar' && /^\d{1,3}(\.\d{1,3})?$/.test(val) && +val >= 0.02 && +val <= 60) {
        shape.push(`data-ar="${val}"`);
      } else if (name === 'data-wrap' && (tag === 'figure' || tag === 'img' || tag === 'span') && (WRAPS as readonly string[]).includes(val)) {
        attrs.push(`data-wrap="${val}"`);
      } else if (name === 'data-lock' && (tag === 'figure' || tag === 'img' || tag === 'span')) {
        attrs.push('data-lock="1"');
      } else if (name === 'data-pb' && tag === 'div') {
        attrs.push('data-pb="1"');
      } else if ((name === 'colspan' || name === 'rowspan') && /^\d{1,2}$/.test(val)) {
        attrs.push(`${name}="${val}"`);
      } else if (name === 'src' && tag === 'img') {
        const ok = cleanSrc(val);
        if (ok) attrs.push(`src="${escAttr(ok)}"`);
      } else if (name === 'size' && tag === 'font' && /^[1-7]$/.test(val)) {
        attrs.push(`size="${val}"`);
      } else if (name === 'face' && tag === 'font' && /^[\w\s,'-]{1,60}$/.test(val)) {
        attrs.push(`face="${escAttr(val)}"`);
      } else if (name === 'color' && tag === 'font' && /^#[0-9a-fA-F]{3,6}$/.test(val)) {
        attrs.push(`color="${val}"`);
      }
    }
    if (tag === 'img' && !attrs.some((x) => x.startsWith('src='))) continue;
    // สมการ/กราฟเก็บแค่ข้อมูลต้นทาง เนื้อหาข้างใน (ผลวาด) ทิ้ง แล้ววาดใหม่ตอนแสดงผล
    if (tex) {
      // สมการเก็บได้แค่ขนาดตัวอักษรของตัวเอง (สมการ MathType จากไฟล์ Word)
      // data-w = ความกว้างเดิมในไฟล์ Word (px) ใช้ย่อสมการที่กว้างกว่าเดิมให้บรรทัดไม่ล้น (fitEquations)
      const size = /font-size: \d{1,3}(\.\d+)?px/.exec(attrs.find((x) => x.startsWith('style=')) ?? '')?.[0];
      out.push(`<span data-tex="${escAttr(tex)}"${dw ? ` data-w="${dw}"` : ''}${size ? ` style="${size}"` : ''} contenteditable="false"></span>`);
      if (!m[0].endsWith('/>')) startSkip(tag);
      continue;
    }
    if (pg && tag === 'span') {
      // ช่องเลขหน้าเก็บสไตล์ของตัวเองได้ (ฟอนต์ ขนาด ตัวหนา สี) แบบเลขหน้าใน Word
      const st = attrs.find((x) => x.startsWith('style='));
      out.push(st ? PAGE_FIELD.replace('contenteditable', `${st} contenteditable`) : PAGE_FIELD);
      if (!m[0].endsWith('/>')) startSkip(tag);
      continue;
    }
    // แท็บ: ความกว้างคิดตอนจัดหน้าตามตำแหน่งหยุดแท็บของย่อหน้า (layoutTabs)
    if (tab && tag === 'span') {
      out.push('<span data-tab="1" contenteditable="false"></span>');
      if (!m[0].endsWith('/>')) startSkip(tag);
      continue;
    }
    // รูปร่างแบบ span: ข้างในเป็นผลวาด ทิ้งแล้ววาดใหม่ (span อื่นที่ติดค่าจัดวางมาไม่เก็บค่านั้น)
    if (tag === 'span' && shape[0]?.startsWith('data-shape')) {
      out.push(`<span ${[...shape, ...attrs].join(' ')} contenteditable="false"></span>`);
      if (!m[0].endsWith('/>')) startSkip(tag);
      continue;
    }
    if (tag === 'span') {
      const a = attrs.filter((x) => !x.startsWith('data-wrap') && !x.startsWith('data-lock') && !x.startsWith('data-rel'));
      out.push(`<span${a.length ? ' ' + a.join(' ') : ''}>`);
      continue;
    }
    if (tag === 'figure') {
      if (graph) out.push(`<figure data-graph="${escAttr(graph)}" contenteditable="false"${attrs.length ? ' ' + attrs.join(' ') : ''}></figure>`);
      else if (shape[0]?.startsWith('data-shape')) out.push(`<figure ${[...shape, ...attrs].join(' ')} contenteditable="false"></figure>`);
      if (!m[0].endsWith('/>')) startSkip(tag);
      continue;
    }
    out.push(`<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`);
  }
  return out.join('');
}

/** ข้อความล้วนของเอกสาร (เช็กว่าว่างไหม) */
export const flowIsEmpty = (html: string) =>
  !String(html || '')
    .replace(/<(img|figure|hr|table)\b|<span data-(tex|shape|pg|tab)/gi, 'X')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|\s/g, '');

/* ------------------------------------------------------------------ ตัดหน้า (ใช้ DOM ในเบราว์เซอร์) */

/** ตำแหน่งหยุดแท็บของย่อหน้า: "l47 c301 r450 d48" (px จากขอบซ้ายคอลัมน์, d = ระยะแท็บตั้งต้น) */
export function parseTabs(s: string | undefined): { stops: { x: number; k: string }[]; def: number } {
  const stops: { x: number; k: string }[] = [];
  let def = 48;
  for (const t of (s || '').split(' ')) {
    const m = /^([lcrd])(-?\d+)$/.exec(t);
    if (!m) continue;
    if (m[1] === 'd') def = Math.max(8, +m[2]);
    else stops.push({ x: +m[2], k: m[1] });
  }
  return { stops: stops.sort((a, b) => a.x - b.x), def };
}
/** ความกว้างแท็บแบบ Word: x = ตำแหน่งแท็บบนบรรทัด, seg = ความกว้างข้อความถึงแท็บถัดไป (ใช้กับแท็บกลาง/ขวา) */
export function tabWidth(x: number, seg: number, tabs: ReturnType<typeof parseTabs>): number {
  const s = tabs.stops.find((t) => t.x > x + 0.5);
  if (s) {
    const w = s.k === 'r' ? s.x - x - seg : s.k === 'c' ? s.x - x - seg / 2 : s.x - x;
    if (w >= 1) return w;
  }
  // ไม่มีตำแหน่งหยุดถัดไป: ระยะแท็บตั้งต้นที่อยู่หลังตำแหน่งที่กำหนดเองตัวสุดท้าย
  const from = Math.max(x, tabs.stops.length ? tabs.stops[tabs.stops.length - 1].x : -Infinity);
  return Math.floor(from / tabs.def + 1) * tabs.def - x;
}
const BLOCK = 'p, li, h1, h2, h3, blockquote, div, td, th';
/** จัดความกว้างแท็บ (span[data-tab]) ทั้งเอกสาร: อ่านตำแหน่งครั้งเดียว คิดเอง แล้วค่อยเขียน */
export function layoutTabs(root: HTMLElement) {
  const tabs = Array.from(root.querySelectorAll<HTMLElement>('span[data-tab]'));
  if (!tabs.length) return;
  for (const t of tabs) t.style.width = '0px';
  const info = tabs.map((t) => {
    const p = (t.parentElement?.closest(BLOCK) as HTMLElement | null) ?? root;
    const pr = p.getBoundingClientRect();
    const scale = pr.width / (p.offsetWidth || 1) || 1;
    const col = pr.left - (parseFloat(getComputedStyle(p).marginLeft) || 0) * scale;
    const r = t.getBoundingClientRect();
    let seg = 0;
    if (/[cr]/.test(p.dataset.tabs || '')) {
      // ข้อความหลังแท็บถึงแท็บถัดไป/ท้ายย่อหน้า
      const rg = document.createRange();
      rg.setStartAfter(t);
      const next = tabs.find((o) => o !== t && p.contains(o) && t.compareDocumentPosition(o) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (next) rg.setEndBefore(next);
      else rg.setEnd(p, p.childNodes.length);
      seg = rg.getBoundingClientRect().width / scale;
    }
    return { p, x: (r.left - col) / scale, top: r.top, seg };
  });
  let shift = 0;
  let prev: (typeof info)[number] | null = null;
  const parsed = new Map<HTMLElement, ReturnType<typeof parseTabs>>();
  const ws = info.map((it) => {
    if (!prev || prev.p !== it.p || Math.abs(prev.top - it.top) > 2) shift = 0;
    prev = it;
    let tb = parsed.get(it.p);
    if (!tb) parsed.set(it.p, (tb = parseTabs(it.p.dataset.tabs)));
    const w = tabWidth(it.x + shift, it.seg, tb);
    shift += w;
    return w;
  });
  tabs.forEach((t, i) => (t.style.width = `${Math.round(ws[i] * 100) / 100}px`));
}

/** กล่องของย่อหน้าสำหรับตัดหน้า: รูป/รูปร่างที่ยึดกับย่อหน้า (นำเข้าจาก Word) ต้องอยู่หน้าเดียวกับย่อหน้า นับส่วนที่ยื่นลงล่างด้วย */
function unitRect(u: HTMLElement): { top: number; height: number } {
  const r = u.getBoundingClientRect();
  let bottom = r.bottom;
  u.querySelectorAll(':scope > img[data-rel], :scope > span[data-shape][data-wrap]').forEach((a) => (bottom = Math.max(bottom, a.getBoundingClientRect().bottom)));
  return { top: r.top, height: bottom - r.top };
}
/**
 * จัดหน้าเนื้อหาในกล่องที่วางเรียงหน้าละ pageH + gap: ชิ้นที่คร่อมรอยต่อหน้าถูกดันไปขึ้นหน้าใหม่ด้วย margin-top
 * (margin-top ไม่ถูกบันทึก ตัวกรองไม่อนุญาต) คืนจำนวนหน้าที่ต้องใช้
 */
export function paginate(root: HTMLElement, pageH: number, gap: number, my: number, mb = my): number {
  const P = pageH + gap;
  layoutTabs(root);
  const units: HTMLElement[] = [];
  const top0 = root.getBoundingClientRect().top;
  const scale = root.getBoundingClientRect().height / (root.offsetHeight || 1) || 1;
  // ชิ้นที่วางอิสระ (หลัง/หน้าข้อความ) ไม่ดันเนื้อหา แต่ต้องมีหน้ารองรับ
  let free = 0;
  for (const el of Array.from(root.children) as HTMLElement[]) {
    if (el.dataset.wrap === 'behind' || el.dataset.wrap === 'front') free = Math.max(free, (el.getBoundingClientRect().bottom - top0) / scale);
    // รายการตัดทีละข้อ (ตารางย้ายทั้งตาราง)
    else if (/^(UL|OL)$/.test(el.tagName)) units.push(...(Array.from(el.children) as HTMLElement[]));
    else units.push(el);
  }
  for (const u of units) u.style.marginTop = '';
  // ทางเร็ว: อ่านตำแหน่งทุกย่อหน้าครั้งเดียว แล้วคิดระยะดันสะสมเอง
  // (ทางเดิมอ่าน-เขียนสลับทีละย่อหน้า เบราว์เซอร์ต้องจัดหน้าใหม่ทั้งเอกสารทุกย่อหน้า เอกสารยาวพิมพ์แล้วกระตุก)
  const rects = units.map(unitRect);
  const m0 = units.map((u) => parseFloat(getComputedStyle(u).marginTop) || 0);
  const plan: number[] = [];
  const want: number[] = [];
  {
    let shift = 0;
    let force = false;
    let end = my;
    units.forEach((u, i) => {
      const t = (rects[i].top - top0) / scale + shift;
      const h = rects[i].height / scale;
      const k = Math.max(0, Math.floor(t / P));
      const cTop = k * P + my;
      const cBot = k * P + pageH - mb;
      let push = 0;
      if (force) push = (k + 1) * P + my - t;
      else if (t < cTop - 0.5) push = cTop - t;
      else if (t + h > cBot + 0.5 && h <= pageH - my - mb) push = (k + 1) * P + my - t;
      force = u.dataset.pb === '1';
      plan[i] = push > 0.5 ? push : 0;
      shift += plan[i];
      want[i] = t + plan[i];
      end = want[i] + h;
    });
    units.forEach((u, i) => plan[i] && (u.style.marginTop = `${plan[i] + m0[i]}px`));
    // ตรวจครั้งเดียว: ตรงตามที่คิด (ไม่มี margin ยุบรวมกันแปลกๆ) ก็จบ
    if (units.every((u, i) => !plan[i] || Math.abs((u.getBoundingClientRect().top - top0) / scale - want[i]) < 1.5)) return Math.max(1, Math.ceil((end + mb) / P), Math.ceil(free / P));
    for (const u of units) u.style.marginTop = '';
  }
  let forceNext = false;
  let last = my;
  for (const u of units) {
    const r = unitRect(u);
    const t = (r.top - top0) / scale;
    const h = r.height / scale;
    const k = Math.max(0, Math.floor(t / P));
    const cTop = k * P + my;
    const cBot = k * P + pageH - mb;
    let push = 0;
    if (forceNext) push = (k + 1) * P + my - t;
    else if (t < cTop - 0.5) push = cTop - t;
    else if (t + h > cBot + 0.5 && h <= pageH - my - mb) push = (k + 1) * P + my - t;
    forceNext = u.dataset.pb === '1';
    if (push > 0.5) u.style.marginTop = `${push}px`;
    last = t + push + h;
  }
  return Math.max(1, Math.ceil((last + mb) / P), Math.ceil(free / P));
}
