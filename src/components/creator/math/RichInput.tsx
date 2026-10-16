'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { Rich, Seg } from '@/lib/game-creator/types';
import { richLength } from '@/lib/game-creator/quiz';
import { texToHtml } from './MathText';
import { MathPopover } from './MathPopover';

export interface RichInputHandle {
  openMath: () => void;
  focus: () => void;
}

interface Props {
  value: Rich;
  onChange: (r: Rich) => void;
  placeholder?: string;
  maxChars: number;
  className?: string;
  singleLine?: boolean;
  ariaLabel?: string;
  onPasteImage?: (f: File) => void;
}

const ZW = '​';
const FRACTION_BEFORE = /(\d{1,6})\s?\/\s?(\d{1,6})$/;
const FRACTION_ANY = /(\d{1,6})\s?\/\s?(\d{1,6})(?![\d/])/g;

function makeChip(tex: string): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = 'l5g-chip';
  s.contentEditable = 'false';
  s.dataset.tex = tex;
  s.setAttribute('role', 'button');
  s.setAttribute('aria-label', 'สูตรคณิตศาสตร์ แตะเพื่อแก้ไข');
  s.innerHTML = texToHtml(tex);
  return s;
}

function render(el: HTMLElement, value: Rich) {
  el.textContent = '';
  value.forEach((seg) => {
    if (seg.t === 'm') {
      el.appendChild(makeChip(seg.v));
      return;
    }
    seg.v.split('\n').forEach((line, i) => {
      if (i > 0) el.appendChild(document.createElement('br'));
      if (line) el.appendChild(document.createTextNode(line));
    });
  });
  // ให้วางเคอร์เซอร์หลังสูตรตัวสุดท้ายได้
  if (el.lastChild && (el.lastChild as HTMLElement).dataset?.tex) el.appendChild(document.createTextNode(ZW));
}

function serialize(el: HTMLElement): Rich {
  const out: Seg[] = [];
  const pushText = (t: string) => {
    if (!t) return;
    const prev = out[out.length - 1];
    if (prev && prev.t === 'x') prev.v += t;
    else out.push({ t: 'x', v: t });
  };
  const walk = (node: Node, isRoot: boolean) => {
    node.childNodes.forEach((n, idx) => {
      if (n.nodeType === Node.TEXT_NODE) {
        pushText((n.textContent || '').replace(/​/g, '').replace(/ /g, ' '));
        return;
      }
      if (!(n instanceof HTMLElement)) return;
      if (n.dataset.tex !== undefined) {
        out.push({ t: 'm', v: n.dataset.tex });
        return;
      }
      if (n.tagName === 'BR') {
        // <br> ตัวสุดท้ายที่เบราว์เซอร์ใส่ค้างไว้ไม่นับ
        if (!(isRoot && idx === node.childNodes.length - 1)) pushText('\n');
        return;
      }
      const block = n.tagName === 'DIV' || n.tagName === 'P';
      if (block && out.length) pushText('\n');
      walk(n, false);
    });
  };
  walk(el, true);
  // ตัดบรรทัดว่างหัว/ท้าย
  const first = out[0];
  if (first && first.t === 'x') first.v = first.v.replace(/^\n+/, '');
  const last = out[out.length - 1];
  if (last && last.t === 'x') last.v = last.v.replace(/\s+$/, '');
  return out.filter((s) => s.v !== '');
}

function placeCaretAfter(node: Node) {
  const sel = window.getSelection();
  if (!sel) return;
  const r = document.createRange();
  r.setStartAfter(node);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
}

/** แปลง "1/2" ทั้งหมดในข้อความเป็นสูตรเศษส่วน */
function convertAllFractions(el: HTMLElement): boolean {
  let changed = false;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((tn) => {
    const text = tn.textContent || '';
    FRACTION_ANY.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = FRACTION_ANY.exec(text))) {
      // ข้ามรูปแบบวันที่ เช่น 12/10/2569
      if (m.index > 0 && /[\d/]/.test(text.charAt(m.index - 1))) continue;
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      frag.appendChild(makeChip(`\\frac{${m[1]}}{${m[2]}}`));
      last = m.index + m[0].length;
    }
    if (!last) return;
    frag.appendChild(document.createTextNode(text.slice(last) || ZW));
    tn.replaceWith(frag);
    changed = true;
  });
  return changed;
}

export const RichInput = forwardRef<RichInputHandle, Props>(function RichInput(
  { value, onChange, placeholder, maxChars, className, singleLine, ariaLabel, onPasteImage },
  ref
) {
  const el = useRef<HTMLDivElement>(null);
  const emitted = useRef<string>('');
  const saved = useRef<Range | null>(null);
  const [empty, setEmpty] = useState(!value.length);
  const [math, setMath] = useState<{ tex: string; chip: HTMLElement | null } | null>(null);

  const emit = useCallback(() => {
    if (!el.current) return;
    const r = serialize(el.current);
    emitted.current = JSON.stringify(r);
    setEmpty(!r.length);
    onChange(r);
  }, [onChange]);

  useLayoutEffect(() => {
    const json = JSON.stringify(value);
    if (json === emitted.current || !el.current) return;
    emitted.current = json;
    render(el.current, value);
    setEmpty(!value.length);
  }, [value]);

  const saveRange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !el.current) return;
    const r = sel.getRangeAt(0);
    if (el.current.contains(r.startContainer)) saved.current = r.cloneRange();
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', saveRange);
    return () => document.removeEventListener('selectionchange', saveRange);
  }, [saveRange]);

  const openMath = useCallback(() => {
    saveRange();
    setMath({ tex: '', chip: null });
  }, [saveRange]);

  useImperativeHandle(ref, () => ({ openMath, focus: () => el.current?.focus() }), [openMath]);

  const insertNodeAtCaret = (node: Node) => {
    const root = el.current!;
    let r = saved.current;
    if (!r || !root.contains(r.startContainer)) {
      r = document.createRange();
      r.selectNodeContents(root);
      r.collapse(false);
    }
    r.deleteContents();
    const after = document.createTextNode(ZW);
    r.insertNode(after);
    r.insertNode(node);
    root.focus();
    placeCaretAfter(after);
    saveRange();
  };

  const applyMath = (tex: string) => {
    const t = tex.trim();
    const target = math?.chip;
    setMath(null);
    if (!el.current) return;
    if (target && el.current.contains(target)) {
      if (!t) target.remove();
      else {
        target.dataset.tex = t;
        target.innerHTML = texToHtml(t);
      }
    } else if (t) {
      insertNodeAtCaret(makeChip(t));
    }
    emit();
  };

  const onInput = (e: React.FormEvent<HTMLDivElement>) => {
    const ie = e.nativeEvent as InputEvent;
    // พิมพ์ "3/4" แล้วตามด้วยตัวอื่น (เว้นวรรค/ตัวอักษร) -> กลายเป็นเศษส่วนทันที
    if (ie.inputType === 'insertText' && ie.data && !/[\d/]/.test(ie.data)) {
      const sel = window.getSelection();
      const node = sel?.anchorNode;
      if (sel && node && node.nodeType === Node.TEXT_NODE && el.current?.contains(node)) {
        const off = sel.anchorOffset;
        const text = node.textContent || '';
        const before = text.slice(0, off - ie.data.length);
        const m = FRACTION_BEFORE.exec(before);
        const prevCh = m ? before.charAt(before.length - m[0].length - 1) : '';
        if (m && !/[\d/]/.test(prevCh)) {
          const startIdx = before.length - m[0].length;
          const tn = node as Text;
          const tail = tn.splitText(startIdx); // [ก่อน][เศษส่วน+ตัวที่พิมพ์+ที่เหลือ]
          const rest = tail.splitText(m[0].length);
          const chip = makeChip(`\\frac{${m[1]}}{${m[2]}}`);
          tail.replaceWith(chip);
          const r = document.createRange();
          r.setStart(rest, Math.min(ie.data.length, rest.length));
          r.collapse(true);
          sel.removeAllRanges();
          sel.addRange(r);
        }
      }
    }
    emit();
  };

  // จำกัดความยาว (ใช้ beforeinput ของเบราว์เซอร์โดยตรง เพราะ onBeforeInput ของ React ไม่มี inputType)
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const h = (ev: Event) => {
      const t = (ev as InputEvent).inputType || '';
      if (t.startsWith('insert') && t !== 'insertFromPaste' && t !== 'insertLineBreak' && richLength(serialize(node)) >= maxChars) ev.preventDefault();
    };
    node.addEventListener('beforeinput', h);
    return () => node.removeEventListener('beforeinput', h);
  }, [maxChars]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (singleLine) return;
      document.execCommand('insertLineBreak');
      emit();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.clipboardData.files || []);
    const img = files.find((f) => f.type.startsWith('image/'));
    if (img && onPasteImage) {
      onPasteImage(img);
      return;
    }
    let text = e.clipboardData.getData('text/plain') || '';
    if (singleLine) text = text.replace(/\s*\n\s*/g, ' ');
    const room = maxChars - richLength(serialize(el.current!));
    if (room <= 0) return;
    document.execCommand('insertText', false, text.slice(0, room));
    if (el.current && convertAllFractions(el.current)) {
      const last = el.current.lastChild;
      if (last) placeCaretAfter(last);
    }
    emit();
  };

  const onBlur = () => {
    if (el.current && convertAllFractions(el.current)) emit();
  };

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const chip = (e.target as HTMLElement).closest?.('.l5g-chip') as HTMLElement | null;
    if (chip && el.current?.contains(chip)) {
      e.preventDefault();
      setMath({ tex: chip.dataset.tex || '', chip });
    }
  };

  return (
    <>
      <div
        ref={el}
        role="textbox"
        aria-multiline={!singleLine}
        aria-label={ariaLabel}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-placeholder={placeholder}
        data-empty={empty ? 'true' : 'false'}
        className={`l5g-rich ${className || ''}`}
        onInput={onInput}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={onBlur}
        onClick={onClick}
        onKeyUp={saveRange}
        onMouseUp={saveRange}
      />
      {math && <MathPopover initial={math.tex} editing={!!math.chip} onDone={applyMath} onCancel={() => setMath(null)} />}
    </>
  );
});
