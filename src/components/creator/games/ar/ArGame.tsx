'use client';

/**
 * สงครามอวกาศ AR (เล่นในเครื่องเดียว): กล้องจับท่าทาง ยกมือเล็งยานเอเลียนที่ถือคำตอบถูก ค้างไว้จนล็อก = ยิงเลเซอร์
 * - เดี่ยว หรือ 2 ทีม (จอแบ่งซ้าย-ขวา ทีมละฝั่ง คนที่ยืนฝั่งไหนคุมฝั่งนั้น)
 * - ตอบถูกเท่านั้นถึงได้ยิงอุกกาบาตรอบโบนัส (คะแนนความรู้สำคัญกว่าคะแนนทักษะ และแยกกันชัด)
 * - ไม่มีกล้อง/ไม่อนุญาต = แตะจอแทน ภาพกล้องไม่ถูกบันทึกหรือส่งออกจากเครื่อง
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Check, Hand, LogOut, Pause, Play, RotateCcw, ShieldCheck, Star, Timer, Trophy, Users, X, Zap } from 'lucide-react';
import type { QuizQuestion } from '@/lib/game-creator/types';
import { MathText } from '../../math/MathText';
import { Confetti } from '../../live/PlayerSession';
import { gsfx } from '@/lib/game-creator/gsound';
import { releaseMusic, setMusic } from '@/lib/music';
import { roomTrack } from '@/lib/music-tracks';
import { BONES, Dwell, Hold, OneEuro, aimPoint, arAnswerPoints, arStars, assignSides, bothUp, pickHand, toBody, AR_POINTS, type Body, type DwellTarget, type Hand as HandSide, type Rect } from '@/lib/game-creator/arPose';
import type { ArSettings } from '@/lib/game-creator/arSettings';
import { PoseTracker, type CamError } from './tracker';
import { ALIEN_COLORS, SpaceScene, TEAM_COLORS } from './scene';
import './ar.css';

const TEAM_NAMES = ['ทีมฟ้า', 'ทีมส้ม'];
/** ระยะเอื้อมแขน: น้อย = ขยับนิดเดียวเป้าไปไกล */
const REACH = [
  { v: 1.15, name: 'ขยับน้อย' },
  { v: 1.5, name: 'ปกติ' },
  { v: 1.95, name: 'เอื้อมมาก' },
];
const DRIFT = [0.04, 0.1, 0.17];
const DRIFT_SPEED = [0.55, 0.85, 1.25];
const METEOR_LIFE = [3.0, 2.4, 1.9];
const ENTER_S = 0.8;
const REVEAL_S = 1.9;
const BONUS_S = 5.5;

type Phase = 'setup' | 'loading' | 'calib' | 'count' | 'play' | 'end';
type Sub = 'enter' | 'ask' | 'reveal' | 'bonus';

interface SideScore {
  score: number;
  know: number;
  bonus: number;
  first: number;
  wrong: number;
  streak: number;
  best: number;
}
const emptyScore = (): SideScore => ({ score: 0, know: 0, bonus: 0, first: 0, wrong: 0, streak: 0, best: 0 });

interface SideRT {
  body: Body | null;
  seenAt: number;
  seenSince: number;
  hand: HandSide | null;
  fx: OneEuro;
  fy: OneEuro;
  aimAt: number;
  aim: { x: number; y: number } | null;
  dwell: Dwell;
  hit: Dwell;
  charge: Hold;
  chargeT: number;
}
const newRT = (): SideRT => ({ body: null, seenAt: -1e9, seenSince: 0, hand: null, fx: new OneEuro(), fy: new OneEuro(), aimAt: 0, aim: null, dwell: new Dwell(850), hit: new Dwell(260), charge: new Hold(3, 5), chargeT: 0 });

interface QSide {
  order: string[];
  alive: Set<string>;
  done: boolean;
  got: boolean;
  firstTry: boolean;
  chargeUsed: boolean;
}
interface Meteor {
  id: string;
  s: number;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  t: number;
  life: number;
}
interface QRT {
  idx: number;
  q: QuizQuestion;
  limitMs: number;
  usedMs: number;
  sides: QSide[];
  sub: Sub;
  subT: number;
  meteors: Meteor[];
  spawnT: number;
  sirened: boolean;
  lastSec: number;
}

interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  big?: boolean;
}

const shuffle = <T,>(a: T[]): T[] => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const aid = (s: number, cid: string) => `a${s}_${cid}`;

function Stars({ n }: { n: number }) {
  return (
    <span className="ar-stars">
      {[0, 1, 2].map((i) => (
        <Star key={i} className="w-9 h-9" data-on={i < n} strokeWidth={2.5} />
      ))}
    </span>
  );
}

export function ArGame({ questions, settings, title, onExit }: { questions: QuizQuestion[]; settings: ArSettings; title: string; onExit: () => void }) {
  const sidesN = settings.teams === 2 ? 2 : 1;
  const [phase, setPhase] = useState<Phase>('setup');
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState<CamError | null>(null);
  const [reach, setReach] = useState(1);
  const [count, setCount] = useState(3);
  const [qi, setQi] = useState(0);
  const [sub, setSub] = useState<Sub>('enter');
  const [orders, setOrders] = useState<string[][]>([]);
  const [marks, setMarks] = useState<Record<string, 'wrong' | 'answer'>>({});
  const [scores, setScores] = useState<SideScore[]>(() => [emptyScore(), emptyScore()]);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [paused, setPaused] = useState(false);
  const [away, setAway] = useState(false);
  const [secLeft, setSecLeft] = useState(0);
  const [urgent, setUrgent] = useState(false);
  const [calib, setCalib] = useState<{ seen: boolean; hand: boolean; ok: boolean }[]>([
    { seen: false, hand: false, ok: false },
    { seen: false, hand: false, ok: false },
  ]);
  const [eligible, setEligible] = useState<boolean[]>([false, false]);
  const [playMs, setPlayMs] = useState(0);
  const [fps, setFps] = useState(0);

  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const skel = useRef<HTMLCanvasElement>(null);
  const tracker = useRef<PoseTracker | null>(null);
  const scene = useRef<SpaceScene | null>(null);
  const rts = useRef<SideRT[]>([newRT(), newRT()]);
  const Q = useRef<QRT | null>(null);
  const list = useRef<QuizQuestion[]>([]);
  const pos = useRef(new Map<string, { x: number; y: number; r: number }>());
  const labels = useRef(new Map<string, HTMLDivElement>());
  const rings = useRef<(SVGSVGElement | null)[]>([null, null]);
  const reticles = useRef<(HTMLDivElement | null)[]>([null, null]);
  const chargeBars = useRef<(HTMLDivElement | null)[]>([null, null]);
  const timeBar = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>('setup');
  const pausedRef = useRef(false);
  const awayRef = useRef(false);
  const reachRef = useRef(REACH[1].v);
  const scoreRef = useRef<SideScore[]>([emptyScore(), emptyScore()]);
  const calibRef = useRef(calib);
  const floatId = useRef(0);
  const playStart = useRef(0);
  const playedMs = useRef(0);

  phaseRef.current = phase;
  pausedRef.current = paused;
  reachRef.current = REACH[reach].v;
  calibRef.current = calib;

  /* ------------------------------ เพลง + ปิดกล้องตอนออก ------------------------------ */
  useEffect(() => {
    setMusic('room', roomTrack(settings.music, 'ar'));
    return () => {
      releaseMusic('room');
      tracker.current?.stop();
      tracker.current = null;
    };
  }, [settings.music]);

  const float = useCallback((x: number, y: number, text: string, color: string, big = false) => {
    const id = ++floatId.current;
    setFloaters((f) => [...f.slice(-10), { id, x, y, text, color, big }]);
    setTimeout(() => setFloaters((f) => f.filter((v) => v.id !== id)), 1300);
  }, []);

  const addScore = useCallback((s: number, f: (o: SideScore) => SideScore) => {
    scoreRef.current = scoreRef.current.map((o, i) => (i === s ? f(o) : o));
    setScores(scoreRef.current);
  }, []);

  /* ------------------------------ เริ่ม: กล้อง หรือ แตะจอ ------------------------------ */
  const startCamera = async () => {
    gsfx.unlock();
    gsfx.tap();
    setCamErr(null);
    setPhase('loading');
    const v = video.current;
    if (!v) return;
    const t = new PoseTracker(v);
    tracker.current = t;
    const err = await t.start(sidesN === 2 ? 4 : 2);
    if (tracker.current !== t) return;
    if (err) {
      t.stop();
      tracker.current = null;
      setCamErr(err);
      setPhase('setup');
      return;
    }
    setCamOn(true);
    setPhase('calib');
  };

  const startTouch = () => {
    gsfx.unlock();
    gsfx.tap();
    tracker.current?.stop();
    tracker.current = null;
    setCamOn(false);
    beginRun();
  };

  /* ------------------------------ รอบเล่น ------------------------------ */
  const beginRun = useCallback(() => {
    scene.current?.remove('p0');
    scene.current?.remove('p1');
    const pool = shuffle(questions);
    list.current = settings.count > 0 ? pool.slice(0, settings.count) : pool;
    scoreRef.current = [emptyScore(), emptyScore()];
    setScores(scoreRef.current);
    playedMs.current = 0;
    Q.current = null;
    setMarks({});
    setOrders([]);
    setQi(0);
    setPaused(false);
    setPhase('count');
  }, [questions, settings.count]);

  const loadQuestion = useCallback(
    (idx: number) => {
      const q = list.current[idx];
      if (!q) {
        playedMs.current += performance.now() - playStart.current;
        setPlayMs(playedMs.current);
        setPhase('end');
        gsfx.fanfare();
        return;
      }
      const sc = scene.current;
      const sides: QSide[] = [];
      const ord: string[][] = [];
      for (let s = 0; s < sidesN; s++) {
        const order = shuffle(q.choices.map((c) => c.id));
        ord.push(order);
        sides.push({ order, alive: new Set(order), done: false, got: false, firstTry: true, chargeUsed: false });
        order.forEach((cid, i) => sc?.alien(aid(s, cid), ALIEN_COLORS[i % ALIEN_COLORS.length]));
        rts.current[s].dwell.reset();
        rts.current[s].hit.reset();
      }
      const base = settings.time > 0 ? settings.time : q.time > 0 ? Math.max(20, q.time) : 45;
      Q.current = { idx, q, limitMs: base * 1000, usedMs: 0, sides, sub: 'enter', subT: 0, meteors: [], spawnT: 0, sirened: false, lastSec: -1 };
      setOrders(ord);
      setMarks({});
      setQi(idx);
      setSub('enter');
      setUrgent(false);
      setSecLeft(base);
      setEligible([false, false]);
      gsfx.whoosh();
    },
    [settings.time, sidesN]
  );

  /* นับถอยหลัง 3-2-1 */
  useEffect(() => {
    if (phase !== 'count') return;
    setCount(3);
    gsfx.count();
    let n = 3;
    const t = setInterval(() => {
      n--;
      if (n > 0) {
        setCount(n);
        gsfx.count();
      } else if (n === 0) {
        setCount(0);
        gsfx.go();
      } else {
        clearInterval(t);
        playStart.current = performance.now();
        setPhase('play');
        loadQuestion(0);
      }
    }, 850);
    return () => clearInterval(t);
  }, [phase, loadQuestion]);

  /* ------------------------------ ตอบ / ยิง ------------------------------ */
  const choose = useCallback(
    (s: number, cid: string) => {
      const qr = Q.current;
      const sc = scene.current;
      if (!qr || qr.sub !== 'ask' || pausedRef.current) return;
      const sd = qr.sides[s];
      if (!sd || sd.done || !sd.alive.has(cid)) return;
      const id = aid(s, cid);
      const p = pos.current.get(id);
      if (!p) return;
      const correct = !!qr.q.choices.find((c) => c.id === cid)?.correct;
      sc?.laser(`ship${s}`, p.x, p.y, TEAM_COLORS[s]);
      gsfx.laser();
      if (correct) {
        const pts = arAnswerPoints(sd.firstTry, qr.usedMs, qr.limitMs);
        sd.done = sd.got = true;
        sd.alive.delete(cid);
        sc?.burst(p.x, p.y, TEAM_COLORS[s], 1.3);
        sc?.remove(id);
        const streak = scoreRef.current[s].streak + 1;
        addScore(s, (o) => ({ ...o, score: o.score + pts, know: o.know + pts, first: o.first + (sd.firstTry ? 1 : 0), streak, best: Math.max(o.best, streak) }));
        float(p.x, p.y - p.r, `+${pts}`, '#ffe14a', true);
        gsfx.correct();
        if (streak >= 2) {
          setTimeout(() => {
            float(p.x, p.y - p.r - 50, `คอมโบ x${streak}`, '#ff8af0');
            gsfx.streak();
          }, 280);
        }
        setEligible((e) => e.map((v, i) => (i === s ? true : v)));
      } else {
        sd.firstTry = false;
        sd.alive.delete(cid);
        sc?.wobble(id);
        setMarks((m) => ({ ...m, [id]: 'wrong' }));
        addScore(s, (o) => ({ ...o, wrong: o.wrong + 1, streak: 0 }));
        float(p.x, p.y - p.r, 'ลองอีกที', '#ff7a90');
        gsfx.wrong();
      }
    },
    [addScore, float]
  );

  const shootMeteor = useCallback(
    (m: Meteor, p: { x: number; y: number }) => {
      const qr = Q.current;
      if (!qr) return;
      qr.meteors = qr.meteors.filter((o) => o !== m);
      scene.current?.laser(`ship${m.s}`, p.x, p.y, TEAM_COLORS[m.s]);
      scene.current?.burst(p.x, p.y, '#ffcf6b', 0.8);
      scene.current?.remove(m.id);
      gsfx.laser();
      addScore(m.s, (o) => ({ ...o, score: o.score + AR_POINTS.meteor, bonus: o.bonus + AR_POINTS.meteor }));
      float(p.x, p.y, `+${AR_POINTS.meteor}`, '#8af5ff');
    },
    [addScore, float]
  );

  const blast = useCallback(
    (s: number) => {
      const qr = Q.current;
      if (!qr || qr.sub !== 'bonus') return;
      const sd = qr.sides[s];
      if (!sd?.got || sd.chargeUsed) return;
      sd.chargeUsed = true;
      gsfx.charge();
      const mine = qr.meteors.filter((m) => m.s === s);
      mine.forEach((m, i) => {
        const p = pos.current.get(m.id);
        if (p) setTimeout(() => shootMeteor(m, p), 120 + i * 60);
      });
      const st = stage.current;
      if (st) {
        st.classList.remove('ar-shake');
        void st.offsetWidth;
        st.classList.add('ar-shake');
      }
      float((s + 0.5) * ((root.current?.clientWidth || 800) / sidesN), (root.current?.clientHeight || 600) * 0.5, 'ระเบิดพลัง!', TEAM_COLORS[s], true);
    },
    [float, shootMeteor, sidesN]
  );

  /* ------------------------------ ฉาก + วนเฟรม ------------------------------ */
  const live = phase === 'calib' || phase === 'count' || phase === 'play';
  const hasScene = phase !== 'setup' && phase !== 'loading';

  useEffect(() => {
    if (!hasScene || !stage.current || scene.current) return;
    try {
      const sc = new SpaceScene(stage.current, camOn);
      scene.current = sc;
      for (let s = 0; s < sidesN; s++) sc.ship(`ship${s}`, TEAM_COLORS[s]);
    } catch {
      /* ไม่มี WebGL: เล่นต่อได้ด้วยป้ายตัวเลือก */
    }
  }, [hasScene, camOn, sidesN]);

  useEffect(
    () => () => {
      scene.current?.dispose();
      scene.current = null;
    },
    []
  );

  useEffect(() => {
    if (!live) return;
    let raf = 0;
    let last = performance.now();
    let T = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      T += dt;
      const box = root.current;
      if (!box) return;
      const cw = box.clientWidth;
      const ch = box.clientHeight;
      const half = cw / sidesN;
      const area = (s: number): Rect => {
        const top = ch * (sidesN === 2 ? 0.3 : 0.27);
        const bottom = ch * 0.84;
        const pad = Math.min(24, half * 0.04);
        return { x: s * half + pad, y: top, w: half - pad * 2, h: bottom - top };
      };
      const ph = phaseRef.current;
      const qr = Q.current;
      const sc = scene.current;

      /* ---- ตรวจท่าทาง ---- */
      const tr = tracker.current;
      const bodies: Body[] = [];
      if (tr?.ready && tr.tick(now)) {
        const v = video.current!;
        const view = { vw: v.videoWidth || 1280, vh: v.videoHeight || 720, cw, ch, mirror: true };
        for (const l of tr.poses) {
          const b = toBody(l, view);
          if (b) bodies.push(b);
        }
        const as = assignSides(bodies, cw / 2, sidesN === 2 ? 2 : 1);
        for (let s = 0; s < sidesN; s++) {
          const rt = rts.current[s];
          const b = as[s];
          rt.body = b;
          rt.charge.update(!!b && bothUp(b));
          if (b) {
            if (now - rt.seenAt > 400) rt.seenSince = now;
            rt.seenAt = now;
            rt.hand = pickHand(b, rt.hand);
            const raw = rt.hand ? aimPoint(b, rt.hand, reachRef.current, area(s)) : null;
            if (raw) {
              const fdt = rt.aim ? Math.max(0.001, (now - rt.aimAt) / 1000) : 0;
              rt.aim = { x: rt.fx.filter(raw.x, fdt), y: rt.fy.filter(raw.y, fdt) };
              rt.aimAt = now;
            } else {
              rt.aim = null;
              rt.fx.reset();
              rt.fy.reset();
            }
          }
        }
        // วาดโครงร่างทุกคนที่เห็น (สีตามฝั่ง)
        const cv = skel.current;
        if (cv) {
          if (cv.width !== cw || cv.height !== ch) {
            cv.width = cw;
            cv.height = ch;
          }
          const g = cv.getContext('2d');
          if (g) {
            g.clearRect(0, 0, cw, ch);
            g.lineCap = 'round';
            for (const b of bodies) {
              const s = sidesN === 2 && b.cx >= cw / 2 ? 1 : 0;
              const active = rts.current[s].body === b;
              g.strokeStyle = active ? TEAM_COLORS[s] : 'rgba(255,255,255,.45)';
              g.lineWidth = Math.max(3, b.sw * 0.06);
              g.globalAlpha = active ? 0.9 : 0.5;
              for (const [a, c] of BONES) {
                const p = b.pts[a];
                const q = b.pts[c];
                if (p.v < 0.5 || q.v < 0.5) continue;
                g.beginPath();
                g.moveTo(p.x, p.y);
                g.lineTo(q.x, q.y);
                g.stroke();
              }
              g.fillStyle = '#fff';
              for (const i of [11, 12, 13, 14, 15, 16]) {
                const p = b.pts[i];
                if (p.v < 0.5) continue;
                g.beginPath();
                g.arc(p.x, p.y, Math.max(4, b.sw * 0.05), 0, Math.PI * 2);
                g.fill();
              }
            }
            g.globalAlpha = 1;
          }
        }
      }
      // หายจากกล้องนานเกิน 0.4 วิ = ไม่มีเป้า
      for (let s = 0; s < sidesN; s++) {
        const rt = rts.current[s];
        if (now - rt.seenAt > 400) {
          rt.body = null;
          rt.aim = null;
          rt.fx.reset();
          rt.fy.reset();
        }
      }

      /* ---- พักอัตโนมัติเมื่อไม่มีใครอยู่หน้ากล้อง ---- */
      if (tr && ph === 'play') {
        const gone = [...Array(sidesN).keys()].every((s) => now - rts.current[s].seenAt > 1500);
        if (gone !== awayRef.current) {
          awayRef.current = gone;
          setAway(gone);
        }
      }
      const frozen = pausedRef.current || awayRef.current;

      /* ---- ยานผู้เล่น ---- */
      for (let s = 0; s < sidesN; s++) {
        const x = (s + 0.5) * half;
        const y = ch * 0.92;
        sc?.place(`ship${s}`, x, y, Math.min(ch * 0.05, 42), T);
        const a = rts.current[s].aim;
        if (a) sc?.aimShip(`ship${s}`, a.x, a.y);
      }

      /* ---- ตั้งค่ากล้อง: เป้าซ้อม ---- */
      if (ph === 'calib') {
        const c = calibRef.current;
        let changed = false;
        const next = c.map((o) => ({ ...o }));
        for (let s = 0; s < sidesN; s++) {
          const rt = rts.current[s];
          const seenOk = !!rt.body && now - rt.seenSince > 700;
          if (seenOk !== next[s].seen) (next[s].seen = seenOk), (changed = true);
          const handOk = !!rt.aim;
          if (handOk !== next[s].hand) (next[s].hand = handOk), (changed = true);
          const id = `p${s}`;
          const A = area(s);
          if (!next[s].ok) {
            if (sc && !sc.has(id)) sc.alien(id, TEAM_COLORS[s]);
            // เป้าซ้อมอยู่ครึ่งบน (ครึ่งล่างมีแผงตั้งค่าบัง)
            const r = Math.max(40, Math.min(A.w, A.h) * 0.16);
            const p = { x: A.x + A.w / 2, y: A.y + A.h * 0.22, r };
            pos.current.set(id, p);
            sc?.place(id, p.x, p.y, r, T);
            if (rt.dwell.update(rt.aim, [{ id, ...p }], dt * 1000)) {
              next[s].ok = true;
              changed = true;
              sc?.laser(`ship${s}`, p.x, p.y, TEAM_COLORS[s]);
              sc?.burst(p.x, p.y, TEAM_COLORS[s], 1.2);
              sc?.remove(id);
              gsfx.laser();
              gsfx.correct();
            }
          }
        }
        if (changed) setCalib(next);
        if (tr && now % 1000 < 20) setFps(tr.fps);
      }

      /* ---- เกม ---- */
      if (ph === 'play' && qr) {
        if (!frozen) qr.subT += dt;
        if (qr.sub === 'enter' && qr.subT >= ENTER_S) {
          qr.sub = 'ask';
          qr.subT = 0;
          setSub('ask');
        }
        if (qr.sub === 'ask' && !frozen) {
          qr.usedMs += dt * 1000;
          const left = Math.max(0, qr.limitMs - qr.usedMs);
          const sec = Math.ceil(left / 1000);
          if (sec !== qr.lastSec) {
            qr.lastSec = sec;
            setSecLeft(sec);
            if (sec <= 5 && sec > 0) {
              setUrgent(true);
              gsfx.tick(true);
            }
            if (sec === 5 && !qr.sirened) {
              qr.sirened = true;
              gsfx.siren();
            }
          }
          if (timeBar.current) timeBar.current.style.transform = `scaleX(${left / qr.limitMs})`;
          const allDone = qr.sides.every((d) => d.done);
          if (allDone || left <= 0) {
            if (!allDone) gsfx.timeout();
            qr.sub = 'reveal';
            qr.subT = 0;
            setSub('reveal');
            setUrgent(false);
            const mk: Record<string, 'answer'> = {};
            qr.sides.forEach((d, s) => {
              d.done = true;
              // ยานที่ยังอยู่ (รวมตัวที่เลือกผิดไปแล้ว) บินหนี เหลือแค่คำตอบที่ถูกของฝั่งที่ยังตอบไม่ได้
              const keep = new Set<string>();
              for (const cid of d.order) {
                const correct = qr.q.choices.find((c) => c.id === cid)?.correct;
                if (correct && !d.got) {
                  mk[aid(s, cid)] = 'answer';
                  keep.add(cid);
                } else sc?.flyAway(aid(s, cid));
              }
              d.alive = keep;
              // หมดเวลาโดยไม่ได้ตอบถูก = คอมโบขาด
              if (!d.got && scoreRef.current[s].streak) addScore(s, (o) => ({ ...o, streak: 0 }));
            });
            setMarks((m) => ({ ...m, ...mk }));
          }
        } else if (qr.sub === 'reveal' && qr.subT >= REVEAL_S) {
          qr.sides.forEach((d, s) => d.alive.forEach((cid) => sc?.flyAway(aid(s, cid))));
          qr.sides.forEach((d) => d.alive.clear());
          if (qr.sides.some((d) => d.got)) {
            qr.sub = 'bonus';
            qr.subT = 0;
            setSub('bonus');
            gsfx.levelUp();
          } else loadQuestion(qr.idx + 1);
        } else if (qr.sub === 'bonus') {
          const life = METEOR_LIFE[settings.level] || 2.4;
          if (!frozen && qr.subT < BONUS_S - life * 0.6) {
            qr.spawnT -= dt;
            if (qr.spawnT <= 0) {
              qr.spawnT = 0.5;
              qr.sides.forEach((d, s) => {
                if (!d.got) return;
                const id = `m${s}_${Math.random().toString(36).slice(2, 7)}`;
                qr.meteors.push({ id, s, sx: Math.random(), sy: Math.random() * 0.3, ex: 0.1 + Math.random() * 0.8, ey: 0.2 + Math.random() * 0.7, t: 0, life });
                sc?.meteor(id, Math.floor(Math.random() * 3));
              });
            }
          }
          if (qr.subT >= BONUS_S && !qr.meteors.length) loadQuestion(qr.idx + 1);
          if (qr.subT >= BONUS_S + 2) {
            qr.meteors.forEach((m) => sc?.remove(m.id));
            qr.meteors = [];
          }
        }

        /* ตำแหน่งยานเอเลียน (ลอยไปมาตามระดับความยาก) */
        const drift = DRIFT[settings.level] ?? 0.1;
        const sp = DRIFT_SPEED[settings.level] ?? 0.85;
        qr.sides.forEach((d, s) => {
          const A = area(s);
          const n = d.order.length;
          const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt((n * A.w) / A.h))));
          const rows = Math.ceil(n / cols);
          const cwid = A.w / cols;
          const chei = A.h / rows;
          const r = Math.min(100, Math.max(34, Math.min(cwid, chei) * 0.3));
          d.order.forEach((cid, i) => {
            const id = aid(s, cid);
            const row = Math.floor(i / cols);
            const inRow = row === rows - 1 ? n - row * cols : cols;
            const col = i % cols;
            const x0 = A.x + (A.w - inRow * cwid) / 2 + (col + 0.5) * cwid;
            const y0 = A.y + (row + 0.38) * chei;
            const ph2 = i * 1.7 + s * 0.9;
            const x = x0 + Math.sin(T * sp + ph2) * drift * cwid;
            const y = y0 + Math.cos(T * sp * 0.8 + ph2) * drift * chei;
            pos.current.set(id, { x, y, r });
            sc?.place(id, x, y, r, T);
          });
          // เลือกคำตอบด้วยการค้างเป้า
          const rt = rts.current[s];
          if (qr.sub === 'ask' && !d.done && !frozen) {
            const targets: DwellTarget[] = [];
            for (const cid of d.alive) {
              const p = pos.current.get(aid(s, cid));
              if (p) targets.push({ id: cid, x: p.x, y: p.y, r: p.r * 1.25 });
            }
            const hit = rt.dwell.update(rt.aim, targets, dt * 1000);
            if (hit) {
              gsfx.lock();
              choose(s, hit);
            }
          }
        });

        /* อุกกาบาต */
        if (qr.meteors.length) {
          for (const m of [...qr.meteors]) {
            if (!frozen) m.t += dt / m.life;
            const A = area(m.s);
            const k = Math.min(1, m.t);
            const e = k * k;
            const x = A.x + (m.sx + (m.ex - m.sx) * e) * A.w;
            const y = A.y + (m.sy + (m.ey - m.sy) * e) * A.h;
            const r = 10 + e * Math.min(A.w, A.h) * 0.14;
            pos.current.set(m.id, { x, y, r });
            sc?.place(m.id, x, y, r, T);
            if (m.t >= 1) {
              qr.meteors = qr.meteors.filter((o) => o !== m);
              sc?.remove(m.id);
              pos.current.delete(m.id);
            }
          }
          for (let s = 0; s < sidesN; s++) {
            const rt = rts.current[s];
            const mine = qr.meteors.filter((m) => m.s === s && m.t > 0.12);
            const targets = mine.map((m) => ({ id: m.id, ...pos.current.get(m.id)! })).map((t) => ({ ...t, r: t.r * 1.4 + 14 }));
            const hit = frozen ? null : rt.hit.update(rt.aim, targets, dt * 1000);
            if (hit) {
              const m = mine.find((o) => o.id === hit);
              const p = pos.current.get(hit);
              if (m && p) shootMeteor(m, p);
            }
            // ชาร์จพลัง: ยกสองมือค้าง 0.7 วิ
            const d = qr.sides[s];
            if (d?.got && !d.chargeUsed && rt.charge.active && !frozen) {
              rt.chargeT += dt;
              if (rt.chargeT >= 0.7) {
                rt.chargeT = 0;
                blast(s);
              }
            } else rt.chargeT = 0;
            const bar = chargeBars.current[s];
            if (bar) bar.style.transform = `scaleX(${Math.min(1, rt.chargeT / 0.7)})`;
          }
        }
      }

      /* ---- ป้ายคำตอบ / วงล็อก / เป้าเล็ง ---- */
      labels.current.forEach((el, id) => {
        const p = pos.current.get(id);
        if (!p) return;
        el.style.transform = `translate(${p.x}px, ${p.y + p.r * 0.85}px) translateX(-50%)`;
      });
      for (let s = 0; s < sidesN; s++) {
        const rt = rts.current[s];
        const ring = rings.current[s];
        if (ring) {
          const qid = ph === 'calib' ? `p${s}` : qr && rt.dwell.hover ? aid(s, rt.dwell.hover) : null;
          const hov = ph === 'calib' ? (rt.dwell.hover ? qid : null) : qid;
          const p = hov ? pos.current.get(hov) : null;
          const prog = ph === 'calib' ? rt.dwell.prog.get(`p${s}`) || 0 : rt.dwell.hover ? rt.dwell.prog.get(rt.dwell.hover) || 0 : 0;
          if (p && prog > 0) {
            const size = p.r * 2.9;
            ring.style.opacity = '1';
            ring.style.transform = `translate(${p.x - size / 2}px, ${p.y - size / 2}px)`;
            ring.style.width = ring.style.height = `${size}px`;
            const arc = ring.querySelector('.ar-ring-p') as SVGCircleElement | null;
            if (arc) arc.style.strokeDashoffset = `${(1 - prog) * 289}`;
          } else ring.style.opacity = '0';
        }
        const ret = reticles.current[s];
        if (ret) {
          const a = rt.aim;
          if (a) {
            ret.style.opacity = '1';
            ret.style.transform = `translate(${a.x}px, ${a.y}px)`;
          } else ret.style.opacity = '0';
        }
      }

      sc?.render(dt, T);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [live, sidesN, settings.level, choose, shootMeteor, blast, loadQuestion]);

  /* ------------------------------ แตะจอ / คีย์บอร์ด ------------------------------ */
  const onPointer = (e: React.PointerEvent) => {
    gsfx.unlock();
    const box = root.current;
    const qr = Q.current;
    if (!box || !qr || phase !== 'play' || paused) return;
    const r = box.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const s = sidesN === 2 && x >= r.width / 2 ? 1 : 0;
    if (qr.sub === 'ask') {
      let best: string | null = null;
      let bd = Infinity;
      for (const cid of qr.sides[s].alive) {
        const p = pos.current.get(aid(s, cid));
        if (!p) continue;
        const d = Math.hypot(x - p.x, y - p.y);
        if (d < p.r * 1.6 && d < bd) (best = cid), (bd = d);
      }
      if (best) choose(s, best);
    } else if (qr.sub === 'bonus') {
      for (const m of qr.meteors) {
        if (m.s !== s) continue;
        const p = pos.current.get(m.id);
        if (p && Math.hypot(x - p.x, y - p.y) < p.r * 1.6 + 16) {
          shootMeteor(m, p);
          break;
        }
      }
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'play') return;
      if (e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      const n = Number(e.key);
      const qr = Q.current;
      if (qr && n >= 1 && n <= 6 && qr.sub === 'ask') {
        const cid = qr.sides[0]?.order[n - 1];
        if (cid) choose(0, cid);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose]);

  const q = list.current[qi];
  const total = list.current.length;
  const winner = useMemo(() => {
    if (sidesN !== 2) return -1;
    if (scores[0].score === scores[1].score) return 2;
    return scores[0].score > scores[1].score ? 0 : 1;
  }, [scores, sidesN]);

  const exit = () => {
    tracker.current?.stop();
    tracker.current = null;
    onExit();
  };

  const playAgain = () => {
    scene.current && Q.current?.sides.forEach((d, s) => d.order.forEach((cid) => scene.current?.remove(aid(s, cid))));
    beginRun();
  };

  const calibReady = calib.slice(0, sidesN).every((c) => c.ok);
  const fmtTime = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

  // portal ไป body: ตัวห่อหน้า (page-enter) มี transform ทำให้ position: fixed สูง 0 ระหว่างแอนิเมชัน
  return createPortal(
    <div ref={root} className="ar-root" data-cam={camOn} data-teams={sidesN === 2} data-urgent={urgent && phase === 'play'} onPointerDown={onPointer}>
      <video ref={video} className="ar-video" playsInline muted aria-hidden="true" />
      <div className="ar-tint" aria-hidden="true" />
      <canvas ref={skel} className="ar-skel" aria-hidden="true" />
      <div ref={stage} className="ar-stage" aria-hidden="true" />
      {sidesN === 2 && hasScene && (
        <div className="ar-split" aria-hidden="true">
          <span>VS</span>
        </div>
      )}

      {/* ป้ายคำตอบใต้ยานเอเลียน */}
      {phase === 'play' &&
        q &&
        orders.map((order, s) =>
          order.map((cid, i) => {
            const id = aid(s, cid);
            const c = q.choices.find((x) => x.id === cid);
            if (!c) return null;
            const st = marks[id];
            const gone = sub === 'bonus' || (sub === 'reveal' && st !== 'answer') || (!st && !Q.current?.sides[s]?.alive.has(cid) && sub !== 'enter');
            return (
              <div
                key={id}
                ref={(el) => {
                  if (el) labels.current.set(id, el);
                  else labels.current.delete(id);
                }}
                className="ar-label"
                data-st={st || ''}
                data-gone={gone}
                style={{ ['--ac' as string]: ALIEN_COLORS[i % ALIEN_COLORS.length] }}
              >
                <span className="ar-label-n">{i + 1}</span>
                {c.media?.kind === 'image' && <img src={c.media.url} alt="" draggable={false} />}
                <MathText value={c.text} />
                {st === 'wrong' && <X className="ar-label-mark" strokeWidth={4} />}
                {st === 'answer' && <Check className="ar-label-mark" strokeWidth={4} />}
              </div>
            );
          })
        )}

      {/* วงล็อกเป้า + เป้าเล็ง */}
      {[...Array(sidesN).keys()].map((s) => (
        <React.Fragment key={s}>
          <svg ref={(el) => void (rings.current[s] = el)} className="ar-ring" viewBox="0 0 100 100" style={{ ['--tc' as string]: TEAM_COLORS[s] }} aria-hidden="true">
            <circle cx="50" cy="50" r="46" className="ar-ring-bg" />
            <circle cx="50" cy="50" r="46" className="ar-ring-p" />
          </svg>
          <div ref={(el) => void (reticles.current[s] = el)} className="ar-reticle" style={{ ['--tc' as string]: TEAM_COLORS[s] }} aria-hidden="true">
            <i />
          </div>
        </React.Fragment>
      ))}

      {floaters.map((f) => (
        <span key={f.id} className="ar-float" data-big={!!f.big} style={{ left: f.x, top: f.y, color: f.color }}>
          {f.text}
        </span>
      ))}

      {/* ---------------- HUD ---------------- */}
      {(phase === 'play' || phase === 'count') && (
        <>
          <div className="ar-scores">
            {[...Array(sidesN).keys()].map((s) => (
              <div key={s} className="ar-score" style={{ ['--tc' as string]: TEAM_COLORS[s] }}>
                <small>{sidesN === 2 ? TEAM_NAMES[s] : 'คะแนน'}</small>
                <b key={scores[s].score}>{scores[s].score.toLocaleString('th-TH')}</b>
                {scores[s].streak >= 2 && <em>คอมโบ x{scores[s].streak}</em>}
              </div>
            ))}
          </div>
          {phase === 'play' && q && sub !== 'bonus' && (
            <div className="ar-q" data-sub={sub}>
              <div className="ar-q-top">
                <span>
                  ข้อ {qi + 1}/{total}
                </span>
                <span className="ar-q-time" data-urgent={urgent}>
                  <Timer className="w-4 h-4" /> {secLeft}
                </span>
              </div>
              <div className="ar-q-body">
                {q.media?.kind === 'image' && <img src={q.media.url} alt="" draggable={false} />}
                <MathText value={q.text} />
              </div>
              <div className="ar-q-bar">
                <div ref={timeBar} />
              </div>
            </div>
          )}
          {phase === 'play' && sub === 'bonus' && (
            <div className="ar-bonus">
              <b>รอบโบนัส! เล็งยิงอุกกาบาต</b>
              <span>
                <Zap className="w-4 h-4" /> ยกสองมือเหนือหัวค้างไว้ = ระเบิดพลัง
              </span>
            </div>
          )}
          {phase === 'play' && sub === 'bonus' &&
            [...Array(sidesN).keys()].map((s) => (
              <div key={s} className="ar-side-note" style={{ left: `${((s + 0.5) / sidesN) * 100}%`, ['--tc' as string]: TEAM_COLORS[s] }}>
                {eligible[s] ? (
                  <>
                    {!camOn && (
                      <button type="button" className="ar-blast" onPointerDown={(e) => (e.stopPropagation(), blast(s))}>
                        <Zap className="w-5 h-5" /> ระเบิดพลัง
                      </button>
                    )}
                    {camOn && (
                      <div className="ar-charge">
                        <div ref={(el) => void (chargeBars.current[s] = el)} />
                      </div>
                    )}
                  </>
                ) : (
                  <span>ตอบผิดรอบนี้ พักก่อนนะ</span>
                )}
              </div>
            ))}
          <button type="button" className="ar-pausebtn" onPointerDown={(e) => e.stopPropagation()} onClick={() => (gsfx.tap(), setPaused(true))} aria-label="หยุดเกม">
            <Pause className="w-6 h-6" />
          </button>
        </>
      )}

      {phase === 'count' && (
        <div className="ar-count" key={count}>
          {count > 0 ? count : 'ลุย!'}
        </div>
      )}

      {/* ---------------- เริ่ม: เลือกใช้กล้อง ---------------- */}
      {(phase === 'setup' || phase === 'loading') && (
        <div className="ar-panel-wrap">
          <div className="ar-panel">
            <p className="ar-kicker">สงครามอวกาศ AR</p>
            <h2>{title}</h2>
            <ul className="ar-tips">
              <li>
                <Users className="w-5 h-5" /> {sidesN === 2 ? 'ทีมฟ้ายืนฝั่งซ้ายของจอ ทีมส้มยืนฝั่งขวา ส่งตัวแทนฝั่งละ 1 คน' : 'ยืนหรือนั่งหน้ากล้อง ห่างราว 1.5-2 เมตร'}
              </li>
              <li>
                <Hand className="w-5 h-5" /> ยกมือเล็งยานที่ถือคำตอบถูก ค้างไว้จนวงเต็ม ไม่ต้องกระโดด นั่งเล่นก็ได้
              </li>
              <li>
                <ShieldCheck className="w-5 h-5" /> เว้นที่รอบตัวให้ปลอดภัย ภาพกล้องประมวลผลในเครื่องนี้ ไม่บันทึก ไม่ส่งไปไหน
              </li>
            </ul>
            {camErr && (
              <p className="ar-err">
                {camErr === 'denied'
                  ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง (กดรูปกล้องที่แถบที่อยู่เว็บเพื่ออนุญาต) หรือเล่นแบบแตะจอแทน'
                  : camErr === 'insecure'
                    ? 'เปิดกล้องได้เฉพาะเว็บ https เท่านั้น'
                    : camErr === 'model'
                      ? 'โหลดระบบจับท่าทางไม่สำเร็จ (เครื่องอาจไม่รองรับ) เล่นแบบแตะจอแทนได้'
                      : 'ไม่พบกล้องในเครื่องนี้ เล่นแบบแตะจอแทนได้'}
              </p>
            )}
            <div className="ar-panel-btns">
              <button type="button" className="ar-btn ar-btn-go" onClick={startCamera} disabled={phase === 'loading'}>
                <Camera className="w-6 h-6" /> {phase === 'loading' ? 'กำลังเปิดกล้อง + โหลดระบบจับท่าทาง…' : 'เปิดกล้อง เล่นแบบ AR'}
              </button>
              <button type="button" className="ar-btn" onClick={startTouch} disabled={phase === 'loading'}>
                <Hand className="w-5 h-5" /> ไม่ใช้กล้อง แตะจอแทน
              </button>
              <button type="button" className="ar-btn ar-btn-ghost" onClick={exit}>
                <LogOut className="w-5 h-5" /> ออก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- ตั้งค่ากล้อง + เป้าซ้อม ---------------- */}
      {phase === 'calib' && (
        <div className="ar-calib">
          <div className="ar-calib-card">
            <b>ฝึกเล็งก่อนเริ่ม</b>
            <div className="ar-calib-sides">
              {[...Array(sidesN).keys()].map((s) => (
                <div key={s} className="ar-calib-side" style={{ ['--tc' as string]: TEAM_COLORS[s] }}>
                  {sidesN === 2 && <em>{TEAM_NAMES[s]}</em>}
                  <span data-ok={calib[s].seen}>{calib[s].seen ? <Check className="w-4 h-4" strokeWidth={4} /> : <i />} เห็นตัว</span>
                  <span data-ok={calib[s].hand}>{calib[s].hand ? <Check className="w-4 h-4" strokeWidth={4} /> : <i />} ยกมือ</span>
                  <span data-ok={calib[s].ok}>{calib[s].ok ? <Check className="w-4 h-4" strokeWidth={4} /> : <i />} ยิงเป้าซ้อม</span>
                </div>
              ))}
            </div>
            <div className="ar-calib-row">
              <span>ระยะเอื้อมแขน</span>
              {REACH.map((r, i) => (
                <button key={i} type="button" className="ar-chip" data-on={reach === i} onClick={() => (gsfx.tap(), setReach(i))}>
                  {r.name}
                </button>
              ))}
              {fps > 0 && <small>จับท่า {fps} ภาพ/วิ</small>}
            </div>
            <div className="ar-panel-btns">
              <button type="button" className="ar-btn ar-btn-go" data-ready={calibReady} onClick={() => (gsfx.start(), beginRun())}>
                <Play className="w-5 h-5" /> {calibReady ? 'พร้อมแล้ว เริ่มเกม!' : 'เริ่มเกมเลย'}
              </button>
              <button type="button" className="ar-btn ar-btn-ghost" onClick={exit}>
                <LogOut className="w-5 h-5" /> ออก
              </button>
            </div>
          </div>
          <p className="ar-calib-hint">{calibReady ? 'เก่งมาก! พร้อมรบแล้ว' : calib[0].seen ? 'ยกมือขึ้น เลื่อนวงเล็งไปที่ยาน ค้างไว้จนวงเต็ม' : 'ถอยให้กล้องเห็นตั้งแต่หัวถึงเอว'}</p>
        </div>
      )}

      {/* ---------------- พัก ---------------- */}
      {phase === 'play' && (paused || away) && (
        <div className="ar-panel-wrap" onPointerDown={(e) => e.stopPropagation()}>
          <div className="ar-panel ar-panel-sm">
            <h2>{paused ? 'พักเกม' : 'กลับมาให้กล้องเห็นตัวนะ'}</h2>
            {!paused && <p>เวลาหยุดรอไว้ก่อน กลับมาหน้ากล้องแล้วเล่นต่อได้เลย</p>}
            <div className="ar-panel-btns">
              {paused && (
                <button type="button" className="ar-btn ar-btn-go" onClick={() => (gsfx.tap(), setPaused(false))}>
                  <Play className="w-5 h-5" /> เล่นต่อ
                </button>
              )}
              <button type="button" className="ar-btn ar-btn-ghost" onClick={exit}>
                <LogOut className="w-5 h-5" /> ออกจากเกม
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- จบเกม ---------------- */}
      {phase === 'end' && (
        <div className="ar-panel-wrap">
          <Confetti />
          <div className="ar-panel ar-result">
            <p className="ar-kicker">
              <Trophy className="w-5 h-5" /> ภารกิจสำเร็จ
            </p>
            {sidesN === 2 && <h2 className="ar-winner">{winner === 2 ? 'เสมอกัน!' : `${TEAM_NAMES[winner]} ชนะ!`}</h2>}
            <div className="ar-result-cols">
              {[...Array(sidesN).keys()].map((s) => {
                const sc = scores[s];
                return (
                  <div key={s} className="ar-result-col" data-win={winner === s} style={{ ['--tc' as string]: TEAM_COLORS[s] }}>
                    {sidesN === 2 && <em>{TEAM_NAMES[s]}</em>}
                    <Stars n={arStars(sc.first, total)} />
                    <b className="ar-result-total">{sc.score.toLocaleString('th-TH')}</b>
                    <dl>
                      <dt>คะแนนความรู้</dt>
                      <dd>{sc.know.toLocaleString('th-TH')}</dd>
                      <dt>คะแนนโบนัส (ยิงอุกกาบาต)</dt>
                      <dd>{sc.bonus.toLocaleString('th-TH')}</dd>
                      <dt>ถูกตั้งแต่ครั้งแรก</dt>
                      <dd>
                        {sc.first}/{total} ข้อ
                      </dd>
                      <dt>เลือกผิด</dt>
                      <dd>{sc.wrong} ครั้ง</dd>
                      <dt>คอมโบสูงสุด</dt>
                      <dd>x{sc.best}</dd>
                    </dl>
                  </div>
                );
              })}
            </div>
            <p className="ar-result-time">เวลาเล่น {fmtTime(playMs)} นาที (ผลนี้ไม่ได้บันทึกลงระบบ)</p>
            <div className="ar-panel-btns">
              <button type="button" className="ar-btn ar-btn-go" onClick={() => (gsfx.start(), playAgain())}>
                <RotateCcw className="w-5 h-5" /> เล่นอีกครั้ง
              </button>
              <button type="button" className="ar-btn ar-btn-ghost" onClick={exit}>
                <LogOut className="w-5 h-5" /> ออก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
