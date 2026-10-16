'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Crown, FastForward } from 'lucide-react';
import { Avatar } from '../Avatar';
import type { Gear } from '@/lib/game-creator/gear';
import { gsfx } from '@/lib/game-creator/gsound';

export function Medal({ rank, size = 96 }: { rank: number; size?: number }) {
  const c = rank === 1 ? ['#ffd84a', '#f5a50f'] : rank === 2 ? ['#e8ecf5', '#a9b3c9'] : rank === 3 ? ['#ffc28a', '#d27a32'] : ['#e3d4ff', '#9b6cf0'];
  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2} aria-hidden="true">
      <path d="M30 0 L48 44 L36 50 L18 4 Z" fill="#ff6b7a" stroke="#2a2350" strokeWidth="4" strokeLinejoin="round" />
      <path d="M70 0 L52 44 L64 50 L82 4 Z" fill="#4a7bf0" stroke="#2a2350" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="50" cy="76" r="38" fill={c[1]} stroke="#2a2350" strokeWidth="5" />
      <circle cx="50" cy="76" r="28" fill={c[0]} stroke="#2a2350" strokeWidth="3" />
      <text x="50" y="88" textAnchor="middle" fontSize={rank > 99 ? 22 : rank > 9 ? 28 : 34} fontWeight="800" fill="#2a2350" fontFamily="var(--font-mitr), sans-serif">
        {rank}
      </text>
    </svg>
  );
}

export interface ShowEntry {
  id: string;
  nickname: string;
  avatar: number;
  gear?: Gear;
  /** ค่าที่โชว์ใต้ชื่อ เช่น คะแนน */
  value: string;
}

/** ลำดับเวลา (ms) */
const INTRO = 1500;
const STEP = 1900;
const SUSPENSE = 1900;
const FINALE = 2400;

/**
 * คัตซีนประกาศผล: โชว์ที่ 3 -> ที่ 2 -> (ลุ้น) ที่ 1 พร้อมแสงไฟ กลองรัว พลุ
 * มี 2 คน = ที่ 2 -> ที่ 1 / มีคนเดียว = ที่ 1 เลย
 */
export function PodiumShow({ top, meId, label, onDone, doneText = 'ไปต่อ' }: { top: ShowEntry[]; meId?: string; label?: string; onDone: () => void; doneText?: string }) {
  const n = Math.min(3, top.length);
  // ลำดับเปิดตัว: ท้ายสุดก่อน
  const order = useMemo(() => Array.from({ length: n }, (_, i) => n - 1 - i), [n]);
  const [shown, setShown] = useState(0); // เปิดไปแล้วกี่อันดับ
  const [suspense, setSuspense] = useState(false);
  const [intro, setIntro] = useState(true);
  const [finale, setFinale] = useState(false);
  const [ready, setReady] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!n) {
      doneRef.current();
      return;
    }
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    gsfx.drum();
    let t = INTRO;
    at(t, () => setIntro(false));
    order.forEach((place, k) => {
      if (place === 0) {
        // ก่อนเปิดที่ 1: ไฟดับ กลองรัวยาว
        if (k > 0) {
          at(t, () => {
            setSuspense(true);
            gsfx.drum();
            setTimeout(() => gsfx.drum(), 1100);
          });
          t += SUSPENSE;
        }
        at(t, () => {
          setSuspense(false);
          setShown(k + 1);
          setFinale(true);
          gsfx.reveal(1);
          setTimeout(() => gsfx.fanfare(), 350);
        });
        t += FINALE;
      } else {
        at(t, () => {
          setShown(k + 1);
          gsfx.reveal(place + 1);
        });
        t += STEP;
      }
    });
    at(t - 600, () => setReady(true));
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, [n, order]);

  const skip = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setIntro(false);
    setSuspense(false);
    setShown(n);
    setFinale(true);
    setReady(true);
  };

  const isShown = (place: number) => order.indexOf(place) < shown;
  const cols = n === 1 ? [0] : n === 2 ? [1, 0] : [1, 0, 2];

  return (
    <div className="l5g-show" data-suspense={suspense} data-finale={finale} role="dialog" aria-label="ประกาศผล">
      <div className="l5g-show-rays" aria-hidden="true" />
      <span className="l5g-show-beam l5g-show-beam-l" aria-hidden="true" />
      <span className="l5g-show-beam l5g-show-beam-r" aria-hidden="true" />
      {finale && <span className="l5g-show-flash" aria-hidden="true" />}
      {finale && <ShowConfetti />}

      <button type="button" className="l5g-show-skip" onClick={skip} hidden={ready}>
        <FastForward className="w-4 h-4" /> ข้าม
      </button>

      <div className="l5g-show-title" data-intro={intro}>
        {intro ? 'ประกาศผล!' : suspense ? 'และอันดับ 1 คือ...' : finale ? 'แชมป์ของห้อง!' : `อันดับที่ ${order[Math.max(0, shown - 1)] + 1}`}
      </div>

      <div className="l5g-show-stage" data-n={n}>
        {cols.map((place) => {
          const p = top[place];
          const on = isShown(place);
          const me = !!meId && p.id === meId;
          return (
            <div key={place} className="l5g-show-col" data-place={place + 1} data-on={on} data-me={me}>
              <div className="l5g-show-who">
                {on && (
                  <>
                    {place === 0 && <Crown className="l5g-show-crown" />}
                    <span className="l5g-show-av">
                      <Avatar id={p.avatar} gear={p.gear} size={place === 0 ? 132 : 104} mood="wow" wave={place === 0} />
                    </span>
                    <span className="l5g-show-name">
                      {me && <em>คุณ!</em>}
                      <b>{p.nickname}</b>
                    </span>
                    <span className="l5g-show-val">
                      {p.value}
                      {label && <small>{label}</small>}
                    </span>
                  </>
                )}
              </div>
              <div className="l5g-show-block">
                <Medal rank={place + 1} size={place === 0 ? 64 : 52} />
              </div>
            </div>
          );
        })}
      </div>

      {ready && (
        <button type="button" className="l5g-btn l5g-btn-go l5g-btn-xl l5g-show-next" onClick={() => (gsfx.tap(), onDone())}>
          {doneText} <ArrowRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

function ShowConfetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        x: Math.random() * 100,
        d: Math.random() * 1.2,
        dur: 2.2 + Math.random() * 1.8,
        r: Math.random() * 360,
        w: 6 + Math.random() * 8,
        c: ['#ff6b7a', '#4a7bf0', '#ffcf3f', '#3fd6a8', '#9b6cf0', '#ff9a3d'][i % 6],
      })),
    []
  );
  return (
    <div className="l5g-show-confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} style={{ left: `${b.x}%`, width: b.w, height: b.w * 0.55, animationDelay: `${b.d}s`, animationDuration: `${b.dur}s`, background: b.c, ['--r' as string]: `${b.r}deg` }} />
      ))}
    </div>
  );
}
