/**
 * สร้างรูปตัวอย่างทีละหน้าจากไฟล์ PDF/Word ในเบราว์เซอร์ของ Dev ตอนอัปโหลด แล้วฝังลายน้ำโลโก้ลงในรูปเลย
 * (ผู้ชมเห็นเฉพาะรูปที่มีลายน้ำ ไฟล์ต้นฉบับอยู่ใน bucket ส่วนตัว)
 * โหลดแบบ dynamic เท่านั้น ห้าม import จากฝั่งเซิร์ฟเวอร์
 */
import { PREVIEW_MAX_PAGES } from '@/lib/documents';

/** ความกว้างรูปตัวอย่าง (อ่านได้ชัดบนจอ แต่ไม่ละเอียดพอพิมพ์แทนไฟล์จริง) */
export const PREVIEW_WIDTH = 1100;
const A4_RATIO = 297 / 210;

type OnPage = (blob: Blob, index: number, total: number) => Promise<void> | void;

let logo: Promise<HTMLImageElement | null> | null = null;
function loadLogo(): Promise<HTMLImageElement | null> {
  if (!logo) {
    logo = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = '/logo.png';
    });
  }
  return logo;
}

/** ลายน้ำ: โลโก้สื่อการสอน 5G จางๆ กลางหน้า + ข้อความเฉียงทั่วหน้า */
export async function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = await loadLogo();
  const family = getComputedStyle(document.body).fontFamily || 'sans-serif';
  ctx.save();

  if (img) {
    const size = Math.min(w, h) * 0.46;
    const x = (w - size) / 2;
    const y = (h - size) / 2;
    ctx.globalAlpha = 0.085;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
    ctx.save();
  }

  const fs = Math.round(w * 0.03);
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#5b21b6';
  ctx.font = `600 ${fs}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 6);
  const text = 'สื่อการสอน 5G';
  const stepX = fs * 11;
  const stepY = fs * 6;
  const span = Math.hypot(w, h);
  for (let yy = -span / 2, row = 0; yy <= span / 2; yy += stepY, row++) {
    for (let xx = -span / 2 + (row % 2 ? stepX / 2 : 0); xx <= span / 2; xx += stepX) {
      ctx.fillText(text, xx, yy);
    }
  }
  ctx.restore();
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('สร้างรูปตัวอย่างไม่สำเร็จ'))), 'image/webp', 0.8)
  );
}

function newCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.round(w);
  c.height = Math.round(h);
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('เบราว์เซอร์นี้สร้างรูปตัวอย่างไม่ได้');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  return { c, ctx };
}

/** PDF: วาดทุกหน้าด้วย pdf.js (ไม่เกิน PREVIEW_MAX_PAGES) คืนจำนวนหน้าทั้งหมดของไฟล์ */
export async function renderPdfPreviews(file: Blob, onPage: OnPage): Promise<number> {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  }
  const data = new Uint8Array(await file.arrayBuffer());
  // pdf.js รุ่น 6 ไม่ใช้ eval กับฟอนต์แล้ว (ช่องโหว่ฟอนต์อันตรายแบบรุ่นเก่าไม่มี)
  const task = pdfjs.getDocument({ data, useSystemFonts: true, enableXfa: false });
  const doc = await task.promise;
  try {
    const total = doc.numPages;
    const n = Math.min(total, PREVIEW_MAX_PAGES);
    for (let i = 1; i <= n; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: PREVIEW_WIDTH / base.width });
      const { c, ctx } = newCanvas(viewport.width, viewport.height);
      // intent 'print' ไม่รอ requestAnimationFrame (ยังทำงานต่อได้ถ้า Dev สลับไปแท็บอื่นระหว่างอัปโหลด)
      await page.render({ canvas: c, canvasContext: ctx, viewport, intent: 'print' }).promise;
      page.cleanup();
      await drawWatermark(ctx, c.width, c.height);
      await onPage(await toBlob(c), i - 1, n);
      c.width = c.height = 0;
    }
    return total;
  } finally {
    await task.destroy();
  }
}

/**
 * Word (.docx): จำลองหน้าด้วย docx-preview แล้วถ่ายเป็นรูปทีละหน้า (ใกล้เคียง ไม่เป๊ะเท่า PDF
 * เพราะฟอนต์/การตัดหน้าขึ้นกับเครื่อง) .doc แบบเก่าทำตัวอย่างไม่ได้
 */
export async function renderDocxPreviews(file: Blob, onPage: OnPage): Promise<number> {
  const [{ renderAsync }, { toCanvas }] = await Promise.all([import('docx-preview'), import('html-to-image')]);
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-20000px;top:0;width:1000px;background:#fff;pointer-events:none;z-index:-1;';
  document.body.appendChild(host);
  try {
    await renderAsync(await file.arrayBuffer(), host, undefined, {
      inWrapper: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: false,
      useBase64URL: true,
      renderHeaders: true,
      renderFooters: true,
      renderComments: false,
      renderChanges: false,
      experimental: true,
    });
    const sections = Array.from(host.querySelectorAll<HTMLElement>('section.docx'));
    if (!sections.length) return 0;

    // ตัดเป็นหน้าๆ ตามความสูงกระดาษของแต่ละส่วน (ส่วนที่ยาวเกินหน้าจะถูกแบ่งต่อ)
    const slices: { section: HTMLElement; y: number; w: number; h: number }[] = [];
    for (const section of sections) {
      const w = section.offsetWidth || 794;
      // ใช้ค่าที่คำนวณเป็น px แล้ว (ใน style เป็นหน่วย pt)
      const pageH = parseFloat(getComputedStyle(section).minHeight) || w * A4_RATIO;
      const full = Math.max(section.scrollHeight, pageH);
      // ล้นหน้านิดเดียว (ฟอนต์ในเครื่องต่างจากต้นฉบับ) ให้ยืดหน้าสุดท้ายแทนการตัดเป็นหน้าเกือบว่าง
      const count = Math.max(1, Math.ceil(full / pageH - 0.25));
      for (let k = 0; k < count && slices.length < PREVIEW_MAX_PAGES; k++) {
        const y = k * pageH;
        slices.push({ section, y, w, h: k === count - 1 ? Math.max(pageH, full - y) : pageH });
      }
    }

    for (let i = 0; i < slices.length; i++) {
      const { section, y, w, h } = slices[i];
      // กรอบขนาด 1 หน้า ซ่อนส่วนเกิน แล้วเลื่อนเนื้อหาขึ้นตามหน้าที่ต้องการ
      const frame = document.createElement('div');
      frame.style.cssText = `width:${w}px;height:${h}px;overflow:hidden;background:#fff;position:relative;`;
      const inner = section.cloneNode(true) as HTMLElement;
      inner.style.marginTop = `${-y}px`;
      inner.style.marginBottom = '0';
      inner.style.boxShadow = 'none';
      frame.appendChild(inner);
      host.appendChild(frame);
      const ratio = PREVIEW_WIDTH / w;
      const shot = await toCanvas(frame, { pixelRatio: ratio, backgroundColor: '#ffffff', skipFonts: true, cacheBust: false });
      frame.remove();
      const { c, ctx } = newCanvas(shot.width, shot.height);
      ctx.drawImage(shot, 0, 0);
      await drawWatermark(ctx, c.width, c.height);
      await onPage(await toBlob(c), i, slices.length);
      c.width = c.height = shot.width = shot.height = 0;
    }
    return slices.length;
  } finally {
    host.remove();
  }
}
