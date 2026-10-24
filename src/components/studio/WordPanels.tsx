'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AArrowDown,
  AArrowUp,
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
  ClipboardPaste,
  Clock,
  Copy,
  Eraser,
  FileDown,
  FilePlus,
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
  Omega,
  PanelTop,
  PilcrowSquare,
  Plus,
  Replace,
  Ruler,
  Scissors,
  Search,
  SpellCheck,
  Sigma,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  TextSelect,
  Trash2,
  Type,
  Underline,
  X,
} from 'lucide-react';
import { texToHtml } from '@/components/creator/math/MathText';
import { MathKeysDialog } from '@/components/creator/math/MathKeys';
import { WORD_KEYS, comboLabel } from '@/lib/studio/keys';
import { FONTS } from './fonts';
import { SHAPES } from './shapes';
import { MARGIN_PRESETS, NUM_FMTS, type WordOpt } from '@/lib/studio/flow';

/** ขนาดตัวอักษรหน่วย pt เหมือนรายการใน Word (ตัวปกติของเอกสาร = 16pt แบบ TH Sarabun) */
export const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 60, 72];
export const ptToPx = (pt: number) => Math.round(((pt * 4) / 3) * 100) / 100;
export const pxToPt = (px: number) => Math.round(px * 0.75 * 2) / 2;
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

/** แท็บเครื่องมือเรียงแบบริบบอนของ Word (หน้าแรก แทรก เค้าโครง ...) แต่อยู่ด้านซ้าย */
export type WordPanelId = 'home' | 'insert' | 'layout' | 'table' | 'math' | 'review' | 'find' | 'keys';

export const WORD_RAIL: { id: WordPanelId; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'home', label: 'หน้าแรก', icon: <Type className="w-5 h-5" />, color: '#2a73d9' },
  { id: 'insert', label: 'แทรก', icon: <Plus className="w-5 h-5" />, color: '#e8456b' },
  { id: 'layout', label: 'เค้าโครง', icon: <Ruler className="w-5 h-5" />, color: '#2f9e6e' },
  { id: 'table', label: 'ตาราง', icon: <Table className="w-5 h-5" />, color: '#e07a12' },
  { id: 'math', label: 'MathType', icon: <Sigma className="w-5 h-5" />, color: '#4f46e5' },
  { id: 'review', label: 'รีวิว', icon: <SpellCheck className="w-5 h-5" />, color: '#c026d3' },
  { id: 'keys', label: 'แป้นลัด', icon: <Keyboard className="w-5 h-5" />, color: '#64748b' },
];

const TITLES: Record<WordPanelId, string> = {
  home: 'หน้าแรก',
  insert: 'แทรก',
  layout: 'เค้าโครง',
  table: 'เค้าโครงตาราง',
  math: 'MathType',
  review: 'รีวิว',
  find: 'ค้นหาและแทนที่',
  keys: 'แป้นลัดโหมดเอกสาร',
};

export type TableOp = 'rowAbove' | 'rowBelow' | 'colLeft' | 'colRight' | 'delRow' | 'delCol' | 'delTable' | 'header';

/** คำสั่งที่แผงเรียกใช้กับตัวแก้ไขเอกสาร (ทำกับที่ที่กำลังพิมพ์: เนื้อเอกสาร หรือหัว/ท้ายกระดาษ) */
export interface WordApi {
  cmd: (c: string, v?: string) => void;
  insertHtml: (h: string) => void;
  /** หน่วย pt */
  setSize: (pt: number) => void;
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
  /** ตั้งค่าหน้ากระดาษ (ขอบ หัว/ท้ายกระดาษ เลขหน้า) */
  opt: WordOpt;
  setOpt: (p: Partial<WordOpt>) => void;
  /** รูปร่างที่กำลังรอวาด (ลากบนกระดาษ) */
  drawing: string | null;
  drawShape: (id: string) => void;
  /** เปิดแก้หัว/ท้ายกระดาษ (เหมือนดับเบิลคลิกขอบกระดาษ) */
  editHf: (part: 'head' | 'foot') => void;
  /** ตัด / คัดลอก / วาง (คืนข้อความเตือนถ้าเบราว์เซอร์ไม่ยอม) */
  clip: (op: 'cut' | 'copy' | 'paste') => Promise<string | null>;
  selectAll: () => void;
  openFind: () => void;
}

/* ใช้กับปุ่มในแผง: ไม่แย่งเคอร์เซอร์จากเอกสาร */
const noFocus = (e: React.MouseEvent) => e.preventDefault();

const Sec = ({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) => (
  <section className="st-sec st-wgroup">
    <h3>{title}</h3>
    {note && <p className="st-note">{note}</p>}
    {children}
  </section>
);

/** ปุ่มไอคอนเล็ก (แบบปุ่มในกลุ่มฟอนต์/ย่อหน้าของ Word) */
const Tool = ({ title, onClick, children, on }: { title: string; onClick: () => void; children: React.ReactNode; on?: boolean }) => (
  <button type="button" className="st-wtool" data-on={on} title={title} aria-label={title} onMouseDown={noFocus} onClick={onClick}>
    {children}
  </button>
);

/** ปุ่มใหญ่ ไอคอนบน ชื่อล่าง (แบบปุ่มใหญ่บนริบบอนของ Word) */
const Tile = ({ label, icon, onClick, on, title }: { label: string; icon: React.ReactNode; onClick: () => void; on?: boolean; title?: string }) => (
  <button type="button" className="st-wtile" data-on={on} title={title ?? label} onMouseDown={noFocus} onClick={onClick}>
    <span className="st-wtile-ic">{icon}</span>
    <span className="st-wtile-tx">{label}</span>
  </button>
);

export function WordRail({ panel, onPick }: { panel: WordPanelId | null; onPick: (p: WordPanelId | null) => void }) {
  const on = panel === 'find' ? 'review' : panel;
  return (
    <nav className="st-rail" aria-label="เครื่องมือเอกสาร">
      {WORD_RAIL.map((r) => (
        <button key={r.id} type="button" className="st-rail-btn" data-on={on === r.id} onMouseDown={noFocus} onClick={() => onPick(on === r.id ? null : r.id)} style={{ ['--c' as string]: r.color }}>
          <span className="st-rail-ic">{r.icon}</span>
          <span className="st-rail-tx">{r.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function WordPanel({ id, api, onClose, layoutExtra, findFocus }: { id: WordPanelId; api: WordApi; onClose: () => void; layoutExtra?: React.ReactNode; findFocus: number }) {
  return (
    <aside className="st-panel st-wpanel" aria-label={TITLES[id]}>
      <div className="st-panel-head">
        <h2>{TITLES[id]}</h2>
        <button type="button" className="st-tb" onMouseDown={noFocus} onClick={onClose} aria-label="ปิดแผง">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="st-panel-body">
        {id === 'home' && <HomePanel api={api} />}
        {id === 'insert' && <InsertPanel api={api} />}
        {id === 'layout' && <LayoutPanel api={api} extra={layoutExtra} />}
        {id === 'math' && <MathPanel api={api} />}
        {id === 'table' && <TablePanel api={api} />}
        {id === 'review' && <ReviewPanel api={api} />}
        {id === 'find' && <FindPanel api={api} focus={findFocus} />}
        {id === 'keys' && <KeysPanel />}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ หน้าแรก (คลิปบอร์ด ฟอนต์ ย่อหน้า สไตล์ การแก้ไข) */

function HomePanel({ api }: { api: WordApi }) {
  const [msg, setMsg] = useState('');
  const clip = async (op: 'cut' | 'copy' | 'paste') => setMsg((await api.clip(op)) || '');
  return (
    <>
      <Sec title="คลิปบอร์ด">
        <div className="st-wtiles">
          <Tile label="วาง" icon={<ClipboardPaste className="w-5 h-5" />} onClick={() => clip('paste')} title="วาง (Ctrl+V)" />
          <Tile label="ตัด" icon={<Scissors className="w-5 h-5" />} onClick={() => clip('cut')} title="ตัด (Ctrl+X)" />
          <Tile label="คัดลอก" icon={<Copy className="w-5 h-5" />} onClick={() => clip('copy')} title="คัดลอก (Ctrl+C) วางใน Word ได้" />
        </div>
        {msg && <p className="st-note mt-1">{msg}</p>}
      </Sec>
      <Sec title="ฟอนต์">
        <div className="st-wrow">
          <select className="st-wsel st-wsel-grow" defaultValue="" onChange={(e) => (e.target.value && api.cmd('fontName', e.target.value), (e.target.value = ''))} aria-label="ฟอนต์">
            <option value="">เลือกฟอนต์</option>
            {Object.values(FONTS).map((f) => (
              <option key={f.label} value={f.family}>
                {f.label}
              </option>
            ))}
          </select>
          <select className="st-wsel" defaultValue="" onChange={(e) => (e.target.value && api.setSize(Number(e.target.value)), (e.target.value = ''))} aria-label="ขนาดตัวอักษร (pt)">
            <option value="">ขนาด</option>
            {SIZES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          <Tool title="ขยายตัวอักษร (Ctrl+Shift+>)" onClick={() => api.bumpSize(1, true)}>
            <AArrowUp className="w-4 h-4" />
          </Tool>
          <Tool title="ย่อตัวอักษร (Ctrl+Shift+<)" onClick={() => api.bumpSize(-1, true)}>
            <AArrowDown className="w-4 h-4" />
          </Tool>
        </div>
        <div className="st-wtools mt-2">
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
          <Tool title="ล้างการจัดรูปแบบ (Ctrl+Space)" onClick={() => api.cmd('removeFormat')}>
            <Eraser className="w-4 h-4" />
          </Tool>
        </div>
        <p className="st-wlabel">สีตัวอักษร</p>
        <Swatches colors={COLORS} onPick={(c) => api.cmd('foreColor', c)} />
        <p className="st-wlabel">ปากกาเน้นข้อความ</p>
        <Swatches colors={HILITES} onPick={(c) => api.cmd('hiliteColor', c)} none={() => api.cmd('hiliteColor', 'transparent')} />
        <p className="st-wlabel">เปลี่ยนตัวพิมพ์ (ภาษาอังกฤษ)</p>
        <div className="st-chips">
          <button type="button" onMouseDown={noFocus} onClick={() => api.changeCase('upper')}>
            ABC
          </button>
          <button type="button" onMouseDown={noFocus} onClick={() => api.changeCase('lower')}>
            abc
          </button>
          <button type="button" onMouseDown={noFocus} onClick={() => api.changeCase('title')}>
            Abc
          </button>
        </div>
      </Sec>
      <Sec title="ย่อหน้า">
        <div className="st-wtools">
          <Tool title="สัญลักษณ์แสดงหัวข้อ (Ctrl+Shift+L)" onClick={() => api.list(false, 'disc')}>
            <List className="w-4 h-4" />
          </Tool>
          <Tool title="ลำดับเลข" onClick={() => api.list(true, 'decimal')}>
            <ListOrdered className="w-4 h-4" />
          </Tool>
          <Tool title="ลดการเยื้อง (Ctrl+Shift+M)" onClick={() => api.indent(-1)}>
            <IndentDecrease className="w-4 h-4" />
          </Tool>
          <Tool title="เพิ่มการเยื้อง (Ctrl+M)" onClick={() => api.indent(1)}>
            <IndentIncrease className="w-4 h-4" />
          </Tool>
        </div>
        <div className="st-wtools mt-2">
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
        <p className="st-wlabel">รูปแบบหัวข้อย่อย / ลำดับเลข</p>
        <div className="st-chips">
          {[
            [false, 'disc', '●'],
            [false, 'circle', '○'],
            [false, 'square', '■'],
            [true, 'decimal', '1.'],
            [true, 'thai', '๑.'],
            [true, 'lower-alpha', 'a.'],
            [true, 'upper-alpha', 'A.'],
            [true, 'lower-roman', 'i.'],
          ].map(([o, t, s]) => (
            <button key={String(t)} type="button" onMouseDown={noFocus} onClick={() => api.list(o as boolean, t as string)}>
              {s as string}
            </button>
          ))}
        </div>
        <p className="st-wlabel">ระยะห่างบรรทัด</p>
        <div className="st-chips">
          {['1', '1.15', '1.5', '2', '2.5', '3'].map((v) => (
            <button key={v} type="button" onMouseDown={noFocus} onClick={() => api.setLine(v)}>
              {v}
            </button>
          ))}
        </div>
        <p className="st-wlabel">แรเงาย่อหน้า</p>
        <Swatches colors={SHADES} onPick={(c) => api.blockStyle('background-color', c)} none={() => api.blockStyle('background-color', '')} />
      </Sec>
      <Sec title="สไตล์">
        <div className="st-wstyles">
          {[
            ['p', 'ปกติ', 'st-ws-p'],
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
      <Sec title="การแก้ไข">
        <div className="st-wtiles">
          <Tile label="ค้นหา" icon={<Search className="w-5 h-5" />} onClick={api.openFind} title="ค้นหา (Ctrl+F)" />
          <Tile label="แทนที่" icon={<Replace className="w-5 h-5" />} onClick={api.openFind} title="แทนที่ (Ctrl+H)" />
          <Tile label="เลือกทั้งหมด" icon={<TextSelect className="w-5 h-5" />} onClick={api.selectAll} title="เลือกทั้งหมด (Ctrl+A)" />
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

/* ------------------------------------------------------------------ แทรก (หน้า ตาราง ภาพประกอบ หัว/ท้ายกระดาษ ข้อความ สัญลักษณ์) */

function InsertPanel({ api }: { api: WordApi }) {
  const [hv, setHv] = useState<[number, number]>([0, 0]);
  const [sym, setSym] = useState(false);
  const today = () => new Date().toLocaleDateString('th-TH', { dateStyle: 'long' });
  return (
    <>
      <Sec title="หน้า">
        <div className="st-wtiles">
          <Tile label="หน้าเปล่า" icon={<FilePlus className="w-5 h-5" />} onClick={() => api.insertHtml('<div data-pb="1"></div><p><br></p><div data-pb="1"></div><p><br></p>')} />
          <Tile label="ตัวแบ่งหน้า" icon={<FileDown className="w-5 h-5" />} onClick={() => api.insertHtml('<div data-pb="1"></div><p><br></p>')} title="ตัวแบ่งหน้า (Ctrl+Enter)" />
          <Tile label="เส้นคั่น" icon={<Minus className="w-5 h-5" />} onClick={() => api.insertHtml('<hr><p><br></p>')} />
        </div>
      </Sec>
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
      <Sec title="ภาพประกอบ">
        <div className="st-wtiles">
          <Tile label="รูปภาพ" icon={<ImagePlus className="w-5 h-5" />} onClick={api.pickImage} />
          <Tile label="กราฟ/รูปคณิต" icon={<LineChart className="w-5 h-5" />} onClick={api.addGraph} />
        </div>
        <p className="st-wlabel">รูปร่าง {api.drawing ? '(ลากบนกระดาษเพื่อวาด กด Esc ยกเลิก)' : '(เลือกแล้วลากบนกระดาษ)'}</p>
        <div className="st-wshapes">
          <button type="button" data-on={api.drawing === 'ln'} onMouseDown={noFocus} onClick={() => api.drawShape('ln')} title="เส้นตรง" aria-label="เส้นตรง">
            <svg viewBox="0 0 100 100">
              <path d="M8,92 L92,8" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            </svg>
          </button>
          {SHAPES.map((s) => (
            <button key={s.id} type="button" data-on={api.drawing === s.id} onMouseDown={noFocus} onClick={() => api.drawShape(s.id)} title={s.label} aria-label={s.label}>
              <svg viewBox="-4 -4 108 108">
                <path d={s.d} fill="#dbeafe" fillRule="evenodd" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </Sec>
      <HeadFoot api={api} />
      <Sec title="ข้อความ">
        <div className="st-wtiles">
          <Tile label="วันที่" icon={<CalendarDays className="w-5 h-5" />} onClick={() => api.insertHtml(`${today()}&nbsp;`)} />
          <Tile label="เวลา" icon={<Clock className="w-5 h-5" />} onClick={() => api.insertHtml(`${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.&nbsp;`)} />
          <Tile label="ช่องชื่อ ชั้น เลขที่" icon={<PanelTop className="w-5 h-5" />} onClick={() => api.insertHtml('<p>ชื่อ ............................................................. ชั้น ............ เลขที่ ............</p><p><br></p>')} />
          <Tile label="เส้นเขียนคำตอบ" icon={<Heading className="w-5 h-5" />} onClick={() => api.insertHtml(`${'<p>...............................................................................................................</p>'.repeat(3)}<p><br></p>`)} />
        </div>
        <p className="st-wlabel">อักษรศิลป์</p>
        <div className="st-wart">
          {WORDART.map((a) => (
            <button key={a.c} type="button" onMouseDown={noFocus} onClick={() => api.insertHtml(`<span style="font-size: 48px; font-weight: 700; color: ${a.c}">อักษรศิลป์</span>&nbsp;`)} style={{ color: a.c }}>
              {a.label}
            </button>
          ))}
        </div>
      </Sec>
      <Sec title="สัญลักษณ์">
        <div className="st-wtiles">
          <Tile label="สมการ" icon={<Sigma className="w-5 h-5" />} onClick={() => api.addMath(false)} title="สมการ (Alt+=)" />
          <Tile label="สัญลักษณ์" icon={<Omega className="w-5 h-5" />} onClick={() => setSym(!sym)} on={sym} />
        </div>
        {sym && (
          <div className="st-wsym st-wsym-panel mt-2">
            {[...SYMBOLS, ...MORE_SYMBOLS].map((s) => (
              <button key={s} type="button" onMouseDown={noFocus} onClick={() => api.insertHtml(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
      </Sec>
    </>
  );
}

const WORDART = [
  { c: '#7c3aed', label: 'ม่วง' },
  { c: '#2563eb', label: 'ฟ้า' },
  { c: '#dc2626', label: 'แดง' },
  { c: '#16a34a', label: 'เขียว' },
  { c: '#ea580c', label: 'ส้ม' },
  { c: '#1f1b36', label: 'ดำ' },
];

/** หัวกระดาษ ท้ายกระดาษ เลขหน้า (แบบ Word: แทรก > หัวกระดาษ/ท้ายกระดาษ/หมายเลขหน้า) */
function HeadFoot({ api }: { api: WordApi }) {
  const o = api.opt;
  const chip = <K extends keyof WordOpt>(k: K, v: WordOpt[K], label: string) => (
    <button key={String(v)} type="button" data-on={o[k] === v} onMouseDown={noFocus} onClick={() => api.setOpt({ [k]: v } as Partial<WordOpt>)}>
      {label}
    </button>
  );
  return (
    <Sec title="หัวกระดาษและท้ายกระดาษ" note="ดับเบิลคลิกที่ขอบบน/ล่างของกระดาษก็แก้ได้ ใส่ข้อความ รูป สมการ ได้ ขึ้นทุกหน้า">
      <div className="st-wtiles">
        <Tile label="หัวกระดาษ" icon={<ArrowUpToLine className="w-5 h-5" />} onClick={() => api.editHf('head')} />
        <Tile label="ท้ายกระดาษ" icon={<ArrowDownToLine className="w-5 h-5" />} onClick={() => api.editHf('foot')} />
      </div>
      {(o.head || o.foot) && (
        <div className="st-chips mt-2">
          {o.head && (
            <button type="button" onMouseDown={noFocus} onClick={() => api.setOpt({ head: '' })}>
              ลบหัวกระดาษ
            </button>
          )}
          {o.foot && (
            <button type="button" onMouseDown={noFocus} onClick={() => api.setOpt({ foot: '' })}>
              ลบท้ายกระดาษ
            </button>
          )}
        </div>
      )}
      <p className="st-wlabel">หมายเลขหน้า</p>
      <div className="st-chips">
        {chip('num', 'none', 'ไม่ใส่')}
        {chip('num', 'top', 'ด้านบน')}
        {chip('num', 'bottom', 'ด้านล่าง')}
      </div>
      {o.num !== 'none' && (
        <>
          <div className="st-chips mt-2">
            {chip('numAlign', 'left', 'ซ้าย')}
            {chip('numAlign', 'center', 'กลาง')}
            {chip('numAlign', 'right', 'ขวา')}
          </div>
          <div className="st-chips mt-2">{NUM_FMTS.map((f) => chip('numFmt', f.id, f.label))}</div>
          <label className="st-wfield mt-2">
            เริ่มที่เลข
            <input type="number" min={0} max={9999} value={o.numStart} onChange={(e) => api.setOpt({ numStart: Math.max(0, Math.min(9999, Math.round(+e.target.value) || 0)) })} />
          </label>
        </>
      )}
      <label className="st-wcheck mt-2">
        <input type="checkbox" checked={!o.numFirst} onChange={(e) => api.setOpt({ numFirst: !e.target.checked })} />
        หน้าแรกแตกต่าง (ไม่แสดงหัว/ท้ายกระดาษและเลขหน้าที่หน้าแรก)
      </label>
    </Sec>
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

/* ------------------------------------------------------------------ เค้าโครง (ระยะขอบ ขนาด ตัวแบ่ง ย่อหน้า) */

function LayoutPanel({ api, extra }: { api: WordApi; extra?: React.ReactNode }) {
  const o = api.opt;
  const cm = (px: number) => Math.round((px / 96) * 2.54 * 100) / 100;
  // ใส่ค่าเสร็จ (ออกจากช่อง/Enter) ค่อยบันทึก จะได้พิมพ์ทศนิยมได้
  const margin = (k: 'mt' | 'mb' | 'ml' | 'mr', label: string) => (
    <label className="st-wfield" key={k}>
      {label}
      <input
        key={o[k]}
        type="number"
        step={0.1}
        min={0}
        max={7}
        defaultValue={cm(o[k])}
        onBlur={(e) => api.setOpt({ [k]: Math.round(Math.max(0, Math.min(7, +e.target.value || 0)) * (96 / 2.54)) })}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <small>ซม.</small>
    </label>
  );
  return (
    <>
      {!o.std && (
        <Sec title="มาตรฐาน Word" note="เอกสารนี้สร้างก่อนมีค่ามาตรฐาน Word กดเพื่อใช้ฟอนต์ TH Sarabun ขนาดตรงกับ Word ระยะบรรทัดเดี่ยว และขอบ 2.54 ซม.">
          <div className="st-wbig">
            <button type="button" onMouseDown={noFocus} onClick={() => api.setOpt({ std: true, mt: 96, mb: 96, ml: 96, mr: 96 })}>
              <Ruler className="w-4 h-4" /> ใช้ค่ามาตรฐาน Word
            </button>
          </div>
        </Sec>
      )}
      <Sec title="ระยะขอบ">
        <div className="st-wbig">
          {MARGIN_PRESETS.map((p) => (
            <button key={p.id} type="button" data-on={o.mt === p.m[0] && o.mb === p.m[1] && o.ml === p.m[2] && o.mr === p.m[3]} onMouseDown={noFocus} onClick={() => api.setOpt({ mt: p.m[0], mb: p.m[1], ml: p.m[2], mr: p.m[3] })}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="st-wmargins mt-2">
          {margin('mt', 'บน')}
          {margin('mb', 'ล่าง')}
          {margin('ml', 'ซ้าย')}
          {margin('mr', 'ขวา')}
        </div>
      </Sec>
      {extra && <Sec title="ขนาดและการวางแนวกระดาษ">{extra}</Sec>}
      <Sec title="ตัวแบ่ง">
        <div className="st-wtiles">
          <Tile label="ตัวแบ่งหน้า" icon={<FileDown className="w-5 h-5" />} onClick={() => api.insertHtml('<div data-pb="1"></div><p><br></p>')} title="ตัวแบ่งหน้า (Ctrl+Enter)" />
        </div>
      </Sec>
      <Sec title="ย่อหน้า: การเยื้อง">
        <div className="st-wtiles">
          <Tile label="ลดการเยื้อง" icon={<IndentDecrease className="w-5 h-5" />} onClick={() => api.indent(-1)} title="ลดการเยื้อง (Ctrl+Shift+M)" />
          <Tile label="เพิ่มการเยื้อง" icon={<IndentIncrease className="w-5 h-5" />} onClick={() => api.indent(1)} title="เพิ่มการเยื้อง (Ctrl+M)" />
          <Tile label="เยื้องบรรทัดแรก" icon={<PilcrowSquare className="w-5 h-5" />} onClick={() => api.blockStyle('text-indent', '2.5em')} />
          <Tile label="ไม่เยื้องบรรทัดแรก" icon={<AlignLeft className="w-5 h-5" />} onClick={() => api.blockStyle('text-indent', '')} />
        </div>
      </Sec>
    </>
  );
}

/* ------------------------------------------------------------------ รีวิว (นับคำ ค้นหา) */

function ReviewPanel({ api }: { api: WordApi }) {
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
      <Sec title="การตรวจทาน">
        <div className="st-wtiles">
          <Tile label="ค้นหาและแทนที่" icon={<Search className="w-5 h-5" />} onClick={api.openFind} title="ค้นหา (Ctrl+F) / แทนที่ (Ctrl+H)" />
          <Tile label="นับคำใหม่" icon={<BarChart3 className="w-5 h-5" />} onClick={count} />
        </div>
      </Sec>
      <Sec title="จำนวนคำ">
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
