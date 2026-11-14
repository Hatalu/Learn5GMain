'use client';

/**
 * สงครามอวกาศ AR (เล่นในเครื่องเดียว): กล้องจับท่าทาง ยกมือเล็งยานเอเลียนที่ถือคำตอบถูก ค้างไว้จนล็อก = ยิงเลเซอร์
 * - เดี่ยว / 2 ทีมจอแบ่งซ้าย-ขวา / 3-4 ทีมผลัดกันเล่น หลายคนต่อทีมสลับคนคุมยานทุกข้อ
 * - แผนที่จักรวาล -> ด่าน -> คำถาม -> รอบบอส (ตอบถูกได้กระสุน แล้วเล็งยิงบอส เอียงหลบ/โล่/กระโดดกันการโจมตี)
 * - ไอเทม คอมโบ อัปเกรดยาน ภารกิจ เก็บในเครื่องนี้ (ar/save.ts) ตรรกะทั้งหมดอยู่ lib/game-creator/ar/
 * - ตอบถูกเท่านั้นถึงได้ยิง คะแนนความรู้กับคะแนนการเล่นแยกกันชัด ตอบผิด/โดนตีไม่มีแพ้
 * - ไม่มีกล้อง/ไม่อนุญาต/กล้องหลุด = แตะจอแทน (มีปุ่มแทนทุกท่า) ภาพกล้องไม่ถูกบันทึกหรือส่งออกจากเครื่อง
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crosshair, ScanFace, ArrowBigLeft, ArrowBigRight, BatteryCharging, Camera, Check, ChevronsUp, Gauge, Hand, HeartHandshake, LogOut, Pause, Play, Settings2, Shield, ShieldCheck, Sparkles, Timer, Users, X, Zap } from 'lucide-react';
import type { QuizQuestion } from '@/lib/game-creator/types';
import { MathText } from '../../math/MathText';
import { Confetti } from '../../live/PlayerSession';
import { gsfx } from '@/lib/game-creator/gsound';
import { releaseMusic, setMusic } from '@/lib/music';
import { roomTrack } from '@/lib/music-tracks';
import { createClient } from '@/lib/supabase/client';
import { sanitizeQuiz } from '@/lib/game-creator/quiz';
import { mediaPrefix } from '@/lib/game-creator/prefix';
import { modeFit, modeQuiz } from '@/lib/game-creator/modes';
import { BONES, BodySmoother, Dwell, Follow, HANDS, Hold, aimFromHand, arAnswerPoints, arStars, toBody, AR_POINTS, type Body, type DwellTarget, type Hand as HandSide, type Rect } from '@/lib/game-creator/arPose';
import type { ArSettings } from '@/lib/game-creator/arSettings';
import { GESTURE_TEXT, Gestures, MOTIONS, SENS, motionOn, sensK, type GestureEvent, type MotionId } from '@/lib/game-creator/ar/gestures';
import { ATTACK_TEXT, bossById, bossHp, bossQuestions, defended, pickAttack, shotDamage, type AttackKind, type BossDef } from '@/lib/game-creator/ar/boss';
import { COMBO_TEXT, Combo } from '@/lib/game-creator/ar/combo';
import { POWERS, Powers, earnedPowers, powerById, type PowerId } from '@/lib/game-creator/ar/powerups';
import { upEffects } from '@/lib/game-creator/ar/upgrades';
import { ALL_STAGES, nextStage, stageById, unlocked, type Stage } from '@/lib/game-creator/ar/map';
import { addStats, allCorrectRounds, dailyFor, done, stageQuests, ZERO_STATS, type Quest, type Stats } from '@/lib/game-creator/ar/missions';
import { TEAM_HEX, TEAM_NAMES, memberOf, sidesOf, teamCount, teamMode, teamOf, type TeamMode } from '@/lib/game-creator/ar/teams';
import { EMPTY_SAVE, loadSave, writeSave, type ArSave } from '@/lib/game-creator/ar/save';
import { MIN_SW, Quality, pickBody, toLock, type Lock, type QualityIssue } from '@/lib/game-creator/ar/quality';
import { PoseTracker, type CamError } from './tracker';
import { ALIEN_COLORS, SpaceScene } from './scene';
import { ArMap } from './ArMap';
import { ArTeacher, type BoardRow } from './ArTeacher';
import { ArResult, emptyTeamStat, type MemberStat, type RunResult, type TeamStat } from './ArResult';
import './ar.css';
import './ar-systems.css';

/** จุดเล็งเทียบกับมือ: 1 = อยู่ที่มือพอดี, มากกว่า 1 = ยืดออกจากไหล่ (ขยับแขนน้อยลง) */
const REACH = [
  { v: 1, name: 'ตรงมือพอดี' },
  { v: 1.35, name: 'ยืดไกลขึ้น' },
  { v: 1.75, name: 'ขยับแขนน้อย' },
];
const DRIFT = [0.04, 0.1, 0.17];
const DRIFT_SPEED = [0.55, 0.85, 1.25];
const METEOR_LIFE = [3.0, 2.4, 1.9];
/** ความถี่/ความแรงการโจมตีของบอสตามความยาก */
const ATK_EVERY = [1.3, 1, 0.8];
const ATK_DMG = [0.7, 1, 1.25];
const ENTER_S = 0.8;
const SWAP_S = 2.4;
const BOSS_IN_S = 3.4;
const REVEAL_S = 1.9;
const BONUS_S = 5.5;
const VICTORY_S = 4.5;
const STUN_S = 2;

type Phase = 'setup' | 'loading' | 'calib' | 'map' | 'count' | 'play' | 'end';
type Sub = 'enter' | 'ask' | 'reveal' | 'bonus' | 'attack' | 'victory';

/** มือแต่ละข้าง: เป้าจากผลตรวจล่าสุด (aim) + จุดที่วาดไหลตามทุกเฟรม (disp) + หลอดค้างเป้าของตัวเอง */
interface HandRT {
  aim: { x: number; y: number } | null;
  disp: Follow;
  dwell: Dwell;
  hit: Dwell;
}
interface SideRT {
  body: Body | null;
  smooth: BodySmoother;
  draw: { x: number; y: number; v: number }[];
  seenAt: number;
  seenSince: number;
  hands: Record<HandSide, HandRT>;
  charge: Hold;
  chargeT: number;
  gest: Gestures;
  /** จับท่ายืนปกติใหม่จนถึงเวลานี้ (เปลี่ยนคนคุมยาน) */
  recalUntil: number;
  /** ผู้เล่นที่ล็อกไว้ (คนข้างหลัง/เดินผ่านไม่แย่ง) */
  lock: Lock | null;
  qual: Quality;
  issue: QualityIssue;
  /** ปุ่มแตะจอแทนท่าทาง */
  tLean: -1 | 0 | 1;
  tLeanUntil: number;
  tShieldUntil: number;
  tJumpAt: number;
  /** โล่ฟองโชว์ชั่วครู่หลังกันได้ */
  flashUntil: number;
  shipOff: number;
}
const newHand = (): HandRT => ({ aim: null, disp: new Follow(), dwell: new Dwell(850), hit: new Dwell(260) });
const newRT = (): SideRT => ({
  body: null,
  smooth: new BodySmoother(),
  draw: [],
  seenAt: -1e9,
  seenSince: 0,
  hands: { l: newHand(), r: newHand() },
  charge: new Hold(3, 5),
  chargeT: 0,
  gest: new Gestures(),
  recalUntil: 0,
  lock: null,
  qual: new Quality(),
  issue: null,
  tLean: 0,
  tLeanUntil: 0,
  tShieldUntil: 0,
  tJumpAt: -1e9,
  flashUntil: 0,
  shipOff: 0,
});
const aimOf = (h: HandRT) => (h.aim && h.disp.on ? { x: h.disp.x, y: h.disp.y } : null);

/** สถานะต่อทีม (คอมโบ/ไอเทม/พลังงานติดตัวทีมข้ามข้อ) */
interface TeamRT {
  combo: Combo;
  powers: Powers;
  energy: number;
  stun: number;
  shots: number;
  helps: number;
}
const newTeam = (maxE: number): TeamRT => ({ combo: new Combo(), powers: new Powers(), energy: maxE, stun: 0, shots: 0, helps: 2 });

interface QSide {
  order: string[];
  alive: Set<string>;
  done: boolean;
  got: boolean;
  firstTry: boolean;
  chargeUsed: boolean;
  wrongs: number;
  missed: boolean;
  hit: boolean;
  team: number;
  member: number;
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
interface Atk {
  id: string;
  s: number;
  kind: AttackKind;
  lane: -1 | 1;
  t: number;
  warn: number;
  sx: number;
  sy: number;
}
interface QRT {
  idx: number;
  q: QuizQuestion;
  limitMs: number;
  usedMs: number;
  sides: QSide[];
  sub: Sub;
  subT: number;
  enterS: number;
  meteors: Meteor[];
  spawnT: number;
  sirened: boolean;
  lastSec: number;
  bossQ: boolean;
  atkT: number;
  atks: Atk[];
  victoryPose: boolean[];
}
interface BossRT {
  def: BossDef;
  hp: number;
  max: number;
  on: boolean;
  alive: boolean;
  defeated: boolean;
  x: number;
  y: number;
  r: number;
  dmgBy: number[];
}
/** ค่าคงที่ของด่านที่กำลังเล่น */
interface Run {
  stage: Stage;
  teams: number;
  teamsN: number;
  sidesN: number;
  mode: TeamMode;
  members: number;
  level: number;
  bossStart: number;
  fx: ReturnType<typeof upEffects>;
  quests: Quest[];
  gotHist: boolean[][];
  stats: Stats;
  bossCoins: number;
}

interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  big?: boolean;
  kind?: 'gest' | 'combo';
}
interface Warn {
  id: string;
  s: number;
  kind: AttackKind;
  lane: -1 | 1;
  x: number;
  y: number;
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
const POWER_ICON: Record<PowerId, React.ComponentType<{ className?: string }>> = { laser: Zap, shield: Shield, double: Sparkles, speed: Gauge, restore: BatteryCharging };

/** persist = false: ทดลองเล่นในหน้าแก้ไข ไม่บันทึกเหรียญ/ดาว/ภารกิจลงเครื่อง */
export function ArGame({ questions, settings, title, onExit, persist = true }: { questions: QuizQuestion[]; settings: ArSettings; title: string; onExit: () => void; persist?: boolean }) {
  const [cfg, setCfg] = useState<ArSettings>(settings);
  const [phase, setPhase] = useState<Phase>('setup');
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState<CamError | null>(null);
  const [camLost, setCamLost] = useState(false);
  const [reach, setReach] = useState(0);
  const [count, setCount] = useState(3);
  const [qi, setQi] = useState(0);
  const [sub, setSub] = useState<Sub>('enter');
  const [orders, setOrders] = useState<string[][]>([]);
  const [marks, setMarks] = useState<Record<string, 'wrong' | 'answer'>>({});
  const [stats, setStats] = useState<TeamStat[]>(() => [0, 1, 2, 3].map(emptyTeamStat));
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [warns, setWarns] = useState<Warn[]>([]);
  const [paused, setPaused] = useState(false);
  const [teacher, setTeacher] = useState(false);
  const [away, setAway] = useState(false);
  const [secLeft, setSecLeft] = useState(0);
  const [urgent, setUrgent] = useState(false);
  const [calib, setCalib] = useState<{ seen: boolean; hand: boolean; ok: boolean }[]>([
    { seen: false, hand: false, ok: false },
    { seen: false, hand: false, ok: false },
  ]);
  const [calibGest, setCalibGest] = useState<Partial<Record<GestureEvent, boolean>>>({});
  const [fps, setFps] = useState(0);
  const [issue, setIssue] = useState<QualityIssue>(null);
  const [skipArm, setSkipArm] = useState(false);
  const issueRef = useRef<QualityIssue>(null);
  const [save, setSave] = useState<ArSave>(EMPTY_SAVE);
  const [stageId, setStageId] = useState(ALL_STAGES[0].id);
  const [stageSet, setStageSet] = useState<{ title: string; questions: QuizQuestion[] } | null>(null);
  const [setErr, setSetErr] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);
  const [sidesN, setSidesN] = useState(sidesOf(settings.teams));
  const [banner, setBanner] = useState<{ text: string; sub?: string; color: string } | null>(null);
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const skel = useRef<HTMLCanvasElement>(null);
  const tracker = useRef<PoseTracker | null>(null);
  const scene = useRef<SpaceScene | null>(null);
  const rts = useRef<SideRT[]>([newRT(), newRT()]);
  const teamRT = useRef<TeamRT[]>([0, 1, 2, 3].map(() => newTeam(100)));
  const Q = useRef<QRT | null>(null);
  const B = useRef<BossRT | null>(null);
  const R = useRef<Run | null>(null);
  const list = useRef<QuizQuestion[]>([]);
  const pos = useRef(new Map<string, { x: number; y: number; r: number }>());
  const labels = useRef(new Map<string, HTMLDivElement>());
  const rings = useRef<(SVGSVGElement | null)[]>([null, null, null, null]);
  const reticles = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const chargeBars = useRef<(HTMLDivElement | null)[]>([null, null]);
  const timeBar = useRef<HTMLDivElement>(null);
  const bossBar = useRef<HTMLDivElement>(null);
  const warnEls = useRef(new Map<string, HTMLDivElement>());
  const phaseRef = useRef<Phase>('setup');
  const pausedRef = useRef(false);
  const awayRef = useRef(false);
  const reachRef = useRef(REACH[0].v);
  const cfgRef = useRef(cfg);
  const camRef = useRef(false);
  const statRef = useRef<TeamStat[]>([0, 1, 2, 3].map(emptyTeamStat));
  const memRef = useRef(new Map<string, MemberStat>());
  const saveRef = useRef(save);
  const savedOk = useRef(true);
  const calibRef = useRef(calib);
  const floatId = useRef(0);
  const playStart = useRef(0);
  const playedMs = useRef(0);

  phaseRef.current = phase;
  pausedRef.current = paused || teacher || camLost;
  reachRef.current = REACH[reach].v;
  cfgRef.current = cfg;
  camRef.current = camOn;
  calibRef.current = calib;

  const running = phase === 'count' || phase === 'play';
  const run = R.current;
  const teamsLive = running || phase === 'end' ? run?.teams ?? cfg.teams : cfg.teams;
  const teamsN = teamCount(teamsLive);
  const mode = teamMode(teamsLive);

  /* ------------------------------ ข้อมูลในเครื่อง ------------------------------ */
  useEffect(() => {
    const s = loadSave();
    saveRef.current = s;
    setSave(s);
    setStageId(nextStage(s.stars).id);
  }, []);
  const commitSave = useCallback((s: ArSave) => {
    saveRef.current = s;
    setSave(s);
    savedOk.current = persist && writeSave(s);
  }, [persist]);

  /* ------------------------------ เพลง + ปิดกล้องตอนออก ------------------------------ */
  useEffect(() => {
    setMusic('room', roomTrack(settings.music, 'ar'));
    return () => {
      releaseMusic('room');
      tracker.current?.stop();
      tracker.current = null;
    };
  }, [settings.music]);

  /* จำนวนฝั่งบนจอเปลี่ยนตามจำนวนทีม (นอกด่าน) + ตรวจคนเพิ่ม/ลดตาม */
  useEffect(() => {
    if (running) return;
    const n = sidesOf(cfg.teams);
    setSidesN(n);
    void tracker.current?.setPoses(n === 2 ? 3 : 2);
  }, [cfg.teams, running]);

  const float = useCallback((x: number, y: number, text: string, color: string, big = false, kind?: Floater['kind']) => {
    const id = ++floatId.current;
    setFloaters((f) => [...f.slice(-12), { id, x, y, text, color, big, kind }]);
    setTimeout(() => setFloaters((f) => f.filter((v) => v.id !== id)), kind === 'gest' ? 900 : 1300);
  }, []);

  const addStat = useCallback((t: number, f: (o: TeamStat) => TeamStat) => {
    statRef.current = statRef.current.map((o, i) => (i === t ? f(o) : o));
    setStats(statRef.current);
  }, []);
  const addMember = useCallback((t: number, m: number, f: (o: MemberStat) => MemberStat) => {
    const k = `${t}-${m}`;
    const cur = memRef.current.get(k) || { team: t, member: m, know: 0, play: 0, correct: 0, wrong: 0, turns: 0 };
    memRef.current.set(k, f(cur));
  }, []);
  /** คะแนนการเล่น (ยิง/หลบ/ภารกิจ) ของทีม + ผู้ควบคุมตอนนี้ */
  const addPlay = useCallback(
    (s: number, pts: number) => {
      const sd = Q.current?.sides[s];
      if (!sd || pts <= 0) return;
      addStat(sd.team, (o) => ({ ...o, play: o.play + pts }));
      addMember(sd.team, sd.member, (o) => ({ ...o, play: o.play + pts }));
    },
    [addStat, addMember]
  );
  const runStat = (k: keyof Stats, n = 1) => {
    const r = R.current;
    if (r) r.stats = addStats(r.stats, { [k]: n });
  };

  const shipXY = useCallback((s: number) => {
    const box = root.current;
    const cw = box?.clientWidth || 800;
    const ch = box?.clientHeight || 600;
    const n = R.current?.sidesN ?? 1;
    return { x: (s + 0.5) * (cw / n), y: ch * 0.92, cw, ch, half: cw / n };
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
    const err = await t.start(sidesOf(cfgRef.current.teams) === 2 ? 3 : 2);
    if (tracker.current !== t) return;
    if (err) {
      t.stop();
      tracker.current = null;
      setCamErr(err);
      setPhase('setup');
      return;
    }
    setCamOn(true);
    setCamLost(false);
    setPhase('calib');
  };

  const toTouch = () => {
    tracker.current?.stop();
    tracker.current = null;
    setCamOn(false);
    setCamLost(false);
    rts.current.forEach((rt) => {
      rt.body = null;
      rt.draw = [];
    });
  };
  const startTouch = () => {
    gsfx.unlock();
    gsfx.tap();
    toTouch();
    setPhase('map');
  };

  /* ชุดคำถามที่ครูผูกกับด่าน (โหลดไม่ได้/ข้อไม่พอ = ใช้ชุดที่เปิดเกมมา และบอกครู) */
  const setCache = useRef(new Map<string, Promise<{ title: string; questions: QuizQuestion[] } | string>>());
  const loadSet = useCallback((id: string) => {
    let p = setCache.current.get(id);
    if (!p) {
      p = Promise.resolve(createClient().from('user_games').select('title, content').eq('id', id).maybeSingle()).then(({ data: row, error }) => {
        if (error || !row) return 'เปิดชุดคำถามของด่านนี้ไม่ได้ ใช้ชุดที่เปิดเกมมาแทน';
        const content = sanitizeQuiz(row.content, mediaPrefix());
        if (!modeFit(content, 'ar').ok) return 'ชุดของด่านนี้มีข้อเลือกตอบไม่พอ ใช้ชุดที่เปิดเกมมาแทน';
        return { title: row.title as string, questions: modeQuiz(content, 'ar').questions };
      });
      // ล้มเหลว = ลองใหม่ได้ครั้งหน้า
      p.then((v) => typeof v === 'string' && setCache.current.delete(id));
      setCache.current.set(id, p);
    }
    return p;
  }, []);
  const boundSet = save.sets[stageId];
  useEffect(() => {
    setStageSet(null);
    setSetErr('');
    if (!boundSet) return;
    let off = false;
    loadSet(boundSet).then((v) => {
      if (off) return;
      if (typeof v === 'string') setSetErr(v);
      else setStageSet(v);
    });
    return () => {
      off = true;
    };
  }, [boundSet, loadSet]);

  /* ------------------------------ รอบเล่น ------------------------------ */
  const clearScene = useCallback(() => {
    const sc = scene.current;
    const qr = Q.current;
    if (sc && qr) {
      qr.sides.forEach((d, s) => d.order.forEach((cid) => sc.remove(aid(s, cid))));
      qr.meteors.forEach((m) => sc.remove(m.id));
      qr.atks.forEach((a) => sc.remove(a.id));
    }
    sc?.remove('boss');
    sc?.remove('p0');
    sc?.remove('p1');
    for (let s = 0; s < 4; s++) sc?.bubble(`ship${s}`, false);
    setWarns([]);
  }, []);

  const beginRun = useCallback(
    async (sid?: string) => {
      const st = stageById(sid || stageId);
      const bound = saveRef.current.sets[st.id];
      let src = questions;
      if (bound) {
        const v = await loadSet(bound);
        if (typeof v === 'string') setSetErr(v);
        else src = v.questions;
      }
      clearScene();
      const c = cfgRef.current;
      const pool = shuffle(src);
      list.current = c.count > 0 ? pool.slice(0, c.count) : pool;
      const fx = upEffects(saveRef.current.ups);
      const teams = c.teams;
      const level = c.level === 3 ? st.level : c.level;
      const def = bossById(c.boss === 'auto' ? st.boss : c.boss);
      const total = list.current.length;
      const bq = bossQuestions(total);
      R.current = {
        stage: st,
        teams,
        teamsN: teamCount(teams),
        sidesN: sidesOf(teams),
        mode: teamMode(teams),
        members: teams > 0 ? c.members : 1,
        level,
        bossStart: total - bq,
        fx,
        quests: stageQuests(teamCount(teams), true),
        gotHist: [],
        stats: { ...ZERO_STATS },
        bossCoins: 0,
      };
      setSidesN(sidesOf(teams));
      B.current = { def, hp: 0, max: 0, on: false, alive: true, defeated: false, x: 0, y: 0, r: 0, dmgBy: [0, 0, 0, 0] };
      teamRT.current = [0, 1, 2, 3].map(() => newTeam(fx.maxEnergy));
      statRef.current = [0, 1, 2, 3].map(emptyTeamStat);
      setStats(statRef.current);
      memRef.current.clear();
      playedMs.current = 0;
      playStart.current = 0;
      Q.current = null;
      setMarks({});
      setOrders([]);
      setQi(0);
      setPaused(false);
      setTeacher(false);
      setResult(null);
      setBanner(null);
      setPhase('count');
    },
    [questions, stageId, loadSet, clearScene]
  );

  /** ยานของฝั่ง s ใช้สีทีมที่คุมอยู่ (ผลัดกันเล่น = เปลี่ยนสีทุกข้อ) */
  const paintShip = useCallback((s: number, team: number) => {
    const sc = scene.current;
    if (!sc) return;
    sc.remove(`ship${s}`);
    sc.ship(`ship${s}`, TEAM_HEX[team]);
  }, []);

  const finishRun = useCallback(() => {
    const r = R.current;
    const b = B.current;
    if (!r) return;
    if (playStart.current) playedMs.current += performance.now() - playStart.current;
    playStart.current = 0;
    clearScene();
    const st = statRef.current.slice(0, r.teamsN);
    const total = list.current.length;
    // ดาว: จอแบ่ง = ทีมที่ดีที่สุด (ทุกทีมได้ทุกข้อ) / เดี่ยว+ผลัด = รวมทุกทีม (ข้อละทีม)
    const first = r.mode === 'split' ? Math.max(...st.map((s) => s.first)) : st.reduce((a, s) => a + s.first, 0);
    const stars = arStars(first, total);
    const quests = r.quests.map((q) => {
      const v =
        q.kind === 'allCorrect'
          ? allCorrectRounds(r.gotHist, r.teamsN, r.mode === 'relay')
          : q.kind === 'teamDodge'
            ? st.reduce((a, s) => a + s.dodge, 0)
            : q.kind === 'bossDown'
              ? b?.defeated
                ? 1
                : 0
              : q.kind === 'combo'
                ? Math.max(...st.map((s) => s.bestAnswer))
                : st.reduce((a, s) => a + s.perfect, 0);
      return { text: q.text, ok: v >= q.target };
    });
    const points = st.reduce((a, s) => a + s.know + s.play, 0);
    const coins = Math.floor(points / 25) + r.bossCoins + quests.filter((q) => q.ok).length * 15;
    const runStats = addStats(r.stats, { games: 1 });
    const old = saveRef.current;
    const today = addStats(old.today, runStats);
    const daily = dailyFor(old.day, old.custom);
    const dailyDone = daily.filter((m) => !done(m, old.today) && done(m, today)).length;
    const next: ArSave = {
      ...old,
      coins: old.coins + coins,
      stars: { ...old.stars, [r.stage.id]: Math.max(old.stars[r.stage.id] || 0, stars) },
      today,
      total: addStats(old.total, runStats),
    };
    commitSave(next);
    setResult({
      teams: st.map((s, i) => ({ name: r.teamsN > 1 ? TEAM_NAMES[i] : 'ยานของฉัน', color: TEAM_HEX[i], s })),
      members: [...memRef.current.values()].sort((a, b2) => a.team - b2.team || a.member - b2.member),
      total,
      playMs: playedMs.current,
      quests,
      dailyDone,
      boss: b?.on ? { name: b.def.name, defeated: b.defeated, left: Math.round((Math.max(0, b.hp) / Math.max(1, b.max)) * 100) } : null,
      coins,
      stars,
      stageName: r.stage.name,
      saved: persist ? savedOk.current : null,
    });
    setPhase('end');
    gsfx.fanfare();
  }, [clearScene, commitSave, persist]);

  const loadQuestion = useCallback(
    (idx: number) => {
      const r = R.current;
      const q = list.current[idx];
      if (!q || !r) return finishRun();
      const sc = scene.current;
      const prev = Q.current;
      const sides: QSide[] = [];
      const ord: string[][] = [];
      let enterS = ENTER_S;
      let msg: { text: string; sub?: string; color: string } | null = null;
      for (let s = 0; s < r.sidesN; s++) {
        const team = teamOf(r.teams, s, idx);
        const member = memberOf(r.teams, idx, r.members);
        const order = shuffle(q.choices.map((c) => c.id));
        ord.push(order);
        sides.push({ order, alive: new Set(order), done: false, got: false, firstTry: true, chargeUsed: false, wrongs: 0, missed: false, hit: false, team, member });
        order.forEach((cid, i) => sc?.alien(aid(s, cid), ALIEN_COLORS[i % ALIEN_COLORS.length]));
        const rt = rts.current[s];
        const fxe = r.fx;
        const fast = teamRT.current[team].powers.has('speed');
        for (const h of HANDS) {
          rt.hands[h].dwell.reset();
          rt.hands[h].hit.reset();
          rt.hands[h].dwell.ms = fast ? fxe.dwellMs * 0.65 : fxe.dwellMs;
          rt.hands[h].hit.ms = fast ? fxe.hitMs * 0.6 : fxe.hitMs;
        }
        const prevSide = prev?.sides[s];
        const swapped = !prevSide || prevSide.team !== team || prevSide.member !== member;
        if (r.mode === 'relay' && (!prevSide || prevSide.team !== team)) paintShip(s, team);
        if (swapped && (r.mode === 'relay' || r.members > 1) && idx > 0) {
          // คนใหม่มาคุมยาน: จับท่ายืนปกติใหม่ระหว่างช่วงเปลี่ยนคน
          rt.gest.reset();
          // ปล่อยคนเดิม (มักยังเดินอยู่ในภาพ) ให้คนใหม่ที่ใกล้กล้องสุดคุมแทน
          rt.lock = null;
          rt.qual.reset();
          rt.smooth.reset();
          rt.recalUntil = performance.now() + SWAP_S * 1000;
          enterS = Math.max(enterS, SWAP_S);
          const who = r.members > 1 ? `คนที่ ${member + 1}` : 'ตัวแทนทีม';
          msg = { text: r.sidesN === 2 ? 'สลับคนคุมยาน!' : `ตา${TEAM_NAMES[team]}`, sub: r.sidesN === 2 ? `ทั้งสองทีมส่ง${who}ออกมา` : `${who} ของ${TEAM_NAMES[team]} มาคุมยาน`, color: TEAM_HEX[team] };
        }
        addMember(team, member, (o) => ({ ...o, turns: o.turns + 1 }));
      }
      const b = B.current;
      const bossQ = !!b && b.alive && idx >= r.bossStart;
      if (b && bossQ && !b.on) {
        b.on = true;
        b.max = b.hp = bossHp(b.def, list.current.length - r.bossStart, r.sidesN);
        const { cw, ch } = shipXY(0);
        b.x = cw / 2;
        b.y = -ch * 0.2;
        b.r = Math.min(cw, ch) * 0.08;
        sc?.boss('boss', b.def.id);
        for (let t = 0; t < r.teamsN; t++) for (let k = 0; k < r.fx.startShield; k++) teamRT.current[t].powers.add('shield');
        enterS = Math.max(enterS, BOSS_IN_S);
        msg = { text: `${b.def.name} มาแล้ว!`, sub: 'ตอบถูกได้กระสุนเลเซอร์ เว้นที่รอบตัว เอียงตัวพอ ไม่ต้องวิ่ง', color: b.def.color };
        gsfx.siren();
      }
      const c = cfgRef.current;
      const base = c.time > 0 ? c.time : q.time > 0 ? Math.max(20, q.time) : 45;
      Q.current = { idx, q, limitMs: base * 1000, usedMs: 0, sides, sub: 'enter', subT: 0, enterS, meteors: [], spawnT: 0, sirened: false, lastSec: -1, bossQ, atkT: 0.8, atks: [], victoryPose: [false, false] };
      setBanner(msg);
      setOrders(ord);
      setMarks({});
      setQi(idx);
      setSub('enter');
      setUrgent(false);
      setSecLeft(base);
      setWarns([]);
      gsfx.whoosh();
    },
    [finishRun, paintShip, shipXY, addMember]
  );

  /** จบข้อ: ไอเทมแบบนับข้อลดลง บันทึกผลรายข้อสำหรับภารกิจร่วมมือ แล้วไปข้อต่อไป */
  const endQuestion = useCallback(() => {
    const qr = Q.current;
    const r = R.current;
    if (!qr || !r) return;
    const seen = new Set<number>();
    qr.sides.forEach((d) => {
      if (seen.has(d.team)) return;
      seen.add(d.team);
      teamRT.current[d.team].powers.endQuestion();
    });
    r.gotHist.push(qr.sides.map((d) => d.got));
    loadQuestion(qr.idx + 1);
  }, [loadQuestion]);

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
        const r = R.current;
        if (r) for (let s = 0; s < r.sidesN; s++) paintShip(s, teamOf(r.teams, s, 0));
        setPhase('play');
        loadQuestion(0);
      }
    }, 850);
    return () => clearInterval(t);
  }, [phase, loadQuestion, paintShip]);

  /* ------------------------------ ไอเทม ------------------------------ */
  const givePower = useCallback(
    (s: number, id: PowerId, x: number, y: number) => {
      const sd = Q.current?.sides[s];
      const r = R.current;
      if (!sd || !r) return;
      const tr = teamRT.current[sd.team];
      tr.powers.add(id);
      if (id === 'restore') {
        tr.energy = r.fx.maxEnergy;
        tr.stun = 0;
      }
      const d = powerById(id);
      scene.current?.pickup(x, y, `ship${s}`, d.color);
      setTimeout(() => float(x, y - 70, d.name, d.color, true), 200);
      gsfx.boost();
      addStat(sd.team, (o) => ({ ...o, powers: o.powers + 1 }));
      bump();
    },
    [addStat, bump, float]
  );

  const comboFx = useCallback(
    (s: number, text: string, color: string) => {
      const { x, ch } = shipXY(s);
      float(x, ch * 0.62, text, color, true, 'combo');
    },
    [float, shipXY]
  );

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
      const tr = teamRT.current[sd.team];
      const correct = !!qr.q.choices.find((c) => c.id === cid)?.correct;
      sc?.laser(`ship${s}`, p.x, p.y, TEAM_HEX[sd.team]);
      gsfx.laser();
      if (correct) {
        const base = arAnswerPoints(sd.firstTry, qr.usedMs, qr.limitMs);
        const superNow = tr.combo.onAnswer(true);
        const pts = Math.round(base * tr.combo.answerMult * (tr.powers.has('double') ? 2 : 1));
        sd.done = sd.got = true;
        sd.alive.delete(cid);
        sc?.burst(p.x, p.y, TEAM_HEX[sd.team], 1.3);
        sc?.remove(id);
        addStat(sd.team, (o) => ({ ...o, know: o.know + pts, correct: o.correct + 1, first: o.first + (sd.firstTry ? 1 : 0), bestAnswer: Math.max(o.bestAnswer, tr.combo.answer), supers: tr.combo.supers }));
        addMember(sd.team, sd.member, (o) => ({ ...o, know: o.know + pts, correct: o.correct + 1 }));
        runStat('correct');
        if (sd.firstTry) runStat('firstTry');
        if (R.current) R.current.stats = addStats(R.current.stats, { combo: tr.combo.answer });
        float(p.x, p.y - p.r, `+${pts}`, '#ffe14a', true);
        gsfx.correct();
        if (tr.combo.answer >= 2) setTimeout(() => (comboFx(s, `${COMBO_TEXT.answer} x${tr.combo.answer}`, '#ff8af0'), gsfx.streak()), 280);
        if (superNow) setTimeout(() => (comboFx(s, COMBO_TEXT.super, '#ffe14a'), gsfx.levelUp()), 600);
        if (qr.bossQ && B.current?.alive && R.current) {
          tr.shots += R.current.fx.shots;
          setTimeout(() => float(p.x, p.y + p.r, `กระสุนเลเซอร์ +${R.current?.fx.shots ?? 0}`, '#8af5ff'), 450);
        }
        const earned = earnedPowers({ correct: true, firstTry: sd.firstTry, fast: qr.usedMs < qr.limitMs / 2, answerCombo: tr.combo.answer, energyRatio: tr.energy / (R.current?.fx.maxEnergy || 100) });
        earned.forEach((pw, i) => setTimeout(() => givePower(s, pw, p.x, p.y), 700 + i * 350));
        bump();
      } else {
        sd.firstTry = false;
        sd.wrongs++;
        tr.combo.onAnswer(false);
        sd.alive.delete(cid);
        sc?.wobble(id);
        setMarks((m) => ({ ...m, [id]: 'wrong' }));
        addStat(sd.team, (o) => ({ ...o, wrong: o.wrong + 1 }));
        addMember(sd.team, sd.member, (o) => ({ ...o, wrong: o.wrong + 1 }));
        float(p.x, p.y - p.r, 'ลองอีกที', '#ff7a90');
        gsfx.wrong();
        bump();
      }
    },
    [addStat, addMember, float, comboFx, givePower, bump]
  );

  /** เพื่อนในทีมช่วย: เอาตัวเลือกผิด 1 ตัวออก (ทีมละ 2 ครั้งต่อด่าน) */
  const help = useCallback(
    (s: number) => {
      const qr = Q.current;
      if (!qr || qr.sub !== 'ask') return;
      const sd = qr.sides[s];
      const tr = sd && teamRT.current[sd.team];
      if (!sd || !tr || sd.done || tr.helps <= 0) return;
      const wrong = [...sd.alive].filter((cid) => !qr.q.choices.find((c) => c.id === cid)?.correct);
      if (!wrong.length) return;
      const cid = wrong[Math.floor(Math.random() * wrong.length)];
      tr.helps--;
      sd.alive.delete(cid);
      scene.current?.flyAway(aid(s, cid));
      setMarks((m) => ({ ...m, [aid(s, cid)]: 'wrong' }));
      addStat(sd.team, (o) => ({ ...o, helps: o.helps + 1 }));
      gsfx.whoosh();
      bump();
    },
    [addStat, bump]
  );

  const shootMeteor = useCallback(
    (m: Meteor, p: { x: number; y: number }) => {
      const qr = Q.current;
      if (!qr) return;
      const sd = qr.sides[m.s];
      qr.meteors = qr.meteors.filter((o) => o !== m);
      scene.current?.laser(`ship${m.s}`, p.x, p.y, TEAM_HEX[sd.team]);
      scene.current?.burst(p.x, p.y, '#ffcf6b', 0.8);
      scene.current?.remove(m.id);
      gsfx.laser();
      const tr = teamRT.current[sd.team];
      const superNow = tr.combo.onShot();
      const pts = Math.round(AR_POINTS.meteor * tr.combo.shootMult);
      addPlay(m.s, pts);
      addStat(sd.team, (o) => ({ ...o, meteors: o.meteors + 1, bestShoot: Math.max(o.bestShoot, tr.combo.shoot), supers: tr.combo.supers }));
      runStat('meteor');
      float(p.x, p.y, `+${pts}`, '#8af5ff');
      if (tr.combo.shoot > 0 && tr.combo.shoot % 5 === 0) comboFx(m.s, `${COMBO_TEXT.shoot} x${tr.combo.shoot}`, '#8af5ff');
      if (superNow) (comboFx(m.s, COMBO_TEXT.super, '#ffe14a'), gsfx.levelUp());
    },
    [addPlay, addStat, float, comboFx]
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
      const { x, ch } = shipXY(s);
      float(x, ch * 0.5, 'ระเบิดพลัง!', TEAM_HEX[sd.team], true);
    },
    [float, shootMeteor, shipXY]
  );

  /** ยิงบอส 1 นัด */
  const shootBoss = useCallback(
    (s: number) => {
      const qr = Q.current;
      const b = B.current;
      const r = R.current;
      if (!qr || !b || !r || !b.alive || qr.sub !== 'attack') return;
      const sd = qr.sides[s];
      const tr = teamRT.current[sd.team];
      if (tr.shots <= 0 || tr.stun > 0) return;
      tr.shots--;
      const dmg = shotDamage(r.fx.laserLvl, tr.powers.has('laser'));
      b.hp -= dmg;
      b.dmgBy[sd.team] += dmg;
      const sc = scene.current;
      sc?.laser(`ship${s}`, b.x, b.y, tr.powers.has('laser') ? '#ff5a7a' : TEAM_HEX[sd.team]);
      sc?.burst(b.x + (Math.random() - 0.5) * b.r, b.y + (Math.random() - 0.5) * b.r, b.def.color, 0.7);
      sc?.pulse('boss', 0.5);
      gsfx.laser();
      const superNow = tr.combo.onShot();
      const pts = Math.round(dmg * tr.combo.shootMult);
      addPlay(s, pts);
      addStat(sd.team, (o) => ({ ...o, bossDmg: o.bossDmg + dmg, bestShoot: Math.max(o.bestShoot, tr.combo.shoot), supers: tr.combo.supers }));
      float(b.x + (Math.random() - 0.5) * b.r, b.y - b.r * 0.6, `-${dmg}`, '#ff8aa8', true);
      if (tr.combo.shoot > 0 && tr.combo.shoot % 5 === 0) comboFx(s, `${COMBO_TEXT.shoot} x${tr.combo.shoot}`, '#8af5ff');
      if (superNow) (comboFx(s, COMBO_TEXT.super, '#ffe14a'), gsfx.levelUp());
      if (b.hp <= 0) {
        b.hp = 0;
        b.alive = false;
        b.defeated = true;
        qr.atks.forEach((a) => sc?.remove(a.id));
        qr.atks = [];
        setWarns([]);
        for (let i = 0; i < 5; i++) setTimeout(() => sc?.burst(b.x + (Math.random() - 0.5) * b.r * 2, b.y + (Math.random() - 0.5) * b.r * 2, i % 2 ? '#ffe14a' : b.def.color, 1.6), i * 160);
        setTimeout(() => sc?.remove('boss'), 600);
        gsfx.boom();
        setTimeout(() => gsfx.fanfare(), 500);
        runStat('boss');
        qr.sub = 'victory';
        qr.subT = 0;
        setSub('victory');
      }
      bump();
    },
    [addPlay, addStat, float, comboFx, bump]
  );

  /** การโจมตีของบอสมาถึง: หลบ/กันได้ไหม */
  const resolveAtk = useCallback(
    (a: Atk) => {
      const qr = Q.current;
      const r = R.current;
      const b = B.current;
      if (!qr || !r || !b) return;
      const sd = qr.sides[a.s];
      const rt = rts.current[a.s];
      const tr = teamRT.current[sd.team];
      const now = performance.now();
      const st = {
        lean: (rt.tLeanUntil > now ? rt.tLean : camRef.current ? rt.gest.lean : 0) as -1 | 0 | 1,
        shield: rt.tShieldUntil > now || (camRef.current && rt.gest.shield),
        jumpAt: Math.max(rt.tJumpAt, camRef.current ? rt.gest.jumpAt : -1e9),
        now,
      };
      const { x, y } = shipXY(a.s);
      const sc = scene.current;
      if (defended(a.kind, a.lane, st)) {
        const pts = Math.round(15 * tr.combo.shootMult);
        addPlay(a.s, pts);
        addStat(sd.team, (o) => ({ ...o, dodge: o.dodge + 1 }));
        runStat(a.kind === 'wide' ? 'shield' : 'dodge');
        float(x, y - 90, a.kind === 'wide' ? 'กันได้!' : 'หลบได้!', '#7fffd4', true);
        if (a.kind === 'wide') {
          rt.flashUntil = now + 500;
        }
        gsfx.whoosh();
      } else if (tr.powers.useShield()) {
        rt.flashUntil = now + 600;
        float(x, y - 90, 'Energy Shield กันไว้!', '#4fd1ff', true);
        gsfx.boost();
      } else {
        const dmg = Math.round(b.def.dmg * (ATK_DMG[r.level] ?? 1));
        tr.energy = Math.max(0, tr.energy - dmg);
        tr.combo.onMiss();
        sd.hit = true;
        addStat(sd.team, (o) => ({ ...o, hits: o.hits + 1 }));
        sc?.pulse(`ship${a.s}`, 0.6);
        sc?.burst(x, y, '#ff7a90', 0.6);
        gsfx.hurt();
        const el = stage.current;
        if (el) {
          el.classList.remove('ar-shake');
          void el.offsetWidth;
          el.classList.add('ar-shake');
        }
        if (tr.energy <= 0) {
          tr.stun = STUN_S;
          tr.energy = Math.round(r.fx.maxEnergy * 0.3);
          float(x, y - 90, 'ยานมึน! พักแป๊บเดียว', '#ffb3c1', true);
        } else float(x, y - 90, `-${dmg} พลังงาน`, '#ff7a90');
      }
      sc?.remove(a.id);
      setWarns((w) => w.filter((o) => o.id !== a.id));
      bump();
    },
    [addPlay, addStat, float, shipXY, bump]
  );

  /** จบรอบยิงของข้อ: เช็ก Perfect ทุกฝั่งที่ตอบถูก */
  const roundEnd = useCallback(() => {
    const qr = Q.current;
    if (!qr) return;
    qr.sides.forEach((d, s) => {
      if (!d.got) return;
      const tr = teamRT.current[d.team];
      if (tr.combo.onRoundEnd(d.firstTry && !d.missed && !d.hit)) {
        addPlay(s, 30);
        addStat(d.team, (o) => ({ ...o, perfect: o.perfect + 1 }));
        runStat('perfect');
        comboFx(s, `PERFECT x${tr.combo.perfect}`, '#7fffd4');
        const { x, y } = shipXY(s);
        givePower(s, 'shield', x, y - 160);
      }
    });
  }, [addPlay, addStat, comboFx, givePower, shipXY]);

  /** ท่าทางที่ตรวจเจอจริง (หรือปุ่มท่าชัยชนะ): ป้ายบอกบนจอ + ผลในเกม */
  const onGesture = useCallback(
    (s: number, e: GestureEvent, fromCam: boolean) => {
      const qr = Q.current;
      const { x, y } = shipXY(s);
      if (fromCam && phaseRef.current === 'calib') {
        setCalibGest((g) => (g[e] ? g : { ...g, [e]: true }));
      }
      // ป้ายท่าทางขึ้นเฉพาะเมื่อกล้องตรวจเจอจริง (ปุ่ม/คีย์บอร์ดไม่ขึ้น)
      if (fromCam) float(x, y - 120, GESTURE_TEXT[e], '#ffffff', false, 'gest');
      if (e === 'victory' && qr?.sub === 'victory' && !qr.victoryPose[s]) {
        qr.victoryPose[s] = true;
        addPlay(s, 50);
        float(x, y - 160, 'ท่าชัยชนะ! +50', '#ffe14a', true);
        gsfx.levelUp();
      }
    },
    [addPlay, float, shipXY]
  );

  /** ปุ่มแตะจอ/คีย์บอร์ดแทนท่าทาง */
  const touchMove = useCallback(
    (s: number, m: 'L' | 'R' | 'shield' | 'jump' | 'victory') => {
      const rt = rts.current[s];
      const now = performance.now();
      gsfx.tap();
      if (m === 'L' || m === 'R') {
        rt.tLean = m === 'L' ? -1 : 1;
        rt.tLeanUntil = now + 900;
      } else if (m === 'shield') rt.tShieldUntil = now + 1100;
      else if (m === 'jump') rt.tJumpAt = now;
      else onGesture(s, 'victory', false);
    },
    [onGesture]
  );

  /* ------------------------------ ฉาก + วนเฟรม ------------------------------ */
  const live = phase === 'calib' || phase === 'count' || phase === 'play' || phase === 'map';
  const hasScene = phase !== 'setup' && phase !== 'loading';

  useEffect(() => {
    if (!hasScene || !stage.current || scene.current) return;
    try {
      scene.current = new SpaceScene(stage.current, camOn);
    } catch {
      /* ไม่มี WebGL: เล่นต่อได้ด้วยป้ายตัวเลือก */
    }
  }, [hasScene, camOn]);

  /* ยานตามจำนวนฝั่ง */
  useEffect(() => {
    const sc = scene.current;
    if (!sc || !hasScene) return;
    for (let s = 0; s < 4; s++) sc.remove(`ship${s}`);
    for (let s = 0; s < sidesN; s++) sc.ship(`ship${s}`, TEAM_HEX[s]);
  }, [sidesN, hasScene]);

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
    let camCheck = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // ลดความร้อน: วนเกมไม่เกิน ~30 ภาพ/วิ (จอ 60/120Hz ไม่ต้องวาดทุกรอบ จุดเล็งไหลตามด้วย Follow อยู่แล้ว)
      // หน้าแผนที่/พักเกม (มีแผงทึบบัง) วาดแค่ ~10 ภาพ/วิ และไม่ตรวจท่า
      const idle = phaseRef.current === 'map' || pausedRef.current;
      if (now - last < (idle ? 100 : 30)) return;
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
      const r = R.current;
      const b = B.current;
      const sc = scene.current;
      const c = cfgRef.current;
      const k = sensK(c.sens);
      const attackOn = ph === 'play' && qr?.sub === 'attack';
      const fullArea: Rect = { x: 12, y: ch * 0.06, w: cw - 24, h: ch * 0.78 };

      /* ---- กล้องหลุด (ถอดสาย/แอปอื่นแย่งกล้อง) ---- */
      const tr = tracker.current;
      if (tr && now - camCheck > 1000) {
        camCheck = now;
        if (!tr.live && camRef.current) setCamLost(true);
      }

      /* ---- ตรวจท่าทาง: ผลใหม่มาเมื่อกล้องมีเฟรมใหม่ ---- */
      if (tr?.ready && !idle && tr.tick(now)) {
        const v = video.current!;
        const view = { vw: v.videoWidth || 1280, vh: v.videoHeight || 720, cw, ch, mirror: true };
        const bodies: Body[] = [];
        for (const l of tr.poses) {
          const bd = toBody(l, view);
          if (bd) bodies.push(bd);
        }
        // คนไกล/คนข้างหลัง (ไหล่แคบ) ไม่นับ แล้วแต่ละฝั่งยึดผู้เล่นคนเดิมไว้
        const near = bodies.filter((b) => b.sw >= cw * MIN_SW);
        for (let s = 0; s < sidesN; s++) {
          const rt = rts.current[s];
          const cands = sidesN === 2 ? near.filter((b) => (b.cx < cw / 2) === (s === 0)) : near;
          const raw = pickBody(cands, rt.lock, now);
          if (!raw) {
            rt.charge.update(false);
            continue;
          }
          rt.lock = toLock(raw, now);
          if (now - rt.seenAt > 400) {
            rt.seenSince = now;
            rt.smooth.reset();
            rt.qual.reset();
            rt.draw = [];
          }
          rt.seenAt = now;
          rt.issue = rt.qual.update(raw, now);
          const bd = rt.smooth.smooth(raw, now);
          rt.body = bd;
          // ตัวสั่น/สลับคน = จุดเพี้ยน ไม่นับการเล็งช่วงนั้น / หน้าถูกบังแค่เตือน (เด็กใส่หน้ากากอนามัยยังเล่นได้)
          if (rt.issue === 'shaky') {
            rt.charge.update(false);
            for (const h of HANDS) rt.hands[h].aim = null;
            continue;
          }
          rt.charge.update(motionOn(c.motions, 'charge') && rt.gest.charge);
          for (const h of HANDS) rt.hands[h].aim = aimFromHand(bd, h, reachRef.current, attackOn ? fullArea : area(s));
          // ท่ายืนปกติ: ช่วงแรกที่เห็นตัว / ช่วงเปลี่ยนคนคุมยาน = จับใหม่ ไม่นับท่า
          if (now - rt.seenSince < 900 || now < rt.recalUntil) rt.gest.calibrate(bd);
          else for (const e of rt.gest.update(bd, now, k)) if (motionOn(c.motions, e === 'dodgeL' || e === 'dodgeR' ? 'dodge' : (e as MotionId))) onGesture(s, e, true);
        }
      }
      for (let s = 0; s < sidesN; s++) {
        const rt = rts.current[s];
        if (now - rt.seenAt > 400) {
          rt.body = null;
          rt.issue = null;
          rt.draw = [];
          rt.gest.lean = 0;
          rt.gest.shield = false;
          for (const h of HANDS) {
            rt.hands[h].aim = null;
            rt.hands[h].disp.reset();
          }
        }
        for (const h of HANDS) {
          const hd = rt.hands[h];
          if (hd.aim) hd.disp.step(hd.aim.x, hd.aim.y, dt);
          else hd.disp.reset();
        }
        if (rt.body) {
          const kk = 1 - Math.exp(-dt * 26);
          rt.draw = rt.body.pts.map((p, i) => {
            const d = rt.draw[i];
            return d ? { x: d.x + (p.x - d.x) * kk, y: d.y + (p.y - d.y) * kk, v: p.v } : { ...p };
          });
        }
      }
      // โครงร่างของคนที่คุมแต่ละฝั่ง
      const cv = skel.current;
      const g2 = cv && tr ? cv.getContext('2d') : null;
      if (cv && g2) {
        if (cv.width !== cw || cv.height !== ch) {
          cv.width = cw;
          cv.height = ch;
        }
        g2.clearRect(0, 0, cw, ch);
        g2.lineCap = 'round';
        for (let s = 0; s < sidesN; s++) {
          const rt = rts.current[s];
          const pts = rt.draw;
          if (!rt.body || !pts.length) continue;
          const sw = rt.body.sw;
          const team = qr?.sides[s]?.team ?? s;
          g2.strokeStyle = rt.gest.shield ? '#7fe8ff' : TEAM_HEX[team];
          g2.lineWidth = Math.max(3, sw * 0.06);
          g2.globalAlpha = 0.9;
          for (const [i, j] of BONES) {
            const p = pts[i];
            const q = pts[j];
            if (p.v < 0.5 || q.v < 0.5) continue;
            g2.beginPath();
            g2.moveTo(p.x, p.y);
            g2.lineTo(q.x, q.y);
            g2.stroke();
          }
          g2.fillStyle = '#fff';
          for (const i of [11, 12, 13, 14, 15, 16]) {
            const p = pts[i];
            if (p.v < 0.5) continue;
            g2.beginPath();
            g2.arc(p.x, p.y, Math.max(4, sw * 0.05), 0, Math.PI * 2);
            g2.fill();
          }
        }
        g2.globalAlpha = 1;
      }

      /* ---- เตือนกลางจอเมื่อหน้าถูกบัง/ตัวสั่น (ฝั่งไหนก็ได้) ---- */
      const iss = tr ? rts.current.slice(0, sidesN).find((x) => x.issue)?.issue ?? null : null;
      if (iss !== issueRef.current) {
        issueRef.current = iss;
        setIssue(iss);
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

      /* ---- ยานผู้เล่น: เลื่อนตามการเอียงตัว ---- */
      const laneOff = Math.min(half * 0.22, 110);
      for (let s = 0; s < sidesN; s++) {
        const rt = rts.current[s];
        const lean = rt.tLeanUntil > now ? rt.tLean : camRef.current ? rt.gest.lean : 0;
        rt.shipOff += (lean * laneOff * 0.95 - rt.shipOff) * Math.min(1, dt * 12);
        const x = (s + 0.5) * half + rt.shipOff;
        const y = ch * 0.92;
        sc?.place(`ship${s}`, x, y, Math.min(ch * 0.05, 42), T);
        const hs = rt.hands;
        const a = aimOf(hs.r) || aimOf(hs.l);
        if (a) sc?.aimShip(`ship${s}`, a.x, a.y);
        const sd = qr?.sides[s];
        if (sd) {
          const t = teamRT.current[sd.team];
          if (t.stun > 0 && !frozen) t.stun = Math.max(0, t.stun - dt);
          sc?.bubble(`ship${s}`, rt.flashUntil > now || rt.tShieldUntil > now || (camRef.current && rt.gest.shield && attackOn));
        }
      }

      /* ---- ตั้งค่ากล้อง: เป้าซ้อม ---- */
      if (ph === 'calib') {
        const cc = calibRef.current;
        let changed = false;
        const next = cc.map((o) => ({ ...o }));
        for (let s = 0; s < sidesN; s++) {
          const rt = rts.current[s];
          const seenOk = !!rt.body && now - rt.seenSince > 700;
          if (seenOk !== next[s].seen) (next[s].seen = seenOk), (changed = true);
          const handOk = HANDS.some((h) => !!aimOf(rt.hands[h]));
          if (handOk !== next[s].hand) (next[s].hand = handOk), (changed = true);
          const id = `p${s}`;
          const A = area(s);
          if (!next[s].ok) {
            if (sc && !sc.has(id)) sc.alien(id, TEAM_HEX[s]);
            const rr = Math.max(40, Math.min(A.w, A.h) * 0.16);
            const p = { x: A.x + A.w / 2, y: A.y + A.h * 0.22, r: rr };
            pos.current.set(id, p);
            sc?.place(id, p.x, p.y, rr, T);
            if (HANDS.map((h) => rt.hands[h].dwell.update(aimOf(rt.hands[h]), [{ id, ...p }], dt * 1000)).some(Boolean)) {
              next[s].ok = true;
              changed = true;
              sc?.laser(`ship${s}`, p.x, p.y, TEAM_HEX[s]);
              sc?.burst(p.x, p.y, TEAM_HEX[s], 1.2);
              sc?.remove(id);
              gsfx.laser();
              gsfx.correct();
            }
          }
        }
        if (changed) setCalib(next);
        if (tr && now % 1000 < 20) setFps(tr.fps);
      }

      /* ---- บอส: มุมขวาบนตอนอ่านโจทย์ / กลางจอตอนช่วงโจมตี ---- */
      if (b?.on && (b.alive || qr?.sub === 'victory')) {
        const big = attackOn || qr?.sub === 'victory';
        const m = Math.min(cw, ch);
        const tx = big ? cw / 2 : cw - m * 0.11;
        const ty = big ? ch * 0.4 : ch * 0.13 + m * 0.02;
        const trr = big ? Math.min(cw * 0.5, ch) * 0.17 : m * 0.07;
        const kk = Math.min(1, dt * 4);
        b.x += (tx - b.x) * kk;
        b.y += (ty + Math.sin(T * 1.6) * (big ? 10 : 4) - b.y) * kk;
        b.r += (trr - b.r) * kk;
        pos.current.set('boss', { x: b.x, y: b.y, r: b.r });
        sc?.place('boss', b.x, b.y, b.r, T);
        if (bossBar.current) bossBar.current.style.transform = `scaleX(${Math.max(0, b.hp) / Math.max(1, b.max)})`;
      }

      /* ---- เกม ---- */
      if (ph === 'play' && qr && r) {
        if (!frozen) qr.subT += dt;
        if (qr.sub === 'enter' && qr.subT >= qr.enterS) {
          qr.sub = 'ask';
          qr.subT = 0;
          setSub('ask');
          setBanner(null);
        }
        if (qr.sub === 'ask' && !frozen) {
          qr.usedMs += dt * 1000;
          // พลังงานค่อยๆ ฟื้นระหว่างตอบ
          qr.sides.forEach((d) => {
            const t = teamRT.current[d.team];
            t.energy = Math.min(r.fx.maxEnergy, t.energy + dt * 3);
          });
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
            bump();
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
              const keep = new Set<string>();
              for (const cid of d.order) {
                const correct = qr.q.choices.find((cc) => cc.id === cid)?.correct;
                if (correct && !d.got) {
                  mk[aid(s, cid)] = 'answer';
                  keep.add(cid);
                } else sc?.flyAway(aid(s, cid));
              }
              d.alive = keep;
              // หมดเวลาโดยไม่ได้ตอบถูก = คอมโบตอบขาด
              if (!d.got) teamRT.current[d.team].combo.onAnswer(false);
            });
            setMarks((m) => ({ ...m, ...mk }));
          }
        } else if (qr.sub === 'reveal' && qr.subT >= REVEAL_S) {
          qr.sides.forEach((d, s) => d.alive.forEach((cid) => sc?.flyAway(aid(s, cid))));
          qr.sides.forEach((d) => d.alive.clear());
          const got = qr.sides.some((d) => d.got);
          if (got && qr.bossQ && b?.alive) {
            qr.sub = 'attack';
            qr.subT = 0;
            qr.atkT = 1.2;
            setSub('attack');
            gsfx.levelUp();
          } else if (got) {
            qr.sub = 'bonus';
            qr.subT = 0;
            setSub('bonus');
            gsfx.levelUp();
          } else endQuestion();
        } else if (qr.sub === 'bonus') {
          const life = METEOR_LIFE[r.level] || 2.4;
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
          if (qr.subT >= BONUS_S && !qr.meteors.length) {
            roundEnd();
            endQuestion();
          }
          if (qr.subT >= BONUS_S + 2) {
            qr.meteors.forEach((m) => sc?.remove(m.id));
            qr.meteors = [];
          }
        } else if (qr.sub === 'attack' && b) {
          const winS = r.fx.attackS;
          const allow = (m: MotionId) => !camRef.current || motionOn(c.motions, m);
          // บอสโจมตีทุกฝั่งเป็นระยะ (หยุดปล่อยใหม่ก่อนหมดช่วง 1.5 วิ)
          if (!frozen && b.alive && qr.subT < winS - 1.5) {
            qr.atkT -= dt;
            if (qr.atkT <= 0) {
              qr.atkT = b.def.every * (ATK_EVERY[r.level] ?? 1);
              for (let s = 0; s < sidesN; s++) {
                const kind = pickAttack(b.def, allow);
                if (!kind) continue;
                const lane: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
                const id = `atk${s}_${Math.random().toString(36).slice(2, 7)}`;
                const a: Atk = { id, s, kind, lane, t: 0, warn: b.def.warn, sx: b.x, sy: b.y };
                qr.atks.push(a);
                sc?.orb(id, kind === 'wide' ? '#ff5ad1' : kind === 'ground' ? '#ffb02e' : '#ff4d6d');
                const x = (s + 0.5) * half + (kind === 'lane' ? lane * laneOff : 0);
                setWarns((w) => [...w, { id, s, kind, lane, x, y: ch * 0.92 }]);
                gsfx.tick(true);
              }
            }
          }
          for (const a of [...qr.atks]) {
            if (!frozen) a.t += dt;
            const kk = Math.min(1, a.t / a.warn);
            const tx = (a.s + 0.5) * half + (a.kind === 'lane' ? a.lane * laneOff : 0);
            const ty = a.kind === 'ground' ? ch * 0.97 : ch * 0.9;
            const e = kk * kk;
            const x = a.sx + (tx - a.sx) * e;
            const y = a.sy + (ty - a.sy) * e;
            sc?.place(a.id, x, y, a.kind === 'wide' ? 34 : 20, T);
            const el = warnEls.current.get(a.id);
            if (el) el.style.setProperty('--wk', String(kk));
            if (a.t >= a.warn) {
              qr.atks = qr.atks.filter((o) => o !== a);
              if (a.kind === 'ground') sc?.shock(tx, ch * 0.95, '#ffb02e');
              resolveAtk(a);
            }
          }
          // เล็งยิงบอส
          if (!frozen && b.alive) {
            for (let s = 0; s < sidesN; s++) {
              const rt = rts.current[s];
              const t = teamRT.current[qr.sides[s].team];
              if (t.shots <= 0 || t.stun > 0) continue;
              const target: DwellTarget[] = [{ id: 'boss', x: b.x, y: b.y, r: b.r * 1.15 }];
              for (const h of HANDS) if (rt.hands[h].hit.update(aimOf(rt.hands[h]), target, dt * 1000)) shootBoss(s);
            }
          }
          const shotsLeft = qr.sides.some((d) => teamRT.current[d.team].shots > 0);
          if (!qr.atks.length && (qr.subT >= winS || (!shotsLeft && qr.subT > 2.5))) {
            qr.sides.forEach((d) => (teamRT.current[d.team].shots = 0));
            roundEnd();
            endQuestion();
          }
        } else if (qr.sub === 'victory' && b) {
          if (qr.subT >= VICTORY_S) {
            // รางวัลชนะบอส: เหรียญ + คะแนนการเล่นแบ่งตามดาเมจที่แต่ละทีมทำ
            r.bossCoins += b.def.coins;
            const sum = b.dmgBy.reduce((x, y) => x + y, 0) || 1;
            // ทุกทีมที่เคยยิงบอสได้ส่วนแบ่ง (ผลัดกันเล่น = รวมทีมที่ไม่ได้อยู่ในตานี้ด้วย)
            for (let t = 0; t < r.teamsN; t++) {
              const pts = Math.round((b.def.bonus * b.dmgBy[t]) / sum);
              if (pts > 0) addStat(t, (o) => ({ ...o, play: o.play + pts }));
            }
            qr.sides.forEach((d) => (teamRT.current[d.team].shots = 0));
            roundEnd();
            endQuestion();
          }
        }

        /* ตำแหน่งยานเอเลียน (ลอยไปมาตามระดับความยาก) */
        const drift = DRIFT[r.level] ?? 0.1;
        const sp = DRIFT_SPEED[r.level] ?? 0.85;
        qr.sides.forEach((d, s) => {
          const A = area(s);
          const n = d.order.length;
          const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt((n * A.w) / A.h))));
          const rows = Math.ceil(n / cols);
          const cwid = A.w / cols;
          const chei = A.h / rows;
          const rr = Math.min(100, Math.max(34, Math.min(cwid, chei) * 0.3));
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
            pos.current.set(id, { x, y, r: rr });
            sc?.place(id, x, y, rr, T);
          });
          const rt = rts.current[s];
          if (qr.sub === 'ask' && !d.done && !frozen) {
            const targets: DwellTarget[] = [];
            for (const cid of d.alive) {
              const p = pos.current.get(aid(s, cid));
              if (p) targets.push({ id: cid, x: p.x, y: p.y, r: p.r * 1.25 });
            }
            for (const h of HANDS) {
              const hit = rt.hands[h].dwell.update(aimOf(rt.hands[h]), targets, dt * 1000);
              if (hit) {
                gsfx.lock();
                choose(s, hit);
                break;
              }
            }
          }
        });

        /* อุกกาบาต */
        if (qr.meteors.length) {
          for (const m of [...qr.meteors]) {
            if (!frozen) m.t += dt / m.life;
            const A = area(m.s);
            const kk = Math.min(1, m.t);
            const e = kk * kk;
            const x = A.x + (m.sx + (m.ex - m.sx) * e) * A.w;
            const y = A.y + (m.sy + (m.ey - m.sy) * e) * A.h;
            const rr = 10 + e * Math.min(A.w, A.h) * 0.14;
            pos.current.set(m.id, { x, y, r: rr });
            sc?.place(m.id, x, y, rr, T);
            if (m.t >= 1) {
              // หลุดไป = คอมโบยิงขาด / ไม่ Perfect
              qr.meteors = qr.meteors.filter((o) => o !== m);
              sc?.remove(m.id);
              pos.current.delete(m.id);
              const sd = qr.sides[m.s];
              sd.missed = true;
              teamRT.current[sd.team].combo.onMiss();
            }
          }
          for (let s = 0; s < sidesN; s++) {
            const rt = rts.current[s];
            const mine = qr.meteors.filter((m) => m.s === s && m.t > 0.12);
            const targets = mine.map((m) => ({ id: m.id, ...pos.current.get(m.id)! })).map((t) => ({ ...t, r: t.r * 1.4 + 14 }));
            for (const h of HANDS) {
              const hit = frozen ? null : rt.hands[h].hit.update(aimOf(rt.hands[h]), targets, dt * 1000);
              const m = hit ? mine.find((o) => o.id === hit && qr.meteors.includes(o)) : null;
              const p = hit ? pos.current.get(hit) : null;
              if (m && p) shootMeteor(m, p);
            }
            const d = qr.sides[s];
            if (d?.got && !d.chargeUsed && rt.charge.active && !frozen) {
              rt.chargeT += dt;
              if (rt.chargeT >= r.fx.chargeS) {
                rt.chargeT = 0;
                blast(s);
              }
            } else rt.chargeT = 0;
            const bar = chargeBars.current[s];
            if (bar) bar.style.transform = `scaleX(${Math.min(1, rt.chargeT / r.fx.chargeS)})`;
          }
        }
      }

      /* ---- ป้ายคำตอบ / วงล็อก / เป้าเล็ง ---- */
      labels.current.forEach((el, id) => {
        const p = pos.current.get(id);
        if (!p) return;
        el.style.transform = `translate(${p.x}px, ${p.y + p.r * 0.85}px) translateX(-50%)`;
      });
      for (let kx = 0; kx < sidesN * 2; kx++) {
        const s = kx >> 1;
        const hd = rts.current[s].hands[HANDS[kx & 1]];
        const ring = rings.current[kx];
        if (ring) {
          const dw = attackOn || qr?.sub === 'bonus' ? hd.hit : hd.dwell;
          const hv = dw.hover;
          const hov = !hv ? null : ph === 'calib' ? hv : attackOn ? 'boss' : qr?.sub === 'bonus' ? hv : qr ? aid(s, hv) : null;
          const p = hov ? pos.current.get(hov) : null;
          const prog = hv ? dw.prog.get(hv) || 0 : 0;
          if (p && prog > 0) {
            const size = p.r * 2.9;
            ring.style.opacity = '1';
            ring.style.transform = `translate(${p.x - size / 2}px, ${p.y - size / 2}px)`;
            ring.style.width = ring.style.height = `${size}px`;
            const arc = ring.querySelector('.ar-ring-p') as SVGCircleElement | null;
            if (arc) arc.style.strokeDashoffset = `${(1 - prog) * 289}`;
          } else ring.style.opacity = '0';
        }
        const ret = reticles.current[kx];
        if (ret) {
          const a = aimOf(hd);
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
  }, [live, sidesN, choose, shootMeteor, blast, shootBoss, resolveAtk, roundEnd, endQuestion, onGesture, addPlay, addStat, bump]);

  /* ------------------------------ แตะจอ / คีย์บอร์ด ------------------------------ */
  const onPointer = (e: React.PointerEvent) => {
    gsfx.unlock();
    const box = root.current;
    const qr = Q.current;
    if (!box || !qr || phase !== 'play' || pausedRef.current) return;
    const rc = box.getBoundingClientRect();
    const x = e.clientX - rc.left;
    const y = e.clientY - rc.top;
    const s = sidesN === 2 && x >= rc.width / 2 ? 1 : 0;
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
    } else if (qr.sub === 'attack') {
      const b = B.current;
      // จอแบ่ง: แตะบอสฝั่งไหน = ทีมฝั่งนั้นยิง
      if (b && Math.hypot(x - b.x, y - b.y) < b.r * 1.4) shootBoss(s);
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
      const qr = Q.current;
      if (!qr) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') touchMove(0, 'L');
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') touchMove(0, 'R');
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') touchMove(0, 'shield');
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') touchMove(0, 'jump');
      else if (e.code === 'Enter' && qr.sub === 'attack') shootBoss(0);
      else if (e.code === 'KeyV') touchMove(0, 'victory');
      const n = Number(e.key);
      if (n >= 1 && n <= 6 && qr.sub === 'ask') {
        const cid = qr.sides[0]?.order[n - 1];
        if (cid) choose(0, cid);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, shootBoss, touchMove]);

  const q = list.current[qi];
  const total = list.current.length;
  const qr = Q.current;
  const boss = B.current;

  const exit = () => {
    tracker.current?.stop();
    tracker.current = null;
    onExit();
  };
  const toMap = () => {
    clearScene();
    Q.current = null;
    R.current = null;
    setResult(null);
    setPhase('map');
  };

  const board: BoardRow[] = useMemo(
    () => stats.slice(0, teamsN).map((s, i) => ({ name: teamsN > 1 ? TEAM_NAMES[i] : 'ยานของฉัน', color: TEAM_HEX[i], know: s.know, play: s.play, correct: s.correct, wrong: s.wrong })),
    [stats, teamsN]
  );

  // ภารกิจฝึก: ท่าพื้นฐานทุกฝั่งต้องผ่าน ท่าพิเศษเฉพาะที่ครูเปิดไว้ (ฝั่งไหนทำก็ได้)
  const allSides = (k: 'seen' | 'hand' | 'ok') => calib.slice(0, sidesN).every((x) => x[k]);
  const mo = (m: MotionId) => motionOn(cfg.motions, m);
  const missions = [
    { k: 'seen', short: 'เห็นตัว', title: 'ยืนให้กล้องเห็นตัว', hint: sidesN === 2 ? 'ฝั่งละคน ถอยให้เห็นตั้งแต่หัวถึงเอว' : 'ถอยให้เห็นตั้งแต่หัวถึงเอว หน้าตรง', icon: Users, done: allSides('seen'), on: true },
    { k: 'hand', short: 'ยกมือ', title: 'ยกมือขึ้น!', hint: 'ยกมือข้างไหนก็ได้ จะมีวงเล็งตามมือ', icon: Hand, done: allSides('hand'), on: true },
    { k: 'shoot', short: 'ยิงเป้าซ้อม', title: 'เล็งยิงยานซ้อม', hint: 'เลื่อนวงเล็งไปที่ยาน ค้างไว้จนวงเต็ม', icon: Crosshair, done: allSides('ok'), on: true },
    { k: 'dodgeL', short: 'เอียงซ้าย', title: 'เอียงตัวไปทางซ้าย', hint: 'เอียงทั้งตัว ไม่ต้องก้าวเท้า', icon: ArrowBigLeft, done: !!calibGest.dodgeL, on: mo('dodge') },
    { k: 'dodgeR', short: 'เอียงขวา', title: 'เอียงตัวไปทางขวา', hint: 'เอียงทั้งตัว ไม่ต้องก้าวเท้า', icon: ArrowBigRight, done: !!calibGest.dodgeR, on: mo('dodge') },
    { k: 'shield', short: 'โล่สองมือ', title: 'ประกบสองมือไว้หน้าอก', hint: 'นี่คือท่าตั้งโล่กันการโจมตี', icon: Shield, done: !!calibGest.shield, on: mo('shield') },
    { k: 'charge', short: 'ชาร์จพลัง', title: 'ยกสองมือเหนือหัว', hint: 'ค้างไว้ = ชาร์จพลัง', icon: Zap, done: !!calibGest.charge, on: mo('charge') },
    { k: 'jump', short: 'กระโดด', title: 'กระโดดเบาๆ หนึ่งที', hint: 'ระวังพื้นลื่น เว้นที่รอบตัว', icon: ChevronsUp, done: !!calibGest.jump, on: mo('jump') },
    { k: 'victory', short: 'ท่าชัยชนะ', title: 'กางแขนเป็นตัว V', hint: 'ท่าชัยชนะตอนล้มบอส', icon: Sparkles, done: !!calibGest.victory, on: mo('victory') },
  ].filter((m) => m.on);
  const curMission = missions.find((m) => !m.done);
  const missionsDone = missions.filter((m) => m.done).length;
  const allMissions = !curMission;
  const missionsPrev = useRef(0);
  useEffect(() => {
    // ผ่านภารกิจเพิ่ม = เสียงฉลอง
    if (phase === 'calib' && missionsDone > missionsPrev.current) gsfx.levelUp();
    missionsPrev.current = missionsDone;
  }, [missionsDone, phase]);
  const nextAfter = result && R.current ? ALL_STAGES[ALL_STAGES.findIndex((x) => x.id === R.current!.stage.id) + 1] : undefined;
  const canNext = !!nextAfter && unlocked(save.stars, nextAfter.id, save.openAll);
  const titleOf = (sid: string) => (save.sets[sid] ? (sid === stageId && stageSet ? stageSet.title : setErr && sid === stageId ? `${title} (ชุดของด่านเปิดไม่ได้)` : 'ชุดที่ครูเลือก') : title);
  const touchMode = !camOn;

  // portal ไป body: ตัวห่อหน้า (page-enter) มี transform ทำให้ position: fixed สูง 0 ระหว่างแอนิเมชัน
  return createPortal(
    <div ref={root} className="ar-root" data-cam={camOn} data-teams={sidesN === 2} data-urgent={urgent && phase === 'play'} onPointerDown={onPointer}>
      <video ref={video} className="ar-video" playsInline muted aria-hidden="true" />
      <div className="ar-tint" aria-hidden="true" />
      <canvas ref={skel} className="ar-skel" aria-hidden="true" />
      <div ref={stage} className="ar-stage" aria-hidden="true" />
      {sidesN === 2 && hasScene && phase !== 'map' && (
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
            const gone = sub === 'bonus' || sub === 'attack' || sub === 'victory' || (sub === 'reveal' && st !== 'answer') || (!st && !qr?.sides[s]?.alive.has(cid) && sub !== 'enter');
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
      {[...Array(sidesN * 2).keys()].map((k) => (
        <React.Fragment key={k}>
          <svg ref={(el) => void (rings.current[k] = el)} className="ar-ring" viewBox="0 0 100 100" style={{ ['--tc' as string]: TEAM_HEX[qr?.sides[k >> 1]?.team ?? k >> 1] }} aria-hidden="true">
            <circle cx="50" cy="50" r="46" className="ar-ring-bg" />
            <circle cx="50" cy="50" r="46" className="ar-ring-p" />
          </svg>
          <div ref={(el) => void (reticles.current[k] = el)} className="ar-reticle" style={{ ['--tc' as string]: TEAM_HEX[qr?.sides[k >> 1]?.team ?? k >> 1] }} aria-hidden="true">
            <i />
          </div>
        </React.Fragment>
      ))}

      {/* สัญญาณเตือนการโจมตีของบอส */}
      {phase === 'play' &&
        warns.map((w) => (
          <div
            key={w.id}
            ref={(el) => {
              if (el) warnEls.current.set(w.id, el);
              else warnEls.current.delete(w.id);
            }}
            className="ar-warn"
            data-kind={w.kind}
            style={{ left: w.x, top: w.y }}
          >
            <i />
            <b>
              {w.kind === 'lane' ? w.lane < 0 ? <ArrowBigRight className="w-6 h-6" /> : <ArrowBigLeft className="w-6 h-6" /> : w.kind === 'wide' ? <Shield className="w-6 h-6" /> : <ChevronsUp className="w-6 h-6" />}
              {w.kind === 'lane' ? (w.lane < 0 ? 'เอียงขวา!' : 'เอียงซ้าย!') : ATTACK_TEXT[w.kind]}
            </b>
          </div>
        ))}

      {camOn && issue && (phase === 'calib' || phase === 'play') && !paused && !teacher && (
        <div className="ar-issue" role="alert">
          <ScanFace className="w-10 h-10" />
          <b>{issue === 'face' ? 'ห้ามมีอะไรบังใบหน้า' : 'ยืนนิ่งๆ ให้กล้องเห็นชัดๆ'}</b>
          <span>{issue === 'face' ? 'เอามือ/ของออกจากหน้า หันหน้าเข้าหากล้อง' : 'ถอยให้เห็นหัวถึงเอว อย่าให้คนอื่นยืนซ้อนข้างหลัง'}</span>
        </div>
      )}

      {floaters.map((f) => (
        <span key={f.id} className="ar-float" data-big={!!f.big} data-kind={f.kind || ''} style={{ left: f.x, top: f.y, color: f.color }}>
          {f.text}
        </span>
      ))}

      {/* ---------------- HUD ---------------- */}
      {(phase === 'play' || phase === 'count') && (
        <>
          <div className="ar-scores" data-n={teamsN}>
            {[...Array(teamsN).keys()].map((t) => {
              const tr = teamRT.current[t];
              const active = mode !== 'relay' || qr?.sides[0]?.team === t;
              return (
                <div key={t} className="ar-score" data-on={active} style={{ ['--tc' as string]: TEAM_HEX[t] }}>
                  <small>{teamsN > 1 ? TEAM_NAMES[t] : 'คะแนน'}</small>
                  <b key={stats[t].know + stats[t].play}>{(stats[t].know + stats[t].play).toLocaleString('th-TH')}</b>
                  <span className="ar-combos">
                    {tr.combo.superOn && <em data-k="super">SUPER x2</em>}
                    {tr.combo.answer >= 2 && <em>Answer x{tr.combo.answer}</em>}
                    {tr.combo.shoot >= 5 && <em data-k="shoot">Shoot x{tr.combo.shoot}</em>}
                  </span>
                </div>
              );
            })}
          </div>
          {boss?.on && (boss.alive || sub === 'victory') && phase === 'play' && (
            <div className="ar-bosshp" style={{ ['--bc' as string]: boss.def.color }}>
              <span>{boss.def.name}</span>
              <div>
                <i ref={bossBar} />
              </div>
              <b>
                {Math.max(0, Math.round(boss.hp))}/{boss.max}
              </b>
            </div>
          )}
          {phase === 'play' && q && (sub === 'enter' || sub === 'ask' || sub === 'reveal') && (
            <div className="ar-q" data-sub={sub}>
              <div className="ar-q-top">
                <span>
                  ข้อ {qi + 1}/{total}
                  {qr?.bossQ && boss?.alive ? ' · รอบบอส' : ''}
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
          {phase === 'play' && banner && sub === 'enter' && (
            <div className="ar-banner" style={{ ['--bc' as string]: banner.color }}>
              <b>{banner.text}</b>
              {banner.sub && <span>{banner.sub}</span>}
            </div>
          )}
          {phase === 'play' && sub === 'bonus' && (
            <div className="ar-bonus">
              <b>รอบโบนัส! เล็งยิงอุกกาบาต</b>
              <span>
                <Zap className="w-4 h-4" /> {camOn && motionOn(cfg.motions, 'charge') ? 'ยกสองมือเหนือหัวค้างไว้ = ระเบิดพลัง' : 'กดปุ่มระเบิดพลัง'}
              </span>
            </div>
          )}
          {phase === 'play' && sub === 'attack' && (
            <div className="ar-bonus" data-k="boss">
              <b>ยิงบอส! เล็งค้างไว้ที่บอส</b>
              <span>
                <ShieldCheck className="w-4 h-4" /> {touchMode ? 'แตะบอสเพื่อยิง กดปุ่มหลบ/โล่/กระโดดตามป้ายเตือน' : 'ดูป้ายเตือน แล้วเอียงตัว ตั้งโล่ หรือกระโดด'}
              </span>
            </div>
          )}
          {phase === 'play' && sub === 'victory' && (
            <>
              <Confetti />
              <div className="ar-banner" style={{ ['--bc' as string]: boss?.def.color }}>
                <b>ชนะบอสแล้ว!</b>
                <span>{camOn && motionOn(cfg.motions, 'victory') ? 'กางแขนเป็นตัว V ทำท่าชัยชนะ +50' : 'กดปุ่มท่าชัยชนะ +50'}</span>
              </div>
            </>
          )}

          {/* แผงของแต่ละฝั่ง: พลังงาน กระสุน ไอเทม ผู้คุมยาน ปุ่มแตะแทนท่าทาง */}
          {phase === 'play' &&
            qr?.sides.map((d, s) => {
              const tr = teamRT.current[d.team];
              const maxE = R.current?.fx.maxEnergy || 100;
              const showTouchMoves = sub === 'attack' && (touchMode || cfg.motions === 0);
              return (
                <div key={s} className="ar-side" style={{ left: `${((s + 0.5) / sidesN) * 100}%`, ['--tc' as string]: TEAM_HEX[d.team] }} onPointerDown={(e) => e.stopPropagation()}>
                  {sub === 'bonus' && (
                    <div className="ar-side-note">
                      {d.got ? (
                        !d.chargeUsed && (
                          <>
                            {(touchMode || !motionOn(cfg.motions, 'charge')) && (
                              <button type="button" className="ar-blast" onClick={() => blast(s)}>
                                <Zap className="w-5 h-5" /> ระเบิดพลัง
                              </button>
                            )}
                            {camOn && motionOn(cfg.motions, 'charge') && (
                              <div className="ar-charge">
                                <div ref={(el) => void (chargeBars.current[s] = el)} />
                              </div>
                            )}
                          </>
                        )
                      ) : (
                        <span>ตอบผิดรอบนี้ พักก่อนนะ</span>
                      )}
                    </div>
                  )}
                  {sub === 'ask' && !d.done && d.wrongs > 0 && tr.helps > 0 && (
                    <button type="button" className="ar-help" onClick={() => help(s)}>
                      <HeartHandshake className="w-5 h-5" /> เพื่อนช่วยตัดตัวเลือก ({tr.helps})
                    </button>
                  )}
                  {showTouchMoves && (
                    <div className="ar-moves">
                      <button type="button" onClick={() => touchMove(s, 'L')} aria-label="หลบซ้าย">
                        <ArrowBigLeft className="w-7 h-7" />
                      </button>
                      <button type="button" onClick={() => touchMove(s, 'shield')} aria-label="ตั้งโล่">
                        <Shield className="w-7 h-7" />
                      </button>
                      <button type="button" onClick={() => touchMove(s, 'jump')} aria-label="กระโดด">
                        <ChevronsUp className="w-7 h-7" />
                      </button>
                      <button type="button" onClick={() => touchMove(s, 'R')} aria-label="หลบขวา">
                        <ArrowBigRight className="w-7 h-7" />
                      </button>
                    </div>
                  )}
                  {sub === 'victory' && (touchMode || !motionOn(cfg.motions, 'victory')) && !qr.victoryPose[s] && (
                    <button type="button" className="ar-blast" onClick={() => touchMove(s, 'victory')}>
                      <Sparkles className="w-5 h-5" /> ท่าชัยชนะ
                    </button>
                  )}
                  <div className="ar-side-hud">
                    {(R.current?.members ?? 1) > 1 && (
                      <small className="ar-who">
                        <Users className="w-3.5 h-3.5" /> คนที่ {d.member + 1}
                      </small>
                    )}
                    <div className="ar-energy" title="พลังงานยาน" data-stun={tr.stun > 0}>
                      <i style={{ width: `${(tr.energy / maxE) * 100}%` }} />
                    </div>
                    {boss?.on && boss.alive && (
                      <span className="ar-shots" title="กระสุนเลเซอร์">
                        <Zap className="w-3.5 h-3.5" /> {tr.shots}
                      </span>
                    )}
                    <span className="ar-powers">
                      {POWERS.filter((p) => tr.powers.has(p.id)).map((p) => {
                        const Ic = POWER_ICON[p.id];
                        return (
                          <i key={p.id} style={{ ['--pc' as string]: p.color }} title={`${p.name}: ${p.effect}`}>
                            <Ic className="w-3.5 h-3.5" />
                            {tr.powers.left.get(p.id)}
                          </i>
                        );
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          <div className="ar-topbtns" onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" className="ar-pausebtn" onClick={() => (gsfx.tap(), setTeacher(true))} aria-label="แผงครู">
              <Settings2 className="w-6 h-6" />
            </button>
            <button type="button" className="ar-pausebtn" onClick={() => (gsfx.tap(), setPaused(true))} aria-label="หยุดเกม">
              <Pause className="w-6 h-6" />
            </button>
          </div>
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
                <Users className="w-5 h-5" />{' '}
                {mode === 'split' ? 'ทีมฟ้ายืนฝั่งซ้ายของจอ ทีมส้มยืนฝั่งขวา ส่งตัวแทนฝั่งละ 1 คน' : mode === 'relay' ? `${teamsN} ทีมผลัดกันออกมาเล่นทีละทีม ทีละข้อ` : 'ยืนหรือนั่งหน้ากล้อง ห่างราว 1.5-2 เมตร'}
              </li>
              <li>
                <Hand className="w-5 h-5" /> ยกมือเล็งยานที่ถือคำตอบถูก ค้างไว้จนวงเต็ม รอบบอสเอียงตัวหลบ ประกบมือตั้งโล่
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

      {/* ---------------- ภารกิจฝึกก่อนเริ่ม: บอกกลางจอทีละข้อ + เช็กลิสต์ ครบแล้วถึงเริ่มได้ ---------------- */}
      {phase === 'calib' && (
        <>
          <div className="ar-mission" key={curMission?.k || 'done'} style={{ ['--mc' as string]: curMission ? '#ffe14a' : '#3fe0a0' }}>
            <span className="ar-mission-ic">{curMission ? <curMission.icon className="w-9 h-9" /> : <Check className="w-9 h-9" strokeWidth={4} />}</span>
            <div>
              <small>{curMission ? `ภารกิจที่ ${missions.indexOf(curMission) + 1} จาก ${missions.length}` : 'ผ่านครบทุกภารกิจ'}</small>
              <b>{curMission ? curMission.title : 'เก่งมาก! พร้อมรบแล้ว'}</b>
              <span>{curMission ? curMission.hint : 'กดปุ่มเริ่มด้านล่างได้เลย'}</span>
            </div>
          </div>
          <div className="ar-calib">
            <div className="ar-calib-card">
              <div className="ar-mlist-head">
                <b>ภารกิจฝึก</b>
                <span>
                  ผ่านแล้ว {missionsDone}/{missions.length}
                </span>
              </div>
              <div className="ar-mbar">
                <i style={{ width: `${(missionsDone / Math.max(1, missions.length)) * 100}%` }} />
              </div>
              <ul className="ar-mlist">
                {missions.map((m) => (
                  <li key={m.k} data-ok={m.done} data-cur={m === curMission}>
                    {m.done ? <Check className="w-4 h-4" strokeWidth={4} /> : <m.icon className="w-4 h-4" />} {m.short}
                  </li>
                ))}
              </ul>
              <div className="ar-calib-row">
                <span>จุดเล็ง</span>
                {REACH.map((rr, i) => (
                  <button key={i} type="button" className="ar-chip" data-on={reach === i} onClick={() => (gsfx.tap(), setReach(i))}>
                    {rr.name}
                  </button>
                ))}
                <span>ความไวท่า</span>
                {SENS.map((sn, i) => (
                  <button key={i} type="button" className="ar-chip" data-on={cfg.sens === i} onClick={() => (gsfx.tap(), setCfg({ ...cfg, sens: i }))}>
                    {sn.name}
                  </button>
                ))}
                {fps > 0 && <small>จับท่า {fps} ภาพ/วิ</small>}
              </div>
              <div className="ar-panel-btns">
                <button type="button" className="ar-btn ar-btn-go" data-ready={allMissions} disabled={!allMissions} onClick={() => (gsfx.start(), toMap())}>
                  <Play className="w-5 h-5" /> {allMissions ? 'ผ่านครบแล้ว เริ่มเลย!' : `ทำภารกิจให้ครบก่อน (${missionsDone}/${missions.length})`}
                </button>
                {/* ครูข้ามได้แต่ต้องกดยืนยันซ้ำ เด็กกดพลาดครั้งเดียวไม่หลุดการฝึก */}
                <button type="button" className="ar-btn ar-btn-ghost" onClick={() => (gsfx.tap(), skipArm ? toMap() : (setSkipArm(true), setTimeout(() => setSkipArm(false), 3000)))} title="สำหรับครู: ข้ามการฝึก">
                  {skipArm ? 'กดอีกครั้งเพื่อข้าม' : 'ข้าม (ครู)'}
                </button>
                <button type="button" className="ar-btn ar-btn-ghost" onClick={exit}>
                  <LogOut className="w-5 h-5" /> ออก
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ---------------- แผนที่ / อัปเกรด / ภารกิจ ---------------- */}
      {phase === 'map' && !teacher && (
        <ArMap
          save={save}
          onSave={commitSave}
          stageId={stageId}
          onPick={setStageId}
          onPlay={() => beginRun()}
          onTeacher={() => setTeacher(true)}
          onExit={exit}
          setTitle={titleOf}
          level={cfg.level}
          boss={cfg.boss}
          teams={teamCount(cfg.teams)}
        />
      )}
      {phase === 'map' && setErr && !teacher && <p className="ar-toast">{setErr}</p>}

      {/* ---------------- แผงครู ---------------- */}
      {teacher && (
        <ArTeacher
          cfg={cfg}
          setCfg={setCfg}
          running={running}
          paused={paused}
          onStart={() => (setTeacher(false), beginRun())}
          onPause={(p) => (setPaused(p), setTeacher(false))}
          onRestart={() => beginRun(R.current?.stage.id)}
          onEnd={() => (setTeacher(false), finishRun())}
          onClose={() => setTeacher(false)}
          board={board}
          save={save}
          onSave={commitSave}
        />
      )}

      {/* ---------------- กล้องหลุด ---------------- */}
      {camLost && (
        <div className="ar-panel-wrap" onPointerDown={(e) => e.stopPropagation()}>
          <div className="ar-panel ar-panel-sm">
            <h2>กล้องหยุดทำงาน</h2>
            <p>กล้องถูกปิดหรือถอดออก ระบบจะไม่จับท่าทางจนกว่าจะเปิดใหม่</p>
            <div className="ar-panel-btns">
              <button type="button" className="ar-btn ar-btn-go" onClick={() => (gsfx.tap(), toTouch(), phase === 'calib' && setPhase('map'))}>
                <Hand className="w-5 h-5" /> เล่นต่อแบบแตะจอ
              </button>
              <button type="button" className="ar-btn ar-btn-ghost" onClick={exit}>
                <LogOut className="w-5 h-5" /> ออกจากเกม
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- พัก ---------------- */}
      {phase === 'play' && (paused || away) && !teacher && !camLost && (
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
              <button type="button" className="ar-btn" onClick={() => (gsfx.tap(), setTeacher(true))}>
                <Settings2 className="w-5 h-5" /> แผงครู
              </button>
              <button type="button" className="ar-btn ar-btn-ghost" onClick={exit}>
                <LogOut className="w-5 h-5" /> ออกจากเกม
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- จบด่าน ---------------- */}
      {phase === 'end' && result && !teacher && (
        <ArResult
          r={result}
          onNext={
            canNext && nextAfter
              ? () => {
                  setStageId(nextAfter.id);
                  beginRun(nextAfter.id);
                }
              : null
          }
          onAgain={() => beginRun(R.current?.stage.id)}
          onMap={toMap}
          onExit={exit}
        />
      )}
    </div>,
    document.body
  );
}
