/* eslint-disable @next/next/no-img-element */
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { MOON_PHASES, type Dash, type DecoItem, type EduItem, type Fx, type GraphItem, type Item, type LineItem, type MathItem, type Page, type PageBg, type PageBorder, type TableItem, type TextItem, type WriteItem } from '@/lib/studio/doc';
import { graphToSvg } from '@/lib/studio/graph';
import { FLOW_GAP, defaultWordOpt, pageLabel, paginate, type WordOpt } from '@/lib/studio/flow';
import { texToHtml } from '@/components/creator/math/MathText';
import { hydrateFlow } from './flowDom';
import { CharArt } from './CharArt';
import { FONTS } from './fonts';
import { shapeById } from './shapes';
import { StickerArt } from './stickers';
import { pastePlain } from './ui';

/**
 * วาดหน้าสื่อ 1 หน้าที่ขนาดจริง (พิกเซล) ใช้ร่วมกันทั้งตัวแก้ไข รูปย่อ และตอนส่งออกเป็นรูป/PDF
 * ข้อความแสดงแบบ text ธรรมดา ส่วนที่ใช้ innerHTML มีแค่ สมการ (KaTeX trust:false), กราฟ (SVG ที่ escape ทุกข้อความ)
 * และเนื้อหาโหมดเอกสาร (ผ่าน cleanFlowHtml แบบรายการอนุญาตทุกครั้งที่โหลด)
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

const heartPath = (cx: number, cy: number, r: number) =>
  `M${cx},${cy + r * 0.9} C${cx - r * 1.4},${cy - r * 0.1} ${cx - r * 0.9},${cy - r * 1.2} ${cx},${cy - r * 0.45} C${cx + r * 0.9},${cy - r * 1.2} ${cx + r * 1.4},${cy - r * 0.1} ${cx},${cy + r * 0.9} Z`;

function Flower({ x, y, r, c, k }: { x: number; y: number; r: number; c: string; k?: React.Key }) {
  return (
    <g key={k}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={x + r * 0.62 * Math.cos((a * Math.PI) / 180)} cy={y + r * 0.62 * Math.sin((a * Math.PI) / 180)} r={r * 0.48} fill={c} />
      ))}
      <circle cx={x} cy={y} r={r * 0.36} fill="#ffd166" />
    </g>
  );
}

/** เส้นซิกแซกรอบสี่เหลี่ยม */
function zigRect(W: number, H: number, m: number, amp: number, step: number) {
  const pts: [number, number][] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(2, Math.round(len / step) * 2);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const o = i % 2 ? amp : -amp;
      pts.push([x0 + (x1 - x0) * t + nx * o, y0 + (y1 - y0) * t + ny * o]);
    }
  };
  edge(m, m, W - m, m, 0, 1);
  edge(W - m, m, W - m, H - m, -1, 0);
  edge(W - m, H - m, m, H - m, 0, -1);
  edge(m, H - m, m, m, 1, 0);
  return 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L') + ' Z';
}

export function BorderArt({ b, W, H, fluid, margin }: { b: PageBorder; W: number; H: number; fluid?: boolean; margin?: number }) {
  if (b.style === 'none') return null;
  const m = margin ?? Math.max(14, Math.min(W, H) * 0.035);
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
    case 'hearts':
      body = (
        <g fill={b.color}>
          {along(W, H, m, 40 + w * 2).map(([x, y], i) => (
            <path key={i} d={heartPath(x, y, 7 + w * 0.8)} />
          ))}
        </g>
      );
      break;
    case 'flowers':
      body = <g>{along(W, H, m, 44 + w * 2).map(([x, y], i) => <Flower key={i} x={x} y={y} r={8 + w} c={b.color} />)}</g>;
      break;
    case 'zigzag':
      body = <path d={zigRect(W, H, m, 4 + w * 0.6, 14 + w * 1.5)} {...common} strokeLinejoin="round" />;
      break;
    case 'stamp':
      body = (
        <>
          <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} {...common} strokeWidth={Math.max(1, w * 0.5)} />
          <g fill={b.color}>
            {along(W, H, m - w * 1.6, 16 + w * 2).map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={2 + w * 0.6} />
            ))}
          </g>
        </>
      );
      break;
    case 'checker': {
      const sq = 10 + w * 1.4;
      const cells: React.ReactNode[] = [];
      const nx = Math.max(2, Math.round((W - 2 * m) / sq));
      const ny = Math.max(2, Math.round((H - 2 * m) / sq));
      const sx = (W - 2 * m) / nx;
      const sy = (H - 2 * m) / ny;
      for (let i = 0; i < nx; i++)
        if (i % 2 === 0) cells.push(<rect key={`t${i}`} x={m + i * sx} y={m - sq / 2} width={sx} height={sq} />, <rect key={`b${i}`} x={m + i * sx} y={H - m - sq / 2} width={sx} height={sq} />);
      for (let j = 0; j < ny; j++)
        if (j % 2 === 1) cells.push(<rect key={`l${j}`} x={m - sq / 2} y={m + j * sy} width={sq} height={sy} />, <rect key={`r${j}`} x={W - m - sq / 2} y={m + j * sy} width={sq} height={sy} />);
      body = (
        <>
          <rect x={m - sq / 2} y={m - sq / 2} width={W - 2 * m + sq} height={H - 2 * m + sq} fill="none" stroke={b.color} strokeWidth={1.5} />
          <g fill={b.color}>{cells}</g>
        </>
      );
      break;
    }
    case 'rainbow': {
      const cs = ['#ff6b7a', '#ff9a3d', '#ffd166', '#6ee7b7', '#7cc6ff', '#a78bfa'];
      const sw = Math.max(2, w * 0.7);
      body = (
        <g fill="none" strokeWidth={sw}>
          {cs.map((c, i) => (
            <rect key={c} x={m + i * sw} y={m + i * sw} width={W - 2 * (m + i * sw)} height={H - 2 * (m + i * sw)} rx={m * 0.8} stroke={c} />
          ))}
        </g>
      );
      break;
    }
    case 'bubbles':
      body = (
        <g>
          {along(W, H, m, 30 + w * 2).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={(i % 3 === 0 ? 9 : i % 3 === 1 ? 6 : 4) + w * 0.5} fill={b.color} fillOpacity={0.3} stroke={b.color} strokeWidth={Math.max(1.5, w * 0.35)} />
          ))}
        </g>
      );
      break;
    case 'ribbon':
      body = (
        <>
          <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} rx={m * 0.5} {...common} strokeWidth={w * 3} />
          <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} rx={m * 0.5} fill="none" stroke="#ffffff" strokeWidth={Math.max(1, w * 0.35)} strokeDasharray={`${w * 1.6} ${w * 1.2}`} />
        </>
      );
      break;
    case 'leaves':
      body = (
        <g fill={b.color}>
          {along(W, H, m, 34 + w * 2).map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx={4 + w * 0.5} ry={9 + w} transform={`rotate(${i % 2 ? 45 : -45} ${x} ${y})`} />
          ))}
        </g>
      );
      break;
    case 'scallop':
      body = (
        <g fill={b.color}>
          {along(W, H, m, 16 + w * 2).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={(16 + w * 2) * 0.55} />
          ))}
        </g>
      );
      break;
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
    case 'protractor': {
      const cx = w / 2;
      const cy = h - 10;
      const r = Math.max(20, Math.min(w / 2 - 6, h - 18));
      const P = (deg: number, rr: number): [number, number] => [cx + rr * Math.cos((deg * Math.PI) / 180), cy - rr * Math.sin((deg * Math.PI) / 180)];
      body.push(<path key="p" d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy} Z`} fill={color} fillOpacity={0.55} stroke={k} strokeWidth={2.5} />);
      for (let d = 0; d <= 180; d++) {
        const L = d % 10 === 0 ? r * 0.11 : d % 5 === 0 ? r * 0.07 : r * 0.035;
        const [x1, y1] = P(d, r);
        const [x2, y2] = P(d, r - L);
        body.push(<line key={`k${d}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={k} strokeWidth={d % 10 === 0 ? 1.6 : 0.9} />);
        if (e.labels && d % 30 === 0) {
          const [tx, ty] = P(d, r * 0.8);
          body.push(t(tx, ty, Math.max(9, r * 0.075), d, 'middle', `kl${d}`));
        }
      }
      body.push(<path key="in" d={`M${cx - r * 0.22},${cy} A${r * 0.22},${r * 0.22} 0 0 1 ${cx + r * 0.22},${cy}`} fill="none" stroke={k} strokeWidth={1.5} />);
      const [ax, ay] = P(a, r * 1.02);
      body.push(<line key="r0" x1={cx} y1={cy} x2={cx + r * 1.02} y2={cy} stroke="#e8456b" strokeWidth={3.5} strokeLinecap="round" />);
      body.push(<line key="r1" x1={cx} y1={cy} x2={ax} y2={ay} stroke="#e8456b" strokeWidth={3.5} strokeLinecap="round" />);
      const am = r * 0.34;
      const [mx, my] = P(a, am);
      if (a > 0) body.push(<path key="arc" d={`M${cx + am},${cy} A${am},${am} 0 0 0 ${mx},${my}`} fill="none" stroke="#e8456b" strokeWidth={2.5} />);
      const [lx, ly] = P(a / 2, am + r * 0.13);
      body.push(t(lx, ly, Math.max(11, r * 0.1), `${a}°`, 'middle', 'deg'));
      body.push(<circle key="c" cx={cx} cy={cy} r={4} fill={k} />);
      break;
    }
    case 'bond': {
      const r = Math.min(w * 0.17, h * 0.22);
      const top: [number, number] = [w / 2, r + 4];
      const lft: [number, number] = [w / 2 - w * 0.27, h - r - 4];
      const rgt: [number, number] = [w / 2 + w * 0.27, h - r - 4];
      const vals = [a, b, a - b];
      body.push(<line key="l1" x1={top[0]} y1={top[1]} x2={lft[0]} y2={lft[1]} stroke={k} strokeWidth={3} />, <line key="l2" x1={top[0]} y1={top[1]} x2={rgt[0]} y2={rgt[1]} stroke={k} strokeWidth={3} />);
      [top, lft, rgt].forEach(([x, y], i) => {
        body.push(<circle key={`b${i}`} cx={x} cy={y} r={r} fill={i === 0 ? color : '#ffffff'} stroke={k} strokeWidth={3} />);
        if (c !== i + 1) body.push(t(x, y, r * 0.75, vals[i], 'middle', `v${i}`));
      });
      break;
    }
    case 'blocks': {
      const H100 = Math.floor(a / 100);
      const T10 = Math.floor((a % 100) / 10);
      const O1 = a % 10;
      const lab = e.labels ? 30 : 0;
      const units = H100 * 10.8 + T10 * 1.8 + Math.ceil(O1 / 5) * 1.8 + 1;
      const u = Math.max(2, Math.min((h - lab - 4) / 10, (w - 8) / Math.max(units, 1)));
      let x = 4;
      const y0 = 4;
      const cube = (cx: number, cy: number, key: string) => <rect key={key} x={cx} y={cy} width={u} height={u} fill={color} stroke={k} strokeWidth={Math.max(0.6, u * 0.08)} />;
      for (let i = 0; i < H100; i++, x += u * 10.8) for (let j = 0; j < 100; j++) body.push(cube(x + (j % 10) * u, y0 + Math.floor(j / 10) * u, `h${i}-${j}`));
      for (let i = 0; i < T10; i++, x += u * 1.8) for (let j = 0; j < 10; j++) body.push(cube(x, y0 + j * u, `t${i}-${j}`));
      for (let j = 0; j < O1; j++) body.push(cube(x + Math.floor(j / 5) * u * 1.8, y0 + 10 * u - (1 + (j % 5)) * u * 1.15, `o${j}`));
      if (e.labels) body.push(t(w / 2, h - 14, 18, `${H100} ร้อย  ${T10} สิบ  ${O1} หน่วย = ${a}`, 'middle', 'lab'));
      break;
    }
    case 'money': {
      const DEN = [1000, 500, 100, 50, 20, 10, 5, 2, 1];
      const NOTE: Record<number, string> = { 1000: '#b8a48c', 500: '#b18be8', 100: '#ff8f8f', 50: '#7cb8ff', 20: '#7fd99a' };
      const list: number[] = [];
      let rest = a;
      for (const d of DEN) while (rest >= d && list.length < 30) (list.push(d), (rest -= d));
      // หาขนาดใหญ่สุดที่วางเรียงแล้วไม่ล้นกล่อง
      let s0 = h;
      let pos: [number, number, number][] = [];
      for (let tries = 0; tries < 40; tries++, s0 *= 0.9) {
        pos = [];
        let x = 4;
        let y = 4;
        let rowH = 0;
        for (const d of list) {
          const iw = d >= 20 ? s0 * 2 : s0 * 0.8;
          const ih = d >= 20 ? s0 : s0 * 0.8;
          if (x + iw > w - 4 && x > 4) {
            x = 4;
            y += rowH + 6;
            rowH = 0;
          }
          pos.push([x, y, d]);
          x += iw + 6;
          rowH = Math.max(rowH, ih);
        }
        if (y + rowH <= h - 4) break;
      }
      pos.forEach(([x, y, d], i) => {
        if (d >= 20) {
          body.push(
            <g key={i}>
              <rect x={x} y={y} width={s0 * 2} height={s0} rx={s0 * 0.08} fill={NOTE[d]} stroke={k} strokeWidth={2} />
              <rect x={x + s0 * 0.1} y={y + s0 * 0.1} width={s0 * 1.8} height={s0 * 0.8} rx={s0 * 0.05} fill="none" stroke="#ffffff99" strokeWidth={1.5} />
              <circle cx={x + s0 * 1.45} cy={y + s0 * 0.5} r={s0 * 0.26} fill="#ffffff66" />
              {t(x + s0 * 0.62, y + s0 * 0.5, s0 * 0.36, d, 'middle')}
            </g>
          );
        } else {
          const r = s0 * 0.4;
          const gold = d === 10 || d === 2;
          body.push(
            <g key={i}>
              <circle cx={x + r} cy={y + r} r={r} fill={gold ? color : '#d9dce4'} stroke={k} strokeWidth={2} />
              {d === 10 && <circle cx={x + r} cy={y + r} r={r * 0.66} fill="#d9dce4" stroke={k} strokeWidth={1} />}
              {t(x + r, y + r, r * 0.8, d, 'middle')}
            </g>
          );
        }
      });
      break;
    }
    case 'hundred': {
      const cs = Math.min(w, h) / 10;
      for (let n = 1; n <= 100; n++) {
        const x = ((n - 1) % 10) * cs;
        const y = Math.floor((n - 1) / 10) * cs;
        const hit = a > 0 && n % a === 0;
        const blank = b > 0 && (n * 37 + 11) % 100 < b;
        body.push(<rect key={`c${n}`} x={x} y={y} width={cs} height={cs} fill={hit ? color : '#ffffff'} stroke={k} strokeWidth={1.4} />);
        if (!blank) body.push(t(x + cs / 2, y + cs / 2, cs * 0.38, n, 'middle', `n${n}`));
      }
      break;
    }
    case 'balance': {
      const cx = w / 2;
      const top = h * 0.3;
      const L = w * 0.36;
      const rot = Math.max(-16, Math.min(16, (b - a) * 3));
      const rad = (rot * Math.PI) / 180;
      const ends: [number, number][] = [
        [cx - L * Math.cos(rad), top - L * Math.sin(rad)],
        [cx + L * Math.cos(rad), top + L * Math.sin(rad)],
      ];
      body.push(<path key="base" d={`M${cx},${top} L${cx - w * 0.1},${h - 6} L${cx + w * 0.1},${h - 6} Z`} fill={color} stroke={k} strokeWidth={3} strokeLinejoin="round" />);
      body.push(<line key="beam" x1={ends[0][0]} y1={ends[0][1]} x2={ends[1][0]} y2={ends[1][1]} stroke={k} strokeWidth={6} strokeLinecap="round" />);
      ends.forEach(([x, y], i) => {
        const pw = w * 0.22;
        const py = y + h * 0.3;
        body.push(
          <g key={`p${i}`}>
            <line x1={x} y1={y} x2={x - pw / 2} y2={py} stroke={k} strokeWidth={1.8} />
            <line x1={x} y1={y} x2={x + pw / 2} y2={py} stroke={k} strokeWidth={1.8} />
            <path d={`M${x - pw / 2},${py} Q${x},${py + h * 0.12} ${x + pw / 2},${py} Z`} fill="#ffffff" stroke={k} strokeWidth={2.5} />
            <rect x={x - pw * 0.28} y={py - h * 0.17} width={pw * 0.56} height={h * 0.16} rx={6} fill={i ? '#7cc6ff' : '#ff8fab'} stroke={k} strokeWidth={2} />
            {e.labels && t(x, py - h * 0.09, h * 0.09, i ? b : a, 'middle')}
          </g>
        );
      });
      body.push(<circle key="pin" cx={cx} cy={top} r={6} fill={k} />);
      break;
    }
    case 'thermo': {
      const cx = w * 0.38;
      const br = Math.min(w * 0.26, h * 0.12);
      const by = h - br - 4;
      const tw = br * 0.9;
      const ty = 10;
      const tb = by - br * 0.6;
      const yOf = (v: number) => tb - ((v + 20) / 70) * (tb - ty - 6);
      body.push(<rect key="tube" x={cx - tw / 2} y={ty} width={tw} height={by - ty} rx={tw / 2} fill="#ffffff" stroke={k} strokeWidth={2.5} />);
      body.push(<rect key="hg" x={cx - tw * 0.22} y={yOf(a)} width={tw * 0.44} height={by - yOf(a)} fill={color} />);
      body.push(<circle key="bulb" cx={cx} cy={by} r={br} fill={color} stroke={k} strokeWidth={2.5} />);
      for (let v = -20; v <= 50; v += 5) {
        const y = yOf(v);
        body.push(<line key={`t${v}`} x1={cx + tw / 2} x2={cx + tw / 2 + (v % 10 === 0 ? 10 : 5)} y1={y} y2={y} stroke={k} strokeWidth={1.4} />);
        if (e.labels && v % 10 === 0) body.push(t(cx + tw / 2 + 13, y, Math.max(9, w * 0.11), v, 'start', `l${v}`));
      }
      if (e.labels) body.push(t(cx, 4 + Math.max(9, w * 0.1) / 2, Math.max(9, w * 0.1), '°C', 'middle', 'u'));
      break;
    }
    case 'cylinder': {
      const x0 = w * 0.12;
      const x1 = w * 0.62;
      const y0 = 16;
      const y1 = h - 10;
      const lvl = y1 - ((y1 - y0 - 8) * a) / Math.max(1, b);
      body.push(<rect key="base" x={x0 - 10} y={y1 - 4} width={x1 - x0 + 20} height={10} rx={4} fill={k} />);
      body.push(<path key="liq" d={`M${x0 + 2},${lvl} H${x1 - 2} V${y1 - 4} H${x0 + 2} Z`} fill={color} fillOpacity={0.75} />);
      body.push(<path key="glass" d={`M${x0},${y0} V${y1 - 4} H${x1} V${y0}`} fill="none" stroke={k} strokeWidth={3} />);
      body.push(<path key="lip" d={`M${x0 - 6},${y0} H${x0} M${x1},${y0} H${x1 + 6}`} stroke={k} strokeWidth={3} />);
      for (let i = 0; i <= 10; i++) {
        const y = y1 - ((y1 - y0 - 8) * i) / 10;
        body.push(<line key={`t${i}`} x1={x1 - (i % 5 === 0 ? 18 : 10)} x2={x1} y1={y} y2={y} stroke={k} strokeWidth={1.4} />);
        if (e.labels && i % 2 === 0) body.push(t(x1 + 6, y, Math.max(9, w * 0.085), Math.round((b * i) / 10), 'start', `l${i}`));
      }
      if (e.labels) body.push(t(x1 + 6, 6, Math.max(9, w * 0.08), 'มล.', 'start', 'u'));
      break;
    }
    case 'moon': {
      const lab = e.labels ? 32 : 0;
      const r = Math.min(w, h - lab) / 2 - 4;
      const cx = w / 2;
      const cy = r + 4;
      body.push(<circle key="dark" cx={cx} cy={cy} r={r} fill="#3b3561" stroke={k} strokeWidth={2} />);
      if (a === 4) body.push(<circle key="full" cx={cx} cy={cy} r={r} fill={color} stroke={k} strokeWidth={2} />);
      else if (a !== 0) {
        const waxing = a < 4;
        const p = waxing ? a : 8 - a;
        const rx = Math.abs(Math.cos((p / 4) * Math.PI)) * r;
        const gib = p === 3;
        const half = p === 2;
        const d = `M${cx},${cy - r} A${r},${r} 0 0 1 ${cx},${cy + r} A${half ? 0.01 : rx},${r} 0 0 ${gib ? 1 : 0} ${cx},${cy - r} Z`;
        body.push(<path key="lit" d={d} fill={color} transform={waxing ? undefined : `translate(${2 * cx} 0) scale(-1 1)`} />);
      }
      if (e.labels) body.push(t(cx, h - 14, 16, MOON_PHASES[a], 'middle', 'n'));
      break;
    }
    case 'magnet': {
      if (a === 0) {
        const y = h * 0.2;
        const bh = h * 0.6;
        body.push(<rect key="n" x={4} y={y} width={(w - 8) / 2} height={bh} fill={color} stroke={k} strokeWidth={3} />);
        body.push(<rect key="s" x={w / 2} y={y} width={(w - 8) / 2} height={bh} fill="#4d8dff" stroke={k} strokeWidth={3} />);
        if (e.labels) body.push(t(w * 0.25, y + bh / 2, bh * 0.5, 'N', 'middle', 'N'), t(w * 0.75, y + bh / 2, bh * 0.5, 'S', 'middle', 'S'));
      } else {
        const sw = Math.min(w, h) * 0.26;
        const cx = w / 2;
        const R = Math.min(w / 2 - sw / 2 - 4, h - sw / 2 - 4) * 0.62;
        const top = 4 + sw / 2;
        const d = `M${cx - R},${top} V${top + R * 0.6} A${R},${R} 0 0 0 ${cx + R},${top + R * 0.6} V${top}`;
        body.push(<path key="u" d={d} fill="none" stroke={k} strokeWidth={sw + 6} />);
        body.push(<path key="u2" d={d} fill="none" stroke={color} strokeWidth={sw} />);
        body.push(<rect key="tn" x={cx - R - sw / 2} y={top - sw / 2} width={sw} height={sw * 0.8} fill="#d9dce4" stroke={k} strokeWidth={2} />);
        body.push(<rect key="ts" x={cx + R - sw / 2} y={top - sw / 2} width={sw} height={sw * 0.8} fill="#d9dce4" stroke={k} strokeWidth={2} />);
        if (e.labels) body.push(t(cx - R, top - sw * 0.1, sw * 0.5, 'N', 'middle', 'N'), t(cx + R, top - sw * 0.1, sw * 0.5, 'S', 'middle', 'S'));
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

/* ------------------------------------------------------------------ ของตกแต่ง */

function DecoView({ d }: { d: DecoItem }) {
  const { w, h, color: c, color2: c2, sw } = d;
  const st = d.style;
  if (!st.startsWith('d-') && !st.startsWith('t-') && !st.startsWith('c-')) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <BorderArt b={{ style: st as PageBorder['style'], color: c, w: sw }} W={w} H={h} margin={Math.max(10, sw * 1.5 + 10)} />
      </div>
    );
  }
  const y = h / 2;
  const body: React.ReactNode[] = [];
  const n = (gap: number) => Math.max(1, Math.round(w / gap));
  switch (st) {
    case 'd-dots': {
      const k = n(sw * 4 + 8);
      for (let i = 0; i <= k; i++) body.push(<circle key={i} cx={(w * i) / k} cy={y} r={sw * 0.9} fill={i % 2 ? c2 : c} />);
      break;
    }
    case 'd-wave':
    case 'd-vine': {
      const amp = h * 0.28;
      const k = Math.max(2, Math.round(w / Math.max(10, h * 0.8)));
      const seg = w / k;
      let p = `M0,${y}`;
      for (let i = 0; i < k; i++) p += ` q${seg / 2},${i % 2 ? amp * 2 : -amp * 2} ${seg},0`;
      body.push(<path key="w" d={p} fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" />);
      if (st === 'd-vine')
        for (let x = seg / 2, i = 0; i < k; x += seg, i++)
          body.push(<ellipse key={`l${i}`} cx={x} cy={y + (i % 2 ? amp : -amp)} rx={h * 0.12} ry={h * 0.24} fill={c2} transform={`rotate(${i % 2 ? 40 : -40} ${x} ${y + (i % 2 ? amp : -amp)})`} />);
      break;
    }
    case 'd-zigzag': {
      const k = n(h * 0.8);
      const pts = Array.from({ length: k + 1 }, (_, i) => `${((w * i) / k).toFixed(1)},${(i % 2 ? y + h * 0.3 : y - h * 0.3).toFixed(1)}`);
      body.push(<polyline key="z" points={pts.join(' ')} fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />);
      break;
    }
    case 'd-stars':
    case 'd-hearts': {
      const r = h * 0.36;
      const k = n(r * 3.2);
      for (let i = 0; i < k; i++) {
        const x = (w * (i + 0.5)) / k;
        body.push(<path key={i} d={st === 'd-stars' ? starPath(x, y, r) : heartPath(x, y, r * 0.9)} fill={i % 2 ? c2 : c} />);
      }
      break;
    }
    case 'd-ornament':
      body.push(
        <g key="o">
          <line x1={h * 0.4} x2={w / 2 - h * 0.6} y1={y} y2={y} stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <line x1={w / 2 + h * 0.6} x2={w - h * 0.4} y1={y} y2={y} stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <path d={`M${w / 2},${y - h * 0.42} L${w / 2 + h * 0.42},${y} L${w / 2},${y + h * 0.42} L${w / 2 - h * 0.42},${y} Z`} fill={c2} stroke={c} strokeWidth={Math.max(1, sw * 0.5)} />
          <circle cx={h * 0.25} cy={y} r={h * 0.16} fill={c} />
          <circle cx={w - h * 0.25} cy={y} r={h * 0.16} fill={c} />
          <circle cx={w / 2 - h * 0.9} cy={y} r={h * 0.1} fill={c2} />
          <circle cx={w / 2 + h * 0.9} cy={y} r={h * 0.1} fill={c2} />
        </g>
      );
      break;
    case 'd-scallop': {
      const k = n(h);
      for (let i = 0; i < k; i++) body.push(<path key={i} d={`M${(w * i) / k},${h * 0.3} a${w / k / 2},${h * 0.55} 0 0 0 ${w / k},0 Z`} fill={i % 2 ? c2 : c} />);
      break;
    }
    case 'd-flowers': {
      const r = h * 0.4;
      const k = n(r * 3);
      body.push(<line key="s" x1={0} x2={w} y1={y} y2={y} stroke="#6fbf73" strokeWidth={Math.max(1.5, sw * 0.5)} />);
      for (let i = 0; i < k; i++) body.push(<Flower key={i} x={(w * (i + 0.5)) / k} y={y} r={r} c={i % 2 ? c2 : c} />);
      break;
    }
    case 'd-arrows': {
      const k = n(h * 0.9);
      for (let i = 0; i < k; i++) {
        const x = (w * i) / k + h * 0.1;
        body.push(<path key={i} d={`M${x},${y - h * 0.3} L${x + h * 0.35},${y} L${x},${y + h * 0.3}`} fill="none" stroke={i % 2 ? c2 : c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />);
      }
      break;
    }
    case 'd-stitch':
      body.push(
        <g key="s">
          <line x1={0} x2={w} y1={y - h * 0.3} y2={y - h * 0.3} stroke={c} strokeWidth={Math.max(1, sw * 0.4)} />
          <line x1={0} x2={w} y1={y} y2={y} stroke={c2} strokeWidth={sw} strokeDasharray={`${sw * 2.5} ${sw * 1.5}`} strokeLinecap="round" />
          <line x1={0} x2={w} y1={y + h * 0.3} y2={y + h * 0.3} stroke={c} strokeWidth={Math.max(1, sw * 0.4)} />
        </g>
      );
      break;
    case 'd-double':
      body.push(
        <g key="d">
          <line x1={0} x2={w} y1={y - sw} y2={y - sw} stroke={c} strokeWidth={sw} />
          <line x1={0} x2={w} y1={y + sw * 0.8} y2={y + sw * 0.8} stroke={c2} strokeWidth={Math.max(1, sw * 0.45)} />
        </g>
      );
      break;
    case 't-stripes':
    case 't-dots':
    case 't-grid':
    case 't-plain': {
      const z = Math.max(4, h * 0.12);
      const k = Math.max(2, Math.round(h / z));
      let edge = '';
      for (let i = 0; i <= k; i++) edge += ` L${i % 2 ? z : 0},${(h * i) / k}`;
      let edge2 = '';
      for (let i = k; i >= 0; i--) edge2 += ` L${w - (i % 2 ? z : 0)},${(h * i) / k}`;
      const shape = `M0,0${edge}${edge2.replace(' L', ' L')} Z`;
      const cid = `tape-${d.id}`;
      body.push(
        <g key="t">
          <defs>
            <clipPath id={cid}>
              <path d={shape} />
            </clipPath>
          </defs>
          <path d={shape} fill={c} fillOpacity={0.78} />
          <g clipPath={`url(#${cid})`} opacity={0.75}>
            {st === 't-stripes' && Array.from({ length: Math.ceil((w + h) / 18) }, (_, i) => <line key={i} x1={i * 18 - h} y1={h} x2={i * 18} y2={0} stroke={c2} strokeWidth={6} />)}
            {st === 't-dots' && Array.from({ length: Math.ceil(w / 16) * Math.ceil(h / 16) }, (_, i) => <circle key={i} cx={(i % Math.ceil(w / 16)) * 16 + 8} cy={Math.floor(i / Math.ceil(w / 16)) * 16 + 8} r={3} fill={c2} />)}
            {st === 't-grid' &&
              [...Array.from({ length: Math.ceil(w / 14) }, (_, i) => <line key={`v${i}`} x1={i * 14} x2={i * 14} y1={0} y2={h} stroke={c2} strokeWidth={1.5} />), ...Array.from({ length: Math.ceil(h / 14) }, (_, i) => <line key={`h${i}`} x1={0} x2={w} y1={i * 14} y2={i * 14} stroke={c2} strokeWidth={1.5} />)]}
          </g>
        </g>
      );
      break;
    }
    case 'c-swirl': {
      const s = Math.min(w, h);
      body.push(
        <g key="c" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round">
          <path d={`M${s * 0.06},${s * 0.95} V${s * 0.06} H${s * 0.95}`} />
          <path d={`M${s * 0.06},${s * 0.55} C${s * 0.06},${s * 0.3} ${s * 0.3},${s * 0.3} ${s * 0.3},${s * 0.45} C${s * 0.3},${s * 0.55} ${s * 0.18},${s * 0.55} ${s * 0.18},${s * 0.46}`} />
          <path d={`M${s * 0.55},${s * 0.06} C${s * 0.3},${s * 0.06} ${s * 0.3},${s * 0.3} ${s * 0.45},${s * 0.3} C${s * 0.55},${s * 0.3} ${s * 0.55},${s * 0.18} ${s * 0.46},${s * 0.18}`} />
          <circle cx={s * 0.16} cy={s * 0.16} r={s * 0.05} fill={c2} stroke="none" />
        </g>
      );
      break;
    }
    case 'c-floral': {
      const s = Math.min(w, h);
      body.push(
        <g key="c">
          <ellipse cx={s * 0.45} cy={s * 0.14} rx={s * 0.16} ry={s * 0.06} fill="#6fbf73" transform={`rotate(-15 ${s * 0.45} ${s * 0.14})`} />
          <ellipse cx={s * 0.14} cy={s * 0.45} rx={s * 0.06} ry={s * 0.16} fill="#6fbf73" transform={`rotate(15 ${s * 0.14} ${s * 0.45})`} />
          <Flower x={s * 0.2} y={s * 0.2} r={s * 0.17} c={c} />
          <Flower x={s * 0.66} y={s * 0.1} r={s * 0.08} c={c2} />
          <Flower x={s * 0.1} y={s * 0.66} r={s * 0.08} c={c2} />
        </g>
      );
      break;
    }
    case 'c-triangle': {
      const s = Math.min(w, h);
      body.push(<path key="a" d={`M0,0 H${s} L0,${s} Z`} fill={c} />, <path key="b" d={`M${s * 0.55},0 H${s * 0.75} L0,${s * 0.75} V${s * 0.55} Z`} fill={c2} />);
      break;
    }
    case 'c-dots': {
      const s = Math.min(w, h);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6 - i; j++) body.push(<circle key={`${i}-${j}`} cx={s * (0.08 + j * 0.16)} cy={s * (0.08 + i * 0.16)} r={s * 0.055 * (1 - (i + j) * 0.12)} fill={(i + j) % 2 ? c2 : c} />);
      break;
    }
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      {body}
    </svg>
  );
}

/** เอฟเฟกต์ของชิ้นงาน: ใช้ CSS filter (ส่งออกเป็นรูป/PDF ได้เหมือนบนจอ) */
export function fxFilter(fx: Fx, color: string): string | undefined {
  const c = color.slice(0, 7);
  switch (fx) {
    case 'shadow':
      return `drop-shadow(5px 5px 0 ${c}66)`;
    case 'soft':
      return 'drop-shadow(0 6px 12px rgba(0,0,0,.28))';
    case 'lift':
      return 'drop-shadow(0 18px 12px rgba(0,0,0,.22))';
    case 'glow':
      return `drop-shadow(0 0 6px ${c}) drop-shadow(0 0 14px ${c}aa)`;
    case 'neon':
      return `drop-shadow(0 0 2px #ffffff) drop-shadow(0 0 7px ${c}) drop-shadow(0 0 16px ${c})`;
    case 'outline':
      return `drop-shadow(3px 0 0 ${c}) drop-shadow(-3px 0 0 ${c}) drop-shadow(0 3px 0 ${c}) drop-shadow(0 -3px 0 ${c})`;
    case 'echo':
      return `drop-shadow(6px 6px 0 ${c}77) drop-shadow(6px 6px 0 ${c}44)`;
    case 'retro':
      return `drop-shadow(4px 4px 0 ${c})`;
    case 'gray':
      return 'grayscale(1)';
    case 'sepia':
      return 'sepia(.8)';
    case 'blur':
      return 'blur(2.5px)';
    default:
      return undefined;
  }
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
    case 'deco':
      return <DecoView d={it} />;
    case 'math':
      return <MathView m={it} />;
    case 'graph':
      return <GraphView g={it} />;
  }
}

function MathView({ m }: { m: MathItem }) {
  const html = useMemo(() => texToHtml(m.tex, false, true), [m.tex]);
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color, fontSize: m.size, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
      <span data-math dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function GraphView({ g }: { g: GraphItem }) {
  const svg = useMemo(() => graphToSvg(g.spec), [g.spec]);
  return <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** เนื้อหาโหมดเอกสาร 1 หน้า: วางเนื้อหาทั้งหมดแล้วเลื่อนขึ้นตามเลขหน้า (ตัดหน้าแบบเดียวกับจอแก้ไข) */
/** กล่องเนื้อหาโหมดเอกสาร: ขอบซ้าย/ขวา ฟอนต์หลัก และค่ามาตรฐาน Word (ใช้ทั้งจอแก้ไขและตอนแสดง/ส่งออก) */
export const flowBoxStyle = (o: WordOpt, W: number): React.CSSProperties => ({ width: W, paddingLeft: o.ml, paddingRight: o.mr, fontFamily: (o.std ? FONTS.thsarabun : FONTS.sarabun).family });

export function FlowLayer({ html, index, W, H, opt = defaultWordOpt(false) }: { html: string; index: number; W: number; H: number; opt?: WordOpt }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = html;
    hydrateFlow(el);
    paginate(el, H, FLOW_GAP, opt.mt, opt.mb);
    let off = false;
    // ฟอนต์โหลดเสร็จทีหลังทำให้ความสูงเปลี่ยน
    document.fonts?.ready.then(() => !off && paginate(el, H, FLOW_GAP, opt.mt, opt.mb));
    return () => {
      off = true;
    };
  }, [html, H, opt.mt, opt.mb, opt.ml, opt.mr, opt.std]);
  return <div ref={ref} className="st-flow" data-std={opt.std || undefined} aria-hidden="true" style={{ ...flowBoxStyle(opt, W), position: 'absolute', left: 0, top: -index * (H + FLOW_GAP), pointerEvents: 'none' }} />;
}

/** หัวกระดาษ ท้ายกระดาษ และเลขหน้า (แบบ Word) วางในพื้นที่ขอบกระดาษ */
export function PageDeco({ opt, index, total, W, H }: { opt: WordOpt; index: number; total: number; W: number; H: number }) {
  if (index === 0 && !opt.numFirst) return null;
  const num = opt.num !== 'none' ? pageLabel(opt, index, total) : '';
  if (!num && !opt.head && !opt.foot) return null;
  const font = (opt.std ? FONTS.thsarabun : FONTS.sarabun).family;
  const band = (top: boolean, text: string, n: string) =>
    text || n ? (
      <div className="st-hf" style={{ [top ? 'top' : 'bottom']: 0, height: top ? opt.mt : opt.mb, left: opt.ml, right: opt.mr, fontFamily: font, justifyContent: top ? 'flex-end' : 'flex-start' }}>
        {text && <span className="st-hf-text">{text}</span>}
        {n && <span className="st-hf-num" style={{ textAlign: opt.numAlign }}>{n}</span>}
      </div>
    ) : null;
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, width: W, height: H, pointerEvents: 'none' }}>
      {band(true, opt.head, opt.num === 'top' ? num : '')}
      {band(false, opt.foot, opt.num === 'bottom' ? num : '')}
    </div>
  );
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
        filter: fxFilter(it.fx, it.fxColor),
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
  flow,
  index = 0,
  wopt,
  total = 1,
  children,
}: {
  page: Page;
  W: number;
  H: number;
  editText?: EditText;
  editCell?: EditCell;
  editId?: string | null;
  /** เนื้อหาโหมดเอกสาร (แสดงใต้ชิ้นงาน) */
  flow?: string;
  index?: number;
  /** ตั้งค่าหน้าของโหมดเอกสาร (หัว/ท้ายกระดาษ เลขหน้า ขอบ) */
  wopt?: WordOpt;
  total?: number;
  children?: React.ReactNode;
}) {
  return (
    <div data-page={page.id} style={{ position: 'relative', width: W, height: H, overflow: 'hidden', ...bgStyle(page.bg) }}>
      <BorderArt b={page.border} W={W} H={H} />
      {flow ? <FlowLayer html={flow} index={index} W={W} H={H} opt={wopt} /> : null}
      {wopt ? <PageDeco opt={wopt} index={index} total={total} W={W} H={H} /> : null}
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
