'use client';

/**
 * Human Shape Builder (เกมมนุษย์สร้างรูป) เล่นในเครื่องเดียว: ครูคุมทุกอย่างจากเครื่องเดียว (ฉายโปรเจกเตอร์ได้)
 * นักเรียนไม่ใช้อุปกรณ์ ไม่ใช้กล้อง สร้างรูปด้วยร่างกายจริง แล้วครูเป็นคนตัดสิน
 * - ภารกิจ/ท่าทาง/การเลือกภารกิจตามจำนวนคน: lib/game-creator/shape/missions.ts
 * - ค่าตั้ง/คะแนน: lib/game-creator/shape/settings.ts
 * - ภาพสาธิต: KidStage.tsx
 * - ชื่อทีม/รายชื่อนักเรียนเก็บในเครื่อง (localStorage l5g_shape_v1) ไม่ส่งออกจากเครื่อง
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, ArrowRight, Check, ChevronsRight, Eye, EyeOff, Flag, Hand, Lightbulb, ListChecks, LogOut, Maximize2, Minus, Pause, Play, Plus, RotateCcw,
  Shield, Shuffle, SkipForward, SlidersHorizontal, Square, Star, Timer, Trophy, Users, Wand2, X,
} from 'lucide-react';
import type { QuizQuestion } from '@/lib/game-creator/types';
import { MathText } from '../../math/MathText';
import { Confetti } from '../../live/PlayerSession';
import { gsfx } from '@/lib/game-creator/gsound';
import { releaseMusic, setMusic } from '@/lib/music';
import { roomTrack } from '@/lib/music-tracks';
import { richToPlain } from '@/lib/game-creator/quiz';
import {
  CATS, LEVELS, answerMissions, catBit, missionForText, missionPool, pickMission, useCount, type Mission,
} from '@/lib/game-creator/shape/missions';
import { EMPTY_JUDGE, addScore, ranks, roundPoints, splitTeams, timeBonus, type Judge, type ShapeSettings } from '@/lib/game-creator/shape/settings';
import { KidStage, MiniStage, figsFor, stageFrames, type StageStep } from './KidStage';
import { ShapeSetup } from './ShapeSetup';
import './shape.css';

type Phase = 'start' | 'question' | 'challenge' | 'demo' | 'playing' | 'result' | 'board' | 'summary';
const PHASE_NAME: Record<Phase, string> = {
  start: 'เริ่มเกม',
  question: 'คำถาม',
  challenge: 'ภารกิจ',
  demo: 'ภาพสาธิต',
  playing: 'ลงมือทำ',
  result: 'ตัดสินผล',
  board: 'ตารางคะแนน',
  summary: 'สรุปผล',
};
/** ลำดับช่วงในหนึ่งรอบ (แถบบอกขั้นตอน) */
const FLOW: Phase[] = ['question', 'challenge', 'demo', 'playing', 'result', 'board'];
const TEAM_COLORS = ['#2fb8ff', '#ff8a2f', '#3fd68a', '#ff6bb8', '#9b6cf0', '#ffc53a'];
const TEAM_DEFAULT = ['ทีมฟ้า', 'ทีมส้ม', 'ทีมเขียว', 'ทีมชมพู', 'ทีมม่วง', 'ทีมเหลือง'];
const STEPS: { step: StageStep; title: string }[] = [
  { step: 'lineup', title: 'แบ่งบทบาท' },
  { step: 'spot', title: 'เข้าประจำตำแหน่ง' },
  { step: 'pose', title: 'ทำท่าตามภาพ' },
  { step: 'shape', title: 'รวมกันเป็นรูป' },
  { step: 'check', title: 'ให้ครูตรวจ' },
];
const SAVE = 'l5g_shape_v1';
type CtlId = 'restart' | 'pause' | 'resume' | 'skip' | 'next' | 'end' | 'rq' | 'rm' | 'demo' | 'reveal' | 'tstart' | 'tstop' | 'ok' | 'no' | 'win' | 'lose' | 'plus' | 'save';
/** ปุ่มครูครบ 18 ปุ่ม แบ่งกลุ่ม */
const CTL_GROUPS: CtlId[][] = [
  ['restart', 'pause', 'resume', 'skip', 'next', 'end'],
  ['rq', 'rm', 'demo', 'reveal'],
  ['tstart', 'tstop'],
  ['ok', 'no', 'win', 'lose', 'plus', 'save'],
];
/** ปุ่มหลักของแต่ละช่วง (ที่เหลือกด "ปุ่มครูทั้งหมด") */
const QUICK: Partial<Record<Phase, CtlId[]>> = {
  question: ['reveal', 'ok', 'no', 'rq', 'skip'],
  challenge: ['rm', 'demo', 'tstart'],
  demo: ['rm', 'tstart'],
  playing: ['tstart', 'tstop', 'win', 'lose'],
  result: ['ok', 'no', 'win', 'lose', 'plus', 'save'],
  board: ['plus', 'next', 'end'],
};
const SAFETY = 'ไม่ปีน ไม่ยกเพื่อน ไม่นอนทับกัน จับมือหรือไม่ก็ได้';
const EASY_ROLE = 'ใครไม่สะดวกเคลื่อนไหว: นั่งทำท่าแขน หรือเป็นผู้ตรวจท่าให้ทีม';

interface Ent {
  name: string;
  size: number;
  color: string;
  score: number;
  ok: number;
  correct: number;
  members: string[];
}
interface Hist {
  round: number;
  q: string;
  mission: string;
  res: { ans: boolean | null; mis: boolean | null; pts: number }[];
  skipped?: boolean;
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.ceil(Math.max(0, s)) % 60).padStart(2, '0')}`;

function loadSave(): { names: string[]; roster: string } {
  try {
    const j = JSON.parse(localStorage.getItem(SAVE) || '{}');
    return {
      names: Array.isArray(j.names) ? j.names.filter((x: unknown) => typeof x === 'string').map((x: string) => x.slice(0, 24)).slice(0, 6) : [],
      roster: typeof j.roster === 'string' ? j.roster.slice(0, 3000) : '',
    };
  } catch {
    return { names: [], roster: '' };
  }
}

/** ปุ่มควบคุมครู */
function Ctl({ icon, label, onClick, disabled, tone, on }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; tone?: string; on?: boolean }) {
  return (
    <button type="button" className="hs-ctl" data-tone={tone} data-on={on ? 1 : 0} disabled={disabled} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function ShapeGame({ questions, settings, title, onExit, persist = true }: { questions: QuizQuestion[]; settings: ShapeSettings; title: string; onExit: () => void; persist?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [cfg, setCfg] = useState<ShapeSettings>(settings);
  const [phase, setPhase] = useState<Phase>('start');
  const [showSetup, setShowSetup] = useState(false);
  const [names, setNames] = useState<string[]>(TEAM_DEFAULT);
  const [roster, setRoster] = useState('');
  const [split, setSplit] = useState<string[][] | null>(null);
  const [ents, setEnts] = useState<Ent[]>([]);
  const [round, setRound] = useState(0);
  const [queue, setQueue] = useState<number[]>([]);
  const [qi, setQi] = useState(-1);
  const [mission, setMission] = useState<Mission | null>(null);
  const [ansMs, setAnsMs] = useState<Mission[]>([]);
  const [useN, setUseN] = useState(1);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState(0);
  const [auto, setAuto] = useState(false);
  const [hiKid, setHiKid] = useState(-1);
  const [reveal, setReveal] = useState(false);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [sel, setSel] = useState(-1);
  const [remain, setRemain] = useState(settings.time);
  const [running, setRunning] = useState(false);
  const [timerUsed, setTimerUsed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dock, setDock] = useState(true);
  const [picker, setPicker] = useState(false);
  const [pickCat, setPickCat] = useState<string>('all');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [party, setParty] = useState(0);
  const [hist, setHist] = useState<Hist[]>([]);
  const [allCtl, setAllCtl] = useState(false);
  /** นับถอยหลัง 3-2-1 ก่อนเริ่มจับเวลา (0 = ไม่นับ) */
  const [count, setCount] = useState(0);
  /** ชื่อภารกิจที่หมุนสุ่มอยู่ (null = หยุดแล้ว) */
  const [rolling, setRolling] = useState<string | null>(null);
  const recent = useRef<string[]>([]);
  const endAt = useRef(0);
  const resumeTimer = useRef(false);
  const lastTick = useRef(-1);

  useEffect(() => {
    setMounted(true);
    if (persist) {
      const s = loadSave();
      if (s.names.length) setNames((n) => n.map((x, i) => s.names[i] || x));
      setRoster(s.roster);
    }
  }, [persist]);
  useEffect(() => {
    if (!persist || !mounted) return;
    try {
      localStorage.setItem(SAVE, JSON.stringify({ names, roster }));
    } catch {
      /* เต็ม/ปิดไว้ */
    }
  }, [names, roster, persist, mounted]);

  useEffect(() => {
    setMusic('room', roomTrack(cfg.music, 'shape'));
    return () => releaseMusic('room');
  }, [cfg.music]);

  const totalRounds = cfg.rounds || Math.max(1, questions.length);
  const q: QuizQuestion | null = qi >= 0 ? questions[qi] || null : null;
  /** ภารกิจต้องพอดีกับทีมที่คนน้อยที่สุด (ทุกทีมทำพร้อมกัน) */
  const people = cfg.teams ? Math.max(1, Math.min(...(ents.length ? ents.map((e) => e.size) : [cfg.players]))) : 1;
  const rosterNames = useMemo(() => roster.split(/\r?\n|,/).map((s) => s.trim().slice(0, 30)).filter(Boolean).slice(0, 120), [roster]);
  const choiceCount = q && q.kind !== 'text' ? q.choices.length : 0;
  const answerText = useMemo(() => {
    if (!q) return '';
    if (q.kind === 'text') return (q.answers || []).join(' / ');
    return q.choices.filter((c) => c.correct).map((c) => richToPlain(c.text, 60)).join(' / ');
  }, [q]);

  /* ------------------------------ เลือกภารกิจ ------------------------------ */

  const chooseMission = useCallback(
    (qq: QuizQuestion | null, n: number, avoid: string[]) => {
      if (cfg.pattern === 1 && qq && qq.kind !== 'text' && qq.choices.length) {
        const ms = answerMissions(qq.choices.length, n);
        setAnsMs(ms);
        setTab(0);
        return ms[0];
      }
      setAnsMs([]);
      if (cfg.pattern === 1) return pickMission(n, catBit('cre') | catBit('con'), cfg.level, Math.random, avoid);
      if (cfg.pattern === 2 && qq) {
        const ans = qq.kind === 'text' ? qq.answers?.[0] || '' : qq.choices.filter((c) => c.correct).map((c) => richToPlain(c.text, 60)).join(' ');
        return missionForText(richToPlain(qq.text, 400), ans, n, cfg.cats, cfg.level);
      }
      if (cfg.pick === 1) return null;
      return pickMission(n, cfg.cats, cfg.level, Math.random, avoid);
    },
    [cfg]
  );

  const applyMission = useCallback(
    (m: Mission | null, n = people) => {
      setMission(m);
      setUseN(m ? useCount(m, n) : 1);
      setStep(0);
      setHiKid(-1);
      if (m) recent.current = [m.id, ...recent.current.filter((x) => x !== m.id)].slice(0, 6);
    },
    [people]
  );

  const resetTimer = useCallback(() => {
    setRunning(false);
    setCount(0);
    setTimerUsed(false);
    setRemain(cfg.time);
    lastTick.current = -1;
  }, [cfg.time]);

  const beginRound = useCallback(
    (r: number, qs: number[], es: Ent[]) => {
      const idx = qs.length ? qs[r % qs.length] : -1;
      const qq = idx >= 0 ? questions[idx] : null;
      const n = cfg.teams ? Math.max(1, Math.min(...es.map((e) => e.size))) : 1;
      setRound(r);
      setQi(idx);
      setReveal(false);
      setJudges(es.map(() => ({ ...EMPTY_JUDGE })));
      setSel(-1);
      setAuto(false);
      resetTimer();
      const m = chooseMission(qq, n, recent.current);
      applyMission(m, n);
      setPicker(!m && cfg.pattern === 0);
      setPhase(qq ? 'question' : 'challenge');
    },
    [questions, cfg, chooseMission, applyMission, resetTimer]
  );

  const startGame = () => {
    gsfx.start();
    let es: Ent[];
    if (cfg.teams) {
      const groups = split && split.length === cfg.teams ? split : null;
      es = Array.from({ length: cfg.teams }, (_, i) => ({
        name: (names[i] || TEAM_DEFAULT[i]).trim() || TEAM_DEFAULT[i],
        size: groups ? Math.max(1, groups[i].length) : cfg.players,
        color: TEAM_COLORS[i % TEAM_COLORS.length],
        score: 0,
        ok: 0,
        correct: 0,
        members: groups ? groups[i] : [],
      }));
    } else {
      const list = rosterNames.length ? rosterNames.slice(0, 40) : Array.from({ length: cfg.players }, (_, i) => `ผู้เล่น ${i + 1}`);
      es = list.map((nm, i) => ({ name: nm, size: 1, color: TEAM_COLORS[i % TEAM_COLORS.length], score: 0, ok: 0, correct: 0, members: [] }));
    }
    const order = questions.map((_, i) => i);
    if (cfg.order === 1)
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    setEnts(es);
    setQueue(order);
    setHist([]);
    recent.current = [];
    beginRound(0, order, es);
  };

  /* ------------------------------ จับเวลา ------------------------------ */

  const startTimer = () => {
    if (paused || count > 0) return;
    if (!timerUsed && !reducedMotion()) {
      setPhase('playing');
      setCount(3);
      gsfx.count();
      return;
    }
    realStart();
  };
  useEffect(() => {
    if (count <= 0 || paused) return;
    const id = window.setTimeout(() => {
      if (count === 1) {
        setCount(0);
        realStart();
      } else {
        gsfx.count();
        setCount(count - 1);
      }
    }, 850);
    return () => window.clearTimeout(id);
  });
  const realStart = () => {
    gsfx.go();
    const left = remain > 0 ? remain : cfg.time;
    endAt.current = Date.now() + left * 1000;
    setRemain(left);
    setRunning(true);
    setTimerUsed(true);
    setPhase('playing');
  };
  const stopTimer = () => {
    if (!running) return;
    gsfx.tap();
    setRemain(Math.max(0, (endAt.current - Date.now()) / 1000));
    setRunning(false);
  };
  useEffect(() => {
    if (!running || paused) return;
    const id = window.setInterval(() => {
      const left = Math.max(0, (endAt.current - Date.now()) / 1000);
      setRemain(left);
      const s = Math.ceil(left);
      if (s !== lastTick.current && s <= 5 && s > 0) gsfx.tick(true);
      lastTick.current = s;
      if (left <= 0) {
        setRunning(false);
        gsfx.timeout();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [running, paused]);

  const togglePause = () => {
    gsfx.tap();
    if (!paused) {
      if (running) {
        setRemain(Math.max(0, (endAt.current - Date.now()) / 1000));
        setRunning(false);
        resumeTimer.current = true;
      }
      setPaused(true);
    } else {
      setPaused(false);
      if (resumeTimer.current) {
        resumeTimer.current = false;
        endAt.current = Date.now() + remain * 1000;
        setRunning(true);
      }
    }
  };

  /* ------------------------------ ภาพสาธิต ------------------------------ */

  const demoMission = cfg.pattern === 1 && ansMs.length ? ansMs[Math.min(tab, ansMs.length - 1)] : mission;
  const demoN = demoMission ? (demoMission === mission ? useN : useCount(demoMission, people)) : 1;
  const frames = useMemo(() => (demoMission ? stageFrames(demoMission, demoN) : null), [demoMission, demoN]);
  useEffect(() => {
    if (!auto || phase !== 'demo') return;
    if (step >= STEPS.length - 1) {
      setAuto(false);
      return;
    }
    const id = window.setTimeout(() => (gsfx.pick(), setStep((s) => Math.min(STEPS.length - 1, s + 1))), 2300);
    return () => window.clearTimeout(id);
  }, [auto, step, phase]);
  useEffect(() => {
    if (phase === 'demo' && step === 3) gsfx.correct();
  }, [phase, step]);

  /* ------------------------------ ตัดสิน/คะแนน ------------------------------ */

  const targets = sel < 0 ? ents.map((_, i) => i) : [sel];
  const judge = (patch: Partial<Judge> | ((j: Judge) => Partial<Judge>)) =>
    setJudges((js) => js.map((j, i) => (targets.includes(i) ? { ...j, ...(typeof patch === 'function' ? patch(j) : patch) } : j)));
  const markAns = (v: boolean) => {
    v ? gsfx.correct() : gsfx.wrong();
    judge({ ans: v });
  };
  const markMis = (v: boolean) => {
    v ? gsfx.streak() : gsfx.wrong();
    if (running) stopTimer();
    setCount(0);
    judge({ mis: v });
    if (phase !== 'result') setPhase('result');
  };
  const bonusRemain = timerUsed ? remain : 0;
  const pointsOf = (i: number) => roundPoints(cfg.pts, judges[i] || EMPTY_JUDGE, bonusRemain, cfg.time, cfg.scoring);
  const addPoints = (d: number) => {
    gsfx.pick();
    if (phase === 'board' || phase === 'summary') setEnts((es) => es.map((e, i) => (targets.includes(i) ? { ...e, score: addScore(e.score, d) } : e)));
    else judge((j) => ({ bonus: j.bonus + d }));
  };
  const editScore = (i: number, d: number) => (gsfx.tap(), setEnts((es) => es.map((e, k) => (k === i ? { ...e, score: addScore(e.score, d) } : e))));

  const saveResult = () => {
    if (running) stopTimer();
    setCount(0);
    const res = ents.map((_, i) => ({ ans: judges[i]?.ans ?? null, mis: judges[i]?.mis ?? null, pts: pointsOf(i) }));
    setEnts((es) =>
      es.map((e, i) => ({
        ...e,
        score: addScore(e.score, res[i].pts),
        ok: e.ok + (res[i].mis ? 1 : 0),
        correct: e.correct + (res[i].ans ? 1 : 0),
      }))
    );
    setHist((h) => [...h, { round, q: q ? richToPlain(q.text, 80) : '-', mission: mission?.name || demoMission?.name || '-', res }]);
    if (res.some((r) => r.mis)) {
      gsfx.fanfare();
      if (!reducedMotion()) setParty((p) => p + 1);
    } else gsfx.whoosh();
    setPhase('board');
  };

  const nextRound = () => {
    if (round + 1 >= totalRounds) return finish();
    gsfx.whoosh();
    beginRound(round + 1, queue, ents);
  };
  const skipQuestion = () => {
    gsfx.tap();
    setHist((h) => [...h, { round, q: q ? richToPlain(q.text, 80) : '-', mission: mission?.name || '-', res: ents.map(() => ({ ans: null, mis: null, pts: 0 })), skipped: true }]);
    nextRound();
  };
  const finish = () => {
    setConfirmEnd(false);
    setCount(0);
    setRunning(false);
    setPaused(false);
    gsfx.fanfare();
    if (!reducedMotion()) setParty((p) => p + 1);
    setPhase('summary');
  };

  const randomQuestion = () => {
    if (questions.length < 2) return;
    gsfx.whoosh();
    let idx = qi;
    for (let k = 0; k < 8 && idx === qi; k++) idx = Math.floor(Math.random() * questions.length);
    const qq = questions[idx];
    setQi(idx);
    setReveal(false);
    setJudges(ents.map(() => ({ ...EMPTY_JUDGE })));
    if (cfg.pattern !== 0) applyMission(chooseMission(qq, people, recent.current));
    setPhase('question');
  };
  const randomMission = () => {
    gsfx.whoosh();
    const m =
      cfg.pattern === 2 && q
        ? missionForText(richToPlain(q.text, 400), answerText, people, cfg.cats, cfg.level)
        : pickMission(people, cfg.cats, cfg.level, Math.random, [mission?.id || '', ...recent.current]);
    // C ได้ภารกิจเดิมซ้ำ = สุ่มจากหมวดที่เลือกแทน
    const pickM = m.id === mission?.id ? pickMission(people, cfg.cats, cfg.level, Math.random, [m.id]) : m;
    applyMission(pickM);
    roll(pickM.name);
    setAnsMs([]);
    setPicker(false);
    if (phase !== 'challenge') setPhase('challenge');
  };
  /** หมุนสุ่มชื่อภารกิจให้ลุ้นก่อนเผยภารกิจจริง */
  const roll = (finalName: string) => {
    if (reducedMotion()) return;
    const names = missionPool(people, cfg.cats).map((m) => m.name);
    let k = 0;
    setRolling(finalName);
    const id = window.setInterval(() => {
      k++;
      gsfx.tick();
      setRolling(names[Math.floor(Math.random() * names.length)] || finalName);
      if (k >= 12) {
        window.clearInterval(id);
        setRolling(null);
        gsfx.correct();
      }
    }, 85);
  };
  const showDemo = () => {
    if (!demoMission) return setPicker(true);
    gsfx.pick();
    setStep(0);
    setAuto(true);
    setPhase('demo');
  };

  const exitGame = () => {
    gsfx.tap();
    onExit();
  };
  const fullScreen = () => {
    gsfx.tap();
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  // คีย์ลัดของครู: H = ซ่อน/แสดงแผงควบคุม, P = หยุด/เล่นต่อ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.code === 'KeyH') setDock((d) => !d);
      if (e.code === 'KeyP' && phase !== 'start' && phase !== 'summary') togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!mounted) return null;

  const judgingNow = phase === 'question' || phase === 'challenge' || phase === 'demo' || phase === 'playing' || phase === 'result';
  const ctls: Record<CtlId, { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; tone?: string; on?: boolean }> = {
    restart: { icon: <RotateCcw className="w-5 h-5" />, label: 'เริ่มเกมใหม่', onClick: () => (gsfx.tap(), setRunning(false), setPaused(false), setCount(0), setPhase('start')) },
    pause: { icon: <Pause className="w-5 h-5" />, label: 'หยุดเกม', onClick: togglePause, disabled: paused },
    resume: { icon: <Play className="w-5 h-5" />, label: 'เล่นต่อ', onClick: togglePause, disabled: !paused },
    skip: { icon: <SkipForward className="w-5 h-5" />, label: 'ข้ามคำถาม', onClick: skipQuestion, disabled: phase === 'board' },
    next: { icon: <ChevronsRight className="w-5 h-5" />, label: 'เล่นรอบถัดไป', onClick: nextRound, disabled: phase !== 'board', tone: 'go' },
    end: { icon: <Flag className="w-5 h-5" />, label: 'จบเกม', onClick: () => (gsfx.tap(), setConfirmEnd(true)), tone: 'no' },
    rq: { icon: <Shuffle className="w-5 h-5" />, label: 'สุ่มคำถาม', onClick: randomQuestion, disabled: questions.length < 2 || phase === 'board' },
    rm: { icon: <Wand2 className="w-5 h-5" />, label: 'สุ่มภารกิจ', onClick: randomMission, disabled: phase === 'board' || (cfg.pattern === 1 && ansMs.length > 0) },
    demo: { icon: <Eye className="w-5 h-5" />, label: 'ดูภาพสาธิต', onClick: showDemo, disabled: phase === 'board', on: phase === 'demo' },
    reveal: { icon: <Lightbulb className="w-5 h-5" />, label: reveal ? 'ซ่อนเฉลย' : 'แสดงเฉลย', onClick: () => (gsfx.tap(), setReveal((r) => !r), phase !== 'question' && phase !== 'result' && setPhase('question')), disabled: !q || phase === 'board', on: reveal },
    tstart: { icon: <Timer className="w-5 h-5" />, label: 'เริ่มจับเวลา', onClick: startTimer, disabled: running || count > 0 || phase === 'board' || paused, tone: 'go' },
    tstop: { icon: <Square className="w-5 h-5" />, label: 'หยุดจับเวลา', onClick: stopTimer, disabled: !running },
    ok: { icon: <Check className="w-5 h-5" />, label: 'ตอบถูก', onClick: () => markAns(true), disabled: !judgingNow || !q, tone: 'ok' },
    no: { icon: <X className="w-5 h-5" />, label: 'ตอบผิด', onClick: () => markAns(false), disabled: !judgingNow || !q, tone: 'no' },
    win: { icon: <Star className="w-5 h-5" />, label: 'ภารกิจสำเร็จ', onClick: () => markMis(true), disabled: !judgingNow, tone: 'ok' },
    lose: { icon: <RotateCcw className="w-5 h-5" />, label: 'ภารกิจไม่สำเร็จ', onClick: () => markMis(false), disabled: !judgingNow, tone: 'no' },
    plus: { icon: <Plus className="w-5 h-5" />, label: 'เพิ่มคะแนน +5', onClick: () => addPoints(5), disabled: !cfg.scoring },
    save: { icon: <ListChecks className="w-5 h-5" />, label: 'บันทึกผลภารกิจ', onClick: saveResult, disabled: !judgingNow, tone: 'go' },
  };

  /* ------------------------------ ส่วนแสดงผล ------------------------------ */

  const inGame = phase !== 'start' && phase !== 'summary';
  const judging = phase === 'question' || phase === 'challenge' || phase === 'demo' || phase === 'playing' || phase === 'result';
  const timerShown = phase === 'playing' || phase === 'result' || timerUsed;
  const urgent = running && remain <= 5;
  const order = ranks(ents.map((e) => e.score));

  const QuestionView = () =>
    q ? (
      <div className="hs-card hs-q hs-pop">
        <div className="hs-kicker">
          <Lightbulb className="w-5 h-5" /> คำถามรอบที่ {round + 1}
        </div>
        <h2 className="hs-qtext">
          <MathText value={q.text} />
        </h2>
        {q.media?.kind === 'image' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="hs-qimg" src={q.media.url} alt="" />
        )}
        {q.kind !== 'text' ? (
          <div className="hs-choices">
            {q.choices.map((c, i) => (
              <div key={c.id} className="hs-choice" data-ok={reveal && c.correct ? 1 : 0} data-dim={reveal && !c.correct ? 1 : 0}>
                <b>{i + 1}</b>
                <span>
                  <MathText value={c.text} />
                </span>
                {c.media?.kind === 'image' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.media.url} alt="" />
                )}
                {reveal && c.correct && <Check className="w-6 h-6 hs-tick" strokeWidth={4} />}
              </div>
            ))}
          </div>
        ) : (
          <div className="hs-textans">{reveal ? <>เฉลย: <b>{answerText || '-'}</b></> : 'ให้นักเรียนตอบปากเปล่า หรือเขียนบนกระดาน'}</div>
        )}
        <p className="hs-hint">
          {cfg.pattern === 0
            ? 'ตอบคำถามก่อน ครูกด ตอบถูก/ตอบผิด แล้วไปทำภารกิจ'
            : cfg.pattern === 1
              ? 'ตอบด้วยร่างกาย: ทำรูปตามหมายเลขคำตอบที่เลือก'
              : 'ทำภารกิจที่เกี่ยวกับคำถาม แล้วอธิบายว่าเกี่ยวกันอย่างไร'}
        </p>
        <div className="hs-row">
          <button type="button" className="hs-btn" onClick={() => (gsfx.tap(), setReveal((r) => !r))}>
            <Eye className="w-5 h-5" /> {reveal ? 'ซ่อนเฉลย' : 'แสดงเฉลย'}
          </button>
          <button type="button" className="hs-btn hs-go" onClick={() => (gsfx.pick(), setPhase('challenge'), !mission ? setPicker(true) : cfg.pattern !== 1 && roll(mission.name))}>
            {cfg.pattern === 1 ? 'ดูท่าตอบ' : 'ไปที่ภารกิจ'} <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    ) : null;

  const ChallengeView = () => {
    const cat = demoMission ? CATS.find((c) => c.id === demoMission.cat) : null;
    const maxUse = mission ? Math.min(mission.max, people) : 1;
    return (
      <div className="hs-card hs-chal hs-pop">
        <div className="hs-kicker">
          <Wand2 className="w-5 h-5" /> ภารกิจสร้างรูป
        </div>
        {cfg.pattern === 1 && ansMs.length ? (
          <>
            <h2 className="hs-mname">ตอบด้วยร่างกาย</h2>
            <p className="hs-hint">เลือกคำตอบข้อไหน ให้ทั้ง{cfg.teams ? 'ทีม' : 'ตัว'}ทำรูปของข้อนั้น</p>
            <div className="hs-legend">
              {ansMs.map((m, i) => (
                <button key={m.id} type="button" className="hs-leg" data-on={tab === i ? 1 : 0} onClick={() => (gsfx.tap(), setTab(i))}>
                  <MiniStage m={m} n={useCount(m, people)} />
                  <b>คำตอบ {i + 1}</b>
                  <span>{m.id.startsWith('ans-') ? m.build(1)[0].role : m.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : rolling ? (
          <div className="hs-roll" aria-live="polite">
            <span>กำลังสุ่มภารกิจ</span>
            <b key={rolling}>{rolling}</b>
          </div>
        ) : demoMission ? (
          <>
            <h2 className="hs-mname hs-reveal">สร้าง{demoMission.name.replace(/\s*\(.*\)$/, '')}</h2>
            <div className="hs-tags">
              {cat && (
                <span className="hs-tag" style={{ ['--c' as string]: cat.color }}>
                  {cat.name}
                </span>
              )}
              <span className="hs-tag">ระดับ{LEVELS[demoMission.level]}</span>
              <span className="hs-tag">{demoMission.view === 'top' ? 'นอนบนพื้น มองจากด้านบน' : 'ยืนมองจากด้านหน้า'}</span>
            </div>
            <div className="hs-chal-stage">
              <MiniStage m={demoMission} n={useN} />
            </div>
            <div className="hs-count">
              <span>
                <Users className="w-5 h-5" /> ใช้สมาชิก
              </span>
              <button type="button" className="hs-round" disabled={useN <= demoMission.min} onClick={() => (gsfx.tap(), setUseN((n) => n - 1))} aria-label="ลดจำนวนคน">
                <Minus className="w-5 h-5" />
              </button>
              <b>{useN} คน</b>
              <button type="button" className="hs-round" disabled={useN >= maxUse} onClick={() => (gsfx.tap(), setUseN((n) => n + 1))} aria-label="เพิ่มจำนวนคน">
                <Plus className="w-5 h-5" />
              </button>
              {people > useN && <em>อีก {people - useN} คนเป็นผู้ช่วยตรวจท่า</em>}
            </div>
            <p className="hs-hint">{demoMission.tip}</p>
          </>
        ) : (
          <p className="hs-hint">ครูเลือกภารกิจให้รอบนี้</p>
        )}
        <div className="hs-row">
          <button type="button" className="hs-btn" onClick={randomMission} disabled={cfg.pattern === 1 && ansMs.length > 0}>
            <Shuffle className="w-5 h-5" /> สุ่มภารกิจ
          </button>
          <button type="button" className="hs-btn" onClick={() => (gsfx.tap(), setPicker(true))} disabled={cfg.pattern === 1 && ansMs.length > 0}>
            <ListChecks className="w-5 h-5" /> เลือกเอง
          </button>
          <button type="button" className="hs-btn hs-go" onClick={showDemo}>
            <Eye className="w-5 h-5" /> ดูภาพสาธิต
          </button>
        </div>
      </div>
    );
  };

  const DemoView = () => {
    if (!frames || !demoMission) return null;
    const st = STEPS[step];
    const roles = frames.final;
    const stepText = [
      `ใช้ ${roles.length} คน ดูหมายเลขและหน้าที่ของตัวเอง`,
      demoMission.view === 'top' ? 'เดินไปยืนตรงจุดของตัวเองบนพื้น' : 'ยืนเรียงตามตำแหน่งในภาพ',
      demoMission.view === 'top' ? 'ค่อยๆ นั่งแล้วนอนราบบนพื้น ทำท่าตามภาพ' : 'ทำท่าตามภาพ ค้างไว้',
      `รวมกันได้รูป${demoMission.name.replace(/\s*\(.*\)$/, '')}`,
      'ค้างท่าไว้ 5 วินาที ให้ครูตรวจผลงาน',
    ][step];
    return (
      <div className="hs-demo hs-pop">
        <div className="hs-demo-main">
          {cfg.pattern === 1 && ansMs.length > 0 && (
            <div className="hs-tabs">
              {ansMs.map((m, i) => (
                <button key={m.id} type="button" data-on={tab === i ? 1 : 0} onClick={() => (gsfx.tap(), setTab(i), setStep(3))}>
                  คำตอบ {i + 1}
                </button>
              ))}
            </div>
          )}
          <div className="hs-stagewrap" data-step={st.step}>
            <KidStage
              figs={figsFor(frames, st.step)}
              box={frames.box}
              view={demoMission.view}
              outline={frames.outline}
              showOutline={step >= 3}
              hi={hiKid}
              check={step === 4}
              stagger={step === 2 ? 160 : 70}
              label={`ภาพสาธิต ${demoMission.name} ขั้นที่ ${step + 1}`}
            />
            {step >= 3 && (
              <div className="hs-sparks" aria-hidden="true">
                {Array.from({ length: 10 }, (_, i) => (
                  <i key={`${step}-${i}`} style={{ left: `${8 + ((i * 37) % 86)}%`, top: `${10 + ((i * 53) % 70)}%`, animationDelay: `${i * 0.08}s` }} />
                ))}
              </div>
            )}
            <div className="hs-ba">
              <button type="button" data-on={step === 0 ? 1 : 0} onClick={() => (gsfx.tap(), setAuto(false), setStep(0))}>
                ก่อน
              </button>
              <button type="button" data-on={step >= 3 ? 1 : 0} onClick={() => (gsfx.tap(), setAuto(false), setStep(3))}>
                หลัง
              </button>
            </div>
          </div>
          <div className="hs-stepbar">
            <button type="button" className="hs-round" disabled={step === 0} onClick={() => (gsfx.tap(), setAuto(false), setStep((s) => s - 1))} aria-label="ขั้นก่อนหน้า">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="hs-steptext">
              <b>
                ขั้นที่ {step + 1}: {st.title}
              </b>
              <span>{stepText}</span>
            </div>
            <button type="button" className="hs-round" onClick={() => (gsfx.tap(), setAuto((a) => !a))} aria-label={auto ? 'หยุดเล่นอัตโนมัติ' : 'เล่นอัตโนมัติ'}>
              {auto ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button type="button" className="hs-round" disabled={step >= STEPS.length - 1} onClick={() => (gsfx.pick(), setAuto(false), setStep((s) => s + 1))} aria-label="ขั้นถัดไป">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <div className="hs-dots">
            {STEPS.map((s, i) => (
              <button key={s.step} type="button" data-on={i === step ? 1 : i < step ? 2 : 0} onClick={() => (gsfx.tap(), setAuto(false), setStep(i))} aria-label={s.title} />
            ))}
          </div>
        </div>
        <aside className="hs-roles">
          <h3>
            <Users className="w-5 h-5" /> ใครทำอะไร
          </h3>
          <ol>
            {roles.map((f, i) => (
              <li key={i} data-on={hiKid === i ? 1 : 0}>
                <button type="button" onMouseEnter={() => setHiKid(i)} onMouseLeave={() => setHiKid(-1)} onClick={() => setHiKid((h) => (h === i ? -1 : i))}>
                  <b>{i + 1}</b>
                  <span>{f.role}</span>
                </button>
              </li>
            ))}
          </ol>
          {people > roles.length && <p className="hs-extra">อีก {people - roles.length} คน: เป็นผู้ช่วยตรวจท่า และนับถอยหลังให้ทีม</p>}
          <p className="hs-safe">
            <Shield className="w-4 h-4" /> {SAFETY}
          </p>
          <p className="hs-safe hs-safe2">
            <Hand className="w-4 h-4" /> {EASY_ROLE}
          </p>
          <button type="button" className="hs-btn hs-go hs-wide" onClick={startTimer}>
            <Timer className="w-5 h-5" /> เริ่มลงมือทำ
          </button>
        </aside>
      </div>
    );
  };

  const PlayingView = () => {
    const pct = cfg.time ? Math.max(0, Math.min(1, remain / cfg.time)) : 0;
    return (
      <div className="hs-play hs-pop">
        <div className="hs-clock" data-urgent={urgent ? 1 : 0} data-done={remain <= 0 ? 1 : 0}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="12" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={urgent ? '#ff5a6e' : '#ffd23f'} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${pct * 326.7} 326.7`} transform="rotate(-90 60 60)" />
          </svg>
          <b>{remain <= 0 ? 'หมดเวลา' : fmt(remain)}</b>
          <span>{running ? 'กำลังสร้างรูป' : remain <= 0 ? 'ค้างท่าไว้ ให้ครูตรวจ' : 'หยุดเวลาแล้ว'}</span>
        </div>
        {demoMission && frames && (
          <div className="hs-play-ref">
            <KidStage figs={frames.final} box={frames.boxFinal} view={demoMission.view} outline={frames.outline} showOutline stagger={40} label={demoMission.name} />
            <b>{cfg.pattern === 1 && ansMs.length ? 'ทำรูปตามหมายเลขคำตอบ' : demoMission.name}</b>
          </div>
        )}
        <div className="hs-row">
          {running ? (
            <button type="button" className="hs-btn" onClick={stopTimer}>
              <Square className="w-5 h-5" /> หยุดจับเวลา
            </button>
          ) : (
            <button type="button" className="hs-btn" onClick={startTimer}>
              <Play className="w-5 h-5" /> {remain <= 0 ? 'จับเวลาใหม่' : 'จับเวลาต่อ'}
            </button>
          )}
          <button type="button" className="hs-btn hs-go" onClick={() => (stopTimer(), setCount(0), gsfx.pick(), setPhase('result'))}>
            <Flag className="w-5 h-5" /> ตัดสินผล
          </button>
        </div>
      </div>
    );
  };

  const Toggle = ({ on, tone, onClick, children }: { on: boolean; tone: string; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" className="hs-tg" data-tone={tone} data-on={on ? 1 : 0} onClick={onClick}>
      {children}
    </button>
  );

  const ResultView = () => (
    <div className="hs-card hs-result hs-pop">
      <div className="hs-kicker">
        <Flag className="w-5 h-5" /> ครูตัดสินผล รอบที่ {round + 1}
      </div>
      {q && (
        <p className="hs-ans">
          เฉลย: <b>{answerText || '-'}</b>
        </p>
      )}
      <div className="hs-judge">
        {ents.map((e, i) => {
          const j = judges[i] || EMPTY_JUDGE;
          const one = (p: Partial<Judge>) => (gsfx.tap(), setJudges((js) => js.map((x, k) => (k === i ? { ...x, ...p } : x))));
          return (
            <div key={i} className="hs-jrow" style={{ ['--c' as string]: e.color }}>
              <div className="hs-jname">{e.name}</div>
              <div className="hs-jbtns">
                {q && (
                  <span className="hs-pair">
                    <Toggle on={j.ans === true} tone="ok" onClick={() => one({ ans: j.ans === true ? null : true })}>
                      ตอบถูก
                    </Toggle>
                    <Toggle on={j.ans === false} tone="no" onClick={() => one({ ans: j.ans === false ? null : false })}>
                      ตอบผิด
                    </Toggle>
                  </span>
                )}
                <span className="hs-pair">
                  <Toggle on={j.mis === true} tone="ok" onClick={() => one({ mis: j.mis === true ? null : true })}>
                    ภารกิจสำเร็จ
                  </Toggle>
                  <Toggle on={j.mis === false} tone="no" onClick={() => one({ mis: j.mis === false ? null : false })}>
                    ไม่สำเร็จ
                  </Toggle>
                </span>
                <Toggle on={j.cond} tone="star" onClick={() => one({ cond: !j.cond })}>
                  เงื่อนไขครบ
                </Toggle>
                <Toggle on={j.team} tone="star" onClick={() => one({ team: !j.team })}>
                  {cfg.teams ? 'ร่วมมือดี' : 'ตั้งใจดี'}
                </Toggle>
                {cfg.scoring && (
                  <span className="hs-pair hs-bonus">
                    <button type="button" className="hs-round" onClick={() => one({ bonus: j.bonus - 1 })} aria-label="ลดคะแนน">
                      <Minus className="w-4 h-4" />
                    </button>
                    <em>{j.bonus >= 0 ? `+${j.bonus}` : j.bonus}</em>
                    <button type="button" className="hs-round" onClick={() => one({ bonus: j.bonus + 1 })} aria-label="เพิ่มคะแนน">
                      <Plus className="w-4 h-4" />
                    </button>
                  </span>
                )}
              </div>
              <div className="hs-jpts">{cfg.scoring ? `+${pointsOf(i)}` : j.mis ? <Star className="w-6 h-6" fill="#ffd23f" /> : null}</div>
            </div>
          );
        })}
      </div>
      {cfg.scoring && timerUsed && <p className="hs-hint">โบนัสเวลา (เมื่อภารกิจสำเร็จ): +{timeBonus(cfg.pts.time, remain, cfg.time)} คะแนน จากเวลาที่เหลือ {fmt(remain)}</p>}
      <div className="hs-row">
        <button type="button" className="hs-btn" onClick={() => (gsfx.tap(), setJudges((js) => js.map((x) => ({ ...x, mis: true }))))}>
          <Check className="w-5 h-5" /> ทุก{cfg.teams ? 'ทีม' : 'คน'}สำเร็จ
        </button>
        <button type="button" className="hs-btn hs-go" onClick={saveResult}>
          <Check className="w-5 h-5" /> บันทึกผลภารกิจ
        </button>
      </div>
    </div>
  );

  const Board = ({ final }: { final?: boolean }) => {
    const idx = ents.map((_, i) => i);
    if (cfg.scoring) idx.sort((a, b) => ents[b].score - ents[a].score);
    const top = Math.max(1, ...ents.map((e) => e.score));
    return (
      <div className={`hs-board ${cfg.scoring ? '' : 'hs-board-free'}`}>
        {idx.map((i, k) => {
          const e = ents[i];
          return (
            <div key={i} className="hs-brow" style={{ ['--c' as string]: e.color, animationDelay: `${k * 0.07}s` }}>
              {cfg.scoring && <span className="hs-rank" data-r={order[i]}>{order[i]}</span>}
              <div className="hs-bname">
                <b>{e.name}</b>
                <span>
                  ภารกิจสำเร็จ {e.ok} | ตอบถูก {e.correct}
                </span>
                {cfg.scoring && (
                  <i className="hs-bar">
                    <i style={{ width: `${(e.score / top) * 100}%` }} />
                  </i>
                )}
              </div>
              {cfg.scoring ? (
                <>
                  <b className="hs-bscore">{e.score}</b>
                  {!final && (
                    <span className="hs-pair">
                      <button type="button" className="hs-round" onClick={() => editScore(i, -1)} aria-label={`ลดคะแนน ${e.name}`}>
                        <Minus className="w-4 h-4" />
                      </button>
                      <button type="button" className="hs-round" onClick={() => editScore(i, 1)} aria-label={`เพิ่มคะแนน ${e.name}`}>
                        <Plus className="w-4 h-4" />
                      </button>
                    </span>
                  )}
                </>
              ) : (
                <span className="hs-stars">
                  {Array.from({ length: Math.min(10, e.ok) }, (_, s) => (
                    <Star key={s} className="w-5 h-5" fill="#ffd23f" />
                  ))}
                  {e.ok > 10 && <b>+{e.ok - 10}</b>}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const BoardView = () => (
    <div className="hs-card hs-pop">
      <div className="hs-kicker">
        <Trophy className="w-5 h-5" /> {cfg.scoring ? 'ตารางคะแนน' : 'ภารกิจที่ทำสำเร็จ (ไม่มีการแข่งขัน)'} หลังรอบที่ {round + 1}/{totalRounds}
      </div>
      <Board />
      <div className="hs-row">
        <button type="button" className="hs-btn hs-go" onClick={nextRound}>
          {round + 1 >= totalRounds ? (
            <>
              <Trophy className="w-5 h-5" /> ดูสรุปผล
            </>
          ) : (
            <>
              <ChevronsRight className="w-5 h-5" /> เล่นรอบถัดไป
            </>
          )}
        </button>
      </div>
    </div>
  );

  const SummaryView = () => {
    const best = Math.max(...ents.map((e) => (cfg.scoring ? e.score : e.ok)));
    const winners = ents.filter((e) => (cfg.scoring ? e.score : e.ok) === best && best > 0);
    const played = hist.filter((h) => !h.skipped).length;
    return (
      <div className="hs-card hs-sum hs-pop">
        <div className="hs-kicker">
          <Trophy className="w-5 h-5" /> สรุปผลการเล่น
        </div>
        <h2 className="hs-mname">{cfg.scoring && winners.length ? `เก่งที่สุด: ${winners.map((w) => w.name).join(', ')}` : 'ทุกคนช่วยกันสร้างรูปได้เยี่ยม'}</h2>
        <div className="hs-sumstats">
          <span>
            <b>{played}</b> รอบที่เล่น
          </span>
          <span>
            <b>{ents.reduce((a, e) => a + e.ok, 0)}</b> ภารกิจสำเร็จ
          </span>
          <span>
            <b>{ents.reduce((a, e) => a + e.correct, 0)}</b> ตอบถูก
          </span>
        </div>
        <Board final />
        {hist.length > 0 && (
          <details className="hs-hist">
            <summary>ดูผลทีละรอบ</summary>
            <ol>
              {hist.map((h, i) => (
                <li key={i}>
                  <b>รอบ {h.round + 1}</b> {h.skipped ? '(ข้าม)' : h.mission}
                  <span>{h.q}</span>
                  <em>{h.res.map((r, k) => `${ents[k]?.name || ''} ${r.mis ? 'สำเร็จ' : r.mis === false ? 'ไม่สำเร็จ' : '-'}${cfg.scoring ? ` +${r.pts}` : ''}`).join(' | ')}</em>
                </li>
              ))}
            </ol>
          </details>
        )}
        <div className="hs-row">
          <button type="button" className="hs-btn" onClick={exitGame}>
            <LogOut className="w-5 h-5" /> ออกจากเกม
          </button>
          <button type="button" className="hs-btn hs-go" onClick={() => (gsfx.tap(), setPhase('start'))}>
            <RotateCcw className="w-5 h-5" /> เล่นอีกครั้ง
          </button>
        </div>
      </div>
    );
  };

  const StartView = () => (
    <div className="hs-start hs-pop">
      <div className="hs-hero">
        <HeroLoop />
        <div className="hs-hero-txt">
          <p className="hs-brand">Human Shape Builder</p>
          <h1>เกมมนุษย์สร้างรูป</h1>
          <p>เปลี่ยนร่างกายให้เป็นคำตอบ ครูคุมเกมจากเครื่องนี้เครื่องเดียว นักเรียนไม่ต้องใช้มือถือ</p>
          <p className="hs-set">ชุดคำถาม: {title}</p>
        </div>
      </div>
      <div className="hs-card hs-startcard">
        <div className="hs-chipsum">
          <span>{cfg.teams ? `${cfg.teams} ทีม ทีมละ ${cfg.players} คน` : `เล่นเดี่ยว ${rosterNames.length || cfg.players} คน`}</span>
          <span>ระดับ{LEVELS[cfg.level]}</span>
          <span>{['แบบ A', 'แบบ B', 'แบบ C'][cfg.pattern]}</span>
          <span>{totalRounds} รอบ</span>
          <span>{cfg.time < 60 ? `${cfg.time} วินาที` : `${cfg.time / 60} นาที`}/ภารกิจ</span>
          <span>{cfg.scoring ? 'มีคะแนน' : 'ไม่แข่งขัน'}</span>
          <button type="button" className="hs-btn hs-sm" onClick={() => (gsfx.tap(), setShowSetup((s) => !s))}>
            <SlidersHorizontal className="w-4 h-4" /> {showSetup ? 'ปิดตั้งค่า' : 'ตั้งค่าเกม'}
          </button>
        </div>
        {showSetup && (
          <div className="hs-setupbox">
            <ShapeSetup value={cfg} onChange={(v) => (setCfg(v), setSplit(null))} usable={questions.length} />
          </div>
        )}
        {cfg.teams > 0 && (
          <div className="hs-teams">
            {Array.from({ length: cfg.teams }, (_, i) => (
              <label key={i} className="hs-tname" style={{ ['--c' as string]: TEAM_COLORS[i % TEAM_COLORS.length] }}>
                <span>ทีม {i + 1}</span>
                <input value={names[i] || ''} maxLength={24} onChange={(e) => setNames((n) => n.map((x, k) => (k === i ? e.target.value : x)))} placeholder={TEAM_DEFAULT[i]} />
                {split && split[i] && <em>{split[i].length} คน: {split[i].join(', ')}</em>}
              </label>
            ))}
          </div>
        )}
        <label className="hs-roster">
          <span>{cfg.teams ? 'รายชื่อนักเรียนสำหรับสุ่มแบ่งทีม (ไม่ใส่ก็ได้ บรรทัดละคน)' : 'รายชื่อผู้เล่น (ไม่ใส่ก็ได้ บรรทัดละคน)'}</span>
          <textarea value={roster} onChange={(e) => (setRoster(e.target.value), setSplit(null))} rows={3} maxLength={3000} placeholder={'เด็กชายเอ\nเด็กหญิงบี'} />
        </label>
        {cfg.teams > 0 && (
          <button type="button" className="hs-btn" disabled={rosterNames.length < cfg.teams} onClick={() => (gsfx.pick(), setSplit(splitTeams(rosterNames, cfg.teams)))}>
            <Shuffle className="w-5 h-5" /> สุ่มแบ่งทีม ({rosterNames.length} คน)
          </button>
        )}
        <p className="hs-safe">
          <Shield className="w-4 h-4" /> ทุกภารกิจใช้ท่ายืน นั่ง คุกเข่า หรือนอนบนพื้น: {SAFETY} เว้นที่ว่างให้พอ
        </p>
        <button type="button" className="hs-btn hs-go hs-big" onClick={startGame}>
          <Play className="w-6 h-6" /> เริ่มเกม
        </button>
      </div>
    </div>
  );

  const pool = picker ? missionPool(people, pickCat === 'all' ? cfg.cats : catBit(pickCat as never)) : [];

  const ui = (
    <div className="hs-root" data-dock={dock && inGame ? 1 : 0}>
      <div className="hs-sky" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <header className="hs-top">
        <button type="button" className="hs-icon" onClick={exitGame} aria-label="ออกจากเกม">
          <X className="w-5 h-5" />
        </button>
        <div className="hs-title">
          <b>เกมมนุษย์สร้างรูป</b>
          <span>
            {PHASE_NAME[phase]}
            {inGame && ` | รอบ ${round + 1}/${totalRounds}`}
          </span>
        </div>
        {timerShown && inGame && (
          <span className="hs-timerpill" data-urgent={urgent ? 1 : 0}>
            <Timer className="w-4 h-4" /> {fmt(remain)}
          </span>
        )}
        {inGame && cfg.scoring && ents.length <= 6 && (
          <div className="hs-mini-score">
            {ents.map((e, i) => (
              <span key={i} style={{ ['--c' as string]: e.color }} title={e.name}>
                {e.score}
              </span>
            ))}
          </div>
        )}
        {inGame && (
          <button type="button" className="hs-icon" onClick={togglePause} aria-label={paused ? 'เล่นต่อ' : 'หยุดเกม'}>
            {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
        )}
        <button type="button" className="hs-icon" onClick={fullScreen} aria-label="เต็มจอ">
          <Maximize2 className="w-5 h-5" />
        </button>
        {inGame && (
          <button type="button" className="hs-icon" onClick={() => (gsfx.tap(), setDock((d) => !d))} aria-label={dock ? 'ซ่อนแผงควบคุม' : 'แสดงแผงควบคุม'}>
            {dock ? <EyeOff className="w-5 h-5" /> : <SlidersHorizontal className="w-5 h-5" />}
          </button>
        )}
      </header>

      <main className="hs-main">
        {inGame && (
          <ol className="hs-flow" aria-label="ขั้นตอนของรอบนี้">
            {FLOW.map((p, i) => (
              <li key={p} data-on={p === phase ? 1 : FLOW.indexOf(phase) > i ? 2 : 0}>
                <b>{i + 1}</b>
                <span>{PHASE_NAME[p]}</span>
              </li>
            ))}
          </ol>
        )}
        {phase === 'start' && StartView()}
        {phase === 'question' && QuestionView()}
        {phase === 'challenge' && ChallengeView()}
        {phase === 'demo' && DemoView()}
        {phase === 'playing' && PlayingView()}
        {phase === 'result' && ResultView()}
        {phase === 'board' && BoardView()}
        {phase === 'summary' && SummaryView()}
      </main>

      {inGame && dock && (
        <nav className="hs-dock" aria-label="แผงควบคุมของครู">
          {(judging || phase === 'board') && ents.length > 1 && (
            <div className="hs-who">
              <span>{phase === 'board' ? 'เพิ่มคะแนนให้:' : 'ตัดสินให้:'}</span>
              <button type="button" data-on={sel < 0 ? 1 : 0} onClick={() => (gsfx.tap(), setSel(-1))}>
                ทุก{cfg.teams ? 'ทีม' : 'คน'}
              </button>
              {ents.map((e, i) => (
                <button key={i} type="button" data-on={sel === i ? 1 : 0} style={{ ['--c' as string]: e.color }} onClick={() => (gsfx.tap(), setSel(i))}>
                  {e.name}
                </button>
              ))}
            </div>
          )}
          <div className="hs-groups">
            {CTL_GROUPS.map((g, gi) => {
              const list = g.filter((id) => allCtl || (QUICK[phase] || []).includes(id));
              return list.length ? (
                <div key={gi} className="hs-group">
                  {list.map((id) => {
                    const c = ctls[id];
                    return <Ctl key={id} icon={c.icon} label={c.label} onClick={c.onClick} disabled={c.disabled} tone={c.tone} on={c.on} />;
                  })}
                </div>
              ) : null;
            })}
            <button type="button" className="hs-more" onClick={() => (gsfx.tap(), setAllCtl((v) => !v))}>
              <SlidersHorizontal className="w-4 h-4" /> {allCtl ? 'ปุ่มหลักเท่านั้น' : 'ปุ่มครูทั้งหมด'}
            </button>
          </div>
        </nav>
      )}
      {inGame && !dock && (
        <button type="button" className="hs-restore" onClick={() => (gsfx.tap(), setDock(true))}>
          <SlidersHorizontal className="w-5 h-5" /> แผงควบคุม (H)
        </button>
      )}

      {picker && (
        <div className="hs-modal" role="dialog" aria-label="เลือกภารกิจ">
          <div className="hs-card hs-pickcard hs-pop">
            <div className="hs-kicker">
              <ListChecks className="w-5 h-5" /> เลือกภารกิจ (เฉพาะที่ใช้ไม่เกิน {people} คน)
            </div>
            <div className="hs-tabs">
              <button type="button" data-on={pickCat === 'all' ? 1 : 0} onClick={() => setPickCat('all')}>
                ประเภทที่เลือกไว้
              </button>
              {CATS.map((c) => (
                <button key={c.id} type="button" data-on={pickCat === c.id ? 1 : 0} onClick={() => setPickCat(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
            <div className="hs-pickgrid">
              {pool.map((m) => {
                const c = CATS.find((x) => x.id === m.cat)!;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className="hs-pick"
                    style={{ ['--c' as string]: c.color }}
                    data-on={mission?.id === m.id ? 1 : 0}
                    onClick={() => {
                      gsfx.pick();
                      setAnsMs([]);
                      applyMission(m);
                      setPicker(false);
                      setPhase('challenge');
                    }}
                  >
                    <b>{m.name}</b>
                    <span>
                      {m.min === m.max ? `${m.min} คน` : `${m.min}-${Math.min(m.max, people)} คน`} | {LEVELS[m.level]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="hs-row">
              <button type="button" className="hs-btn" onClick={() => (gsfx.tap(), setPicker(false), !mission && randomMission())}>
                {mission ? 'ปิด' : 'ให้ระบบสุ่มแทน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {paused && (
        <div className="hs-modal hs-pause" role="dialog" aria-label="หยุดเกม">
          <div className="hs-card hs-pop">
            <h2 className="hs-mname">หยุดเกมชั่วคราว</h2>
            <p className="hs-hint">เวลาหยุดอยู่ กดเล่นต่อเมื่อพร้อม (คีย์ลัด P)</p>
            <div className="hs-row">
              <button type="button" className="hs-btn hs-go hs-big" onClick={togglePause}>
                <Play className="w-6 h-6" /> เล่นต่อ
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmEnd && (
        <div className="hs-modal" role="dialog" aria-label="จบเกม">
          <div className="hs-card hs-pop">
            <h2 className="hs-mname">จบเกมเลยไหม</h2>
            <p className="hs-hint">ไปหน้าสรุปผล คะแนนที่บันทึกแล้วยังอยู่ครบ</p>
            <div className="hs-row">
              <button type="button" className="hs-btn" onClick={() => (gsfx.tap(), setConfirmEnd(false))}>
                เล่นต่อ
              </button>
              <button type="button" className="hs-btn hs-go" onClick={finish}>
                <Flag className="w-5 h-5" /> จบเกม
              </button>
            </div>
          </div>
        </div>
      )}
      {count > 0 && (
        <div className="hs-count3" aria-live="assertive">
          <b key={count}>{count}</b>
          <span>เตรียมตัว... ไปที่ตำแหน่งของตัวเอง</span>
        </div>
      )}
      {party > 0 && <Confetti key={party} />}
    </div>
  );
  return createPortal(ui, document.body);
}

/** ภาพหน้าเริ่ม: เด็กๆ เปลี่ยนรูปวนไปเรื่อยๆ */
const HERO_IDS = ['g-starT', 'o-house', 'o-tree', 'n-plus'];
function HeroLoop() {
  const [k, setK] = useState(0);
  const [step, setStep] = useState<StageStep>('lineup');
  useEffect(() => {
    if (reducedMotion()) {
      setStep('shape');
      return;
    }
    const seq: StageStep[] = ['lineup', 'spot', 'shape', 'shape'];
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      if (i % seq.length === 0) setK((x) => (x + 1) % HERO_IDS.length);
      setStep(seq[i % seq.length]);
    }, 1500);
    return () => window.clearInterval(id);
  }, []);
  const m = useMemo(() => missionPool(40, 63).find((x) => x.id === HERO_IDS[k]) || missionPool(40, 63)[0], [k]);
  const fr = useMemo(() => stageFrames(m, m.min), [m]);
  return (
    <div className="hs-hero-stage">
      <KidStage key={m.id} figs={figsFor(fr, step)} box={fr.box} view={m.view} outline={fr.outline} showOutline={step === 'shape'} stagger={80} label="ตัวอย่างการสร้างรูป" />
    </div>
  );
}
