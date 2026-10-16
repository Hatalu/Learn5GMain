'use client';

import React, { useMemo } from 'react';
import type { RoomBackground } from '@/lib/game-creator/types';
import { bgPreset, luminance, type Deco } from '@/lib/game-creator/backgrounds';

/** ข้อความบนพื้นหลังนี้ควรเป็นสีเข้มไหม */
export function bgIsLight(bg: RoomBackground): boolean {
  if (bg.kind === 'preset') return bgPreset(bg.id).dark;
  if (bg.kind === 'color') return luminance(bg.value) > 0.62;
  return false;
}

export function bgCss(bg: RoomBackground): React.CSSProperties {
  if (bg.kind === 'preset') return { background: bgPreset(bg.id).css };
  if (bg.kind === 'color') return { background: `radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, ${bg.value} 70%, #fff) 0%, ${bg.value} 60%, color-mix(in srgb, ${bg.value} 75%, #000) 100%)`, backgroundColor: bg.value };
  return { backgroundImage: `url("${bg.url}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#2a2350' };
}

function rnd(seed: number) {
  let a = seed;
  return () => {
    a = (a * 9301 + 49297) % 233280;
    return a / 233280;
  };
}

function Decor({ deco }: { deco: Deco }) {
  const items = useMemo(() => {
    const r = rnd(deco.length * 97 + 13);
    return Array.from({ length: 22 }, (_, i) => ({ x: r() * 100, y: r() * 100, s: 0.5 + r() * 0.9, d: r() * -40, i }));
  }, [deco]);
  if (deco === 'none') return null;
  if (deco === 'clouds')
    return (
      <>
        {items.slice(0, 5).map((it) => (
          <span key={it.i} className="l5g-bg-cloud" style={{ top: `${6 + it.y * 0.6}%`, animationDelay: `${it.d * 2}s`, ['--s' as string]: it.s }} />
        ))}
      </>
    );
  if (deco === 'stars')
    return (
      <>
        {items.map((it) => (
          <span key={it.i} className="l5g-bg-star" style={{ left: `${it.x}%`, top: `${it.y}%`, animationDelay: `${it.d / 8}s`, ['--s' as string]: it.s }} />
        ))}
      </>
    );
  if (deco === 'bubbles')
    return (
      <>
        {items.slice(0, 16).map((it) => (
          <span key={it.i} className="l5g-bg-bubble" style={{ left: `${it.x}%`, animationDelay: `${it.d / 2}s`, ['--s' as string]: it.s }} />
        ))}
      </>
    );
  if (deco === 'leaves')
    return (
      <>
        {items.slice(0, 12).map((it) => (
          <span key={it.i} className="l5g-bg-leaf" style={{ left: `${it.x}%`, animationDelay: `${it.d / 2}s`, ['--s' as string]: it.s }} />
        ))}
      </>
    );
  if (deco === 'confetti')
    return (
      <>
        {items.slice(0, 18).map((it) => (
          <span
            key={it.i}
            className="l5g-bg-confetti"
            style={{ left: `${it.x}%`, animationDelay: `${it.d / 2}s`, background: ['#ff6b7a', '#4a7bf0', '#ffcf3f', '#3fd6a8', '#9b6cf0'][it.i % 5], ['--s' as string]: it.s }}
          />
        ))}
      </>
    );
  if (deco === 'chalk')
    return (
      <>
        <span className="l5g-bg-chalkdust" />
        {['1+1', '÷', '×', 'π', 'x', '%', '='].map((t, i) => (
          <span key={i} className="l5g-bg-chalk" style={{ left: `${8 + i * 13}%`, top: `${10 + ((i * 37) % 70)}%`, animationDelay: `${-i * 1.7}s` }}>
            {t}
          </span>
        ))}
      </>
    );
  return <span className="l5g-bg-dots" />;
}

/** พื้นหลังเต็มจอของห้องเล่นสด */
export function RoomBackdrop({ bg }: { bg: RoomBackground }) {
  const deco: Deco = bg.kind === 'preset' ? bgPreset(bg.id).deco : bg.kind === 'color' ? 'dots' : 'none';
  return (
    <div className="l5g-backdrop" style={bgCss(bg)} aria-hidden="true">
      {bg.kind === 'image' && <span className="l5g-bg-veil" />}
      <Decor deco={deco} />
    </div>
  );
}
