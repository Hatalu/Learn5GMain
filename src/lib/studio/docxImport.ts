/**
 * นำเข้าไฟล์ Word (.docx) เป็นเนื้อหาโหมดเอกสาร (HTML ที่ cleanFlowHtml รับ)
 * - สมการของ Word (OMML) และสมการ MathType (วัตถุ OLE) แปลงเป็นช่องสมการของเว็บ (data-tex) แก้ต่อได้
 * - เก็บตัวหนา/เอียง/ขีดเส้น/ขนาด/ฟอนต์/สี/จัดแนว/เยื้อง/รายการ/ตาราง/รูป/ตัวแบ่งหน้า/หัวท้ายกระดาษ/ระยะขอบ
 * - รูปส่งผ่าน addImage (เว็บ = อัปโหลดเข้าที่เก็บ, แอป = data URL) คืน '' = ทิ้งรูปนั้น
 * ไม่ใช้ DOM (ทดสอบใน selftest และใช้ได้ทั้งเว็บและแอป)
 */
import JSZip from 'jszip';
import { find, findAll, kid, kidsOf, parseXml, val, type XNode } from './xml';
import { ommlToTex } from './ommlTex';
import { oleEquationTex } from './mtef';
import { WORD_SINGLE } from './flow';

export type AddImage = (bytes: Uint8Array, mime: string) => Promise<string>;

export interface ImportStats {
  paragraphs: number;
  equations: number;
  /** สมการ MathType ที่แปลงไม่ได้ (ใส่ช่องสมการ ? แทน) */
  failedEq: number;
  images: number;
  /** รูปที่ใส่ไม่ได้ (EMF/WMF/ใหญ่เกิน/อัปโหลดไม่ผ่าน) */
  droppedImages: number;
  /** ไฟล์ยาวเกินที่เก็บได้ นำเข้าแค่ส่วนแรก */
  truncated?: boolean;
}
export interface ImportResult {
  html: string;
  head: string;
  foot: string;
  /** ระยะขอบ px (96 dpi) จากไฟล์ ไม่มี = undefined */
  margins?: { mt: number; mb: number; ml: number; mr: number };
  stats: ImportStats;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) => esc(s).replace(/"/g, '&quot;');
const twip = (v: string | undefined) => (v && /^-?\d+$/.test(v) ? Math.round(+v / 15) : 0);
const ptToPx = (pt: number) => Math.round(((pt * 4) / 3) * 100) / 100;
const THAI = /[\u0E00-\u0E7F]/;

/** สีไฮไลต์ของ Word */
const HILITE: Record<string, string> = { yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff', blue: '#0000ff', red: '#ff0000', darkBlue: '#000080', darkCyan: '#008080', darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000', darkYellow: '#808000', darkGray: '#808080', lightGray: '#c0c0c0', black: '#000000' };
/** ฟอนต์ Symbol (w:sym) -> Unicode เฉพาะตัวที่ใช้บ่อยในเอกสารคณิต */
const SYMBOL_FONT: Record<number, string> = { 0xb4: '×', 0xb8: '÷', 0xb1: '±', 0xa3: '≤', 0xb3: '≥', 0xb9: '≠', 0xbb: '≈', 0xd6: '√', 0x70: 'π', 0x71: 'θ', 0x61: 'α', 0x62: 'β', 0x67: 'γ', 0x64: 'δ', 0x44: 'Δ', 0x6c: 'λ', 0x6d: 'μ', 0x73: 'σ', 0x53: 'Σ', 0x57: 'Ω', 0x77: 'ω', 0xa5: '∞', 0xb0: '°', 0xae: '→', 0xac: '←', 0xde: '⇒', 0xdb: '⇔', 0xce: '∈', 0xcf: '∉', 0xc8: '∪', 0xc7: '∩', 0xcc: '⊂', 0xcd: '⊆', 0xc6: '∅', 0xd0: '∠', 0x5e: '⊥', 0x2d: '−', 0xd7: '·', 0xbc: '…', 0x22: '∀', 0x24: '∃', 0x5c: '∴' };

/* ---------------------------------------------------------------- รูปแบบตัวอักษร */

interface RunFmt {
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
  va?: 'sup' | 'sub';
  sz?: number;
  szCs?: number;
  font?: string;
  fontCs?: string;
  color?: string;
  bg?: string;
}
const onOff = (n: XNode | undefined) => {
  if (!n) return undefined;
  const v = n.attrs['w:val'];
  return !(v === '0' || v === 'false' || v === 'off');
};
function readRpr(p: XNode | undefined): RunFmt {
  if (!p) return {};
  const f: RunFmt = {};
  const set = <K extends keyof RunFmt>(k: K, v: RunFmt[K] | undefined) => v !== undefined && (f[k] = v);
  set('b', onOff(kid(p, 'w:b')) ?? onOff(kid(p, 'w:bCs')));
  set('i', onOff(kid(p, 'w:i')) ?? onOff(kid(p, 'w:iCs')));
  const u = val(p, 'w:u');
  if (u !== undefined) f.u = u !== 'none';
  set('s', onOff(kid(p, 'w:strike')) ?? onOff(kid(p, 'w:dstrike')));
  const va = val(p, 'w:vertAlign');
  if (va === 'superscript') f.va = 'sup';
  else if (va === 'subscript') f.va = 'sub';
  const sz = Number(val(p, 'w:sz'));
  if (sz > 0) f.sz = sz / 2;
  const szCs = Number(val(p, 'w:szCs'));
  if (szCs > 0) f.szCs = szCs / 2;
  const rf = kid(p, 'w:rFonts');
  if (rf) {
    const a = rf.attrs['w:ascii'] || rf.attrs['w:hAnsi'];
    if (a) f.font = a;
    if (rf.attrs['w:cs']) f.fontCs = rf.attrs['w:cs'];
  }
  const c = val(p, 'w:color');
  if (c && /^[0-9a-fA-F]{6}$/.test(c)) f.color = `#${c.toLowerCase()}`;
  const h = val(p, 'w:highlight');
  if (h && HILITE[h]) f.bg = HILITE[h];
  const shd = kid(p, 'w:shd')?.attrs['w:fill'];
  if (!f.bg && shd && /^[0-9a-fA-F]{6}$/.test(shd) && shd.toLowerCase() !== 'ffffff') f.bg = `#${shd.toLowerCase()}`;
  return f;
}

interface Style {
  based?: string;
  rpr: RunFmt;
  jc?: string;
}

/* ---------------------------------------------------------------- ตัวแปลง */

class Conv {
  stats: ImportStats = { paragraphs: 0, equations: 0, failedEq: 0, images: 0, droppedImages: 0 };
  styles = new Map<string, Style>();
  defRpr: RunFmt = {};
  defPara = '';
  rels = new Map<string, string>();
  /** numId -> (ระดับ -> ชนิดเลข) */
  nums = new Map<string, Map<string, string>>();
  constructor(
    public zip: JSZip,
    public addImage: AddImage
  ) {}

  styleRpr(id: string | undefined, depth = 0): RunFmt {
    const s = id ? this.styles.get(id) : undefined;
    if (!s || depth > 10) return {};
    return { ...this.styleRpr(s.based, depth + 1), ...s.rpr };
  }
  styleJc(id: string | undefined, depth = 0): string | undefined {
    const s = id ? this.styles.get(id) : undefined;
    if (!s || depth > 10) return undefined;
    return s.jc ?? this.styleJc(s.based, depth + 1);
  }

  async load(relsPath: string) {
    const st = await this.zip.file('word/styles.xml')?.async('string');
    if (st) {
      const x = parseXml(st);
      this.defRpr = readRpr(find(find(x, 'w:rPrDefault'), 'w:rPr'));
      for (const s of findAll(x, 'w:style')) {
        const id = s.attrs['w:styleId'];
        if (!id) continue;
        this.styles.set(id, { based: val(s, 'w:basedOn'), rpr: readRpr(kid(s, 'w:rPr')), jc: val(kid(s, 'w:pPr'), 'w:jc') });
        if (s.attrs['w:type'] === 'paragraph' && s.attrs['w:default'] === '1') this.defPara = id;
      }
    }
    await this.loadRels(relsPath);
    const nb = await this.zip.file('word/numbering.xml')?.async('string');
    if (nb) {
      const x = parseXml(nb);
      const abs = new Map<string, Map<string, string>>();
      for (const a of findAll(x, 'w:abstractNum')) {
        const lv = new Map<string, string>();
        for (const l of kidsOf(a, 'w:lvl')) lv.set(l.attrs['w:ilvl'] || '0', val(l, 'w:numFmt') || 'decimal');
        abs.set(a.attrs['w:abstractNumId'], lv);
      }
      for (const n of findAll(x, 'w:num')) {
        const lv = abs.get(val(n, 'w:abstractNumId') || '');
        if (lv) this.nums.set(n.attrs['w:numId'], lv);
      }
    }
  }
  async loadRels(path: string) {
    this.rels.clear();
    const r = await this.zip.file(path)?.async('string');
    if (!r) return;
    for (const x of findAll(parseXml(r), 'Relationship')) this.rels.set(x.attrs.Id, x.attrs.Target);
  }
  part(rid: string | undefined) {
    const t = rid ? this.rels.get(rid) : undefined;
    if (!t) return null;
    const p = t.startsWith('/') ? t.slice(1) : `word/${t}`.replace(/\/[^/]+\/\.\.\//g, '/');
    return this.zip.file(p);
  }

  async image(rid: string | undefined, wPx?: number): Promise<string> {
    const f = this.part(rid);
    const m = f && /\.(png|jpe?g|gif|bmp|webp)$/i.exec(f.name);
    if (!f || !m) {
      this.stats.droppedImages++;
      return '';
    }
    const ext = m[1].toLowerCase();
    const src = await this.addImage(await f.async('uint8array'), `image/${ext === 'jpg' ? 'jpeg' : ext}`).catch(() => '');
    if (!src) {
      this.stats.droppedImages++;
      return '';
    }
    this.stats.images++;
    const w = wPx && wPx > 4 ? Math.min(640, Math.round(wPx)) : 0;
    return `<img src="${escAttr(src)}"${w ? ` style="width: ${w}px"` : ''}>`;
  }

  async ole(obj: XNode): Promise<string> {
    const ole = find(obj, 'o:OLEObject');
    const prog = ole?.attrs.ProgID || '';
    if (/^Equation\./i.test(prog)) {
      const f = this.part(ole?.attrs['r:id']);
      const tex = f ? oleEquationTex(await f.async('uint8array')) : null;
      this.stats.equations++;
      if (!tex) this.stats.failedEq++;
      return `<span data-tex="${escAttr(tex || '\\boxed{?}')}"></span>`;
    }
    // วัตถุอื่น (Excel ฯลฯ) ใช้ภาพตัวอย่างถ้าเป็นรูปที่เปิดได้
    const im = find(obj, 'v:imagedata');
    return im ? this.image(im.attrs['r:id']) : '';
  }

  /** รูปแบบสุดท้ายของตัวอักษรเป็น style + แท็ก */
  wrapRun(text: string, f: RunFmt): string {
    if (!text) return '';
    const thai = THAI.test(text);
    // ไม่ระบุขนาดเลย = ใช้ขนาดตั้งต้นของเอกสาร
    const sz = (thai ? (f.szCs ?? f.sz) : (f.sz ?? f.szCs)) ?? 16;
    const font = thai ? (f.fontCs ?? f.font) : (f.font ?? f.fontCs);
    const st: string[] = [];
    // TH Sarabun = ฟอนต์ตั้งต้นของเอกสาร ไม่ต้องใส่ซ้ำทุกช่วง (ไฟล์ยาวจะได้ไม่เกินขนาดที่เก็บได้)
    if (font && /^[\w\s-]{1,40}$/.test(font) && !/^th sarabun/i.test(font)) st.push(`font-family: '${font}'`);
    if (Math.abs(sz - 16) > 0.01) st.push(`font-size: ${ptToPx(sz)}px`);
    if (f.b) st.push('font-weight: bold');
    if (f.i) st.push('font-style: italic');
    const dec = [f.u && 'underline', f.s && 'line-through'].filter(Boolean).join(' ');
    if (dec) st.push(`text-decoration: ${dec}`);
    if (f.color) st.push(`color: ${f.color}`);
    if (f.bg) st.push(`background-color: ${f.bg}`);
    let h = esc(text);
    if (st.length) h = `<span style="${st.join('; ')}">${h}</span>`;
    if (f.va) h = `<${f.va}>${h}</${f.va}>`;
    return h;
  }

  /** เนื้อในย่อหน้า (run, สมการ, ลิงก์ ...) */
  async inline(nodes: XNode[], base: RunFmt, after: string[], ctx: { pb: boolean }): Promise<string> {
    let out = '';
    for (const n of nodes) {
      switch (n.tag) {
        case 'w:r': {
          const f = { ...base, ...this.styleRpr(val(kid(n, 'w:rPr'), 'w:rStyle')), ...readRpr(kid(n, 'w:rPr')) };
          let text = '';
          const flush = () => {
            out += this.wrapRun(text, f);
            text = '';
          };
          for (const k of n.kids) {
            if (k.tag === 'w:t') text += k.text;
            else if (k.tag === 'w:tab') text += '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0';
            else if (k.tag === 'w:noBreakHyphen') text += '-';
            else if (k.tag === 'w:sym') {
              const code = parseInt(k.attrs['w:char'] || '', 16);
              const ch = SYMBOL_FONT[code & 0xff];
              if (ch && /symbol/i.test(k.attrs['w:font'] || 'Symbol')) text += ch;
            } else if (k.tag === 'w:br') {
              flush();
              if (k.attrs['w:type'] === 'page') ctx.pb = true;
              else out += '<br>';
            } else if (k.tag === 'w:drawing' || k.tag === 'w:pict' || k.tag === 'mc:AlternateContent') {
              flush();
              out += await this.drawing(k, after);
            } else if (k.tag === 'w:object') {
              flush();
              out += await this.ole(k);
            }
          }
          flush();
          break;
        }
        case 'm:oMath':
        case 'm:oMathPara': {
          const tex = ommlToTex(n);
          this.stats.equations++;
          if (tex) out += `<span data-tex="${escAttr(tex)}"></span>`;
          break;
        }
        case 'w:hyperlink':
        case 'w:ins':
        case 'w:smartTag':
        case 'w:fldSimple':
        case 'w:customXml':
        case 'w:bdo':
        case 'w:dir':
          out += await this.inline(n.kids, base, after, ctx);
          break;
        case 'w:sdt':
          out += await this.inline(kid(n, 'w:sdtContent')?.kids ?? [], base, after, ctx);
          break;
      }
    }
    // ช่วงติดกันที่สไตล์เดียวกันรวมเป็นช่วงเดียว
    for (let prev = ''; prev !== out; ) {
      prev = out;
      out = out.replace(/(<span style="([^"]*)">[^<]*)<\/span><span style="\2">/g, '$1');
    }
    return out;
  }

  /** รูป (DrawingML / VML) และกล่องข้อความ (ย้ายเนื้อหาไปเป็นย่อหน้าต่อท้าย) */
  async drawing(n: XNode, after: string[]): Promise<string> {
    const alt = n.tag === 'mc:AlternateContent' ? (kid(n, 'mc:Choice') ?? kid(n, 'mc:Fallback')) : n;
    const tx = find(alt, 'w:txbxContent');
    if (tx) {
      after.push(await this.blocks(tx.kids));
      return '';
    }
    const blip = find(alt, 'a:blip');
    if (blip) {
      const ext = find(alt, 'wp:extent');
      const cx = Number(ext?.attrs.cx);
      return this.image(blip.attrs['r:embed'], cx > 0 ? cx / 9525 : undefined);
    }
    const im = find(alt, 'v:imagedata');
    if (im) {
      const w = /width:\s*([\d.]+)pt/.exec(find(alt, 'v:shape')?.attrs.style || '');
      return this.image(im.attrs['r:id'], w ? ptToPx(+w[1]) : undefined);
    }
    return '';
  }

  async para(p: XNode): Promise<{ html: string; num?: { id: string; lvl: number; fmt: string } }> {
    this.stats.paragraphs++;
    const ppr = kid(p, 'w:pPr');
    const sid = val(ppr, 'w:pStyle') || this.defPara;
    const base = { ...this.defRpr, ...this.styleRpr(sid), ...readRpr(kid(ppr, 'w:rPr')) };
    // เครื่องหมายย่อหน้าไม่ใช่ตัวอักษรจริง ใช้แค่สีหรือขนาดของย่อหน้าว่าง
    const after: string[] = [];
    const ctx = { pb: false };
    let body = await this.inline(p.kids.filter((k) => k.tag !== 'w:pPr'), { ...this.defRpr, ...this.styleRpr(sid) }, after, ctx);
    const st: string[] = [];
    const jc = val(ppr, 'w:jc') ?? this.styleJc(sid);
    if (jc === 'center') st.push('text-align: center');
    else if (jc === 'right' || jc === 'end') st.push('text-align: right');
    else if (jc === 'both' || jc === 'distribute') st.push('text-align: justify');
    else if (!jc && p.kids.length === 2 && kid(p, 'm:oMathPara')) st.push('text-align: center');
    const ind = kid(ppr, 'w:ind');
    const numPr = kid(ppr, 'w:numPr');
    if (ind && !numPr) {
      const left = twip(ind.attrs['w:left'] ?? ind.attrs['w:start']);
      if (left > 0) st.push(`margin-left: ${left}px`);
      const first = twip(ind.attrs['w:firstLine']) || -twip(ind.attrs['w:hanging']);
      if (first) st.push(`text-indent: ${first}px`);
    }
    const sp = kid(ppr, 'w:spacing');
    const line = Number(sp?.attrs['w:line']);
    if (line > 0 && (sp?.attrs['w:lineRule'] ?? 'auto') === 'auto' && Math.abs(line - 240) > 6) st.push(`line-height: ${((line / 240) * WORD_SINGLE).toFixed(2)}`);
    if (!body) {
      // ย่อหน้าว่าง: คงขนาดตัวอักษร (ความสูงบรรทัด) ของย่อหน้า
      const sz = base.szCs ?? base.sz;
      body = sz && Math.abs(sz - 16) > 0.01 ? `<span style="font-size: ${ptToPx(sz)}px"><br></span>` : '<br>';
    }
    let html = `<p${st.length ? ` style="${st.join('; ')}"` : ''}>${body}</p>`;
    if (ctx.pb || kid(ppr, 'w:sectPr') || kid(ppr, 'w:pageBreakBefore')) html = kid(ppr, 'w:pageBreakBefore') ? `<div data-pb="1"></div>${html}` : `${html}<div data-pb="1"></div>`;
    html += after.join('');
    const numId = val(numPr, 'w:numId');
    if (numPr && numId && numId !== '0') {
      const lvl = Number(val(numPr, 'w:ilvl') || 0);
      return { html, num: { id: numId, lvl, fmt: this.nums.get(numId)?.get(String(lvl)) || 'decimal' } };
    }
    return { html };
  }

  async table(t: XNode): Promise<string> {
    const rows = kidsOf(t, 'w:tr').map((tr) => {
      let col = 0;
      return kidsOf(tr, 'w:tc').map((tc) => {
        const pr = kid(tc, 'w:tcPr');
        const span = Math.max(1, Number(val(pr, 'w:gridSpan')) || 1);
        const vm = kid(pr, 'w:vMerge');
        const cell = { tc, col, span, vm: vm ? (vm.attrs['w:val'] === 'restart' ? 'restart' : 'cont') : '' };
        col += span;
        return cell;
      });
    });
    let out = '<table><tbody>';
    for (let r = 0; r < rows.length; r++) {
      out += '<tr>';
      for (const c of rows[r]) {
        if (c.vm === 'cont') continue;
        let rs = 1;
        if (c.vm === 'restart') while (rows[r + rs]?.some((x) => x.col === c.col && x.vm === 'cont')) rs++;
        const inner = await this.blocks(c.tc.kids.filter((k) => k.tag !== 'w:tcPr'));
        out += `<td${c.span > 1 ? ` colspan="${Math.min(c.span, 99)}"` : ''}${rs > 1 ? ` rowspan="${Math.min(rs, 99)}"` : ''}>${inner || '<p><br></p>'}</td>`;
      }
      out += '</tr>';
    }
    return out + '</tbody></table>';
  }

  /** ลำดับบล็อก (ย่อหน้า ตาราง) รวมย่อหน้าที่เป็นรายการต่อกันเป็น ul/ol */
  async blocks(nodes: XNode[]): Promise<string> {
    let out = '';
    let list: { id: string; tag: string; items: string[] } | null = null;
    const close = () => {
      if (list) out += `<${list.tag}>${list.items.join('')}</${list.tag}>`;
      list = null;
    };
    for (const n of nodes) {
      if (n.tag === 'w:p') {
        const p = await this.para(n);
        if (p.num) {
          const tag = p.num.fmt === 'bullet' ? 'ul' : 'ol';
          if (!list || list.id !== p.num.id || list.tag !== tag) {
            close();
            list = { id: p.num.id, tag, items: [] };
          }
          const pad = p.num.lvl > 0 ? ` style="margin-left: ${p.num.lvl * 32}px${p.num.fmt === 'thaiNumbers' ? '; list-style-type: thai' : ''}"` : p.num.fmt === 'thaiNumbers' ? ' style="list-style-type: thai"' : '';
          const inner = p.html.replace(/^<p[^>]*>/, '').replace(/<\/p>([\s\S]*)$/, '');
          const rest = /<\/p>([\s\S]*)$/.exec(p.html)?.[1] ?? '';
          (list as { items: string[] }).items.push(`<li${pad}>${inner}</li>`);
          if (rest) {
            close();
            out += rest;
          }
          continue;
        }
        close();
        out += p.html;
      } else if (n.tag === 'w:tbl') {
        close();
        out += await this.table(n);
      } else if (n.tag === 'w:sdt') {
        close();
        out += await this.blocks(kid(n, 'w:sdtContent')?.kids ?? []);
      } else if (n.tag === 'w:customXml' || n.tag === 'w:ins') {
        close();
        out += await this.blocks(n.kids);
      } else if (n.tag === 'm:oMathPara') {
        close();
        const tex = ommlToTex(n);
        this.stats.equations++;
        out += `<p style="text-align: center"><span data-tex="${escAttr(tex)}"></span></p>`;
      }
    }
    close();
    return out;
  }

  /** หัว/ท้ายกระดาษแบบ default ของ section สุดท้าย */
  async headFoot(sect: XNode | undefined, tag: 'w:headerReference' | 'w:footerReference'): Promise<string> {
    const ref = kidsOf(sect, tag).find((x) => (x.attrs['w:type'] || 'default') === 'default');
    const f = this.part(ref?.attrs['r:id']);
    if (!f) return '';
    const x = parseXml(await f.async('string'));
    const root = find(x, tag === 'w:headerReference' ? 'w:hdr' : 'w:ftr');
    const saved = new Map(this.rels);
    await this.loadRels(f.name.replace(/([^/]+)$/, '_rels/$1.rels'));
    // ช่องเลขหน้า (ฟิลด์ PAGE) แสดงเป็นตัวเลขที่บันทึกไว้ ไม่ใช่ช่องเลขหน้าจริง
    const html = root ? await this.blocks(root.kids) : '';
    this.rels = saved;
    return html.replace(/^(<p><br><\/p>)+|(<p><br><\/p>)+$/g, '');
  }
}

/** ขนาด HTML สูงสุดที่นำเข้า (ตัวกรองรับ 400,000 ตัว และสื่อทั้งชิ้นเก็บได้ไม่เกิน 900KB) */
export const MAX_IMPORT = 330_000;

/** ตัดเนื้อหาที่ยาวเกินที่รอยต่อบล็อกชั้นนอกสุด (ไม่ตัดกลางแท็ก/ตาราง/รายการ) */
export function cutBlocks(html: string, max: number): string {
  if (html.length <= max) return html;
  const re = /<(\/?)(table|ul|ol)\b[^>]*>|<\/p>|<div data-pb="1"><\/div>/g;
  let depth = 0;
  let cut = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && re.lastIndex <= max) {
    if (m[2]) depth += m[1] ? -1 : 1;
    if (depth === 0) cut = re.lastIndex;
  }
  return html.slice(0, cut);
}

/** แปลงไฟล์ .docx เป็นเนื้อหาโหมดเอกสาร */
export async function docxToFlow(data: ArrayBuffer | Uint8Array, addImage: AddImage): Promise<ImportResult> {
  const zip = await JSZip.loadAsync(data);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('not-docx');
  const c = new Conv(zip, addImage);
  await c.load('word/_rels/document.xml.rels');
  const doc = parseXml(await docFile.async('string'));
  const body = find(doc, 'w:body');
  if (!body) throw new Error('not-docx');
  const all = await c.blocks(body.kids);
  const html = cutBlocks(all, MAX_IMPORT);
  c.stats.truncated = html.length < all.length;
  const sect = kid(body, 'w:sectPr');
  const mar = kid(sect, 'w:pgMar');
  const margins = mar ? { mt: twip(mar.attrs['w:top']), mb: twip(mar.attrs['w:bottom']), ml: twip(mar.attrs['w:left'] ?? mar.attrs['w:start']), mr: twip(mar.attrs['w:right'] ?? mar.attrs['w:end']) } : undefined;
  const head = await c.headFoot(sect, 'w:headerReference');
  const foot = await c.headFoot(sect, 'w:footerReference');
  return { html, head, foot, margins, stats: c.stats };
}
