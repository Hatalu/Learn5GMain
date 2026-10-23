'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  BarChart3,
  Bold,
  CalendarDays,
  Eraser,
  FileDown,
  Heading,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Keyboard,
  LineChart,
  List,
  ListOrdered,
  Minus,
  PanelTop,
  PilcrowSquare,
  Plus,
  Replace,
  Ruler,
  Search,
  Sigma,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Trash2,
  Type,
  Underline,
  X,
} from 'lucide-react';
import { texToHtml } from '@/components/creator/math/MathText';
import { MathKeysDialog } from '@/components/creator/math/MathKeys';
import { WORD_KEYS, comboLabel } from '@/lib/studio/keys';
import { FONTS } from './fonts';

export const SIZES = [12, 14, 16, 18, 21, 24, 28, 32, 40, 48, 64];
export const SYMBOLS = ['°', '±', '×', '÷', '≤', '≥', '≠', '≈', '≡', 'π', '√', '∞', '∠', '△', '⊥', '∥', '∴', '∵', '→', '⇒', '⇔', '∈', '∉', '⊂', '∪', '∩', '∅', 'ℝ', 'α', 'β', 'θ', 'Δ', 'Σ', 'μ', 'σ', '½', '¼', '¾', '²', '³'];
const MORE_SYMBOLS = ['←', '↑', '↓', '↔', '⇐', '∀', '∃', '¬', '∧', '∨', '⊆', '⊇', '∑', '∏', '∫', '∂', '∇', '∝', '‰', '℃', '℉', 'Ω', 'λ', 'φ', 'ω', 'γ', 'δ', 'ε', '⅓', '⅔', '⅛', '¹', '⁴', '•', '◦', '▪', '★', '☆', '✓', '✗', '□', '■', '○', '●', '◇', '◆', '♀', '♂', '“', '”', '…', '–', '—', '฿', '§', '¶', '©'];

const COLORS = ['#1f1b36', '#4b5563', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0d9488', '#2563eb', '#4f46e5', '#7c3aed', '#c026d3', '#db2777'];
const HILITES = ['#fff3c4', '#fde68a', '#bbf7d0', '#bae6fd', '#ddd6fe', '#fbcfe8', '#fed7aa', '#e5e7eb'];
const SHADES = ['#f8fafc', '#fef9c3', '#dcfce7', '#e0f2fe', '#ede9fe', '#fce7f3', '#ffedd5', '#f1f5f9'];

/** สูตรสำเร็จรูปที่ครูใช้บ่อย (แทรกเป็นสมการ แก้ต่อได้) */
const FORMULAS: { tex: string; label: string }[] = [
  { tex: 'a^{2}+b^{2}=c^{2}', label: 'พีทาโกรัส' },
  { tex: 'x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}', label: 'สูตรสมการกำลังสอง' },
  { tex: 'A=\\pi r^{2}', label: 'พื้นที่วงกลม' },
  { tex: 'C=2\\pi r', label: 'เส้นรอบวง' },
  { tex: 'A=\\frac{1}{2}\\times b\\times h', label: 'พื้นที่สามเหลี่ยม' },
  { tex: 'V=\\pi r^{2}h', label: 'ปริมาตรทรงกระบอก' },
  { tex: '\\left(a+b\\right)^{2}=a^{2}+2ab+b^{2}', label: 'กำลังสองสมบูรณ์' },
  { tex: 'a^{2}-b^{2}=\\left(a+b\\right)\\left(a-b\\right)', label: 'ผลต่างกำลังสอง' },
  { tex: '\\sin^{2}\\theta+\\cos^{2}\\theta=1', label: 'เอกลักษณ์ตรีโกณ' },
  { tex: 'v=\\frac{s}{t}', label: 'อัตราเร็ว' },
  { tex: '\\bar{x}=\\frac{\\sum x_{i}}{n}', label: 'ค่าเฉลี่ย' },
  { tex: '\\text{ร้อยละ}=\\frac{\\text{ส่วน}}{\\text{ทั้งหมด}}\\times 100', label: 'ร้อยละ' },
];

export type WordPanelId = 'home' | 'para' | 'insert' | 'math' | 'table' | 'find' | 'layout' | 'keys';

export const WORD_RAIL: { id: WordPanelId; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'home', label: 'หน้าแรก', icon: <Type className="w-5 h-5" />, color: '#2a73d9' },
  { id: 'para', label: 'ย่อหน้า', icon: <PilcrowSquare className="w-5 h-5" />, color: '#0f766e' },
  { id: 'insert', label: 'แทรก', icon: <Plus className="w-5 h-5" />, color: '#e8456b' },
  { id: 'math', label: 'MathType', icon: <Sigma className="w-5 h-5" />, color: '#4f46e5' },
  { id: 'table', label: 'ตาราง', icon: <Table className="w-5 h-5" />, color: '#e07a12' },
  { id: 'find', label: 'ค้นหา', icon: <Search className="w-5 h-5" />, color: '#c026d3' },
  { id: 'layout', label: 'เค้าโครง', icon: <Ruler className="w-5 h-5" />, color: '#2f9e6e' },
  { id: 'keys', label: 'แป้นลัด', icon: <Keyboard className="w-5 h-5" />, color: '#64748b' },
];

const TITLES: Record<WordPanelId, string> = {
  home: 'หน้าแรก: ตัวอักษรและสไตล์',
  para: 'ย่อหน้า',
  insert: 'แทรก',
  math: 'MathType: สมการ',
  table: 'เครื่องมือตาราง',
  find: 'ค้นหาและแทนที่',
  layout: 'เค้าโครงหน้ากระดาษ',
  keys: 'แป้นลัดโหมดเอกสาร',
};

export type TableOp = 'rowAbove' | 'rowBelow' | 'colLeft' | 'colRight' | 'delRow' | 'delCol' | 'delTable' | 'header';

/** คำสั่งที่แผงเรียกใช้กับตัวแก้ไขเอกสาร */
export interface WordApi {
  cmd: (c: string, v?: string) => void;
  insertHtml: (h: string) => void;
  setSize: (px: number) => void;
  bumpSize: (d: 1 | -1, step: boolean) => void;
  setLine: (v: string) => void;
  indent: (d: 1 | -1) => void;
  /** ตั้งสไตล์ให้ย่อหน้าที่เลือก (ค่าว่าง = เอาออก) */
  blockStyle: (prop: string, v: string) => void;
  list: (ordered: boolean, type: string) => void;
  changeCase: (m: 'upper' | 'lower' | 'title') => void;
  addMath: (display: boolean) => void;
  insertTex: (tex: string) => void;
  addGraph: () => void;
  pickImage: () => void;
  table: (op: TableOp) => void;
  cellShade: (c: string) => void;
  inTable: () => boolean;
  root: () => HTMLElement | null;
  changed: () => void;
  pages: number;
}

/* ใช้กับปุ่มในแผง: ไม่แย่งเคอร์เซอร์จากเอกสาร */
const noFocus = (e: React.MouseEvent) => e.preventDefault();

const Sec = ({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) => (
  <section className="st-sec">
    <h3>{title}</h3>
    {note && <p className="st-note">{note}</p>}
    {children}
  </section>
);

const Tool = ({ title, onClick, children, wide }: { title: string; onClick: () => void; children: React.ReactNode; wide?: boolean }) => (
  <button type="button" className="st-wtool" data-wide={wide} title={title} aria-label={title} onMouseDown={noFocus} onClick={onClick}>
    {children}
  </button>
);

export function WordRail({ panel, onPick }: { panel: WordPanelId | null; onPick: (p: WordPanelId | null) => void }) {
  return (
    <nav className="st-rail" aria-label="เครื่องมือเอกสาร">
      {WORD_RAIL.map((r) => (
        <button key={r.id} type="button" className="st-rail-btn" data-on={panel === r.id} onMouseDown={noFocus} onClick={() => onPick(panel === r.id ? null : r.id)} style={{ ['--c' as string]: r.color }}>
          <span className="st-rail-ic">{r.icon}</span>
          <span className="st-rail-tx">{r.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function WordPanel({ id, api, onClose, layoutExtra, findFocus }: { id: WordPanelId; api: WordApi; onClose: () => void; layoutExtra?: React.ReactNode; findFocus: number }) {
  return (
    <aside className="st-panel" aria-label={TITLES[id]}>
      <div className="st-panel-head">
        <h2>{TITLES[id]}</h2>
        <button type="button" className="st-tb" onMouseDown={noFocus} onClick={onClose} aria-label="ปิดแผง">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="st-panel-body">
        {id === 'home' && <HomePanel api={api} />}
        {id === 'para' && <ParaPanel api={api} />}
        {id === 'insert' && <InsertPanel api={api} />}
        {id === 'math' && <MathPanel api={api} />}
        {id === 'table' && <TablePanel api={api} />}
        {id === 'find' && <FindPanel api={api} focus={findFocus} />}
        {id === 'layout' && <LayoutPanel api={api} extra={layoutExtra} />}
        {id === 'keys' && <KeysPanel />}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ หน้าแรก */

function HomePanel({ api }: { api: WordApi }) {
  return (
    <>
      <Sec title="สไตล์">
        <div className="st-wstyles">
          {[
            ['p', 'ข้อความปกติ', 'st-ws-p'],
            ['h1', 'หัวเรื่อง 1', 'st-ws-h1'],
            ['h2', 'หัวเรื่อง 2', 'st-ws-h2'],
            ['h3', 'หัวเรื่อง 3', 'st-ws-h3'],
            ['blockquote', 'กรอบเน้น', 'st-ws-q'],
          ].map(([tag, label, cls]) => (
            <button key={tag} type="button" className={`st-wstyle ${cls}`} onMouseDown={noFocus} onClick={() => api.cmd('formatBlock', tag)}>
              {label}
            </button>
          ))}
        </div>
      </Sec>
      <Sec title="ตกแต่งตัวอักษร">
        <div className="st-wtools">
          <Tool title="ตัวหนา (Ctrl+B)" onClick={() => api.cmd('bold')}>
            <Bold className="w-4 h-4" />
          </Tool>
          <Tool title="ตัวเอียง (Ctrl+I)" onClick={() => api.cmd('italic')}>
            <Italic className="w-4 h-4" />
          </Tool>
          <Tool title="ขีดเส้นใต้ (Ctrl+U)" onClick={() => api.cmd('underline')}>
            <Underline className="w-4 h-4" />
          </Tool>
          <Tool title="ขีดฆ่า" onClick={() => api.cmd('strikeThrough')}>
            <Strikethrough className="w-4 h-4" />
          </Tool>
          <Tool title="ตัวห้อย (Ctrl+=)" onClick={() => api.cmd('subscript')}>
            <Subscript className="w-4 h-4" />
          </Tool>
          <Tool title="ตัวยก (Ctrl+Shift+=)" onClick={() => api.cmd('superscript')}>
            <Superscript className="w-4 h-4" />
          </Tool>
          <Tool title="ล้างรูปแบบ (Ctrl+Space)" onClick={() => api.cmd('removeFormat')}>
            <Eraser className="w-4 h-4" />
          </Tool>
        </div>
      </Sec>
      <Sec title="ขนาดตัวอักษร" note="คลุมข้อความก่อน แล้วเลือกขนาด">
        <div className="st-chips">
          {SIZES.map((z) => (
            <button key={z} type="button" onMouseDown={noFocus} onClick={() => api.setSize(z)}>
              {z}
            </button>
          ))}
          <button type="button" onMouseDown={noFocus} onClick={() => api.bumpSize(1, true)} title="ใหญ่ขึ้น (Ctrl+Shift+>)">
            A+
          </button>
          <button type="button" onMouseDown={noFocus} onClick={() => api.bumpSize(-1, true)} title="เล็กลง (Ctrl+Shift+<)">
            A-
          </button>
        </div>
      </Sec>
      <Sec title="ฟอนต์">
        <div className="st-wfonts">
          {Object.values(FONTS).map((f) => (
            <button key={f.label} type="button" onMouseDown={noFocus} onClick={() => api.cmd('fontName', f.family)} style={{ fontFamily: f.family }}>
              {f.label}
            </button>
          ))}
        </div>
      </Sec>
      <Sec title="สีตัวอักษร">
        <Swatches colors={COLORS} onPick={(c) => api.cmd('foreColor', c)} />
      </Sec>
      <Sec title="ปากกาเน้นข้อความ">
        <Swatches colors={HILITES} onPick={(c) => api.cmd('hiliteColor', c)} none={() => api.cmd('hiliteColor', 'transparent')} />
      </Sec>
      <Sec title="ตัวพิมพ์ภาษาอังกฤษ">
        <div className="st-chips">
          <button type="button" onMouseDown={noFocus} onClick={() => api.changeCase('upper')}>
            ABC ใหญ่
          </button>
          <button type="button" onMouseDown={noFocus} onClick={() => api.changeCase('lower')}>
            abc เล็ก
          </button>
          <button type="button" onMouseDown={noFocus} onClick={() => api.changeCase('title')}>
            Abc ขึ้นต้นใหญ่
          </button>
        </div>
      </Sec>
    </>
  );
}

function Swatches({ colors, onPick, none }: { colors: string[]; onPick: (c: string) => void; none?: () => void }) {
  return (
    <div className="st-wsw">
      {none && (
        <button type="button" className="st-wsw-none" onMouseDown={noFocus} onClick={none} aria-label="ไม่มีสี" title="ไม่มีสี">
          <X className="w-4 h-4" />
        </button>
      )}
      {colors.map((c) => (
        <button key={c} type="button" style={{ background: c }} onMouseDown={noFocus} onClick={() => onPick(c)} aria-label={c} title={c} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ ย่อหน้า */

function ParaPanel({ api }: { api: WordApi }) {
  return (
    <>
      <Sec title="จัดแนว">
        <div className="st-wtools">
          <Tool title="ชิดซ้าย (Ctrl+L)" onClick={() => api.cmd('justifyLeft')}>
            <AlignLeft className="w-4 h-4" />
          </Tool>
          <Tool title="กึ่งกลาง (Ctrl+E)" onClick={() => api.cmd('justifyCenter')}>
            <AlignCenter className="w-4 h-4" />
          </Tool>
          <Tool title="ชิดขวา (Ctrl+R)" onClick={() => api.cmd('justifyRight')}>
            <AlignRight className="w-4 h-4" />
          </Tool>
          <Tool title="เต็มบรรทัด (Ctrl+J)" onClick={() => api.cmd('justifyFull')}>
            <AlignJustify className="w-4 h-4" />
          </Tool>
        </div>
      </Sec>
      <Sec title="สัญลักษณ์แสดงหัวข้อ">
        <div className="st-wlists">
          {[
            ['disc', '●'],
            ['circle', '○'],
            ['square', '■'],
          ].map(([t, s]) => (
            <button key={t} type="button" onMouseDown={noFocus} onClick={() => api.list(false, t)}>
              <List className="w-4 h-4" /> {s}
            </button>
          ))}
        </div>
      </Sec>
      <Sec title="ลำดับเลข">
        <div className="st-wlists">
          {[
            ['decimal', '1. 2. 3.'],
            ['thai', '๑. ๒. ๓.'],
            ['lower-alpha', 'a. b. c.'],
            ['upper-alpha', 'A. B. C.'],
            ['lower-roman', 'i. ii. iii.'],
          ].map(([t, s]) => (
            <button key={t} type="button" onMouseDown={noFocus} onClick={() => api.list(true, t)}>
              <ListOrdered className="w-4 h-4" /> {s}
            </button>
          ))}
        </div>
      </Sec>
      <Sec title="การเยื้อง">
        <div className="st-wtools">
          <Tool title="ลดการเยื้อง (Ctrl+Shift+M)" onClick={() => api.indent(-1)}>
            <IndentDecrease className="w-4 h-4" />
          </Tool>
          <Tool title="เพิ่มการเยื้อง (Ctrl+M)" onClick={() => api.indent(1)}>
            <IndentIncrease className="w-4 h-4" />
          </Tool>
          <Tool title="เยื้องบรรทัดแรก" wide onClick={() => api.blockStyle('text-indent', '2.5em')}>
            ย่อหน้าบรรทัดแรก
          </Tool>
          <Tool title="ไม่เยื้องบรรทัดแรก" wide onClick={() => api.blockStyle('text-indent', '')}>
            ไม่ย่อหน้า
          </Tool>
        </div>
      </Sec>
      <Sec title="ระยะห่างบรรทัด">
        <div className="st-chips">
          {['1', '1.15', '1.5', '2', '2.5', '3'].map((v) => (
            <button key={v} type="button" onMouseDown={noFocus} onClick={() => api.setLine(v)}>
              {v}
            </button>
          ))}
        </div>
      </Sec>
      <Sec title="แรเงาย่อหน้า">
        <Swatches colors={SHADES} onPick={(c) => api.blockStyle('background-color', c)} none={() => api.blockStyle('background-color', '')} />
      </Sec>
    </>
  );
}

/* ------------------------------------------------------------------ แทรก */

function InsertPanel({ api }: { api: WordApi }) {
  const [hv, setHv] = useState<[number, number]>([0, 0]);
  const today = () => new Date().toLocaleDateString('th-TH', { dateStyle: 'long' });
  return (
    <>
      <Sec title="ตาราง" note={hv[0] ? `${hv[0]} แถว x ${hv[1]} คอลัมน์` : 'ชี้เลือกขนาด แล้วคลิก'}>
        <div className="st-wgrid st-wgrid-lg" onMouseLeave={() => setHv([0, 0])}>
          {Array.from({ length: 80 }, (_, i) => {
            const r = Math.floor(i / 10) + 1;
            const c = (i % 10) + 1;
            return (
              <button
                key={i}
                type="button"
                data-on={r <= hv[0] && c <= hv[1]}
                onMouseEnter={() => setHv([r, c])}
                onMouseDown={noFocus}
                onClick={() => api.insertHtml(`<table><tbody>${Array.from({ length: r }, () => `<tr>${'<td><br></td>'.repeat(c)}</tr>`).join('')}</tbody></table><p><br></p>`)}
                aria-label={`${r} แถว ${c} คอลัมน์`}
              />
            );
          })}
        </div>
      </Sec>
      <Sec title="ภาพและรูปคณิต">
        <div className="st-wbig">
          <button type="button" onMouseDown={noFocus} onClick={api.pickImage}>
            <ImagePlus className="w-5 h-5" /> รูปภาพ
          </button>
          <button type="button" onMouseDown={noFocus} onClick={api.addGraph}>
            <LineChart className="w-5 h-5" /> กราฟ/รูปคณิต
          </button>
          <button type="button" onMouseDown={noFocus} onClick={() => api.addMath(false)}>
            <Sigma className="w-5 h-5" /> สมการ
          </button>
        </div>
      </Sec>
      <Sec title="หน้าและเส้น">
        <div className="st-wbig">
          <button type="button" onMouseDown={noFocus} onClick={() => api.insertHtml('<div data-pb="1"></div><p><br></p>')}>
            <FileDown className="w-5 h-5" /> ขึ้นหน้าใหม่
          </button>
          <button type="button" onMouseDown={noFocus} onClick={() => api.insertHtml('<hr><p><br></p>')}>
            <Minus className="w-5 h-5" /> เส้นคั่น
          </button>
        </div>
      </Sec>
      <Sec title="ส่วนช่วยครู">
        <div className="st-wbig">
          <button type="button" onMouseDown={noFocus} onClick={() => api.insertHtml('<p>ชื่อ ............................................................. ชั้น ............ เลขที่ ............</p><p><br></p>')}>
            <PanelTop className="w-5 h-5" /> ช่องชื่อ ชั้น เลขที่
          </button>
          <button type="button" onMouseDown={noFocus} onClick={() => api.insertHtml(`${'<p>...............................................................................................................</p>'.repeat(3)}<p><br></p>`)}>
            <Heading className="w-5 h-5" /> เส้นเขียนคำตอบ 3 บรรทัด
          </button>
          <button type="button" onMouseDown={noFocus} onClick={() => api.insertHtml(`${today()}&nbsp;`)}>
            <CalendarDays className="w-5 h-5" /> วันที่วันนี้
          </button>
        </div>
      </Sec>
      <Sec title="สัญลักษณ์">
        <div className="st-wsym st-wsym-panel">
          {[...SYMBOLS, ...MORE_SYMBOLS].map((s) => (
            <button key={s} type="button" onMouseDown={noFocus} onClick={() => api.insertHtml(s)}>
              {s}
            </button>
          ))}
        </div>
      </Sec>
    </>
  );
}

/* ------------------------------------------------------------------ MathType */

function MathPanel({ api }: { api: WordApi }) {
  const [keysOpen, setKeysOpen] = useState(false);
  return (
    <>
      <Sec title="แทรกสมการ" note="ดับเบิลคลิกสมการในเอกสารเพื่อแก้ไข">
        <div className="st-wbig">
          <button type="button" onMouseDown={noFocus} onClick={() => api.addMath(false)}>
            <Sigma className="w-5 h-5" /> สมการในบรรทัด <kbd>Alt + =</kbd>
          </button>
          <button type="button" onMouseDown={noFocus} onClick={() => api.addMath(true)}>
            <AlignCenter className="w-5 h-5" /> สมการแยกบรรทัด <kbd>Alt + Q</kbd>
          </button>
          <button type="button" onMouseDown={noFocus} onClick={() => setKeysOpen(true)}>
            <Keyboard className="w-5 h-5" /> ตั้งแป้นลัดแม่แบบ (เศษส่วน ราก ฯลฯ)
          </button>
        </div>
      </Sec>
      <Sec title="สูตรสำเร็จรูป">
        <div className="st-wformulas">
          {FORMULAS.map((f) => (
            <Formula key={f.label} f={f} onPick={() => api.insertTex(f.tex)} />
          ))}
        </div>
      </Sec>
      {keysOpen && <MathKeysDialog onClose={() => setKeysOpen(false)} />}
    </>
  );
}

function Formula({ f, onPick }: { f: { tex: string; label: string }; onPick: () => void }) {
  const html = useMemo(() => texToHtml(f.tex, false, false), [f.tex]);
  return (
    <button type="button" onMouseDown={noFocus} onClick={onPick} title={f.label}>
      <span className="st-wformula" dangerouslySetInnerHTML={{ __html: html }} />
      <small>{f.label}</small>
    </button>
  );
}

/* ------------------------------------------------------------------ ตาราง */

function TablePanel({ api }: { api: WordApi }) {
  const [, tick] = useState(0);
  // เคอร์เซอร์ย้ายไปมา: เช็กใหม่เป็นระยะว่าอยู่ในตารางไหม
  useEffect(() => {
    const t = window.setInterval(() => tick((x) => x + 1), 600);
    return () => window.clearInterval(t);
  }, []);
  const on = api.inTable();
  const B = ({ op, children }: { op: TableOp; children: React.ReactNode }) => (
    <button type="button" disabled={!on} onMouseDown={noFocus} onClick={() => api.table(op)}>
      {children}
    </button>
  );
  return (
    <>
      {!on && <p className="st-note st-wwarn">คลิกในช่องของตารางก่อน แล้วค่อยใช้เครื่องมือด้านล่าง (ยังไม่มีตาราง? ไปที่แผง &quot;แทรก&quot;)</p>}
      <Sec title="แถวและคอลัมน์">
        <div className="st-wbig st-wbig-2">
          <B op="rowAbove">
            <ArrowUpToLine className="w-4 h-4" /> แทรกแถวบน
          </B>
          <B op="rowBelow">
            <ArrowDownToLine className="w-4 h-4" /> แทรกแถวล่าง
          </B>
          <B op="colLeft">
            <ArrowLeftToLine className="w-4 h-4" /> แทรกคอลัมน์ซ้าย
          </B>
          <B op="colRight">
            <ArrowRightToLine className="w-4 h-4" /> แทรกคอลัมน์ขวา
          </B>
          <B op="delRow">
            <Trash2 className="w-4 h-4" /> ลบแถว
          </B>
          <B op="delCol">
            <Trash2 className="w-4 h-4" /> ลบคอลัมน์
          </B>
        </div>
      </Sec>
      <Sec title="รูปแบบตาราง">
        <div className="st-wbig">
          <B op="header">
            <Heading className="w-4 h-4" /> แถวแรกเป็นหัวตาราง (เปิด/ปิด)
          </B>
          <B op="delTable">
            <Trash2 className="w-4 h-4" /> ลบทั้งตาราง
          </B>
        </div>
      </Sec>
      <Sec title="แรเงาช่อง">
        {on ? <Swatches colors={SHADES} onPick={api.cellShade} none={() => api.cellShade('')} /> : <p className="st-note">คลิกในช่องตารางก่อน</p>}
      </Sec>
    </>
  );
}

/* ------------------------------------------------------------------ ค้นหาและแทนที่ */

/** ช่วงข้อความทุกจุดที่ตรงคำค้น (ค้นในโหนดข้อความทีละโหนด) */
function findAll(root: HTMLElement, q: string): Range[] {
  if (!q) return [];
  const out: Range[] = [];
  const lq = q.toLowerCase();
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if ((n.parentElement as HTMLElement | null)?.closest('[contenteditable="false"]')) continue;
    const t = (n.nodeValue || '').toLowerCase();
    for (let i = t.indexOf(lq); i >= 0; i = t.indexOf(lq, i + lq.length)) {
      const r = document.createRange();
      r.setStart(n, i);
      r.setEnd(n, i + q.length);
      out.push(r);
    }
  }
  return out;
}

function FindPanel({ api, focus }: { api: WordApi; focus: number }) {
  const [q, setQ] = useState('');
  const [rep, setRep] = useState('');
  const [msg, setMsg] = useState('');
  const idx = useRef(-1);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, [focus]);
  const root = api.root();
  const count = root && q ? findAll(root, q).length : 0;

  const select = (r: Range) => {
    const s = window.getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
    (r.startContainer.parentElement as HTMLElement | null)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  const next = () => {
    const el = api.root();
    if (!el) return;
    const all = findAll(el, q);
    if (!all.length) return setMsg('ไม่พบคำนี้');
    idx.current = (idx.current + 1) % all.length;
    select(all[idx.current]);
    setMsg(`ตำแหน่งที่ ${idx.current + 1} จาก ${all.length}`);
  };
  const replaceOne = () => {
    const el = api.root();
    const s = window.getSelection();
    if (!el || !q) return;
    if (s && s.rangeCount && s.toString().toLowerCase() === q.toLowerCase() && el.contains(s.anchorNode)) {
      el.focus();
      document.execCommand('insertText', false, rep);
      api.changed();
      idx.current -= 1;
    }
    next();
  };
  const replaceAll = () => {
    const el = api.root();
    if (!el || !q) return;
    // แทนจากท้ายไปต้น ตำแหน่งในโหนดเดียวกันจะได้ไม่เลื่อน
    const all = findAll(el, q).reverse();
    for (const r of all) {
      r.deleteContents();
      if (rep) r.insertNode(document.createTextNode(rep));
    }
    el.normalize();
    api.changed();
    idx.current = -1;
    setMsg(all.length ? `แทนที่แล้ว ${all.length} จุด` : 'ไม่พบคำนี้');
  };

  return (
    <>
      <Sec title="ค้นหา (Ctrl+F)">
        <div className="st-search">
          <Search className="w-4 h-4 shrink-0" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              idx.current = -1;
              setMsg('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), next())}
            placeholder="พิมพ์คำที่ต้องการหา"
            aria-label="คำค้นหา"
          />
          {q && <span className="text-xs font-bold whitespace-nowrap">{count} จุด</span>}
        </div>
        <div className="st-wbig mt-2">
          <button type="button" onClick={next} disabled={!q}>
            <Search className="w-4 h-4" /> หาถัดไป
          </button>
        </div>
      </Sec>
      <Sec title="แทนที่ด้วย (Ctrl+H)">
        <div className="st-search">
          <Replace className="w-4 h-4 shrink-0" />
          <input value={rep} onChange={(e) => setRep(e.target.value)} placeholder="คำใหม่ (เว้นว่าง = ลบ)" aria-label="แทนที่ด้วย" />
        </div>
        <div className="st-wbig st-wbig-2 mt-2">
          <button type="button" onClick={replaceOne} disabled={!q}>
            แทนที่
          </button>
          <button type="button" onClick={replaceAll} disabled={!q}>
            แทนที่ทั้งหมด
          </button>
        </div>
      </Sec>
      {msg && <p className="st-note mt-3">{msg}</p>}
    </>
  );
}

/* ------------------------------------------------------------------ เค้าโครง */

function LayoutPanel({ api, extra }: { api: WordApi; extra?: React.ReactNode }) {
  const [stats, setStats] = useState<{ words: number; chars: number; paras: number } | null>(null);
  const count = () => {
    const el = api.root();
    if (!el) return;
    const text = el.innerText || '';
    let words = 0;
    // ภาษาไทยไม่เว้นวรรคระหว่างคำ: นับด้วยตัวตัดคำของเบราว์เซอร์
    const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => { segment: (t: string) => Iterable<{ isWordLike?: boolean }> } }).Segmenter;
    if (Seg) for (const s of new Seg('th', { granularity: 'word' }).segment(text)) words += s.isWordLike ? 1 : 0;
    else words = text.split(/\s+/).filter(Boolean).length;
    const paras = Array.from(el.children).filter((c) => (c as HTMLElement).innerText?.trim()).length;
    setStats({ words, chars: text.replace(/\s/g, '').length, paras });
  };
  useEffect(count, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      {extra && <Sec title="ขนาดและแนวกระดาษ">{extra}</Sec>}
      <Sec title="สถิติเอกสาร">
        <div className="st-wstats">
          <span>
            <b>{api.pages}</b> หน้า
          </span>
          <span>
            <b>{stats?.words ?? '-'}</b> คำ
          </span>
          <span>
            <b>{stats?.chars ?? '-'}</b> ตัวอักษร
          </span>
          <span>
            <b>{stats?.paras ?? '-'}</b> ย่อหน้า
          </span>
        </div>
        <div className="st-wbig mt-2">
          <button type="button" onMouseDown={noFocus} onClick={count}>
            <BarChart3 className="w-4 h-4" /> นับใหม่
          </button>
        </div>
      </Sec>
    </>
  );
}

/* ------------------------------------------------------------------ แป้นลัด */

function KeysPanel() {
  return (
    <>
      <Sec title="แป้นลัดแบบ Word" note="บน Mac ใช้ Cmd แทน Ctrl · ใช้ได้แม้เปิดแป้นภาษาไทย">
        <div className="st-wkeys">
          {WORD_KEYS.map((k) => (
            <p key={k.id}>
              <kbd>{comboLabel(k.combo)}</kbd>
              <span>{k.label}</span>
            </p>
          ))}
          <p>
            <kbd>Tab</kbd>
            <span>ช่องถัดไปในตาราง / เยื้องรายการ</span>
          </p>
          <p>
            <kbd>Ctrl + ลูกกลิ้ง</kbd>
            <span>ย่อ / ขยายหน้ากระดาษ</span>
          </p>
        </div>
      </Sec>
      <Sec title="แป้นลัดแม่แบบสมการ" note="ตั้งเองได้ที่แผง MathType > ตั้งแป้นลัดแม่แบบ" children={null} />
    </>
  );
}
