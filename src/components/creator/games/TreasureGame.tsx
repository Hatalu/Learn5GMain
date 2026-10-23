'use client';

import './games.css';
import './games-live.css';
import './brawl-fish.css';
import './world.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Anchor, Bird, Gem, KeyRound, LogOut, Snowflake } from 'lucide-react';
import { QuestionDock } from './QuestionPad';
import { CoachArrow, DOCK_CHOICES, useCoach } from './Coach';
import type { GameProps } from './types';
import { gsfx } from '@/lib/game-creator/gsound';
import type { LiveOutcome } from '@/lib/game-creator/live-client';
import { avatarSprite, fmtLeft, hashStr, moveGhosts, rng, useMoveInput, useWorldNet, type Ghost, type NetMsg } from './worldKit';

/* ------------------------------------------------------------------ โลก */

const MW = 2400;
const MH = 1600;
const CX = MW / 2;
const CY = MH / 2;
const RX = 1060;
const RY = 690;
const SPEED = 230;
const REACH = 78;
const CHEST_N = 9;
const GEM_N = 28;
const GEM_VALUE = 3;
const PET_COST = 50;
const PET_SEC = 45;
const FREEZE_MS = 5000;
const DIZZY_MS = 3000;
const LOCK_MS = 45000;
const CRACK_MS = 12000;
const RESPAWN_MS = 14000;
const GEM_RESPAWN_MS = 20000;
const ICE_RANGE = 460;
const HOOK_RANGE = 620;
const INK = '#2a2350';

/** ขอบเกาะเป็นคลื่น (เหมือนกันทุกเครื่อง) */
const wob = (a: number) => 1 + 0.06 * Math.sin(a * 3 + 0.7) + 0.04 * Math.sin(a * 5 + 2.1) + 0.03 * Math.sin(a * 9);
const insideIsland = (x: number, y: number, pad = 0.95) => {
  const dx = (x - CX) / RX;
  const dy = (y - CY) / RY;
  return Math.hypot(dx, dy) <= wob(Math.atan2(dy, dx)) * pad;
};

interface Obstacle {
  x: number;
  y: number;
  r: number;
  kind: 'palm' | 'rock' | 'bush';
}
interface Spot {
  x: number;
  y: number;
}

/** ต้นไม้ ก้อนหิน จุดหีบ และจุดเพชร (สุ่มจาก seed ของห้อง) */
function buildMap(seed: number) {
  const r = rng(seed);
  const pt = (pad: number) => {
    for (let k = 0; k < 400; k++) {
      const x = CX + (r() * 2 - 1) * RX;
      const y = CY + (r() * 2 - 1) * RY;
      if (insideIsland(x, y, pad)) return { x, y };
    }
    return { x: CX, y: CY };
  };
  const obs: Obstacle[] = [];
  for (let i = 0; i < 34; i++) {
    const p = pt(0.86);
    if (Math.hypot(p.x - CX, p.y - CY) < 160) continue;
    const kind = i % 3 === 0 ? 'rock' : i % 3 === 1 ? 'palm' : 'bush';
    obs.push({ ...p, r: kind === 'rock' ? 30 : kind === 'palm' ? 22 : 26, kind });
  }
  const free = (p: Spot, minD: number, list: Spot[]) => !obs.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < o.r + 50) && !list.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < minD);
  const chests: Spot[] = [];
  for (let k = 0; k < 2000 && chests.length < CHEST_N; k++) {
    const p = pt(0.84);
    if (free(p, 300, chests)) chests.push(p);
  }
  const gems: Spot[] = [];
  for (let k = 0; k < 3000 && gems.length < GEM_N; k++) {
    const p = pt(0.9);
    if (free(p, 90, [...gems, ...chests])) gems.push(p);
  }
  return { obs, chests, gems };
}

type ChestState = 'closed' | 'lock' | 'cracked' | 'open';
interface Chest {
  gen: number;
  st: ChestState;
  by: number;
  t: number;
  /** หมดล็อก/หมดเวลาแย่ง/เวลาเกิดใหม่ */
  until: number;
}
interface GemSlot {
  gen: number;
  picked: boolean;
  at: number;
}
interface Fx {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  r: number;
  kind?: 'ring' | 'gem' | 'star';
}
interface Shot {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  kind: 'ice' | 'hook';
}
interface Bot {
  idx: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  face: number;
  gems: number;
  next: number;
}

type Weapon = 'ice' | 'hook';
const WEAPONS: { id: Weapon | 'pet'; name: string; desc: string; color: string }[] = [
  { id: 'ice', name: 'ปืนใหญ่น้ำแข็ง', desc: 'ยิงเพื่อนใกล้ๆ แข็ง 5 วินาที', color: '#18a0d6' },
  { id: 'hook', name: 'ตะขอดึงตัว', desc: 'ดึงเพื่อนที่จะถึงหีบกลับมา', color: '#9b6cf0' },
  { id: 'pet', name: `นกแก้วเก็บเพชร (${PET_COST})`, desc: `ช่วยบินเก็บเพชร ${PET_SEC} วิ`, color: '#25c48a' },
];

/* ------------------------------------------------------------------ เกม */

export function TreasureGame({ engine, deadline, sync, me, preview, onLeave, world: info, startScore = 0 }: GameProps) {
  const stage = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const now = useCallback(() => (info ? info.now() : Date.now()), [info]);
  const myIdx = info ? Math.max(0, info.players.findIndex((p) => p.id === info.myId)) : 0;

  const map = useRef(buildMap(hashStr(`${info?.roomId || 'preview'}:${info?.round || 0}`)));
  const chests = useRef<Chest[]>(map.current.chests.map(() => ({ gen: 0, st: 'closed', by: -1, t: 0, until: 0 })));
  const gemSlots = useRef<GemSlot[]>(map.current.gems.map(() => ({ gen: 0, picked: false, at: 0 })));
  const ghosts = useRef(new Map<string, Ghost & { gems: number }>());
  const fx = useRef<Fx[]>([]);
  const shots = useRef<Shot[]>([]);
  const bots = useRef<Bot[]>([]);

  const start = (() => {
    const r = rng(hashStr(`spawn:${myIdx}`));
    const a = r() * Math.PI * 2;
    return { x: CX + Math.cos(a) * 120, y: CY + Math.sin(a) * 90 };
  })();
  const hero = useRef({ x: start.x, y: start.y, face: 1, moving: false, step: 0, frozen: 0, dizzy: 0, decoding: -1, pet: 0, px: start.x, py: start.y });
  const gems = useRef(Math.max(0, startScore));
  const inv = useRef<Record<Weapon, number>>({ ice: 0, hook: 0 });
  const stats = useRef({ chests: 0 });
  const blocked = useRef(new Map<number, number>());

  const [hud, setHud] = useState({ gems: gems.current, left: 0, near: -1, nearSt: 'none' as 'none' | 'ok' | 'busy' | 'grab' | 'mine-cracked', frozen: 0, dizzy: 0, pet: 0, inv: { ice: 0, hook: 0 }, board: [] as { name: string; g: number; me: boolean }[] });
  const [over, setOver] = useState(false);
  const [decoding, setDecoding] = useState(-1);
  const [streak, setStreak] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'ok' | 'bad' | 'wave'; at: number } | null>(null);
  const say = (text: string, kind: 'ok' | 'bad' | 'wave') => setBanner({ text, kind, at: Date.now() });
  const { joy, handlers, dir } = useMoveInput(!over);
  const [, setSpriteTick] = useState(0);
  const redraw = useCallback(() => setSpriteTick((x) => x + 1), []);

  const nearOk = hud.nearSt === 'ok' || hud.nearSt === 'grab';
  const hasWeapon = hud.inv.ice + hud.inv.hook > 0;
  const coach = useCoach(
    [
      { id: 'move', target: '.ti-stage', text: 'ลากนิ้วบนจอ หรือกดลูกศร เดินหาหีบสมบัติ' },
      { id: 'explore', target: '.ti-explore', text: 'ถึงหีบแล้ว กดสำรวจ!', when: () => nearOk, doneIf: () => decoding >= 0 },
      { id: 'answer', target: DOCK_CHOICES, text: 'เลือกตัวเลือก ถอดรหัสให้ถูก เปิดหีบได้เพชร', when: () => decoding >= 0 },
      { id: 'weapon', target: '.ti-items', text: 'ได้อาวุธโจรสลัดแล้ว กดใช้ได้เลย', when: () => hasWeapon, optional: true },
    ],
    { loops: 1, active: !over }
  );

  /* ---------- สถานะหีบ (กติกาเดียวกันทุกเครื่อง) ---------- */
  const tickChests = useCallback(() => {
    const t = now();
    chests.current.forEach((c) => {
      if (c.st === 'lock' && t > c.until) Object.assign(c, { st: 'closed', by: -1 });
      else if (c.st === 'cracked' && t > c.until) Object.assign(c, { st: 'closed', by: -1 });
      else if (c.st === 'open' && t > c.until) Object.assign(c, { st: 'closed', by: -1, gen: c.gen + 1 });
    });
    gemSlots.current.forEach((g) => {
      if (g.picked && t > g.at + GEM_RESPAWN_MS) Object.assign(g, { picked: false, gen: g.gen + 1 });
    });
  }, [now]);

  const canTake = (s: number, who: number) => {
    const c = chests.current[s];
    if (!c) return false;
    if (c.st === 'closed') return true;
    if (c.st === 'cracked') return c.by !== who;
    return false;
  };

  const burst = (x: number, y: number, color: string, n = 10, kind: Fx['kind'] = undefined, power = 220) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = power * (0.4 + Math.random());
      fx.current.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0.8, max: 0.8, color, r: 5 + Math.random() * 6, kind });
    }
    if (fx.current.length > 300) fx.current.splice(0, fx.current.length - 300);
  };

  /* ---------- เครือข่าย ---------- */
  const cancelMine = useRef<(why: string) => void>(() => undefined);
  const snapDone = useRef(false);
  const net = useWorldNet(info, (m: NetMsg) => {
    const p = m.p;
    const i = Number(p.i);
    const t = Number(p.t) || now();
    tickChests();
    if (m.e === 'pos') {
      if (!Number.isInteger(i) || i === myIdx) return;
      const id = String(i);
      const x = Math.max(0, Math.min(MW, Number(p.x) || 0));
      const y = Math.max(0, Math.min(MH, Number(p.y) || 0));
      const g = ghosts.current.get(id);
      const patch = { tx: x, ty: y, face: Number(p.f) || 1, seen: Date.now(), st: String(p.s || ''), gems: Math.max(0, Number(p.g) || 0) };
      if (g) Object.assign(g, patch);
      else ghosts.current.set(id, { id, x, y, ...patch });
    } else if (m.e === 'lock') {
      const s = Number(p.s);
      const c = chests.current[s];
      if (!c || c.gen !== Number(p.g)) return;
      if (c.st === 'lock' && c.by !== i) {
        // ล็อกพร้อมกัน: คนที่กดก่อน (เวลาน้อยกว่า) ได้ไป
        if (t < c.t || (t === c.t && i < c.by)) {
          if (c.by === myIdx) cancelMine.current('เพื่อนถึงหีบก่อนนิดเดียว!');
          Object.assign(c, { by: i, t, until: t + LOCK_MS });
        }
        return;
      }
      if (!canTake(s, i)) return;
      Object.assign(c, { st: 'lock', by: i, t, until: t + LOCK_MS });
    } else if (m.e === 'unlock') {
      const c = chests.current[Number(p.s)];
      if (c && c.gen === Number(p.g) && c.st === 'lock' && c.by === i) Object.assign(c, { st: 'closed', by: -1 });
    } else if (m.e === 'open') {
      const s = Number(p.s);
      const c = chests.current[s];
      if (!c || c.gen !== Number(p.g)) return;
      if (c.by === myIdx && hero.current.decoding === s && i !== myIdx) cancelMine.current('เพื่อนเปิดหีบไปแล้ว');
      Object.assign(c, { st: 'open', by: i, t, until: t + RESPAWN_MS });
      const sp = map.current.chests[s];
      burst(sp.x, sp.y - 20, '#ffcf3f', 16, 'gem');
    } else if (m.e === 'fail') {
      const s = Number(p.s);
      const c = chests.current[s];
      if (!c || c.gen !== Number(p.g)) return;
      Object.assign(c, { st: 'cracked', by: i, t, until: t + CRACK_MS });
      const sp = map.current.chests[s];
      burst(sp.x, sp.y - 20, '#ff7a3d', 14, 'star');
      if (Math.hypot(hero.current.x - sp.x, hero.current.y - sp.y) < 260) say('หีบระเบิด! รีบกดแย่งตอบเลย', 'wave');
    } else if (m.e === 'gem') {
      const g = gemSlots.current[Number(p.k)];
      if (g && g.gen === Number(p.g) && !g.picked) Object.assign(g, { picked: true, at: t });
    } else if (m.e === 'hit') {
      const to = Number(p.to);
      const kind = p.k === 'hook' ? 'hook' : 'ice';
      const from = ghosts.current.get(String(i));
      const fx0 = from ? from.x : Number(p.x) || 0;
      const fy0 = from ? from.y : Number(p.y) || 0;
      const target = to === myIdx ? hero.current : ghosts.current.get(String(to));
      if (target) shots.current.push({ x0: fx0, y0: fy0, x1: target.x, y1: target.y, t: 0, kind });
      if (to !== myIdx) return;
      const h = hero.current;
      if (kind === 'ice') {
        if (h.decoding >= 0) return; // กำลังถอดรหัสอยู่ ไม่โดน
        h.frozen = Date.now() + FREEZE_MS;
        gsfx.hurt();
        say('โดนปืนใหญ่น้ำแข็ง! แข็ง 5 วินาที', 'bad');
      } else {
        const dx = fx0 - h.x;
        const dy = fy0 - h.y;
        const d = Math.hypot(dx, dy) || 1;
        const pull = Math.min(360, d * 0.6);
        moveHero(h.x + (dx / d) * pull, h.y + (dy / d) * pull);
        gsfx.whoosh();
        say('โดนตะขอดึงตัว!', 'bad');
      }
    } else if (m.e === 'hello') {
      const alive = [myIdx, ...Array.from(ghosts.current.keys()).map(Number)].filter((x) => x !== i);
      if (Math.min(...alive) !== myIdx) return;
      setTimeout(() => {
        net.send('snap', {
          c: chests.current.map((c) => [c.gen, c.st, c.by, c.t, c.until]),
          g: gemSlots.current.map((g) => [g.gen, g.picked ? 1 : 0, g.at]),
        });
      }, 150 + Math.random() * 300);
    } else if (m.e === 'snap' && !snapDone.current) {
      snapDone.current = true;
      const cs = Array.isArray(p.c) ? p.c : [];
      cs.slice(0, CHEST_N).forEach((row, k) => {
        if (!Array.isArray(row)) return;
        const st = String(row[1]) as ChestState;
        if (!['closed', 'lock', 'cracked', 'open'].includes(st)) return;
        chests.current[k] = { gen: Number(row[0]) || 0, st, by: Number(row[2]), t: Number(row[3]) || 0, until: Number(row[4]) || 0 };
      });
      const gs = Array.isArray(p.g) ? p.g : [];
      gs.slice(0, GEM_N).forEach((row, k) => {
        if (Array.isArray(row)) gemSlots.current[k] = { gen: Number(row[0]) || 0, picked: row[1] === 1, at: Number(row[2]) || 0 };
      });
    }
  });
  const sentHello = useRef(false);
  useEffect(() => {
    if (!net.live || sentHello.current) return;
    sentHello.current = true;
    net.send('hello', { i: myIdx });
  }, [net, myIdx]);

  /* ---------- เดิน (ชนต้นไม้/หิน ไม่ตกทะเล) ---------- */
  const moveHero = (nx: number, ny: number) => {
    const h = hero.current;
    const ok = (x: number, y: number) => insideIsland(x, y, 0.965) && !map.current.obs.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + 16);
    if (ok(nx, ny)) {
      h.x = nx;
      h.y = ny;
    } else if (ok(nx, h.y)) h.x = nx;
    else if (ok(h.x, ny)) h.y = ny;
  };

  /* ---------- ทดลองเล่น: โจรสลัดจำลอง 2 คน ---------- */
  useEffect(() => {
    if (info) return;
    bots.current = [1, 2].map((idx) => ({ idx, x: CX + idx * 80, y: CY - 60, tx: CX, ty: CY, face: 1, gems: 0, next: Date.now() + 15000 + idx * 7000 }));
  }, [info]);

  /* ---------- สำรวจหีบ ---------- */
  const nearChest = () => {
    const h = hero.current;
    let best = -1;
    let bd = REACH;
    map.current.chests.forEach((c, s) => {
      const d = Math.hypot(c.x - h.x, c.y - h.y);
      if (d < bd) {
        bd = d;
        best = s;
      }
    });
    return best;
  };

  const explore = useCallback(() => {
    const h = hero.current;
    if (over || h.decoding >= 0 || h.frozen > Date.now() || h.dizzy > Date.now()) return;
    tickChests();
    const s = nearChest();
    if (s < 0) return;
    const c = chests.current[s];
    if ((blocked.current.get(s) || 0) > Date.now()) return say('หีบนี้เพิ่งระเบิดใส่ รอแป๊บนึงนะ', 'bad');
    if (!canTake(s, myIdx)) return say(c.st === 'lock' ? 'มีคนกำลังถอดรหัสหีบนี้อยู่' : 'หีบนี้เปิดไปแล้ว', 'bad');
    const t = now();
    Object.assign(c, { st: 'lock', by: myIdx, t, until: t + LOCK_MS });
    net.send('lock', { s, g: c.gen, i: myIdx, t });
    h.decoding = s;
    setDecoding(s);
    gsfx.door();
    coach.hit('explore');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, now, net, coach, tickChests, myIdx]);

  const stopDecoding = useCallback(() => {
    hero.current.decoding = -1;
    setDecoding(-1);
  }, []);
  cancelMine.current = (why: string) => {
    if (hero.current.decoding < 0) return;
    stopDecoding();
    say(why, 'bad');
  };

  const giveUp = () => {
    const s = hero.current.decoding;
    if (s < 0) return;
    const c = chests.current[s];
    if (c.st === 'lock' && c.by === myIdx) {
      Object.assign(c, { st: 'closed', by: -1 });
      net.send('unlock', { s, g: c.gen, i: myIdx });
    }
    stopDecoding();
  };

  const onAnswered = useCallback(
    (o: LiveOutcome) => {
      setStreak(o.streak);
      const h = hero.current;
      const s = h.decoding;
      if (s < 0) return;
      const c = chests.current[s];
      const sp = map.current.chests[s];
      const t = now();
      if (o.correct) {
        const r = rng(hashStr(`${s}:${c.gen}:${myIdx}`));
        const gain = 30 + Math.floor(r() * 31) + Math.min(30, o.streak * 5);
        gems.current += gain;
        const w: Weapon = r() < 0.5 ? 'ice' : 'hook';
        inv.current[w]++;
        stats.current.chests++;
        Object.assign(c, { st: 'open', by: myIdx, t, until: t + RESPAWN_MS });
        net.send('open', { s, g: c.gen, i: myIdx, t });
        burst(sp.x, sp.y - 20, '#ffcf3f', 22, 'gem', 280);
        gsfx.cash();
        say(`เปิดหีบ! +${gain} เพชร ได้${w === 'ice' ? 'ปืนใหญ่น้ำแข็ง' : 'ตะขอดึงตัว'}`, 'ok');
      } else {
        Object.assign(c, { st: 'cracked', by: myIdx, t, until: t + CRACK_MS });
        net.send('fail', { s, g: c.gen, i: myIdx, t });
        blocked.current.set(s, Date.now() + CRACK_MS);
        h.dizzy = Date.now() + DIZZY_MS;
        burst(sp.x, sp.y - 20, '#ff7a3d', 18, 'star', 260);
        gsfx.boom();
        say('หีบระเบิด! มึนงงแป๊บนึง เพื่อนแย่งตอบได้แล้ว', 'bad');
      }
      setTimeout(stopDecoding, 900);
    },
    [now, myIdx, net, stopDecoding]
  );

  /* ---------- อาวุธ ---------- */
  const others = () => [
    ...Array.from(ghosts.current.values()).map((g) => ({ idx: Number(g.id), x: g.x, y: g.y, st: g.st })),
    ...bots.current.map((b) => ({ idx: b.idx, x: b.x, y: b.y, st: '' })),
  ];
  const fire = useCallback(
    (id: Weapon | 'pet') => {
      const h = hero.current;
      if (over) return;
      if (id === 'pet') {
        if (gems.current < PET_COST) return say(`ต้องมี ${PET_COST} เพชร ถึงจะซื้อนกแก้วได้`, 'bad');
        gems.current -= PET_COST;
        h.pet = Date.now() + PET_SEC * 1000;
        h.px = h.x;
        h.py = h.y;
        gsfx.levelUp();
        say('ได้นกแก้วผู้ช่วย! บินเก็บเพชรให้', 'ok');
        coach.hit('weapon');
        return;
      }
      if (inv.current[id] <= 0) return;
      let target: { idx: number; x: number; y: number } | null = null;
      if (id === 'ice') {
        let bd = ICE_RANGE;
        for (const o of others()) {
          if (o.st.includes('d') || o.st.includes('i')) continue;
          const d = Math.hypot(o.x - h.x, o.y - h.y);
          if (d < bd) {
            bd = d;
            target = o;
          }
        }
      } else {
        // ตะขอ: ดึงคนที่ใกล้หีบที่สุด (คนกำลังจะถึงหีบ) ในระยะ
        let bd = Infinity;
        for (const o of others()) {
          if (o.st.includes('d') || Math.hypot(o.x - h.x, o.y - h.y) > HOOK_RANGE) continue;
          const dc = Math.min(...map.current.chests.map((c) => Math.hypot(c.x - o.x, c.y - o.y)));
          if (dc < bd) {
            bd = dc;
            target = o;
          }
        }
      }
      if (!target) return say(id === 'ice' ? 'ไม่มีเพื่อนในระยะยิง เดินเข้าไปใกล้อีกนิด' : 'ไม่มีเพื่อนในระยะตะขอ', 'bad');
      inv.current[id]--;
      shots.current.push({ x0: h.x, y0: h.y, x1: target.x, y1: target.y, t: 0, kind: id });
      net.send('hit', { k: id, i: myIdx, to: target.idx, x: Math.round(h.x), y: Math.round(h.y), t: now() });
      const bot = bots.current.find((b) => b.idx === target!.idx);
      if (bot) {
        if (id === 'hook') {
          bot.x += (h.x - bot.x) * 0.6;
          bot.y += (h.y - bot.y) * 0.6;
        } else bot.next = Date.now() + FREEZE_MS + 5000;
      }
      gsfx.shoot(id === 'ice' ? 2 : 1);
      say(id === 'ice' ? 'ยิงปืนใหญ่น้ำแข็ง!' : 'เหวี่ยงตะขอ!', 'ok');
      coach.hit('weapon');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [over, net, myIdx, now, coach]
  );

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') {
        if (hero.current.decoding < 0) {
          e.preventDefault();
          explore();
        }
      }
      if (e.key === '1') fire('ice');
      if (e.key === '2') fire('hook');
      if (e.key === '3') fire('pet');
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [explore, fire]);

  /* ---------- ส่งคะแนน ---------- */
  const synced = useRef(-1);
  const doSync = useCallback(
    (force = false) => {
      if (!sync) return;
      if (!force && gems.current === synced.current) return;
      synced.current = gems.current;
      sync(gems.current, { chests: stats.current.chests });
    },
    [sync]
  );

  /* ---------- วงรอบเกม ---------- */
  useEffect(() => {
    if (over) return;
    let raf = 0;
    let last = performance.now();
    let hudAt = 0;
    let sendAt = 0;
    let beatAt = 0;
    let lastSent = { x: -1, y: -1, s: '', g: -1 };

    const pickGems = (x: number, y: number, r: number) => {
      const t = now();
      map.current.gems.forEach((sp, k) => {
        const g = gemSlots.current[k];
        if (g.picked || Math.hypot(sp.x - x, sp.y - y) > r) return;
        Object.assign(g, { picked: true, at: t });
        gems.current += GEM_VALUE;
        net.send('gem', { k, g: g.gen, i: myIdx, t });
        burst(sp.x, sp.y, '#5fd4ff', 6, 'gem', 120);
        gsfx.coin();
      });
    };

    const step = (dt: number) => {
      const h = hero.current;
      const tnow = Date.now();
      tickChests();
      const stuck = h.decoding >= 0 || h.frozen > tnow || h.dizzy > tnow;
      const d = stuck ? { x: 0, y: 0 } : dir();
      h.moving = Math.abs(d.x) + Math.abs(d.y) > 0.05;
      if (h.moving) {
        moveHero(h.x + d.x * SPEED * dt, h.y + d.y * SPEED * dt);
        if (Math.abs(d.x) > 0.2) h.face = d.x > 0 ? 1 : -1;
        h.step += dt * 10;
      }
      pickGems(h.x, h.y, 34);

      // นกแก้ว: บินไปเก็บเพชรที่ใกล้ที่สุด ไม่มีก็บินตามเรา
      if (h.pet > tnow) {
        let tx = h.x - h.face * 40;
        let ty = h.y - 60;
        let bd = 520;
        map.current.gems.forEach((sp, k) => {
          if (gemSlots.current[k].picked) return;
          const dd = Math.hypot(sp.x - h.px, sp.y - h.py);
          if (dd < bd && Math.hypot(sp.x - h.x, sp.y - h.y) < 700) {
            bd = dd;
            tx = sp.x;
            ty = sp.y;
          }
        });
        const dx = tx - h.px;
        const dy = ty - h.py;
        const dd = Math.hypot(dx, dy) || 1;
        const v = Math.min(dd, 380 * dt);
        h.px += (dx / dd) * v;
        h.py += (dy / dd) * v;
        pickGems(h.px, h.py, 28);
      }

      // โจรสลัดจำลอง
      for (const b of bots.current) {
        if (tnow > b.next) {
          // เปิดหีบที่ใกล้ที่สุดให้ดูเป็นตัวอย่างว่ามีคนแข่ง
          const s = chests.current.findIndex((c) => c.st === 'closed');
          if (s >= 0) {
            const c = chests.current[s];
            const t = now();
            Object.assign(c, { st: 'open', by: b.idx, t, until: t + RESPAWN_MS });
            const sp = map.current.chests[s];
            burst(sp.x, sp.y - 20, '#ffcf3f', 12, 'gem');
            b.gems += 40;
          }
          b.next = tnow + 20000 + Math.random() * 10000;
        }
        const dx = b.tx - b.x;
        const dy = b.ty - b.y;
        const dd = Math.hypot(dx, dy);
        if (dd < 20) {
          const sp = map.current.chests[Math.floor(Math.random() * map.current.chests.length)];
          b.tx = sp.x + 60;
          b.ty = sp.y + 40;
        } else {
          b.x += (dx / dd) * 150 * dt;
          b.y += (dy / dd) * 150 * dt;
          b.face = dx > 0 ? 1 : -1;
        }
      }

      moveGhosts(ghosts.current as Map<string, Ghost>, dt, Date.now());
      shots.current.forEach((s) => (s.t += dt / 0.4));
      shots.current = shots.current.filter((s) => s.t < 1.4);
      fx.current.forEach((f) => {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy += 300 * dt;
        f.vx *= 0.95;
        f.life -= dt;
      });
      fx.current = fx.current.filter((f) => f.life > 0);
    };

    const loop = (nowMs: number) => {
      raf = requestAnimationFrame(loop);
      const c = cvs.current;
      if (!c) return;
      const dt = Math.min(0.05, (nowMs - last) / 1000);
      last = nowMs;
      if (deadline && Date.now() >= deadline) {
        if (hero.current.decoding >= 0) giveUp();
        setOver(true);
        doSync(true);
        gsfx.fanfare();
        return;
      }
      step(dt);
      const h = hero.current;
      const tnow = Date.now();
      const status = `${h.decoding >= 0 ? 'd' : ''}${h.dizzy > tnow ? 'z' : ''}${h.frozen > tnow ? 'i' : ''}${h.pet > tnow ? 'p' : ''}`;
      const moved = Math.abs(h.x - lastSent.x) + Math.abs(h.y - lastSent.y) > 4 || status !== lastSent.s || gems.current !== lastSent.g;
      if (info && ((nowMs - sendAt > 140 && moved) || nowMs - beatAt > 2000)) {
        sendAt = nowMs;
        beatAt = nowMs;
        lastSent = { x: h.x, y: h.y, s: status, g: gems.current };
        net.send('pos', { i: myIdx, x: Math.round(h.x), y: Math.round(h.y), f: h.face, s: status, g: gems.current });
      }

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = c.getBoundingClientRect();
      const pw = Math.max(1, Math.round(rect.width * dpr));
      const ph = Math.max(1, Math.round(rect.height * dpr));
      if (c.width !== pw || c.height !== ph) {
        c.width = pw;
        c.height = ph;
      }
      const k = Math.max(0.5, Math.min(1.2, Math.min(rect.width, rect.height) / 560)) * dpr;
      const ctx = c.getContext('2d');
      if (ctx) draw(ctx, pw, ph, k, nowMs, dpr);

      if (nowMs - hudAt > 150) {
        hudAt = nowMs;
        const s = nearChest();
        let nearSt: typeof hud.nearSt = 'none';
        if (s >= 0 && h.decoding < 0) {
          const ch = chests.current[s];
          if ((blocked.current.get(s) || 0) > tnow) nearSt = 'mine-cracked';
          else if (ch.st === 'closed') nearSt = 'ok';
          else if (ch.st === 'cracked') nearSt = ch.by === myIdx ? 'mine-cracked' : 'grab';
          else if (ch.st === 'lock') nearSt = 'busy';
        }
        const board = [
          { name: 'ฉัน', g: gems.current, me: true },
          ...Array.from(ghosts.current.values()).map((g) => ({ name: info?.players[Number(g.id)]?.nickname || 'เพื่อน', g: g.gems, me: false })),
          ...bots.current.map((b) => ({ name: `โจรสลัดจำลอง ${b.idx}`, g: b.gems, me: false })),
        ]
          .sort((a, b) => b.g - a.g)
          .slice(0, 4);
        setHud({ gems: gems.current, left: deadline ? deadline - Date.now() : 0, near: s, nearSt, frozen: Math.max(0, h.frozen - tnow), dizzy: Math.max(0, h.dizzy - tnow), pet: Math.max(0, h.pet - tnow), inv: { ...inv.current }, board });
      }
    };

    /* ---------- วาด ---------- */
    const draw = (ctx: CanvasRenderingContext2D, pw: number, ph: number, k: number, tms: number, dpr: number) => {
      const h = hero.current;
      const camX = Math.max(pw / 2 / k, Math.min(MW - pw / 2 / k, h.x));
      const camY = Math.max(ph / 2 / k, Math.min(MH - ph / 2 / k, h.y));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#38b8e8';
      ctx.fillRect(0, 0, pw, ph);
      ctx.setTransform(k, 0, 0, k, pw / 2 - camX * k, ph / 2 - camY * k);

      // ทะเล: คลื่นเล็กๆ
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      const wave = (tms / 900) % 1;
      for (let y = 60; y < MH; y += 120)
        for (let x = ((y / 120) % 2) * 90 + wave * 60; x < MW; x += 180) {
          ctx.beginPath();
          ctx.arc(x, y, 18, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
        }

      // เกาะ: น้ำตื้น ทราย หญ้า
      const island = (scale: number) => {
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) {
          const r = wob(a) * scale;
          const x = CX + Math.cos(a) * RX * r;
          const y = CY + Math.sin(a) * RY * r;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };
      island(1.06);
      ctx.fillStyle = '#7fd8f2';
      ctx.fill();
      island(1);
      ctx.fillStyle = '#f5d98f';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 6;
      ctx.stroke();
      island(0.88);
      ctx.fillStyle = '#86d36f';
      ctx.fill();
      ctx.strokeStyle = '#5fb455';
      ctx.lineWidth = 4;
      ctx.stroke();
      // จุดหญ้า
      ctx.fillStyle = 'rgba(60,140,60,0.25)';
      const rr = rng(7);
      for (let i = 0; i < 160; i++) {
        const x = CX + (rr() * 2 - 1) * RX * 0.85;
        const y = CY + (rr() * 2 - 1) * RY * 0.85;
        if (!insideIsland(x, y, 0.84)) continue;
        ctx.beginPath();
        ctx.ellipse(x, y, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // เพชรตามพื้น
      map.current.gems.forEach((sp, kk) => {
        if (gemSlots.current[kk].picked) return;
        drawGem(ctx, sp.x, sp.y - 6 + Math.sin(tms / 300 + kk) * 4, 12);
      });

      // หีบ + สิ่งของ + คน เรียงตาม y
      type D = { y: number; f: () => void };
      const list: D[] = [];
      map.current.obs.forEach((o) => list.push({ y: o.y, f: () => drawObs(ctx, o, tms) }));
      map.current.chests.forEach((sp, s) => list.push({ y: sp.y, f: () => drawChest(ctx, sp.x, sp.y, chests.current[s], tms) }));
      ghosts.current.forEach((g) => {
        const idx = Number(g.id);
        const p = info?.players[idx];
        list.push({ y: g.y, f: () => drawPerson(ctx, g.x, g.y, g.face, p?.avatar ?? idx % 12, p?.gear, p?.nickname || 'เพื่อน', g.st, false, Math.abs(g.tx - g.x) + Math.abs(g.ty - g.y) > 2, tms / 90, tms) });
      });
      bots.current.forEach((b) => list.push({ y: b.y, f: () => drawPerson(ctx, b.x, b.y, b.face, b.idx * 4, undefined, `โจรสลัดจำลอง ${b.idx}`, '', false, true, tms / 90, tms) }));
      const tnow = Date.now();
      const mySt = `${h.decoding >= 0 ? 'd' : ''}${h.dizzy > tnow ? 'z' : ''}${h.frozen > tnow ? 'i' : ''}`;
      list.push({ y: h.y, f: () => drawPerson(ctx, h.x, h.y, h.face, me.avatar, me.gear, me.nickname, mySt, true, h.moving, h.step, tms) });
      list.sort((a, b) => a.y - b.y).forEach((d) => d.f());

      // นกแก้ว
      if (h.pet > tnow) drawParrot(ctx, h.px, h.py, tms);
      ghosts.current.forEach((g) => g.st.includes('p') && drawParrot(ctx, g.x - 40, g.y - 70, tms));

      // ลูกยิง/ตะขอ
      for (const s of shots.current) {
        const tt = Math.min(1, s.t);
        const x = s.x0 + (s.x1 - s.x0) * tt;
        const y = s.y0 + (s.y1 - s.y0) * tt - Math.sin(tt * Math.PI) * (s.kind === 'ice' ? 90 : 20);
        if (s.kind === 'ice') {
          ctx.fillStyle = '#bfefff';
          ctx.strokeStyle = INK;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(x, y, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#6b4a2b';
          ctx.lineWidth = 4;
          ctx.setLineDash([10, 6]);
          ctx.beginPath();
          ctx.moveTo(s.x0, s.y0 - 20);
          ctx.lineTo(x, y - 20);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = INK;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(x, y - 20, 12, 0.3, Math.PI * 1.2);
          ctx.stroke();
        }
      }

      // ประกาย/ดาว/เพชรกระเด็น
      for (const f of fx.current) {
        const a = Math.max(0, f.life / f.max);
        ctx.globalAlpha = a;
        if (f.kind === 'gem') drawGem(ctx, f.x, f.y, f.r * 1.3);
        else if (f.kind === 'star') {
          ctx.fillStyle = f.color;
          star(ctx, f.x, f.y, f.r * 1.4);
        } else {
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // แผนที่ย่อ
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const mw = Math.round(Math.min(160 * dpr, pw * 0.28));
      const mh = Math.round((mw * MH) / MW);
      const mx = pw - mw - 10 * dpr;
      const my = 10 * dpr;
      ctx.fillStyle = 'rgba(42,35,80,0.85)';
      ctx.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
      ctx.fillStyle = '#38b8e8';
      ctx.fillRect(mx, my, mw, mh);
      ctx.save();
      ctx.translate(mx, my);
      ctx.scale(mw / MW, mh / MH);
      island(1);
      ctx.fillStyle = '#86d36f';
      ctx.fill();
      map.current.chests.forEach((sp, s) => {
        const st = chests.current[s].st;
        if (st === 'open') return;
        ctx.fillStyle = st === 'closed' ? '#ffcf3f' : st === 'cracked' ? '#ff7a3d' : '#9b6cf0';
        ctx.fillRect(sp.x - 40, sp.y - 40, 80, 80);
      });
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    const drawPerson = (ctx: CanvasRenderingContext2D, x: number, y: number, face: number, av: number, gear: GameProps['me']['gear'], name: string, st: string, mine: boolean, moving: boolean, stepT: number, tms: number) => {
      const frozen = st.includes('i');
      const bob = moving && !frozen ? Math.abs(Math.sin(stepT)) * 6 : 0;
      ctx.fillStyle = 'rgba(42,35,80,0.25)';
      ctx.beginPath();
      ctx.ellipse(x, y + 20, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      const img = avatarSprite(av, gear, redraw);
      const sz = mine ? 76 : 66;
      ctx.save();
      ctx.translate(x, y - bob - 12);
      if (st.includes('z')) ctx.rotate(Math.sin(tms / 90) * 0.18);
      if (face < 0) ctx.scale(-1, 1);
      if (img) ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz * (132 / 128));
      else {
        ctx.fillStyle = '#ffcf3f';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      if (frozen) {
        ctx.fillStyle = 'rgba(190,240,255,0.55)';
        ctx.strokeStyle = '#7fd0f0';
        ctx.lineWidth = 4;
        roundRect(ctx, x - 34, y - 58, 68, 82, 14);
        ctx.fill();
        ctx.stroke();
      }
      if (st.includes('z')) {
        ctx.fillStyle = '#ffcf3f';
        for (let i2 = 0; i2 < 3; i2++) {
          const a = tms / 300 + (i2 * Math.PI * 2) / 3;
          star(ctx, x + Math.cos(a) * 26, y - 62 + Math.sin(a) * 8, 9);
        }
      }
      if (st.includes('d')) {
        // กำลังถอดรหัส: ฟองคำถาม
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + 26, y - 74, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.font = '900 20px "Noto Sans Thai", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x + 26, y - 73 + Math.sin(tms / 200) * 2);
      }
      ctx.font = `800 ${mine ? 15 : 13}px "Noto Sans Thai", sans-serif`;
      const label = mine ? 'ฉัน' : name.length > 12 ? name.slice(0, 11) + '…' : name;
      const w = ctx.measureText(label).width + 16;
      ctx.fillStyle = mine ? '#ffcf3f' : '#fff';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      roundRect(ctx, x - w / 2, y - 64 - bob - (st.includes('d') ? 0 : 0), w, 22, 11);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y - 53 - bob);
    };

    raf = requestAnimationFrame(loop);
    const sv = setInterval(() => doSync(), 3000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(sv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, deadline, doSync, net.send]);

  useEffect(() => () => doSync(true), [doSync]);
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 2000);
    return () => clearTimeout(t);
  }, [banner]);
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

  const exploreLabel = hud.nearSt === 'grab' ? 'แย่งตอบ!' : hud.nearSt === 'busy' ? 'มีคนกำลังถอดรหัส' : hud.nearSt === 'mine-cracked' ? 'รอหีบเย็นลงก่อน' : 'สำรวจหีบ';

  return (
    <div className="mb gm-root ti" ref={rootRef} data-over={over} data-dock={decoding >= 0}>
      <CoachArrow coach={coach} root={rootRef} />
      <div className="gm-main">
        <div className="mb-hud">
          <span className="cf-chip ti-gems">
            <Gem size={18} /> <b>{hud.gems.toLocaleString('th-TH')}</b> เพชร
          </span>
          <span className="flex-1" />
          {deadline && (
            <span className="cf-chip cf-time" data-urgent={hud.left < 30000}>
              {fmtLeft(hud.left)}
            </span>
          )}
        </div>

        <div className="mb-stage ti-stage" ref={stage} {...handlers}>
          <canvas ref={cvs} className="mb-canvas" aria-label="เกาะมหาสมบัติ ใช้ปุ่มลูกศรหรือลากนิ้วเพื่อเดิน กด E เพื่อสำรวจหีบ" />

          <div className="ti-board" data-ui>
            {hud.board.map((b, i) => (
              <span key={`${b.name}${i}`} data-me={b.me}>
                <em>{i + 1}</em>
                <b>{b.name}</b>
                <small>{b.g.toLocaleString('th-TH')}</small>
              </span>
            ))}
          </div>

          {hud.pet > 0 && (
            <div className="ti-effects" data-ui>
              <span style={{ background: '#25c48a' }}>
                <Bird className="w-4 h-4" /> นกแก้ว {Math.ceil(hud.pet / 1000)}
              </span>
            </div>
          )}

          {joy && (
            <div className="mb-joy" style={{ left: joy.ox, top: joy.oy }} aria-hidden="true">
              <span className="mb-joy-knob" style={{ transform: `translate(${joy.x}px, ${joy.y}px)` }} />
            </div>
          )}

          {hud.near >= 0 && decoding < 0 && hud.nearSt !== 'none' && (
            <button type="button" className="ti-explore" data-ui disabled={!(hud.nearSt === 'ok' || hud.nearSt === 'grab') || hud.frozen > 0 || hud.dizzy > 0} onClick={explore}>
              <KeyRound className="w-5 h-5" /> {exploreLabel}
            </button>
          )}

          {hud.frozen > 0 && (
            <div className="ti-status" data-kind="frozen">
              แข็งเป็นน้ำแข็ง!<small>ขยับได้ใน {Math.ceil(hud.frozen / 1000)}</small>
            </div>
          )}
          {hud.dizzy > 0 && hud.frozen <= 0 && (
            <div className="ti-status" data-kind="dizzy">
              มึนงง!<small>หายใน {Math.ceil(hud.dizzy / 1000)}</small>
            </div>
          )}

          {banner && (
            <div className="td-banner" data-kind={banner.kind} key={banner.at}>
              {banner.text}
            </div>
          )}
        </div>

        <div className="mb-bar ti-items">
          {WEAPONS.map((w, i) => {
            const n = w.id === 'pet' ? (hud.gems >= PET_COST && hud.pet <= 0 ? 1 : 0) : hud.inv[w.id];
            return (
              <button key={w.id} type="button" className="ti-item" data-has={n > 0} disabled={over || n <= 0} onClick={() => fire(w.id)} style={{ ['--ic' as string]: w.color }} title={`${w.desc} (กด ${i + 1})`}>
                <span className="tw-item-ic">{w.id === 'ice' ? <Snowflake className="w-6 h-6" /> : w.id === 'hook' ? <Anchor className="w-6 h-6" /> : <Bird className="w-6 h-6" />}</span>
                <span>
                  <b>{w.name}</b>
                  <small>{w.desc}</small>
                </span>
                {w.id !== 'pet' && <em>{hud.inv[w.id]}</em>}
              </button>
            );
          })}
          {preview && <span className="tw-note">ทดลองเล่น: มีโจรสลัดจำลอง 2 คน</span>}
        </div>
      </div>

      <QuestionDock
        engine={engine}
        open={decoding >= 0 && !over}
        title="ถอดรหัสหีบสมบัติ"
        hint="ตอบถูก = เปิดหีบ ผิด = หีบระเบิด!"
        icon={<KeyRound className="w-5 h-5" />}
        color="#e0a21b"
        streak={streak}
        rewardText={() => 'ถูก! เปิดหีบสำเร็จ'}
        onAnswered={onAnswered}
        onClose={giveUp}
      />

      {over && (
        <div className="gm-over">
          <div className="gm-over-card">
            <p className="gm-over-tag">หมดเวลา!</p>
            <div className="gm-over-big">{hud.gems.toLocaleString('th-TH')}</div>
            <p className="font-bold">เพชรที่เก็บได้</p>
            <div className="gm-over-stats">
              <span>
                <b>{stats.current.chests}</b>หีบที่เปิด
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

/* ------------------------------------------------------------------ ตัวช่วยวาด */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#5fd4ff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, r * 0.22);
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.8, y - r * 0.2);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.8, y - r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.3, y - r * 0.5);
  ctx.lineTo(x, y - r * 0.8);
  ctx.lineTo(x + r * 0.15, y - r * 0.35);
  ctx.closePath();
  ctx.fill();
}

function drawObs(ctx: CanvasRenderingContext2D, o: Obstacle, tms: number) {
  ctx.fillStyle = 'rgba(42,35,80,0.2)';
  ctx.beginPath();
  ctx.ellipse(o.x, o.y + o.r * 0.6, o.r * 1.1, o.r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  if (o.kind === 'rock') {
    ctx.fillStyle = '#b8b2cf';
    ctx.beginPath();
    ctx.ellipse(o.x, o.y, o.r * 1.1, o.r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(o.x - o.r * 0.3, o.y - o.r * 0.3, o.r * 0.3, o.r * 0.18, -0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.kind === 'bush') {
    ctx.fillStyle = '#4fb04a';
    for (const [dx, dy, rr] of [
      [-12, 2, 18],
      [12, 2, 18],
      [0, -10, 20],
    ])
      ctx.beginPath(), ctx.arc(o.x + dx, o.y + dy, rr, 0, Math.PI * 2), ctx.fill(), ctx.stroke();
    ctx.fillStyle = '#ff6b7a';
    ctx.beginPath();
    ctx.arc(o.x + 6, o.y - 6, 4, 0, Math.PI * 2);
    ctx.arc(o.x - 10, o.y + 4, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // ต้นมะพร้าว
    const sway = Math.sin(tms / 700 + o.x) * 4;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(o.x, o.y + 10);
    ctx.quadraticCurveTo(o.x + 8, o.y - 40, o.x + sway, o.y - 80);
    ctx.stroke();
    ctx.strokeStyle = '#b87a3d';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.fillStyle = '#3fbf5a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.75;
      ctx.beginPath();
      ctx.ellipse(o.x + sway + Math.cos(a) * 26, o.y - 82 + Math.sin(a) * 14 + 8, 30, 10, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.arc(o.x + sway - 6, o.y - 76, 6, 0, Math.PI * 2);
    ctx.arc(o.x + sway + 6, o.y - 74, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawChest(ctx: CanvasRenderingContext2D, x: number, y: number, c: Chest, tms: number) {
  if (c.st === 'open') {
    // เปิดแล้ว: หีบว่างค่อยๆ จาง แล้วเกิดใหม่ทีหลัง
    ctx.globalAlpha = 0.55;
  }
  const w = 64;
  const h = 44;
  ctx.fillStyle = 'rgba(42,35,80,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 38, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // แสงวิบวับของหีบที่ยังไม่เปิด
  if (c.st === 'closed') {
    const g = 0.5 + Math.sin(tms / 300) * 0.5;
    ctx.fillStyle = `rgba(255,214,79,${0.25 + g * 0.25})`;
    ctx.beginPath();
    ctx.arc(x, y - 22, 52 + g * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.fillStyle = c.st === 'cracked' ? '#8b5a3a' : '#b8732f';
  roundRect(ctx, x - w / 2, y - h, w, h, 8);
  ctx.fill();
  ctx.stroke();
  // ฝา
  ctx.save();
  if (c.st === 'open') {
    ctx.translate(x, y - h);
    ctx.rotate(-0.9);
    ctx.translate(-x, -(y - h));
  } else if (c.st === 'cracked') {
    ctx.translate(Math.sin(tms / 40) * 2, 0);
  }
  ctx.fillStyle = c.st === 'cracked' ? '#7a4a2f' : '#c9843a';
  roundRect(ctx, x - w / 2 - 3, y - h - 22, w + 6, 26, 12);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // คาดทอง
  ctx.fillStyle = '#ffcf3f';
  ctx.fillRect(x - 6, y - h - 18, 12, h + 18);
  ctx.strokeRect(x - 6, y - h - 18, 12, h + 18);
  if (c.st === 'open') {
    ctx.globalAlpha = 1;
    return;
  }
  if (c.st === 'lock') {
    ctx.fillStyle = '#9b6cf0';
    ctx.beginPath();
    ctx.arc(x, y - h - 34, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '900 16px "Noto Sans Thai", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x, y - h - 33);
  }
  if (c.st === 'cracked') {
    ctx.fillStyle = 'rgba(80,70,90,0.35)';
    for (let i = 0; i < 3; i++) {
      const tt = ((tms / 900 + i / 3) % 1) * 1;
      ctx.beginPath();
      ctx.arc(x - 10 + i * 10, y - h - 20 - tt * 40, 8 + tt * 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = '900 14px "Noto Sans Thai", sans-serif';
    const label = 'แย่งได้!';
    const lw = ctx.measureText(label).width + 14;
    ctx.fillStyle = '#ff7a3d';
    roundRect(ctx, x - lw / 2, y - h - 64, lw, 22, 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y - h - 53);
  }
}

function drawParrot(ctx: CanvasRenderingContext2D, x: number, y: number, tms: number) {
  const flap = Math.sin(tms / 70) * 0.6;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.fillStyle = '#25c48a';
  ctx.beginPath();
  ctx.ellipse(x, y, 14, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffcf3f';
  ctx.beginPath();
  ctx.ellipse(x - 6, y - 2, 10, 5, flap, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff6b7a';
  ctx.beginPath();
  ctx.moveTo(x + 13, y - 2);
  ctx.lineTo(x + 22, y + 1);
  ctx.lineTo(x + 13, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x + 7, y - 3, 2.5, 0, Math.PI * 2);
  ctx.fill();
}
