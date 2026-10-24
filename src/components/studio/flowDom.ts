'use client';

import { texToHtml } from '@/components/creator/math/MathText';
import { cleanGraph, graphToSvg } from '@/lib/studio/graph';
import { shapeById } from './shapes';

/** รูปร่างแบบ Word: เส้นตรงวาดทแยงตามทิศที่ลาก (ln = ลงขวา, ln2 = ขึ้นขวา) */
const LINES: Record<string, string> = { ln: 'M0,0 L100,100', ln2: 'M0,100 L100,0' };
export const isLineShape = (id: string) => id in LINES;

/** SVG ของรูปร่าง (สีผ่านตัวกรองมาแล้วเป็น #hex/none) */
export function shapeSvg(el: HTMLElement): string {
  const id = el.dataset.shape || 'rect';
  const line = LINES[id];
  const d = line ?? shapeById(id).d;
  const fill = line ? 'none' : el.dataset.fill || '#bfdbfe';
  const stroke = el.dataset.stroke || '#1f1b36';
  const sw = Number(el.dataset.sw ?? 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;overflow:visible"><path d="${d}" fill="${fill}" fill-rule="evenodd" stroke="${sw > 0 ? stroke : 'none'}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
}

/** รูป PNG ของกราฟ/รูปร่าง (ไว้คัดลอกไปวางใน Word) ทำเตรียมไว้ตอนวาด เพราะตอนคัดลอกรอโหลดรูปไม่ได้ */
const pngs = new Map<string, string>();
export const figurePng = (key: string) => pngs.get(key);
function makePng(key: string, svg: string, w: number, h: number) {
  if (pngs.has(key) || typeof Image === 'undefined' || w < 2 || h < 2) return;
  pngs.set(key, '');
  // ขนาดจริงของ SVG (กราฟระบุ width/height เป็น 100% ไม่ได้ วาดลงรูปต้องรู้ขนาด)
  const sized = svg.replace(/<svg([^>]*?)\swidth="[^"]*"\s+height="[^"]*"/, '<svg$1').replace('<svg', `<svg width="${w}" height="${h}"`);
  const img = new Image();
  img.onload = () => {
    const k = 2;
    const c = document.createElement('canvas');
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    const g = c.getContext('2d');
    if (!g) return;
    g.scale(k, k);
    g.drawImage(img, 0, 0, w, h);
    try {
      pngs.set(key, c.toDataURL('image/png'));
    } catch {
      pngs.delete(key);
    }
    if (pngs.size > 200) pngs.delete(pngs.keys().next().value!);
  };
  img.onerror = () => pngs.delete(key);
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized.includes('xmlns=') ? sized : sized.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'))}`;
}
/** กุญแจของรูปเตรียมไว้: ข้อมูลต้นทาง + สี */
export const figureKey = (el: HTMLElement) => (el.dataset.graph ? `g:${el.dataset.graph}` : `s:${el.dataset.shape}|${el.dataset.fill}|${el.dataset.stroke}|${el.dataset.sw}|${el.dataset.ar}`);

/** วาดสมการ/กราฟ/รูปร่างในเนื้อหาโหมดเอกสาร (HTML เก็บแค่ข้อมูลต้นทาง data-tex / data-graph / data-shape) */
export function hydrateFlow(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('span[data-tex]').forEach((el) => {
    const t = el.dataset.tex || '';
    if (el.dataset.done !== t) {
      el.innerHTML = texToHtml(t, false, true);
      el.dataset.done = t;
    }
    el.contentEditable = 'false';
  });
  root.querySelectorAll<HTMLElement>('figure[data-graph]').forEach((el) => {
    const g = el.dataset.graph || '';
    if (el.dataset.done !== g) {
      try {
        const s = cleanGraph(JSON.parse(g));
        const svg = graphToSvg(s);
        el.innerHTML = svg;
        el.style.aspectRatio = `${s.w} / ${s.h}`;
        makePng(figureKey(el), svg, s.w, s.h);
      } catch {
        el.innerHTML = '';
      }
      el.dataset.done = g;
    }
    el.contentEditable = 'false';
  });
  root.querySelectorAll<HTMLElement>('[data-shape]').forEach((el) => {
    const key = figureKey(el);
    if (el.dataset.done !== key) {
      const svg = shapeSvg(el);
      el.innerHTML = svg;
      const ar = Number(el.dataset.ar) || 1;
      el.style.aspectRatio = `${ar}`;
      el.dataset.done = key;
      makePng(key, svg, 300, Math.max(2, 300 / ar));
    }
    el.contentEditable = 'false';
  });
}
