'use client';

import '../games.css';
import '../games-live.css';
import '../brawl-fish.css';
import '../world.css';
import './egg.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Crown, Egg, Gauge, Hand, LogOut, Siren, Zap } from 'lucide-react';
import { QuestionDock } from '../QuestionPad';
import { CoachArrow, DOCK_CHOICES, useCoach } from '../Coach';
import type { GameProps } from '../types';
import { gsfx } from '@/lib/game-creator/gsound';
import type { LiveOutcome } from '@/lib/game-creator/live-client';
import { EGG_SLOTS_RARITY, RARITY, SPEED_COST, pickEggType, takeWins } from '@/lib/game-creator/eggValues';
import { TEAM_COLORS, TEAM_NAMES, fmtLeft, hashStr, ownerOf, rng, useMoveInput, useWorldNet, type NetMsg } from '../worldKit';
import { BIOMES } from './biomes';
import { EggWorld, R_OUT, SAFE_R, SLOTS, WEDGE, biomeAt, bossHome, makeChar, poseBoss, poseChar, setBossAwake, setCarry, slotBias, slotPos, type CharRig } from './scene';

const N_SLOTS = BIOMES.length * SLOTS;
const BASE_SPEED = 7.5;
const SPEED_STEP = 1.0;
const CARRY_MUL = 0.82;
const BOSS_SPEED = 7.1;
const BOSS_WAKE_MS = 1000;
const CATCH_R = 1.7;
const STUN_MS = 1600;
const RESPAWN_MS = 7000;
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
interface Chase {
  b: number;
  x: number;
  z: number;
  yaw: number;
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
  yaw: number;
  moving: boolean;
  carry: string;
  q: boolean;
  score: number;
  boss: [number, number, number] | null;
  seen: number;
  rig: CharRig | null;
}
interface Bot {
  idx: number;
  name: string;
  x: number;
  z: number;
  yaw: number;
  tx: number;
  tz: number;
  carry: number;
  score: number;
  next: number;
  rig: CharRig | null;
}

export function EggGame({ engine, deadline, sync, me, preview, onLeave, world: info, startScore = 0 }: GameProps) {
  const host = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const now = useCallback(() => (info ? info.now() : Date.now()), [info]);
  const myIdx = info ? Math.max(0, info.players.findIndex((p) => p.id === info.myId)) : 0;
  const teams = info?.teams || 0;
  const seed = useRef(hashStr(`${info?.roomId || 'preview'}:${info?.round || 0}`)).current;
  const colorOf = (idx: number) => TEAM_COLORS[info ? ownerOf(info, info.players[idx]?.id || '') : idx % TEAM_COLORS.length] || TEAM_COLORS[0];
  const nameOf = (idx: number) => info?.players[idx]?.nickname || bots.current.find((b) => b.idx === idx)?.name || 'เพื่อน';

  /** ชนิดไข่ของช่องนี้ในรอบ gen (ทุกเครื่องคิดได้ตรงกันโดยไม่ต้องส่ง) */
  const typeOf = useCallback(
    (k: number, gen: number) => {
      const r = rng(hashStr(`${seed}:${k}:${gen}`));
      return pickEggType(slotBias(k % SLOTS, r()), r());
    },
    [seed]
  );

  const slots = useRef<Slot[]>(Array.from({ length: N_SLOTS }, () => ({ gen: 0, st: 'idle', by: -1, t: 0, until: 0 })));
  const ghosts = useRef(new Map<number, Ghost>());
  const bots = useRef<Bot[]>([]);
  const worldRef = useRef<EggWorld | null>(null);
  const shown = useRef(new Map<number, string>()); // ไข่ที่วาดอยู่ (key -> gen:type)

  const spawn = (() => {
    const a = rng(hashStr(`spawn:${myIdx}`))() * Math.PI * 2;
    return { x: Math.cos(a) * 5, z: Math.sin(a) * 5 };
  })();
  const hero = useRef({ x: spawn.x, z: spawn.z, yaw: 0, moving: false, carry: -1, carryType: 0, stun: 0, answering: -1, speedLv: 0, holdAt: 0 });
  const chase = useRef<Chase | null>(null);
  const score = useRef(Math.max(0, startScore));
  const coins = useRef(Math.max(0, startScore));
  const stats = useRef({ eggs: 0, rare: 0, caught: 0 });

  const [hud, setHud] = useState({ score: score.current, coins: coins.current, left: 0, near: -1, nearSt: 'none' as 'none' | 'ok' | 'held' | 'busy', inSafe: true, carry: -1, chased: false, stun: 0, lv: 0, biome: -1 });
  const [board, setBoard] = useState<{ name: string; v: number; me: boolean; color: string }[]>([]);
  const [over, setOver] = useState(false);
  const [answering, setAnswering] = useState(-1);
  const [streak, setStreak] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'ok' | 'bad' | 'wave'; at: number } | null>(null);
  const [runAlert, setRunAlert] = useState(0);
  const [failed3d, setFailed3d] = useState(false);
  const say = (text: string, kind: 'ok' | 'bad' | 'wave') => setBanner({ text, kind, at: Date.now() });
  const { joy, handlers, dir } = useMoveInput(!over);

  const carrying = hud.carry >= 0;
  const coach = useCoach(
    [
      { id: 'move', target: '.eg-stage', text: 'ลากนิ้วบนจอ หรือกดลูกศร วิ่งไปหาไข่' },
      { id: 'steal', target: '.eg-steal', text: 'ถึงไข่แล้ว กดขโมย!', when: () => hud.nearSt === 'ok', doneIf: () => answering >= 0 || carrying },
      { id: 'answer', target: DOCK_CHOICES, text: 'เลือกตัวเลือก ตอบถูกได้ไข่', when: () => answering >= 0, doneIf: () => carrying },
      { id: 'run', target: '.eg-home', text: 'บอสตื่นแล้ว! วิ่งกลับฐานสีเขียว', when: () => carrying },
      { id: 'speed', target: '.eg-speed', text: 'ใช้เหรียญอัปความเร็ววิ่ง', when: () => hud.inSafe && hud.coins >= SPEED_COST[hud.lv], optional: true },
    ],
    { loops: 1, active: !over }
  );

  /* ---------- สถานะช่องไข่ (กติกาเดียวกันทุกเครื่อง) ---------- */
  const tickSlots = useCallback(() => {
    const t = now();
    slots.current.forEach((s) => {
      if (s.st === 'gone' && t > s.until) Object.assign(s, { st: 'idle', by: -1, gen: s.gen + 1 });
      else if (s.st === 'held' && t > s.until) Object.assign(s, { st: 'idle', by: -1 });
    });
  }, [now]);

  /* ---------- ไข่ที่ถือหลุดมือ (โดนแย่ง/โดนจับ) ---------- */
  const dropMine = useCallback((why: string, kind: 'bad' | 'wave' = 'bad') => {
    const h = hero.current;
    h.carry = -1;
    if (chase.current) chase.current.st = 'return';
    say(why, kind);
  }, []);
  const cancelAnswer = useRef<(why: string) => void>(() => undefined);

  /** ช่อง k ถูกคนลำดับ i ขโมยตอนเวลา t (ใครเวลาน้อยกว่าได้ไป) */
  const applyTake = useCallback(
    (k: number, gen: number, i: number, t: number) => {
      const s = slots.current[k];
      if (!s || s.gen !== gen || s.st === 'gone') return;
      if (s.st === 'held' && s.by !== i) {
        if (!takeWins(t, i, s.t, s.by)) return;
        if (s.by === myIdx && hero.current.carry === k) dropMine(`ไข่ของคุณถูก ${i === myIdx ? 'คุณ' : nameOf(i)} ขโมยไปได้ก่อน`);
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
    if (m.e === 'pos') {
      const clamp = (v: unknown) => Math.max(-R_OUT, Math.min(R_OUT, Number(v) || 0));
      const g = ghosts.current.get(i);
      const bs = Array.isArray(p.b) && p.b.length === 3 ? ([Number(p.b[0]), clamp(p.b[1]), clamp(p.b[2])] as [number, number, number]) : null;
      const patch = { tx: clamp(p.x), tz: clamp(p.z), yaw: Number(p.y) || 0, carry: typeof p.c === 'string' ? p.c.slice(0, 8) : '', q: p.q === 1, score: Math.max(0, Number(p.g) || 0), boss: bs && bs[0] >= 0 && bs[0] < BIOMES.length ? bs : null, seen: Date.now() };
      if (g) Object.assign(g, patch);
      else ghosts.current.set(i, { idx: i, x: patch.tx, z: patch.tz, moving: false, rig: null, ...patch });
    } else if (m.e === 'take') {
      applyTake(Number(p.k), Number(p.gen), i, t);
    } else if (m.e === 'back') {
      const s = slots.current[Number(p.k)];
      if (s && s.gen === Number(p.gen) && s.st === 'held' && s.by === i) Object.assign(s, { st: 'idle', by: -1 });
    } else if (m.e === 'dep') {
      const k = Number(p.k);
      const s = slots.current[k];
      if (!s || s.gen !== Number(p.gen)) return;
      Object.assign(s, { st: 'gone', by: i, t, until: t + RESPAWN_MS });
      worldRef.current?.addToNest(Math.floor(k / SLOTS), typeOf(k, s.gen));
    } else if (m.e === 'hello') {
      const alive = [myIdx, ...Array.from(ghosts.current.keys())].filter((x) => x !== i);
      if (Math.min(...alive) !== myIdx) return;
      setTimeout(() => net.send('snap', { i: myIdx, s: slots.current.map((s) => [s.gen, s.st, s.by, s.t, s.until]) }), 150 + Math.random() * 300);
    } else if (m.e === 'snap' && !snapDone.current) {
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
    bots.current = [1, 2].map((idx) => ({ idx, name: `เพื่อนจำลอง ${idx}`, x: idx * 3, z: -3, yaw: 0, tx: 0, tz: 0, carry: -1, score: 0, next: Date.now() + 6000 + idx * 5000, rig: null }));
  }, [info]);

  /* ---------- ขโมยไข่ ---------- */
  const nearSlot = () => {
    const h = hero.current;
    let best = -1;
    let bd = REACH;
    const b = biomeAt(h.x, h.z);
    if (b < 0) return -1;
    for (let kk = 0; kk < SLOTS; kk++) {
      const p = slotPos(b, kk);
      const d = Math.hypot(p.x - h.x, p.z - h.z);
      if (d < bd) {
        bd = d;
        best = b * SLOTS + kk;
      }
    }
    return best;
  };

  const steal = useCallback(() => {
    const h = hero.current;
    if (over || h.answering >= 0 || h.carry >= 0 || h.stun > Date.now()) return;
    tickSlots();
    const k = nearSlot();
    if (k < 0) return;
    const s = slots.current[k];
    if (s.st !== 'idle') return say(s.st === 'held' ? 'มีคนถือไข่ใบนี้ไปแล้ว' : 'ไข่ใบนี้ถูกขโมยไปแล้ว รอไข่ใหม่นะ', 'bad');
    h.answering = k;
    setAnswering(k);
    gsfx.door();
    coach.hit('steal');
    // ทดลองเล่น: บางทีเพื่อนจำลองแย่งตอบถูกก่อน (ให้เห็นว่ามีคนแข่ง)
    if (!info && Math.random() < 0.3) {
      const gen = s.gen;
      setTimeout(() => {
        if (hero.current.answering !== k || slots.current[k].gen !== gen || slots.current[k].st !== 'idle') return;
        const bot = bots.current[0];
        applyTake(k, gen, bot.idx, now());
        bot.carry = k;
        const p = slotPos(Math.floor(k / SLOTS), k % SLOTS);
        bot.x = p.x + 1.2;
        bot.z = p.z;
      }, 5000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, tickSlots, coach, info, applyTake, now]);

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

  const wakeBoss = (k: number, type: number) => {
    const b = Math.floor(k / SLOTS);
    const home = bossHome(b);
    const prev = chase.current;
    const start = prev && prev.b === b ? { x: prev.x, z: prev.z } : home;
    chase.current = { b, x: start.x, z: start.z, yaw: 0, st: 'wake', at: Date.now(), speed: BOSS_SPEED * RARITY[EGG_SLOTS_RARITY[type]].bossBoost };
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
      if (s.st !== 'idle') {
        stopAnswer();
        return say(s.by >= 0 && s.by !== myIdx ? `ไข่ของคุณถูก ${nameOf(s.by)} ขโมยไปได้ก่อน` : 'ไข่ใบนี้หายไปแล้ว', 'bad');
      }
      const t = now();
      Object.assign(s, { st: 'held', by: myIdx, t, until: t + HOLD_MAX_MS });
      net.send('take', { k, gen: s.gen, i: myIdx, t });
      h.carry = k;
      h.carryType = typeOf(k, s.gen);
      h.holdAt = Date.now();
      gsfx.cash();
      const rar = EGG_SLOTS_RARITY[h.carryType];
      say(`ได้${BIOMES[Math.floor(k / SLOTS)].eggs[h.carryType].name} (${RARITY[rar].name})!`, 'ok');
      setTimeout(() => {
        stopAnswer();
        if (hero.current.carry === k) wakeBoss(k, h.carryType);
      }, 700);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now, myIdx, net, stopAnswer, tickSlots, typeOf]
  );

  const buySpeed = useCallback(() => {
    const h = hero.current;
    const cost = SPEED_COST[h.speedLv];
    if (cost === undefined || coins.current < cost) return;
    if (Math.hypot(h.x, h.z) > SAFE_R) return say('อัปความเร็วได้ในฐานปลอดภัยเท่านั้น', 'bad');
    coins.current -= cost;
    h.speedLv++;
    gsfx.levelUp();
    say(`ความเร็ววิ่ง Lv ${h.speedLv}!`, 'ok');
    coach.hit('speed');
  }, [coach]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      if ((e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') && hero.current.answering < 0) {
        e.preventDefault();
        steal();
      }
      if (e.key === 'q' || e.key === 'Q') buySpeed();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [steal, buySpeed]);

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
      w = new EggWorld(host.current, seed);
    } catch {
      setFailed3d(true);
      return;
    }
    worldRef.current = w;
    const meRig = makeChar(colorOf(myIdx), me.nickname, true);
    w.scene.add(meRig.root);
    let raf = 0;
    let last = performance.now();
    let hudAt = 0;
    let sendAt = 0;
    let beatAt = 0;
    let lastKey = '';
    let camAng = -Math.PI / 2;

    // ชนต้นไม้/หิน: ดันออกตามแนวรัศมี จะได้ไถลผ่านไม่ติดค้าง
    const moveTo = (o: { x: number; z: number }, nx: number, nz: number) => {
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
      const r = Math.hypot(nx, nz);
      const max = R_OUT - 1.5;
      o.x = r > max ? (nx / r) * max : nx;
      o.z = r > max ? (nz / r) * max : nz;
    };

    const syncEggs = () => {
      slots.current.forEach((s, k) => {
        const want = s.st === 'idle' ? `${s.gen}:${typeOf(k, s.gen)}` : '';
        if (shown.current.get(k) === want) return;
        shown.current.set(k, want);
        w.setEgg(k, Math.floor(k / SLOTS), want ? typeOf(k, s.gen) : null);
      });
    };

    const ghostRig = (idx: number) => {
      const r = makeChar(colorOf(idx), nameOf(idx), false);
      w.scene.add(r.root);
      return r;
    };

    const step = (dt: number, t: number) => {
      const h = hero.current;
      const tnow = Date.now();
      tickSlots();
      const stunned = h.stun > tnow;
      const d = h.answering >= 0 || stunned ? { x: 0, y: 0 } : dir();
      h.moving = Math.abs(d.x) + Math.abs(d.y) > 0.05;
      const sp = (BASE_SPEED + h.speedLv * SPEED_STEP) * (h.carry >= 0 ? CARRY_MUL : 1);
      // กล้องหันตามไบโอม: ขึ้นจอ = ออกไปทางบอส
      const bNow = biomeAt(h.x, h.z);
      if (bNow >= 0) {
        const want = bNow * WEDGE + WEDGE / 2;
        let da = want - camAng;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        camAng += da * Math.min(1, dt * 2.5);
      }
      if (h.moving) {
        const fx = Math.cos(camAng);
        const fz = Math.sin(camAng);
        const mx = -fz * d.x - fx * d.y;
        const mz = fx * d.x - fz * d.y;
        moveTo(h, h.x + mx * sp * dt, h.z + mz * sp * dt);
        h.yaw = Math.atan2(mx, mz);
      }
      const inSafe = Math.hypot(h.x, h.z) < SAFE_R;

      // พาไข่ถึงฐาน
      if (h.carry >= 0 && inSafe) {
        const k = h.carry;
        const s = slots.current[k];
        const rar = EGG_SLOTS_RARITY[h.carryType];
        const v = RARITY[rar].value;
        score.current += v;
        coins.current += v;
        stats.current.eggs++;
        if (rar !== 'common') stats.current.rare++;
        const tt = now();
        if (s.st === 'held' && s.by === myIdx) {
          Object.assign(s, { st: 'gone', by: myIdx, t: tt, until: tt + RESPAWN_MS });
          net.send('dep', { k, gen: s.gen, i: myIdx, t: tt });
        }
        w.addToNest(Math.floor(k / SLOTS), h.carryType);
        h.carry = -1;
        if (chase.current) chase.current.st = 'return';
        gsfx.fanfare();
        say(`ถึงฐานแล้ว! +${v} คะแนน`, 'ok');
        coach.hit('run');
        doSync();
      }
      // ถือนานเกิน: ไข่กลับรังเอง
      if (h.carry >= 0 && tnow - h.holdAt > HOLD_MAX_MS - 1000) {
        const s = slots.current[h.carry];
        net.send('back', { k: h.carry, gen: s.gen, i: myIdx });
        if (s.st === 'held' && s.by === myIdx) Object.assign(s, { st: 'idle', by: -1 });
        dropMine('ไข่กลับรังบอสไปแล้ว ลองใหม่นะ', 'wave');
      }

      // บอสไล่ตาม (คิดในเครื่องของคนที่ถือไข่)
      const c = chase.current;
      if (c) {
        const home = bossHome(c.b);
        if (c.st === 'wake' && tnow - c.at > BOSS_WAKE_MS) c.st = 'chase';
        if (c.st === 'chase') {
          if (h.carry < 0 || inSafe) c.st = 'return';
          else {
            const dx = h.x - c.x;
            const dz = h.z - c.z;
            const dd = Math.hypot(dx, dz) || 1;
            const v = Math.min(dd, c.speed * dt);
            c.x += (dx / dd) * v;
            c.z += (dz / dd) * v;
            // บอสเข้าฐานไม่ได้
            const r = Math.hypot(c.x, c.z);
            if (r < SAFE_R + 1) {
              c.x *= (SAFE_R + 1) / r;
              c.z *= (SAFE_R + 1) / r;
            }
            c.yaw = Math.atan2(dx, dz);
            if (dd < CATCH_R) {
              const s = slots.current[h.carry];
              net.send('back', { k: h.carry, gen: s.gen, i: myIdx });
              if (s.st === 'held' && s.by === myIdx) Object.assign(s, { st: 'idle', by: -1 });
              stats.current.caught++;
              dropMine('โดนบอสจับ! ไข่หลุดกลับรังแล้ว');
              h.stun = tnow + STUN_MS;
              // กระเด็นไปทางฐาน
              const hr = Math.hypot(h.x, h.z) || 1;
              moveTo(h, h.x - (h.x / hr) * 5, h.z - (h.z / hr) * 5);
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
            c.yaw = Math.atan2(dx, dz);
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
        if (!g.rig) g.rig = ghostRig(idx);
        g.rig.root.position.set(g.x, 0, g.z);
        g.rig.root.rotation.y = g.yaw;
        const [cb, ct] = g.carry ? g.carry.split(':').map(Number) : [-1, 0];
        setCarry(g.rig, cb >= 0 && cb < BIOMES.length && ct >= 0 && ct < 11 ? cb : -1, ct || 0);
        g.rig.quiz.visible = g.q;
        poseChar(g.rig, g.moving, t, false);
      });

      // เพื่อนจำลอง
      for (const b of bots.current) {
        if (!b.rig) {
          b.rig = makeChar(colorOf(b.idx), b.name, false);
          w.scene.add(b.rig.root);
        }
        if (b.carry >= 0) {
          b.tx = 0;
          b.tz = 0;
          if (Math.hypot(b.x, b.z) < SAFE_R - 2) {
            const s = slots.current[b.carry];
            const tt = now();
            b.score += RARITY[EGG_SLOTS_RARITY[typeOf(b.carry, s.gen)]].value;
            w.addToNest(Math.floor(b.carry / SLOTS), typeOf(b.carry, s.gen));
            Object.assign(s, { st: 'gone', by: b.idx, t: tt, until: tt + RESPAWN_MS });
            b.carry = -1;
            b.next = tnow + 9000 + Math.random() * 8000;
          }
        } else if (tnow > b.next) {
          // ขโมยไข่ใบที่ว่างแบบสุ่ม (ไม่แตะใบที่เรากำลังตอบ)
          const free = slots.current.map((s, k) => (s.st === 'idle' && k !== hero.current.answering && k % SLOTS < 2 ? k : -1)).filter((k) => k >= 0);
          if (free.length) {
            const k = free[Math.floor(Math.random() * free.length)];
            const p = slotPos(Math.floor(k / SLOTS), k % SLOTS);
            b.tx = p.x;
            b.tz = p.z;
            if (Math.hypot(b.x - p.x, b.z - p.z) < 1.5) {
              applyTake(k, slots.current[k].gen, b.idx, now());
              b.carry = k;
            }
          }
        } else if (Math.hypot(b.tx - b.x, b.tz - b.z) < 1) {
          const a = Math.random() * Math.PI * 2;
          b.tx = Math.cos(a) * (SAFE_R - 3);
          b.tz = Math.sin(a) * (SAFE_R - 3);
        }
        const dx = b.tx - b.x;
        const dz = b.tz - b.z;
        const dd = Math.hypot(dx, dz);
        const moving = dd > 0.3;
        if (moving) {
          const v = Math.min(dd, 6 * dt);
          b.x += (dx / dd) * v;
          b.z += (dz / dd) * v;
          b.yaw = Math.atan2(dx, dz);
        }
        b.rig.root.position.set(b.x, 0, b.z);
        b.rig.root.rotation.y = b.yaw;
        setCarry(b.rig, b.carry >= 0 ? Math.floor(b.carry / SLOTS) : -1, b.carry >= 0 ? typeOf(b.carry, slots.current[b.carry].gen) : 0);
        poseChar(b.rig, moving, t, false);
      }

      // วาดตัวเรา + บอส
      meRig.root.position.set(h.x, 0, h.z);
      meRig.root.rotation.y = h.yaw;
      setCarry(meRig, h.carry >= 0 ? Math.floor(h.carry / SLOTS) : -1, h.carryType);
      meRig.quiz.visible = h.answering >= 0;
      poseChar(meRig, h.moving, t, stunned);

      w.bosses.forEach((rig, b) => {
        let pos: { x: number; z: number; yaw: number; awake: boolean; run: boolean } | null = null;
        if (c && c.b === b) pos = { x: c.x, z: c.z, yaw: c.yaw, awake: true, run: c.st !== 'wake' };
        else
          for (const g of ghosts.current.values())
            if (g.boss && g.boss[0] === b) {
              pos = { x: g.boss[1], z: g.boss[2], yaw: Math.atan2(g.x - g.boss[1], g.z - g.boss[2]), awake: true, run: true };
              break;
            }
        if (pos) {
          rig.root.position.x += (pos.x - rig.root.position.x) * Math.min(1, dt * 14);
          rig.root.position.z += (pos.z - rig.root.position.z) * Math.min(1, dt * 14);
          rig.root.rotation.y = pos.yaw;
        } else {
          rig.root.position.set(rig.home.x, 0, rig.home.z);
          rig.root.rotation.y = Math.atan2(-rig.home.x, -rig.home.z);
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
      w.render(h.x, h.z, camAng);

      const c = chase.current;
      const carryStr = h.carry >= 0 ? `${Math.floor(h.carry / SLOTS)}:${h.carryType}` : '';
      const key = `${Math.round(h.x * 4)}:${Math.round(h.z * 4)}:${carryStr}:${h.answering >= 0 ? 1 : 0}:${score.current}:${c && c.st !== 'return' ? 1 : 0}`;
      if (info && ((nowMs - sendAt > 120 && (key !== lastKey || c)) || nowMs - beatAt > 2000)) {
        sendAt = nowMs;
        beatAt = nowMs;
        lastKey = key;
        net.send('pos', {
          i: myIdx,
          x: Math.round(h.x * 10) / 10,
          z: Math.round(h.z * 10) / 10,
          y: Math.round(h.yaw * 100) / 100,
          c: carryStr,
          q: h.answering >= 0 ? 1 : 0,
          g: score.current,
          b: c ? [c.b, Math.round(c.x * 10) / 10, Math.round(c.z * 10) / 10] : null,
        });
      }

      if (nowMs - hudAt > 150) {
        hudAt = nowMs;
        const tnow = Date.now();
        const k = h.answering < 0 && h.carry < 0 ? nearSlot() : -1;
        let nearSt: typeof hud.nearSt = 'none';
        if (k >= 0) {
          const s = slots.current[k];
          nearSt = s.st === 'idle' ? 'ok' : s.st === 'held' ? 'held' : 'busy';
        }
        setHud({
          score: score.current,
          coins: coins.current,
          left: deadline ? deadline - tnow : 0,
          near: k,
          nearSt,
          inSafe: Math.hypot(h.x, h.z) < SAFE_R,
          carry: h.carry,
          chased: h.carry >= 0 && !!c && c.st !== 'return',
          stun: Math.max(0, h.stun - tnow),
          lv: h.speedLv,
          biome: biomeAt(h.x, h.z),
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

  const nearEgg = hud.near >= 0 && slots.current[hud.near] ? (() => {
    const s = slots.current[hud.near];
    const type = typeOf(hud.near, s.gen);
    return { name: BIOMES[Math.floor(hud.near / SLOTS)].eggs[type].name, rar: EGG_SLOTS_RARITY[type] };
  })() : null;
  const cost = SPEED_COST[hud.lv];
  const [top1, top2, top3] = board;
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

  return (
    <div className="mb gm-root eg" ref={rootRef} data-over={over} data-dock={answering >= 0} data-chased={hud.chased}>
      <CoachArrow coach={coach} root={rootRef} />
      <div className="gm-main">
        <div className="mb-hud">
          <span className="cf-chip eg-score">
            <Egg size={18} /> <b>{hud.score.toLocaleString('th-TH')}</b> คะแนน
          </span>
          <span className="cf-chip eg-coins" title="ใช้อัปความเร็ว">
            <Zap size={16} /> {hud.coins.toLocaleString('th-TH')} เหรียญ
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

          {hud.biome >= 0 && !hud.chased && <div className="eg-biome" style={{ ['--bc' as string]: BIOMES[hud.biome].ground }}>{BIOMES[hud.biome].name}</div>}

          {joy && (
            <div className="mb-joy" style={{ left: joy.ox, top: joy.oy }} aria-hidden="true">
              <span className="mb-joy-knob" style={{ transform: `translate(${joy.x}px, ${joy.y}px)` }} />
            </div>
          )}

          {nearEgg && answering < 0 && (
            <button type="button" className="eg-steal" data-ui disabled={hud.nearSt !== 'ok' || hud.stun > 0} onClick={steal} style={{ ['--rc' as string]: RARITY[nearEgg.rar].color }}>
              <Hand className="w-5 h-5" />
              <span>
                <b>{hud.nearSt === 'ok' ? 'ขโมยไข่!' : hud.nearSt === 'held' ? 'มีคนถือไปแล้ว' : 'รอไข่ใหม่'}</b>
                <small>
                  {nearEgg.name} · {RARITY[nearEgg.rar].name}
                </small>
              </span>
            </button>
          )}

          {carrying && (
            <div className="eg-home" data-ui>
              <Siren className="w-5 h-5" /> วิ่งกลับฐานสีเขียว!
            </div>
          )}

          {hud.stun > 0 && (
            <div className="ti-status" data-kind="dizzy">
              โดนบอสจับ!<small>ลุกได้ใน {Math.ceil(hud.stun / 1000)}</small>
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
        </div>

        <div className="mb-bar eg-bar">
          <button type="button" className="ti-item eg-speed" data-has={hud.inSafe && cost !== undefined && hud.coins >= cost} disabled={over || cost === undefined || hud.coins < cost || !hud.inSafe} onClick={buySpeed} style={{ ['--ic' as string]: '#ff9a3d' }} title="อัปความเร็ว (กด Q)">
            <span className="tw-item-ic">
              <Gauge className="w-6 h-6" />
            </span>
            <span>
              <b>{cost === undefined ? 'ความเร็วสูงสุดแล้ว' : `อัปความเร็ว Lv ${hud.lv + 1}`}</b>
              <small>{cost === undefined ? `Lv ${hud.lv}` : `${cost} เหรียญ · ${hud.inSafe ? 'ซื้อได้ในฐาน' : 'กลับฐานก่อนนะ'}`}</small>
            </span>
            <em>{hud.lv}</em>
          </button>
          <div className="eg-legend" aria-label="ความหายากของไข่">
            {(['common', 'rare', 'legend', 'secret'] as const).map((r) => (
              <span key={r} style={{ ['--rc' as string]: RARITY[r].color }}>
                <i />
                {RARITY[r].name} {RARITY[r].value}
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
            <p className="font-bold">คะแนนไข่</p>
            <div className="gm-over-stats">
              <span>
                <b>{stats.current.eggs}</b>ไข่ที่ขโมยได้
              </span>
              <span>
                <b>{stats.current.rare}</b>ไข่หายากขึ้นไป
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
