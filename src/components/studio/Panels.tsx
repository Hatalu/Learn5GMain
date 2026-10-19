'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpenCheck, CloudUpload, LayoutTemplate, Loader2, PaintBucket, Pencil, QrCode, Search, Shapes, Smile, Sparkles, Square, Trash2, Type, Upload, UserRound, Wand2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CHAR_PRESETS, DEFAULT_LOOK, cleanLook, type CharLook } from '@/lib/studio/char';
import { answerSheet, timesTable, wordSearch } from '@/lib/studio/gen';
import { CharArt } from './CharArt';
import {
  blankBg,
  CUSTOM_MAX,
  CUSTOM_MIN,
  designMediaPaths,
  EDU_KINDS,
  makeChar,
  makeEdu,
  makeImage,
  makeLine,
  makeShape,
  makeSticker,
  makeTable,
  makeText,
  makeWrite,
  mmToPx,
  pxToMm,
  SIZES,
  uid,
  type BorderStyle,
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
  shape: 'รูปทรงและเส้น',
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

function ShapePanel({ ctl }: { ctl: Ctl }) {
  return (
    <>
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
      <p className="st-note mt-2">แต่งหน้า ตา ผม ชุด เครื่องประดับ เปลี่ยนสี และจัดท่าทางได้ บันทึกไว้ใช้ซ้ำเป็นสติกเกอร์ของคุณเอง</p>
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
      <Sec title="ตัวละครสำเร็จรูป" note="กดใส่ได้เลย ดับเบิลคลิกบนหน้าเพื่อแต่งต่อ">
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
  const [words, setWords] = useState('CAT, DOG, BIRD, FISH, LION');
  const [wsSize, setWsSize] = useState(10);
  const [hard, setHard] = useState(false);
  const [ans, setAns] = useState({ n: 20, k: 4, lang: 'th' as 'th' | 'en' });
  const [mul, setMul] = useState({ n: 2, show: false });
  const W = ctl.W;

  const makeWordSearch = () => {
    const ws = wordSearch(words.split(/[,\n]/), wsSize, hard);
    const side = Math.min(W - 80, ctl.H * 0.55, wsSize * 46);
    const t = makeTable(ws.grid.length, ws.grid.length, { head: '', size: Math.round((side / ws.grid.length) * 0.5), sw: 1.5, stroke: '#9b8fd0' });
    t.cells = ws.grid;
    const x = (W - side) / 2;
    const items: Item[] = [
      { ...makeText({ text: 'ค้นหาคำศัพท์', size: 34, bold: true, font: 'kanit', color: '#7c5cf0' }), x: (W - 500) / 2, y: 60, w: 500 },
      { ...t, x, y: 130, w: side, h: side },
      { ...makeText({ text: 'คำที่ต้องหา: ' + ws.placed.join('   '), size: 20, align: 'left' }), x, y: 150 + side, w: side },
    ];
    ctl.addMany(items);
    if (ws.skipped.length) alert('ใส่ไม่ได้ (ยาวเกินตาราง): ' + ws.skipped.join(', '));
  };
  const makeAnswerSheet = () => {
    const tables = answerSheet(ans.n, ans.k, ans.lang);
    const cols = tables.length;
    const tw = Math.min(300, (W - 80 - (cols - 1) * 24) / cols);
    const items: Item[] = [{ ...makeText({ text: 'กระดาษคำตอบ', size: 32, bold: true, font: 'kanit' }), x: (W - 500) / 2, y: 50, w: 500 }];
    tables.forEach((cells, i) => {
      const t = makeTable(cells.length, cells[0].length, { size: 18, head: '#ede7ff' });
      t.cells = cells;
      items.push({ ...t, x: (W - (tw * cols + 24 * (cols - 1))) / 2 + i * (tw + 24), y: 120, w: tw, h: cells.length * 36 });
    });
    ctl.addMany(items);
  };
  const makeTimes = () => {
    const cells = timesTable(mul.n, 12, mul.show);
    const t = makeTable(cells.length, 2, { head: '', size: 24, align: 'left' });
    t.cells = cells;
    ctl.addMany([
      { ...makeText({ text: `สูตรคูณแม่ ${mul.n}`, size: 36, bold: true, font: 'kanit', color: '#e07a12' }), x: (W - 400) / 2, y: 60, w: 400 },
      { ...t, x: (W - 360) / 2, y: 130, w: 360, h: cells.length * 52 },
    ]);
  };

  return (
    <>
      <Sec title="คณิตศาสตร์และวิทยาศาสตร์" note="กดใส่ แล้วปรับตัวเลขได้ที่แถบด้านบน">
        <div className="grid grid-cols-3 gap-2">
          {EDU_KINDS.map((k) => (
            <button key={k.kind} type="button" className="st-wr" onClick={() => ctl.add(makeEdu(k.kind))} title={k.label}>
              <span className="st-edu-prev">
                <EduMini kind={k.kind} />
              </span>
              <span>{k.label}</span>
            </button>
          ))}
        </div>
      </Sec>

      <Sec title="ตัวสร้างใบงานอัตโนมัติ">
        <details className="st-gen" open>
          <summary>
            <Sparkles className="w-4 h-4" /> ตารางค้นหาคำ
          </summary>
          <textarea className="st-input st-textarea" rows={2} value={words} onChange={(e) => setWords(e.target.value)} aria-label="คำศัพท์ คั่นด้วยจุลภาค" />
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <label className="text-xs font-bold">
              ขนาด{' '}
              <select className="st-select" value={wsSize} onChange={(e) => setWsSize(Number(e.target.value))}>
                {[8, 10, 12, 14].map((n) => (
                  <option key={n} value={n}>
                    {n} x {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="st-check !mt-0">
              <input type="checkbox" checked={hard} onChange={(e) => setHard(e.target.checked)} />
              <span>ยาก (ย้อนกลับ/ทแยงทุกทิศ)</span>
            </label>
          </div>
          <button type="button" className="st-btn-acc mt-2 w-full" onClick={makeWordSearch}>
            สร้างตารางค้นหาคำ
          </button>
          <p className="st-note mt-1">ใช้ได้ทั้งคำภาษาไทยและอังกฤษ คั่นคำด้วยจุลภาค</p>
        </details>
        <details className="st-gen">
          <summary>
            <Sparkles className="w-4 h-4" /> กระดาษคำตอบแบบฝน
          </summary>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-bold">
              จำนวนข้อ <input className="st-input w-16" inputMode="numeric" value={ans.n} onChange={(e) => setAns({ ...ans, n: Math.min(60, Number(e.target.value.replace(/\D/g, '')) || 1) })} />
            </label>
            <select className="st-select" value={ans.k} onChange={(e) => setAns({ ...ans, k: Number(e.target.value) })} aria-label="จำนวนตัวเลือก">
              {[3, 4, 5].map((k) => (
                <option key={k} value={k}>
                  {k} ตัวเลือก
                </option>
              ))}
            </select>
            <select className="st-select" value={ans.lang} onChange={(e) => setAns({ ...ans, lang: e.target.value as 'th' | 'en' })} aria-label="ตัวอักษร">
              <option value="th">ก ข ค ง</option>
              <option value="en">A B C D</option>
            </select>
          </div>
          <button type="button" className="st-btn-acc mt-2 w-full" onClick={makeAnswerSheet}>
            สร้างกระดาษคำตอบ
          </button>
        </details>
        <details className="st-gen">
          <summary>
            <Sparkles className="w-4 h-4" /> ตารางสูตรคูณ
          </summary>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-bold">
              แม่{' '}
              <select className="st-select" value={mul.n} onChange={(e) => setMul({ ...mul, n: Number(e.target.value) })}>
                {Array.from({ length: 24 }, (_, i) => i + 2).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="st-check !mt-0">
              <input type="checkbox" checked={mul.show} onChange={(e) => setMul({ ...mul, show: e.target.checked })} />
              <span>ใส่คำตอบ (ใช้เป็นเฉลย)</span>
            </label>
          </div>
          <button type="button" className="st-btn-acc mt-2 w-full" onClick={makeTimes}>
            สร้างตารางสูตรคูณ
          </button>
        </details>
      </Sec>

      <SheetPanel ctl={ctl} />
    </>
  );
}

function EduMini({ kind }: { kind: (typeof EDU_KINDS)[number]['kind'] }) {
  const e = { ...makeEdu(kind) };
  const s = 70 / Math.max(e.w, e.h);
  return (
    <span style={{ display: 'block', width: e.w * s, height: e.h * s, overflow: 'visible' }}>
      <span style={{ display: 'block', width: e.w, height: e.h, transform: `scale(${s})`, transformOrigin: '0 0' }}>
        <ItemView it={e} />
      </span>
    </span>
  );
}
