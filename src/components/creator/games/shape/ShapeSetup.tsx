'use client';

/** ตั้งค่ามนุษย์สร้างรูปในหน้าต่างเปิดเกม */
import React from 'react';
import { ListOrdered, Medal, Users } from 'lucide-react';
import { gsfx } from '@/lib/game-creator/gsound';
import { SHAPE_COUNTS, SHAPE_TEAMS, type ShapeSettings } from '@/lib/game-creator/shape/settings';

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="l5g-qset-label flex items-center gap-1">
        {icon} {label}
      </p>
      <div className="l5g-chips">{children}</div>
    </div>
  );
}

export function ShapeSetup({ value, onChange, usable, music }: { value: ShapeSettings; onChange: (v: ShapeSettings) => void; usable: number; music?: React.ReactNode }) {
  const set = (p: Partial<ShapeSettings>) => (gsfx.tap(), onChange({ ...value, ...p }));
  const counts = SHAPE_COUNTS.filter((n) => n === 0 || n < usable);
  return (
    <div className="grid gap-4">
      <Row icon={<Users className="w-4 h-4" />} label="จำนวนกลุ่ม">
        {SHAPE_TEAMS.map((t) => (
          <button key={t} type="button" className="l5g-chipbtn" data-on={value.teams === t} onClick={() => set({ teams: t })}>
            {t} กลุ่ม
          </button>
        ))}
      </Row>
      <Row icon={<ListOrdered className="w-4 h-4" />} label="จำนวนข้อ">
        {counts.map((n) => (
          <button key={n} type="button" className="l5g-chipbtn" data-on={value.count === n || (value.count >= usable && n === 0)} onClick={() => set({ count: n })}>
            {n ? `${n} ข้อ` : `ทั้งหมด ${usable} ข้อ`}
          </button>
        ))}
      </Row>
      <Row icon={<Medal className="w-4 h-4" />} label="อันดับการตอบ">
        <button type="button" className="l5g-chipbtn" data-on={value.order} onClick={() => set({ order: true })}>
          นับอันดับ (ตอบก่อนได้คะแนนมากกว่า)
        </button>
        <button type="button" className="l5g-chipbtn" data-on={!value.order} onClick={() => set({ order: false })}>
          ไม่นับอันดับ (ถูกได้เท่ากัน)
        </button>
      </Row>
      {music}
    </div>
  );
}
