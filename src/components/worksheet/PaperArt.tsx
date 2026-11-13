'use client';

/**
 * ภาพตกแต่งของกระดาษตัวอย่าง (ชุด 13 พ.ย. 2026): ทรงหัวกระดาษ กรอบ ลายขอบ ฉาก ตัวการ์ตูนเต็มตัว
 * หน่วยเป็นมิลลิเมตรของหน้า A4 เหมือน PaperPreview · ทุกแบบมีคำบรรยายอังกฤษคู่กันใน lib/worksheet/options.ts (แก้ที่หนึ่งต้องแก้อีกที่)
 */
import React from 'react';
import type { Box, Pal } from '@/lib/worksheet/layout';
import { ANIMAL_PRESETS, CHAR_PRESETS } from '@/lib/studio/char';
import { CharArt } from '@/components/studio/CharArt';

type MotifFn = (props: { kind: string; x: number; y: number; s: number; p: Pal }) => React.ReactNode;

const r2 = (v: number) => Math.round(v * 100) / 100;

/** สีสดของฉาก (ขาวดำ = เทาอ่อน) */
const brights = (p: Pal, bw: boolean) => (bw ? ['#ffffff', '#d9d9d9', '#f0f0f0', '#bdbdbd', '#ffffff'] : [p.a, p.b, '#ffd166', '#ff8fab', '#3fd6a8']);

/* ---------------------------------------------------------------- ทรงหัวกระดาษ */

export function HeadShape({ shape, box, p, shadow }: { shape: string; box: Box; p: Pal; shadow: string }) {
  const { x, y, w, h } = box;
  const fill = p.a;
  const shade = '#000';
  const cy = y + h / 2;
  switch (shape) {
    case 'cloud': {
      const n = Math.max(4, Math.round(w / 15));
      const step = w / n;
      const rt = Math.min(step * 0.62, h * 0.36);
      const rb = Math.min(step * 0.58, h * 0.34);
      return (
        <g fill={fill} filter={shadow}>
          <rect x={x + 3} y={y + h * 0.2} width={w - 6} height={h * 0.6} rx={h * 0.3} />
          {Array.from({ length: n }, (_, i) => (
            <circle key={`t${i}`} cx={r2(x + step * (i + 0.5))} cy={y + rt + 0.4 + (i % 2 ? 1.2 : 0)} r={rt} />
          ))}
          {Array.from({ length: n - 1 }, (_, i) => (
            <circle key={`b${i}`} cx={r2(x + step * (i + 1))} cy={y + h - rb - 0.4 - (i % 2 ? 0 : 1)} r={rb} />
          ))}
        </g>
      );
    }
    case 'ribbon': {
      const tail = (sx: number, d: 1 | -1) => (
        <g>
          <path d={`M${sx} ${y + 5}h${14 * d}v${h - 5}h${-14 * d}l${5 * d} ${-(h - 5) / 2}Z`} fill={fill} />
          <path d={`M${sx} ${y + 5}h${14 * d}v${h - 5}h${-14 * d}l${5 * d} ${-(h - 5) / 2}Z`} fill={shade} opacity="0.2" />
          <path d={`M${sx + 8 * d} ${y + h - 5}h${6 * d}v5Z`} fill={shade} opacity="0.28" />
        </g>
      );
      return (
        <g filter={shadow}>
          {tail(x, 1)}
          {tail(x + w, -1)}
          <rect x={x + 8} y={y} width={w - 16} height={h - 5} rx="3.5" fill={fill} />
          <path d={`M${x + 12} ${y + 2.6}h${w - 24}M${x + 12} ${y + h - 7.6}h${w - 24}`} stroke="#fff" strokeWidth="0.6" strokeDasharray="1.6 1.6" opacity="0.7" />
        </g>
      );
    }
    case 'scroll':
      return (
        <g filter={shadow}>
          <rect x={x + 6} y={y + 2} width={w - 12} height={h - 4} rx="2.5" fill={fill} />
          {[x, x + w - 10].map((rx, i) => (
            <g key={i}>
              <rect x={rx} y={y} width="10" height={h} rx="5" fill={fill} />
              <rect x={rx} y={y} width="10" height={h} rx="5" fill={shade} opacity="0.16" />
              <circle cx={rx + 5} cy={i ? y + h - 5 : y + 5} r="2.3" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.8" />
              <circle cx={rx + 5} cy={i ? y + h - 5 : y + 5} r="0.7" fill="#fff" opacity="0.8" />
            </g>
          ))}
        </g>
      );
    case 'blob': {
      const cx = x + w / 2;
      const N = 16;
      const pts = Array.from({ length: N }, (_, i) => {
        const t = (i / N) * Math.PI * 2;
        const c = Math.cos(t);
        const s = Math.sin(t);
        const px = cx + (w / 2) * Math.sign(c) * Math.pow(Math.abs(c), 0.42) * (0.965 + 0.035 * Math.sin(3 * t + 1));
        const py = cy + (h / 2) * Math.sign(s) * Math.pow(Math.abs(s), 0.62) * (0.93 + 0.07 * Math.cos(4 * t + 0.6));
        return [r2(px), r2(py)];
      });
      const mid = (a: number[], b: number[]) => [r2((a[0] + b[0]) / 2), r2((a[1] + b[1]) / 2)];
      const first = mid(pts[N - 1], pts[0]);
      const d = `M${first[0]} ${first[1]}` + pts.map((pt, i) => `Q${pt[0]} ${pt[1]} ${mid(pt, pts[(i + 1) % N]).join(' ')}`).join('') + 'Z';
      return (
        <g filter={shadow}>
          <path d={d} fill={fill} />
          <ellipse cx={x + w * 0.2} cy={y + h * 0.26} rx={w * 0.07} ry="1.6" fill="#fff" opacity="0.35" />
        </g>
      );
    }
    case 'wave': {
      const n = Math.max(3, Math.round(w / 15));
      const s = w / n;
      let d = `M${x} ${y + 7}Q${x} ${y} ${x + 7} ${y}H${x + w - 7}Q${x + w} ${y} ${x + w} ${y + 7}V${y + h - 4}`;
      for (let i = 0; i < n; i++) d += `q${r2(-s / 4)} 4 ${r2(-s / 2)} 0q${r2(-s / 4)} -4 ${r2(-s / 2)} 0`;
      return <path d={d + 'Z'} fill={fill} filter={shadow} />;
    }
    case 'sign':
      return (
        <g>
          {[0.2, 0.8].map((k) => (
            <g key={k}>
              <path d={`M${x + w * k} ${y - 5.5}V${y + 3}`} stroke={p.ink} strokeWidth="1" strokeLinecap="round" />
              <circle cx={x + w * k} cy={y - 5.5} r="1.4" fill={p.b} stroke={p.ink} strokeWidth="0.6" />
            </g>
          ))}
          <rect x={x} y={y + 1} width={w} height={h - 1} rx="7" fill={fill} filter={shadow} />
          <rect x={x + 2} y={y + 3} width={w - 4} height={h - 5} rx="5.2" fill="none" stroke="#fff" strokeWidth="0.7" opacity="0.6" />
          {[0.2, 0.8].map((k) => (
            <circle key={k} cx={x + w * k} cy={y + 3.4} r="1.3" fill="#fff" stroke={p.ink} strokeWidth="0.5" />
          ))}
        </g>
      );
    case 'ticket': {
      const k = 4.5;
      const d = `M${x + 5} ${y}H${x + w - 5}Q${x + w} ${y} ${x + w} ${y + 5}V${cy - k}A${k} ${k} 0 0 0 ${x + w} ${cy + k}V${y + h - 5}Q${x + w} ${y + h} ${x + w - 5} ${y + h}H${x + 5}Q${x} ${y + h} ${x} ${y + h - 5}V${cy + k}A${k} ${k} 0 0 0 ${x} ${cy - k}V${y + 5}Q${x} ${y} ${x + 5} ${y}Z`;
      return (
        <g>
          <path d={d} fill={fill} filter={shadow} />
          <rect x={x + 6.5} y={y + 2.4} width={w - 13} height={h - 4.8} rx="3" fill="none" stroke="#fff" strokeWidth="0.6" strokeDasharray="2 1.6" opacity="0.7" />
        </g>
      );
    }
    default:
      return <rect x={x} y={y} width={w} height={h} rx="7" fill={fill} filter={shadow} />;
  }
}

/* ---------------------------------------------------------------- กรอบ (ชุดใหม่) รอบสี่เหลี่ยมที่ห่างขอบกระดาษ m/2 */

export function FrameArt({ kind, W, H, m, p }: { kind: string; W: number; H: number; m: number; p: Pal }) {
  const x0 = m / 2;
  const y0 = m / 2;
  const w = W - m;
  const h = H - m;
  const nx = Math.round(w / 5);
  const ny = Math.round(h / 5);
  const sx = r2(w / nx);
  const sy = r2(h / ny);
  switch (kind) {
    case 'scallop': {
      const d =
        `M${x0} ${y0}` +
        `a${sx / 2} ${sx / 2} 0 0 1 ${sx} 0`.repeat(nx) +
        `a${sy / 2} ${sy / 2} 0 0 1 0 ${sy}`.repeat(ny) +
        `a${sx / 2} ${sx / 2} 0 0 1 ${-sx} 0`.repeat(nx) +
        `a${sy / 2} ${sy / 2} 0 0 1 0 ${-sy}`.repeat(ny);
      return <path d={d} fill="none" stroke={p.a} strokeWidth="1.2" strokeLinejoin="round" />;
    }
    case 'wavy': {
      const mx = Math.round(w / 8);
      const my = Math.round(h / 8);
      const ax = r2(w / mx);
      const ay = r2(h / my);
      const d =
        `M${x0} ${y0}` +
        `q${ax / 4} -2 ${ax / 2} 0q${ax / 4} 2 ${ax / 2} 0`.repeat(mx) +
        `q2 ${ay / 4} 0 ${ay / 2}q-2 ${ay / 4} 0 ${ay / 2}`.repeat(my) +
        `q${-ax / 4} 2 ${-ax / 2} 0q${-ax / 4} -2 ${-ax / 2} 0`.repeat(mx) +
        `q-2 ${-ay / 4} 0 ${-ay / 2}q2 ${-ay / 4} 0 ${-ay / 2}`.repeat(my);
      return <path d={d} fill="none" stroke={p.a} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />;
    }
    case 'double':
      return (
        <g fill="none" stroke={p.a}>
          <rect x={x0} y={y0} width={w} height={h} rx="8" strokeWidth="1.6" />
          <rect x={x0 + 2.2} y={y0 + 2.2} width={w - 4.4} height={h - 4.4} rx="6" strokeWidth="0.6" />
        </g>
      );
    case 'beads': {
      const out: React.ReactNode[] = [];
      let k = 0;
      const dot = (cx: number, cy: number) => out.push(<circle key={k} cx={r2(cx)} cy={r2(cy)} r="1.5" fill={k++ % 2 ? p.b : p.a} stroke={p.ink} strokeWidth="0.3" />);
      for (let i = 0; i < nx; i++) dot(x0 + sx * i, y0);
      for (let i = 0; i < ny; i++) dot(x0 + w, y0 + sy * i);
      for (let i = 0; i < nx; i++) dot(x0 + w - sx * i, y0 + h);
      for (let i = 0; i < ny; i++) dot(x0, y0 + h - sy * i);
      return <g>{out}</g>;
    }
    default:
      return null;
  }
}

/* ---------------------------------------------------------------- ลายแถบขอบ (ใส่ใน <defs>) */

export function PatternDef({ kind, id, p, motif, Motif }: { kind: string; id: string; p: Pal; motif: string; Motif: MotifFn }) {
  switch (kind) {
    case 'dots':
      return (
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1" fill={p.a} opacity="0.3" />
        </pattern>
      );
    case 'stripes':
      return (
        <pattern id={id} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="3" height="7" fill={p.a} opacity="0.17" />
        </pattern>
      );
    case 'check':
      return (
        <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="4" height="8" fill={p.a} opacity="0.13" />
          <rect width="8" height="4" fill={p.a} opacity="0.13" />
        </pattern>
      );
    case 'icons':
      return (
        <pattern id={id} width="11" height="11" patternUnits="userSpaceOnUse">
          <g opacity="0.45">
            <Motif kind={motif || 'star'} x={5.5} y={5.5} s={0.5} p={p} />
          </g>
        </pattern>
      );
    default:
      return null;
  }
}

/* ---------------------------------------------------------------- ฉากตกแต่ง */

const SPARK = 'M0-2.4Q0 0 2.4 0Q0 0 0 2.4Q0 0-2.4 0Q0 0 0-2.4Z';

/** จุดบนเส้นโค้งกำลังสอง */
const quad = (a: number[], c: number[], b: number[], t: number) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];

function SceneTop({ id, b, p, bw, motif, Motif }: { id: string; b: Box; p: Pal; bw: boolean; motif: string; Motif: MotifFn }) {
  const C = brights(p, bw);
  const white = { ...p, bg: '#fdfdff', a: '#ffd166', b: '#ffd166' };
  switch (id) {
    case 'clouds':
      return (
        <g>
          {[
            [0.09, 0.55, 1.9],
            [0.33, 0.4, 1.35],
            [0.56, 0.62, 1.7],
            [0.76, 0.42, 1.25],
          ].map(([fx, fy, s]) => (
            <Motif key={fx} kind="cloud" x={b.x + b.w * fx} y={b.y + b.h * fy} s={s} p={white} />
          ))}
          <g transform={`translate(${b.x + b.w * 0.93} ${b.y + b.h * 0.5})`}>
            <Motif kind="sun" x={0} y={0} s={1.25} p={bw ? { ...p, a: '#fff', b: '#fff' } : white} />
            <circle cx="-1.2" cy="-0.5" r="0.45" fill={p.ink} />
            <circle cx="1.2" cy="-0.5" r="0.45" fill={p.ink} />
            <path d="M-1.1 0.9q1.1 1 2.2 0" stroke={p.ink} strokeWidth="0.45" fill="none" strokeLinecap="round" />
          </g>
        </g>
      );
    case 'bunting': {
      const a = [b.x, b.y + 1.5];
      const mid = [b.x + b.w / 2, b.y + 2.5];
      const z = [b.x + b.w, b.y + 1.5];
      const c1 = [b.x + b.w * 0.25, b.y + b.h * 0.8];
      const c2 = [b.x + b.w * 0.75, b.y + b.h * 0.8];
      const flags: number[][] = [];
      for (let i = 0; i < 7; i++) flags.push(quad(a, c1, mid, (i + 0.5) / 7));
      for (let i = 0; i < 7; i++) flags.push(quad(mid, c2, z, (i + 0.5) / 7));
      return (
        <g>
          <path d={`M${a.join(' ')}Q${c1.join(' ')} ${mid.join(' ')}Q${c2.join(' ')} ${z.join(' ')}`} fill="none" stroke={p.ink} strokeWidth="0.7" strokeLinecap="round" />
          {flags.map(([fx, fy], i) => (
            <path key={i} d={`M${r2(fx - 3.3)} ${r2(fy - 0.2)}h6.6l-3.3 6.6Z`} fill={C[i % C.length]} stroke={p.ink} strokeWidth="0.5" strokeLinejoin="round" />
          ))}
        </g>
      );
    }
    case 'rainbow': {
      const by = b.y + b.h - 1.5;
      const bow = bw ? ['#bdbdbd', '#d9d9d9', '#ededed', '#f6f6f6'] : ['#ff6b7a', '#ffd166', '#3fd6a8', '#7cc6ff'];
      return (
        <g>
          {[0.13, 0.87].map((fx) => {
            const cx = b.x + b.w * fx;
            return (
              <g key={fx}>
                {bow.map((c, i) => (
                  <path key={c} d={`M${cx - (9.6 - i * 2)} ${by}a${9.6 - i * 2} ${9.6 - i * 2} 0 0 1 ${(9.6 - i * 2) * 2} 0`} fill="none" stroke={c} strokeWidth="2" />
                ))}
                <Motif kind="cloud" x={cx - 9} y={by - 0.6} s={0.85} p={white} />
                <Motif kind="cloud" x={cx + 9.6} y={by - 0.6} s={0.85} p={white} />
              </g>
            );
          })}
          {[0.3, 0.4, 0.5, 0.6, 0.7].map((fx, i) => (
            <path key={fx} d={SPARK} transform={`translate(${b.x + b.w * fx} ${b.y + b.h * (i % 2 ? 0.34 : 0.66)}) scale(${i % 2 ? 0.8 : 1.15})`} fill={C[(i + 2) % C.length]} stroke={p.ink} strokeWidth="0.35" />
          ))}
        </g>
      );
    }
    case 'garland': {
      const n = 3;
      const s = b.w / n;
      const pts: number[][] = [];
      let d = `M${b.x} ${b.y + 1}`;
      for (let i = 0; i < n; i++) {
        const a = [b.x + s * i, b.y + 1];
        const z = [b.x + s * (i + 1), b.y + 1];
        const c = [b.x + s * (i + 0.5), b.y + b.h * 0.95];
        d += `Q${c.join(' ')} ${z.join(' ')}`;
        for (let k = 0; k < 3; k++) pts.push(quad(a, c, z, (k + 0.5) / 3));
      }
      return (
        <g>
          <path d={d} fill="none" stroke={p.ink} strokeWidth="0.6" strokeLinecap="round" />
          {pts.map(([px, py], i) => (
            <Motif key={i} kind={motif || 'star'} x={r2(px)} y={r2(py + 2.6)} s={0.78} p={i % 2 ? { ...p, a: p.b, b: p.a } : p} />
          ))}
        </g>
      );
    }
    default:
      return null;
  }
}

function SceneBottom({ id, b, p, bw, motif, Motif }: { id: string; b: Box; p: Pal; bw: boolean; motif: string; Motif: MotifFn }) {
  const C = brights(p, bw);
  const end = b.y + b.h;
  switch (id) {
    case 'hills': {
      const back = `M${b.x} ${end}V${b.y + 9}Q${b.x + b.w * 0.2} ${b.y - 3} ${b.x + b.w * 0.45} ${b.y + 8}T${b.x + b.w} ${b.y + 6}V${end}Z`;
      const front = `M${b.x} ${end}V${b.y + 12}Q${b.x + b.w * 0.3} ${b.y + 2} ${b.x + b.w * 0.62} ${b.y + 12}T${b.x + b.w} ${b.y + 11}V${end}Z`;
      return (
        <g>
          <path d={back} fill={bw ? '#ededed' : p.b} opacity={bw ? 1 : 0.6} stroke={p.ink} strokeWidth="0.5" />
          {[
            [0.14, 3.5, 1.15],
            [0.5, 4.6, 0.9],
            [0.86, 2.4, 1.2],
          ].map(([fx, dy, s]) => (
            <Motif key={fx} kind={motif || 'tree'} x={b.x + b.w * fx} y={b.y + dy} s={s} p={p} />
          ))}
          <path d={front} fill={bw ? '#d9d9d9' : p.a} opacity={bw ? 1 : 0.78} stroke={p.ink} strokeWidth="0.5" />
          {[0.07, 0.3, 0.44, 0.7, 0.93].map((fx, i) => (
            <path key={fx} d={SPARK} transform={`translate(${b.x + b.w * fx} ${b.y + 13.5 + (i % 2) * 1.6}) scale(0.7)`} fill="#fff" opacity="0.85" />
          ))}
        </g>
      );
    }
    case 'waves': {
      const layer = (y0: number, amp: number, phase: number) => {
        const n = Math.round(b.w / 14);
        const s = b.w / n;
        let d = `M${b.x - phase} ${y0}`;
        for (let i = 0; i <= n; i++) d += `q${r2(s / 4)} ${-amp} ${r2(s / 2)} 0q${r2(s / 4)} ${amp} ${r2(s / 2)} 0`;
        return d + `V${end}H${b.x}Z`;
      };
      return (
        <g>
          <path d={layer(b.y + 5, 3, 0)} fill={bw ? '#f0f0f0' : p.b} opacity={bw ? 1 : 0.55} stroke={p.ink} strokeWidth="0.4" />
          {[
            [0.2, 3.4, 1],
            [0.66, 3, 0.85],
          ].map(([fx, dy, s]) => (
            <Motif key={fx} kind={motif || 'fish'} x={b.x + b.w * fx} y={b.y + dy} s={s} p={p} />
          ))}
          <path d={layer(b.y + 9, 2.6, 5)} fill={bw ? '#e2e2e2' : p.a} opacity={bw ? 1 : 0.5} stroke={p.ink} strokeWidth="0.4" />
          <path d={layer(b.y + 12.6, 2.2, 2)} fill={bw ? '#cfcfcf' : p.a} opacity={bw ? 1 : 0.85} stroke={p.ink} strokeWidth="0.4" />
        </g>
      );
    }
    case 'grass': {
      const n = Math.round(b.w / 3);
      const s = r2(b.w / n);
      const blade = `M${b.x} ${end}V${b.y + 8}` + `l${s / 2} -3.4l${s / 2} 3.4`.repeat(n) + `V${end}Z`;
      const green = bw ? '#e2e2e2' : '#8fd97a';
      return (
        <g>
          <path d={blade} fill={green} stroke={bw ? p.ink : '#3f9a4a'} strokeWidth="0.5" strokeLinejoin="round" />
          {[0.06, 0.2, 0.34, 0.5, 0.64, 0.8, 0.94].map((fx, i) => {
            const fxx = b.x + b.w * fx;
            const top = b.y + 3.5 - (i % 3) * 2.2;
            return (
              <g key={fx}>
                <path d={`M${fxx} ${b.y + 9}V${top}`} stroke={bw ? p.ink : '#3f9a4a'} strokeWidth="0.8" strokeLinecap="round" />
                <path d={`M${fxx} ${top + 3.4}q2.4 -0.4 2.6 -2.4q-2.2 0.2 -2.6 2.4`} fill={green} stroke={bw ? p.ink : '#3f9a4a'} strokeWidth="0.4" />
                <Motif kind={i % 3 === 1 && motif ? motif : 'flower'} x={fxx} y={top} s={0.72} p={{ ...p, a: C[(i + 2) % C.length], b: C[i % C.length] }} />
              </g>
            );
          })}
        </g>
      );
    }
    case 'garland': {
      const n = Math.max(6, Math.round(b.w / 13));
      const s = b.w / n;
      return (
        <g>
          {Array.from({ length: n }, (_, i) => (
            <g key={i}>
              <Motif kind={motif || 'star'} x={r2(b.x + s * (i + 0.5))} y={b.y + b.h * 0.5 + (i % 2 ? 0.8 : 0)} s={i % 2 ? 0.78 : 1.18} p={i % 2 ? { ...p, a: p.b, b: p.a } : p} />
              {i < n - 1 && <circle cx={r2(b.x + s * (i + 1))} cy={b.y + b.h * 0.5 + 1} r="0.7" fill={p.soft} />}
            </g>
          ))}
        </g>
      );
    }
    default:
      return null;
  }
}

/** คอนเฟตตีรอบขอบกระดาษ (ตำแหน่งคงที่ต่อขนาดกระดาษ) */
function Confetti({ W, H, m, p, bw }: { W: number; H: number; m: number; p: Pal; bw: boolean }) {
  const C = brights(p, bw);
  let seed = W * 31 + 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out: React.ReactNode[] = [];
  const piece = (x: number, y: number, i: number) => {
    const col = C[i % C.length];
    const tr = `translate(${r2(x)} ${r2(y)}) rotate(${Math.round(rnd() * 360)})`;
    const st = { stroke: p.ink, strokeWidth: 0.3 };
    const kind = i % 4;
    if (kind === 0) return <circle key={i} transform={tr} r={r2(0.8 + rnd() * 0.6)} fill={col} {...st} />;
    if (kind === 1) return <path key={i} transform={`${tr} scale(0.62)`} d={SPARK} fill={col} {...st} />;
    if (kind === 2) return <path key={i} transform={tr} d="M-1.3 1L0-1.4 1.3 1Z" fill={col} {...st} strokeLinejoin="round" />;
    return <path key={i} transform={tr} d="M-2.4 0q1.2-1.8 2.4 0t2.4 0" fill="none" stroke={bw ? p.ink : col} strokeWidth="0.8" strokeLinecap="round" />;
  };
  let i = 0;
  const band = m - 2;
  for (let k = 0; k < 13; k++) out.push(piece(rnd() * W, 1 + rnd() * band, i++), piece(rnd() * W, H - 1 - rnd() * band, i++));
  for (let k = 0; k < 10; k++) out.push(piece(1 + rnd() * band, rnd() * H, i++), piece(W - 1 - rnd() * band, rnd() * H, i++));
  // มุมทั้งสี่แน่นขึ้น
  for (const [cx, cy] of [
    [0, 0],
    [W, 0],
    [0, H],
    [W, H],
  ])
    for (let k = 0; k < 3; k++) out.push(piece(Math.abs(cx - (2 + rnd() * 11)), Math.abs(cy - (2 + rnd() * (m - 3))), i++));
  return <g>{out}</g>;
}

export function SceneArt(props: { id: string; top: Box | null; bottom: Box | null; W: number; H: number; m: number; p: Pal; bw: boolean; motif: string; Motif: MotifFn; clip: string }) {
  const { id, top, bottom, clip } = props;
  if (id === 'confetti') return <Confetti {...props} />;
  return (
    <g clipPath={clip}>
      {top && <SceneTop {...props} b={top} />}
      {bottom && <SceneBottom {...props} b={bottom} />}
    </g>
  );
}

/* ---------------------------------------------------------------- ตัวการ์ตูนเต็มตัว + กรอบคำพูด */

const LOOK_BY_ID = new Map([...ANIMAL_PRESETS, ...CHAR_PRESETS].map((x) => [x.id, x.look]));
export const hasCharArt = (id: string) => LOOK_BY_ID.has(id);

export function CharFigure({ id, box, bw }: { id: string; box: Box; bw?: boolean }) {
  const look = LOOK_BY_ID.get(id);
  if (!look) return null;
  return (
    <g style={bw ? { filter: 'grayscale(1)' } : undefined}>
      <CharArt look={look} box={{ x: box.x, y: box.y, width: box.w, height: box.h }} />
    </g>
  );
}

export function SpeechBubble({ b, p, filled }: { b: Box; p: Pal; filled: boolean }) {
  const cy = b.y + b.h / 2;
  const k = Math.min(8, b.h / 2 - 0.5);
  const d = `M${b.x + k} ${b.y}H${b.x + b.w - k}Q${b.x + b.w} ${b.y} ${b.x + b.w} ${b.y + k}V${b.y + b.h - k}Q${b.x + b.w} ${b.y + b.h} ${b.x + b.w - k} ${b.y + b.h}H${b.x + k}Q${b.x} ${b.y + b.h} ${b.x} ${b.y + b.h - k}V${cy + 3}L${b.x - 5} ${cy + 1.6}L${b.x} ${cy - 2.4}V${b.y + k}Q${b.x} ${b.y} ${b.x + k} ${b.y}Z`;
  return (
    <g>
      <path d={d} fill={p.bg} stroke={p.ink} strokeWidth="0.7" strokeLinejoin="round" />
      {filled && (
        <>
          <rect x={b.x + 7} y={cy - 4.2} width={b.w * 0.5} height="2.6" rx="1.3" fill={p.soft} />
          <rect x={b.x + 7} y={cy + 1.4} width={b.w * 0.34} height="2.6" rx="1.3" fill={p.soft} />
        </>
      )}
    </g>
  );
}
