'use client';

import React, { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Copy,
  Lock,
  Move,
  Pencil,
  Trash2,
  Unlock,
} from 'lucide-react';
import { FLOW_GAP, WORD_SINGLE, cleanFlowHtml, flowIsEmpty, hasPageField, pageLabel, paginate, stripPageField, withPageField, type WordOpt } from '@/lib/studio/flow';
import { cleanSrc, type Item, type Page } from '@/lib/studio/doc';
import { cleanGraph, type GraphSpec } from '@/lib/studio/graph';
import { wordClipboardHtml } from './wordCopy';
import { ItemView, PageView, fillPageFields, flowBoxStyle, hfOffset } from './render';
import { FONTS } from './fonts';
import { hydrateFlow, isLineShape } from './flowDom';
import { ColorPop } from './ui';
import { SIZES, ptToPx, pxToPt, WordPanel, type TableOp, type WordApi, type WordPanelId } from './WordPanels';
import { WordRibbon } from './WordRibbon';
import { WORD_KEYS, comboOf, type WordKeyId } from '@/lib/studio/keys';

export interface WordHandle {
  undo: () => void;
  redo: () => void;
  focus: () => void;
}

/** ตำแหน่งเคอร์เซอร์เป็นจำนวนตัวอักษรนับจากต้นเอกสาร (-1 = ไม่อยู่ในเอกสาร) */
function caretOffset(el: HTMLElement): number {
  const s = window.getSelection();
  if (!s || !s.rangeCount || !el.contains(s.anchorNode)) return -1;
  const r = document.createRange();
  r.selectNodeContents(el);
  r.setEnd(s.anchorNode!, s.anchorOffset);
  return r.toString().length;
}
/** วางเคอร์เซอร์ที่ตัวอักษรที่ n (-1/เกิน = ท้ายเอกสาร) */
function setCaret(el: HTMLElement, n: number) {
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  if (n >= 0) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode() as Text | null; t; t = w.nextNode() as Text | null) {
      if (n <= t.length) {
        r.setStart(t, n);
        r.collapse(true);
        break;
      }
      n -= t.length;
    }
  }
  el.focus({ preventScroll: true });
  window.getSelection()?.removeAllRanges();
  window.getSelection()?.addRange(r);
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
    /** ที่วางบานจัดรูปแบบด้านขวา */
    rightEl: HTMLElement | null;
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
>(function WordEditor({ html, pages, wopt, onWopt, W, H, zoom, readOnly, rightEl, railEl, layoutExtra, onChange, onNeedPages, openMath, openGraph, upload }, ref) {
  const ed = useRef<HTMLDivElement>(null);
  /** หัว/ท้ายกระดาษที่กำลังแก้ (ดับเบิลคลิกขอบบน/ล่างของกระดาษแบบ Word) */
  const hfRef = useRef<HTMLDivElement>(null);
  const [hf, setHf] = useState<{ part: 'head' | 'foot'; page: number } | null>(null);
  const hfOn = useRef(hf);
  hfOn.current = hf;
  /** ที่ที่กำลังพิมพ์อยู่: หัว/ท้ายกระดาษ หรือเนื้อเอกสาร (คำสั่งทุกปุ่มทำกับที่นี่) */
  const cur = () => (hfOn.current && hfRef.current) || ed.current;
  const woptRef = useRef(wopt);
  woptRef.current = wopt;
  const onWoptRef = useRef(onWopt);
  onWoptRef.current = onWopt;
  const hfTimer = useRef(0);
  const flushHf = () => {
    window.clearTimeout(hfTimer.current);
    const h = hfOn.current;
    const el = hfRef.current;
    if (!h || !el) return;
    const v = cleanFlowHtml(el.innerHTML, cleanSrc);
    const clean = flowIsEmpty(v) ? '' : v;
    if (clean !== woptRef.current[h.part]) onWoptRef.current({ ...woptRef.current, [h.part]: clean });
  };
  const emitHf = () => {
    window.clearTimeout(hfTimer.current);
    hfTimer.current = window.setTimeout(flushHf, 400);
  };
  const closeHf = () => {
    flushHf();
    setHf(null);
  };
  const emitted = useRef<string | null>(null);
  const saved = useRef<Range | null>(null);
  const timer = useRef<number>(0);
  const [active, setActive] = useState<HTMLElement | null>(null);
  const [, force] = useState(0);
  // แผงเครื่องมือด้านข้าง: จอใหญ่เปิดแผงหน้าแรกไว้ก่อน
  const [panel, setPanel] = useState<WordPanelId | null>(null);
  const [findFocus, setFindFocus] = useState(0);
  useEffect(() => {
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
    hist.current.last = { html, caret: -1 };
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
      hist.current.last = { html: clean, caret: caretOffset(el) };
      onChange(clean);
    }, 450);
  }, [onChange]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const changed = () => {
    if (hfOn.current && hfRef.current) {
      hydrateFlow(hfRef.current);
      emitHf();
      return;
    }
    const el = ed.current;
    if (!el) return;
    record();
    hydrateFlow(el);
    requestAnimationFrame(relayout);
    emit();
  };

  /*
   * ย้อนกลับ/ทำซ้ำของตัวเอง ย้อนได้ไม่จำกัดรอบ (เพดาน 300)
   * execCommand('undo') ใช้ไม่ได้ เพราะหลายคำสั่งแก้ DOM ตรงๆ (สมการ รูปร่าง ตาราง ตัดหน้า) ประวัติของเบราว์เซอร์เลยขาด
   * เก็บ HTML ก่อนเริ่มแก้แต่ละช่วง (พิมพ์ต่อเนื่องไม่เกิน 0.7 วิ = 1 ขั้น)
   */
  type Snap = { html: string; caret: number };
  const hist = useRef<{ past: Snap[]; future: Snap[]; last: Snap | null; burst: number }>({ past: [], future: [], last: null, burst: 0 });
  const record = () => {
    const h = hist.current;
    if (!h.last) return;
    if (!h.burst) {
      h.past.push(h.last);
      if (h.past.length > 300) h.past.shift();
      h.future = [];
    }
    window.clearTimeout(h.burst);
    h.burst = window.setTimeout(() => (h.burst = 0), 700);
  };
  const stepHist = (back: boolean) => {
    const el = ed.current;
    const h = hist.current;
    if (!el || !h.last) return;
    window.clearTimeout(h.burst);
    h.burst = 0;
    window.clearTimeout(timer.current);
    const now = { html: cleanFlowHtml(el.innerHTML, cleanSrc), caret: caretOffset(el) };
    const to = (back ? h.past : h.future).pop();
    if (!to) return;
    (back ? h.future : h.past).push(now);
    h.last = to;
    setActive(null);
    el.innerHTML = to.html || '<p><br></p>';
    emitted.current = to.html;
    hydrateFlow(el);
    relayout();
    setCaret(el, to.caret);
    keep();
    onChange(to.html);
  };

  /** หัว/ท้ายกระดาษใช้ประวัติของเบราว์เซอร์ (กล่องเล็ก แก้ผ่าน execCommand) เนื้อเอกสารใช้ประวัติของเราเอง */
  const undoRedo = (back: boolean) => {
    if (hfOn.current && hfRef.current) {
      restore();
      document.execCommand(back ? 'undo' : 'redo');
      return changed();
    }
    stepHist(back);
  };

  /* ---------------- ตำแหน่งเคอร์เซอร์ ---------------- */
  const keep = () => {
    const s = window.getSelection();
    if (s && s.rangeCount && cur()?.contains(s.anchorNode)) saved.current = s.getRangeAt(0).cloneRange();
  };
  // แถบเครื่องมือโชว์ขนาด/สไตล์ตรงเคอร์เซอร์ล่าสุด
  const keepShow = () => {
    keep();
    force((x) => x + 1);
  };
  const restore = () => {
    const el = cur();
    if (!el) return;
    // ไม่เลื่อนจอไปบนสุดของเอกสาร (focus ปกติเลื่อนให้เห็นต้นกล่อง)
    el.focus({ preventScroll: true });
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
      cur()?.querySelectorAll<HTMLElement>('span[style*="xxx-large"], font[size="7"]').forEach((el) => {
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
    const el = node && cur()?.contains(node) ? (node.nodeType === 1 ? (node as HTMLElement) : node.parentElement) : null;
    return pxToPt(el ? parseFloat(getComputedStyle(el).fontSize) || 21 : 21);
  };
  /** ฟอนต์ตรงเคอร์เซอร์ (ค่า family ของ FONTS ที่ชื่อแรกตรงกัน) */
  const curFont = () => {
    const node = window.getSelection()?.anchorNode;
    const el = node && cur()?.contains(node) ? (node.nodeType === 1 ? (node as HTMLElement) : node.parentElement) : cur();
    const first = (f: string) => f.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
    const now = el ? first(getComputedStyle(el).fontFamily) : '';
    return Object.values(FONTS).find((f) => first(f.family) === now)?.family ?? '';
  };
  /** ย่อหน้าที่อยู่ในส่วนที่เลือก */
  const blocks = () => {
    const el = cur();
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
    if (l && cur()?.contains(l)) l.style.listStyleType = type;
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
    return c && cur()?.contains(c) ? c : null;
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
    const span = document.createElement('span');
    span.dataset.tex = tex;
    insertSpan(span);
  };
  /** ช่องเลขหน้า (ใช้ในหัว/ท้ายกระดาษ) */
  const insertPageNum = () => {
    const span = document.createElement('span');
    span.dataset.pg = '1';
    span.textContent = hfOn.current ? pageLabel(woptRef.current, hfOn.current.page, n) : '#';
    insertSpan(span);
  };
  const insertSpan = (span: HTMLSpanElement) => {
    restore();
    const s = window.getSelection();
    const root = cur();
    if (!s || !s.rangeCount || !root) return;
    const r = s.getRangeAt(0);
    r.deleteContents();
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
    undo: () => undoRedo(true),
    redo: () => undoRedo(false),
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
    if (!el || isLocked(el)) return;
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
  /** มุมบนซ้ายของกล่องที่ชิ้นอิสระยึดอยู่ (รูปร่างยึดกับย่อหน้า ชิ้นเก่ายึดกับทั้งเอกสาร) */
  const origin = (el: HTMLElement) => {
    const op = el.offsetParent as HTMLElement | null;
    return op && op !== ed.current && ed.current?.contains(op) ? rel(op) : { x: 0, y: 0, w: 0, h: 0 };
  };
  const isFree = (el: HTMLElement) => el.dataset.wrap === 'behind' || el.dataset.wrap === 'front';
  /** ล็อกแล้ว: เลือกได้ (เพื่อปลดล็อก) แต่ย้าย ย่อขยาย แก้ ลบ ไม่ได้ */
  const isLocked = (el: HTMLElement | null) => el?.dataset.lock === '1';
  /** ชิ้นใต้จุดคลิก รวมชิ้น "หลังข้อความ" เมื่อไม่ได้คลิกโดนตัวอักษร */
  const pickAt = (x: number, y: number, target: HTMLElement) => {
    const root = ed.current;
    if (!root) return null;
    const direct = target.closest<HTMLElement>('span[data-tex], figure[data-graph], [data-shape], img');
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
    if (el.tagName === 'IMG' || el.tagName === 'SPAN') return r.insertNode(el);
    let b: Node | null = r.startContainer === root ? root.childNodes[r.startOffset] ?? null : r.startContainer;
    while (b && b.parentNode !== root) b = b.parentNode;
    if (b === el) return;
    const br = b instanceof HTMLElement ? b.getBoundingClientRect() : null;
    root.insertBefore(el, b && br && y > br.top + br.height / 2 ? b.nextSibling : b);
  };
  /** ลาก (ไม่ส่ง corner) หรือย่อขยายจากมุม */
  const grab = (el: HTMLElement, sx: number, sy: number, corner?: string) => {
    const z = zoomRef.current;
    const free = isFree(el);
    // ตำแหน่งเทียบกับกล่องที่ยึด (left/top ของชิ้นอิสระ)
    const o = origin(el);
    const b0 = rel(el);
    const box = { ...b0, x: b0.x - o.x, y: b0.y - o.y };
    const shape = !!el.dataset.shape;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / z;
      const dy = (ev.clientY - sy) / z;
      if (!moved && Math.hypot(dx * z, dy * z) < 4) return;
      moved = true;
      if (corner && shape) {
        // รูปร่าง: ยืดแยกด้านได้ (กว้าง/สูงอิสระ) แบบ Word
        const west = corner.includes('w');
        const east = corner.includes('e');
        const north = corner.includes('n');
        const south = corner.includes('s');
        const w = Math.max(6, Math.min(W, box.w + (east ? dx : west ? -dx : 0)));
        const h = Math.max(2, Math.min(H, box.h + (south ? dy : north ? -dy : 0)));
        const ar = String(Math.round(Math.max(0.02, Math.min(60, w / h)) * 1000) / 1000);
        el.style.width = `${Math.round(w)}px`;
        el.dataset.ar = ar;
        el.style.aspectRatio = ar;
        if (free && west) el.style.left = `${Math.round(box.x + box.w - w)}px`;
        if (free && north) el.style.top = `${Math.round(box.y + box.h - h)}px`;
      } else if (corner) {
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
      const o = origin(el);
      el.style.width = `${Math.round(box.w)}px`;
      el.style.left = `${Math.round(box.x - o.x)}px`;
      el.style.top = `${Math.round(box.y - o.y)}px`;
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
  const toggleLock = () => {
    if (!active) return;
    if (isLocked(active)) delete active.dataset.lock;
    else active.dataset.lock = '1';
    changed();
    force((x) => x + 1);
  };
  /** ทำสำเนาชิ้นที่เลือก วางถัดไป (ชิ้นอิสระเลื่อนลงขวานิดหน่อย) */
  const dupActive = () => {
    const el = active;
    if (!el) return;
    const c = el.cloneNode(true) as HTMLElement;
    delete c.dataset.sel;
    delete c.dataset.lock;
    if (isFree(el)) {
      c.style.left = `${(parseFloat(el.style.left) || 0) + 24}px`;
      c.style.top = `${(parseFloat(el.style.top) || 0) + 24}px`;
    }
    el.after(c);
    changed();
    setActive(c);
  };
  const removeActive = () => {
    if (isLocked(active)) return;
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
      // รูปร่างยึดกับย่อหน้าตรงที่วาด (แบบ Word): ย่อหน้าเลื่อน (กด Enter ข้างบน) รูปก็เลื่อนตาม
      const sp = document.createElement('span');
      sp.dataset.shape = line ? ((b.x - a.x) * (b.y - a.y) < 0 ? 'ln2' : 'ln') : id;
      sp.dataset.fill = line ? 'none' : '#bfdbfe';
      sp.dataset.stroke = '#1f1b36';
      sp.dataset.sw = line ? '3' : '2';
      sp.dataset.ar = String(Math.round(Math.max(0.02, Math.min(60, Math.max(r.w, 2) / Math.max(r.h, 2))) * 1000) / 1000);
      sp.dataset.wrap = 'front';
      sp.style.width = `${Math.round(Math.max(r.w, 4))}px`;
      sp.contentEditable = 'false';
      const host = anchorAt(root, r.y);
      // ไว้ท้ายย่อหน้า: กด Enter ท้ายย่อหน้ารูปอยู่กับข้อความเดิม กด Enter หน้าย่อหน้ารูปเลื่อนลงตามข้อความ
      host.appendChild(sp);
      const o = origin(sp);
      sp.style.left = `${Math.round(r.x - o.x)}px`;
      sp.style.top = `${Math.round(r.y - o.y)}px`;
      changed();
      setActive(sp);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  /** ย่อหน้าที่จะยึดรูปร่าง: ย่อหน้าสุดท้ายที่เริ่มเหนือจุดที่วาด (ไม่มีก็สร้างใหม่) */
  const anchorAt = (root: HTMLElement, y: number) => {
    const ok = (Array.from(root.children) as HTMLElement[]).filter((c) => /^(P|H1|H2|H3|BLOCKQUOTE)$/.test(c.tagName) || (c.tagName === 'DIV' && !c.dataset.pb));
    let host = ok[0];
    for (const c of ok) if (rel(c).y <= y) host = c;
    if (!host) {
      host = document.createElement('p');
      host.innerHTML = '<br>';
      root.appendChild(host);
    }
    return host;
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
    // คลิกที่เนื้อเอกสาร = ออกจากหัว/ท้ายกระดาษ (แบบ Word)
    if (hfOn.current) closeHf();
    if (drawRef.current) return startDraw(e);
    const t = pickAt(e.clientX, e.clientY, e.target as HTMLElement);
    setActive(t);
    if (!t || t.dataset.tex !== undefined || isLocked(t)) return;
    e.preventDefault();
    restore();
    grab(t, e.clientX, e.clientY);
  };
  /** จุดบนจออยู่ในขอบบน/ล่างของกระดาษหน้าไหน (ที่ของหัว/ท้ายกระดาษ) */
  const zoneAt = (cx: number, cy: number): { part: 'head' | 'foot'; page: number } | null => {
    const el = ed.current;
    if (!el) return null;
    const y = (cy - el.getBoundingClientRect().top) / zoomRef.current;
    const page = Math.floor(y / P);
    const iy = y - page * P;
    if (page < 0 || page >= n || iy > H) return null;
    if (iy < wopt.mt) return { part: 'head', page };
    if (iy > H - wopt.mb) return { part: 'foot', page };
    return null;
  };
  const openHf = (z: { part: 'head' | 'foot'; page: number }) => {
    if (readOnly) return;
    flushHf();
    setActive(null);
    setHf(z);
  };
  // เปิดหัว/ท้ายกระดาษ: ใส่เนื้อหาเดิมแล้ววางเคอร์เซอร์ท้ายสุด
  useLayoutEffect(() => {
    const el = hfRef.current;
    if (!hf || !el) return;
    // เลขหน้าที่เลือกไว้กลายเป็นช่องในหัว/ท้ายกระดาษ พิมพ์ข้อความหน้า/หลังเลขได้แบบ Word
    el.innerHTML = withPageField(woptRef.current, hf.part) || '<p><br></p>';
    hydrateFlow(el);
    fillPageFields(el, pageLabel(woptRef.current, hf.page, n));
    const fresh = el.innerHTML.includes('data-pg') && !hasPageField(woptRef.current[hf.part]);
    if (fresh) flushHf();
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest' });
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    // เพิ่งย้ายเลขหน้าเข้ามา: เคอร์เซอร์อยู่หน้าเลข พิมพ์ "หน้า " ได้เลย
    const pgEl = fresh && el.querySelector('span[data-pg]');
    if (pgEl) r.setStartBefore(pgEl), r.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(r);
    saved.current = r.cloneRange();
  }, [hf?.part, hf?.page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => window.clearTimeout(hfTimer.current), []);

  const onDouble = (e: React.MouseEvent) => {
    if (hfOn.current) return closeHf();
    const t = pickAt(e.clientX, e.clientY, e.target as HTMLElement);
    const zone = !t ? zoneAt(e.clientX, e.clientY) : null;
    if (zone) {
      e.preventDefault();
      return openHf(zone);
    }
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
    // ย้อนกลับ/ทำซ้ำ (ใช้ e.code แป้นไทยก็กดได้)
    if (mod && !e.altKey && (e.code === 'KeyZ' || e.code === 'KeyY')) return run(() => undoRedo(e.code === 'KeyZ' && !e.shiftKey));
    if (active) {
      if (e.key === 'Delete' || e.key === 'Backspace') return run(removeActive);
      if (e.key === 'Escape') return run(() => setActive(null));
      if (isFree(active) && !isLocked(active) && e.key.startsWith('Arrow')) {
        return run(() => {
          const d = e.shiftKey ? 10 : 1;
          const r0 = rel(active);
          const o = origin(active);
          const b = { x: r0.x - o.x, y: r0.y - o.y };
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
        if (cell && cur()?.contains(cell)) {
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
  const fontNow = typeof window !== 'undefined' ? curFont() : '';
  const blockTag = (() => {
    const s = typeof window !== 'undefined' ? window.getSelection() : null;
    const node = s?.anchorNode as HTMLElement | null;
    const b = node && cur()?.contains(node) ? (node.nodeType === 1 ? node : node.parentElement)?.closest('h1,h2,h3,blockquote,p,div,li') : null;
    return b?.tagName.toLowerCase() ?? 'p';
  })();

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
    setOpt: (p) => {
      if (p.num === undefined || p.num === wopt.num) return onWopt({ ...woptRef.current, ...p });
      // เปลี่ยนตำแหน่งเลขหน้า: เอาช่องเลขหน้าเดิมออกจากหัว/ท้ายกระดาษ
      flushHf();
      setHf(null);
      const o = woptRef.current;
      onWopt({ ...o, ...p, head: stripPageField(o.head), foot: stripPageField(o.foot) });
    },
    insertPageNum,
    drawing: draw,
    drawShape: (id) => {
      setActive(null);
      setDraw(id);
    },
    // หน้าแรกไม่แสดงหัว/ท้ายกระดาษ (หน้าแรกแตกต่าง) ไปแก้ที่หน้า 2
    editHf: (part) => openHf({ part, page: !wopt.numFirst && n > 1 ? 1 : 0 }),
    clip: async (op) => {
      restore();
      if (op !== 'paste') {
        // ผ่านตัวจัดการคัดลอกของเอกสาร (วางใน Word ได้)
        if (!document.execCommand(op)) return 'เบราว์เซอร์ไม่ยอมให้กดจากปุ่ม ใช้ Ctrl+C / Ctrl+X แทน';
        if (op === 'cut') changed();
        return null;
      }
      try {
        const items = await navigator.clipboard.read();
        for (const it of items) {
          if (it.types.includes('text/html')) {
            restore();
            insertHtml(cleanFlowHtml(await (await it.getType('text/html')).text(), cleanSrc));
            return null;
          }
        }
        const t = await navigator.clipboard.readText();
        restore();
        document.execCommand('insertText', false, t);
        changed();
        return null;
      } catch {
        return 'เบราว์เซอร์ไม่อนุญาตให้วางจากปุ่ม กด Ctrl+V แทน';
      }
    },
    selectAll: () => {
      const el = cur();
      if (!el) return;
      el.focus({ preventScroll: true });
      const r = document.createRange();
      r.selectNodeContents(el);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(r);
      keep();
    },
    openFind: () => openPanel('find'),
    openKeys: () => openPanel('keys'),
    closePane: () => setPanel(null),
    toc: () => {
      // สารบัญจากหัวเรื่อง 1-3 พร้อมเลขหน้า ณ ตอนกด (แบบกดสร้างใหม่ ไม่ใช่ฟิลด์อัปเดตเองแบบ Word)
      const root = ed.current;
      if (!root) return;
      const hs = Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3')).filter((h) => h.innerText.trim());
      if (!hs.length) return window.alert('ยังไม่มีหัวเรื่อง: ตั้งย่อหน้าเป็น หัวเรื่อง 1-3 (แท็บหน้าแรก > สไตล์) ก่อน แล้วกดสารบัญอีกครั้ง');
      const rows = hs.map((h) => {
        const t = h.innerText.trim().slice(0, 80);
        const pg = Math.floor(rel(h).y / P) + wopt.numStart;
        return `<p style="margin-left: ${(+h.tagName[1] - 1) * 36}px">${esc(t)} ${'.'.repeat(Math.max(6, 70 - t.length))} ${pg}</p>`;
      });
      insertHtml(`<p style="text-align: center"><b>สารบัญ</b></p>${rows.join('')}<p><br></p>`);
    },
  };
  const B = ({ on, title, children, act }: { on?: boolean; title: string; children: React.ReactNode; act: () => void }) => (
    <button type="button" className="st-tb" data-on={on} title={title} aria-label={title} onMouseDown={(e) => e.preventDefault()} onClick={act}>
      {children}
    </button>
  );

  /** เครื่องมือของชิ้นที่เลือก: แท็บตามบริบทบนริบบอน (แบบ Word: รูปแบบรูปร่าง / รูปแบบรูปภาพ) */
  const objectTools = active ? (
    <>
    <div className="st-wobj-quick">
      <B title="ทำสำเนา" act={dupActive}>
        <Copy className="w-4 h-4" />
      </B>
      <B title={isLocked(active) ? 'ปลดล็อก' : 'ล็อก (กันย้าย/แก้โดยไม่ตั้งใจ)'} act={toggleLock}>
        {isLocked(active) ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
      </B>
      {!isLocked(active) && (
        <B title="ลบ (Delete)" act={removeActive}>
          <Trash2 className="w-4 h-4" />
        </B>
      )}
    </div>
    {!isLocked(active) && (<>
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
    {active.dataset.tex === undefined && (
      <button type="button" className="st-tb st-tb-wide" data-on={isFree(active)} onMouseDown={(e) => e.preventDefault()} onClick={() => setWrap(isFree(active) ? '' : 'front')} title="วางตรงไหนบนกระดาษก็ได้ ไม่ยึดกับบรรทัด">
        <Move className="w-4 h-4" /> ขยับอิสระ (ไม่ยึดบรรทัด)
      </button>
    )}
    {active.dataset.tex === undefined && (
      <select className="st-wsel" value={active.dataset.wrap || ''} onChange={(e) => setWrap(e.target.value)} aria-label="การจัดวางกับข้อความ" title="การจัดวางกับข้อความ">
        <option value="">อยู่ในบรรทัดข้อความ</option>
        <option value="left">ข้อความล้อม (ชิดซ้าย)</option>
        <option value="right">ข้อความล้อม (ชิดขวา)</option>
        <option value="behind">อยู่หลังข้อความ</option>
        <option value="front">อยู่หน้าข้อความ</option>
      </select>
    )}
    {active.dataset.tex === undefined &&
      !active.dataset.shape &&
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
    </>)}
    </>
  ) : null;
  const objectLabel = active ? (active.dataset.tex !== undefined ? 'เครื่องมือสมการ' : active.dataset.graph ? 'รูปแบบกราฟ' : active.dataset.shape ? 'รูปแบบรูปร่าง' : 'รูปแบบรูปภาพ') : '';
  // เครื่องมือแบบ Word แยกซ้าย-ขวา ไม่กินพื้นที่ด้านบนของกระดาษ: ซ้าย = แท็บหลัก, ขวา = บานจัดรูปแบบของชิ้นที่เลือก
  const side = !readOnly && (
    <>
      <WordRibbon
        side="left"
        api={api}
        sizeNow={sizeNow}
        fontNow={fontNow}
        blockTag={blockTag}
        isOn={docState}
        inTable={!!curCell()}
        object={objectTools}
        objectLabel={objectLabel}
        layoutExtra={layoutExtra}
        hf={hf?.part ?? null}
        closeHf={closeHf}
        drawing={draw}
        pane={panel ? <WordPanel id={panel} api={api} onClose={() => setPanel(null)} findFocus={findFocus} /> : undefined}
      />
      <input ref={fileIn} type="file" accept="image/*" hidden onChange={(e) => (addImage(e.target.files?.[0]), (e.target.value = ''))} />
    </>
  );
  const right = !readOnly && (
    <WordRibbon
      side="right"
      api={api}
      sizeNow={sizeNow}
      fontNow={fontNow}
      blockTag={blockTag}
      isOn={docState}
      inTable={!!curCell()}
      object={objectTools}
      objectLabel={objectLabel}
      layoutExtra={layoutExtra}
      hf={hf?.part ?? null}
      closeHf={closeHf}
      drawing={draw}
    />
  );

  return (
    <>
      {side && railEl && createPortal(side, railEl)}
      {right && rightEl && createPortal(right, rightEl)}
      <div className="st-word" data-draw={draw ? '1' : undefined} data-hf={hf ? '1' : undefined} style={{ width: W * zoom, height: totalH * zoom }}>
        <div style={{ width: W, height: totalH, transform: `scale(${zoom})`, transformOrigin: '0 0', position: 'relative' }}>
          {pages.map((p, i) => (
            <div key={p.id} className="st-sheet" style={{ top: i * P, width: W, height: H }}>
              <PageView page={{ ...p, items: [] }} W={W} H={H} index={i} total={n} wopt={wopt} hideHf={hf && hf.page === i ? hf.part : undefined} />
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
            onDragStart={(e) => (e.target as HTMLElement).closest?.('img, figure, [data-shape]') && e.preventDefault()}
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
          {hf && (
            <>
              <div className="st-hf-zone" data-part={hf.part} style={{ top: hf.part === 'head' ? hf.page * P : hf.page * P + H - wopt.mb, height: hf.part === 'head' ? wopt.mt : wopt.mb, width: W }}>
                <span className="st-hf-tag">{hf.part === 'head' ? 'หัวกระดาษ (ขึ้นทุกหน้า)' : 'ท้ายกระดาษ (ขึ้นทุกหน้า)'}</span>
              </div>
              <div
                ref={hfRef}
                className="st-flow st-hf-ed"
                data-std={wopt.std || undefined}
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                aria-label={hf.part === 'head' ? 'หัวกระดาษ' : 'ท้ายกระดาษ'}
                style={{
                  left: wopt.ml,
                  width: W - wopt.ml - wopt.mr,
                  fontFamily: flowBoxStyle(wopt, W).fontFamily,
                  ...(hf.part === 'head' ? { top: hf.page * P + hfOffset(wopt.mt) } : { bottom: totalH - (hf.page * P + H) + hfOffset(wopt.mb) }),
                }}
                onInput={changed}
                onKeyUp={keepShow}
                onMouseUp={keepShow}
                onBlur={keep}
                onPaste={onPaste}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    return closeHf();
                  }
                  onKey(e);
                }}
              />
            </>
          )}
          {ghost && <span className="st-word-ghost" style={{ left: ghost.x, top: ghost.y, width: ghost.w, height: ghost.h, borderWidth: 2 / zoom }} />}
          {active && ed.current?.contains(active) && (
            <ActiveRing box={rel(active)} zoom={zoom} sides={!!active.dataset.shape} onGrab={readOnly || active.dataset.tex !== undefined || isLocked(active) ? undefined : (c, x, y) => grab(active, x, y, c)} />
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
function ActiveRing({ box, zoom, onGrab, sides }: { box: { x: number; y: number; w: number; h: number }; zoom: number; onGrab?: (corner: string, x: number, y: number) => void; sides?: boolean }) {
  const s = 1 / zoom;
  const k = 14 * s;
  // จุดจับ: มุม 4 จุด (+ กลางด้าน 4 จุดสำหรับรูปร่าง ยืดทีละด้านได้)
  const at = (c: string): React.CSSProperties => ({
    width: k,
    height: k,
    borderWidth: 2 * s,
    ...(c.includes('n') ? { top: -k / 2 } : c.includes('s') ? { bottom: -k / 2 } : { top: `calc(50% - ${k / 2}px)` }),
    ...(c.includes('w') ? { left: -k / 2 } : c.includes('e') ? { right: -k / 2 } : { left: `calc(50% - ${k / 2}px)` }),
  });
  return (
    <span className="st-word-ring" style={{ left: box.x - 3 * s, top: box.y - 3 * s, width: box.w + 6 * s, height: box.h + 6 * s, borderWidth: 2.5 * s }}>
      {onGrab &&
        (sides ? ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] : ['nw', 'ne', 'sw', 'se']).map((c) => (
          <i
            key={c}
            data-c={c}
            style={at(c)}
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
