'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Loader2, Send, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { hasMembership } from '@/lib/membership';
import { ALL_GRADES, ALL_SUBJECTS } from '@/types/database';
import { cn } from '@/lib/utils/cn';

const field =
  'w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500';

/** ปุ่มส่งไอเดีย ลอยมุมซ้ายบน (เห็นและกดได้เฉพาะสมาชิก) */
export function IdeaButton() {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const { success, error } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState<string>(ALL_SUBJECTS[0]);
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState<string>('ป.4');
  const [idea, setIdea] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!user || !hasMembership(profile) || pathname.startsWith('/login')) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !idea.trim()) {
      error('กรอกเรื่องและไอเดียก่อนนะ');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.from('ideas').insert({
      user_id: user.id,
      username: profile?.username || 'สมาชิก',
      subject,
      topic: topic.trim().slice(0, 120),
      grade,
      idea: idea.trim().slice(0, 2000),
    });
    setBusy(false);
    if (err) {
      error(/ideas/.test(err.message) && /exist|schema/i.test(err.message) ? 'ระบบกล่องไอเดียยังไม่พร้อมใช้งาน' : 'ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะ');
      return;
    }
    success('ส่งไอเดียแล้ว ขอบคุณมาก');
    setTopic('');
    setIdea('');
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="ส่งไอเดีย"
        title="ส่งไอเดีย"
        className="btn-jelly fixed left-3 sm:left-4 top-[4.75rem] z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full drop-shadow-lg hover:drop-shadow-xl"
      >
        <Image src="/icon-idea.png" alt="" fill sizes="64px" className="object-contain" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center p-3 bg-indigo-950/70 backdrop-blur-sm"
          onMouseDown={() => setOpen(false)}
        >
          <form
            onSubmit={submit}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="ส่งไอเดีย"
            className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-[2rem] bg-white dark:bg-gray-900 border-2 border-indigo-200 dark:border-indigo-800 shadow-toy-lg p-5 sm:p-7 animate-pop-in"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-12 h-12 shrink-0">
                <Image src="/icon-idea.png" alt="" fill sizes="48px" className="object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-medium text-gray-900 dark:text-white">ส่งไอเดีย</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">อยากให้มีสื่ออะไร เล่าให้เราฟังได้เลย</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="ปิด" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">วิชา</span>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} className={field}>
                  {ALL_SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">ระดับชั้น</span>
                <select value={grade} onChange={(e) => setGrade(e.target.value)} className={field}>
                  {ALL_GRADES.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block mt-3">
              <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">เรื่อง</span>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={120} placeholder="เช่น เศษส่วน, ไวยากรณ์ Tense" className={field} />
            </label>
            <label className="block mt-3">
              <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">ไอเดีย</span>
              <textarea value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={2000} rows={5} placeholder="อยากให้เกมเป็นแบบไหน เล่นอย่างไร" className={cn(field, 'resize-none')} />
              <span className="block text-right text-xs text-gray-400 mt-0.5">{idea.length}/2000</span>
            </label>

            <button type="submit" disabled={busy} className="btn-primary-grad btn-jelly mt-3 w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl font-display text-lg disabled:opacity-60">
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} ส่งไอเดีย
            </button>
          </form>
        </div>
      )}
    </>
  );
}
