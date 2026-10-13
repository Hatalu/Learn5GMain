'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, ClipboardList, FileText, Loader2, Monitor, Plus, Printer, Search, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { Navbar } from '@/components/navbar/Navbar';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { StudentManager, StudentRow } from '@/components/kids/StudentManager';
import { StarRow } from '@/components/kids/Stars';
import { Avatar } from '@/components/kids/Avatar';
import { createClient } from '@/lib/supabase/client';
import { api, errMsg } from '@/lib/client/api';
import { cn } from '@/lib/utils/cn';

interface ClassDetail {
  class: { id: string; name: string; grade: string | null };
  students: { id: string; display_name: string; avatar: string; stars: number; streak: number; buddyStage: string; lastPlayDate: string | null }[];
  assignments: { id: string; media_id: string; note: string | null; due_at: string | null; media: { id: string; title: string; icon_url: string; subject: string } | null }[];
}
interface ClassReport {
  assignments: { id: string; mediaId: string; title: string; dueAt: string | null }[];
  rows: { studentId: string; name: string; cells: (number | null)[]; plays: number; accuracy: number | null; lastPlayed: string | null; doneCount: number }[];
  commonMistakes: { topic: string; count: number }[];
  overview: { students: number; completionRate: number | null };
}
interface MediaLite {
  id: string;
  title: string;
  icon_url: string;
  subject: string;
  media_type: string;
  standards: string[] | null;
}

type Tab = 'assign' | 'students' | 'report';

export default function ClassPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [tab, setTab] = useState<Tab>('assign');
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [report, setReport] = useState<ClassReport | null>(null);
  const [loadError, setLoadError] = useState('');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [media, setMedia] = useState<MediaLite[]>([]);
  const [q, setQ] = useState('');
  const [chosen, setChosen] = useState<MediaLite | null>(null);
  const [note, setNote] = useState('');
  const [due, setDue] = useState('');
  const [saving, setSaving] = useState(false);

  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [mine, setMine] = useState<StudentRow[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setDetail(await api<ClassDetail>(`/api/classes/${id}`));
      setLoadError('');
    } catch (e) {
      setLoadError(errMsg(e));
    }
  }, [id]);

  const loadReport = useCallback(async () => {
    try {
      setReport(await api<ClassReport>(`/api/reports/class/${id}`));
    } catch (e) {
      error(errMsg(e));
    }
  }, [id, error]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (tab === 'report') loadReport();
  }, [tab, loadReport]);

  const openPicker = async () => {
    setPickerOpen(true);
    if (media.length) return;
    const { data } = await supabase
      .from('media')
      .select('id, title, icon_url, subject, media_type, standards, is_public')
      .order('created_at', { ascending: false });
    setMedia(((data || []) as (MediaLite & { is_public?: boolean })[]).filter((m) => m.is_public !== false));
  };

  const assign = async () => {
    if (!chosen) return;
    setSaving(true);
    try {
      await api(`/api/classes/${id}/assignments`, {
        method: 'POST',
        body: { mediaId: chosen.id, note, dueAt: due ? new Date(`${due}T23:59:00+07:00`).toISOString() : null },
      });
      success('มอบหมายงานแล้ว นักเรียนจะเห็นในห้องผจญภัยของตัวเอง');
      setPickerOpen(false);
      setChosen(null);
      setNote('');
      setDue('');
      await load();
    } catch (e) {
      error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = async (aid: string) => {
    try {
      await api(`/api/classes/${id}/assignments?id=${aid}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      error(errMsg(e));
    }
  };

  const openAddExisting = async () => {
    setAddExistingOpen(true);
    setPicked(new Set());
    try {
      const r = await api<{ students: StudentRow[] }>('/api/students');
      setMine(r.students);
    } catch (e) {
      error(errMsg(e));
    }
  };

  const addExisting = async () => {
    try {
      await api(`/api/classes/${id}/members`, { method: 'POST', body: { studentIds: Array.from(picked) } });
      setAddExistingOpen(false);
      await load();
    } catch (e) {
      error(errMsg(e));
    }
  };

  const removeMember = async (sid: string) => {
    try {
      await api(`/api/classes/${id}/members?studentId=${sid}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      error(errMsg(e));
    }
  };

  const deleteClass = async () => {
    try {
      await api(`/api/classes/${id}`, { method: 'DELETE' });
      router.replace('/teacher');
    } catch (e) {
      error(errMsg(e));
    }
  };

  const filtered = media.filter((m) => !q.trim() || m.title.toLowerCase().includes(q.trim().toLowerCase()) || m.subject.includes(q.trim()));
  const notInClass = mine.filter((s) => !s.classIds.includes(id));

  if (loadError) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="max-w-xl mx-auto p-6"><div className="surface p-8 text-center"><p className="text-rose-600 mb-4">{loadError}</p><Link href="/teacher" className="btn-primary-grad btn-jelly inline-block px-6 py-3 rounded-2xl font-display">กลับหน้าครู</Link></div></div>
      </div>
    );
  }
  if (!detail) {
    return <div className="min-h-screen"><Navbar /><div className="py-24 flex justify-center text-indigo-500"><Loader2 className="w-8 h-8 animate-spin" /></div></div>;
  }

  const tabs: { v: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { v: 'assign', label: 'งานที่มอบหมาย', Icon: ClipboardList },
    { v: 'students', label: 'นักเรียน', Icon: UserPlus },
    { v: 'report', label: 'รายงานห้อง', Icon: FileText },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <Link href="/teacher" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2"><ArrowLeft className="w-4 h-4" /> ห้องเรียนทั้งหมด</Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-medium text-gray-900 dark:text-white">{detail.class.name}</h1>
            <button onClick={() => setDeleteOpen(true)} className="btn-jelly inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm font-semibold"><Trash2 className="w-4 h-4" /> ลบห้อง</button>
          </div>
        </div>

        <div role="tablist" className="flex gap-2 overflow-x-auto hide-scrollbar no-print">
          {tabs.map(({ v, label, Icon }) => (
            <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={cn('btn-jelly shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-display border-2', tab === v ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300')}>
              <Icon className="w-5 h-5" /> {label}
            </button>
          ))}
        </div>

        {tab === 'assign' && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-600 dark:text-gray-300">{detail.assignments.length} งาน</p>
              <button onClick={openPicker} className="btn-primary-grad btn-jelly inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-display"><Plus className="w-5 h-5" /> มอบหมายเกม</button>
            </div>
            {detail.assignments.length === 0 ? (
              <div className="surface p-8 text-center text-gray-600 dark:text-gray-300">ยังไม่มีงาน กด &quot;มอบหมายเกม&quot; เพื่อเลือกเกมให้ทั้งห้อง</div>
            ) : (
              <ul className="space-y-3">
                {detail.assignments.map((a) => (
                  <li key={a.id} className="surface p-3 flex items-center gap-4 shadow-toy">
                    {a.media && <Image src={a.media.icon_url} alt="" width={64} height={64} className="rounded-2xl object-cover w-16 h-16" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-gray-900 dark:text-white truncate">{a.media?.title || 'สื่อ'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                        {a.media?.subject}
                        {a.due_at && <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> ส่ง {new Date(a.due_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>}
                        {a.note && <span>· {a.note}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link href={`/play/${a.media_id}?mode=teach`} target="_blank" className="btn-jelly inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200 text-sm font-semibold" title="เปิดสอนหน้าชั้น"><Monitor className="w-4 h-4" /><span className="hidden sm:inline">สอนหน้าชั้น</span></Link>
                      <button onClick={() => removeAssignment(a.id)} aria-label="ยกเลิกงานนี้" className="btn-jelly p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === 'students' && (
          <section className="space-y-4">
            <div className="flex justify-end">
              <button onClick={openAddExisting} className="btn-jelly inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200"><UserPlus className="w-4 h-4" /> เพิ่มนักเรียนที่มีบัญชีแล้วเข้าห้อง</button>
            </div>
            <StudentManager mode="teacher" classId={id} filterClassId={id} onChanged={load} />
            {detail.students.length > 0 && (
              <details className="surface p-4">
                <summary className="cursor-pointer font-semibold text-gray-700 dark:text-gray-200">นำนักเรียนออกจากห้อง (ไม่ลบบัญชี)</summary>
                <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                  {detail.students.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <Avatar name={s.avatar} size={32} />
                      <span className="flex-1 truncate">{s.display_name}</span>
                      <button onClick={() => removeMember(s.id)} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg" aria-label={`นำ ${s.display_name} ออกจากห้อง`}><UserMinus className="w-4 h-4" /></button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        )}

        {tab === 'report' && (
          <section>
            {!report ? (
              <div className="py-12 flex justify-center text-indigo-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : report.rows.length === 0 ? (
              <div className="surface p-8 text-center text-gray-600 dark:text-gray-300">ยังไม่มีนักเรียนในห้องนี้</div>
            ) : (
              <>
                <div className="no-print flex justify-between items-center mb-3">
                  <p className="text-gray-600 dark:text-gray-300">
                    {report.overview.students} คน
                    {report.overview.completionRate !== null && <> · ทำงานครบ <b className="text-indigo-700 dark:text-indigo-300">{report.overview.completionRate}%</b></>}
                  </p>
                  <button onClick={() => window.print()} className="btn-jelly inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200"><Printer className="w-4 h-4" /> พิมพ์</button>
                </div>
                <div className="print-area">
                  <h2 className="hidden print:block text-xl mb-2">รายงานห้อง {detail.class.name}</h2>
                  <div className="overflow-x-auto rounded-2xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300">
                        <tr>
                          <th className="text-left p-3 font-semibold">นักเรียน</th>
                          {report.assignments.map((a) => (
                            <th key={a.id} className="p-3 font-semibold text-center max-w-[9rem]"><span className="line-clamp-2">{a.title}</span></th>
                          ))}
                          <th className="p-3 font-semibold text-center">ตอบถูก</th>
                          <th className="p-3 font-semibold text-center">เล่นล่าสุด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {report.rows.map((r) => (
                          <tr key={r.studentId}>
                            <td className="p-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{r.name}</td>
                            {r.cells.map((c, i) => (
                              <td key={i} className="p-3 text-center">{c === null ? <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300">ยังไม่เล่น</span> : <StarRow count={c} className="justify-center" />}</td>
                            ))}
                            <td className="p-3 text-center">{r.accuracy !== null ? `${r.accuracy}%` : '-'}</td>
                            <td className="p-3 text-center text-gray-500 whitespace-nowrap">{r.lastPlayed ? new Date(r.lastPlayed).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <h3 className="font-display text-lg text-gray-900 dark:text-white mt-5 mb-2">จุดที่ทั้งห้องพลาดบ่อย (30 วัน)</h3>
                  {report.commonMistakes.length ? (
                    <ul className="flex flex-wrap gap-2">
                      {report.commonMistakes.map((m) => (
                        <li key={m.topic} className="px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm font-semibold border border-rose-200 dark:border-rose-900">{m.topic} <span className="text-rose-400">x{m.count}</span></li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">ยังไม่มีข้อมูลจุดที่ผิดซ้ำ (เกมต้องรายงานแท็กข้อที่ผิดผ่าน Learn5G SDK)</p>
                  )}
                </div>
              </>
            )}
          </section>
        )}
      </main>

      {/* เลือกเกมมอบหมาย */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title={chosen ? 'ตั้งค่างาน' : 'เลือกเกมที่จะมอบหมาย'} wide>
        {!chosen ? (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อเกมหรือวิชา" aria-label="ค้นหาเกม" className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <ul className="grid sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto p-1">
              {filtered.map((m) => (
                <li key={m.id}>
                  <button onClick={() => setChosen(m)} className="btn-jelly w-full flex items-center gap-3 p-2.5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-left hover:border-indigo-400">
                    <Image src={m.icon_url} alt="" width={56} height={56} className="rounded-xl object-cover w-14 h-14" />
                    <span className="min-w-0">
                      <span className="block font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">{m.title}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{m.subject} · {m.media_type}</span>
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="text-gray-500 p-4">ไม่พบเกม</li>}
            </ul>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40">
              <Image src={chosen.icon_url} alt="" width={56} height={56} className="rounded-xl object-cover w-14 h-14" />
              <p className="font-display text-gray-900 dark:text-white">{chosen.title}</p>
              <button onClick={() => setChosen(null)} className="ml-auto text-sm text-indigo-600 dark:text-indigo-300 underline">เปลี่ยนเกม</button>
            </div>
            <div>
              <label htmlFor="due" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">กำหนดส่ง (ไม่บังคับ)</label>
              <input id="due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label htmlFor="anote" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">ข้อความถึงนักเรียน (ไม่บังคับ)</label>
              <input id="anote" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="เช่น เล่นให้ได้ 2 ดาวขึ้นไป" className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white" />
            </div>
            <button onClick={assign} disabled={saving} className="btn-primary-grad btn-jelly w-full py-3.5 rounded-2xl font-display text-lg flex items-center justify-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-5 h-5 animate-spin" />} มอบหมายให้ทั้งห้อง
            </button>
          </div>
        )}
      </Modal>

      {/* เพิ่มนักเรียนเดิมเข้าห้อง */}
      <Modal open={addExistingOpen} onClose={() => setAddExistingOpen(false)} title="เพิ่มนักเรียนเข้าห้อง">
        {notInClass.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">นักเรียนทุกคนของคุณอยู่ในห้องนี้แล้ว หรือยังไม่มีบัญชี ลองสร้างนักเรียนใหม่ในแท็บ &quot;นักเรียน&quot;</p>
        ) : (
          <>
            <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
              {notInClass.map((s) => (
                <li key={s.id}>
                  <label className="flex items-center gap-3 p-2.5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={picked.has(s.id)} onChange={(e) => { const n = new Set(picked); e.target.checked ? n.add(s.id) : n.delete(s.id); setPicked(n); }} />
                    <Avatar name={s.avatar} size={36} />
                    <span className="font-semibold text-gray-900 dark:text-white">{s.display_name}</span>
                  </label>
                </li>
              ))}
            </ul>
            <button onClick={addExisting} disabled={picked.size === 0} className="btn-primary-grad btn-jelly mt-4 w-full py-3 rounded-2xl font-display disabled:opacity-60">เพิ่ม {picked.size} คน</button>
          </>
        )}
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="ลบห้องเรียนนี้?">
        <p className="text-gray-700 dark:text-gray-300">งานที่มอบหมายในห้องจะถูกลบ แต่บัญชีนักเรียนยังอยู่</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteOpen(false)} className="btn-jelly px-5 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">ยกเลิก</button>
          <button onClick={deleteClass} className="btn-jelly px-5 py-3 rounded-2xl bg-rose-600 text-white font-semibold">ลบห้อง</button>
        </div>
      </Modal>
    </div>
  );
}
