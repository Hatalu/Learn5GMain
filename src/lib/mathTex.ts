/**
 * เตรียม LaTeX จากช่องสูตร (MathLive) ก่อนส่งให้ KaTeX วาด
 * - ภาษาไทย/ภาษาอื่นที่พิมพ์ในสูตรตรงๆ ห่อเป็น \text{...} (KaTeX วาดอักษรพวกนี้ในโหมดคณิตไม่ได้ ขึ้นเป็นโค้ดสีแดง)
 * - \middle{\vert} ที่ MathLive สร้าง เปลี่ยนเป็น \middle\vert ที่ KaTeX รู้จัก
 * ไม่ใช้ DOM (ทดสอบได้ใน selftest)
 */

/** ตัวอักษรที่ไม่ใช่ละติน/กรีก (ไทย จีน ญี่ปุ่น ฯลฯ) รวมสระ/วรรณยุกต์ */
const FOREIGN = /(?![\p{Script=Latin}\p{Script=Greek}\p{Script=Common}])[\p{L}\p{M}\p{N}]/u;
/** คำสั่งที่ข้างในเป็นข้อความอยู่แล้ว ไม่ต้องห่อซ้ำ */
const TEXT_CMDS = ['\\text', '\\textrm', '\\textbf', '\\textit', '\\textsf', '\\texttt', '\\mbox', '\\operatorname', '\\mathrm', '\\mathbf', '\\mathit'];

export function prepTex(tex: string): string {
  const s = String(tex || '').replace(/\\middle\{(\\[a-zA-Z]+|[^{}])\}/g, '\\middle$1');
  let out = '';
  let i = 0;
  while (i < s.length) {
    // ข้ามข้างใน \text{...} ทั้งก้อน (นับวงเล็บปีกกาซ้อน)
    const cmd = TEXT_CMDS.find((c) => s.startsWith(c, i) && !/[a-zA-Z]/.test(s[i + c.length] || ''));
    if (cmd) {
      let j = i + cmd.length;
      while (s[j] === ' ') j++;
      if (s[j] === '{') {
        let d = 0;
        for (; j < s.length; j++) {
          if (s[j] === '\\') {
            j++;
            continue;
          }
          if (s[j] === '{') d++;
          else if (s[j] === '}' && --d === 0) break;
        }
        out += s.slice(i, j + 1);
        i = j + 1;
        continue;
      }
    }
    if (s[i] === '\\') {
      // คำสั่ง/อักขระหลบ: คัดลอกตามเดิม
      const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i));
      out += m ? m[0] : s[i];
      i += m ? m[0].length : 1;
      continue;
    }
    if (FOREIGN.test(s[i])) {
      // เก็บทั้งคำ (เว้นวรรคระหว่างคำไทยก็เก็บด้วย)
      let j = i;
      while (j < s.length && (FOREIGN.test(s[j]) || (s[j] === ' ' && FOREIGN.test(s.slice(j).trimStart()[0] || '')))) j++;
      out += `\\text{${s.slice(i, j)}}`;
      i = j;
      continue;
    }
    out += s[i++];
  }
  return out;
}
