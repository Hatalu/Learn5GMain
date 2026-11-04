'use client';

/** ตั้งค่า Human Shape Builder (ใช้ทั้งในหน้าต่างเปิดเกม และหน้าเริ่มเกม/ทดลองเล่น) */
import React from 'react';
import { Clock3, Gauge, Layers, ListOrdered, Shuffle, Sparkles, Star, Users, Wand2 } from 'lucide-react';
import { gsfx } from '@/lib/game-creator/gsound';
import { CATS, LEVELS, catBit, ALL_CATS } from '@/lib/game-creator/shape/missions';
import { PATTERNS, PT_STEPS, SHAPE_PLAYERS, SHAPE_ROUNDS, SHAPE_TEAMS, SHAPE_TIMES, type ShapePts, type ShapeSettings } from '@/lib/game-creator/shape/settings';

const PT_ROWS: [keyof ShapePts, string][] = [
  ['answer', 'ตอบคำถามถูก'],
  ['mission', 'สร้างรูปสำเร็จ'],
  ['cond', 'ทำตามเงื่อนไขครบ'],
  ['team', 'ความร่วมมือ'],
  ['time', 'โบนัสเสร็จเร็ว (สูงสุด)'],
];

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
  const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" className="l5g-chipbtn" data-on={on} onClick={onClick}>
      {children}
    </button>
  );
  const toggleCat = (bit: number) => {
    if (value.cats === ALL_CATS) return set({ cats: bit });
    const next = value.cats & bit ? value.cats & ~bit : value.cats | bit;
    set({ cats: next || bit });
  };
  return (
    <div className="grid gap-4">
      <Row icon={<Users className="w-4 h-4" />} label="รูปแบบผู้เล่น">
        {SHAPE_TEAMS.map((t) => (
          <Chip key={t} on={value.teams === t} onClick={() => set({ teams: t })}>
            {t ? `${t} ทีม` : 'เล่นเดี่ยว'}
          </Chip>
        ))}
      </Row>
      <Row icon={<Users className="w-4 h-4" />} label={value.teams ? 'สมาชิกต่อทีม (ภารกิจจะไม่ใช้คนเกินนี้)' : 'จำนวนผู้เล่น (ทำภารกิจคนละรูป)'}>
        {SHAPE_PLAYERS.map((n) => (
          <Chip key={n} on={value.players === n} onClick={() => set({ players: n })}>
            {n} คน
          </Chip>
        ))}
      </Row>
      <Row icon={<Gauge className="w-4 h-4" />} label="ระดับความยาก">
        {LEVELS.map((l, i) => (
          <Chip key={i} on={value.level === i} onClick={() => set({ level: i })}>
            {l}
          </Chip>
        ))}
      </Row>
      <Row icon={<Layers className="w-4 h-4" />} label="ประเภทภารกิจ (เลือกได้หลายแบบ)">
        <Chip on={value.cats === ALL_CATS} onClick={() => set({ cats: ALL_CATS })}>
          สุ่มจากทุกประเภท
        </Chip>
        {CATS.map((c) => (
          <Chip key={c.id} on={value.cats !== ALL_CATS && !!(value.cats & catBit(c.id))} onClick={() => toggleCat(catBit(c.id))}>
            {c.name}
          </Chip>
        ))}
      </Row>
      <Row icon={<Sparkles className="w-4 h-4" />} label="รูปแบบการเล่น">
        {PATTERNS.map((p, i) => (
          <button key={i} type="button" className="l5g-chipbtn hs-pat" data-on={value.pattern === i} onClick={() => set({ pattern: i })}>
            <b>{p.name}</b>
            <span>{p.desc}</span>
          </button>
        ))}
      </Row>
      <Row icon={<Wand2 className="w-4 h-4" />} label="การเลือกภารกิจ">
        <Chip on={value.pick === 0} onClick={() => set({ pick: 0 })}>
          ระบบสุ่มให้
        </Chip>
        <Chip on={value.pick === 1} onClick={() => set({ pick: 1 })}>
          ครูเลือกเอง
        </Chip>
      </Row>
      <Row icon={<ListOrdered className="w-4 h-4" />} label={`จำนวนรอบ (ชุดนี้มี ${usable} ข้อ)`}>
        {SHAPE_ROUNDS.map((n) => (
          <Chip key={n} on={value.rounds === n} onClick={() => set({ rounds: n })}>
            {n ? `${n} รอบ` : `เท่าจำนวนข้อ (${usable})`}
          </Chip>
        ))}
      </Row>
      <Row icon={<Shuffle className="w-4 h-4" />} label="ลำดับคำถาม">
        <Chip on={value.order === 0} onClick={() => set({ order: 0 })}>
          เรียงตามชุด
        </Chip>
        <Chip on={value.order === 1} onClick={() => set({ order: 1 })}>
          สุ่มคำถาม
        </Chip>
      </Row>
      <Row icon={<Clock3 className="w-4 h-4" />} label="เวลาทำภารกิจ">
        {SHAPE_TIMES.map((t) => (
          <Chip key={t} on={value.time === t} onClick={() => set({ time: t })}>
            {t < 60 ? `${t} วินาที` : `${t / 60} นาที`}
          </Chip>
        ))}
      </Row>
      <Row icon={<Star className="w-4 h-4" />} label="ระบบคะแนน">
        <Chip on={value.scoring} onClick={() => set({ scoring: true })}>
          ใช้คะแนน
        </Chip>
        <Chip on={!value.scoring} onClick={() => set({ scoring: false })}>
          ไม่แข่งขัน (นับภารกิจที่สำเร็จ)
        </Chip>
      </Row>
      {value.scoring && (
        <div className="hs-pts">
          {PT_ROWS.map(([k, label]) => (
            <label key={k} className="hs-pt">
              <span>{label}</span>
              <select value={value.pts[k]} onChange={(e) => set({ pts: { ...value.pts, [k]: Number(e.target.value) } })}>
                {PT_STEPS.map((n) => (
                  <option key={n} value={n}>
                    {n} คะแนน
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      {music}
    </div>
  );
}
