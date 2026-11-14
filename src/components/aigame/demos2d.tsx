'use client';

/** เกมตัวอย่างแบบ 2D (DOM + SVG + CSS) ใช้คำถามที่ครูเลือก */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gsfx } from '@/lib/game-creator/gsound';
import { COLORS, Empty, Hud, Spark, Stamp, seeded, toDemo, useLoop, useNumKeys, type DemoProps } from './demoKit';

/* ---------------------------------------------------------------- ยิงลูกโป่ง */

export function BalloonDemo({ items }: DemoProps) {
  const { item, n, score, combo, fb, wrong, answer } = useLoop(items);
  const [popped, setPopped] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  useEffect(() => setPopped(null), [n]);
  const hit = (i: number) => {
    if (wrong.has(i) || popped !== null) return;
    if (answer(i)) setPopped(i);
  };
  useNumKeys(hit);
  if (!item) return <Empty />;
  const cnt = item.choices.length;
  return (
    <div className="ag-stage ag-sky">
      <span className="ag-cloud" style={{ top: '18%', animationDelay: '-6s' }} />
      <span className="ag-cloud" style={{ top: '42%', animationDelay: '-19s', ['--s' as string]: 0.7 }} />
      <svg className="ag-hills" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 30 Q100 0 200 26 T400 20 V60 H0Z" fill="#7bd389" />
        <path d="M0 44 Q120 24 240 42 T400 38 V60 H0Z" fill="#3fae5a" />
      </svg>
      <Hud q={item.q} score={score} combo={combo} />
      {item.choices.map((c, i) => (
        <button
          key={`${n}-${round}-${i}`}
          type="button"
          className="ag-balloon"
          data-state={popped === i ? 'pop' : wrong.has(i) ? 'flat' : undefined}
          style={{ left: `${((i + 0.5) / cnt) * 100}%`, ['--c' as string]: COLORS[i % COLORS.length], animationDelay: `${i * -1.3}s` }}
          onClick={() => hit(i)}
          onAnimationIteration={i === 0 ? () => setRound((r) => r + 1) : undefined}
          aria-label={`ตัวเลือก ${i + 1}: ${c}`}
        >
          <svg viewBox="0 0 60 92" aria-hidden="true">
            <path d="M30 2C14 2 4 15 4 30c0 18 14 32 26 36 12-4 26-18 26-36C56 15 46 2 30 2Z" fill="var(--c)" stroke="#2a2350" strokeWidth="3" />
            <path d="M16 18c3-6 8-9 13-10" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".7" fill="none" />
            <path d="M27 66l3 5 3-5Z" fill="var(--c)" stroke="#2a2350" strokeWidth="2.5" />
            <path d="M30 71c-4 6 4 10 0 20" stroke="#2a2350" strokeWidth="2" fill="none" />
          </svg>
          <span className="ag-label">{c}</span>
          <i className="ag-num">{i + 1}</i>
          {popped === i && <Spark className="ag-burst" c="#ffd166" />}
        </button>
      ))}
      <Stamp fb={fb} />
    </div>
  );
}

/* ---------------------------------------------------------------- ทุบตัวตุ่น */

export function MoleDemo({ items }: DemoProps) {
  const { item, n, score, combo, fb, wrong, answer } = useLoop(items, 4, 900);
  // ตุ่นที่โผล่: หลุม -> ลำดับตัวเลือก
  const [up, setUp] = useState<Map<number, number>>(new Map());
  const [bonk, setBonk] = useState<number | null>(null);
  const tick = useRef(0);
  const it = useRef(item);
  it.current = item;
  useEffect(() => {
    setBonk(null);
    const show = () => {
      const cur = it.current;
      if (!cur) return;
      const r = seeded(n * 31 + tick.current++);
      const holes = [0, 1, 2, 3, 4, 5].sort(() => r() - 0.5).slice(0, Math.min(3, cur.choices.length));
      const picks = cur.choices.map((_, i) => i).sort(() => r() - 0.5);
      // ทุกสองรอบต้องมีตัวที่ถูกโผล่อย่างน้อยหนึ่งตัว
      const right = [...cur.correct][0];
      if (tick.current % 2 === 0 && !picks.slice(0, holes.length).includes(right)) picks.unshift(right);
      setUp(new Map(holes.map((h, k) => [h, picks[k]])));
    };
    show();
    const t = setInterval(show, 2300);
    return () => clearInterval(t);
  }, [n]);
  const hit = (hole: number) => {
    const ci = up.get(hole);
    if (ci === undefined || wrong.has(ci)) return;
    setBonk(hole);
    const ok = answer(ci);
    if (ok === false) setUp((m) => {
      const x = new Map(m);
      x.delete(hole);
      return x;
    });
  };
  useNumKeys(hit);
  if (!item) return <Empty />;
  return (
    <div className="ag-stage ag-farm">
      <Hud q={item.q} score={score} combo={combo} />
      <div className="ag-holes">
        {[0, 1, 2, 3, 4, 5].map((h) => {
          const ci = up.get(h);
          const on = ci !== undefined;
          return (
            <button key={h} type="button" className="ag-hole" onClick={() => hit(h)} aria-label={on ? `หลุม ${h + 1}: ${item.choices[ci!]}` : `หลุม ${h + 1} ว่าง`}>
              <span className="ag-mole" data-up={on || undefined} data-bonk={bonk === h || undefined}>
                <svg viewBox="0 0 60 60" aria-hidden="true">
                  <ellipse cx="30" cy="36" rx="22" ry="24" fill="#a9785a" stroke="#2a2350" strokeWidth="3" />
                  <ellipse cx="30" cy="44" rx="12" ry="9" fill="#e9c9a8" />
                  <circle cx="22" cy="30" r="3" fill="#2a2350" />
                  <circle cx="38" cy="30" r="3" fill="#2a2350" />
                  <ellipse cx="30" cy="38" rx="4" ry="3" fill="#ff7a8a" />
                  <path d="M12 16q18-14 36 0" fill={COLORS[h % COLORS.length]} stroke="#2a2350" strokeWidth="3" />
                </svg>
                {on && <span className="ag-sign">{item.choices[ci!]}</span>}
              </span>
              <span className="ag-dirt" />
              <i className="ag-num">{h + 1}</i>
            </button>
          );
        })}
      </div>
      <Stamp fb={fb} />
    </div>
  );
}

/* ---------------------------------------------------------------- ตกปลา */

export function FishingDemo({ items }: DemoProps) {
  const { item, n, score, combo, fb, wrong, answer } = useLoop(items, 4, 1100);
  const [hook, setHook] = useState<{ i: number; x: number; y: number } | null>(null);
  const [caught, setCaught] = useState<number | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setHook(null);
    setCaught(null);
  }, [n]);
  const cast = (i: number, el: HTMLElement | null) => {
    if (hook || wrong.has(i) || !el || !stage.current) return;
    const a = stage.current.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const x = ((b.left + b.width / 2 - a.left) / a.width) * 100;
    const y = ((b.top + b.height / 2 - a.top) / a.height) * 100;
    gsfx.tap();
    setHook({ i, x, y });
    window.setTimeout(() => {
      const ok = answer(i);
      if (ok) setCaught(i);
      else setHook(null);
    }, 450);
  };
  const fishRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useNumKeys((i) => cast(i, fishRefs.current[i] ?? null));
  if (!item) return <Empty />;
  const cnt = item.choices.length;
  return (
    <div className="ag-stage ag-sea" ref={stage}>
      <div className="ag-water" />
      <svg className="ag-boat" viewBox="0 0 120 50" aria-hidden="true">
        <path d="M6 22h108l-14 22H20Z" fill="#ff9a3d" stroke="#2a2350" strokeWidth="3" />
        <rect x="52" y="4" width="6" height="20" fill="#2a2350" />
        <path d="M58 6l26 8-26 6Z" fill="#fff" stroke="#2a2350" strokeWidth="2" />
      </svg>
      {hook && (
        <svg className="ag-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="50" y1="14" x2={hook.x} y2={caught !== null ? 14 : hook.y} stroke="#2a2350" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      <Hud q={item.q} score={score} combo={combo} />
      {item.choices.map((c, i) => (
        <button
          key={`${n}-${i}`}
          ref={(el) => {
            fishRefs.current[i] = el;
          }}
          type="button"
          className="ag-fish"
          data-state={caught === i ? 'caught' : wrong.has(i) ? 'flee' : undefined}
          style={{ top: `${36 + (i / Math.max(1, cnt - 1)) * 46}%`, ['--c' as string]: COLORS[(i + 1) % COLORS.length], ['--d' as string]: `${7 + i * 1.7}s`, animationDelay: `${i * -2.1}s` }}
          onClick={(e) => cast(i, e.currentTarget)}
          aria-label={`ปลาตัวที่ ${i + 1}: ${c}`}
        >
          <svg viewBox="0 0 80 44" aria-hidden="true">
            <path d="M8 22c10-18 44-20 58 0-14 20-48 18-58 0Z" fill="var(--c)" stroke="#2a2350" strokeWidth="3" />
            <path d="M64 22l14-12v24Z" fill="var(--c)" stroke="#2a2350" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="20" cy="19" r="3.5" fill="#2a2350" />
          </svg>
          <span className="ag-label">{c}</span>
        </button>
      ))}
      <Stamp fb={fb} />
    </div>
  );
}

/* ---------------------------------------------------------------- จับคู่การ์ด */

export function MemoryDemo({ items }: DemoProps) {
  const pool = useMemo(() => toDemo(items), [items]);
  const [round, setRound] = useState(0);
  const deck = useMemo(() => {
    const r = seeded(round + 7);
    const pick = pool.length ? Array.from({ length: Math.min(4, pool.length) }, (_, k) => pool[(round * 4 + k) % pool.length]) : [];
    const cards = pick.flatMap((p, k) => [
      { id: `q${k}`, pair: k, text: p.q, kind: 'q' as const },
      { id: `a${k}`, pair: k, text: p.choices[[...p.correct][0]], kind: 'a' as const },
    ]);
    return cards.sort(() => r() - 0.5);
  }, [pool, round]);
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [peek, setPeek] = useState(true);
  const [moves, setMoves] = useState(0);
  useEffect(() => {
    setOpen([]);
    setDone(new Set());
    setMoves(0);
    setPeek(true);
    const t = setTimeout(() => setPeek(false), 1800);
    return () => clearTimeout(t);
  }, [deck]);
  const flip = (k: number) => {
    if (peek || open.length === 2 || open.includes(k) || done.has(deck[k].pair)) return;
    gsfx.tap();
    const nx = [...open, k];
    setOpen(nx);
    if (nx.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = nx.map((i) => deck[i]);
      const ok = a.pair === b.pair;
      window.setTimeout(() => {
        if (ok) {
          gsfx.correct();
          const d = new Set(done).add(a.pair);
          setDone(d);
          if (d.size * 2 === deck.length) window.setTimeout(() => setRound((r) => r + 1), 1200);
        } else gsfx.wrong();
        setOpen([]);
      }, ok ? 350 : 900);
    }
  };
  if (!deck.length) return <Empty />;
  const all = done.size * 2 === deck.length;
  return (
    <div className="ag-stage ag-library">
      <div className="ag-hud">
        <div className="ag-q">{all ? 'ครบทุกคู่แล้ว!' : peek ? 'จำตำแหน่งการ์ดไว้นะ...' : 'เปิดการ์ด 2 ใบ ให้คำถามคู่กับคำตอบ'}</div>
        <div className="ag-score">
          <b>{moves}</b>
          <small>ครั้ง</small>
        </div>
      </div>
      <div className="ag-cards" style={{ ['--cols' as string]: deck.length > 6 ? 4 : 3 }}>
        {deck.map((c, k) => {
          const face = peek || open.includes(k) || done.has(c.pair);
          return (
            <button key={`${round}-${c.id}`} type="button" className="ag-card" data-face={face || undefined} data-done={done.has(c.pair) || undefined} data-kind={c.kind} onClick={() => flip(k)} aria-label={face ? c.text : `การ์ดใบที่ ${k + 1}`}>
              <span className="ag-card-in">
                <span className="ag-card-back">
                  <Spark className="w-1/3" c="#ffd166" />
                </span>
                <span className="ag-card-front">{c.text}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- ป้องกันปราสาท */

interface Slime {
  id: number;
  x: number;
  c: string;
}

export function CastleDemo({ items }: DemoProps) {
  const { item, score, combo, fb, wrong, answer } = useLoop(items, 4, 500);
  const [slimes, setSlimes] = useState<Slime[]>([]);
  const [hearts, setHearts] = useState(5);
  const [shot, setShot] = useState<{ key: number; x: number } | null>(null);
  const [freeze, setFreeze] = useState(0);
  const idRef = useRef(0);
  const frozen = useRef(0);
  frozen.current = freeze;
  // ตำแหน่งสไลม์อยู่ใน ref (ไม่ทำผลข้างเคียงใน setState updater) แล้วค่อยส่งให้วาด
  const live = useRef<Slime[]>([]);
  const put = (s: Slime[]) => {
    live.current = s;
    setSlimes(s);
  };
  useEffect(() => {
    const spawn = () => {
      if (live.current.length < 4) put([...live.current, { id: ++idRef.current, x: 100, c: COLORS[idRef.current % COLORS.length] }]);
    };
    spawn();
    const sp = setInterval(spawn, 3800);
    const mv = setInterval(() => {
      if (Date.now() < frozen.current) return;
      const next = live.current.map((m) => ({ ...m, x: m.x - 0.45 }));
      if (next.some((m) => m.x <= 22)) setHearts((h) => (h > 1 ? h - 1 : 5));
      put(next.filter((m) => m.x > 22));
    }, 60);
    return () => {
      clearInterval(sp);
      clearInterval(mv);
    };
  }, []);
  const pick = (i: number) => {
    if (wrong.has(i)) return;
    const ok = answer(i);
    if (ok && live.current.length) {
      const front = live.current.reduce((a, b) => (a.x < b.x ? a : b));
      setShot({ key: Date.now(), x: front.x });
      put(live.current.filter((m) => m.id !== front.id));
    } else if (ok === false) setFreeze(Date.now() + 1500);
  };
  useNumKeys(pick);
  if (!item) return <Empty />;
  return (
    <div className="ag-stage ag-candy">
      <Hud q={item.q} score={score} combo={combo} />
      <div className="ag-hearts" aria-label={`หัวใจ ${hearts} ดวง`}>
        {Array.from({ length: 5 }).map((_, k) => (
          <svg key={k} viewBox="0 0 24 22" data-off={k >= hearts || undefined} aria-hidden="true">
            <path d="M12 21C5 15 1 11 1 6.5A5.5 5.5 0 0 1 12 4a5.5 5.5 0 0 1 11 2.5C23 11 19 15 12 21Z" fill="#ff6b7a" stroke="#2a2350" strokeWidth="2" />
          </svg>
        ))}
      </div>
      <div className="ag-road" />
      <svg className="ag-castle" viewBox="0 0 90 100" aria-hidden="true">
        <rect x="10" y="40" width="70" height="56" rx="6" fill="#ffd9e6" stroke="#2a2350" strokeWidth="3" />
        <rect x="6" y="22" width="22" height="30" rx="4" fill="#fff0c4" stroke="#2a2350" strokeWidth="3" />
        <rect x="62" y="22" width="22" height="30" rx="4" fill="#fff0c4" stroke="#2a2350" strokeWidth="3" />
        <path d="M4 24l13-18 13 18M60 24l13-18 13 18" fill="#ff6b7a" stroke="#2a2350" strokeWidth="3" strokeLinejoin="round" />
        <path d="M36 96V72a9 9 0 0 1 18 0v24Z" fill="#9b6cf0" stroke="#2a2350" strokeWidth="3" />
        <circle cx="45" cy="54" r="6" fill="#ffd166" stroke="#2a2350" strokeWidth="2.5" />
      </svg>
      {shot && <span key={shot.key} className="ag-candyball" style={{ ['--x' as string]: `${shot.x}%` }} />}
      {slimes.map((m) => (
        <span key={m.id} className="ag-slime" data-freeze={Date.now() < freeze || undefined} style={{ left: `${m.x}%`, ['--c' as string]: m.c }}>
          <svg viewBox="0 0 50 40" aria-hidden="true">
            <path d="M4 36c0-20 10-32 21-32s21 12 21 32Z" fill="var(--c)" stroke="#2a2350" strokeWidth="3" />
            <circle cx="18" cy="22" r="3" fill="#2a2350" />
            <circle cx="32" cy="22" r="3" fill="#2a2350" />
            <path d="M20 29q5 4 10 0" stroke="#2a2350" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      <div className="ag-panel">
        {item.choices.map((c, i) => (
          <button key={i} type="button" className="ag-opt" data-off={wrong.has(i) || undefined} style={{ ['--c' as string]: COLORS[i % COLORS.length] }} onClick={() => pick(i)}>
            <i>{i + 1}</i> {c}
          </button>
        ))}
      </div>
      <Stamp fb={fb} />
    </div>
  );
}

/* ---------------------------------------------------------------- ชักเย่อ (ผู้เล่น vs ทีมคอมพิวเตอร์) */

export function TugDemo({ items }: DemoProps) {
  const { item, n, score, combo, fb, wrong, answer } = useLoop(items, 4, 700);
  const [rope, setRope] = useState(0); // -5 (ฝั่งเราชนะ) .. 5 (คอมพิวเตอร์ชนะ)
  const [win, setWin] = useState<'me' | 'cpu' | null>(null);
  // คอมพิวเตอร์ตอบถูกหลัง 4.5-7 วินาที
  useEffect(() => {
    if (win) return;
    const t = setTimeout(() => {
      gsfx.tick();
      setRope((r) => Math.min(5, r + 1));
    }, 4500 + ((n * 977) % 2500));
    return () => clearTimeout(t);
  }, [n, win, rope]);
  useEffect(() => {
    if (rope <= -5) setWin('me');
    else if (rope >= 5) setWin('cpu');
  }, [rope]);
  useEffect(() => {
    if (!win) return;
    if (win === 'me') gsfx.fanfare();
    const t = setTimeout(() => {
      setWin(null);
      setRope(0);
    }, 2400);
    return () => clearTimeout(t);
  }, [win]);
  const pick = (i: number) => {
    if (win || wrong.has(i)) return;
    if (answer(i)) setRope((r) => Math.max(-5, r - 1));
  };
  useNumKeys(pick);
  if (!item) return <Empty />;
  const Kid = ({ c, flip }: { c: string; flip?: boolean }) => (
    <svg viewBox="0 0 40 50" className="ag-kid" style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden="true">
      <ellipse cx="20" cy="30" rx="15" ry="17" fill={c} stroke="#2a2350" strokeWidth="3" />
      <circle cx="25" cy="24" r="2.6" fill="#2a2350" />
      <path d="M8 46l6-6M30 46l-4-6" stroke="#2a2350" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
  return (
    <div className="ag-stage ag-field">
      <Hud q={win ? (win === 'me' ? 'ทีมเราชนะ!' : 'ทีมคอมพิวเตอร์ชนะ ลองใหม่!') : item.q} score={score} combo={combo} />
      <div className="ag-lines">
        <i style={{ left: '22%' }} />
        <i style={{ left: '78%' }} />
      </div>
      <div className="ag-rope" style={{ transform: `translateX(${rope * 5.6}%)` }}>
        <span className="ag-team">
          <Kid c="#4fb3ff" />
          <Kid c="#4fb3ff" />
          <Kid c="#4fb3ff" />
        </span>
        <span className="ag-cord">
          <i className="ag-flag" />
        </span>
        <span className="ag-team">
          <Kid c="#ff8ac2" flip />
          <Kid c="#ff8ac2" flip />
          <Kid c="#ff8ac2" flip />
        </span>
      </div>
      <div className="ag-tags">
        <b style={{ background: '#4fb3ff' }}>ทีมเรา</b>
        <b style={{ background: '#ff8ac2' }}>ทีมคอมพิวเตอร์</b>
      </div>
      <div className="ag-panel">
        {item.choices.map((c, i) => (
          <button key={i} type="button" className="ag-opt" data-off={wrong.has(i) || !!win || undefined} style={{ ['--c' as string]: COLORS[i % COLORS.length] }} onClick={() => pick(i)}>
            <i>{i + 1}</i> {c}
          </button>
        ))}
      </div>
      <Stamp fb={fb} />
    </div>
  );
}
