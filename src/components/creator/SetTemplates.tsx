'use client';

import React, { useState } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { SET_SUBJECTS, SET_TEMPLATES, type SetSubject } from '@/lib/game-creator/setTemplates';
import { texToPlain } from '@/lib/game-creator/quiz';

const sample = (q: string) => (q.startsWith('$') ? texToPlain(q.slice(1).split('$')[0]) : q);

/** แม่แบบชุดคำถามแยกวิชา: กดแล้วเปิดตัวแก้ไขพร้อมคำถาม 10 ข้อ (แก้ต่อแล้วค่อยบันทึก) */
export function SetTemplates({ disabled, onPick }: { disabled?: boolean; onPick: (id: string) => void }) {
  const [sub, setSub] = useState<SetSubject | 'all'>('all');
  const list = SET_TEMPLATES.filter((t) => sub === 'all' || t.subject === sub);
  return (
    <div>
      <div className="l5g-stpl-chips" role="tablist" aria-label="เลือกวิชา">
        {[{ id: 'all' as const, label: 'ทุกวิชา', color: '#9b6cf0' }, ...SET_SUBJECTS].map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={sub === s.id} data-on={sub === s.id} style={{ ['--c' as string]: s.color }} onClick={() => setSub(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="l5g-stpl-grid">
        {list.map((t) => {
          const s = SET_SUBJECTS.find((x) => x.id === t.subject)!;
          return (
            <button key={t.id} type="button" className="l5g-stpl" style={{ ['--c' as string]: s.color }} disabled={disabled} onClick={() => onPick(t.id)}>
              <span className="l5g-stpl-top">
                <span className="l5g-stpl-sub">
                  <BookOpen className="w-4 h-4" /> {s.label}
                </span>
                <span className="l5g-stpl-grade">{t.grade}</span>
              </span>
              <b className="l5g-stpl-title">{t.title}</b>
              <span className="l5g-stpl-note">{t.note}</span>
              <span className="l5g-stpl-q">ข้อ 1: {sample(t.qs[0][0])}</span>
              <span className="l5g-stpl-go">
                {t.qs.length} ข้อ ใช้แม่แบบนี้ <ChevronRight className="w-4 h-4" strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
