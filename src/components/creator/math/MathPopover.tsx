'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Delete, Trash2, X } from 'lucide-react';
import { texToHtml } from './MathText';
import { gsfx } from '@/lib/game-creator/gsound';

/** ปุ่มในแผงสัญลักษณ์: show = ภาพที่แสดงบนปุ่ม, ins = LaTeX ที่ใส่ (#0 = ส่วนที่เลือกอยู่, #? = ช่องว่างให้กรอก) */
interface Key {
  show: string;
  ins: string;
  label?: string;
  wide?: boolean;
}

const B = '\\square';

const TABS: { id: string; name: string; keys: Key[] }[] = [
  {
    id: 'pop',
    name: 'ยอดนิยม',
    keys: [
      { show: `\\frac{${B}}{${B}}`, ins: '\\frac{#0}{#?}', label: 'เศษส่วน', wide: true },
      { show: `${B}\\frac{${B}}{${B}}`, ins: '#?\\frac{#?}{#?}', label: 'จำนวนคละ', wide: true },
      { show: `${B}^{${B}}`, ins: '#0^{#?}', label: 'ยกกำลัง', wide: true },
      { show: `\\sqrt{${B}}`, ins: '\\sqrt{#0}', label: 'รากที่สอง', wide: true },
      { show: '\\times', ins: '\\times' },
      { show: '\\div', ins: '\\div' },
      { show: '=', ins: '=' },
      { show: '\\neq', ins: '\\neq' },
      { show: '<', ins: '<' },
      { show: '>', ins: '>' },
      { show: '\\le', ins: '\\le' },
      { show: '\\ge', ins: '\\ge' },
      { show: '(\\,)', ins: '\\left(#0\\right)' },
      { show: '\\pi', ins: '\\pi' },
      { show: '{}^{\\circ}', ins: '^{\\circ}', label: 'องศา' },
      { show: '\\%', ins: '\\%' },
    ],
  },
  {
    id: 'num',
    name: 'จำนวน',
    keys: [
      { show: `\\frac{${B}}{${B}}`, ins: '\\frac{#0}{#?}', label: 'เศษส่วน', wide: true },
      { show: `${B}\\frac{${B}}{${B}}`, ins: '#?\\frac{#?}{#?}', label: 'จำนวนคละ', wide: true },
      { show: `${B}^{2}`, ins: '#0^{2}', label: 'กำลังสอง' },
      { show: `${B}^{3}`, ins: '#0^{3}', label: 'กำลังสาม' },
      { show: `${B}^{${B}}`, ins: '#0^{#?}', label: 'ยกกำลัง' },
      { show: `${B}_{${B}}`, ins: '#0_{#?}', label: 'ตัวห้อย' },
      { show: `\\sqrt{${B}}`, ins: '\\sqrt{#0}', label: 'ราก' },
      { show: `\\sqrt[${B}]{${B}}`, ins: '\\sqrt[#?]{#0}', label: 'รากที่ n' },
      { show: `|${B}|`, ins: '\\left|#0\\right|', label: 'ค่าสัมบูรณ์' },
      { show: `0.\\overline{3}`, ins: '\\overline{#0}', label: 'ทศนิยมซ้ำ' },
      { show: '\\pm', ins: '\\pm' },
      { show: '\\cdot', ins: '\\cdot' },
      { show: '\\approx', ins: '\\approx' },
      { show: '\\infty', ins: '\\infty' },
      { show: `${B}:${B}`, ins: '#?:#?', label: 'อัตราส่วน' },
      { show: '[\\,]', ins: '\\left[#0\\right]' },
    ],
  },
  {
    id: 'geo',
    name: 'เรขาคณิต',
    keys: [
      { show: '\\angle', ins: '\\angle ', label: 'มุม' },
      { show: '\\triangle', ins: '\\triangle ', label: 'สามเหลี่ยม' },
      { show: '{}^{\\circ}', ins: '^{\\circ}', label: 'องศา' },
      { show: '\\overline{AB}', ins: '\\overline{#0}', label: 'ส่วนของเส้นตรง' },
      { show: '\\overleftrightarrow{AB}', ins: '\\overleftrightarrow{#0}', label: 'เส้นตรง' },
      { show: '\\overrightarrow{AB}', ins: '\\overrightarrow{#0}', label: 'รังสี' },
      { show: '\\perp', ins: '\\perp ', label: 'ตั้งฉาก' },
      { show: '\\parallel', ins: '\\parallel ', label: 'ขนาน' },
      { show: '\\cong', ins: '\\cong ', label: 'เท่ากันทุกประการ' },
      { show: '\\sim', ins: '\\sim ', label: 'คล้าย' },
      { show: '\\pi', ins: '\\pi' },
      { show: '\\square', ins: '\\square ', label: 'สี่เหลี่ยม' },
      { show: '\\text{cm}^2', ins: '\\text{cm}^{2}', label: 'ตร.ซม.' },
      { show: '\\text{m}^3', ins: '\\text{m}^{3}', label: 'ลบ.ม.' },
      { show: '\\odot', ins: '\\odot ', label: 'วงกลม' },
      { show: '\\therefore', ins: '\\therefore ', label: 'ดังนั้น' },
    ],
  },
  {
    id: 'alg',
    name: 'ฟังก์ชัน',
    keys: [
      { show: 'f(x)', ins: 'f\\left(#?\\right)', label: 'ฟังก์ชัน', wide: true },
      { show: 'x', ins: 'x' },
      { show: 'y', ins: 'y' },
      { show: 'n', ins: 'n' },
      { show: '\\sin', ins: '\\sin\\left(#?\\right)' },
      { show: '\\cos', ins: '\\cos\\left(#?\\right)' },
      { show: '\\tan', ins: '\\tan\\left(#?\\right)' },
      { show: '\\log', ins: '\\log_{#?}\\left(#?\\right)' },
      { show: `\\sum_{${B}}^{${B}}`, ins: '\\sum_{#?}^{#?}', label: 'ผลรวม' },
      { show: '\\to', ins: '\\to ' },
      { show: '\\Rightarrow', ins: '\\Rightarrow ' },
      { show: '\\because', ins: '\\because ', label: 'เพราะว่า' },
      { show: '\\in', ins: '\\in ' },
      { show: '\\cup', ins: '\\cup ' },
      { show: '\\cap', ins: '\\cap ' },
      { show: '\\{\\,\\}', ins: '\\left\\lbrace #0\\right\\rbrace', label: 'เซต' },
    ],
  },
];

/** แท็บเพิ่มสำหรับระบบสร้างสื่อ (แบบ MathType) */
const k = (show: string, ins = show, label?: string, wide?: boolean): Key => ({ show, ins, label, wide });
const EXTRA_TABS: { id: string; name: string; keys: Key[] }[] = [
  {
    id: 'calc',
    name: 'แคลคูลัส',
    keys: [
      k(`\\lim_{x\\to ${B}}`, '\\lim_{#?\\to #?}', 'ลิมิต', true),
      k(`\\int ${B}\\,dx`, '\\int #0\\,d#?', 'อินทิกรัล', true),
      k(`\\int_{${B}}^{${B}}`, '\\int_{#?}^{#?}#0\\,d#?', 'มีขอบเขต', true),
      k('\\frac{d}{dx}', '\\frac{d}{d#?}', 'อนุพันธ์', true),
      k(`\\frac{d^2y}{dx^2}`, '\\frac{d^{2}#?}{d#?^{2}}', 'อันดับสอง'),
      k('\\partial', '\\partial '),
      k(`\\sum_{${B}}^{${B}}`, '\\sum_{#?}^{#?}', 'ผลรวม'),
      k(`\\prod_{${B}}^{${B}}`, '\\prod_{#?}^{#?}', 'ผลคูณ'),
      k("f'(x)", "#?'\\left(#?\\right)", 'ดิฟ'),
      k('\\infty', '\\infty'),
      k('\\Delta x', '\\Delta '),
      k('\\to', '\\to '),
      k('e^{x}', 'e^{#?}'),
      k('\\ln', '\\ln\\left(#?\\right)'),
      k(`\\log_{${B}}`, '\\log_{#?}\\left(#?\\right)'),
      k('\\left.\\right|_{a}^{b}', '\\left.#0\\right|_{#?}^{#?}', 'แทนค่า'),
    ],
  },
  {
    id: 'mat',
    name: 'เมทริกซ์',
    keys: [
      k('\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}', '\\begin{bmatrix}#?&#?\\\\#?&#?\\end{bmatrix}', '2x2', true),
      k('\\begin{bmatrix}a&b&c\\\\d&e&f\\\\g&h&i\\end{bmatrix}', '\\begin{bmatrix}#?&#?&#?\\\\#?&#?&#?\\\\#?&#?&#?\\end{bmatrix}', '3x3', true),
      k('\\begin{vmatrix}a&b\\\\c&d\\end{vmatrix}', '\\begin{vmatrix}#?&#?\\\\#?&#?\\end{vmatrix}', 'ดีเทอร์มิแนนต์', true),
      k('\\begin{pmatrix}a\\\\b\\end{pmatrix}', '\\begin{pmatrix}#?\\\\#?\\end{pmatrix}', 'เวกเตอร์หลัก', true),
      k('\\begin{cases}a\\\\b\\end{cases}', '\\begin{cases}#?&#?\\\\#?&#?\\end{cases}', 'แยกกรณี', true),
      k('A^{-1}', '#0^{-1}', 'ผกผัน'),
      k('A^{T}', '#0^{T}', 'ทรานสโพส'),
      k('\\det', '\\det\\left(#?\\right)'),
    ],
  },
  {
    id: 'vec',
    name: 'เวกเตอร์',
    keys: [
      k('\\overrightarrow{AB}', '\\overrightarrow{#0}', 'เวกเตอร์ AB', true),
      k('\\vec{u}', '\\vec{#0}', 'ลูกศรบน'),
      k('\\bar{u}', '\\bar{#0}', 'ขีดบน'),
      k('\\hat{i}', '\\hat{#0}', 'หมวก'),
      k('\\left|\\vec{u}\\right|', '\\left|\\vec{#0}\\right|', 'ขนาด'),
      k('\\cdot', '\\cdot ', 'ดอท'),
      k('\\times', '\\times ', 'ครอส'),
      k('\\vec{i}', '\\vec{i}'),
      k('\\vec{j}', '\\vec{j}'),
      k('\\vec{k}', '\\vec{k}'),
      k('\\parallel', '\\parallel '),
      k('\\perp', '\\perp '),
    ],
  },
  {
    id: 'trig',
    name: 'ตรีโกณ',
    keys: ['\\sin', '\\cos', '\\tan', '\\cot', '\\sec', '\\csc', '\\arcsin', '\\arccos', '\\arctan']
      .map((f) => k(f, `${f}\\left(#?\\right)`))
      .concat([k('\\theta'), k('\\alpha'), k('\\beta'), k('{}^{\\circ}', '^{\\circ}', 'องศา'), k('\\pi'), k(`\\sin^{2}${B}`, '\\sin^{2}#?')]),
  },
  {
    id: 'stat',
    name: 'สถิติ',
    keys: [
      k('\\bar{x}', '\\bar{#0}', 'ค่าเฉลี่ย'),
      k('\\mu', '\\mu', 'มิว'),
      k('\\sigma', '\\sigma', 'ซิกมา'),
      k('\\sigma^{2}', '\\sigma^{2}', 'ความแปรปรวน'),
      k('\\sum_{i=1}^{n}x_i', '\\sum_{i=1}^{n}#?_{i}', 'ผลรวม', true),
      k('\\binom{n}{r}', '\\binom{#?}{#?}', 'จัดหมู่'),
      k('P(A)', 'P\\left(#?\\right)', 'ความน่าจะเป็น'),
      k('n!', '#0!', 'แฟกทอเรียล'),
      k('Q_{1}', 'Q_{#?}', 'ควอร์ไทล์'),
      k('x_{i}', '#0_{i}'),
      k('\\tilde{x}', '\\tilde{#0}', 'มัธยฐาน'),
      k('P_{n,r}', 'P_{#?,#?}', 'เรียงสับเปลี่ยน'),
    ],
  },
  {
    id: 'set',
    name: 'เซต/ตรรกะ',
    keys: ['\\in', '\\notin', '\\subset', '\\subseteq', '\\cup', '\\cap', '\\emptyset', "A'", '\\forall', '\\exists', '\\sim', '\\wedge', '\\vee', '\\to', '\\leftrightarrow', '\\equiv', '\\mathbb{R}', '\\mathbb{N}', '\\mathbb{Z}', '\\mathbb{Q}'].map((x) => k(x, x === "A'" ? "#0'" : `${x} `)),
  },
  {
    id: 'greek',
    name: 'อักษรกรีก',
    keys: ['\\alpha', '\\beta', '\\gamma', '\\delta', '\\varepsilon', '\\theta', '\\lambda', '\\mu', '\\pi', '\\rho', '\\sigma', '\\tau', '\\phi', '\\omega', '\\Delta', '\\Sigma', '\\Omega', '\\Phi', '\\Gamma', '\\Pi'].map((x) => k(x)),
  },
];

const DIGITS: Key[] = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', ','].map((d) => ({ show: d, ins: d }));
const OPS: Key[] = [
  { show: '+', ins: '+' },
  { show: '-', ins: '-' },
  { show: '\\times', ins: '\\times' },
  { show: '\\div', ins: '\\div' },
  { show: '=', ins: '=' },
  { show: '(\\,)', ins: '\\left(#0\\right)' },
];

type MF = HTMLElement & {
  value: string;
  executeCommand: (cmd: unknown) => boolean;
  focus: () => void;
  menuItems: unknown[];
  smartFence: boolean;
  mathVirtualKeyboardPolicy: string;
  placeholderSymbol: string;
  inlineShortcuts: Record<string, string>;
};

let mlReady: Promise<void> | null = null;
function loadMathLive(): Promise<void> {
  if (!mlReady) {
    mlReady = import('mathlive').then((ml) => {
      ml.MathfieldElement.fontsDirectory = '/mathlive/fonts';
      ml.MathfieldElement.soundsDirectory = null;
      ml.MathfieldElement.locale = 'th';
    });
  }
  return mlReady;
}

function KeyFace({ k }: { k: Key }) {
  const html = useMemo(() => texToHtml(k.show, false, false), [k.show]);
  return (
    <>
      <span className="l5g-key-face" dangerouslySetInnerHTML={{ __html: html }} />
      {k.label && <span className="l5g-key-label">{k.label}</span>}
    </>
  );
}

export function MathPopover({ initial, editing, onDone, onCancel, extended = false }: { initial: string; editing: boolean; onDone: (tex: string) => void; onCancel: () => void; extended?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const mf = useRef<MF | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('pop');
  const [empty, setEmpty] = useState(!initial);
  const [mounted, setMounted] = useState(false);
  const cb = useRef({ onDone, onCancel });
  cb.current = { onDone, onCancel };

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    let alive = true;
    loadMathLive()
      .then(() => {
        if (!alive || !host.current) return;
        const el = document.createElement('math-field') as MF;
        el.className = 'l5g-mf';
        el.setAttribute('math-virtual-keyboard-policy', 'manual');
        el.setAttribute('aria-label', 'ช่องพิมพ์สูตร');
        host.current.appendChild(el);
        try {
          el.menuItems = [];
        } catch {
          /* รุ่นเก่า */
        }
        el.smartFence = true;
        el.value = initial;
        el.addEventListener('input', () => setEmpty(!el.value.trim()));
        el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            cb.current.onDone(el.value);
          }
          if (e.key === 'Escape') cb.current.onCancel();
        });
        mf.current = el;
        setReady(true);
        setTimeout(() => el.focus(), 60);
      })
      .catch(() => setReady(false));
    return () => {
      alive = false;
      mf.current?.remove();
      mf.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const press = (k: Key) => {
    const el = mf.current;
    if (!el) return;
    gsfx.tap();
    el.executeCommand(['insert', k.ins, { focus: true, feedback: false, selectionMode: 'placeholder', format: 'latex' }]);
    setEmpty(!el.value.trim());
  };
  const cmd = (c: string) => {
    const el = mf.current;
    if (!el) return;
    gsfx.tap();
    el.executeCommand(c);
    el.focus();
    setEmpty(!el.value.trim());
  };

  if (!mounted) return null;
  const tabs = extended ? [...TABS, ...EXTRA_TABS] : TABS;
  const keys = tabs.find((t) => t.id === tab)!.keys;

  return createPortal(
    <div className="l5g-math-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="l5g-math-sheet" role="dialog" aria-modal="true" aria-label="ใส่สูตรคณิตศาสตร์">
        <div className="l5g-math-head">
          <span className="l5g-fx-badge">f(x)</span>
          <h3>{editing ? 'แก้ไขสูตร' : 'ใส่สูตรคณิตศาสตร์'}</h3>
          <button type="button" className="l5g-icon-btn" onClick={onCancel} aria-label="ปิด">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="l5g-mf-wrap">
          <div ref={host} className="l5g-mf-host" />
          {!ready && <div className="l5g-mf-loading">กำลังเตรียมแป้นสูตร…</div>}
          <p className="l5g-mf-hint">พิมพ์ 3/4 จะกลายเป็นเศษส่วนเอง · กดลูกศรเพื่อย้ายช่อง</p>
        </div>

        <div className="l5g-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="l5g-tab" data-on={tab === t.id} onClick={() => setTab(t.id)}>
              {t.name}
            </button>
          ))}
        </div>

        <div className="l5g-math-body">
          <div className="l5g-keys">
            {keys.map((k, i) => (
              <button key={tab + i} type="button" className="l5g-key" data-wide={k.wide ? 'true' : 'false'} onMouseDown={(e) => e.preventDefault()} onClick={() => press(k)}>
                <KeyFace k={k} />
              </button>
            ))}
          </div>
          <div className="l5g-numpad">
            {DIGITS.map((k) => (
              <button key={k.show} type="button" className="l5g-key l5g-key-num" onMouseDown={(e) => e.preventDefault()} onClick={() => press(k)}>
                <KeyFace k={k} />
              </button>
            ))}
            {OPS.map((k) => (
              <button key={k.ins} type="button" className="l5g-key l5g-key-op" onMouseDown={(e) => e.preventDefault()} onClick={() => press(k)}>
                <KeyFace k={k} />
              </button>
            ))}
            <button type="button" className="l5g-key l5g-key-op" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('moveToPreviousChar')} aria-label="ซ้าย">
              <span className="l5g-key-face">&#8592;</span>
            </button>
            <button type="button" className="l5g-key l5g-key-op" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('moveToNextChar')} aria-label="ขวา">
              <span className="l5g-key-face">&#8594;</span>
            </button>
            <button type="button" className="l5g-key l5g-key-del" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('deleteBackward')} aria-label="ลบ">
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="l5g-math-foot">
          {editing && (
            <button type="button" className="l5g-btn l5g-btn-ghost" onClick={() => onDone('')}>
              <Trash2 className="w-4 h-4" /> ลบสูตร
            </button>
          )}
          <span className="flex-1" />
          <button type="button" className="l5g-btn l5g-btn-ghost" onClick={onCancel}>
            ยกเลิก
          </button>
          <button type="button" className="l5g-btn l5g-btn-go" disabled={!ready || empty} onClick={() => onDone(mf.current?.value || '')}>
            <Check className="w-5 h-5" strokeWidth={3} /> {editing ? 'บันทึกสูตร' : 'ใส่สูตร'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
