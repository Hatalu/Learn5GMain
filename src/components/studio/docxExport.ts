'use client';

import katex from 'katex';
import { mathmlToOmml } from '@/lib/studio/omml';
import { prepTex } from '@/lib/mathTex';
import { FLOW_GAP, WORD_SINGLE, hasPageField, parseTabs, withPageField, type WordOpt } from '@/lib/studio/flow';
import { figureKey, figurePng, hydrateFlow } from './flowDom';
import { flowBoxStyle, hfOffset } from './render';
import { wordFont } from './wordCopy';

/**
 * ส่งออกเอกสารโหมด Word เป็นไฟล์ .docx จริง (เปิดแก้ใน Microsoft Word / Google Docs / LibreOffice ได้)
 * อ่านสไตล์จริงจาก DOM ที่วาดแล้ว (ฟอนต์ ขนาด สี ระยะ) แล้วเขียน WordprocessingML เอง ไม่ส่งข้อมูลออกนอกเครื่อง
 * ข้อจำกัด: ฟอนต์ที่ไม่มีในเครื่องผู้เปิดไฟล์ Word จะแทนด้วยฟอนต์อื่น (ค่าเริ่มต้น TH SarabunPSK มีในเครื่องที่ติดตั้ง Office ไทย)
 */

const NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tw = (px: number) => Math.round(px * 15);
const emu = (px: number) => Math.round(px * 9525);
const num = (v: string | number | null | undefined, d = 0) => {
  const n = typeof v === 'number' ? v : parseFloat(v || '');
  return Number.isFinite(n) ? n : d;
};

function hex(css: string): string {
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (!m) return '';
  const p = m[1].split(',').map((s) => parseFloat(s));
  if (p.length > 3 && p[3] === 0) return '';
  return [p[0], p[1], p[2]].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}

type Media = { name: string; bytes: Uint8Array; mime: string };
type Part = 'doc' | 'head' | 'foot';
interface Ctx {
  part: Part;
  media: Media[];
  rels: { id: string; type: string; target: string }[];
  numbering: string[];
  nums: { absId: number; start: number }[];
  docPr: number;
  root: HTMLElement;
  page: { W: number; H: number };
  imgs: Map<string, Promise<{ rid: string } | null>>;
  warn: string[];
  /** มีตัวแบ่งหน้าค้างอยู่ ย่อหน้าถัดไปขึ้นหน้าใหม่ (pageBreakBefore ไม่เกิดบรรทัดว่างเกิน) */
  pb: boolean;
}

const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'TABLE', 'BLOCKQUOTE', 'FIGURE', 'HR']);

/* ------------------------------------------------------------------ รูปภาพ */

async function bytesOfSrc(src: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  try {
    if (src.startsWith('data:')) {
      const i = src.indexOf(',');
      const mime = /^data:([^;,]+)/.exec(src)?.[1] || 'image/png';
      const bin = /;base64/.test(src.slice(0, i)) ? atob(src.slice(i + 1)) : decodeURIComponent(src.slice(i + 1));
      const out = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
      return { bytes: out, mime };
    }
    const r = await fetch(src);
    if (!r.ok) return null;
    const b = await r.blob();
    return { bytes: new Uint8Array(await b.arrayBuffer()), mime: b.type || 'image/png' };
  } catch {
    return null;
  }
}

/** ใส่รูปลงไฟล์ (ซ้ำกันใช้ไฟล์เดียว) คืน id ความสัมพันธ์ */
function addImage(cx: Ctx, key: string, src: string): Promise<{ rid: string } | null> {
  let p = cx.imgs.get(key);
  if (!p) {
    p = bytesOfSrc(src).then((d) => {
      if (!d) return null;
      // Word รับ png/jpeg/gif/bmp: webp/svg แปลงเป็น png ก่อน
      return (/^image\/(png|jpe?g|gif|bmp)$/.test(d.mime) ? Promise.resolve(d) : toPng(src)).then((d2) => {
        if (!d2) return null;
        const ext = d2.mime.includes('jpeg') || d2.mime.includes('jpg') ? 'jpeg' : d2.mime.split('/')[1].replace('x-', '');
        const name = `image${cx.media.length + 1}.${ext}`;
        cx.media.push({ name, bytes: d2.bytes, mime: d2.mime });
        const rid = `rIdImg${cx.media.length}`;
        cx.rels.push({ id: rid, type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', target: `media/${name}` });
        return { rid };
      });
    });
    cx.imgs.set(key, p);
  }
  return p;
}

async function toPng(src: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((ok, fail) => {
      img.onload = () => ok();
      img.onerror = () => fail(new Error('img'));
      img.src = src;
    });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || 1;
    c.height = img.naturalHeight || 1;
    c.getContext('2d')!.drawImage(img, 0, 0);
    const b = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/png'));
    return b ? { bytes: new Uint8Array(await b.arrayBuffer()), mime: 'image/png' } : null;
  } catch {
    return null;
  }
}

function drawing(cx: Ctx, rid: string, w: number, h: number, name: string, anchor?: { h: 'column' | 'page'; v: 'paragraph' | 'page'; x: number; y: number; wrap: string }): string {
  const id = ++cx.docPr;
  const ext = `<wp:extent cx="${emu(w)}" cy="${emu(h)}"/>`;
  const graphic = `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${esc(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`;
  const docPr = `<wp:docPr id="${id}" name="${esc(name)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>`;
  if (!anchor) return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">${ext}<wp:effectExtent l="0" t="0" r="0" b="0"/>${docPr}${graphic}</wp:inline></w:drawing></w:r>`;
  const wrap = anchor.wrap === 'left' || anchor.wrap === 'right' ? '<wp:wrapSquare wrapText="bothSides"/>' : '<wp:wrapNone/>';
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${251658240 + id}" behindDoc="${anchor.wrap === 'behind' ? 1 : 0}" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="${anchor.h}"><wp:posOffset>${emu(anchor.x)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="${anchor.v}"><wp:posOffset>${emu(anchor.y)}</wp:posOffset></wp:positionV>${ext}<wp:effectExtent l="0" t="0" r="0" b="0"/>${wrap}${docPr}${graphic}</wp:anchor></w:drawing></w:r>`;
}

/* ------------------------------------------------------------------ สไตล์ตัวอักษร */

const rprCache = new WeakMap<HTMLElement, string>();

/** เส้นใต้/ขีดฆ่า ถูกส่งต่อจากองค์ประกอบแม่ (computed style ไม่ inherit) */
function decos(el: HTMLElement, stop: HTMLElement): { u: boolean; s: boolean } {
  let u = false;
  let s = false;
  for (let e: HTMLElement | null = el; e && e !== stop; e = e.parentElement) {
    const d = getComputedStyle(e).textDecorationLine;
    if (d.includes('underline')) u = true;
    if (d.includes('line-through')) s = true;
  }
  return { u, s };
}

function shadeOf(el: HTMLElement, stop: HTMLElement): string {
  for (let e: HTMLElement | null = el; e && e !== stop; e = e.parentElement) {
    if (e.style.backgroundColor) return hex(getComputedStyle(e).backgroundColor);
    if (/^(P|DIV|TD|TH|LI|H\d|BLOCKQUOTE)$/.test(e.tagName)) break;
  }
  return '';
}

function rpr(el: HTMLElement, cx: Ctx, extra = ''): string {
  const cached = rprCache.get(el);
  if (cached !== undefined && !extra) return cached;
  const cs = getComputedStyle(el);
  const font = esc(wordFont(cs.fontFamily));
  const sz = Math.max(2, Math.round(num(cs.fontSize, 16) * 1.5));
  const bold = num(cs.fontWeight, 400) >= 600;
  const it = cs.fontStyle === 'italic';
  const d = decos(el, cx.root);
  const col = hex(cs.color);
  const shd = shadeOf(el, cx.root);
  const va = cs.verticalAlign === 'sub' || el.closest('sub') ? 'subscript' : cs.verticalAlign === 'super' || el.closest('sup') ? 'superscript' : '';
  const x =
    `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}" w:eastAsia="${font}"/>` +
    (bold ? '<w:b/><w:bCs/>' : '') +
    (it ? '<w:i/><w:iCs/>' : '') +
    (d.s ? '<w:strike/>' : '') +
    (col && col !== '1F1B36' && col !== '000000' ? `<w:color w:val="${col}"/>` : '') +
    `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>` +
    (d.u ? '<w:u w:val="single"/>' : '') +
    (shd ? `<w:shd w:val="clear" w:color="auto" w:fill="${shd}"/>` : '') +
    (va ? `<w:vertAlign w:val="${va}"/>` : '') +
    extra;
  const out = `<w:rPr>${x}</w:rPr>`;
  if (!extra) rprCache.set(el, out);
  return out;
}

/* ------------------------------------------------------------------ เนื้อหาในบรรทัด */

const hasThai = (s: string) => /[ก-๛]/.test(s);

function run(text: string, pr: string): string {
  return text ? `<w:r>${pr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>` : '';
}

/** สมการ KaTeX -> สมการ Word (OMML) ขนาดตามตัวอักษรรอบข้าง */
function equation(el: HTMLElement, cx: Ctx): string {
  const tex = el.dataset.tex || '';
  let omml = '';
  try {
    omml = mathmlToOmml(katex.renderToString(prepTex(tex), { output: 'mathml', throwOnError: false, strict: 'ignore' }));
  } catch {
    omml = '';
  }
  if (!omml) return run(tex, rpr(el, cx));
  const cs = getComputedStyle(el.parentElement || el);
  const sz = Math.max(2, Math.round(num(cs.fontSize, 16) * 1.5));
  const wpr = `<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>`;
  return omml
    .replace(/ xmlns:m="[^"]*"/, '')
    .replace(/<m:r>(<m:rPr>[\s\S]*?<\/m:rPr>)?/g, (_, p: string | undefined) => `<m:r>${p || ''}${wpr}`);
}

async function inline(node: Node, cx: Ctx, out: string[], st: { first: boolean }): Promise<void> {
  if (node.nodeType === 3) {
    const el = node.parentElement!;
    let t = (node as Text).data;
    const ws = getComputedStyle(el).whiteSpace;
    if (!ws.startsWith('pre')) t = t.replace(/[ \t\r\n]+/g, ' ');
    else t = t.replace(/\r?\n/g, ' ');
    if (st.first) t = t.replace(/^ /, '');
    if (!t) return;
    st.first = false;
    out.push(run(t, rpr(el, cx)));
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node as HTMLElement;
  const tag = el.tagName;
  if (tag === 'BR') {
    out.push('<w:r><w:br/></w:r>');
    st.first = true;
    return;
  }
  if (el.dataset.pb === '1') return;
  if (el.dataset.tab !== undefined) {
    out.push(`<w:r>${rpr(el, cx)}<w:tab/></w:r>`);
    st.first = false;
    return;
  }
  if (el.dataset.pg) {
    out.push(`<w:fldSimple w:instr=" PAGE "><w:r>${rpr(el, cx)}<w:t>1</w:t></w:r></w:fldSimple>`);
    st.first = false;
    return;
  }
  if (el.dataset.tex !== undefined) {
    out.push(equation(el, cx));
    st.first = false;
    return;
  }
  if (tag === 'IMG' || el.dataset.shape || el.dataset.graph) {
    out.push(await picture(el, cx));
    st.first = false;
    return;
  }
  for (const c of Array.from(el.childNodes)) await inline(c, cx, out, st);
}

/** รูป/กราฟ/รูปร่าง: ในบรรทัด หรือลอย (ล้อมข้อความ/หลัง/หน้า) ตามที่จัดไว้ */
async function picture(el: HTMLElement, cx: Ctx): Promise<string> {
  const isImg = el.tagName === 'IMG';
  const src = isImg ? (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src : figurePng(figureKey(el)) || '';
  if (!src) {
    cx.warn.push('มีกราฟ/รูปร่างที่แปลงเป็นรูปไม่ทัน');
    return '';
  }
  const img = await addImage(cx, isImg ? src : figureKey(el), src);
  if (!img) {
    cx.warn.push('มีรูปที่ดึงไม่ได้');
    return '';
  }
  const rect = el.getBoundingClientRect();
  const z = el.offsetWidth ? rect.width / el.offsetWidth || 1 : 1;
  const w = Math.max(4, el.offsetWidth || rect.width / z);
  const h = Math.max(4, el.offsetHeight || rect.height / z);
  const wrap = el.dataset.wrap;
  if (!wrap) return drawing(cx, img.rid, w, h, 'รูป');
  const left = num(el.style.left);
  const top = num(el.style.top);
  if (el.dataset.rel === 'p') return drawing(cx, img.rid, w, h, 'รูป', { h: 'column', v: 'paragraph', x: left, y: top, wrap });
  // ลอยเทียบเนื้อหาทั้งเอกสาร (ต่อหน้าเรียงลง): แปลงเป็นตำแหน่งในหน้านั้น
  const P = cx.page.H + FLOW_GAP;
  const pg = Math.max(0, Math.floor(top / P));
  return drawing(cx, img.rid, w, h, 'รูป', { h: 'page', v: 'page', x: left, y: top - pg * P, wrap });
}

/* ------------------------------------------------------------------ ย่อหน้า */

function ppr(el: HTMLElement, cx: Ctx, opt: { numId?: number; lvl?: number; cell?: boolean; heading?: number; noAfter?: boolean } = {}): string {
  const cs = getComputedStyle(el);
  const p: string[] = [];
  if (opt.heading) p.push(`<w:pStyle w:val="Heading${opt.heading}"/>`);
  if (cx.pb) {
    p.push('<w:pageBreakBefore/>');
    cx.pb = false;
  }
  if (opt.numId) p.push(`<w:numPr><w:ilvl w:val="${opt.lvl || 0}"/><w:numId w:val="${opt.numId}"/></w:numPr>`);
  if (el.tagName === 'BLOCKQUOTE') p.push('<w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="C4B5FD"/></w:pBdr>');
  const tabs = el.dataset.tabs ? parseTabs(el.dataset.tabs) : null;
  if (tabs && tabs.stops.length)
    p.push(`<w:tabs>${tabs.stops.map((s) => `<w:tab w:val="${s.k === 'c' ? 'center' : s.k === 'r' ? 'right' : s.k === 'd' ? 'decimal' : 'left'}" w:pos="${tw(s.x)}"/>`).join('')}</w:tabs>`);
  const before = opt.cell ? 0 : num(cs.marginTop) + num(cs.paddingTop);
  const after = opt.noAfter || opt.cell ? 0 : num(cs.marginBottom) + num(cs.paddingBottom);
  const lh = num(cs.lineHeight);
  const fs = num(cs.fontSize, 16);
  const line = lh && fs ? Math.max(120, Math.round((lh / fs / WORD_SINGLE) * 240)) : 0;
  p.push(`<w:spacing w:before="${tw(before)}" w:after="${tw(after)}"${line ? ` w:line="${line}" w:lineRule="auto"` : ''}/>`);
  const ml = el.tagName === 'LI' ? 0 : num(el.style.marginLeft);
  const ti = el.style.textIndent ? num(cs.textIndent) : 0;
  if (ml || ti) p.push(`<w:ind w:left="${tw(ml)}"${ti > 0 ? ` w:firstLine="${tw(ti)}"` : ti < 0 ? ` w:hanging="${tw(-ti)}"` : ''}/>`);
  const ta = cs.textAlign;
  const th = hasThai(el.textContent || '');
  if (ta === 'center') p.push('<w:jc w:val="center"/>');
  else if (ta === 'right' || ta === 'end') p.push('<w:jc w:val="right"/>');
  else if (ta === 'justify') p.push(`<w:jc w:val="${th ? 'thaiDistribute' : 'both'}"/>`);
  return p.length ? `<w:pPr>${p.join('')}</w:pPr>` : '';
}

async function paragraph(el: HTMLElement, nodes: Node[], cx: Ctx, opt: Parameters<typeof ppr>[2] = {}, pre = ''): Promise<string> {
  const runs: string[] = [];
  const st = { first: true };
  for (const n of nodes) await inline(n, cx, runs, st);
  let body = runs.join('');
  // ย่อหน้าเดียวที่มีแต่สมการ = สมการบรรทัดของตัวเอง (กลางหน้า) ใช้ oMathPara
  if (/^<m:oMath>[\s\S]*<\/m:oMath>$/.test(body) && (body.match(/<m:oMath>/g) || []).length === 1 && getComputedStyle(el).textAlign === 'center') body = `<m:oMathPara>${body}</m:oMathPara>`;
  // ย่อหน้าว่างต้องมีขนาดตัวอักษรของมัน ไม่งั้นสูงเท่าค่าเริ่มต้น
  const mark = body ? '' : `<w:pPr><w:rPr>${rpr(el, cx).replace(/^<w:rPr>|<\/w:rPr>$/g, '')}</w:rPr></w:pPr>`;
  const pp = ppr(el, cx, opt);
  return `<w:p>${pp || mark}${pre}${body}</w:p>`;
}

/* ------------------------------------------------------------------ บล็อก ตาราง รายการ */

const isBlockEl = (n: Node) => n.nodeType === 1 && (BLOCK_TAGS.has((n as HTMLElement).tagName) || (n as HTMLElement).dataset.pb === '1');
const isHidden = (n: Node) => n.nodeType === 1 && ((n as HTMLElement).dataset.pb === '1' || (n as HTMLElement).tagName === 'STYLE');

async function blocks(parent: HTMLElement, cx: Ctx, out: string[], opt: { cell?: boolean; listDepth?: number } = {}): Promise<void> {
  let buf: Node[] = [];
  const flush = async () => {
    const meaningful = buf.some((n) => (n.nodeType === 3 ? (n as Text).data.trim() : true));
    if (meaningful) out.push(await paragraph(parent, buf, cx, { cell: opt.cell }));
    buf = [];
  };
  for (const n of Array.from(parent.childNodes)) {
    if (isHidden(n)) {
      await flush();
      if ((n as HTMLElement).dataset?.pb === '1') cx.pb = true;
      continue;
    }
    if (!isBlockEl(n)) {
      buf.push(n);
      continue;
    }
    await flush();
    await block(n as HTMLElement, cx, out, opt);
  }
  await flush();
}

function newList(cx: Ctx, el: HTMLElement, depth: number): number {
  const ordered = el.tagName === 'OL';
  const t = getComputedStyle(el).listStyleType;
  const fmt =
    t === 'lower-alpha' || t === 'lower-latin' ? 'lowerLetter' : t === 'upper-alpha' || t === 'upper-latin' ? 'upperLetter' : t === 'lower-roman' ? 'lowerRoman' : t === 'upper-roman' ? 'upperRoman' : t === 'thai' ? 'thaiNumbers' : ordered ? 'decimal' : 'bullet';
  const absId = cx.numbering.length;
  const left = 420 * (depth + 1) + 300;
  const lvlText = fmt === 'bullet' ? (depth % 2 ? 'o' : '•') : `%1${fmt === 'decimal' || fmt === 'thaiNumbers' ? '.' : ')'}`;
  const start = ordered ? Math.max(1, Math.round(num(el.getAttribute('start'), 1))) : 1;
  cx.numbering.push(
    `<w:abstractNum w:abstractNumId="${absId}"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="${start}"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${esc(lvlText)}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${left}" w:hanging="360"/></w:pPr>${fmt === 'bullet' ? '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:hint="default"/></w:rPr>' : ''}</w:lvl></w:abstractNum>`
  );
  cx.nums.push({ absId, start });
  return cx.nums.length; // numId เริ่มที่ 1
}

async function listBlock(el: HTMLElement, cx: Ctx, out: string[], depth: number, cell?: boolean) {
  const numId = newList(cx, el, depth);
  for (const li of Array.from(el.children) as HTMLElement[]) {
    if (li.tagName !== 'LI') continue;
    const inl: Node[] = [];
    const sub: HTMLElement[] = [];
    for (const c of Array.from(li.childNodes)) {
      if (c.nodeType === 1 && /^(UL|OL)$/.test((c as HTMLElement).tagName)) sub.push(c as HTMLElement);
      else if (c.nodeType === 1 && /^(P|DIV)$/.test((c as HTMLElement).tagName)) inl.push(...Array.from(c.childNodes), document.createElement('br'));
      else inl.push(c);
    }
    while (inl.length && inl[inl.length - 1].nodeName === 'BR') inl.pop();
    out.push(await paragraph(li, inl, cx, { numId, cell, noAfter: true }));
    for (const s of sub) await listBlock(s, cx, out, depth + 1, cell);
  }
}

async function block(el: HTMLElement, cx: Ctx, out: string[], opt: { cell?: boolean; listDepth?: number } = {}): Promise<void> {
  const tag = el.tagName;
  if (el.dataset.pb === '1') {
    cx.pb = true;
    return;
  }
  if (tag === 'HR') {
    out.push('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="8B84B0"/></w:pBdr><w:spacing w:before="120" w:after="120"/></w:pPr></w:p>');
    return;
  }
  if (tag === 'UL' || tag === 'OL') return listBlock(el, cx, out, opt.listDepth || 0, opt.cell);
  if (tag === 'TABLE') return table(el, cx, out);
  if (tag === 'FIGURE') {
    out.push(await paragraph(el, [el], cx, { cell: opt.cell }));
    return;
  }
  if (/^H[1-4]$/.test(tag)) return void out.push(await paragraph(el, Array.from(el.childNodes), cx, { cell: opt.cell, heading: Math.min(3, Number(tag[1])) }));
  // กล่อง div/p/li/blockquote ที่ข้างในมีบล็อกซ้อน = เดินต่อ ไม่งั้นเป็นย่อหน้าเดียว
  const nested = Array.from(el.childNodes).some((c) => isBlockEl(c));
  if (nested) return blocks(el, cx, out, opt);
  out.push(await paragraph(el, Array.from(el.childNodes), cx, { cell: opt.cell }));
}

async function table(el: HTMLElement, cx: Ctx, out: string[]): Promise<void> {
  const rows = Array.from(el.querySelectorAll<HTMLTableRowElement>(':scope > tr, :scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr'));
  if (!rows.length) return;
  if (cx.pb) {
    out.push('<w:p><w:pPr><w:pageBreakBefore/><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>');
    cx.pb = false;
  }
  // ตารางตามผังกริดของ HTML: ช่องที่ถูกรวมแถวจากด้านบนกินที่ในแถวถัดไป
  type Cell = { el: HTMLTableCellElement; col: number; span: number; rows: number };
  const grid: Cell[][] = [];
  const busy: number[] = [];
  let cols = 0;
  rows.forEach((tr, r) => {
    const line: Cell[] = [];
    let c = 0;
    for (const td of Array.from(tr.cells)) {
      while (busy[c] > 0) c++;
      const span = Math.max(1, td.colSpan || 1);
      const rs = Math.max(1, td.rowSpan || 1);
      line.push({ el: td, col: c, span, rows: rs });
      for (let k = 0; k < span; k++) busy[c + k] = rs;
      c += span;
    }
    cols = Math.max(cols, c);
    for (let k = 0; k < busy.length; k++) if (busy[k] > 0) busy[k]--;
    // ช่องที่ยังติดค้างจากแถวบนในแถวนี้ ลดจำนวนแล้ว (ทำหลังวางช่องของแถวนี้)
    grid[r] = line;
  });
  // ความกว้างคอลัมน์จากช่องที่กินคอลัมน์เดียว ที่เหลือแบ่งเท่าๆ กัน
  const total = el.offsetWidth || cx.root.offsetWidth;
  const colW = new Array<number>(cols).fill(0);
  for (const line of grid) for (const c of line) if (c.span === 1 && c.el.offsetWidth) colW[c.col] = Math.max(colW[c.col], c.el.offsetWidth);
  const known = colW.reduce((a, b) => a + b, 0);
  const unknown = colW.filter((w) => !w).length;
  const share = unknown ? Math.max(30, (total - known) / unknown) : 0;
  for (let i = 0; i < cols; i++) if (!colW[i]) colW[i] = share || total / cols;
  const first = grid[0]?.[0]?.el;
  const fcs = first ? getComputedStyle(first) : null;
  const padL = tw(num(fcs?.paddingLeft, 8));
  const padT = tw(num(fcs?.paddingTop, 4));
  const al = getComputedStyle(el);
  let xml = `<w:tbl><w:tblPr><w:tblW w:w="${tw(colW.reduce((a, b) => a + b, 0))}" w:type="dxa"/>${al.marginLeft === 'auto' && al.marginRight === 'auto' ? '<w:jc w:val="center"/>' : ''}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="${padT}" w:type="dxa"/><w:left w:w="${padL}" w:type="dxa"/><w:bottom w:w="${padT}" w:type="dxa"/><w:right w:w="${padL}" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${colW.map((w) => `<w:gridCol w:w="${tw(w)}"/>`).join('')}</w:tblGrid>`;
  // ผังช่อง: แต่ละตำแหน่ง = ช่องต้นทาง หรือช่องต่อเนื่องของการรวมแถว
  const occ: ({ c: Cell; origin: boolean } | undefined)[][] = grid.map(() => []);
  grid.forEach((line, r) => {
    for (const c of line) for (let i = 0; i < c.rows && r + i < grid.length; i++) for (let k = 0; k < c.span; k++) occ[r + i][c.col + k] = { c, origin: i === 0 };
  });
  for (let r = 0; r < grid.length; r++) {
    xml += '<w:tr>';
    for (let k = 0; k < cols; k++) {
      const o = occ[r][k];
      if (!o || o.c.col !== k) continue;
      xml += await cell(o.c, cx, !o.origin);
    }
    xml += '</w:tr>';
  }
  xml += '</w:tbl>';
  out.push(xml);
  // Word ต้องมีย่อหน้าคั่นหลังตาราง ไม่งั้นตารางสองตารางติดกันจะรวมกัน
  const nx = el.nextElementSibling as HTMLElement | null;
  if (!nx || nx.tagName === 'TABLE') out.push('<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>');

  async function cell(c: { el: HTMLTableCellElement; col: number; span: number; rows: number }, cx2: Ctx, cont: boolean): Promise<string> {
    const cs = getComputedStyle(c.el);
    const w = colW.slice(c.col, c.col + c.span).reduce((a, b) => a + b, 0);
    const side = (s: 'top' | 'right' | 'bottom' | 'left') => {
      const bw = num(cs.getPropertyValue(`border-${s}-width`));
      const st = cs.getPropertyValue(`border-${s}-style`);
      if (!bw || st === 'none' || st === 'hidden') return `<w:${s} w:val="nil"/>`;
      return `<w:${s} w:val="${st === 'dashed' ? 'dashed' : st === 'dotted' ? 'dotted' : st === 'double' ? 'double' : 'single'}" w:sz="${Math.max(2, Math.min(96, Math.round(bw * 6)))}" w:space="0" w:color="${hex(cs.getPropertyValue(`border-${s}-color`)) || '000000'}"/>`;
    };
    const fill = hex(cs.backgroundColor);
    const va = cs.verticalAlign === 'middle' ? 'center' : cs.verticalAlign === 'bottom' ? 'bottom' : 'top';
    const pr = `<w:tcPr><w:tcW w:w="${tw(w)}" w:type="dxa"/>${c.span > 1 ? `<w:gridSpan w:val="${c.span}"/>` : ''}${c.rows > 1 ? `<w:vMerge${cont ? '' : ' w:val="restart"'}/>` : cont ? '<w:vMerge/>' : ''}<w:tcBorders>${side('top')}${side('left')}${side('bottom')}${side('right')}</w:tcBorders>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}<w:vAlign w:val="${va}"/></w:tcPr>`;
    if (cont) return `<w:tc>${pr}<w:p/></w:tc>`;
    const inner: string[] = [];
    await blocks(c.el, cx2, inner, { cell: true });
    if (!inner.length || !/<\/w:p>$/.test(inner[inner.length - 1])) inner.push('<w:p/>');
    return `<w:tc>${pr}${inner.join('')}</w:tc>`;
  }
}

/* ------------------------------------------------------------------ ส่วนประกอบไฟล์ */

const A4 = { w: 11906, h: 16838 };

function stylesXml(std: boolean): string {
  const font = std ? 'TH SarabunPSK' : 'Sarabun';
  const sz = std ? 32 : 32;
  const rf = `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}" w:eastAsia="${font}"/>`;
  const head = (n: number, s: number) =>
    `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="${s}"/><w:szCs w:val="${s}"/></w:rPr></w:style>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr>${rf}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/><w:lang w:val="th-TH" w:eastAsia="th-TH" w:bidi="th-TH"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${head(1, 61)}${head(2, 46)}${head(3, 38)}<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`;
}

const SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat><w:themeFontLang w:val="en-US" w:bidi="th-TH"/></w:settings>`;

/** วาดเนื้อหาในกล่องซ่อนที่ฟอนต์/สไตล์เหมือนบนกระดาษ */
function makeHost(html: string, wopt: WordOpt, W: number, hf: boolean): HTMLElement {
  const host = document.createElement('div');
  host.className = hf ? 'st-flow st-hf' : 'st-flow';
  host.lang = 'th';
  if (wopt.std) host.dataset.std = '1';
  host.innerHTML = html;
  const base = flowBoxStyle(wopt, W);
  Object.assign(host.style, { position: 'absolute', left: '-99999px', top: '0', width: `${W}px`, pointerEvents: 'none', fontFamily: base.fontFamily });
  if (!hf) host.style.paddingLeft = host.style.paddingRight = '0px';
  else host.style.width = `${W - wopt.ml - wopt.mr}px`;
  (document.querySelector('.st-shell') || document.body).appendChild(host);
  hydrateFlow(host);
  return host;
}

const waitFigures = async (host: HTMLElement) => {
  const keys = Array.from(host.querySelectorAll<HTMLElement>('figure[data-graph],[data-shape]')).map(figureKey);
  for (let i = 0; i < 40 && keys.some((k) => !figurePng(k)); i++) await new Promise((r) => setTimeout(r, 75));
};

export interface DocxInput {
  flow: string;
  wopt: WordOpt;
  W: number;
  H: number;
  title: string;
  pages: number;
}

async function convert(html: string, wopt: WordOpt, cx: Ctx, part: Part, W: number): Promise<string> {
  const host = makeHost(html, wopt, W, part !== 'doc');
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    await waitFigures(host);
    const sub: Ctx = { ...cx, part, root: host };
    const out: string[] = [];
    await blocks(host, sub, out);
    cx.docPr = sub.docPr;
    return out.join('');
  } finally {
    host.remove();
  }
}

export async function buildDocx(inp: DocxInput): Promise<{ blob: Blob; warnings: string[] }> {
  const { default: JSZip } = await import('jszip');
  const { flow, wopt, W, H } = inp;
  const cx: Ctx = { part: 'doc', media: [], rels: [], numbering: [], nums: [], docPr: 0, root: document.body, page: { W, H }, imgs: new Map(), warn: [], pb: false };

  const body = await convert(flow, wopt, cx, 'doc', W - wopt.ml - wopt.mr);
  // หัว/ท้ายกระดาษ + เลขหน้า (ช่องเลขหน้าในหัว/ท้าย หรือเลขหน้าจากเมนู)
  const headHtml = withPageField(wopt, 'head');
  const footHtml = withPageField(wopt, 'foot');
  const hf = async (html: string, part: 'head' | 'foot') => (html.trim() ? convert(html, wopt, cx, part, W) : '');
  const hx = await hf(headHtml, 'head');
  const fx = await hf(footHtml, 'foot');
  // เลขหน้าตามรูปแบบ (หน้า 1 / หน้า 1 จาก 5 / ๑) เมื่อไม่ได้ใส่ช่องเลขหน้าเอง
  const numPara = (align: string) => {
    const fld = (code: string) => `<w:fldSimple w:instr=" ${code} "><w:r><w:t>1</w:t></w:r></w:fldSimple>`;
    const pr = (t: string) => `<w:r><w:t xml:space="preserve">${t}</w:t></w:r>`;
    const inner = wopt.numFmt === 'page' ? pr('หน้า ') + fld('PAGE') : wopt.numFmt === 'of' ? pr('หน้า ') + fld('PAGE') + pr(' จาก ') + fld('NUMPAGES') : fld(wopt.numFmt === 'thai' ? 'PAGE \\* ThaiArabic' : 'PAGE');
    return `<w:p><w:pPr><w:jc w:val="${align === 'right' ? 'right' : align === 'center' ? 'center' : 'left'}"/></w:pPr>${inner}</w:p>`;
  };
  const headFull = hx || (wopt.num === 'top' && !hasPageField(headHtml) ? numPara(wopt.numAlign) : '');
  const footFull = fx || (wopt.num === 'bottom' && !hasPageField(footHtml) ? numPara(wopt.numAlign) : '');

  const files: Record<string, string> = {};
  const relsXml = (extra: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${extra}</Relationships>`;
  const docRels = [
    { id: 'rIdSt', type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles', target: 'styles.xml' },
    { id: 'rIdSe', type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings', target: 'settings.xml' },
    ...(cx.nums.length ? [{ id: 'rIdNu', type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering', target: 'numbering.xml' }] : []),
    ...(headFull ? [{ id: 'rIdHd', type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header', target: 'header1.xml' }] : []),
    ...(footFull ? [{ id: 'rIdFt', type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer', target: 'footer1.xml' }] : []),
    ...cx.rels,
  ];
  const A4ish = (v: number, a: number) => (Math.abs(v - a) < 12 ? a : v);
  const pw = A4ish(tw(W), A4.w);
  const ph = A4ish(tw(H), A4.h);
  const sect =
    `<w:sectPr>${headFull ? '<w:headerReference w:type="default" r:id="rIdHd"/>' : ''}${footFull ? '<w:footerReference w:type="default" r:id="rIdFt"/>' : ''}` +
    (!wopt.numFirst && (headFull || footFull) ? `${headFull ? '<w:headerReference w:type="first" r:id="rIdHd0"/>' : ''}${footFull ? '<w:footerReference w:type="first" r:id="rIdFt0"/>' : ''}` : '') +
    `<w:pgSz w:w="${pw}" w:h="${ph}"/><w:pgMar w:top="${tw(wopt.mt)}" w:right="${tw(wopt.mr)}" w:bottom="${tw(wopt.mb)}" w:left="${tw(wopt.ml)}" w:header="${tw(hfOffset(wopt.mt))}" w:footer="${tw(hfOffset(wopt.mb))}" w:gutter="0"/>${wopt.numStart !== 1 ? `<w:pgNumType w:start="${wopt.numStart}"/>` : ''}${!wopt.numFirst ? '<w:titlePg/>' : ''}</w:sectPr>`;
  if (!wopt.numFirst) {
    if (headFull) docRels.push({ id: 'rIdHd0', type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header', target: 'header2.xml' });
    if (footFull) docRels.push({ id: 'rIdFt0', type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer', target: 'footer2.xml' });
  }
  files['word/document.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body || '<w:p/>'}${sect}</w:body></w:document>`;
  files['word/_rels/document.xml.rels'] = relsXml(docRels.map((r) => `<Relationship Id="${r.id}" Type="${r.type}" Target="${r.target}"/>`).join(''));
  files['word/styles.xml'] = stylesXml(wopt.std);
  files['word/settings.xml'] = SETTINGS;
  if (cx.nums.length)
    files['word/numbering.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering ${NS}>${cx.numbering.join('')}${cx.nums.map((n, i) => `<w:num w:numId="${i + 1}"><w:abstractNumId w:val="${n.absId}"/></w:num>`).join('')}</w:numbering>`;
  const wrapHf = (tag: 'hdr' | 'ftr', inner: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:${tag} ${NS}>${inner || '<w:p/>'}</w:${tag}>`;
  if (headFull) files['word/header1.xml'] = wrapHf('hdr', headFull);
  if (footFull) files['word/footer1.xml'] = wrapHf('ftr', footFull);
  if (!wopt.numFirst) {
    if (headFull) files['word/header2.xml'] = wrapHf('hdr', '');
    if (footFull) files['word/footer2.xml'] = wrapHf('ftr', '');
  }
  // ส่วนหัว/ท้ายอาจมีรูป: ความสัมพันธ์ของรูปต้องอยู่ในไฟล์ rels ของส่วนนั้นด้วย (ใช้ชุดเดียวกับเอกสาร)
  const hfRels = relsXml(cx.rels.map((r) => `<Relationship Id="${r.id}" Type="${r.type}" Target="${r.target}"/>`).join(''));
  for (const n of ['header1', 'footer1']) if (files[`word/${n}.xml`]) files[`word/_rels/${n}.xml.rels`] = hfRels;

  const exts = new Set(cx.media.map((m) => m.name.split('.').pop()!));
  const mimeOf = (e: string) => (e === 'jpeg' ? 'image/jpeg' : e === 'png' ? 'image/png' : e === 'gif' ? 'image/gif' : `image/${e}`);
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${[...exts].map((e) => `<Default Extension="${e}" ContentType="${mimeOf(e)}"/>`).join('')}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>${cx.nums.length ? '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' : ''}${['header1', 'header2'].filter((n) => files[`word/${n}.xml`]).map((n) => `<Override PartName="/word/${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>`).join('')}${['footer1', 'footer2'].filter((n) => files[`word/${n}.xml`]).map((n) => `<Override PartName="/word/${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const zip = new JSZip();
  zip.file('[Content_Types].xml', ct);
  zip.file('_rels/.rels', relsXml('<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'));
  zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(inp.title)}</dc:title><dc:creator>Learn5G Studio</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>`);
  for (const [k, v] of Object.entries(files)) zip.file(k, v);
  for (const m of cx.media) zip.file(`word/media/${m.name}`, m.bytes);
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
  return { blob, warnings: [...new Set(cx.warn)] };
}

/** สื่อแบบ Canva: ทุกหน้าเป็นรูปเต็มหน้า ใส่ในไฟล์ Word (หน้าตาเหมือนต้นฉบับ แต่แก้ข้อความไม่ได้) */
export async function buildImageDocx(pngs: Uint8Array[], W: number, H: number, title: string): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const rels: string[] = [];
  const paras: string[] = [];
  const pw = tw(W);
  const ph = tw(H);
  pngs.forEach((b, i) => {
    zip.file(`word/media/page${i + 1}.png`, b);
    rels.push(`<Relationship Id="rIdP${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/page${i + 1}.png"/>`);
    const cx = emu(W * 0.985);
    const cy = emu(H * 0.985);
    paras.push(
      `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${i + 1}" name="หน้า ${i + 1}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${i + 1}" name="p${i + 1}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdP${i + 1}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
    );
  });
  const relsXml = (x: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${x}</Relationships>`;
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
  zip.file('_rels/.rels', relsXml('<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'));
  zip.file('word/_rels/document.xml.rels', relsXml(`<Relationship Id="rIdSt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${rels.join('')}`));
  zip.file('word/styles.xml', stylesXml(true));
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${paras.join('')}<w:sectPr><w:pgSz w:w="${pw}" w:h="${ph}"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  void title;
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
}

