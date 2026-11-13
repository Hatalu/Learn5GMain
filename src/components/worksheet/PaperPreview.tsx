'use client';

/**
 * กระดาษตัวอย่างของตู้แต่งตัวใบงาน: วาดโครงคร่าวๆ ด้วย SVG เปลี่ยนตามตัวเลือกทันที
 * (เป็นภาพประกอบให้ครูเห็นภาพ ไม่ใช่ใบงานจริง ใบงานจริง Gemini เป็นคนวาด)
 */
import React, { useId } from 'react';
import { geometry, type Pal } from '@/lib/worksheet/layout';
import { itemCount, titleOf, type Recipe } from '@/lib/worksheet/recipe';
import { CharFigure, FrameArt, HeadShape, PatternDef, SceneArt, SpeechBubble } from './PaperArt';



export function Motif({ kind, x, y, s, p }: { kind: string; x: number; y: number; s: number; p: Pal }) {
  const tr = `translate(${x} ${y}) scale(${s})`;
  const st = { stroke: p.ink, strokeWidth: 0.8, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'star':
      return <path transform={tr} d="M0-5 1.5-1.6 5.2-1.5 2.3.9 3.3 4.6 0 2.5-3.3 4.6-2.3.9-5.2-1.5-1.5-1.6Z" fill={p.b} {...st} />;
    case 'fish':
      return (
        <g transform={tr}>
          <ellipse rx="4.4" ry="2.8" fill={p.b} {...st} />
          <path d="M4 0 7-2.6V2.6Z" fill={p.a} {...st} />
          <circle cx="-2" cy="-0.6" r="0.6" fill={p.ink} />
        </g>
      );
    case 'tree':
      return (
        <g transform={tr}>
          <rect x="-0.9" y="1" width="1.8" height="3.6" fill="#8b5a2b" {...st} />
          <circle r="3.6" fill={p.a} {...st} />
        </g>
      );
    case 'tri':
      return <path transform={tr} d="M-4 3 0-4 4 3Z" fill={p.a} {...st} />;
    case 'donut':
      return (
        <g transform={tr}>
          <circle r="4" fill={p.b} {...st} />
          <circle r="1.4" fill={p.bg} {...st} />
        </g>
      );
    case 'flower':
      return (
        <g transform={tr}>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="0" cy="-2.6" rx="1.7" ry="2.4" transform={`rotate(${r})`} fill={p.b} {...st} />
          ))}
          <circle r="1.4" fill={p.a} {...st} />
        </g>
      );
    case 'block':
      return (
        <g transform={tr}>
          <rect x="-3" y="-5" width="6" height="9" fill={p.a} {...st} />
          <rect x="-1.8" y="-3.5" width="1.4" height="1.4" fill={p.bg} />
          <rect x="0.4" y="-3.5" width="1.4" height="1.4" fill={p.bg} />
        </g>
      );
    case 'pencil':
      return <path transform={`${tr} rotate(35)`} d="M-1.4-5h2.8v8L0 5.5-1.4 3Z" fill={p.b} {...st} />;
    case 'drop':
      return <path transform={tr} d="M0-5C2 -2 3.4 0 3.4 1.6A3.4 3.4 0 0 1-3.4 1.6C-3.4 0-2-2 0-5Z" fill={p.a} {...st} />;
    case 'moon':
      return <path transform={tr} d="M2-4.5A5 5 0 1 0 2 4.5 4 4 0 1 1 2-4.5Z" fill={p.b} {...st} />;
    case 'diamond':
      return <path transform={tr} d="M0-4 3 0 0 4-3 0Z" fill={p.b} {...st} />;
    case 'gear':
      return (
        <g transform={tr}>
          {[0, 45, 90, 135].map((r) => (
            <rect key={r} x="-0.9" y="-4.6" width="1.8" height="9.2" transform={`rotate(${r})`} fill={p.a} {...st} />
          ))}
          <circle r="2.8" fill={p.a} {...st} />
          <circle r="1" fill={p.bg} />
        </g>
      );
    case 'snow':
      return (
        <g transform={tr} stroke={p.a} strokeWidth="0.9" strokeLinecap="round">
          {[0, 60, 120].map((r) => (
            <path key={r} d="M0-4.5V4.5" transform={`rotate(${r})`} />
          ))}
        </g>
      );
    case 'flag':
      return (
        <g transform={tr}>
          <path d="M-2-5V5" stroke={p.ink} strokeWidth="0.8" />
          <path d="M-2-5 4-3-2-1Z" fill={p.a} {...st} />
        </g>
      );
    case 'heart':
      return <path transform={tr} d="M0 4.2C-5 0.6-5.2-3.6-2.6-4.2-1.2-4.5 0-3.4 0-2.4 0-3.4 1.2-4.5 2.6-4.2 5.2-3.6 5 0.6 0 4.2Z" fill={p.a} {...st} />;
    case 'cloud':
      return <path transform={tr} d="M-4.6 3.2A2.4 2.4 0 0 1-4.2-1.4 3 3 0 0 1 1.2-2.6 2.6 2.6 0 0 1 5 0.4 1.6 1.6 0 0 1 4.4 3.2Z" fill={p.bg === '#ffffff' ? '#eef4ff' : p.bg} {...st} />;
    case 'leaf':
      return (
        <g transform={tr}>
          <path d="M-4 4C-4.6-1.6-0.6-4.8 4.4-4.4 4.6 0.8 1.6 4.6-4 4Z" fill={p.a} {...st} />
          <path d="M-3.6 3.6 3.6-3.8" stroke={p.ink} strokeWidth="0.6" />
        </g>
      );
    case 'sun':
      return (
        <g transform={tr}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path key={a} d="M0-3.6V-5.4" transform={`rotate(${a})`} stroke={p.ink} strokeWidth="0.8" strokeLinecap="round" />
          ))}
          <circle r="2.8" fill={p.b} {...st} />
        </g>
      );
    case 'balloon':
      return (
        <g transform={tr}>
          <ellipse cy="-1.2" rx="3" ry="3.8" fill={p.a} {...st} />
          <path d="M0 2.6q-1 1.2 0 2.6" fill="none" stroke={p.ink} strokeWidth="0.6" />
        </g>
      );
    case 'note':
      return (
        <g transform={tr}>
          <ellipse cx="-1.6" cy="3" rx="1.8" ry="1.4" fill={p.a} {...st} />
          <path d="M0 3V-4.4L3.4-3.2V-1.4L0-2.6" fill={p.a} {...st} />
        </g>
      );
    case 'crown':
      return <path transform={tr} d="M-4.4 3V-2.4L-2.2-0.2 0-3.6 2.2-0.2 4.4-2.4V3Z" fill={p.b} {...st} />;
    case 'bolt':
      return <path transform={tr} d="M1.2-5-3 0.8H-0.4L-1.4 5 3-1H0.4Z" fill={p.b} {...st} />;
    case 'paw':
      return (
        <g transform={tr} fill={p.a} {...st}>
          <ellipse cy="1.8" rx="2.8" ry="2.2" />
          <circle cx="-3" cy="-1.6" r="1.1" />
          <circle cx="-1" cy="-3.2" r="1.1" />
          <circle cx="1" cy="-3.2" r="1.1" />
          <circle cx="3" cy="-1.6" r="1.1" />
        </g>
      );
    case 'bow':
      return (
        <g transform={tr} fill={p.a} {...st}>
          <path d="M0 0-4.6-3V3Z" />
          <path d="M0 0 4.6-3V3Z" />
          <circle r="1.2" />
        </g>
      );
    case 'apple':
      return (
        <g transform={tr}>
          <circle cy="0.6" r="3.6" fill={p.a} {...st} />
          <path d="M0-3V-5" stroke={p.ink} strokeWidth="0.7" />
          <path d="M0.4-4.2q2-1.4 3 0-1.6 1-3 0Z" fill="#22c55e" stroke={p.ink} strokeWidth="0.5" />
        </g>
      );
    case 'planet':
      return (
        <g transform={tr}>
          <circle r="2.8" fill={p.a} {...st} />
          <ellipse rx="5" ry="1.4" transform="rotate(-20)" fill="none" stroke={p.b} strokeWidth="0.9" />
        </g>
      );
    case 'shell':
      return (
        <g transform={tr}>
          <path d="M-4.4 2.6Q0-6.4 4.4 2.6Z" fill={p.b} {...st} />
          <path d="M0 2.6V-3M-2.2 2.6-1.2-2.4M2.2 2.6 1.2-2.4" stroke={p.ink} strokeWidth="0.5" />
        </g>
      );
    case 'lantern':
      return (
        <g transform={tr}>
          <path d="M0-5.4V-4" stroke={p.ink} strokeWidth="0.6" />
          <rect x="-3.4" y="-4" width="6.8" height="7.6" rx="3" fill={p.a} {...st} />
          <rect x="-1.6" y="3.6" width="3.2" height="1.2" fill={p.b} stroke={p.ink} strokeWidth="0.5" />
        </g>
      );
    default:
      return null;
  }
}

/** เนื้อหาตามกิจกรรม วาดในกรอบ (x,y,w,h) */
function Body({ a, n, x, y, w, h, p, s, R = 2 }: { a: string; n: number; x: number; y: number; w: number; h: number; p: Pal; s: string; R?: number }) {
  const line = { stroke: p.soft, strokeWidth: 1.2, strokeLinecap: 'round' as const };
  const ink = { stroke: p.ink, strokeWidth: 0.8, fill: '#fff' };
  // จำนวนชิ้นเท่ากับที่ prompt สั่ง Gemini (itemCount ใช้ร่วมกัน)
  const k0 = itemCount(a, n);
  const rows = k0;
  const rh = h / rows;
  const num = (i: number, cx: number, cy: number) => (
    <g key={`n${i}`}>
      <circle cx={cx} cy={cy} r="3" fill={p.a} />
      <text x={cx} y={cy + 1.3} fontSize="3.6" textAnchor="middle" fill="#fff" fontWeight="700">
        {i + 1}
      </text>
    </g>
  );
  const grid = (cols: number, rowsN: number, cell: string, extra?: (cx: number, cy: number, cw: number, ch: number, i: number) => React.ReactNode) => {
    const cw = w / cols;
    const ch = Math.min(cw, h / rowsN);
    const out: React.ReactNode[] = [];
    for (let r = 0; r < rowsN; r++)
      for (let c = 0; c < cols; c++) {
        const cx = x + c * cw;
        const cy = y + r * ch;
        out.push(<rect key={`${r}-${c}`} x={cx + 0.6} y={cy + 0.6} width={cw - 1.2} height={ch - 1.2} rx={cell === 'round' ? R : 0.6} {...ink} />);
        if (extra) out.push(<g key={`e${r}-${c}`}>{extra(cx, cy, cw, ch, r * cols + c)}</g>);
      }
    return out;
  };

  switch (a) {
    case 'match': {
      const k = k0;
      const gap = h / k;
      return (
        <g>
          {Array.from({ length: k }, (_, i) => {
            const cy = y + gap * (i + 0.5);
            const j = (i * 3 + 2) % k;
            const cy2 = y + gap * (j + 0.5);
            return (
              <g key={i}>
                <rect x={x} y={cy - gap * 0.32} width={w * 0.3} height={gap * 0.64} rx={R} {...ink} />
                <rect x={x + w * 0.7} y={cy - gap * 0.32} width={w * 0.3} height={gap * 0.64} rx={R} {...ink} />
                <circle cx={x + w * 0.33} cy={cy} r="1.3" fill={p.a} />
                <circle cx={x + w * 0.67} cy={cy} r="1.3" fill={p.b} stroke={p.ink} strokeWidth="0.5" />
                {i < 2 && <path d={`M${x + w * 0.33} ${cy}L${x + w * 0.67} ${cy2}`} stroke={p.a} strokeWidth="0.8" strokeDasharray="1.5 1.5" />}
              </g>
            );
          })}
        </g>
      );
    }
    case 'circle':
    case 'tf':
      return (
        <g>
          {Array.from({ length: rows }, (_, i) => {
            const cy = y + rh * (i + 0.5);
            return (
              <g key={i}>
                {num(i, x + 3, cy)}
                <path d={`M${x + 9} ${cy}h${w * 0.45}`} {...line} />
                {(a === 'tf' ? [0, 1] : [0, 1, 2]).map((k) => (
                  <circle key={k} cx={x + w * 0.66 + k * 11} cy={cy} r={Math.min(3.6, rh * 0.32)} fill="#fff" stroke={k === 1 ? p.a : p.ink} strokeWidth={k === 1 ? 1.2 : 0.7} />
                ))}
              </g>
            );
          })}
        </g>
      );
    case 'color':
      return (
        <g>
          <ellipse cx={x + w * 0.5} cy={y + h * 0.42} rx={w * 0.36} ry={h * 0.36} fill="#fff" stroke={p.ink} strokeWidth="0.9" />
          <path d={`M${x + w * 0.14} ${y + h * 0.42}h${w * 0.72}M${x + w * 0.5} ${y + h * 0.06}v${h * 0.72}`} stroke={p.ink} strokeWidth="0.6" />
          <path d={`M${x + w * 0.5} ${y + h * 0.06}A${w * 0.36} ${h * 0.36} 0 0 1 ${x + w * 0.86} ${y + h * 0.42}H${x + w * 0.5}Z`} fill={p.b} opacity="0.85" />
          {[0, 1, 2, 3].map((k) => (
            <g key={k}>
              <rect x={x + k * (w / 4) + 2} y={y + h * 0.84} width={w / 4 - 4} height={h * 0.12} rx={R} {...ink} />
              <circle cx={x + k * (w / 4) + 6} cy={y + h * 0.9} r="2" fill={[p.a, p.b, '#3fd6a8', '#ff8fab'][k]} stroke={p.ink} strokeWidth="0.5" />
            </g>
          ))}
        </g>
      );
    case 'maze': {
      const c = 8;
      const cw = Math.min(w, h) / c;
      const ox = x + (w - cw * c) / 2;
      const segs: string[] = [];
      for (let i = 0; i < c; i++)
        for (let j = 0; j < c; j++) {
          const v = (i * 7 + j * 13) % 5;
          if (v === 0) segs.push(`M${ox + i * cw} ${y + j * cw}h${cw}`);
          if (v === 1) segs.push(`M${ox + i * cw} ${y + j * cw}v${cw}`);
        }
      return (
        <g>
          <rect x={ox} y={y} width={cw * c} height={cw * c} fill="#fff" stroke={p.ink} strokeWidth="1" />
          <path d={segs.join('')} stroke={p.ink} strokeWidth="0.9" strokeLinecap="round" />
          <circle cx={ox + cw / 2} cy={y + cw / 2} r={cw * 0.3} fill={p.a} />
          <path d={`M${ox + cw * (c - 0.5)} ${y + cw * (c - 0.8)} l2 3h-4Z`} fill={p.b} stroke={p.ink} strokeWidth="0.5" />
        </g>
      );
    }
    case 'wordsearch':
    case 'crossword': {
      const c = a === 'crossword' ? 9 : 10;
      const cw = Math.min(w * 0.7, h) / c;
      const out: React.ReactNode[] = [];
      for (let i = 0; i < c; i++)
        for (let j = 0; j < c; j++) {
          const on = a === 'wordsearch' || (i === 4 && j > 1) || (j === 3 && i < 8) || (j === 7 && i > 3);
          if (!on) continue;
          out.push(<rect key={`${i}-${j}`} x={x + i * cw} y={y + j * cw} width={cw} height={cw} fill={a === 'wordsearch' && j === 2 && i > 2 && i < 8 ? p.b : '#fff'} stroke={p.ink} strokeWidth="0.4" />);
        }
      return (
        <g>
          {out}
          {Array.from({ length: k0 }, (_, i) => (
            <path key={i} d={`M${x + c * cw + 5} ${y + 4 + i * (h / k0)}h${w - c * cw - 6}`} {...line} />
          ))}
        </g>
      );
    }
    case 'trace':
    case 'tian':
    case 'kana': {
      const cols = a === 'trace' ? 6 : 7;
      const rowsN = k0;
      return (
        <g>
          {grid(cols, rowsN, 'sq', (cx, cy, cw, ch, i) => (
            <>
              {a !== 'trace' && <path d={`M${cx + cw / 2} ${cy + 1}v${ch - 2}M${cx + 1} ${cy + ch / 2}h${cw - 2}`} stroke={p.soft} strokeWidth="0.5" strokeDasharray="1 1" />}
              {i % cols === 0 ? (
                <text x={cx + cw / 2} y={cy + ch * 0.68} fontSize={ch * 0.55} textAnchor="middle" fill={p.a} fontWeight="700">
                  {a === 'tian' ? '一' : a === 'kana' ? 'あ' : 'ก'}
                </text>
              ) : i % cols === 1 ? (
                <text x={cx + cw / 2} y={cy + ch * 0.68} fontSize={ch * 0.55} textAnchor="middle" fill="none" stroke={p.soft} strokeWidth="0.4" strokeDasharray="0.8 0.8">
                  {a === 'tian' ? '一' : a === 'kana' ? 'あ' : 'ก'}
                </text>
              ) : null}
            </>
          ))}
        </g>
      );
    }
    case 'sequence':
    case 'comic':
    case 'draw': {
      const cols = a === 'comic' ? 2 : 3;
      const k = k0;
      const rowsN = Math.ceil(k / cols);
      const cw = w / cols;
      const ch = h / rowsN;
      return (
        <g>
          {Array.from({ length: k }, (_, i) => {
            const cx = x + (i % cols) * cw;
            const cy = y + Math.floor(i / cols) * ch;
            return (
              <g key={i}>
                <rect x={cx + 1.2} y={cy + 1.2} width={cw - 2.4} height={ch - 2.4} rx="2.5" {...ink} />
                {a === 'comic' ? (
                  <path d={`M${cx + 5} ${cy + 5}h${cw * 0.5}a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-${cw * 0.3}l-3 3v-3h-${cw * 0.2 - 3}Z`} fill="#fff" stroke={p.ink} strokeWidth="0.6" />
                ) : (
                  <rect x={cx + cw - 9} y={cy + ch - 9} width="6" height="6" rx="1" fill="#fff" stroke={p.a} strokeWidth="0.8" />
                )}
                <Motif kind={s} x={cx + cw / 2} y={cy + ch / 2} s={Math.min(cw, ch) / 22} p={p} />
              </g>
            );
          })}
        </g>
      );
    }
    case 'mindmap': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const k = k0;
      return (
        <g>
          {Array.from({ length: k }, (_, i) => {
            const ang = (i / k) * Math.PI * 2 - Math.PI / 2;
            const bx = cx + Math.cos(ang) * w * 0.36;
            const by = cy + Math.sin(ang) * h * 0.38;
            return (
              <g key={i}>
                <path d={`M${cx} ${cy}L${bx} ${by}`} stroke={p.a} strokeWidth="1" />
                <ellipse cx={bx} cy={by} rx={w * 0.11} ry={h * 0.07} {...ink} />
              </g>
            );
          })}
          <ellipse cx={cx} cy={cy} rx={w * 0.17} ry={h * 0.11} fill={p.b} stroke={p.ink} strokeWidth="1" />
        </g>
      );
    }
    case 'reading':
      return (
        <g>
          <rect x={x} y={y} width={w} height={h * 0.42} rx="3" fill={p.bg} stroke={p.ink} strokeWidth="0.6" />
          {Array.from({ length: 6 }, (_, i) => (
            <path key={i} d={`M${x + 5} ${y + 7 + i * (h * 0.06)}h${w - (i === 5 ? w * 0.5 : 10)}`} {...line} />
          ))}
          {Array.from({ length: k0 }, (_, i) => {
            const cy = y + h * 0.5 + i * (h * 0.1);
            return (
              <g key={`q${i}`}>
                {num(i, x + 3, cy)}
                <path d={`M${x + 9} ${cy + 2}h${w - 10}`} {...line} />
              </g>
            );
          })}
        </g>
      );
    case 'table':
    case 'lablog':
    case 'exercise': {
      const cols = a === 'exercise' ? 8 : 4;
      const rowsN = k0 + 1;
      const cw = w / cols;
      const ch = h / rowsN;
      return (
        <g>
          {Array.from({ length: rowsN }, (_, r) =>
            Array.from({ length: cols }, (_, c) => (
              <rect key={`${r}-${c}`} x={x + c * cw} y={y + r * ch} width={a === 'exercise' && c === 0 ? cw : cw} height={ch} fill={r === 0 ? p.b : c === 0 && a === 'exercise' ? p.bg : '#fff'} stroke={p.ink} strokeWidth="0.5" />
            ))
          )}
          {a === 'exercise' &&
            Array.from({ length: rowsN - 1 }, (_, r) => (
              <g key={`f${r}`} transform={`translate(${x + cw / 2} ${y + (r + 1.5) * ch})`} stroke={p.a} strokeWidth="0.8" fill="none" strokeLinecap="round">
                <circle cy={-ch * 0.25} r={ch * 0.12} fill={p.a} />
                <path d={`M0 ${-ch * 0.12}v${ch * 0.22}M${-ch * 0.22} ${-ch * 0.05 + (r % 2) * -ch * 0.1}L0 ${-ch * 0.05}L${ch * 0.22} ${-ch * 0.05 - (r % 2) * ch * 0.1}M0 ${ch * 0.1}l${-ch * 0.15} ${ch * 0.18}M0 ${ch * 0.1}l${ch * 0.15} ${ch * 0.18}`} />
              </g>
            ))}
        </g>
      );
    }
    case 'plate': {
      const cx = x + w / 2;
      const cy = y + h * 0.45;
      const r = Math.min(w, h) * 0.38;
      const cols = ['#ff8fab', '#ffd166', '#3fd6a8', '#8ecae6', '#cdb4db'];
      return (
        <g>
          <circle cx={cx} cy={cy} r={r + 4} fill="#fff" stroke={p.ink} strokeWidth="1" />
          {cols.map((c, i) => {
            const a0 = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const a1 = ((i + 1) / 5) * Math.PI * 2 - Math.PI / 2;
            return <path key={i} d={`M${cx} ${cy}L${cx + Math.cos(a0) * r} ${cy + Math.sin(a0) * r}A${r} ${r} 0 0 1 ${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r}Z`} fill={c} stroke={p.ink} strokeWidth="0.6" />;
          })}
          {[0, 1, 2, 3, 4].map((k) => (
            <path key={`l${k}`} d={`M${x + 2 + k * (w / 5)} ${y + h * 0.95}h${w / 5 - 6}`} {...line} />
          ))}
        </g>
      );
    }
    case 'numline':
      return (
        <g>
          {Array.from({ length: k0 }, (_, i) => {
            const cy = y + (h / k0) * (i + 0.6);
            return (
              <g key={i}>
                {num(i, x + 3, cy - 4)}
                <path d={`M${x + 8} ${cy}h${w - 10}`} stroke={p.ink} strokeWidth="0.8" />
                {Array.from({ length: 11 }, (_, k) => (
                  <path key={k} d={`M${x + 8 + k * ((w - 10) / 10)} ${cy - 1.6}v3.2`} stroke={p.ink} strokeWidth="0.6" />
                ))}
                {i === 0 && <path d={`M${x + 8} ${cy - 2}q${(w - 10) / 10} -6 ${(w - 10) / 5} 0`} fill="none" stroke={p.a} strokeWidth="0.9" />}
              </g>
            );
          })}
        </g>
      );
    case 'cutpaste':
      return (
        <g>
          {Array.from({ length: k0 }, (_, i) => (
            <g key={i}>
              {num(i, x + 3, y + 6 + i * ((h * 0.6) / k0))}
              <rect x={x + w * 0.6} y={y + 1 + i * ((h * 0.6) / k0)} width={w * 0.38} height={h * 0.12} rx="2" fill="#fff" stroke={p.soft} strokeWidth="0.8" strokeDasharray="2 1.5" />
              <path d={`M${x + 9} ${y + 8 + i * ((h * 0.6) / k0)}h${w * 0.45}`} {...line} />
            </g>
          ))}
          <path d={`M${x} ${y + h * 0.66}h${w}`} stroke={p.ink} strokeWidth="0.6" strokeDasharray="2 1.5" />
          {[0, 1, 2, 3].map((k) => (
            <g key={`c${k}`}>
              <rect x={x + k * (w / 4) + 1.5} y={y + h * 0.72} width={w / 4 - 3} height={h * 0.24} rx="2" fill="#fff" stroke={p.ink} strokeWidth="0.6" strokeDasharray="1.6 1.2" />
              <Motif kind={s} x={x + k * (w / 4) + w / 8} y={y + h * 0.84} s={0.9} p={p} />
            </g>
          ))}
        </g>
      );
    default:
      // fill และอื่นๆ: ข้อ + เส้นคำตอบ
      return (
        <g>
          {Array.from({ length: rows }, (_, i) => {
            const cy = y + rh * (i + 0.5);
            return (
              <g key={i}>
                {num(i, x + 3, cy)}
                <path d={`M${x + 9} ${cy}h${w * 0.5}`} {...line} />
                <rect x={x + w * 0.66} y={cy - Math.min(4, rh * 0.32)} width={w * 0.34} height={Math.min(8, rh * 0.64)} rx="1.5" fill="#fff" stroke={p.a} strokeWidth="0.7" strokeDasharray="1.5 1" />
              </g>
            );
          })}
        </g>
      );
  }
}

export function PaperPreview({ r, className = '' }: { r: Recipe; className?: string }) {
  const g = geometry(r);
  const { W, H, m, pal: p, bw, motif, head } = g;
  const title = titleOf(r);
  // id ไม่ซ้ำต่อกระดาษ (หน้าแกลเลอรีวาดหลายแผ่นพร้อมกัน)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const shadow = `url(#ws-shadow-${uid})`;
  const padX = head.x + g.headPad;

  const border =
    r.fr === 'none' ? null : ['scallop', 'wavy', 'double', 'beads'].includes(r.fr) ? (
      <FrameArt kind={r.fr} W={W} H={H} m={m} p={p} />
    ) : r.fr === 'dash' ? (
      <rect x={m / 2} y={m / 2} width={W - m} height={H - m} rx="6" fill="none" stroke={p.a} strokeWidth="1.4" strokeDasharray="4 3" />
    ) : (
      <rect x={m / 2} y={m / 2} width={W - m} height={H - m} rx={r.fr === 'round' ? 10 : 6} fill="none" stroke={p.a} strokeWidth={r.fr === 'theme' ? 3 : 1.6} />
    );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`ตัวอย่างโครงใบงาน ${title}`}>
      <defs>
        <filter id={`ws-shadow-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#2a2350" floodOpacity="0.18" />
        </filter>
        <clipPath id={`ws-panel-${uid}`}>
          <rect x={m} y={m} width={W - m * 2} height={H - m * 2} rx="5" />
        </clipPath>
        <PatternDef kind={g.pattern} id={`ws-pat-${uid}`} p={p} motif={motif} Motif={Motif} />
      </defs>
      <rect width={W} height={H} rx="4" fill={bw ? '#fff' : p.bg} />
      {g.pattern !== 'plain' && <rect width={W} height={H} rx="4" fill={`url(#ws-pat-${uid})`} />}
      <rect x={m} y={m} width={W - m * 2} height={H - m * 2} rx="5" fill="#fff" />
      {g.scene.id !== 'none' && (
        <g key={`sc-${g.scene.id}-${r.th}-${r.st}-${r.o}`} className="ws-pop">
          <SceneArt id={g.scene.id} top={g.scene.top} bottom={g.scene.bottom} W={W} H={H} m={m} p={p} bw={bw} motif={motif} Motif={Motif} clip={`url(#ws-panel-${uid})`} />
        </g>
      )}
      <g key={`${r.th}-${r.fr}-${r.st}`} className="ws-pop">
        {border}
        {motif && g.border.map((pt) => <Motif key={`${pt.x}-${pt.y}`} kind={motif} x={pt.x} y={pt.y} s={0.9} p={p} />)}
      </g>
      <g key={`dz-${(r.dz || []).join('-')}-${r.th}-${r.st}`} className="ws-pop">
        {g.decos.map(({ d, color, pts }) => pts.map((pt, i) => <Motif key={`${d.id}${i}`} kind={d.motif} x={pt.x} y={pt.y} s={1} p={{ ...p, a: color, b: color }} />))}
      </g>

      {/* หัวกระดาษ */}
      <g key={`h-${r.th}-${r.hd}-${r.txt}-${title}`} className="ws-pop">
        <HeadShape shape={g.headShape} box={head} p={p} shadow={shadow} />
        {motif && <Motif kind={motif} x={padX + 10} y={head.y + head.h / 2} s={1.6} p={{ ...p, a: '#fff', b: '#fff' }} />}
        {r.txt === 'ai' ? (
          <text x={padX + 22} y={head.y + head.h / 2 + 3.4} fontSize={r.big ? 11 : 9.5} fill="#fff" fontWeight="800">
            {title.length > 26 ? title.slice(0, 25) + '...' : title}
          </text>
        ) : null}
      </g>
      {g.score && (
        <g key="score" className="ws-pop">
          <circle cx={g.score.cx} cy={g.score.cy} r={g.score.r} fill="#fff" stroke={bw ? p.ink : p.b} strokeWidth="2.4" />
          <path d={`M${g.score.cx - 6} ${g.score.cy + 3}h12`} stroke={p.soft} strokeWidth="0.8" />
        </g>
      )}

      {g.nameY !== null && (
        <g key="name" className="ws-pop">
          {[0, 1, 2].map((k) => {
            const cw = (W - m * 2 - 16) / 3;
            const x0 = m + 8 + k * cw;
            return (
              <g key={k}>
                <text x={x0} y={g.nameY!} fontSize="4.6" fill={p.ink} fontWeight="700">
                  {['ชื่อ', 'ชั้น', 'เลขที่'][k]}
                </text>
                <path d={`M${x0 + (k === 2 ? 11 : 8)} ${g.nameY! + 0.6}h${cw - (k === 2 ? 15 : 12)}`} stroke={p.soft} strokeWidth="0.7" strokeDasharray="1 1" />
              </g>
            );
          })}
        </g>
      )}

      {g.mascot && (
        <g key={`m-${r.th}`} className="ws-pop">
          <g transform={`translate(${g.mascot.cx} ${g.mascot.cy})`}>
            <ellipse rx={g.mascot.rx} ry={g.mascot.ry} fill={p.b} stroke={p.ink} strokeWidth="0.9" />
            <circle cx="-2.6" cy="-1" r="1" fill={p.ink} />
            <circle cx="2.6" cy="-1" r="1" fill={p.ink} />
            <path d="M-1.6 2q1.6 1.4 3.2 0" stroke={p.ink} strokeWidth="0.7" fill="none" strokeLinecap="round" />
            <path d="M7 1l5 -2" stroke={p.ink} strokeWidth="1" strokeLinecap="round" />
          </g>
          <rect x={g.mascot.bubble.x} y={g.mascot.bubble.y} width={g.mascot.bubble.w} height={g.mascot.bubble.h} rx="6" fill={p.bg} stroke={p.ink} strokeWidth="0.6" />
          {r.txt === 'ai' && <rect x={g.mascot.bubble.x + 6} y={g.mascot.bubble.y + 4.6} width={(W - m * 2) * 0.4} height="2.8" rx="1.4" fill={p.soft} />}
        </g>
      )}

      {g.char && (
        <g key={`c-${g.char.id}-${r.th}-${r.st}`} className="ws-pop">
          <CharFigure id={g.char.id} box={g.char.box} bw={bw} />
          <SpeechBubble b={g.char.bubble} p={p} filled={r.txt === 'ai'} />
        </g>
      )}

      <g key={`b-${r.a}-${r.n}-${r.th}-${r.st}-${r.o}-${r.sc}-${r.ch}`} className="ws-pop">
        <Body a={r.a} n={r.n} x={g.body.x} y={g.body.y} w={g.body.w} h={g.body.h} p={p} s={motif || 'star'} R={g.rich ? 3.4 : 2} />
      </g>

      {g.sticker && (
        <g key="sticker" className="ws-pop" transform={`translate(${g.sticker.cx} ${g.sticker.cy})`}>
          <circle r={g.sticker.r} fill={p.b} stroke={p.ink} strokeWidth="0.8" />
          <path d="M0-5 1.5-1.6 5.2-1.5 2.3.9 3.3 4.6 0 2.5-3.3 4.6-2.3.9-5.2-1.5-1.5-1.6Z" fill="#fff" stroke={p.ink} strokeWidth="0.5" />
        </g>
      )}
      {g.keyTag && (
        <g key="key" className="ws-pop">
          <rect x={g.keyTag.x} y={g.keyTag.y} width={g.keyTag.w} height={g.keyTag.h} rx="5.5" fill={p.ink} />
          <text x={g.keyTag.x + g.keyTag.w / 2} y={g.keyTag.y + 7.2} fontSize="5" fill="#fff" textAnchor="middle" fontWeight="700">
            + เฉลย
          </text>
        </g>
      )}
    </svg>
  );
}
