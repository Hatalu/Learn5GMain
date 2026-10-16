'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BookOpen, GraduationCap, Lightbulb, Loader2, Send, Tag, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { hasMembership } from '@/lib/membership';
import { ALL_GRADES, ALL_SUBJECTS } from '@/types/database';
import { cn } from '@/lib/utils/cn';

const inputCls =
  'w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 text-gray-900 dark:text-white text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all';

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

  if (!user || !hasMembership(profile) || pathname !== '/home') return null;

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
        className="btn-jelly group fixed left-2 sm:left-4 top-[4.5rem] z-40 w-28 h-28 sm:w-32 sm:h-32"
      >
        {/* เอฟเฟกต์รอบไอคอน: แสงเต้น + วงประหมุน + ประกายดาว */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-full bg-amber-300/40 blur-xl animate-pulse motion-reduce:animate-none" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-amber-300/80 animate-spin motion-reduce:animate-none" style={{ animationDuration: '14s' }} />
        <span aria-hidden="true" className="pointer-events-none absolute inset-1 rounded-full ring-2 ring-pink-400/50 animate-ping motion-reduce:animate-none" style={{ animationDuration: '2.6s' }} />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 motion-reduce:hidden">
          <span className="absolute -top-1 left-3 w-3 h-3 bg-amber-300 animate-pulse" style={{ clipPath: 'polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)' }} />
          <span className="absolute top-2 -right-1 w-4 h-4 bg-pink-300 animate-pulse" style={{ clipPath: 'polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)', animationDelay: '.6s' }} />
          <span className="absolute -bottom-1 right-6 w-3 h-3 bg-sky-300 animate-pulse" style={{ clipPath: 'polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)', animationDelay: '1.2s' }} />
        </span>
        <span className="relative block w-full h-full animate-float-slow motion-reduce:animate-none drop-shadow-xl group-hover:scale-105 transition-transform">
          <Image src="/icon-idea.png" alt="" fill sizes="128px" className="object-contain p-2" />
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center p-3 bg-indigo-950/75 backdrop-blur-md animate-fade-in"
          onMouseDown={() => setOpen(false)}
        >
          <form
            onSubmit={submit}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="ส่งไอเดีย"
            className="relative w-full max-w-lg max-h-[94vh] overflow-y-auto rounded-[2rem] bg-white dark:bg-gray-900 border-[3px] border-indigo-300/70 dark:border-indigo-500/40 shadow-[0_24px_70px_-12px_rgba(76,29,149,0.6)] animate-pop-in"
          >
            {/* หัวฟอร์ม */}
            <div className="relative px-5 sm:px-7 pt-6 pb-8 text-white bg-gradient-to-br from-indigo-600 via-violet-600 to-pink-500 overflow-hidden">
              <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1.2px, transparent 0)', backgroundSize: '20px 20px' }} aria-hidden="true" />
              <span className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="ปิด"
                className="absolute right-3 top-3 z-10 w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="relative flex items-center gap-4">
                <div className="relative w-16 h-16 shrink-0 animate-float-slow">
                  <span className="absolute inset-0 rounded-2xl bg-white/30 blur-md" aria-hidden="true" />
                  <Image src="/icon-idea.png" alt="" fill sizes="64px" className="object-contain drop-shadow-lg" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-2xl sm:text-3xl leading-tight">ส่งไอเดียให้เรา</h2>
                  <p className="mt-0.5 text-sm text-white/90">อยากเล่นเกมเรื่องอะไร เล่าให้ทีมฟังได้เลย</p>
                </div>
              </div>
            </div>

            <div className="relative -mt-4 rounded-t-[1.75rem] bg-white dark:bg-gray-900 px-5 sm:px-7 pt-5 pb-6 space-y-5">
              {/* วิชา */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 font-display text-sm text-gray-800 dark:text-gray-100">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center"><BookOpen className="w-3.5 h-3.5" /></span> วิชา
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_SUBJECTS.map((sub) => {
                    const on = subject === sub;
                    const tone =
                      sub === 'คณิตศาสตร์'
                        ? 'from-emerald-400 to-teal-500 shadow-[0_4px_0_0_rgba(4,120,87,0.5)]'
                        : sub === 'วิทยาศาสตร์'
                          ? 'from-sky-400 to-indigo-500 shadow-[0_4px_0_0_rgba(30,64,175,0.5)]'
                          : 'from-amber-300 to-orange-500 shadow-[0_4px_0_0_rgba(194,65,12,0.5)]';
                    return (
                      <button
                        key={sub}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setSubject(sub)}
                        className={cn(
                          'btn-jelly py-2.5 px-1 rounded-2xl border-2 text-sm font-bold leading-tight',
                          on
                            ? cn('bg-gradient-to-br border-white/40', tone, sub === 'ภาษาอังกฤษ' ? 'text-orange-950' : 'text-white')
                            : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-300'
                        )}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ระดับชั้น */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 font-display text-sm text-gray-800 dark:text-gray-100">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center"><GraduationCap className="w-3.5 h-3.5" /></span> ระดับชั้น
                </p>
                <div className="grid grid-cols-6 gap-1.5">
                  {ALL_GRADES.map((g) => {
                    const on = grade === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setGrade(g)}
                        className={cn(
                          'btn-jelly py-2 rounded-xl border-2 font-display text-sm',
                          on
                            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 border-white/40 text-white shadow-[0_3px_0_0_rgba(76,29,149,0.5)]'
                            : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-300'
                        )}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* เรื่อง */}
              <label className="block">
                <span className="mb-2 flex items-center gap-1.5 font-display text-sm text-gray-800 dark:text-gray-100">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-400 to-fuchsia-500 text-white flex items-center justify-center"><Tag className="w-3.5 h-3.5" /></span> เรื่อง
                </span>
                <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={120} placeholder="เช่น เศษส่วน, ไวยากรณ์ Tense" className={inputCls} />
              </label>

              {/* ไอเดีย */}
              <label className="block">
                <span className="mb-2 flex items-center gap-1.5 font-display text-sm text-gray-800 dark:text-gray-100">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-300 to-orange-500 text-white flex items-center justify-center"><Lightbulb className="w-3.5 h-3.5" /></span> ไอเดียของคุณ
                </span>
                <textarea value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={2000} rows={5} placeholder="อยากให้เกมเป็นแบบไหน เล่นอย่างไร มีตัวละครอะไร" className={cn(inputCls, 'resize-none')} />
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <span className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all" style={{ width: `${Math.min(100, (idea.length / 2000) * 100)}%` }} />
                  </span>
                  <span className="text-xs tabular-nums text-gray-400">{idea.length}/2000</span>
                </span>
              </label>

              <button
                type="submit"
                disabled={busy}
                className="btn-primary-grad btn-jelly relative overflow-hidden w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl font-display text-lg disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} {busy ? 'กำลังส่ง...' : 'ส่งไอเดีย'}
              </button>
              <p className="text-center text-xs text-gray-400">ทีมงานจะอ่านทุกไอเดีย ขอบคุณที่ช่วยกันคิด</p>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
