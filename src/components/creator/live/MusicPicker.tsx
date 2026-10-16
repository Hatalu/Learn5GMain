'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Music, Play, Square, VolumeX, Wand2 } from 'lucide-react';
import { MODE_MUSIC, TRACKS, trackById } from '@/lib/music-tracks';
import { releaseMusic, setMusic } from '@/lib/music';
import type { GameMode } from '@/lib/game-creator/modes';
import { gsfx } from '@/lib/game-creator/gsound';

/** ไอคอนโน้ตดนตรี (SVG) สีตามเพลง */
function NoteArt({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill={color} stroke="#2a2350" strokeWidth="2.6" />
      <path d="M16 27 L16 12 L29 9 L29 24" fill="none" stroke="#2a2350" strokeWidth="2.6" strokeLinejoin="round" />
      <ellipse cx="13.5" cy="27.5" rx="4" ry="3.2" fill="#fff" stroke="#2a2350" strokeWidth="2.2" />
      <ellipse cx="26.5" cy="24.5" rx="4" ry="3.2" fill="#fff" stroke="#2a2350" strokeWidth="2.2" />
    </svg>
  );
}

/**
 * เลือกเพลงประกอบของห้อง ฟังตัวอย่างได้ (10 วินาที)
 * value: 'auto' (ตามรูปแบบการเล่น) / 'off' / id เพลง
 */
export function MusicPicker({ value, mode, onPick }: { value: string; mode: GameMode; onPick: (v: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const stopT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const auto = trackById(MODE_MUSIC[mode]);

  const stopPreview = () => {
    if (stopT.current) clearTimeout(stopT.current);
    releaseMusic('preview');
    setPreview(null);
  };
  useEffect(() => () => stopPreview(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const listen = (id: string) => {
    gsfx.unlock();
    if (preview === id) return stopPreview();
    if (stopT.current) clearTimeout(stopT.current);
    setMusic('preview', id);
    setPreview(id);
    stopT.current = setTimeout(stopPreview, 10000);
  };

  // ฟังก์ชันวาดการ์ด (ไม่ใช่คอมโพเนนต์ซ้อน จะได้ไม่ถูกสร้างใหม่ทุกครั้งที่กด)
  const card = (id: string, title: string, sub: string, color: string, icon: React.ReactNode) => {
    const on = value === id;
    const trackId = id === 'auto' ? auto?.id : id === 'off' ? null : id;
    return (
      <div key={id} className="l5g-mcard" data-on={on} style={{ ['--mc' as string]: color }}>
        <button type="button" className="l5g-mcard-main" onClick={() => (gsfx.pick(), onPick(id))} aria-pressed={on}>
          <span className="l5g-mcard-icon">{icon}</span>
          <span className="min-w-0">
            <b>{title}</b>
            <small>{sub}</small>
          </span>
          {on && (
            <span className="l5g-mcard-tick">
              <Check className="w-3.5 h-3.5" strokeWidth={4} />
            </span>
          )}
        </button>
        {trackId && (
          <button type="button" className="l5g-mcard-play" data-playing={preview === trackId} onClick={() => listen(trackId)} aria-label={preview === trackId ? 'หยุดฟัง' : `ฟังตัวอย่าง ${title}`}>
            {preview === trackId ? <Square className="w-3.5 h-3.5" fill="currentColor" /> : <Play className="w-3.5 h-3.5" fill="currentColor" />}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="l5g-music">
      {card('auto', 'ตามรูปแบบเกม', auto ? `${auto.name} · ${auto.mood}` : '', '#ffe27a', <Wand2 className="w-5 h-5" />)}
      {TRACKS.filter((t) => t.id !== 'home').map((t) => card(t.id, t.name, `${t.mood} · ${t.genre}`, t.color, <NoteArt color={t.color} />))}
      {card('off', 'ไม่มีเพลง', 'เงียบ มีแค่เสียงเอฟเฟกต์', '#e8ecf5', <VolumeX className="w-5 h-5" />)}
    </div>
  );
}

/** ชื่อเพลงที่ตั้งไว้ (โชว์บนปุ่ม) */
export function musicLabel(value: string, mode: GameMode) {
  if (value === 'off') return 'ไม่มีเพลง';
  const t = trackById(value === 'auto' || !value ? MODE_MUSIC[mode] : value);
  return t ? t.name : 'ไม่มีเพลง';
}

export { Music as MusicIcon };
