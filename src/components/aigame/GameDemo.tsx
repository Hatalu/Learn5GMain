'use client';

/** เลือกเกมตัวอย่างตาม id (ไฟล์นี้ถูกโหลดแบบ dynamic จากหน้าสร้างเกม) */
import React from 'react';
import type { GItem } from '@/lib/aigame/prompt';
import { BalloonDemo, CastleDemo, FishingDemo, MemoryDemo, MoleDemo, TugDemo } from './demos2d';
import { RunnerDemo, SpaceDemo } from './demos3d';
import './aigame-demos.css';

const DEMOS: Record<string, React.ComponentType<{ items: GItem[] }>> = {
  balloon: BalloonDemo,
  runner: RunnerDemo,
  mole: MoleDemo,
  fishing: FishingDemo,
  memory: MemoryDemo,
  castle: CastleDemo,
  tug: TugDemo,
  space: SpaceDemo,
};

export default function GameDemo({ game, items }: { game: string; items: GItem[] }) {
  const D = DEMOS[game];
  return D ? <D items={items} /> : null;
}
