/* eslint-disable @next/next/no-img-element */
import React from 'react';
import type { Dash, EduItem, Item, LineItem, Page, PageBg, PageBorder, TableItem, TextItem, WriteItem } from '@/lib/studio/doc';
import { CharArt } from './CharArt';
import { FONTS } from './fonts';
import { shapeById } from './shapes';
import { StickerArt } from './stickers';
import { pastePlain } from './ui';

/**
 * วาดหน้าสื่อ 1 หน้าที่ขนาดจริง (พิกเซล) ใช้ร่วมกันทั้งตัวแก้ไข รูปย่อ และตอนส่งออกเป็นรูป/PDF
 * ทุกอย่างเป็น DOM/SVG ธรรมดา ข้อความแสดงแบบ text (ไม่มี innerHTML) จึงไม่มีทางแทรกสคริปต์ได้
 */

export function bgStyle(bg: PageBg): React.CSSProperties {
  const layers: string[] = [];
  const sizes: string[] = [];
  const c = bg.pcolor;
  switch (bg.pattern) {
    case 'dots':
      layers.push(`radial-gradient(${c} 1.8px, transparent 2.2px)`);
      sizes.push('24px 24px');
      break;
    case 'grid':
      layers.push(`linear-gradient(${c} 1px, transparent 1px)`, `linear-gradient(90deg, ${c} 1px, transparent 1px)`);
      sizes.push('30px 30px', '30px 30px');
      break;
    case 'lines':
      layers.push(`repeating-linear-gradient(to bottom, transparent 0 33px, ${c} 33px 35px)`);
      sizes.push('auto');
      break;
    case 'stripes':
      layers.push(`repeating-linear-gradient(45deg, ${c} 0 16px, transparent 16px 32px)`);
      sizes.push('auto');
      break;
    case 'checks':
      layers.push(`conic-gradient(${c} 25%, transparent 0 50%, ${c} 0 75%, transparent 0)`);
      sizes.push('48px 48px');
      break;
  }
  if (bg.color2) {
    layers.push(`linear-gradient(${bg.angle}deg, ${bg.color}, ${bg.color2})`);
    sizes.push('auto');
  }
  return { backgroundColor: bg.color, backgroundImage: layers.length ? layers.join(', ') : undefined, backgroundSize: layers.length ? sizes.join(', ') : undefined };
}

const dashArray = (d: Dash, w: number) => (d === 'dash' ? `${w * 3} ${w * 2}` : d === 'dot' ? `0 ${w * 2}` : undefined);

/** ดาว 5 แฉกเล็ก ๆ รอบกรอบหน้า */
const starPath = (cx: number, cy: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const rr = i % 2 ? r * 0.45 : r;
    const a = ((-90 + 36 * i) * Math.PI) / 180;
    return `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }).join(' ') + ' Z';

function along(W: number, H: number, m: number, step: number): [number, number][] {
  const pts: [number, number][] = [];
  const nx = Math.max(2, Math.round((W - 2 * m) / step));
  const ny = Math.max(2, Math.round((H - 2 * m) / step));
  for (let i = 0; i <= nx; i++) {
    const x = m + ((W - 2 * m) * i) / nx;
    pts.push([x, m], [x, H - m]);
  }
  for (let j = 1; j < ny; j++) {
    const y = m + ((H - 2 * m) * j) / ny;
    pts.push([m, y], [W - m, y]);
  }
  return pts;
}

function scallop(W: number, H: number, m: number, r: number) {
  const nx = Math.max(4, Math.round((W - 2 * m) / (2 * r)));
  const ny = Math.max(4, Math.round((H - 2 * m) / (2 * r)));
  const sx = (W - 2 * m) / nx;
  const sy = (H - 2 * m) / ny;
  let d = `M${m},${m}`;
  for (let i = 0; i < nx; i++) d += ` q${sx / 2},${-r} ${sx},0`;
  for (let i = 0; i < ny; i++) d += ` q${r},${sy / 2} 0,${sy}`;
  for (let i = 0; i < nx; i++) d += ` q${-sx / 2},${r} ${-sx},0`;
  for (let i = 0; i < ny; i++) d += ` q${-r},${-sy / 2} 0,${-sy}`;
  return d + ' Z';
}

export function BorderArt({ b, W, H, fluid }: { b: PageBorder; W: number; H: number; fluid?: boolean }) {
  if (b.style === 'none') return null;
  const m = Math.max(14, Math.min(W, H) * 0.035);
  const w = b.w;
  const common = { fill: 'none', stroke: b.color, strokeWidth: w };
  let body: React.ReactNode = null;
  switch (b.style) {
    case 'line':
      body = <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} {...common} />;
      break;
    case 'double':
      body = (
        <>
          <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} {...common} />
          <rect x={m + w * 2.5} y={m + w * 2.5} width={W - 2 * m - w * 5} height={H - 2 * m - w * 5} {...common} strokeWidth={Math.max(1, w / 2)} />
        </>
      );
      break;
    case 'dash':
      body = <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} {...common} strokeDasharray={`${w * 4} ${w * 2.5}`} />;
      break;
    case 'round':
      body = <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} rx={m * 1.4} {...common} />;
      break;
    case 'dots':
      body = <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} rx={m} {...common} strokeWidth={w * 1.6} strokeLinecap="round" strokeDasharray={`0 ${w * 3.6}`} />;
      break;
    case 'stars':
      body = (
        <g fill={b.color}>
          {along(W, H, m, 46 + w * 2).map(([x, y], i) => (
            <path key={i} d={starPath(x, y, 8 + w)} />
          ))}
        </g>
      );
      break;
    case 'wave':
      body = <path d={scallop(W, H, m + 6, 10 + w)} {...common} strokeLinejoin="round" />;
      break;
    case 'corner': {
      const L = Math.min(W, H) * 0.16;
      const c = (x: number, y: number, sx: number, sy: number, k: number) => (
        <g key={k} transform={`translate(${x} ${y}) scale(${sx} ${sy})`}>
          <path d={`M0,${L} V0 H${L}`} {...common} strokeWidth={w * 1.4} strokeLinecap="round" />
          <path d={`M${w * 3},${L * 0.7} V${w * 3} H${L * 0.7}`} {...common} strokeWidth={Math.max(1, w * 0.6)} strokeLinecap="round" />
          <circle cx={w * 6} cy={w * 6} r={w * 1.6} fill={b.color} />
        </g>
      );
      body = (
        <>
          <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} {...common} strokeWidth={Math.max(1, w * 0.4)} />
          {c(m - w, m - w, 1, 1, 0)}
          {c(W - m + w, m - w, -1, 1, 1)}
          {c(m - w, H - m + w, 1, -1, 2)}
          {c(W - m + w, H - m + w, -1, -1, 3)}
        </>
      );
      break;
    }
  }
  return (
    <svg
      width={fluid ? '100%' : W}
      height={fluid ? '100%' : H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {body}
    </svg>
  );
}

/* ------------------------------------------------------------------ ข้อความ */

export function textCss(t: Pick<TextItem, 'font' | 'size' | 'color' | 'bold' | 'italic' | 'underline' | 'align' | 'lh' | 'ls'>): React.CSSProperties {
  return {
    fontFamily: `${FONTS[t.font].family}, sans-serif`,
    fontSize: t.size,
    color: t.color,
    fontWeight: t.bold ? 700 : 400,
    fontStyle: t.italic ? 'italic' : 'normal',
    textDecoration: t.underline ? 'underline' : 'none',
    textAlign: t.align,
    lineHeight: t.lh,
    letterSpacing: t.ls ? `${t.ls}px` : undefined,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  };
}

function TextView({ t, edit }: { t: TextItem; edit?: EditText }) {
  const box: React.CSSProperties = t.bg ? { background: t.bg, padding: `${t.size * 0.28}px ${t.size * 0.5}px`, borderRadius: t.size * 0.45 } : {};
  const css = { ...textCss(t), ...box, textShadow: t.shadow ? `${Math.max(2, t.size * 0.07)}px ${Math.max(2, t.size * 0.07)}px 0 rgba(42,35,80,.32)` : undefined };
  const empty = !t.text && !edit;
  return (
    <div style={{ position: 'relative' }}>
      {t.stroke && t.strokeW > 0 && (
        <div aria-hidden="true" style={{ ...css, position: 'absolute', inset: 0, color: t.stroke, WebkitTextStroke: `${t.strokeW * 2}px ${t.stroke}`, background: 'transparent', textShadow: 'none' }}>
          {t.text || ' '}
        </div>
      )}
      {edit ? (
        <div
          ref={edit.ref}
          contentEditable="plaintext-only"
          suppressContentEditableWarning
          spellCheck={false}
          data-editing="1"
          style={{ ...css, position: 'relative', outline: 'none', minHeight: t.size * t.lh, cursor: 'text', background: t.bg || undefined }}
          onBlur={(e) => edit.done(e.currentTarget.innerText.replace(/\n$/, ''))}
          onPointerDown={(e) => e.stopPropagation()}
          onPaste={pastePlain}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') (e.currentTarget as HTMLElement).blur();
          }}
        >
          {t.text}
        </div>
      ) : (
        <div style={{ ...css, position: 'relative', opacity: empty ? 0.35 : 1 }}>{t.text || 'ข้อความ'}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ เส้น / ใบงาน / ตาราง */

function LineView({ l }: { l: LineItem }) {
  const { w, h } = l;
  const a = Math.max(10, l.sw * 3);
  const pad = (c: LineItem['start']) => (c === 'arrow' ? a * 0.8 : c === 'dot' ? l.sw * 1.2 : l.sw / 2);
  const x1 = pad(l.start);
  const x2 = w - pad(l.end);
  const y = h / 2;
  const head = (x: number, dir: 1 | -1, c: LineItem['start']) =>
    c === 'arrow' ? (
      <path d={`M${x + dir * a * 0.8},${y} L${x - dir * a * 0.4},${y - a * 0.62} L${x - dir * a * 0.4},${y + a * 0.62} Z`} fill={l.stroke} />
    ) : c === 'dot' ? (
      <circle cx={x} cy={y} r={l.sw * 1.4} fill={l.stroke} />
    ) : null;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible', display: 'block' }}>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={l.stroke} strokeWidth={l.sw} strokeDasharray={dashArray(l.dash, l.sw)} strokeLinecap="round" />
      {head(x1, -1, l.start)}
      {head(x2, 1, l.end)}
    </svg>
  );
}

function WriteView({ x }: { x: WriteItem }) {
  const { w, h, gap, stroke, sw } = x;
  const lines: React.ReactNode[] = [];
  if (x.kind === 'lines' || x.kind === 'dotted') {
    for (let y = gap, i = 0; y <= h + 0.5; y += gap, i++)
      lines.push(<line key={i} x1={0} x2={w} y1={y - sw / 2} y2={y - sw / 2} stroke={stroke} strokeWidth={sw} strokeDasharray={x.kind === 'dotted' ? `0 ${sw * 4}` : undefined} strokeLinecap="round" />);
  } else if (x.kind === 'four') {
    const band = gap;
    const space = gap * 0.45;
    for (let y0 = sw, i = 0; y0 + band <= h + 0.5; y0 += band + space, i++) {
      lines.push(
        <g key={i}>
          <line x1={0} x2={w} y1={y0} y2={y0} stroke={stroke} strokeWidth={sw} />
          <line x1={0} x2={w} y1={y0 + band / 3} y2={y0 + band / 3} stroke={stroke} strokeWidth={sw} strokeDasharray={`${sw * 4} ${sw * 3}`} />
          <line x1={0} x2={w} y1={y0 + (band * 2) / 3} y2={y0 + (band * 2) / 3} stroke="#ff8fab" strokeWidth={sw * 1.2} />
          <line x1={0} x2={w} y1={y0 + band} y2={y0 + band} stroke={stroke} strokeWidth={sw} />
        </g>
      );
    }
  } else if (x.kind === 'grid') {
    for (let gx = 0, i = 0; gx <= w + 0.5; gx += gap, i++) lines.push(<line key={`x${i}`} x1={gx} x2={gx} y1={0} y2={h} stroke={stroke} strokeWidth={sw} />);
    for (let gy = 0, i = 0; gy <= h + 0.5; gy += gap, i++) lines.push(<line key={`y${i}`} x1={0} x2={w} y1={gy} y2={gy} stroke={stroke} strokeWidth={sw} />);
  } else if (x.kind === 'dots') {
    for (let gy = gap / 2, j = 0; gy < h; gy += gap, j++) for (let gx = gap / 2, i = 0; gx < w; gx += gap, i++) lines.push(<circle key={`${i}-${j}`} cx={gx} cy={gy} r={sw * 1.3} fill={stroke} />);
  } else {
    lines.push(<rect key="b" x={sw / 2} y={sw / 2} width={Math.max(0, w - sw)} height={Math.max(0, h - sw)} rx={Math.min(18, h / 6)} fill="none" stroke={stroke} strokeWidth={sw} />);
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      {lines}
    </svg>
  );
}

function TableView({ t, edit }: { t: TableItem; edit?: EditCell }) {
  const rows = t.cells.length;
  const cols = t.cells[0]?.length || 1;
  const font = textCss({ ...t, bold: false, italic: false, underline: false, lh: 1.25, ls: 0 });
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        borderTop: `${t.sw}px solid ${t.stroke}`,
        borderLeft: `${t.sw}px solid ${t.stroke}`,
        boxSizing: 'border-box',
        background: '#ffffff00',
      }}
    >
      {t.cells.flatMap((row, r) =>
        row.map((cell, c) => {
          const editing = edit && edit.r === r && edit.c === c;
          return (
            <div
              key={`${r}-${c}`}
              data-cell={`${r}-${c}`}
              style={{
                ...font,
                fontWeight: r === 0 && t.head ? 700 : 400,
                background: r === 0 && t.head ? t.head : undefined,
                borderRight: `${t.sw}px solid ${t.stroke}`,
                borderBottom: `${t.sw}px solid ${t.stroke}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: t.align === 'left' ? 'flex-start' : t.align === 'right' ? 'flex-end' : 'center',
                padding: '2px 8px',
                overflow: 'hidden',
                boxSizing: 'border-box',
                minWidth: 0,
              }}
            >
              {editing ? (
                <div
                  ref={edit.ref}
                  contentEditable="plaintext-only"
                  suppressContentEditableWarning
                  data-editing="1"
                  style={{ outline: 'none', minWidth: 20, width: '100%', textAlign: t.align, cursor: 'text' }}
                  onBlur={(e) => edit.done(e.currentTarget.innerText.replace(/\n$/, ''))}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPaste={pastePlain}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).blur();
                    }
                  }}
                >
                  {cell}
                </div>
              ) : (
                <span style={{ width: '100%', textAlign: t.align }}>{cell}</span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ สื่อคณิต/วิทย์สำเร็จรูป */

const FONT_NUM = 'var(--font-mitr), var(--font-noto-sans-thai), sans-serif';

function EduView({ e }: { e: EduItem }) {
  const { w, h, a, b, c, stroke: k, color } = e;
  const t = (x: number, y: number, s: number, txt: string | number, anchor: 'middle' | 'start' | 'end' = 'middle', key?: string | number) => (
    <text key={key} x={x} y={y} fontSize={s} textAnchor={anchor} dominantBaseline="central" fill={k} fontFamily={FONT_NUM} fontWeight={500}>
      {txt}
    </text>
  );
  const body: React.ReactNode[] = [];
  switch (e.kind) {
    case 'numberline': {
      const m = 18;
      const y = e.labels ? h * 0.38 : h / 2;
      const n = Math.max(1, Math.round((b - a) / Math.max(1, c)));
      const x0 = m + 14;
      const x1 = w - m - 14;
      const step = (x1 - x0) / n;
      const fs = Math.max(10, Math.min(26, step * 0.55, h * 0.3));
      body.push(<line key="l" x1={m} x2={w - m} y1={y} y2={y} stroke={k} strokeWidth={3} strokeLinecap="round" />);
      body.push(<path key="al" d={`M${m - 2},${y} l12,-8 v16 Z`} fill={k} />, <path key="ar" d={`M${w - m + 2},${y} l-12,-8 v16 Z`} fill={k} />);
      for (let i = 0; i <= n; i++) {
        const x = x0 + i * step;
        body.push(<line key={`t${i}`} x1={x} x2={x} y1={y - 10} y2={y + 10} stroke={k} strokeWidth={2.5} />);
        if (e.labels) body.push(t(x, y + 14 + fs * 0.6, fs, a + i * c, 'middle', `n${i}`));
      }
      body.push(<circle key="dot" cx={x0} cy={y} r={6} fill={color} stroke={k} strokeWidth={2} />);
      break;
    }
    case 'clock': {
      const r = Math.min(w, h) / 2 - 4;
      const cx = w / 2;
      const cy = h / 2;
      body.push(<circle key="o" cx={cx} cy={cy} r={r} fill={color} stroke={k} strokeWidth={Math.max(3, r * 0.05)} />);
      body.push(<circle key="i" cx={cx} cy={cy} r={r * 0.86} fill="#ffffff" stroke={k} strokeWidth={2} />);
      for (let i = 0; i < 60; i++) {
        const an = (i * 6 * Math.PI) / 180;
        const big = i % 5 === 0;
        const r1 = r * 0.86;
        const r2 = r1 - (big ? r * 0.1 : r * 0.05);
        body.push(<line key={`m${i}`} x1={cx + r1 * Math.sin(an)} y1={cy - r1 * Math.cos(an)} x2={cx + r2 * Math.sin(an)} y2={cy - r2 * Math.cos(an)} stroke={k} strokeWidth={big ? 3 : 1.4} />);
      }
      if (e.labels)
        for (let i = 1; i <= 12; i++) {
          const an = (i * 30 * Math.PI) / 180;
          body.push(t(cx + r * 0.62 * Math.sin(an), cy - r * 0.62 * Math.cos(an), r * 0.17, i, 'middle', `h${i}`));
        }
      const ha = (((a % 12) + b / 60) * 30 * Math.PI) / 180;
      const ma = (b * 6 * Math.PI) / 180;
      body.push(<line key="hh" x1={cx} y1={cy} x2={cx + r * 0.42 * Math.sin(ha)} y2={cy - r * 0.42 * Math.cos(ha)} stroke={k} strokeWidth={r * 0.07} strokeLinecap="round" />);
      body.push(<line key="mh" x1={cx} y1={cy} x2={cx + r * 0.66 * Math.sin(ma)} y2={cy - r * 0.66 * Math.cos(ma)} stroke="#e8456b" strokeWidth={r * 0.045} strokeLinecap="round" />);
      body.push(<circle key="c" cx={cx} cy={cy} r={r * 0.06} fill={k} />);
      break;
    }
    case 'pie': {
      const r = Math.min(w, h) / 2 - 3;
      const cx = w / 2;
      const cy = h / 2;
      if (a === 1) body.push(<circle key="f" cx={cx} cy={cy} r={r} fill={b ? color : '#fff'} stroke={k} strokeWidth={3} />);
      else
        for (let i = 0; i < a; i++) {
          const a0 = (i / a) * Math.PI * 2 - Math.PI / 2;
          const a1 = ((i + 1) / a) * Math.PI * 2 - Math.PI / 2;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          body.push(
            <path
              key={i}
              d={`M${cx},${cy} L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} Z`}
              fill={i < b ? color : '#ffffff'}
              stroke={k}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          );
        }
      break;
    }
    case 'bar': {
      const cw = (w - 4) / a;
      for (let i = 0; i < a; i++) body.push(<rect key={i} x={2 + i * cw} y={2} width={cw} height={h - 4} fill={i < b ? color : '#ffffff'} stroke={k} strokeWidth={2.5} />);
      break;
    }
    case 'tenframe': {
      const frames = a > 10 ? 2 : 1;
      const fh = h / frames;
      for (let f = 0; f < frames; f++) {
        const cw = (w - 4) / 5;
        const ch = (fh - 8) / 2;
        for (let i = 0; i < 10; i++) {
          const x = 2 + (i % 5) * cw;
          const y = f * fh + 2 + Math.floor(i / 5) * ch;
          body.push(<rect key={`${f}-${i}`} x={x} y={y} width={cw} height={ch} fill="#ffffff" stroke={k} strokeWidth={2.5} />);
          if (f * 10 + i < a) body.push(<circle key={`c${f}-${i}`} cx={x + cw / 2} cy={y + ch / 2} r={Math.min(cw, ch) * 0.34} fill={color} stroke={k} strokeWidth={2} />);
        }
      }
      break;
    }
    case 'dice': {
      const s = Math.min(w, h) - 4;
      const x0 = (w - s) / 2;
      const y0 = (h - s) / 2;
      const P: Record<number, [number, number][]> = {
        1: [[0.5, 0.5]],
        2: [[0.27, 0.27], [0.73, 0.73]],
        3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
        4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
        5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
        6: [[0.27, 0.24], [0.73, 0.24], [0.27, 0.5], [0.73, 0.5], [0.27, 0.76], [0.73, 0.76]],
      };
      body.push(<rect key="d" x={x0} y={y0} width={s} height={s} rx={s * 0.18} fill={color} stroke={k} strokeWidth={3} />);
      (P[a] || P[1]).forEach(([px, py], i) => body.push(<circle key={i} cx={x0 + px * s} cy={y0 + py * s} r={s * 0.085} fill={a === 1 ? '#e8456b' : k} />));
      break;
    }
    case 'tally': {
      const groups = Math.ceil(a / 5);
      const gw = (w - 8) / Math.max(groups, 1);
      const lw = gw / 6;
      for (let g = 0; g < groups; g++) {
        const n = Math.min(5, a - g * 5);
        const gx = 4 + g * gw + lw * 0.6;
        for (let i = 0; i < Math.min(n, 4); i++) body.push(<line key={`${g}-${i}`} x1={gx + i * lw} x2={gx + i * lw} y1={6} y2={h - 6} stroke={color} strokeWidth={Math.max(3, lw * 0.28)} strokeLinecap="round" />);
        if (n === 5) body.push(<line key={`${g}-x`} x1={gx - lw * 0.5} x2={gx + 3.5 * lw} y1={h * 0.72} y2={h * 0.28} stroke={color} strokeWidth={Math.max(3, lw * 0.28)} strokeLinecap="round" />);
      }
      break;
    }
    case 'ruler': {
      const m = 14;
      const cm = (w - 2 * m) / a;
      body.push(<rect key="r" x={1.5} y={1.5} width={w - 3} height={h - 3} rx={6} fill={color} stroke={k} strokeWidth={3} />);
      for (let i = 0; i <= a * 10; i++) {
        const x = m + (i * cm) / 10;
        const L = i % 10 === 0 ? h * 0.42 : i % 5 === 0 ? h * 0.28 : h * 0.17;
        body.push(<line key={i} x1={x} x2={x} y1={1.5} y2={1.5 + L} stroke={k} strokeWidth={i % 10 === 0 ? 2 : 1} />);
        if (e.labels && i % 10 === 0) body.push(t(x, h * 0.66, Math.min(18, cm * 0.5), i / 10, 'middle', `l${i}`));
      }
      break;
    }
    case 'coord': {
      const m = 20;
      const s = Math.min(w, h) - 2 * m;
      const x0 = (w - s) / 2;
      const y0 = (h - s) / 2;
      const n = a * 2;
      const st = s / n;
      for (let i = 0; i <= n; i++) {
        body.push(<line key={`v${i}`} x1={x0 + i * st} x2={x0 + i * st} y1={y0} y2={y0 + s} stroke="#c9c2ea" strokeWidth={1.2} />);
        body.push(<line key={`h${i}`} x1={x0} x2={x0 + s} y1={y0 + i * st} y2={y0 + i * st} stroke="#c9c2ea" strokeWidth={1.2} />);
      }
      const cx = x0 + s / 2;
      const cy = y0 + s / 2;
      body.push(<line key="x" x1={x0 - 8} x2={x0 + s + 8} y1={cy} y2={cy} stroke={k} strokeWidth={2.5} />);
      body.push(<line key="y" x1={cx} x2={cx} y1={y0 - 8} y2={y0 + s + 8} stroke={k} strokeWidth={2.5} />);
      body.push(<path key="ax" d={`M${x0 + s + 14},${cy} l-10,-6 v12 Z`} fill={k} />, <path key="ay" d={`M${cx},${y0 - 14} l-6,10 h12 Z`} fill={k} />);
      if (e.labels) {
        const fs = Math.max(9, Math.min(15, st * 0.55));
        for (let i = -a; i <= a; i++) {
          if (!i) continue;
          body.push(t(cx + i * st, cy + fs * 0.9, fs, i, 'middle', `xl${i}`));
          body.push(t(cx - fs * 0.5, cy - i * st, fs, i, 'end', `yl${i}`));
        }
        body.push(t(x0 + s + 12, cy - 14, fs + 2, 'X', 'middle', 'X'), t(cx + 14, y0 - 10, fs + 2, 'Y', 'middle', 'Y'));
      }
      break;
    }
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      {body}
    </svg>
  );
}

/* ------------------------------------------------------------------ ชิ้นงาน */

export interface EditText {
  ref: React.RefObject<HTMLDivElement | null>;
  done: (text: string) => void;
}
export interface EditCell extends EditText {
  r: number;
  c: number;
}

function ItemBody({ it, editText, editCell }: { it: Item; editText?: EditText; editCell?: EditCell }) {
  switch (it.type) {
    case 'text':
      return <TextView t={it} edit={editText} />;
    case 'shape': {
      const d = shapeById(it.shape);
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
          <path
            d={d.d}
            fill={it.fill || 'none'}
            fillRule="evenodd"
            stroke={it.sw > 0 ? it.stroke : 'none'}
            strokeWidth={it.sw}
            strokeDasharray={dashArray(it.dash, it.sw)}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      );
    }
    case 'line':
      return <LineView l={it} />;
    case 'image':
      return (
        <img
          src={it.src}
          alt=""
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            borderRadius: `${it.radius}%`,
            border: it.bw ? `${it.bw}px solid ${it.border}` : undefined,
            boxSizing: 'border-box',
            transform: it.flip ? 'scaleX(-1)' : undefined,
          }}
        />
      );
    case 'sticker':
      return (
        <div style={{ width: '100%', height: '100%', transform: it.flip ? 'scaleX(-1)' : undefined }}>
          <StickerArt id={it.sticker} className="block w-full h-full" />
        </div>
      );
    case 'table':
      return <TableView t={it} edit={editCell} />;
    case 'write':
      return <WriteView x={it} />;
    case 'edu':
      return <EduView e={it} />;
    case 'char':
      return (
        <div style={{ width: '100%', height: '100%', transform: it.flip ? 'scaleX(-1)' : undefined }}>
          <CharArt look={it.look} className="block w-full h-full" />
        </div>
      );
  }
}

export function ItemView({ it, editText, editCell }: { it: Item; editText?: EditText; editCell?: EditCell }) {
  const auto = it.type === 'text';
  return (
    <div
      data-item={it.id}
      data-type={it.type}
      style={{
        position: 'absolute',
        left: it.x,
        top: it.y,
        width: it.w,
        height: auto ? undefined : it.h,
        transform: it.rot ? `rotate(${it.rot}deg)` : undefined,
        opacity: it.opacity,
      }}
    >
      <ItemBody it={it} editText={editText} editCell={editCell} />
    </div>
  );
}

export function PageView({
  page,
  W,
  H,
  editText,
  editCell,
  editId,
  children,
}: {
  page: Page;
  W: number;
  H: number;
  editText?: EditText;
  editCell?: EditCell;
  editId?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div data-page={page.id} style={{ position: 'relative', width: W, height: H, overflow: 'hidden', ...bgStyle(page.bg) }}>
      <BorderArt b={page.border} W={W} H={H} />
      {page.items.map((it) => (
        <ItemView key={it.id} it={it} editText={editId === it.id ? editText : undefined} editCell={editId === it.id ? editCell : undefined} />
      ))}
      {children}
    </div>
  );
}

/** หน้าย่อขนาด (ใช้ในรายการหน้า/การ์ด) */
export function PageThumb({ page, W, H, width }: { page: Page; W: number; H: number; width: number }) {
  const s = width / W;
  return (
    <div style={{ width, height: H * s, overflow: 'hidden', position: 'relative', pointerEvents: 'none' }}>
      <div style={{ transform: `scale(${s})`, transformOrigin: '0 0', width: W, height: H }}>
        <PageView page={page} W={W} H={H} />
      </div>
    </div>
  );
}
