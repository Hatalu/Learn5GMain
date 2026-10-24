/**
 * กราฟ/รูปคณิตศาสตร์ (แนว GeoGebra + Desmos) ของระบบสร้างสื่อ
 * - ตัวแปลสมการเขียนเอง (ไม่ใช้ eval): y = f(x), x = g(y), สมการโดยปริยายเช่น x^2 + y^2 = 9, ตัวอักษรอื่นกลายเป็นแถบเลื่อน
 * - วาดเป็นข้อความ SVG ล้วน (ใช้ได้ทั้งบนผืนผ้าใบ ในโหมดเอกสาร รูปย่อ และตอนส่งออก)
 * ไม่มี DOM (ทดสอบได้ใน selftest)
 */

/* ------------------------------------------------------------------ ชนิดข้อมูล */

export type GDash = 'solid' | 'dash' | 'dot' | 'dashdot';
export type GArrow = 'none' | 'end' | 'start' | 'both';
export type GThemeId = 'book' | 'grid' | 'desmos' | 'chalk' | 'kids';
export type LabelPos = 'ne' | 'nw' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';

interface GBase {
  id: string;
  color: string;
  hidden?: boolean;
}
export interface GExpr extends GBase {
  kind: 'expr';
  text: string;
  width: number;
  dash: GDash;
  label: string;
  /** ตำแหน่งป้ายตามความยาวเส้น 0..1 */
  at: number;
  /** ช่วงของตัวแปรต้น (x ของ y=f(x), y ของ x=g(y)) เว้นว่าง = ทั้งจอ */
  lo: number | null;
  hi: number | null;
  /** รูปทรงเฉพาะ: มีค่านี้ = สมการสร้างจากค่ารูปทรง (ปรับด้วยแถบเฉพาะทาง) */
  shape?: GShape;
}
export interface GPoint extends GBase {
  kind: 'point';
  x: number;
  y: number;
  label: string;
  size: number;
  hollow: boolean;
  pos: LabelPos;
  /** เส้นประลากไปหาแกน */
  guides: boolean;
}
export interface GSeg extends GBase {
  kind: 'seg';
  a: string;
  b: string;
  width: number;
  dash: GDash;
  arrow: GArrow;
  label: string;
  /** ขีดบนป้าย (เวกเตอร์ เช่น u มีขีด) */
  bar: boolean;
  side: 1 | -1;
}
export interface GPoly extends GBase {
  kind: 'poly';
  pts: string[];
  width: number;
  dash: GDash;
  fill: string;
  alpha: number;
}
export interface GAngle extends GBase {
  kind: 'angle';
  a: string;
  o: string;
  b: string;
  label: string;
  r: number;
}
export interface GText extends GBase {
  kind: 'text';
  x: number;
  y: number;
  text: string;
  size: number;
  italic: boolean;
  bar: boolean;
}
/** รูปวาดอิสระ (เส้น ลูกศร สี่เหลี่ยม วงรี ปากกา) พิกัดเป็นพิกเซลของภาพ ไม่ขยับตามสมการ/การเลื่อนกราฟ */
export type DrawShape = 'line' | 'rect' | 'ellipse' | 'pen';
export interface GDraw extends GBase {
  kind: 'draw';
  shape: DrawShape;
  pts: [number, number][];
  width: number;
  dash: GDash;
  arrow: GArrow;
  fill: string;
  alpha: number;
}
export type GObj = GExpr | GPoint | GSeg | GPoly | GAngle | GText | GDraw;
export type GKind = GObj['kind'];

export interface GParam {
  v: number;
  min: number;
  max: number;
  step: number;
}
export interface GraphSpec {
  v: 1;
  w: number;
  h: number;
  view: { xMin: number; xMax: number; yMin: number; yMax: number };
  /** สเกลแกน x และ y เท่ากัน (วงกลมกลมจริง) */
  equal: boolean;
  axes: boolean;
  arrows: GArrow;
  grid: boolean;
  minor: boolean;
  numbers: boolean;
  /** ระยะห่างตัวเลขบนแกน 0 = อัตโนมัติ */
  step: number;
  xName: string;
  yName: string;
  origin: boolean;
  theme: GThemeId;
  /** พื้นโปร่งใส (วางบนพื้นหลังหน้าได้) */
  clear: boolean;
  params: Record<string, GParam>;
  objs: GObj[];
}

export interface GTheme {
  id: GThemeId;
  label: string;
  bg: string;
  axis: string;
  grid: string;
  minor: string;
  text: string;
  colors: string[];
  font: string;
  axisW: number;
  italic: boolean;
}
const SERIF = "'Times New Roman', 'Cambria Math', 'Sarabun', serif";
const SANS = "'Sarabun', 'Noto Sans Thai', system-ui, sans-serif";
export const GTHEMES: GTheme[] = [
  { id: 'book', label: 'หนังสือเรียน', bg: '#ffffff', axis: '#111111', grid: '#dddddd', minor: '#efefef', text: '#111111', colors: ['#111111', '#111111', '#444444', '#111111'], font: SERIF, axisW: 1.6, italic: true },
  { id: 'grid', label: 'กระดาษกราฟ', bg: '#ffffff', axis: '#1f2937', grid: '#c9d3e0', minor: '#e8edf4', text: '#1f2937', colors: ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2'], font: SERIF, axisW: 1.8, italic: true },
  { id: 'desmos', label: 'แบบ Desmos', bg: '#ffffff', axis: '#333333', grid: '#d5d5d5', minor: '#eeeeee', text: '#333333', colors: ['#c74440', '#2d70b3', '#388c46', '#6042a6', '#fa7e19', '#000000'], font: SANS, axisW: 1.6, italic: false },
  { id: 'chalk', label: 'กระดานดำ', bg: '#22402f', axis: '#f4f1e8', grid: '#3d5c4a', minor: '#2d4a3a', text: '#f4f1e8', colors: ['#ffffff', '#ffe066', '#7fd3ff', '#ff9eb5', '#a6f4a6'], font: SANS, axisW: 2, italic: false },
  { id: 'kids', label: 'สีสดใส', bg: '#fff8ec', axis: '#2a2350', grid: '#ffd9a8', minor: '#ffefd6', text: '#2a2350', colors: ['#7c5cf0', '#ff6b7a', '#2bb98a', '#3d9bff', '#ff9a3d'], font: SANS, axisW: 3, italic: false },
];
export const themeOf = (id: GThemeId) => GTHEMES.find((t) => t.id === id) ?? GTHEMES[1];

export const gid = () => Math.random().toString(36).slice(2, 9);

/* ------------------------------------------------------------------ ตัวแปลสมการ */

type Fn = (x: number, y: number, p: Record<string, number>) => number;
const F1: Record<string, (a: number) => number> = {
  arcsin: Math.asin,
  arccos: Math.acos,
  arctan: Math.atan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  floor: Math.floor,
  round: Math.round,
  ceil: Math.ceil,
  sign: Math.sign,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sec: (a) => 1 / Math.cos(a),
  csc: (a) => 1 / Math.sin(a),
  cot: (a) => 1 / Math.tan(a),
  exp: Math.exp,
  abs: Math.abs,
  log: Math.log10,
  ln: Math.log,
};
const NAMES = [...Object.keys(F1), 'min', 'max', 'pi'].sort((a, b) => b.length - a.length);

type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'fn'; v: string } | { t: 'op'; v: string };

/**
 * สูตรจากหน้าต่าง MathType (LaTeX) เป็นสมการที่ตัวแปลกราฟอ่านได้
 * เช่น y=\frac{1}{2}x^{2}+\sqrt{x} เป็น y=((1)/(2))x^(2)+sqrt(x)
 */
export function texToExpr(tex: string): string {
  let s = String(tex || '').slice(0, 600);
  // อ่านกลุ่ม {...} ที่ตำแหน่ง i (ข้ามช่องว่าง) คืนเนื้อในกับตำแหน่งถัดไป
  const group = (i: number): [string, number] => {
    while (s[i] === ' ') i++;
    if (s[i] !== '{') return [s[i] ?? '', i + 1];
    let d = 0;
    for (let j = i; j < s.length; j++) {
      if (s[j] === '{') d++;
      else if (s[j] === '}' && --d === 0) return [s.slice(i + 1, j), j + 1];
    }
    return [s.slice(i + 1), s.length];
  };
  for (let guard = 0; guard < 60; guard++) {
    const m = /\\(d|t)?frac|\\sqrt|\\text|\\operatorname|\\mathrm/.exec(s);
    if (!m) break;
    const at = m.index;
    let end = at + m[0].length;
    let out = '';
    if (m[0].endsWith('frac')) {
      const [a, e1] = group(end);
      const [b, e2] = group(e1);
      out = `((${a})/(${b}))`;
      end = e2;
    } else if (m[0] === '\\sqrt') {
      let n = '';
      if (s[end] === '[') {
        const close = s.indexOf(']', end);
        n = s.slice(end + 1, close < 0 ? s.length : close);
        end = close < 0 ? s.length : close + 1;
      }
      const [a, e1] = group(end);
      out = n ? `((${a})^(1/(${n})))` : `sqrt(${a})`;
      end = e1;
    } else {
      const [a, e1] = group(end);
      out = a;
      end = e1;
    }
    s = s.slice(0, at) + out + s.slice(end);
  }
  return s
    .replace(/_\{[^{}]*\}|_[A-Za-z0-9]/g, '')
    .replace(/\\(left|right|displaystyle|,|;|!|:|quad|qquad)/g, '')
    .replace(/\\(l|r)?vert|\\mid/g, '|')
    .replace(/\\(cdot|times|ast)/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\\(leq?|leqslant)/g, '<=')
    .replace(/\\(geq?|geqslant)/g, '>=')
    .replace(/\\ /g, ' ')
    .replace(/\\([a-zA-Z]+)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

export function normalizeExpr(src: string): string {
  return String(src || '')
    .replace(/[−–—]/g, '-')
    .replace(/[×·⋅∙]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/[{[]/g, '(')
    .replace(/[}\]]/g, ')')
    .replace(/\\(left|right|cdot|times)/g, (m, w) => (w === 'cdot' || w === 'times' ? '*' : ''))
    .replace(/\\/g, '')
    .slice(0, 200);
}

function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t') {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const v = Number(s.slice(i, j));
      if (!isFinite(v)) throw new Error(`ตัวเลข "${s.slice(i, j)}" ไม่ถูกต้อง`);
      out.push({ t: 'num', v });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      const run = s.slice(i, j);
      let k = 0;
      while (k < run.length) {
        const name = NAMES.find((n) => run.startsWith(n, k));
        if (name) {
          out.push(name === 'pi' ? { t: 'num', v: Math.PI } : { t: 'fn', v: name });
          k += name.length;
        } else {
          out.push(run[k] === 'e' ? { t: 'num', v: Math.E } : { t: 'id', v: run[k] });
          k++;
        }
      }
      i = j;
      continue;
    }
    if ('+-*/^(),|'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
      continue;
    }
    throw new Error(`ไม่รู้จักเครื่องหมาย "${c}"`);
  }
  return out;
}

/** แปลงนิพจน์เป็นฟังก์ชัน + รายชื่อตัวแปรที่ใช้ */
export function compileExpr(src: string): { fn: Fn; vars: Set<string> } {
  const toks = tokenize(normalizeExpr(src));
  let pos = 0;
  let absDepth = 0;
  const vars = new Set<string>();
  const peek = () => toks[pos];
  const isOp = (v: string) => peek()?.t === 'op' && (peek() as { v: string }).v === v;
  const eat = (v: string) => {
    if (!isOp(v)) throw new Error(v === ')' ? 'วงเล็บไม่ครบ' : `ต้องมี "${v}"`);
    pos++;
  };
  const startsPrimary = () => {
    const t = peek();
    if (!t) return false;
    if (t.t !== 'op') return true;
    return t.v === '(' || (t.v === '|' && absDepth === 0);
  };

  const expr = (): Fn => {
    let a = term();
    while (isOp('+') || isOp('-')) {
      const op = (toks[pos++] as { v: string }).v;
      const l = a;
      const r = term();
      a = op === '+' ? (x, y, p) => l(x, y, p) + r(x, y, p) : (x, y, p) => l(x, y, p) - r(x, y, p);
    }
    return a;
  };
  const term = (): Fn => {
    let a = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = (toks[pos++] as { v: string }).v;
        const l = a;
        const r = unary();
        a = op === '*' ? (x, y, p) => l(x, y, p) * r(x, y, p) : (x, y, p) => l(x, y, p) / r(x, y, p);
      } else if (startsPrimary()) {
        const l = a;
        const r = power();
        a = (x, y, p) => l(x, y, p) * r(x, y, p);
      } else return a;
    }
  };
  const unary = (): Fn => {
    if (isOp('-')) {
      pos++;
      const a = unary();
      return (x, y, p) => -a(x, y, p);
    }
    if (isOp('+')) {
      pos++;
      return unary();
    }
    return power();
  };
  const power = (): Fn => {
    const base = primary();
    if (isOp('^')) {
      pos++;
      const ex = unary();
      return (x, y, p) => Math.pow(base(x, y, p), ex(x, y, p));
    }
    return base;
  };
  /** อาร์กิวเมนต์ของฟังก์ชันที่ไม่ใส่วงเล็บ เช่น sin 2x */
  const implicitArg = (): Fn => {
    let a = power();
    while (startsPrimary() && peek()?.t !== 'fn') {
      const l = a;
      const r = power();
      a = (x, y, p) => l(x, y, p) * r(x, y, p);
    }
    return a;
  };
  const primary = (): Fn => {
    const t = peek();
    if (!t) throw new Error('สมการไม่ครบ');
    if (t.t === 'num') {
      pos++;
      const v = t.v;
      return () => v;
    }
    if (t.t === 'id') {
      pos++;
      const n = t.v;
      vars.add(n);
      if (n === 'x') return (x) => x;
      if (n === 'y') return (_x, y) => y;
      return (_x, _y, p) => p[n] ?? 1;
    }
    if (t.t === 'fn') {
      pos++;
      if (t.v === 'min' || t.v === 'max') {
        eat('(');
        const args = [expr()];
        while (isOp(',')) {
          pos++;
          args.push(expr());
        }
        eat(')');
        const m = t.v === 'min' ? Math.min : Math.max;
        return (x, y, p) => m(...args.map((f) => f(x, y, p)));
      }
      const f = F1[t.v];
      let ex: Fn | null = null;
      if (isOp('^')) {
        pos++;
        ex = unary();
      }
      let arg: Fn;
      if (isOp('(')) {
        pos++;
        arg = expr();
        eat(')');
      } else arg = implicitArg();
      if (ex) {
        const e2 = ex;
        return (x, y, p) => Math.pow(f(arg(x, y, p)), e2(x, y, p));
      }
      return (x, y, p) => f(arg(x, y, p));
    }
    if (t.v === '(') {
      pos++;
      const a = expr();
      eat(')');
      return a;
    }
    if (t.v === '|') {
      pos++;
      absDepth++;
      const a = expr();
      absDepth--;
      eat('|');
      return (x, y, p) => Math.abs(a(x, y, p));
    }
    throw new Error(`วาง "${t.v}" ผิดตำแหน่ง`);
  };

  if (!toks.length) throw new Error('ยังไม่ได้พิมพ์สมการ');
  const fn = expr();
  if (pos < toks.length) {
    const t = toks[pos];
    throw new Error(t.t === 'op' && t.v === ')' ? 'วงเล็บปิดเกิน' : 'สมการอ่านไม่ออก ลองใส่ * ระหว่างตัวคูณ');
  }
  return { fn, vars };
}

export type EqKind = 'y' | 'x' | 'implicit';
export type EqParse = { ok: true; kind: EqKind; fn: Fn; params: string[]; name: string } | { ok: false; error: string };

/** แยกรูปแบบสมการ: y = ..., x = ..., f(x) = ..., หรือโดยปริยาย (เช่น x^2/9 + y^2/4 = 1) */
export function parseEquation(src: string): EqParse {
  try {
    const s = normalizeExpr(src).trim();
    const parts = s.split('=');
    if (parts.length > 2) return { ok: false, error: 'มีเครื่องหมาย = ได้ตัวเดียว' };
    const params = (v: Set<string>) => [...v].filter((n) => n !== 'x' && n !== 'y');
    if (parts.length === 1) {
      const c = compileExpr(s);
      if (c.vars.has('y')) return { ok: true, kind: 'implicit', fn: c.fn, params: params(c.vars), name: '' };
      return { ok: true, kind: 'y', fn: c.fn, params: params(c.vars), name: '' };
    }
    const L = parts[0].trim();
    const R = parts[1].trim();
    const named = /^([a-zA-Z])\s*\(\s*x\s*\)$/.exec(L);
    if (named) {
      const c = compileExpr(R);
      return { ok: true, kind: 'y', fn: c.fn, params: params(c.vars), name: named[1] };
    }
    if (L === 'y' || R === 'y') {
      const c = compileExpr(L === 'y' ? R : L);
      if (!c.vars.has('y')) return { ok: true, kind: 'y', fn: c.fn, params: params(c.vars), name: '' };
    }
    if (L === 'x' || R === 'x') {
      const c = compileExpr(L === 'x' ? R : L);
      if (!c.vars.has('x')) return { ok: true, kind: 'x', fn: (x, y, p) => c.fn(y, y, p), params: params(c.vars), name: '' };
    }
    const a = compileExpr(L);
    const b = compileExpr(R);
    const vars = new Set([...a.vars, ...b.vars]);
    if (!vars.has('x') && !vars.has('y')) return { ok: false, error: 'สมการต้องมี x หรือ y' };
    return { ok: true, kind: 'implicit', fn: (x, y, p) => a.fn(x, y, p) - b.fn(x, y, p), params: params(vars), name: '' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'สมการไม่ถูกต้อง' };
  }
}

/* ------------------------------------------------------------------ พิกัดบนภาพ */

export interface Frame {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  W: number;
  H: number;
  X: (x: number) => number;
  Y: (y: number) => number;
  ix: (px: number) => number;
  iy: (py: number) => number;
}
export function frameOf(s: Pick<GraphSpec, 'w' | 'h' | 'view' | 'equal'>): Frame {
  const W = s.w;
  const H = s.h;
  let { xMin, xMax, yMin, yMax } = s.view;
  if (s.equal) {
    const u = Math.min(W / (xMax - xMin), H / (yMax - yMin));
    const cx = (xMin + xMax) / 2;
    const cy = (yMin + yMax) / 2;
    xMin = cx - W / u / 2;
    xMax = cx + W / u / 2;
    yMin = cy - H / u / 2;
    yMax = cy + H / u / 2;
  }
  const kx = W / (xMax - xMin);
  const ky = H / (yMax - yMin);
  return { xMin, xMax, yMin, yMax, W, H, X: (x) => (x - xMin) * kx, Y: (y) => H - (y - yMin) * ky, ix: (px) => xMin + px / kx, iy: (py) => yMin + (H - py) / ky };
}

/** ระยะห่างตัวเลขบนแกนแบบสวย 1 2 5 x 10^n */
export function niceStep(span: number, px: number, target = 64): number {
  const raw = (span * target) / Math.max(1, px);
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

/* ------------------------------------------------------------------ เส้นกราฟ */

type Pt = [number, number];
export function paramValues(s: GraphSpec): Record<string, number> {
  const o: Record<string, number> = {};
  for (const [k, v] of Object.entries(s.params)) o[k] = v.v;
  return o;
}

/** จุดบนจอของเส้นกราฟ (แยกเป็นหลายเส้นตรงที่ขาด) */
export function curvePaths(e: GExpr, f: Frame, p: Record<string, number>): Pt[][] {
  const r = parseEquation(e.text);
  if (!r.ok) return [];
  const lo = e.lo ?? -Infinity;
  const hi = e.hi ?? Infinity;
  const paths: Pt[][] = [];
  const clampY = (v: number) => Math.max(-f.H * 3, Math.min(f.H * 4, v));
  const clampX = (v: number) => Math.max(-f.W * 3, Math.min(f.W * 4, v));
  if (r.kind === 'y' || r.kind === 'x') {
    const alongX = r.kind === 'y';
    const a = Math.max(alongX ? f.xMin : f.yMin, lo);
    const b = Math.min(alongX ? f.xMax : f.yMax, hi);
    if (!(a < b)) return [];
    const N = Math.max(240, Math.min(1400, Math.round((alongX ? f.W : f.H) * 1.6)));
    let cur: Pt[] = [];
    let prev: number | null = null;
    const span = alongX ? f.H : f.W;
    for (let i = 0; i <= N; i++) {
      const t = a + ((b - a) * i) / N;
      const v = alongX ? r.fn(t, 0, p) : r.fn(0, t, p);
      if (!isFinite(v)) {
        if (cur.length > 1) paths.push(cur);
        cur = [];
        prev = null;
        continue;
      }
      const pv = alongX ? f.Y(v) : f.X(v);
      // เส้นกำกับแนวดิ่ง (เช่น 1/x, tan x): ตัดเส้นตอนกระโดดไกลเกินจอ
      if (prev !== null && Math.abs(pv - prev) > span * 1.2) {
        if (cur.length > 1) paths.push(cur);
        cur = [];
      }
      prev = pv;
      cur.push(alongX ? [f.X(t), clampY(pv)] : [clampX(pv), f.Y(t)]);
    }
    if (cur.length > 1) paths.push(cur);
    return paths;
  }
  return contour(r.fn, f, p, lo, hi);
}

/** marching squares สำหรับสมการโดยปริยาย แล้วต่อชิ้นเส้นเป็นเส้นยาว (เส้นประจะได้ต่อเนื่อง) */
function contour(fn: Fn, f: Frame, p: Record<string, number>, lo: number, hi: number): Pt[][] {
  const nx = Math.max(60, Math.min(280, Math.round(f.W / 3)));
  const ny = Math.max(60, Math.min(280, Math.round(f.H / 3)));
  const gx = (i: number) => (i * f.W) / nx;
  const gy = (j: number) => (j * f.H) / ny;
  const val: number[][] = [];
  for (let j = 0; j <= ny; j++) {
    const row: number[] = [];
    for (let i = 0; i <= nx; i++) row.push(fn(f.ix(gx(i)), f.iy(gy(j)), p));
    val.push(row);
  }
  // จุดตัดบนขอบเซลล์ คำนวณจากมุมเรียงแบบเดียวกันเสมอ เซลล์ข้างกันจะได้จุดเดียวกันเป๊ะ
  const edge = (i1: number, j1: number, i2: number, j2: number): Pt => {
    if (i2 < i1 || (i2 === i1 && j2 < j1)) [i1, j1, i2, j2] = [i2, j2, i1, j1];
    const a = val[j1][i1];
    const b = val[j2][i2];
    const t = a / (a - b);
    return [gx(i1) + (gx(i2) - gx(i1)) * t, gy(j1) + (gy(j2) - gy(j1)) * t];
  };
  const segs: [Pt, Pt][] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = val[j][i];
      const b = val[j][i + 1];
      const c = val[j + 1][i + 1];
      const d = val[j + 1][i];
      if (!isFinite(a) || !isFinite(b) || !isFinite(c) || !isFinite(d)) continue;
      const k = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0);
      if (k === 0 || k === 15) continue;
      const T = () => edge(i, j, i + 1, j);
      const Rt = () => edge(i + 1, j, i + 1, j + 1);
      const B = () => edge(i, j + 1, i + 1, j + 1);
      const L = () => edge(i, j, i, j + 1);
      const add = (u: Pt, v: Pt) => segs.push([u, v]);
      switch (k) {
        case 1:
        case 14:
          add(L(), B());
          break;
        case 2:
        case 13:
          add(B(), Rt());
          break;
        case 3:
        case 12:
          add(L(), Rt());
          break;
        case 4:
        case 11:
          add(T(), Rt());
          break;
        case 6:
        case 9:
          add(T(), B());
          break;
        case 7:
        case 8:
          add(L(), T());
          break;
        case 5:
        case 10: {
          const mid = fn(f.ix((gx(i) + gx(i + 1)) / 2), f.iy((gy(j) + gy(j + 1)) / 2), p) > 0;
          if ((k === 5) === mid) {
            add(L(), T());
            add(B(), Rt());
          } else {
            add(L(), B());
            add(T(), Rt());
          }
          break;
        }
      }
    }
  }
  const inDom = (q: Pt) => {
    const x = f.ix(q[0]);
    return x >= lo && x <= hi;
  };
  const key = (q: Pt) => `${Math.round(q[0] * 1000)},${Math.round(q[1] * 1000)}`;
  const ok = segs.filter(([u, v]) => inDom(u) && inDom(v));
  const at = new Map<string, number[]>();
  ok.forEach(([u, v], n) => {
    for (const q of [u, v]) {
      const k2 = key(q);
      const l = at.get(k2);
      if (l) l.push(n);
      else at.set(k2, [n]);
    }
  });
  const used = new Uint8Array(ok.length);
  const out: Pt[][] = [];
  const walk = (line: Pt[], tail: Pt) => {
    for (;;) {
      const list = at.get(key(tail)) || [];
      const n = list.find((m) => !used[m]);
      if (n === undefined) return;
      used[n] = 1;
      const [u, v] = ok[n];
      const next = key(u) === key(tail) ? v : u;
      line.push(next);
      tail = next;
    }
  };
  for (let n = 0; n < ok.length; n++) {
    if (used[n]) continue;
    used[n] = 1;
    const fwd: Pt[] = [ok[n][0], ok[n][1]];
    walk(fwd, ok[n][1]);
    const back: Pt[] = [];
    walk(back, ok[n][0]);
    out.push([...back.reverse(), ...fwd]);
  }
  return out;
}

/** จุดตัดของสองฟังก์ชัน y=f(x) ในช่วง [a,b] (ใช้ทำแม่แบบ/ปุ่มหาจุดตัด) */
export function intersections(e1: string, e2: string, a: number, b: number, p: Record<string, number> = {}): Pt[] {
  const r1 = parseEquation(e1);
  const r2 = parseEquation(e2);
  if (!r1.ok || !r2.ok || r1.kind !== 'y' || r2.kind !== 'y') return [];
  const d = (x: number) => r1.fn(x, 0, p) - r2.fn(x, 0, p);
  const out: Pt[] = [];
  const N = 800;
  let x0 = a;
  let v0 = d(a);
  for (let i = 1; i <= N; i++) {
    const x1 = a + ((b - a) * i) / N;
    const v1 = d(x1);
    if (isFinite(v0) && isFinite(v1) && v0 * v1 <= 0 && Math.abs(v0 - v1) < 1e6) {
      let lo = x0;
      let hi = x1;
      for (let k = 0; k < 60; k++) {
        const m = (lo + hi) / 2;
        if (d(lo) * d(m) <= 0) hi = m;
        else lo = m;
      }
      const x = (lo + hi) / 2;
      if (!out.some((q) => Math.abs(q[0] - x) < 1e-6)) out.push([x, r1.fn(x, 0, p)]);
    }
    x0 = x1;
    v0 = v1;
  }
  return out;
}

/* ------------------------------------------------------------------ วาดเป็น SVG */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = (n: number) => Math.round(n * 10) / 10;
const dashArr = (d: GDash, w: number) => (d === 'dash' ? `${w * 4} ${w * 3}` : d === 'dot' ? `0.1 ${w * 2.6}` : d === 'dashdot' ? `${w * 5} ${w * 2.5} 0.1 ${w * 2.5}` : '');
const pathD = (pts: Pt[]) => pts.map((q, i) => `${i ? 'L' : 'M'}${r1(q[0])} ${r1(q[1])}`).join('');

/** ป้ายข้อความ: _ = ตัวห้อย, ^ = ตัวยก (เช่น F_1, x^2, F') */
function richText(text: string, x: number, y: number, o: { size: number; color: string; font: string; italic: boolean; anchor?: string; bar?: boolean; weight?: number }): string {
  const parts: { s: string; k: 0 | 1 | -1 }[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if ((c === '_' || c === '^') && i + 1 < text.length) {
      let body: string;
      if (text[i + 1] === '{') {
        const end = text.indexOf('}', i + 2);
        body = text.slice(i + 2, end < 0 ? undefined : end);
        i = end < 0 ? text.length : end + 1;
      } else {
        body = text[i + 1];
        i += 2;
      }
      parts.push({ s: body, k: c === '_' ? -1 : 1 });
    } else {
      const last = parts[parts.length - 1];
      if (last && last.k === 0) last.s += c;
      else parts.push({ s: c, k: 0 });
      i++;
    }
  }
  const small = o.size * 0.68;
  let shift = 0;
  const spans = parts
    .map((p) => {
      const dy = p.k === 0 ? -shift : p.k === 1 ? -o.size * 0.38 - shift : o.size * 0.22 - shift;
      shift += dy;
      return `<tspan dy="${r1(dy)}" font-size="${r1(p.k ? small : o.size)}">${esc(p.s)}</tspan>`;
    })
    .join('');
  const len = parts.reduce((n, p) => n + p.s.length * (p.k ? small : o.size) * 0.56, 0);
  const anchor = o.anchor || 'start';
  const x0 = anchor === 'middle' ? x - len / 2 : anchor === 'end' ? x - len : x;
  const bar = o.bar ? `<line x1="${r1(x0)}" x2="${r1(x0 + len)}" y1="${r1(y - o.size * 0.88)}" y2="${r1(y - o.size * 0.88)}" stroke="${o.color}" stroke-width="${r1(Math.max(1, o.size / 14))}"/>` : '';
  return `<text x="${r1(x)}" y="${r1(y)}" fill="${o.color}" font-family="${esc(o.font)}" font-size="${r1(o.size)}" font-style="${o.italic ? 'italic' : 'normal'}" font-weight="${o.weight ?? 400}" text-anchor="${anchor}">${spans}</text>${bar}`;
}

function arrowHead(x1: number, y1: number, x2: number, y2: number, size: number, color: string): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (ang: number) => `${r1(x2 - size * Math.cos(a + ang))},${r1(y2 - size * Math.sin(a + ang))}`;
  return `<polygon points="${r1(x2)},${r1(y2)} ${p(0.42)} ${p(-0.42)}" fill="${color}"/>`;
}

const LABEL_OFF: Record<LabelPos, [number, number, string]> = {
  ne: [1, -1, 'start'],
  nw: [-1, -1, 'end'],
  se: [1, 1, 'start'],
  sw: [-1, 1, 'end'],
  n: [0, -1, 'middle'],
  s: [0, 1, 'middle'],
  e: [1, 0, 'start'],
  w: [-1, 0, 'end'],
};

const fmtNum = (n: number) => {
  const v = Math.round(n * 1e6) / 1e6;
  return String(v).replace('-', '−');
};

/** ภาพ SVG ทั้งหมดของกราฟ (ข้อความทุกตัว escape แล้ว) */
export function graphToSvg(s: GraphSpec, opt: { idPrefix?: string } = {}): string {
  const th = themeOf(s.theme);
  const f = frameOf(s);
  const p = paramValues(s);
  const W = s.w;
  const H = s.h;
  const fs = Math.max(11, Math.min(W, H) / 30);
  const out: string[] = [];
  const clip = `${opt.idPrefix || 'g'}${Math.random().toString(36).slice(2, 7)}`;
  if (!s.clear) out.push(`<rect width="${W}" height="${H}" fill="${th.bg}"/>`);
  const step = s.step > 0 ? s.step : niceStep(f.xMax - f.xMin, W);
  const stepY = s.step > 0 ? s.step : niceStep(f.yMax - f.yMin, H);
  const lines = (st: number, color: string, w: number) => {
    const o: string[] = [];
    for (let x = Math.ceil(f.xMin / st) * st; x <= f.xMax; x += st) o.push(`M${r1(f.X(x))} 0V${H}`);
    for (let y = Math.ceil(f.yMin / st) * st; y <= f.yMax; y += st) o.push(`M0 ${r1(f.Y(y))}H${W}`);
    return o.length ? `<path d="${o.join('')}" stroke="${color}" stroke-width="${w}" fill="none"/>` : '';
  };
  if (s.grid) {
    const g = Math.min(step, stepY);
    if (s.minor) out.push(lines(g / 5, th.minor, 1));
    out.push(lines(g, th.grid, 1.2));
  }
  const ox = Math.max(0, Math.min(W, f.X(0)));
  const oy = Math.max(0, Math.min(H, f.Y(0)));
  if (s.axes) {
    const aw = th.axisW;
    const head = 8 + aw * 2;
    out.push(`<path d="M0 ${r1(oy)}H${W}M${r1(ox)} 0V${H}" stroke="${th.axis}" stroke-width="${aw}" fill="none"/>`);
    if (s.arrows === 'end' || s.arrows === 'both') {
      out.push(arrowHead(0, oy, W - 1, oy, head, th.axis), arrowHead(ox, H, ox, 1, head, th.axis));
    }
    if (s.arrows === 'start' || s.arrows === 'both') {
      out.push(arrowHead(W, oy, 1, oy, head, th.axis), arrowHead(ox, 0, ox, H - 1, head, th.axis));
    }
    if (s.numbers) {
      const tick = 4 + aw;
      const tk: string[] = [];
      for (let x = Math.ceil(f.xMin / step) * step; x <= f.xMax; x += step) {
        if (Math.abs(x) < step / 1000) continue;
        const px = f.X(x);
        if (px < 14 || px > W - 18) continue;
        tk.push(`M${r1(px)} ${r1(oy - tick)}V${r1(oy + tick)}`);
        out.push(richText(fmtNum(x), px, oy + tick + fs * 1.05, { size: fs * 0.85, color: th.text, font: SANS, italic: false, anchor: 'middle' }));
      }
      for (let y = Math.ceil(f.yMin / stepY) * stepY; y <= f.yMax; y += stepY) {
        if (Math.abs(y) < stepY / 1000) continue;
        const py = f.Y(y);
        if (py < 16 || py > H - 12) continue;
        tk.push(`M${r1(ox - tick)} ${r1(py)}H${r1(ox + tick)}`);
        out.push(richText(fmtNum(y), ox - tick - 4, py + fs * 0.32, { size: fs * 0.85, color: th.text, font: SANS, italic: false, anchor: 'end' }));
      }
      if (tk.length) out.push(`<path d="${tk.join('')}" stroke="${th.axis}" stroke-width="${Math.max(1, aw * 0.8)}"/>`);
    }
    if (s.xName) out.push(richText(s.xName, W - 6, oy + (oy > H - fs * 2 ? -fs * 0.8 : fs * 1.5), { size: fs * 1.15, color: th.text, font: th.font, italic: th.italic, anchor: 'end' }));
    if (s.yName) out.push(richText(s.yName, ox + (ox > W - fs * 3 ? -fs * 0.6 : fs * 0.6), fs * 1.3, { size: fs * 1.15, color: th.text, font: th.font, italic: th.italic, anchor: ox > W - fs * 3 ? 'end' : 'start' }));
    if (s.origin) out.push(richText('O', ox - 5, oy + fs * 1.15, { size: fs, color: th.text, font: th.font, italic: false, anchor: 'end' }));
  }

  const pts = new Map<string, GPoint>();
  for (const o of s.objs) if (o.kind === 'point') pts.set(o.id, o);
  const P = (id: string): Pt | null => {
    const q = pts.get(id);
    return q ? [f.X(q.x), f.Y(q.y)] : null;
  };

  out.push(`<defs><clipPath id="${clip}"><rect width="${W}" height="${H}"/></clipPath></defs><g clip-path="url(#${clip})">`);
  const labels: string[] = [];
  for (const o of s.objs) {
    if (o.hidden) continue;
    if (o.kind === 'expr') {
      const paths = curvePaths(o, f, p);
      const d = paths.map(pathD).join('');
      if (d) out.push(`<path d="${d}" fill="none" stroke="${o.color}" stroke-width="${o.width}" stroke-dasharray="${dashArr(o.dash, o.width)}" stroke-linecap="round" stroke-linejoin="round"/>`);
      if (o.label && paths.length) {
        const best = paths.reduce((m, q) => (q.length > m.length ? q : m), paths[0]);
        const vis = best.filter((q) => q[0] >= 4 && q[0] <= W - 4 && q[1] >= 4 && q[1] <= H - 4);
        const path = vis.length > 2 ? vis : best;
        const q = path[Math.min(path.length - 1, Math.max(0, Math.round((path.length - 1) * o.at)))];
        labels.push(richText(o.label, Math.min(W - 8, q[0] + 6), Math.max(fs, q[1] - 6), { size: fs * 1.15, color: o.color, font: th.font, italic: th.italic, anchor: q[0] > W - 40 ? 'end' : 'start' }));
      }
    } else if (o.kind === 'draw') {
      const [a, b] = [o.pts[0], o.pts[o.pts.length - 1]];
      const st = `stroke="${o.color}" stroke-width="${o.width}" stroke-dasharray="${dashArr(o.dash, o.width)}" stroke-linecap="round" stroke-linejoin="round"`;
      const fill = o.fill ? `fill="${o.fill}" fill-opacity="${o.alpha}"` : 'fill="none"';
      if (o.shape === 'rect') out.push(`<rect x="${r1(Math.min(a[0], b[0]))}" y="${r1(Math.min(a[1], b[1]))}" width="${r1(Math.abs(b[0] - a[0]))}" height="${r1(Math.abs(b[1] - a[1]))}" ${fill} ${st}/>`);
      else if (o.shape === 'ellipse') out.push(`<ellipse cx="${r1((a[0] + b[0]) / 2)}" cy="${r1((a[1] + b[1]) / 2)}" rx="${r1(Math.abs(b[0] - a[0]) / 2)}" ry="${r1(Math.abs(b[1] - a[1]) / 2)}" ${fill} ${st}/>`);
      else if (o.shape === 'pen') out.push(`<path d="${pathD(o.pts)}" fill="none" ${st}/>`);
      else {
        const hs = 7 + o.width * 2.2;
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const ux = (b[0] - a[0]) / len;
        const uy = (b[1] - a[1]) / len;
        const e = o.arrow === 'end' || o.arrow === 'both';
        const s0 = o.arrow === 'start' || o.arrow === 'both';
        const a2: Pt = s0 ? [a[0] + ux * hs * 0.8, a[1] + uy * hs * 0.8] : a;
        const b2: Pt = e ? [b[0] - ux * hs * 0.8, b[1] - uy * hs * 0.8] : b;
        out.push(`<path d="${pathD([a2, b2])}" fill="none" ${st}/>`);
        if (e) out.push(arrowHead(a[0], a[1], b[0], b[1], hs, o.color));
        if (s0) out.push(arrowHead(b[0], b[1], a[0], a[1], hs, o.color));
      }
    } else if (o.kind === 'poly') {
      const q = o.pts.map(P).filter((v): v is Pt => !!v);
      if (q.length >= 2) out.push(`<path d="${pathD(q)}Z" fill="${o.fill || 'none'}" fill-opacity="${o.fill ? o.alpha : 0}" stroke="${o.color}" stroke-width="${o.width}" stroke-dasharray="${dashArr(o.dash, o.width)}" stroke-linejoin="round"/>`);
    } else if (o.kind === 'seg') {
      const a = P(o.a);
      const b = P(o.b);
      if (!a || !b) continue;
      const hs = 7 + o.width * 2.2;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const ux = (b[0] - a[0]) / len;
      const uy = (b[1] - a[1]) / len;
      const e = o.arrow === 'end' || o.arrow === 'both';
      const st = o.arrow === 'start' || o.arrow === 'both';
      const a2: Pt = st ? [a[0] + ux * hs * 0.8, a[1] + uy * hs * 0.8] : a;
      const b2: Pt = e ? [b[0] - ux * hs * 0.8, b[1] - uy * hs * 0.8] : b;
      out.push(`<path d="${pathD([a2, b2])}" stroke="${o.color}" stroke-width="${o.width}" stroke-dasharray="${dashArr(o.dash, o.width)}" stroke-linecap="round"/>`);
      if (e) out.push(arrowHead(a[0], a[1], b[0], b[1], hs, o.color));
      if (st) out.push(arrowHead(b[0], b[1], a[0], a[1], hs, o.color));
      if (o.label) {
        const mx = (a[0] + b[0]) / 2 - uy * o.side * fs * 1.05;
        const my = (a[1] + b[1]) / 2 + ux * o.side * fs * 1.05;
        labels.push(richText(o.label, mx, my + fs * 0.35, { size: fs * 1.1, color: o.color, font: th.font, italic: th.italic, anchor: 'middle', bar: o.bar }));
      }
    } else if (o.kind === 'angle') {
      const a = P(o.a);
      const c = P(o.o);
      const b = P(o.b);
      if (!a || !b || !c) continue;
      const t1 = Math.atan2(a[1] - c[1], a[0] - c[0]);
      const t2 = Math.atan2(b[1] - c[1], b[0] - c[0]);
      let d = t2 - t1;
      while (d <= -Math.PI) d += 2 * Math.PI;
      while (d > Math.PI) d -= 2 * Math.PI;
      const r = o.r;
      const at = (t: number, rr = r): Pt => [c[0] + rr * Math.cos(t), c[1] + rr * Math.sin(t)];
      if (Math.abs(Math.abs(d) - Math.PI / 2) < 0.012) {
        const k = r * 0.7;
        const u1: Pt = [Math.cos(t1) * k, Math.sin(t1) * k];
        const u2: Pt = [Math.cos(t2) * k, Math.sin(t2) * k];
        out.push(`<path d="${pathD([[c[0] + u1[0], c[1] + u1[1]], [c[0] + u1[0] + u2[0], c[1] + u1[1] + u2[1]], [c[0] + u2[0], c[1] + u2[1]]])}" fill="none" stroke="${o.color}" stroke-width="1.6"/>`);
      } else {
        const s1 = at(t1);
        const s2 = at(t1 + d);
        out.push(`<path d="M${r1(s1[0])} ${r1(s1[1])}A${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${r1(s2[0])} ${r1(s2[1])}" fill="none" stroke="${o.color}" stroke-width="1.6"/>`);
      }
      if (o.label) {
        const m = at(t1 + d / 2, r + fs * 0.9);
        labels.push(richText(o.label, m[0], m[1] + fs * 0.35, { size: fs, color: o.color, font: th.font, italic: th.italic, anchor: 'middle' }));
      }
    } else if (o.kind === 'point') {
      const x = f.X(o.x);
      const y = f.Y(o.y);
      if (o.guides) out.push(`<path d="M${r1(x)} ${r1(y)}V${r1(oy)}M${r1(x)} ${r1(y)}H${r1(ox)}" stroke="${o.color}" stroke-width="1.2" stroke-dasharray="3 4" fill="none"/>`);
      if (o.size > 0) out.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${o.size}" fill="${o.hollow ? th.bg : o.color}" stroke="${o.color}" stroke-width="${o.hollow ? 1.8 : 0}"/>`);
      if (o.label) {
        const [dx, dy, anchor] = LABEL_OFF[o.pos];
        const gap = o.size + 4;
        labels.push(richText(o.label, x + dx * gap, y + (dy < 0 ? -gap : dy > 0 ? gap + fs * 0.85 : fs * 0.35), { size: fs * 1.1, color: o.color, font: th.font, italic: th.italic, anchor }));
      }
    } else if (o.kind === 'text') {
      labels.push(richText(o.text, f.X(o.x), f.Y(o.y), { size: o.size, color: o.color, font: th.font, italic: o.italic, anchor: 'middle', bar: o.bar }));
    }
  }
  out.push(labels.join(''), '</g>');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">${out.join('')}</svg>`;
}

/* ------------------------------------------------------------------ ค่าเริ่มต้น */

export function newSpec(theme: GThemeId = 'grid', over: Partial<GraphSpec> = {}): GraphSpec {
  return {
    v: 1,
    w: 520,
    h: 420,
    view: { xMin: -6, xMax: 6, yMin: -5, yMax: 5 },
    equal: true,
    axes: true,
    arrows: 'end',
    grid: theme !== 'book',
    minor: false,
    numbers: theme !== 'book',
    step: 0,
    xName: 'X',
    yName: 'Y',
    origin: theme === 'book',
    theme,
    clear: false,
    params: {},
    objs: [],
    ...over,
  };
}
export const mkExpr = (text: string, color: string, over: Partial<GExpr> = {}): GExpr => ({ id: gid(), kind: 'expr', text, color, width: 2.5, dash: 'solid', label: '', at: 0.9, lo: null, hi: null, ...over });
export const mkPoint = (x: number, y: number, label = '', color = '#111111', over: Partial<GPoint> = {}): GPoint => ({ id: gid(), kind: 'point', x, y, label, color, size: 4.5, hollow: false, pos: 'ne', guides: false, ...over });
export const mkSeg = (a: string, b: string, color = '#111111', over: Partial<GSeg> = {}): GSeg => ({ id: gid(), kind: 'seg', a, b, color, width: 2, dash: 'solid', arrow: 'none', label: '', bar: false, side: 1, ...over });
export const mkPoly = (pts: string[], color = '#111111', over: Partial<GPoly> = {}): GPoly => ({ id: gid(), kind: 'poly', pts, color, width: 2, dash: 'solid', fill: '', alpha: 0.2, ...over });
export const mkAngle = (a: string, o: string, b: string, label = '', color = '#111111'): GAngle => ({ id: gid(), kind: 'angle', a, o, b, label, color, r: 22 });
export const mkText = (x: number, y: number, text: string, color = '#111111', over: Partial<GText> = {}): GText => ({ id: gid(), kind: 'text', x, y, text, color, size: 18, italic: false, bar: false, ...over });

/** ใส่ค่าเริ่มต้นของแถบเลื่อนให้ตัวอักษรที่เพิ่งปรากฏในสมการ */
export function syncParams(s: GraphSpec): GraphSpec {
  const used = new Set<string>();
  for (const o of s.objs) if (o.kind === 'expr') {
    const r = parseEquation(o.text);
    if (r.ok) r.params.forEach((n) => used.add(n));
  }
  const params: Record<string, GParam> = {};
  for (const n of [...used].slice(0, 12)) params[n] = s.params[n] ?? { v: 1, min: -10, max: 10, step: 0.1 };
  return { ...s, params };
}

/* ------------------------------------------------------------------ ตรวจข้อมูล (ทุกครั้งที่โหลด) */

const HEXC = /^#[0-9a-fA-F]{6}$/;
const num = (v: unknown, lo: number, hi: number, d: number) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};
const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const col = (v: unknown, d = '#111111') => (typeof v === 'string' && HEXC.test(v) ? v : d);
const pick = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
const DASHES = ['solid', 'dash', 'dot', 'dashdot'] as const;
const ARROWS = ['none', 'end', 'start', 'both'] as const;
const DRAW_SHAPES = ['line', 'rect', 'ellipse', 'pen'] as const;
const POS = ['ne', 'nw', 'se', 'sw', 'n', 's', 'e', 'w'] as const;
const THEMES = ['book', 'grid', 'desmos', 'chalk', 'kids'] as const;
const OID = /^[a-z0-9]{1,12}$/;
const BIG = 1e6;

export function cleanGraph(raw: unknown): GraphSpec {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const vw = (r.view && typeof r.view === 'object' ? r.view : {}) as Record<string, unknown>;
  let xMin = num(vw.xMin, -BIG, BIG, -6);
  let xMax = num(vw.xMax, -BIG, BIG, 6);
  let yMin = num(vw.yMin, -BIG, BIG, -5);
  let yMax = num(vw.yMax, -BIG, BIG, 5);
  if (!(xMax - xMin > 1e-6)) [xMin, xMax] = [-6, 6];
  if (!(yMax - yMin > 1e-6)) [yMin, yMax] = [-5, 5];
  const objs: GObj[] = [];
  const ids = new Set<string>();
  const list = Array.isArray(r.objs) ? r.objs.slice(0, 150) : [];
  // จุดก่อน เพราะเส้น/มุม/รูปหลายเหลี่ยมอ้างถึงจุด
  const ordered = [...list.filter((o) => (o as { kind?: string })?.kind === 'point'), ...list.filter((o) => (o as { kind?: string })?.kind !== 'point')];
  const pointIds = new Set<string>();
  const built = new Map<unknown, GObj>();
  for (const raw2 of ordered) {
    const o = (raw2 && typeof raw2 === 'object' ? raw2 : {}) as Record<string, unknown>;
    let id = typeof o.id === 'string' && OID.test(o.id) && !ids.has(o.id) ? o.id : gid();
    while (ids.has(id)) id = gid();
    const base = { id, color: col(o.color), hidden: !!o.hidden };
    let g: GObj | null = null;
    switch (o.kind) {
      case 'expr':
        g = { ...base, kind: 'expr', text: txt(o.text, 200), width: num(o.width, 0.5, 12, 2.5), dash: pick(o.dash, DASHES, 'solid'), label: txt(o.label, 40), at: num(o.at, 0, 1, 0.9), lo: o.lo === null || o.lo === undefined || o.lo === '' ? null : num(o.lo, -BIG, BIG, 0), hi: o.hi === null || o.hi === undefined || o.hi === '' ? null : num(o.hi, -BIG, BIG, 0) };
        {
          const sh = cleanShape(o.shape);
          // สมการต้องตรงกับรูปทรงเสมอ (กันข้อมูลที่ถูกแก้มาเอง)
          if (sh) g = { ...g, shape: sh, text: shapeText(sh) };
        }
        break;
      case 'point':
        g = { ...base, kind: 'point', x: num(o.x, -BIG, BIG, 0), y: num(o.y, -BIG, BIG, 0), label: txt(o.label, 40), size: num(o.size, 0, 14, 4.5), hollow: !!o.hollow, pos: pick(o.pos, POS, 'ne'), guides: !!o.guides };
        pointIds.add(id);
        break;
      case 'seg':
        if (typeof o.a === 'string' && typeof o.b === 'string')
          g = { ...base, kind: 'seg', a: o.a, b: o.b, width: num(o.width, 0.5, 12, 2), dash: pick(o.dash, DASHES, 'solid'), arrow: pick(o.arrow, ARROWS, 'none'), label: txt(o.label, 40), bar: !!o.bar, side: o.side === -1 ? -1 : 1 };
        break;
      case 'poly':
        if (Array.isArray(o.pts)) g = { ...base, kind: 'poly', pts: o.pts.filter((q): q is string => typeof q === 'string').slice(0, 40), width: num(o.width, 0, 12, 2), dash: pick(o.dash, DASHES, 'solid'), fill: typeof o.fill === 'string' && HEXC.test(o.fill) ? o.fill : '', alpha: num(o.alpha, 0, 1, 0.2) };
        break;
      case 'angle':
        if (typeof o.a === 'string' && typeof o.o === 'string' && typeof o.b === 'string') g = { ...base, kind: 'angle', a: o.a, o: o.o, b: o.b, label: txt(o.label, 20), r: num(o.r, 6, 120, 22) };
        break;
      case 'text':
        g = { ...base, kind: 'text', x: num(o.x, -BIG, BIG, 0), y: num(o.y, -BIG, BIG, 0), text: txt(o.text, 120), size: num(o.size, 8, 72, 18), italic: !!o.italic, bar: !!o.bar };
        break;
      case 'draw': {
        const pts = (Array.isArray(o.pts) ? o.pts : [])
          .slice(0, 400)
          .filter((q): q is [number, number] => Array.isArray(q) && q.length === 2 && q.every((v) => typeof v === 'number' && isFinite(v)))
          .map((q): [number, number] => [num(q[0], -4000, 4000, 0), num(q[1], -4000, 4000, 0)]);
        if (pts.length >= 2)
          g = { ...base, kind: 'draw', shape: pick(o.shape, DRAW_SHAPES, 'line'), pts, width: num(o.width, 0.5, 12, 2.5), dash: pick(o.dash, DASHES, 'solid'), arrow: pick(o.arrow, ARROWS, 'none'), fill: typeof o.fill === 'string' && HEXC.test(o.fill) ? o.fill : '', alpha: num(o.alpha, 0, 1, 0.25) };
        break;
      }
    }
    if (g) {
      ids.add(id);
      built.set(raw2, g);
    }
  }
  // คงลำดับเดิม (ลำดับ = ชั้นการวาด) และทิ้งชิ้นที่อ้างจุดที่ไม่มีแล้ว
  for (const raw2 of list) {
    const g = built.get(raw2);
    if (!g) continue;
    if (g.kind === 'seg' && !(pointIds.has(g.a) && pointIds.has(g.b))) continue;
    if (g.kind === 'angle' && !(pointIds.has(g.a) && pointIds.has(g.o) && pointIds.has(g.b))) continue;
    if (g.kind === 'poly') g.pts = g.pts.filter((q) => pointIds.has(q));
    objs.push(g);
  }
  const params: Record<string, GParam> = {};
  const rp = (r.params && typeof r.params === 'object' ? r.params : {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(rp).slice(0, 12)) {
    if (!/^[a-zA-Z]$/.test(k) || k === 'x' || k === 'y' || k === 'e') continue;
    const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    let min = num(o.min, -BIG, BIG, -10);
    let max = num(o.max, -BIG, BIG, 10);
    if (!(max > min)) [min, max] = [-10, 10];
    params[k] = { v: num(o.v, min, max, 1), min, max, step: num(o.step, 1e-4, (max - min) || 1, 0.1) };
  }
  return {
    v: 1,
    w: num(r.w, 120, 2400, 520),
    h: num(r.h, 100, 2400, 420),
    view: { xMin, xMax, yMin, yMax },
    equal: r.equal === undefined ? true : !!r.equal,
    axes: r.axes === undefined ? true : !!r.axes,
    arrows: pick(r.arrows, ARROWS, 'end'),
    grid: !!r.grid,
    minor: !!r.minor,
    numbers: !!r.numbers,
    step: num(r.step, 0, BIG, 0),
    xName: txt(r.xName, 12),
    yName: txt(r.yName, 12),
    origin: !!r.origin,
    theme: pick(r.theme, THEMES, 'grid'),
    clear: !!r.clear,
    params,
    objs,
  };
}

/* ------------------------------------------------------------------ รูปทรงเฉพาะ (ปรับรัศมี แกนเอก แกนโท จุดยอด ฯลฯ) */

export type ShapeKind = 'line' | 'circle' | 'ellipse' | 'parabola' | 'parabolaX' | 'hyperbola';
/** ค่าของรูปทรง: h,k = จุดศูนย์กลาง/จุดยอด, r = รัศมี, a,b = ครึ่งแกน (ไฮเพอร์โบลา/วงรี) หรือสัมประสิทธิ์ (พาราโบลา a, เส้นตรง a=ความชัน b=จุดตัดแกน y), vert = แกนเอกแนวตั้ง */
export interface GShape {
  k: ShapeKind;
  h: number;
  v: number;
  r: number;
  a: number;
  b: number;
  vert: boolean;
}

export const SHAPE_KINDS: { k: ShapeKind; label: string }[] = [
  { k: 'line', label: 'เส้นตรง' },
  { k: 'circle', label: 'วงกลม' },
  { k: 'ellipse', label: 'วงรี' },
  { k: 'parabola', label: 'พาราโบลา (หงาย/คว่ำ)' },
  { k: 'parabolaX', label: 'พาราโบลา (ตะแคง)' },
  { k: 'hyperbola', label: 'ไฮเพอร์โบลา' },
];

export const defaultShape = (k: ShapeKind): GShape => ({
  k,
  h: 0,
  v: 0,
  r: 3,
  a: k === 'line' ? 1 : k === 'parabola' || k === 'parabolaX' ? 1 : k === 'hyperbola' ? 2 : 4,
  b: k === 'line' ? 0 : k === 'hyperbola' ? 3 : 2,
  vert: false,
});

/** ตัวเลขสั้นๆ (ไม่มีศูนย์เกิน) */
export const shNum = (n: number) => String(Math.round(n * 1000) / 1000);
/** (x - h) แบบอ่านง่าย: h = 0 -> x, h = 2 -> (x - 2), h = -2 -> (x + 2) */
const shift = (name: string, h: number) => (Math.abs(h) < 1e-9 ? name : `(${name} ${h > 0 ? '-' : '+'} ${shNum(Math.abs(h))})`);
const plus = (c: number) => (Math.abs(c) < 1e-9 ? '' : ` ${c > 0 ? '+' : '-'} ${shNum(Math.abs(c))}`);
const coef = (a: number) => (a === 1 ? '' : a === -1 ? '-' : shNum(a));

/** สมการของรูปทรง (ป้อนให้ตัววาดกราฟเดิม) */
export function shapeText(s: GShape): string {
  const X = shift('x', s.h);
  const Y = shift('y', s.v);
  const sq = (t: string) => `${t}^2`;
  switch (s.k) {
    case 'line':
      return `y = ${coef(s.a) || ''}x${plus(s.b)}`.replace('y = 0x', 'y = 0');
    case 'circle':
      return `${sq(X)} + ${sq(Y)} = ${shNum(s.r * s.r)}`;
    case 'ellipse': {
      const [ax, by] = s.vert ? [s.b, s.a] : [s.a, s.b];
      return `${sq(X)}/${shNum(ax * ax)} + ${sq(Y)}/${shNum(by * by)} = 1`;
    }
    case 'hyperbola':
      return s.vert ? `${sq(Y)}/${shNum(s.a * s.a)} - ${sq(X)}/${shNum(s.b * s.b)} = 1` : `${sq(X)}/${shNum(s.a * s.a)} - ${sq(Y)}/${shNum(s.b * s.b)} = 1`;
    case 'parabola':
      return `y = ${coef(s.a)}${sq(X)}${plus(s.v)}`;
    case 'parabolaX':
      return `x = ${coef(s.a)}${sq(Y)}${plus(s.h)}`;
  }
}

/** ค่าที่ได้จากรูปทรง (โฟกัส ความเยื้องศูนย์กลาง ฯลฯ) ไว้โชว์ใต้แถบปรับ */
export function shapeFacts(s: GShape): string[] {
  const P = (x: number, y: number) => `(${shNum(x)}, ${shNum(y)})`;
  switch (s.k) {
    case 'line':
      return [`ความชัน ${shNum(s.a)}`, `ตัดแกน y ที่ ${P(0, s.b)}`, Math.abs(s.a) > 1e-9 ? `ตัดแกน x ที่ ${P(-s.b / s.a, 0)}` : 'ขนานแกน x'];
    case 'circle':
      return [`จุดศูนย์กลาง ${P(s.h, s.v)}`, `รัศมี ${shNum(s.r)}`, `เส้นผ่านศูนย์กลาง ${shNum(2 * s.r)}`];
    case 'ellipse': {
      const big = Math.max(s.a, s.b);
      const small = Math.min(s.a, s.b);
      const c = Math.sqrt(big * big - small * small);
      const alongY = s.vert !== s.b > s.a;
      const f = alongY ? [P(s.h, s.v - c), P(s.h, s.v + c)] : [P(s.h - c, s.v), P(s.h + c, s.v)];
      return [`จุดศูนย์กลาง ${P(s.h, s.v)}`, `แกนเอกยาว ${shNum(2 * big)} แกนโทยาว ${shNum(2 * small)}`, `โฟกัส ${f.join(' และ ')}`, `ความเยื้องศูนย์กลาง ${shNum(c / big)}`];
    }
    case 'hyperbola': {
      const c = Math.sqrt(s.a * s.a + s.b * s.b);
      const f = s.vert ? [P(s.h, s.v - c), P(s.h, s.v + c)] : [P(s.h - c, s.v), P(s.h + c, s.v)];
      return [`จุดศูนย์กลาง ${P(s.h, s.v)}`, `โฟกัส ${f.join(' และ ')}`, `เส้นกำกับ ความชัน ±${shNum(s.vert ? s.a / s.b : s.b / s.a)}`];
    }
    case 'parabola': {
      const p = 1 / (4 * (s.a || 1e-9));
      return [`จุดยอด ${P(s.h, s.v)}`, s.a > 0 ? 'หงาย (ค่าต่ำสุด)' : 'คว่ำ (ค่าสูงสุด)', `โฟกัส ${P(s.h, s.v + p)}`, `เส้นไดเรกทริกซ์ y = ${shNum(s.v - p)}`, `แกนสมมาตร x = ${shNum(s.h)}`];
    }
    case 'parabolaX': {
      const p = 1 / (4 * (s.a || 1e-9));
      return [`จุดยอด ${P(s.h, s.v)}`, s.a > 0 ? 'เปิดไปทางขวา' : 'เปิดไปทางซ้าย', `โฟกัส ${P(s.h + p, s.v)}`, `เส้นไดเรกทริกซ์ x = ${shNum(s.h - p)}`];
    }
  }
}

const SHAPE_IDS = new Set<ShapeKind>(['line', 'circle', 'ellipse', 'parabola', 'parabolaX', 'hyperbola']);
export function cleanShape(raw: unknown): GShape | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  if (!SHAPE_IDS.has(o.k as ShapeKind)) return undefined;
  const n = (x: unknown, lo: number, hi: number, d: number) => (typeof x === 'number' && isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d);
  const k = o.k as ShapeKind;
  const d = defaultShape(k);
  let a = n(o.a, -1000, 1000, d.a);
  // ครึ่งแกน/รัศมีต้องเป็นบวก พาราโบลาห้ามเป็น 0
  if (k === 'ellipse' || k === 'hyperbola') a = Math.max(0.05, Math.abs(a));
  if ((k === 'parabola' || k === 'parabolaX') && Math.abs(a) < 0.01) a = 0.01;
  return {
    k,
    h: n(o.h, -1000, 1000, 0),
    v: n(o.v, -1000, 1000, 0),
    r: Math.max(0.05, n(o.r, 0.05, 1000, d.r)),
    a,
    b: k === 'line' ? n(o.b, -1000, 1000, 0) : Math.max(0.05, Math.abs(n(o.b, -1000, 1000, d.b))),
    vert: o.vert === true,
  };
}

/* ------------------------------------------------------------------ สมการสำเร็จรูป (ใช้ง่าย) */

export const GRAPH_PRESETS: { label: string; text: string; view?: GraphSpec['view']; shape?: ShapeKind }[] = [
  { label: 'เส้นตรง', text: 'y = 2x + 1', shape: 'line' },
  { label: 'พาราโบลา', text: 'y = x^2 - 2', shape: 'parabola' },
  { label: 'พาราโบลาตะแคง', text: 'y^2 = 4x', shape: 'parabolaX' },
  { label: 'พาราโบลา ax²+bx+c', text: 'y = a x^2 + b x + c' },
  { label: 'วงกลม', text: 'x^2 + y^2 = 9', shape: 'circle' },
  { label: 'วงรี', text: 'x^2/16 + y^2/9 = 1', shape: 'ellipse' },
  { label: 'ไฮเพอร์โบลา', text: 'x^2/4 - y^2/9 = 1', shape: 'hyperbola' },
  { label: 'เอกซ์โพเนนเชียล', text: 'y = 2^x' },
  { label: 'ลอการิทึม', text: 'y = log(x)' },
  { label: 'ln', text: 'y = ln(x)' },
  { label: 'ไซน์', text: 'y = sin(x)' },
  { label: 'โคไซน์', text: 'y = cos(x)' },
  { label: 'แทนเจนต์', text: 'y = tan(x)' },
  { label: 'ค่าสัมบูรณ์', text: 'y = |x|' },
  { label: 'กำลังสาม', text: 'y = x^3 - 3x' },
  { label: 'ส่วนกลับ', text: 'y = 1/x' },
  { label: 'รากที่สอง', text: 'y = sqrt(x)' },
];

/* ------------------------------------------------------------------ แม่แบบรูปคณิต (ตามหนังสือเรียน) */

type Tpl = { id: string; label: string; make: () => GraphSpec };
const K = '#111111';
function bookFig(view: GraphSpec['view'], over: Partial<GraphSpec> = {}): GraphSpec {
  return newSpec('book', { view, axes: false, grid: false, numbers: false, origin: false, xName: '', yName: '', ...over });
}
const pt = (x: number, y: number, label = '', pos: LabelPos = 'ne', over: Partial<GPoint> = {}) => mkPoint(x, y, label, K, { pos, ...over });

export const GRAPH_TEMPLATES: Tpl[] = [
  {
    id: 'quadrant',
    label: 'จตุภาค Q1-Q4',
    make: () => {
      const s = newSpec('book', { view: { xMin: -5, xMax: 5, yMin: -4, yMax: 4 }, arrows: 'both', origin: true });
      s.objs = [
        mkText(2.2, 2.4, 'Q_1', K, { italic: false, size: 22 }),
        mkText(2.2, 1.4, '(+ , +)', K, { size: 20 }),
        mkText(-2.2, 2.4, 'Q_2', K, { size: 22 }),
        mkText(-2.2, 1.4, '(− , +)', K, { size: 20 }),
        mkText(-2.2, -1.6, 'Q_3', K, { size: 22 }),
        mkText(-2.2, -2.6, '(− , −)', K, { size: 20 }),
        mkText(2.2, -1.6, 'Q_4', K, { size: 22 }),
        mkText(2.2, -2.6, '(+ , −)', K, { size: 20 }),
      ];
      return s;
    },
  },
  {
    id: 'divide',
    label: 'จุดแบ่งในสามเหลี่ยม (เวกเตอร์)',
    make: () => {
      const s = bookFig({ xMin: -0.8, xMax: 6.8, yMin: -1.4, yMax: 5.4 });
      const O = pt(2.2, 5, '', 'n', { size: 0 });
      const A = pt(0, 0.4, 'A', 'sw', { size: 0 });
      const B = pt(1.9, 0.4, 'B', 's', { size: 0 });
      const C = pt(6, 0.4, 'C', 'se', { size: 0 });
      const a1 = pt(0, -0.6, '', 'n', { size: 0 });
      const b1 = pt(1.9, -0.6, '', 'n', { size: 0 });
      const c1 = pt(6, -0.6, '', 'n', { size: 0 });
      s.objs = [
        O, A, B, C, a1, b1, c1,
        mkSeg(O.id, A.id, K, { arrow: 'end', label: 'u', bar: true, side: 1 }),
        mkSeg(O.id, B.id, K, { arrow: 'end', label: 'w', bar: true, side: -1 }),
        mkSeg(O.id, C.id, K, { arrow: 'end', label: 'v', bar: true, side: -1 }),
        mkSeg(A.id, C.id, K, { dash: 'dash', width: 1.5 }),
        mkSeg(a1.id, b1.id, K, { arrow: 'both', width: 1.2, label: 'm', side: -1 }),
        mkSeg(b1.id, c1.id, K, { arrow: 'both', width: 1.2, label: 'n', side: -1 }),
      ];
      return s;
    },
  },
  {
    id: 'midline',
    label: 'เส้นเชื่อมจุดกึ่งกลาง',
    make: () => {
      const s = bookFig({ xMin: -1, xMax: 7, yMin: -1, yMax: 6 });
      const A = pt(0, 0, 'A', 'sw', { size: 0 });
      const B = pt(6, 0, 'B', 'se', { size: 0 });
      const C = pt(2.6, 5.2, 'C', 'n', { size: 0 });
      const D = pt(1.3, 2.6, 'D', 'w', { size: 0 });
      const E = pt(4.3, 2.6, 'E', 'e', { size: 0 });
      s.objs = [A, B, C, D, E, mkPoly([A.id, B.id, C.id], K, { width: 2.4 }), mkSeg(D.id, E.id, K, { width: 2.4 })];
      return s;
    },
  },
  {
    id: 'distance',
    label: 'ระยะห่างระหว่างจุด',
    make: () => {
      const s = bookFig({ xMin: 0, xMax: 8, yMin: 0, yMax: 5 });
      const P1 = pt(1.5, 1.2, '(x_1 , y_1)', 'sw');
      const P2 = pt(6, 3.8, '(x_2 , y_2)', 'ne');
      s.objs = [P1, P2, mkSeg(P1.id, P2.id, K, { arrow: 'both', width: 1.4, label: 'd', side: 1 })];
      return s;
    },
  },
  {
    id: 'hyperbola',
    label: 'ไฮเพอร์โบลา + เส้นกำกับ',
    make: () => {
      const s = newSpec('book', { view: { xMin: -6, xMax: 6, yMin: -5, yMax: 5 }, arrows: 'both', xName: '', yName: '' });
      const V = pt(-2, 0, 'V', 'nw');
      const V2 = pt(2, 0, "V'", 'ne');
      const F = pt(-Math.sqrt(13), 0, 'F', 'n');
      const F2 = pt(Math.sqrt(13), 0, "F'", 'n');
      const Bp = pt(0, 3, 'B', 'ne');
      const B2 = pt(0, -3, "B'", 'se');
      const C = pt(0, 0, 'C', 'sw', { size: 3 });
      const q = [pt(-2, 3, '', 'n', { size: 0 }), pt(2, 3, '', 'n', { size: 0 }), pt(2, -3, '', 'n', { size: 0 }), pt(-2, -3, '', 'n', { size: 0 })];
      s.objs = [
        ...q,
        mkPoly(q.map((x) => x.id), K, { dash: 'dash', width: 1.2 }),
        mkExpr('y = 1.5x', K, { dash: 'dash', width: 1.4 }),
        mkExpr('y = -1.5x', K, { dash: 'dash', width: 1.4 }),
        mkExpr('x^2/4 - y^2/9 = 1', K, { width: 2.6 }),
        V, V2, F, F2, Bp, B2, C,
      ];
      return s;
    },
  },
  {
    id: 'expfamily',
    label: 'ฟังก์ชันเอกซ์โพเนนเชียล 4 เส้น',
    make: () => {
      const s = newSpec('book', { view: { xMin: -4, xMax: 4, yMin: -0.6, yMax: 6 }, equal: false, origin: false, xName: 'X', yName: 'Y' });
      s.objs = [
        mkExpr('y = 2^x', K, { label: 'f', at: 0.86 }),
        mkExpr('y = 1.2^x', K, { dash: 'dash', label: 'g', at: 0.99 }),
        mkExpr('y = (1/4)^x', K, { dash: 'dot', label: 'h', at: 0.03 }),
        mkExpr('y = (2/3)^x', K, { dash: 'dashdot', label: 'k', at: 0.01 }),
      ];
      return s;
    },
  },
  {
    id: 'parallelogram',
    label: 'สี่เหลี่ยมด้านขนาน + เวกเตอร์',
    make: () => {
      const s = bookFig({ xMin: -0.6, xMax: 7.2, yMin: -0.6, yMax: 4.6 });
      const A = pt(0.4, 3.6, 'A', 'nw', { size: 0 });
      const B = pt(5.4, 3.6, 'B', 'ne', { size: 0 });
      const C = pt(6.6, 0.4, 'C', 'se', { size: 0 });
      const D = pt(1.6, 0.4, 'D', 'sw', { size: 0 });
      s.objs = [
        A, B, C, D,
        mkSeg(A.id, B.id, K, { arrow: 'end', label: 'v', bar: true, width: 2.2 }),
        mkSeg(A.id, D.id, K, { arrow: 'end', label: 'u', bar: true, width: 2.2, side: -1 }),
        mkSeg(B.id, C.id, K, { width: 2.2 }),
        mkSeg(D.id, C.id, K, { width: 2.2 }),
      ];
      return s;
    },
  },
  {
    id: 'ellipsefoci',
    label: 'วงรีกับโฟกัส',
    make: () => {
      const s = bookFig({ xMin: -5.6, xMax: 5.6, yMin: -4, yMax: 4.4 });
      const c = Math.sqrt(7);
      const F1 = pt(-c, 0, 'F_1', 'sw');
      const F2 = pt(c, 0, 'F_2', 'se');
      const P = pt(-1, 3 * Math.sqrt(1 - 1 / 16), 'P', 'n', { size: 0 });
      s.objs = [mkExpr('x^2/16 + y^2/9 = 1', K, { width: 2.4 }), F1, F2, P, mkSeg(P.id, F1.id, '#555555', { width: 2 }), mkSeg(P.id, F2.id, '#555555', { width: 2 })];
      return s;
    },
  },
  {
    id: 'fg',
    label: 'กราฟ f และ g ตัดกัน',
    make: () => {
      const f = 'y = 0.06x^3 + 1.4';
      const g = 'y = 3.2 - 2.2*0.55^x';
      const s = newSpec('book', { view: { xMin: -2, xMax: 7, yMin: -0.5, yMax: 6.5 }, equal: false, origin: false, xName: 'X', yName: 'Y' });
      const hits = intersections(f, g, -2, 7);
      const names = ['(a , b)', '(c , d)'];
      s.objs = [mkExpr(f, K, { label: 'y = f(x)', at: 0.97 }), mkExpr(g, K, { label: 'y = g(x)', at: 0.99, width: 2 }), ...hits.slice(0, 2).map((q, i) => pt(q[0], q[1], names[i], i ? 'se' : 'nw'))];
      return s;
    },
  },
  {
    id: 'inverse',
    label: 'ฟังก์ชันผกผัน สะท้อนแกน y = x',
    make: () => {
      const s = newSpec('book', { view: { xMin: -1.5, xMax: 8, yMin: -1.5, yMax: 8 }, origin: false, xName: 'X', yName: 'Y' });
      s.objs = [
        mkExpr('y = x', K, { dash: 'dot', width: 1.4, label: 'y = x', at: 0.97 }),
        mkExpr('y = 0.06x^3 + 1.4', K, { label: 'f', at: 0.45, lo: -1.4, hi: 4.4 }),
        mkExpr('x = 0.06y^3 + 1.4', K, { dash: 'dash', label: 'f^{-1}', at: 0.4, lo: -1.4, hi: 4.4 }),
      ];
      return s;
    },
  },
  {
    id: 'skew',
    label: 'การแจกแจง เบ้ซ้าย / เบ้ขวา',
    make: () => {
      const s = bookFig({ xMin: -0.5, xMax: 12.5, yMin: -1.5, yMax: 4.5 }, { equal: false });
      const a = pt(0, 0, '', 'n', { size: 0 });
      const b = pt(5.5, 0, '', 'n', { size: 0 });
      const c = pt(6.5, 0, '', 'n', { size: 0 });
      const d = pt(12, 0, '', 'n', { size: 0 });
      s.objs = [
        a, b, c, d,
        mkSeg(a.id, b.id, K, { width: 1.6 }),
        mkSeg(c.id, d.id, K, { width: 1.6 }),
        mkExpr('y = 9(5.5 - x)^2 e^(-1.3(5.5 - x))', K, { lo: 0, hi: 5.5, width: 2.4 }),
        mkExpr('y = 9(x - 6.5)^2 e^(-1.3(x - 6.5))', K, { lo: 6.5, hi: 12, width: 2.4 }),
        mkText(2.6, -0.9, 'เบ้ซ้าย', K, { size: 20 }),
        mkText(9.3, -0.9, 'เบ้ขวา', K, { size: 20 }),
      ];
      return s;
    },
  },
  {
    id: 'boxplot',
    label: 'แผนภาพกล่อง',
    make: () => {
      const s = bookFig({ xMin: 0, xMax: 100, yMin: -10, yMax: 30 }, { equal: false });
      const mk = (x: number, y: number) => pt(x, y, '', 'n', { size: 0 });
      const P = [mk(10, 12), mk(30, 12), mk(30, 4), mk(30, 20), mk(48, 4), mk(48, 20), mk(65, 4), mk(65, 20), mk(65, 12), mk(90, 12), mk(10, 7), mk(10, 17), mk(90, 7), mk(90, 17)];
      const q = [mk(0, -4), mk(100, -4)];
      s.objs = [
        ...P, ...q,
        mkSeg(P[0].id, P[1].id, K),
        mkPoly([P[2].id, P[6].id, P[7].id, P[3].id], K, { width: 2 }),
        mkSeg(P[4].id, P[5].id, K),
        mkSeg(P[8].id, P[9].id, K),
        mkSeg(P[10].id, P[11].id, K),
        mkSeg(P[12].id, P[13].id, K),
        mkSeg(q[0].id, q[1].id, K, { width: 1.4, arrow: 'end' }),
        mkText(10, -9, 'ค่าต่ำสุด', K, { size: 14 }),
        mkText(30, -9, 'Q_1', K, { size: 16 }),
        mkText(48, -9, 'Q_2', K, { size: 16 }),
        mkText(65, -9, 'Q_3', K, { size: 16 }),
        mkText(90, -9, 'ค่าสูงสุด', K, { size: 14 }),
      ];
      return s;
    },
  },
  {
    id: 'venn',
    label: 'แผนภาพเวนน์',
    make: () => {
      const s = bookFig({ xMin: -5.2, xMax: 5.2, yMin: -3.6, yMax: 3.6 });
      const U = [pt(-4.8, 3.2, '', 'n', { size: 0 }), pt(4.8, 3.2, '', 'n', { size: 0 }), pt(4.8, -3.2, '', 'n', { size: 0 }), pt(-4.8, -3.2, '', 'n', { size: 0 })];
      s.objs = [
        ...U,
        mkPoly(U.map((x) => x.id), K, { width: 2 }),
        mkExpr('(x + 1.1)^2 + y^2 = 4.4', K, { width: 2.2 }),
        mkExpr('(x - 1.1)^2 + y^2 = 4.4', K, { width: 2.2 }),
        mkText(-2.3, 2.2, 'A', K, { italic: true, size: 22 }),
        mkText(2.3, 2.2, 'B', K, { italic: true, size: 22 }),
        mkText(4.4, 3.5, 'U', K, { italic: true, size: 22 }),
        mkText(-2, 0, 'a', K, { italic: true, size: 22 }),
        mkText(0, 0, 'b', K, { italic: true, size: 22 }),
        mkText(2, 0, 'c', K, { italic: true, size: 22 }),
        mkText(-4, -2.5, 'd', K, { italic: true, size: 22 }),
      ];
      return s;
    },
  },
  {
    id: 'axes3d',
    label: 'แกนพิกัด 3 มิติ',
    make: () => {
      const s = bookFig({ xMin: -4, xMax: 4, yMin: -3.5, yMax: 4 });
      const O = pt(0, 0, '', 'n', { size: 0 });
      const Z = pt(0, 3.6, 'z', 'n', { size: 0 });
      const Y = pt(3.6, 0, 'y', 'e', { size: 0 });
      const X = pt(-2.6, -2.6, 'x', 'sw', { size: 0 });
      const P = pt(1.4, 1.6, 'P(x, y, z)', 'e');
      const Pf = pt(1.4, -0.7, '', 'n', { size: 0 });
      s.objs = [
        O, Z, Y, X, P, Pf,
        mkSeg(O.id, Z.id, K, { arrow: 'end', width: 2.4 }),
        mkSeg(O.id, Y.id, K, { arrow: 'end', width: 2.4 }),
        mkSeg(O.id, X.id, K, { arrow: 'end', width: 2.4 }),
        mkSeg(P.id, Pf.id, K, { dash: 'dot', width: 1.4 }),
        mkSeg(O.id, Pf.id, K, { dash: 'dot', width: 1.4 }),
      ];
      return s;
    },
  },
  {
    id: 'parabola',
    label: 'พาราโบลา + เลตัสเรกตัม',
    make: () => {
      const s = bookFig({ xMin: -8.5, xMax: 2, yMin: -4.5, yMax: 8.5 });
      const F = pt(-4, 2, 'F(−4, 2)', 'w');
      const V = pt(-2, 2, 'V(−2, 2)', 'se');
      const L1 = pt(-4, 6, '(−4, 6)', 'ne', { size: 0 });
      const L2 = pt(-4, -2, '(−4, −2)', 'se', { size: 0 });
      s.objs = [
        mkExpr('(y - 2)^2 = -8(x + 2)', K, { width: 2.6 }),
        mkExpr('x = 0', K, { width: 1.8, label: 'x = 0', at: 0.95 }),
        F, V, L1, L2,
        mkSeg(L1.id, L2.id, K, { width: 1.6 }),
        mkText(0.9, -1.5, 'ไดเรกตริกซ์', K, { size: 16 }),
      ];
      return s;
    },
  },
  {
    id: 'ellipsetangent',
    label: 'วงรีสัมผัสเส้นตรง',
    make: () => {
      const s = bookFig({ xMin: -10, xMax: 2.5, yMin: -5, yMax: 9 });
      const C = pt(-4, 2, 'C(−4, 2)', 'w');
      const F1 = pt(-4, 6, 'F_1(−4, 6)', 'nw');
      const F2 = pt(-4, -2, 'F_2(−4, −2)', 'sw');
      const T = pt(0, 2, '', 'n', { size: 0 });
      s.objs = [mkExpr('(y - 2)^2/32 + (x + 4)^2/16 = 1', K, { width: 2.4 }), mkExpr('x = 0', K, { width: 1.8, label: 'x = 0', at: 0.95 }), C, F1, F2, T, mkSeg(C.id, T.id, '#555555', { width: 1.6, label: '4', side: -1 }), mkSeg(C.id, F1.id, '#555555', { width: 1.6, label: '4' })];
      return s;
    },
  },
];
