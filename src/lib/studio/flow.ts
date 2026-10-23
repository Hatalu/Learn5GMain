/**
 * โหมดเอกสาร (แบบ Word): เนื้อหาไหลต่อเนื่องเป็น HTML ที่จำกัดแท็ก/สไตล์ ตัดหน้าให้เองตามขนาดกระดาษ
 * ตัวกรอง HTML เขียนเองแบบรายการอนุญาต (สื่อ Public คนอื่นเปิดดูได้ ห้ามมีสคริปต์/ลิงก์/รูปนอกที่เก็บของเรา)
 * ไม่มี DOM ในส่วนตัวกรอง (ทดสอบได้ใน selftest)
 */
import { cleanGraph } from './graph';

/** ขอบกระดาษ (px ที่ 96 dpi) และช่องว่างระหว่างแผ่นในจอแก้ไข */
export const FLOW_MARGIN = { x: 76, y: 72 };
export const FLOW_GAP = 28;

const TAGS = new Set(['p', 'div', 'br', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup', 'span', 'font', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr', 'img', 'figure', 'blockquote']);
const VOID = new Set(['br', 'hr', 'img']);
const STYLE_PROPS = new Set(['color', 'background-color', 'font-size', 'font-family', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line', 'text-align', 'line-height', 'margin-left', 'padding-left', 'width', 'vertical-align']);

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function cleanStyle(v: string): string {
  const out: string[] = [];
  for (const decl of v.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const val = decl.slice(i + 1).trim();
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
  const src = String(html || '').slice(0, 400_000);
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
      if (!skip) out.push(m[4].replace(/>/g, '&gt;'));
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
    let graph = '';
    while ((a = ar.exec(m[3] || ''))) {
      const name = a[1].toLowerCase();
      const val = decode(a[2] ?? a[3] ?? a[4] ?? '');
      if (name === 'style') {
        const st = cleanStyle(val);
        if (st) attrs.push(`style="${escAttr(st)}"`);
      } else if (name === 'data-tex' && tag === 'span') {
        tex = val.slice(0, 2000);
      } else if (name === 'data-graph' && tag === 'figure') {
        try {
          graph = JSON.stringify(cleanGraph(JSON.parse(val)));
        } catch {
          graph = '';
        }
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
      out.push(`<span data-tex="${escAttr(tex)}" contenteditable="false"></span>`);
      if (!m[0].endsWith('/>')) startSkip(tag);
      continue;
    }
    if (tag === 'figure') {
      if (graph) out.push(`<figure data-graph="${escAttr(graph)}" contenteditable="false"${attrs.length ? ' ' + attrs.join(' ') : ''}></figure>`);
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
    .replace(/<(img|figure|hr|table)|<span data-tex/gi, 'X')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|\s/g, '');

/* ------------------------------------------------------------------ ตัดหน้า (ใช้ DOM ในเบราว์เซอร์) */

/**
 * จัดหน้าเนื้อหาในกล่องที่วางเรียงหน้าละ pageH + gap: ชิ้นที่คร่อมรอยต่อหน้าถูกดันไปขึ้นหน้าใหม่ด้วย margin-top
 * (margin-top ไม่ถูกบันทึก ตัวกรองไม่อนุญาต) คืนจำนวนหน้าที่ต้องใช้
 */
export function paginate(root: HTMLElement, pageH: number, gap: number, my: number): number {
  const P = pageH + gap;
  const units: HTMLElement[] = [];
  for (const el of Array.from(root.children) as HTMLElement[]) {
    // รายการตัดทีละข้อ (ตารางย้ายทั้งตาราง)
    if (/^(UL|OL)$/.test(el.tagName)) units.push(...(Array.from(el.children) as HTMLElement[]));
    else units.push(el);
  }
  for (const u of units) u.style.marginTop = '';
  const top0 = root.getBoundingClientRect().top;
  const scale = root.getBoundingClientRect().height / (root.offsetHeight || 1) || 1;
  let forceNext = false;
  let last = my;
  for (const u of units) {
    const r = u.getBoundingClientRect();
    const t = (r.top - top0) / scale;
    const h = r.height / scale;
    const k = Math.max(0, Math.floor(t / P));
    const cTop = k * P + my;
    const cBot = k * P + pageH - my;
    let push = 0;
    if (forceNext) push = (k + 1) * P + my - t;
    else if (t < cTop - 0.5) push = cTop - t;
    else if (t + h > cBot + 0.5 && h <= pageH - 2 * my) push = (k + 1) * P + my - t;
    forceNext = u.dataset.pb === '1';
    if (push > 0.5) u.style.marginTop = `${push}px`;
    last = t + push + h;
  }
  return Math.max(1, Math.ceil((last + my) / P));
}
