'use client';

import { buildPdf } from './pdf';

/** ส่งออกหน้าสื่อ (DOM ของ PageView ที่ขนาดจริง) เป็นรูป/PDF ในเครื่องผู้ใช้ ไม่ส่งข้อมูลไปที่ไหน */

/** ฟอนต์ที่ฝังในรูปปก: ดึงไฟล์ฟอนต์ทั้งหมดแล้วแปลง base64 หนักมาก (หน้าค้าง) ทำครั้งเดียวต่อการเปิดหน้า */
// shortcut: ฟอนต์ที่เพิ่งใช้ครั้งแรกหลังทำปกครั้งแรกจะไม่ฝังในรูปปก (ปกเล็ก 300px) ถ้าปกเพี้ยนจนเห็นชัดค่อยล้าง cache ตามชุดฟอนต์ที่ใช้
let thumbFonts: Promise<string> | null = null;

async function snap(node: HTMLElement, W: number, H: number, kind: 'png' | 'jpeg', pixelRatio: number, quality = 0.92, warm = true, thumb = false): Promise<string> {
  const { toJpeg, toPng, getFontEmbedCSS } = await import('html-to-image');
  if (typeof document !== 'undefined' && document.fonts?.ready) await document.fonts.ready;
  if (thumb) thumbFonts ??= getFontEmbedCSS(node).catch(() => '');
  const fontEmbedCSS = thumb ? await thumbFonts! : undefined;
  const opts = { width: W, height: H, pixelRatio, quality, backgroundColor: '#ffffff', cacheBust: false, skipAutoScale: true, ...(fontEmbedCSS !== undefined ? { fontEmbedCSS } : {}) };
  const run = () => (kind === 'png' ? toPng(node, opts) : toJpeg(node, opts));
  // ครั้งแรกบางเบราว์เซอร์ยังวาดรูป/ฟอนต์ไม่ทัน ถ่ายซ้ำอีกรอบให้ชัวร์
  if (warm) await run().catch(() => '');
  return run();
}

const bytesOf = (dataUrl: string) => {
  const b = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
};

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const safeName = (title: string) => (title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').trim() || 'สื่อการสอน').slice(0, 60);

/** ความละเอียดตอนส่งออก: ด้านยาวราว 2400-3300px พิมพ์ A4 คมชัด แต่ไม่ใหญ่จนเบราว์เซอร์มือถือค้าง */
export const exportRatio = (W: number, H: number) => Math.max(1, Math.min(3, 3000 / Math.max(W, H)));

export async function exportPng(nodes: HTMLElement[], W: number, H: number, title: string, onStep?: (i: number) => void) {
  const r = exportRatio(W, H);
  if (nodes.length === 1) {
    const url = await snap(nodes[0], W, H, 'png', r);
    saveBlob(new Blob([bytesOf(url)], { type: 'image/png' }), `${safeName(title)}.png`);
    return;
  }
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (let i = 0; i < nodes.length; i++) {
    onStep?.(i);
    zip.file(`${safeName(title)}-หน้า${i + 1}.png`, bytesOf(await snap(nodes[i], W, H, 'png', r, 0.92, i === 0)));
  }
  saveBlob(await zip.generateAsync({ type: 'blob' }), `${safeName(title)}.zip`);
}

export async function exportPdf(nodes: HTMLElement[], W: number, H: number, title: string, onStep?: (i: number) => void) {
  const r = Math.min(2.5, exportRatio(W, H));
  const pages = [];
  for (let i = 0; i < nodes.length; i++) {
    onStep?.(i);
    pages.push({ jpeg: bytesOf(await snap(nodes[i], W, H, 'jpeg', r, 0.92, i === 0)), wPt: W * 0.75, hPt: H * 0.75 });
  }
  const pdf = buildPdf(pages);
  saveBlob(new Blob([pdf as BlobPart], { type: 'application/pdf' }), `${safeName(title)}.pdf`);
}

/** รูปปกเล็ก (กว้าง 300px) เก็บในฐานข้อมูลไว้โชว์บนการ์ด จำกัดไม่เกิน ~58KB */
let thumbWarm = false;
export async function makeThumb(node: HTMLElement, W: number, H: number): Promise<string | null> {
  for (const q of [0.72, 0.55, 0.4]) {
    const url = await snap(node, W, H, 'jpeg', 300 / W, q, q === 0.72 && !thumbWarm, true).catch(() => '');
    thumbWarm = true;
    if (url.startsWith('data:image/jpeg;base64,') && url.length <= 58000) return url;
  }
  return null;
}
