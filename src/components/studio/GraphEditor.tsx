'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpRight,
  Check,
  Copy,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  Grid3x3,
  Hand,
  Minus,
  MousePointer2,
  Pencil,
  Pentagon,
  Plus,
  Redo2,
  Ruler,
  Sigma,
  Spline,
  Trash2,
  Type,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  SHAPE_KINDS,
  cleanShape,
  defaultShape,
  shapeFacts,
  shapeText,
  type GShape,
  type ShapeKind,
  GRAPH_PRESETS,
  GRAPH_TEMPLATES,
  GTHEMES,
  frameOf,
  graphToSvg,
  intersections,
  mkAngle,
  mkExpr,
  mkPoint,
  mkPoly,
  mkSeg,
  mkText,
  niceStep,
  parseEquation,
  paramValues,
  syncParams,
  themeOf,
  gid,
  texToExpr,
  type DrawShape,
  type GArrow,
  type GDash,
  type GDraw,
  type GObj,
  type GPoint,
  type GraphSpec,
  type GThemeId,
  type LabelPos,
} from '@/lib/studio/graph';
import { MathPopover } from '@/components/creator/math/MathPopover';
import { svgToPngBlob } from './flowDom';
import './graph.css';

type Tool = 'move' | 'point' | 'seg' | 'vec' | 'dash' | 'poly' | 'angle' | 'text' | 'draw';
/** แบบรูปวาดอิสระ (เครื่องมือวาด) */
const DRAW_KINDS: { id: string; label: string; shape: DrawShape; dash: GDash; arrow: GDraw['arrow'] }[] = [
  { id: 'line', label: 'เส้นตรง', shape: 'line', dash: 'solid', arrow: 'none' },
  { id: 'dash', label: 'เส้นประ', shape: 'line', dash: 'dash', arrow: 'none' },
  { id: 'dot', label: 'เส้นจุด', shape: 'line', dash: 'dot', arrow: 'none' },
  { id: 'arrow', label: 'ลูกศรชี้', shape: 'line', dash: 'solid', arrow: 'end' },
  { id: 'arrow2', label: 'ลูกศรสองหัว', shape: 'line', dash: 'solid', arrow: 'both' },
  { id: 'rect', label: 'สี่เหลี่ยม', shape: 'rect', dash: 'solid', arrow: 'none' },
  { id: 'ellipse', label: 'วงกลม/วงรี', shape: 'ellipse', dash: 'solid', arrow: 'none' },
  { id: 'pen', label: 'ปากกา', shape: 'pen', dash: 'solid', arrow: 'none' },
];
type Tab = 'eq' | 'draw' | 'view' | 'tpl';

const TOOLS: { id: Tool; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'move', label: 'เลือก/ลาก', icon: <MousePointer2 className="w-4 h-4" />, hint: 'ลากจุดเพื่อย้าย ลากพื้นที่ว่างเพื่อเลื่อนกราฟ หมุนล้อเมาส์เพื่อซูม' },
  { id: 'point', label: 'จุด', icon: <Crosshair className="w-4 h-4" />, hint: 'แตะบนกราฟเพื่อวางจุด' },
  { id: 'seg', label: 'เส้นตรง', icon: <Minus className="w-4 h-4" />, hint: 'แตะจุดเริ่ม แล้วแตะจุดปลาย' },
  { id: 'vec', label: 'ลูกศร', icon: <ArrowUpRight className="w-4 h-4" />, hint: 'แตะจุดเริ่ม แล้วแตะจุดปลาย (เวกเตอร์)' },
  { id: 'dash', label: 'เส้นประ', icon: <Ruler className="w-4 h-4" />, hint: 'แตะจุดเริ่ม แล้วแตะจุดปลาย' },
  { id: 'poly', label: 'รูปหลายเหลี่ยม', icon: <Pentagon className="w-4 h-4" />, hint: 'แตะทีละมุม แตะมุมแรกอีกครั้งเพื่อปิดรูป' },
  { id: 'angle', label: 'มุม', icon: <Spline className="w-4 h-4" />, hint: 'แตะจุดบนแขนมุม > จุดยอดมุม > จุดบนแขนอีกข้าง' },
  { id: 'text', label: 'ข้อความ', icon: <Type className="w-4 h-4" />, hint: 'แตะตำแหน่งที่จะวางข้อความ' },
  { id: 'draw', label: 'วาดอิสระ', icon: <Pencil className="w-4 h-4" />, hint: 'ลากบนภาพเพื่อวาดเส้น ลูกศร รูปทรง ไม่ยึดกับสมการหรือกริด' },
];
const DASHES: { id: GDash; label: string }[] = [
  { id: 'solid', label: 'ทึบ' },
  { id: 'dash', label: 'ประ' },
  { id: 'dot', label: 'จุด' },
  { id: 'dashdot', label: 'ประจุด' },
];
const ARROWS: { id: GArrow; label: string }[] = [
  { id: 'none', label: 'ไม่มี' },
  { id: 'end', label: 'ปลาย' },
  { id: 'start', label: 'ต้น' },
  { id: 'both', label: 'สองข้าง' },
];
const POS: LabelPos[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
const SIZES: { label: string; w: number; h: number }[] = [
  { label: '4:3', w: 520, h: 390 },
  { label: 'จัตุรัส', w: 460, h: 460 },
  { label: 'กว้าง 16:9', w: 640, h: 360 },
  { label: 'สูง 3:4', w: 420, h: 560 },
];
const NAMES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KIND_LABEL: Record<GObj['kind'], string> = { expr: 'สมการ', point: 'จุด', seg: 'เส้น', poly: 'รูปหลายเหลี่ยม', angle: 'มุม', text: 'ข้อความ', draw: 'รูปวาด' };

const round = (v: number, st: number) => Math.round(v / st) * st;
const fix = (v: number) => Math.round(v * 1e6) / 1e6;

export function GraphEditor({ initial, onDone, onClose, editing }: { initial: GraphSpec; editing: boolean; onDone: (s: GraphSpec) => void; onClose: () => void }) {
  const [spec, setSpecRaw] = useState<GraphSpec>(initial);
  const [tab, setTab] = useState<Tab>(initial.objs.length ? 'eq' : 'tpl');
  const [tool, setTool] = useState<Tool>('move');
  const [sel, setSel] = useState<string | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const [snap, setSnap] = useState(true);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const past = useRef<GraphSpec[]>([]);
  const future = useRef<GraphSpec[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<
    | null
    | { kind: 'pt'; id: string }
    | { kind: 'move'; x: number; y: number; px: number; py: number; from: Map<string, [number, number]>; draws: Map<string, [number, number][]> }
    | { kind: 'draw'; id: string }
    | { kind: 'pan'; sx: number; sy: number; view: GraphSpec['view'] }
  >(null);
  const [drawKind, setDrawKind] = useState('line');
  /** สมการที่กำลังพิมพ์ผ่านหน้าต่าง MathType */
  const [mathFor, setMathFor] = useState<string | null>(null);
  const specRef = useRef(spec);
  specRef.current = spec;

  /** เปลี่ยนข้อมูล (push = เก็บประวัติย้อนกลับ) */
  const setSpec = useCallback((next: GraphSpec | ((s: GraphSpec) => GraphSpec), push = true) => {
    const cur = specRef.current;
    const n = typeof next === 'function' ? next(cur) : next;
    if (push) {
      past.current.push(cur);
      if (past.current.length > 80) past.current.shift();
      future.current = [];
    }
    setSpecRaw(n);
  }, []);
  const undo = () => {
    const p = past.current.pop();
    if (!p) return;
    future.current.push(specRef.current);
    setSpecRaw(p);
  };
  const redo = () => {
    const n = future.current.pop();
    if (!n) return;
    past.current.push(specRef.current);
    setSpecRaw(n);
  };

  const th = themeOf(spec.theme);
  const f = useMemo(() => frameOf(spec), [spec]);
  const svg = useMemo(() => graphToSvg(spec), [spec]);
  const grid = snap ? niceStep(f.xMax - f.xMin, spec.w) / 2 : 0;
  const points = spec.objs.filter((o): o is GPoint => o.kind === 'point');
  const nextColor = (i: number) => th.colors[i % th.colors.length];

  const patch = (id: string, p: Partial<GObj>, push = true) => setSpec((s) => ({ ...s, objs: s.objs.map((o) => (o.id === id ? ({ ...o, ...p } as GObj) : o)) }), push);
  const remove = (id: string) =>
    setSpec((s) => ({
      ...s,
      objs: s.objs
        .filter((o) => o.id !== id)
        .filter((o) => !(o.kind === 'seg' && (o.a === id || o.b === id)) && !(o.kind === 'angle' && [o.a, o.o, o.b].includes(id)))
        .map((o) => (o.kind === 'poly' ? { ...o, pts: o.pts.filter((q) => q !== id) } : o)),
    }));
  const add = (o: GObj | GObj[], select = true) => {
    const list = Array.isArray(o) ? o : [o];
    setSpec((s) => syncParams({ ...s, objs: [...s.objs, ...list] }));
    if (select) setSel(list[list.length - 1].id);
  };
  const nextName = () => NAMES.split('').find((c) => !points.some((p) => p.label === c)) ?? '';

  /* ---------------- พิกัดจากเมาส์ ---------------- */
  const toMath = (e: { clientX: number; clientY: number }) => {
    const r = stage.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * spec.w;
    const py = ((e.clientY - r.top) / r.height) * spec.h;
    return { px, py, x: f.ix(px), y: f.iy(py) };
  };
  const nearPoint = (px: number, py: number) => points.find((p) => Math.hypot(f.X(p.x) - px, f.Y(p.y) - py) < 12);
  /** ชิ้นที่แตะด้วยเครื่องมือเลือก/ลาก: ข้อความ เส้น รูปหลายเหลี่ยม (ลากแล้วขยับเฉพาะชิ้นนั้น) */
  const nearObj = (px: number, py: number): GObj | undefined => {
    const at = (id: string) => points.find((p) => p.id === id);
    const objs = spec.objs.filter((o) => !o.hidden).reverse();
    const text = objs.find((o) => o.kind === 'text' && Math.abs(f.X(o.x) - px) < Math.max(14, o.text.length * o.size * 0.32) && Math.abs(f.Y(o.y) - o.size * 0.35 - py) < o.size * 0.75);
    if (text) return text;
    const segD = (a?: GPoint, b?: GPoint) => {
      if (!a || !b) return Infinity;
      const ax = f.X(a.x), ay = f.Y(a.y), bx = f.X(b.x), by = f.Y(b.y);
      const L = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
      const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / L));
      return Math.hypot(ax + t * (bx - ax) - px, ay + t * (by - ay) - py);
    };
    const seg = objs.find((o) => o.kind === 'seg' && segD(at(o.a), at(o.b)) < 7);
    if (seg) return seg;
    const lineD = (q: [number, number][]) => {
      let m = Infinity;
      for (let i = 1; i < q.length; i++) {
        const [ax, ay] = q[i - 1];
        const [bx, by] = q[i];
        const L = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
        const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / L));
        m = Math.min(m, Math.hypot(ax + t * (bx - ax) - px, ay + t * (by - ay) - py));
      }
      return m;
    };
    const drawn = objs.find((o) => {
      if (o.kind !== 'draw') return false;
      if (o.shape === 'line' || o.shape === 'pen') return lineD(o.pts) < 7;
      const [a, b] = [o.pts[0], o.pts[o.pts.length - 1]];
      return px > Math.min(a[0], b[0]) - 6 && px < Math.max(a[0], b[0]) + 6 && py > Math.min(a[1], b[1]) - 6 && py < Math.max(a[1], b[1]) + 6;
    });
    if (drawn) return drawn;
    return objs.find((o) => {
      if (o.kind !== 'poly') return false;
      const q = o.pts.map(at).filter((p): p is GPoint => !!p).map((p) => [f.X(p.x), f.Y(p.y)]);
      let inside = false;
      for (let i = 0, j = q.length - 1; i < q.length; j = i++) if (q[i][1] > py !== q[j][1] > py && px < ((q[j][0] - q[i][0]) * (py - q[i][1])) / (q[j][1] - q[i][1]) + q[i][0]) inside = !inside;
      return inside;
    });
  };
  const snapXY = (x: number, y: number): [number, number] => (grid ? [fix(round(x, grid)), fix(round(y, grid))] : [fix(Math.round(x * 100) / 100), fix(Math.round(y * 100) / 100)]);
  /** จุดเดิมที่แตะ หรือสร้างจุดใหม่ */
  const pointAt = (px: number, py: number, x: number, y: number): { id: string; created?: GPoint } => {
    const hit = nearPoint(px, py);
    if (hit) return { id: hit.id };
    const [sx, sy] = snapXY(x, y);
    const p = mkPoint(sx, sy, nextName(), th.text, { size: 4 });
    return { id: p.id, created: p };
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.button > 0) return;
    const { px, py, x, y } = toMath(e);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (tool === 'move') {
      const hit = nearPoint(px, py);
      if (hit) {
        setSel(hit.id);
        past.current.push(specRef.current);
        future.current = [];
        drag.current = { kind: 'pt', id: hit.id };
        return;
      }
      const o = nearObj(px, py);
      if (o) {
        setSel(o.id);
        past.current.push(specRef.current);
        future.current = [];
        const ids = o.kind === 'text' ? [o.id] : o.kind === 'seg' ? [o.a, o.b] : o.kind === 'poly' ? o.pts : [];
        const from = new Map<string, [number, number]>();
        for (const q of spec.objs) if (ids.includes(q.id) && (q.kind === 'point' || q.kind === 'text')) from.set(q.id, [q.x, q.y]);
        const draws = new Map<string, [number, number][]>();
        if (o.kind === 'draw') draws.set(o.id, o.pts);
        drag.current = { kind: 'move', x, y, px, py, from, draws };
        return;
      }
      // ที่ว่าง = เลื่อนมุมมอง
      drag.current = { kind: 'pan', sx: px, sy: py, view: { ...f } };
      return;
    }
    if (tool === 'draw') {
      const k = DRAW_KINDS.find((d) => d.id === drawKind) ?? DRAW_KINDS[0];
      const o: GDraw = { id: gid(), kind: 'draw', shape: k.shape, pts: [[px, py], [px, py]], color: th.text, width: 2.5, dash: k.dash, arrow: k.arrow, fill: '', alpha: 0.25 };
      past.current.push(specRef.current);
      future.current = [];
      setSpecRaw((s) => ({ ...s, objs: [...s.objs, o] }));
      setSel(o.id);
      drag.current = { kind: 'draw', id: o.id };
      return;
    }
    if (tool === 'point') {
      const [sx, sy] = snapXY(x, y);
      add(mkPoint(sx, sy, nextName(), th.text));
      return;
    }
    if (tool === 'text') {
      const [sx, sy] = snapXY(x, y);
      add(mkText(sx, sy, 'ข้อความ', th.text));
      setTab('draw');
      return;
    }
    const pk = pointAt(px, py, x, y);
    const made = pk.created ? [pk.created] : [];
    if (tool === 'seg' || tool === 'vec' || tool === 'dash') {
      if (!pending.length) {
        if (made.length) add(made, false);
        setPending([pk.id]);
      } else {
        if (pk.id === pending[0]) return;
        add([...made, mkSeg(pending[0], pk.id, th.text, { arrow: tool === 'vec' ? 'end' : 'none', dash: tool === 'dash' ? 'dash' : 'solid' })]);
        setPending([]);
        setTab('draw');
      }
      return;
    }
    if (tool === 'poly') {
      if (pending.length >= 3 && pk.id === pending[0]) {
        add(mkPoly(pending, th.text, { fill: nextColor(0), alpha: 0.15 }));
        setPending([]);
        setTab('draw');
        return;
      }
      if (pending.includes(pk.id)) return;
      if (made.length) add(made, false);
      setPending([...pending, pk.id]);
      return;
    }
    if (tool === 'angle') {
      if (pending.includes(pk.id)) return;
      if (made.length) add(made, false);
      const next = [...pending, pk.id];
      if (next.length === 3) {
        add(mkAngle(next[0], next[1], next[2], 'θ', th.text));
        setPending([]);
        setTab('draw');
      } else setPending(next);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const { px, py, x, y } = toMath(e);
    setCursor([x, y]);
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'pt') {
      const [sx, sy] = snapXY(x, y);
      patch(d.id, { x: sx, y: sy } as Partial<GObj>, false);
    } else if (d.kind === 'draw') {
      const r = (v: number) => Math.round(v * 10) / 10;
      setSpecRaw((s) => ({
        ...s,
        objs: s.objs.map((o) => {
          if (o.id !== d.id || o.kind !== 'draw') return o;
          const last = o.pts[o.pts.length - 1];
          if (o.shape === 'pen') return Math.hypot(px - last[0], py - last[1]) < 2 || o.pts.length >= 400 ? o : { ...o, pts: [...o.pts, [r(px), r(py)]] };
          return { ...o, pts: [o.pts[0], [r(px), r(py)]] };
        }),
      }));
    } else if (d.kind === 'move') {
      const [dx, dy] = snapXY(x - d.x, y - d.y);
      const ddx = px - d.px;
      const ddy = py - d.py;
      setSpecRaw((s) => ({
        ...s,
        objs: s.objs.map((o) =>
          d.from.has(o.id) && (o.kind === 'point' || o.kind === 'text')
            ? { ...o, x: fix(d.from.get(o.id)![0] + dx), y: fix(d.from.get(o.id)![1] + dy) }
            : o.kind === 'draw' && d.draws.has(o.id)
              ? { ...o, pts: d.draws.get(o.id)!.map(([a, b]): [number, number] => [Math.round((a + ddx) * 10) / 10, Math.round((b + ddy) * 10) / 10]) }
              : o,
        ),
      }));
    } else {
      const kx = (d.view.xMax - d.view.xMin) / spec.w;
      const ky = (d.view.yMax - d.view.yMin) / spec.h;
      const dx = (px - d.sx) * kx;
      const dy = (py - d.sy) * ky;
      setSpecRaw((s) => ({ ...s, view: { xMin: d.view.xMin - dx, xMax: d.view.xMax - dx, yMin: d.view.yMin + dy, yMax: d.view.yMax + dy } }));
    }
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.kind === 'draw') {
      // แตะเฉยๆ ไม่ได้ลาก = ไม่สร้างรูป
      const o = specRef.current.objs.find((q) => q.id === d.id);
      if (o?.kind === 'draw') {
        const xs = o.pts.map((q) => q[0]);
        const ys = o.pts.map((q) => q[1]);
        if (Math.max(...xs) - Math.min(...xs) < 3 && Math.max(...ys) - Math.min(...ys) < 3) {
          past.current.pop();
          setSpecRaw((s) => ({ ...s, objs: s.objs.filter((q) => q.id !== d.id) }));
          setSel(null);
        } else setTab('draw');
      }
      return;
    }
    if (d?.kind === 'pan') {
      past.current.push({ ...specRef.current, view: { ...d.view } });
      future.current = [];
    }
  };
  const zoomAt = (k: number, cx?: number, cy?: number) =>
    setSpec((s) => {
      const fr = frameOf(s);
      const x0 = cx ?? (fr.xMin + fr.xMax) / 2;
      const y0 = cy ?? (fr.yMin + fr.yMax) / 2;
      return { ...s, view: { xMin: x0 - (x0 - fr.xMin) * k, xMax: x0 + (fr.xMax - x0) * k, yMin: y0 - (y0 - fr.yMin) * k, yMax: y0 + (fr.yMax - y0) * k } };
    });
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = toMath(e);
      zoomAt(e.deltaY < 0 ? 0.88 : 1 / 0.88, x, y);
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  });

  /* ---------------- แป้นพิมพ์ ---------------- */
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      // หน้าต่าง MathType เปิดอยู่: ปุ่มเป็นของหน้าต่างนั้น (Esc ปิดแค่ MathType)
      if (mathFor) return;
      const t = e.target as HTMLElement;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName) || t?.isContentEditable;
      if (e.key === 'Escape') {
        if (pending.length) setPending([]);
        else onClose();
        return;
      }
      if (typing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        e.preventDefault();
        remove(sel);
        setSel(null);
      } else if (e.key === 'Enter' && tool === 'poly' && pending.length >= 3) {
        add(mkPoly(pending, th.text, { fill: nextColor(0), alpha: 0.15 }));
        setPending([]);
      } else if (!mod) {
        const map: Record<string, Tool> = { v: 'move', p: 'point', s: 'seg', a: 'vec', d: 'dash', g: 'poly', m: 'angle', t: 'text' };
        const tl = map[e.key.toLowerCase()];
        if (tl) {
          setTool(tl);
          setPending([]);
        }
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const setTheme = (id: GThemeId) =>
    setSpec((s) => {
      const t = themeOf(id);
      let i = 0;
      return {
        ...s,
        theme: id,
        objs: s.objs.map((o) => ({ ...o, color: o.kind === 'expr' ? t.colors[i++ % t.colors.length] : t.text })) as GObj[],
      };
    });

  const addIntersections = () => {
    const exprs = spec.objs.filter((o) => o.kind === 'expr' && !o.hidden);
    const pv = paramValues(spec);
    const found: GPoint[] = [];
    for (let i = 0; i < exprs.length; i++)
      for (let j = i + 1; j < exprs.length; j++) {
        const a = exprs[i];
        const b = exprs[j];
        if (a.kind !== 'expr' || b.kind !== 'expr') continue;
        for (const [x, y] of intersections(a.text, b.text, f.xMin, f.xMax, pv)) {
          if (y < f.yMin || y > f.yMax) continue;
          found.push(mkPoint(fix(Math.round(x * 1000) / 1000), fix(Math.round(y * 1000) / 1000), `(${Math.round(x * 100) / 100}, ${Math.round(y * 100) / 100})`, th.text));
        }
      }
    if (found.length) add(found.slice(0, 12));
    return found.length;
  };
  const [msg, setMsg] = useState('');

  /* คัดลอก/บันทึกเป็นรูป: วาดจาก SVG ลงผืนผ้าใบที่ไม่ระบายพื้น ตั้ง "โปร่งใส" = ได้ PNG ไม่มีพื้นหลัง */
  const [copyMsg, setCopyMsg] = useState('');
  const flash = (m: string) => {
    setCopyMsg(m);
    window.setTimeout(() => setCopyMsg((t) => (t === m ? '' : t)), 2600);
  };
  const pngOf = () => svgToPngBlob(graphToSvg(spec), spec.w, spec.h, 3);
  const saveImage = async () => {
    try {
      const url = URL.createObjectURL(await pngOf());
      const a = document.createElement('a');
      a.href = url;
      a.download = spec.clear ? 'graph-transparent.png' : 'graph.png';
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      flash('บันทึกรูปไม่สำเร็จ');
    }
  };
  const copyImage = async () => {
    // ส่ง Promise เข้า ClipboardItem ทันที (Safari ต้องเรียกในจังหวะที่กดปุ่ม)
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      await saveImage();
      return flash('เบราว์เซอร์นี้คัดลอกรูปไม่ได้ บันทึกเป็นไฟล์ให้แทน');
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngOf() })]);
      flash(spec.clear ? 'คัดลอกแล้ว (พื้นหลังโปร่งใส)' : 'คัดลอกรูปแล้ว');
    } catch {
      await saveImage();
      flash('คัดลอกไม่ได้ บันทึกเป็นไฟล์ให้แทน');
    }
  };

  const selObj = spec.objs.find((o) => o.id === sel) || null;
  const exprs = spec.objs.filter((o) => o.kind === 'expr');
  const shapes = spec.objs.filter((o) => o.kind !== 'expr');
  const toolHint = TOOLS.find((t) => t.id === tool)?.hint;

  const mathObj = mathFor ? spec.objs.find((o) => o.id === mathFor) : undefined;
  return createPortal(
    <div className="ge-back" role="dialog" aria-modal="true" aria-label="สร้างกราฟและรูปคณิตศาสตร์">
      {mathObj?.kind === 'expr' && (
        <MathPopover
          initial={mathObj.text}
          editing={!!mathObj.text}
          onCancel={() => setMathFor(null)}
          onDone={(tex) => {
            const text = texToExpr(tex);
            setSpec((s) => syncParams({ ...s, objs: s.objs.map((x) => (x.id === mathObj.id ? ({ ...x, text, shape: undefined } as GObj) : x)) }));
            setMathFor(null);
          }}
        />
      )}
      <div className="ge">
        <header className="ge-head">
          <span className="ge-badge">
            <Grid3x3 className="w-5 h-5" />
          </span>
          <h2>{editing ? 'แก้ไขกราฟ / รูปคณิต' : 'สร้างกราฟ / รูปคณิต'}</h2>
          <div className="ge-themes" role="radiogroup" aria-label="สไตล์">
            {GTHEMES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={spec.theme === t.id} data-on={spec.theme === t.id} onClick={() => setTheme(t.id)} title={`สไตล์${t.label}`}>
                <span style={{ background: t.bg, borderColor: t.axis }}>
                  <i style={{ background: t.colors[0] }} />
                </span>
                {t.label}
              </button>
            ))}
          </div>
          <span className="flex-1" />
          {copyMsg && (
            <span className="ge-copymsg" role="status">
              {copyMsg}
            </span>
          )}
          <button type="button" className="ge-btn" onClick={copyImage} title={spec.clear ? 'คัดลอกเป็นรูป PNG พื้นหลังโปร่งใส' : 'คัดลอกเป็นรูป PNG'}>
            <Copy className="w-4 h-4" /> คัดลอก
          </button>
          <button type="button" className="ge-btn" onClick={saveImage} title="บันทึกเป็นไฟล์รูป PNG">
            <Download className="w-4 h-4" /> <span className="ge-hide-sm">บันทึกรูป</span>
          </button>
          <button type="button" className="ge-btn" onClick={onClose}>
            <X className="w-4 h-4" /> ยกเลิก
          </button>
          <button type="button" className="ge-btn ge-btn-go" onClick={() => onDone(spec)}>
            <Check className="w-4 h-4" strokeWidth={3} /> {editing ? 'บันทึก' : 'ใส่ลงหน้า'}
          </button>
        </header>

        <div className="ge-body">
          {/* ---------------- แผงซ้าย ---------------- */}
          <aside className="ge-side">
            <div className="ge-tabs" role="tablist">
              {(
                [
                  ['eq', 'สมการ'],
                  ['draw', 'วาดรูป'],
                  ['view', 'มุมมอง'],
                  ['tpl', 'แม่แบบ'],
                ] as [Tab, string][]
              ).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} data-on={tab === id} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'eq' && (
              <div className="ge-pane">
                {exprs.map((o, i) => {
                  if (o.kind !== 'expr') return null;
                  const r = parseEquation(o.text);
                  return (
                    <div key={o.id} className="ge-card" data-on={sel === o.id} onClick={() => setSel(o.id)}>
                      <div className="flex items-center gap-2">
                        <label className="ge-swatch" style={{ background: o.color }} title="สีเส้น">
                          <input type="color" value={o.color} onChange={(e) => patch(o.id, { color: e.target.value })} aria-label="สีเส้น" />
                        </label>
                        <input
                          className="ge-eq"
                          value={o.text}
                          onChange={(e) => setSpec((s) => syncParams({ ...s, objs: s.objs.map((x) => (x.id === o.id ? ({ ...x, text: e.target.value.slice(0, 200), shape: undefined } as GObj) : x)) }), false)}
                          onFocus={() => past.current.push(specRef.current)}
                          placeholder="เช่น y = x^2 หรือ x^2 + y^2 = 9"
                          aria-label={`สมการที่ ${i + 1}`}
                          spellCheck={false}
                        />
                        <button type="button" className="ge-ico" onClick={() => setMathFor(o.id)} title="พิมพ์สมการด้วย MathType" aria-label="พิมพ์สมการด้วย MathType">
                          <Sigma className="w-4 h-4" />
                        </button>
                        <button type="button" className="ge-ico" onClick={() => patch(o.id, { hidden: !o.hidden })} title={o.hidden ? 'แสดง' : 'ซ่อน'} aria-label={o.hidden ? 'แสดง' : 'ซ่อน'}>
                          {o.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button type="button" className="ge-ico" onClick={() => remove(o.id)} aria-label="ลบสมการ">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {!r.ok && o.text.trim() && <p className="ge-err">{r.error}</p>}
                      <div className="ge-shape-pick" onClick={(e) => e.stopPropagation()}>
                        <span>รูปทรง</span>
                        <select
                          value={o.shape?.k ?? ''}
                          onChange={(e) => {
                            const k = e.target.value as ShapeKind | '';
                            const sh = k ? defaultShape(k) : undefined;
                            setSpec((s2) => syncParams({ ...s2, objs: s2.objs.map((x) => (x.id === o.id ? { ...x, shape: sh, text: sh ? shapeText(sh) : x.kind === 'expr' ? x.text : '' } : x)) as GObj[] }));
                            setSel(o.id);
                          }}
                          aria-label="ปรับแบบรูปทรงเฉพาะ"
                        >
                          <option value="">สมการพิมพ์เอง</option>
                          {SHAPE_KINDS.map((k) => (
                            <option key={k.k} value={k.k}>
                              {k.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {o.shape && (
                        <ShapeKnobs
                          s={o.shape}
                          onChange={(sh, push = true) => {
                            const c = cleanShape(sh)!;
                            patch(o.id, { shape: c, text: shapeText(c) } as Partial<GObj>, push);
                          }}
                        />
                      )}
                      {sel === o.id && (
                        <div className="ge-more">
                          <Row label="เส้น">
                            <Seg value={o.dash} options={DASHES} onChange={(dash) => patch(o.id, { dash })} />
                          </Row>
                          <Row label={`หนา ${o.width}`}>
                            <input type="range" min={0.5} max={8} step={0.5} value={o.width} onChange={(e) => patch(o.id, { width: Number(e.target.value) }, false)} />
                          </Row>
                          <Row label="ป้าย">
                            <input className="ge-in" value={o.label} maxLength={40} onChange={(e) => patch(o.id, { label: e.target.value }, false)} placeholder="เช่น f, y = f(x), f^{-1}" />
                          </Row>
                          {o.label && (
                            <Row label="ตำแหน่งป้าย">
                              <input type="range" min={0} max={1} step={0.01} value={o.at} onChange={(e) => patch(o.id, { at: Number(e.target.value) }, false)} />
                            </Row>
                          )}
                          <Row label={r.ok && r.kind === 'x' ? 'ช่วง y' : 'ช่วง x'}>
                            <NumIn value={o.lo} onChange={(lo) => patch(o.id, { lo })} placeholder="ต่ำสุด" />
                            <span className="opacity-60">ถึง</span>
                            <NumIn value={o.hi} onChange={(hi) => patch(o.id, { hi })} placeholder="สูงสุด" />
                          </Row>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button type="button" className="ge-add" onClick={() => add(mkExpr('', nextColor(exprs.length)))}>
                  <Plus className="w-4 h-4" strokeWidth={3} /> เพิ่มสมการ
                </button>

                {Object.keys(spec.params).length > 0 && (
                  <div className="ge-params">
                    <p className="ge-h">แถบเลื่อนค่าคงที่</p>
                    {Object.entries(spec.params).map(([n, pr]) => (
                      <div key={n} className="ge-param">
                        <b>{n} =</b>
                        <input type="range" min={pr.min} max={pr.max} step={pr.step} value={pr.v} onChange={(e) => setSpec((s) => ({ ...s, params: { ...s.params, [n]: { ...pr, v: Number(e.target.value) } } }), false)} aria-label={`ค่า ${n}`} />
                        <NumIn value={pr.v} onChange={(v) => v !== null && setSpec((s) => ({ ...s, params: { ...s.params, [n]: { ...pr, v: Math.min(pr.max, Math.max(pr.min, v)) } } }))} />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <button type="button" className="ge-btn ge-btn-sm" onClick={() => setMsg(addIntersections() ? '' : 'ไม่พบจุดตัดในกรอบที่เห็น')} disabled={exprs.length < 2}>
                    <Crosshair className="w-4 h-4" /> หาจุดตัด
                  </button>
                  {msg && <span className="text-xs font-bold self-center opacity-70">{msg}</span>}
                </div>

                <p className="ge-h mt-4">สมการสำเร็จรูป</p>
                <div className="ge-presets">
                  {GRAPH_PRESETS.map((p) => (
                    <button key={p.label} type="button" onClick={() => add(mkExpr(p.text, nextColor(exprs.length), p.shape ? { shape: defaultShape(p.shape), text: shapeText(defaultShape(p.shape)) } : {}))}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="ge-tip">
                  พิมพ์ได้แบบ y = 2x + 1, x = y^2, x^2/9 + y^2/4 = 1, y = sin(x), y = |x|, y = sqrt(x) · ใส่ a, b, c จะได้แถบเลื่อนปรับค่าได้
                </p>
              </div>
            )}

            {tab === 'draw' && (
              <div className="ge-pane">
                {!shapes.length && <p className="ge-tip">เลือกเครื่องมือด้านบนกราฟ (จุด เส้น ลูกศร รูปหลายเหลี่ยม มุม ข้อความ) แล้วแตะบนกราฟ</p>}
                <div className="ge-list">
                  {shapes.map((o) => (
                    <button key={o.id} type="button" className="ge-row" data-on={sel === o.id} onClick={() => setSel(o.id)}>
                      <span className="ge-dot" style={{ background: o.color }} />
                      <span className="flex-1 truncate text-left">
                        {KIND_LABEL[o.kind]} {o.kind === 'point' ? o.label || `(${o.x}, ${o.y})` : o.kind === 'text' ? o.text : o.kind === 'seg' || o.kind === 'angle' ? o.label : ''}
                      </span>
                      {o.hidden && <EyeOff className="w-3.5 h-3.5 opacity-60" />}
                    </button>
                  ))}
                </div>
                {selObj && selObj.kind !== 'expr' && <ObjProps o={selObj} points={points} th={th.colors} patch={(p, push) => patch(selObj.id, p, push)} remove={() => (remove(selObj.id), setSel(null))} />}
              </div>
            )}

            {tab === 'view' && (
              <div className="ge-pane">
                <p className="ge-h">พื้นหลัง</p>
                <div className="ge-presets mb-3">
                  <button type="button" data-on={!spec.clear} onClick={() => setSpec((s) => ({ ...s, clear: false }))}>
                    มีพื้นหลัง
                  </button>
                  <button type="button" data-on={spec.clear} onClick={() => setSpec((s) => ({ ...s, clear: true }))}>
                    โปร่งใส (มีแค่กราฟ)
                  </button>
                </div>
                <p className="ge-h">ช่วงที่แสดง</p>
                <Row label="x">
                  <NumIn value={fix(spec.view.xMin)} onChange={(v) => v !== null && v < spec.view.xMax && setSpec((s) => ({ ...s, view: { ...s.view, xMin: v } }))} />
                  <span className="opacity-60">ถึง</span>
                  <NumIn value={fix(spec.view.xMax)} onChange={(v) => v !== null && v > spec.view.xMin && setSpec((s) => ({ ...s, view: { ...s.view, xMax: v } }))} />
                </Row>
                <Row label="y">
                  <NumIn value={fix(spec.view.yMin)} onChange={(v) => v !== null && v < spec.view.yMax && setSpec((s) => ({ ...s, view: { ...s.view, yMin: v } }))} />
                  <span className="opacity-60">ถึง</span>
                  <NumIn value={fix(spec.view.yMax)} onChange={(v) => v !== null && v > spec.view.yMin && setSpec((s) => ({ ...s, view: { ...s.view, yMax: v } }))} />
                </Row>
                <Check2 label="สเกลแกน x, y เท่ากัน (วงกลมกลมจริง)" on={spec.equal} set={(equal) => setSpec((s) => ({ ...s, equal }))} />
                <p className="ge-h mt-3">แกนและเส้นกริด</p>
                <Check2 label="แสดงแกน" on={spec.axes} set={(axes) => setSpec((s) => ({ ...s, axes }))} />
                <Check2 label="เส้นกริด" on={spec.grid} set={(g) => setSpec((s) => ({ ...s, grid: g }))} />
                <Check2 label="กริดย่อย" on={spec.minor} set={(minor) => setSpec((s) => ({ ...s, minor }))} />
                <Check2 label="ตัวเลขบนแกน" on={spec.numbers} set={(numbers) => setSpec((s) => ({ ...s, numbers }))} />
                <Check2 label="จุดกำเนิด O" on={spec.origin} set={(origin) => setSpec((s) => ({ ...s, origin }))} />
                <Row label="หัวลูกศรแกน">
                  <Seg value={spec.arrows} options={ARROWS} onChange={(arrows) => setSpec((s) => ({ ...s, arrows }))} />
                </Row>
                <Row label="ชื่อแกน">
                  <input className="ge-in w-16" value={spec.xName} maxLength={12} onChange={(e) => setSpec((s) => ({ ...s, xName: e.target.value }), false)} aria-label="ชื่อแกนนอน" />
                  <input className="ge-in w-16" value={spec.yName} maxLength={12} onChange={(e) => setSpec((s) => ({ ...s, yName: e.target.value }), false)} aria-label="ชื่อแกนตั้ง" />
                </Row>
                <Row label="ระยะตัวเลข">
                  <NumIn value={spec.step || null} onChange={(v) => setSpec((s) => ({ ...s, step: v && v > 0 ? v : 0 }))} placeholder="อัตโนมัติ" />
                </Row>
                <p className="ge-h mt-3">สัดส่วนภาพ</p>
                <div className="ge-presets">
                  {SIZES.map((z) => (
                    <button key={z.label} type="button" data-on={spec.w === z.w && spec.h === z.h} onClick={() => setSpec((s) => ({ ...s, w: z.w, h: z.h }))}>
                      {z.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === 'tpl' && (
              <div className="ge-pane">
                <p className="ge-tip">เลือกแม่แบบแล้วแก้ไขต่อได้ทุกส่วน (เลื่อนจุด แก้ป้าย เปลี่ยนสมการ)</p>
                <div className="ge-tpls">
                  {GRAPH_TEMPLATES.map((t) => (
                    <TplCard
                      key={t.id}
                      label={t.label}
                      make={t.make}
                      onPick={(s) => {
                        if (spec.objs.length && !confirm('แทนที่กราฟที่ทำอยู่ด้วยแม่แบบนี้?')) return;
                        setSpec(s);
                        setSel(null);
                        setTab(s.objs.some((o) => o.kind === 'expr') ? 'eq' : 'draw');
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* ---------------- กราฟ ---------------- */}
          <section className="ge-main">
            <div className="ge-tools" role="toolbar" aria-label="เครื่องมือวาด">
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  data-on={tool === t.id}
                  onClick={() => {
                    setTool(t.id);
                    setPending([]);
                  }}
                  title={t.hint}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
              <span className="ge-sep" />
              <button type="button" onClick={undo} title="ย้อนกลับ (Ctrl+Z)" aria-label="ย้อนกลับ">
                <Undo2 className="w-4 h-4" />
              </button>
              <button type="button" onClick={redo} title="ทำซ้ำ (Ctrl+Y)" aria-label="ทำซ้ำ">
                <Redo2 className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => zoomAt(0.8)} title="ซูมเข้า" aria-label="ซูมเข้า">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => zoomAt(1.25)} title="ซูมออก" aria-label="ซูมออก">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button type="button" data-on={snap} onClick={() => setSnap(!snap)} title="ดูดจุดเข้ากริด">
                <Hand className="w-4 h-4" />
                <span>ดูดกริด</span>
              </button>
            </div>
            {tool === 'draw' && (
              <div className="ge-drawkinds" role="radiogroup" aria-label="แบบรูปวาด">
                {DRAW_KINDS.map((k) => (
                  <button key={k.id} type="button" role="radio" aria-checked={drawKind === k.id} data-on={drawKind === k.id} onClick={() => setDrawKind(k.id)}>
                    <DrawIcon id={k.id} />
                    <span>{k.label}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="ge-stagewrap">
              <div
                ref={stage}
                className="ge-stage"
                data-tool={tool}
                data-clear={spec.clear || undefined}
                style={{ aspectRatio: `${spec.w} / ${spec.h}`, ['--r' as string]: spec.w / spec.h }}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onPointerLeave={() => setCursor(null)}
              >
                <div className="ge-svg" dangerouslySetInnerHTML={{ __html: svg }} />
                <svg className="ge-over" viewBox={`0 0 ${spec.w} ${spec.h}`} preserveAspectRatio="none">
                  {points.map((p) => (
                    <circle key={p.id} cx={f.X(p.x)} cy={f.Y(p.y)} r={pending.includes(p.id) ? 9 : sel === p.id ? 8 : 6} className="ge-handle" data-on={sel === p.id || pending.includes(p.id)} />
                  ))}
                </svg>
              </div>
            </div>
            <footer className="ge-foot">
              <span>{pending.length ? `${toolHint} (Esc เพื่อยกเลิก)` : toolHint}</span>
              <span className="flex-1" />
              {cursor && (
                <span className="tabular-nums font-bold">
                  x = {Math.round(cursor[0] * 100) / 100}, y = {Math.round(cursor[1] * 100) / 100}
                </span>
              )}
            </footer>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ---------------------------------------------------------------- ชิ้นส่วนฟอร์ม */

/** แถบปรับเฉพาะทางของรูปทรง (รัศมี แกนเอก แกนโท จุดยอด ความชัน ...) + ค่าที่คำนวณได้ */
function ShapeKnobs({ s, onChange }: { s: GShape; onChange: (s: GShape, push?: boolean) => void }) {
  const K = ({ name, label, value, min, max, step = 0.1 }: { name: keyof GShape; label: string; value: number; min: number; max: number; step?: number }) => (
    <div className="ge-param ge-knob">
      <b title={label}>{label}</b>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange({ ...s, [name]: Number(e.target.value) }, false)} aria-label={label} />
      <NumIn value={value} onChange={(v) => v !== null && onChange({ ...s, [name]: Math.min(max, Math.max(min, v)) })} />
    </div>
  );
  const center = (what: string) => (
    <>
      <K name="h" label={`${what} x`} value={s.h} min={-20} max={20} />
      <K name="v" label={`${what} y`} value={s.v} min={-20} max={20} />
    </>
  );
  const flip = (a: string, b: string) => (
    <div className="ge-knob-flip" role="radiogroup">
      <button type="button" data-on={!s.vert} onClick={() => onChange({ ...s, vert: false })}>
        {a}
      </button>
      <button type="button" data-on={s.vert} onClick={() => onChange({ ...s, vert: true })}>
        {b}
      </button>
    </div>
  );
  return (
    <div className="ge-params ge-knobs" onClick={(e) => e.stopPropagation()}>
      <p className="ge-h">ปรับ{SHAPE_KINDS.find((x) => x.k === s.k)?.label}</p>
      {s.k === 'line' && (
        <>
          <K name="a" label="ความชัน" value={s.a} min={-10} max={10} />
          <K name="b" label="ตัดแกน y" value={s.b} min={-20} max={20} />
        </>
      )}
      {s.k === 'circle' && (
        <>
          {center('ศูนย์กลาง')}
          <K name="r" label="รัศมี" value={s.r} min={0.1} max={20} />
        </>
      )}
      {s.k === 'ellipse' && (
        <>
          {flip('แกนเอกแนวนอน', 'แกนเอกแนวตั้ง')}
          {center('ศูนย์กลาง')}
          <K name="a" label="ครึ่งแกนเอก" value={s.a} min={0.1} max={20} />
          <K name="b" label="ครึ่งแกนโท" value={Math.min(s.b, s.a)} min={0.1} max={s.a} />
        </>
      )}
      {s.k === 'hyperbola' && (
        <>
          {flip('เปิดซ้าย-ขวา', 'เปิดบน-ล่าง')}
          {center('ศูนย์กลาง')}
          <K name="a" label="a (ครึ่งแกนตามขวาง)" value={s.a} min={0.1} max={20} />
          <K name="b" label="b (ครึ่งแกนสังยุค)" value={s.b} min={0.1} max={20} />
        </>
      )}
      {(s.k === 'parabola' || s.k === 'parabolaX') && (
        <>
          {center('จุดยอด')}
          <K name="a" label={s.k === 'parabola' ? 'a (ลบ = คว่ำ)' : 'a (ลบ = เปิดซ้าย)'} value={s.a} min={-5} max={5} step={0.05} />
        </>
      )}
      <ul className="ge-facts">
        {shapeFacts(s).map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </div>
  );
}

/** ไอคอนเล็กของแบบรูปวาด */
function DrawIcon({ id }: { id: string }) {
  const st = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      {id === 'rect' && <rect x="4" y="6" width="16" height="12" rx="1" {...st} />}
      {id === 'ellipse' && <ellipse cx="12" cy="12" rx="8" ry="6" {...st} />}
      {id === 'pen' && <path d="M4 17c3-6 5 2 8-3s4-5 8-6" {...st} />}
      {(id === 'line' || id === 'dash' || id === 'dot') && <path d="M4 18L20 6" {...st} strokeDasharray={id === 'dash' ? '4 3' : id === 'dot' ? '0.1 4' : undefined} />}
      {(id === 'arrow' || id === 'arrow2') && <path d="M4 18L20 6M20 6h-6M20 6v6" {...st} />}
      {id === 'arrow2' && <path d="M4 18h6M4 18v-6" {...st} />}
    </svg>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ge-rowf">
      <span className="ge-lbl">{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap flex-1">{children}</div>
    </div>
  );
}
function Seg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="ge-seg">
      {options.map((o) => (
        <button key={o.id} type="button" data-on={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
function Check2({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="ge-check">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
/** ช่องตัวเลข: พิมพ์ได้อิสระ ส่งค่าเมื่อเป็นตัวเลขจริง (ว่าง = null) */
function NumIn({ value, onChange, placeholder }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  const [t, setT] = useState(value === null ? '' : String(value));
  useEffect(() => setT(value === null ? '' : String(value)), [value]);
  return (
    <input
      className="ge-in ge-num"
      inputMode="decimal"
      value={t}
      placeholder={placeholder}
      onChange={(e) => {
        setT(e.target.value);
        const v = e.target.value.trim().replace('−', '-');
        if (v === '') onChange(null);
        else if (/^-?\d*\.?\d+$/.test(v)) onChange(Number(v));
      }}
    />
  );
}
function TplCard({ label, make, onPick }: { label: string; make: () => GraphSpec; onPick: (s: GraphSpec) => void }) {
  const svg = useMemo(() => graphToSvg(make()), [make]);
  return (
    <button type="button" className="ge-tpl" onClick={() => onPick(make())}>
      <span className="ge-tpl-img" dangerouslySetInnerHTML={{ __html: svg }} />
      <span>{label}</span>
    </button>
  );
}

function ObjProps({ o, points, th, patch, remove }: { o: GObj; points: GPoint[]; th: string[]; patch: (p: Partial<GObj>, push?: boolean) => void; remove: () => void }) {
  const colors = [...new Set(['#111111', ...th, '#7c5cf0', '#e8456b', '#2563eb', '#16a34a', '#ea580c'])].slice(0, 10);
  const name = (id: string) => points.find((p) => p.id === id)?.label || 'จุด';
  return (
    <div className="ge-props">
      <p className="ge-h">
        {KIND_LABEL[o.kind]}
        {o.kind === 'seg' && ` ${name(o.a)} ไป ${name(o.b)}`}
      </p>
      <Row label="สี">
        {colors.map((c) => (
          <button key={c} type="button" className="ge-colorbtn" data-on={o.color === c} style={{ background: c }} onClick={() => patch({ color: c })} aria-label={`สี ${c}`} />
        ))}
        <label className="ge-swatch" style={{ background: o.color }}>
          <input type="color" value={o.color} onChange={(e) => patch({ color: e.target.value })} aria-label="เลือกสีเอง" />
        </label>
      </Row>
      {o.kind === 'point' && (
        <>
          <Row label="ชื่อจุด">
            <input className="ge-in" value={o.label} maxLength={40} onChange={(e) => patch({ label: e.target.value }, false)} placeholder="เช่น A, F_1, P(x, y)" />
          </Row>
          <Row label="พิกัด">
            <NumIn value={o.x} onChange={(x) => x !== null && patch({ x })} />
            <NumIn value={o.y} onChange={(y) => y !== null && patch({ y })} />
          </Row>
          <Row label={`ขนาด ${o.size}`}>
            <input type="range" min={0} max={10} step={0.5} value={o.size} onChange={(e) => patch({ size: Number(e.target.value) }, false)} />
          </Row>
          <Row label="ป้ายอยู่">
            <div className="ge-pos">
              {POS.map((p) => (
                <button key={p} type="button" data-on={o.pos === p} onClick={() => patch({ pos: p })} aria-label={`ป้ายทิศ ${p}`} />
              ))}
            </div>
          </Row>
          <Check2 label="จุดโปร่ง (วงกลมกลวง)" on={o.hollow} set={(hollow) => patch({ hollow })} />
          <Check2 label="เส้นประลากไปหาแกน" on={o.guides} set={(guides) => patch({ guides })} />
        </>
      )}
      {o.kind === 'seg' && (
        <>
          <Row label="ป้าย">
            <input className="ge-in" value={o.label} maxLength={40} onChange={(e) => patch({ label: e.target.value }, false)} placeholder="เช่น u, d, 4" />
          </Row>
          <Row label="เส้น">
            <Seg value={o.dash} options={DASHES} onChange={(dash) => patch({ dash })} />
          </Row>
          <Row label="หัวลูกศร">
            <Seg value={o.arrow} options={ARROWS} onChange={(arrow) => patch({ arrow })} />
          </Row>
          <Row label={`หนา ${o.width}`}>
            <input type="range" min={0.5} max={8} step={0.5} value={o.width} onChange={(e) => patch({ width: Number(e.target.value) }, false)} />
          </Row>
          <Check2 label="ขีดบนป้าย (เวกเตอร์)" on={o.bar} set={(bar) => patch({ bar })} />
          <button type="button" className="ge-btn ge-btn-sm mt-1" onClick={() => patch({ side: o.side === 1 ? -1 : 1 })}>
            สลับป้ายไปอีกฝั่ง
          </button>
        </>
      )}
      {o.kind === 'poly' && (
        <>
          <Row label="เส้น">
            <Seg value={o.dash} options={DASHES} onChange={(dash) => patch({ dash })} />
          </Row>
          <Row label={`หนา ${o.width}`}>
            <input type="range" min={0} max={8} step={0.5} value={o.width} onChange={(e) => patch({ width: Number(e.target.value) }, false)} />
          </Row>
          <Row label="สีพื้น">
            <button type="button" className="ge-colorbtn ge-none" data-on={!o.fill} onClick={() => patch({ fill: '' })} aria-label="ไม่มีสีพื้น" />
            {colors.slice(1, 8).map((c) => (
              <button key={c} type="button" className="ge-colorbtn" data-on={o.fill === c} style={{ background: c }} onClick={() => patch({ fill: c })} aria-label={`พื้น ${c}`} />
            ))}
          </Row>
          {o.fill && (
            <Row label="ความทึบพื้น">
              <input type="range" min={0.05} max={1} step={0.05} value={o.alpha} onChange={(e) => patch({ alpha: Number(e.target.value) }, false)} />
            </Row>
          )}
        </>
      )}
      {o.kind === 'draw' && (
        <>
          <Row label="เส้น">
            <Seg value={o.dash} options={DASHES} onChange={(dash) => patch({ dash })} />
          </Row>
          {o.shape === 'line' && (
            <Row label="หัวลูกศร">
              <Seg value={o.arrow} options={ARROWS} onChange={(arrow) => patch({ arrow })} />
            </Row>
          )}
          <Row label={`หนา ${o.width}`}>
            <input type="range" min={0.5} max={10} step={0.5} value={o.width} onChange={(e) => patch({ width: Number(e.target.value) }, false)} />
          </Row>
          {(o.shape === 'rect' || o.shape === 'ellipse') && (
            <>
              <Row label="สีพื้น">
                <button type="button" className="ge-colorbtn ge-none" data-on={!o.fill} onClick={() => patch({ fill: '' })} aria-label="ไม่มีสีพื้น" />
                {colors.slice(1, 8).map((c) => (
                  <button key={c} type="button" className="ge-colorbtn" data-on={o.fill === c} style={{ background: c }} onClick={() => patch({ fill: c })} aria-label={`พื้น ${c}`} />
                ))}
              </Row>
              {o.fill && (
                <Row label="ความทึบพื้น">
                  <input type="range" min={0.05} max={1} step={0.05} value={o.alpha} onChange={(e) => patch({ alpha: Number(e.target.value) }, false)} />
                </Row>
              )}
            </>
          )}
          <p className="ge-tip">ลากด้วยเครื่องมือเลือก/ลากเพื่อย้าย</p>
        </>
      )}
      {o.kind === 'angle' && (
        <>
          <Row label="ป้าย">
            <input className="ge-in w-20" value={o.label} maxLength={20} onChange={(e) => patch({ label: e.target.value }, false)} />
            {['θ', 'α', 'β', '90°', '60°', '45°', ''].map((v) => (
              <button key={v || 'none'} type="button" className="ge-chip" onClick={() => patch({ label: v })}>
                {v || 'ไม่มี'}
              </button>
            ))}
          </Row>
          <Row label={`รัศมี ${o.r}`}>
            <input type="range" min={8} max={80} step={1} value={o.r} onChange={(e) => patch({ r: Number(e.target.value) }, false)} />
          </Row>
          <p className="ge-tip">มุม 90 องศาจะเป็นสัญลักษณ์มุมฉากให้เอง</p>
        </>
      )}
      {o.kind === 'text' && (
        <>
          <Row label="ข้อความ">
            <input className="ge-in" value={o.text} maxLength={120} onChange={(e) => patch({ text: e.target.value }, false)} placeholder="ใช้ _ ทำตัวห้อย ^ ทำตัวยก" />
          </Row>
          <Row label={`ขนาด ${o.size}`}>
            <input type="range" min={8} max={60} step={1} value={o.size} onChange={(e) => patch({ size: Number(e.target.value) }, false)} />
          </Row>
          <Row label="พิกัด">
            <NumIn value={o.x} onChange={(x) => x !== null && patch({ x })} />
            <NumIn value={o.y} onChange={(y) => y !== null && patch({ y })} />
          </Row>
          <Check2 label="ตัวเอียงแบบคณิต" on={o.italic} set={(italic) => patch({ italic })} />
          <Check2 label="ขีดบน" on={o.bar} set={(bar) => patch({ bar })} />
        </>
      )}
      <div className="flex gap-2 mt-2">
        <button type="button" className="ge-btn ge-btn-sm" onClick={() => patch({ hidden: !o.hidden })}>
          {o.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} {o.hidden ? 'แสดง' : 'ซ่อน'}
        </button>
        <button type="button" className="ge-btn ge-btn-sm ge-danger" onClick={remove}>
          <Trash2 className="w-4 h-4" /> ลบ
        </button>
      </div>
    </div>
  );
}

