'use client';

import React, { useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, Palette } from 'lucide-react';
import { PaperModal } from '../PaperModal';
import { BG_PRESETS, COLOR_SWATCHES } from '@/lib/game-creator/backgrounds';
import { uploadBackground } from '@/lib/game-creator/media';
import type { RoomBackground } from '@/lib/game-creator/types';
import { bgCss } from '../RoomBackdrop';
import { gsfx } from '@/lib/game-creator/gsound';

const same = (a: RoomBackground, b: RoomBackground) => JSON.stringify(a) === JSON.stringify(b);

export function BackgroundPicker({ value, userId, onPick, onClose }: { value: RoomBackground; userId: string; onPick: (bg: RoomBackground) => void; onClose: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [color, setColor] = useState(value.kind === 'color' ? value.value : '#4fb3ff');

  const pick = (bg: RoomBackground) => {
    gsfx.pick();
    onPick(bg);
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    setErr('');
    try {
      const url = await uploadBackground(userId, f);
      pick({ kind: 'image', url });
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'อัปโหลดไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PaperModal title="พื้นหลังหน้าจอ" icon={<Palette className="w-5 h-5" />} iconBg="#4fb3ff" onClose={onClose} width={640} busy={busy}>
      <p className="font-semibold opacity-75 -mt-1 mb-3 text-sm">ผู้เล่นทุกคนจะเห็นพื้นหลังเปลี่ยนตามทันที</p>
      <div className="l5g-bg-grid">
        {BG_PRESETS.map((p) => {
          const bg: RoomBackground = { kind: 'preset', id: p.id };
          const on = same(bg, value);
          return (
            <button key={p.id} type="button" className="l5g-bg-opt" data-on={on} onClick={() => pick(bg)}>
              <span className="l5g-bg-swatch" style={bgCss(bg)}>
                {on && (
                  <span className="l5g-bg-tick">
                    <Check className="w-4 h-4" strokeWidth={4} />
                  </span>
                )}
              </span>
              <span className="l5g-bg-name">{p.name}</span>
            </button>
          );
        })}
      </div>

      <p className="l5g-qset-label mt-4">สีพื้น</p>
      <div className="flex flex-wrap items-center gap-2">
        {COLOR_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            className="l5g-color-dot"
            data-on={value.kind === 'color' && value.value === c}
            style={{ background: c }}
            aria-label={`สี ${c}`}
            onClick={() => {
              setColor(c);
              pick({ kind: 'color', value: c });
            }}
          />
        ))}
        <label className="l5g-color-custom" title="เลือกสีเอง">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            onBlur={() => pick({ kind: 'color', value: color })}
          />
          <span style={{ background: color }} />
          เลือกสีเอง
        </label>
      </div>

      <p className="l5g-qset-label mt-4">รูปของฉัน</p>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="l5g-btn l5g-btn-sm l5g-btn-ghost" onClick={() => file.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} อัปโหลดรูปพื้นหลัง
        </button>
        {value.kind === 'image' && <span className="l5g-bg-swatch l5g-bg-swatch-sm" style={bgCss(value)} />}
      </div>
      {err && <p className="l5g-err mt-2">{err}</p>}

      <div className="l5g-math-foot">
        <span className="flex-1" />
        <button type="button" className="l5g-btn l5g-btn-go" onClick={onClose} disabled={busy}>
          เรียบร้อย
        </button>
      </div>
    </PaperModal>
  );
}
