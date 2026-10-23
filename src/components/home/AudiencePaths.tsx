'use client';

import React from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Crown, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { hasMembership } from '@/lib/membership';
import { PLANS, WELCOME_HOURS, WELCOME_PCT, quote } from '@/lib/plans';
import { FREE_DESIGN_LIMIT, FREE_SET_LIMIT } from '@/lib/game-creator/quota';
import { ANIMAL_PRESETS } from '@/lib/studio/char';
import { CharArt } from '@/components/studio/CharArt';
import { Buddy } from '@/components/companion/Buddy';
import { JoinButton } from '@/components/membership/JoinButton';
import { useMembership } from '@/components/membership/MembershipProvider';
import { useTried, type Audience } from './audience';

interface Mission {
  id: string;
  title: string;
  desc: string;
  href?: string;
  act?: () => void;
}

const INK = 'border-[#2a2350] text-[#2a2350]';
const teacherLook = ANIMAL_PRESETS.find((p) => p.id === 'dogTeacher')?.look ?? ANIMAL_PRESETS[0].look;

/**
 * เส้นทางของแต่ละกลุ่ม: เลือก "ผู้ปกครอง" หรือ "คุณครู" แล้วได้ภารกิจลองใช้ที่ตรงกับตัวเอง + เหตุผลที่สมาชิกคุ้ม
 * ตัวเลขทุกตัวมาจากค่าคงที่ของระบบ (ห้ามใส่ตัวเลขสมมติ)
 */
export function AudiencePaths({
  audience,
  onPick,
  onLibrary,
  onDaily,
  className = '',
}: {
  audience: Audience | null;
  onPick: (a: Audience) => void;
  onLibrary: () => void;
  onDaily: () => void;
  className?: string;
}) {
  const { user, profile } = useAuth();
  const { ready, offer } = useMembership();
  const [tried, mark] = useTried();
  const member = hasMembership(profile);

  const missions: Record<Audience, Mission[]> = {
    parent: [
      { id: 'p-daily', title: 'ให้ลูกเล่นเกมประจำวัน', desc: 'เกมใหม่ทุกวัน ใช้เวลาไม่กี่นาที', act: onDaily },
      { id: 'p-grade', title: 'เลือกเกมตามชั้นของลูก', desc: 'กรองตามวิชาและชั้น ป.1 - ป.6', act: onLibrary },
      { id: 'p-buddy', title: 'พบคู่หูของลูก', desc: 'เล่นแล้วได้ดาว คู่หูโตขึ้นเรื่อยๆ', href: '/buddy' },
      { id: 'p-sheet', title: 'ทำใบงานให้ลูกฝึกที่บ้าน', desc: 'ใช้ตัวช่วยสร้างใบงานแยกวิชาในระบบสร้างสื่อ', href: '/studio' },
    ],
    teacher: [
      { id: 't-quiz', title: 'สร้างชุดคำถามชุดแรก', desc: 'ใส่รูปและสูตรคณิตได้ ใช้ซ้ำได้ทั้งปี', href: '/create' },
      { id: 't-live', title: 'เปิดเกมเล่นสดทั้งห้อง', desc: 'นักเรียนเข้าห้องด้วยเลข 6 หลัก บนมือถือหรือแท็บเล็ต', href: '/create?tab=library' },
      { id: 't-sheet', title: 'เปลี่ยนชุดคำถามเป็นใบงาน', desc: 'กดปุ่มใบงานที่การ์ดชุดคำถาม ได้ใบงานพร้อมเฉลย', href: '/create?tab=library' },
      { id: 't-studio', title: 'ออกแบบสื่อด้วยตัวช่วยแยกวิชา', desc: 'ตัวละครคนและสัตว์ แป้นลัดแบบ Canva', href: '/studio' },
    ],
  };

  const grown = PLANS.find((p) => p.id === 'grown')!;
  const q = quote(grown, offer);
  const perDay = (q.amount / grown.days).toFixed(2).replace(/\.?0+$/, '');
  const perks: Record<Audience, string[]> = {
    parent: ['เล่นเกมเต็มทุกเกมในคลัง (บัญชีฟรีได้ทดลองเล่น)', 'ครอบคลุม ป.1 - ป.6 แยกวิชาและชั้น', 'ไม่มีโฆษณา ไม่มีแชท ปลอดภัยสำหรับเด็ก', 'สร้างใบงานให้ลูกฝึกที่บ้านได้ไม่จำกัด'],
    teacher: [
      `สร้างชุดคำถามได้ไม่จำกัด (บัญชีฟรี ${FREE_SET_LIMIT} ชุด)`,
      `สร้างสื่อการสอนได้ไม่จำกัด (บัญชีฟรี ${FREE_DESIGN_LIMIT} ชิ้น)`,
      'ใช้และทำสำเนางานของครูท่านอื่นใน Discover',
      'เปิดห้องเล่นสดได้ทุกชุดคำถาม',
    ],
  };

  return (
    <section className={className} aria-labelledby="aud-title">
      <div className="text-center">
        <h2 id="aud-title" className="font-display text-2xl sm:text-3xl text-gray-900 dark:text-white">
          คุณมาที่นี่เพื่อ...
        </h2>
        <p className="mt-1 text-sm sm:text-base font-semibold text-gray-500 dark:text-gray-400">เลือกแล้วเราจะพาไปลองสิ่งที่ตรงกับคุณที่สุด</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 max-w-3xl mx-auto">
        {(
          [
            { id: 'parent', title: 'ผู้ปกครอง', sub: 'อยากให้ลูกเรียนสนุก', bg: 'from-sky-200 to-emerald-200', art: <Buddy stage={2} color="sun" size={92} /> },
            { id: 'teacher', title: 'คุณครู', sub: 'หาสื่อและสร้างสื่อการสอน', bg: 'from-violet-200 to-pink-200', art: <CharArt look={teacherLook} className="w-[72px] h-[108px]" /> },
          ] as const
        ).map((c) => {
          const on = audience === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              aria-pressed={on}
              className={`group relative overflow-hidden flex flex-col sm:flex-row items-center gap-1 sm:gap-4 p-3 sm:p-4 rounded-3xl border-[3px] ${INK} bg-gradient-to-br ${c.bg} text-center sm:text-left transition-all duration-300 ${
                on ? 'shadow-[0_6px_0_#2a2350] -translate-y-1 ring-4 ring-amber-300' : audience ? 'opacity-70 hover:opacity-100 shadow-[0_3px_0_#2a2350]' : 'shadow-[0_5px_0_#2a2350] hover:-translate-y-1'
              }`}
            >
              <span className="shrink-0 h-[84px] sm:h-auto w-[72px] sm:w-[96px] flex items-end justify-center group-hover:scale-105 transition-transform [&>svg]:max-w-full [&>svg]:max-h-full">{c.art}</span>
              <span className="min-w-0">
                <span className="block text-[11px] sm:text-xs font-extrabold opacity-70">ฉันเป็น</span>
                <span className="block font-display text-lg sm:text-2xl leading-tight">{c.title}</span>
                <span className="block text-xs sm:text-sm font-semibold opacity-80 leading-snug">{c.sub}</span>
              </span>
              {on && (
                <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#2a2350] text-white flex items-center justify-center">
                  <Check className="w-4 h-4" strokeWidth={3.5} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {audience && (
        <div key={audience} className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_1fr] animate-fade-in">
          {/* ภารกิจลองใช้ */}
          {(() => {
            const list = missions[audience];
            const done = list.filter((m) => tried.has(m.id)).length;
            return (
              <div className={`rounded-3xl border-[3px] ${INK} bg-white dark:bg-gray-900 dark:text-white dark:border-indigo-400/40 shadow-[0_5px_0_#2a2350] p-4 sm:p-5`}>
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 border-2 border-[#2a2350] flex items-center justify-center text-[#2a2350]">
                    <Sparkles className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg sm:text-xl leading-tight">{audience === 'teacher' ? 'ลองใช้ให้ครบ ใน 10 นาที' : 'เริ่มให้ลูกเรียนสนุกวันนี้'}</h3>
                    <p className="text-xs sm:text-sm font-semibold opacity-70">
                      ลองแล้ว {done} จาก {list.length} อย่าง
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-3 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-[#2a2350] dark:border-indigo-400/40 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-700" style={{ width: `${(done / list.length) * 100}%` }} />
                </div>
                <ol className="mt-3 flex flex-col gap-2">
                  {list.map((m, k) => {
                    const ok = tried.has(m.id);
                    const inner = (
                      <>
                        <span
                          className={`shrink-0 w-8 h-8 rounded-full border-2 border-[#2a2350] dark:border-indigo-300/60 flex items-center justify-center font-display text-sm ${ok ? 'bg-emerald-400 text-white' : 'bg-amber-100 text-[#2a2350]'}`}
                        >
                          {ok ? <Check className="w-4 h-4" strokeWidth={3.5} /> : k + 1}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`block font-bold text-sm sm:text-base leading-snug ${ok ? 'opacity-60' : ''}`}>{m.title}</span>
                          <span className="block text-xs sm:text-[13px] opacity-65 leading-snug">{m.desc}</span>
                        </span>
                        <ChevronRight className="w-5 h-5 shrink-0 opacity-50 group-hover:translate-x-1 transition-transform" />
                      </>
                    );
                    const cls = 'group w-full flex items-center gap-3 p-2.5 rounded-2xl text-left hover:bg-amber-50 dark:hover:bg-white/5 transition-colors';
                    return (
                      <li key={m.id}>
                        {m.href ? (
                          <Link href={m.href} className={cls} onClick={() => mark(m.id)}>
                            {inner}
                          </Link>
                        ) : (
                          <button type="button" className={cls} onClick={() => (mark(m.id), m.act?.())}>
                            {inner}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })()}

          {/* ความคุ้มของสมาชิก */}
          <div className={`relative overflow-hidden rounded-3xl border-[3px] ${INK} shadow-[0_5px_0_#2a2350] p-4 sm:p-5 bg-gradient-to-br from-[#fff3c4] to-[#ffd6ec]`}>
            <span aria-hidden="true" className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-white/40" />
            <div className="relative">
              <p className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border-2 border-[#2a2350] bg-white text-xs font-extrabold">
                <Crown className="w-3.5 h-3.5 text-orange-500" /> {member ? 'คุณเป็นสมาชิกแล้ว' : 'ทำไมสมาชิกถึงคุ้ม'}
              </p>
              {!member && (
                <div className="mt-2 flex items-end gap-2 flex-wrap">
                  <span className="font-display text-4xl sm:text-5xl leading-none">{perDay}</span>
                  <span className="font-bold mb-1">บาท / วัน</span>
                  <span className="mb-1 text-xs font-bold opacity-75">
                    (แพลน {grown.days} วัน {q.welcome ? <><s>{grown.price}</s> {q.amount}</> : grown.price} บาท)
                  </span>
                </div>
              )}
              <ul className="mt-3 flex flex-col gap-1.5">
                {perks[audience].map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm font-semibold leading-snug">
                    <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-emerald-400 border-2 border-[#2a2350] flex items-center justify-center text-white">
                      <Check className="w-3 h-3" strokeWidth={4} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
              {!member && (
                <div className="mt-4 flex flex-col gap-1.5">
                  {user ? (
                    <JoinButton className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl border-[3px] border-[#2a2350] bg-[#2a2350] text-white font-display shadow-[0_4px_0_#000] hover:-translate-y-0.5 active:translate-y-0.5 transition-transform">
                      <Crown className="w-4 h-4" /> {q.welcome ? `สมัครสมาชิก ลด ${WELCOME_PCT}%` : 'สมัครสมาชิก'}
                    </JoinButton>
                  ) : (
                    <Link
                      href="/signup"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl border-[3px] border-[#2a2350] bg-[#2a2350] text-white font-display shadow-[0_4px_0_#000] hover:-translate-y-0.5 active:translate-y-0.5 transition-transform"
                    >
                      สมัครบัญชีฟรี แล้วลองก่อน
                    </Link>
                  )}
                  {!user && ready && <p className="text-xs font-bold text-center opacity-75">สมัครแล้วรับส่วนลดสมาชิก {WELCOME_PCT}% ภายใน {WELCOME_HOURS} ชั่วโมงแรก</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
