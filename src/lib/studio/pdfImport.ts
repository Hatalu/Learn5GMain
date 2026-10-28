/**
 * นำเข้าไฟล์ PDF (ใช้ในเบราว์เซอร์เท่านั้น โหลด pdf.js แบบ dynamic)
 * - แบบแก้ไขได้: อ่านข้อความทีละบรรทัดตามตำแหน่งจริง แล้วเดาสมการจากรูปร่าง
 *   (ตัวเล็กยกสูง = ยกกำลัง, ตัวเล็กต่ำ = ตัวห้อย, บรรทัดสั้นซ้อนบน-ล่าง = เศษส่วน, มีเครื่องหมายคณิต = ช่องสมการ)
 *   PDF ไม่มีโครงสร้างสมการเก็บไว้ ผลจึงเป็นการเดา สมการซับซ้อนอาจต้องแก้เอง
 * - แบบเหมือนต้นฉบับ: วาดแต่ละหน้าเป็นรูป (ใช้ในโหมด Canva)
 */
import { texOfText } from './ommlTex';
import type { AddImage, ImportResult } from './docxImport';
import { cutBlocks, MAX_IMPORT } from './docxImport';

type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
let lib: Promise<PdfJs> | null = null;
// รุ่น legacy: pdf.js รุ่นปกติใช้คำสั่งใหม่มาก (Map.getOrInsertComputed) เบราว์เซอร์เก่าและแอป (Chromium 130) เปิด PDF ไม่ได้
function pdfjs(): Promise<PdfJs> {
  if (!lib) {
    lib = import('pdfjs-dist/legacy/build/pdf.mjs').then((p) => {
      if (!p.GlobalWorkerOptions.workerSrc) p.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
      return p;
    });
  }
  return lib;
}
async function open(data: Uint8Array) {
  const p = await pdfjs();
  // pdf.js รุ่น 6 ไม่ใช้ eval กับฟอนต์ และปิด XFA (ฟอร์มสคริปต์)
  const task = p.getDocument({ data: data.slice(), useSystemFonts: true, enableXfa: false });
  const doc = await task.promise;
  return Object.assign(doc, { close: () => task.destroy() });
}

interface Tok {
  s: string;
  x: number;
  w: number;
  y: number;
  size: number;
  /** ยกกำลัง/ตัวห้อยของบรรทัด */
  pos?: 'sup' | 'sub';
}
interface Line {
  y: number;
  size: number;
  toks: Tok[];
  x0: number;
  x1: number;
  frac?: { x0: number; x1: number; tex: string }[];
}

const THAI = /[฀-๿]/;
const MATHY = /[=<>+×÷±√π∞≤≥≠∑∫∠°∈∉⊂⊆∪∩→⇒⇔∴∵^]|\d\s*[-−/]\s*\d|[a-zA-Z]\s*[=+−-]\s*\w/;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) => esc(s).replace(/"/g, '&quot;');
const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)] || 12;
};

/** ข้อความของชิ้นเล็กๆ ในบรรทัดเป็น LaTeX */
const toksTex = (toks: Tok[]) =>
  toks
    .map((t) => {
      const body = texOfText(t.s.replace(/−/g, '-'));
      return t.pos === 'sup' ? `^{${body}}` : t.pos === 'sub' ? `_{${body}}` : body;
    })
    .join('')
    .replace(/(^|[^}\w])\^/g, '$1{}^')
    .trim();

/** หนึ่งบรรทัดเป็น HTML: ช่วงที่มีภาษาไทยเป็นข้อความ ช่วงอื่นที่ดูเป็นคณิตเป็นช่องสมการ */
function lineHtml(l: Line, eq: { n: number }): string {
  const toks = [...l.toks].sort((a, b) => a.x - b.x);
  // แทรกเศษส่วนที่ตรวจเจอเป็นชิ้นพิเศษตามตำแหน่ง x
  const items: (Tok | { frac: string; x: number })[] = [...toks];
  for (const f of l.frac ?? []) items.push({ frac: f.tex, x: f.x0 });
  items.sort((a, b) => a.x - b.x);
  let out = '';
  let mathRun: (Tok | { frac: string; x: number })[] = [];
  let lastEnd = -1;
  const flushMath = () => {
    if (!mathRun.length) return;
    const hasStruct = mathRun.some((t) => 'frac' in t || t.pos);
    const raw = mathRun.map((t) => ('frac' in t ? '' : t.s)).join('');
    if (hasStruct || MATHY.test(raw)) {
      const tex = mathRun.map((t) => ('frac' in t ? t.frac : toksTex([t]))).join(' ').replace(/\s+/g, ' ').trim();
      if (tex) {
        out += `<span data-tex="${escAttr(tex)}"></span>`;
        eq.n++;
      }
    } else out += esc(raw);
    mathRun = [];
  };
  for (const t of items) {
    // ช่องว่างระหว่างชิ้น (pdf.js ไม่ได้ให้ช่องว่างเสมอ)
    const gap = lastEnd >= 0 && t.x - lastEnd > l.size * 0.22;
    if ('frac' in t || t.pos || !THAI.test(t.s)) {
      if (gap && !mathRun.length) out += ' ';
      mathRun.push(t);
      lastEnd = 'frac' in t ? t.x + 1 : t.x + t.w;
      continue;
    }
    flushMath();
    if (gap) out += ' ';
    out += esc(t.s);
    lastEnd = t.x + t.w;
  }
  flushMath();
  return out.replace(/ {2,}/g, ' ').trim();
}

/**
 * ตำแหน่งรูปในหน้า (px ของ viewport scale 1, มุมบนซ้าย) จากรายการคำสั่งวาด: ติดตามเมทริกซ์ save/restore/transform
 * รูปถูกวาดลงสี่เหลี่ยมหน่วย 1x1 ที่ผ่านเมทริกซ์ปัจจุบัน
 */
async function imageRects(p: PdfJs, page: Awaited<ReturnType<Awaited<ReturnType<typeof open>>['getPage']>>, vp: ReturnType<typeof page.getViewport>) {
  const ops = await page.getOperatorList();
  const O = p.OPS;
  type M = number[];
  const mul = (m: M, n: M): M => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  let ctm: M = [1, 0, 0, 1, 0, 0];
  const stack: M[] = [];
  const out: { x: number; y: number; w: number; h: number }[] = [];
  ops.fnArray.forEach((fn, i) => {
    const a = ops.argsArray[i] as unknown[];
    if (fn === O.save) stack.push(ctm);
    else if (fn === O.restore) ctm = stack.pop() ?? ctm;
    else if (fn === O.transform) ctm = mul(ctm, a as M);
    else if (fn === O.paintFormXObjectBegin) {
      stack.push(ctm);
      if (Array.isArray(a?.[0]) && (a[0] as M).length === 6) ctm = mul(ctm, a[0] as M);
    } else if (fn === O.paintFormXObjectEnd) ctm = stack.pop() ?? ctm;
    else if (fn === O.paintImageXObject || fn === O.paintInlineImageXObject || fn === O.paintImageXObjectRepeat) {
      const xs = [ctm[4], ctm[4] + ctm[0], ctm[4] + ctm[2], ctm[4] + ctm[0] + ctm[2]];
      const ys = [ctm[5], ctm[5] + ctm[1], ctm[5] + ctm[3], ctm[5] + ctm[1] + ctm[3]];
      const [x1, y1] = vp.convertToViewportPoint(Math.min(...xs), Math.min(...ys)) as number[];
      const [x2, y2] = vp.convertToViewportPoint(Math.max(...xs), Math.max(...ys)) as number[];
      const r = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
      // ข้ามรูปเล็กมาก (จุด/เส้น)
      if (r.w >= 24 && r.h >= 24) out.push(r);
    }
  });
  return out;
}

/** อ่านข้อความทั้งไฟล์เป็นเนื้อหาโหมดเอกสาร (รูปในหน้าตัดจากหน้าที่วาดแล้วส่งผ่าน addImage วางตามลำดับบน-ล่าง) */
export async function pdfToFlow(data: Uint8Array, onPage?: (i: number, n: number) => void, addImage?: AddImage): Promise<ImportResult> {
  const doc = await open(data);
  const p = await pdfjs();
  const eq = { n: 0 };
  const blocks: string[] = [];
  let paragraphs = 0;
  let images = 0;
  let dropped = 0;
  try {
    for (let pn = 1; pn <= doc.numPages; pn++) {
      onPage?.(pn, doc.numPages);
      const page = await doc.getPage(pn);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent();
      const toks: Tok[] = [];
      for (const it of tc.items as { str?: string; transform?: number[]; width?: number }[]) {
        if (!it.str || !it.transform || !it.str.trim()) continue;
        const [a, b, , d, e, f] = it.transform;
        const size = Math.hypot(a, b) || Math.abs(d) || 10;
        toks.push({ s: it.str, x: e, w: it.width || it.str.length * size * 0.5, y: vp.height - f, size });
      }
      // รูปในหน้า: วาดหน้าครั้งเดียวแล้วตัดเฉพาะกรอบรูป
      const pics: { y: number; html: string }[] = [];
      // รูปเต็มหน้าเป็นพื้นหลังของหน้าที่มีข้อความ (ข้าม) แต่หน้าที่ไม่มีข้อความเลย (สแกน/รูปทั้งหน้า) ใช้รูปนั้นแทนหน้า
      const rects = addImage ? (await imageRects(p, page, vp).catch(() => [])).filter((r) => !toks.length || r.w * r.h < vp.width * vp.height * 0.85) : [];
      if (rects.length && addImage) {
        const K = 2;
        const c = document.createElement('canvas');
        c.width = Math.round(vp.width * K);
        c.height = Math.round(vp.height * K);
        const g = c.getContext('2d')!;
        g.fillStyle = '#fff';
        g.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: g, canvas: c, viewport: page.getViewport({ scale: K }), intent: 'print' }).promise;
        for (const r of rects) {
          const cut = document.createElement('canvas');
          cut.width = Math.max(1, Math.round(r.w * K));
          cut.height = Math.max(1, Math.round(r.h * K));
          cut.getContext('2d')!.drawImage(c, r.x * K, r.y * K, r.w * K, r.h * K, 0, 0, cut.width, cut.height);
          const blob = await new Promise<Blob | null>((ok) => cut.toBlob(ok, 'image/jpeg', 0.88));
          const src = blob ? await addImage(new Uint8Array(await blob.arrayBuffer()), 'image/jpeg').catch(() => '') : '';
          if (!src) {
            dropped++;
            continue;
          }
          images++;
          const k = 96 / 72;
          pics.push({ y: r.y, html: `<p style="margin-left: ${Math.max(0, Math.round((r.x - 72) * k))}px"><img src="${escAttr(src)}" style="width: ${Math.round(r.w * k)}px"></p>` });
        }
      }
      pics.sort((a, b) => a.y - b.y);
      if (!toks.length && !pics.length) continue;
      const base = toks.length ? median(toks.map((t) => t.size)) : 12;
      // บรรทัดหลักจากชิ้นขนาดปกติ แล้วค่อยแปะชิ้นเล็ก (ยกกำลัง/ตัวห้อย) เข้าบรรทัดที่ใกล้สุด
      const big = toks.filter((t) => t.size >= base * 0.8).sort((p, q) => p.y - q.y || p.x - q.x);
      const small = toks.filter((t) => t.size < base * 0.8);
      const lines: Line[] = [];
      for (const t of big) {
        const l = lines.find((x) => Math.abs(x.y - t.y) < x.size * 0.3);
        if (l) l.toks.push(t);
        else lines.push({ y: t.y, size: t.size, toks: [t], x0: 0, x1: 0 });
      }
      for (const t of small) {
        let best: Line | null = null;
        for (const l of lines) if (Math.abs(l.y - t.y) < l.size * 0.85 && (!best || Math.abs(l.y - t.y) < Math.abs(best.y - t.y))) best = l;
        if (!best) {
          lines.push({ y: t.y, size: t.size, toks: [t], x0: 0, x1: 0 });
          continue;
        }
        t.pos = t.y < best.y - best.size * 0.12 ? 'sup' : t.y > best.y + best.size * 0.08 ? 'sub' : undefined;
        best.toks.push(t);
      }
      lines.sort((p, q) => p.y - q.y);
      for (const l of lines) {
        l.x0 = Math.min(...l.toks.map((t) => t.x));
        l.x1 = Math.max(...l.toks.map((t) => t.x + t.w));
      }
      // เศษส่วน: บรรทัดสั้นบน/ล่างซ้อนกันชิดๆ คร่อมบรรทัดกลางที่ตรงนั้นว่าง
      for (let i = 1; i + 1 < lines.length; i++) {
        const [top, mid, bot] = [lines[i - 1], lines[i], lines[i + 1]];
        if (!top.toks.length || !bot.toks.length) continue;
        const dy1 = mid.y - top.y;
        const dy2 = bot.y - mid.y;
        if (dy1 > mid.size * 1.05 || dy2 > mid.size * 1.05 || dy1 < mid.size * 0.25 || dy2 < mid.size * 0.25) continue;
        const ov = Math.min(top.x1, bot.x1) - Math.max(top.x0, bot.x0);
        if (ov < Math.min(top.x1 - top.x0, bot.x1 - bot.x0) * 0.5) continue;
        if (mid.toks.some((t) => t.x < Math.max(top.x1, bot.x1) && t.x + t.w > Math.min(top.x0, bot.x0))) continue;
        (mid.frac ??= []).push({ x0: Math.min(top.x0, bot.x0), x1: Math.max(top.x1, bot.x1), tex: `\\frac{${toksTex(top.toks.sort((p, q) => p.x - q.x))}}{${toksTex(bot.toks.sort((p, q) => p.x - q.x))}}` });
        top.toks = [];
        bot.toks = [];
      }
      const left = lines.length ? Math.min(...lines.filter((l) => l.toks.length || l.frac).map((l) => l.x0)) : 72;
      const k = 96 / 72;
      let prevY = -1;
      for (const l of lines) {
        // รูปที่อยู่เหนือบรรทัดนี้ใส่ก่อน
        while (pics.length && pics[0].y < l.y) blocks.push(pics.shift()!.html);
        if (!l.toks.length && !l.frac) continue;
        if (!l.toks.length && l.frac) l.x0 = l.frac[0].x0;
        // ช่องว่างแนวตั้งกว้าง = ย่อหน้าว่างคั่น
        if (prevY >= 0 && l.y - prevY > l.size * 2.4) blocks.push('<p><br></p>');
        prevY = l.y;
        const html = lineHtml(l, eq);
        if (!html) continue;
        const st: string[] = [];
        const centered = Math.abs(l.x0 - left - (vp.width - left - l.x1)) < base * 2 && l.x0 - left > base * 4;
        if (centered) st.push('text-align: center');
        else if (l.x0 - left > base * 0.8) st.push(`margin-left: ${Math.round((l.x0 - left) * k)}px`);
        if (Math.abs(l.size - 16) > 1) st.push(`font-size: ${Math.round(l.size * k * 10) / 10}px`);
        blocks.push(`<p${st.length ? ` style="${st.join('; ')}"` : ''}>${html}</p>`);
        paragraphs++;
      }
      for (const pic of pics) blocks.push(pic.html);
      if (pn < doc.numPages) blocks.push('<div data-pb="1"></div>');
      page.cleanup();
    }
  } finally {
    await doc.close();
  }
  const all = blocks.join('');
  const html = cutBlocks(all, MAX_IMPORT);
  return { html, head: '', foot: '', stats: { paragraphs, equations: eq.n, failedEq: 0, images, droppedImages: dropped, truncated: html.length < all.length } };
}

/** วาดแต่ละหน้าเป็นรูป JPEG (กว้าง width px) ทีละหน้า */
export async function pdfPageImages(data: Uint8Array, opt: { width: number; maxPages: number; onPage: (jpeg: Blob, i: number, n: number, ratio: number) => Promise<void> }) {
  const doc = await open(data);
  try {
    const n = Math.min(doc.numPages, opt.maxPages);
    for (let pn = 1; pn <= n; pn++) {
      const page = await doc.getPage(pn);
      const vp0 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: opt.width / vp0.width });
      const c = document.createElement('canvas');
      c.width = Math.round(vp.width);
      c.height = Math.round(vp.height);
      const g = c.getContext('2d')!;
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: g, canvas: c, viewport: vp, intent: 'print' }).promise;
      const blob = await new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error('jpeg'))), 'image/jpeg', 0.82));
      await opt.onPage(blob, pn - 1, n, vp0.height / vp0.width);
      page.cleanup();
    }
    return { pages: n, total: doc.numPages };
  } finally {
    await doc.close();
  }
}
