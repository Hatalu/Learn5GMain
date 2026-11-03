'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { SET_SUBJECTS, type SetSubject } from '@/lib/game-creator/setTemplates';
import { texToPlain } from '@/lib/game-creator/quiz';

type Bank = typeof import('@/lib/game-creator/setBank');
const PAGE = 24;
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const BANDS = [
  { id: 'all', label: 'ทุกชั้น', lo: 1, hi: 12 },
  { id: 'p', label: 'ประถม', lo: 1, hi: 6 },
  { id: 'm1', label: 'ม.ต้น', lo: 7, hi: 9 },
  { id: 'm2', label: 'ม.ปลาย', lo: 10, hi: 12 },
] as const;

const sample = (q: string) => (q.startsWith('$') ? texToPlain(q.slice(1).split('$')[0]) : q);

/** แม่แบบชุดคำถาม ป.1–ม.6: กรองวิชา ชั้น หมวด ระดับ ค้นหา แล้วเปิดตัวแก้ไขพร้อมคำถาม (แก้ต่อแล้วค่อยบันทึก) */
export function SetTemplates({ disabled, onPick }: { disabled?: boolean; onPick: (id: string) => void }) {
  const [bank, setBank] = useState<Bank | null>(null);
  const [failed, setFailed] = useState(false);
  const [sub, setSub] = useState<SetSubject | 'all'>('all');
  const [band, setBand] = useState<(typeof BANDS)[number]['id']>('all');
  const [grade, setGrade] = useState(0);
  const [cat, setCat] = useState('');
  const [level, setLevel] = useState(0);
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    import('@/lib/game-creator/setBank').then(setBank, () => setFailed(true));
  }, []);
  // เปลี่ยนตัวกรองแล้วเริ่มหน้าแรกใหม่
  useEffect(() => setShown(PAGE), [sub, band, grade, cat, level, q]);

  const sets = useMemo(() => bank?.allSets() ?? [], [bank]);
  const list = useMemo(() => {
    const b = BANDS.find((x) => x.id === band)!;
    const term = q.trim().toLowerCase();
    return sets.filter((t) => {
      const hi = t.g2 || t.g;
      if (sub !== 'all' && t.subject !== sub) return false;
      if (grade ? !(t.g <= grade && grade <= hi) : hi < b.lo || t.g > b.hi) return false;
      if (cat && t.cat !== cat) return false;
      if (level && t.level !== level) return false;
      return !term || `${t.title} ${t.note} ${t.sample}`.toLowerCase().includes(term);
    });
  }, [sets, sub, band, grade, cat, level, q]);

  if (failed) return <p className="l5g-sec-note">โหลดแม่แบบไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง</p>;
  if (!bank)
    return (
      <div className="l5g-stpl-loading">
        <Loader2 className="w-6 h-6 animate-spin" /> กำลังโหลดแม่แบบ
      </div>
    );

  const subColor = (id: string) => SET_SUBJECTS.find((s) => s.id === id)?.color || '#9b6cf0';
  const bandGrades = GRADES.filter((g) => {
    const b = BANDS.find((x) => x.id === band)!;
    return g >= b.lo && g <= b.hi;
  });
  const filtered = sub !== 'all' || band !== 'all' || grade || cat || level || q;

  return (
    <div>
      <div className="l5g-stpl-filter">
        <div className="l5g-stpl-search">
          <Search className="w-5 h-5" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาเรื่อง เช่น เศษส่วน, Past Simple, เซลล์" aria-label="ค้นหาแม่แบบ" />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="ล้างคำค้นหา">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="l5g-stpl-row" role="tablist" aria-label="เลือกวิชา">
          {[{ id: 'all' as const, label: 'ทุกวิชา', color: '#9b6cf0' }, ...SET_SUBJECTS].map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={sub === s.id}
              data-on={sub === s.id}
              style={{ ['--c' as string]: s.color }}
              onClick={() => {
                setSub(s.id);
                setCat('');
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="l5g-stpl-row" aria-label="เลือกช่วงชั้น">
          {BANDS.map((b) => (
            <button
              key={b.id}
              type="button"
              data-on={band === b.id && !grade}
              style={{ ['--c' as string]: '#4a7bf0' }}
              onClick={() => {
                setBand(b.id);
                setGrade(0);
              }}
            >
              {b.label}
            </button>
          ))}
          <span className="l5g-stpl-sep" aria-hidden="true" />
          {bandGrades.map((g) => (
            <button key={g} type="button" className="l5g-stpl-g" data-on={grade === g} style={{ ['--c' as string]: '#4a7bf0' }} onClick={() => setGrade(grade === g ? 0 : g)}>
              {bank.gradeLabel(g)}
            </button>
          ))}
        </div>

        <div className="l5g-stpl-row" aria-label="หมวดและระดับ">
          {sub !== 'all' &&
            bank.SET_CATS[sub].map((c) => (
              <button key={c.id} type="button" data-on={cat === c.id} style={{ ['--c' as string]: subColor(sub) }} onClick={() => setCat(cat === c.id ? '' : c.id)}>
                {c.label}
              </button>
            ))}
          {sub !== 'all' && <span className="l5g-stpl-sep" aria-hidden="true" />}
          {[1, 2, 3].map((lv) => (
            <button key={lv} type="button" data-on={level === lv} style={{ ['--c' as string]: ['', '#3fd6a8', '#ff9a3d', '#ff6b7a'][lv] }} onClick={() => setLevel(level === lv ? 0 : lv)}>
              {bank.LEVEL_LABEL[lv]}
            </button>
          ))}
        </div>

        <div className="l5g-stpl-count" aria-live="polite">
          <b>{list.length}</b> ชุด {filtered ? `จากทั้งหมด ${sets.length} ชุด` : 'ครบ ป.1 ถึง ม.6'}
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setSub('all');
                setBand('all');
                setGrade(0);
                setCat('');
                setLevel(0);
                setQ('');
              }}
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="l5g-stpl-empty">ยังไม่มีแม่แบบที่ตรงกับตัวกรองนี้ ลองเลือกชั้นหรือหมวดอื่น</p>
      ) : (
        <div className="l5g-stpl-grid">
          {list.slice(0, shown).map((t) => {
            const s = SET_SUBJECTS.find((x) => x.id === t.subject)!;
            const catLabel = bank.SET_CATS[t.subject].find((c) => c.id === t.cat)?.label;
            return (
              <button key={t.id} type="button" className="l5g-stpl" style={{ ['--c' as string]: s.color }} disabled={disabled} onClick={() => onPick(t.id)}>
                <span className="l5g-stpl-top">
                  <span className="l5g-stpl-sub">
                    <BookOpen className="w-4 h-4" /> {s.label}
                  </span>
                  <span className="l5g-stpl-grade">{bank.gradeLabel(t.g, t.g2)}</span>
                </span>
                <b className="l5g-stpl-title">{t.title}</b>
                <span className="l5g-stpl-tags">
                  {catLabel && <span>{catLabel}</span>}
                  {t.level && <span data-lv={t.level}>{bank.LEVEL_LABEL[t.level]}</span>}
                </span>
                <span className="l5g-stpl-note">{t.note}</span>
                <span className="l5g-stpl-q">ข้อ 1: {sample(t.sample)}</span>
                <span className="l5g-stpl-go">
                  {t.count} ข้อ ใช้แม่แบบนี้ <ChevronRight className="w-4 h-4" strokeWidth={3} />
                </span>
              </button>
            );
          })}
        </div>
      )}
      {list.length > shown && (
        <div className="l5g-stpl-more">
          <button type="button" className="l5g-btn l5g-btn-violet" onClick={() => setShown((n) => n + PAGE)}>
            <ChevronDown className="w-5 h-5" /> แสดงเพิ่ม (เหลืออีก {list.length - shown} ชุด)
          </button>
        </div>
      )}
    </div>
  );
}
