'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Gamepad2, Radio, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ALL_SUBJECTS, type MediaItem, type Subject } from '@/types/database';
import { NightSky } from '@/components/fx/NightSky';
import { ChoiceShape, choiceStyle } from '@/components/creator/ChoiceShape';
import { FiveG3D, type ShowPose } from '@/components/mascot/FiveG3D';
import { sfx } from '@/lib/sound';
import { StickerArt } from '@/components/studio/stickers';
import { RedeemBox } from './RedeemBox';
import s from './home-hero.module.css';

const SAY: Record<ShowPose, string> = {
  wave: 'สวัสดีครับคุณครู!',
  jump: 'วันนี้สร้างเกมอะไรดี',
  groove: 'ให้ AI ช่วยทำเกมได้นะ',
  dance: 'เปิดห้องเกมเล่นทั้งห้องเลย',
  spin: 'สื่อสวย ทำเสร็จไว',
  cheer: 'นักเรียนต้องชอบแน่!',
  tablet: 'ลองเลือกเกมจากคลังดูสิ',
};
/** สีฉากและสติกเกอร์ลอยบนฟ้า (คงที่ ไม่เปลี่ยนตามเดือนแล้ว) */
const C1 = '#7c5cf0';
const C2 = '#3fb8ff';
const SKY = ['h-school', 'sp-rocket', 'w-rainbow'];
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
}: {
  media: MediaItem[];
  isLoading: boolean;
  onPickSubject: (s: Subject) => void;
  onSelectMedia: (m: MediaItem) => void;
  onBrowseAll: () => void;
}) {
  const { user } = useAuth();
  const flags = [C1, '#fff8ec', C2, '#ffcf3f'];
  const [pose, setPose] = useState<ShowPose>('wave');
  // เลื่อนพ้นส่วนหัวแล้ว: หยุดแอนิเมชันตกแต่งทั้งหมดในส่วนนี้ (ธง ดาว เมฆ แถบภาพ) ไม่ให้กิน CPU/GPU
  const sec = useRef<HTMLElement>(null);
  const [off, setOff] = useState(false);
  useEffect(() => {
    const el = sec.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => setOff(!en.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const games = useMemo(() => media.filter((m) => m.icon_url && m.media_type !== 'วิดีโอ').slice(0, 16), [media]);
  // แถบต้องยาวกว่าจอเสมอ: ของน้อยก็วนซ้ำให้พอ แล้วต่อท้ายอีกชุดให้เลื่อนวนได้ไม่สะดุด
  const strip = useMemo(() => {
    if (!games.length) return [];
    const base: MediaItem[] = [];
    while (base.length < 10) base.push(...games);
    return [...base, ...base];
  }, [games]);
  const gameCount = media.filter((m) => m.media_type !== 'วิดีโอ').length;

  return (
    <section ref={sec} className={s.world} style={{ ['--s1' as string]: C1, ['--s2' as string]: C2 }} data-off={off || undefined} data-tour="hero" aria-label="สื่อการสอน 5G สำหรับคุณครู">
      <NightSky />
      <div className={s.sky} aria-hidden="true" data-hide="clean minimal">
        <div className={s.dots} />
        <span className={s.cloud} style={{ top: '14%', animationDelay: '-18s' }} />
        <span className={s.cloud} style={{ top: '38%', animationDelay: '-52s', ['--s' as string]: 0.7 }} />
        <span className={s.cloud} style={{ top: '6%', animationDelay: '-80s', ['--s' as string]: 0.55 }} />
        {SKY.map((id, i) => (
          <span key={id} className={s.seasonFloat} data-i={i} style={{ animationDelay: `${i * -1.6}s` }}>
            <StickerArt id={id} />
          </span>
        ))}
      </div>
      <div className={s.bunting} aria-hidden="true" data-hide="clean minimal">
        {Array.from({ length: 48 }).map((_, i) => (
          <i key={i} style={{ background: flags[i % flags.length], animationDelay: `${(i % 7) * 0.25}s` }} />
        ))}
      </div>

      <div className={s.inner}>
        {/* ---------- ข้อความ ---------- */}
        <div className={s.copy}>
          <span className={s.tagline}>
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> เว็บสำหรับคุณครู · สร้างเกม สื่อ ใบงาน ในที่เดียว
          </span>
          <h1 className={s.title}>
            <span className={s.line}>
              <Words text="ทุกเครื่องมือของครู" />
            </span>
            <span className={`${s.line} ${s.lineHi}`}>
              <Words text="ให้ AI ช่วยสร้างเกม" from={2} />
            </span>
          </h1>
          <p className={s.lead} data-hide="minimal">ให้ AI สร้างเกมตามวิชาและเนื้อหาของครู เปิดห้องเกมเล่นสดทั้งห้อง ทำสื่อและใบงาน พร้อมคลังเกมใช้สอนได้ทันที</p>

          <div className={s.ctas}>
            <Link href="/ai-game" className={`${s.btn} ${s.btnGo}`}>
              <Wand2 className="w-5 h-5" /> สร้างเกมด้วย AI
            </Link>
            <Link href="/create" className={s.btn}>
              <Radio className="w-5 h-5 text-rose-500" /> เปิดห้องเกมเล่นสด
            </Link>
            <button type="button" className={s.btn} onClick={onBrowseAll}>
              <Gamepad2 className="w-5 h-5 text-indigo-500" /> คลังเกม
            </button>
            {!user && (
              <Link href="/signup" className={`${s.btn} ${s.btnSoft}`}>
                สมัครบัญชีฟรี <ChevronRight className="w-4 h-4" strokeWidth={3} />
              </Link>
            )}
          </div>

          <RedeemBox />

          <div className={s.subjects} aria-label="เลือกวิชา" data-hide="minimal">
            {ALL_SUBJECTS.map((sub) => (
              <button key={sub} type="button" onClick={() => onPickSubject(sub)} className={s.subject} style={{ ['--c' as string]: SUBJECT_COLOR[sub] }}>
                <span className={s.subjectDot} />
                {sub}
              </button>
            ))}
            {gameCount > 0 && <span className={s.count}>คลังเกม {gameCount} เกม</span>}
          </div>
        </div>

        {/* ---------- เวทีน้องไฟว์จี ---------- */}
        <div className={s.stage} onClick={() => sfx.pop()} data-hide="minimal">
          <span className={s.halo} aria-hidden="true" />
          <span data-hide="clean" className="contents">
          {TOKENS.map((tk, k) => (
            <span key={k} className={s.token} style={{ left: tk.l, top: tk.t, background: choiceStyle(tk.i).color, animationDelay: tk.d }} aria-hidden="true">
              <ChoiceShape i={tk.i} size={22} />
            </span>
          ))}
          <Sparkles className={`${s.spark} left-[22%] top-[10%]`} aria-hidden="true" />
          <Sparkles className={`${s.spark} right-[16%] top-[34%] [animation-delay:-1.2s]`} aria-hidden="true" />
          </span>
          <FiveG3D onPose={setPose} className={s.mascot} label="น้องไฟว์จี มาสคอตของเว็บ แตะเพื่อเปลี่ยนท่า" />
          <span key={pose} className={s.bubble} role="status">
            {SAY[pose]}
          </span>
          <span className={s.hint}>แตะน้องไฟว์จีเพื่อเปลี่ยนท่า</span>
        </div>
      </div>

      {/* ---------- แถบภาพปกเกมเลื่อนผ่าน ---------- */}
      <div className={s.marquee} aria-label="เกมในคลัง" data-hide="minimal">
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
