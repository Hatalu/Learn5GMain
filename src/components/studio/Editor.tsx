'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  CloudOff,
  Copy,
  Crown,
  Download,
  Eye,
  FileImage,
  FileUp,
  Group,
  LayoutDashboard,
  FileText,
  Globe,
  Keyboard,
  Loader2,
  Lock,
  Maximize,
  Menu,
  MonitorPlay,
  Pencil,
  Plus,
  Redo2,
  Scaling,
  Trash2,
  Undo2,
  Ungroup,
  Unlock,
  Wand2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/game-creator/media';
import { cleanTitle } from '@/lib/game-creator/quiz';
import { FREE_DESIGN_LIMIT, creatorTier } from '@/lib/game-creator/quota';
import { blankPage, cleanSrc, makeChar, makeGraph, makeImage, makeLine, makeMath, makeShape, makeText, MAX_PAGES, sanitizeDesign, sizeLabel, uid, type Design, type EditMode, type Item, type Page } from '@/lib/studio/doc';
import { cleanGraph, newSpec, type GraphSpec } from '@/lib/studio/graph';
import { FLOW_GAP, cleanFlowHtml, flowIsEmpty } from '@/lib/studio/flow';
import { ImportDialog, type ImportHow } from './ImportDialog';
import { appendFlow, designFromImport, importAsFlow, importKind, importNote, importPdfPages, isImportable, takePendingImport, uploadSink } from './importFile';
import { texToHtml } from '@/components/creator/math/MathText';
import { MathPopover } from '@/components/creator/math/MathPopover';
import '@/components/creator/creator.css';
import type { CharLook } from '@/lib/studio/char';
import { exportPdf, exportPng, makeThumb } from '@/lib/studio/export';
import { PageView, type EditCell, type EditText } from './render';
import { GraphEditor } from './GraphEditor';
import { WordEditor, type WordHandle } from './WordEditor';
import { Inspector } from './Inspector';
import { CHARS_EVENT, Panels, RAIL, SizePicker, type PanelId } from './Panels';
import { CharBuilder } from './CharBuilder';
import { Presenter } from './Presenter';
import { ShortcutHelp } from './Shortcuts';
import { Pop } from './ui';
import { JoinButton } from '@/components/membership/JoinButton';
import './studio.css';

type Handle = [-1 | 0 | 1, -1 | 0 | 1];
type Box = { x: number; y: number; w: number; h: number };
type Drag =
  | { kind: 'move'; pi: number; id: string; ids: string[]; orig: Record<string, [number, number]>; sx: number; sy: number; base: Design; snap: Design; moved: boolean; was: boolean; drill: boolean; cell?: [number, number] }
  | { kind: 'gscale'; pi: number; ids: string[]; h: Handle; sx: number; sy: number; box: Box; orig: Item[]; snap: Design; moved: boolean }
  | { kind: 'marquee'; pi: number; sx: number; sy: number; add: boolean; moved: boolean; snap: Design; id: string }
  | { kind: 'resize'; pi: number; id: string; h: Handle; sx: number; sy: number; o: Item; snap: Design; moved: boolean }
  | { kind: 'rotate'; pi: number; id: string; cx: number; cy: number; snap: Design; moved: boolean };

export interface Ctl {
  doc: Design;
  page: Page;
  pageIdx: number;
  W: number;
  H: number;
  sel: Item | null;
  /** ชิ้นที่เลือกทั้งหมด (เลือกหลายชิ้นด้วย Shift / ลากคลุม / Ctrl+A) */
  sels: Item[];
  readOnly: boolean;
  selectIds: (ids: string[]) => void;
  removeMany: (ids: string[]) => void;
  duplicateMany: (ids: string[]) => void;
  group: (ids: string[]) => void;
  ungroup: (ids: string[]) => void;
  alignMany: (ids: string[], where: 'l' | 'c' | 'r' | 't' | 'm' | 'b') => void;
  distribute: (ids: string[], axis: 'h' | 'v') => void;
  lockMany: (ids: string[], locked: boolean) => void;
  /** สมการ (itemId = แก้ชิ้นเดิม) */
  openMath: (itemId?: string, tex?: string) => void;
  /** กราฟ/รูปคณิต (spec = เริ่มจากแม่แบบ/สมการ) */
  openGraph: (spec?: GraphSpec | null, itemId?: string) => void;
  add: (it: Item) => void;
  /** ใส่หลายชิ้นพร้อมกันที่ตำแหน่งที่กำหนดไว้แล้ว (ตัวสร้างใบงาน) */
  addMany: (items: Item[]) => void;
  update: (id: string, patch: Partial<Item>, key?: string) => void;
  updatePage: (patch: Partial<Page>, all?: boolean, key?: string) => void;
  commit: (next: Design, key?: string) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  order: (id: string, to: 'front' | 'back' | 'up' | 'down') => void;
  alignTo: (id: string, where: 'l' | 'c' | 'r' | 't' | 'm' | 'b') => void;
  goPage: (i: number) => void;
  addPage: (p?: Page, at?: number) => void;
  dupPage: (i: number) => void;
  delPage: (i: number) => void;
  movePage: (i: number, dir: -1 | 1) => void;
  upload: (files: FileList | File[]) => Promise<void>;
  uploading: boolean;
  editText: (id: string) => void;
  /** เปิดหน้าต่างแต่งตัวละคร (itemId = แก้ตัวที่อยู่บนหน้า) */
  openChar: (look: CharLook, itemId?: string) => void;
  canUpload: boolean;
}

const HISTORY = 80;
const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};
/** สไตล์ของชิ้นงาน (สี เส้น ฟอนต์ เอฟเฟกต์) ไม่รวมตำแหน่งและเนื้อหา ใช้กับคัดลอก/วางสไตล์ */
const NOT_STYLE = new Set(['id', 'x', 'y', 'w', 'h', 'rot', 'locked', 'flip', 'text', 'cells', 'src', 'look', 'sticker', 'shape', 'kind', 'a', 'b', 'c', 'style']);
const styleOf = (it: Item): Partial<Item> => Object.fromEntries(Object.entries(it).filter(([k]) => !NOT_STYLE.has(k))) as Partial<Item>;
/** กรอบรวมของหลายชิ้น (ไม่คิดการหมุน) */
function boxOf(its: { x: number; y: number; w: number; h: number }[]): Box {
  const x = Math.min(...its.map((i) => i.x));
  const y = Math.min(...its.map((i) => i.y));
  return { x, y, w: Math.max(...its.map((i) => i.x + i.w)) - x, h: Math.max(...its.map((i) => i.y + i.h)) - y };
}
/** เพิ่มชิ้นที่อยู่กลุ่มเดียวกัน (Ctrl+G) เข้าไปในชุดที่เลือก */
function withGroups(items: Item[], ids: string[]): string[] {
  const gs = new Set(items.filter((x) => ids.includes(x.id) && x.g).map((x) => x.g));
  return items.filter((x) => ids.includes(x.id) || (x.g && gs.has(x.g))).map((x) => x.id);
}
function moveDrag(pi: number, id: string, ids: string[], pg: Page, base: Design, snap: Design, p: { x: number; y: number }, was: boolean, drill: boolean): Extract<Drag, { kind: 'move' }> {
  const orig: Record<string, [number, number]> = {};
  for (const x of pg.items) if (ids.includes(x.id) && !x.locked) orig[x.id] = [x.x, x.y];
  return { kind: 'move', pi, id, ids: Object.keys(orig), orig, sx: p.x, sy: p.y, base, snap, moved: false, was, drill };
}
/** ขนาดกล่องของสมการ (วัดจากผล KaTeX จริง) */
function measureTex(tex: string, size: number): [number, number] {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;left:-99999px;top:0;font-size:${size}px;line-height:1.2;white-space:nowrap`;
  el.innerHTML = texToHtml(tex, false, true);
  document.body.appendChild(el);
  const r = [Math.ceil(el.offsetWidth) + 16, Math.ceil(el.offsetHeight) + 12] as [number, number];
  el.remove();
  return r;
}
const DESIGN_COLS = 'id, owner_id, owner_name, title, content, is_public, thumb';
const mapItems = (d: Design, pi: number, fn: (items: Item[]) => Item[]): Design => ({ ...d, pages: d.pages.map((p, i) => (i === pi ? { ...p, items: fn(p.items) } : p)) });

export function StudioEditor({ id }: { id: string }) {
  const { user, profile, isLoading } = useAuth();
  const tier = creatorTier(!!user, profile);
  const supabase = useMemo(() => createClient(), []);

  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'denied'>('loading');
  const [doc, setDoc] = useState<Design | null>(null);
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [ownerName, setOwnerName] = useState('');
  const [readOnly, setReadOnly] = useState(true);
  const [pageIdx, setPageIdx] = useState(0);
  const [selIds, setSelIds] = useState<string[]>([]);
  const selId = selIds.length === 1 ? selIds[0] : null;
  const setSelId = useCallback((v: string | null) => setSelIds(v ? [v] : []), []);
  const [marquee, setMarquee] = useState<(Box & { pi: number }) | null>(null);
  const [mathDlg, setMathDlg] = useState<{ tex: string; itemId?: string; done?: (tex: string) => void; insert?: string } | null>(null);
  const [graphDlg, setGraphDlg] = useState<{ spec: GraphSpec; itemId?: string; done?: (s: GraphSpec) => void } | null>(null);
  const word = useRef<WordHandle>(null);
  const [topEl, setTopEl] = useState<HTMLDivElement | null>(null);
  const [railEl, setRailEl] = useState<HTMLDivElement | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [cell, setCell] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(0.5);
  const zoomRef = useRef(0.5);
  zoomRef.current = zoom;
  const [autoFit, setAutoFit] = useState(true);
  const [panel, setPanel] = useState<PanelId | null>('template');
  const [save, setSave] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [exporting, setExporting] = useState<null | { kind: 'png' | 'pdf' | 'png1'; step: number }>(null);
  const [copying, setCopying] = useState(false);
  const [present, setPresent] = useState<number | null>(null);
  const [charDlg, setCharDlg] = useState<{ look: CharLook; itemId?: string; flip: boolean } | null>(null);

  const past = useRef<Design[]>([]);
  const future = useRef<Design[]>([]);
  const lastKey = useRef<{ key: string; t: number } | null>(null);
  const docRef = useRef<Design | null>(null);
  docRef.current = doc;
  const drag = useRef<Drag | null>(null);
  const pageEls = useRef(new Map<number, HTMLDivElement>());
  const secEls = useRef(new Map<number, HTMLElement>());
  const wrapEl = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const stageEl = useRef<HTMLDivElement>(null);
  const thumbEl = useRef<HTMLDivElement>(null);
  const clip = useRef<Item[] | null>(null);
  const styleClip = useRef<Partial<Item> | null>(null);
  const [help, setHelp] = useState(false);
  const lastThumb = useRef(0);
  const loaded = useRef(false);
  const needThumb = useRef(false);
  /** ชิ้นที่กำลังพิมพ์อยู่ (บันทึกข้อความทุกทางที่การแก้จบ ไม่พึ่ง blur อย่างเดียว เพราะคลิกพื้นที่ว่างแล้วกล่องหายก่อน blur) */
  const editing = useRef<{ id: string; pi: number; cell: [number, number] | null } | null>(null);

  const say = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? null : t)), 3200);
  }, []);

  /* ------------------------------------------------------------ โหลด */
  // โหลดครั้งเดียวต่อสื่อ/ผู้ใช้: ออบเจกต์ user เปลี่ยนทุกครั้งที่ต่ออายุโทเคน (ราวทุกชั่วโมง/หลังบันทึกพลาด)
  // เดิมผูกกับ user ทั้งก้อน = โหลดสื่อจากเซิร์ฟเวอร์ทับงานที่กำลังพิมพ์ (ตัวหนังสือหาย + จอค้าง)
  const userId = user?.id;
  const loadedFor = useRef('');
  useEffect(() => {
    if (isLoading) return;
    if (!user) return setStatus('denied');
    if (loadedFor.current === `${id}:${user.id}`) return;
    loadedFor.current = `${id}:${user.id}`;
    let off = false;
    let done = false;
    (async () => {
      const { data, error } = await supabase.from('user_designs').select(DESIGN_COLS).eq('id', id).maybeSingle();
      if (off) return;
      done = true;
      if (error || !data) return setStatus(error && /user_designs|schema cache/i.test(error.message) ? 'missing' : 'denied');
      setDoc(sanitizeDesign(data.content));
      setTitle(data.title);
      setIsPublic(!!data.is_public);
      setOwnerName(data.owner_name || '');
      const ro = data.owner_id !== user.id;
      setReadOnly(ro);
      if (ro) setPanel(null);
      setStatus('ready');
      loaded.current = false;
      needThumb.current = !data.thumb && !ro;
    })();
    return () => {
      off = true;
      // ยกเลิกก่อนโหลดเสร็จ (เช่น effect รันซ้ำใน strict mode) ต้องโหลดใหม่รอบถัดไป
      if (!done) loadedFor.current = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId, isLoading, supabase]);

  const W = doc?.size.w ?? 794;
  const H = doc?.size.h ?? 1123;
  const ap = doc ? Math.min(pageIdx, doc.pages.length - 1) : 0;
  const page = doc ? doc.pages[ap] : null;
  const sel = (page && selId && page.items.find((i) => i.id === selId)) || null;
  const sels = useMemo(() => (page ? page.items.filter((i) => selIds.includes(i.id)) : []), [page, selIds]);
  const mode: EditMode = doc?.mode ?? 'canvas';

  /* ------------------------------------------------------------ ประวัติ (ย้อนกลับ/ทำซ้ำ) */
  const commit = useCallback((next: Design, key?: string) => {
    const prev = docRef.current;
    if (!prev || prev === next) return;
    const now = Date.now();
    const same = key && lastKey.current?.key === key && now - lastKey.current.t < 900;
    if (!same) {
      past.current.push(prev);
      if (past.current.length > HISTORY) past.current.shift();
      future.current = [];
    }
    lastKey.current = key ? { key, t: now } : null;
    setDoc(next);
  }, []);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev || !docRef.current) return;
    future.current.push(docRef.current);
    lastKey.current = null;
    editing.current = null;
    setEditId(null);
    setDoc(prev);
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next || !docRef.current) return;
    past.current.push(docRef.current);
    lastKey.current = null;
    editing.current = null;
    setEditId(null);
    setDoc(next);
  }, []);

  const mapPage = useCallback(
    (fn: (p: Page) => Page, key?: string) => {
      const d = docRef.current;
      if (!d) return;
      const pi = Math.min(pageIdx, d.pages.length - 1);
      commit({ ...d, pages: d.pages.map((p, i) => (i === pi ? fn(p) : p)) }, key);
    },
    [commit, pageIdx]
  );

  const finishEdit = useCallback(() => {
    const e = editing.current;
    const el = editRef.current;
    editing.current = null;
    setEditId(null);
    setCell(null);
    const d = docRef.current;
    if (!e || !el || !d || !d.pages[e.pi]) return;
    const text = el.innerText.replace(/\n$/, '');
    const it = d.pages[e.pi].items.find((x) => x.id === e.id);
    if (!it) return;
    let patch: Partial<Item> | null = null;
    if (it.type === 'text' && !e.cell && text !== it.text) patch = { text: text.slice(0, 4000) };
    if (it.type === 'table' && e.cell) {
      const [r, c] = e.cell;
      if (it.cells[r] && text !== it.cells[r][c]) patch = { cells: it.cells.map((row, i) => (i === r ? row.map((v, j) => (j === c ? text.slice(0, 400) : v)) : row)) };
    }
    if (patch) commit(mapItems(d, e.pi, (items) => items.map((x) => (x.id === it.id ? ({ ...x, ...patch } as Item) : x))));
  }, [commit]);

  const startEdit = useCallback(
    (iid: string, pi: number, c: [number, number] | null = null) => {
      if (editing.current && (editing.current.id !== iid || editing.current.cell?.join() !== c?.join())) finishEdit();
      editing.current = { id: iid, pi, cell: c };
      setPageIdx(pi);
      setSelId(iid);
      setEditId(iid);
      setCell(c);
    },
    [finishEdit]
  );

  const scrollToPage = useCallback((i: number) => {
    requestAnimationFrame(() => secEls.current.get(i)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, []);

  /* ------------------------------------------------------------ คำสั่งแก้ไข */
  const ctl: Ctl | null = useMemo(() => {
    if (!doc || !page) return null;
    const fitScale = Math.min(1.6, Math.max(0.45, Math.min(W, H) / 794));
    const place = (raw: Item): Item => {
      let it = { ...raw, id: uid() } as Item;
      if (raw.x === 0 && raw.y === 0) {
        if (fitScale !== 1) {
          it = { ...it, w: it.w * fitScale, h: it.h * fitScale } as Item;
          if (it.type === 'text' || it.type === 'table') it = { ...it, size: Math.round(it.size * fitScale) };
        }
        let x = (W - it.w) / 2;
        let y = (H - it.h) / 2;
        while (page.items.some((o) => Math.abs(o.x - x) < 2 && Math.abs(o.y - y) < 2)) {
          x += 24;
          y += 24;
        }
        it = { ...it, x, y };
      }
      return it;
    };
    const update = (iid: string, patch: Partial<Item>, key?: string) => mapPage((p) => ({ ...p, items: p.items.map((x) => (x.id === iid ? ({ ...x, ...patch } as Item) : x)) }), key ? `${iid}:${key}` : undefined);
    const full = () => doc.pages.length >= MAX_PAGES && (say(`สื่อ 1 ชิ้นมีได้สูงสุด ${MAX_PAGES} หน้า`), true);
    return {
      doc,
      page,
      pageIdx: ap,
      W,
      H,
      sel,
      readOnly,
      add: (raw) => {
        const it = place(raw);
        finishEdit();
        mapPage((p) => ({ ...p, items: [...p.items, it] }));
        setSelId(it.id);
      },
      addMany: (raws) => {
        const items = raws.map((r) => ({ ...r, id: uid() }) as Item);
        finishEdit();
        mapPage((p) => ({ ...p, items: [...p.items, ...items] }));
        setSelId(items[items.length - 1]?.id ?? null);
      },
      update,
      updatePage: (patch, all, key) => {
        if (all) commit({ ...doc, pages: doc.pages.map((p) => ({ ...p, ...patch })) }, key);
        else mapPage((p) => ({ ...p, ...patch }), key);
      },
      commit,
      remove: (iid) => {
        finishEdit();
        mapPage((p) => ({ ...p, items: p.items.filter((x) => x.id !== iid) }));
        setSelId(null);
      },
      duplicate: (iid) => {
        const o = page.items.find((x) => x.id === iid);
        if (!o) return;
        const c = { ...structuredClone(o), id: uid(), x: o.x + 24, y: o.y + 24, locked: false } as Item;
        mapPage((p) => ({ ...p, items: [...p.items, c] }));
        setSelId(c.id);
      },
      order: (iid, to) =>
        mapPage((p) => {
          const i = p.items.findIndex((x) => x.id === iid);
          if (i < 0) return p;
          const items = [...p.items];
          const [it] = items.splice(i, 1);
          const j = to === 'front' ? items.length : to === 'back' ? 0 : to === 'up' ? Math.min(items.length, i + 1) : Math.max(0, i - 1);
          items.splice(j, 0, it);
          return { ...p, items };
        }),
      alignTo: (iid, where) => {
        const o = page.items.find((x) => x.id === iid);
        if (!o) return;
        const m = Math.round(Math.min(W, H) * 0.05);
        const patch: Partial<Item> =
          where === 'l' ? { x: m } : where === 'c' ? { x: (W - o.w) / 2 } : where === 'r' ? { x: W - o.w - m } : where === 't' ? { y: m } : where === 'm' ? { y: (H - o.h) / 2 } : { y: H - o.h - m };
        update(iid, patch);
      },
      goPage: (i) => {
        finishEdit();
        // ไม่ตัดตามจำนวนหน้าตอนนี้ (เพิ่งเพิ่มหน้าในคำสั่งเดียวกันได้) จอจะตัดให้เองตอนวาด
        const k = Math.max(0, Math.min(MAX_PAGES - 1, i));
        setPageIdx(k);
        setSelId(null);
        scrollToPage(k);
      },
      addPage: (p, at) => {
        if (full()) return;
        const k = at ?? ap + 1;
        const np = p ?? { ...blankPage(), bg: { ...page.bg }, border: { ...page.border } };
        commit({ ...doc, pages: [...doc.pages.slice(0, k), np, ...doc.pages.slice(k)] });
        setPageIdx(k);
        setSelId(null);
        scrollToPage(k);
      },
      dupPage: (i) => {
        if (full()) return;
        const src = doc.pages[i];
        const cp: Page = { ...structuredClone(src), id: uid(), items: src.items.map((x) => ({ ...structuredClone(x), id: uid() })) };
        commit({ ...doc, pages: [...doc.pages.slice(0, i + 1), cp, ...doc.pages.slice(i + 1)] });
        setPageIdx(i + 1);
        setSelId(null);
        scrollToPage(i + 1);
      },
      delPage: (i) => {
        if (doc.pages.length <= 1) return say('ต้องมีอย่างน้อย 1 หน้า');
        finishEdit();
        commit({ ...doc, pages: doc.pages.filter((_, k) => k !== i) });
        setPageIdx((p) => Math.max(0, Math.min(p >= i ? p - 1 : p, doc.pages.length - 2)));
        setSelId(null);
      },
      movePage: (i, dir) => {
        const j = i + dir;
        if (j < 0 || j >= doc.pages.length) return;
        const pages = [...doc.pages];
        [pages[i], pages[j]] = [pages[j], pages[i]];
        commit({ ...doc, pages });
        setPageIdx(j);
        scrollToPage(j);
      },
      upload: async (files) => {
        if (!user) return;
        const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 6);
        if (!list.length) return say('เลือกไฟล์รูป JPG PNG WEBP หรือ GIF');
        setUploading(true);
        try {
          for (const f of list) {
            const m = await uploadImage(user.id, f, 1600);
            const k = Math.min(1, (W * 0.6) / (m.w || 600), (H * 0.6) / (m.h || 600));
            const w = Math.max(40, Math.round((m.w || 600) * k));
            const h = Math.max(40, Math.round((m.h || 600) * k));
            const placed = { ...makeImage(m.url, w, h), x: (W - w) / 2, y: (H - h) / 2 };
            const d = docRef.current!;
            commit(mapItems(d, Math.min(pageIdx, d.pages.length - 1), (items) => [...items, placed]));
            setSelId(placed.id);
          }
        } catch (e) {
          say(e instanceof Error ? e.message : 'อัปโหลดรูปไม่สำเร็จ');
        } finally {
          setUploading(false);
        }
      },
      uploading,
      editText: (iid) => startEdit(iid, ap),
      openChar: (look, itemId) => {
        const it = itemId ? page.items.find((x) => x.id === itemId) : undefined;
        setCharDlg({ look, itemId, flip: it?.type === 'char' ? it.flip : false });
      },
      canUpload: tier !== 'guest' && !readOnly,
      sels,
      selectIds: (ids) => setSelIds(ids),
      removeMany: (ids) => {
        finishEdit();
        mapPage((p) => ({ ...p, items: p.items.filter((x) => !ids.includes(x.id) || x.locked) }));
        setSelIds([]);
      },
      duplicateMany: (ids) => {
        const groups = new Map<string, string>();
        const copies = page.items
          .filter((x) => ids.includes(x.id))
          .map((o) => {
            const c = { ...structuredClone(o), id: uid(), x: o.x + 24, y: o.y + 24, locked: false } as Item;
            if (o.g) {
              if (!groups.has(o.g)) groups.set(o.g, uid().slice(0, 10));
              c.g = groups.get(o.g);
            }
            return c;
          });
        mapPage((p) => ({ ...p, items: [...p.items, ...copies] }));
        setSelIds(copies.map((c) => c.id));
      },
      group: (ids) => {
        if (ids.length < 2) return;
        const g = uid().slice(0, 10);
        mapPage((p) => ({ ...p, items: p.items.map((x) => (ids.includes(x.id) ? ({ ...x, g } as Item) : x)) }));
      },
      ungroup: (ids) =>
        mapPage((p) => ({
          ...p,
          items: p.items.map((x) => {
            if (!ids.includes(x.id) || !x.g) return x;
            const { g: _g, ...rest } = x;
            void _g;
            return rest as Item;
          }),
        })),
      alignMany: (ids, where) => {
        const its = page.items.filter((x) => ids.includes(x.id) && !x.locked);
        if (!its.length) return;
        const b = boxOf(its);
        mapPage((p) => ({
          ...p,
          items: p.items.map((x) => {
            if (!its.includes(x)) return x;
            const d: Partial<Item> =
              where === 'l' ? { x: b.x } : where === 'c' ? { x: b.x + (b.w - x.w) / 2 } : where === 'r' ? { x: b.x + b.w - x.w } : where === 't' ? { y: b.y } : where === 'm' ? { y: b.y + (b.h - x.h) / 2 } : { y: b.y + b.h - x.h };
            return { ...x, ...d } as Item;
          }),
        }));
      },
      distribute: (ids, axis) => {
        const its = page.items.filter((x) => ids.includes(x.id) && !x.locked).sort((a, b) => (axis === 'h' ? a.x - b.x : a.y - b.y));
        if (its.length < 3) return;
        const first = its[0];
        const last = its[its.length - 1];
        const span = axis === 'h' ? last.x + last.w - first.x : last.y + last.h - first.y;
        const total = its.reduce((n, x) => n + (axis === 'h' ? x.w : x.h), 0);
        const gap = (span - total) / (its.length - 1);
        let at = axis === 'h' ? first.x : first.y;
        const pos = new Map<string, number>();
        for (const x of its) {
          pos.set(x.id, at);
          at += (axis === 'h' ? x.w : x.h) + gap;
        }
        mapPage((p) => ({ ...p, items: p.items.map((x) => (pos.has(x.id) ? ({ ...x, [axis === 'h' ? 'x' : 'y']: pos.get(x.id) } as Item) : x)) }));
      },
      lockMany: (ids, locked) => mapPage((p) => ({ ...p, items: p.items.map((x) => (ids.includes(x.id) ? ({ ...x, locked } as Item) : x)) })),
      openMath: (itemId, tex) => {
        const it = itemId ? page.items.find((x) => x.id === itemId) : undefined;
        setMathDlg({ tex: it?.type === 'math' ? it.tex : tex ?? '', itemId });
      },
      openGraph: (spec, itemId) => {
        const it = itemId ? page.items.find((x) => x.id === itemId) : undefined;
        setGraphDlg({ spec: it?.type === 'graph' ? it.spec : spec ?? newSpec('grid'), itemId });
      },
    };
  }, [doc, page, ap, pageIdx, W, H, sel, sels, readOnly, mapPage, commit, user, uploading, say, tier, finishEdit, startEdit, scrollToPage]);

  /* ------------------------------------------------------------ ซูมพอดีจอ */
  const fit = useCallback(() => {
    const el = wrapEl.current;
    if (!el || !doc) return;
    const z = Math.min((el.clientWidth - 64) / W, (el.clientHeight - 96) / H);
    setZoom(Math.max(0.1, Math.min(2, z)));
  }, [W, H, doc]);
  useEffect(() => {
    if (!autoFit) return;
    fit();
    const ro = new ResizeObserver(() => fit());
    if (wrapEl.current) ro.observe(wrapEl.current);
    return () => ro.disconnect();
  }, [fit, autoFit, status]);

  /* ------------------------------------------------------------ Ctrl + ลูกกลิ้ง = ย่อ/ขยายกระดาษ รอบจุดใต้เมาส์ */
  // React ผูก wheel แบบ passive จึง preventDefault ไม่ได้ (เบราว์เซอร์จะซูมทั้งหน้าเว็บแทน) ต้องผูกเอง
  // จุดบนกระดาษ (หน่วยกระดาษ เทียบแผ่นแรก) ที่ต้องอยู่ใต้เมาส์หลังซูม
  const zoomAt = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const firstSheet = () => wrapEl.current?.querySelector<HTMLElement>('.st-word, .st-paper-wrap') ?? null;
  useEffect(() => {
    const el = wrapEl.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const z0 = zoomRef.current;
      const z1 = Math.max(0.1, Math.min(3, z0 * Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.0025)));
      if (z1 === z0) return;
      const b = firstSheet()?.getBoundingClientRect();
      // หลายครั้งก่อนวาดใหม่: ใช้จุดบนกระดาษของครั้งแรก (ตำแหน่งบนจอยังเป็นของซูมเดิม)
      const px = zoomAt.current?.px ?? (b ? (e.clientX - b.left) / z0 : 0);
      const py = zoomAt.current?.py ?? (b ? (e.clientY - b.top) / z0 : 0);
      zoomAt.current = b ? { mx: e.clientX, my: e.clientY, px, py } : null;
      zoomRef.current = z1;
      setAutoFit(false);
      setZoom(z1);
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [status]);
  useLayoutEffect(() => {
    const a = zoomAt.current;
    const el = wrapEl.current;
    const b = firstSheet()?.getBoundingClientRect();
    zoomAt.current = null;
    if (!a || !el || !b) return;
    el.scrollLeft += b.left + a.px * zoom - a.mx;
    el.scrollTop += b.top + a.py * zoom - a.my;
  }, [zoom]);

  /* ------------------------------------------------------------ หน้าที่กำลังดู ตามการเลื่อน (เหมือน Canva) */
  const onScroll = () => {
    if (drag.current || editing.current || selIds.length || !wrapEl.current) return;
    const r = wrapEl.current.getBoundingClientRect();
    let best = ap;
    let bestV = -1;
    secEls.current.forEach((el, i) => {
      const b = el.getBoundingClientRect();
      const v = Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top);
      if (v > bestV) {
        bestV = v;
        best = i;
      }
    });
    if (best !== ap) setPageIdx(best);
  };

  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    document.fonts?.ready.then(() => setFontsReady(true));
  }, []);
  /* ------------------------------------------------------------ ความสูงของกล่องข้อความตามเนื้อหา (ทุกหน้า) */
  useLayoutEffect(() => {
    const d = docRef.current;
    if (!d) return;
    const fix = new Map<number, Map<string, Partial<Item>>>();
    const put = (pi: number, id: string, patch: Partial<Item>) => {
      if (!fix.has(pi)) fix.set(pi, new Map());
      fix.get(pi)!.set(id, patch);
    };
    pageEls.current.forEach((el, pi) => {
      const pg = d.pages[pi];
      if (!pg) return;
      el.querySelectorAll<HTMLElement>('[data-item][data-type="text"]').forEach((node) => {
        const it = pg.items.find((x) => x.id === node.dataset.item);
        const h = node.offsetHeight;
        if (it && h && Math.abs(it.h - h) > 0.5) put(pi, it.id, { h });
      });
      // สมการ: กล่องพอดีผลวาดจริง (ฟอนต์สูตรโหลดเสร็จทีหลังขนาดเปลี่ยนได้) ยึดกึ่งกลางเดิม
      el.querySelectorAll<HTMLElement>('[data-item][data-type="math"]').forEach((node) => {
        const it = pg.items.find((x) => x.id === node.dataset.item);
        const inner = node.querySelector<HTMLElement>('[data-math]');
        if (!it || !inner || !inner.offsetWidth) return;
        const w = inner.offsetWidth + 16;
        const h = inner.offsetHeight + 12;
        if (Math.abs(it.w - w) > 1 || Math.abs(it.h - h) > 1) put(pi, it.id, { w, h, x: it.x + (it.w - w) / 2, y: it.y + (it.h - h) / 2 });
      });
    });
    if (fix.size) setDoc({ ...d, pages: d.pages.map((p, i) => (fix.has(i) ? { ...p, items: p.items.map((x) => (fix.get(i)!.has(x.id) ? ({ ...x, ...fix.get(i)!.get(x.id)! } as Item) : x)) } : p)) });
    // วัดเฉพาะตอนเนื้อหาเปลี่ยน/จบการแก้/ฟอนต์โหลดเสร็จ (เดิมวัดทุกครั้งที่วาดใหม่ รวมตอนลากเมาส์ ทำให้กระตุก)
  }, [doc, status, editId, fontsReady]);

  /* ------------------------------------------------------------ บันทึกอัตโนมัติ */
  /*
   * บันทึกทีละครั้ง (ครั้งใหม่ระหว่างกำลังบันทึก = รอแล้วบันทึกฉบับล่าสุดต่อ ไม่ยิงซ้อนกัน)
   * พลาด = ลองใหม่ 3 รอบ (โทเคนหมดอายุระหว่างทำงานนาน ขอใหม่ก่อน) · รูปปกทำทีหลังแยกคำขอ ไม่ขวางการบันทึกงาน
   */
  const [thumbDoc, setThumbDoc] = useState<Design | null>(null);
  const saving = useRef(false);
  const saveAgain = useRef(false);
  const doSaveRef = useRef<() => Promise<void>>(async () => undefined);
  const doSave = useCallback(async () => {
    if (saving.current) {
      saveAgain.current = true;
      return;
    }
    const d = docRef.current;
    if (!d || readOnly) return;
    saving.current = true;
    setSave('saving');
    try {
      const body = { title: cleanTitle(title) || 'สื่อไม่มีชื่อ', content: d, page_count: Math.min(30, d.pages.length), is_public: isPublic };
      let error: { message: string; code?: string } | null = null;
      for (let i = 0; i < 3; i++) {
        ({ error } = await supabase.from('user_designs').update(body).eq('id', id));
        if (!error) break;
        console.warn('[studio] save failed', error.code, error.message);
        if (/jwt|token|auth|401|PGRST30/i.test(`${error.code} ${error.message}`)) await supabase.auth.refreshSession().catch(() => null);
        await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
      }
      setSave((s) => (error ? 'error' : docRef.current === d && s === 'saving' ? 'saved' : 'dirty'));
      // รูปปก (html-to-image หนัก) ทุก 2 นาที และเฉพาะตอนอยู่หน้านี้ วาดหน้าแรกนอกจอเฉพาะตอนถ่าย
      if (!error && Date.now() - lastThumb.current > 120000 && document.visibilityState === 'visible') {
        lastThumb.current = Date.now();
        setThumbDoc(d);
        await new Promise((r) => setTimeout(r, 150));
        const t = thumbEl.current ? await Promise.race([makeThumb(thumbEl.current, d.size.w, d.size.h).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 8000))]) : null;
        setThumbDoc(null);
        if (t) await supabase.from('user_designs').update({ thumb: t }).eq('id', id);
      }
    } finally {
      saving.current = false;
    }
    if (saveAgain.current) {
      saveAgain.current = false;
      void doSaveRef.current();
    }
  }, [readOnly, title, isPublic, supabase, id]);
  doSaveRef.current = doSave;

  useEffect(() => {
    if (status !== 'ready' || readOnly || !doc) return;
    if (!loaded.current) {
      loaded.current = true;
      // สื่อใหม่ยังไม่มีรูปปก: ทำปกให้เลยหลังเปิด (การ์ดในคลังจะได้มีภาพ)
      if (!needThumb.current) return;
      needThumb.current = false;
      const t0 = setTimeout(doSave, 1500);
      return () => clearTimeout(t0);
    }
    setSave('dirty');
    const t = setTimeout(doSave, 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, title, isPublic]);

  useEffect(() => {
    if (save !== 'dirty' && save !== 'saving' && save !== 'error') return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [save]);

  /* ------------------------------------------------------------ เมาส์/นิ้ว: เลือก ย้าย ย่อขยาย หมุน */
  const ptIn = (pi: number, e: { clientX: number; clientY: number }) => {
    const r = pageEls.current.get(pi)!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
  };

  const onMove = useCallback(
    (e: PointerEvent) => {
      const g = drag.current;
      const el = g && pageEls.current.get(g.pi);
      if (!g || !el) return;
      const r = el.getBoundingClientRect();
      const p = { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
      if (g.kind === 'marquee') {
        const dx = p.x - g.sx;
        const dy = p.y - g.sy;
        if (!g.moved && Math.hypot(dx * zoom, dy * zoom) < 4) return;
        g.moved = true;
        setMarquee({ pi: g.pi, x: Math.min(g.sx, p.x), y: Math.min(g.sy, p.y), w: Math.abs(dx), h: Math.abs(dy) });
        return;
      }
      if (g.kind === 'gscale') {
        g.moved = true;
        const [hx, hy] = g.h;
        const b = g.box;
        const dx = p.x - g.sx;
        const dy = p.y - g.sy;
        const s = Math.max(0.05, 1 + (hx * dx * b.w + hy * dy * b.h) / (b.w * b.w + b.h * b.h));
        const ax = hx > 0 ? b.x : b.x + b.w;
        const ay = hy > 0 ? b.y : b.y + b.h;
        const scaled = new Map(
          g.orig.map((o) => {
            const q: Record<string, unknown> = { x: ax + (o.x - ax) * s, y: ay + (o.y - ay) * s, w: o.w * s, h: o.h * s };
            if ('size' in o) q.size = Math.max(6, Math.round((o as { size: number }).size * s * 10) / 10);
            return [o.id, q];
          })
        );
        setDoc(mapItems(g.snap, g.pi, (items) => items.map((x) => (scaled.has(x.id) ? ({ ...x, ...scaled.get(x.id) } as Item) : x))));
        return;
      }
      const base = (g.kind === 'move' ? g.base : g.snap).pages[g.pi];
      const o = base?.items.find((x) => x.id === g.id);
      if (!o) return;
      let patch: Partial<Item> = {};
      const gx: number[] = [];
      const gy: number[] = [];
      if (g.kind === 'move') {
        const dx = p.x - g.sx;
        const dy = p.y - g.sy;
        if (!g.moved && Math.hypot(dx * zoom, dy * zoom) < 4) return;
        g.moved = true;
        const moving = base.items.filter((x) => g.ids.includes(x.id));
        const ob = boxOf(moving.map((x) => ({ ...x, x: g.orig[x.id][0], y: g.orig[x.id][1] })));
        let nx = ob.x + dx;
        let ny = ob.y + dy;
        // Ctrl ค้าง = ปิดการดูดเข้าแนว (Alt ใช้ลากทำสำเนาแบบ Canva)
        if (!(e.ctrlKey || e.metaKey)) {
          const th = 7 / zoom;
          const others = base.items.filter((x) => !g.ids.includes(x.id));
          const cx = [0, W / 2, W, ...others.flatMap((x) => [x.x, x.x + x.w / 2, x.x + x.w])];
          const cy = [0, H / 2, H, ...others.flatMap((x) => [x.y, x.y + x.h / 2, x.y + x.h])];
          const best = (cands: number[], lines: number[]) => {
            let b: { d: number; c: number; off: number } | null = null;
            for (const c of cands)
              for (let k = 0; k < lines.length; k++) {
                const dd = Math.abs(c - lines[k]);
                if (dd < th && (!b || dd < b.d)) b = { d: dd, c, off: c - lines[k] };
              }
            return b;
          };
          const bx = best(cx, [nx, nx + ob.w / 2, nx + ob.w]);
          if (bx) {
            nx += bx.off;
            gx.push(bx.c);
          }
          const by = best(cy, [ny, ny + ob.h / 2, ny + ob.h]);
          if (by) {
            ny += by.off;
            gy.push(by.c);
          }
        }
        const mx = nx - ob.x;
        const my = ny - ob.y;
        setGuides({ x: gx, y: gy });
        setDoc(mapItems(g.base, g.pi, (items) => items.map((x) => (g.ids.includes(x.id) ? ({ ...x, x: Math.round((g.orig[x.id][0] + mx) * 10) / 10, y: Math.round((g.orig[x.id][1] + my) * 10) / 10 } as Item) : x))));
        return;
      } else if (g.kind === 'resize') {
        g.moved = true;
        const t = (g.o.rot * Math.PI) / 180;
        const dx = p.x - g.sx;
        const dy = p.y - g.sy;
        const lx = dx * Math.cos(t) + dy * Math.sin(t);
        const ly = -dx * Math.sin(t) + dy * Math.cos(t);
        const [hx, hy] = g.h;
        const ow = g.o.w;
        const oh = g.o.h;
        const corner = hx !== 0 && hy !== 0;
        const ratioType = ['image', 'sticker', 'char', 'edu', 'math', 'graph'].includes(g.o.type);
        const keep = g.o.type === 'text' ? corner : ratioType ? corner && !e.shiftKey : e.shiftKey && corner;
        let w = ow + hx * lx;
        let h = oh + hy * ly;
        let s = 1;
        if (keep) {
          s = Math.max(16 / Math.min(ow, oh), 1 + (hx * lx * ow + hy * ly * oh) / (ow * ow + oh * oh));
          w = ow * s;
          h = oh * s;
        }
        w = Math.max(g.o.type === 'line' ? 20 : 12, w);
        h = Math.max(8, h);
        if (g.o.type === 'line') h = oh;
        const shx = ((w - ow) / 2) * hx;
        const shy = ((h - oh) / 2) * (g.o.type === 'text' && !keep ? 0 : hy);
        const cx = g.o.x + ow / 2 + shx * Math.cos(t) - shy * Math.sin(t);
        const cy = g.o.y + oh / 2 + shx * Math.sin(t) + shy * Math.cos(t);
        if (g.o.type === 'text') {
          const size = keep ? Math.max(6, Math.round(g.o.size * s * 10) / 10) : g.o.size;
          // ข้อความ: ความสูงตามเนื้อหา ยึดขอบบนไว้ (ไม่เลื่อนแกนตั้ง)
          patch = { w, x: cx - w / 2, y: keep ? cy - h / 2 : g.o.y, size } as Partial<Item>;
        } else if (g.o.type === 'table' || g.o.type === 'math') {
          patch = { w, h, x: cx - w / 2, y: cy - h / 2, size: keep ? Math.max(6, Math.round(g.o.size * s * 10) / 10) : g.o.size } as Partial<Item>;
        } else patch = { w, h, x: cx - w / 2, y: cy - h / 2 };
      } else {
        g.moved = true;
        let a = (Math.atan2(p.y - g.cy, p.x - g.cx) * 180) / Math.PI + 90;
        if (a > 180) a -= 360;
        const snapTo = Math.round(a / 15) * 15;
        if (e.shiftKey || Math.abs(a - snapTo) < 4) a = snapTo;
        patch = { rot: Math.round(a * 10) / 10 };
      }
      setGuides({ x: gx, y: gy });
      setDoc(mapItems(g.snap, g.pi, (items) => items.map((x) => (x.id === g.id ? ({ ...x, ...patch } as Item) : x))));
    },
    [zoom, W, H]
  );

  const onUp = useCallback(
    (e: PointerEvent) => {
      const g = drag.current;
      drag.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setGuides({ x: [], y: [] });
      setMarquee(null);
      if (!g) return;
      if (g.kind === 'marquee') {
        if (!g.moved) {
          if (!g.add) setSelIds([]);
          return;
        }
        const el = pageEls.current.get(g.pi);
        const r = el?.getBoundingClientRect();
        if (!r) return;
        const ex = (e.clientX - r.left) / zoomRef.current;
        const ey = (e.clientY - r.top) / zoomRef.current;
        const box = { x: Math.min(g.sx, ex), y: Math.min(g.sy, ey), w: Math.abs(ex - g.sx), h: Math.abs(ey - g.sy) };
        const items = docRef.current?.pages[g.pi]?.items || [];
        const hit = items.filter((x) => x.x < box.x + box.w && x.x + x.w > box.x && x.y < box.y + box.h && x.y + x.h > box.y);
        const ids = withGroups(items, hit.map((x) => x.id));
        setSelIds((prev) => (g.add ? [...new Set([...prev, ...ids])] : ids));
        return;
      }
      if (g.moved) {
        past.current.push(g.snap);
        if (past.current.length > HISTORY) past.current.shift();
        future.current = [];
        lastKey.current = null;
      } else if (g.kind === 'move' && g.drill && e.type === 'pointerup') {
        // กลุ่มถูกเลือกอยู่แล้ว แตะซ้ำ = เลือกชิ้นเดียวข้างในกลุ่ม
        setSelIds([g.id]);
      } else if (g.kind === 'move' && g.was && e.type === 'pointerup') {
        // แตะชิ้นที่เลือกอยู่แล้วซ้ำ = แก้ข้อความ/ช่องตาราง
        const it = docRef.current?.pages[g.pi]?.items.find((x) => x.id === g.id);
        if (it?.type === 'text' && !it.locked) startEdit(it.id, g.pi);
        if (it?.type === 'table' && !it.locked && g.cell) startEdit(it.id, g.pi, g.cell);
      }
    },
    [onMove, startEdit]
  );

  const begin = (g: Drag, e: React.PointerEvent) => {
    e.preventDefault();
    drag.current = g;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  /**
   * กราฟที่สร้างในโหมด Word แสดงเป็นเนื้อหาเอกสาร (กดไม่ได้) แตะในโหมด Canva = ยกออกมาเป็นชิ้นงาน
   * ที่ตำแหน่งเดิม แล้วลาก ย่อขยาย ดับเบิลคลิกแก้ได้เหมือนชิ้นอื่น (ข้อความรอบๆ ไหลเข้ามาแทนที่)
   */
  const liftFlowGraph = (pi: number, e: React.MouseEvent): { item: Item; doc: Design } | null => {
    const d = docRef.current;
    const paper = e.currentTarget as HTMLElement;
    if (!d?.flow) return null;
    const figs = Array.from(paper.querySelectorAll<HTMLElement>('.st-flow figure[data-graph]'));
    const k = figs.findIndex((f) => {
      const r = f.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (k < 0) return null;
    let spec: GraphSpec;
    try {
      spec = cleanGraph(JSON.parse(figs[k].dataset.graph || ''));
    } catch {
      return null;
    }
    const pr = paper.getBoundingClientRect();
    const fr = figs[k].getBoundingClientRect();
    const item = { ...makeGraph(spec, fr.width / zoom), x: (fr.left - pr.left) / zoom, y: (fr.top - pr.top) / zoom, locked: figs[k].dataset.lock === '1' };
    // ลบกราฟลำดับที่ k ออกจากเนื้อหาเอกสาร (ลำดับใน HTML ตรงกับที่วาด)
    const t = document.createElement('template');
    t.innerHTML = d.flow;
    t.content.querySelectorAll('figure[data-graph]')[Number(figs[k].dataset.gi ?? k)]?.remove();
    const next = mapItems({ ...d, flow: cleanFlowHtml(t.innerHTML, cleanSrc) }, pi, (items) => [...items, item]);
    commit(next);
    return { item, doc: next };
  };

  const onPagePointer = (e: React.PointerEvent, pi: number) => {
    if (readOnly || !doc || e.button > 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-editing]') || target.closest('[data-float]')) return;
    const pg = doc.pages[pi];
    const el = target.closest<HTMLElement>('[data-item]');
    if (pi !== ap) setPageIdx(pi);
    if (!el) {
      finishEdit();
      const lifted = liftFlowGraph(pi, e);
      if (lifted) {
        setSelIds([lifted.item.id]);
        begin(moveDrag(pi, lifted.item.id, [lifted.item.id], lifted.doc.pages[pi], lifted.doc, lifted.doc, ptIn(pi, e), false, false), e);
        return;
      }
      setPanel((p) => (p && window.innerWidth < 768 ? null : p));
      // ลากบนพื้นที่ว่าง = ลากคลุมเลือกหลายชิ้น (แตะเฉยๆ = เลิกเลือก)
      const p = ptIn(pi, e);
      begin({ kind: 'marquee', pi, sx: p.x, sy: p.y, add: e.shiftKey, moved: false, snap: doc, id: '' }, e);
      return;
    }
    const it = pg.items.find((x) => x.id === el.dataset.item);
    if (!it) return;
    const cur = pi === ap ? selIds : [];
    const grp = withGroups(pg.items, [it.id]);
    if (e.shiftKey) {
      // Shift + คลิก = เพิ่ม/เอาออกจากชุดที่เลือก
      finishEdit();
      const inSel = cur.includes(it.id);
      const next = inSel ? cur.filter((x) => !grp.includes(x)) : [...new Set([...cur, ...grp])];
      setSelIds(next);
      if (inSel || it.locked) return;
      const p = ptIn(pi, e);
      begin(moveDrag(pi, it.id, next, pg, doc, doc, p, false, false), e);
      return;
    }
    const was = selId === it.id && pi === ap;
    const already = cur.includes(it.id);
    const drill = already && cur.length > 1 && !!it.g && grp.every((x) => cur.includes(x)) && cur.length === grp.length;
    if (editing.current && editing.current.id !== it.id) finishEdit();
    const ids = already ? cur : grp;
    if (!already) setSelIds(ids);
    const c = target.closest<HTMLElement>('[data-cell]')?.dataset.cell?.split('-').map(Number) as [number, number] | undefined;
    if (it.locked) return;
    const p = ptIn(pi, e);
    if (e.altKey) {
      // Alt + ลาก = ทำสำเนาแล้วลากสำเนาออกไป (แบบ Canva)
      const groups = new Map<string, string>();
      const copies = pg.items
        .filter((x) => ids.includes(x.id))
        .map((o) => {
          const cp = { ...structuredClone(o), id: uid(), locked: false } as Item;
          if (o.g) {
            if (!groups.has(o.g)) groups.set(o.g, uid().slice(0, 10));
            cp.g = groups.get(o.g);
          }
          return cp;
        });
      const base = mapItems(doc, pi, (items) => [...items, ...copies]);
      setDoc(base);
      setSelIds(copies.map((x) => x.id));
      begin(moveDrag(pi, copies[ids.indexOf(it.id)]?.id ?? copies[0].id, copies.map((x) => x.id), base.pages[pi], base, doc, p, false, false), e);
      return;
    }
    begin({ ...moveDrag(pi, it.id, ids, pg, doc, doc, p, was, drill), cell: c }, e);
  };

  const onDbl = (e: React.MouseEvent, pi: number) => {
    if (readOnly || !doc) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-item]');
    const it = doc.pages[pi].items.find((x) => x.id === el?.dataset.item);
    if (!el) {
      // กราฟจากโหมด Word (แตะครั้งแรกถูกยกออกมาแล้ว กรณีนี้คือยังไม่ถูกยก)
      const lifted = liftFlowGraph(pi, e);
      if (lifted?.item.type === 'graph') setGraphDlg({ spec: lifted.item.spec, itemId: lifted.item.id });
      return;
    }
    if (!it || it.locked) return;
    if (it.type === 'text') startEdit(it.id, pi);
    if (it.type === 'char') setCharDlg({ look: it.look, itemId: it.id, flip: it.flip });
    if (it.type === 'math') setMathDlg({ tex: it.tex, itemId: it.id });
    if (it.type === 'graph') setGraphDlg({ spec: it.spec, itemId: it.id });
    const c = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]')?.dataset.cell?.split('-').map(Number) as [number, number] | undefined;
    if (it.type === 'table' && c) startEdit(it.id, pi, c);
  };

  const onGroupHandle = (h: Handle, e: React.PointerEvent) => {
    e.stopPropagation();
    if (!doc || sels.length < 2 || sels.some((x) => x.locked)) return;
    const p = ptIn(ap, e);
    begin({ kind: 'gscale', pi: ap, ids: sels.map((x) => x.id), h, sx: p.x, sy: p.y, box: boxOf(sels), orig: structuredClone(sels), snap: doc, moved: false }, e);
  };
  const onHandle = (h: Handle | 'rot', e: React.PointerEvent) => {
    e.stopPropagation();
    if (!sel || !doc || sel.locked) return;
    const p = ptIn(ap, e);
    if (h === 'rot') begin({ kind: 'rotate', pi: ap, id: sel.id, cx: sel.x + sel.w / 2, cy: sel.y + sel.h / 2, snap: doc, moved: false }, e);
    else begin({ kind: 'resize', pi: ap, id: sel.id, h, sx: p.x, sy: p.y, o: sel, snap: doc, moved: false }, e);
  };

  /* ------------------------------------------------------------ แป้นพิมพ์ลัด (แบบ Canva) + วาง */
  useEffect(() => {
    if (!ctl || readOnly || present !== null || charDlg || help || mathDlg || graphDlg) return;
    const key = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      // กำลังพิมพ์ในกล่องข้อความ: Ctrl+B/I/U เปลี่ยนทั้งกล่อง (ข้อความเก็บแบบไม่มีรูปแบบในตัว)
      if (mod && !e.shiftKey && !e.altKey && sel?.type === 'text' && e.target === editRef.current && (k === 'b' || k === 'i' || k === 'u')) {
        e.preventDefault();
        const f = k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'underline';
        ctl.update(sel.id, { [f]: !sel[f] } as Partial<Item>);
        return;
      }
      if (isTyping(e.target)) return;
      if (mod && k === 'z') {
        e.preventDefault();
        if (mode === 'word') return e.shiftKey ? word.current?.redo() : word.current?.undo();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && k === 'y') {
        e.preventDefault();
        if (mode === 'word') return word.current?.redo();
        redo();
        return;
      }
      if (mod && k === 's') {
        e.preventDefault();
        doSave().then(() => say('บันทึกแล้ว'));
        return;
      }
      if (mod && (e.key === '=' || e.key === '+' || e.key === '-' || e.key === '0')) {
        e.preventDefault();
        if (e.key === '0') {
          setAutoFit(true);
          fit();
        } else {
          setAutoFit(false);
          setZoom((z) => Math.max(0.1, Math.min(3, z * (e.key === '-' ? 0.9 : 1.1))));
        }
        return;
      }
      if (mod && e.altKey && k === 'p') {
        e.preventDefault();
        finishEdit();
        setSelId(null);
        setPresent(ap);
        return;
      }
      if ((e.key === '?' && !mod) || (mod && e.key === '/')) {
        e.preventDefault();
        setHelp(true);
        return;
      }
      if (mod && e.key === 'Enter') {
        e.preventDefault();
        ctl.addPage();
        return;
      }
      if (mode === 'word') return;
      if (e.key === 'Tab') {
        const items = ctl.page.items;
        if (!items.length) return;
        e.preventDefault();
        const i = sel ? items.findIndex((x) => x.id === sel.id) : -1;
        const n = items.length;
        setSelIds([items[(((e.shiftKey ? (i < 0 ? 0 : i) - 1 : i + 1) % n) + n) % n].id]);
        return;
      }
      if ((mod || e.altKey) && !e.shiftKey && k === 'a') {
        // Ctrl+A / Alt+A = เลือกทุกชิ้นในหน้านี้
        e.preventDefault();
        setSelIds(ctl.page.items.map((x) => x.id));
        return;
      }
      const many = ctl.sels;
      if (!many.length) {
        if (mod || e.altKey) return;
        // เพิ่มชิ้นงานเร็ว: T ข้อความ R สี่เหลี่ยม C วงกลม L เส้น E สมการ G กราฟ
        if (k === 't') ctl.add(makeText({ text: 'พิมพ์ข้อความ' }));
        else if (k === 'r') ctl.add(makeShape('rect', { w: 240, h: 160 }));
        else if (k === 'c') ctl.add(makeShape('circle', { fill: '#7dd3fc' }));
        else if (k === 'l') ctl.add(makeLine());
        else if (k === 'e') ctl.openMath();
        else if (k === 'g') ctl.openGraph();
        else if (e.key === 'PageDown' || e.key === 'PageUp') ctl.goPage(ap + (e.key === 'PageDown' ? 1 : -1));
        else return;
        e.preventDefault();
        return;
      }
      const ids = many.map((x) => x.id);
      const one = many.length === 1 ? many[0] : null;
      const code = e.code;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (many.every((x) => x.locked)) say('ชิ้นที่เลือกล็อกอยู่ ปลดล็อกก่อนลบ (Alt+Shift+L)');
        else ctl.removeMany(ids);
      } else if (mod && k === 'd') {
        e.preventDefault();
        ctl.duplicateMany(ids);
      } else if (mod && e.shiftKey && k === 'g') {
        e.preventDefault();
        ctl.ungroup(ids);
        say('แยกกลุ่มแล้ว');
      } else if (mod && k === 'g') {
        e.preventDefault();
        if (many.length < 2) say('เลือกอย่างน้อย 2 ชิ้นก่อนจัดกลุ่ม (Shift + คลิก)');
        else {
          ctl.group(ids);
          say('จัดกลุ่มแล้ว คลิกครั้งเดียวจะเลือกทั้งกลุ่ม');
        }
      } else if (mod && e.altKey && k === 'c') {
        e.preventDefault();
        if (!one) return say('เลือกชิ้นเดียวเพื่อคัดลอกสไตล์');
        styleClip.current = styleOf(one);
        say('คัดลอกสไตล์แล้ว เลือกชิ้นชนิดเดียวกันแล้วกด Ctrl+Alt+V');
      } else if (mod && e.altKey && k === 'v') {
        e.preventDefault();
        const st = styleClip.current;
        if (!st) return say('ยังไม่ได้คัดลอกสไตล์ (Ctrl+Alt+C)');
        const same = many.filter((x) => x.type === st.type && !x.locked);
        if (!same.length) return say('วางสไตล์ได้กับชิ้นชนิดเดียวกันเท่านั้น');
        commit(mapItems(docRef.current!, ap, (items) => items.map((x) => (same.includes(x) ? ({ ...x, ...st } as Item) : x))));
      } else if (mod && k === 'c') {
        clip.current = structuredClone(many);
      } else if (mod && k === 'x') {
        clip.current = structuredClone(many);
        ctl.removeMany(ids);
      } else if (mod && (code === 'BracketRight' || code === 'BracketLeft')) {
        e.preventDefault();
        const up = code === 'BracketRight';
        const to = e.altKey || e.shiftKey ? (up ? 'front' : 'back') : up ? 'up' : 'down';
        if (one) ctl.order(one.id, to);
        else
          commit(
            mapItems(docRef.current!, ap, (items) => {
              const picked = items.filter((x) => ids.includes(x.id));
              const rest = items.filter((x) => !ids.includes(x.id));
              return to === 'back' || to === 'down' ? [...picked, ...rest] : [...rest, ...picked];
            })
          );
      } else if (e.altKey && e.shiftKey && k === 'l') {
        e.preventDefault();
        const lock = !many.every((x) => x.locked);
        ctl.lockMany(ids, lock);
        say(lock ? 'ล็อกแล้ว' : 'ปลดล็อกแล้ว');
      } else if (one?.type === 'text' && mod && !e.shiftKey && (k === 'b' || k === 'i' || k === 'u')) {
        e.preventDefault();
        const f = k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'underline';
        ctl.update(one.id, { [f]: !one[f] } as Partial<Item>);
      } else if (one?.type === 'text' && mod && e.shiftKey && (k === 'l' || k === 'e' || k === 'r')) {
        e.preventDefault();
        ctl.update(one.id, { align: k === 'l' ? 'left' : k === 'e' ? 'center' : 'right' } as Partial<Item>);
      } else if (one && (one.type === 'text' || one.type === 'table' || one.type === 'math') && mod && e.shiftKey && (code === 'Comma' || code === 'Period')) {
        e.preventDefault();
        ctl.update(one.id, { size: Math.max(6, Math.min(400, one.size + (code === 'Period' ? 2 : -2))) } as Partial<Item>, 'size');
      } else if (e.key === 'Escape') {
        setSelIds([]);
      } else if (e.key === 'Enter' && one && (one.type === 'text' || one.type === 'table')) {
        e.preventDefault();
        startEdit(one.id, ap, one.type === 'table' ? [0, 0] : null);
      } else if (e.key === 'Enter' && one?.type === 'math') {
        e.preventDefault();
        ctl.openMath(one.id);
      } else if (e.key === 'Enter' && one?.type === 'graph') {
        e.preventDefault();
        ctl.openGraph(null, one.id);
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const st = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0;
        const dy = e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0;
        commit(mapItems(docRef.current!, ap, (items) => items.map((x) => (ids.includes(x.id) && !x.locked ? ({ ...x, x: x.x + dx, y: x.y + dy } as Item) : x))), 'nudge');
      }
    };
    const paste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'));
      if (files.length) {
        e.preventDefault();
        if (ctl.canUpload) ctl.upload(files);
        return;
      }
      const txt = e.clipboardData?.getData('text/plain')?.trim();
      if (mode === 'word') return;
      if (clip.current?.length && !txt) {
        e.preventDefault();
        const groups = new Map<string, string>();
        const copies = clip.current.map((o) => {
          const c = { ...structuredClone(o), id: uid(), x: o.x + 24, y: o.y + 24, locked: false } as Item;
          if (o.g) {
            if (!groups.has(o.g)) groups.set(o.g, uid().slice(0, 10));
            c.g = groups.get(o.g);
          }
          return c;
        });
        commit(mapItems(docRef.current!, ap, (items) => [...items, ...copies]));
        setSelIds(copies.map((x) => x.id));
        clip.current = copies;
        return;
      }
      if (txt) {
        e.preventDefault();
        ctl.add(makeText({ text: txt.slice(0, 4000), align: 'left', size: 24 }));
      }
    };
    window.addEventListener('keydown', key);
    window.addEventListener('paste', paste);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('paste', paste);
    };
  }, [ctl, sel, readOnly, undo, redo, startEdit, ap, present, charDlg, help, doSave, say, fit, finishEdit, mode, commit, mathDlg, graphDlg]);

  /* ------------------------------------------------------------ แก้ข้อความ */
  useEffect(() => {
    if (!editId) return;
    const el = editRef.current;
    if (!el) return;
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    const s = window.getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
  }, [editId, cell]);

  const editText: EditText | undefined = editId && sel?.type === 'text' ? { ref: editRef, done: () => finishEdit() } : undefined;
  const editCell: EditCell | undefined = editId && sel?.type === 'table' && cell ? { ref: editRef, r: cell[0], c: cell[1], done: () => finishEdit() } : undefined;

  /* ------------------------------------------------------------ ส่งออก */
  const runExport = (kind: 'png' | 'pdf' | 'png1') => {
    if (!doc || exporting) return;
    finishEdit();
    setSelId(null);
    setExporting({ kind, step: 0 });
  };
  useEffect(() => {
    if (!exporting || !doc) return;
    let off = false;
    (async () => {
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));
      const nodes = Array.from(stageEl.current?.querySelectorAll<HTMLElement>('[data-page]') || []);
      try {
        const name = cleanTitle(title) || 'สื่อการสอน';
        const step = (i: number) => !off && setExporting((x) => (x ? { ...x, step: i } : x));
        if (exporting.kind === 'pdf') await exportPdf(nodes, W, H, name, step);
        else await exportPng(exporting.kind === 'png1' ? nodes.slice(ap, ap + 1) : nodes, W, H, exporting.kind === 'png1' && doc.pages.length > 1 ? `${name}-หน้า${ap + 1}` : name, step);
        say('ดาวน์โหลดแล้ว');
      } catch (e) {
        console.error(e);
        say('ส่งออกไม่สำเร็จ ลองใหม่อีกครั้ง');
      }
      if (!off) setExporting(null);
    })();
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exporting?.kind]);

  /* ------------------------------------------------------------ ทำสำเนา (ดูสื่อของคนอื่น) */
  const copyMine = async () => {
    if (!user || !doc || copying) return;
    setCopying(true);
    const { data, error } = await supabase
      .from('user_designs')
      .insert({ owner_id: user.id, title: cleanTitle(`${title} (สำเนา)`), content: doc, page_count: doc.pages.length, is_public: false })
      .select('id')
      .single();
    setCopying(false);
    if (error || !data) return say(/free design limit/i.test(error?.message || '') ? `บัญชีฟรีสร้างได้ ${FREE_DESIGN_LIMIT} สื่อ สมัครสมาชิกเพื่อทำสำเนาเพิ่ม` : 'ทำสำเนาไม่สำเร็จ');
    supabase.rpc('design_copied', { p_id: id }).then(() => undefined);
    window.location.href = `/studio/edit?id=${data.id}`;
  };

  /* ------------------------------------------------------------ ตัวละคร */
  const charDone = (look: CharLook, flip: boolean) => {
    const dlg = charDlg;
    setCharDlg(null);
    if (!dlg || !ctl) return;
    if (dlg.itemId) ctl.update(dlg.itemId, { look, flip } as Partial<Item>);
    else ctl.add({ ...makeChar(look), flip });
  };
  const charSave = async (look: CharLook, name: string) => {
    if (!user) return false;
    const { error } = await supabase.from('user_characters').insert({ owner_id: user.id, name: name.slice(0, 30), look });
    if (error) {
      say(/quota/i.test(error.message) ? 'เก็บตัวละครได้สูงสุด 60 ตัว ลบตัวเก่าก่อน' : /user_characters|schema cache/i.test(error.message) ? 'ระบบตัวละครของฉันยังไม่พร้อม (ผู้ดูแลต้องรัน migration 024)' : 'บันทึกไม่สำเร็จ');
      return false;
    }
    window.dispatchEvent(new Event(CHARS_EVENT));
    return true;
  };

  /* ------------------------------------------------------------ สมการ / กราฟ / โหมดเอกสาร */
  const mathDone = (tex: string) => {
    const dlg = mathDlg;
    setMathDlg(null);
    if (!dlg || !ctl) return;
    if (dlg.done) return dlg.done(tex);
    const it = dlg.itemId ? ctl.page.items.find((x) => x.id === dlg.itemId) : undefined;
    if (it?.type === 'math') {
      if (!tex.trim()) return ctl.remove(it.id);
      const [w, h] = measureTex(tex, it.size);
      ctl.update(it.id, { tex, w, h, x: it.x + (it.w - w) / 2 } as Partial<Item>);
    } else if (tex.trim()) {
      const size = Math.round(Math.min(W, H) / 22);
      const [w, h] = measureTex(tex, size);
      ctl.add(makeMath(tex, w, h, size));
    }
  };
  const graphDone = (spec: GraphSpec) => {
    const dlg = graphDlg;
    setGraphDlg(null);
    if (!dlg || !ctl) return;
    if (dlg.done) return dlg.done(spec);
    const it = dlg.itemId ? ctl.page.items.find((x) => x.id === dlg.itemId) : undefined;
    if (it?.type === 'graph') ctl.update(it.id, { spec, h: (it.w * spec.h) / spec.w } as Partial<Item>);
    else ctl.add(makeGraph(spec, Math.round(Math.min(W, H) * 0.62)));
  };
  const setMode = (m: EditMode) => {
    if (!doc || doc.mode === m) return;
    finishEdit();
    setSelIds([]);
    // สลับโหมดแล้วกระดาษขนาดเท่าเดิม (ไม่ซูมพอดีจอใหม่ตามพื้นที่ที่แถบเครื่องมือแต่ละโหมดกิน)
    setAutoFit(false);
    // กราฟที่สร้างในโหมด Canva ย้ายเข้าเนื้อเอกสารเป็นกราฟวางอิสระตำแหน่งเดิม (โหมด Word แก้/ย้ายได้ แตะในโหมด Canva ยกกลับเป็นชิ้นงาน)
    const toMode = (doc: Design): Design => {
      if (m !== 'word') return { ...doc, mode: m };
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const figs: string[] = [];
      const pages = doc.pages.map((p, i) => ({
        ...p,
        items: p.items.filter((it) => {
          if (it.type !== 'graph' || it.rot) return true;
          figs.push(`<figure data-graph="${esc(JSON.stringify(it.spec))}" data-wrap="front"${it.locked ? ' data-lock="1"' : ''} style="left: ${Math.round(it.x)}px; top: ${Math.round(i * (H + FLOW_GAP) + it.y)}px; width: ${Math.round(it.w)}px"></figure>`);
          return false;
        }),
      }));
      return figs.length ? { ...doc, mode: m, pages, flow: cleanFlowHtml((doc.flow || '<p><br></p>') + figs.join(''), cleanSrc) } : { ...doc, mode: m };
    };
    setDoc((d) => d && toMode(d));
    if (m === 'word') say('โหมดเอกสาร: พิมพ์ต่อเนื่องได้เลย ขึ้นหน้าใหม่ให้เอง ชิ้นงานแบบ Canva แสดงอยู่แต่แก้ได้ในโหมด Canva');
  };
  const needPages = (n: number) =>
    setDoc((d) => {
      if (!d || d.pages.length >= n) return d;
      const last = d.pages[d.pages.length - 1];
      const add = Array.from({ length: Math.min(MAX_PAGES, n) - d.pages.length }, () => ({ ...blankPage(), bg: { ...last.bg }, border: { ...last.border } }));
      return add.length ? { ...d, pages: [...d.pages, ...add] } : d;
    });
  /* ------------------------------------------------------------ นำเข้าไฟล์ (Word / PDF / ข้อความ) */
  const [importDlg, setImportDlg] = useState<{ file: File | null } | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const runImport = async (file: File, how: ImportHow) => {
    setImportDlg(null);
    if (!user || tier === 'guest' || readOnly) return say('ต้องเข้าสู่ระบบก่อนจึงนำเข้าไฟล์ได้');
    if (importing) return;
    finishEdit();
    setSelIds([]);
    setImporting('กำลังเตรียมไฟล์…');
    try {
      const sink = uploadSink(user.id);
      const d0 = docRef.current!;
      const blank = d0.pages.length === 1 && !d0.pages[0].items.length && flowIsEmpty(d0.flow);
      if (how === 'pages') {
        const r = await importPdfPages(file, W, H, blank ? MAX_PAGES : MAX_PAGES - d0.pages.length, sink, setImporting);
        const d = docRef.current!;
        commit({ ...d, mode: 'canvas', pages: blank ? r.pages : [...d.pages, ...r.pages] });
        if (!blank) setPageIdx(d.pages.length);
        say(r.total > r.pages.length ? `นำเข้า ${r.pages.length} จาก ${r.total} หน้า (สื่อหนึ่งชิ้นมีได้ ${MAX_PAGES} หน้า)` : `นำเข้า ${r.pages.length} หน้าแล้ว แต่ละหน้าล็อกไว้ วางของทับได้เลย`);
      } else {
        const r = await importAsFlow(file, sink, setImporting);
        const d = docRef.current!;
        const fresh = flowIsEmpty(d.flow);
        commit(fresh ? designFromImport(d, r) : { ...d, mode: 'word', flow: appendFlow(d.flow, r.html, true) });
        if (fresh && blank && /^(สื่อใหม่|สื่อไม่มีชื่อ)?$/.test(title.trim())) setTitle(file.name.replace(/\.[^.]+$/, '').slice(0, 80));
        say(importNote(r.stats, importKind(file)));
      }
      setAutoFit(true);
    } catch (e) {
      console.error('[studio] import failed', e);
      say(e instanceof Error && /[ก-๙]/.test(e.message) ? e.message : 'นำเข้าไฟล์ไม่สำเร็จ ไฟล์อาจเสียหรือมีรหัสผ่าน');
    } finally {
      setImporting(null);
    }
  };
  // ไฟล์ที่เลือกมาจากหน้าคลังสื่อ (สร้างสื่อเปล่าแล้วนำเข้าที่นี่)
  useEffect(() => {
    if (status !== 'ready' || readOnly) return;
    const p = takePendingImport();
    if (p) runImport(p.file, p.how);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, readOnly]);
  const dropFiles = (files: FileList) => {
    const doc = Array.from(files).find(isImportable);
    if (doc) return importKind(doc) === 'pdf' ? setImportDlg({ file: doc }) : runImport(doc, 'flow');
    // โหมด Word: รูปที่ลากมาวางบนเนื้อเอกสาร WordEditor ใส่ที่ตำแหน่งนั้นเอง
    if (mode === 'word') return say('ลากรูปไปวางบนกระดาษตรงที่ต้องการ');
    ctl?.upload(files);
  };

  const wordUpload = async (f: File) => {
    if (!user || tier === 'guest') {
      say('ต้องเข้าสู่ระบบก่อนจึงอัปโหลดรูปได้');
      return null;
    }
    try {
      setUploading(true);
      const m = await uploadImage(user.id, f, 1600);
      return m.url;
    } catch (e) {
      say(e instanceof Error ? e.message : 'อัปโหลดรูปไม่สำเร็จ');
      return null;
    } finally {
      setUploading(false);
    }
  };

  /* ------------------------------------------------------------ หน้าจอ */
  if (status !== 'ready' || !doc || !page || !ctl) {
    return (
      <div className="st-shell st-center">
        {status === 'loading' ? (
          <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
        ) : (
          <div className="st-msg">
            <CloudOff className="w-10 h-10" />
            <h2>{status === 'missing' ? 'ระบบสร้างสื่อยังไม่พร้อม (ผู้ดูแลต้องรัน migration 023)' : !user ? 'ต้องเข้าสู่ระบบก่อน' : 'เปิดสื่อนี้ไม่ได้ อาจถูกลบหรือตั้งเป็น Private'}</h2>
            <Link href={user ? '/studio' : '/login?redirect=/studio'} className="st-btn-acc">
              {user ? 'กลับหน้าสร้างสื่อ' : 'เข้าสู่ระบบ'}
            </Link>
          </div>
        )}
      </div>
    );
  }

  const hs = 1 / zoom;
  const handles: Handle[] =
    sel?.type === 'line'
      ? [
          [-1, 0],
          [1, 0],
        ]
      : sel?.type === 'text'
        ? [
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
            [-1, 0],
            [1, 0],
          ]
        : [
            [-1, -1],
            [0, -1],
            [1, -1],
            [-1, 0],
            [1, 0],
            [-1, 1],
            [0, 1],
            [1, 1],
          ];
  const exportLabel = exporting ? (exporting.kind === 'png1' ? 'กำลังทำรูป…' : `กำลังทำหน้า ${exporting.step + 1}/${doc.pages.length}`) : '';
  const floatBelow = sel ? sel.y * zoom < 70 : false;
  const mbox = sels.length > 1 ? boxOf(sels) : null;
  const CORNERS: Handle[] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];

  // ปุ่มออก (ซ้ายบนเสมอ) กับเครื่องมือของสื่อ ใช้ทั้งแถบชื่อโหมด Word และเมนู "ไฟล์" ในแถบซ้ายโหมด Canva
  const exitBtn = (
    <Link href="/studio?tab=library" className="st-topbtn st-exit" title="ออกจากตัวแก้ไข (กลับไปคลังสื่อ)">
      <ChevronLeft className="w-5 h-5" />
      <span>ออก</span>
    </Link>
  );
  const topCtl = (
    <>
          {!readOnly && (
            <Pop title="ปรับขนาดสื่อ" width={330} className="st-topbtn st-g st-g-sky max-sm:!hidden" button={<><Scaling className="w-4 h-4" /> <span className="max-xl:hidden">ปรับขนาด</span></>}>
              {(close) => <SizePicker ctl={ctl} onDone={close} />}
            </Pop>
          )}
          <span className="st-top-sep max-sm:hidden" />
          {!readOnly && (
            <>
              <button type="button" className="st-topbtn st-topicon" onClick={() => (mode === 'word' ? word.current?.undo() : undo())} disabled={mode !== 'word' && !past.current.length} title="ย้อนกลับ (Ctrl+Z)" aria-label="ย้อนกลับ">
                <Undo2 className="w-5 h-5" />
              </button>
              <button type="button" className="st-topbtn st-topicon max-sm:!hidden" onClick={() => (mode === 'word' ? word.current?.redo() : redo())} disabled={mode !== 'word' && !future.current.length} title="ทำซ้ำ (Ctrl+Y)" aria-label="ทำซ้ำ">
                <Redo2 className="w-5 h-5" />
              </button>
              <span className="st-save" data-s={save} title={save === 'error' ? 'บันทึกไม่สำเร็จ กดเพื่อลองใหม่' : undefined} onClick={() => save === 'error' && doSave()}>
                {save === 'saved' ? <Check className="w-4 h-4" /> : save === 'error' ? <CloudOff className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                <span className="max-lg:hidden">{save === 'saved' ? 'บันทึกแล้ว' : save === 'error' ? 'บันทึกไม่สำเร็จ' : 'กำลังบันทึก'}</span>
              </span>
            </>
          )}
          <div className="flex-1 min-w-0 flex justify-center">
            {readOnly ? (
              <p className="st-title-ro truncate">
                {title} <span className="opacity-75 text-sm">· <Eye className="w-3.5 h-3.5 inline -mt-0.5" /> ของ {ownerName || 'สมาชิก'}</span>
              </p>
            ) : (
              <input className="st-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} aria-label="ชื่อสื่อ" placeholder="ตั้งชื่อสื่อ" />
            )}
          </div>
          {!readOnly && (
            <div className="st-mode" role="radiogroup" aria-label="โหมดแก้ไข">
              <button type="button" role="radio" aria-checked={mode === 'canvas'} data-on={mode === 'canvas'} onClick={() => setMode('canvas')} title="ออกแบบอิสระ ลากวางได้ทุกอย่าง (แบบ Canva)">
                <LayoutDashboard className="w-4 h-4" /> <span className="max-sm:hidden">Canva</span>
              </button>
              <button type="button" role="radio" aria-checked={mode === 'word'} data-on={mode === 'word'} onClick={() => setMode('word')} title="พิมพ์เอกสารต่อเนื่อง ขึ้นหน้าใหม่เอง (แบบ Word)">
                <FileText className="w-4 h-4" /> <span className="max-sm:hidden">Word</span>
              </button>
            </div>
          )}
          {!readOnly && !process.env.NEXT_PUBLIC_L5G_APP && (
            <button type="button" className={`st-topbtn st-g max-sm:!hidden ${isPublic ? 'st-g-mint' : 'st-g-slate'}`} data-on={isPublic} onClick={() => setIsPublic(!isPublic)} title={isPublic ? 'Public: สมาชิกคนอื่นเห็นใน Discover แตะเพื่อเปลี่ยนเป็น Private' : 'Private: เห็นเฉพาะคุณ แตะเพื่อเปลี่ยนเป็น Public'}>
              {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span className="max-xl:hidden">{isPublic ? 'Public' : 'Private'}</span>
            </button>
          )}
          {readOnly && (
            <button type="button" className="st-topbtn st-g st-g-sky" onClick={copyMine} disabled={copying || tier === 'guest'}>
              {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />} <span className="max-sm:hidden">ทำสำเนาไปแก้</span>
            </button>
          )}
          {!readOnly && (
            <button type="button" className="st-topbtn st-g st-g-sky max-sm:!hidden" onClick={() => setImportDlg({ file: null })} disabled={!!importing} title="นำเข้าไฟล์ Word / PDF / ข้อความ (สมการกลายเป็น MathType แก้ต่อได้)">
              <FileUp className="w-4 h-4" /> <span className="max-xl:hidden">นำเข้าไฟล์</span>
            </button>
          )}
          <button type="button" className="st-topbtn st-g st-g-grape" onClick={() => (finishEdit(), setSelId(null), setPresent(ap))} title="นำเสนอเต็มจอ">
            <MonitorPlay className="w-4 h-4" /> <span className="max-xl:hidden">นำเสนอ</span>
          </button>
          <ExportMenu pages={doc.pages.length} busy={!!exporting} label={exportLabel} onPick={runExport} />
    </>
  );

  return (
    <div className="st-shell" data-readonly={readOnly} data-mode={mode}>
      {/* ---------------- แถบบน: โหมด Word = แถบชื่อ + ริบบอนแบบ Word / โหมด Canva = ไม่มีแถบบน (เครื่องมืออยู่แถบซ้าย) ---------------- */}
      {(readOnly || mode === 'word') && (
        <header className="st-top" data-word={mode === 'word' || undefined}>
          {exitBtn}
          {topCtl}
        </header>
      )}
      {!readOnly && mode === 'word' && <div ref={setTopEl} className="st-topribbon" />}

      <div className="st-body">
        {!readOnly && mode === 'canvas' && (
          <>
            <nav className="st-rail" aria-label="เครื่องมือ">
              {exitBtn}
              {RAIL.map((r) => (
                <button key={r.id} type="button" className="st-rail-btn" data-on={panel === r.id} onClick={() => setPanel(panel === r.id ? null : r.id)} style={{ ['--c' as string]: r.color }}>
                  <span className="st-rail-ic">{r.icon}</span>
                  <span className="st-rail-tx">{r.label}</span>
                </button>
              ))}
              <span className="flex-1" />
              <Pop title="ไฟล์และการแชร์" width={300} className="st-rail-btn st-rail-file" button={<><span className="st-rail-ic"><Menu className="w-5 h-5" /></span><span className="st-rail-tx">ไฟล์</span></>}>
                <div className="st-filepop">{topCtl}</div>
              </Pop>
            </nav>
            {panel && <Panels id={panel} ctl={ctl} onClose={() => setPanel(null)} />}
          </>
        )}

        {!readOnly && mode === 'word' && <div ref={setRailEl} className="contents" />}

        <div className="st-work">
          {!readOnly && mode === 'canvas' && <Inspector ctl={ctl} />}
          <div
            ref={wrapEl}
            className="st-canvas"
            onScroll={onScroll}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('st-pages')) {
                finishEdit();
                setSelId(null);
              }
            }}
            onDragOver={(e) => {
              if (!readOnly && e.dataTransfer.types.includes('Files')) e.preventDefault();
            }}
            onDrop={(e) => {
              if (readOnly || e.defaultPrevented) return;
              e.preventDefault();
              if (!ctl.canUpload) return say('ต้องเข้าสู่ระบบก่อนจึงอัปโหลดรูปหรือนำเข้าไฟล์ได้');
              dropFiles(e.dataTransfer.files);
            }}
          >
            {mode === 'word' ? (
              <div className="st-pages">
                <WordEditor
                  ref={word}
                  html={doc.flow}
                  pages={doc.pages}
                  wopt={doc.word}
                  onWopt={(word) => commit({ ...docRef.current!, word }, 'flow')}
                  W={W}
                  H={H}
                  zoom={zoom}
                  readOnly={readOnly}
                  topEl={topEl}
                  railEl={railEl}
                  layoutExtra={<SizePicker ctl={ctl} onDone={() => undefined} />}
                  onChange={(flow) => commit({ ...docRef.current!, flow }, 'flow')}
                  onNeedPages={needPages}
                  openMath={(tex, done, insert) => setMathDlg({ tex, done, insert })}
                  openGraph={(spec, done) => setGraphDlg({ spec: spec ?? newSpec('book', { axes: true, grid: true, numbers: true, origin: false }), done })}
                  upload={wordUpload}
                />
              </div>
            ) : (
            <div className="st-pages">
              {doc.pages.map((p, i) => {
                const active = i === ap;
                return (
                  <section
                    key={p.id}
                    className="st-page"
                    data-active={active}
                    ref={(el) => {
                      if (el) secEls.current.set(i, el);
                      else secEls.current.delete(i);
                    }}
                  >
                    <div className="st-page-head" style={{ width: W * zoom }}>
                      <span className="st-page-no">หน้า {i + 1}</span>
                      {!readOnly && (
                        <span className="st-page-act">
                          <button type="button" disabled={i === 0} onClick={() => ctl.movePage(i, -1)} title="เลื่อนหน้าขึ้น" aria-label={`เลื่อนหน้า ${i + 1} ขึ้น`}>
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button type="button" disabled={i === doc.pages.length - 1} onClick={() => ctl.movePage(i, 1)} title="เลื่อนหน้าลง" aria-label={`เลื่อนหน้า ${i + 1} ลง`}>
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => ctl.dupPage(i)} title="ทำสำเนาหน้า" aria-label={`ทำสำเนาหน้า ${i + 1}`}>
                            <Copy className="w-4 h-4" />
                          </button>
                          <button type="button" disabled={doc.pages.length <= 1} onClick={() => confirm(`ลบหน้า ${i + 1}?`) && ctl.delPage(i)} title="ลบหน้า" aria-label={`ลบหน้า ${i + 1}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => ctl.addPage(undefined, i + 1)} title="เพิ่มหน้าถัดจากนี้" aria-label={`เพิ่มหน้าหลังหน้า ${i + 1}`}>
                            <Plus className="w-4 h-4" />
                          </button>
                        </span>
                      )}
                    </div>
                    <div className="st-paper-wrap" style={{ width: W * zoom, height: H * zoom }}>
                      <div
                        ref={(el) => {
                          if (el) pageEls.current.set(i, el);
                          else pageEls.current.delete(i);
                        }}
                        className="st-paper"
                        style={{ width: W, height: H, transform: `scale(${zoom})` }}
                        onPointerDown={(e) => onPagePointer(e, i)}
                        onDoubleClick={(e) => onDbl(e, i)}
                      >
                        <PageView page={p} W={W} H={H} editText={active ? editText : undefined} editCell={active ? editCell : undefined} editId={active ? editId : null} flow={doc.flow} index={i} wopt={doc.word} total={doc.pages.length}>
                          {marquee && marquee.pi === i && <span className="st-marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />}
                          {active &&
                            mbox &&
                            !readOnly &&
                            sels.map((x) => <span key={`ms${x.id}`} className="st-msel" style={{ left: x.x, top: x.y, width: x.w, height: x.h, transform: x.rot ? `rotate(${x.rot}deg)` : undefined, ['--hs' as string]: `${hs}px` }} />)}
                          {active && mbox && !readOnly && (
                            <>
                              <div className="st-sel" data-locked={sels.some((x) => x.locked)} style={{ left: mbox.x, top: mbox.y, width: mbox.w, height: mbox.h, ['--hs' as string]: `${hs}px` }}>
                                {!sels.some((x) => x.locked) &&
                                  CORNERS.map(([hx, hy]) => (
                                    <span
                                      key={`${hx}${hy}`}
                                      className="st-h"
                                      data-side={false}
                                      style={{ left: `${(hx + 1) * 50}%`, top: `${(hy + 1) * 50}%`, cursor: hx === hy ? 'nwse-resize' : 'nesw-resize' }}
                                      onPointerDown={(e) => onGroupHandle([hx, hy], e)}
                                    />
                                  ))}
                              </div>
                              {!drag.current && (
                                <div
                                  data-float
                                  className="st-float"
                                  style={{
                                    left: mbox.x + mbox.w / 2,
                                    top: mbox.y * zoom < 70 ? mbox.y + mbox.h : mbox.y,
                                    transform: `translate(-50%, ${mbox.y * zoom < 70 ? '0' : '-100%'}) translateY(${mbox.y * zoom < 70 ? 46 * hs : -44 * hs}px) scale(${hs})`,
                                    transformOrigin: mbox.y * zoom < 70 ? '50% 0' : '50% 100%',
                                  }}
                                  onPointerDown={(e) => e.stopPropagation()}
                                >
                                  <span className="st-float-n">{sels.length} ชิ้น</span>
                                  {sels.every((x) => x.g && x.g === sels[0].g) ? (
                                    <button type="button" onClick={() => ctl.ungroup(selIds)} title="แยกกลุ่ม (Ctrl+Shift+G)">
                                      <Ungroup className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button type="button" onClick={() => ctl.group(selIds)} title="จัดกลุ่ม (Ctrl+G)">
                                      <Group className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button type="button" onClick={() => ctl.duplicateMany(selIds)} title="ทำสำเนา (Ctrl+D)">
                                    <Copy className="w-4 h-4" />
                                  </button>
                                  <button type="button" onClick={() => ctl.lockMany(selIds, !sels.every((x) => x.locked))} title="ล็อก/ปลดล็อก (Alt+Shift+L)">
                                    {sels.every((x) => x.locked) ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                  </button>
                                  <button type="button" onClick={() => ctl.removeMany(selIds)} title="ลบ (Delete)">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                          {active &&
                            guides.x.map((x, k) => <span key={`gx${k}`} className="st-guide" style={{ left: x, top: 0, width: hs, height: H }} />)}
                          {active &&
                            guides.y.map((y, k) => <span key={`gy${k}`} className="st-guide" style={{ top: y, left: 0, height: hs, width: W }} />)}
                          {active && sel && !readOnly && (
                            <>
                              <div
                                className="st-sel"
                                data-locked={sel.locked}
                                style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h, transform: sel.rot ? `rotate(${sel.rot}deg)` : undefined, ['--hs' as string]: `${hs}px` }}
                              >
                                {!sel.locked && editId !== sel.id && (
                                  <>
                                    {handles.map(([hx, hy]) => (
                                      <span
                                        key={`${hx}${hy}`}
                                        className="st-h"
                                        data-side={hx === 0 || hy === 0}
                                        style={{ left: `${(hx + 1) * 50}%`, top: `${(hy + 1) * 50}%`, cursor: hx === 0 ? 'ns-resize' : hy === 0 ? 'ew-resize' : hx === hy ? 'nwse-resize' : 'nesw-resize' }}
                                        onPointerDown={(e) => onHandle([hx, hy], e)}
                                      />
                                    ))}
                                    <span className="st-rot" onPointerDown={(e) => onHandle('rot', e)} title="หมุน (กด Shift ค้างเพื่อหมุนทีละ 15 องศา)" />
                                  </>
                                )}
                              </div>
                              {!drag.current && editId !== sel.id && (
                                <div
                                  data-float
                                  className="st-float"
                                  style={{
                                    left: sel.x + sel.w / 2,
                                    top: floatBelow ? sel.y + sel.h : sel.y,
                                    transform: `translate(-50%, ${floatBelow ? '0' : '-100%'}) translateY(${floatBelow ? 46 * hs : -44 * hs}px) scale(${hs})`,
                                    transformOrigin: floatBelow ? '50% 0' : '50% 100%',
                                  }}
                                  onPointerDown={(e) => e.stopPropagation()}
                                >
                                  {sel.type === 'text' && !sel.locked && (
                                    <button type="button" onClick={() => startEdit(sel.id, ap)} title="แก้ข้อความ">
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  )}
                                  {sel.type === 'math' && !sel.locked && (
                                    <button type="button" onClick={() => ctl.openMath(sel.id)} title="แก้สมการ (Enter)">
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  )}
                                  {sel.type === 'graph' && !sel.locked && (
                                    <button type="button" onClick={() => ctl.openGraph(null, sel.id)} title="แก้กราฟ (Enter)">
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  )}
                                  {sel.type === 'char' && !sel.locked && (
                                    <button type="button" onClick={() => setCharDlg({ look: sel.look, itemId: sel.id, flip: sel.flip })} title="แต่งตัว/จัดท่า">
                                      <Wand2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button type="button" onClick={() => ctl.duplicate(sel.id)} title="ทำสำเนา (Ctrl+D)">
                                    <Copy className="w-4 h-4" />
                                  </button>
                                  <button type="button" onClick={() => ctl.update(sel.id, { locked: !sel.locked })} title={sel.locked ? 'ปลดล็อก' : 'ล็อก'}>
                                    {sel.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                  </button>
                                  <button type="button" onClick={() => ctl.remove(sel.id)} title="ลบ (Delete)">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </PageView>
                      </div>
                    </div>
                  </section>
                );
              })}
              {!readOnly && (
                <button type="button" className="st-addpage-big" style={{ width: W * zoom }} onClick={() => ctl.addPage(undefined, doc.pages.length)} disabled={doc.pages.length >= MAX_PAGES}>
                  <Plus className="w-5 h-5" strokeWidth={3} /> เพิ่มหน้า
                </button>
              )}
            </div>
            )}
          </div>

          {/* ---------------- แถบล่าง ---------------- */}
          <footer className="st-foot">
            <span className="st-foot-pages">
              หน้า {ap + 1} / {doc.pages.length}
              <span className="max-md:hidden opacity-70"> · {sizeLabel(doc.size)}</span>
            </span>
            <span className="flex-1" />
            {!readOnly && (
              <button type="button" className="st-tb st-keys-btn max-md:!hidden" onClick={() => setHelp(true)} title="แป้นพิมพ์ลัด (กด ?)">
                <Keyboard className="w-4 h-4" /> แป้นลัด
              </button>
            )}
            <div className="st-zoom">
              <input
                type="range"
                min={10}
                max={200}
                value={Math.round(zoom * 100)}
                onChange={(e) => {
                  setAutoFit(false);
                  setZoom(Number(e.target.value) / 100);
                }}
                aria-label="ซูม"
              />
              <span className="tabular-nums w-11 text-center text-sm font-bold">{Math.round(zoom * 100)}%</span>
              <button type="button" className="st-tb" onClick={() => (setAutoFit(true), fit())} title="พอดีจอ" aria-label="พอดีจอ">
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </footer>
        </div>
      </div>

      {tier === 'free' && !readOnly && (
        <div className="st-upsell">
          <span>บัญชีฟรีสร้างสื่อได้ {FREE_DESIGN_LIMIT} ชิ้น สมัครสมาชิกเพื่อสร้างได้ไม่จำกัด</span>
          <JoinButton className="l5g-btn l5g-btn-go l5g-btn-sm">
            <Crown className="w-4 h-4" /> สมัครสมาชิก
          </JoinButton>
        </div>
      )}

      {toast && (
        <div className="st-toast" role="status">
          {toast}
        </div>
      )}
      {exporting && (
        <div className="st-busy" role="status">
          <Loader2 className="w-6 h-6 animate-spin" /> {exportLabel}
        </div>
      )}
      {importing && (
        <div className="st-busy" role="status">
          <Loader2 className="w-6 h-6 animate-spin" /> {importing}
        </div>
      )}
      {importDlg && <ImportDialog file={importDlg.file} onPick={runImport} onClose={() => setImportDlg(null)} />}

      {help && <ShortcutHelp onClose={() => setHelp(false)} />}
      {present !== null && <Presenter doc={doc} start={present} onClose={() => setPresent(null)} />}
      {mathDlg && <MathPopover initial={mathDlg.tex} editing={!!mathDlg.itemId || (!!mathDlg.done && !!mathDlg.tex)} extended insert={mathDlg.insert} onDone={mathDone} onCancel={() => setMathDlg(null)} />}
      {graphDlg && <GraphEditor initial={graphDlg.spec} editing={!!graphDlg.itemId || !!graphDlg.spec.objs.length} onDone={graphDone} onClose={() => setGraphDlg(null)} />}
      {charDlg && (
        <CharBuilder
          initial={charDlg.look}
          initialFlip={charDlg.flip}
          mode={charDlg.itemId ? 'edit' : 'add'}
          onDone={charDone}
          onSave={tier !== 'guest' ? charSave : undefined}
          onClose={() => setCharDlg(null)}
        />
      )}

      {/* เวทีนอกจอสำหรับถ่ายรูปตอนส่งออก/ทำปก (ขนาดจริง ไม่มีกรอบเลือก) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div aria-hidden="true" style={{ position: 'fixed', left: -100000, top: 0, pointerEvents: 'none' }}>
            {/* หน้าแรกสำหรับรูปปก: วาดเฉพาะตอนถ่าย (เดิมวาดค้างไว้ตลอด = วาดทั้งเอกสารใหม่ทุกครั้งที่พิมพ์ หน้าเยอะยิ่งค้าง) */}
            {thumbDoc && (
              <div ref={thumbEl} style={{ width: W, height: H }}>
                <PageView page={thumbDoc.pages[0]} W={W} H={H} flow={thumbDoc.flow} index={0} wopt={thumbDoc.word} total={thumbDoc.pages.length} />
              </div>
            )}
            {exporting && (
              <div ref={stageEl}>
                {doc.pages.map((p, i) => (
                  <PageView key={p.id} page={p} W={W} H={H} flow={doc.flow} index={i} wopt={doc.word} total={doc.pages.length} />
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

function ExportMenu({ pages, busy, label, onPick }: { pages: number; busy: boolean; label: string; onPick: (k: 'png' | 'pdf' | 'png1') => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', out, true);
    return () => document.removeEventListener('pointerdown', out, true);
  }, [open]);
  const pick = (k: 'png' | 'pdf' | 'png1') => {
    setOpen(false);
    onPick(k);
  };
  return (
    <div className="relative" ref={ref}>
      <button type="button" className="st-topbtn st-g st-g-sun" onClick={() => setOpen(!open)} disabled={busy} aria-expanded={open}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span className="max-lg:hidden">{busy ? label : 'ดาวน์โหลด'}</span>
      </button>
      {open && (
        <div className="st-menu">
          <button type="button" onClick={() => pick('pdf')}>
            <FileText className="w-5 h-5 text-rose-500" />
            <span>
              <b>PDF</b> พร้อมพิมพ์ {pages > 1 ? `(${pages} หน้า)` : ''}
            </span>
          </button>
          <button type="button" onClick={() => pick('png1')}>
            <FileImage className="w-5 h-5 text-violet-500" />
            <span>
              <b>รูป PNG</b> {pages > 1 ? 'เฉพาะหน้าที่เลือก' : 'คมชัด'}
            </span>
          </button>
          {pages > 1 && (
            <button type="button" onClick={() => pick('png')}>
              <FileImage className="w-5 h-5 text-emerald-500" />
              <span>
                <b>รูป PNG ทุกหน้า</b> (ไฟล์ .zip)
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
