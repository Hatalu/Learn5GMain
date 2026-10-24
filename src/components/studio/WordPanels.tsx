'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Replace, Search, X } from 'lucide-react';
import { WORD_KEYS, comboLabel } from '@/lib/studio/keys';
import type { WordOpt } from '@/lib/studio/flow';
import type { FontId } from '@/lib/studio/doc';

/** ขนาดตัวอักษรหน่วย pt เหมือนรายการใน Word (ตัวปกติของเอกสาร = 16pt แบบ TH Sarabun) */
export const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 60, 72];
export const ptToPx = (pt: number) => Math.round(((pt * 4) / 3) * 100) / 100;
export const pxToPt = (px: number) => Math.round(px * 0.75 * 2) / 2;
export const SYMBOLS = ['°', '±', '×', '÷', '≤', '≥', '≠', '≈', '≡', 'π', '√', '∞', '∠', '△', '⊥', '∥', '∴', '∵', '→', '⇒', '⇔', '∈', '∉', '⊂', '∪', '∩', '∅', 'ℝ', 'α', 'β', 'θ', 'Δ', 'Σ', 'μ', 'σ', '½', '¼', '¾', '²', '³'];
export const MORE_SYMBOLS = ['←', '↑', '↓', '↔', '⇐', '∀', '∃', '¬', '∧', '∨', '⊆', '⊇', '∑', '∏', '∫', '∂', '∇', '∝', '‰', '℃', '℉', 'Ω', 'λ', 'φ', 'ω', 'γ', 'δ', 'ε', '⅓', '⅔', '⅛', '¹', '⁴', '•', '◦', '▪', '★', '☆', '✓', '✗', '□', '■', '○', '●', '◇', '◆', '♀', '♂', '“', '”', '…', '–', '—', '฿', '§', '¶', '©'];

export const COLORS = ['#1f1b36', '#4b5563', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0d9488', '#2563eb', '#4f46e5', '#7c3aed', '#c026d3', '#db2777'];
export const HILITES = ['#fff3c4', '#fde68a', '#bbf7d0', '#bae6fd', '#ddd6fe', '#fbcfe8', '#fed7aa', '#e5e7eb'];
export const SHADES = ['#f8fafc', '#fef9c3', '#dcfce7', '#e0f2fe', '#ede9fe', '#fce7f3', '#ffedd5', '#f1f5f9'];

/** สูตรสำเร็จรูปที่ครูใช้บ่อย (แทรกเป็นสมการ แก้ต่อได้) */
export const FORMULAS: { tex: string; label: string }[] = [
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
export type TableOp = 'rowAbove' | 'rowBelow' | 'colLeft' | 'colRight' | 'delRow' | 'delCol' | 'delTable' | 'header';

/** คำสั่งที่แผงเรียกใช้กับตัวแก้ไขเอกสาร (ทำกับที่ที่กำลังพิมพ์: เนื้อเอกสาร หรือหัว/ท้ายกระดาษ) */
export interface WordApi {
  cmd: (c: string, v?: string) => void;
  /** เปลี่ยนฟอนต์ (เก็บแบบไม่ผูกกับชื่อไฟล์ฟอนต์ของ build) */
  setFont: (id: FontId) => void;
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
  /** ใส่ช่องเลขหน้าที่เคอร์เซอร์ (ในหัว/ท้ายกระดาษ) */
  insertPageNum: () => void;
  /** รูปร่างที่กำลังรอวาด (ลากบนกระดาษ) */
  drawing: string | null;
  drawShape: (id: string) => void;
  /** เปิดแก้หัว/ท้ายกระดาษ (เหมือนดับเบิลคลิกขอบกระดาษ) */
  editHf: (part: 'head' | 'foot') => void;
  /** ตัด / คัดลอก / วาง (คืนข้อความเตือนถ้าเบราว์เซอร์ไม่ยอม) */
  clip: (op: 'cut' | 'copy' | 'paste') => Promise<string | null>;
  selectAll: () => void;
  openFind: () => void;
  openKeys: () => void;
  closePane: () => void;
  /** การอ้างอิง > สารบัญ (จากหัวเรื่อง 1-3) */
  toc: () => void;
}

/** บานหน้าต่างด้านซ้ายแบบ Word (ค้นหา = บานหน้าต่างนำทาง, แป้นลัด) เครื่องมืออื่นอยู่บนริบบอน (WordRibbon) */
export type WordPanelId = 'find' | 'keys';
const TITLES: Record<WordPanelId, string> = { find: 'ค้นหาและแทนที่', keys: 'แป้นลัดโหมดเอกสาร' };

const Sec = ({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) => (
  <section className="st-sec st-wgroup">
    <h3>{title}</h3>
    {note && <p className="st-note">{note}</p>}
    {children}
  </section>
);
const noFocus = (e: React.MouseEvent) => e.preventDefault();

export function WordPanel({ id, api, onClose, findFocus }: { id: WordPanelId; api: WordApi; onClose: () => void; findFocus: number }) {
  return (
    <aside className="st-panel st-wpanel" aria-label={TITLES[id]}>
      <div className="st-panel-head">
        <h2>{TITLES[id]}</h2>
        <button type="button" className="st-tb" onMouseDown={noFocus} onClick={onClose} aria-label="ปิดแผง">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="st-panel-body">
        {id === 'find' && <FindPanel api={api} focus={findFocus} />}
        {id === 'keys' && <KeysPanel />}
      </div>
    </aside>
  );
}

export const WORDART = [
  { c: '#7c3aed', label: 'ม่วง' },
  { c: '#2563eb', label: 'ฟ้า' },
  { c: '#dc2626', label: 'แดง' },
  { c: '#16a34a', label: 'เขียว' },
  { c: '#ea580c', label: 'ส้ม' },
  { c: '#1f1b36', label: 'ดำ' },
];

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
