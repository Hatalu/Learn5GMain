'use client';

import React, { useState } from 'react';
import { Ban, Cat, Crown, Glasses, Shirt, Shuffle, Sword } from 'lucide-react';
import { Avatar, CRITTERS } from '../Avatar';
import { GEAR_SLOTS, randomGear, type Gear, type GearSlot } from '@/lib/game-creator/gear';
import { gsfx } from '@/lib/game-creator/gsound';

type Tab = 'c' | GearSlot;

const TABS: { id: Tab; name: string; icon: React.ReactNode; color: string }[] = [
  { id: 'c', name: 'ตัวละคร', icon: <Cat className="w-5 h-5" />, color: '#ffcf3f' },
  { id: 'h', name: 'หมวก', icon: <Crown className="w-5 h-5" />, color: '#ff9a3d' },
  { id: 'o', name: 'ชุด', icon: <Shirt className="w-5 h-5" />, color: '#3fd6a8' },
  { id: 'm', name: 'หน้ากาก', icon: <Glasses className="w-5 h-5" />, color: '#4fb3ff' },
  { id: 'i', name: 'ของถือ', icon: <Sword className="w-5 h-5" />, color: '#ff6b7a' },
];

/** เลือกตัวละคร + เครื่องประดับ (หมวก ชุด หน้ากาก ของถือ) ลองใส่ให้ดูทันที */
export function LookPicker({ avatar, gear, onChange, size = 124 }: { avatar: number; gear: Gear; onChange: (avatar: number, gear: Gear) => void; size?: number }) {
  const [tab, setTab] = useState<Tab>('c');
  const [pop, setPop] = useState(0);
  const cur = TABS.find((t) => t.id === tab)!;
  const slot = tab === 'c' ? null : GEAR_SLOTS.find((s) => s.key === tab)!;
  const label = slot ? slot.items[gear[slot.key]] : CRITTERS[avatar]?.name;

  const set = (a: number, g: Gear) => {
    onChange(a, g);
    setPop((p) => p + 1);
  };

  return (
    <div className="l5g-look" style={{ ['--lc' as string]: cur.color }}>
      <div className="l5g-look-stage">
        <span className="l5g-look-spot" aria-hidden="true" />
        <span className="l5g-look-av" key={pop}>
          <Avatar id={avatar} gear={gear} size={size} wave={tab === 'i'} />
        </span>
        <button
          type="button"
          className="l5g-icon-btn l5g-look-dice"
          onClick={() => {
            gsfx.pick();
            set(Math.floor(Math.random() * CRITTERS.length), randomGear());
          }}
          aria-label="สุ่มทั้งชุด"
          title="สุ่มทั้งชุด"
        >
          <Shuffle className="w-5 h-5" />
        </button>
      </div>
      <p className="l5g-look-label">{label}</p>

      <div className="l5g-look-tabs" role="tablist" aria-label="หมวดการแต่งตัว">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            data-on={tab === t.id}
            style={{ ['--tc' as string]: t.color }}
            onClick={() => (gsfx.tap(), setTab(t.id))}
          >
            {t.icon}
            <span>{t.name}</span>
            {t.id !== 'c' && gear[t.id] > 0 && <i aria-hidden="true" />}
          </button>
        ))}
      </div>

      <div className="l5g-look-grid" role="radiogroup" aria-label={`เลือก${cur.name}`} key={tab}>
        {slot
          ? slot.items.map((name, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={gear[slot.key] === i}
                aria-label={name}
                title={name}
                data-on={gear[slot.key] === i}
                style={{ animationDelay: `${i * 25}ms` }}
                onClick={() => {
                  gsfx.pick();
                  set(avatar, { ...gear, [slot.key]: i });
                }}
              >
                {/* เห็นตัวละครทั้งตัวสวมชิ้นนี้ (พร้อมชิ้นอื่นที่ใส่อยู่) ไม่ซูมเฉพาะส่วน */}
                <Avatar id={avatar} gear={{ ...gear, [slot.key]: i }} size={50} />
                {i === 0 && <Ban className="l5g-look-none" aria-hidden="true" />}
              </button>
            ))
          : CRITTERS.map((c, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={avatar === i}
                aria-label={c.name}
                title={c.name}
                data-on={avatar === i}
                style={{ animationDelay: `${i * 25}ms` }}
                onClick={() => {
                  gsfx.tap();
                  set(i, gear);
                }}
              >
                <Avatar id={i} size={44} />
              </button>
            ))}
      </div>
    </div>
  );
}
