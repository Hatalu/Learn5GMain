'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, Sparkles } from 'lucide-react';
import { STICKERS, STICKER_CATS, StickerArt, type StickerCat } from '@/components/studio/stickers';
import { COVER_COLORS, parseCover, stickerCover } from '@/lib/game-creator/cover';
import { mediaPrefix, uploadImage } from '@/lib/game-creator/media';
import { PaperModal } from './PaperModal';

/** ปกชุดคำถาม: สติกเกอร์บนพื้นสี / รูปที่อัปโหลด / null = ไม่ได้เลือก (ใช้ fallback ของผู้เรียก) */
export function SetCoverArt({ cover, className }: { cover: string | null | undefined; className?: string }) {
  const c = parseCover(cover, mediaPrefix());
  if (!c) return null;
  if (c.kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={c.url} alt="" className={className ? `${className} l5g-cover-img` : 'l5g-cover-img'} loading="lazy" />;
  }
  return (
    <span className={className ? `${className} l5g-cover-st` : 'l5g-cover-st'} style={{ ['--c' as string]: c.color }}>
      <StickerArt id={c.id} />
    </span>
  );
}

const PICK_CATS: StickerCat[] = ['math', 'sci', 'eng', 'thai', 'learn', 'animal', 'nature', 'award'];

export function CoverPicker({ userId, value, onPick, onClose }: { userId: string; value: string | undefined; onPick: (v: string | undefined) => void; onClose: () => void }) {
  const cur = parseCover(value, mediaPrefix());
  const [cat, setCat] = useState<StickerCat>(cur?.kind === 'sticker' ? (STICKERS.find((s) => s.id === cur.id)?.cat ?? 'math') : 'math');
  const [color, setColor] = useState(cur?.kind === 'sticker' ? Math.max(0, COVER_COLORS.indexOf(cur.color)) : 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const list = useMemo(() => STICKERS.filter((s) => s.cat === cat), [cat]);

  const upload = async (f: File) => {
    setBusy(true);
    setErr('');
    try {
      const m = await uploadImage(userId, f, 600);
      onPick(m.url);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PaperModal title="ไอคอนชุดคำถาม" icon={<Sparkles className="w-5 h-5" />} onClose={onClose} busy={busy} width={620}>
      <div className="l5g-coverpick">
        <div className="l5g-coverpick-top">
          <div className="l5g-coverpick-prev" aria-label="ตัวอย่างปก">
            {value ? <SetCoverArt cover={value} /> : <span className="l5g-coverpick-auto">อัตโนมัติ</span>}
          </div>
          <div className="l5g-coverpick-acts">
            <button type="button" className="l5g-btn l5g-btn-violet l5g-btn-sm" disabled={busy} onClick={() => file.current?.click()}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} อัปโหลดรูปเอง
            </button>
            <button
              type="button"
              className="l5g-btn l5g-btn-ghost l5g-btn-sm"
              disabled={busy || !value}
              onClick={() => {
                onPick(undefined);
                onClose();
              }}
            >
              ใช้แบบอัตโนมัติ
            </button>
            <p>อัตโนมัติ = ใช้รูปแรกในชุด ถ้าไม่มีรูปจะเป็นลายสีสุ่ม</p>
          </div>
          <input
            ref={file}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) upload(f);
            }}
          />
        </div>
        {err && <p className="l5g-coverpick-err">{err}</p>}

        <div className="l5g-coverpick-colors" role="radiogroup" aria-label="สีพื้น">
          {COVER_COLORS.map((c, i) => (
            <button key={c} type="button" role="radio" aria-checked={color === i} aria-label={`สีที่ ${i + 1}`} data-on={color === i} style={{ background: c }} onClick={() => setColor(i)}>
              {color === i && <Check className="w-4 h-4" strokeWidth={3.5} />}
            </button>
          ))}
        </div>
        <div className="l5g-stpl-row" role="tablist" aria-label="หมวดไอคอน">
          {STICKER_CATS.filter((c) => PICK_CATS.includes(c.id)).map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} data-on={cat === c.id} style={{ ['--c' as string]: COVER_COLORS[color] }} onClick={() => setCat(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="l5g-coverpick-grid">
          {list.map((s) => {
            const v = stickerCover(s.id, color);
            return (
              <button
                key={s.id}
                type="button"
                title={s.label}
                aria-label={s.label}
                data-on={value === v}
                style={{ ['--c' as string]: COVER_COLORS[color] }}
                onClick={() => {
                  onPick(v);
                  onClose();
                }}
              >
                <StickerArt id={s.id} />
              </button>
            );
          })}
        </div>
      </div>
    </PaperModal>
  );
}
