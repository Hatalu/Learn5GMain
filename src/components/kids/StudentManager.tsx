'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Clock,
  Flame,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { api, errMsg } from '@/lib/client/api';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Avatar, AVATARS, AVATAR_KEYS } from '@/components/kids/Avatar';
import { StarIcon } from '@/components/kids/Stars';
import { CardInfo, CredentialCardsModal } from '@/components/kids/CredentialCards';
import { StudentReport } from '@/components/reports/StudentReport';
import { cn } from '@/lib/utils/cn';

export interface StudentRow {
  id: string;
  display_name: string;
  grade: string | null;
  avatar: string;
  daily_limit_min: number | null;
  last_seen_at: string | null;
  code: string | null;
  locked: boolean;
  stars: number;
  buddyStage: string;
  streak: number;
  lastPlayDate: string | null;
  classIds: string[];
}

const GRADES = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'];
const LIMITS: { v: number | null; label: string }[] = [
  { v: null, label: 'ไม่จำกัด' },
  { v: 20, label: '20 นาที' },
  { v: 30, label: '30 นาที' },
  { v: 45, label: '45 นาที' },
  { v: 60, label: '1 ชั่วโมง' },
];

const inputCls =
  'w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20';

/**
 * จัดการนักเรียน: เพิ่ม (ทีละหลายคนได้), ดูบัตรเข้าสู่ระบบ, รีเซ็ต PIN,
 * จำกัดเวลาเล่น, ดูรายงาน, ลบ — ใช้ทั้งหน้าผู้ปกครองและครู
 */
export function StudentManager({
  mode,
  onChanged,
  classId,
  filterClassId,
}: {
  mode: 'parent' | 'teacher';
  /** ถ้าระบุ จะเพิ่มนักเรียนใหม่เข้าห้องนี้ด้วย */
  classId?: string;
  onChanged?: () => void;
  /** แสดงเฉพาะนักเรียนในห้องนี้ (ใช้ในหน้าห้องเรียน) */
  filterClassId?: string;
}) {
  const { success, error } = useToast();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [namesText, setNamesText] = useState('');
  const [grade, setGrade] = useState('');
  const [avatar, setAvatar] = useState('bear');
  const [adding, setAdding] = useState(false);

  const [cards, setCards] = useState<CardInfo[] | null>(null);
  const [report, setReport] = useState<StudentRow | null>(null);
  const [limitFor, setLimitFor] = useState<StudentRow | null>(null);
  const [deleteFor, setDeleteFor] = useState<StudentRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ students: StudentRow[] }>('/api/students');
      setStudents(r.students);
      setLoadError('');
    } catch (e) {
      setLoadError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = filterClassId ? students.filter((s) => s.classIds.includes(filterClassId)) : students;

  const changed = async () => {
    await load();
    onChanged?.();
  };

  const names = namesText
    .split('\n')
    .map((n) => n.trim())
    .filter(Boolean);

  const addStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (names.length === 0) return;
    setAdding(true);
    try {
      const r = await api<{ created: { name: string; code: string; pin: string; grade: string | null }[]; failed: string[] }>('/api/students', {
        method: 'POST',
        body: {
          students: names.map((name) => ({ name, grade: grade || undefined })),
          classId,
          avatar,
        },
      });
      setCards(r.created.map((c) => ({ name: c.name, code: c.code, pin: c.pin, grade: c.grade })));
      if (r.failed.length) error(`เพิ่มไม่สำเร็จ: ${r.failed.join(', ')}`);
      setAddOpen(false);
      setNamesText('');
      await changed();
    } catch (err) {
      error(errMsg(err));
    } finally {
      setAdding(false);
    }
  };

  const resetPin = async (s: StudentRow) => {
    setBusyId(s.id);
    try {
      const r = await api<{ pin: string }>(`/api/students/${s.id}`, { method: 'PATCH', body: { action: 'reset_pin' } });
      setCards([{ name: s.display_name, code: s.code || '', pin: r.pin, grade: s.grade }]);
      await changed();
    } catch (err) {
      error(errMsg(err));
    } finally {
      setBusyId(null);
    }
  };

  const setLimit = async (s: StudentRow, minutes: number | null) => {
    try {
      await api(`/api/students/${s.id}`, { method: 'PATCH', body: { action: 'set_limit', minutes } });
      success(minutes ? `ตั้งเวลาเล่นวันละ ${minutes} นาทีแล้ว` : 'ยกเลิกการจำกัดเวลาแล้ว');
      setLimitFor(null);
      await changed();
    } catch (err) {
      error(errMsg(err));
    }
  };

  const remove = async (s: StudentRow) => {
    setBusyId(s.id);
    try {
      await api(`/api/students/${s.id}`, { method: 'DELETE' });
      success('ลบนักเรียนและข้อมูลทั้งหมดแล้ว');
      setDeleteFor(null);
      await changed();
    } catch (err) {
      error(errMsg(err));
    } finally {
      setBusyId(null);
    }
  };

  const label = mode === 'parent' ? 'ลูกๆ ของฉัน' : 'นักเรียนทั้งหมดของฉัน';

  return (
    <section aria-labelledby="students-h">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 id="students-h" className="text-2xl font-medium text-gray-900 dark:text-white">
          {label} <span className="text-base text-gray-400">({visible.length})</span>
        </h2>
        <button onClick={() => setAddOpen(true)} className="btn-primary-grad btn-jelly inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-display">
          <UserPlus className="w-5 h-5" /> {mode === 'parent' ? 'เพิ่มลูก' : 'เพิ่มนักเรียน'}
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center text-indigo-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : loadError ? (
        <p className="surface p-6 text-center text-rose-600">{loadError}</p>
      ) : visible.length === 0 ? (
        <div className="surface p-8 text-center shadow-toy">
          <p className="font-display text-xl text-gray-900 dark:text-white">ยังไม่มีนักเรียน</p>
          <p className="text-gray-600 dark:text-gray-300 mt-1 mb-4">
            {mode === 'parent' ? 'เพิ่มลูกของคุณ ระบบจะสร้างรหัสนักเรียนและ PIN ให้เข้าเล่นได้ทันที' : 'วางรายชื่อนักเรียนทั้งห้อง (บรรทัดละ 1 คน) ระบบสร้างบัตรเข้าสู่ระบบให้ทุกคนพร้อมพิมพ์'}
          </p>
          <button onClick={() => setAddOpen(true)} className="btn-primary-grad btn-jelly inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-display"><Plus className="w-5 h-5" /> เริ่มเพิ่มเลย</button>
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-4">
          {visible.map((s) => (
            <li key={s.id} className="surface p-4 shadow-toy">
              <div className="flex items-center gap-3">
                <Avatar name={s.avatar} size={56} ring />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg text-gray-900 dark:text-white truncate">{s.display_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {s.grade ? `${s.grade} · ` : ''}รหัส <span className="font-mono tracking-wider">{s.code || '-'}</span>
                    {s.locked && <span className="ml-2 inline-flex items-center gap-1 text-rose-600"><Lock className="w-3 h-3" /> ถูกล็อกชั่วคราว</span>}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sun-400/20 text-amber-800 dark:text-sun-300 font-semibold"><StarIcon className="w-4 h-4" /> {s.stars}</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 font-semibold"><Flame className="w-4 h-4" /> {s.streak} วัน</span>
                <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold">{s.buddyStage}</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"><Clock className="w-3.5 h-3.5" /> {s.daily_limit_min ? `${s.daily_limit_min} นาที/วัน` : 'ไม่จำกัดเวลา'}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button onClick={() => setReport(s)} className="btn-jelly inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200 text-sm font-semibold"><BarChart3 className="w-4 h-4" /> รายงาน</button>
                <button onClick={() => setLimitFor(s)} className="btn-jelly inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold"><Clock className="w-4 h-4" /> เวลาเล่น</button>
                <button onClick={() => resetPin(s)} disabled={busyId === s.id} className="btn-jelly inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-sm font-semibold disabled:opacity-60">
                  {busyId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} รีเซ็ต PIN
                </button>
                <button onClick={() => setDeleteFor(s)} className="btn-jelly inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm font-semibold"><Trash2 className="w-4 h-4" /> ลบ</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* เพิ่มนักเรียน */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={mode === 'parent' ? 'เพิ่มลูก' : 'เพิ่มนักเรียน'}>
        <form onSubmit={addStudents} className="space-y-4">
          <div>
            <label htmlFor="names" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {mode === 'parent' ? 'ชื่อเล่นของลูก' : 'ชื่อเล่นนักเรียน (บรรทัดละ 1 คน วางทั้งห้องได้เลย)'}
            </label>
            <textarea id="names" className={cn(inputCls, 'resize-none')} rows={mode === 'parent' ? 2 : 7} value={namesText} onChange={(e) => setNamesText(e.target.value)} placeholder={mode === 'parent' ? 'เช่น น้องบีม' : 'น้องบีม\nน้องฟ้า\nน้องก้อง'} required autoFocus />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">ใช้แค่ชื่อเล่น ไม่ต้องใส่นามสกุลหรือข้อมูลส่วนตัว {names.length > 0 && `· ${names.length} คน`}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">ชั้น</p>
            <div className="flex flex-wrap gap-2">
              {GRADES.map((g) => (
                <button key={g} type="button" onClick={() => setGrade(grade === g ? '' : g)} aria-pressed={grade === g} className={cn('btn-jelly px-4 py-2 rounded-xl border-2 text-sm font-semibold', grade === g ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200')}>{g}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">ตัวละครโปรไฟล์</p>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_KEYS.map((k) => (
                <button key={k} type="button" onClick={() => setAvatar(k)} aria-pressed={avatar === k} aria-label={AVATARS[k].label} className={cn('btn-jelly rounded-2xl p-1.5 border-2', avatar === k ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50' : 'border-transparent')}>
                  <Avatar name={k} size={52} className="mx-auto" />
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={adding || names.length === 0} className="btn-primary-grad btn-jelly w-full py-3.5 rounded-2xl font-display text-lg flex items-center justify-center gap-2 disabled:opacity-60">
            {adding && <Loader2 className="w-5 h-5 animate-spin" />} {adding ? 'กำลังสร้างบัญชี...' : `สร้างบัญชี${names.length > 1 ? ` ${names.length} คน` : ''}`}
          </button>
        </form>
      </Modal>

      <CredentialCardsModal
        open={!!cards}
        onClose={() => setCards(null)}
        cards={cards || []}
        title={cards && cards.length === 1 && !cards[0].pin ? 'บัตรนักเรียน' : 'บัตรเข้าสู่ระบบ'}
      />

      <Modal open={!!report} onClose={() => setReport(null)} title="รายงานความก้าวหน้า" wide>
        {report && <StudentReport studentId={report.id} />}
      </Modal>

      <Modal open={!!limitFor} onClose={() => setLimitFor(null)} title={`เวลาเล่นต่อวัน: ${limitFor?.display_name || ''}`}>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">เมื่อครบเวลา เกมจะให้พักและเล่นต่อได้ในวันถัดไป</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LIMITS.map((l) => (
            <button key={l.label} onClick={() => limitFor && setLimit(limitFor, l.v)} aria-pressed={limitFor?.daily_limit_min === l.v} className={cn('btn-jelly py-3 rounded-2xl border-2 font-semibold', limitFor?.daily_limit_min === l.v ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200')}>{l.label}</button>
          ))}
        </div>
      </Modal>

      <Modal open={!!deleteFor} onClose={() => setDeleteFor(null)} title="ลบนักเรียนคนนี้?">
        <p className="text-gray-700 dark:text-gray-300">
          ลบ <b>{deleteFor?.display_name}</b> พร้อมดาว ตรา และประวัติการเล่นทั้งหมด การลบนี้<b className="text-rose-600">ย้อนกลับไม่ได้</b>
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteFor(null)} className="btn-jelly px-5 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">ยกเลิก</button>
          <button onClick={() => deleteFor && remove(deleteFor)} disabled={busyId === deleteFor?.id} className="btn-jelly px-5 py-3 rounded-2xl bg-rose-600 text-white font-semibold flex items-center gap-2 disabled:opacity-60">
            {busyId === deleteFor?.id && <Loader2 className="w-4 h-4 animate-spin" />} ลบถาวร
          </button>
        </div>
      </Modal>
    </section>
  );
}
