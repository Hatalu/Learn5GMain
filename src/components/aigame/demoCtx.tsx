'use client';

/**
 * ตัวเลือกของครูที่มีผลกับ "เกมตัวอย่าง": ความเร็ว จำนวนข้อ เวลาต่อข้อ หัวใจ ผู้เล่น สไตล์ภาพ ตัวละคร ลูกเล่นเสริม ภาษา
 * DemoFrame ห่อเกมตัวอย่างทุกเกม: ฟังเหตุการณ์จาก useLoop/useOrder (ข้อใหม่ ถูก ผิด) แล้ววาดชั้นบน
 * (แถบเวลา หัวใจ ตาผู้เล่น/ทีม แผนที่ด่าน ไอเท็ม ปุ่มอ่านออกเสียง ตัวละคร+คำพูด บอส หน้าสรุปผล)
 * ความเร็ว = CSS --pace + usePace() ในเกมที่ตั้งเวลาด้วย JS · สไตล์ภาพ = data-art (CSS) + ภาพพิกเซลของเกม 3D
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { gsfx } from '@/lib/game-creator/gsound';

export interface DemoOpts {
  /** จำนวนข้อ/ชิ้น/ชุดของรอบ (0 = ไม่จำกัด) */
  count: number;
  /** ตัวคูณเวลา (มาก = ช้า) */
  pace: number;
  /** วินาทีต่อข้อ (0 = ไม่จับเวลา) */
  timer: number;
  lives: boolean;
  mode: 'solo' | 'duel' | 'class';
  art: string;
  hero: string;
  extras: string[];
  lang: 'th' | 'en' | 'bi';
}

export const DEFAULT_OPTS: DemoOpts = { count: 0, pace: 1, timer: 0, lives: false, mode: 'solo', art: 'cartoon', hero: 'auto', extras: [], lang: 'th' };

type Ev = { t: 'q'; n: number; q: string; hint?: string } | { t: 'ok'; ans: string } | { t: 'bad'; ans?: string };

const WORDS = {
  ok: ['ถูกต้อง!', 'Correct!'],
  bad: ['ลองอีกนิด', 'Try again'],
  cheer: ['เก่งมาก!', 'Great job!'],
  hint: ['ไม่เป็นไร ลองคิดอีกนิดนะ', 'No worries, think again'],
  why: ['เฉลย', 'Answer'],
  timeup: ['หมดเวลา! ไม่เป็นไร ตอบต่อได้', "Time's up! Keep going"],
  refill: ['หัวใจเต็มแล้ว!', 'Hearts refilled!'],
  zero: ['หัวใจหมด แต่ยังเล่นต่อได้', 'No hearts left, keep playing'],
  turn: ['ตาผู้เล่น', 'Player'],
  team: ['ทีม', 'Team'],
  stage: ['ด่าน', 'Stage'],
  stageUp: ['ผ่านด่านแล้ว!', 'Stage clear!'],
  boss: ['ด่านบอส!', 'Boss round!'],
  bossWin: ['ชนะบอสแล้ว!', 'Boss defeated!'],
  slow: ['ช้าลง', 'Slow'],
  slowOn: ['ทุกอย่างช้าลงข้อนี้', 'Slow motion!'],
  power: ['ได้ไอเท็มช่วย!', 'Got a helper item!'],
  done: ['จบรอบแล้ว!', 'Round complete!'],
  again: ['เล่นอีกครั้ง', 'Play again'],
  score: ['คะแนน', 'Score'],
  right: ['ถูก', 'Correct'],
  best: ['สถิติสูงสุด', 'Best scores'],
  sticker: ['ได้สติกเกอร์', 'New sticker'],
  cert: ['เกียรติบัตร', 'Certificate'],
  certFor: ['มอบให้', 'Awarded to'],
  name: ['พิมพ์ชื่อ', 'Type a name'],
  print: ['พิมพ์', 'Print'],
  win: ['ชนะ', 'wins'],
  tie: ['เสมอ!', 'Draw!'],
  read: ['ฟังโจทย์', 'Listen'],
} as const;
type WKey = keyof typeof WORDS;

export function wordOf(lang: DemoOpts['lang'], k: WKey) {
  const [th, en] = WORDS[k];
  return lang === 'en' ? en : lang === 'bi' ? `${th} / ${en}` : th;
}

interface Ctx {
  o: DemoOpts;
  /** ตัวคูณเวลาจริงตอนนี้ (รวมไอเท็มช้าลง) */
  pace: number;
  report: (e: Ev) => void;
  w: (k: WKey) => string;
}

const DemoCtx = createContext<Ctx>({ o: DEFAULT_OPTS, pace: 1, report: () => {}, w: (k) => WORDS[k][0] });
export const useDemo = () => useContext(DemoCtx);
/** ตัวคูณเวลาของเกมตัวอย่าง (เกมที่ตั้งเวลาด้วย JS ใช้ค่านี้) */
export const usePace = () => useContext(DemoCtx).pace;

/* ---------------------------------------------------------------- ตัวละครหลัก (SVG ห้ามอิโมจิ) */

const INK = '#2a2350';
function Face({ y = 30, c = INK }: { y?: number; c?: string }) {
  return (
    <>
      <circle cx="23" cy={y} r="3" fill={c} />
      <circle cx="37" cy={y} r="3" fill={c} />
      <circle cx="24" cy={y - 1} r="1" fill="#fff" />
      <circle cx="38" cy={y - 1} r="1" fill="#fff" />
      <path d={`M26 ${y + 7}q4 3 8 0`} stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="18" cy={y + 5} rx="3" ry="1.8" fill="#ff9bb3" opacity=".8" />
      <ellipse cx="42" cy={y + 5} rx="3" ry="1.8" fill="#ff9bb3" opacity=".8" />
    </>
  );
}
const S = { stroke: INK, strokeWidth: 2.5 } as const;

export function HeroArt({ id }: { id: string }) {
  const body = (c: string) => <rect x="17" y="44" width="26" height="14" rx="7" fill={c} {...S} />;
  const art: Record<string, React.ReactNode> = {
    cat: (
      <>
        {body('#ffb25c')}
        <path d="M12 22l4-14 10 8M48 22l-4-14-10 8" fill="#ff9a3d" {...S} strokeLinejoin="round" />
        <circle cx="30" cy="30" r="18" fill="#ffb25c" {...S} />
        <Face />
        <path d="M10 36h8M42 36h8" stroke={INK} strokeWidth="1.5" />
      </>
    ),
    elephant: (
      <>
        {body('#a9b8d6')}
        <ellipse cx="11" cy="30" rx="9" ry="12" fill="#c3cfe6" {...S} />
        <ellipse cx="49" cy="30" rx="9" ry="12" fill="#c3cfe6" {...S} />
        <circle cx="30" cy="30" r="17" fill="#c3cfe6" {...S} />
        <path d="M27 38q-2 12 4 14" stroke={INK} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M27 38q-2 12 4 14" stroke="#c3cfe6" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M20 13h20l-3-7H23Z" fill="#ff6b7a" {...S} />
        <Face y={28} />
      </>
    ),
    robot: (
      <>
        {body('#9b6cf0')}
        <path d="M30 6v6" stroke={INK} strokeWidth="2.5" />
        <circle cx="30" cy="5" r="3" fill="#ffcf3f" {...S} />
        <rect x="12" y="12" width="36" height="32" rx="9" fill="#d9e2f2" {...S} />
        <rect x="17" y="18" width="26" height="18" rx="5" fill="#2a2350" />
        <circle cx="24" cy="26" r="3" fill="#3fd6a8" />
        <circle cx="36" cy="26" r="3" fill="#3fd6a8" />
        <path d="M26 31q4 3 8 0" stroke="#3fd6a8" strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    ),
    dino: (
      <>
        {body('#5fcf7a')}
        <path d="M18 14l3-6 4 5 4-6 4 6 4-5 3 6" fill="#3fae5a" {...S} strokeLinejoin="round" />
        <circle cx="30" cy="30" r="18" fill="#7fe08e" {...S} />
        <Face />
      </>
    ),
    astronaut: (
      <>
        {body('#ffffff')}
        <circle cx="30" cy="30" r="20" fill="#ffffff" {...S} />
        <circle cx="30" cy="31" r="14" fill="#ffd9b8" {...S} />
        <path d="M18 24a14 14 0 0 1 24 0" fill="#bfe9ff" opacity=".7" />
        <Face y={31} />
      </>
    ),
    rabbit: (
      <>
        {body('#ff6b7a')}
        <ellipse cx="22" cy="10" rx="5" ry="12" fill="#fff" {...S} />
        <ellipse cx="38" cy="10" rx="5" ry="12" fill="#fff" {...S} />
        <circle cx="30" cy="31" r="17" fill="#fff" {...S} />
        <Face y={31} />
      </>
    ),
    auto: (
      <>
        {body('#4fb3ff')}
        <circle cx="30" cy="30" r="18" fill="#ffd9b8" {...S} />
        <path d="M13 26q2-16 17-15 15-1 17 15-8-9-17-8-9-1-17 8Z" fill="#2a2350" />
        <Face />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <ellipse cx="30" cy="58" rx="14" ry="2.5" fill="rgba(42,35,80,.25)" />
      {art[id] || art.auto}
    </svg>
  );
}

/* ---------------------------------------------------------------- ชั้นบนของเกมตัวอย่าง */

const STICKER_COLORS = ['#ffcf3f', '#ff6b7a', '#4fb3ff', '#3fd6a8', '#9b6cf0'];
const BEST_KEY = 'l5g_ag_best';

function Heart({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 22" data-off={off || undefined} aria-hidden="true">
      <path d="M12 21C5 15 1 11 1 6.5A5.5 5.5 0 0 1 12 4a5.5 5.5 0 0 1 11 2.5C23 11 19 15 12 21Z" fill="#ff6b7a" stroke={INK} strokeWidth="2" />
    </svg>
  );
}

function Boss() {
  return (
    <svg viewBox="0 0 80 70" aria-hidden="true">
      <path d="M8 66c0-36 14-58 32-58s32 22 32 58Z" fill="#9b6cf0" stroke={INK} strokeWidth="3" />
      <path d="M22 14l4-12 6 9 8-10 8 10 6-9 4 12" fill="#ffcf3f" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="30" cy="36" r="6" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <circle cx="50" cy="36" r="6" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <circle cx="31" cy="37" r="2.5" fill={INK} />
      <circle cx="51" cy="37" r="2.5" fill={INK} />
      <path d="M32 52q8 6 16 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function DemoFrame({ o, game, children }: { o: DemoOpts; game: string; children: React.ReactNode }) {
  const [round, setRound] = useState(0);
  const [qn, setQn] = useState(0);
  const [qText, setQText] = useState('');
  const [done, setDone] = useState(0);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [right, setRight] = useState<[number, number]>([0, 0]);
  const [hearts, setHearts] = useState(3);
  const [streak, setStreak] = useState(0);
  const [misses, setMisses] = useState(0);
  const [powers, setPowers] = useState(0);
  const [slow, setSlow] = useState(false);
  const [left, setLeft] = useState(o.timer);
  const [say, setSay] = useState<{ t: string; k: number; mood: 'ok' | 'bad' | 'info' } | null>(null);
  const [bossHit, setBossHit] = useState(false);
  const [best, setBest] = useState<number[]>([]);
  const [name, setName] = useState('');
  const ended = o.count > 0 && done >= o.count;
  const ex = (id: string) => o.extras.includes(id);
  const w = useCallback((k: WKey) => wordOf(o.lang, k), [o.lang]);
  const two = o.mode !== 'solo';
  const player = two ? qn % 2 : 0;

  // ค่าล่าสุดสำหรับ report (ฟังก์ชันคงที่ ไม่ทำให้เกมวาดใหม่ทุกครั้ง)
  const st = useRef({ qn, streak, hearts, left, player, o, done });
  st.current = { qn, streak, hearts, left, player, o, done };

  const talk = useCallback((t: string, mood: 'ok' | 'bad' | 'info') => setSay({ t, k: Date.now(), mood }), []);
  useEffect(() => {
    if (!say) return;
    const t = setTimeout(() => setSay(null), 2300);
    return () => clearTimeout(t);
  }, [say]);

  const report = useCallback(
    (e: Ev) => {
      const s = st.current;
      const wd = (k: WKey) => wordOf(s.o.lang, k);
      if (e.t === 'q') {
        setQn(e.n);
        setQText(e.q);
        setSlow(false);
        setLeft(s.o.timer);
        setBossHit(false);
        const per = Math.max(1, Math.ceil((s.o.count || 9) / 3));
        if (s.o.extras.includes('map') && e.n > 0 && e.n % per === 0) talk(wd('stageUp'), 'ok');
        if (s.o.extras.includes('boss') && s.o.count > 0 && e.n === s.o.count - 1) talk(wd('boss'), 'info');
        return;
      }
      if (e.t === 'ok') {
        const bonus = s.o.timer && s.left > 0 ? Math.round((50 * s.left) / s.o.timer) : 0;
        const pts = 100 + s.streak * 20 + bonus;
        setScore((x) => (s.player ? [x[0], x[1] + pts] : [x[0] + pts, x[1]]));
        setRight((x) => (s.player ? [x[0], x[1] + 1] : [x[0] + 1, x[1]]));
        const ns = s.streak + 1;
        setStreak(ns);
        setDone((d) => d + 1);
        if (s.o.lives && s.hearts === 0 && ns >= 2) {
          setHearts(3);
          talk(wordOf(s.o.lang, 'refill'), 'ok');
        } else if (s.o.extras.includes('power') && ns % 3 === 0) {
          setPowers((p) => Math.min(3, p + 1));
          talk(wd('power'), 'ok');
        } else talk(s.o.extras.includes('explain') ? `${wd('why')}: ${e.ans}` : wd('cheer'), 'ok');
        if (s.o.extras.includes('boss') && s.o.count > 0 && s.qn === s.o.count - 1) setBossHit(true);
        return;
      }
      setStreak(0);
      setMisses((m) => m + 1);
      if (s.o.lives) {
        const h = Math.max(0, s.hearts - 1);
        setHearts(h);
        if (h === 0) return talk(wd('zero'), 'bad');
      }
      talk(wd('hint'), 'bad');
    },
    [talk],
  );

  // เวลาต่อข้อ: หมดแล้วไม่เสียอะไร แค่บอกคำใบ้
  useEffect(() => {
    if (!o.timer || ended) return;
    const t = setInterval(() => setLeft((x) => Math.max(0, x - 0.1 / (slow ? 1.6 : 1))), 100);
    return () => clearInterval(t);
  }, [o.timer, ended, qn, slow]);
  useEffect(() => {
    if (o.timer && left === 0 && !ended) talk(w('timeup'), 'info');
  }, [left, o.timer, ended, talk, w]);

  // สถิติสูงสุด
  useEffect(() => {
    if (!ended) return;
    gsfx.fanfare();
    if (!ex('best')) return;
    try {
      const all = JSON.parse(localStorage.getItem(BEST_KEY) || '{}') as Record<string, number[]>;
      const list = [...(all[game] || []), score[0] + score[1]].sort((a, b) => b - a).slice(0, 5);
      all[game] = list;
      localStorage.setItem(BEST_KEY, JSON.stringify(all));
      setBest(list);
    } catch {
      /* เก็บไม่ได้ก็ไม่โชว์ */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended]);

  const replay = () => {
    gsfx.tap();
    setRound((r) => r + 1);
    setDone(0);
    setScore([0, 0]);
    setRight([0, 0]);
    setHearts(3);
    setStreak(0);
    setMisses(0);
    setPowers(0);
    setQn(0);
    setSay(null);
  };

  const speak = () => {
    try {
      const u = new SpeechSynthesisUtterance(qText);
      u.lang = /[ก-๙]/.test(qText) ? 'th-TH' : 'en-US';
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {
      /* ไม่มีเสียงก็ข้าม */
    }
  };

  const pace = o.pace * (slow ? 1.6 : 1);
  const ctx = useMemo<Ctx>(() => ({ o, pace, report, w }), [o, pace, report, w]);
  const total = o.count || 0;
  const per = Math.max(1, Math.ceil((total || 9) / 3));
  const stage = Math.min(2, Math.floor(qn / per));
  const stars = misses === 0 ? 3 : misses <= Math.max(1, total / 4) ? 2 : 1;
  const isBoss = ex('boss') && total > 0 && qn === total - 1 && !ended;
  const label = (i: number) => (o.mode === 'class' ? `${w('team')} ${i ? 'B' : 'A'}` : `${w('turn')} ${i + 1}`);
  const tts = ex('tts') && typeof window !== 'undefined' && 'speechSynthesis' in window;

  return (
    <DemoCtx.Provider value={ctx}>
      <div className="ag-demo" data-art={o.art} data-mode={o.mode} style={{ ['--pace' as string]: pace }}>
        <React.Fragment key={round}>{children}</React.Fragment>
        {o.art === 'pixel' && (
          <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
            <filter id="ag-pixel" x="0" y="0" width="1" height="1">
              <feFlood x="3" y="3" width="1" height="1" />
              <feComposite width="6" height="6" />
              <feTile result="t" />
              <feComposite in="SourceGraphic" in2="t" operator="in" />
              <feMorphology operator="dilate" radius="3" />
            </filter>
          </svg>
        )}

        <div className="ag-over" aria-live="polite">
          {o.timer > 0 && !ended && (
            <div className="ag-tbar" data-low={left < o.timer * 0.3 || undefined}>
              <i style={{ width: `${(100 * left) / o.timer}%` }} />
            </div>
          )}
          <div className="ag-orow">
            {o.lives && (
              <span className="ag-ohearts" aria-label={`${hearts}`}>
                {[0, 1, 2].map((k) => (
                  <Heart key={k} off={k >= hearts} />
                ))}
              </span>
            )}
            {two && (
              <span className="ag-oturn" data-p={player}>
                {label(player)}
                <b>
                  {score[0]} : {score[1]}
                </b>
              </span>
            )}
            {ex('map') && (
              <span className="ag-omap" aria-label={`${w('stage')} ${stage + 1}/3`}>
                {[0, 1, 2].map((k) => (
                  <i key={k} data-on={k <= stage || undefined} />
                ))}
                <small>
                  {w('stage')} {stage + 1}/3
                </small>
              </span>
            )}
            {total > 0 && (
              <span className="ag-ocount">
                {Math.min(done + (ended ? 0 : 1), total)}/{total}
              </span>
            )}
            {ex('power') && (
              <button
                type="button"
                className="ag-opow"
                disabled={!powers || slow}
                onClick={() => {
                  setPowers((p) => p - 1);
                  setSlow(true);
                  talk(w('slowOn'), 'info');
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="13" r="8" fill="#bfe9ff" stroke={INK} strokeWidth="2" />
                  <path d="M12 8v5l3 2M9 3h6" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
                {w('slow')} x{powers}
              </button>
            )}
            {tts && (
              <button type="button" className="ag-otts" onClick={speak} aria-label={w('read')}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 9h4l5-4v14l-5-4H4Z" fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
                  <path d="M16 8q3 4 0 8M18.5 5.5q5 6.5 0 13" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {isBoss && (
            <div className="ag-oboss" data-hit={bossHit || undefined}>
              <Boss />
              <span>{bossHit ? w('bossWin') : w('boss')}</span>
              <i>
                <b style={{ width: bossHit ? '0%' : '100%' }} />
              </i>
            </div>
          )}

          <div className="ag-ohero" data-mood={say?.mood}>
            <HeroArt id={o.hero} />
            {say && (
              <span key={say.k} className="ag-osay">
                {say.t}
              </span>
            )}
          </div>

          {ended && (
            <div className="ag-oend">
              <div className="ag-oend-card">
                <b className="ag-oend-t">{w('done')}</b>
                <div className="ag-ostars" aria-label={`${stars}/3`}>
                  {[0, 1, 2].map((k) => (
                    <svg key={k} viewBox="0 0 24 24" data-off={k >= stars || undefined} aria-hidden="true">
                      <path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.5 5.7 21.1l1.5-7L2 9.3l7-.8Z" fill="#ffcf3f" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  ))}
                </div>
                {two ? (
                  <p className="ag-oend-s">
                    {label(0)}: {score[0]} · {label(1)}: {score[1]}
                    <br />
                    <b>{score[0] === score[1] ? w('tie') : `${label(score[0] > score[1] ? 0 : 1)} ${w('win')}`}</b>
                  </p>
                ) : (
                  <p className="ag-oend-s">
                    {w('score')} {score[0]} · {w('right')} {right[0]}/{total}
                  </p>
                )}
                <div className="ag-oend-x">
                  {ex('sticker') && (
                    <span className="ag-osticker">
                      <svg viewBox="0 0 40 40" aria-hidden="true">
                        <circle cx="20" cy="20" r="17" fill={STICKER_COLORS[round % STICKER_COLORS.length]} stroke={INK} strokeWidth="2.5" />
                        <path d="M20 9l3 6.5 7 .8-5.2 4.8 1.5 7L20 24.5l-6.3 3.6 1.5-7L10 16.3l7-.8Z" fill="#fff" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
                      </svg>
                      {w('sticker')}
                    </span>
                  )}
                  {ex('best') && best.length > 0 && (
                    <span className="ag-obest">
                      <b>{w('best')}</b>
                      {best.map((b, i) => (
                        <small key={i}>
                          {i + 1}. {b}
                        </small>
                      ))}
                    </span>
                  )}
                </div>
                {ex('cert') && (
                  <div className="ag-ocert">
                    <b>{w('cert')}</b>
                    <small>{w('certFor')}</small>
                    <input value={name} onChange={(e) => setName(e.target.value.slice(0, 30))} placeholder={w('name')} />
                    <small>
                      {stars}/3 · {new Date().toLocaleDateString(o.lang === 'en' ? 'en-GB' : 'th-TH')}
                    </small>
                  </div>
                )}
                <button type="button" className="ag-oagain" onClick={replay}>
                  {w('again')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DemoCtx.Provider>
  );
}
