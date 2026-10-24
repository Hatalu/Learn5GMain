/**
 * แปลงสมการ (MathML ที่ KaTeX สร้าง) เป็น OMML ของ Word เพื่อคัดลอกไปวางใน Microsoft Word แล้วได้สมการที่แก้ต่อได้
 * Word รับ MathML ตรงๆ จากคลิปบอร์ดไม่ได้ (ทดสอบกับ Word จริงแล้ว) แต่รับ <m:oMath> ที่ประกาศ namespace ได้
 * ไม่ใช้ DOM (ทดสอบได้ใน selftest)
 */

interface Node {
  tag: string;
  attrs: Record<string, string>;
  kids: Node[];
  text: string;
}

const decode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(+d))
    .replace(/&amp;/g, '&');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** ตัวแยก XML อย่างง่าย (ผลของ KaTeX เป็น XML ที่ถูกรูปแบบเสมอ) */
function parse(xml: string): Node {
  const root: Node = { tag: '#root', attrs: {}, kids: [], text: '' };
  const stack = [root];
  const re = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const top = stack[stack.length - 1];
    if (m[5] !== undefined) {
      top.text += decode(m[5]);
      continue;
    }
    if (m[1]) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const attrs: Record<string, string> = {};
    m[3].replace(/([\w:-]+)="([^"]*)"/g, (_, k: string, v: string) => ((attrs[k] = decode(v)), ''));
    const n: Node = { tag: m[2], attrs, kids: [], text: '' };
    top.kids.push(n);
    if (!m[4]) stack.push(n);
  }
  return root;
}

const run = (t: string, rpr = '') => (t ? `<m:r>${rpr}<m:t xml:space="preserve">${esc(t)}</m:t></m:r>` : '');
const NARY = new Set(['∑', '∏', '∐', '∫', '∬', '∭', '∮', '⋃', '⋂', '⋁', '⋀']);

/** ผลรวม/ผลคูณ/อินทิกรัลที่มีขอบเขต: คืนสัญลักษณ์และขอบล่าง/บน */
function naryOf(n: Node): { op: string; lo?: Node; hi?: Node } | null {
  const b = n.kids[0];
  if (!b || b.tag !== 'mo' || !NARY.has(b.text)) return null;
  const [, x, y] = n.kids;
  if (n.tag === 'msub' || n.tag === 'munder') return { op: b.text, lo: x };
  if (n.tag === 'msup' || n.tag === 'mover') return { op: b.text, hi: x };
  if (n.tag === 'msubsup' || n.tag === 'munderover') return { op: b.text, lo: x, hi: y };
  return null;
}

/** ลูกเรียงกัน: ตัวดำเนินการแบบผลรวมกินตัวถัดไปเป็นเนื้อใน (Word แสดงช่องว่างประถ้าเนื้อในว่าง) */
function convList(kids: Node[]): string {
  let out = '';
  for (let i = 0; i < kids.length; i++) {
    const n = kids[i];
    const ny = naryOf(n);
    if (!ny) {
      out += conv(n);
      continue;
    }
    const e = kids[i + 1] ? conv(kids[++i]) : '';
    const loc = n.tag.startsWith('mu') || n.tag === 'mover' ? 'undOvr' : 'subSup';
    out += `<m:nary><m:naryPr><m:chr m:val="${esc(ny.op)}"/><m:limLoc m:val="${loc}"/>${ny.lo ? '' : '<m:subHide m:val="1"/>'}${ny.hi ? '' : '<m:supHide m:val="1"/>'}</m:naryPr><m:sub>${ny.lo ? conv(ny.lo) : ''}</m:sub><m:sup>${ny.hi ? conv(ny.hi) : ''}</m:sup><m:e>${e}</m:e></m:nary>`;
  }
  return out;
}

function conv(n: Node): string {
  const k = n.kids;
  const all = () => convList(k);
  const arg = (i: number) => (k[i] ? conv(k[i]) : '');
  switch (n.tag) {
    case '#root':
    case 'math':
    case 'mrow':
    case 'mstyle':
    case 'mpadded':
    case 'menclose':
    case 'mtd':
      return all();
    case 'semantics':
      return arg(0);
    case 'annotation':
    case 'mphantom':
      return '';
    case 'mi':
      // ชื่อฟังก์ชัน (sin, log) ตัวตั้ง ส่วนตัวแปรตัวเดียว Word ทำตัวเอียงให้เอง
      return run(n.text, n.attrs.mathvariant === 'normal' || n.text.length > 1 ? '<m:rPr><m:sty m:val="p"/></m:rPr>' : '');
    case 'mn':
    case 'mo':
      return run(n.text);
    case 'mtext':
      return run(n.text, '<m:rPr><m:nor/></m:rPr>');
    case 'mspace':
      return run(' ');
    case 'mfrac':
      return `<m:f>${n.attrs.linethickness === '0px' || n.attrs.linethickness === '0' ? '<m:fPr><m:type m:val="noBar"/></m:fPr>' : ''}<m:num>${arg(0)}</m:num><m:den>${arg(1)}</m:den></m:f>`;
    case 'msup':
      return `<m:sSup><m:e>${arg(0)}</m:e><m:sup>${arg(1)}</m:sup></m:sSup>`;
    case 'msub':
      return `<m:sSub><m:e>${arg(0)}</m:e><m:sub>${arg(1)}</m:sub></m:sSub>`;
    case 'msubsup':
      return `<m:sSubSup><m:e>${arg(0)}</m:e><m:sub>${arg(1)}</m:sub><m:sup>${arg(2)}</m:sup></m:sSubSup>`;
    case 'msqrt':
      return `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${all()}</m:e></m:rad>`;
    case 'mroot':
      return `<m:rad><m:deg>${arg(1)}</m:deg><m:e>${arg(0)}</m:e></m:rad>`;
    case 'mover':
    case 'munder':
    case 'munderover': {
      // ขีดบน/หมวก/ลูกศรเหนือตัวแปร
      const mark = k[1]?.tag === 'mo' ? k[1].text : '';
      if (n.tag === 'mover' && (n.attrs.accent === 'true' || mark) && mark.length === 1) {
        if (mark === '‾' || mark === '¯' || mark === '_') return `<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>${arg(0)}</m:e></m:bar>`;
        return `<m:acc><m:accPr><m:chr m:val="${esc(mark)}"/></m:accPr><m:e>${arg(0)}</m:e></m:acc>`;
      }
      if (n.tag === 'mover') return `<m:limUpp><m:e>${arg(0)}</m:e><m:lim>${arg(1)}</m:lim></m:limUpp>`;
      if (n.tag === 'munder') return `<m:limLow><m:e>${arg(0)}</m:e><m:lim>${arg(1)}</m:lim></m:limLow>`;
      return `<m:limUpp><m:e><m:limLow><m:e>${arg(0)}</m:e><m:lim>${arg(1)}</m:lim></m:limLow></m:e><m:lim>${arg(2)}</m:lim></m:limUpp>`;
    }
    case 'mtable':
      return `<m:m>${k.map((r) => `<m:mr>${r.kids.map((c) => `<m:e>${conv(c)}</m:e>`).join('')}</m:mr>`).join('')}</m:m>`;
    default:
      return all() || run(n.text);
  }
}

export const OMML_NS = 'http://schemas.microsoft.com/office/2004/12/omml';

/** MathML (จาก katex output: 'mathml') เป็นสมการ Word หนึ่งก้อน */
export function mathmlToOmml(mathml: string): string {
  const m = mathml.match(/<math[\s\S]*<\/math>/);
  if (!m) return '';
  return `<m:oMath xmlns:m="${OMML_NS}">${conv(parse(m[0]))}</m:oMath>`;
}
