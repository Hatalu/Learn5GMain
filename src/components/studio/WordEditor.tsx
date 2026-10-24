'use client';

import React, { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  FileDown,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  LineChart,
  List,
  ListOrdered,
  Minus,
  Pencil,
  Sigma,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Trash2,
  Type,
  Underline,
} from 'lucide-react';
import { FLOW_GAP, WORD_SINGLE, cleanFlowHtml, paginate, type WordOpt } from '@/lib/studio/flow';
import { cleanSrc, type Item, type Page } from '@/lib/studio/doc';
import { cleanGraph, type GraphSpec } from '@/lib/studio/graph';
import { FONTS } from './fonts';
import { wordClipboardHtml } from './wordCopy';
import { ItemView, PageView, flowBoxStyle } from './render';
import { hydrateFlow, isLineShape } from './flowDom';
import { ColorPop } from './ui';
import { SIZES, SYMBOLS, ptToPx, pxToPt, WordPanel, WordRail, type TableOp, type WordApi, type WordPanelId } from './WordPanels';
import { WORD_KEYS, comboOf, type WordKeyId } from '@/lib/studio/keys';

export interface WordHandle {
  undo: () => void;
  redo: () => void;
  focus: () => void;
}


/**
 * โหมดเอกสาร (แบบ Word): พิมพ์ต่อเนื่อง ขึ้นหน้าใหม่เอง แทรกสมการ/กราฟ/รูป/ตาราง ได้
 * ชิ้นงานของโหมด Canva แสดงทับด้านบนแบบกดไม่ได้ (สลับโหมดเพื่อแก้)
 */
export const WordEditor = forwardRef<
  WordHandle,
  {
    html: string;
    pages: Page[];
    /** ตั้งค่าหน้ากระดาษ (ขอบ หัว/ท้ายกระดาษ เลขหน้า) */
    wopt: WordOpt;
    onWopt: (o: WordOpt) => void;
    W: number;
    H: number;
    zoom: number;
    readOnly: boolean;
    /** ที่วางแถบเครื่องมือ (แทนที่แถบตั้งค่าของโหมด Canva) */
    barEl: HTMLElement | null;
    /** ที่วางแถบเครื่องมือด้านข้าง (แบบโหมด Canva) */
    railEl: HTMLElement | null;
    /** ตัวเลือกขนาดกระดาษ (แผงเค้าโครง) */
    layoutExtra?: React.ReactNode;
    onChange: (html: string) => void;
    onNeedPages: (n: number) => void;
    openMath: (tex: string, done: (tex: string) => void, insert?: string) => void;
    openGraph: (spec: GraphSpec | null, done: (s: GraphSpec) => void) => void;
    upload: (file: File) => Promise<string | null>;
  }
>(function WordEditor({ html, pages, wopt, onWopt, W, H, zoom, readOnly, barEl, railEl, layoutExtra, onChange, onNeedPages, openMath, openGraph, upload }, ref) {
  const ed = useRef<HTMLDivElement>(null);
  const emitted = useRef<string | null>(null);
  const saved = useRef<Range | null>(null);
  const timer = useRef<number>(0);
  const [active, setActive] = useState<HTMLElement | null>(null);
  const [, force] = useState(0);
  // แผงเครื่องมือด้านข้าง: จอใหญ่เปิดแผงหน้าแรกไว้ก่อน
  const [panel, setPanel] = useState<WordPanelId | null>(null);
  const [findFocus, setFindFocus] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) setPanel('home');
  }, []);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const P = H + FLOW_GAP;
  const n = pages.length;
  // ชิ้นที่เลือกอยู่ลากได้ทันทีบนจอสัมผัส (data-sel ไม่ถูกบันทึก ตัวกรองทิ้ง)
  useEffect(() => {
    if (!active) return;
    active.dataset.sel = '1';
    return () => {
      delete active.dataset.sel;
    };
  }, [active]);

  const relayout = useCallback(() => {
    const el = ed.current;
    if (!el) return;
    const need = paginate(el, H, FLOW_GAP, wopt.mt, wopt.mb);
    if (need > n) onNeedPages(need);
  }, [H, n, onNeedPages, wopt.mt, wopt.mb]);
  // เปลี่ยนขอบ/ฟอนต์หลัก: จัดหน้าใหม่หลังวาดเสร็จ
  useEffect(() => {
    requestAnimationFrame(relayout);
  }, [relayout, wopt.ml, wopt.mr, wopt.std]);

  // โหลดเนื้อหาจากภายนอก (เปิดสื่อ / ย้อนกลับจากแถบบน) แต่ไม่ทับตอนกำลังพิมพ์
  useLayoutEffect(() => {
    const el = ed.current;
    if (!el || html === emitted.current) return;
    el.innerHTML = html || '<p><br></p>';
    emitted.current = html;
    hydrateFlow(el);
    relayout();
  }, [html, relayout]);
  useEffect(() => {
    document.fonts?.ready.then(relayout);
  }, [relayout]);

  const emit = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = ed.current;
      if (!el) return;
      const clean = cleanFlowHtml(el.innerHTML, cleanSrc);
      emitted.current = clean;
      onChange(clean);
    }, 450);
  }, [onChange]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const changed = () => {
    const el = ed.current;
    if (!el) return;
    hydrateFlow(el);
    requestAnimationFrame(relayout);
    emit();
  };

  /* ---------------- ตำแหน่งเคอร์เซอร์ ---------------- */
  const keep = () => {
    const s = window.getSelection();
    if (s && s.rangeCount && ed.current?.contains(s.anchorNode)) saved.current = s.getRangeAt(0).cloneRange();
  };
  // แถบเครื่องมือโชว์ขนาด/สไตล์ตรงเคอร์เซอร์ล่าสุด
  const keepShow = () => {
    keep();
    force((x) => x + 1);
  };
  const restore = () => {
    const el = ed.current;
    if (!el) return;
    el.focus();
    const s = window.getSelection();
    if (saved.current && el.contains(saved.current.startContainer)) {
      s?.removeAllRanges();
      s?.addRange(saved.current);
    } else if (s && !el.contains(s.anchorNode)) {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      s.removeAllRanges();
      s.addRange(r);
    }
  };
  const cmd = (c: string, v?: string) => {
    restore();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(c, false, v);
    keep();
    changed();
    force((x) => x + 1);
  };
  const insertHtml = (h: string) => {
    restore();
    document.execCommand('insertHTML', false, h);
    keep();
    changed();
  };
  /** ขนาดตัวอักษรหน่วย pt แบบ Word (ตัวปกติ 21px = 16pt) */
  const setSize = (pt: number) => {
    restore();
    const px = `${ptToPx(pt)}px`;
    const s = window.getSelection();
    if (!s || !s.rangeCount) return;
    if (s.isCollapsed) {
      // ยังไม่ได้คลุมข้อความ: ตัวที่พิมพ์ต่อจากตรงนี้ใช้ขนาดนี้ (ช่องว่างไร้ความกว้างไว้ให้เคอร์เซอร์อยู่ในกล่อง ตัวกรองลบทิ้งตอนบันทึก)
      const r = s.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = px;
      span.textContent = '\u200b';
      r.insertNode(span);
      r.setStart(span.firstChild!, 1);
      r.collapse(true);
      s.removeAllRanges();
      s.addRange(r);
    } else {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('fontSize', false, '7');
      ed.current?.querySelectorAll<HTMLElement>('span[style*="xxx-large"], font[size="7"]').forEach((el) => {
        el.removeAttribute('size');
        el.style.fontSize = px;
      });
    }
    keep();
    changed();
    force((x) => x + 1);
  };
  /** ขนาด (pt) ของตัวอักษรตรงเคอร์เซอร์ */
  const curPt = () => {
    const node = window.getSelection()?.anchorNode;
    const el = node && ed.current?.contains(node) ? (node.nodeType === 1 ? (node as HTMLElement) : node.parentElement) : null;
    return pxToPt(el ? parseFloat(getComputedStyle(el).fontSize) || 21 : 21);
  };
  /** ย่อหน้าที่อยู่ในส่วนที่เลือก */
  const blocks = () => {
    const el = ed.current;
    const s = window.getSelection();
    if (!el || !s || !s.rangeCount) return [];
    const r = s.getRangeAt(0);
    return (Array.from(el.children) as HTMLElement[]).filter((b) => r.intersectsNode(b));
  };
  /** ระยะบรรทัดแบบ Word: v เท่าของบรรทัดเดี่ยว (เอกสารมาตรฐาน Word บรรทัดเดี่ยว = 1.31 เท่าของขนาดตัวอักษร) */
  const setLine = (v: string) => {
    restore();
    const lh = wopt.std ? String(Math.round(+v * WORD_SINGLE * 100) / 100) : v;
    blocks().forEach((b) => (b.style.lineHeight = lh));
    changed();
  };
  /** เยื้องย่อหน้าแบบ Word (คำสั่ง indent ของเบราว์เซอร์ห่อด้วย blockquote กลายเป็นกรอบเน้น) รายการใช้แบบซ้อนชั้น */
  const indent = (d: 1 | -1) => {
    restore();
    const bs = blocks();
    if (!bs.length || bs.some((b) => /^(UL|OL)$/.test(b.tagName))) return cmd(d > 0 ? 'indent' : 'outdent');
    bs.forEach((b) => {
      const m = Math.max(0, (parseFloat(b.style.marginLeft) || 0) + d * 36);
      b.style.marginLeft = m ? `${m}px` : '';
    });
    changed();
  };
  /** ขยาย/ย่อตัวอักษร: step = ไปขนาดถัดไปในรายการ ไม่งั้น +-1 (แบบ Word) */
  const bumpSize = (d: 1 | -1, step: boolean) => {
    const z = curPt();
    const next = !step ? z + d : d > 0 ? SIZES.find((s) => s > z + 0.25) ?? 96 : [...SIZES].reverse().find((s) => s < z - 0.25) ?? 8;
    setSize(Math.max(6, Math.min(96, next)));
  };

  /** ตั้งสไตล์ย่อหน้าที่เลือก (ค่าว่าง = เอาออก) */
  const blockStyle = (prop: string, v: string) => {
    restore();
    blocks().forEach((b) => b.style.setProperty(prop, v));
    changed();
  };
  /** รายการแบบมีลำดับ/สัญลักษณ์ เลือกรูปแบบได้ */
  const list = (ordered: boolean, type: string) => {
    restore();
    const tag = ordered ? 'OL' : 'UL';
    const inList = () => {
      const node = window.getSelection()?.anchorNode;
      const el = node && (node.nodeType === 1 ? (node as HTMLElement) : node.parentElement);
      return (el?.closest('ul,ol') as HTMLElement | null) ?? null;
    };
    if (inList()?.tagName !== tag) document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList');
    const l = inList();
    if (l && ed.current?.contains(l)) l.style.listStyleType = type;
    keep();
    changed();
  };
  const changeCase = (m: 'upper' | 'lower' | 'title') => {
    restore();
    const t = window.getSelection()?.toString() || '';
    if (!t) return;
    const out = m === 'upper' ? t.toUpperCase() : m === 'lower' ? t.toLowerCase() : t.toLowerCase().replace(/(^|\s)(\S)/g, (_, a: string, b: string) => a + b.toUpperCase());
    document.execCommand('insertText', false, out);
    keep();
    changed();
  };
  /** ช่องตารางที่เคอร์เซอร์อยู่ */
  const curCell = () => {
    const node = saved.current?.startContainer ?? window.getSelection()?.anchorNode;
    const el = node && (node.nodeType === 1 ? (node as HTMLElement) : node.parentElement);
    const c = (el?.closest('td,th') as HTMLTableCellElement | null) ?? null;
    return c && ed.current?.contains(c) ? c : null;
  };
  const table = (op: TableOp) => {
    const cell = curCell();
    const tr = cell?.parentElement as HTMLTableRowElement | null;
    const tb = cell?.closest('table');
    if (!cell || !tr || !tb) return;
    const col = cell.cellIndex;
    const rows = Array.from(tb.rows);
    const blank = (tag = 'td') => {
      const c = document.createElement(tag);
      c.innerHTML = '<br>';
      return c;
    };
    if (op === 'rowAbove' || op === 'rowBelow') {
      const r = document.createElement('tr');
      for (let i = 0; i < tr.cells.length; i++) r.appendChild(blank());
      tr.parentElement!.insertBefore(r, op === 'rowAbove' ? tr : tr.nextSibling);
    } else if (op === 'colLeft' || op === 'colRight') {
      rows.forEach((r) => {
        const at = r.cells[col];
        const c = blank(at?.tagName === 'TH' ? 'th' : 'td');
        r.insertBefore(c, op === 'colLeft' ? at ?? null : at?.nextSibling ?? null);
      });
    } else if (op === 'delRow') {
      if (rows.length <= 1) tb.remove();
      else tr.remove();
    } else if (op === 'delCol') {
      if (tr.cells.length <= 1) tb.remove();
      else rows.forEach((r) => r.cells[col]?.remove());
    } else if (op === 'delTable') {
      tb.remove();
    } else if (op === 'header') {
      // แถวแรก td <-> th
      const first = rows[0];
      const toTh = Array.from(first.cells).some((c) => c.tagName === 'TD');
      Array.from(first.cells).forEach((c) => {
        const c2 = document.createElement(toTh ? 'th' : 'td');
        c2.innerHTML = c.innerHTML;
        const st = c.getAttribute('style');
        if (st) c2.setAttribute('style', st);
        c.replaceWith(c2);
      });
    }
    saved.current = null;
    changed();
    force((x) => x + 1);
  };
  const cellShade = (c: string) => {
    const cell = curCell();
    if (!cell) return;
    cell.style.backgroundColor = c;
    changed();
  };
  /**
   * สมการในบรรทัด: วางที่เคอร์เซอร์แล้วพิมพ์ต่อในบรรทัดเดิม
   * (insertHTML ของ Chrome ย้ายช่องว่างหลังชิ้นที่แก้ไม่ได้ออกไปนอกย่อหน้า ตัวที่พิมพ์ต่อเลยขึ้นบรรทัดใหม่)
   */
  const insertTex = (tex: string) => {
    restore();
    const s = window.getSelection();
    const root = ed.current;
    if (!s || !s.rangeCount || !root) return;
    const r = s.getRangeAt(0);
    r.deleteContents();
    const span = document.createElement('span');
    span.dataset.tex = tex;
    span.contentEditable = 'false';
    const after = document.createTextNode(' ');
    if (r.startContainer === root) {
      const p = document.createElement('p');
      p.append(span, after);
      r.insertNode(p);
    } else {
      r.insertNode(after);
      r.insertNode(span);
    }
    r.setStart(after, 1);
    r.collapse(true);
    s.removeAllRanges();
    s.addRange(r);
    keep();
    changed();
  };
  const openPanel = (p: WordPanelId) => {
    setPanel(p);
    if (p === 'find') setFindFocus((x) => x + 1);
  };

  useImperativeHandle(ref, () => ({
    undo: () => {
      restore();
      document.execCommand('undo');
      changed();
    },
    redo: () => {
      restore();
      document.execCommand('redo');
      changed();
    },
    focus: () => restore(),
  }));

  /* ---------------- แทรกของ ---------------- */
  const addMath = (display = false) => {
    keep();
    openMath('', (tex) => {
      if (!tex.trim()) return;
      if (!display) return insertTex(tex);
      insertHtml(`<p style="text-align: center"><span data-tex="${esc(tex)}" contenteditable="false"></span></p><p><br></p>`);
    });
  };
  const addGraph = () => {
    keep();
    openGraph(null, (s) => insertHtml(`<figure data-graph="${esc(JSON.stringify(s))}" contenteditable="false"></figure><p><br></p>`));
  };
  const editActive = () => {
    const el = active;
    if (!el) return;
    if (el.dataset.tex !== undefined) {
      openMath(el.dataset.tex || '', (tex) => {
        if (!tex.trim()) el.remove();
        else {
          el.dataset.tex = tex;
          delete el.dataset.done;
        }
        setActive(null);
        changed();
      });
    } else if (el.dataset.graph) {
      let spec: GraphSpec | null = null;
      try {
        spec = cleanGraph(JSON.parse(el.dataset.graph));
      } catch {
        spec = null;
      }
      openGraph(spec, (s) => {
        el.dataset.graph = JSON.stringify(s);
        delete el.dataset.done;
        changed();
      });
    }
  };
  const fileIn = useRef<HTMLInputElement>(null);
  const addImage = async (f: File | undefined) => {
    if (!f) return;
    keep();
    const url = await upload(f);
    if (url) insertHtml(`<img src="${esc(url)}" alt="">`);
  };

  /* ---------------- เลือก ลาก ย่อขยาย และจัดวางรูป/กราฟ (แบบ Word) ---------------- */
  /** กรอบของชิ้นเทียบกับกล่องเอกสาร (หน่วยกระดาษ ไม่รวมซูม) */
  const rel = (el: HTMLElement) => {
    const a = el.getBoundingClientRect();
    const b = ed.current!.getBoundingClientRect();
    const z = zoomRef.current;
    return { x: (a.left - b.left) / z, y: (a.top - b.top) / z, w: a.width / z, h: a.height / z };
  };
  const isFree = (el: HTMLElement) => el.dataset.wrap === 'behind' || el.dataset.wrap === 'front';
  /** ชิ้นใต้จุดคลิก รวมชิ้น "หลังข้อความ" เมื่อไม่ได้คลิกโดนตัวอักษร */
  const pickAt = (x: number, y: number, target: HTMLElement) => {
    const root = ed.current;
    if (!root) return null;
    const direct = target.closest<HTMLElement>('span[data-tex], figure[data-graph], figure[data-shape], img');
    if (direct && root.contains(direct)) return direct;
    const under = document.elementsFromPoint(x, y).find((el): el is HTMLElement => el instanceof HTMLElement && el.dataset.wrap === 'behind' && root.contains(el));
    return under && !onText(x, y) ? under : null;
  };
  /** วางชิ้นแบบอยู่ในบรรทัดลงตรงจุดบนจอ: รูปแทรกที่เคอร์เซอร์ กราฟ (บล็อก) แทรกก่อน/หลังย่อหน้าตรงนั้น */
  const place = (el: HTMLElement, x: number, y: number) => {
    const root = ed.current;
    if (!root) return;
    el.style.pointerEvents = 'none';
    const r = caretAt(x, y);
    el.style.pointerEvents = '';
    if (!r || !root.contains(r.startContainer) || el.contains(r.startContainer)) return;
    if (el.tagName === 'IMG') return r.insertNode(el);
    let b: Node | null = r.startContainer === root ? root.childNodes[r.startOffset] ?? null : r.startContainer;
    while (b && b.parentNode !== root) b = b.parentNode;
    if (b === el) return;
    const br = b instanceof HTMLElement ? b.getBoundingClientRect() : null;
    root.insertBefore(el, b && br && y > br.top + br.height / 2 ? b.nextSibling : b);
  };
  /** ลาก (ไม่ส่ง corner) หรือย่อขยายจากมุม */
  const grab = (el: HTMLElement, sx: number, sy: number, corner?: string) => {
    const z = zoomRef.current;
    const box = rel(el);
    const free = isFree(el);
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / z;
      const dy = (ev.clientY - sy) / z;
      if (!moved && Math.hypot(dx * z, dy * z) < 4) return;
      moved = true;
      if (corner) {
        const west = corner.includes('w');
        const w = Math.round(Math.max(40, Math.min(W, box.w + (west ? -dx : dx))));
        el.style.width = `${w}px`;
        if (free && west) el.style.left = `${Math.round(box.x + box.w - w)}px`;
        if (free && corner.includes('n')) el.style.top = `${Math.round(box.y + box.h - (w * box.h) / box.w)}px`;
      } else if (free) {
        el.style.left = `${Math.round(box.x + dx)}px`;
        el.style.top = `${Math.round(box.y + dy)}px`;
      } else {
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        el.style.opacity = '0.6';
      }
      force((x) => x + 1);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!moved) return;
      if (!corner && !free) {
        el.style.transform = '';
        el.style.opacity = '';
        place(el, ev.clientX, ev.clientY);
      }
      changed();
      force((x) => x + 1);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  const setWrap = (v: string) => {
    const el = active;
    if (!el) return;
    const box = rel(el);
    const a = el.getBoundingClientRect();
    const was = isFree(el);
    if (v) el.dataset.wrap = v;
    else delete el.dataset.wrap;
    if (isFree(el)) {
      // คงตำแหน่ง/ขนาดเดิมบนกระดาษ (เปอร์เซ็นต์ของกล่องอิสระคิดจากความกว้างกระดาษ จะกระโดด)
      el.style.width = `${Math.round(box.w)}px`;
      el.style.left = `${Math.round(box.x)}px`;
      el.style.top = `${Math.round(box.y)}px`;
    } else {
      el.style.left = '';
      el.style.top = '';
      const inner = W - wopt.ml - wopt.mr;
      if (v && box.w > inner * 0.6) el.style.width = `${Math.round(inner * 0.45)}px`;
      if (was) place(el, a.left + 4, a.top + 4);
    }
    changed();
    force((x) => x + 1);
  };
  const removeActive = () => {
    active?.remove();
    setActive(null);
    changed();
  };

  /* ---------------- วาดรูปร่างแบบ Word: เลือกรูปแล้วลากบนกระดาษ ---------------- */
  const [draw, setDraw] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    if (!draw) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setDraw(null);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [draw]);
  const startDraw = (e: React.PointerEvent) => {
    const root = ed.current;
    const id = drawRef.current;
    if (!root || !id) return;
    e.preventDefault();
    const b0 = root.getBoundingClientRect();
    const z = zoomRef.current;
    const at = (ev: { clientX: number; clientY: number }) => ({ x: (ev.clientX - b0.left) / z, y: (ev.clientY - b0.top) / z });
    const a = at(e);
    let b = a;
    const box = () => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) });
    const move = (ev: PointerEvent) => {
      b = at(ev);
      setGhost(box());
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setGhost(null);
      setDraw(null);
      const line = id === 'ln';
      let r = box();
      // คลิกเฉยๆ = ขนาดเริ่มต้น
      if (r.w < 6 && r.h < 6) r = { x: a.x, y: a.y, w: line ? 200 : 160, h: line ? 0 : 110 };
      const fig = document.createElement('figure');
      fig.dataset.shape = line ? ((b.x - a.x) * (b.y - a.y) < 0 ? 'ln2' : 'ln') : id;
      fig.dataset.fill = line ? 'none' : '#bfdbfe';
      fig.dataset.stroke = '#1f1b36';
      fig.dataset.sw = line ? '3' : '2';
      fig.dataset.ar = String(Math.round(Math.max(0.02, Math.min(60, Math.max(r.w, 2) / Math.max(r.h, 2))) * 1000) / 1000);
      fig.dataset.wrap = 'front';
      fig.style.left = `${Math.round(r.x)}px`;
      fig.style.top = `${Math.round(r.y)}px`;
      fig.style.width = `${Math.round(Math.max(r.w, 4))}px`;
      fig.contentEditable = 'false';
      root.insertBefore(fig, root.firstChild);
      changed();
      setActive(fig);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  const shapeAttr = (k: 'fill' | 'stroke' | 'sw', v: string) => {
    const el = active;
    if (!el?.dataset.shape) return;
    el.dataset[k] = v;
    changed();
    force((x) => x + 1);
  };

  const onDown = (e: React.PointerEvent) => {
    if (readOnly || e.button !== 0) return;
    if (drawRef.current) return startDraw(e);
    const t = pickAt(e.clientX, e.clientY, e.target as HTMLElement);
    setActive(t);
    if (!t || t.tagName === 'SPAN') return;
    e.preventDefault();
    restore();
    grab(t, e.clientX, e.clientY);
  };
  const onDouble = (e: React.MouseEvent) => {
    const t = pickAt(e.clientX, e.clientY, e.target as HTMLElement);
    if (t && t.tagName !== 'IMG') {
      setActive(t);
      requestAnimationFrame(() => editActiveRef.current());
    }
  };
  const editActiveRef = useRef(editActive);
  editActiveRef.current = editActive;

  /** แป้นลัดแบบ Word (ใช้ e.code จะได้ทำงานตอนแป้นภาษาไทยด้วย) */
  const onKey = (e: React.KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    const run = (f: () => void) => {
      e.preventDefault();
      f();
    };
    if (active) {
      if (e.key === 'Delete' || e.key === 'Backspace') return run(removeActive);
      if (e.key === 'Escape') return run(() => setActive(null));
      if (isFree(active) && e.key.startsWith('Arrow')) {
        return run(() => {
          const d = e.shiftKey ? 10 : 1;
          const b = rel(active);
          active.style.left = `${Math.round(b.x + (e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0))}px`;
          active.style.top = `${Math.round(b.y + (e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0))}px`;
          changed();
          force((x) => x + 1);
        });
      }
      setActive(null);
    }
    keep();
    if (e.key === 'Tab' && !mod && !e.altKey) {
      return run(() => {
        const node = window.getSelection()?.anchorNode;
        const el = node && (node.nodeType === 1 ? (node as HTMLElement) : node.parentElement);
        const cell = el?.closest('td,th');
        if (cell && ed.current?.contains(cell)) {
          // ตาราง: ไปช่องถัดไป/ก่อนหน้า
          const cells = Array.from(cell.closest('table')!.querySelectorAll('td,th'));
          const to = cells[cells.indexOf(cell) + (e.shiftKey ? -1 : 1)];
          if (to) {
            const r = document.createRange();
            r.selectNodeContents(to);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(r);
            keep();
          }
        } else if (el?.closest('li')) cmd(e.shiftKey ? 'outdent' : 'indent');
        else if (!e.shiftKey) {
          document.execCommand('insertText', false, '  ');
          changed();
        }
      });
    }
    const combo = comboOf(e.nativeEvent);
    const id = combo ? WORD_KEYS.find((k) => k.combo === combo)?.id : undefined;
    if (id) run(() => wordAction(id));
  };
  const wordAction = (id: WordKeyId) => {
    const acts: Record<WordKeyId, () => void> = {
      bold: () => cmd('bold'),
      italic: () => cmd('italic'),
      underline: () => cmd('underline'),
      left: () => cmd('justifyLeft'),
      center: () => cmd('justifyCenter'),
      right: () => cmd('justifyRight'),
      justify: () => cmd('justifyFull'),
      sizeUp: () => bumpSize(1, true),
      sizeDown: () => bumpSize(-1, true),
      sizePlus: () => bumpSize(1, false),
      sizeMinus: () => bumpSize(-1, false),
      sub: () => cmd('subscript'),
      sup: () => cmd('superscript'),
      clear: () => cmd('removeFormat'),
      line1: () => setLine('1'),
      line2: () => setLine('2'),
      line15: () => setLine('1.5'),
      indent: () => indent(1),
      outdent: () => indent(-1),
      bullets: () => cmd('insertUnorderedList'),
      h1: () => cmd('formatBlock', 'h1'),
      h2: () => cmd('formatBlock', 'h2'),
      h3: () => cmd('formatBlock', 'h3'),
      pageBreak: () => insertHtml('<div data-pb="1"></div><p><br></p>'),
      math: () => addMath(false),
      mathDisplay: () => addMath(true),
      find: () => openPanel('find'),
      replace: () => openPanel('find'),
    };
    acts[id]();
  };
  /** คัดลอก/ตัด: ใส่ HTML ที่วางใน Microsoft Word ได้หน้าตาเหมือนเดิม (ฟอนต์ ขนาด pt สมการ Word รูป) */
  const onCopy = (e: React.ClipboardEvent, cut: boolean) => {
    const s = window.getSelection();
    const el = ed.current;
    if (!s || !s.rangeCount || !el) return;
    let html: string | null = null;
    try {
      html = wordClipboardHtml(el, s.getRangeAt(0));
    } catch {
      html = null;
    }
    if (!html) return;
    e.preventDefault();
    e.clipboardData.setData('text/html', html);
    e.clipboardData.setData('text/plain', s.toString());
    if (cut && !readOnly) {
      document.execCommand('delete');
      changed();
    }
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const img = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
    if (img) {
      e.preventDefault();
      addImage(img);
      return;
    }
    const h = e.clipboardData.getData('text/html');
    e.preventDefault();
    if (h) insertHtml(cleanFlowHtml(h, cleanSrc));
    else document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    changed();
  };

  const totalH = n * P - FLOW_GAP;
  const sizeNow = typeof window !== 'undefined' ? curPt() : 16;
  const blockTag = (() => {
    const s = typeof window !== 'undefined' ? window.getSelection() : null;
    const node = s?.anchorNode as HTMLElement | null;
    const b = node && ed.current?.contains(node) ? (node.nodeType === 1 ? node : node.parentElement)?.closest('h1,h2,h3,blockquote,p,div,li') : null;
    return b?.tagName.toLowerCase() ?? 'p';
  })();

  const B = ({ on, title, children, act }: { on?: boolean; title: string; children: React.ReactNode; act: () => void }) => (
    <button type="button" className="st-tb" data-on={on} title={title} aria-label={title} onMouseDown={(e) => e.preventDefault()} onClick={act}>
      {children}
    </button>
  );

  const bar = !readOnly && (
        <div className="st-insp st-wordbar" role="toolbar" aria-label="จัดรูปแบบเอกสาร" onMouseDown={(e) => (e.target as HTMLElement).tagName !== 'SELECT' && e.preventDefault()}>
          <select className="st-wsel" value={['h1', 'h2', 'h3', 'blockquote'].includes(blockTag) ? blockTag : 'p'} onChange={(e) => cmd('formatBlock', e.target.value)} aria-label="รูปแบบย่อหน้า">
            <option value="p">ข้อความปกติ</option>
            <option value="h1">หัวเรื่อง 1</option>
            <option value="h2">หัวเรื่อง 2</option>
            <option value="h3">หัวเรื่อง 3</option>
            <option value="blockquote">กรอบเน้น</option>
          </select>
          <select className="st-wsel" defaultValue="" onChange={(e) => e.target.value && cmd('fontName', e.target.value)} aria-label="ฟอนต์">
            <option value="">ฟอนต์</option>
            {Object.values(FONTS).map((f) => (
              <option key={f.label} value={f.family}>
                {f.label}
              </option>
            ))}
          </select>
          <select className="st-wsel st-wsel-size" value={String(sizeNow)} onChange={(e) => setSize(Number(e.target.value))} aria-label="ขนาดตัวอักษร (pt)" title="ขนาดตัวอักษร (pt แบบ Word)">
            {!SIZES.includes(sizeNow) && <option value={sizeNow}>{sizeNow}</option>}
            {SIZES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          <span className="st-insp-sep" />
          <B title="ตัวหนา (Ctrl+B)" act={() => cmd('bold')} on={docState('bold')}>
            <Bold className="w-4 h-4" />
          </B>
          <B title="ตัวเอียง (Ctrl+I)" act={() => cmd('italic')} on={docState('italic')}>
            <Italic className="w-4 h-4" />
          </B>
          <B title="ขีดเส้นใต้ (Ctrl+U)" act={() => cmd('underline')} on={docState('underline')}>
            <Underline className="w-4 h-4" />
          </B>
          <B title="ขีดฆ่า" act={() => cmd('strikeThrough')}>
            <Strikethrough className="w-4 h-4" />
          </B>
          <B title="ตัวห้อย (Ctrl+=)" act={() => cmd('subscript')}>
            <Subscript className="w-4 h-4" />
          </B>
          <B title="ตัวยก (Ctrl+Shift+=)" act={() => cmd('superscript')}>
            <Superscript className="w-4 h-4" />
          </B>
          <span onMouseDown={keep}>
            <ColorPop title="สีตัวอักษร" value="#1f1b36" onChange={(c) => cmd('foreColor', c)} icon={<Type className="w-4 h-4" />} />
          </span>
          <span onMouseDown={keep}>
            <ColorPop title="ไฮไลต์" value="#fff3c4" onChange={(c) => cmd('hiliteColor', c)} icon={<Highlighter className="w-4 h-4" />} />
          </span>
          <B title="ล้างรูปแบบ (Ctrl+Space)" act={() => cmd('removeFormat')}>
            <Eraser className="w-4 h-4" />
          </B>
          <span className="st-insp-sep" />
          <B title="ชิดซ้าย (Ctrl+L)" act={() => cmd('justifyLeft')}>
            <AlignLeft className="w-4 h-4" />
          </B>
          <B title="กึ่งกลาง (Ctrl+E)" act={() => cmd('justifyCenter')}>
            <AlignCenter className="w-4 h-4" />
          </B>
          <B title="ชิดขวา (Ctrl+R)" act={() => cmd('justifyRight')}>
            <AlignRight className="w-4 h-4" />
          </B>
          <B title="เต็มบรรทัด (Ctrl+J)" act={() => cmd('justifyFull')}>
            <AlignJustify className="w-4 h-4" />
          </B>
          <B title="สัญลักษณ์แสดงหัวข้อ (Ctrl+Shift+L)" act={() => cmd('insertUnorderedList')}>
            <List className="w-4 h-4" />
          </B>
          <B title="ลำดับเลข" act={() => cmd('insertOrderedList')}>
            <ListOrdered className="w-4 h-4" />
          </B>
          <B title="ลดการเยื้อง (Ctrl+Shift+M)" act={() => indent(-1)}>
            <IndentDecrease className="w-4 h-4" />
          </B>
          <B title="เพิ่มการเยื้อง (Ctrl+M)" act={() => indent(1)}>
            <IndentIncrease className="w-4 h-4" />
          </B>
          <select className="st-wsel" defaultValue="" onChange={(e) => e.target.value && setLine(e.target.value)} aria-label="ระยะบรรทัด">
            <option value="">ระยะบรรทัด</option>
            {['1', '1.15', '1.5', '2', '2.5'].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <span className="st-insp-sep" />
          <button type="button" className="st-tb st-tb-wide" onMouseDown={(e) => e.preventDefault()} onClick={() => addMath(false)} title="แทรกสมการ (Alt+=)">
            <Sigma className="w-4 h-4" /> สมการ
          </button>
          <button type="button" className="st-tb st-tb-wide" onMouseDown={(e) => e.preventDefault()} onClick={addGraph} title="แทรกกราฟ/รูปคณิตศาสตร์">
            <LineChart className="w-4 h-4" /> กราฟ/รูป
          </button>
          <button type="button" className="st-tb st-tb-wide" onMouseDown={(e) => (e.preventDefault(), keep())} onClick={() => fileIn.current?.click()} title="แทรกรูปภาพ">
            <ImagePlus className="w-4 h-4" /> รูปภาพ
          </button>
          <input ref={fileIn} type="file" accept="image/*" hidden onChange={(e) => (addImage(e.target.files?.[0]), (e.target.value = ''))} />
          <TablePick onPick={(r, c) => insertHtml(`<table><tbody>${Array.from({ length: r }, () => `<tr>${'<td><br></td>'.repeat(c)}</tr>`).join('')}</tbody></table><p><br></p>`)} onOpen={keep} />
          <SymbolPick onPick={(s) => insertHtml(s)} onOpen={keep} />
          <B title="เส้นคั่น" act={() => insertHtml('<hr><p><br></p>')}>
            <Minus className="w-4 h-4" />
          </B>
          <B title="ขึ้นหน้าใหม่ (Ctrl+Enter)" act={() => insertHtml('<div data-pb="1"></div><p><br></p>')}>
            <FileDown className="w-4 h-4" />
          </B>
          {draw && <span className="st-insp-tag st-insp-draw">ลากบนกระดาษเพื่อวาดรูปร่าง (Esc ยกเลิก)</span>}
          {active && (
            <>
              <span className="st-insp-sep" />
              <span className="st-insp-tag">{active.dataset.tex !== undefined ? 'สมการ' : active.dataset.graph ? 'กราฟ' : active.dataset.shape ? 'รูปร่าง' : 'รูปภาพ'}</span>
              {active.dataset.shape && (
                <>
                  {!isLineShape(active.dataset.shape) && (
                    <ColorPop title="สีพื้นรูปร่าง" value={active.dataset.fill === 'none' ? '#ffffff' : active.dataset.fill || '#bfdbfe'} onChange={(c) => shapeAttr('fill', c)} icon={<span className="st-shape-sw" style={{ background: active.dataset.fill === 'none' ? 'transparent' : active.dataset.fill }} />} />
                  )}
                  <ColorPop title="สีเส้นขอบ" value={active.dataset.stroke || '#1f1b36'} onChange={(c) => shapeAttr('stroke', c)} icon={<span className="st-shape-sw st-shape-sw-line" style={{ borderColor: active.dataset.stroke }} />} />
                  <select className="st-wsel" value={active.dataset.sw || '2'} onChange={(e) => shapeAttr('sw', e.target.value)} aria-label="ความหนาเส้น" title="ความหนาเส้น">
                    {['0', '1', '2', '3', '4', '6', '8', '12'].map((w) => (
                      <option key={w} value={w}>
                        {w === '0' ? 'ไม่มีเส้น' : `เส้น ${w}`}
                      </option>
                    ))}
                  </select>
                  {!isLineShape(active.dataset.shape) && (
                    <button type="button" className="st-tb st-tb-wide" onMouseDown={(e) => e.preventDefault()} onClick={() => shapeAttr('fill', 'none')}>
                      ไม่มีสีพื้น
                    </button>
                  )}
                </>
              )}
              {(active.dataset.tex !== undefined || active.dataset.graph) && (
                <button type="button" className="st-tb st-tb-wide" onMouseDown={(e) => e.preventDefault()} onClick={editActive}>
                  <Pencil className="w-4 h-4" /> แก้ไข
                </button>
              )}
              {active.tagName !== 'SPAN' && (
                <select className="st-wsel" value={active.dataset.wrap || ''} onChange={(e) => setWrap(e.target.value)} aria-label="การจัดวางกับข้อความ" title="การจัดวางกับข้อความ">
                  <option value="">อยู่ในบรรทัดข้อความ</option>
                  <option value="left">ข้อความล้อม (ชิดซ้าย)</option>
                  <option value="right">ข้อความล้อม (ชิดขวา)</option>
                  <option value="behind">อยู่หลังข้อความ</option>
                  <option value="front">อยู่หน้าข้อความ</option>
                </select>
              )}
              {active.tagName !== 'SPAN' &&
                [40, 60, 80, 100].map((w) => (
                  <button
                    key={w}
                    type="button"
                    className="st-tb st-tb-wide"
                    data-on={active.style.width === `${w}%`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      active.style.width = `${w}%`;
                      changed();
                      force((x) => x + 1);
                    }}
                  >
                    {w}%
                  </button>
                ))}
              <B title="ลบ (Delete)" act={removeActive}>
                <Trash2 className="w-4 h-4" />
              </B>
            </>
          )}
        </div>
  );

  const api: WordApi = {
    cmd,
    insertHtml,
    setSize,
    bumpSize,
    setLine,
    indent,
    blockStyle,
    list,
    changeCase,
    addMath,
    insertTex,
    addGraph,
    pickImage: () => {
      keep();
      fileIn.current?.click();
    },
    table,
    cellShade,
    inTable: () => !!curCell(),
    root: () => ed.current,
    changed,
    pages: n,
    opt: wopt,
    setOpt: (p) => onWopt({ ...wopt, ...p }),
    drawing: draw,
    drawShape: (id) => {
      setActive(null);
      setDraw(id);
    },
  };
  const side = !readOnly && (
    <>
      <WordRail panel={panel} onPick={(p) => (p ? openPanel(p) : setPanel(null))} />
      {panel && <WordPanel id={panel} api={api} onClose={() => setPanel(null)} layoutExtra={layoutExtra} findFocus={findFocus} />}
    </>
  );

  return (
    <>
      {bar && (barEl ? createPortal(bar, barEl) : bar)}
      {side && railEl && createPortal(side, railEl)}
      <div className="st-word" data-draw={draw ? '1' : undefined} style={{ width: W * zoom, height: totalH * zoom }}>
        <div style={{ width: W, height: totalH, transform: `scale(${zoom})`, transformOrigin: '0 0', position: 'relative' }}>
          {pages.map((p, i) => (
            <div key={p.id} className="st-sheet" style={{ top: i * P, width: W, height: H }}>
              <PageView page={{ ...p, items: [] }} W={W} H={H} index={i} total={n} wopt={wopt} />
              <span className="st-sheet-no">หน้า {i + 1}</span>
            </div>
          ))}
          <div
            ref={ed}
            className="st-flow st-word-ed"
            data-std={wopt.std || undefined}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            spellCheck={false}
            style={{ ...flowBoxStyle(wopt, W), position: 'absolute', left: 0, top: 0, minHeight: totalH }}
            onInput={changed}
            onKeyUp={keepShow}
            onMouseUp={keepShow}
            onBlur={keep}
            onKeyDown={onKey}
            onPaste={onPaste}
            onCopy={(e) => onCopy(e, false)}
            onCut={(e) => onCopy(e, true)}
            onPointerDown={onDown}
            onDragStart={(e) => (e.target as HTMLElement).closest?.('img, figure') && e.preventDefault()}
            onDoubleClick={onDouble}
            onDrop={(e) => {
              const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith('image/'));
              if (f) {
                e.preventDefault();
                addImage(f);
              }
            }}
          />
          {pages.map((p, i) =>
            p.items.length ? (
              <div key={`o${p.id}`} className="st-word-items" style={{ top: i * P, width: W, height: H }}>
                {p.items.map((it: Item) => (
                  <ItemView key={it.id} it={it} />
                ))}
              </div>
            ) : null
          )}
          {ghost && <span className="st-word-ghost" style={{ left: ghost.x, top: ghost.y, width: ghost.w, height: ghost.h, borderWidth: 2 / zoom }} />}
          {active && ed.current?.contains(active) && (
            <ActiveRing box={rel(active)} zoom={zoom} onGrab={readOnly || active.tagName === 'SPAN' ? undefined : (c, x, y) => grab(active, x, y, c)} />
          )}
        </div>
      </div>
    </>
  );
});

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const docState = (c: string) => {
  try {
    return typeof document !== 'undefined' && document.queryCommandState(c);
  } catch {
    return false;
  }
};

const caretAt = (x: number, y: number): Range | null => {
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
  const p = (document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint?.(x, y);
  if (!p) return null;
  const r = document.createRange();
  r.setStart(p.offsetNode, p.offset);
  return r;
};
/** จุดนี้อยู่บนตัวอักษรจริงไหม (ไม่ใช่ที่ว่างข้างบรรทัด) */
const onText = (x: number, y: number) => {
  const r = caretAt(x, y);
  const t = r?.startContainer;
  if (!r || !t || t.nodeType !== 3) return false;
  const rr = document.createRange();
  rr.setStart(t, Math.max(0, r.startOffset - 1));
  rr.setEnd(t, Math.min((t as Text).length, r.startOffset + 1));
  return Array.from(rr.getClientRects()).some((b) => x >= b.left - 2 && x <= b.right + 2 && y >= b.top && y <= b.bottom);
};

/** กรอบบอกว่ากำลังเลือกสมการ/กราฟ/รูปไหนอยู่ + จุดจับมุมไว้ย่อขยาย */
function ActiveRing({ box, zoom, onGrab }: { box: { x: number; y: number; w: number; h: number }; zoom: number; onGrab?: (corner: string, x: number, y: number) => void }) {
  const s = 1 / zoom;
  const k = 14 * s;
  return (
    <span className="st-word-ring" style={{ left: box.x - 3 * s, top: box.y - 3 * s, width: box.w + 6 * s, height: box.h + 6 * s, borderWidth: 2.5 * s }}>
      {onGrab &&
        ['nw', 'ne', 'sw', 'se'].map((c) => (
          <i
            key={c}
            data-c={c}
            style={{ width: k, height: k, borderWidth: 2 * s, [c[0] === 'n' ? 'top' : 'bottom']: -k / 2, [c[1] === 'w' ? 'left' : 'right']: -k / 2 }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onGrab(c, e.clientX, e.clientY);
            }}
          />
        ))}
    </span>
  );
}

function TablePick({ onPick, onOpen }: { onPick: (r: number, c: number) => void; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const [hv, setHv] = useState<[number, number]>([0, 0]);
  return (
    <span className="relative">
      <button type="button" className="st-tb st-tb-wide" onMouseDown={(e) => (e.preventDefault(), onOpen())} onClick={() => setOpen(!open)} title="แทรกตาราง">
        <Table className="w-4 h-4" /> ตาราง
      </button>
      {open && (
        <span className="st-wpop" onMouseLeave={() => setHv([0, 0])}>
          <span className="st-wgrid">
            {Array.from({ length: 64 }, (_, i) => {
              const r = Math.floor(i / 8) + 1;
              const c = (i % 8) + 1;
              return (
                <button
                  key={i}
                  type="button"
                  data-on={r <= hv[0] && c <= hv[1]}
                  onMouseEnter={() => setHv([r, c])}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setOpen(false);
                    onPick(r, c);
                  }}
                  aria-label={`${r} แถว ${c} คอลัมน์`}
                />
              );
            })}
          </span>
          <span className="text-xs font-bold">{hv[0] ? `${hv[0]} แถว x ${hv[1]} คอลัมน์` : 'เลือกขนาดตาราง'}</span>
        </span>
      )}
    </span>
  );
}

function SymbolPick({ onPick, onOpen }: { onPick: (s: string) => void; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button type="button" className="st-tb st-tb-wide" onMouseDown={(e) => (e.preventDefault(), onOpen())} onClick={() => setOpen(!open)} title="สัญลักษณ์">
        <span className="font-bold">Ω</span> สัญลักษณ์
      </button>
      {open && (
        <span className="st-wpop">
          <span className="st-wsym">
            {SYMBOLS.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  onPick(s);
                }}
              >
                {s}
              </button>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}
