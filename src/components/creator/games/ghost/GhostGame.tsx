'use client';

/**
 * Ghost Hunter AR (เล่นในเครื่องเดียว): นักล่าผีฝึกหัดส่องไฟฉายหาผีน่ารัก ไขปริศนา และจับผีด้วยความรู้ + ท่าทางผ่านกล้อง
 * - ใช้แกน AR กลาง (tracker/arPose/quality/gestures) + ฉาก toon ของ magic/scene.ts ผ่าน GHOST_KIT (ghost/scene.ts)
 * - ห้องมืด: ผีที่ถือคำตอบซ่อนอยู่ ไฟฉายตามมือ (เมาส์/แตะจอแทนได้) ส่องโดนผี = ผีปรากฏ แล้วส่องค้างไว้ = ยิงลำแสงจับ
 *   วาดความมืดด้วย canvas 2 มิติ เจาะรูตามไฟฉายและผีที่เจอแล้ว ทุกเฟรม (ไม่ผ่าน React)
 * - ตอบถูกแล้วสลับรอบ: เก็บเบาะแส (กุญแจ หนังสือ รูปภาพ รหัสลับ + หีบสมบัติ) / หนีผีเอียงหลบ
 * - ทุกข้อที่ 3 ไขปริศนาประตู ข้อที่ 2, 5, 8... ช่วยผีใจดีออกจากโถ ผีที่จับได้เก็บเป็นการ์ดสะสม
 * - บอส: มีจุดอ่อนเปิดเป็นช่วง (ยิงตอนนั้น x2) ส่องค้าง = ลำแสง, สองมือเล็ง = เครื่องดูดยักษ์, กางแขน = โล่กันผี,
 *   เอียงตัว = หลบ, ยกมือเหนือหัว = ชาร์จกับดัก, ปรบมือ (ครูเปิด) = คลื่นเสียงทำให้ผีทุกตัวปรากฏ
 * - คะแนนการเล่นต่อข้อสูงสุดน้อยกว่าคะแนนตอบถูกเสมอ (maxPlayFor ทดสอบใน selftest) ภาพกล้องไม่บันทึก/ไม่ส่งออก
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowBigLeft, ArrowBigRight, BookOpen, Camera, Check, Coins, Crown, Download, Flashlight, Hand, Heart, KeyRound, Lock as LockIcon, LogOut, Map as MapIcon, Pause, Play, Radio, ScanFace, Settings2, Shield, Sparkles, Star, Timer, Users, X, Zap } from 'lucide-react';
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
  CLUES_PER, COATS, GEARS, GHOSTS, GHOST_BOSSES, GH_POINTS, GLOWS, HATS, HUNTER_LEVELS, OBSTACLES_PER, PLACES, RARITY, SKILLS, SKILL_MAX, SKINS,
  answerPoints, beamDamage, bossHpFor, bossStart, coinsFor, effects, gearById, ghostBoss, ghostById, ghostFor, hasChest, hunterLevel, lit, nextGear, nextPlace, openGears, pickAtk, placeById, placeOpen, placeStars, roundOf, skillCost, specialOf,
  type AtkKind, type Effects, type GearId, type GhostBoss, type GhostId, type Look, type Place, type SkillId, type Special,
} from '@/lib/game-creator/ghost/data';
import { EMPTY_GHOST, loadGhost, writeGhost, type GhostSave } from '@/lib/game-creator/ghost/save';
import { PoseTracker, type CamError } from '../ar/tracker';
import { CLUE_KINDS, OBSTACLE_KINDS, ghostKind, makeChest, makeClue, makeDoor, makeGhostScene, makeJar, makeObstacle, type GhostScene } from './scene';
import { GearIcon, GhostArt, HunterArt, PlaceArt } from './art';
import '../ar/ar.css';
import '../ar/ar-systems.css';
import '../magic/magic.css';
import './ghost.css';

/* ------------------------------ ค่าคงที่ ------------------------------ */

const ENTER_S = 0.8;
const SWAP_S = 2.4;
const BOSS_IN_S = 2.8;
const REVEAL_S = 1.4;
const CLUE_S = 4.2;
const BATTLE_S = 9;
const VICTORY_S = 3.6;
const TIME_ATTACK_S = 120;
const OBS_GAP = 0.5;
const SONIC_S = 3;
/** จุดอ่อนบอสเปิดทุกกี่วินาที / นานเท่าไร */
const WEAK_EVERY = 3.4;
const WEAK_S = 1.4;
const DRIFT = [0.025, 0.06, 0.11];
const ATK_EVERY = [1.35, 1, 0.8];
const WARN_S = [2.0, 1.6, 1.3];
const GLOW = '#3fe0a0';
type MoId = 'dodge' | 'shield' | 'charge' | 'clap';
const MOS: { id: MoId; name: string; how: string }[] = [
  { id: 'shield', name: 'โล่กันผี', how: 'กางแขนออกข้างเป็นตัว T' },
  { id: 'dodge', name: 'เอียงหลบ/หนีผี', how: 'เอียงตัวซ้าย/ขวา ไม่ต้องก้าว' },
  { id: 'charge', name: 'ชาร์จกับดัก', how: 'ยกสองมือเหนือหัวค้างไว้' },
  { id: 'clap', name: 'ปรบมือ (คลื่นเสียง)', how: 'ปรบมือหนึ่งที' },
];
const DEFAULT_MO: Record<MoId, boolean> = { dodge: true, shield: true, charge: true, clap: false };

type Phase = 'setup' | 'loading' | 'calib' | 'hub' | 'count' | 'play' | 'end';
type Sub = 'enter' | 'bossIn' | 'ask' | 'reveal' | 'clue' | 'escape' | 'battle' | 'victory';
type HubTab = 'map' | 'hero' | 'ghosts' | 'gear' | 'skills';

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
  caught: number;
  clues: number;
  puzzles: number;
  rescued: number;
  dodged: number;
  blocks: number;
}
const emptyScore = (): TeamScore => ({ know: 0, play: 0, correct: 0, wrong: 0, first: 0, streak: 0, best: 0, caught: 0, clues: 0, puzzles: 0, rescued: 0, dodged: 0, blocks: 0 });

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
  /** ไฟฉายส่องเจอแล้ว */
  seen: boolean;
}
interface Item {
  id: string;
  chest: boolean;
  x: number;
  y: number;
  vy: number;
  sway: number;
  r: number;
}
interface Atk {
  id: string;
  kind: AtkKind;
  dir: -1 | 1;
  t: number;
  warn: number;
}
interface BossRT {
  def: GhostBoss;
  hp: number;
  max: number;
  alive: boolean;
  x: number;
  y: number;
  r: number;
  kills: number;
}
interface Game {
  land: Place;
  style: number;
  level: number;
  teams: number;
  members: number;
  list: QuizQuestion[];
  total: number;
  bossFrom: number;
  bossDef: GhostBoss;
  qn: number;
  boss: BossRT | null;
  hearts: number;
  maxHearts: number;
  fx: Effects;
  open: GearId[];
  scores: TeamScore[];
  log: QLog[];
  coop: number;
  timeLeft: number;
  knowGain: number;
  caught: Partial<Record<GhostId, number>>;
  newGhosts: GhostId[];
  chests: number;
  /* ข้อปัจจุบัน */
  q: QuizQuestion | null;
  order: string[];
  kinds: GhostId[];
  mobs: Mob[];
  sub: Sub;
  subT: number;
  subS: number;
  usedMs: number;
  limitMs: number;
  lastSec: number;
  firstTry: boolean;
  got: boolean;
  found: boolean;
  sonicUntil: number;
  team: number;
  member: number;
  special: Special;
  bossQ: boolean;
  wrongPicks: string[];
  items: Item[];
  spawnT: number;
  spawned: number;
  obs: Atk[];
  /* ช่วงสู้บอส */
  bolts: number;
  atkT: number;
  atks: Atk[];
  prevAtk: AtkKind[];
  chargeT: number;
  chargeUsed: boolean;
  sonicUsed: boolean;
  weakT: number;
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
  land: Place;
  style: number;
  scores: TeamScore[];
  teams: number;
  log: QLog[];
  stars: number;
  coins: number;
  knowGain: number;
  newGears: GearId[];
  newGhosts: GhostId[];
  caught: Partial<Record<GhostId, number>>;
  levelUp: number | null;
  bossKills: number;
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
const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export function GhostGame({ questions, settings, title, onExit, persist = true }: { questions: QuizQuestion[]; settings: ArSettings; title: string; onExit: () => void; persist?: boolean }) {
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
  const [seen, setSeen] = useState<Record<string, boolean>>({});
  const [weak, setWeak] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [banner, setBanner] = useState<{ text: string; sub?: string; color: string } | null>(null);
  const [paused, setPaused] = useState(false);
  const [teacher, setTeacher] = useState(false);
  const [away, setAway] = useState(false);
  const [issue, setIssue] = useState<QualityIssue>(null);
  const [calib, setCalib] = useState({ seen: false, hand: false, cast: false, shield: false, dodgeL: false, dodgeR: false, charge: false, clap: false });
  const [skipArm, setSkipArm] = useState(false);
  const [save, setSave] = useState<GhostSave>(EMPTY_GHOST);
  const [landId, setLandId] = useState(PLACES[0].id);
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
  const dark = useRef<HTMLCanvasElement>(null);
  const tracker = useRef<PoseTracker | null>(null);
  const scene = useRef<GhostScene | null>(null);
  const G = useRef<Game | null>(null);
  const labels = useRef(new Map<string, HTMLDivElement>());
  const itemEls = useRef(new Map<string, HTMLButtonElement>());
  const rings = useRef<(SVGSVGElement | null)[]>([null, null]);
  const reticles = useRef<(HTMLDivElement | null)[]>([null, null]);
  const timeBar = useRef<HTMLDivElement>(null);
  const bossBar = useRef<HTMLDivElement>(null);
  const chargeBar = useRef<HTMLDivElement>(null);
  const heroEl = useRef<HTMLDivElement>(null);
  const atkEls = useRef(new Map<string, HTMLDivElement>());
  const hands = useRef<Record<HandSide, HandRT>>({ l: newHand(), r: newHand() });
  /** ไฟฉายจากเมาส์/นิ้ว (โหมดไม่มีกล้อง หรือใช้ร่วมกัน) */
  const pointer = useRef<{ x: number; y: number; at: number } | null>(null);
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
  const weakRef = useRef(false);

  phaseRef.current = phase;
  pausedRef.current = paused || teacher || camLost;
  camRef.current = camOn;
  moRef.current = mo;
  sensRef.current = sens;
  calibRef.current = calib;

  useEffect(() => {
    const s = loadGhost();
    saveRef.current = s;
    setSave(s);
    setLandId(nextPlace(s.stars).id);
  }, []);
  const commit = useCallback(
    (f: (s: GhostSave) => GhostSave) => {
      const s = f(saveRef.current);
      saveRef.current = s;
      setSave(s);
      if (persist) writeGhost(s);
    },
    [persist]
  );

  useEffect(() => {
    setMusic('room', roomTrack(settings.music, 'ghost'));
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
  /** นักล่ามุมล่างซ้าย + ปลายไฟฉาย (ต้นทางลำแสง) */
  const hero = useCallback(() => {
    const { cw, ch } = size();
    const s = Math.max(78, Math.min(150, Math.min(cw, ch) * 0.22));
    return { s, x: 12 + (s * 95) / 120, y: ch - 8 - (s * 140) / 120 + (s * 42) / 120 };
  }, []);

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

  const hasScene = phase !== 'setup' && phase !== 'loading';
  useEffect(() => {
    if (!hasScene || !stage.current) return;
    const sc = makeGhostScene(stage.current, camRef.current);
    scene.current = sc;
    return () => {
      sc.dispose();
      scene.current = null;
    };
  }, [hasScene]);

  const loadSet = useCallback(async (id: string): Promise<QuizQuestion[] | string> => {
    const { data: row, error } = await createClient().from('user_games').select('title, content').eq('id', id).maybeSingle();
    if (error || !row) return 'เปิดชุดคำถามของสถานที่นี้ไม่ได้ ใช้ชุดที่เปิดเกมมาแทน';
    const content = sanitizeQuiz(row.content, mediaPrefix());
    if (!modeFit(content, 'ghost').ok) return 'ชุดของสถานที่นี้มีข้อเลือกตอบไม่พอ ใช้ชุดที่เปิดเกมมาแทน';
    return modeQuiz(content, 'ghost').questions;
  }, []);

  /* ------------------------------ รอบเล่น ------------------------------ */
  const clearScene = useCallback(() => {
    const sc = scene.current;
    const g = G.current;
    if (sc && g) {
      g.order.forEach((cid) => sc.remove(mobId(cid)));
      g.items.forEach((c) => sc.remove(c.id));
      g.atks.forEach((a) => sc.remove(a.id));
      g.obs.forEach((a) => sc.remove(a.id));
    }
    sc?.remove('boss');
    sc?.remove('cage');
    sc?.remove('cal');
  }, []);

  const newBoss = (def: GhostBoss, qs: number, lv: number, kills = 0): BossRT => {
    const { cw, ch } = size();
    const hp = bossHpFor(def, qs, lv);
    return { def, hp, max: hp, alive: true, x: cw * 0.8, y: -ch * 0.2, r: 10, kills };
  };

  const beginRun = useCallback(
    async (lid?: string) => {
      const land = placeById(lid || landId);
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
      const open = openGears(sv.knowledge);
      const fx = effects(sv.skills, open);
      const n = settings.count > 0 ? Math.min(settings.count, src.length) : src.length;
      const list = shuffle(src).slice(0, n);
      const tm = Math.max(1, teams);
      const bossDef = settings.boss !== 'auto' ? ghostBoss(settings.boss) : ghostBoss(land.boss);
      const bossFrom = style === 0 ? bossStart(list.length) : style === 2 ? 0 : 1e9;
      const g: Game = {
        land, style, level, teams: tm, members: Math.max(1, settings.members), list, total: list.length, bossFrom, bossDef, qn: 0,
        boss: style === 2 ? newBoss(bossDef, Math.min(3, list.length), level) : null,
        hearts: fx.hearts, maxHearts: fx.hearts, fx, open,
        scores: [...Array(tm)].map(emptyScore), log: [], coop: 0, timeLeft: TIME_ATTACK_S, knowGain: 0, caught: {}, newGhosts: [], chests: 0,
        q: null, order: [], kinds: [], mobs: [], sub: 'enter', subT: 0, subS: ENTER_S, usedMs: 0, limitMs: 20000, lastSec: -1, firstTry: true, got: false, found: false, sonicUntil: 0, team: 0, member: 0, special: null, bossQ: false, wrongPicks: [],
        items: [], spawnT: 0, spawned: 0, obs: [],
        bolts: 0, atkT: 0, atks: [], prevAtk: [], chargeT: 0, chargeUsed: false, sonicUsed: false, weakT: 0, lastCast: 0, bothT: 0, finalStrike: false,
      };
      if (g.boss) scene.current?.boss('boss', g.boss.def.id);
      for (const h of HANDS) hands.current[h] = newHand(fx.dwell);
      G.current = g;
      setResult(null);
      setMarks({});
      setSeen({});
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
      let bossIntro = false;
      if (g.style === 0 && n === g.bossFrom && !g.boss) {
        g.boss = newBoss(g.bossDef, g.total - g.bossFrom, g.level);
        sc?.boss('boss', g.bossDef.id);
        bossIntro = true;
      }
      g.bossQ = !!g.boss?.alive && (g.style === 2 || n >= g.bossFrom);
      g.special = g.style !== 2 && !g.bossQ ? specialOf(n) : null;
      // ผีถือคำตอบ: ตัวที่ถือคำตอบถูกคือผีที่จะจับเข้าการ์ด
      const correctIdx = g.order.findIndex((cid) => q.choices.find((c) => c.id === cid)?.correct);
      const target = ghostFor(g.land, n + g.land.ghosts.length * Math.floor(Math.random() * 3));
      g.kinds = g.order.map((_, i) => (i === correctIdx ? target : g.land.ghosts[(i + n) % g.land.ghosts.length] === 'king' ? 'baby' : g.land.ghosts[(i + n) % g.land.ghosts.length]));
      g.mobs = g.order.map((cid, i) => ({ cid, i, x: 0, y: 0, r: 40, alive: true, seen: false }));
      g.order.forEach((cid, i) => sc?.mob(mobId(cid), ghostById(g.kinds[i]).color, ghostKind(g.kinds[i])));
      if (g.special === 'puzzle') sc?.item('cage', makeDoor());
      if (g.special === 'rescue') sc?.item('cage', makeJar('#9ff0d0'));
      g.firstTry = true;
      g.got = false;
      g.found = false;
      g.sonicUntil = 0;
      g.wrongPicks = [];
      g.usedMs = 0;
      g.lastSec = -1;
      g.limitMs = g.style === 1 ? 1e9 : (settings.time || Math.max(20, q.time || 0)) * 1000;
      g.items = [];
      g.obs = [];
      for (const h of HANDS) {
        hands.current[h].dwell.reset();
        hands.current[h].hit.reset();
      }
      const swap = g.teams > 1 && (n === 0 || g.team !== prevTeam);
      if (swap) {
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
      setSeen({});
      if (bossIntro) {
        setBanner({ text: `${g.bossDef.name} ปรากฏตัว!`, sub: 'ตอบถูกเพื่อชาร์จลำแสง แล้วยิงตอนจุดอ่อนเปิด', color: g.bossDef.color });
        gsfx.siren();
      } else if (swap) {
        setBanner({ text: `ตาของ${TEAM_NAMES[g.team]}`, sub: g.members > 1 ? `นักล่าคนที่ ${g.member + 1} ออกมายืนหน้ากล้อง` : 'ยืนหน้ากล้องให้เห็นตัว', color: TEAM_HEX[g.team] });
        gsfx.whoosh();
      } else if (g.special === 'puzzle') {
        setBanner({ text: 'ประตูปริศนา!', sub: 'ตอบถูกเพื่อไขรหัสเปิดประตู', color: '#ffc53a' });
      } else if (g.special === 'rescue') {
        setBanner({ text: 'ผีใจดีติดอยู่ในโถ!', sub: 'ตอบถูกเพื่อช่วยให้กลับบ้านอย่างสงบ', color: '#9ff0d0' });
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
    const stars = placeStars(firstAll, answered);
    const total = g.scores.reduce((a, s) => a + s.know + s.play, 0);
    const coins = coinsFor(total, stars);
    const k0 = saveRef.current.knowledge;
    const before = new Set(openGears(k0));
    const after = openGears(k0 + g.knowGain);
    const lv0 = hunterLevel(k0);
    const lv1 = hunterLevel(k0 + g.knowGain);
    const r: RunResult = {
      land: g.land, style: g.style, scores: g.scores, teams: g.teams, log: g.log, stars, coins, knowGain: g.knowGain,
      newGears: after.filter((s) => !before.has(s)), newGhosts: g.newGhosts, caught: g.caught, levelUp: lv1 > lv0 ? lv1 : null, bossKills: g.boss?.kills || 0, title,
    };
    commit((s) => {
      const caught = { ...s.caught };
      for (const [k, n] of Object.entries(g.caught)) caught[k as GhostId] = (caught[k as GhostId] || 0) + (n || 0);
      return {
        ...s,
        coins: s.coins + coins,
        knowledge: s.knowledge + g.knowGain,
        stars: { ...s.stars, [g.land.id]: Math.max(s.stars[g.land.id] || 0, stars) },
        caught,
        puzzles: s.puzzles + g.scores.reduce((a, x) => a + x.puzzles, 0),
        rescued: s.rescued + g.scores.reduce((a, x) => a + x.rescued, 0),
      };
    });
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
      if (g.boss?.alive && g.style === 0) {
        g.finalStrike = true;
        g.order.forEach((cid) => scene.current?.remove(mobId(cid)));
        scene.current?.burst(g.boss.x, g.boss.y, GLOW, 2.4);
        g.boss.hp = 0;
        g.boss.alive = false;
        g.sub = 'victory';
        g.subT = 0;
        setSub('victory');
        setBanner({ text: 'พลังแห่งความรู้จับบอสได้!', sub: `${g.boss.def.name} ยอมกลับบ้านแล้ว`, color: GLOW });
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

  const coopTick = () => {
    const g = G.current;
    if (!g || g.teams < 2) return;
    g.coop++;
    if (g.coop >= g.teams * 3) {
      g.coop = 0;
      g.scores.forEach((s) => (s.play += GH_POINTS.team));
      const { cw, ch } = size();
      float(cw / 2, ch * 0.4, `ภารกิจทีมสำเร็จ! ทุกทีม +${GH_POINTS.team}`, '#ffd23f', true);
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
        g.knowGain += 1;
        // ลำแสงดูดผีเข้าเครื่อง แล้วเก็บเป็นการ์ด
        sc?.beam(h.x, h.y, mob.x, mob.y, [GLOW, '#9ff0d0', '#e8fff6']);
        setTimeout(() => scene.current?.collect(mobId(cid), hero().x, hero().y), 250);
        const kind = g.kinds[mob.i];
        g.caught[kind] = (g.caught[kind] || 0) + 1;
        s.caught++;
        if (!saveRef.current.caught[kind] && !g.newGhosts.includes(kind)) g.newGhosts.push(kind);
        mob.alive = false;
        g.mobs.forEach((m) => {
          if (m.alive) {
            m.alive = false;
            sc?.flyAway(mobId(m.cid));
          }
        });
        float(mob.x, mob.y - mob.r, `+${pts}`, '#ffe38a', true);
        float(mob.x, mob.y + mob.r * 0.6, `จับ${ghostById(kind).name}ได้!`, ghostById(kind).color);
        if (s.streak >= 2) float(mob.x, mob.y + mob.r * 1.2, `คอมโบ x${s.streak}`, '#ff8fc7');
        gsfx.cast();
        gsfx.correct();
        if (s.streak >= 3) gsfx.streak();
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
        setTimeout(() => scene.current?.flyAway(mobId(cid)), 500);
        gsfx.wrong();
        float(mob.x, mob.y - mob.r, 'ผีหัวเราะคิก ลองอีกที!', '#ffb3c6');
        const mk: Record<string, 'wrong'> = { [cid]: 'wrong' };
        const wrongLeft = g.mobs.filter((m) => m.alive && !g.q!.choices.find((c) => c.id === m.cid)?.correct);
        if (g.wrongPicks.length >= 2 && wrongLeft.length) {
          const x = wrongLeft[0];
          x.alive = false;
          mk[x.cid] = 'wrong';
          sc?.flyAway(mobId(x.cid));
          float(x.x, x.y, 'คำใบ้: ผีตัวลวงหนีไปแล้ว', '#bff3ff');
        }
        setMarks((m) => ({ ...m, ...mk }));
      }
    },
    [float, hero]
  );

  /* ------------------------------ ช่วงสู้บอส ------------------------------ */
  const isWeak = () => {
    const g = G.current;
    return !!g && g.sub === 'battle' && g.weakT % WEAK_EVERY > WEAK_EVERY - WEAK_S;
  };
  const hitBoss = useCallback(
    (gear: GearId, from?: { x: number; y: number }) => {
      const g = G.current;
      const sc = scene.current;
      const b = g?.boss;
      if (!g || !b?.alive || g.sub !== 'battle') return false;
      const s = g.scores[g.team];
      const wk = isWeak();
      const dmg = beamDamage(gear, g.fx.power, s.streak, wk);
      const h = from || hero();
      if (gear === 'vacuum') sc?.beam(h.x, h.y, b.x, b.y, ['#ff6b9a', GLOW, '#ffe38a', '#e8fff6']);
      else if (gear === 'sonic') sc?.tornado(b.x, b.y);
      else sc?.beam(h.x, h.y, b.x, b.y, [GLOW, '#e8fff6']);
      b.hp = Math.max(0, b.hp - dmg);
      g.lastCast = g.subT;
      sc?.pulse('boss', wk ? 0.45 : 0.3);
      addPlay(GH_POINTS.hit, b.x + (Math.random() - 0.5) * b.r, b.y - b.r * 0.6, wk ? `จุดอ่อน! -${dmg}` : `-${dmg} HP`, wk ? '#ffe94d' : gearById(gear).color);
      gsfx.cast();
      if (wk || gear === 'vacuum') gsfx.boom();
      if (b.hp <= 0) {
        b.alive = false;
        b.kills++;
        g.atks.forEach((a) => sc?.remove(a.id));
        g.atks = [];
        g.sub = 'victory';
        g.subT = 0;
        setSub('victory');
        addPlay(GH_POINTS.boss);
        sc?.burst(b.x, b.y, b.def.color, 2.2);
        setBanner({ text: `จับ${b.def.name}ได้แล้ว!`, sub: `+${GH_POINTS.boss} คะแนน เมืองกลับมาสงบแล้ว`, color: b.def.color });
        gsfx.fanfare();
      }
      bump();
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bump, hero]
  );
  const castBolt = useCallback(
    (from?: { x: number; y: number }) => {
      const g = G.current;
      if (!g || g.sub !== 'battle' || g.bolts <= 0) return;
      if (hitBoss('beam', from)) g.bolts--;
    },
    [hitBoss]
  );
  const castVacuum = useCallback(() => {
    const g = G.current;
    if (!g || g.sub !== 'battle' || g.bolts < 2 || !g.open.includes('vacuum')) return;
    if (hitBoss('vacuum')) g.bolts -= 2;
  }, [hitBoss]);
  const castCharge = useCallback(() => {
    const g = G.current;
    if (!g || g.sub !== 'battle' || g.chargeUsed) return;
    const h = hero();
    g.chargeUsed = true;
    if (g.open.includes('trap')) {
      g.bolts++;
      float(h.x, h.y - 50, 'ชาร์จกับดัก ลำแสง +1', '#ff8fc7', true);
    } else if (g.hearts < g.maxHearts) {
      g.hearts++;
      float(h.x, h.y - 50, 'เติมแบตเตอรี่ หัวใจ +1', '#ffe38a', true);
    } else {
      g.bolts++;
      float(h.x, h.y - 50, 'ชาร์จพลัง ลำแสง +1', '#ffe38a', true);
    }
    gsfx.charge();
    bump();
  }, [bump, float, hero]);
  /** ปรบมือ: ช่วงตอบ = ผีทุกตัวปรากฏ / ช่วงบอส = คลื่นเสียง 1 ครั้ง */
  const castSonic = useCallback(() => {
    const g = G.current;
    if (!g || !g.open.includes('sonic')) return;
    if (g.sub === 'ask' && !g.sonicUntil) {
      g.sonicUntil = T.current + SONIC_S;
      g.mobs.forEach((m) => (m.seen = true));
      setSeen(Object.fromEntries(g.mobs.map((m) => [m.cid, true])));
      const { cw, ch } = size();
      float(cw / 2, ch * 0.3, 'คลื่นเสียง! ผีทุกตัวปรากฏ', '#ffb347', true);
      gsfx.whoosh();
    } else if (g.sub === 'battle' && !g.sonicUsed) {
      // คลื่นเสียงใส่บอสได้ 1 ครั้งต่อรอบบอส
      g.sonicUsed = true;
      hitBoss('sonic');
    }
  }, [float, hitBoss]);

  const currentLean = () => {
    const tc = touch.current;
    return tc.leanUntil > performance.now() ? tc.lean : camRef.current ? body.current.gest.lean : 0;
  };

  const resolveAtk = useCallback(
    (a: Atk) => {
      const g = G.current;
      const sc = scene.current;
      if (!g) return;
      sc?.remove(a.id);
      // โล่กันผี = กางแขนเป็นตัว T
      const shield = touch.current.shieldUntil > performance.now() || (camRef.current && body.current.spread.active);
      const { cw, ch } = size();
      const ok = a.kind === 'shield' ? shield : currentLean() === a.dir;
      const s = g.scores[g.team];
      if (ok) {
        s.blocks++;
        addPlay(GH_POINTS.block, cw / 2, ch * 0.62, a.kind === 'shield' ? 'โล่กันผีกันได้!' : 'หลบได้!', '#9ff0d0');
        sc?.burst(cw / 2, ch * 0.7, a.kind === 'shield' ? '#b9a3ff' : '#9ff0d0', 0.8);
        gsfx.lock();
      } else {
        g.hearts = Math.max(0, g.hearts - 1);
        setShake((n) => n + 1);
        gsfx.hurt();
        float(cw / 2, ch * 0.62, 'โดนผีจั๊กจี้!', '#ff8fa3', true);
        if (g.hearts <= 0) {
          g.hearts = g.maxHearts;
          s.streak = 0;
          float(cw / 2, ch * 0.5, 'พักหายใจ! หัวใจเต็มแล้ว ลุยต่อ', '#ffd23f', true);
        }
      }
      bump();
    },
    [bump]
  );
  const resolveObs = useCallback(
    (a: Atk) => {
      const g = G.current;
      if (!g) return;
      scene.current?.flyAway(a.id);
      const { cw, ch } = size();
      if (currentLean() === a.dir) {
        g.scores[g.team].dodged++;
        addPlay(GH_POINTS.dodge, cw / 2, ch * 0.6, `หลบทัน! +${GH_POINTS.dodge}`, '#9ff0d0');
        gsfx.lock();
      } else {
        float(cw / 2, ch * 0.6, 'แบร่! ผีแค่แกล้ง ไม่เป็นไร', '#ffb3c6');
        gsfx.wrong();
      }
      bump();
    },
    [bump, float]
  );

  const touchMove = useCallback(
    (m: 'L' | 'R' | 'shield' | 'charge' | 'vacuum' | 'sonic' | 'cast') => {
      const now = performance.now();
      const tc = touch.current;
      if (m === 'L' || m === 'R') {
        tc.lean = m === 'L' ? -1 : 1;
        tc.leanUntil = now + 900;
        gsfx.whoosh();
      } else if (m === 'shield') {
        tc.shieldUntil = now + 1200;
        gsfx.tap();
      } else if (m === 'charge') castCharge();
      else if (m === 'vacuum') castVacuum();
      else if (m === 'sonic') castSonic();
      else castBolt();
    },
    [castBolt, castCharge, castVacuum, castSonic]
  );

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

      /* ---- โครงร่าง ---- */
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
          g2.strokeStyle = bd.spread.active ? '#b9a3ff' : g && g.teams > 1 ? TEAM_HEX[g.team] : GLOWS[saveRef.current.look.glow];
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
          g2.globalAlpha = 1;
        }
      }

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
      if (heroEl.current) heroEl.current.style.setProperty('--lean', String(currentLean()));

      /* ---- จุดไฟฉาย: มือ (กล้อง) + เมาส์/นิ้ว ---- */
      const minSide = Math.min(cw, ch);
      const lr = minSide * (g?.fx.light ?? 0.14);
      const lights: { x: number; y: number }[] = [];
      for (const h of HANDS) {
        const a = aimOf(hs[h]);
        if (a) lights.push(a);
      }
      const pt = pointer.current;
      if (pt && now - pt.at < 4000) lights.push(pt);

      /* ---- ภารกิจฝึก ---- */
      if (ph === 'calib') {
        const c = calibRef.current;
        const nx = { ...c };
        nx.seen = c.seen || (!!bd.b && now - bd.seenSince > 700);
        nx.hand = c.hand || HANDS.some((h) => !!aimOf(hs[h]));
        if (!c.cast && sc) {
          if (!sc.has('cal')) sc.mob('cal', '#eef2ff', 0);
          const r = Math.max(42, minSide * 0.1);
          const p = { x: cw / 2, y: ch * 0.36, r };
          sc.place('cal', p.x, p.y, r, t);
          if (HANDS.map((h) => hs[h].dwell.update(aimOf(hs[h]), [{ id: 'cal', ...p }], dt * 1000)).some(Boolean)) {
            nx.cast = true;
            const h = hero();
            sc.beam(h.x, h.y, p.x, p.y, [GLOW, '#e8fff6']);
            setTimeout(() => scene.current?.collect('cal', hero().x, hero().y), 250);
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
          if (e === 'spread') nx.shield = true;
          if (e === 'dodgeL') nx.dodgeL = true;
          if (e === 'dodgeR') nx.dodgeR = true;
          if (e === 'charge') nx.charge = true;
          if (e === 'clap') nx.clap = true;
        }
        if (Object.keys(nx).some((kk) => nx[kk as keyof typeof nx] !== c[kk as keyof typeof c])) setCalib(nx);
      }

      /* ---- เกม ---- */
      if (ph === 'play' && g) {
        if (!frozen) g.subT += dt;
        const b = g.boss;
        const battle = g.sub === 'battle';
        for (const e of events) if (e === 'clap' && M.clap && !frozen) castSonic();
        if (battle && !frozen) {
          if (camRef.current && M.charge && bd.gest.charge) {
            g.chargeT += dt;
            if (g.chargeT >= 1) {
              g.chargeT = 0;
              castCharge();
            }
          } else g.chargeT = Math.max(0, g.chargeT - dt * 2);
          g.weakT += dt;
          const wk = isWeak();
          if (wk !== weakRef.current) setWeak((weakRef.current = wk));
        } else if (weakRef.current) setWeak((weakRef.current = false));
        if (chargeBar.current) chargeBar.current.style.transform = `scaleX(${Math.min(1, g.chargeT)})`;

        if ((g.sub === 'enter' || g.sub === 'bossIn') && g.subT >= g.subS) {
          g.sub = 'ask';
          g.subT = 0;
          setSub('ask');
          if (!g.special) setBanner(null);
        }
        if (g.style === 1 && !frozen && (g.sub === 'ask' || g.sub === 'clue' || g.sub === 'escape')) {
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
              gsfx.timeout();
              const s = g.scores[g.team];
              s.streak = 0;
              const ans = g.q.choices.find((c) => c.correct)?.id;
              g.mobs.forEach((m) => {
                if (m.alive && m.cid !== ans) sc?.flyAway(mobId(m.cid));
                m.alive = false;
                m.seen = true;
              });
              setSeen(Object.fromEntries(g.mobs.map((m) => [m.cid, true])));
              if (ans) setMarks((m) => ({ ...m, [ans]: 'answer' }));
              g.log.push({ n: g.qn, text: richToPlain(g.q.text, 140), team: g.team, member: g.member, first: false, got: false, wrong: g.wrongPicks.slice(), ms: Math.round(g.usedMs) });
              g.sub = 'reveal';
              g.subT = 0;
              setSub('reveal');
            }
          }
          // ไฟฉายส่องโดนผี = ปรากฏ (ค้างไว้ตลอดข้อ)
          let newly = false;
          for (const m of g.mobs) {
            if (m.seen || !m.alive) continue;
            if (lights.some((l) => lit(l.x, l.y, lr, m.x, m.y, m.r))) {
              m.seen = true;
              newly = true;
              sc?.pulse(mobId(m.cid), 0.35);
              if (!g.found) {
                g.found = true;
                addPlay(GH_POINTS.found, m.x, m.y - m.r * 1.3, `เจอผีแล้ว! +${GH_POINTS.found}`, '#e8fff6');
              }
              gsfx.sparkleish();
            }
          }
          if (newly) setSeen(Object.fromEntries(g.mobs.map((m) => [m.cid, m.seen])));
          // ส่องค้างที่ผีที่เจอแล้ว = ยิงลำแสงจับ
          const targets: DwellTarget[] = g.mobs.filter((m) => m.alive && m.seen).map((m) => ({ id: m.cid, x: m.x, y: m.y, r: m.r * 1.15 }));
          for (const h of HANDS) {
            const f = hs[h].dwell.update(aimOf(hs[h]), targets, dt * 1000);
            if (f) choose(f);
          }
        } else if (g.sub === 'reveal' && g.subT >= REVEAL_S) {
          const ans = g.q?.choices.find((c) => c.correct)?.id;
          if (ans && !g.got) sc?.flyAway(mobId(ans));
          if (g.got && g.special) {
            sc?.openCage('cage');
            const s = g.scores[g.team];
            if (g.special === 'puzzle') {
              s.puzzles++;
              addPlay(GH_POINTS.puzzle, cw * 0.14, ch * 0.42, `ไขปริศนาสำเร็จ! +${GH_POINTS.puzzle}`, '#ffc53a');
            } else {
              s.rescued++;
              addPlay(GH_POINTS.rescue, cw * 0.14, ch * 0.42, `ผีใจดีกลับบ้านแล้ว +${GH_POINTS.rescue}`, '#9ff0d0');
            }
            gsfx.door();
          }
          if (g.got && g.bossQ && b?.alive) {
            g.sub = 'battle';
            g.subT = 0;
            g.bolts = g.fx.bolts + (g.scores[g.team].streak >= 3 ? 1 : 0);
            g.atkT = 1.4;
            g.chargeUsed = g.sonicUsed = false;
            g.lastCast = 0;
            g.bothT = 0;
            g.weakT = WEAK_EVERY - WEAK_S - 0.8;
            for (const h of HANDS) hs[h].hit.reset();
            setSub('battle');
            setBanner({ text: 'ยิงลำแสงจับบอส!', sub: camRef.current ? 'รอจุดอ่อนเรืองแสง แล้วยื่นมือเล็งค้างไว้' : 'แตะบอสหรือปุ่มลำแสง ตอนจุดอ่อนเปิด = แรงสองเท่า', color: b.def.color });
            setTimeout(() => setBanner((x) => (x?.text === 'ยิงลำแสงจับบอส!' ? null : x)), 1600);
            gsfx.levelUp();
          } else if (g.got) {
            const round = roundOf(g.qn) === 'escape' && (M.dodge || !camRef.current) ? 'escape' : 'clue';
            g.sub = round;
            g.subT = 0;
            g.spawnT = round === 'escape' ? 1.2 : 0;
            g.spawned = 0;
            setSub(round);
            if (round === 'escape') {
              setBanner({ text: 'ผีแกล้งไล่ตาม!', sub: camRef.current ? 'เอียงตัวไปทางลูกศร' : 'กดลูกศรซ้าย/ขวา', color: '#b9a3ff' });
              setTimeout(() => setBanner((x) => (x?.text === 'ผีแกล้งไล่ตาม!' ? null : x)), 1300);
            }
            gsfx.sparkleish();
          } else nextQuestion();
        } else if (g.sub === 'clue') {
          const dur = g.style === 1 ? 2.8 : CLUE_S;
          const chest = hasChest(g.qn);
          if (!frozen && g.subT < dur - 1.2 && g.spawned < CLUES_PER) {
            g.spawnT -= dt;
            if (g.spawnT <= 0) {
              g.spawnT = 0.7;
              const isChest = chest && g.spawned === CLUES_PER - 1;
              g.spawned++;
              const id = `c${Math.random().toString(36).slice(2, 8)}`;
              g.items.push({ id, chest: isChest, x: cw * (0.18 + Math.random() * 0.64), y: ch * 0.04, vy: ch * (0.12 + Math.random() * 0.06), sway: Math.random() * 6, r: Math.max(26, minSide * (isChest ? 0.07 : 0.055)) });
              sc?.item(id, isChest ? makeChest() : makeClue(CLUE_KINDS[Math.floor(Math.random() * CLUE_KINDS.length)]));
              bump();
            }
          }
          for (const c of g.items.slice()) {
            if (!frozen) c.y += c.vy * dt;
            const x = c.x + Math.sin(t * 1.6 + c.sway) * 20;
            const hit = HANDS.some((h) => {
              const a = aimOf(hs[h]);
              return a && Math.hypot(a.x - x, a.y - c.y) < c.r * 1.5;
            });
            if (hit) collectItem(c.id);
            else if (c.y > ch * 0.96) {
              sc?.remove(c.id);
              g.items = g.items.filter((x2) => x2.id !== c.id);
              bump();
            } else sc?.place(c.id, x, c.y, c.r, t);
            const el = itemEls.current.get(c.id);
            if (el) el.style.transform = `translate(${x - c.r * 1.3}px, ${c.y - c.r * 1.3}px)`;
          }
          if (g.subT >= dur) {
            g.items.forEach((c) => sc?.remove(c.id));
            g.items = [];
            nextQuestion();
          }
        } else if (g.sub === 'escape') {
          if (!frozen && g.spawned < OBSTACLES_PER && !g.obs.length) {
            g.spawnT -= dt;
            if (g.spawnT <= 0) {
              g.spawnT = OBS_GAP;
              g.spawned++;
              const id = `o${Math.random().toString(36).slice(2, 7)}`;
              g.obs.push({ id, kind: 'dodge', dir: Math.random() < 0.5 ? -1 : 1, t: 0, warn: WARN_S[g.level] ?? 1.6 });
              sc?.item(id, makeObstacle(OBSTACLE_KINDS[Math.floor(Math.random() * OBSTACLE_KINDS.length)]));
              gsfx.whoosh();
              bump();
            }
          }
          for (const a of g.obs.slice()) {
            if (!frozen) a.t += dt;
            const kk = Math.min(1, a.t / a.warn);
            const tx = cw / 2 - a.dir * cw * 0.2;
            sc?.place(a.id, cw / 2 + (tx - cw / 2) * kk, ch * 0.12 + (ch * 0.7 - ch * 0.12) * kk, minSide * (0.035 + kk * 0.06), t);
            const el = atkEls.current.get(a.id);
            if (el) el.style.setProperty('--k', String(kk));
            if (a.t >= a.warn) {
              g.obs = g.obs.filter((x) => x.id !== a.id);
              resolveObs(a);
            }
          }
          if (g.spawned >= OBSTACLES_PER && !g.obs.length && g.subT > 0.6) {
            setBanner(null);
            nextQuestion();
          }
        } else if (battle && b) {
          if (g.subT >= BATTLE_S || (g.bolts <= 0 && !g.atks.length && g.subT - g.lastCast > 1.2 && g.subT > 2)) {
            g.atks.forEach((a) => sc?.remove(a.id));
            g.atks = [];
            setBanner(null);
            nextQuestion();
          } else if (!frozen) {
            const target = [{ id: 'boss', x: b.x, y: b.y, r: b.r * 1.1 }];
            const on = HANDS.filter((h) => {
              const a = aimOf(hs[h]);
              return a && Math.hypot(a.x - b.x, a.y - b.y) < b.r * 1.1;
            });
            if (on.length === 2 && g.open.includes('vacuum') && g.bolts >= 2) {
              g.bothT += dt;
              for (const h of HANDS) hs[h].hit.reset();
              if (g.bothT >= 0.6) {
                g.bothT = 0;
                castVacuum();
              }
            } else {
              g.bothT = 0;
              for (const h of HANDS) {
                const a = aimOf(hs[h]);
                if (g.bolts > 0 && hs[h].hit.update(a, target, dt * 1000)) castBolt();
              }
            }
            g.atkT -= dt;
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
              const tx = a.kind === 'dodge' ? cw / 2 - a.dir * cw * 0.18 : cw / 2;
              sc?.place(a.id, b.x + (tx - b.x) * kk, b.y + (ch * 0.72 - b.y) * kk, minSide * (0.03 + kk * 0.05), t);
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
            addPlay(GH_POINTS.boss / 2);
            finishRun();
          } else if (g.style === 2 && g.qn + 1 < g.total && b) {
            const i = GHOST_BOSSES.findIndex((x) => x.id === b.def.id);
            const nd = GHOST_BOSSES[(i + 1) % GHOST_BOSSES.length];
            g.boss = newBoss(nd, Math.min(3, g.total - g.qn - 1), g.level, b.kills);
            g.bossDef = nd;
            sc?.boss('boss', nd.id);
            setBanner({ text: `${nd.name} ปรากฏตัว!`, color: nd.color });
            setTimeout(() => setBanner(null), 1800);
            nextQuestion();
          } else nextQuestion();
        }

        /* ---- วางผีตามขนาดจอ (ลอยไปมาตามความยาก) ---- */
        const n = g.mobs.length;
        const cols = n <= 3 ? n : n === 4 ? 2 : 3;
        const rows = Math.ceil(n / cols);
        const top = ch * (g.bossQ ? 0.4 : 0.34);
        const bottom = ch * 0.74;
        const left = g.special ? cw * 0.24 : cw * 0.08;
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
          if (el) el.style.transform = `translate(${cx}px, ${cy + r * 1.15}px) translate(-50%, 0)`;
        });
        if (g.special) sc?.place('cage', cw * 0.12, ch * 0.56, minSide * 0.09, t);
        if (b && (b.alive || g.sub === 'victory')) {
          const big = battle || g.sub === 'victory' || g.sub === 'bossIn';
          const tx = big ? cw / 2 : cw - minSide * 0.13;
          const ty = big ? ch * 0.38 : ch * 0.3;
          const trr = big ? minSide * 0.17 : minSide * 0.075;
          const kk = Math.min(1, dt * 4);
          b.x += (tx - b.x) * kk;
          b.y += (ty + Math.sin(t * 1.6) * (big ? 10 : 4) - b.y) * kk;
          b.r += (trr - b.r) * kk;
          sc?.place('boss', b.x, b.y, b.r, t);
          if (bossBar.current) bossBar.current.style.transform = `scaleX(${Math.max(0, b.hp) / Math.max(1, b.max)})`;
          const wkEl = root.current?.querySelector('.gh-weak') as HTMLElement | null;
          if (wkEl) wkEl.style.transform = `translate(${b.x}px, ${b.y}px)`;
        }
        if (g.sonicUntil && t > g.sonicUntil) g.sonicUntil = -1;
      }

      /* ---- ความมืด: ช่วงตอบมืดมาก ไฟฉายเจาะรู ผีที่เจอแล้วเรืองแสง ---- */
      const dc = dark.current;
      const d2 = dc?.getContext('2d');
      if (dc && d2) {
        if (dc.width !== cw || dc.height !== ch) {
          dc.width = cw;
          dc.height = ch;
        }
        d2.clearRect(0, 0, cw, ch);
        const asking = ph === 'play' && g && (g.sub === 'ask' || g.sub === 'enter');
        const alpha = ph === 'calib' ? 0.45 : !(ph === 'play' && g) ? 0 : asking ? (camRef.current ? 0.93 : 0.88) : 0.35;
        if (alpha > 0) {
          d2.globalCompositeOperation = 'source-over';
          d2.fillStyle = `rgba(10, 6, 30, ${alpha})`;
          d2.fillRect(0, 0, cw, ch);
          d2.globalCompositeOperation = 'destination-out';
          const hole = (x: number, y: number, r: number, a = 1) => {
            const gr = d2.createRadialGradient(x, y, r * 0.35, x, y, r);
            gr.addColorStop(0, `rgba(0,0,0,${a})`);
            gr.addColorStop(1, 'rgba(0,0,0,0)');
            d2.fillStyle = gr;
            d2.beginPath();
            d2.arc(x, y, r, 0, Math.PI * 2);
            d2.fill();
          };
          for (const l of lights) hole(l.x, l.y, lr);
          if (g && ph === 'play') {
            for (const m of g.mobs) {
              if (m.seen) hole(m.x, m.y + m.r * 0.4, m.r * 2.1);
              else if (g.fx.detect) hole(m.x, m.y, m.r * 1.1, 0.35 + Math.sin(t * 4 + m.i) * 0.12);
            }
            if (g.special) hole(cw * 0.12, ch * 0.56, minSide * 0.16, 0.9);
            if (g.boss?.alive) hole(g.boss.x, g.boss.y, g.boss.r * 1.6, 0.8);
            // คำถาม + นักล่า มองเห็นเสมอ
            hole(cw / 2, ch * 0.12, Math.max(cw * 0.45, 220), 0.95);
            const hh = hero();
            hole(hh.x - hh.s * 0.4, ch - hh.s * 0.6, hh.s * 1.1, 0.9);
          }
          d2.globalCompositeOperation = 'source-over';
          // ขอบวงไฟฉายเรืองแสงเบาๆ
          d2.strokeStyle = 'rgba(255, 240, 180, 0.35)';
          d2.lineWidth = 3;
          for (const l of lights) {
            d2.beginPath();
            d2.arc(l.x, l.y, lr * 0.92, 0, Math.PI * 2);
            d2.stroke();
          }
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
  }, [hasScene, choose, castBolt, castVacuum, castCharge, castSonic, resolveAtk, resolveObs, nextQuestion, finishRun]);

  const collectItem = (id: string) => {
    const g = G.current;
    const c = g?.items.find((x) => x.id === id);
    if (!g || !c) return;
    g.items = g.items.filter((x) => x.id !== id);
    const h = hero();
    scene.current?.collect(id, h.x, h.y);
    if (c.chest) {
      g.chests++;
      addPlay(GH_POINTS.treasure, c.x, c.y, `เปิดหีบสมบัติ! +${GH_POINTS.treasure}`, '#ffc53a');
      gsfx.cash();
    } else {
      g.scores[g.team].clues++;
      addPlay(GH_POINTS.clue, c.x, c.y, `ได้เบาะแส +${GH_POINTS.clue}`, '#e8fff6');
      gsfx.coin();
    }
    bump();
  };

  /* แตะจอ/เมาส์: ย้ายไฟฉายมาที่นิ้ว แตะผีที่เจอแล้ว = จับ / แตะบอส = ยิงลำแสง */
  const pointAt = (e: React.PointerEvent) => {
    const rect = root.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (phase !== 'play' || e.pointerType === 'touch') return;
    pointer.current = { ...pointAt(e), at: performance.now() };
  };
  const onPointer = (e: React.PointerEvent) => {
    const g = G.current;
    if (phase !== 'play' || !g || paused || teacher) return;
    const { x, y } = pointAt(e);
    pointer.current = { x, y, at: performance.now() };
    if (g.sub === 'ask') {
      const m = g.mobs.find((mm) => mm.alive && Math.hypot(mm.x - x, mm.y - y) < mm.r * 1.2);
      // ผียังไม่เจอ: แตะครั้งแรก = ส่องไฟเจอ (วนเกมเปิดให้เห็น) แตะอีกครั้ง = จับ
      if (m && m.seen) choose(m.cid);
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
      else if (e.code === 'KeyV') touchMove('vacuum');
      else if (e.code === 'KeyC') touchMove('sonic');
      else if (e.code === 'Enter') touchMove('cast');
      const n = Number(e.key);
      // คีย์บอร์ด: กดเลขครั้งแรก = ส่องเจอ, กดซ้ำ = จับ
      if (n >= 1 && n <= 6 && g.sub === 'ask') {
        const m = g.mobs.find((mm) => mm.cid === g.order[n - 1]);
        if (!m || !m.alive) return;
        if (m.seen) choose(m.cid);
        else pointer.current = { x: m.x, y: m.y, at: performance.now() };
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, touchMove]);

  /* ------------------------------ ครู ------------------------------ */
  const skipQuestion = () => {
    const g = G.current;
    if (!g) return;
    if (g.sub === 'battle') g.subT = BATTLE_S;
    else {
      g.mobs.forEach((m) => scene.current?.remove(mobId(m.cid)));
      g.items.forEach((c) => scene.current?.remove(c.id));
      g.obs.forEach((a) => scene.current?.remove(a.id));
      g.items = [];
      g.obs = [];
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
      if (!uid) return setSetsErr('ต้องเข้าสู่ระบบก่อนถึงเลือกชุดคำถามของแต่ละสถานที่ได้');
      const { data: rows, error } = await sb.from('user_games').select('id, title').eq('owner_id', uid).order('updated_at', { ascending: false }).limit(200);
      if (error) return setSetsErr('โหลดรายการชุดคำถามไม่สำเร็จ');
      setSets((rows || []) as { id: string; title: string }[]);
    });
  };

  const setLook = (p: Partial<Look>) => (gsfx.pick(), commit((s) => ({ ...s, look: { ...s.look, ...p } })));
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
    const head = ['สถานที่', 'ข้อที่', 'คำถาม', 'ทีม', 'ผู้เล่นคนที่', 'ถูกครั้งแรก', 'ตอบถูก', 'ตัวเลือกที่ตอบผิด', 'เวลา (วินาที)'];
    const rows = r.log.map((l) => [r.land.name, l.n + 1, l.text, r.teams > 1 ? TEAM_NAMES[l.team] : 'เดี่ยว', l.member + 1, l.first ? 'ใช่' : 'ไม่', l.got ? 'ใช่' : 'ไม่', l.wrong.join(' / '), (l.ms / 1000).toFixed(1)]);
    const sum = r.scores.map((s, i) => [r.teams > 1 ? TEAM_NAMES[i] : 'รวม', 'ความรู้', s.know, 'การเล่น', s.play, 'ถูก', s.correct, 'ผิด', s.wrong]);
    const csv = '﻿' + [head, ...rows, [], ...sum].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `ghost-hunter-${r.land.id}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  /* ------------------------------ แสดงผล ------------------------------ */
  const g = G.current;
  const q = g?.q;
  const land = g?.land || placeById(landId);
  const boss = g?.boss;
  const fx = effects(save.skills, openGears(save.knowledge));
  const touchMode = !camOn;
  const h = typeof window === 'undefined' ? { s: 120 } : hero();
  const casting = sub === 'battle' || sub === 'reveal' || sub === 'ask';
  const lv = hunterLevel(save.knowledge);
  const caughtKinds = GHOSTS.filter((x) => save.caught[x.id]).length;

  const missions = [
    { k: 'seen', title: 'ยืนให้กล้องเห็นตัว', hint: 'ถอยให้เห็นตั้งแต่หัวถึงเอว หน้าตรง', icon: Users, done: calib.seen, on: true },
    { k: 'hand', title: 'ยื่นมือออกไป!', hint: 'ไฟฉายจะส่องตามมือ', icon: Flashlight, done: calib.hand, on: true },
    { k: 'cast', title: 'ส่องผีซ้อมค้างไว้', hint: 'ค้างจนวงเต็ม = ยิงลำแสงจับ', icon: Sparkles, done: calib.cast, on: true },
    { k: 'shield', title: 'กางแขนออกข้างเป็นตัว T', hint: 'นี่คือโล่กันผี', icon: Shield, done: calib.shield, on: mo.shield },
    { k: 'dodgeL', title: 'เอียงตัวไปทางซ้าย', hint: 'เอียงทั้งตัว ไม่ต้องก้าวเท้า', icon: ArrowBigLeft, done: calib.dodgeL, on: mo.dodge },
    { k: 'dodgeR', title: 'เอียงตัวไปทางขวา', hint: 'เอียงทั้งตัว ไม่ต้องก้าวเท้า', icon: ArrowBigRight, done: calib.dodgeR, on: mo.dodge },
    { k: 'charge', title: 'ยกสองมือเหนือหัว', hint: 'ค้างไว้ = ชาร์จกับดัก', icon: Zap, done: calib.charge, on: mo.charge },
    { k: 'clap', title: 'ปรบมือหนึ่งที', hint: 'คลื่นเสียง (ใช้ได้เมื่อปลดล็อก)', icon: Radio, done: calib.clap, on: mo.clap },
  ].filter((m) => m.on);
  const curMission = missions.find((m) => !m.done);
  const missionsDone = missions.filter((m) => m.done).length;
  const prevDone = useRef(0);
  useEffect(() => {
    if (phase === 'calib' && missionsDone > prevDone.current) gsfx.levelUp();
    prevDone.current = missionsDone;
  }, [missionsDone, phase]);

  const board = useMemo(() => (g ? g.scores.map((s, i) => ({ i, total: s.know + s.play })) : []), [g, qn, sub, floaters.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const mobLabels =
    phase === 'play' && q && g
      ? g.order.map((cid, i) => {
          const c = q.choices.find((x) => x.id === cid);
          if (!c) return null;
          const st = marks[cid];
          const gone = sub === 'clue' || sub === 'escape' || sub === 'battle' || sub === 'victory' || sub === 'bossIn' || (sub === 'reveal' && st !== 'answer' && st !== 'got');
          return (
            <div
              key={`${qn}-${cid}`}
              ref={(el) => {
                if (el) labels.current.set(cid, el);
                else labels.current.delete(cid);
              }}
              className="ar-label mk-label gh-label"
              data-st={st === 'got' ? 'answer' : st || ''}
              data-gone={gone}
              data-hidden={!seen[cid] && !st}
              style={{ ['--ac' as string]: ghostById(g.kinds[i]).color }}
              onPointerDown={(e) => {
                e.stopPropagation();
                const m = g.mobs.find((mm) => mm.cid === cid);
                if (m?.seen) choose(cid);
                else if (m) pointer.current = { x: m.x, y: m.y, at: performance.now() };
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

  const warnList = g ? (sub === 'battle' ? g.atks : sub === 'escape' ? g.obs : []) : [];
  const unseen = g && sub === 'ask' ? g.mobs.filter((m) => m.alive && !m.seen).length : 0;

  return createPortal(
    <div
      ref={root}
      className={`ar-root mk-root gh-root${shake ? ' mk-shake' : ''}`}
      data-cam={camOn}
      data-land={land.id}
      style={{ ['--sky1' as string]: land.sky[0], ['--sky2' as string]: land.sky[1], ['--lc' as string]: land.color }}
      onPointerDown={onPointer}
      onPointerMove={onPointerMove}
      onAnimationEnd={(e) => e.target === e.currentTarget && setShake(0)}
    >
      <video ref={video} className="ar-video" playsInline muted aria-hidden="true" />
      <div className="mk-tint gh-tint" aria-hidden="true" />
      {!camOn && (
        <div className="gh-world" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      )}
      <canvas ref={skel} className="ar-skel" aria-hidden="true" />
      <div ref={stage} className="ar-stage" aria-hidden="true" />
      <canvas ref={dark} className="gh-dark" aria-hidden="true" />

      {mobLabels}

      {[0, 1].map((kx) => (
        <React.Fragment key={kx}>
          <svg ref={(el) => void (rings.current[kx] = el)} className="ar-ring" viewBox="0 0 100 100" style={{ ['--tc' as string]: GLOW }} aria-hidden="true">
            <circle cx="50" cy="50" r="46" className="ar-ring-bg" />
            <circle cx="50" cy="50" r="46" className="ar-ring-p" />
          </svg>
          <div ref={(el) => void (reticles.current[kx] = el)} className="ar-reticle mk-reticle" style={{ ['--tc' as string]: '#ffe38a' }} aria-hidden="true">
            <i />
          </div>
        </React.Fragment>
      ))}

      {phase === 'play' && sub === 'clue' && g &&
        g.items.map((c) => (
          <button
            key={c.id}
            type="button"
            className="mk-crys-hit"
            ref={(el) => {
              if (el) itemEls.current.set(c.id, el);
              else itemEls.current.delete(c.id);
            }}
            style={{ width: c.r * 2.6, height: c.r * 2.6 }}
            onPointerDown={(e) => {
              e.stopPropagation();
              collectItem(c.id);
            }}
            aria-label={c.chest ? 'เปิดหีบสมบัติ' : 'เก็บเบาะแส'}
          />
        ))}

      {phase === 'play' && sub === 'battle' && boss?.alive && (
        <div className="gh-weak" data-on={weak} aria-hidden="true">
          <b>จุดอ่อน!</b>
        </div>
      )}

      {phase === 'play' &&
        warnList.map((a) => (
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
            <b>{a.kind === 'shield' ? (touchMode ? 'กดปุ่มโล่!' : 'กางแขน ตั้งโล่!') : a.dir < 0 ? 'เอียงซ้าย!' : 'เอียงขวา!'}</b>
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

      {(phase === 'play' || phase === 'count' || phase === 'calib') && (
        <div ref={heroEl} className="mk-hero gh-hero" style={{ ['--hs' as string]: `${h.s}px` }}>
          <HunterArt look={save.look} size={h.s} casting={casting} />
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
                  <i style={{ width: `${(g.coop / (g.teams * 3)) * 100}%` }} />
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
                {unseen > 0 && (
                  <span className="gh-hunt">
                    <Flashlight className="w-4 h-4" /> ยังซ่อนอยู่ {unseen} ตัว
                  </span>
                )}
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
                <i ref={sub === 'ask' || sub === 'clue' || sub === 'escape' ? timeBar : undefined} />
              </span>
            </div>
          )}
          {phase === 'play' && sub === 'ask' && touchMode && unseen > 0 && (
            <div className="mk-bonus gh-tip">
              <Flashlight className="w-6 h-6" />
              <b>แตะในความมืดเพื่อส่องไฟฉาย เจอผีแล้วแตะอีกครั้งเพื่อจับ</b>
            </div>
          )}
          {phase === 'play' && sub === 'ask' && touchMode && g.open.includes('sonic') && !g.sonicUntil && (
            <div className="mk-pad" data-touch="true">
              <button type="button" className="mk-padbtn" onClick={() => touchMove('sonic')}>
                <Radio className="w-6 h-6" /> คลื่นเสียง
              </button>
            </div>
          )}
          {phase === 'play' && sub === 'clue' && (
            <div className="mk-bonus">
              <KeyRound className="w-6 h-6" />
              <b>{touchMode ? 'แตะเก็บเบาะแสและหีบสมบัติ!' : 'ยื่นมือเก็บเบาะแสและหีบสมบัติ!'}</b>
            </div>
          )}
          {phase === 'play' && sub === 'escape' && touchMode && (
            <div className="mk-pad" data-touch="true">
              <button type="button" className="mk-padbtn" onClick={() => touchMove('L')}>
                <ArrowBigLeft className="w-6 h-6" /> ซ้าย
              </button>
              <button type="button" className="mk-padbtn" onClick={() => touchMove('R')}>
                ขวา <ArrowBigRight className="w-6 h-6" />
              </button>
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
                <GearIcon id="beam" color={GLOW} size={30} />
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
                    <Sparkles className="w-6 h-6" /> ลำแสง
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
                  {g.open.includes('vacuum') && (
                    <button type="button" className="mk-padbtn" disabled={g.bolts < 2} onClick={() => touchMove('vacuum')}>
                      <Sparkles className="w-6 h-6" /> เครื่องดูด
                    </button>
                  )}
                  <button type="button" className="mk-padbtn" disabled={g.chargeUsed} onClick={() => touchMove('charge')}>
                    <Zap className="w-6 h-6" /> ชาร์จ
                  </button>
                </>
              ) : (
                <ul className="mk-legend">
                  <li><Sparkles className="w-4 h-4" /> ยื่นมือเล็งบอส</li>
                  {mo.shield && <li><Shield className="w-4 h-4" /> กางแขน = โล่</li>}
                  {mo.dodge && <li><ArrowBigLeft className="w-4 h-4" /> เอียงตัว = หลบ</li>}
                  {g.open.includes('vacuum') && <li><Sparkles className="w-4 h-4" /> สองมือเล็ง = เครื่องดูด</li>}
                  {mo.charge && <li><Zap className="w-4 h-4" /> มือเหนือหัว = ชาร์จ</li>}
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
          {count > 0 ? count : 'ส่องไฟ!'}
        </div>
      )}

      {/* ---------------- จอเริ่ม ---------------- */}
      {(phase === 'setup' || phase === 'loading') && (
        <div className="mk-panel-wrap">
          <div className="mk-panel">
            <div className="mk-title">
              <GhostArt id="friendly" color="#9ff0d0" size={58} />
              <div>
                <small>เกม AR เล่นในเครื่องเดียว</small>
                <h2>Ghost Hunter AR</h2>
              </div>
            </div>
            <p className="mk-lead">ผีซุกซนออกมาป่วนเมือง! ส่องไฟฉายด้วยมือของหนู หาผีที่ซ่อนอยู่ ตอบคำถามให้ถูกเพื่อจับผีและไขปริศนา</p>
            <ul className="mk-tips">
              <li><Camera className="w-5 h-5" /> ตั้งเครื่องให้กล้องเห็นตัวตั้งแต่หัวถึงเอว ยืนห่างราว 1.5-2 เมตร</li>
              <li><Hand className="w-5 h-5" /> ไม่ต้องกระโดด ยื่นมือส่องไฟ กางแขน และเอียงตัวเบาๆ ก็พอ</li>
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

      {/* ---------------- ภารกิจฝึก ---------------- */}
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
                <b>พร้อมล่าผีแล้ว!</b>
                <span>กดไปที่แผนที่เมือง</span>
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
                <MapIcon className="w-5 h-5" /> ไปแผนที่เมือง
              </button>
              {curMission && (
                <button
                  type="button"
                  className="mk-btn mk-btn-ghost"
                  onClick={() => {
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

      {/* ---------------- ฐานนักล่า: แผนที่ / ตัวละคร / ผีสะสม / อุปกรณ์ / อัปเกรด ---------------- */}
      {phase === 'hub' && (
        <div className="mk-hub">
          <div className="mk-hub-top">
            <div className="mk-hub-me">
              <HunterArt look={save.look} size={54} />
              <div>
                <b>{HUNTER_LEVELS[lv].th}</b>
                <span>
                  <Coins className="w-4 h-4" /> {save.coins.toLocaleString('th-TH')} <BookOpen className="w-4 h-4" /> ความรู้ {save.knowledge}
                </span>
              </div>
            </div>
            <div className="mk-tabs" role="tablist">
              {([
                ['map', 'แผนที่', MapIcon],
                ['hero', 'นักล่า', Users],
                ['ghosts', 'ผีสะสม', BookOpen],
                ['gear', 'อุปกรณ์', Flashlight],
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
                {PLACES.map((l, i) => {
                  const open = placeOpen(save.stars, l.id, save.openAll);
                  const st = save.stars[l.id] || 0;
                  return (
                    <button key={l.id} type="button" className="mk-land" data-on={landId === l.id} data-open={open} disabled={!open} style={{ ['--lc' as string]: l.color, animationDelay: `${i * 0.05}s` }} onClick={() => (gsfx.pick(), setLandId(l.id))}>
                      <PlaceArt id={l.id} color={l.color} size={86} />
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
                    บอส: {ghostBoss(settings.boss !== 'auto' ? settings.boss : land.boss).name} · ผีในที่นี้: {land.ghosts.map((x) => ghostById(x).name).join(', ')} · ชุดคำถาม: {save.sets[land.id] ? 'ชุดที่ครูเลือก' : title}
                  </span>
                  {setErr && <span className="mk-err">{setErr}</span>}
                </div>
                <button type="button" className="mk-btn mk-btn-go" onClick={() => beginRun()}>
                  <Play className="w-5 h-5" /> ออกล่าผี
                </button>
              </div>
            </div>
          )}

          {tab === 'hero' && (
            <div className="mk-shop mk-hero-edit">
              <div className="mk-hero-preview">
                <HunterArt look={save.look} size={150} casting />
              </div>
              <div className="mk-opts">
                <p>
                  เลเวล: {HUNTER_LEVELS[lv].name} ({HUNTER_LEVELS[lv].th}){lv < HUNTER_LEVELS.length - 1 ? ` · อีก ${HUNTER_LEVELS[lv + 1].need - save.knowledge} ความรู้ขึ้นเลเวล` : ''}
                </p>
                <p>นักล่า</p>
                <div className="mk-chips">
                  {['ชาย', 'หญิง'].map((n, i) => (
                    <button key={n} type="button" className="mk-chip" data-on={save.look.g === i} onClick={() => setLook({ g: i as 0 | 1 })}>
                      {n}
                    </button>
                  ))}
                </div>
                <p>เสื้อโค้ท</p>
                <div className="mk-chips">
                  {COATS.map((c, i) => (
                    <button key={c} type="button" className="mk-dot" data-on={save.look.coat === i} style={{ background: c }} onClick={() => setLook({ coat: i })} aria-label={`เสื้อสี ${i + 1}`} />
                  ))}
                </div>
                <p>สีผิว</p>
                <div className="mk-chips">
                  {SKINS.map((c, i) => (
                    <button key={c} type="button" className="mk-dot" data-on={save.look.skin === i} style={{ background: c }} onClick={() => setLook({ skin: i })} aria-label={`สีผิว ${i + 1}`} />
                  ))}
                </div>
                <p>อุปกรณ์บนหัว</p>
                <div className="mk-chips">
                  {HATS.map((n, i) => (
                    <button key={n} type="button" className="mk-chip" data-on={save.look.hat === i} onClick={() => setLook({ hat: i })}>
                      {n}
                    </button>
                  ))}
                </div>
                <p>สีไฟฉาย</p>
                <div className="mk-chips">
                  {GLOWS.map((c, i) => (
                    <button key={c} type="button" className="mk-dot" data-on={save.look.glow === i} style={{ background: c }} onClick={() => setLook({ glow: i })} aria-label={`สีไฟ ${i + 1}`} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'ghosts' && (
            <div className="mk-shop">
              <p className="mk-note">
                จับผีด้วยคำตอบที่ถูกเพื่อสะสมการ์ด ({caughtKinds}/{GHOSTS.length}) · ไขปริศนาแล้ว {save.puzzles} · ช่วยผีใจดีกลับบ้าน {save.rescued}
              </p>
              <div className="gh-cards">
                {GHOSTS.map((x) => {
                  const n = save.caught[x.id] || 0;
                  return (
                    <div key={x.id} className="gh-card" data-own={!!n} style={{ ['--cc' as string]: x.color, ['--rc' as string]: RARITY[x.rarity].color }}>
                      <GhostArt id={x.id} color={x.color} size={64} locked={!n} />
                      <b>{n ? x.name : '???'}</b>
                      <small>
                        {x.en} · <em>{RARITY[x.rarity].name}</em>
                      </small>
                      <span>{n ? `${x.info} (จับได้ ${n} ครั้ง)` : 'ยังไม่เคยจับ'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'gear' && (
            <div className="mk-shop">
              <p className="mk-note">
                ตอบถูกสะสมความรู้เพื่อปลดล็อกอุปกรณ์ {nextGear(save.knowledge) ? `(อีก ${nextGear(save.knowledge)!.need - save.knowledge} ความรู้ ได้${nextGear(save.knowledge)!.name})` : '(ปลดล็อกครบแล้ว!)'}
              </p>
              <div className="mk-spells">
                {GEARS.map((s) => {
                  const open = save.knowledge >= s.need;
                  return (
                    <div key={s.id} className="mk-spell" data-open={open} style={{ ['--sc' as string]: s.color }}>
                      <GearIcon id={s.id} color={s.color} size={46} locked={!open} />
                      <div>
                        <b>
                          {s.name} <small>{s.en}</small>
                        </b>
                        <span>{open ? s.how : `ปลดล็อกที่ความรู้ ${s.need}`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'skills' && (
            <div className="mk-shop">
              <p className="mk-note">
                ใช้ Ghost Coin อัปเกรดอุปกรณ์ (มี <Coins className="inline w-4 h-4" /> {save.coins.toLocaleString('th-TH')})
              </p>
              <div className="mk-skills">
                {SKILLS.map((s) => {
                  const lvl = save.skills[s.id];
                  const max = lvl >= SKILL_MAX;
                  return (
                    <div key={s.id} className="mk-skill" style={{ ['--sc' as string]: s.color }}>
                      <b>{s.name}</b>
                      <span>{s.desc}</span>
                      <div className="mk-pips">
                        {[...Array(SKILL_MAX)].map((_, i) => (
                          <i key={i} data-on={i < lvl} />
                        ))}
                      </div>
                      <button type="button" className="mk-btn mk-btn-sm" disabled={max || save.coins < skillCost(lvl)} onClick={() => buySkill(s.id)}>
                        {max ? 'เต็มแล้ว' : (
                          <>
                            <Coins className="w-4 h-4" /> {skillCost(lvl)}
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="mk-note">
                ตอนนี้: ลำแสง x{fx.power.toFixed(2)} · ลำแสง {fx.bolts} ครั้ง/ข้อ · หัวใจ {fx.hearts} · ไฟฉาย {Math.round(fx.light * 100)}% · ล็อกเป้า {(fx.dwell / 1000).toFixed(2)} วิ
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
            <h2>{result.stars >= 2 ? 'เมืองกลับมาสงบสุขแล้ว!' : result.stars ? 'จับผีซุกซนได้แล้ว!' : 'ฝึกต่ออีกนิดนะนักล่า'}</h2>
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
                      ความรู้ {s.know} · การเล่น {s.play} · ถูก {s.correct} ผิด {s.wrong} · จับผี {s.caught} · เบาะแส {s.clues} · ปริศนา {s.puzzles} · ช่วยผี {s.rescued}
                    </span>
                  </div>
                ))}
            </div>
            <p className="mk-gain">
              <Coins className="w-5 h-5" /> +{result.coins} เหรียญ <BookOpen className="w-5 h-5" /> ความรู้ +{result.knowGain}
              {result.bossKills > 0 && result.style === 2 && <> · จับบอส {result.bossKills} ตัว</>}
            </p>
            {(result.newGears.length > 0 || result.newGhosts.length > 0 || result.levelUp !== null) && (
              <div className="mk-newspell">
                {result.levelUp !== null && (
                  <span>
                    <Star className="w-6 h-6" fill="#ffd23f" /> เลเวลอัป: {HUNTER_LEVELS[result.levelUp].th}
                  </span>
                )}
                {result.newGears.map((id) => (
                  <span key={id}>
                    <GearIcon id={id} color={gearById(id).color} size={34} /> อุปกรณ์ใหม่: {gearById(id).name}
                  </span>
                ))}
                {result.newGhosts.map((id) => (
                  <span key={id}>
                    <GhostArt id={id} color={ghostById(id).color} size={34} /> การ์ดผีใหม่: {ghostById(id).name}
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
                <MapIcon className="w-5 h-5" /> แผนที่เมือง
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

      {phase === 'play' && (paused || away || camLost) && !teacher && (
        <div className="mk-panel-wrap">
          <div className="mk-panel mk-panel-sm">
            <h2>{camLost ? 'กล้องหลุด' : away ? 'นักล่าหายไปไหน?' : 'พักเกม'}</h2>
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
                <button type="button" className="mk-btn mk-btn-sm" onClick={() => (setTeacher(false), finishRun())}>จบสถานที่นี้ ดูผล</button>
              </div>
            )}
            {phase !== 'play' && (
              <>
                <p className="mk-tlabel">ผู้เล่น (ทีมผลัดกันล่า 1 กล้อง)</p>
                <div className="mk-chips">
                  {[0, 2, 3, 4].map((n) => (
                    <button key={n} type="button" className="mk-chip" data-on={teams === n} onClick={() => (gsfx.tap(), setTeams(n))}>
                      {n ? `${n} ทีม` : 'เดี่ยว'}
                    </button>
                  ))}
                </div>
                <p className="mk-tlabel">แบบการเล่น</p>
                <div className="mk-chips">
                  {['ผจญภัย', 'แข่งเวลา 2 นาที', 'ล่าบอส'].map((n, i) => (
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
            <p className="mk-tlabel">สถานที่</p>
            <div className="mk-chips">
              <button type="button" className="mk-chip" data-on={save.openAll} onClick={() => (gsfx.tap(), commit((s) => ({ ...s, openAll: !s.openAll })))}>
                {save.openAll ? 'เปิดทุกสถานที่อยู่' : 'เปิดทุกสถานที่'}
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
            <p className="mk-note">คำถามทุกข้อมาจากชุดคำถามของครู (สร้าง/แก้ไข/นำเข้า Excel ได้ที่หน้าสร้างเกม) ใช้ได้เฉพาะข้อเลือกตอบ 1 คำตอบ</p>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
