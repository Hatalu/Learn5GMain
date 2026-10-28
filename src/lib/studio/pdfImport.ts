/**
 * นำเข้าไฟล์ PDF (ใช้ในเบราว์เซอร์เท่านั้น โหลด pdf.js แบบ dynamic)
 * - แบบแก้ไขได้: อ่านข้อความทีละบรรทัดตามตำแหน่งจริง แล้วเดาสมการจากรูปร่าง
 *   (ตัวเล็กยกสูง = ยกกำลัง, ตัวเล็กต่ำ = ตัวห้อย, บรรทัดสั้นซ้อนบน-ล่าง = เศษส่วน, มีเครื่องหมายคณิต = ช่องสมการ)
 *   PDF ไม่มีโครงสร้างสมการเก็บไว้ ผลจึงเป็นการเดา สมการซับซ้อนอาจต้องแก้เอง
 * - แบบเหมือนต้นฉบับ: วาดแต่ละหน้าเป็นรูป (ใช้ในโหมด Canva)
 */
import { texOfText } from './ommlTex';
import type { ImportResult } from './docxImport';
import { cutBlocks, MAX_IMPORT } from './docxImport';

type PdfJs = typeof import('pdfjs-dist');
let lib: Promise<PdfJs> | null = null;
function pdfjs(): Promise<PdfJs> {
  if (!lib) {
    lib = import('pdfjs-dist').then((p) => {
      if (!p.GlobalWorkerOptions.workerSrc) p.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
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

/** อ่านข้อความทั้งไฟล์เป็นเนื้อหาโหมดเอกสาร */
export async function pdfToFlow(data: Uint8Array, onPage?: (i: number, n: number) => void): Promise<ImportResult> {
  const doc = await open(data);
  const eq = { n: 0 };
  const blocks: string[] = [];
  let paragraphs = 0;
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
      if (!toks.length) continue;
      const base = median(toks.map((t) => t.size));
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
      const left = Math.min(...lines.filter((l) => l.toks.length || l.frac).map((l) => l.x0));
      const k = 96 / 72;
      let prevY = -1;
      for (const l of lines) {
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
      if (pn < doc.numPages) blocks.push('<div data-pb="1"></div>');
      page.cleanup();
    }
  } finally {
    await doc.close();
  }
  const all = blocks.join('');
  const html = cutBlocks(all, MAX_IMPORT);
  return { html, head: '', foot: '', stats: { paragraphs, equations: eq.n, failedEq: 0, images: 0, droppedImages: 0, truncated: html.length < all.length } };
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
