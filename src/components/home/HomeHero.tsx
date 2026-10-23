'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Gamepad2, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ALL_SUBJECTS, type MediaItem, type Subject } from '@/types/database';
import { NightSky } from '@/components/fx/NightSky';
import { ChoiceShape, choiceStyle } from '@/components/creator/ChoiceShape';
import { FiveG3D, type ShowPose } from '@/components/mascot/FiveG3D';
import { sfx } from '@/lib/sound';
import { isVideoMedia } from '@/lib/youtube';
import s from './home-hero.module.css';

const SAY: Record<ShowPose, string> = {
  wave: 'สวัสดี! ไฟว์จีเองนะ',
  jump: 'มาเล่นเกมกันเถอะ!',
  groove: 'ฟังเพลงไป เรียนไป',
  dance: 'เรียนสนุกเหมือนเล่นเกม',
  spin: 'หมุนติ้ว ว้าว!',
  cheer: 'เก่งมาก ทำได้แล้ว!',
  tablet: 'วันนี้เล่นเกมอะไรดีนะ',
};
const FLAGS = ['#ff6b7a', '#ffcf3f', '#3fd6a8', '#4fb3ff', '#9b6cf0', '#ff9a3d'];
const SUBJECT_COLOR: Record<Subject, string> = { คณิตศาสตร์: '#3fd6a8', วิทยาศาสตร์: '#4fb3ff', ภาษาอังกฤษ: '#ffcf3f' };
const TOKENS = [
  { l: '6%', t: '22%', i: 0, d: '0s' },
  { l: '88%', t: '16%', i: 1, d: '-2s' },
  { l: '80%', t: '58%', i: 2, d: '-4s' },
  { l: '12%', t: '62%', i: 3, d: '-1s' },
];

/** หัวข้อทีละคำ (คำค่อยๆ ลอยขึ้นต่อกัน) */
function Words({ text, from = 0 }: { text: string; from?: number }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <span key={i} className={s.word} style={{ animationDelay: `${(from + i) * 90}ms` }}>
          {w}
          {' '}
        </span>
      ))}
    </>
  );
}

/**
 * ส่วนหัวหน้าหลัก: ฉากท้องฟ้า (กลางคืนในโหมดมืด) + น้องไฟว์จี 3D ทำท่าวนไปเรื่อยๆ + แถบภาพปกเกมจริงเลื่อนผ่าน
 */
export function HomeHero({
  media,
  isLoading,
  onPickSubject,
  onSelectMedia,
  onBrowseAll,
  onDaily,
}: {
  media: MediaItem[];
  isLoading: boolean;
  onPickSubject: (s: Subject) => void;
  onSelectMedia: (m: MediaItem) => void;
  onBrowseAll: () => void;
  onDaily: () => void;
}) {
  const { user } = useAuth();
  const [pose, setPose] = useState<ShowPose>('wave');

  const games = useMemo(() => media.filter((m) => m.icon_url && !isVideoMedia(m)).slice(0, 16), [media]);
  // แถบต้องยาวกว่าจอเสมอ: ของน้อยก็วนซ้ำให้พอ แล้วต่อท้ายอีกชุดให้เลื่อนวนได้ไม่สะดุด
  const strip = useMemo(() => {
    if (!games.length) return [];
    const base: MediaItem[] = [];
    while (base.length < 10) base.push(...games);
    return [...base, ...base];
  }, [games]);
  const gameCount = media.filter((m) => !isVideoMedia(m)).length;

  return (
    <section className={s.world} data-tour="hero" aria-label="ยินดีต้อนรับสู่สื่อการสอน 5G">
      <NightSky />
      <div className={s.sky} aria-hidden="true">
        <div className={s.dots} />
        <span className={s.cloud} style={{ top: '14%', animationDelay: '-18s' }} />
        <span className={s.cloud} style={{ top: '38%', animationDelay: '-52s', ['--s' as string]: 0.7 }} />
        <span className={s.cloud} style={{ top: '6%', animationDelay: '-80s', ['--s' as string]: 0.55 }} />
      </div>
      <div className={s.bunting} aria-hidden="true">
        {Array.from({ length: 48 }).map((_, i) => (
          <i key={i} style={{ background: FLAGS[i % FLAGS.length], animationDelay: `${(i % 7) * 0.25}s` }} />
        ))}
      </div>

      <div className={s.inner}>
        {/* ---------- ข้อความ ---------- */}
        <div className={s.copy}>
          <span className={s.tagline}>
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> เกมการเรียนรู้ ป.1 - ป.6 · ไม่มีโฆษณา ไม่มีแชท
          </span>
          <h1 className={s.title}>
            <span className={s.line}>
              <Words text="เรียนสนุก เหมือนได้เล่นเกม" />
            </span>
            <span className={`${s.line} ${s.lineHi}`}>
              <Words text="ไปกับน้องไฟว์จี" from={3} />
            </span>
          </h1>
          <p className={s.lead}>ภารกิจผจญภัยที่ซ่อนบทเรียนไว้ในทุกด่าน เด็กเล่นได้เองทุกจอ คุณครูสร้างเกมและสื่อการสอนของตัวเองได้ด้วย</p>

          <div className={s.ctas}>
            <button type="button" className={`${s.btn} ${s.btnGo}`} onClick={onBrowseAll}>
              <Gamepad2 className="w-5 h-5" /> เริ่มเล่นเกม
            </button>
            <button type="button" className={s.btn} onClick={onDaily}>
              <Star className="w-5 h-5 text-amber-500" fill="currentColor" /> เกมประจำวัน
            </button>
            {!user && (
              <Link href="/signup" className={`${s.btn} ${s.btnSoft}`}>
                สมัครบัญชีฟรี <ChevronRight className="w-4 h-4" strokeWidth={3} />
              </Link>
            )}
          </div>

          <div className={s.subjects} aria-label="เลือกวิชา">
            {ALL_SUBJECTS.map((sub) => (
              <button key={sub} type="button" onClick={() => onPickSubject(sub)} className={s.subject} style={{ ['--c' as string]: SUBJECT_COLOR[sub] }}>
                <span className={s.subjectDot} />
                {sub}
              </button>
            ))}
            {gameCount > 0 && <span className={s.count}>มีเกมให้เล่น {gameCount} เกม</span>}
          </div>
        </div>

        {/* ---------- เวทีน้องไฟว์จี ---------- */}
        <div className={s.stage} onClick={() => sfx.pop()}>
          <span className={s.halo} aria-hidden="true" />
          {TOKENS.map((tk, k) => (
            <span key={k} className={s.token} style={{ left: tk.l, top: tk.t, background: choiceStyle(tk.i).color, animationDelay: tk.d }} aria-hidden="true">
              <ChoiceShape i={tk.i} size={22} />
            </span>
          ))}
          <Sparkles className={`${s.spark} left-[22%] top-[10%]`} aria-hidden="true" />
          <Sparkles className={`${s.spark} right-[16%] top-[34%] [animation-delay:-1.2s]`} aria-hidden="true" />
          <FiveG3D onPose={setPose} className={s.mascot} label="น้องไฟว์จี มาสคอตของเว็บ แตะเพื่อเปลี่ยนท่า" />
          <span key={pose} className={s.bubble} role="status">
            {SAY[pose]}
          </span>
          <span className={s.hint}>แตะน้องไฟว์จีเพื่อเปลี่ยนท่า</span>
        </div>
      </div>

      {/* ---------- แถบภาพปกเกมเลื่อนผ่าน ---------- */}
      <div className={s.marquee} aria-label="เกมในคลัง">
        <div className={s.track} style={{ ['--dur' as string]: `${Math.max(30, strip.length * 2.6)}s` }}>
          {isLoading && !strip.length
            ? Array.from({ length: 14 }).map((_, i) => <span key={i} className={`${s.card} ${s.skeleton}`} style={{ ['--r' as string]: `${i % 2 ? 4 : -3}deg` }} />)
            : strip.map((m, i) => (
                <button
                  key={`${m.id}-${i}`}
                  type="button"
                  className={s.card}
                  style={{ ['--r' as string]: `${i % 2 ? 4 : -3}deg` }}
                  onClick={() => onSelectMedia(m)}
                  tabIndex={i < strip.length / 2 ? 0 : -1}
                  aria-hidden={i >= strip.length / 2}
                  title={m.title}
                >
                  <img src={m.icon_url} alt="" loading="lazy" draggable={false} />
                  <span className={s.cardTitle}>{m.title}</span>
                </button>
              ))}
        </div>
      </div>

      <svg className={s.ground} viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 58 C 220 10 420 92 660 52 C 900 14 1080 86 1290 46 C 1360 34 1410 40 1440 44 L1440 120 L0 120 Z" className={s.hillBack} />
        <path d="M0 92 C 240 58 460 116 700 86 C 940 58 1140 110 1440 80 L1440 120 L0 120 Z" className={s.hillFront} />
      </svg>
    </section>
  );
}
