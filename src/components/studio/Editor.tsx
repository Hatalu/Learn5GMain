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
  FileText,
  Globe,
  Keyboard,
  Loader2,
  Lock,
  Maximize,
  MonitorPlay,
  Pencil,
  Plus,
  Redo2,
  Scaling,
  Trash2,
  Undo2,
  Unlock,
  Wand2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/game-creator/media';
import { cleanTitle } from '@/lib/game-creator/quiz';
import { FREE_DESIGN_LIMIT, creatorTier } from '@/lib/game-creator/quota';
import { blankPage, makeChar, makeImage, makeLine, makeShape, makeText, MAX_PAGES, sanitizeDesign, sizeLabel, uid, type Design, type Item, type Page } from '@/lib/studio/doc';
import type { CharLook } from '@/lib/studio/char';
import { exportPdf, exportPng, makeThumb } from '@/lib/studio/export';
import { PageView, type EditCell, type EditText } from './render';
import { Inspector } from './Inspector';
import { CHARS_EVENT, Panels, RAIL, SizePicker, type PanelId } from './Panels';
import { CharBuilder } from './CharBuilder';
import { Presenter } from './Presenter';
import { ShortcutHelp } from './Shortcuts';
import { Pop } from './ui';
import { JoinButton } from '@/components/membership/JoinButton';
import './studio.css';

type Handle = [-1 | 0 | 1, -1 | 0 | 1];
type Drag =
  | { kind: 'move'; pi: number; id: string; sx: number; sy: number; ox: number; oy: number; snap: Design; moved: boolean; was: boolean; cell?: [number, number] }
  | { kind: 'resize'; pi: number; id: string; h: Handle; sx: number; sy: number; o: Item; snap: Design; moved: boolean }
  | { kind: 'rotate'; pi: number; id: string; cx: number; cy: number; snap: Design; moved: boolean };

export interface Ctl {
  doc: Design;
  page: Page;
  pageIdx: number;
  W: number;
  H: number;
  sel: Item | null;
  readOnly: boolean;
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
  const [selId, setSelId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [cell, setCell] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(0.5);
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
  const clip = useRef<Item | null>(null);
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
  useEffect(() => {
    if (isLoading) return;
    if (!user) return setStatus('denied');
    let off = false;
    (async () => {
      const { data, error } = await supabase.from('user_designs').select(DESIGN_COLS).eq('id', id).maybeSingle();
      if (off) return;
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
    };
  }, [id, user, isLoading, supabase]);

  const W = doc?.size.w ?? 794;
  const H = doc?.size.h ?? 1123;
  const ap = doc ? Math.min(pageIdx, doc.pages.length - 1) : 0;
  const page = doc ? doc.pages[ap] : null;
  const sel = (page && selId && page.items.find((i) => i.id === selId)) || null;

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
    };
  }, [doc, page, ap, pageIdx, W, H, sel, readOnly, mapPage, commit, user, uploading, say, tier, finishEdit, startEdit, scrollToPage]);

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

  /* ------------------------------------------------------------ หน้าที่กำลังดู ตามการเลื่อน (เหมือน Canva) */
  const onScroll = () => {
    if (drag.current || editing.current || selId || !wrapEl.current) return;
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

  /* ------------------------------------------------------------ ความสูงของกล่องข้อความตามเนื้อหา (ทุกหน้า) */
  useLayoutEffect(() => {
    const d = docRef.current;
    if (!d) return;
    const fix = new Map<number, Map<string, number>>();
    pageEls.current.forEach((el, pi) => {
      const pg = d.pages[pi];
      if (!pg) return;
      el.querySelectorAll<HTMLElement>('[data-item][data-type="text"]').forEach((node) => {
        const it = pg.items.find((x) => x.id === node.dataset.item);
        const h = node.offsetHeight;
        if (it && h && Math.abs(it.h - h) > 0.5) {
          if (!fix.has(pi)) fix.set(pi, new Map());
          fix.get(pi)!.set(it.id, h);
        }
      });
    });
    if (fix.size) setDoc({ ...d, pages: d.pages.map((p, i) => (fix.has(i) ? { ...p, items: p.items.map((x) => (fix.get(i)!.has(x.id) ? { ...x, h: fix.get(i)!.get(x.id)! } : x)) } : p)) });
  });

  /* ------------------------------------------------------------ บันทึกอัตโนมัติ */
  const doSave = useCallback(async () => {
    const d = docRef.current;
    if (!d || readOnly) return;
    setSave('saving');
    const body: Record<string, unknown> = { title: cleanTitle(title) || 'สื่อไม่มีชื่อ', content: d, page_count: d.pages.length, is_public: isPublic };
    if (Date.now() - lastThumb.current > 15000 && thumbEl.current) {
      // รูปปกค้างได้ (แท็บอยู่เบื้องหลัง/รูปโหลดไม่เสร็จ) ห้ามให้มันขวางการบันทึกงาน
      const t = await Promise.race([makeThumb(thumbEl.current, d.size.w, d.size.h).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 8000))]);
      if (t) {
        body.thumb = t;
        lastThumb.current = Date.now();
      }
    }
    const { error } = await supabase.from('user_designs').update(body).eq('id', id);
    setSave((s) => (error ? 'error' : docRef.current === d && s === 'saving' ? 'saved' : 'dirty'));
  }, [readOnly, title, isPublic, supabase, id]);

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
      const base = g.snap.pages[g.pi];
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
        let nx = g.ox + dx;
        let ny = g.oy + dy;
        if (!e.altKey) {
          const th = 7 / zoom;
          const others = base.items.filter((x) => x.id !== o.id);
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
          const bx = best(cx, [nx, nx + o.w / 2, nx + o.w]);
          if (bx) {
            nx += bx.off;
            gx.push(bx.c);
          }
          const by = best(cy, [ny, ny + o.h / 2, ny + o.h]);
          if (by) {
            ny += by.off;
            gy.push(by.c);
          }
        }
        patch = { x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 };
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
        const ratioType = ['image', 'sticker', 'char', 'edu'].includes(g.o.type);
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
        } else if (g.o.type === 'table') {
          patch = { w, h, x: cx - w / 2, y: cy - h / 2, size: keep ? Math.max(6, Math.round(g.o.size * s)) : g.o.size } as Partial<Item>;
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
      if (!g) return;
      if (g.moved) {
        past.current.push(g.snap);
        if (past.current.length > HISTORY) past.current.shift();
        future.current = [];
        lastKey.current = null;
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

  const onPagePointer = (e: React.PointerEvent, pi: number) => {
    if (readOnly || !doc || e.button > 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-editing]') || target.closest('[data-float]')) return;
    const pg = doc.pages[pi];
    const el = target.closest<HTMLElement>('[data-item]');
    if (pi !== ap) setPageIdx(pi);
    if (!el) {
      finishEdit();
      setSelId(null);
      setPanel((p) => (p && window.innerWidth < 768 ? null : p));
      return;
    }
    const it = pg.items.find((x) => x.id === el.dataset.item);
    if (!it) return;
    const was = selId === it.id && pi === ap;
    if (editing.current && editing.current.id !== it.id) finishEdit();
    setSelId(it.id);
    const c = target.closest<HTMLElement>('[data-cell]')?.dataset.cell?.split('-').map(Number) as [number, number] | undefined;
    if (it.locked) return;
    const p = ptIn(pi, e);
    begin({ kind: 'move', pi, id: it.id, sx: p.x, sy: p.y, ox: it.x, oy: it.y, snap: doc, moved: false, was, cell: c }, e);
  };

  const onDbl = (e: React.MouseEvent, pi: number) => {
    if (readOnly || !doc) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-item]');
    const it = doc.pages[pi].items.find((x) => x.id === el?.dataset.item);
    if (!it || it.locked) return;
    if (it.type === 'text') startEdit(it.id, pi);
    if (it.type === 'char') setCharDlg({ look: it.look, itemId: it.id, flip: it.flip });
    const c = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]')?.dataset.cell?.split('-').map(Number) as [number, number] | undefined;
    if (it.type === 'table' && c) startEdit(it.id, pi, c);
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
    if (!ctl || readOnly || present !== null || charDlg || help) return;
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
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && k === 'y') {
        e.preventDefault();
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
      if (e.key === 'Tab') {
        const items = ctl.page.items;
        if (!items.length) return;
        e.preventDefault();
        const i = sel ? items.findIndex((x) => x.id === sel.id) : -1;
        const n = items.length;
        setSelId(items[(((e.shiftKey ? (i < 0 ? 0 : i) - 1 : i + 1) % n) + n) % n].id);
        return;
      }
      if (!sel) {
        if (mod || e.altKey) return;
        // เพิ่มชิ้นงานเร็ว: T ข้อความ R สี่เหลี่ยม C วงกลม L เส้น
        if (k === 't') ctl.add(makeText({ text: 'พิมพ์ข้อความ' }));
        else if (k === 'r') ctl.add(makeShape('rect', { w: 240, h: 160 }));
        else if (k === 'c') ctl.add(makeShape('circle', { fill: '#7dd3fc' }));
        else if (k === 'l') ctl.add(makeLine());
        else if (e.key === 'PageDown' || e.key === 'PageUp') ctl.goPage(ap + (e.key === 'PageDown' ? 1 : -1));
        else return;
        e.preventDefault();
        return;
      }
      const code = e.code;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (sel.locked) say('ชิ้นนี้ล็อกอยู่ ปลดล็อกก่อนลบ (Alt+Shift+L)');
        else ctl.remove(sel.id);
      } else if (mod && k === 'd') {
        e.preventDefault();
        ctl.duplicate(sel.id);
      } else if (mod && e.altKey && k === 'c') {
        e.preventDefault();
        styleClip.current = styleOf(sel);
        say('คัดลอกสไตล์แล้ว เลือกชิ้นชนิดเดียวกันแล้วกด Ctrl+Alt+V');
      } else if (mod && e.altKey && k === 'v') {
        e.preventDefault();
        const st = styleClip.current;
        if (!st) say('ยังไม่ได้คัดลอกสไตล์ (Ctrl+Alt+C)');
        else if (st.type !== sel.type) say('วางสไตล์ได้กับชิ้นชนิดเดียวกันเท่านั้น');
        else ctl.update(sel.id, st as Partial<Item>);
      } else if (mod && k === 'c') {
        clip.current = structuredClone(sel);
      } else if (mod && k === 'x') {
        clip.current = structuredClone(sel);
        if (!sel.locked) ctl.remove(sel.id);
      } else if (mod && (code === 'BracketRight' || code === 'BracketLeft')) {
        e.preventDefault();
        const up = code === 'BracketRight';
        ctl.order(sel.id, e.altKey || e.shiftKey ? (up ? 'front' : 'back') : up ? 'up' : 'down');
      } else if (e.altKey && e.shiftKey && k === 'l') {
        e.preventDefault();
        ctl.update(sel.id, { locked: !sel.locked });
        say(sel.locked ? 'ปลดล็อกแล้ว' : 'ล็อกแล้ว');
      } else if (sel.type === 'text' && mod && !e.shiftKey && (k === 'b' || k === 'i' || k === 'u')) {
        e.preventDefault();
        const f = k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'underline';
        ctl.update(sel.id, { [f]: !sel[f] } as Partial<Item>);
      } else if (sel.type === 'text' && mod && e.shiftKey && (k === 'l' || k === 'e' || k === 'r')) {
        e.preventDefault();
        ctl.update(sel.id, { align: k === 'l' ? 'left' : k === 'e' ? 'center' : 'right' } as Partial<Item>);
      } else if ((sel.type === 'text' || sel.type === 'table') && mod && e.shiftKey && (code === 'Comma' || code === 'Period')) {
        e.preventDefault();
        ctl.update(sel.id, { size: Math.max(6, Math.min(400, sel.size + (code === 'Period' ? 2 : -2))) } as Partial<Item>, 'size');
      } else if (e.key === 'Escape') {
        setSelId(null);
      } else if (e.key === 'Enter' && (sel.type === 'text' || sel.type === 'table')) {
        e.preventDefault();
        startEdit(sel.id, ap, sel.type === 'table' ? [0, 0] : null);
      } else if (e.key.startsWith('Arrow') && !sel.locked) {
        e.preventDefault();
        const st = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0;
        const dy = e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0;
        ctl.update(sel.id, { x: sel.x + dx, y: sel.y + dy }, 'nudge');
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
      if (clip.current && !txt) {
        e.preventDefault();
        const c = clip.current;
        ctl.add({ ...structuredClone(c), x: c.x + 24, y: c.y + 24 } as Item);
        clip.current = { ...c, x: c.x + 24, y: c.y + 24 } as Item;
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
  }, [ctl, sel, readOnly, undo, redo, startEdit, ap, present, charDlg, help, doSave, say, fit, finishEdit]);

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

  return (
    <div className="st-shell" data-readonly={readOnly}>
      {/* ---------------- แถบบน (โทนแบบ Canva) ---------------- */}
      <header className="st-top">
        <Link href="/studio?tab=library" className="st-topbtn" title="กลับไปคลังสื่อ">
          <ChevronLeft className="w-5 h-5" />
          <span className="max-md:hidden">หน้าแรก</span>
        </Link>
        {!readOnly && (
          <Pop title="ปรับขนาดสื่อ" width={330} className="st-topbtn st-g st-g-sky max-sm:!hidden" button={<><Scaling className="w-4 h-4" /> ปรับขนาด</>}>
            {(close) => <SizePicker ctl={ctl} onDone={close} />}
          </Pop>
        )}
        <span className="st-top-sep max-sm:hidden" />
        {!readOnly && (
          <>
            <button type="button" className="st-topbtn st-topicon" onClick={undo} disabled={!past.current.length} title="ย้อนกลับ (Ctrl+Z)" aria-label="ย้อนกลับ">
              <Undo2 className="w-5 h-5" />
            </button>
            <button type="button" className="st-topbtn st-topicon max-sm:!hidden" onClick={redo} disabled={!future.current.length} title="ทำซ้ำ (Ctrl+Y)" aria-label="ทำซ้ำ">
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
          <button type="button" className={`st-topbtn st-g ${isPublic ? 'st-g-mint' : 'st-g-slate'}`} data-on={isPublic} onClick={() => setIsPublic(!isPublic)} title={isPublic ? 'Public: สมาชิกคนอื่นเห็นใน Discover แตะเพื่อเปลี่ยนเป็น Private' : 'Private: เห็นเฉพาะคุณ แตะเพื่อเปลี่ยนเป็น Public'}>
            {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span className="max-md:hidden">{isPublic ? 'Public' : 'Private'}</span>
          </button>
        )}
        {readOnly && (
          <button type="button" className="st-topbtn st-g st-g-sky" onClick={copyMine} disabled={copying || tier === 'guest'}>
            {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />} <span className="max-sm:hidden">ทำสำเนาไปแก้</span>
          </button>
        )}
        <button type="button" className="st-topbtn st-g st-g-grape" onClick={() => (finishEdit(), setSelId(null), setPresent(ap))} title="นำเสนอเต็มจอ">
          <MonitorPlay className="w-4 h-4" /> <span className="max-sm:hidden">นำเสนอ</span>
        </button>
        <ExportMenu pages={doc.pages.length} busy={!!exporting} label={exportLabel} onPick={runExport} />
      </header>

      <div className="st-body">
        {!readOnly && (
          <>
            <nav className="st-rail" aria-label="เครื่องมือ">
              {RAIL.map((r) => (
                <button key={r.id} type="button" className="st-rail-btn" data-on={panel === r.id} onClick={() => setPanel(panel === r.id ? null : r.id)} style={{ ['--c' as string]: r.color }}>
                  <span className="st-rail-ic">{r.icon}</span>
                  <span className="st-rail-tx">{r.label}</span>
                </button>
              ))}
            </nav>
            {panel && <Panels id={panel} ctl={ctl} onClose={() => setPanel(null)} />}
          </>
        )}

        <div className="st-work">
          {!readOnly && <Inspector ctl={ctl} />}
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
            onWheel={(e) => {
              if (!e.ctrlKey) return;
              e.preventDefault();
              setAutoFit(false);
              setZoom((z) => Math.max(0.1, Math.min(3, z * (e.deltaY < 0 ? 1.1 : 0.9))));
            }}
            onDragOver={(e) => {
              if (!readOnly && e.dataTransfer.types.includes('Files')) e.preventDefault();
            }}
            onDrop={(e) => {
              if (readOnly) return;
              e.preventDefault();
              if (!ctl.canUpload) return say('ต้องเข้าสู่ระบบก่อนจึงอัปโหลดรูปได้');
              ctl.upload(e.dataTransfer.files);
            }}
          >
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
                        <PageView page={p} W={W} H={H} editText={active ? editText : undefined} editCell={active ? editCell : undefined} editId={active ? editId : null}>
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

      {help && <ShortcutHelp onClose={() => setHelp(false)} />}
      {present !== null && <Presenter doc={doc} start={present} onClose={() => setPresent(null)} />}
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
            <div ref={thumbEl} style={{ width: W, height: H }}>
              <PageView page={doc.pages[0]} W={W} H={H} />
            </div>
            {exporting && (
              <div ref={stageEl}>
                {doc.pages.map((p) => (
                  <PageView key={p.id} page={p} W={W} H={H} />
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
        <span className="max-sm:hidden">{busy ? label : 'ดาวน์โหลด'}</span>
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
