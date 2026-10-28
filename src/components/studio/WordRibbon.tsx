'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  ArrowUpDown,
  ArrowUpToLine,
  Baseline,
  Bold,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ClipboardPaste,
  Copy,
  Eraser,
  Eye,
  FileDown,
  FilePlus,
  Frame,
  Hash,
  Heading,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Keyboard,
  LineChart,
  List,
  ListOrdered,
  ListTree,
  Minus,
  Omega,
  PaintBucket,
  PanelBottom,
  PanelTop,
  PenLine,
  PilcrowSquare,
  Plus,
  Replace,
  Ruler,
  Scissors,
  Search,
  Shapes,
  Sigma,
  SpellCheck,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  TextSelect,
  Trash2,
  Type,
  Underline,
  BarChart3,
  AlignCenterHorizontal,
} from 'lucide-react';
import { texToHtml } from '@/components/creator/math/MathText';
import { MathKeysDialog } from '@/components/creator/math/MathKeys';
import { MARGIN_PRESETS, NUM_FMTS, type WordOpt } from '@/lib/studio/flow';
import { FONTS, FONT_PREVIEW_SCALE } from './fonts';
import type { FontId } from '@/lib/studio/doc';
import { SHAPES } from './shapes';
import { COLORS, FORMULAS, HILITES, MORE_SYMBOLS, SHADES, SIZES, SYMBOLS, WORDART, type WordApi } from './WordPanels';

/**
 * ริบบอนแบบ Microsoft Word (ด้านบน): แท็บ หน้าแรก แทรก เค้าโครง การอ้างอิง รีวิว มุมมอง MathType
 * + แท็บตามบริบท (เค้าโครงตาราง / รูปแบบรูปร่างหรือรูปภาพ) ลำดับกลุ่มและปุ่มตาม Word จริง สีและปุ่มตามธีมเว็บ
 */

export type RibbonTab = 'home' | 'insert' | 'layout' | 'refs' | 'review' | 'view' | 'math' | 'table' | 'object';

const TABS: { id: RibbonTab; label: string }[] = [
  { id: 'home', label: 'หน้าแรก' },
  { id: 'insert', label: 'แทรก' },
  { id: 'layout', label: 'เค้าโครง' },
  { id: 'refs', label: 'การอ้างอิง' },
  { id: 'review', label: 'รีวิว' },
  { id: 'view', label: 'มุมมอง' },
  { id: 'math', label: 'MathType' },
];

const noFocus = (e: React.MouseEvent) => e.preventDefault();

/** กลุ่มบนริบบอน (ชื่อกลุ่มอยู่ด้านล่างแบบ Word) */
const G = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="st-rgroup" role="group" aria-label={label}>
    <div className="st-rgroup-body">{children}</div>
    <div className="st-rgroup-label">{label}</div>
  </div>
);
/** ปุ่มใหญ่ (ไอคอนบน ชื่อล่าง) */
const Big = ({ label, icon, onClick, title, on }: { label: string; icon: React.ReactNode; onClick: () => void; title?: string; on?: boolean }) => (
  <button type="button" className="st-rbig" data-on={on} title={title ?? label} onMouseDown={noFocus} onClick={onClick}>
    <span className="st-rbig-ic">{icon}</span>
    <span className="st-rbig-tx">{label}</span>
  </button>
);
/** ปุ่มเล็ก (ไอคอน + ชื่อถ้ามี) */
const Btn = ({ title, icon, label, onClick, on }: { title: string; icon: React.ReactNode; label?: string; onClick: () => void; on?: boolean }) => (
  <button type="button" className="st-rbtn" data-on={on} title={title} aria-label={title} onMouseDown={noFocus} onClick={onClick}>
    {icon}
    {label && <span>{label}</span>}
  </button>
);
const Col = ({ children }: { children: React.ReactNode }) => <div className="st-rcol">{children}</div>;
const Row = ({ children }: { children: React.ReactNode }) => <div className="st-rrow">{children}</div>;

/** ปุ่มที่มีรายการเลือกห้อยลงมา (แกลเลอรีแบบ Word) วางลอยนอกริบบอนจะได้ไม่ถูกตัด */
function Drop({ label, icon, big, title, children, width = 260 }: { label?: string; icon: React.ReactNode; big?: boolean; title: string; children: (close: () => void) => React.ReactNode; width?: number }) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!at) return;
    const off = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!t.closest?.('.st-rpop') && !btn.current?.contains(t)) setAt(null);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAt(null);
    window.addEventListener('pointerdown', off, true);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', off, true);
      window.removeEventListener('keydown', esc);
    };
  }, [at]);
  const open = () => {
    const r = btn.current!.getBoundingClientRect();
    setAt(at ? null : { x: Math.max(8, Math.min(window.innerWidth - width - 8, r.left)), y: r.bottom + 4 });
  };
  const host = btn.current?.closest('.st-shell') ?? (typeof document !== 'undefined' ? document.body : null);
  return (
    <>
      <button ref={btn} type="button" className={big ? 'st-rbig' : 'st-rbtn'} data-on={!!at} title={title} aria-label={title} aria-expanded={!!at} onMouseDown={noFocus} onClick={open}>
        {big ? <span className="st-rbig-ic">{icon}</span> : icon}
        {label && <span className={big ? 'st-rbig-tx' : undefined}>{label}</span>}
        <ChevronDown className="st-rcaret" />
      </button>
      {at &&
        host &&
        createPortal(
          <div
            className="st-rpop"
            role="dialog"
            aria-label={title}
            style={{ left: at.x, top: at.y, width }}
            onMouseDown={(e) => {
              // ช่องกรอกในป๊อปอัปต้องรับโฟกัสได้ ปุ่มอื่นไม่แย่งเคอร์เซอร์จากเอกสาร
              if (!/^(INPUT|SELECT|TEXTAREA)$/.test((e.target as HTMLElement).tagName)) e.preventDefault();
            }}
          >
            {children(() => setAt(null))}
          </div>,
          host
        )}
    </>
  );
}

const Swatches = ({ colors, onPick, none }: { colors: string[]; onPick: (c: string) => void; none?: () => void }) => (
  <div className="st-wsw">
    {none && (
      <button type="button" className="st-wsw-none" onMouseDown={noFocus} onClick={none} aria-label="ไม่มีสี" title="ไม่มีสี">
        <Eraser className="w-4 h-4" />
      </button>
    )}
    {colors.map((c) => (
      <button key={c} type="button" style={{ background: c }} onMouseDown={noFocus} onClick={() => onPick(c)} aria-label={c} title={c} />
    ))}
  </div>
);

export function WordRibbon({
  api,
  sizeNow,
  fontNow,
  blockTag,
  isOn,
  inTable,
  object,
  objectLabel,
  layoutExtra,
  hf,
  closeHf,
  drawing,
  side,
  pane,
}: {
  api: WordApi;
  sizeNow: number;
  /** ฟอนต์ตรงเคอร์เซอร์ (family ของ FONTS) */
  fontNow: FontId | '';
  blockTag: string;
  isOn: (c: string) => boolean;
  inTable: boolean;
  /** เครื่องมือของชิ้นที่เลือก (รูปร่าง/รูปภาพ/กราฟ/สมการ) แสดงเป็นแท็บตามบริบท */
  object: React.ReactNode;
  objectLabel: string;
  layoutExtra?: React.ReactNode;
  hf: 'head' | 'foot' | null;
  closeHf: () => void;
  drawing: string | null;
  /** ซ้าย = แท็บหลักเรียงลง (หน้าแรก แทรก ...) / ขวา = บานจัดรูปแบบตามบริบท (รูปร่าง รูปภาพ ตาราง) แบบบาน Format ของ Word */
  side: 'left' | 'right' | 'top';
  /** บานที่เปิดแทนแท็บด้านซ้าย (ค้นหา/แป้นลัด) */
  pane?: React.ReactNode;
}) {
  const [tab, setTab] = useState<RibbonTab>('home');
  // จอใหญ่เปิดแผงแท็บไว้เลย จอเล็กปิดไว้ให้กระดาษเต็มจอ
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) setOpen(true);
    // ริบบอนด้านบน: จอเล็กเริ่มแบบย่อ (เหลือแถวแท็บ) ให้เห็นกระดาษ
    else setMin(true);
  }, []);
  const [keysOpen, setKeysOpen] = useState(false);
  const [min, setMin] = useState(false);
  // เลือกรูป/รูปร่าง/สมการแล้วเปิดแท็บตามบริบทเองแบบ Word
  useEffect(() => {
    if (side === 'top' && object) setTab('object');
  }, [side, !!object]); // eslint-disable-line react-hooks/exhaustive-deps
  const [clipMsg, setClipMsg] = useState('');
  const clip = async (op: 'cut' | 'copy' | 'paste') => {
    const m = await api.clip(op);
    setClipMsg(m || '');
    if (m) window.setTimeout(() => setClipMsg(''), 3500);
  };
  const o = api.opt;
  const today = () => new Date().toLocaleDateString('th-TH', { dateStyle: 'long' });

  const render = (cur: RibbonTab) => {
    switch (cur) {
      case 'home':
        return (
          <>
            <G label="คลิปบอร์ด">
              <Big label="วาง" icon={<ClipboardPaste />} onClick={() => clip('paste')} title="วาง (Ctrl+V)" />
              <Col>
                <Btn title="ตัด (Ctrl+X)" icon={<Scissors />} label="ตัด" onClick={() => clip('cut')} />
                <Btn title="คัดลอก (Ctrl+C) วางใน Word ได้" icon={<Copy />} label="คัดลอก" onClick={() => clip('copy')} />
              </Col>
            </G>
            <G label="ฟอนต์">
              <Col>
                <Row>
                  <Drop label={fontNow ? FONTS[fontNow].label : 'ฟอนต์'} icon={null} title="ฟอนต์" width={250}>
                    {(close) => (
                      <div className="st-rfonts" role="listbox" aria-label="ฟอนต์">
                        {(Object.keys(FONTS) as FontId[]).map((id) => (
                          <button
                            key={id}
                            type="button"
                            role="option"
                            aria-selected={fontNow === id}
                            data-on={fontNow === id}
                            onClick={() => (api.setFont(id), close())}
                            style={{ fontFamily: FONTS[id].family, fontSize: 17 * (FONT_PREVIEW_SCALE[id] ?? 1) }}
                          >
                            {FONTS[id].label}
                          </button>
                        ))}
                      </div>
                    )}
                  </Drop>
                  <select className="st-rsel" value={String(sizeNow)} onChange={(e) => api.setSize(Number(e.target.value))} aria-label="ขนาดฟอนต์ (pt)" title="ขนาดฟอนต์">
                    {!SIZES.includes(sizeNow) && <option value={sizeNow}>{sizeNow}</option>}
                    {SIZES.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                  <Btn title="เพิ่มขนาดฟอนต์ (Ctrl+Shift+>)" icon={<AArrowUp />} onClick={() => api.bumpSize(1, true)} />
                  <Btn title="ลดขนาดฟอนต์ (Ctrl+Shift+<)" icon={<AArrowDown />} onClick={() => api.bumpSize(-1, true)} />
                  <Drop title="เปลี่ยนตัวพิมพ์" icon={<span className="st-raa">Aa</span>} width={170}>
                    {(close) => (
                      <div className="st-rlist">
                        {(
                          [
                            ['upper', 'ตัวพิมพ์ใหญ่ทั้งหมด'],
                            ['lower', 'ตัวพิมพ์เล็กทั้งหมด'],
                            ['title', 'ขึ้นต้นด้วยตัวใหญ่'],
                          ] as const
                        ).map(([m, l]) => (
                          <button key={m} type="button" onClick={() => (api.changeCase(m), close())}>
                            {l}
                          </button>
                        ))}
                      </div>
                    )}
                  </Drop>
                  <Btn title="ล้างการจัดรูปแบบทั้งหมด (Ctrl+Space)" icon={<Eraser />} onClick={() => api.cmd('removeFormat')} />
                </Row>
                <Row>
                  <Btn title="ตัวหนา (Ctrl+B)" icon={<Bold />} onClick={() => api.cmd('bold')} on={isOn('bold')} />
                  <Btn title="ตัวเอียง (Ctrl+I)" icon={<Italic />} onClick={() => api.cmd('italic')} on={isOn('italic')} />
                  <Btn title="ขีดเส้นใต้ (Ctrl+U)" icon={<Underline />} onClick={() => api.cmd('underline')} on={isOn('underline')} />
                  <Btn title="ขีดทับ" icon={<Strikethrough />} onClick={() => api.cmd('strikeThrough')} on={isOn('strikeThrough')} />
                  <Btn title="ตัวห้อย (Ctrl+=)" icon={<Subscript />} onClick={() => api.cmd('subscript')} on={isOn('subscript')} />
                  <Btn title="ตัวยก (Ctrl+Shift+=)" icon={<Superscript />} onClick={() => api.cmd('superscript')} on={isOn('superscript')} />
                  <Drop title="สีเน้นข้อความ" icon={<Highlighter />}>
                    {(close) => <Swatches colors={HILITES} onPick={(c) => (api.cmd('hiliteColor', c), close())} none={() => (api.cmd('hiliteColor', 'transparent'), close())} />}
                  </Drop>
                  <Drop title="สีฟอนต์" icon={<Baseline />}>
                    {(close) => <Swatches colors={COLORS} onPick={(c) => (api.cmd('foreColor', c), close())} />}
                  </Drop>
                </Row>
              </Col>
            </G>
            <G label="ย่อหน้า">
              <Col>
                <Row>
                  <Drop title="สัญลักษณ์แสดงหัวข้อย่อย" icon={<List />} width={190}>
                    {(close) => (
                      <div className="st-rgrid3">
                        {[
                          ['disc', '●'],
                          ['circle', '○'],
                          ['square', '■'],
                        ].map(([t, s]) => (
                          <button key={t} type="button" onClick={() => (api.list(false, t), close())}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </Drop>
                  <Drop title="ลำดับเลข" icon={<ListOrdered />} width={220}>
                    {(close) => (
                      <div className="st-rgrid3">
                        {[
                          ['decimal', '1. 2. 3.'],
                          ['thai', '๑. ๒. ๓.'],
                          ['lower-alpha', 'a. b. c.'],
                          ['upper-alpha', 'A. B. C.'],
                          ['lower-roman', 'i. ii. iii.'],
                          ['upper-roman', 'I. II. III.'],
                        ].map(([t, s]) => (
                          <button key={t} type="button" onClick={() => (api.list(true, t), close())}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </Drop>
                  <Btn title="ลดการเยื้อง (Ctrl+Shift+M)" icon={<IndentDecrease />} onClick={() => api.indent(-1)} />
                  <Btn title="เพิ่มการเยื้อง (Ctrl+M)" icon={<IndentIncrease />} onClick={() => api.indent(1)} />
                </Row>
                <Row>
                  <Btn title="จัดชิดซ้าย (Ctrl+L)" icon={<AlignLeft />} onClick={() => api.cmd('justifyLeft')} on={isOn('justifyLeft')} />
                  <Btn title="จัดกึ่งกลาง (Ctrl+E)" icon={<AlignCenter />} onClick={() => api.cmd('justifyCenter')} on={isOn('justifyCenter')} />
                  <Btn title="จัดชิดขวา (Ctrl+R)" icon={<AlignRight />} onClick={() => api.cmd('justifyRight')} on={isOn('justifyRight')} />
                  <Btn title="จัดแนวกระจาย (Ctrl+J)" icon={<AlignJustify />} onClick={() => api.cmd('justifyFull')} on={isOn('justifyFull')} />
                  <Drop title="ระยะห่างบรรทัดและย่อหน้า" icon={<ArrowUpDown />} width={150}>
                    {(close) => (
                      <div className="st-rlist">
                        {['1.0', '1.15', '1.5', '2.0', '2.5', '3.0'].map((v) => (
                          <button key={v} type="button" onClick={() => (api.setLine(String(parseFloat(v))), close())}>
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                  </Drop>
                  <Drop title="แรเงา" icon={<PaintBucket />}>
                    {(close) => <Swatches colors={SHADES} onPick={(c) => (api.blockStyle('background-color', c), close())} none={() => (api.blockStyle('background-color', ''), close())} />}
                  </Drop>
                </Row>
              </Col>
            </G>
            <G label="สไตล์">
              <div className="st-rstyles">
                {[
                  ['p', 'ปกติ', 'st-ws-p'],
                  ['h1', 'หัวเรื่อง 1', 'st-ws-h1'],
                  ['h2', 'หัวเรื่อง 2', 'st-ws-h2'],
                  ['h3', 'หัวเรื่อง 3', 'st-ws-h3'],
                  ['blockquote', 'คำอ้างอิง', 'st-ws-q'],
                ].map(([t, l, c]) => (
                  <button key={t} type="button" className={c} data-on={(blockTag === t || (t === 'p' && !['h1', 'h2', 'h3', 'blockquote'].includes(blockTag))) || undefined} onMouseDown={noFocus} onClick={() => api.cmd('formatBlock', t)}>
                    {l}
                  </button>
                ))}
              </div>
            </G>
            <G label="การแก้ไข">
              <Col>
                <Btn title="ค้นหา (Ctrl+F)" icon={<Search />} label="ค้นหา" onClick={api.openFind} />
                <Btn title="แทนที่ (Ctrl+H)" icon={<Replace />} label="แทนที่" onClick={api.openFind} />
                <Btn title="เลือกทั้งหมด (Ctrl+A)" icon={<TextSelect />} label="เลือก" onClick={api.selectAll} />
              </Col>
            </G>
          </>
        );
      case 'insert':
        return (
          <>
            <G label="หน้า">
              <Col>
                <Btn title="หน้าเปล่า" icon={<FilePlus />} label="หน้าเปล่า" onClick={() => api.insertHtml('<div data-pb="1"></div><p><br></p><div data-pb="1"></div><p><br></p>')} />
                <Btn title="ตัวแบ่งหน้า (Ctrl+Enter)" icon={<FileDown />} label="ตัวแบ่งหน้า" onClick={() => api.insertHtml('<div data-pb="1"></div><p><br></p>')} />
              </Col>
            </G>
            <G label="ตาราง">
              <Drop big title="ตาราง" label="ตาราง" icon={<Table />} width={236}>
                {(close) => <TableGrid onPick={(r, c) => (api.insertHtml(`<table><tbody>${Array.from({ length: r }, () => `<tr>${'<td><br></td>'.repeat(c)}</tr>`).join('')}</tbody></table><p><br></p>`), close())} />}
              </Drop>
            </G>
            <G label="ภาพประกอบ">
              <Big label="รูปภาพ" icon={<ImagePlus />} onClick={api.pickImage} />
              <Drop big title="รูปร่าง" label="รูปร่าง" icon={<Shapes />} width={300}>
                {(close) => (
                  <>
                    <p className="st-rpop-h">เลือกรูปร่าง แล้วลากบนกระดาษเพื่อวาด</p>
                    <div className="st-wshapes">
                      <button type="button" data-on={drawing === 'ln'} onClick={() => (api.drawShape('ln'), close())} title="เส้นตรง" aria-label="เส้นตรง">
                        <svg viewBox="0 0 100 100">
                          <path d="M8,92 L92,8" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                        </svg>
                      </button>
                      {SHAPES.map((s) => (
                        <button key={s.id} type="button" data-on={drawing === s.id} onClick={() => (api.drawShape(s.id), close())} title={s.label} aria-label={s.label}>
                          <svg viewBox="-4 -4 108 108">
                            <path d={s.d} fill="#dbeafe" fillRule="evenodd" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </Drop>
              <Big label="กราฟ/รูปคณิต" icon={<LineChart />} onClick={api.addGraph} title="สร้างรูปกราฟ (เพิ่มจาก Word)" />
            </G>
            <G label="หัวกระดาษและท้ายกระดาษ">
              <Big label="หัวกระดาษ" icon={<PanelTop />} onClick={() => api.editHf('head')} title="แก้หัวกระดาษ (ดับเบิลคลิกขอบบนของกระดาษก็ได้)" />
              <Big label="ท้ายกระดาษ" icon={<PanelBottom />} onClick={() => api.editHf('foot')} title="แก้ท้ายกระดาษ (ดับเบิลคลิกขอบล่างของกระดาษก็ได้)" />
              <Drop big title="หมายเลขหน้า" label="หมายเลขหน้า" icon={<Hash />} width={280}>
                {() => <PageNumbers api={api} />}
              </Drop>
            </G>
            <G label="ข้อความ">
              <Drop big title="อักษรศิลป์" label="อักษรศิลป์" icon={<Type />} width={240}>
                {(close) => (
                  <div className="st-wart">
                    {WORDART.map((a) => (
                      <button key={a.c} type="button" onClick={() => (api.insertHtml(`<span style="font-size: 48px; font-weight: 700; color: ${a.c}">อักษรศิลป์</span>&nbsp;`), close())} style={{ color: a.c }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </Drop>
              <Col>
                <Drop title="วันที่และเวลา" icon={<CalendarDays />} label="วันที่และเวลา" width={240}>
                  {(close) => (
                    <div className="st-rlist">
                      {[
                        today(),
                        new Date().toLocaleDateString('th-TH'),
                        new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                        `${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`,
                      ].map((t) => (
                        <button key={t} type="button" onClick={() => (api.insertHtml(`${t}&nbsp;`), close())}>
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </Drop>
                <Btn title="ช่องชื่อ ชั้น เลขที่ (เพิ่มสำหรับครู)" icon={<PenLine />} label="ช่องชื่อ" onClick={() => api.insertHtml('<p>ชื่อ ............................................................. ชั้น ............ เลขที่ ............</p><p><br></p>')} />
                <Btn title="เส้นเขียนคำตอบ 3 บรรทัด (เพิ่มสำหรับครู)" icon={<Heading />} label="เส้นเขียนคำตอบ" onClick={() => api.insertHtml(`${'<p>...............................................................................................................</p>'.repeat(3)}<p><br></p>`)} />
              </Col>
              <Btn title="เส้นแนวนอน" icon={<Minus />} onClick={() => api.insertHtml('<hr><p><br></p>')} />
            </G>
            <G label="สัญลักษณ์">
              <Big label="สมการ" icon={<Sigma />} onClick={() => api.addMath(false)} title="สมการ (Alt+=)" />
              <Drop big title="สัญลักษณ์" label="สัญลักษณ์" icon={<Omega />} width={320}>
                {(close) => (
                  <div className="st-wsym st-wsym-panel">
                    {[...SYMBOLS, ...MORE_SYMBOLS].map((s) => (
                      <button key={s} type="button" onClick={() => (api.insertHtml(s), close())}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </Drop>
            </G>
          </>
        );
      case 'layout':
        return (
          <>
            <G label="ตั้งค่าหน้ากระดาษ">
              <Drop big title="ระยะขอบ" label="ระยะขอบ" icon={<Frame />} width={290}>
                {(close) => <Margins api={api} close={close} />}
              </Drop>
              {layoutExtra && (
                <Drop big title="ขนาดและการวางแนว" label="ขนาด/แนว" icon={<Ruler />} width={320}>
                  {() => layoutExtra}
                </Drop>
              )}
              <Drop big title="ตัวแบ่ง" label="ตัวแบ่ง" icon={<FileDown />} width={220}>
                {(close) => (
                  <div className="st-rlist">
                    <button type="button" onClick={() => (api.insertHtml('<div data-pb="1"></div><p><br></p>'), close())}>
                      ตัวแบ่งหน้า (Ctrl+Enter)
                    </button>
                    <button type="button" onClick={() => (api.insertHtml('<div data-pb="1"></div><p><br></p><div data-pb="1"></div><p><br></p>'), close())}>
                      หน้าเปล่า
                    </button>
                  </div>
                )}
              </Drop>
              {!o.std && <Big label="มาตรฐาน Word" icon={<Ruler />} onClick={() => api.setOpt({ std: true, mt: 96, mb: 96, ml: 96, mr: 96 })} title="ใช้ TH Sarabun 16pt ระยะบรรทัดเดี่ยว ขอบ 2.54 ซม. แบบ Word" />}
            </G>
            <G label="ย่อหน้า">
              <Col>
                <Btn title="ลดการเยื้อง" icon={<IndentDecrease />} label="ลดการเยื้อง" onClick={() => api.indent(-1)} />
                <Btn title="เพิ่มการเยื้อง" icon={<IndentIncrease />} label="เพิ่มการเยื้อง" onClick={() => api.indent(1)} />
              </Col>
              <Col>
                <Btn title="เยื้องบรรทัดแรก" icon={<PilcrowSquare />} label="เยื้องบรรทัดแรก" onClick={() => api.blockStyle('text-indent', '2.5em')} />
                <Btn title="ไม่เยื้องบรรทัดแรก" icon={<AlignLeft />} label="ไม่เยื้องบรรทัดแรก" onClick={() => api.blockStyle('text-indent', '')} />
              </Col>
              <Drop big title="ระยะห่างบรรทัด" label="ระยะห่าง" icon={<ArrowUpDown />} width={150}>
                {(close) => (
                  <div className="st-rlist">
                    {['1.0', '1.15', '1.5', '2.0', '2.5', '3.0'].map((v) => (
                      <button key={v} type="button" onClick={() => (api.setLine(String(parseFloat(v))), close())}>
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </Drop>
            </G>
          </>
        );
      case 'refs':
        return (
          <G label="สารบัญ">
            <Big label="สารบัญ" icon={<ListTree />} onClick={api.toc} title="สร้างสารบัญจากหัวเรื่อง 1-3" />
          </G>
        );
      case 'review':
        return (
          <>
            <G label="การพิสูจน์อักษร">
              <Drop big title="จำนวนคำ" label="จำนวนคำ" icon={<BarChart3 />} width={230}>
                {() => <WordCount api={api} />}
              </Drop>
            </G>
            <G label="ค้นหา">
              <Big label="ค้นหาและแทนที่" icon={<Search />} onClick={api.openFind} />
            </G>
          </>
        );
      case 'view':
        return (
          <>
            <G label="แสดง">
              <Big label="ค้นหา (บานหน้าต่างนำทาง)" icon={<AlignCenterHorizontal />} onClick={api.openFind} />
            </G>
            <G label="วิธีใช้">
              <Big label="แป้นลัด" icon={<Keyboard />} onClick={api.openKeys} />
            </G>
          </>
        );
      case 'math':
        return (
          <>
            <G label="แทรกสมการ">
              <Big label="ในบรรทัด" icon={<Sigma />} onClick={() => api.addMath(false)} title="สมการในบรรทัด (Alt+=)" />
              <Big label="แยกบรรทัด" icon={<AlignCenter />} onClick={() => api.addMath(true)} title="สมการแยกบรรทัด (Alt+Q)" />
            </G>
            <G label="สูตร">
              <Drop big title="สูตรสำเร็จรูป" label="สูตรสำเร็จรูป" icon={<Sigma />} width={340}>
                {(close) => (
                  <div className="st-wformulas">
                    {FORMULAS.map((f) => (
                      <Formula key={f.label} f={f} onPick={() => (api.insertTex(f.tex), close())} />
                    ))}
                  </div>
                )}
              </Drop>
            </G>
            <G label="เครื่องมือ">
              <Big label="ตั้งแป้นลัด" icon={<Keyboard />} onClick={() => setKeysOpen(true)} title="ตั้งแป้นลัดของแม่แบบ (เศษส่วน ราก วงเล็บ ฯลฯ)" />
            </G>
          </>
        );
      case 'table':
        return (
          <>
            <G label="แถวและคอลัมน์">
              <Col>
                <Btn title="แทรกด้านบน" icon={<ArrowUpToLine />} label="แทรกด้านบน" onClick={() => api.table('rowAbove')} />
                <Btn title="แทรกด้านล่าง" icon={<ArrowDownToLine />} label="แทรกด้านล่าง" onClick={() => api.table('rowBelow')} />
              </Col>
              <Col>
                <Btn title="แทรกทางซ้าย" icon={<ArrowLeftToLine />} label="แทรกทางซ้าย" onClick={() => api.table('colLeft')} />
                <Btn title="แทรกทางขวา" icon={<ArrowRightToLine />} label="แทรกทางขวา" onClick={() => api.table('colRight')} />
              </Col>
              <Drop big title="ลบ" label="ลบ" icon={<Trash2 />} width={170}>
                {(close) => (
                  <div className="st-rlist">
                    <button type="button" onClick={() => (api.table('delRow'), close())}>
                      ลบแถว
                    </button>
                    <button type="button" onClick={() => (api.table('delCol'), close())}>
                      ลบคอลัมน์
                    </button>
                    <button type="button" onClick={() => (api.table('delTable'), close())}>
                      ลบตาราง
                    </button>
                  </div>
                )}
              </Drop>
            </G>
            <G label="ลักษณะตาราง">
              <Big label="แถวหัวตาราง" icon={<Heading />} onClick={() => api.table('header')} />
              <Drop big title="แรเงา" label="แรเงา" icon={<PaintBucket />}>
                {(close) => <Swatches colors={SHADES} onPick={(c) => (api.cellShade(c), close())} none={() => (api.cellShade(''), close())} />}
              </Drop>
            </G>
          </>
        );
      case 'object':
        return <div className="st-robj">{object}</div>;
    }
  };

  const hints = (
    <>
      {hf && (
        <button type="button" className="st-rhf" onMouseDown={noFocus} onClick={closeHf}>
          ปิด{hf === 'head' ? 'หัวกระดาษ' : 'ท้ายกระดาษ'}
        </button>
      )}
      {hf && (
        <button type="button" className="st-rhf st-rhf2" onMouseDown={noFocus} onClick={api.insertPageNum}>
          ใส่เลขหน้าตรงเคอร์เซอร์
        </button>
      )}
      {drawing && <p className="st-rhint">ลากบนกระดาษเพื่อวาด (Esc ยกเลิก)</p>}
    </>
  );

  if (side === 'top') {
    // ริบบอนด้านบนแบบ Word: แถวแท็บ (+ แท็บตามบริบท ตาราง/รูป) แล้วแถบกลุ่มเครื่องมือ ย่อได้
    const cur: RibbonTab = (tab === 'object' && !object) || (tab === 'table' && !inTable) ? 'home' : tab;
    return (
      <div className="st-ribbon" data-min={min || undefined}>
        <div className="st-rtabs" role="tablist" aria-label="ริบบอน">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={cur === t.id} className="st-rtab" data-on={cur === t.id} onMouseDown={noFocus} onClick={() => (setTab(t.id), setMin(false))}>
              {t.label}
            </button>
          ))}
          {inTable && (
            <button type="button" role="tab" aria-selected={cur === 'table'} className="st-rtab st-rtab-ctx" data-on={cur === 'table'} onMouseDown={noFocus} onClick={() => (setTab('table'), setMin(false))}>
              เค้าโครงตาราง
            </button>
          )}
          {object && (
            <button type="button" role="tab" aria-selected={cur === 'object'} className="st-rtab st-rtab-ctx" data-on={cur === 'object'} onMouseDown={noFocus} onClick={() => (setTab('object'), setMin(false))}>
              {objectLabel}
            </button>
          )}
          <span className="flex-1" />
          {hf && (
            <>
              <button type="button" className="st-rtab st-rhf" onMouseDown={noFocus} onClick={api.insertPageNum}>
                ใส่เลขหน้า
              </button>
              <button type="button" className="st-rtab st-rhf" onMouseDown={noFocus} onClick={closeHf}>
                ปิด{hf === 'head' ? 'หัวกระดาษ' : 'ท้ายกระดาษ'}
              </button>
            </>
          )}
          {drawing && <span className="st-rhint">ลากบนกระดาษเพื่อวาด (Esc ยกเลิก)</span>}
          {clipMsg && <span className="st-rhint">{clipMsg}</span>}
          <button type="button" className="st-rtab st-rmin" title={min ? 'แสดงริบบอน' : 'ย่อริบบอน'} aria-label={min ? 'แสดงริบบอน' : 'ย่อริบบอน'} onMouseDown={noFocus} onClick={() => setMin(!min)}>
            {min ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
        {!min && (
          <div className="st-rbody" role="toolbar" aria-label="เครื่องมือ">
            {render(cur)}
          </div>
        )}
        {keysOpen && <MathKeysDialog onClose={() => setKeysOpen(false)} />}
      </div>
    );
  }

  if (side === 'right') {
    // บานจัดรูปแบบด้านขวา: ขึ้นเฉพาะตอนเลือกรูปร่าง/รูปภาพ หรือคลิกในตาราง (ไม่มีอะไรเลือก = กระดาษกว้างเต็มที่)
    const ctx: RibbonTab | null = object ? 'object' : inTable ? 'table' : null;
    if (!ctx && !hf && !drawing) return null;
    return (
      <aside className="st-rside st-rright" aria-label={ctx === 'object' ? objectLabel : ctx === 'table' ? 'เค้าโครงตาราง' : 'สถานะ'}>
        {ctx && <h2 className="st-rside-h">{ctx === 'object' ? objectLabel : 'เค้าโครงตาราง'}</h2>}
        {hints}
        {ctx && (
          <div className="st-rbody" role="toolbar" aria-label="จัดรูปแบบ">
            {render(ctx)}
          </div>
        )}
      </aside>
    );
  }

  const cur = tab === 'table' || tab === 'object' ? 'home' : tab;
  return (
    <>
      <nav className="st-rail st-rrail" aria-label="แท็บเครื่องมือ">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="st-rail-btn"
            data-on={open && !pane && cur === t.id}
            onMouseDown={noFocus}
            onClick={() => {
              if (pane) api.closePane();
              setOpen(!(open && !pane && cur === t.id));
              setTab(t.id);
            }}
            style={{ ['--c' as string]: TAB_COLOR[t.id] }}
          >
            <span className="st-rail-ic">{TAB_ICON[t.id]}</span>
            <span className="st-rail-tx">{t.label}</span>
          </button>
        ))}
      </nav>
      {pane ??
        (open && (
          <aside className="st-panel st-rside st-rleft" aria-label={TABS.find((t) => t.id === cur)?.label}>
            <div className="st-panel-head">
              <h2>{TABS.find((t) => t.id === cur)?.label}</h2>
              <button type="button" className="st-tb" onMouseDown={noFocus} onClick={() => setOpen(false)} aria-label="ปิดแผง">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            {clipMsg && <p className="st-rhint">{clipMsg}</p>}
            <div className="st-rbody" role="toolbar" aria-label="เครื่องมือ">
              {render(cur)}
            </div>
          </aside>
        ))}
      {keysOpen && <MathKeysDialog onClose={() => setKeysOpen(false)} />}
    </>
  );
}

const TAB_ICON: Record<string, React.ReactNode> = {
  home: <Type className="w-5 h-5" />,
  insert: <Plus className="w-5 h-5" />,
  layout: <Ruler className="w-5 h-5" />,
  refs: <ListTree className="w-5 h-5" />,
  review: <SpellCheck className="w-5 h-5" />,
  view: <Eye className="w-5 h-5" />,
  math: <Sigma className="w-5 h-5" />,
};
const TAB_COLOR: Record<string, string> = { home: '#2a73d9', insert: '#e8456b', layout: '#2f9e6e', refs: '#e07a12', review: '#c026d3', view: '#0d9488', math: '#4f46e5' };

function TableGrid({ onPick }: { onPick: (r: number, c: number) => void }) {
  const [hv, setHv] = useState<[number, number]>([0, 0]);
  return (
    <>
      <p className="st-rpop-h">{hv[0] ? `ตาราง ${hv[1]}x${hv[0]}` : 'แทรกตาราง'}</p>
      <div className="st-wgrid st-wgrid-lg" onMouseLeave={() => setHv([0, 0])}>
        {Array.from({ length: 80 }, (_, i) => {
          const r = Math.floor(i / 10) + 1;
          const c = (i % 10) + 1;
          return <button key={i} type="button" data-on={r <= hv[0] && c <= hv[1]} onMouseEnter={() => setHv([r, c])} onClick={() => onPick(r, c)} aria-label={`${r} แถว ${c} คอลัมน์`} />;
        })}
      </div>
    </>
  );
}

function Formula({ f, onPick }: { f: { tex: string; label: string }; onPick: () => void }) {
  const html = useMemo(() => texToHtml(f.tex, false, false), [f.tex]);
  return (
    <button type="button" onClick={onPick} title={f.label}>
      <span className="st-wformula" dangerouslySetInnerHTML={{ __html: html }} />
      <small>{f.label}</small>
    </button>
  );
}

/** แทรก > หมายเลขหน้า */
function PageNumbers({ api }: { api: WordApi }) {
  const o = api.opt;
  const chip = <K extends keyof WordOpt>(k: K, v: WordOpt[K], label: string) => (
    <button key={String(v)} type="button" data-on={o[k] === v} onClick={() => api.setOpt({ [k]: v } as Partial<WordOpt>)}>
      {label}
    </button>
  );
  return (
    <div className="st-rform">
      <p className="st-rpop-h">ตำแหน่ง</p>
      <div className="st-chips">
        {chip('num', 'none', 'ไม่ใส่')}
        {chip('num', 'top', 'ด้านบนของหน้า')}
        {chip('num', 'bottom', 'ด้านล่างของหน้า')}
      </div>
      <p className="st-rpop-h">จัดแนว</p>
      <div className="st-chips">
        {chip('numAlign', 'left', 'ซ้าย')}
        {chip('numAlign', 'center', 'กึ่งกลาง')}
        {chip('numAlign', 'right', 'ขวา')}
      </div>
      <p className="st-rpop-h">รูปแบบ</p>
      <div className="st-chips">{NUM_FMTS.map((f) => chip('numFmt', f.id, f.label))}</div>
      <label className="st-wfield mt-2">
        เริ่มที่
        <input type="number" min={0} max={9999} value={o.numStart} onChange={(e) => api.setOpt({ numStart: Math.max(0, Math.min(9999, Math.round(+e.target.value) || 0)) })} />
      </label>
      <label className="st-wcheck mt-2">
        <input type="checkbox" checked={!o.numFirst} onChange={(e) => api.setOpt({ numFirst: !e.target.checked })} />
        หน้าแรกแตกต่าง
      </label>
    </div>
  );
}

/** เค้าโครง > ระยะขอบ (สำเร็จรูป + กำหนดเอง) */
function Margins({ api, close }: { api: WordApi; close: () => void }) {
  const o = api.opt;
  const cm = (px: number) => Math.round((px / 96) * 2.54 * 100) / 100;
  const field = (k: 'mt' | 'mb' | 'ml' | 'mr', label: string) => (
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
    <div className="st-rform">
      <div className="st-rlist">
        {MARGIN_PRESETS.map((p) => (
          <button key={p.id} type="button" data-on={o.mt === p.m[0] && o.mb === p.m[1] && o.ml === p.m[2] && o.mr === p.m[3]} onClick={() => (api.setOpt({ mt: p.m[0], mb: p.m[1], ml: p.m[2], mr: p.m[3] }), close())}>
            {p.label}
          </button>
        ))}
      </div>
      <p className="st-rpop-h">ระยะขอบแบบกำหนดเอง</p>
      <div className="st-wmargins">
        {field('mt', 'บน')}
        {field('mb', 'ล่าง')}
        {field('ml', 'ซ้าย')}
        {field('mr', 'ขวา')}
      </div>
    </div>
  );
}

/** รีวิว > จำนวนคำ */
function WordCount({ api }: { api: WordApi }) {
  const s = useMemo(() => {
    const el = api.root();
    const text = el?.innerText || '';
    let words = 0;
    // ภาษาไทยไม่เว้นวรรคระหว่างคำ: นับด้วยตัวตัดคำของเบราว์เซอร์
    const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => { segment: (t: string) => Iterable<{ isWordLike?: boolean }> } }).Segmenter;
    if (Seg) for (const x of new Seg('th', { granularity: 'word' }).segment(text)) words += x.isWordLike ? 1 : 0;
    else words = text.split(/\s+/).filter(Boolean).length;
    const paras = el ? Array.from(el.children).filter((c) => (c as HTMLElement).innerText?.trim()).length : 0;
    return { words, chars: text.replace(/\s/g, '').length, paras };
  }, [api]);
  return (
    <div className="st-rstats">
      <span>หน้า</span>
      <b>{api.pages}</b>
      <span>คำ</span>
      <b>{s.words}</b>
      <span>อักขระ (ไม่รวมช่องว่าง)</span>
      <b>{s.chars}</b>
      <span>ย่อหน้า</span>
      <b>{s.paras}</b>
    </div>
  );
}
