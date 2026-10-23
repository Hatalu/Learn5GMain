'use client';

import { texToHtml } from '@/components/creator/math/MathText';
import { cleanGraph, graphToSvg } from '@/lib/studio/graph';

/** วาดสมการ/กราฟในเนื้อหาโหมดเอกสาร (HTML เก็บแค่ข้อมูลต้นทาง data-tex / data-graph) */
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
        el.innerHTML = graphToSvg(s);
        el.style.aspectRatio = `${s.w} / ${s.h}`;
      } catch {
        el.innerHTML = '';
      }
      el.dataset.done = g;
    }
    el.contentEditable = 'false';
  });
}
