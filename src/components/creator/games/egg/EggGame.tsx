'use client';

import '../games.css';
import '../games-live.css';
import '../brawl-fish.css';
import '../world.css';
import './egg.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Backpack, Crown, Egg, Gauge, Hand, LogOut, RefreshCw, Siren, Weight, X, Zap } from 'lucide-react';
import { QuestionDock } from '../QuestionPad';
import { CoachArrow, DOCK_CHOICES, useCoach } from '../Coach';
import type { GameProps } from '../types';
import { gsfx } from '@/lib/game-creator/gsound';
import type { LiveOutcome } from '@/lib/game-creator/live-client';
import { BOSS_SPEED, EGG_BIOMES, EGG_SLOTS_RARITY, RARITY, SIZE_MAX, SIZE_MIN, SPEED_COST, eggEpoch, eggKg, pickEggType, takeWins } from '@/lib/game-creator/eggValues';
import { TEAM_COLORS, TEAM_NAMES, avatarSprite, fmtLeft, hashStr, ownerOf, rng, useMoveInput, useWorldNet, type NetMsg } from '../worldKit';
import { BIOMES } from './biomes';
import { petLook, type PetInfo } from './pets';
import { EggArt, PetArt } from './PetArt';
import { END_Z, EggWorld, HALF_W, SAFE_Z, SLOTS, bossHome, eggVisual, inSafe, makeChar, pickThemes, poseBoss, poseChar, setBossAwake, setCarry, setCharImage, setPet, slotLayout, tierAt, type CharRig } from './scene';

const N_SLOTS = EGG_BIOMES * SLOTS;
const BASE_SPEED = 7.5;
const SPEED_STEP = 0.9;
const CARRY_MUL = 0.82;
const BOSS_WAKE_MS = 1000;
const CATCH_R = 1.7;
const STUN_MS = 900;
const HOLD_MAX_MS = 60000;
const REACH = 2.4;

type SlotSt = 'idle' | 'held' | 'gone';
interface Slot {
  gen: number;
  st: SlotSt;
  by: number;
  t: number;
  until: number;
}
interface Carry {
  k: number;
  ep: number;
  gen: number;
  tier: number;
  type: number;
  size: number;
  kg: number;
}
interface Chase {
  tier: number;
  x: number;
  z: number;
  st: 'wake' | 'chase' | 'return';
  at: number;
  speed: number;
}
interface Ghost {
  idx: number;
  x: number;
  z: number;
  tx: number;
  tz: number;
  dx: number;
  moving: boolean;
  carry: string;
  pet: string;
  q: boolean;
  score: number;
  boss: [number, number, number] | null;
  seen: number;
  rig: CharRig | null;
}
interface Bot {
  idx: number;
  name: string;
  avatar: number;
  x: number;
  z: number;
  tx: number;
  tz: number;
  dx: number;
  carry: Carry | null;
  score: number;
  next: number;
  rig: CharRig | null;
}
interface Hatch extends PetInfo {
  at: number;
}

export function EggGame({ engine, deadline, sync, me, preview, onLeave, world: info, startScore = 0, reset = 120, startedAt }: GameProps) {
  const host = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const now = useCallback(() => (info ? info.now() : Date.now()), [info]);
  const t0 = useRef(startedAt || Date.now()).current;
  const myIdx = info ? Math.max(0, info.players.findIndex((p) => p.id === info.myId)) : 0;
  const teams = info?.teams || 0;
  const seed = useRef(hashStr(`${info?.roomId || 'preview'}:${info?.round || 0}`)).current;
  const themes = useMemo(() => pickThemes(seed), [seed]);
  const colorOf = (idx: number) => TEAM_COLORS[info ? ownerOf(info, info.players[idx]?.id || '') : idx % TEAM_COLORS.length] || TEAM_COLORS[0];
  const bots = useRef<Bot[]>([]);
  const nameOf = (idx: number) => info?.players[idx]?.nickname || bots.current.find((b) => b.idx === idx)?.name || 'เพื่อน';
  const bagKey = `l5g_egg_bag_${info?.roomId || 'preview'}_${info?.round || 0}`;

  /** รอบไข่ปัจจุบัน (ทุกไบโอมเกิดใหม่เมื่อเปลี่ยนรอบ) */
  const epNow = useCallback(() => eggEpoch(now(), t0, reset), [now, t0, reset]);
  /** ไข่ช่อง k ของรอบ ep ครั้งที่ gen: ชนิด ขนาด น้ำหนัก (ทุกเครื่องคิดได้ตรงกัน) */
  const eggOf = useCallback(
    (k: number, ep: number, gen: number) => {
      const r = rng(hashStr(`${seed}:${ep}:${k}:${gen}`));
      const tier = Math.floor(k / SLOTS);
      const type = pickEggType(r(), r());
      const size = SIZE_MIN + r() * (SIZE_MAX - SIZE_MIN);
      return { tier, type, size, kg: eggKg(tier, type, size), b: themes[tier] };
    },
    [seed, themes]
  );

  const ep = useRef(epNow());
  const slots = useRef<Slot[]>(Array.from({ length: N_SLOTS }, () => ({ gen: 0, st: 'idle', by: -1, t: 0, until: 0 })));
  const layout = useRef<{ ep: number; pos: { x: number; z: number }[] }>({ ep: -1, pos: [] });
  const ghosts = useRef(new Map<number, Ghost>());
  const worldRef = useRef<EggWorld | null>(null);
  const shown = useRef(new Map<number, string>());

  const spawnX = (rng(hashStr(`spawn:${myIdx}`))() * 2 - 1) * 8;
  const hero = useRef({ x: spawnX, z: SAFE_Z * 0.3, dx: 0, moving: false, carry: null as Carry | null, stun: 0, answering: -1, speedLv: 0, holdAt: 0 });
  const chase = useRef<Chase | null>(null);
  const score = useRef(Math.max(0, startScore));
  const coins = useRef(Math.max(0, startScore));
  const stats = useRef({ eggs: 0, rare: 0, caught: 0 });

  const [bag, setBag] = useState<PetInfo[]>(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem(bagKey) || '[]');
      return Array.isArray(v) ? v.filter((p) => Number.isInteger(p?.b) && Number.isInteger(p?.t) && Number(p?.kg) > 0).slice(0, 300) : [];
    } catch {
      return [];
    }
  });
  const [held, setHeld] = useState(-1);
  const heldRef = useRef<PetInfo | null>(null);
  heldRef.current = held >= 0 ? bag[held] || null : null;
  const [bagOpen, setBagOpen] = useState(false);
  const [hatch, setHatch] = useState<Hatch | null>(null);
  const [hatchPhase, setHatchPhase] = useState(0);

  const [hud, setHud] = useState({ score: score.current, coins: coins.current, left: 0, resetLeft: 0, near: -1, nearSt: 'none' as 'none' | 'ok' | 'held' | 'busy', safe: true, carry: false, chased: false, stun: 0, lv: 0, tier: -1 });
  const [board, setBoard] = useState<{ name: string; v: number; me: boolean; color: string }[]>([]);
  const [over, setOver] = useState(false);
  const [answering, setAnswering] = useState(-1);
  const [streak, setStreak] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'ok' | 'bad' | 'wave'; at: number } | null>(null);
  const [runAlert, setRunAlert] = useState(0);
  const [failed3d, setFailed3d] = useState(false);
  const say = (text: string, kind: 'ok' | 'bad' | 'wave') => setBanner({ text, kind, at: Date.now() });
  const { joy, handlers, dir } = useMoveInput(!over);

  useEffect(() => {
    try {
      sessionStorage.setItem(bagKey, JSON.stringify(bag));
    } catch {
      /* ignore */
    }
  }, [bag, bagKey]);

  const coach = useCoach(
    [
      { id: 'move', target: '.eg-stage', text: 'ลากนิ้วบนจอ หรือกดลูกศร วิ่งขึ้นไปหาไข่' },
      { id: 'steal', target: '.eg-steal', text: 'ถึงไข่แล้ว กดขโมย!', when: () => hud.nearSt === 'ok', doneIf: () => answering >= 0 || hud.carry },
      { id: 'answer', target: DOCK_CHOICES, text: 'เลือกตัวเลือก ตอบถูกได้ไข่', when: () => answering >= 0, doneIf: () => hud.carry },
      { id: 'run', target: '.eg-home', text: 'บอสตื่นแล้ว! วิ่งลงกลับฐาน', when: () => hud.carry },
      { id: 'bag', target: '.eg-bagbtn', text: 'ดูสัตว์ที่ฟักได้ในกระเป๋า', when: () => bag.length > 0 && !hatch, optional: true },
    ],
    { loops: 1, active: !over }
  );

  /* ---------- รอบไข่ + สถานะช่อง (กติกาเดียวกันทุกเครื่อง) ---------- */
  const tickSlots = useCallback(() => {
    const e = epNow();
    if (e !== ep.current) {
      ep.current = e;
      slots.current.forEach((s) => Object.assign(s, { gen: 0, st: 'idle', by: -1, t: 0, until: 0 }));
      if (hero.current.answering >= 0) {
        hero.current.answering = -1;
        setAnswering(-1);
      }
      setBanner({ text: 'ไข่ทุกไบโอมเกิดใหม่แล้ว!', kind: 'wave', at: Date.now() });
      gsfx.levelUp();
    }
    const t = now();
    slots.current.forEach((s) => {
      if (s.st === 'held' && t > s.until) Object.assign(s, { st: 'idle', by: -1 });
    });
  }, [now, epNow]);

  const dropMine = useCallback((why: string, kind: 'bad' | 'wave' = 'bad') => {
    hero.current.carry = null;
    if (chase.current) chase.current.st = 'return';
    say(why, kind);
  }, []);
  const cancelAnswer = useRef<(why: string) => void>(() => undefined);

  /** ช่อง k ถูกคนลำดับ i ขโมยตอนเวลา t (ใครเวลาน้อยกว่าได้ไป) */
  const applyTake = useCallback(
    (k: number, e: number, gen: number, i: number, t: number) => {
      const s = slots.current[k];
      if (!s || e !== ep.current || s.gen !== gen || s.st === 'gone') return;
      if (s.st === 'held' && s.by !== i) {
        if (!takeWins(t, i, s.t, s.by)) return;
        const c = hero.current.carry;
        if (s.by === myIdx && c && c.k === k && c.ep === e) dropMine(`ไข่ของคุณถูก ${nameOf(i)} ขโมยไปได้ก่อน`);
      }
      Object.assign(s, { st: 'held', by: i, t, until: t + HOLD_MAX_MS });
      if (i !== myIdx && hero.current.answering === k) cancelAnswer.current(`ไข่ของคุณถูก ${nameOf(i)} ขโมยไปได้ก่อน`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myIdx, dropMine]
  );

  /* ---------- เครือข่าย ---------- */
  const snapDone = useRef(false);
  const net = useWorldNet(info, (m: NetMsg) => {
    const p = m.p;
    const i = Number(p.i);
    if (!Number.isInteger(i) || i < 0 || i === myIdx) return;
    const t = Number(p.t) || now();
    tickSlots();
    const e = Number(p.ep);
    if (m.e === 'pos') {
      const cx = (v: unknown) => Math.max(-HALF_W, Math.min(HALF_W, Number(v) || 0));
      const cz = (v: unknown) => Math.max(END_Z, Math.min(SAFE_Z, Number(v) || 0));
      const g = ghosts.current.get(i);
      const bs = Array.isArray(p.b) && p.b.length === 3 ? ([Number(p.b[0]), cx(p.b[1]), cz(p.b[2])] as [number, number, number]) : null;
      const patch = {
        tx: cx(p.x),
        tz: cz(p.z),
        carry: typeof p.c === 'string' ? p.c.slice(0, 20) : '',
        pet: typeof p.p === 'string' ? p.p.slice(0, 20) : '',
        q: p.q === 1,
        score: Math.max(0, Number(p.g) || 0),
        boss: bs && bs[0] >= 0 && bs[0] < EGG_BIOMES ? bs : null,
        seen: Date.now(),
      };
      if (g) Object.assign(g, patch);
      else ghosts.current.set(i, { idx: i, x: patch.tx, z: patch.tz, dx: 0, moving: false, rig: null, ...patch });
    } else if (m.e === 'take') {
      applyTake(Number(p.k), e, Number(p.gen), i, t);
    } else if (m.e === 'back') {
      const s = slots.current[Number(p.k)];
      if (s && e === ep.current && s.gen === Number(p.gen) && s.st === 'held' && s.by === i) Object.assign(s, { st: 'idle', by: -1 });
    } else if (m.e === 'dep') {
      const k = Number(p.k);
      const s = slots.current[k];
      if (s && e === ep.current && s.gen === Number(p.gen)) Object.assign(s, { st: 'gone', by: i, t, until: 0 });
      const eg = eggOf(k, e, Number(p.gen));
      if (Number.isInteger(k) && k >= 0 && k < N_SLOTS) worldRef.current?.addToNest(eg.b, eg.type, eg.kg);
    } else if (m.e === 'hello') {
      const alive = [myIdx, ...Array.from(ghosts.current.keys())].filter((x) => x !== i);
      if (Math.min(...alive) !== myIdx) return;
      setTimeout(() => net.send('snap', { i: myIdx, ep: ep.current, s: slots.current.map((s) => [s.gen, s.st, s.by, s.t, s.until]) }), 150 + Math.random() * 300);
    } else if (m.e === 'snap' && !snapDone.current && e === ep.current) {
      snapDone.current = true;
      const rows = Array.isArray(p.s) ? p.s : [];
      rows.slice(0, N_SLOTS).forEach((row, k) => {
        if (!Array.isArray(row)) return;
        const st = String(row[1]) as SlotSt;
        if (!['idle', 'held', 'gone'].includes(st)) return;
        slots.current[k] = { gen: Number(row[0]) || 0, st, by: Number(row[2]), t: Number(row[3]) || 0, until: Number(row[4]) || 0 };
      });
    }
  });
  const sentHello = useRef(false);
  useEffect(() => {
    if (!net.live || sentHello.current) return;
    sentHello.current = true;
    net.send('hello', { i: myIdx });
  }, [net, myIdx]);

  /* ---------- ทดลองเล่น: เพื่อนจำลอง 2 คน ---------- */
  useEffect(() => {
    if (info) return;
    bots.current = [1, 2].map((idx) => ({ idx, name: `เพื่อนจำลอง ${idx}`, avatar: idx === 1 ? 3 : 7, x: idx * 4 - 6, z: SAFE_Z * 0.5, tx: 0, tz: 5, dx: 0, carry: null, score: 0, next: Date.now() + 5000 + idx * 6000, rig: null }));
  }, [info]);

  /* ---------- ขโมยไข่ ---------- */
  const nearSlot = () => {
    const h = hero.current;
    const tier = tierAt(h.z);
    if (tier < 0 || layout.current.ep !== ep.current) return -1;
    let best = -1;
    let bd = REACH;
    for (let k = tier * SLOTS; k < (tier + 1) * SLOTS; k++) {
      const p = layout.current.pos[k];
      const d = Math.hypot(p.x - h.x, p.z - h.z);
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  };

  const steal = useCallback(() => {
    const h = hero.current;
    if (over || h.answering >= 0 || h.carry || h.stun > Date.now()) return;
    tickSlots();
    const k = nearSlot();
    if (k < 0) return;
    const s = slots.current[k];
    if (s.st !== 'idle') return say(s.st === 'held' ? 'มีคนถือไข่ใบนี้ไปแล้ว' : 'ไข่ใบนี้ถูกขโมยไปแล้ว รอรอบไข่ใหม่นะ', 'bad');
    h.answering = k;
    setAnswering(k);
    gsfx.door();
    coach.hit('steal');
    // ทดลองเล่น: บางทีเพื่อนจำลองแย่งตอบถูกก่อน (ให้เห็นว่ามีคนแข่ง)
    if (!info && Math.random() < 0.3) {
      const gen = s.gen;
      const e = ep.current;
      setTimeout(() => {
        if (hero.current.answering !== k || ep.current !== e || slots.current[k].gen !== gen || slots.current[k].st !== 'idle') return;
        const bot = bots.current[0];
        applyTake(k, e, gen, bot.idx, now());
        bot.carry = { k, ep: e, gen, ...eggOf(k, e, gen) };
        const p = layout.current.pos[k];
        bot.x = p.x + 1.2;
        bot.z = p.z;
      }, 5000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, tickSlots, coach, info, applyTake, now, eggOf]);

  const stopAnswer = useCallback(() => {
    hero.current.answering = -1;
    setAnswering(-1);
  }, []);
  cancelAnswer.current = (why: string) => {
    if (hero.current.answering < 0) return;
    stopAnswer();
    gsfx.sad();
    say(why, 'bad');
  };

  const wakeBoss = (c: Carry) => {
    const home = bossHome(c.tier);
    const prev = chase.current;
    const start = prev && prev.tier === c.tier ? { x: prev.x, z: prev.z } : home;
    chase.current = { tier: c.tier, x: start.x, z: start.z, st: 'wake', at: Date.now(), speed: BOSS_SPEED[c.tier] * RARITY[EGG_SLOTS_RARITY[c.type]].bossBoost };
    gsfx.siren();
    setRunAlert(Date.now());
  };

  const onAnswered = useCallback(
    (o: LiveOutcome) => {
      setStreak(o.streak);
      const h = hero.current;
      const k = h.answering;
      if (k < 0) return;
      if (!o.correct) {
        say('ยังไม่ถูก ลองข้อใหม่ ไข่ยังรออยู่', 'wave');
        return;
      }
      tickSlots();
      const s = slots.current[k];
      if (h.answering !== k) return;
      if (s.st !== 'idle') {
        stopAnswer();
        return say(s.by >= 0 && s.by !== myIdx ? `ไข่ของคุณถูก ${nameOf(s.by)} ขโมยไปได้ก่อน` : 'ไข่ใบนี้หายไปแล้ว', 'bad');
      }
      const t = now();
      const e = ep.current;
      Object.assign(s, { st: 'held', by: myIdx, t, until: t + HOLD_MAX_MS });
      net.send('take', { k, ep: e, gen: s.gen, i: myIdx, t });
      const c: Carry = { k, ep: e, gen: s.gen, ...eggOf(k, e, s.gen) };
      h.carry = c;
      h.holdAt = Date.now();
      gsfx.cash();
      say(`ได้${BIOMES[themes[c.tier]].eggs[c.type].name} (${RARITY[EGG_SLOTS_RARITY[c.type]].name})!`, 'ok');
      setTimeout(() => {
        stopAnswer();
        if (hero.current.carry === c) wakeBoss(c);
      }, 700);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now, myIdx, net, stopAnswer, tickSlots, eggOf, themes]
  );

  const buySpeed = useCallback(() => {
    const h = hero.current;
    const cost = SPEED_COST[h.speedLv];
    if (cost === undefined || coins.current < cost) return;
    if (!inSafe(h.z)) return say('อัปความเร็วได้ในฐานปลอดภัยเท่านั้น', 'bad');
    coins.current -= cost;
    h.speedLv++;
    gsfx.levelUp();
    say(`ความเร็ววิ่ง Lv ${h.speedLv}!`, 'ok');
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      if ((e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') && hero.current.answering < 0) {
        e.preventDefault();
        steal();
      }
      if (e.key === 'q' || e.key === 'Q') buySpeed();
      if (e.key === 'b' || e.key === 'B') setBagOpen((v) => !v);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [steal, buySpeed]);

  /* ---------- ฟักไข่ ---------- */
  const startHatch = useCallback((p: PetInfo) => {
    setHatch({ ...p, at: Date.now() });
    setHatchPhase(0);
  }, []);
  useEffect(() => {
    if (!hatch) return;
    const a = setTimeout(() => (setHatchPhase(1), gsfx.tap()), 700);
    const b = setTimeout(() => (setHatchPhase(2), gsfx.fanfare()), 1300);
    const c = setTimeout(() => setHatch(null), 4600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, [hatch]);

  /* ---------- ส่งคะแนน ---------- */
  const synced = useRef(-1);
  const doSync = useCallback(
    (force = false) => {
      if (!sync) return;
      if (!force && score.current === synced.current) return;
      synced.current = score.current;
      sync(score.current, { eggs: stats.current.eggs, rare: stats.current.rare });
    },
    [sync]
  );

  /* ---------- วงรอบเกม ---------- */
  useEffect(() => {
    if (over || !host.current) return;
    let w: EggWorld;
    try {
      w = new EggWorld(host.current, seed, themes);
    } catch {
      setFailed3d(true);
      return;
    }
    worldRef.current = w;
    const meRig = makeChar(me.nickname, true);
    w.scene.add(meRig.root);
    let raf = 0;
    let last = performance.now();
    let hudAt = 0;
    let sendAt = 0;
    let beatAt = 0;
    let lastKey = '';
    const noop = () => undefined;

    const clampPos = (o: { x: number; z: number }, nx: number, nz: number) => {
      // ชนต้นไม้/หิน: ดันออกตามแนวรัศมี จะได้ไถลผ่านไม่ติดค้าง
      for (const ob of w.obstacles) {
        const dx = nx - ob.x;
        const dz = nz - ob.z;
        const d = Math.hypot(dx, dz);
        const min = ob.r + 0.45;
        if (d < min && d > 0.0001) {
          nx = ob.x + (dx / d) * min;
          nz = ob.z + (dz / d) * min;
        }
      }
      o.x = Math.max(-HALF_W + 0.8, Math.min(HALF_W - 0.8, nx));
      o.z = Math.max(END_Z + 1, Math.min(SAFE_Z - 1, nz));
    };

    const syncEggs = () => {
      if (layout.current.ep !== ep.current) {
        layout.current = { ep: ep.current, pos: slotLayout(seed, ep.current, w.obstacles) };
        shown.current.clear();
        for (let k = 0; k < N_SLOTS; k++) w.setEgg(k, { x: 0, z: 0 }, 0, null);
      }
      slots.current.forEach((s, k) => {
        const want = s.st === 'idle' ? `${ep.current}:${s.gen}` : '';
        if (shown.current.get(k) === want) return;
        shown.current.set(k, want);
        const eg = eggOf(k, ep.current, s.gen);
        w.setEgg(k, layout.current.pos[k], eg.tier, want ? eg.type : null, eg.size);
      });
    };

    const ghostRig = (idx: number) => {
      const r = makeChar(nameOf(idx), false);
      w.scene.add(r.root);
      return r;
    };
    const parse = (str: string) => (str ? str.split(':').map(Number) : []);

    const deposit = (c: Carry, who: 'me' | Bot) => {
      const s = slots.current[c.k];
      const tt = now();
      if (c.ep === ep.current && s.gen === c.gen && s.st === 'held') Object.assign(s, { st: 'gone', t: tt, until: 0 });
      w.addToNest(themes[c.tier], c.type, c.kg);
      if (who !== 'me') {
        who.score += c.kg;
        return;
      }
      if (c.ep === ep.current) net.send('dep', { k: c.k, ep: c.ep, gen: c.gen, i: myIdx, t: tt });
      score.current += c.kg;
      coins.current += c.kg;
      stats.current.eggs++;
      if (EGG_SLOTS_RARITY[c.type] !== 'common') stats.current.rare++;
      const pet = { b: themes[c.tier], t: c.type, kg: c.kg };
      setBag((b) => [pet, ...b].slice(0, 300));
      setHeld((x) => (x >= 0 ? x + 1 : x));
      startHatch(pet);
      coach.hit('run');
      doSync();
    };

    const step = (dt: number, t: number) => {
      const h = hero.current;
      const tnow = Date.now();
      tickSlots();
      const stunned = h.stun > tnow;
      const d = h.answering >= 0 || stunned ? { x: 0, y: 0 } : dir();
      h.moving = Math.abs(d.x) + Math.abs(d.y) > 0.05;
      h.dx = d.x;
      const sp = (BASE_SPEED + h.speedLv * SPEED_STEP) * (h.carry ? CARRY_MUL : 1);
      if (h.moving) clampPos(h, h.x + d.x * sp * dt, h.z + d.y * sp * dt);
      const safe = inSafe(h.z);

      // พาไข่ถึงฐาน = ฟักไข่
      if (h.carry && safe) {
        const c = h.carry;
        h.carry = null;
        if (chase.current) chase.current.st = 'return';
        deposit(c, 'me');
      }
      // ถือนานเกิน: ไข่กลับที่เดิม
      if (h.carry && tnow - h.holdAt > HOLD_MAX_MS - 1000) {
        const c = h.carry;
        if (c.ep === ep.current) {
          net.send('back', { k: c.k, ep: c.ep, gen: c.gen, i: myIdx });
          const s = slots.current[c.k];
          if (s.st === 'held' && s.by === myIdx) Object.assign(s, { st: 'idle', by: -1 });
        }
        dropMine('ไข่กลับที่เดิมแล้ว ลองใหม่นะ', 'wave');
      }

      // บอสไล่ตาม (คิดในเครื่องของคนที่ถือไข่) เข้าฐานไม่ได้
      const c = chase.current;
      if (c) {
        const home = bossHome(c.tier);
        if (c.st === 'wake' && tnow - c.at > BOSS_WAKE_MS) c.st = 'chase';
        if (c.st === 'chase') {
          if (!h.carry || safe) c.st = 'return';
          else {
            const dx = h.x - c.x;
            const dz = h.z - c.z;
            const dd = Math.hypot(dx, dz) || 1;
            const v = Math.min(dd, c.speed * dt);
            c.x += (dx / dd) * v;
            c.z = Math.min(-0.8, c.z + (dz / dd) * v);
            if (dd < CATCH_R && h.carry) {
              const cc = h.carry;
              if (cc.ep === ep.current) {
                net.send('back', { k: cc.k, ep: cc.ep, gen: cc.gen, i: myIdx });
                const s = slots.current[cc.k];
                if (s.st === 'held' && s.by === myIdx) Object.assign(s, { st: 'idle', by: -1 });
              }
              stats.current.caught++;
              dropMine('โดนบอสจับ! ไข่กลับไปที่เดิมแล้ว');
              h.stun = tnow + STUN_MS;
              // กระเด็นออกจากบอสนิดหนึ่ง
              clampPos(h, h.x + (dx / dd) * 3.5, h.z + (dz / dd) * 3.5);
              gsfx.hurt();
            }
          }
        }
        if (c.st === 'return') {
          const dx = home.x - c.x;
          const dz = home.z - c.z;
          const dd = Math.hypot(dx, dz);
          if (dd < 0.5) chase.current = null;
          else {
            const v = Math.min(dd, 6 * dt);
            c.x += (dx / dd) * v;
            c.z += (dz / dd) * v;
          }
        }
      }

      // ผู้เล่นคนอื่น
      ghosts.current.forEach((g, idx) => {
        if (Date.now() - g.seen > 12000) {
          if (g.rig) w.scene.remove(g.rig.root);
          ghosts.current.delete(idx);
          return;
        }
        const k = Math.min(1, dt * 12);
        const ox = g.x;
        const oz = g.z;
        g.x += (g.tx - g.x) * k;
        g.z += (g.tz - g.z) * k;
        g.moving = Math.hypot(g.x - ox, g.z - oz) > 0.01;
        g.dx = g.x - ox;
        if (!g.rig) g.rig = ghostRig(idx);
        const pl = info?.players[idx];
        if (pl && !g.rig.img) setCharImage(g.rig, avatarSprite(pl.avatar, pl.gear, noop));
        g.rig.root.position.set(g.x, 0, g.z);
        const [cb, ct, cs] = parse(g.carry);
        const okEgg = cb >= 0 && cb < BIOMES.length && ct >= 0 && ct < 11;
        setCarry(g.rig, okEgg ? cb : -1, ct || 0, Math.min(2, cs || 1));
        const [pb, pt, pk] = parse(g.pet);
        setPet(g.rig, pb >= 0 && pb < BIOMES.length && pt >= 0 && pt < 11 ? pb : -1, pt || 0, Math.min(1000, pk || 1));
        g.rig.quiz.visible = g.q;
        poseChar(g.rig, g.moving, t, false, g.dx * 30);
      });

      // เพื่อนจำลอง: วิ่งไปขโมยไข่ไบโอม 1-2 แล้วกลับฐาน
      for (const b of bots.current) {
        if (!b.rig) {
          b.rig = makeChar(b.name, false);
          w.scene.add(b.rig.root);
        }
        if (!b.rig.img) setCharImage(b.rig, avatarSprite(b.avatar, undefined, noop));
        if (b.carry) {
          b.tx = b.x * 0.5;
          b.tz = SAFE_Z * 0.4;
          if (inSafe(b.z)) {
            deposit(b.carry, b);
            b.carry = null;
            b.next = tnow + 8000 + Math.random() * 8000;
          }
        } else if (tnow > b.next && layout.current.ep === ep.current) {
          const free = slots.current.map((s, k) => (s.st === 'idle' && k !== hero.current.answering && k < SLOTS * 2 ? k : -1)).filter((k) => k >= 0);
          if (free.length) {
            const k = free[(b.idx * 7 + Math.floor(tnow / 20000)) % free.length];
            const p = layout.current.pos[k];
            b.tx = p.x;
            b.tz = p.z;
            if (Math.hypot(b.x - p.x, b.z - p.z) < 1.5) {
              const s = slots.current[k];
              applyTake(k, ep.current, s.gen, b.idx, now());
              b.carry = { k, ep: ep.current, gen: s.gen, ...eggOf(k, ep.current, s.gen) };
            }
          }
        } else if (Math.hypot(b.tx - b.x, b.tz - b.z) < 1) {
          b.tx = (Math.random() * 2 - 1) * 12;
          b.tz = 3 + Math.random() * (SAFE_Z - 6);
        }
        const dx = b.tx - b.x;
        const dz = b.tz - b.z;
        const dd = Math.hypot(dx, dz);
        const moving = dd > 0.3;
        if (moving) {
          const v = Math.min(dd, 6 * dt);
          b.x += (dx / dd) * v;
          b.z += (dz / dd) * v;
        }
        b.rig.root.position.set(b.x, 0, b.z);
        setCarry(b.rig, b.carry ? themes[b.carry.tier] : -1, b.carry?.type || 0, b.carry ? eggVisual(b.carry.tier, b.carry.type, b.carry.size) : 1);
        poseChar(b.rig, moving, t, false, dx);
      }

      // ตัวเรา
      if (!meRig.img) setCharImage(meRig, avatarSprite(me.avatar, me.gear, noop));
      meRig.root.position.set(h.x, 0, h.z);
      setCarry(meRig, h.carry ? themes[h.carry.tier] : -1, h.carry?.type || 0, h.carry ? eggVisual(h.carry.tier, h.carry.type, h.carry.size) : 1);
      const hp = heldRef.current;
      setPet(meRig, hp ? hp.b : -1, hp?.t || 0, hp?.kg || 1);
      meRig.quiz.visible = h.answering >= 0;
      poseChar(meRig, h.moving, t, stunned, h.dx);

      // บอส: ของเรา > ที่เพื่อนส่งมา > นอนที่เดิม
      w.bosses.forEach((rig, tier) => {
        let pos: { x: number; z: number; run: boolean } | null = null;
        if (c && c.tier === tier) pos = { x: c.x, z: c.z, run: c.st !== 'wake' };
        else
          for (const g of ghosts.current.values())
            if (g.boss && g.boss[0] === tier) {
              pos = { x: g.boss[1], z: g.boss[2], run: true };
              break;
            }
        if (pos) {
          const ox = rig.root.position.x;
          const oz = rig.root.position.z;
          rig.root.position.x += (pos.x - ox) * Math.min(1, dt * 14);
          rig.root.position.z += (pos.z - oz) * Math.min(1, dt * 14);
          const mx = rig.root.position.x - ox;
          const mz = rig.root.position.z - oz;
          if (Math.hypot(mx, mz) > 0.001) rig.root.rotation.y = Math.atan2(mx, mz);
        } else {
          rig.root.position.set(rig.home.x, 0, rig.home.z);
          rig.root.rotation.y = 0;
        }
        setBossAwake(rig, !!pos);
        poseBoss(rig, t, !!pos?.run);
      });
      syncEggs();
      w.animateEggs(t);
    };

    const loop = (nowMs: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (nowMs - last) / 1000);
      last = nowMs;
      if (deadline && Date.now() >= deadline) {
        stopAnswer();
        setOver(true);
        doSync(true);
        gsfx.fanfare();
        return;
      }
      const t = nowMs / 1000;
      step(dt, t);
      const h = hero.current;
      w.render(h.x, h.z);

      const c = chase.current;
      const cr = h.carry;
      const carryStr = cr ? `${themes[cr.tier]}:${cr.type}:${eggVisual(cr.tier, cr.type, cr.size).toFixed(2)}` : '';
      const hp = heldRef.current;
      const petStr = hp ? `${hp.b}:${hp.t}:${hp.kg}` : '';
      const key = `${Math.round(h.x * 4)}:${Math.round(h.z * 4)}:${carryStr}:${petStr}:${h.answering >= 0 ? 1 : 0}:${score.current}:${c ? 1 : 0}`;
      if (info && ((nowMs - sendAt > 120 && (key !== lastKey || c)) || nowMs - beatAt > 2000)) {
        sendAt = nowMs;
        beatAt = nowMs;
        lastKey = key;
        net.send('pos', {
          i: myIdx,
          x: Math.round(h.x * 10) / 10,
          z: Math.round(h.z * 10) / 10,
          c: carryStr,
          p: petStr,
          q: h.answering >= 0 ? 1 : 0,
          g: score.current,
          b: c ? [c.tier, Math.round(c.x * 10) / 10, Math.round(c.z * 10) / 10] : null,
        });
      }

      if (nowMs - hudAt > 150) {
        hudAt = nowMs;
        const tnow = Date.now();
        const k = h.answering < 0 && !h.carry ? nearSlot() : -1;
        let nearSt: typeof hud.nearSt = 'none';
        if (k >= 0) {
          const s = slots.current[k];
          nearSt = s.st === 'idle' ? 'ok' : s.st === 'held' ? 'held' : 'busy';
        }
        const nextReset = t0 + (ep.current + 1) * reset * 1000;
        setHud({
          score: score.current,
          coins: coins.current,
          left: deadline ? deadline - tnow : 0,
          resetLeft: nextReset - now(),
          near: k,
          nearSt,
          safe: inSafe(h.z),
          carry: !!h.carry,
          chased: !!h.carry && !!c && c.st !== 'return',
          stun: Math.max(0, h.stun - tnow),
          lv: h.speedLv,
          tier: tierAt(h.z),
        });
        // Top 3 (ทีม = รวมคะแนนทั้งทีม)
        const rows = [
          { idx: myIdx, name: me.nickname, v: score.current, me: true },
          ...Array.from(ghosts.current.values()).map((g) => ({ idx: g.idx, name: nameOf(g.idx), v: g.score, me: false })),
          ...bots.current.map((b) => ({ idx: b.idx, name: b.name, v: b.score, me: false })),
        ];
        let list: { name: string; v: number; me: boolean; color: string }[];
        if (teams > 0 && info) {
          const sum = new Map<number, { v: number; me: boolean }>();
          rows.forEach((r) => {
            const o = ownerOf(info, info.players[r.idx]?.id || '');
            const cur = sum.get(o) || { v: 0, me: false };
            sum.set(o, { v: cur.v + r.v, me: cur.me || r.me });
          });
          list = Array.from(sum.entries()).map(([o, s]) => ({ name: TEAM_NAMES[o] || `ทีม ${o + 1}`, v: s.v, me: s.me, color: TEAM_COLORS[o] }));
        } else list = rows.map((r) => ({ name: r.name, v: r.v, me: r.me, color: colorOf(r.idx) }));
        setBoard(list.sort((a, b) => b.v - a.v).slice(0, 3));
      }
    };

    raf = requestAnimationFrame(loop);
    const sv = setInterval(() => doSync(), 3000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(sv);
      shown.current.clear();
      layout.current = { ep: -1, pos: [] };
      ghosts.current.forEach((g) => (g.rig = null));
      bots.current.forEach((b) => (b.rig = null));
      worldRef.current = null;
      w.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, deadline, doSync, net.send]);

  useEffect(() => () => doSync(true), [doSync]);
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 2200);
    return () => clearTimeout(t);
  }, [banner]);
  useEffect(() => {
    if (!runAlert) return;
    const t = setTimeout(() => setRunAlert(0), 1800);
    return () => clearTimeout(t);
  }, [runAlert]);
  const movedOnce = useRef(false);
  useEffect(() => {
    const iv = setInterval(() => {
      if (!movedOnce.current && hero.current.moving) {
        movedOnce.current = true;
        coach.hit('move');
      }
    }, 300);
    return () => clearInterval(iv);
  }, [coach]);

  const nearEgg = hud.near >= 0 && slots.current[hud.near] ? eggOf(hud.near, ep.current, slots.current[hud.near].gen) : null;
  const cost = SPEED_COST[hud.lv];
  const [top1, top2, top3] = board;
  const totalKg = bag.reduce((a, p) => a + p.kg, 0);
  const TopPill = ({ r, rank }: { r?: { name: string; v: number; me: boolean; color: string }; rank: number }) =>
    r ? (
      <div className="eg-top" data-rank={rank} data-me={r.me} style={{ ['--tc' as string]: r.color }}>
        {rank === 1 && <Crown className="eg-top-crown" />}
        <em>Top {rank}</em>
        <b>{r.me && teams === 0 ? 'ฉัน' : r.name}</b>
        <small>{r.v.toLocaleString('th-TH')} คะแนน</small>
      </div>
    ) : (
      <div className="eg-top" data-rank={rank} data-empty="true" />
    );
  const hatchLook = hatch ? petLook(hatch.b, hatch.t) : null;

  return (
    <div className="mb gm-root eg" ref={rootRef} data-over={over} data-dock={answering >= 0} data-chased={hud.chased}>
      <CoachArrow coach={coach} root={rootRef} />
      <div className="gm-main">
        <div className="mb-hud">
          <span className="cf-chip eg-score">
            <Weight size={17} /> <b>{hud.score.toLocaleString('th-TH')}</b> คะแนน
          </span>
          <span className="cf-chip eg-coins" title="ใช้อัปความเร็ว">
            <Zap size={16} /> {hud.coins.toLocaleString('th-TH')}
          </span>
          <span className="cf-chip eg-reset" title="ไข่ทุกไบโอมเกิดใหม่">
            <RefreshCw size={15} /> ไข่ใหม่ {fmtLeft(hud.resetLeft)}
          </span>
          <span className="flex-1" />
          {deadline && (
            <span className="cf-chip cf-time" data-urgent={hud.left < 30000}>
              {fmtLeft(hud.left)}
            </span>
          )}
        </div>

        <div className="mb-stage eg-stage" {...handlers}>
          <div ref={host} className="eg-3d" style={{ position: 'absolute', inset: 0 }} aria-label="แผนที่ขโมยไข่ ใช้ปุ่มลูกศรหรือลากนิ้วเพื่อเดิน กด E เพื่อขโมยไข่" />
          {failed3d && <div className="eg-fail">เครื่องนี้เปิดภาพ 3 มิติไม่ได้ ลองเปิดด้วย Chrome หรือ Safari รุ่นใหม่</div>}
          <div className="eg-vignette" aria-hidden="true" />

          <div className="eg-tops" data-ui>
            <TopPill r={top2} rank={2} />
            <TopPill r={top1} rank={1} />
            <TopPill r={top3} rank={3} />
          </div>

          {hud.tier >= 0 && !hud.chased && (
            <div className="eg-biome" style={{ ['--bc' as string]: BIOMES[themes[hud.tier]].ground }}>
              ไบโอม {hud.tier + 1} · {BIOMES[themes[hud.tier]].name}
            </div>
          )}

          {joy && (
            <div className="mb-joy" style={{ left: joy.ox, top: joy.oy }} aria-hidden="true">
              <span className="mb-joy-knob" style={{ transform: `translate(${joy.x}px, ${joy.y}px)` }} />
            </div>
          )}

          {nearEgg && answering < 0 && (
            <button type="button" className="eg-steal" data-ui disabled={hud.nearSt !== 'ok' || hud.stun > 0} onClick={steal} style={{ ['--rc' as string]: RARITY[EGG_SLOTS_RARITY[nearEgg.type]].color }}>
              <Hand className="w-5 h-5" />
              <span>
                <b>{hud.nearSt === 'ok' ? 'ขโมยไข่!' : hud.nearSt === 'held' ? 'มีคนถือไปแล้ว' : 'รอรอบไข่ใหม่'}</b>
                <small>
                  {BIOMES[nearEgg.b].eggs[nearEgg.type].name} · {RARITY[EGG_SLOTS_RARITY[nearEgg.type]].name} · ~{nearEgg.kg} kg
                </small>
              </span>
            </button>
          )}

          {hud.carry && (
            <div className="eg-home" data-ui>
              <Siren className="w-5 h-5" /> วิ่งลงกลับฐานสีเขียว!
            </div>
          )}

          {hud.stun > 0 && (
            <div className="ti-status" data-kind="dizzy">
              โดนบอสจับ!
            </div>
          )}

          {runAlert > 0 && (
            <div className="eg-run" key={runAlert}>
              วิ่ง!!
              <small>บอสตื่นแล้ว</small>
            </div>
          )}

          {banner && (
            <div className="td-banner" data-kind={banner.kind} key={banner.at}>
              {banner.text}
            </div>
          )}

          {hatch && hatchLook && (
            <button type="button" className="eg-hatch" data-ui data-phase={hatchPhase} onClick={() => setHatch(null)} style={{ ['--rc' as string]: RARITY[hatchLook.rarity].color }} key={hatch.at}>
              <span className="eg-hatch-card">
                <em>ฟักไข่!</em>
                <span className="eg-hatch-stage">
                  {hatchPhase < 2 ? (
                    <span className="eg-hatch-egg">
                      <EggArt b={hatch.b} t={hatch.t} size={96} crack={hatchPhase} />
                    </span>
                  ) : (
                    <span className="eg-hatch-pet">
                      <PetArt b={hatch.b} t={hatch.t} size={130} />
                    </span>
                  )}
                </span>
                {hatchPhase >= 2 && (
                  <span className="eg-hatch-info">
                    <b>{hatchLook.name}</b>
                    <span className="eg-rar" style={{ ['--rc' as string]: RARITY[hatchLook.rarity].color }}>
                      {RARITY[hatchLook.rarity].name}
                    </span>
                    <span className="eg-hatch-kg">
                      {hatch.kg.toLocaleString('th-TH')} kg · +{hatch.kg.toLocaleString('th-TH')} คะแนน
                    </span>
                  </span>
                )}
              </span>
            </button>
          )}

          {bagOpen && (
            <div className="eg-bag" data-ui>
              <div className="eg-bag-head">
                <Backpack className="w-5 h-5" />
                <b>กระเป๋าสัตว์ ({bag.length})</b>
                <span className="flex-1" />
                <span className="eg-bag-total">
                  แต้มรวม <b>{totalKg.toLocaleString('th-TH')}</b>
                </span>
                <button type="button" className="eg-bag-x" onClick={() => setBagOpen(false)} aria-label="ปิดกระเป๋า">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {bag.length ? (
                <div className="eg-bag-grid">
                  {bag.map((p, i) => {
                    const l = petLook(p.b, p.t);
                    return (
                      <button key={i} type="button" className="eg-pet" data-on={held === i} style={{ ['--rc' as string]: RARITY[l.rarity].color }} onClick={() => (gsfx.pick(), setHeld((x) => (x === i ? -1 : i)))}>
                        <PetArt b={p.b} t={p.t} size={56} />
                        <b>{l.name}</b>
                        <small>{p.kg.toLocaleString('th-TH')} kg</small>
                        <i>{held === i ? 'กำลังถือ' : 'ถือโชว์'}</i>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="eg-bag-empty">ยังไม่มีสัตว์ ขโมยไข่แล้วพากลับฐานเพื่อฟัก</p>
              )}
            </div>
          )}
        </div>

        <div className="mb-bar eg-bar">
          <button type="button" className="ti-item eg-bagbtn" data-has={bag.length > 0} disabled={over} onClick={() => (gsfx.tap(), setBagOpen((v) => !v))} style={{ ['--ic' as string]: '#7c5cff' }} title="กระเป๋าสัตว์ (กด B)">
            <span className="tw-item-ic">
              <Backpack className="w-6 h-6" />
            </span>
            <span>
              <b>กระเป๋า</b>
              <small>{bag.length} ตัว</small>
            </span>
          </button>
          <button type="button" className="ti-item eg-speed" data-has={hud.safe && cost !== undefined && hud.coins >= cost} disabled={over || cost === undefined || hud.coins < cost || !hud.safe} onClick={buySpeed} style={{ ['--ic' as string]: '#ff9a3d' }} title="อัปความเร็ว (กด Q)">
            <span className="tw-item-ic">
              <Gauge className="w-6 h-6" />
            </span>
            <span>
              <b>{cost === undefined ? 'ความเร็วสูงสุด' : `ความเร็ว Lv ${hud.lv + 1}`}</b>
              <small>{cost === undefined ? `Lv ${hud.lv}` : `${cost} เหรียญ${hud.safe ? '' : ' · ซื้อในฐาน'}`}</small>
            </span>
            <em>{hud.lv}</em>
          </button>
          <div className="eg-legend" aria-label="ความหายากของไข่">
            {(['common', 'rare', 'legend', 'secret'] as const).map((r) => (
              <span key={r} style={{ ['--rc' as string]: RARITY[r].color }}>
                <i />
                {RARITY[r].name}
              </span>
            ))}
          </div>
          {preview && <span className="tw-note">ทดลองเล่น: มีเพื่อนจำลอง 2 คน</span>}
        </div>
      </div>

      <QuestionDock
        engine={engine}
        open={answering >= 0 && !over}
        title="ขโมยไข่"
        hint="ตอบถูกก่อน ได้ไข่ก่อน! ผิดได้ลองข้อใหม่"
        icon={<Egg className="w-5 h-5" />}
        color="#7c5cff"
        streak={streak}
        rewardText={() => 'ถูก! ได้ไข่แล้ว รีบวิ่ง!'}
        onAnswered={onAnswered}
        onClose={stopAnswer}
      />

      {over && (
        <div className="gm-over">
          <div className="gm-over-card">
            <p className="gm-over-tag">หมดเวลา!</p>
            <div className="gm-over-big">{hud.score.toLocaleString('th-TH')}</div>
            <p className="font-bold">คะแนน (น้ำหนักสัตว์รวม kg)</p>
            <div className="gm-over-stats">
              <span>
                <b>{stats.current.eggs}</b>ไข่ที่ฟักได้
              </span>
              <span>
                <b>{stats.current.rare}</b>หายากขึ้นไป
              </span>
            </div>
            <p className="gm-over-wait">{preview ? 'นี่คือการทดลองเล่น' : 'กำลังรวมคะแนน รอประกาศผลนะ'}</p>
            {onLeave && (
              <button type="button" className="l5g-btn l5g-btn-ghost l5g-btn-sm mt-3" onClick={onLeave}>
                <LogOut className="w-4 h-4" /> ออกจากห้อง
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EggGame;
