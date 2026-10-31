'use client';

/**
 * Magic Kingdom AR (เล่นในเครื่องเดียว): นักเวทฝึกหัดกู้อาณาจักรเวทมนตร์ด้วยความรู้ + ท่าทางผ่านกล้อง
 * - ใช้แกน AR กลางร่วมกับสงครามอวกาศ: tracker.ts + arPose.ts + ar/quality.ts + ar/gestures.ts (ไม่แยกสำเนา)
 * - ยื่นมือเล็งมอนสเตอร์ที่ถือคำตอบถูก ค้างไว้ = ร่ายลูกไฟ / ตอบถูก = เก็บคริสตัล ช่วยชาวเมือง ได้ลูกเวทไว้สู้บอส
 * - บอส: ยื่นมือยิงเวท, สองมือเล็งจุดเดียว = ลำแสงสายรุ้ง, ประกบมือ = โล่, เอียงตัว = หลบ, กางแขน = พายุ, ยกมือเหนือหัว = ฟื้นพลัง
 * - คะแนนความรู้ (ตอบคำถาม) แยกจากคะแนนการเล่น ตอบผิด/หัวใจหมดไม่มีแพ้ (ใบ้ + ลองใหม่)
 * - ไม่มีกล้อง = แตะจอ/คีย์บอร์ดแทนทุกท่า ภาพกล้องไม่ถูกบันทึกหรือส่งออกจากเครื่อง
 * - ข้อมูลสะสม (เหรียญ เวท สัตว์เลี้ยง ดาว) เก็บในเครื่อง magic/save.ts
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowBigLeft, ArrowBigRight, BookOpen, Camera, Check, Coins, Crown, Download, Gem, Hand, Heart, Lock as LockIcon, LogOut, Map as MapIcon, Pause, Play, ScanFace, Settings2, Shield, Sparkles, Star, Timer, Users, Wand2, Wind, X, Zap } from 'lucide-react';
import type { QuizQuestion } from '@/lib/game-creator/types';
import { MathText } from '../../math/MathText';
import { Confetti } from '../../live/PlayerSession';
import { gsfx } from '@/lib/game-creator/gsound';
import { releaseMusic, setMusic } from '@/lib/music';
import { roomTrack } from '@/lib/music-tracks';
import { createClient } from '@/lib/supabase/client';
import { richToPlain, sanitizeQuiz } from '@/lib/game-creator/quiz';
import { mediaPrefix } from '@/lib/game-creator/prefix';
import { modeFit, modeQuiz } from '@/lib/game-creator/modes';
import type { ArSettings } from '@/lib/game-creator/arSettings';
import { BONES, BodySmoother, Dwell, Follow, HANDS, Hold, aimFromHand, toBody, type Body, type DwellTarget, type Hand as HandSide, type Rect } from '@/lib/game-creator/arPose';
import { Clap, Gestures, SENS, sensK, spreadPose } from '@/lib/game-creator/ar/gestures';
import { MIN_SW, Quality, pickBody, toLock, type Lock, type QualityIssue } from '@/lib/game-creator/ar/quality';
import { TEAM_HEX, TEAM_NAMES } from '@/lib/game-creator/ar/teams';
import {
  AURAS, BOLT_SPELLS, FREEZE_S, HATS, LANDS, MAGIC_BOSSES, MK_POINTS, PETS, ROBES, SKILLS, SKILL_MAX, SKINS, SPELLS, STAVES,
  answerPoints, bossHpFor, bossStart, coinsFor, effects, isRescue, landById, landOpen, landStars, magicBoss, nextLand, nextSpell, openSpells, petById, pickAtk, skillCost, spellById, spellDamage,
  type AtkKind, type Effects, type Land, type Look, type MagicBoss, type PetId, type SkillId, type SpellId,
} from '@/lib/game-creator/magic/data';
import { EMPTY_MAGIC, loadMagic, writeMagic, type MagicSave } from '@/lib/game-creator/magic/save';
import { PoseTracker, type CamError } from '../ar/tracker';
import { MagicScene } from './scene';
import { LandArt, MageArt, PetArt, SpellIcon } from './art';
import '../ar/ar.css';
import '../ar/ar-systems.css';
import './magic.css';

/* ------------------------------ ค่าคงที่ ------------------------------ */

const ENTER_S = 0.8;
const SWAP_S = 2.4;
const BOSS_IN_S = 2.8;
const REVEAL_S = 1.4;
const CRYSTAL_S = 4.2;
const BATTLE_S = 9;
const VICTORY_S = 3.6;
const TIME_ATTACK_S = 120;
const CRYSTALS_PER = 4;
/** มอนสเตอร์ลอยไปมาตามความยาก */
const DRIFT = [0.025, 0.06, 0.11];
const ATK_EVERY = [1.35, 1, 0.8];
const WARN_S = [2.0, 1.6, 1.3];
/** ท่าที่ครูเปิด/ปิดได้ในเกมนี้ */
type MoId = 'dodge' | 'shield' | 'charge' | 'spread' | 'clap';
const MOS: { id: MoId; name: string; how: string }[] = [
  { id: 'shield', name: 'โล่ศิลา', how: 'ประกบสองมือหน้าอก' },
  { id: 'dodge', name: 'เอียงหลบ', how: 'เอียงตัวซ้าย/ขวา ไม่ต้องก้าว' },
  { id: 'charge', name: 'ชาร์จ/ฟื้นพลัง', how: 'ยกสองมือเหนือหัวค้างไว้' },
  { id: 'spread', name: 'พายุหมุน', how: 'กางแขนออกข้างเป็นตัว T' },
  { id: 'clap', name: 'ปรบมือ (สายฟ้าพิเศษ)', how: 'ปรบมือหนึ่งที' },
];
const DEFAULT_MO: Record<MoId, boolean> = { dodge: true, shield: true, charge: true, spread: true, clap: false };

type Phase = 'setup' | 'loading' | 'calib' | 'hub' | 'count' | 'play' | 'end';
type Sub = 'enter' | 'bossIn' | 'ask' | 'reveal' | 'crystal' | 'battle' | 'victory';
type HubTab = 'map' | 'hero' | 'spells' | 'skills';

interface HandRT {
  aim: { x: number; y: number } | null;
  disp: Follow;
  dwell: Dwell;
  hit: Dwell;
}
const newHand = (ms = 850): HandRT => ({ aim: null, disp: new Follow(), dwell: new Dwell(ms), hit: new Dwell(420) });
const aimOf = (h: HandRT) => (h.aim && h.disp.on ? { x: h.disp.x, y: h.disp.y } : null);

interface TeamScore {
  know: number;
  play: number;
  correct: number;
  wrong: number;
  first: number;
  streak: number;
  best: number;
  crystals: number;
  rescued: number;
  bossDmg: number;
  blocks: number;
}
const emptyScore = (): TeamScore => ({ know: 0, play: 0, correct: 0, wrong: 0, first: 0, streak: 0, best: 0, crystals: 0, rescued: 0, bossDmg: 0, blocks: 0 });

interface QLog {
  n: number;
  text: string;
  team: number;
  member: number;
  first: boolean;
  got: boolean;
  wrong: string[];
  ms: number;
}
interface Mob {
  cid: string;
  i: number;
  x: number;
  y: number;
  r: number;
  alive: boolean;
}
interface Crys {
  id: string;
  x: number;
  y: number;
  vy: number;
  sway: number;
  r: number;
  color: string;
}
interface Atk {
  id: string;
  kind: AtkKind;
  /** ทิศที่ต้องเอียงหลบ (-1 ซ้ายจอ, 1 ขวาจอ) */
  dir: -1 | 1;
  t: number;
  warn: number;
}
interface BossRT {
  def: MagicBoss;
  hp: number;
  max: number;
  alive: boolean;
  x: number;
  y: number;
  r: number;
  frozenUntil: number;
  kills: number;
}
interface Game {
  land: Land;
  style: number;
  level: number;
  teams: number;
  members: number;
  list: QuizQuestion[];
  total: number;
  bossFrom: number;
  qn: number;
  boss: BossRT | null;
  hearts: number;
  maxHearts: number;
  fx: Effects;
  bolt: SpellId;
  open: SpellId[];
  scores: TeamScore[];
  log: QLog[];
  coop: number;
  coopDone: number;
  timeLeft: number;
  knowGain: number;
  /* ข้อปัจจุบัน */
  q: QuizQuestion | null;
  order: string[];
  mobs: Mob[];
  sub: Sub;
  subT: number;
  subS: number;
  usedMs: number;
  limitMs: number;
  lastSec: number;
  firstTry: boolean;
  got: boolean;
  team: number;
  member: number;
  rescue: boolean;
  bossQ: boolean;
  wrongPicks: string[];
  crys: Crys[];
  spawnT: number;
  spawned: number;
  /* ช่วงสู้บอส */
  bolts: number;
  atkT: number;
  atks: Atk[];
  prevAtk: AtkKind[];
  healUsed: boolean;
  chargeT: number;
  chargeUsed: boolean;
  clapUsed: boolean;
  windAt: number;
  lastCast: number;
  bothT: number;
  finalStrike: boolean;
}
interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  big?: boolean;
}
interface RunResult {
  land: Land;
  style: number;
  scores: TeamScore[];
  teams: number;
  log: QLog[];
  stars: number;
  coins: number;
  knowGain: number;
  newSpells: SpellId[];
  bossKills: number;
  bossName: string;
  title: string;
}

const shuffle = <T,>(a: T[]): T[] => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const mobId = (cid: string) => `m_${cid}`;
const MOB_KIND = (i: number) => i % 3;
const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export function MagicGame({ questions, settings, title, onExit, persist = true }: { questions: QuizQuestion[]; settings: ArSettings; title: string; onExit: () => void; persist?: boolean }) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState<CamError | null>(null);
  const [camLost, setCamLost] = useState(false);
  const [mo, setMo] = useState<Record<MoId, boolean>>(DEFAULT_MO);
  const [sens, setSens] = useState(settings.sens);
  const [teams, setTeams] = useState(settings.teams);
  const [style, setStyle] = useState(settings.style);
  const [level, setLevel] = useState(settings.level === 3 ? 1 : settings.level);
  const [count, setCount] = useState(3);
  const [sub, setSub] = useState<Sub>('enter');
  const [qn, setQn] = useState(0);
  const [marks, setMarks] = useState<Record<string, 'wrong' | 'answer' | 'got'>>({});
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [banner, setBanner] = useState<{ text: string; sub?: string; color: string } | null>(null);
  const [paused, setPaused] = useState(false);
  const [teacher, setTeacher] = useState(false);
  const [away, setAway] = useState(false);
  const [issue, setIssue] = useState<QualityIssue>(null);
  const [calib, setCalib] = useState({ seen: false, hand: false, cast: false, shield: false, dodgeL: false, dodgeR: false, charge: false, spread: false, clap: false });
  const [skipArm, setSkipArm] = useState(false);
  const [save, setSave] = useState<MagicSave>(EMPTY_MAGIC);
  const [landId, setLandId] = useState(LANDS[0].id);
  const [tab, setTab] = useState<HubTab>('map');
  const [result, setResult] = useState<RunResult | null>(null);
  const [setErr, setSetErr] = useState('');
  const [sets, setSets] = useState<{ id: string; title: string }[] | null>(null);
  const [setsErr, setSetsErr] = useState('');
  const [shake, setShake] = useState(0);
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const skel = useRef<HTMLCanvasElement>(null);
  const tracker = useRef<PoseTracker | null>(null);
  const scene = useRef<MagicScene | null>(null);
  const G = useRef<Game | null>(null);
  const labels = useRef(new Map<string, HTMLDivElement>());
  const crysEls = useRef(new Map<string, HTMLButtonElement>());
  const rings = useRef<(SVGSVGElement | null)[]>([null, null]);
  const reticles = useRef<(HTMLDivElement | null)[]>([null, null]);
  const timeBar = useRef<HTMLDivElement>(null);
  const bossBar = useRef<HTMLDivElement>(null);
  const chargeBar = useRef<HTMLDivElement>(null);
  const atkEls = useRef(new Map<string, HTMLDivElement>());
  const hands = useRef<Record<HandSide, HandRT>>({ l: newHand(), r: newHand() });
  const body = useRef<{ b: Body | null; draw: { x: number; y: number; v: number }[]; seenAt: number; seenSince: number; lock: Lock | null; smooth: BodySmoother; qual: Quality; issue: QualityIssue; gest: Gestures; spread: Hold; clap: Clap; recalUntil: number }>({
    b: null, draw: [], seenAt: 0, seenSince: 0, lock: null, smooth: new BodySmoother(), qual: new Quality(), issue: null, gest: new Gestures(), spread: new Hold(4, 5), clap: new Clap(), recalUntil: 0,
  });
  const touch = useRef({ lean: 0 as -1 | 0 | 1, leanUntil: 0, shieldUntil: 0 });
  const phaseRef = useRef<Phase>('setup');
  const pausedRef = useRef(false);
  const awayRef = useRef(false);
  const camRef = useRef(false);
  const moRef = useRef(mo);
  const sensRef = useRef(sens);
  const calibRef = useRef(calib);
  const saveRef = useRef(save);
  const issueRef = useRef<QualityIssue>(null);
  const floatId = useRef(0);
  const T = useRef(0);

  phaseRef.current = phase;
  pausedRef.current = paused || teacher || camLost;
  camRef.current = camOn;
  moRef.current = mo;
  sensRef.current = sens;
  calibRef.current = calib;

  /* ------------------------------ ข้อมูลในเครื่อง ------------------------------ */
  useEffect(() => {
    const s = loadMagic();
    saveRef.current = s;
    setSave(s);
    setLandId(nextLand(s.stars).id);
  }, []);
  const commit = useCallback(
    (f: (s: MagicSave) => MagicSave) => {
      const s = f(saveRef.current);
      saveRef.current = s;
      setSave(s);
      if (persist) writeMagic(s);
    },
    [persist]
  );

  /* ------------------------------ เพลง + ปิดกล้องตอนออก ------------------------------ */
  useEffect(() => {
    setMusic('room', roomTrack(settings.music, 'magic'));
    return () => {
      releaseMusic('room');
      tracker.current?.stop();
      tracker.current = null;
    };
  }, [settings.music]);

  const float = useCallback((x: number, y: number, text: string, color: string, big = false) => {
    const id = ++floatId.current;
    setFloaters((f) => [...f.slice(-12), { id, x, y, text, color, big }]);
    setTimeout(() => setFloaters((f) => f.filter((v) => v.id !== id)), 1300);
  }, []);

  const size = () => ({ cw: root.current?.clientWidth || 800, ch: root.current?.clientHeight || 600 });
  /** ขนาดนักเวทมุมล่างซ้าย + จุดปลายไม้เท้า (ต้นทางลูกเวท) */
  const hero = useCallback(() => {
    const { cw, ch } = size();
    const s = Math.max(78, Math.min(150, Math.min(cw, ch) * 0.22));
    return { s, x: 12 + (s * 98) / 120, y: ch - 8 - (s * 140) / 120 + (s * 38) / 120 };
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
    const err = await t.start(2);
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
    body.current.b = null;
    body.current.draw = [];
  };
  const startTouch = () => {
    gsfx.unlock();
    gsfx.tap();
    toTouch();
    setPhase('hub');
  };

  /* ฉาก 3D: สร้างเมื่อเริ่มใช้ (ไม่มีกล้อง = ท้องฟ้าดินแดนเต็มจอ) */
  const hasScene = phase !== 'setup' && phase !== 'loading';
  useEffect(() => {
    if (!hasScene || !stage.current) return;
    // สร้างครั้งเดียว: เปลี่ยนเป็นแตะจอกลางเกมแล้วมอนสเตอร์/บอสยังอยู่ (ค่ากล้องใช้แค่เลือกความคมตอนสร้าง)
    const sc = new MagicScene(stage.current, camRef.current);
    scene.current = sc;
    return () => {
      sc.dispose();
      scene.current = null;
    };
  }, [hasScene]);

  /* ชุดคำถามที่ครูผูกกับดินแดน (โหลดไม่ได้/ข้อไม่พอ = ใช้ชุดที่เปิดเกมมา) */
  const loadSet = useCallback(async (id: string): Promise<QuizQuestion[] | string> => {
    const { data: row, error } = await createClient().from('user_games').select('title, content').eq('id', id).maybeSingle();
    if (error || !row) return 'เปิดชุดคำถามของดินแดนนี้ไม่ได้ ใช้ชุดที่เปิดเกมมาแทน';
    const content = sanitizeQuiz(row.content, mediaPrefix());
    if (!modeFit(content, 'magic').ok) return 'ชุดของดินแดนนี้มีข้อเลือกตอบไม่พอ ใช้ชุดที่เปิดเกมมาแทน';
    return modeQuiz(content, 'magic').questions;
  }, []);

  /* ------------------------------ รอบเล่น ------------------------------ */
  const clearScene = useCallback(() => {
    const sc = scene.current;
    const g = G.current;
    if (sc && g) {
      g.order.forEach((cid) => sc.remove(mobId(cid)));
      g.crys.forEach((c) => sc.remove(c.id));
      g.atks.forEach((a) => sc.remove(a.id));
    }
    sc?.remove('boss');
    sc?.remove('cage');
    sc?.remove('cal');
  }, []);

  const newBoss = (def: MagicBoss, qs: number, lv: number, kills = 0): BossRT => {
    const { cw, ch } = size();
    const hp = bossHpFor(def, qs, lv);
    return { def, hp, max: hp, alive: true, x: cw * 0.8, y: -ch * 0.2, r: 10, frozenUntil: 0, kills };
  };

  const beginRun = useCallback(
    async (lid?: string) => {
      const land = landById(lid || landId);
      let src = questions;
      setSetErr('');
      const bound = saveRef.current.sets[land.id];
      if (bound) {
        const r = await loadSet(bound);
        if (typeof r === 'string') setSetErr(r);
        else src = r;
      }
      clearScene();
      const sv = saveRef.current;
      const fx = effects(sv.skills, sv.pet);
      const n = settings.count > 0 ? Math.min(settings.count, src.length) : src.length;
      const list = shuffle(src).slice(0, n);
      const tm = Math.max(1, teams);
      const bossDef = settings.boss !== 'auto' ? magicBoss(settings.boss) : magicBoss(land.boss);
      const bossFrom = style === 0 ? bossStart(list.length) : style === 2 ? 0 : 1e9;
      const g: Game = {
        land, style, level, teams: tm, members: Math.max(1, settings.members), list, total: list.length, bossFrom, qn: 0,
        boss: style === 2 ? newBoss(bossDef, Math.min(3, list.length), level) : null,
        hearts: fx.hearts, maxHearts: fx.hearts, fx, bolt: sv.bolt, open: openSpells(sv.knowledge),
        scores: [...Array(tm)].map(emptyScore), log: [], coop: 0, coopDone: 0, timeLeft: TIME_ATTACK_S, knowGain: 0,
        q: null, order: [], mobs: [], sub: 'enter', subT: 0, subS: ENTER_S, usedMs: 0, limitMs: 20000, lastSec: -1, firstTry: true, got: false, team: 0, member: 0, rescue: false, bossQ: false, wrongPicks: [],
        crys: [], spawnT: 0, spawned: 0, bolts: 0, atkT: 0, atks: [], prevAtk: [], healUsed: false, chargeT: 0, chargeUsed: false, clapUsed: false, windAt: -9, lastCast: 0, bothT: 0, finalStrike: false,
      };
      // ตอนสร้าง boss ข้างบนยังไม่รู้ว่าจะใช้บอสนี้ในโหมดผจญภัยไหม จึงเก็บแบบไว้ใช้ตอนถึงช่วงบอส
      (g as Game & { bossDef?: MagicBoss }).bossDef = bossDef;
      if (g.boss) scene.current?.boss('boss', g.boss.def.id);
      for (const h of HANDS) {
        hands.current[h] = newHand(fx.dwell);
      }
      G.current = g;
      setResult(null);
      setMarks({});
      setQn(0);
      setCount(3);
      setPhase('count');
      gsfx.start();
    },
    [clearScene, landId, level, loadSet, questions, settings.boss, settings.count, settings.members, style, teams]
  );

  const loadQuestion = useCallback(
    (n: number) => {
      const g = G.current;
      const sc = scene.current;
      if (!g) return;
      g.order.forEach((cid) => sc?.remove(mobId(cid)));
      sc?.remove('cage');
      const q = g.list[n % g.list.length];
      const prevTeam = g.team;
      g.qn = n;
      g.q = q;
      g.order = shuffle(q.choices.map((c) => c.id));
      g.team = n % g.teams;
      g.member = Math.floor(n / g.teams) % g.members;
      // ช่วงบอสเริ่ม: ผจญภัยเมื่อถึงข้อท้ายๆ
      const bossDef = (g as Game & { bossDef?: MagicBoss }).bossDef!;
      let bossIntro = false;
      if (g.style === 0 && n === g.bossFrom && !g.boss) {
        g.boss = newBoss(bossDef, g.total - g.bossFrom, g.level);
        sc?.boss('boss', bossDef.id);
        bossIntro = true;
      }
      g.bossQ = !!g.boss?.alive && (g.style === 2 || n >= g.bossFrom);
      g.rescue = g.style !== 2 && !g.bossQ && isRescue(n);
      g.mobs = g.order.map((cid, i) => ({ cid, i, x: 0, y: 0, r: 40, alive: true }));
      g.order.forEach((cid, i) => sc?.mob(mobId(cid), g.land.mob[i % g.land.mob.length], MOB_KIND(i)));
      if (g.rescue) sc?.cage('cage');
      g.firstTry = true;
      g.got = false;
      g.wrongPicks = [];
      g.usedMs = 0;
      g.lastSec = -1;
      g.limitMs = g.style === 1 ? 1e9 : (settings.time || Math.max(20, q.time || 0)) * 1000;
      g.crys = [];
      for (const h of HANDS) {
        hands.current[h].dwell.reset();
        hands.current[h].hit.reset();
      }
      const swap = g.teams > 1 && (n === 0 || g.team !== prevTeam);
      if (swap) {
        // เปลี่ยนคนร่ายเวท: ปลดล็อกคนเดิม จับท่ายืนใหม่
        body.current.lock = null;
        body.current.recalUntil = performance.now() + SWAP_S * 1000;
        body.current.gest.reset();
      }
      g.sub = bossIntro ? 'bossIn' : 'enter';
      g.subT = 0;
      g.subS = bossIntro ? BOSS_IN_S : swap ? SWAP_S : ENTER_S;
      setSub(g.sub);
      setQn(n);
      setMarks({});
      if (bossIntro) {
        setBanner({ text: `${bossDef.name} ปรากฏตัว!`, sub: 'ตอบถูกเพื่อรับลูกเวท แล้วร่ายเวทใส่บอส', color: bossDef.color });
        gsfx.siren();
      } else if (swap) {
        setBanner({ text: `ตาของ${TEAM_NAMES[g.team]}`, sub: g.members > 1 ? `นักเวทคนที่ ${g.member + 1} ออกมายืนหน้ากล้อง` : 'ยืนหน้ากล้องให้เห็นตัว', color: TEAM_HEX[g.team] });
        gsfx.whoosh();
      } else if (g.rescue) {
        setBanner({ text: 'ช่วยชาวเมือง!', sub: 'ตอบถูกเพื่อปลดกุญแจกรง', color: '#ffc53a' });
      } else setBanner(null);
    },
    [settings.time]
  );

  const finishRun = useCallback(() => {
    const g = G.current;
    if (!g) return;
    clearScene();
    const firstAll = g.scores.reduce((a, s) => a + s.first, 0);
    const answered = g.style === 1 ? Math.max(1, g.log.length) : g.total;
    const stars = landStars(firstAll, answered);
    const total = g.scores.reduce((a, s) => a + s.know + s.play, 0);
    const coins = coinsFor(total, stars, g.fx.coin);
    const before = new Set(openSpells(saveRef.current.knowledge));
    const after = openSpells(saveRef.current.knowledge + g.knowGain);
    const r: RunResult = {
      land: g.land, style: g.style, scores: g.scores, teams: g.teams, log: g.log, stars, coins, knowGain: g.knowGain,
      newSpells: after.filter((s) => !before.has(s)), bossKills: g.boss?.kills || 0, bossName: (g as Game & { bossDef?: MagicBoss }).bossDef?.name || '', title,
    };
    commit((s) => ({
      ...s,
      coins: s.coins + coins,
      knowledge: s.knowledge + g.knowGain,
      stars: { ...s.stars, [g.land.id]: Math.max(s.stars[g.land.id] || 0, stars) },
      rescued: s.rescued + g.scores.reduce((a, x) => a + x.rescued, 0),
      crystals: s.crystals + g.scores.reduce((a, x) => a + x.crystals, 0),
    }));
    G.current = null;
    setResult(r);
    setBanner(null);
    setPhase('end');
    gsfx.fanfare();
  }, [clearScene, commit, title]);

  const nextQuestion = useCallback(() => {
    const g = G.current;
    if (!g) return;
    const n = g.qn + 1;
    if (g.style !== 1 && n >= g.total) {
      // ข้อหมดแต่บอสยังไม่ล้ม: คริสตัลแห่งความรู้ปิดฉาก (ไม่มีแพ้)
      if (g.boss?.alive && g.style === 0) {
        g.finalStrike = true;
        g.order.forEach((cid) => scene.current?.remove(mobId(cid)));
        scene.current?.burst(g.boss.x, g.boss.y, '#ffd23f', 2.4);
        g.boss.hp = 0;
        g.boss.alive = false;
        g.sub = 'victory';
        g.subT = 0;
        setSub('victory');
        setBanner({ text: 'พลังคริสตัลแห่งความรู้!', sub: `${g.boss.def.name} พ่ายแพ้แล้ว`, color: '#ffd23f' });
        gsfx.levelUp();
        return;
      }
      finishRun();
      return;
    }
    loadQuestion(n);
  }, [finishRun, loadQuestion]);

  const addPlay = (pts: number, x?: number, y?: number, text?: string, color = '#ffe38a') => {
    const g = G.current;
    if (!g || pts <= 0) return;
    g.scores[g.team].play += pts;
    if (x !== undefined && y !== undefined) float(x, y, text || `+${pts}`, color);
  };

  /** ภารกิจทีม (หลายทีม): ตอบถูกรวมกันครบเป้า = ทุกทีม +100 */
  const coopTick = () => {
    const g = G.current;
    if (!g || g.teams < 2) return;
    g.coop++;
    const goal = g.teams * 2;
    if (g.coop >= goal) {
      g.coop = 0;
      g.coopDone++;
      g.scores.forEach((s) => (s.play += MK_POINTS.team));
      const { cw, ch } = size();
      float(cw / 2, ch * 0.4, `ภารกิจทีมสำเร็จ! ทุกทีม +${MK_POINTS.team}`, '#ffd23f', true);
      gsfx.fanfare();
    }
  };

  const choose = useCallback(
    (cid: string) => {
      const g = G.current;
      const sc = scene.current;
      if (!g || g.sub !== 'ask' || !g.q) return;
      const mob = g.mobs.find((m) => m.cid === cid);
      if (!mob || !mob.alive) return;
      const choice = g.q.choices.find((c) => c.id === cid);
      const s = g.scores[g.team];
      const h = hero();
      if (choice?.correct) {
        g.got = true;
        s.streak++;
        s.best = Math.max(s.best, s.streak);
        const pts = answerPoints(g.firstTry, g.usedMs, g.limitMs, s.streak);
        s.know += pts;
        s.correct++;
        if (g.firstTry) s.first++;
        g.knowGain += g.fx.know;
        sc?.bolt(h.x, h.y, mob.x, mob.y, spellById(g.bolt).color, g.bolt === 'ice' ? 'ice' : g.bolt === 'thunder' ? 'thunder' : 'fire');
        setTimeout(() => scene.current?.poof(mobId(cid), g.land.mob[mob.i % g.land.mob.length]), 300);
        mob.alive = false;
        g.mobs.forEach((m) => {
          if (m.alive) {
            m.alive = false;
            sc?.flyAway(mobId(m.cid));
          }
        });
        float(mob.x, mob.y - mob.r, `+${pts}`, '#ffe38a', true);
        if (s.streak >= 2) float(mob.x, mob.y + mob.r * 0.4, `คอมโบ x${s.streak}`, '#ff8fc7');
        gsfx.cast();
        gsfx.correct();
        if (s.streak >= 3) gsfx.streak();
        // นางฟ้าจิ๋ว: ตอบถูก 3 ข้อติด ฟื้นหัวใจ
        if (saveRef.current.pet === 'fairy' && s.streak % 3 === 0 && g.hearts < g.maxHearts) {
          g.hearts++;
          float(h.x, h.y - 40, 'นางฟ้าฟื้นหัวใจ +1', '#ff8fc7');
        }
        g.log.push({ n: g.qn, text: richToPlain(g.q.text, 140), team: g.team, member: g.member, first: g.firstTry, got: true, wrong: g.wrongPicks.slice(), ms: Math.round(g.usedMs) });
        setMarks((m) => ({ ...m, [cid]: 'got' }));
        coopTick();
        g.sub = 'reveal';
        g.subT = 0;
        setSub('reveal');
        setBanner(null);
      } else {
        g.firstTry = false;
        mob.alive = false;
        s.wrong++;
        s.streak = 0;
        g.wrongPicks.push(choice ? richToPlain(choice.text, 40) : '?');
        sc?.wobble(mobId(cid));
        gsfx.wrong();
        float(mob.x, mob.y - mob.r, 'ลองอีกที!', '#ffb3c6');
        const mk: Record<string, 'wrong'> = { [cid]: 'wrong' };
        // คำใบ้: ผิดครั้งที่ 2 ตัดตัวลวงออกอีก 1 ตัว
        const wrongLeft = g.mobs.filter((m) => m.alive && !g.q!.choices.find((c) => c.id === m.cid)?.correct);
        if (g.wrongPicks.length >= 2 && wrongLeft.length) {
          const x = wrongLeft[0];
          x.alive = false;
          mk[x.cid] = 'wrong';
          sc?.flyAway(mobId(x.cid));
          float(x.x, x.y, 'คำใบ้: ตัดตัวลวงออก', '#bff3ff');
        }
        setMarks((m) => ({ ...m, ...mk }));
      }
    },
    [float, hero]
  );

  /* ------------------------------ ช่วงสู้บอส ------------------------------ */
  const hitBoss = useCallback(
    (spell: SpellId, from?: { x: number; y: number }) => {
      const g = G.current;
      const sc = scene.current;
      const b = g?.boss;
      if (!g || !b?.alive || g.sub !== 'battle') return false;
      const s = g.scores[g.team];
      const dmg = spellDamage(spell, g.fx, s.streak);
      const h = from || hero();
      if (spell === 'rainbow') sc?.beam(h.x, h.y, b.x, b.y);
      else if (spell === 'wind') sc?.tornado(b.x, b.y);
      else sc?.bolt(h.x, h.y, b.x, b.y, spellById(spell).color, spell === 'ice' ? 'ice' : spell === 'thunder' ? 'thunder' : 'fire');
      if (spell === 'ice') {
        b.frozenUntil = T.current + FREEZE_S;
        sc?.freeze('boss', b.frozenUntil);
      }
      b.hp = Math.max(0, b.hp - dmg);
      s.bossDmg += dmg;
      g.lastCast = g.subT;
      sc?.pulse('boss', 0.3);
      addPlay(MK_POINTS.hit, b.x + (Math.random() - 0.5) * b.r, b.y - b.r * 0.6, `-${dmg} HP`, spellById(spell).color);
      gsfx.cast();
      if (spell === 'thunder' || spell === 'rainbow') gsfx.boom();
      if (b.hp <= 0) {
        b.alive = false;
        b.kills++;
        g.atks.forEach((a) => sc?.remove(a.id));
        g.atks = [];
        g.sub = 'victory';
        g.subT = 0;
        setSub('victory');
        addPlay(MK_POINTS.boss);
        sc?.burst(b.x, b.y, b.def.color, 2.2);
        setBanner({ text: `ปราบ${b.def.name}แล้ว!`, sub: `+${MK_POINTS.boss} คะแนน คริสตัลแห่งความรู้กลับมาแล้ว`, color: b.def.color });
        gsfx.fanfare();
      }
      bump();
      return true;
    },
    [bump, hero]
  );

  /** ยิงลูกเวทหลัก (ใช้ 1 ลูก) */
  const castBolt = useCallback(
    (from?: { x: number; y: number }) => {
      const g = G.current;
      if (!g || g.sub !== 'battle' || g.bolts <= 0) return;
      if (hitBoss(g.bolt, from)) g.bolts--;
    },
    [hitBoss]
  );
  const castRainbow = useCallback(() => {
    const g = G.current;
    if (!g || g.sub !== 'battle' || g.bolts < 2 || !g.open.includes('rainbow')) return;
    if (hitBoss('rainbow')) g.bolts -= 2;
  }, [hitBoss]);
  const castWind = useCallback(() => {
    const g = G.current;
    if (!g || g.sub !== 'battle' || g.bolts < 1 || !g.open.includes('wind') || g.subT - g.windAt < 1.5) return;
    g.windAt = g.subT;
    // พายุพัดลูกพลังของบอสที่กำลังมาทิ้งไปด้วย
    g.atks.forEach((a) => scene.current?.flyAway(a.id));
    if (g.atks.length) float(size().cw / 2, size().ch * 0.55, 'พายุพัดการโจมตีหายไป!', '#9ff0d0', true);
    g.atks = [];
    if (hitBoss('wind')) g.bolts--;
  }, [float, hitBoss]);
  const castCharge = useCallback(() => {
    const g = G.current;
    if (!g || g.sub !== 'battle') return;
    const h = hero();
    if (g.open.includes('heal') && !g.healUsed && g.hearts < g.maxHearts) {
      g.healUsed = true;
      g.hearts++;
      float(h.x, h.y - 50, 'แสงฟื้นพลัง หัวใจ +1', '#7be36b', true);
      gsfx.levelUp();
    } else if (!g.chargeUsed) {
      g.chargeUsed = true;
      g.bolts++;
      float(h.x, h.y - 50, 'ชาร์จพลัง ลูกเวท +1', '#ffd23f', true);
      gsfx.charge();
    }
    bump();
  }, [bump, float, hero]);
  const castClap = useCallback(() => {
    const g = G.current;
    if (!g || g.sub !== 'battle' || g.clapUsed) return;
    g.clapUsed = true;
    hitBoss('thunder');
  }, [hitBoss]);

  /** การโจมตีของบอสถึงตัว: กันได้ = +10, ไม่ได้ = หัวใจ -1 (หมด = พักฟื้น ไม่มีแพ้) */
  const resolveAtk = useCallback(
    (a: Atk) => {
      const g = G.current;
      const sc = scene.current;
      if (!g) return;
      sc?.remove(a.id);
      const now = performance.now();
      const bd = body.current;
      const tc = touch.current;
      const lean = tc.leanUntil > now ? tc.lean : camRef.current ? bd.gest.lean : 0;
      const shield = tc.shieldUntil > now || (camRef.current && bd.gest.shield);
      const { cw, ch } = size();
      const ok = a.kind === 'shield' ? shield : lean === a.dir;
      const s = g.scores[g.team];
      if (ok) {
        s.blocks++;
        addPlay(MK_POINTS.hit, cw / 2, ch * 0.62, a.kind === 'shield' ? 'โล่ศิลากันได้!' : 'หลบได้!', '#9ff0d0');
        sc?.burst(cw / 2, ch * 0.7, a.kind === 'shield' ? '#c08a3e' : '#9ff0d0', 0.8);
        gsfx.lock();
      } else {
        const dmg = g.fx.hurt >= 0.75 || Math.random() < g.fx.hurt ? 1 : 0;
        g.hearts = Math.max(0, g.hearts - dmg);
        setShake((n) => n + 1);
        gsfx.hurt();
        float(cw / 2, ch * 0.62, dmg ? 'โดนเวทบอส!' : 'เกราะช่วยไว้!', '#ff8fa3', true);
        if (g.hearts <= 0) {
          // หมดแรงไม่แพ้: ฟื้นเต็มทันที แต่คอมโบหาย
          g.hearts = g.maxHearts;
          s.streak = 0;
          float(cw / 2, ch * 0.5, 'พักฟื้นพลัง! หัวใจเต็มแล้ว ลุยต่อ', '#ffd23f', true);
        }
      }
      bump();
    },
    [bump]
  );

  /* ------------------------------ ปุ่ม/แตะจอ ------------------------------ */
  const touchMove = useCallback(
    (m: 'L' | 'R' | 'shield' | 'charge' | 'wind' | 'rainbow' | 'clap' | 'cast') => {
      const now = performance.now();
      const tc = touch.current;
      if (m === 'L' || m === 'R') {
        tc.lean = m === 'L' ? -1 : 1;
        tc.leanUntil = now + 900;
        gsfx.whoosh();
      } else if (m === 'shield') {
        tc.shieldUntil = now + 1000 + saveRef.current.skills.defense * 150;
        gsfx.tap();
      } else if (m === 'charge') castCharge();
      else if (m === 'wind') castWind();
      else if (m === 'rainbow') castRainbow();
      else if (m === 'clap') castClap();
      else castBolt();
    },
    [castBolt, castCharge, castClap, castRainbow, castWind]
  );

  /* นับถอยหลัง 3-2-1 */
  useEffect(() => {
    if (phase !== 'count') return;
    if (count <= 0) {
      setPhase('play');
      gsfx.go();
      loadQuestion(0);
      return;
    }
    gsfx.count();
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, count, loadQuestion]);

  /* ------------------------------ วนเกมทุกเฟรม ------------------------------ */
  useEffect(() => {
    if (!hasScene) return;
    let raf = 0;
    let last = performance.now();
    let camCheck = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // ลดความร้อน: วนไม่เกิน ~30 ภาพ/วิ, หน้าแผนที่/พัก ~10 ภาพ/วิ และไม่ตรวจท่า
      const idle = phaseRef.current === 'hub' || phaseRef.current === 'end' || pausedRef.current;
      if (now - last < (idle ? 100 : 30)) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      T.current += dt;
      const t = T.current;
      const box = root.current;
      if (!box) return;
      const cw = box.clientWidth;
      const ch = box.clientHeight;
      const area: Rect = { x: 12, y: ch * 0.06, w: cw - 24, h: ch * 0.8 };
      const ph = phaseRef.current;
      const g = G.current;
      const sc = scene.current;
      const k = sensK(sensRef.current);
      const M = moRef.current;
      const bd = body.current;
      const hs = hands.current;

      /* ---- กล้องหลุด ---- */
      const tr = tracker.current;
      if (tr && now - camCheck > 1000) {
        camCheck = now;
        if (!tr.live && camRef.current) setCamLost(true);
      }

      /* ---- ตรวจท่าทาง ---- */
      const events: string[] = [];
      if (tr?.ready && !idle && tr.tick(now)) {
        const v = video.current!;
        const view = { vw: v.videoWidth || 1280, vh: v.videoHeight || 720, cw, ch, mirror: true };
        const bodies: Body[] = [];
        for (const l of tr.poses) {
          const b = toBody(l, view);
          if (b && b.sw >= cw * MIN_SW) bodies.push(b);
        }
        const raw = pickBody(bodies, bd.lock, now);
        if (raw) {
          bd.lock = toLock(raw, now);
          if (now - bd.seenAt > 400) {
            bd.seenSince = now;
            bd.smooth.reset();
            bd.qual.reset();
            bd.draw = [];
          }
          bd.seenAt = now;
          bd.issue = bd.qual.update(raw, now);
          const b = bd.smooth.smooth(raw, now);
          bd.b = b;
          if (bd.issue === 'shaky') {
            for (const h of HANDS) hs[h].aim = null;
          } else {
            for (const h of HANDS) hs[h].aim = aimFromHand(b, h, 1, area);
            if (now - bd.seenSince < 900 || now < bd.recalUntil) bd.gest.calibrate(b);
            else {
              for (const e of bd.gest.update(b, now, k)) events.push(e);
              const sp = bd.spread.active;
              if (bd.spread.update(spreadPose(b, k)) && !sp) events.push('spread');
              if (bd.clap.update(b, now)) events.push('clap');
            }
          }
        }
      }
      if (now - bd.seenAt > 400) {
        bd.b = null;
        bd.issue = null;
        bd.draw = [];
        bd.gest.lean = 0;
        bd.gest.shield = false;
        bd.gest.charge = false;
        for (const h of HANDS) {
          hs[h].aim = null;
          hs[h].disp.reset();
        }
      }
      for (const h of HANDS) {
        const hd = hs[h];
        if (hd.aim) hd.disp.step(hd.aim.x, hd.aim.y, dt);
        else hd.disp.reset();
      }
      if (bd.b) {
        const kk = 1 - Math.exp(-dt * 26);
        bd.draw = bd.b.pts.map((p, i) => {
          const d = bd.draw[i];
          return d ? { x: d.x + (p.x - d.x) * kk, y: d.y + (p.y - d.y) * kk, v: p.v } : { ...p };
        });
      }

      /* ---- โครงร่าง (สีพลังเวทของนักเวท) ---- */
      const cv = skel.current;
      const g2 = cv && tr ? cv.getContext('2d') : null;
      if (cv && g2) {
        if (cv.width !== cw || cv.height !== ch) {
          cv.width = cw;
          cv.height = ch;
        }
        g2.clearRect(0, 0, cw, ch);
        const pts = bd.draw;
        if (bd.b && pts.length) {
          const sw = bd.b.sw;
          g2.lineCap = 'round';
          g2.strokeStyle = bd.gest.shield ? '#ffcf7a' : g && g.teams > 1 ? TEAM_HEX[g.team] : AURAS[saveRef.current.look.aura];
          g2.lineWidth = Math.max(3, sw * 0.06);
          g2.globalAlpha = 0.85;
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
          for (const i of [15, 16]) {
            const p = pts[i];
            if (p.v < 0.5) continue;
            g2.beginPath();
            g2.arc(p.x, p.y, Math.max(6, sw * 0.08), 0, Math.PI * 2);
            g2.fill();
          }
          g2.globalAlpha = 1;
        }
      }

      /* ---- เตือนหน้าถูกบัง/ตัวสั่น + พักเมื่อไม่มีคนหน้ากล้อง ---- */
      const iss = tr ? bd.issue : null;
      if (iss !== issueRef.current) {
        issueRef.current = iss;
        setIssue(iss);
      }
      if (tr && ph === 'play') {
        const gone = now - bd.seenAt > 1500;
        if (gone !== awayRef.current) {
          awayRef.current = gone;
          setAway(gone);
        }
      }
      const frozen = pausedRef.current || awayRef.current;

      /* ---- ตั้งค่ากล้อง: ภารกิจฝึก ---- */
      if (ph === 'calib') {
        const c = calibRef.current;
        const nx = { ...c };
        nx.seen = c.seen || (!!bd.b && now - bd.seenSince > 700);
        nx.hand = c.hand || HANDS.some((h) => !!aimOf(hs[h]));
        if (!c.cast && sc) {
          if (!sc.has('cal')) sc.mob('cal', '#9b7bff', 0);
          const r = Math.max(42, Math.min(cw, ch) * 0.1);
          const p = { x: cw / 2, y: ch * 0.36, r };
          sc.place('cal', p.x, p.y, r, t);
          if (HANDS.map((h) => hs[h].dwell.update(aimOf(hs[h]), [{ id: 'cal', ...p }], dt * 1000)).some(Boolean)) {
            nx.cast = true;
            const h = hero();
            sc.bolt(h.x, h.y, p.x, p.y, AURAS[saveRef.current.look.aura]);
            setTimeout(() => scene.current?.poof('cal', '#9b7bff'), 300);
            gsfx.cast();
            gsfx.correct();
          }
          const ring = rings.current[0];
          const pr = Math.max(hs.l.dwell.prog.get('cal') || 0, hs.r.dwell.prog.get('cal') || 0);
          if (ring) {
            const size2 = r * 2.9;
            ring.style.opacity = pr > 0 ? '1' : '0';
            ring.style.transform = `translate(${p.x - size2 / 2}px, ${p.y - size2 / 2}px)`;
            ring.style.width = ring.style.height = `${size2}px`;
            const arc = ring.querySelector('.ar-ring-p') as SVGCircleElement | null;
            if (arc) arc.style.strokeDashoffset = `${(1 - pr) * 289}`;
          }
        }
        for (const e of events) {
          if (e === 'shield') nx.shield = true;
          if (e === 'dodgeL') nx.dodgeL = true;
          if (e === 'dodgeR') nx.dodgeR = true;
          if (e === 'charge') nx.charge = true;
          if (e === 'spread') nx.spread = true;
          if (e === 'clap') nx.clap = true;
        }
        if (Object.keys(nx).some((kk) => nx[kk as keyof typeof nx] !== c[kk as keyof typeof c])) setCalib(nx);
      }

      /* ---- เกม ---- */
      if (ph === 'play' && g) {
        if (!frozen) g.subT += dt;
        const b = g.boss;
        const battle = g.sub === 'battle';
        // ท่าทางระหว่างสู้บอส
        if (battle && !frozen) {
          for (const e of events) {
            if (e === 'spread' && M.spread) castWind();
            if (e === 'clap' && M.clap) castClap();
          }
          if (camRef.current && M.charge && bd.gest.charge) {
            g.chargeT += dt;
            if (g.chargeT >= 1) {
              g.chargeT = 0;
              castCharge();
            }
          } else g.chargeT = Math.max(0, g.chargeT - dt * 2);
        }
        if (chargeBar.current) chargeBar.current.style.transform = `scaleX(${Math.min(1, g.chargeT)})`;

        if ((g.sub === 'enter' || g.sub === 'bossIn') && g.subT >= g.subS) {
          g.sub = 'ask';
          g.subT = 0;
          setSub('ask');
          if (!g.rescue) setBanner(null);
        }
        if (g.style === 1 && !frozen && (g.sub === 'ask' || g.sub === 'crystal')) {
          g.timeLeft -= dt;
          const sec = Math.ceil(g.timeLeft);
          if (sec !== g.lastSec) {
            g.lastSec = sec;
            if (sec <= 10 && sec > 0) gsfx.tick(true);
            bump();
          }
          if (timeBar.current) timeBar.current.style.transform = `scaleX(${Math.max(0, g.timeLeft) / TIME_ATTACK_S})`;
          if (g.timeLeft <= 0) {
            gsfx.timeout();
            finishRun();
            return;
          }
        }
        if (g.sub === 'ask' && !frozen) {
          g.usedMs += dt * 1000;
          if (g.style !== 1) {
            const left = Math.max(0, g.limitMs - g.usedMs);
            const sec = Math.ceil(left / 1000);
            if (sec !== g.lastSec) {
              g.lastSec = sec;
              if (sec <= 5 && sec > 0) gsfx.tick(true);
              bump();
            }
            if (timeBar.current) timeBar.current.style.transform = `scaleX(${left / g.limitMs})`;
            if (left <= 0 && g.q) {
              // หมดเวลา: เฉลย ไม่มีคะแนน (ไม่มีแพ้)
              gsfx.timeout();
              const s = g.scores[g.team];
              s.streak = 0;
              const ans = g.q.choices.find((c) => c.correct)?.id;
              g.mobs.forEach((m) => {
                if (m.alive && m.cid !== ans) sc?.flyAway(mobId(m.cid));
                m.alive = false;
              });
              if (ans) setMarks((m) => ({ ...m, [ans]: 'answer' }));
              g.log.push({ n: g.qn, text: richToPlain(g.q.text, 140), team: g.team, member: g.member, first: false, got: false, wrong: g.wrongPicks.slice(), ms: Math.round(g.usedMs) });
              g.sub = 'reveal';
              g.subT = 0;
              setSub('reveal');
            }
          }
          // เลือกคำตอบด้วยการค้างเป้า (มือละวง)
          const targets: DwellTarget[] = g.mobs.filter((m) => m.alive).map((m) => ({ id: m.cid, x: m.x, y: m.y, r: m.r * 1.15 }));
          for (const h of HANDS) {
            const f = hs[h].dwell.update(aimOf(hs[h]), targets, dt * 1000);
            if (f) choose(f);
          }
        } else if (g.sub === 'reveal' && g.subT >= REVEAL_S) {
          const ans = g.q?.choices.find((c) => c.correct)?.id;
          if (ans) sc?.flyAway(mobId(ans));
          if (g.got && g.rescue) {
            sc?.openCage('cage');
            g.scores[g.team].rescued++;
            addPlay(MK_POINTS.rescue, cw * 0.14, ch * 0.42, `ช่วยชาวเมือง +${MK_POINTS.rescue}`, '#ffd23f');
            gsfx.door();
          }
          if (g.got && g.bossQ && b?.alive) {
            g.sub = 'battle';
            g.subT = 0;
            g.bolts = g.fx.bolts + (g.scores[g.team].streak >= 3 ? 1 : 0);
            g.atkT = 1.4;
            g.healUsed = g.chargeUsed = g.clapUsed = false;
            g.lastCast = 0;
            g.bothT = 0;
            for (const h of HANDS) hs[h].hit.reset();
            setSub('battle');
            setBanner({ text: 'ร่ายเวทใส่บอส!', sub: camRef.current ? 'ยื่นมือเล็งบอส ค้างไว้ = ยิงเวท' : 'แตะที่บอสหรือปุ่มร่ายเวท', color: b.def.color });
            setTimeout(() => setBanner((x) => (x?.text === 'ร่ายเวทใส่บอส!' ? null : x)), 1600);
            gsfx.levelUp();
          } else if (g.got) {
            g.sub = 'crystal';
            g.subT = 0;
            g.spawnT = 0;
            g.spawned = 0;
            setSub('crystal');
            gsfx.sparkleish();
          } else nextQuestion();
        } else if (g.sub === 'crystal') {
          const dur = g.style === 1 ? 2.6 : CRYSTAL_S;
          // คริสตัลรอบละไม่เกิน CRYSTALS_PER (4 x 20 = 80 น้อยกว่าคะแนนตอบถูก 100 คะแนนความรู้จึงหนักกว่าเสมอ)
          if (!frozen && g.subT < dur - 1 && g.spawned < CRYSTALS_PER) {
            g.spawnT -= dt;
            if (g.spawnT <= 0) {
              g.spawnT = 0.55;
              g.spawned++;
              const id = `c${Math.random().toString(36).slice(2, 8)}`;
              const color = ['#ff8fc7', '#7fe8ff', '#ffd23f', '#9ff0d0', '#c39bff'][Math.floor(Math.random() * 5)];
              g.crys.push({ id, x: cw * (0.15 + Math.random() * 0.7), y: ch * 0.95, vy: -(ch * (0.16 + Math.random() * 0.1)), sway: Math.random() * 6, r: Math.max(26, Math.min(cw, ch) * 0.055), color });
              sc?.crystal(id, color);
              // ปุ่มแตะคริสตัล (โหมดแตะจอ) อ่านจาก G ต้องวาดใหม่
              bump();
            }
          }
          // แตะคริสตัลด้วยมือ (ไม่ต้องค้าง)
          for (const c of g.crys.slice()) {
            if (!frozen) c.y += c.vy * dt;
            const x = c.x + Math.sin(t * 2 + c.sway) * 24;
            const hit = HANDS.some((h) => {
              const a = aimOf(hs[h]);
              return a && Math.hypot(a.x - x, a.y - c.y) < c.r * 1.5;
            });
            if (hit) collectCrystal(c.id);
            else if (c.y < ch * 0.04) {
              sc?.remove(c.id);
              g.crys = g.crys.filter((x2) => x2.id !== c.id);
              bump();
            } else sc?.place(c.id, x, c.y, c.r, t);
            const el = crysEls.current.get(c.id);
            if (el) el.style.transform = `translate(${x - c.r * 1.3}px, ${c.y - c.r * 1.3}px)`;
          }
          if (g.subT >= dur) {
            g.crys.forEach((c) => sc?.remove(c.id));
            g.crys = [];
            nextQuestion();
          }
        } else if (battle && b) {
          // ลูกเวทหมด/หมดเวลา = ไปข้อถัดไป
          if (g.subT >= BATTLE_S || (g.bolts <= 0 && !g.atks.length && g.subT - g.lastCast > 1.2 && g.subT > 2)) {
            g.atks.forEach((a) => sc?.remove(a.id));
            g.atks = [];
            setBanner(null);
            nextQuestion();
          } else if (!frozen) {
            // เล็งบอส: มือเดียว = ลูกเวทหลัก / สองมือบนบอสพร้อมกัน = สายรุ้ง
            const target = [{ id: 'boss', x: b.x, y: b.y, r: b.r * 1.1 }];
            const on = HANDS.filter((h) => {
              const a = aimOf(hs[h]);
              return a && Math.hypot(a.x - b.x, a.y - b.y) < b.r * 1.1;
            });
            if (on.length === 2 && g.open.includes('rainbow') && g.bolts >= 2) {
              g.bothT += dt;
              for (const h of HANDS) hs[h].hit.reset();
              if (g.bothT >= 0.6) {
                g.bothT = 0;
                castRainbow();
              }
            } else {
              g.bothT = 0;
              for (const h of HANDS) {
                const a = aimOf(hs[h]);
                if (g.bolts > 0 && hs[h].hit.update(a, target, dt * 1000)) castBolt();
              }
            }
            // บอสโจมตี (น้ำแข็งแช่ = เลื่อนออกไป)
            if (b.frozenUntil < t) g.atkT -= dt;
            if (g.atkT <= 0 && g.subT < BATTLE_S - 2.2) {
              g.atkT = b.def.every * (ATK_EVERY[g.level] ?? 1);
              const usable: AtkKind[] = [];
              if (M.shield || !camRef.current) usable.push('shield');
              if (M.dodge || !camRef.current) usable.push('dodge');
              if (usable.length) {
                let kind = pickAtk(b.def, g.prevAtk);
                if (!usable.includes(kind)) kind = usable[0];
                g.prevAtk = [...g.prevAtk.slice(-2), kind];
                const id = `atk${Math.random().toString(36).slice(2, 7)}`;
                g.atks.push({ id, kind, dir: Math.random() < 0.5 ? -1 : 1, t: 0, warn: WARN_S[g.level] ?? 1.6 });
                sc?.orb(id, b.def.color);
                gsfx.siren();
                bump();
              }
            }
            for (const a of g.atks.slice()) {
              a.t += dt;
              const kk = Math.min(1, a.t / a.warn);
              // ลูกพลังวิ่งจากบอสไปฝั่งที่จะโดน (หลบ) หรือตรงกลาง (โล่)
              const tx = a.kind === 'dodge' ? cw / 2 - a.dir * cw * 0.18 : cw / 2;
              sc?.place(a.id, b.x + (tx - b.x) * kk, b.y + (ch * 0.72 - b.y) * kk, Math.min(cw, ch) * (0.03 + kk * 0.05), t);
              const el = atkEls.current.get(a.id);
              if (el) el.style.setProperty('--k', String(kk));
              if (a.t >= a.warn) {
                g.atks = g.atks.filter((x) => x.id !== a.id);
                resolveAtk(a);
              }
            }
          }
        } else if (g.sub === 'victory' && g.subT >= VICTORY_S) {
          sc?.remove('boss');
          setBanner(null);
          if (g.finalStrike) {
            addPlay(MK_POINTS.boss / 2);
            finishRun();
          } else if (g.style === 2 && g.qn + 1 < g.total && b) {
            // บอสรัว: บอสตัวถัดไปมาทันที
            const i = MAGIC_BOSSES.findIndex((x) => x.id === b.def.id);
            const nd = MAGIC_BOSSES[(i + 1) % MAGIC_BOSSES.length];
            g.boss = newBoss(nd, Math.min(3, g.total - g.qn - 1), g.level, b.kills);
            (g as Game & { bossDef?: MagicBoss }).bossDef = nd;
            sc?.boss('boss', nd.id);
            setBanner({ text: `${nd.name} ปรากฏตัว!`, color: nd.color });
            setTimeout(() => setBanner(null), 1800);
            nextQuestion();
          } else nextQuestion();
        }

        /* ---- วางมอนสเตอร์ตามขนาดจอ (ลอยไปมาตามความยาก) ---- */
        const n = g.mobs.length;
        const cols = n <= 3 ? n : n === 4 ? 2 : 3;
        const rows = Math.ceil(n / cols);
        const top = ch * (g.bossQ ? 0.4 : 0.34);
        const bottom = ch * 0.74;
        const left = g.rescue ? cw * 0.24 : cw * 0.08;
        const right = g.bossQ && g.sub !== 'battle' ? cw * 0.8 : cw * 0.92;
        const cellW = (right - left) / cols;
        const cellH = (bottom - top) / rows;
        const r = Math.max(30, Math.min(cellW * 0.3, cellH * 0.3, 80));
        const drift = DRIFT[g.level] ?? 0.05;
        g.mobs.forEach((m, i) => {
          const cx = left + cellW * ((i % cols) + 0.5) + Math.sin(t * 0.9 + i * 1.7) * cellW * drift * 2;
          const cy = top + cellH * (Math.floor(i / cols) + 0.5) + Math.cos(t * 1.1 + i) * cellH * drift;
          m.x = cx;
          m.y = cy;
          m.r = r;
          sc?.place(mobId(m.cid), cx, cy, r, t);
          const el = labels.current.get(m.cid);
          if (el) el.style.transform = `translate(${cx}px, ${cy + r * 1.05}px) translate(-50%, 0)`;
        });
        if (g.rescue) sc?.place('cage', cw * 0.12, ch * 0.56, Math.min(cw, ch) * 0.09, t);
        /* ---- บอส: มุมขวาบนตอนถาม / กลางจอตอนสู้ ---- */
        if (b && (b.alive || g.sub === 'victory')) {
          const big = battle || g.sub === 'victory' || g.sub === 'bossIn';
          const m = Math.min(cw, ch);
          const tx = big ? cw / 2 : cw - m * 0.13;
          const ty = big ? ch * 0.38 : ch * 0.3;
          const trr = big ? m * 0.17 : m * 0.075;
          const kk = Math.min(1, dt * 4);
          b.x += (tx - b.x) * kk;
          b.y += (ty + Math.sin(t * 1.6) * (big ? 10 : 4) - b.y) * kk;
          b.r += (trr - b.r) * kk;
          sc?.place('boss', b.x, b.y, b.r, t);
          if (bossBar.current) bossBar.current.style.transform = `scaleX(${Math.max(0, b.hp) / Math.max(1, b.max)})`;
        }
      }

      /* ---- วงล็อกเป้า + เป้าเล็ง ---- */
      HANDS.forEach((h, kx) => {
        const hd = hs[h];
        const ring = rings.current[kx];
        if (ring && ph === 'play' && g) {
          const battle = g.sub === 'battle';
          const dw = battle ? hd.hit : hd.dwell;
          const hv = dw.hover;
          const p = !hv ? null : battle ? (g.boss ? { x: g.boss.x, y: g.boss.y, r: g.boss.r } : null) : g.mobs.find((m) => m.cid === hv) || null;
          const prog = hv ? dw.prog.get(hv) || 0 : 0;
          const both = battle && g.bothT > 0 ? g.bothT / 0.6 : 0;
          const pr = Math.max(prog, both);
          if (p && pr > 0) {
            const s2 = p.r * 2.6;
            ring.style.opacity = '1';
            ring.style.transform = `translate(${p.x - s2 / 2}px, ${p.y - s2 / 2}px)`;
            ring.style.width = ring.style.height = `${s2}px`;
            const arc = ring.querySelector('.ar-ring-p') as SVGCircleElement | null;
            if (arc) arc.style.strokeDashoffset = `${(1 - pr) * 289}`;
          } else ring.style.opacity = '0';
        } else if (ring && ph !== 'calib') ring.style.opacity = '0';
        const ret = reticles.current[kx];
        if (ret) {
          const a = aimOf(hd);
          if (a && (ph === 'play' || ph === 'calib')) {
            ret.style.opacity = '1';
            ret.style.transform = `translate(${a.x}px, ${a.y}px)`;
          } else ret.style.opacity = '0';
        }
      });

      sc?.render(dt, t);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasScene, choose, castBolt, castRainbow, castWind, castCharge, castClap, resolveAtk, nextQuestion, finishRun]);

  const collectCrystal = (id: string) => {
    const g = G.current;
    const c = g?.crys.find((x) => x.id === id);
    if (!g || !c) return;
    g.crys = g.crys.filter((x) => x.id !== id);
    const h = hero();
    scene.current?.collect(id, h.x, h.y);
    g.scores[g.team].crystals++;
    addPlay(MK_POINTS.crystal, c.x, c.y, `+${MK_POINTS.crystal}`, c.color);
    gsfx.coin();
    bump();
  };

  /* แตะจอ (โหมดไม่มีกล้อง หรือใช้ร่วมกับกล้อง): แตะมอนสเตอร์ = เลือก / แตะบอส = ร่ายเวท */
  const onPointer = (e: React.PointerEvent) => {
    const g = G.current;
    if (phase !== 'play' || !g || paused || teacher) return;
    const rect = root.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (g.sub === 'ask') {
      const m = g.mobs.find((mm) => mm.alive && Math.hypot(mm.x - x, mm.y - y) < mm.r * 1.2);
      if (m) choose(m.cid);
    } else if (g.sub === 'battle' && g.boss && Math.hypot(g.boss.x - x, g.boss.y - y) < g.boss.r * 1.2) castBolt({ ...hero() });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'play') return;
      if (e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      const g = G.current;
      if (!g) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') touchMove('L');
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') touchMove('R');
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') touchMove('shield');
      else if (e.code === 'ArrowUp' || e.code === 'KeyH') touchMove('charge');
      else if (e.code === 'KeyW') touchMove('wind');
      else if (e.code === 'KeyR') touchMove('rainbow');
      else if (e.code === 'KeyC') touchMove('clap');
      else if (e.code === 'Enter') touchMove('cast');
      const n = Number(e.key);
      if (n >= 1 && n <= 6 && g.sub === 'ask') {
        const cid = g.order[n - 1];
        if (cid) choose(cid);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, touchMove]);

  /* ------------------------------ ครู ------------------------------ */
  const skipQuestion = () => {
    const g = G.current;
    if (!g) return;
    if (g.sub === 'battle') {
      g.subT = BATTLE_S;
    } else {
      g.mobs.forEach((m) => scene.current?.remove(mobId(m.cid)));
      nextQuestion();
    }
    setTeacher(false);
  };
  const addTime = () => {
    const g = G.current;
    if (!g) return;
    if (g.style === 1) g.timeLeft += 15;
    else g.limitMs += 15000;
    gsfx.tap();
  };
  const loadSets = () => {
    if (sets) return;
    const sb = createClient();
    sb.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!uid) return setSetsErr('ต้องเข้าสู่ระบบก่อนถึงเลือกชุดคำถามของแต่ละดินแดนได้');
      const { data: rows, error } = await sb.from('user_games').select('id, title').eq('owner_id', uid).order('updated_at', { ascending: false }).limit(200);
      if (error) return setSetsErr('โหลดรายการชุดคำถามไม่สำเร็จ');
      setSets((rows || []) as { id: string; title: string }[]);
    });
  };

  /* ------------------------------ ร้าน/แต่งตัว ------------------------------ */
  const setLook = (p: Partial<Look>) => (gsfx.pick(), commit((s) => ({ ...s, look: { ...s.look, ...p } })));
  const pickPet = (id: PetId) => {
    const pet = petById(id);
    const s = saveRef.current;
    if (s.pets.includes(id)) return gsfx.pick(), commit((x) => ({ ...x, pet: id }));
    if (s.coins < pet.cost) return gsfx.wrong();
    gsfx.cash();
    commit((x) => ({ ...x, coins: x.coins - pet.cost, pets: [...x.pets, id], pet: id }));
  };
  const buySkill = (id: SkillId) => {
    const s = saveRef.current;
    const lv = s.skills[id];
    if (lv >= SKILL_MAX || s.coins < skillCost(lv)) return gsfx.wrong();
    gsfx.levelUp();
    commit((x) => ({ ...x, coins: x.coins - skillCost(lv), skills: { ...x.skills, [id]: lv + 1 } }));
  };

  const exit = () => {
    tracker.current?.stop();
    tracker.current = null;
    onExit();
  };
  const toHub = () => {
    clearScene();
    G.current = null;
    setResult(null);
    setBanner(null);
    setPaused(false);
    setPhase('hub');
  };

  const downloadReport = (r: RunResult) => {
    const head = ['ดินแดน', 'ข้อที่', 'คำถาม', 'ทีม', 'ผู้เล่นคนที่', 'ถูกครั้งแรก', 'ตอบถูก', 'ตัวเลือกที่ตอบผิด', 'เวลา (วินาที)'];
    const rows = r.log.map((l) => [r.land.name, l.n + 1, l.text, r.teams > 1 ? TEAM_NAMES[l.team] : 'เดี่ยว', l.member + 1, l.first ? 'ใช่' : 'ไม่', l.got ? 'ใช่' : 'ไม่', l.wrong.join(' / '), (l.ms / 1000).toFixed(1)]);
    const sum = r.scores.map((s, i) => [r.teams > 1 ? TEAM_NAMES[i] : 'รวม', 'ความรู้', s.know, 'การเล่น', s.play, 'ถูก', s.correct, 'ผิด', s.wrong]);
    const csv = '﻿' + [head, ...rows, [], ...sum].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `magic-kingdom-${r.land.id}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  /* ------------------------------ แสดงผล ------------------------------ */
  const g = G.current;
  const q = g?.q;
  const land = g?.land || landById(landId);
  const boss = g?.boss;
  const fx = effects(save.skills, save.pet);
  const touchMode = !camOn;
  const h = typeof window === 'undefined' ? { s: 120 } : hero();
  const casting = sub === 'battle' || sub === 'reveal';

  const missions = [
    { k: 'seen', title: 'ยืนให้กล้องเห็นตัว', hint: 'ถอยให้เห็นตั้งแต่หัวถึงเอว หน้าตรง', icon: Users, done: calib.seen, on: true },
    { k: 'hand', title: 'ยื่นมือออกไป!', hint: 'จะมีวงเวทตามมือ', icon: Hand, done: calib.hand, on: true },
    { k: 'cast', title: 'ร่ายเวทใส่สไลม์ซ้อม', hint: 'เลื่อนวงเวทไปที่สไลม์ ค้างไว้จนวงเต็ม', icon: Wand2, done: calib.cast, on: true },
    { k: 'shield', title: 'ประกบสองมือหน้าอก', hint: 'นี่คือโล่ศิลา กันเวทของบอส', icon: Shield, done: calib.shield, on: mo.shield },
    { k: 'dodgeL', title: 'เอียงตัวไปทางซ้าย', hint: 'เอียงทั้งตัว ไม่ต้องก้าวเท้า', icon: ArrowBigLeft, done: calib.dodgeL, on: mo.dodge },
    { k: 'dodgeR', title: 'เอียงตัวไปทางขวา', hint: 'เอียงทั้งตัว ไม่ต้องก้าวเท้า', icon: ArrowBigRight, done: calib.dodgeR, on: mo.dodge },
    { k: 'charge', title: 'ยกสองมือเหนือหัว', hint: 'ค้างไว้ = ชาร์จพลัง/ฟื้นหัวใจ', icon: Zap, done: calib.charge, on: mo.charge },
    { k: 'spread', title: 'กางแขนออกข้างเป็นตัว T', hint: 'ท่าพายุหมุน (ใช้ได้เมื่อปลดล็อก)', icon: Wind, done: calib.spread, on: mo.spread },
    { k: 'clap', title: 'ปรบมือหนึ่งที', hint: 'สายฟ้าพิเศษ ครั้งละ 1 ทีต่อรอบบอส', icon: Sparkles, done: calib.clap, on: mo.clap },
  ].filter((m) => m.on);
  const curMission = missions.find((m) => !m.done);
  const missionsDone = missions.filter((m) => m.done).length;
  const prevDone = useRef(0);
  useEffect(() => {
    if (phase === 'calib' && missionsDone > prevDone.current) gsfx.levelUp();
    prevDone.current = missionsDone;
  }, [missionsDone, phase]);

  const board = useMemo(() => (g ? g.scores.map((s, i) => ({ i, total: s.know + s.play, know: s.know, play: s.play })) : []), [g, qn, sub, floaters.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const mobLabels =
    phase === 'play' && q && g
      ? g.order.map((cid, i) => {
          const c = q.choices.find((x) => x.id === cid);
          if (!c) return null;
          const st = marks[cid];
          const gone = sub === 'crystal' || sub === 'battle' || sub === 'victory' || sub === 'bossIn' || (sub === 'reveal' && st !== 'answer' && st !== 'got');
          return (
            <div
              key={`${qn}-${cid}`}
              ref={(el) => {
                if (el) labels.current.set(cid, el);
                else labels.current.delete(cid);
              }}
              className="ar-label mk-label"
              data-st={st === 'got' ? 'answer' : st || ''}
              data-gone={gone}
              style={{ ['--ac' as string]: land.mob[i % land.mob.length] }}
              onPointerDown={(e) => {
                e.stopPropagation();
                choose(cid);
              }}
            >
              <span className="ar-label-n">{i + 1}</span>
              {c.media?.kind === 'image' && <img src={c.media.url} alt="" draggable={false} />}
              <MathText value={c.text} />
              {st === 'wrong' && <X className="ar-label-mark" strokeWidth={4} />}
              {(st === 'answer' || st === 'got') && <Check className="ar-label-mark" strokeWidth={4} />}
            </div>
          );
        })
      : null;

  return createPortal(
    <div
      ref={root}
      className={`ar-root mk-root${shake ? ' mk-shake' : ''}`}
      data-cam={camOn}
      data-land={land.id}
      style={{ ['--sky1' as string]: land.sky[0], ['--sky2' as string]: land.sky[1], ['--lc' as string]: land.color }}
      onPointerDown={onPointer}
      onAnimationEnd={(e) => e.target === e.currentTarget && setShake(0)}
    >
      <video ref={video} className="ar-video" playsInline muted aria-hidden="true" />
      <div className="mk-tint" aria-hidden="true" />
      {!camOn && <div className="mk-world" aria-hidden="true"><i /><i /><i /></div>}
      <canvas ref={skel} className="ar-skel" aria-hidden="true" />
      <div ref={stage} className="ar-stage" aria-hidden="true" />

      {mobLabels}

      {[0, 1].map((kx) => (
        <React.Fragment key={kx}>
          <svg ref={(el) => void (rings.current[kx] = el)} className="ar-ring" viewBox="0 0 100 100" style={{ ['--tc' as string]: AURAS[save.look.aura] }} aria-hidden="true">
            <circle cx="50" cy="50" r="46" className="ar-ring-bg" />
            <circle cx="50" cy="50" r="46" className="ar-ring-p" />
          </svg>
          <div ref={(el) => void (reticles.current[kx] = el)} className="ar-reticle mk-reticle" style={{ ['--tc' as string]: AURAS[save.look.aura] }} aria-hidden="true">
            <i />
          </div>
        </React.Fragment>
      ))}

      {/* คริสตัล: แตะได้ในโหมดไม่มีกล้อง */}
      {phase === 'play' && sub === 'crystal' && g &&
        g.crys.map((c) => (
          <button
            key={c.id}
            type="button"
            className="mk-crys-hit"
            ref={(el) => {
              if (el) crysEls.current.set(c.id, el);
              else crysEls.current.delete(c.id);
            }}
            style={{ width: c.r * 2.6, height: c.r * 2.6 }}
            onPointerDown={(e) => {
              e.stopPropagation();
              collectCrystal(c.id);
            }}
            aria-label="เก็บคริสตัล"
          />
        ))}

      {/* สัญญาณเตือนการโจมตีของบอส */}
      {phase === 'play' && sub === 'battle' && g &&
        g.atks.map((a) => (
          <div
            key={a.id}
            ref={(el) => {
              if (el) atkEls.current.set(a.id, el);
              else atkEls.current.delete(a.id);
            }}
            className="mk-warn"
            data-kind={a.kind}
          >
            {a.kind === 'shield' ? <Shield className="w-8 h-8" /> : a.dir < 0 ? <ArrowBigLeft className="w-8 h-8" /> : <ArrowBigRight className="w-8 h-8" />}
            <b>{a.kind === 'shield' ? (touchMode ? 'กดปุ่มโล่!' : 'ประกบมือ ตั้งโล่!') : a.dir < 0 ? 'เอียงซ้าย!' : 'เอียงขวา!'}</b>
            <i />
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
        <span key={f.id} className="ar-float mk-float" data-big={!!f.big} style={{ left: f.x, top: f.y, color: f.color }}>
          {f.text}
        </span>
      ))}

      {/* นักเวท + สัตว์เลี้ยง มุมล่างซ้าย */}
      {(phase === 'play' || phase === 'count' || phase === 'calib') && (
        <div className="mk-hero" style={{ ['--hs' as string]: `${h.s}px` }}>
          <MageArt look={save.look} size={h.s} casting={casting} />
          <span className="mk-hero-pet">
            <PetArt id={save.pet} size={h.s * 0.45} />
          </span>
        </div>
      )}

      {/* ---------------- HUD ---------------- */}
      {(phase === 'play' || phase === 'count') && g && (
        <>
          <div className="mk-scores" data-n={g.teams}>
            {board.map((s) => (
              <div key={s.i} className="mk-score" data-on={g.teams === 1 || g.team === s.i} style={{ ['--tc' as string]: g.teams > 1 ? TEAM_HEX[s.i] : '#ffd23f' }}>
                <small>{g.teams > 1 ? TEAM_NAMES[s.i] : 'คะแนน'}</small>
                <b key={s.total}>{s.total.toLocaleString('th-TH')}</b>
                {g.scores[s.i].streak >= 2 && <em>คอมโบ x{g.scores[s.i].streak}</em>}
              </div>
            ))}
            {g.teams > 1 && (
              <div className="mk-coop" title="ภารกิจทีม">
                <Users className="w-4 h-4" />
                <span>
                  <i style={{ width: `${(g.coop / (g.teams * 2)) * 100}%` }} />
                </span>
              </div>
            )}
          </div>
          <div className="mk-topbtns">
            <button type="button" className="mk-iconbtn" onClick={() => (gsfx.tap(), setPaused(true))} aria-label="พักเกม">
              <Pause className="w-5 h-5" />
            </button>
            <button type="button" className="mk-iconbtn" onClick={() => (gsfx.tap(), loadSets(), setTeacher(true))} aria-label="แผงครู">
              <Settings2 className="w-5 h-5" />
            </button>
          </div>
          {boss && (boss.alive || sub === 'victory') && phase === 'play' && (
            <div className="mk-bosshp" style={{ ['--bc' as string]: boss.def.color }}>
              <Crown className="w-5 h-5" />
              <span>{boss.def.name}</span>
              <div>
                <i ref={bossBar} />
              </div>
              <b>
                {Math.max(0, Math.round(boss.hp))}/{boss.max}
              </b>
            </div>
          )}
          {phase === 'play' && q && (sub === 'ask' || sub === 'enter' || sub === 'reveal') && (
            <div className="mk-q" data-sub={sub} data-boss={!!boss?.alive}>
              <div className="mk-q-top">
                <span>
                  ข้อ {g.qn + 1}
                  {g.style !== 1 && `/${g.total}`}
                </span>
                {g.style !== 1 ? (
                  <span className="mk-q-time" data-urgent={g.lastSec <= 5}>
                    <Timer className="w-4 h-4" /> {Math.max(0, g.lastSec)}
                  </span>
                ) : null}
              </div>
              <div className="mk-q-body">
                {q.media?.kind === 'image' && <img src={q.media.url} alt="" draggable={false} />}
                <MathText value={q.text} />
              </div>
              {g.style !== 1 && (
                <div className="mk-q-bar">
                  <div ref={timeBar} />
                </div>
              )}
            </div>
          )}
          {phase === 'play' && g.style === 1 && (
            <div className="mk-ta">
              <Timer className="w-5 h-5" />
              <b>{Math.max(0, Math.ceil(g.timeLeft))} วิ</b>
              <span>
                <i ref={sub === 'ask' || sub === 'crystal' ? timeBar : undefined} />
              </span>
            </div>
          )}
          {phase === 'play' && sub === 'crystal' && (
            <div className="mk-bonus">
              <Gem className="w-6 h-6" />
              <b>{touchMode ? 'แตะเก็บคริสตัล!' : 'ยื่นมือแตะคริสตัล!'}</b>
            </div>
          )}
          {phase === 'play' && sub === 'battle' && (
            <div className="mk-battle">
              <div className="mk-hearts">
                {[...Array(g.maxHearts)].map((_, i) => (
                  <Heart key={i} className="w-6 h-6" data-on={i < g.hearts} fill={i < g.hearts ? '#ff5a7a' : 'none'} />
                ))}
              </div>
              <div className="mk-bolts">
                <SpellIcon id={g.bolt} color={spellById(g.bolt).color} size={30} />
                <b>x{g.bolts}</b>
              </div>
              {camOn && mo.charge && (
                <div className="mk-charge">
                  <div ref={chargeBar} />
                </div>
              )}
            </div>
          )}
          {phase === 'play' && sub === 'battle' && (
            <div className="mk-pad" data-touch={touchMode}>
              {touchMode ? (
                <>
                  <button type="button" className="mk-padbtn" data-k="cast" disabled={g.bolts <= 0} onClick={() => touchMove('cast')}>
                    <Wand2 className="w-6 h-6" /> ร่ายเวท
                  </button>
                  <button type="button" className="mk-padbtn" onClick={() => touchMove('shield')}>
                    <Shield className="w-6 h-6" /> โล่
                  </button>
                  <button type="button" className="mk-padbtn" onClick={() => touchMove('L')}>
                    <ArrowBigLeft className="w-6 h-6" />
                  </button>
                  <button type="button" className="mk-padbtn" onClick={() => touchMove('R')}>
                    <ArrowBigRight className="w-6 h-6" />
                  </button>
                  {g.open.includes('wind') && (
                    <button type="button" className="mk-padbtn" disabled={g.bolts <= 0} onClick={() => touchMove('wind')}>
                      <Wind className="w-6 h-6" /> พายุ
                    </button>
                  )}
                  {g.open.includes('rainbow') && (
                    <button type="button" className="mk-padbtn" disabled={g.bolts < 2} onClick={() => touchMove('rainbow')}>
                      <Sparkles className="w-6 h-6" /> สายรุ้ง
                    </button>
                  )}
                  <button type="button" className="mk-padbtn" onClick={() => touchMove('charge')}>
                    <Zap className="w-6 h-6" /> {g.open.includes('heal') ? 'ฟื้นพลัง' : 'ชาร์จ'}
                  </button>
                </>
              ) : (
                <ul className="mk-legend">
                  <li><Wand2 className="w-4 h-4" /> ยื่นมือเล็งบอส</li>
                  {mo.shield && <li><Shield className="w-4 h-4" /> ประกบมือ = โล่</li>}
                  {mo.dodge && <li><ArrowBigLeft className="w-4 h-4" /> เอียงตัว = หลบ</li>}
                  {mo.spread && g.open.includes('wind') && <li><Wind className="w-4 h-4" /> กางแขน = พายุ</li>}
                  {g.open.includes('rainbow') && <li><Sparkles className="w-4 h-4" /> สองมือเล็ง = สายรุ้ง</li>}
                  {mo.charge && <li><Zap className="w-4 h-4" /> มือเหนือหัว = {g.open.includes('heal') ? 'ฟื้นพลัง' : 'ชาร์จ'}</li>}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {banner && (phase === 'play' || phase === 'count') && (
        <div className="mk-banner" style={{ ['--bc' as string]: banner.color }}>
          <b>{banner.text}</b>
          {banner.sub && <span>{banner.sub}</span>}
        </div>
      )}
      {phase === 'count' && (
        <div className="mk-count" key={count}>
          {count > 0 ? count : 'ร่ายเวท!'}
        </div>
      )}

      {/* ---------------- จอเริ่ม ---------------- */}
      {(phase === 'setup' || phase === 'loading') && (
        <div className="mk-panel-wrap">
          <div className="mk-panel">
            <div className="mk-title">
              <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
                <path d="M32 4 l7 16 17 2 -13 11 4 17 -15 -9 -15 9 4 -17 -13 -11 17 -2z" fill="#ffd23f" stroke="#2a1d50" strokeWidth="3.5" strokeLinejoin="round" />
              </svg>
              <div>
                <small>เกม AR เล่นในเครื่องเดียว</small>
                <h2>Magic Kingdom AR</h2>
              </div>
            </div>
            <p className="mk-lead">อาณาจักรเวทมนตร์ถูกพลังมืดยึด! ร่ายเวทด้วยร่างกายของหนู ตอบคำถามให้ถูกเพื่อกู้คริสตัลแห่งความรู้</p>
            <ul className="mk-tips">
              <li><Camera className="w-5 h-5" /> ตั้งเครื่องให้กล้องเห็นตัวตั้งแต่หัวถึงเอว ยืนห่างราว 1.5-2 เมตร</li>
              <li><Hand className="w-5 h-5" /> ไม่ต้องกระโดด ยื่นมือ ประกบมือ และเอียงตัวเบาๆ ก็พอ</li>
              <li><ScanFace className="w-5 h-5" /> ภาพกล้องประมวลผลในเครื่องนี้เท่านั้น ไม่บันทึก ไม่ส่งออก</li>
            </ul>
            {camErr && (
              <p className="mk-err">
                {camErr === 'denied' ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง กดอนุญาตที่แถบที่อยู่ หรือเล่นแบบแตะจอ' : camErr === 'insecure' ? 'ต้องเปิดผ่าน https ถึงใช้กล้องได้' : camErr === 'model' ? 'โหลดระบบจับท่าไม่สำเร็จ ลองใหม่หรือเล่นแบบแตะจอ' : 'ไม่พบกล้องในเครื่องนี้ เล่นแบบแตะจอได้'}
              </p>
            )}
            <div className="mk-btns">
              <button type="button" className="mk-btn mk-btn-go" disabled={phase === 'loading'} onClick={startCamera}>
                <Camera className="w-5 h-5" /> {phase === 'loading' ? 'กำลังเปิดกล้อง…' : 'เปิดกล้อง เริ่มเลย'}
              </button>
              <button type="button" className="mk-btn" onClick={startTouch}>
                <Hand className="w-5 h-5" /> เล่นแบบแตะจอ
              </button>
              <button type="button" className="mk-btn mk-btn-ghost" onClick={exit}>
                <LogOut className="w-5 h-5" /> ออก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- ภารกิจฝึก (ตั้งค่ากล้อง) ---------------- */}
      {phase === 'calib' && (
        <div className="mk-calib">
          <div className="mk-calib-card">
            {curMission ? (
              <>
                <span className="mk-calib-ico">
                  <curMission.icon className="w-9 h-9" />
                </span>
                <b>{curMission.title}</b>
                <span>{curMission.hint}</span>
              </>
            ) : (
              <>
                <span className="mk-calib-ico" data-ok="true">
                  <Check className="w-9 h-9" strokeWidth={4} />
                </span>
                <b>พร้อมผจญภัยแล้ว!</b>
                <span>กดไปที่แผนที่อาณาจักร</span>
              </>
            )}
            <ol className="mk-checks">
              {missions.map((m) => (
                <li key={m.k} data-ok={m.done} data-cur={m === curMission}>
                  {m.done ? <Check className="w-4 h-4" strokeWidth={4} /> : <m.icon className="w-4 h-4" />}
                  {m.title}
                </li>
              ))}
            </ol>
            <div className="mk-btns">
              <button type="button" className="mk-btn mk-btn-go" disabled={!!curMission} onClick={() => (gsfx.start(), scene.current?.remove('cal'), setPhase('hub'))}>
                <MapIcon className="w-5 h-5" /> ไปแผนที่อาณาจักร
              </button>
              {curMission && (
                <button
                  type="button"
                  className="mk-btn mk-btn-ghost"
                  onClick={() => {
                    // ครูข้ามได้: กด 2 ครั้ง กันเด็กกดเองโดยไม่ตั้งใจ
                    if (!skipArm) {
                      setSkipArm(true);
                      setTimeout(() => setSkipArm(false), 2500);
                      return;
                    }
                    scene.current?.remove('cal');
                    setPhase('hub');
                  }}
                >
                  {skipArm ? 'กดอีกครั้งเพื่อข้าม' : 'ครู: ข้ามการฝึก'}
                </button>
              )}
              <button type="button" className="mk-btn mk-btn-ghost" onClick={() => (toTouch(), setPhase('hub'))}>
                <Hand className="w-5 h-5" /> ใช้แตะจอแทน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- อาณาจักร: แผนที่ / ตัวละคร / เวท / อัปเกรด ---------------- */}
      {phase === 'hub' && (
        <div className="mk-hub">
          <div className="mk-hub-top">
            <div className="mk-hub-me">
              <MageArt look={save.look} size={54} />
              <div>
                <b>นักเวทฝึกหัด</b>
                <span>
                  <Coins className="w-4 h-4" /> {save.coins.toLocaleString('th-TH')} <BookOpen className="w-4 h-4" /> ความรู้ {save.knowledge}
                </span>
              </div>
            </div>
            <div className="mk-tabs" role="tablist">
              {([
                ['map', 'แผนที่', MapIcon],
                ['hero', 'นักเวท', Wand2],
                ['spells', 'เวทมนตร์', BookOpen],
                ['skills', 'อัปเกรด', Star],
              ] as const).map(([id, name, Icon]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} className="mk-tab" data-on={tab === id} onClick={() => (gsfx.tap(), setTab(id))}>
                  <Icon className="w-4 h-4" /> {name}
                </button>
              ))}
            </div>
            <div className="mk-hub-btns">
              <button type="button" className="mk-iconbtn" onClick={() => (gsfx.tap(), loadSets(), setTeacher(true))} aria-label="แผงครู">
                <Settings2 className="w-5 h-5" />
              </button>
              <button type="button" className="mk-iconbtn" onClick={exit} aria-label="ออก">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {tab === 'map' && (
            <div className="mk-map">
              <div className="mk-lands">
                {LANDS.map((l, i) => {
                  const open = landOpen(save.stars, l.id, save.openAll);
                  const st = save.stars[l.id] || 0;
                  return (
                    <button key={l.id} type="button" className="mk-land" data-on={landId === l.id} data-open={open} disabled={!open} style={{ ['--lc' as string]: l.color, animationDelay: `${i * 0.05}s` }} onClick={() => (gsfx.pick(), setLandId(l.id))}>
                      <LandArt id={l.id} color={l.color} size={86} />
                      <b>{l.name}</b>
                      <small>{l.en}</small>
                      <span className="mk-stars">
                        {[0, 1, 2].map((s) => (
                          <Star key={s} className="w-4 h-4" fill={s < st ? '#ffd23f' : 'none'} />
                        ))}
                      </span>
                      {!open && <LockIcon className="mk-land-lock w-6 h-6" />}
                    </button>
                  );
                })}
              </div>
              <div className="mk-go">
                <div>
                  <b>{land.name}</b>
                  <span>
                    บอส: {magicBoss(settings.boss !== 'auto' ? settings.boss : land.boss).name} · ชุดคำถาม: {save.sets[land.id] ? 'ชุดที่ครูเลือก' : title}
                  </span>
                  {setErr && <span className="mk-err">{setErr}</span>}
                </div>
                <button type="button" className="mk-btn mk-btn-go" onClick={() => beginRun()}>
                  <Play className="w-5 h-5" /> ออกผจญภัย
                </button>
              </div>
            </div>
          )}

          {tab === 'hero' && (
            <div className="mk-shop mk-hero-edit">
              <div className="mk-hero-preview">
                <MageArt look={save.look} size={150} casting />
                <PetArt id={save.pet} size={70} />
              </div>
              <div className="mk-opts">
                <p>นักเวท</p>
                <div className="mk-chips">
                  {['นักเวทชาย', 'นักเวทหญิง'].map((n, i) => (
                    <button key={n} type="button" className="mk-chip" data-on={save.look.g === i} onClick={() => setLook({ g: i as 0 | 1 })}>
                      {n}
                    </button>
                  ))}
                </div>
                <p>ชุดนักเวท</p>
                <div className="mk-chips">
                  {ROBES.map((c, i) => (
                    <button key={c} type="button" className="mk-dot" data-on={save.look.robe === i} style={{ background: c }} onClick={() => setLook({ robe: i })} aria-label={`ชุดสี ${i + 1}`} />
                  ))}
                </div>
                <p>สีผิว</p>
                <div className="mk-chips">
                  {SKINS.map((c, i) => (
                    <button key={c} type="button" className="mk-dot" data-on={save.look.skin === i} style={{ background: c }} onClick={() => setLook({ skin: i })} aria-label={`สีผิว ${i + 1}`} />
                  ))}
                </div>
                <p>หมวก</p>
                <div className="mk-chips">
                  {HATS.map((n, i) => (
                    <button key={n} type="button" className="mk-chip" data-on={save.look.hat === i} onClick={() => setLook({ hat: i })}>
                      {n}
                    </button>
                  ))}
                </div>
                <p>ไม้เท้า</p>
                <div className="mk-chips">
                  {STAVES.map((n, i) => (
                    <button key={n} type="button" className="mk-chip" data-on={save.look.staff === i} onClick={() => setLook({ staff: i })}>
                      {n}
                    </button>
                  ))}
                </div>
                <p>สีพลังเวท</p>
                <div className="mk-chips">
                  {AURAS.map((c, i) => (
                    <button key={c} type="button" className="mk-dot" data-on={save.look.aura === i} style={{ background: c }} onClick={() => setLook({ aura: i })} aria-label={`สีพลัง ${i + 1}`} />
                  ))}
                </div>
                <p>สัตว์เลี้ยงเวทมนตร์</p>
                <div className="mk-pets">
                  {PETS.map((p) => {
                    const own = save.pets.includes(p.id);
                    return (
                      <button key={p.id} type="button" className="mk-pet" data-on={save.pet === p.id} data-own={own} onClick={() => pickPet(p.id)}>
                        <PetArt id={p.id} size={52} />
                        <b>{p.name}</b>
                        <small>{p.bonus}</small>
                        {!own && (
                          <em>
                            <Coins className="w-3.5 h-3.5" /> {p.cost}
                          </em>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'spells' && (
            <div className="mk-shop">
              <p className="mk-note">
                ตอบถูกสะสมความรู้เพื่อปลดล็อกเวทใหม่ {nextSpell(save.knowledge) ? `(อีก ${nextSpell(save.knowledge)!.need - save.knowledge} ความรู้ ได้${nextSpell(save.knowledge)!.name})` : '(ปลดล็อกครบแล้ว!)'}
              </p>
              <div className="mk-spells">
                {SPELLS.map((s) => {
                  const open = save.knowledge >= s.need;
                  const bolt = BOLT_SPELLS.includes(s.id);
                  return (
                    <div key={s.id} className="mk-spell" data-open={open} data-on={save.bolt === s.id} style={{ ['--sc' as string]: s.color }}>
                      <SpellIcon id={s.id} color={s.color} size={46} locked={!open} />
                      <div>
                        <b>
                          {s.name} <small>{s.en}</small>
                        </b>
                        <span>{open ? s.how : `ปลดล็อกที่ความรู้ ${s.need}`}</span>
                      </div>
                      {bolt && open && (
                        <button type="button" className="mk-chip" data-on={save.bolt === s.id} onClick={() => (gsfx.pick(), commit((x) => ({ ...x, bolt: s.id })))}>
                          {save.bolt === s.id ? 'ใส่ไม้เท้าอยู่' : 'ใส่ไม้เท้า'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'skills' && (
            <div className="mk-shop">
              <p className="mk-note">
                ใช้ Magic Coin อัปเกรดนักเวท (มี <Coins className="inline w-4 h-4" /> {save.coins.toLocaleString('th-TH')})
              </p>
              <div className="mk-skills">
                {SKILLS.map((s) => {
                  const lv = save.skills[s.id];
                  const max = lv >= SKILL_MAX;
                  return (
                    <div key={s.id} className="mk-skill" style={{ ['--sc' as string]: s.color }}>
                      <b>{s.name}</b>
                      <span>{s.desc}</span>
                      <div className="mk-pips">
                        {[...Array(SKILL_MAX)].map((_, i) => (
                          <i key={i} data-on={i < lv} />
                        ))}
                      </div>
                      <button type="button" className="mk-btn mk-btn-sm" disabled={max || save.coins < skillCost(lv)} onClick={() => buySkill(s.id)}>
                        {max ? 'เต็มแล้ว' : (
                          <>
                            <Coins className="w-4 h-4" /> {skillCost(lv)}
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="mk-note">
                ตอนนี้: พลังเวท x{fx.power.toFixed(2)} · ลูกเวท {fx.bolts} ลูก/ข้อ · หัวใจ {fx.hearts} · ล็อกเป้า {(fx.dwell / 1000).toFixed(2)} วิ
              </p>
            </div>
          )}
        </div>
      )}

      {/* ---------------- สรุปผล ---------------- */}
      {phase === 'end' && result && (
        <div className="mk-panel-wrap">
          {result.stars > 0 && <Confetti />}
          <div className="mk-panel mk-result">
            <small className="mk-kicker">{result.land.name}</small>
            <h2>{result.stars >= 2 ? 'อาณาจักรสว่างไสวอีกครั้ง!' : result.stars ? 'กู้คริสตัลได้แล้ว!' : 'ฝึกเวทต่ออีกนิดนะ'}</h2>
            <div className="mk-stars mk-stars-big">
              {[0, 1, 2].map((s) => (
                <Star key={s} className="w-10 h-10" fill={s < result.stars ? '#ffd23f' : 'none'} style={{ animationDelay: `${s * 0.25}s` }} />
              ))}
            </div>
            <div className="mk-res-teams">
              {result.scores
                .map((s, i) => ({ s, i }))
                .sort((a, b) => b.s.know + b.s.play - (a.s.know + a.s.play))
                .map(({ s, i }, rank) => (
                  <div key={i} className="mk-res-team" style={{ ['--tc' as string]: result.teams > 1 ? TEAM_HEX[i] : '#ffd23f' }}>
                    <b>
                      {result.teams > 1 && rank === 0 && <Crown className="w-5 h-5" />} {result.teams > 1 ? TEAM_NAMES[i] : 'คะแนนรวม'} {(s.know + s.play).toLocaleString('th-TH')}
                    </b>
                    <span>
                      ความรู้ {s.know} · การเล่น {s.play} · ถูก {s.correct} ผิด {s.wrong} · คริสตัล {s.crystals} · ชาวเมือง {s.rescued}
                    </span>
                  </div>
                ))}
            </div>
            <p className="mk-gain">
              <Coins className="w-5 h-5" /> +{result.coins} เหรียญ <BookOpen className="w-5 h-5" /> ความรู้ +{result.knowGain}
              {result.bossKills > 0 && result.style === 2 && <> · ปราบบอส {result.bossKills} ตัว</>}
            </p>
            {result.newSpells.length > 0 && (
              <div className="mk-newspell">
                {result.newSpells.map((id) => (
                  <span key={id}>
                    <SpellIcon id={id} color={spellById(id).color} size={34} /> ปลดล็อกเวทใหม่: {spellById(id).name}
                  </span>
                ))}
              </div>
            )}
            <details className="mk-analysis">
              <summary>วิเคราะห์รายข้อ (สำหรับครู)</summary>
              <table>
                <thead>
                  <tr>
                    <th>ข้อ</th>
                    <th>คำถาม</th>
                    <th>ผล</th>
                    <th>ตอบผิดเป็น</th>
                  </tr>
                </thead>
                <tbody>
                  {result.log.map((l, i) => (
                    <tr key={i} data-bad={!l.first}>
                      <td>{l.n + 1}</td>
                      <td>{l.text}</td>
                      <td>{l.first ? 'ถูกทันที' : l.got ? 'ถูกหลังลองใหม่' : 'หมดเวลา'}</td>
                      <td>{l.wrong.join(', ') || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
            <div className="mk-btns">
              <button type="button" className="mk-btn mk-btn-go" onClick={() => beginRun(result.land.id)}>
                <Play className="w-5 h-5" /> เล่นอีกครั้ง
              </button>
              <button type="button" className="mk-btn" onClick={toHub}>
                <MapIcon className="w-5 h-5" /> แผนที่อาณาจักร
              </button>
              <button type="button" className="mk-btn" onClick={() => downloadReport(result)}>
                <Download className="w-5 h-5" /> รายงานผล (CSV)
              </button>
              <button type="button" className="mk-btn mk-btn-ghost" onClick={exit}>
                <LogOut className="w-5 h-5" /> ออก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- พัก / ไม่มีคน / กล้องหลุด ---------------- */}
      {phase === 'play' && (paused || away || camLost) && !teacher && (
        <div className="mk-panel-wrap">
          <div className="mk-panel mk-panel-sm">
            <h2>{camLost ? 'กล้องหลุด' : away ? 'นักเวทหายไปไหน?' : 'พักเกม'}</h2>
            <p className="mk-lead">{camLost ? 'เสียบกล้องใหม่หรือเล่นต่อแบบแตะจอ' : away ? 'ยืนหน้ากล้องให้เห็นตัว เกมจะเล่นต่อเอง' : 'พักได้นานเท่าที่ต้องการ'}</p>
            <div className="mk-btns">
              {camLost ? (
                <button type="button" className="mk-btn mk-btn-go" onClick={() => toTouch()}>
                  <Hand className="w-5 h-5" /> เล่นต่อแบบแตะจอ
                </button>
              ) : (
                !away && (
                  <button type="button" className="mk-btn mk-btn-go" onClick={() => (gsfx.tap(), setPaused(false))}>
                    <Play className="w-5 h-5" /> เล่นต่อ
                  </button>
                )
              )}
              <button type="button" className="mk-btn mk-btn-ghost" onClick={toHub}>
                <MapIcon className="w-5 h-5" /> กลับแผนที่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- แผงครู ---------------- */}
      {teacher && (
        <div className="mk-panel-wrap" onPointerDown={(e) => e.stopPropagation()}>
          <div className="mk-panel mk-teacher">
            <div className="mk-teacher-head">
              <h2>
                <Settings2 className="w-6 h-6" /> แผงครู
              </h2>
              <button type="button" className="mk-iconbtn" onClick={() => setTeacher(false)} aria-label="ปิด">
                <X className="w-5 h-5" />
              </button>
            </div>
            {phase === 'play' && (
              <div className="mk-btns">
                <button type="button" className="mk-btn mk-btn-sm" onClick={skipQuestion}>ข้ามข้อนี้</button>
                <button type="button" className="mk-btn mk-btn-sm" onClick={addTime}>เพิ่มเวลา 15 วิ</button>
                <button type="button" className="mk-btn mk-btn-sm" onClick={() => (setTeacher(false), finishRun())}>จบดินแดนนี้ ดูผล</button>
              </div>
            )}
            {phase !== 'play' && (
              <>
                <p className="mk-tlabel">ผู้เล่น (ทีมผลัดกันร่ายเวท 1 กล้อง)</p>
                <div className="mk-chips">
                  {[0, 2, 3, 4].map((n) => (
                    <button key={n} type="button" className="mk-chip" data-on={teams === n} onClick={() => (gsfx.tap(), setTeams(n))}>
                      {n ? `${n} ทีม` : 'เดี่ยว'}
                    </button>
                  ))}
                </div>
                <p className="mk-tlabel">แบบการเล่น</p>
                <div className="mk-chips">
                  {['ผจญภัย', 'แข่งเวลา 2 นาที', 'บอสรัว'].map((n, i) => (
                    <button key={n} type="button" className="mk-chip" data-on={style === i} onClick={() => (gsfx.tap(), setStyle(i))}>
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mk-tlabel">ความยาก</p>
                <div className="mk-chips">
                  {['ง่าย', 'ปกติ', 'ยาก'].map((n, i) => (
                    <button key={n} type="button" className="mk-chip" data-on={level === i} onClick={() => (gsfx.tap(), setLevel(i))}>
                      {n}
                    </button>
                  ))}
                </div>
              </>
            )}
            <p className="mk-tlabel">ท่าที่เปิดใช้</p>
            <div className="mk-chips">
              {MOS.map((m) => (
                <button key={m.id} type="button" className="mk-chip" data-on={mo[m.id]} title={m.how} onClick={() => (gsfx.tap(), setMo((x) => ({ ...x, [m.id]: !x[m.id] })))}>
                  {m.name}
                </button>
              ))}
            </div>
            <p className="mk-tlabel">ความไวการตรวจท่า</p>
            <div className="mk-chips">
              {SENS.map((s, i) => (
                <button key={s.name} type="button" className="mk-chip" data-on={sens === i} onClick={() => (gsfx.tap(), setSens(i))}>
                  {s.name}
                </button>
              ))}
            </div>
            <p className="mk-tlabel">ดินแดน</p>
            <div className="mk-chips">
              <button type="button" className="mk-chip" data-on={save.openAll} onClick={() => (gsfx.tap(), commit((s) => ({ ...s, openAll: !s.openAll })))}>
                {save.openAll ? 'เปิดทุกดินแดนอยู่' : 'เปิดทุกดินแดน'}
              </button>
            </div>
            <p className="mk-tlabel">ชุดคำถามของ {land.name}</p>
            {setsErr ? (
              <p className="mk-note">{setsErr}</p>
            ) : !sets ? (
              <p className="mk-note">กำลังโหลด…</p>
            ) : (
              <select
                className="mk-select"
                value={save.sets[land.id] || ''}
                onChange={(e) => {
                  const v = e.target.value;
                  commit((s) => {
                    const nx = { ...s.sets };
                    if (v) nx[land.id] = v;
                    else delete nx[land.id];
                    return { ...s, sets: nx };
                  });
                }}
              >
                <option value="">ใช้ชุดที่เปิดเกมมา ({title})</option>
                {sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            )}
            <p className="mk-note">คำถามทุกข้อมาจากชุดคำถามของครู (สร้าง/แก้ไขได้ที่หน้าสร้างเกม) ใช้ได้เฉพาะข้อเลือกตอบ 1 คำตอบ</p>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
