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

export type GameKind = 'balloon' | 'catch' | 'match';
interface GameProps {
  onClose: () => void;
  /** จบรอบ (นับภารกิจ + หลอดสนุก) */
  onDone: (kind: GameKind) => void;
  look: { stage: number; color: string; species: string; wear: { hat?: string; face?: string; body?: string; back?: string } };
}

function Shell({ title, onClose, children, score }: { title: string; onClose: () => void; children: React.ReactNode; score?: React.ReactNode }) {
  return (
    <div className="pr-game" role="dialog" aria-label={title}>
      <div className="pr-game-top">
        <button type="button" className="pr-icon-btn" onClick={onClose} aria-label="ออกจากเกม"><X className="w-5 h-5" /></button>
        <b>{title}</b>
        <span className="pr-game-score">{score}</span>
      </div>
      {children}
    </div>
  );
}

function Finish({ line, sub, onAgain, onClose }: { line: string; sub: string; onAgain: () => void; onClose: () => void }) {
  return (
    <div className="pr-game-end">
      <div className="pr-pop-card">
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
      <Shell title="ลูกโป่งคำตอบ" onClose={onClose}>
        <Finish line={`ยิงถูก ${got} ลูก`} sub={stars ? `ได้ดาว ${stars} ดวง` : 'วันนี้เก็บดาวจากการตอบครบแล้ว'} onClose={onClose} onAgain={() => { seed.current = Date.now(); setN(0); setGot(0); setStars(0); }} />
      </Shell>
    );
  }
  return (
    <Shell title="ลูกโป่งคำตอบ" onClose={onClose} score={<><StarIcon className="w-5 h-5" /> {stars}</>}>
      <div className="pr-q-card" data-result={result || undefined}>
        {result && <AnswerStamp key={result + wrong.length} kind={result} />}
        <small>{q!.tag} · ข้อ {n + 1}/{ROUND_Q}</small>
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
const SWEET = ['f-donut', 'f-lollipop'];
const CATCH_SECS = 25;
let fallId = 1;
interface Fall { id: number; x: number; y: number; v: number; art: string; sweet: boolean; el: HTMLDivElement | null }

export function CatchGame({ onClose, onDone, look }: GameProps) {
  const box = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(CATCH_SECS);
  const [round, setRound] = useState(0);
  const [, force] = useState(0);
  const falls = useRef<Fall[]>([]);
  const heroX = useRef(0.5);

  useEffect(() => {
    setScore(0);
    setLeft(CATCH_SECS);
    falls.current = [];

    let raf = 0;
    let last = performance.now();
    let spawn = 0;
    const started = last;
    let over = false;
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const passed = (t - started) / 1000;
      setLeft((l) => {
        const n = Math.max(0, CATCH_SECS - Math.floor(passed));
        return n === l ? l : n;
      });
      if (passed >= CATCH_SECS) {
        if (!over) {
          over = true;
          onDone('catch');
        }
        return;
      }
      spawn -= dt;
      if (spawn <= 0) {
        spawn = Math.max(0.42, 0.9 - passed * 0.018);
        const sweet = Math.random() < 0.2;
        const pool = sweet ? SWEET : GOOD;
        falls.current.push({ id: fallId++, x: 0.08 + Math.random() * 0.84, y: -0.1, v: 0.32 + passed * 0.012 + Math.random() * 0.12, art: pool[Math.floor(Math.random() * pool.length)], sweet, el: null });
        force((f) => f + 1);
      }
      const h = box.current?.clientHeight || 1;
      let changed = false;
      falls.current = falls.current.filter((f) => {
        f.y += f.v * dt;
        if (f.el) f.el.style.transform = `translate3d(0, ${f.y * h}px, 0)`;
        if (f.y > 0.78 && f.y < 0.95 && Math.abs(f.x - heroX.current) < 0.13) {
          setScore((s) => Math.max(0, s + (f.sweet ? -1 : 1)));
          if (f.sweet) gsfx.wrong();
          else sfx.pop();
          changed = true;
          return false;
        }
        if (f.y > 1.05) {
          changed = true;
          return false;
        }
        return true;
      });
      if (changed) force((f) => f + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // onDone คงที่ต่อรอบ เริ่มใหม่เมื่อ round เปลี่ยนเท่านั้น
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const move = (e: React.PointerEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    heroX.current = Math.max(0.08, Math.min(0.92, (e.clientX - r.left) / r.width));
    if (hero.current) hero.current.style.left = `${heroX.current * 100}%`;
  };

  return (
    <Shell title="รับผักผลไม้" onClose={onClose} score={<>{score} ชิ้น · {left} วิ</>}>
      <div ref={box} className="pr-catch" onPointerMove={move} onPointerDown={move}>
        <p className="pr-catch-tip">รับผักผลไม้ หลบขนมหวาน</p>
        {falls.current.map((f) => (
          <div key={f.id} ref={(el) => { f.el = el; }} className="pr-fall" style={{ left: `${f.x * 100}%` }}>
            <StickerArt id={f.art} />
          </div>
        ))}
        <div ref={hero} className="pr-catch-hero" style={{ left: '50%' }}>
          <Buddy stage={look.stage} color={look.color} wear={look.wear} species={look.species} size={92} animate={false} expr="happy" />
        </div>
        {left === 0 && <Finish line={`รับได้ ${score} ชิ้น`} sub="ปุ๋งสนุกมาก อิ่มเลย" onClose={onClose} onAgain={() => setRound((r) => r + 1)} />}
      </div>
    </Shell>
  );
}

/* ------------------------------ จับคู่ภาพ ------------------------------ */
const MATCH_ART = ['oc-whale', 'b-butterfly', 'sp-rocket', 'v-tuktuk', 'mu-guitar', 'oc-turtle', 'sp-ufo', 'b-bee', 'w-rainbow', 'fe-gift', 'oc-octopus', 'h-house'];

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
  const lock = useRef(false);

  const flip = useCallback(
    (i: number) => {
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
          setDone(d);
          setOpen([]);
          lock.current = false;
          if (d.length === 6) onDone('match');
        }, 320);
      } else {
        setTimeout(() => {
          setOpen([]);
          lock.current = false;
        }, 750);
      }
    },
    [cards, done, onDone, open]
  );

  return (
    <Shell title="จับคู่ภาพ" onClose={onClose} score={<>เปิด {moves} ครั้ง</>}>
      <div className="pr-match">
        {cards.map((c) => {
          const up = open.includes(c.i) || done.includes(c.art);
          return (
            <button key={c.i} type="button" className="pr-card" data-up={up || undefined} data-done={done.includes(c.art) || undefined} onClick={() => flip(c.i)} aria-label={up ? 'การ์ดเปิดแล้ว' : 'การ์ดคว่ำ'}>
              <span className="pr-card-in">
                <span className="pr-card-back" />
                <span className="pr-card-front"><StickerArt id={c.art} /></span>
              </span>
            </button>
          );
        })}
      </div>
      {done.length === 6 && <Finish line="จับคู่ครบแล้ว" sub={`เปิดไป ${moves} ครั้ง`} onClose={onClose} onAgain={() => { setDone([]); setOpen([]); setMoves(0); setRound((r) => r + 1); }} />}
    </Shell>
  );
}
