/**
 * นำเข้าข้อความล้วน (.txt) / Markdown (.md) / หน้าเว็บ (.html) เป็นเนื้อหาโหมดเอกสาร
 * สูตรแบบ LaTeX ในข้อความ ($...$, $$...$$, \(...\), \[...\]) กลายเป็นช่องสมการแก้ต่อได้
 * (เช่นข้อความที่คัดลอกจาก ChatGPT) ไม่ใช้ DOM (ทดสอบใน selftest)
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) => esc(s).replace(/"/g, '&quot;');
const eq = (tex: string) => `<span data-tex="${escAttr(tex.trim())}"></span>`;

/** ข้อความหนึ่งบรรทัด: สูตรในบรรทัด + ตัวหนา/เอียงแบบ Markdown (md = true) */
export function inlineText(line: string, md: boolean): string {
  const parts = line.split(/(\$\$[^$]+\$\$|\$[^$\n]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g);
  return parts
    .map((p, i) => {
      if (i % 2) return eq(p.replace(/^\$\$|\$\$$|^\$|\$$|^\\\(|\\\)$|^\\\[|\\\]$/g, ''));
      let h = esc(p);
      if (md) {
        h = h
          .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, a?: string, b?: string) => `<b>${a ?? b}</b>`)
          .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, '$1<i>$2</i>')
          .replace(/~~(.+?)~~/g, '<s>$1</s>')
          .replace(/`([^`]+)`/g, '$1');
      }
      return h;
    })
    .join('');
}

const HEAD_PX = [0, 32, 26.67, 22.67, 21.33, 21.33, 21.33];

export function textToFlow(text: string, md: boolean): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;
  const close = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((x) => `<li>${x}</li>`).join('')}</${list.tag}>`);
    list = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();
    // สมการหลายบรรทัด $$ ... $$
    if (/^\s*(\$\$|\\\[)\s*$/.test(line)) {
      const end = line.trim() === '$$' ? '$$' : '\\]';
      const body: string[] = [];
      for (i++; i < lines.length && lines[i].trim() !== end; i++) body.push(lines[i]);
      close();
      out.push(`<p style="text-align: center">${eq(body.join(' '))}</p>`);
      continue;
    }
    if (md) {
      const h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) {
        close();
        out.push(`<p style="font-size: ${HEAD_PX[h[1].length]}px; font-weight: bold">${inlineText(h[2], true)}</p>`);
        continue;
      }
      const li = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(line);
      if (li) {
        const tag = /\d/.test(li[1]) ? 'ol' : 'ul';
        if (!list || list.tag !== tag) {
          close();
          list = { tag, items: [] };
        }
        (list as { items: string[] }).items.push(inlineText(li[2], true));
        continue;
      }
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        close();
        out.push('<hr>');
        continue;
      }
      if (/^\s*\|.*\|\s*$/.test(line)) {
        // ตาราง Markdown
        close();
        const rows: string[][] = [];
        for (; i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i]); i++) {
          if (/^\s*\|[\s:|-]+\|\s*$/.test(lines[i])) continue;
          rows.push(lines[i].trim().slice(1, -1).split('|'));
        }
        i--;
        out.push(`<table><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td><p>${inlineText(c.trim(), true) || '<br>'}</p></td>`).join('')}</tr>`).join('')}</tbody></table>`);
        continue;
      }
    }
    close();
    const display = /^\s*\$\$(.+)\$\$\s*$/.exec(line);
    if (display) out.push(`<p style="text-align: center">${eq(display[1])}</p>`);
    else out.push(line.trim() ? `<p>${inlineText(md ? line.replace(/^>\s?/, '') : line, md)}</p>` : '<p><br></p>');
  }
  close();
  // Markdown: บรรทัดว่างหลายบรรทัดติดกันเหลือบรรทัดเดียว
  return out.join('').replace(/(<p><br><\/p>){2,}/g, '<p><br></p>');
}

/** หน้าเว็บ: เอาเฉพาะ body (ตัวกรองของโหมดเอกสารจะกรองแท็กที่ไม่อนุญาตทิ้งเอง) */
export function htmlToFlow(html: string): string {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  return body.replace(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi, (_, h: string, t: string) => `<p style="font-size: ${HEAD_PX[+h[1]] || 21.33}px; font-weight: bold">${t}</p>`);
}
