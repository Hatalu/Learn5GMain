'use client';

import katex from 'katex';
import { mathmlToOmml } from '@/lib/studio/omml';
import { WORD_SINGLE } from '@/lib/studio/flow';
import { figureKey, figurePng } from './flowDom';

/**
 * คัดลอกจากโหมดเอกสารไปวางใน Microsoft Word ให้หน้าตาเหมือนเดิม:
 * ใส่สไตล์จริงทุกจุด (ฟอนต์ ขนาดเป็น pt สี) ไม่ติดพื้นหลังของหน้าเว็บ สมการเป็นสมการของ Word กราฟ/รูปร่างเป็นรูป PNG
 */

const pt = (px: number) => `${Math.round(px * 0.75 * 2) / 2}pt`;
const INK = new Set(['rgb(31, 27, 54)', 'rgb(0, 0, 0)']);
/** ชื่อฟอนต์จริง (next/font ตั้งชื่อเป็น __Kanit_abc123 ต้องแปลงกลับเป็น Kanit ให้ Word รู้จัก) */
export function wordFont(family: string): string {
  const first = family.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  const m = first.match(/^__(.+?)_[0-9a-f]{4,}$/i);
  return (m ? m[1].replace(/_/g, ' ') : first).replace(/'/g, '');
}

const BLOCK = /^(P|DIV|H1|H2|H3|LI|BLOCKQUOTE|TD|TH)$/;

function styleOf(el: HTMLElement): string {
  const cs = getComputedStyle(el);
  const s: string[] = [];
  const own = el.style;
  s.push(`font-family:'${wordFont(cs.fontFamily)}'`);
  s.push(`font-size:${pt(parseFloat(cs.fontSize))}`);
  s.push(`color:${INK.has(cs.color) ? '#000000' : cs.color}`);
  if (+cs.fontWeight >= 600) s.push('font-weight:bold');
  if (cs.fontStyle === 'italic') s.push('font-style:italic');
  const deco = cs.textDecorationLine;
  if (deco && deco !== 'none') s.push(`text-decoration:${deco}`);
  // พื้นหลังเฉพาะที่ผู้ใช้ตั้งเอง (ไฮไลต์/แรเงา) ห้ามติดสีของหน้าเว็บ
  if (own.backgroundColor) s.push(`background:${cs.backgroundColor}`);
  if (BLOCK.test(el.tagName)) {
    s.push('margin:0');
    if (cs.textAlign && cs.textAlign !== 'start' && cs.textAlign !== 'left') s.push(`text-align:${cs.textAlign}`);
    if (own.marginLeft) s.push(`margin-left:${pt(parseFloat(own.marginLeft))}`);
    if (own.textIndent) s.push(`text-indent:${pt(parseFloat(cs.textIndent))}`);
    // ระยะบรรทัดแบบ Word = จำนวนเท่าของบรรทัดเดี่ยว
    const lh = parseFloat(cs.lineHeight);
    if (own.lineHeight && lh) s.push(`line-height:${Math.round((lh / parseFloat(cs.fontSize) / WORD_SINGLE) * 100)}%`);
  }
  return s.join(';');
}

/** HTML สำหรับคลิปบอร์ดจากช่วงที่เลือก (null = ไม่ต้องจัดการเอง) */
export function wordClipboardHtml(root: HTMLElement, range: Range): string | null {
  if (range.collapsed || !root.contains(range.commonAncestorContainer)) return null;
  // สร้างสำเนาที่มีบรรพบุรุษครบ แล้ววางในกล่องซ่อนที่สไตล์เหมือนเดิม จะได้อ่านสไตล์ที่คำนวณแล้วได้ถูก
  let frag: Node = range.cloneContents();
  for (let a: Node | null = range.commonAncestorContainer; a && a !== root; a = a.parentNode) {
    if (a.nodeType !== 1) continue;
    const c = (a as Element).cloneNode(false);
    c.appendChild(frag);
    frag = c;
  }
  const box = root.cloneNode(false) as HTMLElement;
  box.removeAttribute('contenteditable');
  box.style.position = 'absolute';
  box.style.left = '-99999px';
  box.style.top = '0';
  box.style.minHeight = '0';
  box.appendChild(frag);
  root.parentElement!.appendChild(box);
  try {
    // สมการ -> สมการ Word (ขนาดตามตัวอักษรรอบข้าง)
    box.querySelectorAll<HTMLElement>('span[data-tex]').forEach((el) => {
      const size = pt(parseFloat(getComputedStyle(el).fontSize));
      let omml = '';
      try {
        omml = mathmlToOmml(katex.renderToString(el.dataset.tex || '', { output: 'mathml', throwOnError: false, strict: 'ignore' }));
      } catch {
        omml = '';
      }
      const out = document.createElement('span');
      out.setAttribute('style', `font-size:${size}`);
      out.dataset.omml = omml;
      out.dataset.tex = el.dataset.tex || '';
      el.replaceWith(out);
    });
    // กราฟ/รูปร่าง/รูปภาพ -> รูปขนาดเท่าบนกระดาษ (หน่วย pt)
    box.querySelectorAll<HTMLElement>('figure, img, span[data-shape]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const z = r.width / (el.offsetWidth || r.width || 1) || 1;
      const w = (el.offsetWidth || r.width / z) * 0.75;
      const h = (el.offsetHeight || r.height / z) * 0.75;
      const src = el.tagName === 'IMG' ? (el as HTMLImageElement).src : figurePng(figureKey(el));
      const p = document.createElement(el.tagName === 'FIGURE' ? 'p' : 'span');
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.width = Math.round(w / 0.75);
        img.height = Math.round(h / 0.75);
        img.setAttribute('style', `width:${w.toFixed(1)}pt;height:${h.toFixed(1)}pt`);
        p.appendChild(img);
      }
      if (el.tagName === 'FIGURE') p.setAttribute('style', `margin:0;text-align:${el.dataset.wrap === 'right' ? 'right' : el.dataset.wrap ? 'left' : 'center'}`);
      el.replaceWith(p);
    });
    box.querySelectorAll('[data-pb]').forEach((el) => el.remove());
    // ข้อความในช่องตารางเป็นย่อหน้าไม่มีช่องว่างหลังย่อหน้า (ไม่งั้น Word ใส่ระยะหลังย่อหน้าตามค่าเริ่มต้น)
    box.querySelectorAll('td,th').forEach((c) => {
      if (c.querySelector('p,div,ul,ol,h1,h2,h3')) return;
      const p = document.createElement('p');
      p.append(...Array.from(c.childNodes));
      c.append(p);
    });
    // ใส่สไตล์จริงลงทุกองค์ประกอบ (คำนวณก่อนแล้วค่อยเขียน ไม่ให้สไตล์ที่เขียนไปแล้วมีผลกับตัวถัดไป)
    const els = [box, ...Array.from(box.querySelectorAll<HTMLElement>('*'))].filter((e) => !e.dataset.omml && e.tagName !== 'IMG' && e.tagName !== 'BR');
    const styles = els.map(styleOf);
    els.forEach((e, i) => {
      for (const a of Array.from(e.attributes)) if (a.name !== 'colspan' && a.name !== 'rowspan') e.removeAttribute(a.name);
      e.setAttribute('style', styles[i]);
    });
    box.querySelectorAll('table').forEach((t) => t.setAttribute('style', `${t.getAttribute('style')};border-collapse:collapse`));
    box.querySelectorAll('td,th').forEach((c) => c.setAttribute('style', `${c.getAttribute('style')};border:1px solid #000;padding:2pt 5pt;vertical-align:top`));
    let html = box.innerHTML;
    // ใส่สมการ OMML ภายหลัง (ถ้าผ่าน DOM ของ HTML ชื่อแท็ก m:... จะถูกแปลง) Word อ่านในคอมเมนต์เงื่อนไข โปรแกรมอื่นเห็นสูตรแบบข้อความแทน
    const un = (v: string) => v.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    html = html.replace(/ data-omml="([^"]*)" data-tex="([^"]*)"([^>]*)><\/span>/g, (_, o: string, t: string, rest: string) => `${rest}><!--[if gte msEquation 12]>${un(o)}<![endif]--><![if !msEquation]>${t}<![endif]></span>`);
    return `<div style="font-family:'${wordFont(getComputedStyle(root).fontFamily)}'">${html}</div>`;
  } finally {
    box.remove();
  }
}
