/**
 * แปลงสมการจากไฟล์ Word เป็น LaTeX ของช่องสมการ (MathType ของเว็บ)
 * - OMML = สมการของ Word เอง (<m:oMath>)
 * - ตัวช่วยแปลงอักขระ Unicode เป็นคำสั่ง LaTeX ใช้ร่วมกับตัวแปลง MathType (mtef.ts)
 * ไม่ใช้ DOM (ทดสอบใน selftest)
 */
import { kid, kidsOf, val, type XNode } from './xml';

/** อักขระพิเศษ -> คำสั่ง LaTeX (ตัวที่ KaTeX วาดตรงๆ ได้ไม่ต้องแปลง) */
const SYM: Record<string, string> = {
  '×': '\\times ', '÷': '\\div ', '±': '\\pm ', '∓': '\\mp ', '·': '\\cdot ', '⋅': '\\cdot ', '∙': '\\cdot ', '−': '-', '∗': '*',
  '≤': '\\le ', '≥': '\\ge ', '≠': '\\ne ', '≈': '\\approx ', '≡': '\\equiv ', '≅': '\\cong ', '∼': '\\sim ', '≃': '\\simeq ', '∝': '\\propto ', '≪': '\\ll ', '≫': '\\gg ',
  '⩽': '\\leqslant ', '⩾': '\\geqslant ',
  '∞': '\\infty ', '∂': '\\partial ', '∇': '\\nabla ', '∅': '\\varnothing ', '∀': '\\forall ', '∃': '\\exists ', '∄': '\\nexists ', '¬': '\\neg ', '∧': '\\wedge ', '∨': '\\vee ',
  '∈': '\\in ', '∉': '\\notin ', '∋': '\\ni ', '⊂': '\\subset ', '⊃': '\\supset ', '⊆': '\\subseteq ', '⊇': '\\supseteq ', '⊄': '\\not\\subset ', '⊈': '\\nsubseteq ', '∪': '\\cup ', '∩': '\\cap ', '∖': '\\setminus ',
  '→': '\\rightarrow ', '←': '\\leftarrow ', '↔': '\\leftrightarrow ', '⇒': '\\Rightarrow ', '⇐': '\\Leftarrow ', '⇔': '\\Leftrightarrow ', '↑': '\\uparrow ', '↓': '\\downarrow ', '↦': '\\mapsto ', '⟶': '\\longrightarrow ', '⟹': '\\Longrightarrow ', '⟺': '\\Longleftrightarrow ',
  '∠': '\\angle ', '∡': '\\measuredangle ', '△': '\\triangle ', '∆': '\\triangle ', '⊥': '\\perp ', '∥': '\\parallel ', '∦': '\\nparallel ', '°': '^{\\circ}', '∘': '\\circ ', '′': "'", '″': "''", '‴': "'''",
  '…': '\\ldots ', '⋯': '\\cdots ', '⋮': '\\vdots ', '⋱': '\\ddots ', '∴': '\\therefore ', '∵': '\\because ', '|': '|', '‖': '\\|', '%': '\\%', '#': '\\#', '&': '\\&', $: '\\$', _: '\\_', '{': '\\{', '}': '\\}', '\\': '\\backslash ', '~': '\\sim ', '^': '\\hat{}',
  '⟨': '\\langle ', '⟩': '\\rangle ', '〈': '\\langle ', '〉': '\\rangle ', '⌊': '\\lfloor ', '⌋': '\\rfloor ', '⌈': '\\lceil ', '⌉': '\\rceil ',
  'α': '\\alpha ', 'β': '\\beta ', 'γ': '\\gamma ', 'δ': '\\delta ', 'ε': '\\varepsilon ', 'ϵ': '\\epsilon ', 'ζ': '\\zeta ', 'η': '\\eta ', 'θ': '\\theta ', 'ϑ': '\\vartheta ', 'ι': '\\iota ', 'κ': '\\kappa ', 'λ': '\\lambda ', 'μ': '\\mu ', 'ν': '\\nu ', 'ξ': '\\xi ', 'π': '\\pi ', 'ϖ': '\\varpi ', 'ρ': '\\rho ', 'σ': '\\sigma ', 'ς': '\\varsigma ', 'τ': '\\tau ', 'υ': '\\upsilon ', 'φ': '\\varphi ', 'ϕ': '\\phi ', 'χ': '\\chi ', 'ψ': '\\psi ', 'ω': '\\omega ',
  'Γ': '\\Gamma ', 'Δ': '\\Delta ', 'Θ': '\\Theta ', 'Λ': '\\Lambda ', 'Ξ': '\\Xi ', 'Π': '\\Pi ', 'Σ': '\\Sigma ', 'Υ': '\\Upsilon ', 'Φ': '\\Phi ', 'Ψ': '\\Psi ', 'Ω': '\\Omega ',
  'ℕ': '\\mathbb{N}', 'ℤ': '\\mathbb{Z}', 'ℚ': '\\mathbb{Q}', 'ℝ': '\\mathbb{R}', 'ℂ': '\\mathbb{C}', 'ℓ': '\\ell ', '∑': '\\sum ', '∏': '\\prod ', '∫': '\\int ', '∬': '\\iint ', '∭': '\\iiint ', '∮': '\\oint ', '√': '\\surd ',
  '̀': "'", '́': "'", '‵': '`',' ': '~',' ': '\\,', ' ': '\\ ', ' ': '\\quad ', ' ': '', '​': '', '⁡': '', '⁢': '', '⁣': '', '⁤': '',
};
/** ชื่อฟังก์ชันที่ LaTeX มีคำสั่งตรง */
const FUNCS = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'coth', 'log', 'ln', 'lg', 'exp', 'lim', 'max', 'min', 'sup', 'inf', 'det', 'gcd', 'deg', 'dim', 'ker', 'arg', 'mod', 'Pr', 'hom']);

/** อักษรที่ไม่ใช่ละติน/ตัวเลข/สัญลักษณ์คณิต (ไทย ฯลฯ) ต้องอยู่ใน \text{} */
const isWordChar = (c: string) => /[฀-๿\u0080-ɏ　-鿿]/.test(c) && !SYM[c];
const escText = (s: string) => s.replace(/[\\{}$&#%_^~]/g, (c) => (c === '\\' ? '\\textbackslash ' : c === '~' ? '\\textasciitilde ' : c === '^' ? '\\textasciicircum ' : '\\' + c));

/**
 * ข้อความในสมการเป็น LaTeX: plain = ตัวตรงทั้งหมด (ข้อความ/ชื่อฟังก์ชัน)
 * ชื่อฟังก์ชันที่รู้จักเป็น \sin ส่วนภาษาไทยห่อ \text{}
 */
export function texOfText(t: string, plain = false): string {
  if (!t) return '';
  if (plain) {
    const w = t.trim();
    if (FUNCS.has(w)) return `\\${w} `;
    if (/^[A-Za-z]+$/.test(w) && w.length > 1) return `\\mathrm{${w}}`;
    if (/[^\x20-\x7e]/.test(t) || /\s/.test(t)) {
      // ข้อความไทย/มีช่องว่าง: \text ทั้งก้อน ยกเว้นสัญลักษณ์คณิตที่ต้องแปลง
      let out = '';
      let buf = '';
      for (const c of Array.from(t)) {
        if (SYM[c] && !/\s/.test(c)) {
          if (buf) out += `\\text{${escText(buf)}}`;
          buf = '';
          out += SYM[c];
        } else buf += c;
      }
      if (buf) out += `\\text{${escText(buf)}}`;
      return out;
    }
  }
  let out = '';
  let words = '';
  const flush = () => {
    if (words) out += `\\text{${escText(words)}}`;
    words = '';
  };
  for (const c of Array.from(t)) {
    // สระ/วรรณยุกต์ไทยติดกับตัวหน้าเสมอ เว้นวรรคระหว่างคำไทยเก็บไว้ใน \text
    if (isWordChar(c) || (words && c === ' ')) {
      words += c;
      continue;
    }
    flush();
    if (c === ' ') continue;
    out += SYM[c] ?? c;
  }
  flush();
  return out;
}

/** วงเล็บ/ตัวกั้นของ \left \right */
export function fenceTex(c: string | undefined, right = false): string {
  if (c === undefined) return right ? ')' : '(';
  if (c === '') return '.';
  const map: Record<string, string> = { '{': '\\{', '}': '\\}', '⟨': '\\langle', '⟩': '\\rangle', '〈': '\\langle', '〉': '\\rangle', '⌊': '\\lfloor', '⌋': '\\rfloor', '⌈': '\\lceil', '⌉': '\\rceil', '‖': '\\|', '|': '|', '[': '[', ']': ']', '(': '(', ')': ')', '/': '/', '⟦': '[', '⟧': ']' };
  return map[c] ?? '.';
}

/** สัญลักษณ์ตัวดำเนินการใหญ่ */
export const NARY_TEX: Record<string, string> = { '∑': '\\sum', '∏': '\\prod', '∐': '\\coprod', '∫': '\\int', '∬': '\\iint', '∭': '\\iiint', '∮': '\\oint', '⋃': '\\bigcup', '⋂': '\\bigcap', '⋁': '\\bigvee', '⋀': '\\bigwedge', '∪': '\\bigcup', '∩': '\\bigcap' };

/** เครื่องหมายบนตัวอักษร -> คำสั่ง (ใช้ทั้ง OMML acc และ MathType) */
export const ACCENT_TEX: Record<string, string> = {
  '̂': '\\hat', '^': '\\hat', '̃': '\\tilde', '~': '\\tilde', '̄': '\\bar', '̅': '\\overline', '¯': '\\bar', '̇': '\\dot', '̈': '\\ddot', '⃛': '\\dddot', '̌': '\\check', '̆': '\\breve', '́': '\\acute', '̀': '\\grave',
  '⃗': '\\vec', '→': '\\overrightarrow', '⃖': '\\overleftarrow', '←': '\\overleftarrow', '⃡': '\\overleftrightarrow', '↔': '\\overleftrightarrow', '⏜': '\\overgroup', '⌢': '\\overgroup',
};

/** เนื้อในของสมการก้อนหนึ่ง: ห่อ {} ถ้ายาวกว่าตัวเดียว */
export const grp = (s: string) => `{${s.trim()}}`;

/* ---------------------------------------------------------------- OMML */

function runText(r: XNode): string {
  let t = '';
  for (const k of r.kids) if (k.tag === 'm:t' || k.tag === 'w:t') t += k.text;
  return t;
}

function convList(kids: XNode[]): string {
  return kids.map(conv).join('');
}
const e = (n: XNode | undefined) => (n ? convList(n.kids) : '');

function conv(n: XNode): string {
  const pr = (t: string) => kid(n, t);
  switch (n.tag) {
    case 'm:oMathPara':
      return kidsOf(n, 'm:oMath').map((x) => convList(x.kids)).join(' \\\\ ');
    case 'm:oMath':
    case 'm:e':
    case 'm:num':
    case 'm:den':
    case 'm:sub':
    case 'm:sup':
    case 'm:deg':
    case 'm:lim':
    case 'm:fName':
    case 'w:hyperlink':
    case 'w:ins':
    case 'w:smartTag':
      return convList(n.kids);
    case 'm:r': {
      const rpr = pr('m:rPr');
      const plain = !!kid(rpr, 'm:nor') || val(rpr, 'm:sty') === 'p';
      const t = runText(n);
      return kid(rpr, 'm:nor') ? texOfText(t, true) : texOfText(t, plain);
    }
    case 'm:f': {
      const type = val(pr('m:fPr'), 'm:type');
      const a = e(pr('m:num'));
      const b = e(pr('m:den'));
      if (type === 'lin' || type === 'skw') return `${grp(a)}/${grp(b)}`;
      if (type === 'noBar') return `\\genfrac{}{}{0pt}{}${grp(a)}${grp(b)}`;
      return `\\frac${grp(a)}${grp(b)}`;
    }
    case 'm:sSup':
      return `${grp(e(pr('m:e')))}^${grp(e(pr('m:sup')))}`;
    case 'm:sSub':
      return `${grp(e(pr('m:e')))}_${grp(e(pr('m:sub')))}`;
    case 'm:sSubSup':
      return `${grp(e(pr('m:e')))}_${grp(e(pr('m:sub')))}^${grp(e(pr('m:sup')))}`;
    case 'm:sPre':
      return `{}_${grp(e(pr('m:sub')))}^${grp(e(pr('m:sup')))}${grp(e(pr('m:e')))}`;
    case 'm:rad': {
      const hide = val(pr('m:radPr'), 'm:degHide');
      const deg = e(pr('m:deg')).trim();
      const body = grp(e(pr('m:e')));
      return hide === '1' || hide === 'on' || hide === 'true' || !deg ? `\\sqrt${body}` : `\\sqrt[${deg}]${body}`;
    }
    case 'm:d': {
      const p = pr('m:dPr');
      const beg = kid(p, 'm:begChr') ? (val(p, 'm:begChr') ?? '') : undefined;
      const end = kid(p, 'm:endChr') ? (val(p, 'm:endChr') ?? '') : undefined;
      const sep = val(p, 'm:sepChr') ?? '|';
      const parts = kidsOf(n, 'm:e').map(e);
      return `\\left${fenceTex(beg)} ${parts.join(sep === '|' ? ' \\mid ' : texOfText(sep))} \\right${fenceTex(end, true)}`;
    }
    case 'm:nary': {
      const p = pr('m:naryPr');
      const chr = val(p, 'm:chr') || '∫';
      const op = NARY_TEX[chr] ?? texOfText(chr);
      const lo = val(p, 'm:subHide') === '1' ? '' : e(pr('m:sub')).trim();
      const hi = val(p, 'm:supHide') === '1' ? '' : e(pr('m:sup')).trim();
      const lim = val(p, 'm:limLoc') === 'undOvr' && op.startsWith('\\int') ? '\\limits' : '';
      return `${op}${lim}${lo ? `_${grp(lo)}` : ''}${hi ? `^${grp(hi)}` : ''} ${e(pr('m:e'))}`;
    }
    case 'm:func': {
      const name = e(pr('m:fName')).trim();
      return `${name} ${e(pr('m:e'))}`;
    }
    case 'm:acc': {
      const chr = val(pr('m:accPr'), 'm:chr') ?? '̂';
      return `${ACCENT_TEX[chr || '̂'] ?? '\\hat'}${grp(e(pr('m:e')))}`;
    }
    case 'm:bar':
      return `${val(pr('m:barPr'), 'm:pos') === 'top' ? '\\overline' : '\\underline'}${grp(e(pr('m:e')))}`;
    case 'm:groupChr': {
      const p = pr('m:groupChrPr');
      const chr = val(p, 'm:chr') || '⏟';
      const top = val(p, 'm:pos') === 'top';
      const body = grp(e(pr('m:e')));
      if (chr === '⏟' || chr === '⏞') return `${chr === '⏞' ? '\\overbrace' : '\\underbrace'}${body}`;
      return `${top ? '\\overset' : '\\underset'}{${texOfText(chr)}}${body}`;
    }
    case 'm:limLow': {
      const base = e(pr('m:e')).trim();
      const lim = e(pr('m:lim'));
      if (/^\\(lim|max|min|sup|inf)\s*$/.test(base)) return `${base.trim()}_${grp(lim)} `;
      return `\\underset${grp(lim)}${grp(base)}`;
    }
    case 'm:limUpp':
      return `\\overset${grp(e(pr('m:lim')))}${grp(e(pr('m:e')))}`;
    case 'm:box':
    case 'm:phant':
      return grp(e(pr('m:e')));
    case 'm:borderBox':
      return `\\boxed${grp(e(pr('m:e')))}`;
    case 'm:eqArr':
      return `\\begin{aligned}${kidsOf(n, 'm:e').map((x) => e(x).replace(/\\&/g, '&')).join(' \\\\ ')}\\end{aligned}`;
    case 'm:m':
      return `\\begin{matrix}${kidsOf(n, 'm:mr').map((r) => kidsOf(r, 'm:e').map(e).join(' & ')).join(' \\\\ ')}\\end{matrix}`;
    default:
      // ค่าตั้ง (xxxPr) และของที่ไม่รู้จัก: ไม่มีเนื้อหาให้แสดง
      return n.tag.endsWith('Pr') ? '' : convList(n.kids);
  }
}

/** สมการ Word หนึ่งก้อน (m:oMath หรือ m:oMathPara) เป็น LaTeX */
export function ommlToTex(n: XNode): string {
  return conv(n)
    .replace(/\s+/g, ' ')
    .replace(/ ([}^_)])/g, '$1')
    .trim();
}
