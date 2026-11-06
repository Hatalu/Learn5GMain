'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { StickerArt } from '@/components/studio/stickers';
import { Buddy } from '@/components/companion/Buddy';
import { StarIcon } from '@/components/companion/Stars';
import { recordAnswer } from '@/lib/companion-store';
import { balloonQ, PUZZLE_LEVELS, type PuzzleLevel, type PuzzleQ } from '@/lib/pet/puzzle';
import { shuffled } from '@/lib/pet/missions';
import { sfx } from '@/lib/sound';
import { gsfx } from '@/lib/game-creator/gsound';
import { getGfx } from '@/lib/gfx';

export type GameKind = 'balloon' | 'catch' | 'match';
interface GameProps {
  onClose: () => void;
  /** จบรอบ (นับภารกิจ + หลอดสนุก) */
  onDone: (kind: GameKind) => void;
  look: { stage: number; color: string; species: string; wear: { hat?: string; face?: string; body?: string; back?: string }; grow?: number; weight?: number; tired?: number };
}

function Shell({ title, onClose, children, score, over }: { title: string; onClose: () => void; children: React.ReactNode; score?: React.ReactNode; over?: boolean }) {
  return (
    <div className="pr-game" role="dialog" aria-label={title} data-over={over || undefined}>
      <div className="pr-game-top">
        <button type="button" className="pr-icon-btn" onClick={onClose} aria-label="ออกจากเกม"><X className="w-5 h-5" /></button>
        <b>{title}</b>
        <span className="pr-game-score">{score}</span>
      </div>
      {children}
    </div>
  );
}

function Finish({ line, sub, stars, onAgain, onClose }: { line: string; sub: string; stars: number; onAgain: () => void; onClose: () => void }) {
  return (
    <div className="pr-game-end">
      {getGfx() !== 'lite' && (
        <div className="pr-confetti" aria-hidden="true">
          {Array.from({ length: 26 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, background: ['#ffc53a', '#ff6f91', '#5ab0ff', '#5fd38d', '#a98bff'][i % 5], animationDelay: `${(i % 9) * 0.09}s` }} />)}
        </div>
      )}
      <div className="pr-pop-card">
        <div className="pr-end-stars" role="img" aria-label={`${stars} จาก 3 ดาว`}>
          {[1, 2, 3].map((n) => <span key={n} data-on={n <= stars || undefined} style={{ animationDelay: `${n * 0.14}s` }}><StarIcon className="w-10 h-10" /></span>)}
        </div>
        <h3>{line}</h3>
        <p>{sub}</p>
        <div className="pr-row">
          <button type="button" className="pr-btn pr-btn-ghost" onClick={onClose}>กลับห้อง</button>
          <button type="button" className="pr-btn" onClick={onAgain}><RotateCcw className="w-4 h-4" /> เล่นอีก</button>
        </div>
      </div>
    </div>
  );
}

const LV_KEY = 'l5g_puzzle_lv';
export function savedLevel(): PuzzleLevel | null {
  try {
    const v = Number(localStorage.getItem(LV_KEY));
    return v === 1 || v === 2 || v === 3 ? v : null;
  } catch {
    return null;
  }
}
export function saveLevel(lv: PuzzleLevel) {
  try {
    localStorage.setItem(LV_KEY, String(lv));
  } catch {
    /* ไม่บันทึกก็เล่นได้ */
  }
}

/** ตราถูก/ผิดเด้งบนการ์ดคำถาม ใช้ทั้งลูกโป่งและปริศนา */
export function AnswerStamp({ kind }: { kind: 'ok' | 'no' }) {
  return (
    <span className="pr-stamp" data-kind={kind} role="status">
      {kind === 'ok' ? <Check className="w-6 h-6" strokeWidth={4} /> : <X className="w-6 h-6" strokeWidth={4} />}
      {kind === 'ok' ? 'ถูกต้อง' : 'ยังไม่ใช่'}
    </span>
  );
}

/* ------------------------------ ลูกโป่งคำตอบ ------------------------------ */
const ROUND_Q = 6;
const BALLOON_COLORS = ['#ff6f91', '#5ab0ff', '#ffc53a', '#5fd38d'];

export function BalloonGame({ onClose, onDone }: GameProps) {
  const [lv, setLv] = useState<PuzzleLevel | null>(() => savedLevel());
  const [n, setN] = useState(0);
  const [got, setGot] = useState(0);
  const [stars, setStars] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [popped, setPopped] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [result, setResult] = useState<'ok' | 'no' | null>(null);
  const [gained, setGained] = useState(0);
  const [streak, setStreak] = useState(0);
  const [firsts, setFirsts] = useState(0);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seed = useRef(Date.now());
  const firstTry = useRef(true);
  const q: PuzzleQ | null = useMemo(() => {
    if (!lv) return null;
    let a = seed.current + n * 7919;
    const r = () => {
      a = (a * 1664525 + 1013904223) >>> 0;
      return a / 4294967296;
    };
    return balloonQ(r, lv);
  }, [lv, n]);

  const pick = (c: string) => {
    if (!q || popped) return;
    if (c === q.answer) {
      setPopped(c);
      setResult('ok');
      sfx.pop();
      gsfx.correct();
      const gain = recordAnswer(true, q.subj);
      setGained(gain);
      setStars((s) => s + gain);
      setGot((g) => g + 1);
      if (firstTry.current) setFirsts((v) => v + 1);
      setStreak((v) => (firstTry.current ? v + 1 : 0));
      setTimeout(() => {
        setPopped(null);
        setResult(null);
        setWrong([]);
        setHint(false);
        firstTry.current = true;
        const next = n + 1;
        setN(next);
        if (next === ROUND_Q) onDone('balloon');
      }, 950);
    } else {
      gsfx.wrong();
      if (firstTry.current) recordAnswer(false, q.subj);
      firstTry.current = false;
      setWrong((w) => [...w, c]);
      setHint(true);
      setStreak(0);
      setResult('no');
      if (resultTimer.current) clearTimeout(resultTimer.current);
      resultTimer.current = setTimeout(() => setResult(null), 900);
    }
  };

  if (!lv) {
    return (
      <Shell title="ลูกโป่งคำตอบ" onClose={onClose}>
        <LevelPick onPick={(l) => { saveLevel(l); setLv(l); }} />
      </Shell>
    );
  }
  if (n >= ROUND_Q) {
    return (
      <Shell title="ลูกโป่งคำตอบ" onClose={onClose} over>
        <Finish line={`ยิงถูก ${got} ลูก`} sub={stars ? `ได้ดาว ${stars} ดวง` : 'วันนี้เก็บดาวจากการตอบครบแล้ว'} stars={firsts >= ROUND_Q ? 3 : firsts >= ROUND_Q - 2 ? 2 : 1} onClose={onClose} onAgain={() => { seed.current = Date.now(); setN(0); setGot(0); setStars(0); setFirsts(0); setStreak(0); }} />
      </Shell>
    );
  }
  return (
    <Shell title="ลูกโป่งคำตอบ" onClose={onClose} score={<><StarIcon className="w-5 h-5" /> {stars}</>}>
      <div className="pr-q-card" data-result={result || undefined}>
        {result && <AnswerStamp key={result + wrong.length} kind={result} />}
        <small>{q!.tag} · ข้อ {n + 1}/{ROUND_Q}{streak >= 2 ? ` · ถูกติดกัน ${streak}` : ''}</small>
        <strong>{q!.prompt}</strong>
        {hint && <em>{q!.hint}</em>}
      </div>
      <div className="pr-balloons">
        {q!.choices.map((c, i) => (
          <button
            key={`${n}-${c}`}
            type="button"
            disabled={wrong.includes(c)}
            onClick={() => pick(c)}
            data-pop={popped === c || undefined}
            data-fail={wrong.includes(c) || undefined}
            className="pr-balloon"
            style={{ '--c': BALLOON_COLORS[i % 4], animationDelay: `${i * -0.7}s` } as React.CSSProperties}
          >
            <span className="pr-balloon-face"><b>{c}</b></span>
            {popped === c && (
              <span className="pr-burst" aria-hidden="true">
                {Array.from({ length: 14 }, (_, k) => <i key={k} style={{ '--a': `${(k * 360) / 14}deg`, '--d': `${k % 2 ? 78 : 104}px` } as React.CSSProperties} />)}
                {gained > 0 && <em><StarIcon className="w-6 h-6" /> +{gained}</em>}
              </span>
            )}
          </button>
        ))}
      </div>
    </Shell>
  );
}

export function LevelPick({ onPick }: { onPick: (l: PuzzleLevel) => void }) {
  return (
    <div className="pr-levels">
      <p>เลือกระดับของเธอ</p>
      {PUZZLE_LEVELS.map((l) => (
        <button key={l.id} type="button" className="pr-btn pr-level" onClick={() => onPick(l.id)}>
          <b>{l.label}</b>
          <small>{l.sub}</small>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ รับผลไม้ ------------------------------ */
const GOOD = ['f-banana', 'f-orange', 'f-watermelon', 'f-carrot', 'f-grapes', 'f-broccoli', 'f-strawberry', 'f-corn'];
const SWEET = ['f-donut', 'f-lollipop', 'f-icecream', 'f-cupcake'];
const CATCH_SECS = 30;
const FEVER_AT = 8;
const FEVER_SECS = 6;
const POWER_SECS = 5;
let fallId = 1;
type FallKind = 'good' | 'sweet' | 'gold' | 'magnet' | 'slow';
const FALL_ART: Partial<Record<FallKind, string>> = { gold: 'sp-starface', magnet: 's-magnet', slow: 'clock' };
const SPARK = ['#ffc53a', '#ff6f91', '#5ab0ff', '#5fd38d', '#a98bff'];
interface Fall { id: number; x0: number; x: number; y: number; v: number; art: string; kind: FallKind; el: HTMLDivElement | null }

/** ป้ายลอยและเศษประกาย สร้างตรงๆ ใน DOM ไม่ทำให้เกมวาดใหม่ */
function fxPop(box: HTMLElement | null, xPct: number, yPct: number, text: string, color: string, sparks = 8) {
  if (!box) return;
  const add = (cls: string, css: Record<string, string>, txt = '') => {
    const el = document.createElement('span');
    el.className = cls;
    el.textContent = txt;
    el.style.left = `${xPct}%`;
    el.style.top = `${yPct}%`;
    for (const [k, v] of Object.entries(css)) el.style.setProperty(k, v);
    box.appendChild(el);
    setTimeout(() => el.remove(), 800);
  };
  add('pr-pop-text', { '--c': color }, text);
  if (getGfx() === 'lite') return;
  for (let i = 0; i < sparks; i++) add('pr-spark', { '--a': `${(i * 360) / sparks}deg`, '--d': `${34 + (i % 3) * 16}px`, '--c': SPARK[i % SPARK.length] });
}

const bestOf = (k: string) => {
  try {
    return Number(localStorage.getItem(k)) || 0;
  } catch {
    return 0;
  }
};
const saveBest = (k: string, v: number) => {
  try {
    localStorage.setItem(k, String(v));
  } catch {
    /* ไม่บันทึกก็เล่นได้ */
  }
};

export function CatchGame({ onClose, onDone, look }: GameProps) {
  const box = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [count, setCount] = useState(3);
  const [over, setOver] = useState(false);
  const [combo, setCombo] = useState(0);
  const [fever, setFever] = useState(false);
  const [power, setPower] = useState<'magnet' | 'slow' | null>(null);
  const [sad, setSad] = useState(false);
  const [best, setBest] = useState(0);
  const [isNew, setIsNew] = useState(false);
  const [, force] = useState(0);
  const falls = useRef<Fall[]>([]);
  const heroX = useRef(0.5);
  const overRef = useRef(false);
  const lastX = useRef(0.5);
  const scoreRef = useRef(0);

  useEffect(() => {
    scoreRef.current = 0;
    setScore(0);
    setCombo(0);
    setCount(3);
    setOver(false);
    setFever(false);
    setPower(null);
    setBest(bestOf('l5g_catch_best'));
    setIsNew(false);
    overRef.current = false;
    falls.current = [];
    force((f) => f + 1);

    let raf = 0;
    let last = performance.now();
    const t0 = last;
    let spawn = 0;
    let shown = 3;
    let run = 0;
    let streak = 0;
    let feverUntil = 0;
    let magnetUntil = 0;
    let slowUntil = 0;
    let sadTimer: ReturnType<typeof setTimeout> | null = null;

    const tick = (t: number) => {
      const real = Math.min(0.05, (t - last) / 1000);
      last = t;
      const pre = 3 - (t - t0) / 1000;
      if (pre > 0) {
        const c = Math.ceil(pre);
        if (c !== shown) {
          shown = c;
          setCount(c);
          sfx.pop();
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      if (shown !== 0) {
        shown = 0;
        setCount(0);
        sfx.sparkle();
      }
      run += real;
      if (bar.current) {
        bar.current.style.transform = `scaleX(${Math.max(0, 1 - run / CATCH_SECS)})`;
        bar.current.dataset.low = run > CATCH_SECS - 6 ? '1' : '';
      }
      if (run >= CATCH_SECS) {
        overRef.current = true;
        const b = bestOf('l5g_catch_best');
        if (scoreRef.current > b) {
          saveBest('l5g_catch_best', scoreRef.current);
          setIsNew(true);
        }
        setBest(Math.max(b, scoreRef.current));
        setOver(true);
        sfx.cheer();
        onDone('catch');
        return; // ไม่ขอเฟรมต่อ = เกมหยุดนิ่ง
      }
      const dt = run < slowUntil ? real * 0.5 : real;
      if (feverUntil && run > feverUntil) {
        feverUntil = 0;
        setFever(false);
      }
      if ((magnetUntil && run > magnetUntil) || (slowUntil && run > slowUntil)) {
        if (run > magnetUntil) magnetUntil = 0;
        if (run > slowUntil) slowUntil = 0;
        setPower(magnetUntil ? 'magnet' : slowUntil ? 'slow' : null);
      }
      spawn -= real;
      if (spawn <= 0) {
        spawn = Math.max(0.34, 0.85 - run * 0.016);
        const r = Math.random();
        const kind: FallKind = r < 0.04 ? 'gold' : r < 0.07 ? 'magnet' : r < 0.1 ? 'slow' : r < 0.32 ? 'sweet' : 'good';
        const pool = kind === 'sweet' ? SWEET : GOOD;
        const x0 = 0.08 + Math.random() * 0.84;
        falls.current.push({ id: fallId++, x0, x: x0, y: -0.1, v: 0.3 + run * 0.012 + Math.random() * 0.12, art: FALL_ART[kind] || pool[Math.floor(Math.random() * pool.length)], kind, el: null });
        force((f) => f + 1);
      }
      const h = box.current?.clientHeight || 1;
      const w = box.current?.clientWidth || 1;
      let changed = false;
      falls.current = falls.current.filter((f) => {
        f.y += f.v * dt;
        if (run < magnetUntil && f.kind !== 'sweet' && f.y > 0.2) f.x += (heroX.current - f.x) * Math.min(1, dt * 4);
        if (f.el) f.el.style.transform = `translate3d(${(f.x - f.x0) * w}px, ${f.y * h}px, 0)`;
        if (f.y > 0.76 && f.y < 0.96 && Math.abs(f.x - heroX.current) < 0.13) {
          const x = f.x * 100;
          const y = f.y * 100;
          if (f.kind === 'sweet') {
            scoreRef.current = Math.max(0, scoreRef.current - 1);
            streak = 0;
            setCombo(0);
            setSad(true);
            if (sadTimer) clearTimeout(sadTimer);
            sadTimer = setTimeout(() => setSad(false), 700);
            gsfx.wrong();
            box.current?.animate?.([{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 220 });
            fxPop(box.current, x, y, 'หวานไป', '#d9456f', 0);
          } else if (f.kind === 'magnet' || f.kind === 'slow') {
            if (f.kind === 'magnet') magnetUntil = run + POWER_SECS;
            else slowUntil = run + POWER_SECS;
            setPower(f.kind);
            sfx.sparkle();
            fxPop(box.current, x, y, f.kind === 'magnet' ? 'แม่เหล็ก' : 'เวลาช้าลง', '#6d4fe0', 12);
          } else {
            streak++;
            if (streak === FEVER_AT || (streak > FEVER_AT && streak % FEVER_AT === 0)) {
              feverUntil = run + FEVER_SECS;
              setFever(true);
              sfx.cheer();
            }
            const gain = (f.kind === 'gold' ? 3 : 1) * (feverUntil ? 2 : 1);
            scoreRef.current += gain;
            setCombo(streak);
            sfx.pop();
            fxPop(box.current, x, y, `+${gain}`, f.kind === 'gold' ? '#d48a00' : '#1f9d63', f.kind === 'gold' ? 14 : 8);
            hero.current?.animate?.([{ transform: 'scale(1,1)' }, { transform: 'scale(1.14,.86)' }, { transform: 'scale(.94,1.08)' }, { transform: 'scale(1,1)' }], { duration: 240 });
          }
          setScore(scoreRef.current);
          changed = true;
          return false;
        }
        if (f.y > 1.05) {
          if (f.kind === 'good' && streak) {
            streak = 0;
            setCombo(0);
          }
          changed = true;
          return false;
        }
        return true;
      });
      if (changed) force((f) => f + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (sadTimer) clearTimeout(sadTimer);
    };
    // onDone คงที่ต่อรอบ เริ่มใหม่เมื่อ round เปลี่ยนเท่านั้น
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const move = (e: React.PointerEvent) => {
    if (overRef.current) return; // จบเกมแล้วตัวละครต้องหยุด
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.max(0.08, Math.min(0.92, (e.clientX - r.left) / r.width));
    heroX.current = x;
    if (hero.current) {
      hero.current.style.left = `${x * 100}%`;
      hero.current.style.rotate = `${Math.max(-14, Math.min(14, (x - lastX.current) * 260))}deg`;
    }
    lastX.current = x;
  };

  const stars = score >= 32 ? 3 : score >= 18 ? 2 : 1;
  return (
    <Shell title="รับผักผลไม้" onClose={onClose} over={over} score={<>{score} ชิ้น</>}>
      <div className="pr-timebar" aria-hidden="true"><i ref={bar} /></div>
      <div ref={box} className="pr-catch" data-fever={fever || undefined} data-over={over || undefined} onPointerMove={move} onPointerDown={move}>
        <span className="pr-sky-sun" aria-hidden="true" />
        <span className="pr-sky-cloud" aria-hidden="true" />
        <span className="pr-sky-cloud pr-sky-cloud-2" aria-hidden="true" />
        <span className="pr-sky-hill" aria-hidden="true" />
        <p className="pr-catch-tip">{fever ? 'คะแนนสองเท่า!' : power === 'magnet' ? 'แม่เหล็กดูดผลไม้' : power === 'slow' ? 'ของตกช้าลง' : 'รับผักผลไม้ หลบขนมหวาน'}</p>
        {combo >= 3 && !over && <b key={combo} className="pr-combo">ต่อเนื่อง {combo}</b>}
        {falls.current.map((f) => (
          <div key={f.id} ref={(el) => { f.el = el; }} className="pr-fall" data-kind={f.kind} style={{ left: `${f.x0 * 100}%` }}>
            <span><StickerArt id={f.art} /></span>
          </div>
        ))}
        <div ref={hero} className="pr-catch-hero" style={{ left: '50%' }}>
          <Buddy {...look} size={92} animate={false} asleep={false} expr={sad ? 'sad' : 'happy'} />
        </div>
        {count > 0 && !over && <b key={count} className="pr-count" aria-live="polite">{count}</b>}
        {over && <Finish line={`รับได้ ${score} ชิ้น`} sub={isNew ? 'สถิติใหม่ของเธอ!' : `สถิติสูงสุด ${best} ชิ้น`} stars={stars} onClose={onClose} onAgain={() => setRound((r) => r + 1)} />}
      </div>
    </Shell>
  );
}

/* ------------------------------ จับคู่ภาพ ------------------------------ */
const MATCH_ART = ['oc-whale', 'b-butterfly', 'sp-rocket', 'v-tuktuk', 'mu-guitar', 'oc-turtle', 'sp-ufo', 'b-bee', 'w-rainbow', 'fe-gift', 'oc-octopus', 'h-house'];
const PEEK_MS = 1800;

export function MatchGame({ onClose, onDone }: GameProps) {
  const [round, setRound] = useState(0);
  const cards = useMemo(() => {
    const pick = shuffled(MATCH_ART, Math.random).slice(0, 6);
    return shuffled([...pick, ...pick], Math.random).map((art, i) => ({ i, art }));
    // สับใหม่เมื่อเริ่มรอบใหม่
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [streak, setStreak] = useState(0);
  const [miss, setMiss] = useState<number[]>([]);
  const [peek, setPeek] = useState(true);
  const board = useRef<HTMLDivElement>(null);
  const lock = useRef(true);

  useEffect(() => {
    lock.current = true;
    setPeek(true);
    const t = setTimeout(() => {
      setPeek(false);
      lock.current = false;
    }, PEEK_MS);
    return () => clearTimeout(t);
  }, [round]);

  const flip = useCallback(
    (i: number, el: HTMLElement) => {
      if (lock.current || open.includes(i) || done.includes(cards[i].art)) return;
      sfx.pop();
      const next = [...open, i];
      setOpen(next);
      if (next.length < 2) return;
      setMoves((m) => m + 1);
      lock.current = true;
      if (cards[next[0]].art === cards[next[1]].art) {
        setTimeout(() => {
          sfx.sparkle();
          const d = [...done, cards[i].art];
          const s = streak + 1;
          setStreak(s);
          const b = board.current;
          if (b) {
            const br = b.getBoundingClientRect();
            const r = el.getBoundingClientRect();
            fxPop(b, ((r.left + r.width / 2 - br.left) / br.width) * 100, ((r.top + r.height / 2 - br.top) / br.height) * 100, s > 1 ? `ต่อเนื่อง ${s}` : 'ใช่เลย', '#1f9d63', 12);
          }
          setDone(d);
          setOpen([]);
          if (d.length === 6) {
            sfx.cheer();
            onDone('match');
            return; // ค้าง lock ไว้ ไพ่กดไม่ได้หลังจบ
          }
          lock.current = false;
        }, 320);
      } else {
        setStreak(0);
        setTimeout(() => setMiss(next), 380);
        setTimeout(() => {
          setOpen([]);
          setMiss([]);
          lock.current = false;
        }, 850);
      }
    },
    [cards, done, onDone, open, streak]
  );

  const over = done.length === 6;
  return (
    <Shell title="จับคู่ภาพ" onClose={onClose} over={over} score={<>เปิด {moves} ครั้ง</>}>
      <p className="pr-match-tip">{peek ? 'จำภาพให้ดี!' : streak >= 2 ? `ต่อเนื่อง ${streak} คู่` : 'เปิดให้ตรงกันทีละคู่'}</p>
      <div ref={board} className="pr-match">
        {cards.map((c) => {
          const up = peek || open.includes(c.i) || done.includes(c.art);
          return (
            <button key={`${round}-${c.i}`} type="button" className="pr-card" data-up={up || undefined} data-done={done.includes(c.art) || undefined} data-miss={miss.includes(c.i) || undefined} onClick={(e) => flip(c.i, e.currentTarget)} aria-label={up ? 'การ์ดเปิดแล้ว' : 'การ์ดคว่ำ'}>
              <span className="pr-card-in">
                <span className="pr-card-back" />
                <span className="pr-card-front"><StickerArt id={c.art} /></span>
              </span>
            </button>
          );
        })}
      </div>
      {over && <Finish line="จับคู่ครบแล้ว" sub={`เปิดไป ${moves} ครั้ง`} stars={moves <= 8 ? 3 : moves <= 12 ? 2 : 1} onClose={onClose} onAgain={() => { setDone([]); setOpen([]); setMoves(0); setStreak(0); setRound((r) => r + 1); }} />}
    </Shell>
  );
}
