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
import { FLOW_GAP, FLOW_MARGIN, cleanFlowHtml, paginate } from '@/lib/studio/flow';
import { cleanSrc, type Item, type Page } from '@/lib/studio/doc';
import { cleanGraph, type GraphSpec } from '@/lib/studio/graph';
import { FONTS } from './fonts';
import { ItemView, PageView } from './render';
import { hydrateFlow } from './flowDom';
import { ColorPop } from './ui';

export interface WordHandle {
  undo: () => void;
  redo: () => void;
  focus: () => void;
}

const SIZES = [12, 14, 16, 18, 21, 24, 28, 32, 40, 48, 64];
const SYMBOLS = ['°', '±', '×', '÷', '≤', '≥', '≠', '≈', '≡', 'π', '√', '∞', '∠', '△', '⊥', '∥', '∴', '∵', '→', '⇒', '⇔', '∈', '∉', '⊂', '∪', '∩', '∅', 'ℝ', 'α', 'β', 'θ', 'Δ', 'Σ', 'μ', 'σ', '½', '¼', '¾', '²', '³'];

/**
 * โหมดเอกสาร (แบบ Word): พิมพ์ต่อเนื่อง ขึ้นหน้าใหม่เอง แทรกสมการ/กราฟ/รูป/ตาราง ได้
 * ชิ้นงานของโหมด Canva แสดงทับด้านบนแบบกดไม่ได้ (สลับโหมดเพื่อแก้)
 */
export const WordEditor = forwardRef<
  WordHandle,
  {
    html: string;
    pages: Page[];
    W: number;
    H: number;
    zoom: number;
    readOnly: boolean;
    /** ที่วางแถบเครื่องมือ (แทนที่แถบตั้งค่าของโหมด Canva) */
    barEl: HTMLElement | null;
    onChange: (html: string) => void;
    onNeedPages: (n: number) => void;
    openMath: (tex: string, done: (tex: string) => void) => void;
    openGraph: (spec: GraphSpec | null, done: (s: GraphSpec) => void) => void;
    upload: (file: File) => Promise<string | null>;
  }
>(function WordEditor({ html, pages, W, H, zoom, readOnly, barEl, onChange, onNeedPages, openMath, openGraph, upload }, ref) {
  const ed = useRef<HTMLDivElement>(null);
  const emitted = useRef<string | null>(null);
  const saved = useRef<Range | null>(null);
  const timer = useRef<number>(0);
  const [active, setActive] = useState<HTMLElement | null>(null);
  const [, force] = useState(0);
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
    const need = paginate(el, H, FLOW_GAP, FLOW_MARGIN.y);
    if (need > n) onNeedPages(need);
  }, [H, n, onNeedPages]);

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
  const setSize = (px: number) => {
    restore();
    // ไม่ได้คลุมข้อความ: fontSize 7 จะค้างเป็นขนาดใหญ่สุดกับตัวที่พิมพ์ต่อ
    if (window.getSelection()?.isCollapsed) return;
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('fontSize', false, '7');
    ed.current?.querySelectorAll<HTMLElement>('span[style*="xxx-large"], font[size="7"]').forEach((el) => {
      el.removeAttribute('size');
      el.style.fontSize = `${px}px`;
    });
    keep();
    changed();
  };
  /** ย่อหน้าที่อยู่ในส่วนที่เลือก */
  const blocks = () => {
    const el = ed.current;
    const s = window.getSelection();
    if (!el || !s || !s.rangeCount) return [];
    const r = s.getRangeAt(0);
    return (Array.from(el.children) as HTMLElement[]).filter((b) => r.intersectsNode(b));
  };
  const setLine = (v: string) => {
    restore();
    blocks().forEach((b) => (b.style.lineHeight = v));
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
    const node = window.getSelection()?.anchorNode;
    const el = node && (node.nodeType === 1 ? (node as HTMLElement) : node.parentElement);
    const z = el ? parseFloat(getComputedStyle(el).fontSize) || 21 : 21;
    const next = !step ? z + d : d > 0 ? SIZES.find((s) => s > z + 0.5) ?? 72 : [...SIZES].reverse().find((s) => s < z - 0.5) ?? 10;
    setSize(Math.round(Math.max(8, Math.min(96, next))));
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
  const addMath = () => {
    keep();
    openMath('', (tex) => {
      if (!tex.trim()) return;
      insertHtml(`<span data-tex="${esc(tex)}" contenteditable="false"></span>&nbsp;`);
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
    const direct = target.closest<HTMLElement>('span[data-tex], figure[data-graph], img');
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
      const inner = W - 2 * FLOW_MARGIN.x;
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

  const onDown = (e: React.PointerEvent) => {
    if (readOnly || e.button !== 0) return;
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
    const c = e.code;
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
    if (e.altKey && !mod && c === 'Equal') return run(addMath);
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
    if (!mod) return;
    if (e.key === 'Enter') return run(() => insertHtml('<div data-pb="1"></div><p><br></p>'));
    if (e.altKey) {
      if (!e.shiftKey && /^Digit[123]$/.test(c)) run(() => cmd('formatBlock', `h${c.slice(-1)}`));
      return;
    }
    if (e.shiftKey) {
      if (c === 'KeyM') run(() => indent(-1));
      else if (c === 'KeyL') run(() => cmd('insertUnorderedList'));
      else if (c === 'Period') run(() => bumpSize(1, true));
      else if (c === 'Comma') run(() => bumpSize(-1, true));
      else if (c === 'Equal') run(() => cmd('superscript'));
      return;
    }
    if (c === 'KeyE') run(() => cmd('justifyCenter'));
    else if (c === 'KeyL') run(() => cmd('justifyLeft'));
    else if (c === 'KeyR') run(() => cmd('justifyRight'));
    else if (c === 'KeyJ') run(() => cmd('justifyFull'));
    else if (c === 'KeyM') run(() => indent(1));
    else if (c === 'Equal') run(() => cmd('subscript'));
    else if (c === 'BracketRight') run(() => bumpSize(1, false));
    else if (c === 'BracketLeft') run(() => bumpSize(-1, false));
    else if (c === 'Digit1') run(() => setLine('1'));
    else if (c === 'Digit2') run(() => setLine('2'));
    else if (c === 'Digit5') run(() => setLine('1.5'));
    else if (c === 'Space') run(() => cmd('removeFormat'));
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
          <select className="st-wsel" defaultValue="" onChange={(e) => e.target.value && setSize(Number(e.target.value))} aria-label="ขนาดตัวอักษร">
            <option value="">ขนาด</option>
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
          <button type="button" className="st-tb st-tb-wide" onMouseDown={(e) => e.preventDefault()} onClick={addMath} title="แทรกสมการ (Alt+=)">
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
          {active && (
            <>
              <span className="st-insp-sep" />
              <span className="st-insp-tag">{active.dataset.tex !== undefined ? 'สมการ' : active.dataset.graph ? 'กราฟ' : 'รูปภาพ'}</span>
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

  return (
    <>
      {bar && (barEl ? createPortal(bar, barEl) : bar)}
      <div className="st-word" style={{ width: W * zoom, height: totalH * zoom }}>
        <div style={{ width: W, height: totalH, transform: `scale(${zoom})`, transformOrigin: '0 0', position: 'relative' }}>
          {pages.map((p, i) => (
            <div key={p.id} className="st-sheet" style={{ top: i * P, width: W, height: H }}>
              <PageView page={{ ...p, items: [] }} W={W} H={H} />
              <span className="st-sheet-no">หน้า {i + 1}</span>
            </div>
          ))}
          <div
            ref={ed}
            className="st-flow st-word-ed"
            contentEditable={!readOnly}
            suppressContentEditableWarning
            spellCheck={false}
            style={{ position: 'absolute', left: 0, top: 0, width: W, minHeight: totalH, padding: `0 ${FLOW_MARGIN.x}px`, fontFamily: FONTS.sarabun.family }}
            onInput={changed}
            onKeyUp={keep}
            onMouseUp={keep}
            onBlur={keep}
            onKeyDown={onKey}
            onPaste={onPaste}
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
