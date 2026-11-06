'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Buddy } from '@/components/companion/Buddy';
import { useCompanion } from '@/components/companion/CompanionProvider';
import { StarIcon } from '@/components/companion/Stars';
import { StickerArt } from '@/components/studio/stickers';
import { bkkParts, shownStage } from '@/lib/companion';
import { seasonOfMonth } from '@/lib/pet/catalog';
import { balance, missionRows, moodOf, needsAt, puzzleStreak, roll } from '@/lib/pet/logic';
import { puzzleNumber } from '@/lib/pet/puzzle';
import './pet.css';

const NEED_TEXT = { happy: 'ปุ๋งอารมณ์ดี', hungry: 'ปุ๋งหิวแล้ว', bored: 'ปุ๋งอยากเล่น', dirty: 'ปุ๋งอยากอาบน้ำ', sleepy: 'ปุ๋งง่วงแล้ว' } as const;

/** ทางเข้าหน้าแรก: ปริศนาวันนี้ ห้องปุ๋ง ซีซันเดือนนี้ */
export function HomeHub() {
  const { state, ready } = useCompanion();
  const parts = useMemo(() => bkkParts(), []);
  const today = parts.date;
  const ps = { stars: state.stars, pet: state.pet };
  const played = state.pet.puzzles.find((p) => p.d === today);
  const streak = puzzleStreak(state.pet, today);
  const season = seasonOfMonth(parts.month);
  const rows = ready ? missionRows(ps, today) : null;
  const seasonPts = roll(ps, today).pet.season.pts;
  const hatched = state.pet.hatched || state.stars >= 12;

  return (
    <div className="hh-grid">
      <Link href="/puzzle" className="hh-card" style={{ background: 'linear-gradient(120deg,#5b3fc4,#a64cf0)' }}>
        <span className="hh-art"><StickerArt id="sp-starface" /></span>
        <div>
          <h3>ปริศนาวันนี้ #{puzzleNumber(today)}</h3>
          <p>{played ? 'เล่นแล้ว ไปดูผลและท้าเพื่อน' : '5 ข้อ 1 นาที โจทย์เดียวกันทุกคน'}</p>
          {played ? (
            <span className="hh-marks" aria-hidden="true">{played.m.split('').map((c, i) => <i key={i} data-v={c} />)}</span>
          ) : (
            <span className="hh-pill">{streak > 0 ? `ต่อเนื่อง ${streak} วัน` : 'เล่นฟรี ไม่ต้องสมัคร'}</span>
          )}
        </div>
      </Link>
      <Link href="/buddy" className="hh-card" style={{ background: 'linear-gradient(120deg,#22a7d8,#37c8a0)' }}>
        <span className="hh-art">
          <Buddy stage={shownStage(state.stars, hatched)} color={state.color} wear={state.pet.wear} species={state.pet.species} size={84} />
        </span>
        <div>
          <h3>ห้องเลี้ยงปุ๋ง</h3>
          <p>{hatched ? NEED_TEXT[moodOf(needsAt(state.pet, Date.now()))] : 'มีไข่รอให้เธอมาฟัก'}</p>
          <span className="hh-pill"><StarIcon className="w-4 h-4" /> {balance(ps)}{rows && rows.claimable > 0 ? ` · รับรางวัลได้ ${rows.claimable}` : ''}</span>
        </div>
      </Link>
      <Link href="/buddy" className="hh-card" style={{ background: `linear-gradient(120deg,${season.c1},${season.c2})` }}>
        <span className="hh-art"><StickerArt id={season.decor.sticker} /></span>
        <div>
          <h3>{season.name}</h3>
          <p>เล่นครบรับ{season.wear.label} ซื้อไม่ได้</p>
          <span className="hh-pill">แต้มซีซัน {seasonPts}/80</span>
        </div>
      </Link>
    </div>
  );
}
