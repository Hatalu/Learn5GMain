'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpenCheck, CloudUpload, LayoutTemplate, Loader2, PaintBucket, Pencil, QrCode, Search, Shapes, Smile, Sparkles, Square, Trash2, Type, Upload, UserRound, Wand2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { sanitizeQuiz } from '@/lib/game-creator/quiz';
import { mediaPrefix } from '@/lib/game-creator/prefix';
import { quizPages } from '@/lib/studio/fromQuiz';
import { ANIMAL_PRESETS, CHAR_PRESETS, DEFAULT_LOOK, SPECIES, cleanLook, withSpecies, type CharLook } from '@/lib/studio/char';
import { KITS, KIT_SUBJECTS, kitDefaults, type Kit, type KitSubject, type KitValue } from '@/lib/studio/kits';
import { CharArt } from './CharArt';
import {
  blankBg,
  CUSTOM_MAX,
  CUSTOM_MIN,
  designMediaPaths,
  CORNER_IDS,
  DIVIDER_IDS,
  EDU_KINDS,
  TAPE_IDS,
  makeChar,
  makeDeco,
  makeEdu,
  makeImage,
  makeLine,
  makeShape,
  makeSticker,
  makeTable,
  makeText,
  makeWrite,
  MAX_PAGES,
  mmToPx,
  pxToMm,
  SIZES,
  uid,
  type BorderStyle,
  type DecoStyle,
  type Design,
  type Item,
  type Page,
  type Pattern,
  type TextItem,
  type WriteKind,
} from '@/lib/studio/doc';
import { SHAPES } from './shapes';
import { STICKERS, STICKER_CATS, StickerArt, type StickerCat } from './stickers';
import { TEMPLATES } from './templates';
import { BorderArt, ItemView, PageThumb, bgStyle, textCss } from './render';
import { ColorGrid, Slider } from './ui';
import { FxPicker } from './Inspector';
import { UsageMeter } from '@/components/creator/UsageMeter';
import type { Ctl } from './Editor';

export type PanelId = 'template' | 'shape' | 'text' | 'sticker' | 'char' | 'edu' | 'image' | 'bg';

export const RAIL: { id: PanelId; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'template', label: 'แม่แบบ', icon: <LayoutTemplate className="w-5 h-5" />, color: '#8b3dff' },
  { id: 'shape', label: 'องค์ประกอบ', icon: <Shapes className="w-5 h-5" />, color: '#2a73d9' },
  { id: 'text', label: 'ข้อความ', icon: <Type className="w-5 h-5" />, color: '#e8456b' },
  { id: 'sticker', label: 'สติกเกอร์', icon: <Smile className="w-5 h-5" />, color: '#e07a12' },
  { id: 'char', label: 'ตัวละคร', icon: <UserRound className="w-5 h-5" />, color: '#db2777' },
  { id: 'edu', label: 'สื่อการสอน', icon: <BookOpenCheck className="w-5 h-5" />, color: '#0f766e' },
  { id: 'image', label: 'อัปโหลด', icon: <CloudUpload className="w-5 h-5" />, color: '#2f9e6e' },
  { id: 'bg', label: 'พื้นหลัง', icon: <PaintBucket className="w-5 h-5" />, color: '#c026d3' },
];

const TITLES: Record<PanelId, string> = {
  template: 'แม่แบบสำเร็จรูป',
  shape: 'องค์ประกอบและของตกแต่ง',
  text: 'ข้อความ',
  sticker: 'สติกเกอร์',
  char: 'ตัวละครแต่งเอง',
  edu: 'เครื่องมือสร้างสื่อการสอน',
  image: 'อัปโหลดรูปและ QR Code',
  bg: 'พื้นหลังและกรอบหน้า',
};

export function Panels({ id, ctl, onClose }: { id: PanelId; ctl: Ctl; onClose: () => void }) {
  return (
    <aside className="st-panel" aria-label={TITLES[id]}>
      <div className="st-panel-head">
        <h2>{TITLES[id]}</h2>
        <button type="button" className="st-tb" onClick={onClose} aria-label="ปิดแผง">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="st-panel-body">
        {id === 'template' && <TemplatePanel ctl={ctl} />}
        {id === 'text' && <TextPanel ctl={ctl} />}
        {id === 'shape' && <ShapePanel ctl={ctl} />}
        {id === 'sticker' && <StickerPanel ctl={ctl} />}
        {id === 'char' && <CharPanel ctl={ctl} />}
        {id === 'image' && <ImagePanel ctl={ctl} />}
        {id === 'edu' && <EduPanel ctl={ctl} />}
        {id === 'bg' && <BgPanel ctl={ctl} />}
      </div>
    </aside>
  );
}

const Sec = ({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) => (
  <section className="st-sec">
    <h3>{title}</h3>
    {note && <p className="st-note">{note}</p>}
    {children}
  </section>
);

/* ------------------------------------------------------------------ แม่แบบ */

/** ย่อ/ขยายหน้าจากขนาดหนึ่งให้พอดีอีกขนาด (คงสัดส่วน จัดกลาง) */
export function fitPage(p: Page, from: { w: number; h: number }, to: { w: number; h: number }): Page {
  const s = Math.min(to.w / from.w, to.h / from.h);
  const ox = (to.w - from.w * s) / 2;
  const oy = (to.h - from.h * s) / 2;
  if (Math.abs(s - 1) < 0.001 && !ox && !oy) return { ...p, id: uid(), items: p.items.map((x) => ({ ...x, id: uid() })) };
  return {
    ...p,
    id: uid(),
    border: { ...p.border, w: Math.max(1, p.border.w * s) },
    items: p.items.map((it) => {
      const o = { ...it, id: uid(), x: it.x * s + ox, y: it.y * s + oy, w: it.w * s, h: it.h * s } as Item;
      if (o.type === 'text' || o.type === 'table') (o as TextItem).size = Math.max(6, Math.round(o.size * s * 10) / 10);
      if (o.type === 'text') o.strokeW = o.strokeW * s;
      if (o.type === 'line' || o.type === 'write' || o.type === 'shape' || o.type === 'table') (o as { sw: number }).sw = Math.max(0.5, (o as { sw: number }).sw * s);
      if (o.type === 'write') o.gap = Math.max(12, o.gap * s);
      if (o.type === 'image') o.bw = o.bw * s;
      return o;
    }),
  };
}

function TemplatePanel({ ctl }: { ctl: Ctl }) {
  const apply = (make: () => Design) => {
    const t = make();
    const pages = t.pages.map((p) => fitPage(p, t.size, ctl.doc.size));
    const d = ctl.doc;
    const i = ctl.pageIdx;
    if (!d.pages[i].items.length) {
      // หน้าว่าง: ใส่แม่แบบแทนหน้านี้เลย
      ctl.commit({ ...d, pages: [...d.pages.slice(0, i), ...pages, ...d.pages.slice(i + 1)].slice(0, 30) });
    } else {
      ctl.commit({ ...d, pages: [...d.pages.slice(0, i + 1), ...pages, ...d.pages.slice(i + 1)].slice(0, 30) });
      ctl.goPage(i + 1);
    }
  };
  return (
    <>
      <p className="st-note">หน้าว่างจะถูกแทนด้วยแม่แบบ ถ้าหน้านี้มีของอยู่แล้วจะเพิ่มเป็นหน้าใหม่ต่อท้าย ทุกชิ้นแก้ไขได้</p>
      <div className="grid grid-cols-2 gap-3">
        {TEMPLATES.map((t) => {
          const d = t.make();
          return (
            <button key={t.id} type="button" className="st-tpl" onClick={() => apply(t.make)} style={{ ['--a' as string]: t.accent }}>
              <span className="st-tpl-art">
                <PageThumb page={d.pages[0]} W={d.size.w} H={d.size.h} width={d.size.w > d.size.h ? 128 : 96} />
              </span>
              <b>{t.label}</b>
              <small>{t.note}</small>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ ข้อความ */

const HEADINGS: { label: string; t: Partial<TextItem> }[] = [
  { label: 'หัวเรื่องใหญ่', t: { text: 'หัวเรื่องใหญ่', size: 56, bold: true, font: 'kanit', w: 600 } },
  { label: 'หัวข้อ', t: { text: 'หัวข้อ', size: 38, bold: true, font: 'kanit', w: 520 } },
  { label: 'หัวข้อย่อย', t: { text: 'หัวข้อย่อย', size: 28, bold: true, font: 'prompt', w: 460 } },
  { label: 'เนื้อความ', t: { text: 'พิมพ์เนื้อความตรงนี้ ข้อความยาวจะขึ้นบรรทัดใหม่ให้เอง', size: 22, align: 'left', w: 560, lh: 1.6 } },
  { label: 'คำอธิบายเล็ก', t: { text: 'คำอธิบายเพิ่มเติม', size: 16, color: '#5b5285', w: 360 } },
];

export const WORDART: { label: string; t: Partial<TextItem> }[] = [
  { label: 'ขอบขาวเงาทึบ', t: { text: 'สนุกจัง', font: 'chonburi', size: 64, color: '#7c5cf0', stroke: '#ffffff', strokeW: 5, shadow: true } },
  { label: 'การ์ตูน', t: { text: 'เก่งมาก!', font: 'pattaya', size: 64, color: '#ffd166', stroke: '#2a2350', strokeW: 5 } },
  { label: 'ป้ายแคปซูล', t: { text: 'บทที่ 1', font: 'kanit', size: 36, bold: true, color: '#ffffff', bg: '#ff6b7a' } },
  { label: 'หัวเรื่องฟ้า', t: { text: 'วิทยาศาสตร์', font: 'kanit', size: 56, bold: true, color: '#2a73d9', stroke: '#cfeaff', strokeW: 6 } },
  { label: 'ลายมือ', t: { text: 'ลองทำดูนะ', font: 'itim', size: 44, color: '#e8456b' } },
  { label: 'ตัวเขียนสวย', t: { text: 'ยินดีต้อนรับ', font: 'charm', size: 56, bold: true, color: '#b7791f' } },
  { label: 'เงาเด้ง', t: { text: 'ภาษาไทย', font: 'mali', size: 56, bold: true, color: '#34d399', shadow: true, stroke: '#ffffff', strokeW: 3 } },
  { label: 'ป้ายเหลือง', t: { text: 'จำให้ดีนะ', font: 'itim', size: 34, color: '#2a2350', bg: '#ffe066' } },
  { label: 'ตัวเหลี่ยมเท่', t: { text: 'MISSION', font: 'chakra', size: 56, bold: true, color: '#0f766e', ls: 4 } },
  { label: 'ป้ายม่วง', t: { text: 'กิจกรรม', font: 'prompt', size: 34, bold: true, color: '#ffffff', bg: '#7c5cf0' } },
];

function Preview({ t }: { t: Partial<TextItem> }) {
  const full = makeText(t);
  const css = textCss({ ...full, size: Math.min(26, full.size * 0.5) });
  return (
    <span className="st-wa">
      <span
        style={{
          ...css,
          whiteSpace: 'nowrap',
          WebkitTextStroke: full.stroke && full.strokeW ? `${Math.max(1, full.strokeW * 0.5)}px ${full.stroke}` : undefined,
          paintOrder: 'stroke fill',
          background: full.bg || undefined,
          padding: full.bg ? '2px 10px' : undefined,
          borderRadius: 999,
          textShadow: full.shadow ? '2px 2px 0 rgba(42,35,80,.32)' : undefined,
        }}
      >
        {full.text}
      </span>
    </span>
  );
}

function TextPanel({ ctl }: { ctl: Ctl }) {
  return (
    <>
      <button type="button" className="st-big-add" onClick={() => ctl.add(makeText())}>
        <Type className="w-5 h-5" /> เพิ่มกล่องข้อความ
      </button>
      <Sec title="หัวเรื่องและเนื้อความ">
        <div className="flex flex-col gap-2">
          {HEADINGS.map((h) => (
            <button key={h.label} type="button" className="st-row-btn" onClick={() => ctl.add(makeText(h.t))}>
              <span style={{ ...textCss(makeText(h.t)), fontSize: Math.min(30, (h.t.size ?? 28) * 0.55), textAlign: 'left', whiteSpace: 'nowrap' }}>{h.label}</span>
            </button>
          ))}
        </div>
      </Sec>
      <Sec title="อักษรศิลป์" note="กดแล้วดับเบิลคลิกเพื่อแก้คำ">
        <div className="grid grid-cols-2 gap-2">
          {WORDART.map((w) => (
            <button key={w.label} type="button" className="st-wa-btn" onClick={() => ctl.add(makeText({ w: 460, ...w.t }))} title={w.label}>
              <Preview t={w.t} />
            </button>
          ))}
        </div>
      </Sec>
      <p className="st-note">เคล็ดลับ: ดับเบิลคลิกที่ข้อความเพื่อพิมพ์ คัดลอกข้อความจากที่อื่นแล้วกด Ctrl+V บนหน้าได้เลย</p>
    </>
  );
}

/* ------------------------------------------------------------------ รูปทรง */

const SHAPE_COLORS = ['#a78bfa', '#ff8fab', '#7cc6ff', '#ffd166', '#6ee7b7', '#ffb347'];
const LINES: { label: string; it: () => Item }[] = [
  { label: 'เส้นตรง', it: () => makeLine() },
  { label: 'เส้นประ', it: () => makeLine({ dash: 'dash' }) },
  { label: 'เส้นจุด', it: () => makeLine({ dash: 'dot', sw: 5 }) },
  { label: 'ลูกศร', it: () => makeLine({ end: 'arrow' }) },
  { label: 'ลูกศรสองหัว', it: () => makeLine({ start: 'arrow', end: 'arrow' }) },
  { label: 'เส้นหัวจุด', it: () => makeLine({ start: 'dot', end: 'dot' }) },
];

const DECO_COLORS: [string, string][] = [
  ['#7c5cf0', '#ffd166'],
  ['#ff6b7a', '#7cc6ff'],
  ['#2f9e6e', '#ffd166'],
  ['#2a73d9', '#ff8fab'],
  ['#e07a12', '#7c5cf0'],
  ['#e8456b', '#6ee7b7'],
];
const FRAME_LABEL: Partial<Record<BorderStyle, string>> = {
  line: 'เส้นเดียว', double: 'เส้นคู่', dash: 'เส้นประ', round: 'มุมมน', dots: 'จุดกลม', stars: 'ดาว', wave: 'คลื่น', corner: 'มุมหรู', hearts: 'หัวใจ', flowers: 'ดอกไม้', zigzag: 'ซิกแซก',
  stamp: 'แสตมป์', checker: 'ตาหมากรุก', rainbow: 'สายรุ้ง', bubbles: 'ฟองสบู่', ribbon: 'ริบบิ้นเย็บ', leaves: 'ใบไม้', scallop: 'ขอบหยัก',
};

function DecoGrid({ ctl, ids, cols }: { ctl: Ctl; ids: readonly DecoStyle[]; cols: number }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {ids.map((id, i) => {
        const [c, c2] = DECO_COLORS[i % DECO_COLORS.length];
        const it = makeDeco(id, c, c2);
        return (
          <button key={id} type="button" className="st-cell st-cell-deco" title={FRAME_LABEL[id as BorderStyle] || id} aria-label={FRAME_LABEL[id as BorderStyle] || 'ของตกแต่ง'} onClick={() => ctl.add(makeDeco(id, c, c2))}>
            <Mini it={it} size={cols === 1 ? 230 : 64} />
          </button>
        );
      })}
    </div>
  );
}

function ShapePanel({ ctl }: { ctl: Ctl }) {
  const frames = (Object.keys(FRAME_LABEL) as BorderStyle[]).filter((x) => x !== 'none') as unknown as DecoStyle[];
  return (
    <>
      <Sec title="เอฟเฟกต์" note={ctl.sel ? 'ใช้กับชิ้นที่เลือกอยู่ (ใส่ได้ทุกชนิด: ข้อความ รูป สติกเกอร์ ตัวละคร)' : 'เลือกชิ้นงานบนหน้าก่อน แล้วกดเอฟเฟกต์ที่ชอบ'}>
        {ctl.sel ? <FxPicker it={ctl.sel} up={(p, k) => ctl.update(ctl.sel!.id, p, k)} /> : null}
      </Sec>
      <Sec title="กรอบตกแต่ง" note="วางกรอบรอบเนื้อหาส่วนไหนก็ได้ ย่อขยายและเปลี่ยนสีได้">
        <DecoGrid ctl={ctl} ids={frames} cols={3} />
      </Sec>
      <Sec title="เส้นคั่นสวยๆ">
        <DecoGrid ctl={ctl} ids={DIVIDER_IDS} cols={2} />
      </Sec>
      <Sec title="เทปตกแต่ง">
        <DecoGrid ctl={ctl} ids={TAPE_IDS} cols={2} />
      </Sec>
      <Sec title="มุมประดับ" note="หมุนหรือกลับด้านเพื่อวางมุมอื่น">
        <DecoGrid ctl={ctl} ids={CORNER_IDS} cols={4} />
      </Sec>
      <Sec title="รูปทรง">
        <div className="grid grid-cols-4 gap-2">
          {SHAPES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="st-cell"
              title={s.label}
              aria-label={s.label}
              onClick={() => ctl.add(makeShape(s.id, { fill: SHAPE_COLORS[i % SHAPE_COLORS.length], w: s.box?.[0] ?? 200, h: s.box?.[1] ?? 200 }))}
            >
              <svg viewBox="-4 -4 108 108" className="w-full h-full">
                <path d={s.d} fill={SHAPE_COLORS[i % SHAPE_COLORS.length]} fillRule="evenodd" stroke="#2a2350" strokeWidth="4" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </Sec>
      <Sec title="เส้นและลูกศร">
        <div className="grid grid-cols-2 gap-2">
          {LINES.map((l) => {
            const it = l.it() as Extract<Item, { type: 'line' }>;
            return (
              <button key={l.label} type="button" className="st-row-btn" onClick={() => ctl.add(l.it())}>
                <svg viewBox="0 0 100 20" className="w-16 h-4 shrink-0">
                  <line x1={it.start === 'none' ? 4 : 14} x2={it.end === 'none' ? 96 : 86} y1="10" y2="10" stroke="#2a2350" strokeWidth="4" strokeDasharray={it.dash === 'dash' ? '12 8' : it.dash === 'dot' ? '0 10' : undefined} strokeLinecap="round" />
                  {it.end === 'arrow' && <path d="M98,10 L84,2 L84,18 Z" fill="#2a2350" />}
                  {it.start === 'arrow' && <path d="M2,10 L16,2 L16,18 Z" fill="#2a2350" />}
                  {it.start === 'dot' && <circle cx="8" cy="10" r="6" fill="#2a2350" />}
                  {it.end === 'dot' && <circle cx="92" cy="10" r="6" fill="#2a2350" />}
                </svg>
                <span className="text-sm font-bold">{l.label}</span>
              </button>
            );
          })}
        </div>
      </Sec>
    </>
  );
}

/* ------------------------------------------------------------------ สติกเกอร์ */

function StickerPanel({ ctl }: { ctl: Ctl }) {
  const [cat, setCat] = useState<StickerCat | 'all'>('all');
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const catLabel = (c: StickerCat) => STICKER_CATS.find((x) => x.id === c)?.label ?? '';
  const list = STICKERS.filter((s) => (cat === 'all' || s.cat === cat) && (!term || s.label.toLowerCase().includes(term) || catLabel(s.cat).includes(term)));
  return (
    <>
      <label className="st-search">
        <Search className="w-4 h-4" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาสติกเกอร์ เช่น คณิต แมว ดาว" aria-label="ค้นหาสติกเกอร์" />
      </label>
      <div className="st-chips mt-3">
        <button type="button" data-on={cat === 'all'} onClick={() => setCat('all')}>
          ทั้งหมด
        </button>
        {STICKER_CATS.map((c) => (
          <button key={c.id} type="button" data-on={cat === c.id} onClick={() => setCat(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      {!list.length && <p className="st-note mt-3">ไม่พบสติกเกอร์ที่ค้นหา</p>}
      <div className="grid grid-cols-4 gap-2 mt-3">
        {list.map((s) => (
          <button key={s.id} type="button" className="st-cell" title={s.label} aria-label={s.label} onClick={() => ctl.add(makeSticker(s.id))}>
            <StickerArt id={s.id} className="w-full h-full" />
          </button>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ รูปภาพ + QR */

function ImagePanel({ ctl }: { ctl: Ctl }) {
  const file = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [qrErr, setQrErr] = useState('');
  const [qrBusy, setQrBusy] = useState(false);
  const addQr = async () => {
    const v = url.trim();
    let ok = false;
    try {
      const u = new URL(v);
      ok = u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      ok = false;
    }
    if (!ok) return setQrErr('ใส่ลิงก์ที่ขึ้นต้นด้วย https:// เช่น ลิงก์คลิป YouTube หรือแบบฟอร์ม');
    if (v.length > 900) return setQrErr('ลิงก์ยาวเกินไป');
    setQrErr('');
    setQrBusy(true);
    try {
      const { default: QRCode } = await import('qrcode');
      const png = await QRCode.toDataURL(v, { margin: 1, width: 360, color: { dark: '#2a2350', light: '#ffffff' }, errorCorrectionLevel: 'M' });
      ctl.add({ ...makeImage(png, 200, 200) });
      setUrl('');
    } catch {
      setQrErr('สร้าง QR ไม่สำเร็จ');
    }
    setQrBusy(false);
  };
  return (
    <>
      {ctl.canUpload ? (
        <>
          <button type="button" className="st-drop" onClick={() => file.current?.click()} disabled={ctl.uploading}>
            {ctl.uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
            <b>{ctl.uploading ? 'กำลังอัปโหลด…' : 'อัปโหลดรูปจากเครื่อง'}</b>
            <small>JPG PNG WEBP GIF · ลากรูปมาวางบนหน้า หรือกด Ctrl+V วางรูปที่คัดลอกไว้ก็ได้</small>
          </button>
          <input
            ref={file}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) ctl.upload(e.target.files);
              e.target.value = '';
            }}
          />
          <div className="mt-3">
            <UsageMeter compact keepPaths={() => designMediaPaths(ctl.doc)} />
          </div>
        </>
      ) : (
        <p className="st-note">ต้องเข้าสู่ระบบก่อนจึงจะอัปโหลดรูปได้</p>
      )}
      <Sec title="QR Code" note="ให้นักเรียนสแกนไปดูคลิป แบบฟอร์ม หรือเว็บไซต์">
        <div className="flex gap-2">
          <input className="st-input flex-1" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." onKeyDown={(e) => e.key === 'Enter' && addQr()} aria-label="ลิงก์สำหรับ QR Code" />
          <button type="button" className="l5g-btn l5g-btn-violet l5g-btn-sm" onClick={addQr} disabled={qrBusy || !url.trim()}>
            {qrBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />} สร้าง
          </button>
        </div>
        {qrErr && <p className="text-xs font-bold text-rose-600 mt-1.5">{qrErr}</p>}
      </Sec>
    </>
  );
}

/* ------------------------------------------------------------------ ใบงาน */

const WRITES: { kind: WriteKind; label: string }[] = [
  { kind: 'lines', label: 'บรรทัดเขียน' },
  { kind: 'dotted', label: 'บรรทัดจุดไข่ปลา' },
  { kind: 'four', label: 'บรรทัด 4 เส้น (คัดลายมือ)' },
  { kind: 'grid', label: 'ตารางสี่เหลี่ยม' },
  { kind: 'dots', label: 'จุดตาราง' },
  { kind: 'box', label: 'กรอบคำตอบ' },
];

const SHEET_TEXT: { label: string; t: Partial<TextItem> }[] = [
  { label: 'ช่องชื่อ ชั้น เลขที่', t: { text: 'ชื่อ ........................................  ชั้น ...........  เลขที่ ........', size: 20, align: 'left', w: 700 } },
  { label: 'ตัวเลือก ก ข ค ง', t: { text: 'ก. ......................        ข. ......................\nค. ......................        ง. ......................', size: 22, align: 'left', w: 600, lh: 1.9 } },
  { label: 'เติมคำในช่องว่าง', t: { text: '1. ______________________________\n2. ______________________________\n3. ______________________________', size: 22, align: 'left', w: 560, lh: 2 } },
  { label: 'ถูก / ผิด', t: { text: '(   ) ถูก     (   ) ผิด', size: 22, align: 'left', w: 280 } },
  { label: 'คำชี้แจง', t: { text: 'คำชี้แจง: ', size: 20, align: 'left', italic: true, color: '#5b5285', w: 700 } },
];

const BADGE_COLORS = ['#7c5cf0', '#ff6b7a', '#2f9e6e', '#2a73d9', '#e07a12'];

function SheetPanel({ ctl }: { ctl: Ctl }) {
  const [hover, setHover] = useState<[number, number]>([0, 0]);
  return (
    <>
      <Sec title="บรรทัดและช่องเขียน">
        <div className="grid grid-cols-2 gap-2">
          {WRITES.map((w) => (
            <button key={w.kind} type="button" className="st-wr" onClick={() => ctl.add(makeWrite(w.kind))}>
              <svg viewBox="0 0 120 60" className="w-full h-12">
                {w.kind === 'lines' && [15, 30, 45].map((y) => <line key={y} x1="4" x2="116" y1={y} y2={y} stroke="#9b8fd0" strokeWidth="2" />)}
                {w.kind === 'dotted' && [15, 30, 45].map((y) => <line key={y} x1="4" x2="116" y1={y} y2={y} stroke="#9b8fd0" strokeWidth="2.5" strokeDasharray="0 6" strokeLinecap="round" />)}
                {w.kind === 'four' && (
                  <>
                    <line x1="4" x2="116" y1="10" y2="10" stroke="#9b8fd0" strokeWidth="2" />
                    <line x1="4" x2="116" y1="24" y2="24" stroke="#9b8fd0" strokeWidth="2" strokeDasharray="6 4" />
                    <line x1="4" x2="116" y1="38" y2="38" stroke="#ff8fab" strokeWidth="2.4" />
                    <line x1="4" x2="116" y1="52" y2="52" stroke="#9b8fd0" strokeWidth="2" />
                  </>
                )}
                {w.kind === 'grid' && (
                  <g stroke="#9b8fd0" strokeWidth="1.5">
                    {[4, 22, 40, 58, 76, 94, 112].map((x) => (
                      <line key={x} x1={x} x2={x} y1="4" y2="58" />
                    ))}
                    {[4, 22, 40, 58].map((y) => (
                      <line key={y} x1="4" x2="112" y1={y} y2={y} />
                    ))}
                  </g>
                )}
                {w.kind === 'dots' && [12, 30, 48].flatMap((y) => [10, 28, 46, 64, 82, 100].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.5" fill="#9b8fd0" />))}
                {w.kind === 'box' && <rect x="6" y="6" width="108" height="48" rx="8" fill="none" stroke="#2a2350" strokeWidth="2.5" />}
              </svg>
              <span>{w.label}</span>
            </button>
          ))}
        </div>
      </Sec>
      <Sec title="ตาราง" note={`ลากเลือกขนาด: ${hover[0] || '-'} แถว x ${hover[1] || '-'} คอลัมน์`}>
        <div className="st-tgrid" onPointerLeave={() => setHover([0, 0])}>
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 6 }, (_, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                data-on={r < hover[0] && c < hover[1]}
                onPointerEnter={() => setHover([r + 1, c + 1])}
                onFocus={() => setHover([r + 1, c + 1])}
                onClick={() => ctl.add(makeTable(r + 1, c + 1))}
                aria-label={`ตาราง ${r + 1} แถว ${c + 1} คอลัมน์`}
              />
            ))
          )}
        </div>
      </Sec>
      <Sec title="ข้อความสำหรับใบงาน">
        <div className="flex flex-col gap-2">
          {SHEET_TEXT.map((s) => (
            <button key={s.label} type="button" className="st-row-btn" onClick={() => ctl.add(makeText(s.t))}>
              <span className="text-sm font-bold">{s.label}</span>
            </button>
          ))}
        </div>
      </Sec>
      <Sec title="ป้ายเลขข้อ">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }, (_, i) => (
            <button
              key={i}
              type="button"
              className="st-num"
              style={{ background: BADGE_COLORS[i % BADGE_COLORS.length] }}
              onClick={() => ctl.add(makeText({ text: String(i + 1), size: 24, bold: true, color: '#ffffff', bg: BADGE_COLORS[i % BADGE_COLORS.length], w: 56 }))}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </Sec>
    </>
  );
}

/* ------------------------------------------------------------------ พื้นหลัง */

const GRADS: [string, string, number][] = [
  ['#fdf2ff', '#e0f2fe', 135],
  ['#fff7e0', '#ffe4e8', 160],
  ['#e0fff4', '#e0f2fe', 135],
  ['#7c5cf0', '#e8456b', 135],
  ['#2a73d9', '#7cc6ff', 180],
  ['#22c55e', '#0ea5e9', 160],
  ['#ffd166', '#ff9a3d', 135],
  ['#1e1b4b', '#7c3aed', 160],
];
const PATTERNS: { id: Pattern; label: string }[] = [
  { id: 'none', label: 'ไม่มีลาย' },
  { id: 'dots', label: 'จุด' },
  { id: 'grid', label: 'ตาราง' },
  { id: 'lines', label: 'เส้นสมุด' },
  { id: 'stripes', label: 'ลายทาง' },
  { id: 'checks', label: 'ตาหมากรุก' },
];
const BORDERS: { id: BorderStyle; label: string }[] = [
  { id: 'none', label: 'ไม่มี' },
  { id: 'line', label: 'เส้นเดียว' },
  { id: 'double', label: 'เส้นคู่' },
  { id: 'dash', label: 'เส้นประ' },
  { id: 'round', label: 'มุมมน' },
  { id: 'dots', label: 'จุดกลม' },
  { id: 'stars', label: 'ดาว' },
  { id: 'wave', label: 'คลื่น' },
  { id: 'corner', label: 'มุมหรู' },
  { id: 'hearts', label: 'หัวใจ' },
  { id: 'flowers', label: 'ดอกไม้' },
  { id: 'zigzag', label: 'ซิกแซก' },
  { id: 'stamp', label: 'แสตมป์' },
  { id: 'checker', label: 'ตาหมากรุก' },
  { id: 'rainbow', label: 'สายรุ้ง' },
  { id: 'bubbles', label: 'ฟองสบู่' },
  { id: 'ribbon', label: 'ริบบิ้นเย็บ' },
  { id: 'leaves', label: 'ใบไม้' },
  { id: 'scallop', label: 'ขอบหยัก' },
];

function BgPanel({ ctl }: { ctl: Ctl }) {
  const { bg, border } = ctl.page;
  const [all, setAll] = useState(false);
  const setBg = (patch: Partial<typeof bg>, key?: string) => ctl.updatePage({ bg: { ...bg, ...patch } }, false, key);
  const setBorder = (patch: Partial<typeof border>, key?: string) => ctl.updatePage({ border: { ...border, ...patch } }, false, key);
  return (
    <>
      <Sec title="สีพื้น">
        <ColorGrid value={bg.color} onChange={(c) => setBg({ color: c || '#ffffff', color2: '' }, 'bgc')} />
      </Sec>
      <Sec title="ไล่สี">
        <div className="grid grid-cols-4 gap-2">
          {GRADS.map(([a, b, ang]) => (
            <button key={a + b} type="button" className="st-cell" style={{ background: `linear-gradient(${ang}deg, ${a}, ${b})` }} onClick={() => setBg({ color: a, color2: b, angle: ang })} aria-label="พื้นไล่สี" />
          ))}
        </div>
        {bg.color2 && (
          <>
            <Slider label="ทิศทางไล่สี" value={bg.angle} min={0} max={360} step={5} unit="°" onChange={(v) => setBg({ angle: v }, 'ang')} />
            <button type="button" className="st-link" onClick={() => setBg({ color2: '' })}>
              เลิกไล่สี
            </button>
          </>
        )}
      </Sec>
      <Sec title="ลายพื้น">
        <div className="grid grid-cols-3 gap-2">
          {PATTERNS.map((p) => (
            <button key={p.id} type="button" className="st-pat" data-on={bg.pattern === p.id} onClick={() => setBg({ pattern: p.id })}>
              <span style={bgStyle({ ...blankBg(), color: '#ffffff', pattern: p.id, pcolor: '#a78bfa' })} />
              <small>{p.label}</small>
            </button>
          ))}
        </div>
        {bg.pattern !== 'none' && (
          <div className="mt-2">
            <p className="text-xs font-bold mb-1">สีลาย</p>
            <ColorGrid value={bg.pcolor} onChange={(c) => setBg({ pcolor: c || '#d9d3f5' }, 'pc')} />
          </div>
        )}
      </Sec>
      <Sec title="กรอบหน้า">
        <div className="grid grid-cols-3 gap-2">
          {BORDERS.map((b) => (
            <button key={b.id} type="button" className="st-pat" data-on={border.style === b.id} onClick={() => setBorder({ style: b.id })}>
              <span className="relative bg-white overflow-hidden">
                <BorderArt b={{ style: b.id, color: border.color, w: 7 }} W={400} H={300} fluid />
              </span>
              <small>{b.label}</small>
            </button>
          ))}
        </div>
        {border.style !== 'none' && (
          <div className="mt-2">
            <Slider label="ความหนา" value={border.w} min={1} max={20} onChange={(v) => setBorder({ w: v }, 'bw')} />
            <p className="text-xs font-bold mb-1 mt-2">สีกรอบ</p>
            <ColorGrid value={border.color} onChange={(c) => setBorder({ color: c || '#7c5cf0' }, 'bc')} />
          </div>
        )}
      </Sec>
      <label className="st-check">
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
        <span>ใช้พื้นหลังและกรอบนี้กับทุกหน้า</span>
      </label>
      {all && (
        <button type="button" className="st-big-add mt-2" onClick={() => (ctl.updatePage({ bg: { ...bg }, border: { ...border } }, true), setAll(false))}>
          ใช้กับทุกหน้า ({ctl.doc.pages.length} หน้า)
        </button>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ ปรับขนาด (เมนูบนแถบบน) */

export function SizePicker({ ctl, onDone }: { ctl: Ctl; onDone?: () => void }) {
  const { doc } = ctl;
  const [mm, setMm] = useState<[string, string]>([String(pxToMm(doc.size.w)), String(pxToMm(doc.size.h))]);
  const [scale, setScale] = useState(true);
  const resize = (id: string, w: number, h: number) => {
    if (w === doc.size.w && h === doc.size.h) return;
    const to = { w, h };
    ctl.commit({ ...doc, size: { id, w, h }, pages: scale ? doc.pages.map((p) => ({ ...fitPage(p, doc.size, to), id: p.id })) : doc.pages });
    setMm([String(pxToMm(w)), String(pxToMm(h))]);
    onDone?.();
  };
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {SIZES.map((s) => (
          <button key={s.id} type="button" className="st-size" data-on={doc.size.id === s.id} onClick={() => resize(s.id, s.w, s.h)}>
            <span className="st-size-art" style={{ aspectRatio: `${s.w} / ${s.h}` }} />
            <b>{s.label}</b>
            <small>{s.note}</small>
          </button>
        ))}
      </div>
      <div className="st-custom">
        <p className="text-xs font-bold">
          กำหนดเอง (มม. {pxToMm(CUSTOM_MIN)}-{pxToMm(CUSTOM_MAX)})
        </p>
        <div className="flex items-center gap-2">
          <input className="st-input w-20" inputMode="numeric" value={mm[0]} onChange={(e) => setMm([e.target.value.replace(/\D/g, '').slice(0, 3), mm[1]])} aria-label="กว้าง (มม.)" />
          <span>x</span>
          <input className="st-input w-20" inputMode="numeric" value={mm[1]} onChange={(e) => setMm([mm[0], e.target.value.replace(/\D/g, '').slice(0, 3)])} aria-label="สูง (มม.)" />
          <button
            type="button"
            className="st-btn-acc"
            onClick={() => {
              const w = Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, mmToPx(Number(mm[0]) || 0)));
              const h = Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, mmToPx(Number(mm[1]) || 0)));
              resize('custom', w, h);
            }}
          >
            <Square className="w-4 h-4" /> ใช้
          </button>
        </div>
      </div>
      <label className="st-check">
        <input type="checkbox" checked={scale} onChange={(e) => setScale(e.target.checked)} />
        <span>ย่อ/ขยายของบนหน้าให้พอดีขนาดใหม่</span>
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ ตัวละคร */

interface SavedChar {
  id: string;
  name: string;
  look: CharLook;
}

function CharPanel({ ctl }: { ctl: Ctl }) {
  const [mine, setMine] = useState<SavedChar[] | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await createClient().from('user_characters').select('id, name, look').order('created_at', { ascending: false }).limit(60);
    setMine(error ? [] : (data || []).map((r) => ({ id: r.id as string, name: String(r.name), look: cleanLook(r.look) })));
  }, []);
  useEffect(() => {
    load();
    window.addEventListener(CHARS_EVENT, load);
    return () => window.removeEventListener(CHARS_EVENT, load);
  }, [load]);
  const del = async (c: SavedChar) => {
    if (!confirm(`ลบตัวละคร "${c.name}" ออกจากตัวละครของฉัน? (ที่ใส่บนหน้าแล้วไม่หาย)`)) return;
    await createClient().from('user_characters').delete().eq('id', c.id);
    load();
  };
  return (
    <>
      <button type="button" className="st-big-add" onClick={() => ctl.openChar(DEFAULT_LOOK)}>
        <Wand2 className="w-5 h-5" /> สร้างตัวละครใหม่
      </button>
      <p className="st-note mt-2">เป็นคนหรือสัตว์ก็ได้ แต่งหน้า ตา ผม ชุด เครื่องประดับ เปลี่ยนสี และจัดท่าทางได้ บันทึกไว้ใช้ซ้ำเป็นสติกเกอร์ของคุณเอง</p>
      <Sec title="เริ่มจากสัตว์" note="กดแล้วแต่งต่อได้ทันที">
        <div className="grid grid-cols-4 gap-2">
          {SPECIES.slice(1).map((s) => (
            <button key={s.id} type="button" className="st-cell st-cell-char" title={s.label} aria-label={`แต่ง${s.label}`} onClick={() => ctl.openChar(withSpecies(DEFAULT_LOOK, s.id))}>
              <CharArt look={withSpecies(DEFAULT_LOOK, s.id)} viewBox="6 0 188 180" className="w-full h-full" />
            </button>
          ))}
        </div>
      </Sec>
      <Sec title="ตัวละครของฉัน">
        {mine === null ? (
          <Loader2 className="w-5 h-5 animate-spin opacity-60" />
        ) : mine.length === 0 ? (
          <p className="st-note">ยังไม่มี กด &quot;สร้างตัวละครใหม่&quot; แล้วกดบันทึกเป็นตัวละครของฉัน</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {mine.map((c) => (
              <div key={c.id} className="st-charcell">
                <button type="button" className="st-cell st-cell-char" title={c.name} onClick={() => ctl.add(makeChar(c.look))}>
                  <CharArt look={c.look} className="w-full h-full" />
                </button>
                <span className="truncate">{c.name}</span>
                <div className="st-charcell-act">
                  <button type="button" onClick={() => ctl.openChar(c.look)} aria-label={`แต่ง ${c.name} ต่อ`} title="แต่งต่อ">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => del(c)} aria-label={`ลบ ${c.name}`} title="ลบ">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Sec>
      <Sec title="สัตว์สำเร็จรูป" note="กดใส่ได้เลย ดับเบิลคลิกบนหน้าเพื่อแต่งต่อ">
        <div className="grid grid-cols-3 gap-2">
          {ANIMAL_PRESETS.map((p) => (
            <div key={p.id} className="st-charcell">
              <button type="button" className="st-cell st-cell-char" title={p.label} onClick={() => ctl.add(makeChar(p.look))}>
                <CharArt look={p.look} className="w-full h-full" />
              </button>
              <span className="truncate">{p.label}</span>
            </div>
          ))}
        </div>
      </Sec>
      <Sec title="คนสำเร็จรูป" note="กดใส่ได้เลย ดับเบิลคลิกบนหน้าเพื่อแต่งต่อ">
        <div className="grid grid-cols-3 gap-2">
          {CHAR_PRESETS.map((p) => (
            <div key={p.id} className="st-charcell">
              <button type="button" className="st-cell st-cell-char" title={p.label} onClick={() => ctl.add(makeChar(p.look))}>
                <CharArt look={p.look} className="w-full h-full" />
              </button>
              <span className="truncate">{p.label}</span>
            </div>
          ))}
        </div>
      </Sec>
    </>
  );
}

/** แจ้งแผงตัวละครให้โหลดรายการใหม่ หลังบันทึกจากหน้าต่างแต่งตัว */
export const CHARS_EVENT = 'l5g:chars-changed';

/* ------------------------------------------------------------------ สื่อการสอน */

function EduPanel({ ctl }: { ctl: Ctl }) {
  const [sub, setSub] = useState<KitSubject>('math');
  const edu = EDU_KINDS.filter((k) => k.subject === sub);
  const kits = KITS.filter((k) => k.subjects.includes(sub));
  return (
    <>
      <div className="st-chips" role="tablist" aria-label="เลือกวิชา">
        {KIT_SUBJECTS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={sub === x.id} data-on={sub === x.id} onClick={() => setSub(x.id)}>
            {x.label}
          </button>
        ))}
      </div>
      <QuizImport ctl={ctl} />
      {edu.length > 0 && (
        <Sec title={sub === 'math' ? 'สื่อคณิตศาสตร์' : 'สื่อวิทยาศาสตร์'} note="กดใส่ แล้วปรับตัวเลขได้ที่แถบด้านบน">
          <div className="grid grid-cols-3 gap-2">
            {edu.map((k) => (
              <button key={k.kind} type="button" className="st-wr" onClick={() => ctl.add(makeEdu(k.kind))} title={k.label}>
                <span className="st-edu-prev">
                  <Mini it={makeEdu(k.kind)} size={70} />
                </span>
                <span>{k.label}</span>
              </button>
            ))}
          </div>
        </Sec>
      )}
      <Sec title="ตัวสร้างใบงานอัตโนมัติ" note="กรอกนิดเดียว ระบบจัดหน้าให้ ทุกชิ้นแก้ไขต่อได้">
        {kits.map((k, i) => (
          <KitForm key={`${sub}-${k.id}`} kit={k} ctl={ctl} open={i === 0} />
        ))}
      </Sec>
      {sub === 'all' && <SheetPanel ctl={ctl} />}
    </>
  );
}

function KitForm({ kit, ctl, open }: { kit: Kit; ctl: Ctl; open: boolean }) {
  const [v, setV] = useState<Record<string, KitValue>>(() => kitDefaults(kit));
  const [msg, setMsg] = useState('');
  const run = () => {
    const out = kit.build(v, ctl.W, ctl.H, Math.random);
    if (out.items.length) ctl.addMany(out.items);
    setMsg(out.warn || '');
  };
  return (
    <details className="st-gen" open={open}>
      <summary>
        <Sparkles className="w-4 h-4" /> {kit.label}
      </summary>
      <p className="st-note">{kit.note}</p>
      <div className="flex flex-col gap-2 mt-1">
        {kit.fields.map((f) => (
          <label key={f.k} className={f.type === 'check' ? 'st-check !mt-0' : 'text-xs font-bold flex flex-col gap-1'}>
            {f.type === 'check' ? (
              <>
                <input type="checkbox" checked={!!v[f.k]} onChange={(e) => setV({ ...v, [f.k]: e.target.checked })} />
                <span>{f.label}</span>
              </>
            ) : (
              <>
                <span>{f.label}</span>
                {f.type === 'text' ? (
                  f.rows ? (
                    <textarea className="st-input st-textarea" rows={f.rows} value={String(v[f.k])} maxLength={1200} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} />
                  ) : (
                    <input className="st-input" value={String(v[f.k])} maxLength={200} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} />
                  )
                ) : f.type === 'num' ? (
                  <input
                    className="st-input w-24"
                    inputMode="numeric"
                    value={String(v[f.k])}
                    onChange={(e) => setV({ ...v, [f.k]: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    onBlur={() => setV({ ...v, [f.k]: Math.min(f.max, Math.max(f.min, Number(v[f.k]) || f.def)) })}
                  />
                ) : (
                  <select className="st-select" value={String(v[f.k])} onChange={(e) => setV({ ...v, [f.k]: e.target.value })}>
                    {f.options.map(([val, lab]) => (
                      <option key={val} value={val}>
                        {lab}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
          </label>
        ))}
      </div>
      <button type="button" className="st-btn-acc mt-2 w-full" onClick={run}>
        สร้าง{kit.label}
      </button>
      {msg && <p className="text-xs font-bold text-rose-600 mt-1.5">{msg}</p>}
    </details>
  );
}

/** นำชุดคำถามของฉัน (ระบบสร้างเกม) มาเป็นหน้าใบงานปรนัย + เฉลย ต่อจากหน้าที่เลือกอยู่ */
function QuizImport({ ctl }: { ctl: Ctl }) {
  const { user } = useAuth();
  const [sets, setSets] = useState<{ id: string; title: string; question_count: number }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [answers, setAnswers] = useState(true);
  const [msg, setMsg] = useState('');
  const load = () => {
    if (!user || sets) return;
    createClient()
      .from('user_games')
      .select('id, title, question_count')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setSets(data || []));
  };
  const use = async (id: string, title: string) => {
    setBusy(id);
    setMsg('');
    const { data } = await createClient().from('user_games').select('content').eq('id', id).maybeSingle();
    setBusy(null);
    const pages = data ? quizPages(title, sanitizeQuiz(data.content, mediaPrefix()), ctl.W, ctl.H, { answers, header: true }) : [];
    if (!pages.length) return setMsg('ชุดคำถามนี้ยังไม่มีข้อคำถาม');
    const room = MAX_PAGES - ctl.doc.pages.length;
    if (room <= 0) return setMsg('สื่อนี้มีหน้าครบแล้ว ลบหน้าที่ไม่ใช้ก่อน');
    const k = ctl.pageIdx + 1;
    const add = pages.slice(0, room);
    ctl.commit({ ...ctl.doc, pages: [...ctl.doc.pages.slice(0, k), ...add, ...ctl.doc.pages.slice(k)] });
    ctl.goPage(k);
    if (add.length < pages.length) setMsg(`ใส่ได้ ${add.length} หน้า (สื่อ 1 ชิ้นมีได้สูงสุด ${MAX_PAGES} หน้า)`);
  };
  return (
    <details className="st-gen st-quizlink" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && load()}>
      <summary>
        <BookOpenCheck className="w-4 h-4" /> ทำใบงานจากชุดคำถามของฉัน
      </summary>
      <p className="st-note">ข้อสอบที่สร้างไว้ในระบบสร้างเกม กลายเป็นใบงานปรนัยพร้อมเฉลยในคลิกเดียว</p>
      {!user ? (
        <p className="text-xs font-bold">เข้าสู่ระบบเพื่อใช้ชุดคำถามของคุณ</p>
      ) : sets === null ? (
        <Loader2 className="w-5 h-5 animate-spin mx-auto my-2" />
      ) : sets.length === 0 ? (
        <p className="text-xs font-bold">
          ยังไม่มีชุดคำถาม{' '}
          <a href="/create/edit" target="_blank" rel="noopener" className="underline">
            สร้างชุดคำถาม
          </a>
        </p>
      ) : (
        <>
          <label className="st-check !mt-0 mb-1.5">
            <input type="checkbox" checked={answers} onChange={(e) => setAnswers(e.target.checked)} />
            <span>เพิ่มหน้าเฉลยท้ายใบงาน</span>
          </label>
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto overflow-x-hidden pr-1">
            {sets.map((g) => (
              <button key={g.id} type="button" className="st-quizrow" disabled={!!busy || !g.question_count} onClick={() => use(g.id, g.title)}>
                <span className="truncate">{g.title}</span>
                <span className="shrink-0 opacity-70">{busy === g.id ? <Loader2 className="w-4 h-4 animate-spin" /> : `${g.question_count} ข้อ`}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {msg && <p className="text-xs font-bold text-rose-600 mt-1.5">{msg}</p>}
    </details>
  );
}

/** ภาพย่อของชิ้นงานใดๆ (วาดขนาดจริงแล้วย่อให้พอดีกรอบ) */
function Mini({ it, size }: { it: Item; size: number }) {
  const s = size / Math.max(it.w, it.h);
  return (
    <span style={{ display: 'block', position: 'relative', width: it.w * s, height: it.h * s, overflow: 'visible' }}>
      <span style={{ display: 'block', position: 'absolute', left: 0, top: 0, width: it.w, height: it.h, transform: `scale(${s})`, transformOrigin: '0 0' }}>
        <ItemView it={{ ...it, x: 0, y: 0 }} />
      </span>
    </span>
  );
}
