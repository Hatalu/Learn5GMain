'use client';

/**
 * เลือกเกมตัวอย่างตาม id (ไฟล์นี้ถูกโหลดแบบ dynamic จากหน้าสร้างเกม)
 * เกม 3D เป็น three.js จริง แยกไฟล์โหลดเฉพาะตอนเลือกเกม 3D (WebGL ใช้ไม่ได้ = ใช้ตัวอย่าง 2D แทนในตัวเกมเอง)
 */
import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { GItem } from '@/lib/aigame/prompt';
import { BalloonDemo, CastleDemo, FishingDemo, MemoryDemo, MoleDemo, TugDemo } from './demos2d';
import { BeltDemo, TrainDemo } from './demosAct';
import './aigame-demos.css';

const load = () => (
  <div className="ag-demo-load">
    <Loader2 className="w-6 h-6 animate-spin" />
  </div>
);
const RollDemo3D = dynamic(() => import('./three/roll').then((m) => m.RollDemo3D), { ssr: false, loading: load });
const StackDemo3D = dynamic(() => import('./three/stack').then((m) => m.StackDemo3D), { ssr: false, loading: load });
const RunnerDemo3D = dynamic(() => import('./three/runner').then((m) => m.RunnerDemo3D), { ssr: false, loading: load });
const SpaceDemo3D = dynamic(() => import('./three/space').then((m) => m.SpaceDemo3D), { ssr: false, loading: load });

const DEMOS: Record<string, React.ComponentType<{ items: GItem[] }>> = {
  balloon: BalloonDemo,
  runner: RunnerDemo3D,
  mole: MoleDemo,
  fishing: FishingDemo,
  memory: MemoryDemo,
  castle: CastleDemo,
  tug: TugDemo,
  space: SpaceDemo3D,
  belt: BeltDemo,
  roll: RollDemo3D,
  train: TrainDemo,
  stack: StackDemo3D,
};

export default function GameDemo({ game, items }: { game: string; items: GItem[] }) {
  const D = DEMOS[game];
  return D ? <D items={items} /> : null;
}
