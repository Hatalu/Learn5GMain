/**
 * สมการ MathType แบบวัตถุ OLE ในไฟล์ Word (Equation.DSMT4 / Equation.3) เป็น LaTeX
 * ไฟล์ oleObjectN.bin เป็น Compound File (CFB) ข้างในมีสตรีม "Equation Native" = หัว 28 ไบต์ + ข้อมูล MTEF
 * อ่านตามสเปก MTEF v5 (MathType 5 ขึ้นไป) และ v3 (Equation Editor 3.0) ไม่ใช้ DOM (ทดสอบใน selftest)
 * อ่านไม่ได้ = คืน null ให้ผู้เรียกใส่ช่องสมการว่างแทนและนับจำนวนแจ้งผู้ใช้
 */
import { ACCENT_TEX, NARY_TEX, fenceTex, grp, texOfText } from './ommlTex';

/* ---------------------------------------------------------------- Compound File */

/** อ่านสตรีมตามชื่อจากไฟล์ CFB (ไม่สนตัวพิมพ์เล็ก/ใหญ่) */
export function cfbStream(buf: Uint8Array, name: string): Uint8Array | null {
  if (buf.length < 512 || buf[0] !== 0xd0 || buf[1] !== 0xcf || buf[2] !== 0x11 || buf[3] !== 0xe0) return null;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const u16 = (o: number) => dv.getUint16(o, true);
  const u32 = (o: number) => dv.getUint32(o, true);
  const secSize = 1 << u16(0x1e);
  const miniSize = 1 << u16(0x20);
  const nFat = u32(0x2c);
  const dirStart = u32(0x30);
  const miniCutoff = u32(0x38);
  const miniFatStart = u32(0x3c);
  const difatStart = u32(0x44);
  const secOff = (s: number) => (s + 1) * secSize;
  const END = 0xfffffffe;
  // ตาราง FAT จาก DIFAT (109 ช่องแรกในหัวไฟล์ ที่เหลือต่อเป็นสาย)
  const fatSecs: number[] = [];
  for (let i = 0; i < 109 && fatSecs.length < nFat; i++) fatSecs.push(u32(0x4c + i * 4));
  for (let d = difatStart, guard = 0; d < END && fatSecs.length < nFat && guard < 1000; guard++) {
    const o = secOff(d);
    if (o + secSize > buf.length) break;
    for (let i = 0; i < secSize / 4 - 1 && fatSecs.length < nFat; i++) fatSecs.push(u32(o + i * 4));
    d = u32(o + secSize - 4);
  }
  const per = secSize / 4;
  const fat = (s: number) => {
    const fs = fatSecs[Math.floor(s / per)];
    const o = secOff(fs) + (s % per) * 4;
    return fs === undefined || o + 4 > buf.length ? END : u32(o);
  };
  const chain = (start: number, size: number) => {
    const out = new Uint8Array(size);
    let at = 0;
    for (let s = start, guard = 0; s < END && at < size && guard < 100_000; guard++) {
      const o = secOff(s);
      const n = Math.min(secSize, size - at, buf.length - o);
      if (n <= 0) break;
      out.set(buf.subarray(o, o + n), at);
      at += n;
      s = fat(s);
    }
    return out;
  };
  // ไดเรกทอรี: รายการละ 128 ไบต์
  const dirBytes: number[] = [];
  for (let s = dirStart, guard = 0; s < END && guard < 10_000; guard++) {
    dirBytes.push(s);
    s = fat(s);
  }
  type Ent = { name: string; type: number; start: number; size: number };
  const ents: Ent[] = [];
  for (const s of dirBytes) {
    for (let i = 0; i < secSize / 128; i++) {
      const o = secOff(s) + i * 128;
      if (o + 128 > buf.length) break;
      const nl = u16(o + 64);
      let nm = '';
      for (let j = 0; j + 2 < nl && j < 64; j += 2) nm += String.fromCharCode(u16(o + j));
      ents.push({ name: nm, type: buf[o + 66], start: u32(o + 116), size: u32(o + 120) });
    }
  }
  const ent = ents.find((x) => x.type === 2 && x.name.toLowerCase() === name.toLowerCase());
  if (!ent) return null;
  if (ent.size >= miniCutoff) return chain(ent.start, ent.size);
  // สตรีมเล็กอยู่ใน mini stream (สายของ root entry) ตาม mini FAT
  const root = ents[0];
  const ministream = chain(root.start, root.size);
  const miniFatBytes: number[] = [];
  for (let s = miniFatStart, guard = 0; s < END && guard < 10_000; guard++) {
    const o = secOff(s);
    for (let i = 0; i < per; i++) miniFatBytes.push(o + i * 4 + 4 <= buf.length ? u32(o + i * 4) : END);
    s = fat(s);
  }
  const out = new Uint8Array(ent.size);
  let at = 0;
  for (let s = ent.start, guard = 0; s < END && at < ent.size && guard < 100_000; guard++) {
    const o = s * miniSize;
    const n = Math.min(miniSize, ent.size - at);
    if (o + n > ministream.length) break;
    out.set(ministream.subarray(o, o + n), at);
    at += n;
    s = miniFatBytes[s] ?? END;
  }
  return out;
}

/* ---------------------------------------------------------------- MTEF */

type Obj =
  | { t: 'char'; c: string; face: number; emb: number[]; fn: boolean }
  | { t: 'line'; kids: Obj[]; nul: boolean }
  | { t: 'tmpl'; sel: number; vari: number; kids: Obj[] }
  | { t: 'pile'; align: number; kids: Obj[] }
  | { t: 'matrix'; rows: number; cols: number; kids: Obj[] };

class Reader {
  i = 0;
  constructor(public b: Uint8Array) {}
  u8() {
    if (this.i >= this.b.length) throw new Error('eof');
    return this.b[this.i++];
  }
  u16() {
    const v = this.u8();
    return v | (this.u8() << 8);
  }
  str() {
    let s = '';
    for (let c = this.u8(); c; c = this.u8()) s += String.fromCharCode(c);
    return s;
  }
}

/** อ่านลิสต์วัตถุจนเจอ END (0) */
function readList(r: Reader, v: number, depth: number): Obj[] {
  if (depth > 60) throw new Error('deep');
  const out: Obj[] = [];
  for (let guard = 0; guard < 100_000; guard++) {
    const o = readRec(r, v, depth);
    if (o === 'end') return out;
    if (o) out.push(o);
  }
  throw new Error('loop');
}

function nudge(r: Reader, opt: number) {
  if (!(opt & 0x08)) return;
  const dx = r.u8();
  const dy = r.u8();
  if (dx === 128 || dy === 128) {
    r.u16();
    r.u16();
  }
}
function ruler(r: Reader) {
  const n = r.u8();
  for (let k = 0; k < n; k++) {
    r.u8();
    r.u16();
  }
}
/** ค่าแบบนิบเบิล (EQN_PREFS): count ค่า แต่ละค่าจบด้วยนิบเบิล 0xF */
function nibbles(r: Reader, count: number) {
  let left = count;
  let hi = true;
  let byte = 0;
  while (left > 0) {
    if (hi) byte = r.u8();
    const nib = hi ? byte >> 4 : byte & 0xf;
    hi = !hi;
    if (nib === 0xf) left--;
  }
}

/** อ่านหนึ่งระเบียน: คืน 'end' เมื่อจบลิสต์ / null = ระเบียนที่ไม่ใช่เนื้อหา */
function readRec(r: Reader, v: number, depth: number): Obj | 'end' | null {
  const head = r.u8();
  // v3: นิบเบิลล่าง = ชนิด นิบเบิลบน = ตัวเลือก / v5: ชนิดเต็มไบต์ ตัวเลือกอีกไบต์ (เฉพาะบางชนิด)
  const tag = v >= 5 ? head : head & 0x0f;
  let opt = v >= 5 ? 0 : head >> 4;
  const getOpt = () => {
    if (v >= 5) opt = r.u8();
  };
  switch (tag) {
    case 0:
      return 'end';
    case 1: {
      getOpt();
      nudge(r, opt);
      if (opt & 0x04) r.u16();
      if (opt & 0x02) {
        // ระเบียน RULER เต็ม (มีไบต์ชนิดนำหน้า)
        r.u8();
        ruler(r);
      }
      if (opt & 0x01) return { t: 'line', kids: [], nul: true };
      return { t: 'line', kids: readList(r, v, depth + 1), nul: false };
    }
    case 2: {
      getOpt();
      nudge(r, opt);
      const face = r.u8() - 128;
      let code = 0;
      if (v >= 5) {
        if (!(opt & 0x20)) code = r.u16();
        if (opt & 0x04) {
          const b = r.u8();
          if (opt & 0x20) code = b;
        }
        if (opt & 0x10) {
          const w = r.u16();
          if (opt & 0x20) code = w;
        }
      } else code = r.u16();
      const emb: number[] = [];
      if (opt & 0x01) {
        for (const e of readList(r, v, depth + 1)) if (e.t === 'char' && e.face === -999) emb.push(e.emb[0]);
      }
      return { t: 'char', c: String.fromCodePoint(code || 32), face, emb, fn: !!(opt & 0x02) };
    }
    case 3: {
      getOpt();
      nudge(r, opt);
      const sel = r.u8();
      let vari = r.u8();
      if (v >= 5 && vari & 0x80) vari = (vari & 0x7f) | (r.u8() << 8);
      r.u8(); // ตัวเลือกเฉพาะแม่แบบ
      return { t: 'tmpl', sel, vari, kids: readList(r, v, depth + 1) };
    }
    case 4: {
      getOpt();
      nudge(r, opt);
      const align = r.u8();
      r.u8();
      if (opt & 0x02) {
        r.u8();
        ruler(r);
      }
      return { t: 'pile', align, kids: readList(r, v, depth + 1) };
    }
    case 5: {
      getOpt();
      nudge(r, opt);
      r.u8();
      r.u8();
      r.u8();
      const rows = r.u8();
      const cols = r.u8();
      for (let k = 0; k < Math.ceil(((rows + 1) * 2) / 8); k++) r.u8();
      for (let k = 0; k < Math.ceil(((cols + 1) * 2) / 8); k++) r.u8();
      return { t: 'matrix', rows, cols, kids: readList(r, v, depth + 1) };
    }
    case 6: {
      getOpt();
      nudge(r, opt);
      // เครื่องหมายบนตัวอักษร: ส่งกลับเป็นตัวพิเศษให้ CHAR เก็บ
      return { t: 'char', c: '', face: -999, emb: [r.u8()], fn: false };
    }
    case 7:
      ruler(r);
      return null;
    case 8:
      // v5 FONT_STYLE_DEF: ดัชนีฟอนต์ + สไตล์ / v3 FONT: แบบอักษร + สไตล์ + ชื่อ
      r.u8();
      r.u8();
      if (v < 5) r.str();
      return null;
    case 9: {
      const ls = r.u8();
      if (ls === 101) r.u16();
      else if (ls === 100) {
        r.u8();
        r.u16();
      } else r.u8();
      return null;
    }
    case 10:
    case 11:
    case 12:
    case 13:
    case 14:
      return null;
    case 15:
      if (v >= 5) r.u8();
      return null;
    case 16: {
      const o = r.u8();
      for (let k = 0; k < (o & 1 ? 4 : 3); k++) r.u16();
      if (o & 4) r.str();
      return null;
    }
    case 17:
      if (v >= 5) {
        r.u8();
        r.str();
      } else {
        r.u8();
        r.u8();
        r.str();
      }
      return null;
    case 18: {
      r.u8();
      nibbles(r, r.u8());
      nibbles(r, r.u8());
      const n = r.u8();
      for (let k = 0; k < n; k++) if (r.u8()) r.u8();
      return null;
    }
    case 19:
      r.str();
      return null;
    default:
      if (tag >= 100) {
        // สเปกบอกความยาว 16 บิต แต่ MathType 7 เขียนระเบียน 102 (TeX Input Language) ด้วยความยาว 1 ไบต์
        const b1 = r.u8();
        const len16 = b1 | (r.u8() << 8);
        if (len16 <= r.b.length - r.i) r.i += len16;
        else r.i += b1 - 1;
        return null;
      }
      throw new Error(`tag ${tag}`);
  }
}

/* ---------------------------------------------------------------- เป็น LaTeX */

// เครื่องหมายบนตัวอักษร (ชนิด EMBELL)
const EMB: Record<number, string> = { 2: '\\dot', 3: '\\ddot', 4: '\\dddot', 8: '\\tilde', 9: '\\hat', 11: '\\vec', 12: '\\overleftarrow', 13: '\\overleftrightarrow', 14: '\\vec', 15: '\\overleftarrow', 16: '\\overline', 17: '\\overline', 19: '\\overgroup', 20: '\\overgroup', 24: '\\underline', 25: '\\cancel' };
const PRIME: Record<number, string> = { 5: "'", 6: "''", 7: '`', 18: "'''" };
// ช่องว่างของ MathType อยู่ในช่วง Private Use
const SPACE: Record<number, string> = { 0xef00: '', 0xef01: '\\,', 0xef02: '\\:', 0xef03: '\\;', 0xef04: '\\quad ', 0xef05: '\\,', 0xef08: '' };
// ตัวอักษรช่วง Private Use ที่ MathType ใช้แทนสัญลักษณ์มาตรฐาน
const PUA: Record<number, string> = { 0xeb1a: '\\le ', 0xeb1b: '\\ge ', 0xec00: '\\to ', 0xf8f5: '' };

function charsTex(cs: Extract<Obj, { t: 'char' }>[]): string {
  let out = '';
  let i = 0;
  while (i < cs.length) {
    const c = cs[i];
    const code = c.c.codePointAt(0) || 0;
    // แบบอักษรตัวคั่นช่องว่าง (24) / ตัวทำเครื่องหมาย (23) ไม่มีตัวให้แสดง
    if (c.face === 23 || c.face === 24) {
      i++;
      continue;
    }
    // ข้อความ (แบบอักษร Text = 1) และชื่อฟังก์ชัน (2) ติดกันรวมเป็นก้อนเดียว
    if ((c.face === 1 || c.face === 2) && !c.emb.length) {
      let s = '';
      const face = c.face;
      while (i < cs.length && cs[i].face === face && !cs[i].emb.length && !(cs[i].fn && s)) s += cs[i++].c;
      out += texOfText(s, true);
      continue;
    }
    i++;
    if (code in SPACE) {
      out += SPACE[code];
      continue;
    }
    let t = PUA[code] ?? (code >= 0xe000 && code <= 0xf8ff ? '' : texOfText(c.c));
    // แบบอักษรเวกเตอร์/เมทริกซ์ = ตัวหนา
    if (c.face === 7 && t) t = `\\mathbf${grp(t)}`;
    for (const e of c.emb) {
      if (PRIME[e]) t += PRIME[e];
      else if (EMB[e]) t = `${EMB[e]}${grp(t)}`;
    }
    out += t;
  }
  return out;
}

function listTex(kids: Obj[]): string {
  let out = '';
  let run: Extract<Obj, { t: 'char' }>[] = [];
  const flush = () => {
    out += charsTex(run);
    run = [];
  };
  for (const k of kids) {
    if (k.t === 'char') {
      run.push(k);
      continue;
    }
    flush();
    // ตัวยก/ตัวห้อยของ MathType เป็นแม่แบบที่ต่อท้ายตัวก่อนหน้า
    if (k.t === 'tmpl' && k.sel >= 27 && k.sel <= 29 && !out.trim()) out += '{}';
    out += objTex(k);
  }
  flush();
  return out;
}

const slot = (o: Obj | undefined) => (!o ? '' : o.t === 'line' ? listTex(o.kids) : objTex(o));
const isNull = (o: Obj | undefined) => !o || (o.t === 'line' && (o.nul || !o.kids.length));
const lastChar = (kids: Obj[]) => {
  for (let i = kids.length - 1; i >= 0; i--) if (kids[i].t === 'char') return (kids[i] as { c: string }).c;
  return undefined;
};

function objTex(o: Obj): string {
  if (o.t === 'char') return charsTex([o]);
  if (o.t === 'line') return listTex(o.kids);
  if (o.t === 'pile') {
    const lines = o.kids.filter((k) => k.t === 'line').map(slot);
    if (lines.length === 1) return lines[0];
    const col = o.align === 1 ? 'l' : o.align === 3 ? 'r' : 'c';
    return `\\begin{array}{${col}}${lines.join(' \\\\ ')}\\end{array}`;
  }
  if (o.t === 'matrix') {
    const cells = o.kids.filter((k) => k.t === 'line').map(slot);
    const rows: string[] = [];
    for (let r = 0; r < o.rows; r++) rows.push(cells.slice(r * o.cols, r * o.cols + o.cols).join(' & '));
    return `\\begin{matrix}${rows.join(' \\\\ ')}\\end{matrix}`;
  }
  const k = o.kids.filter((x) => x.t !== 'char' || x.c);
  const lines = k.filter((x) => x.t !== 'char');
  const s = (i: number) => slot(lines[i]);
  switch (o.sel) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
    case 8:
    case 9: {
      // วงเล็บ: ช่องแรก = เนื้อใน ตามด้วยตัววงเล็บซ้าย/ขวา (ตัวไหนไม่มี = ไม่วาด)
      const DEF: [string, string][] = [['⟨', '⟩'], ['(', ')'], ['{', '}'], ['[', ']'], ['|', '|'], ['‖', '‖'], ['⌊', '⌋'], ['⌈', '⌉'], ['[', ']'], ['(', ')']];
      // ตัววงเล็บแบบขยายของ MathType อยู่ในช่วงอักขระส่วนตัว (เช่น U+EC07/EC08 = ค่าสัมบูรณ์) ใช้ตัวมาตรฐานของชนิดวงเล็บแทน
      const chars = (k.filter((x) => x.t === 'char') as { c: string }[]).map((x) => ({ c: /[-]/.test(x.c) ? undefined : x.c }));
      const hasL = o.sel === 9 || o.vari & 1 || o.vari === 0;
      const hasR = o.sel === 9 || o.vari & 2 || o.vari === 0;
      const l = hasL ? (chars[0]?.c ?? DEF[o.sel][0]) : '';
      const r = hasR ? (chars[hasL ? 1 : 0]?.c ?? DEF[o.sel][1]) : '';
      const body = s(0);
      // เนื้อในเตี้ย (ไม่มีเศษส่วน/ราก/ตัวดำเนินการใหญ่): วงเล็บธรรมดา ช่องไฟเท่า MathType (\left \right ของ KaTeX เว้นกว้างกว่า)
      if (!/\\(frac|dfrac|sqrt|sum|int|prod|begin|binom|left|overline|underline|lim)\b/.test(body)) {
        const plain: Record<string, [string, string]> = { '(': ['(', ')'], '[': ['[', ']'], '|': ['\\lvert ', '\\rvert '], '‖': ['\\lVert ', '\\rVert '] };
        const pl = l ? plain[l]?.[0] : '';
        const pr = r ? plain[r === ')' ? '(' : r === ']' ? '[' : r]?.[1] : '';
        if (pl !== undefined && pr !== undefined) return `${pl}${body}${pr}`;
      }
      return `\\left${fenceTex(l)} ${body} \\right${fenceTex(r, true)}`;
    }
    case 10:
      return isNull(lines[1]) ? `\\sqrt${grp(s(0))}` : `\\sqrt[${s(1)}]${grp(s(0))}`;
    case 11:
      return `\\frac${grp(s(0))}${grp(s(1))}`;
    case 12:
      return `\\underline${grp(s(0))}`;
    case 13:
      return `\\overline${grp(s(0))}`;
    case 14:
      return `\\xrightarrow${s(1) ? `[${s(1)}]` : ''}${grp(s(0))}`;
    case 21:
    case 22: {
      // ตัวดำเนินการใหญ่แบบไม่มีช่องเนื้อใน: ขอบล่าง ขอบบน แล้วตัวสัญลักษณ์
      const ch = lastChar(k) ?? (o.sel === 21 ? '∫' : '∑');
      const op = NARY_TEX[ch] ?? texOfText(ch);
      return `${op}${isNull(lines[0]) ? '' : `_${grp(s(0))}`}${isNull(lines[1]) ? '' : `^${grp(s(1))}`} `;
    }
    case 15:
    case 16:
    case 17:
    case 18:
    case 19:
    case 20: {
      // ตัวดำเนินการใหญ่: เนื้อใน ขอบล่าง ขอบบน แล้วตัวสัญลักษณ์
      const ch = lastChar(k) ?? (o.sel === 15 ? '∫' : o.sel === 16 ? '∑' : o.sel === 17 ? '∏' : o.sel === 19 ? '⋃' : o.sel === 20 ? '⋂' : '∑');
      const op = NARY_TEX[ch] ?? texOfText(ch);
      const lo = isNull(lines[1]) ? '' : `_${grp(s(1))}`;
      const hi = isNull(lines[2]) ? '' : `^${grp(s(2))}`;
      return `${op}${lo}${hi} ${s(0)}`;
    }
    case 23: {
      const lo = isNull(lines[1]) ? '' : `_${grp(s(1))}`;
      const hi = isNull(lines[2]) ? '' : `^${grp(s(2))}`;
      return `${s(0).trim() || '\\lim'}${lo}${hi} `;
    }
    case 24:
      return o.vari & 1 ? `\\overbrace${grp(s(0))}${isNull(lines[1]) ? '' : `^${grp(s(1))}`}` : `\\underbrace${grp(s(0))}${isNull(lines[1]) ? '' : `_${grp(s(1))}`}`;
    case 25:
      return o.vari & 1 ? `\\overset${grp(s(1))}${grp(s(0))}` : `\\underset${grp(s(1))}${grp(s(0))}`;
    case 26:
      return `\\overset${grp(s(1))}{\\overline{)${s(0)}}}`;
    case 27:
      return `_${grp(s(0))}`;
    case 28:
      return `^${grp(s(1) || s(0))}`;
    case 29: {
      const sub = isNull(lines[0]) ? '' : `_${grp(s(0))}`;
      const sup = isNull(lines[1]) ? '' : `^${grp(s(1))}`;
      return sub + sup;
    }
    case 30:
      return `\\langle ${s(0)} \\mid ${s(1)} \\rangle`;
    case 31:
      return `\\overrightarrow${grp(s(0))}`;
    case 32:
      return `\\widetilde${grp(s(0))}`;
    case 33:
      return `\\widehat${grp(s(0))}`;
    case 34:
      return `\\overgroup${grp(s(0))}`;
    case 35:
      return s(0);
    case 36:
      return `\\cancel${grp(s(0))}`;
    case 37:
      return `\\boxed${grp(s(0))}`;
    default:
      return lines.map(slot).join(' ');
  }
}

/** ข้อมูล MTEF (ไม่มีหัว OLE) เป็น LaTeX */
export function mtefToTex(b: Uint8Array): string | null {
  try {
    const r = new Reader(b);
    const v = r.u8();
    if (v !== 3 && v !== 4 && v !== 5) return null;
    r.u8();
    r.u8();
    r.u8();
    r.u8();
    if (v >= 5) {
      r.str();
      r.u8();
    }
    const kids = readList(r, v, 0);
    const tex = kids
      .map(objTex)
      .join('')
      .replace(/\s+/g, ' ')
      .replace(/ ([}^_)])/g, '$1')
      .trim();
    return tex || null;
  } catch {
    return null;
  }
}

/** ไฟล์ oleObject*.bin ของ MathType เป็น LaTeX (null = ไม่ใช่ MathType / อ่านไม่ได้) */
export function oleEquationTex(ole: Uint8Array): string | null {
  const s = cfbStream(ole, 'Equation Native');
  if (!s || s.length < 30) return null;
  const hdr = s[0] | (s[1] << 8);
  return mtefToTex(s.subarray(hdr > 0 && hdr < 200 ? hdr : 28));
}

/** ใช้ในเทสต์ */
export const _accentTex = ACCENT_TEX;
