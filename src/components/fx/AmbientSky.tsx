'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BkkParts, EventKey, Phase, Season, bkkParts, eventOf, phaseOf, seasonOf } from '@/lib/companion';

const SKY: Record<Phase, string> = {
  dawn: 'linear-gradient(180deg, #ffb59a 0%, #ffd7bd 38%, #cfc3ff 78%, transparent 100%)',
  day: 'linear-gradient(180deg, #6fc3ff 0%, #b9e6ff 45%, #e6f6ff 85%, transparent 100%)',
  dusk: 'linear-gradient(180deg, #5b3fb0 0%, #c96bd9 40%, #ff8a5c 80%, transparent 100%)',
  night: 'linear-gradient(180deg, #070722 0%, #151552 50%, #2a2a78 90%, transparent 100%)',
};
// โหมดสว่างให้ท้องฟ้าจางลงเพื่อไม่กลบเนื้อหา โหมดมืดให้เข้มขึ้นตอนกลางคืน
const SKY_OPACITY: Record<Phase, string> = {
  dawn: 'opacity-60 dark:opacity-45',
  day: 'opacity-55 dark:opacity-40',
  dusk: 'opacity-60 dark:opacity-55',
  night: 'opacity-30 dark:opacity-85',
};

// ตำแหน่งดาวคงที่ (ไม่สุ่มใหม่ทุกครั้ง กัน hydration ไม่ตรง)
const STARS = Array.from({ length: 42 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 7) % 62,
  size: 2 + ((i * 7) % 3),
  delay: (i % 9) * 0.45,
}));
const SEED = (n: number, mod: number, off = 0) => ((n * 2654435761 + off) >>> 0) % mod;

function Cloud({ className, style, tone }: { className?: string; style?: React.CSSProperties; tone: string }) {
  return (
    <svg viewBox="0 0 120 60" className={className} style={style} aria-hidden="true">
      <g fill={tone}>
        <ellipse cx="38" cy="38" rx="30" ry="18" />
        <ellipse cx="68" cy="30" rx="30" ry="22" />
        <ellipse cx="92" cy="40" rx="24" ry="15" />
        <rect x="20" y="38" width="86" height="17" rx="8" />
      </g>
    </svg>
  );
}

function Sun({ hot }: { hot: boolean }) {
  return (
    <div className="relative" style={{ width: hot ? 150 : 110, height: hot ? 150 : 110 }}>
      <div className="absolute -inset-10 rounded-full" style={{ background: `radial-gradient(circle, rgb(255 214 94 / ${hot ? 0.75 : 0.5}), transparent 68%)` }} />
      <svg viewBox="0 0 100 100" className="sun-rays absolute inset-0 w-full h-full" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x="48" y="-4" width="4" height="14" rx="2" fill="#ffd25e" opacity="0.8" transform={`rotate(${i * 30} 50 50)`} />
        ))}
      </svg>
      <div className="absolute inset-[22%] rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #fff3b0, #ffc53a 70%)' }} />
    </div>
  );
}

function Moon() {
  return (
    <svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true">
      <defs>
        <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff8d8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff8d8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#moon-glow)" />
      <path d="M62 14a38 38 0 1 0 0 72 30 30 0 0 1 0-72z" fill="#fff6cf" />
      <circle cx="40" cy="42" r="5" fill="#f1e3a8" opacity="0.7" />
      <circle cx="48" cy="66" r="3.5" fill="#f1e3a8" opacity="0.7" />
    </svg>
  );
}

function Leaf({ hue }: { hue: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M12 2C6 6 4 12 6 20c8 0 14-6 12-16-2-1-4-2-6-2z" fill={hue} />
      <path d="M7 19c3-5 6-8 9-11" stroke="rgb(0 0 0 / .25)" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

function Balloon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 30 48" width="30" height="48" aria-hidden="true">
      <ellipse cx="15" cy="15" rx="12" ry="14" fill={color} />
      <ellipse cx="10" cy="10" rx="3" ry="4.5" fill="#fff" opacity="0.4" />
      <path d="M15 29l-3 4h6z" fill={color} />
      <path d="M15 33c-3 5 3 8 0 14" stroke="#9aa" strokeWidth="1" fill="none" />
    </svg>
  );
}

function Krathong() {
  return (
    <svg viewBox="0 0 70 50" width="70" height="50" aria-hidden="true">
      <ellipse cx="35" cy="42" rx="30" ry="6" fill="#2fd196" opacity="0.5" />
      <path d="M8 34c6 10 48 10 54 0l-6-8H14z" fill="#8a5a2b" />
      <path d="M18 26c4-8 8-14 17-18 9 4 13 10 17 18z" fill="#ff94cc" />
      <path d="M24 26c3-6 6-9 11-12 5 3 8 6 11 12z" fill="#ffd25e" />
      <rect x="34" y="6" width="2.4" height="12" fill="#fff" />
      <ellipse cx="35.2" cy="4.5" rx="3" ry="4.6" fill="#ffb02e" />
      <ellipse cx="35.2" cy="4.5" rx="6.5" ry="8" fill="#ffd25e" opacity="0.3" />
    </svg>
  );
}

function Lantern() {
  return (
    <div className="w-5 h-6 rounded-t-full rounded-b-md" style={{ background: 'radial-gradient(circle at 50% 70%, #fff2a8, #ffa53a)', boxShadow: '0 0 18px 5px rgb(255 190 70 / .55)' }} />
  );
}

const BALLOON_COLORS = ['#ff62b3', '#ffc53a', '#5ccbff', '#52e3ad', '#a285ff'];

interface Props {
  /** ใช้ทดสอบ: บังคับเวลา */
  at?: Date;
}

/**
 * ฉากหลังที่เปลี่ยนตามเวลา (รุ่งอรุณ/กลางวัน/เย็น/กลางคืน), ฤดูของไทย และวันสำคัญ
 * วาดด้วย SVG/CSS ล้วน ไม่ใช้รูปภาพ จึงเบาและคมทุกหน้าจอ
 */
export function AmbientSky({ at }: Props) {
  const [now, setNow] = useState<BkkParts | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    // โหมดพัฒนาเท่านั้น: ?sky=2026-04-14T20:00:00+07:00 เพื่อดูฉากเวลา/ฤดู/วันสำคัญอื่น
    let forced: Date | null = null;
    if (process.env.NODE_ENV !== 'production') {
      const q = new URLSearchParams(window.location.search).get('sky');
      if (q && !isNaN(Date.parse(q))) forced = new Date(q);
    }
    const tick = () => setNow(bkkParts(forced ?? at ?? new Date()));
    tick();
    const t = setInterval(tick, 60_000);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => {
      clearInterval(t);
      mq.removeEventListener('change', on);
    };
  }, [at]);

  const scene = useMemo(() => {
    if (!now) return null;
    const phase = phaseOf(now.hour);
    const season: Season = seasonOf(now.month);
    const event = eventOf(now);
    const hf = now.hour + now.minute / 60;
    // ดวงอาทิตย์ 6-18 น., ดวงจันทร์ 18-6 น.
    const sunP = Math.min(1, Math.max(0, (hf - 6) / 12));
    const moonP = ((hf - 18 + 24) % 24) / 12;
    const showers = season === 'rainy' && (now.day + now.hour) % 3 === 0;
    return { phase, season, event, sunP, moonP, showers };
  }, [now]);

  if (!scene) return null;
  const { phase, season, event, sunP, moonP, showers } = scene;
  const isNight = phase === 'night';
  const cloudTone = isNight ? 'rgba(180,190,255,.16)' : showers ? 'rgba(140,150,170,.7)' : 'rgba(255,255,255,.75)';
  const showStars = phase === 'night' || phase === 'dawn' || phase === 'dusk';
  const starOpacity = phase === 'night' ? 1 : 0.45;

  const pos = (p: number) => ({
    left: `${6 + p * 84}%`,
    top: `${21 - Math.sin(Math.PI * p) * 15}vh`,
  });

  return (
    <div className="sky-layer" aria-hidden="true">
      <div className={`sky-gradient ${SKY_OPACITY[phase]}`} style={{ background: SKY[phase] }} />
      {season === 'hot' && phase === 'day' && (
        <div className="absolute inset-0 opacity-30 dark:opacity-15" style={{ background: 'radial-gradient(60rem 30rem at 85% -5%, rgb(255 190 80 / .7), transparent 70%)' }} />
      )}

      {showStars &&
        STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white animate-twinkle"
            style={{ left: `${s.left}%`, top: `${s.top}vh`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, opacity: starOpacity }}
          />
        ))}

      {phase !== 'night' && (
        <div className="absolute transition-all duration-[3000ms]" style={pos(sunP)}>
          <Sun hot={season === 'hot'} />
        </div>
      )}
      {phase === 'night' && (
        <div className="absolute transition-all duration-[3000ms] opacity-80 dark:opacity-100" style={pos(Math.min(1, moonP))}>
          <Moon />
        </div>
      )}

      {!reduced && (
        <>
          {/* เมฆลอย */}
          {[0, 1, 2].map((i) => (
            <Cloud
              key={i}
              tone={cloudTone}
              className="fx-cloud"
              style={{ top: `${6 + i * 11}vh`, width: 150 + i * 44, animationDuration: `${95 + i * 40}s`, animationDelay: `-${i * 38}s`, opacity: isNight ? 0.9 : 1 }}
            />
          ))}

          {/* หิ่งห้อยตอนกลางคืน */}
          {isNight &&
            Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="fx-firefly" style={{ left: `${SEED(i, 92, 3) + 3}%`, top: `${44 + SEED(i, 40, 9)}vh`, animationDuration: `${6 + (i % 5) * 1.6}s`, animationDelay: `-${i * 0.9}s` }} />
            ))}

          {/* ฤดูฝน: ฝนโปรยเป็นช่วงๆ */}
          {showers &&
            Array.from({ length: 26 }).map((_, i) => (
              <span key={i} className="fx-rain" style={{ left: `${SEED(i, 105, 5)}%`, animationDuration: `${0.9 + (i % 5) * 0.18}s`, animationDelay: `-${(i % 7) * 0.3}s`, transform: 'rotate(8deg)' }} />
            ))}

          {/* ฤดูหนาว: ใบไม้ร่วง */}
          {season === 'cool' &&
            !event &&
            Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="fx-fall" style={{ left: `${SEED(i, 96, 7)}%`, animationDuration: `${16 + (i % 5) * 4}s`, animationDelay: `-${i * 2.6}s` }}>
                <Leaf hue={['#ff9a3d', '#ffc53a', '#e2603a'][i % 3]} />
              </span>
            ))}

          {/* วันสำคัญ */}
          {event && <EventLayer kind={event.key} />}
        </>
      )}
    </div>
  );
}

function EventLayer({ kind }: { kind: EventKey }) {
  const n = (count: number) => Array.from({ length: count }, (_, i) => i);
  switch (kind) {
    case 'songkran':
      return (
        <>
          {n(22).map((i) => (
            <span key={i} className="fx-fall" style={{ left: `${SEED(i, 98, 2)}%`, animationDuration: `${6 + (i % 5) * 1.5}s`, animationDelay: `-${i * 0.7}s` }}>
              <span className="block rounded-full" style={{ width: 8 + (i % 3) * 5, height: 8 + (i % 3) * 5, background: 'radial-gradient(circle at 30% 30%, #fff, #7fd0ff)', opacity: 0.85 }} />
            </span>
          ))}
        </>
      );
    case 'krathong':
      return (
        <>
          {n(3).map((i) => (
            <span key={i} className="fx-boat" style={{ animationDuration: `${70 + i * 18}s`, animationDelay: `-${i * 24}s` }}>
              <Krathong />
            </span>
          ))}
          {n(10).map((i) => (
            <span key={i} className="fx-rise" style={{ left: `${SEED(i, 92, 4) + 3}%`, animationDuration: `${22 + (i % 4) * 6}s`, animationDelay: `-${i * 3}s` }}>
              <Lantern />
            </span>
          ))}
        </>
      );
    case 'newyear':
      return (
        <>
          {n(18).map((i) => (
            <span key={i} className="fx-fall" style={{ left: `${SEED(i, 97, 6)}%`, animationDuration: `${8 + (i % 4) * 2}s`, animationDelay: `-${i * 1.1}s` }}>
              <span className="block animate-twinkle" style={{ width: 9, height: 9, background: ['#ffd25e', '#ff94cc', '#8cf0c8', '#bfa9ff'][i % 4], clipPath: 'polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)' }} />
            </span>
          ))}
        </>
      );
    case 'teacher':
    case 'children':
      return (
        <>
          {n(11).map((i) => (
            <span key={i} className="fx-rise" style={{ left: `${SEED(i, 92, 8) + 3}%`, animationDuration: `${18 + (i % 4) * 5}s`, animationDelay: `-${i * 2.4}s` }}>
              <Balloon color={BALLOON_COLORS[i % BALLOON_COLORS.length]} />
            </span>
          ))}
        </>
      );
    case 'mother':
    case 'father':
      return (
        <>
          {n(14).map((i) => (
            <span key={i} className="fx-fall" style={{ left: `${SEED(i, 96, 11)}%`, animationDuration: `${12 + (i % 5) * 3}s`, animationDelay: `-${i * 1.7}s` }}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z" fill={kind === 'mother' ? '#6ec6ff' : '#ffc53a'} opacity="0.85" />
              </svg>
            </span>
          ))}
        </>
      );
  }
}
