'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ClipboardList, Loader2, Plus, School, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Navbar } from '@/components/navbar/Navbar';
import { Modal } from '@/components/ui/Modal';
import { StudentManager } from '@/components/kids/StudentManager';
import { PremiumPanel } from '@/components/account/PremiumPanel';
import { DangerZone } from '@/components/account/DangerZone';
import { api, errMsg } from '@/lib/client/api';
import { cn } from '@/lib/utils/cn';

interface ClassItem {
  id: string;
  name: string;
  grade: string | null;
  students: number;
  assignments: number;
}

const GRADES = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'];

export default function TeacherPage() {
  const { profile, isLoading } = useAuth();
  const { error } = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ classes: ClassItem[] }>('/api/classes');
      setClasses(r.classes);
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

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/classes', { method: 'POST', body: { name, grade: grade || undefined } });
      setOpen(false);
      setName('');
      setGrade('');
      await load();
    } catch (err) {
      error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        <header>
          <h1 className="text-3xl sm:text-4xl font-medium text-gray-900 dark:text-white">
            สวัสดี{isLoading ? '' : ` ${profile?.display_name || 'คุณครู'}`}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">สร้างห้องเรียน มอบหมายเกม และดูว่านักเรียนติดตรงไหนได้ที่นี่</p>
        </header>

        <section aria-labelledby="classes-h">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 id="classes-h" className="text-2xl font-medium text-gray-900 dark:text-white flex items-center gap-2"><School className="w-6 h-6 text-indigo-500" /> ห้องเรียนของฉัน</h2>
            <button onClick={() => setOpen(true)} className="btn-primary-grad btn-jelly inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-display"><Plus className="w-5 h-5" /> สร้างห้อง</button>
          </div>

          {loading ? (
            <div className="py-10 flex justify-center text-indigo-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : loadError ? (
            <p className="surface p-6 text-center text-rose-600">{loadError}</p>
          ) : classes.length === 0 ? (
            <div className="surface p-8 text-center shadow-toy">
              <p className="font-display text-xl text-gray-900 dark:text-white">เริ่มจากสร้างห้องแรก</p>
              <p className="text-gray-600 dark:text-gray-300 mt-1 mb-4">สร้างห้อง แล้ววางรายชื่อนักเรียนทั้งห้อง ระบบทำบัตรเข้าสู่ระบบพร้อมพิมพ์ให้</p>
              <button onClick={() => setOpen(true)} className="btn-primary-grad btn-jelly inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-display"><Plus className="w-5 h-5" /> สร้างห้องเรียน</button>
            </div>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-4">
              {classes.map((c) => (
                <li key={c.id}>
                  <Link href={`/teacher/class/${c.id}`} className="surface p-5 shadow-toy flex items-center gap-4 hover:-translate-y-1 transition-transform">
                    <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center font-display text-lg shrink-0">{c.grade || 'ห้อง'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg text-gray-900 dark:text-white truncate">{c.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1"><Users className="w-4 h-4" /> {c.students} คน</span>
                        <span className="inline-flex items-center gap-1"><ClipboardList className="w-4 h-4" /> {c.assignments} งาน</span>
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <StudentManager mode="teacher" onChanged={load} />
        <PremiumPanel defaultPlan="classroom" />
        <DangerZone />
      </main>

      <Modal open={open} onClose={() => setOpen(false)} title="สร้างห้องเรียน">
        <form onSubmit={create} className="space-y-4">
          <div>
            <label htmlFor="cname" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">ชื่อห้อง</label>
            <input id="cname" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoFocus placeholder="เช่น ป.4/2 คณิตศาสตร์" className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">ชั้น</p>
            <div className="flex flex-wrap gap-2">
              {GRADES.map((g) => (
                <button key={g} type="button" onClick={() => setGrade(grade === g ? '' : g)} aria-pressed={grade === g} className={cn('btn-jelly px-4 py-2 rounded-xl border-2 text-sm font-semibold', grade === g ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200')}>{g}</button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={busy || !name.trim()} className="btn-primary-grad btn-jelly w-full py-3.5 rounded-2xl font-display text-lg flex items-center justify-center gap-2 disabled:opacity-60">
            {busy && <Loader2 className="w-5 h-5 animate-spin" />} สร้างห้อง
          </button>
        </form>
      </Modal>
    </div>
  );
}
