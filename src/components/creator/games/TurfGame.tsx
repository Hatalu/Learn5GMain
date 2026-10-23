'use client';

import './games.css';
import './games-live.css';
import './brawl-fish.css';
import './world.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bomb, Castle, Droplet, Footprints, LogOut, Shield } from 'lucide-react';
import { QuestionDock } from './QuestionPad';
import { CoachArrow, DOCK_CHOICES, useCoach } from './Coach';
import type { GameProps } from './types';
import { TURF_H, TURF_W } from '@/lib/game-creator/modes';
import { gsfx } from '@/lib/game-creator/gsound';
import type { LiveOutcome } from '@/lib/game-creator/live-client';
import { TEAM_COLORS, avatarSprite, fmtLeft, hashStr, moveGhosts, ownerName, ownerOf, rng, useMoveInput, useWorldNet, type Ghost, type NetMsg } from './worldKit';

/* ------------------------------------------------------------------ ค่าคงที่ของโลก */

const CELL = 40;
const GW = TURF_W;
const GH = TURF_H;
const MW = GW * CELL;
const MH = GH * CELL;
const N = GW * GH;
const INK_MAX = 100;
const INK_START = 60;
const SPEED = 215;
const SHOE_SEC = 8;
const SHIELD_SEC = 12;
const BOMB_R = 3;
const BOMB_RANGE = 8 * CELL;
const INK = '#2a2350';

/** ป้อมเติมหมึก 3x3 ช่อง (มุมทั้งสี่ + กลางแผนที่) ในป้อมระบายสีไม่ได้และโดนโจมตีไม่ได้ */
const FORTS = [
  { cx: 4, cy: 4 },
  { cx: GW - 5, cy: 4 },
  { cx: 4, cy: GH - 5 },
  { cx: GW - 5, cy: GH - 5 },
  { cx: Math.floor(GW / 2), cy: Math.floor(GH / 2) },
];
const fortAt = (c: number, r: number) => FORTS.findIndex((f) => Math.abs(c - f.cx) <= 1 && Math.abs(r - f.cy) <= 1);
const FORT_CELL = new Uint8Array(N);
for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) if (fortAt(c, r) >= 0) FORT_CELL[r * GW + c] = 1;

const cellOf = (x: number, y: number) => {
  const c = Math.floor(x / CELL);
  const r = Math.floor(y / CELL);
  return c < 0 || r < 0 || c >= GW || r >= GH ? -1 : r * GW + c;
};

/** สีอ่อน/เข้มของแต่ละเจ้าของ */
const tone = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
};
const LIGHT = TEAM_COLORS.map((c) => tone(c, 0.18));

type Item = 'shoe' | 'bomb' | 'shield';
const ITEMS: { id: Item; name: string; desc: string; color: string }[] = [
  { id: 'shoe', name: 'รองเท้าสปีด', desc: `วิ่งเร็ว 2 เท่า ${SHOE_SEC} วิ`, color: '#3d8bff' },
  { id: 'bomb', name: 'ระเบิดสี', desc: 'ปาใส่เพื่อนใกล้ๆ ยึดพื้นที่รอบตัวเพื่อน', color: '#ff4fa3' },
  { id: 'shield', name: 'โล่ล็อกสี', desc: `พื้นที่เราโดนทับไม่ได้ ${SHIELD_SEC} วิ`, color: '#25c48a' },
];

interface Grid {
  own: Int16Array;
  by: Int16Array;
  ts: Float64Array;
}
const freshGrid = (): Grid => ({ own: new Int16Array(N).fill(-1), by: new Int16Array(N).fill(-1), ts: new Float64Array(N) });

interface Fx {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  r: number;
  ring?: boolean;
}
interface Throw {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  color: string;
}

interface Bot {
  idx: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  face: number;
}

/* ------------------------------------------------------------------ เกม */

export function TurfGame({ engine, deadline, sync, me, preview, onLeave, world: info }: GameProps) {
  const stage = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const now = useCallback(() => (info ? info.now() : Date.now()), [info]);

  // ตัวเรา: ลำดับในห้อง (ใช้แทนชื่อในข้อความ) และสีที่ยึด
  const myIdx = info ? Math.max(0, info.players.findIndex((p) => p.id === info.myId)) : 0;
  const myOwner = info ? ownerOf(info, info.myId) : 0;
  const ownerOfIdx = (i: number) => (info ? (info.teams > 0 ? i % info.teams : i % TEAM_COLORS.length) : i % TEAM_COLORS.length);

  const grid = useRef<Grid>(freshGrid());
  const shields = useRef(new Map<number, number>());
  const ghosts = useRef(new Map<string, Ghost>());
  const fx = useRef<Fx[]>([]);
  const throws = useRef<Throw[]>([]);
  const outbox = useRef<number[]>([]);
  const bots = useRef<Bot[]>([]);
  const mini = useRef<HTMLCanvasElement | null>(null);

  // ตำแหน่งเกิด: ป้อมของทีม/สี
  const spawn = FORTS[myOwner % FORTS.length];
  const hero = useRef({ x: (spawn.cx + 0.5) * CELL, y: (spawn.cy + 2.5) * CELL, face: 1, moving: false, last: -1, shoe: 0, step: 0 });
  const ink = useRef(INK_START);
  const inv = useRef<Record<Item, number>>({ shoe: 0, bomb: 0, shield: 0 });
  const stats = useRef({ items: 0, best: 0 });

  const [hud, setHud] = useState({ ink: INK_START, score: 0, left: 0, inFort: false, shoe: 0, shield: 0, inv: { shoe: 0, bomb: 0, shield: 0 }, board: [] as { o: number; n: number }[] });
  const [over, setOver] = useState(false);
  const [askOff, setAskOff] = useState(false);
  const [streak, setStreak] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'ok' | 'bad' | 'wave'; at: number } | null>(null);
  const say = (text: string, kind: 'ok' | 'bad' | 'wave') => setBanner({ text, kind, at: Date.now() });
  const { joy, handlers, dir } = useMoveInput(!over);
  const [, setSpriteTick] = useState(0);
  const redraw = useCallback(() => setSpriteTick((x) => x + 1), []);

  const inFort = hud.inFort;
  const dockOpen = inFort && !askOff && !over;
  const hasItem = hud.inv.shoe + hud.inv.bomb + hud.inv.shield > 0;
  const coach = useCoach(
    [
      { id: 'move', target: '.tw-stage', text: 'ลากนิ้วบนจอ หรือกดลูกศร เดินระบายสีพื้น' },
      { id: 'fort', target: '.tw-ink', text: 'หมึกใกล้หมด วิ่งเข้าป้อมเพื่อเติม', when: () => hud.ink < 35, doneIf: () => inFort },
      { id: 'answer', target: DOCK_CHOICES, text: 'เลือกตัวเลือก ตอบถูกหมึกเต็มถังพร้อมไอเท็ม', when: () => dockOpen },
      { id: 'item', target: '.tw-items', text: 'กดใช้ไอเท็มที่ได้', when: () => hasItem, optional: true },
    ],
    { loops: 1, active: !over }
  );

  /* ---------- ระบายสี (กติกาเดียวกันทุกเครื่อง: ใครมาทีหลังชนะ ยกเว้นพื้นที่ติดโล่) ---------- */
  const paint = useCallback(
    (cell: number, owner: number, painter: number, t: number) => {
      const g = grid.current;
      if (cell < 0 || cell >= N || FORT_CELL[cell]) return false;
      const cur = g.own[cell];
      if (cur === owner && g.by[cell] === painter) return false;
      if (cur >= 0 && cur !== owner && (shields.current.get(cur) || 0) > now()) return false;
      if (t < g.ts[cell]) return false;
      g.own[cell] = owner;
      g.by[cell] = painter;
      g.ts[cell] = t;
      return true;
    },
    [now]
  );

  const splash = (x: number, y: number, color: string, n = 6, power = 120) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = power * (0.4 + Math.random());
      fx.current.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5, max: 0.5, color, r: 4 + Math.random() * 5 });
    }
    if (fx.current.length > 300) fx.current.splice(0, fx.current.length - 300);
  };

  const bombAt = useCallback(
    (x: number, y: number, owner: number, painter: number, t: number) => {
      const c0 = Math.floor(x / CELL);
      const r0 = Math.floor(y / CELL);
      for (let r = r0 - BOMB_R; r <= r0 + BOMB_R; r++)
        for (let c = c0 - BOMB_R; c <= c0 + BOMB_R; c++) {
          if (c < 0 || r < 0 || c >= GW || r >= GH) continue;
          if ((c - c0) ** 2 + (r - r0) ** 2 > BOMB_R * BOMB_R + 1) continue;
          paint(r * GW + c, owner, painter, t);
        }
      fx.current.push({ x, y, vx: 0, vy: 0, life: 0.6, max: 0.6, color: TEAM_COLORS[owner], r: BOMB_R * CELL, ring: true });
      splash(x, y, TEAM_COLORS[owner], 18, 260);
    },
    [paint]
  );

  /* ---------- เครือข่าย ---------- */
  const snapDone = useRef(false);
  const net = useWorldNet(info, (m: NetMsg) => {
    const p = m.p;
    if (m.e === 'pos') {
      const i = Number(p.i);
      if (!Number.isInteger(i) || i === myIdx) return;
      const id = String(i);
      const x = Math.max(0, Math.min(MW, Number(p.x) || 0));
      const y = Math.max(0, Math.min(MH, Number(p.y) || 0));
      const g = ghosts.current.get(id);
      if (g) Object.assign(g, { tx: x, ty: y, face: Number(p.f) || 1, seen: Date.now(), st: String(p.s || '') });
      else ghosts.current.set(id, { id, x, y, tx: x, ty: y, face: 1, seen: Date.now(), st: String(p.s || '') });
      const t = Number(p.t) || now();
      if (Array.isArray(p.c)) for (const c of p.c.slice(0, 200)) if (Number.isInteger(c)) paint(c as number, ownerOfIdx(i), i, t);
    } else if (m.e === 'bomb') {
      const i = Number(p.i);
      if (!Number.isInteger(i)) return;
      const x = Number(p.x) || 0;
      const y = Number(p.y) || 0;
      const from = ghosts.current.get(String(i));
      if (from) throws.current.push({ x0: from.x, y0: from.y, x1: x, y1: y, t: 0, color: TEAM_COLORS[ownerOfIdx(i)] });
      setTimeout(() => {
        bombAt(x, y, ownerOfIdx(i), i, Number(p.t) || now());
        const h = hero.current;
        if (Math.hypot(h.x - x, h.y - y) < (BOMB_R + 0.5) * CELL) {
          gsfx.splat();
          say('โดนระเบิดสี! พื้นรอบตัวถูกยึด', 'bad');
        }
      }, 450);
    } else if (m.e === 'shield') {
      const o = Number(p.o);
      const until = Number(p.until) || 0;
      if (Number.isInteger(o) && until > (shields.current.get(o) || 0)) shields.current.set(o, Math.min(until, now() + SHIELD_SEC * 1000 + 2000));
    } else if (m.e === 'hello') {
      // คนเข้ามาใหม่/รีเฟรช: ผู้เล่นลำดับน้อยสุดที่ยังอยู่ส่งแผนที่ทั้งหมดให้
      const alive = [myIdx, ...Array.from(ghosts.current.keys()).map(Number)].filter((x) => x !== Number(p.i));
      if (Math.min(...alive) !== myIdx) return;
      setTimeout(() => {
        const g = grid.current;
        let o = '';
        let b = '';
        for (let k = 0; k < N; k++) {
          o += String.fromCharCode(49 + g.own[k]);
          b += String.fromCharCode(49 + g.by[k]);
        }
        net.send('snap', { o, b, t: now() });
      }, 150 + Math.random() * 300);
    } else if (m.e === 'snap' && !snapDone.current) {
      snapDone.current = true;
      const o = String(p.o || '');
      const b = String(p.b || '');
      const t = (Number(p.t) || now()) - 1;
      if (o.length !== N || b.length !== N) return;
      for (let k = 0; k < N; k++) {
        const ow = o.charCodeAt(k) - 49;
        if (ow >= 0) paint(k, ow, b.charCodeAt(k) - 49, t);
      }
    }
  });
  const sentHello = useRef(false);
  useEffect(() => {
    if (!net.live || sentHello.current) return;
    sentHello.current = true;
    net.send('hello', { i: myIdx });
  }, [net, myIdx]);

  /* ---------- ทดลองเล่นคนเดียว: มีเพื่อนจำลอง 2 คนให้เห็นภาพ ---------- */
  useEffect(() => {
    if (info) return;
    const r = rng(hashStr('bots'));
    bots.current = [1, 2].map((idx) => {
      const f = FORTS[idx];
      const x = (f.cx + 0.5) * CELL;
      const y = (f.cy + 2.5) * CELL;
      return { idx, x, y, tx: r() * MW, ty: r() * MH, face: 1 };
    });
  }, [info]);

  /* ---------- ใช้ไอเท็ม ---------- */
  const useItem = useCallback(
    (id: Item) => {
      if (over || inv.current[id] <= 0) return;
      const h = hero.current;
      const t = now();
      if (id === 'shoe') {
        h.shoe = Math.max(h.shoe, t) + SHOE_SEC * 1000;
        gsfx.boost();
        say('รองเท้าสปีด! วิ่งเร็ว 2 เท่า', 'ok');
      } else if (id === 'shield') {
        const until = t + SHIELD_SEC * 1000;
        shields.current.set(myOwner, until);
        net.send('shield', { o: myOwner, until });
        gsfx.levelUp();
        say('โล่ล็อกสี! พื้นที่ของเราโดนทับไม่ได้', 'ok');
      } else {
        // ปาใส่เพื่อนต่างสีที่ใกล้ที่สุด (ที่ไม่อยู่ในป้อม) ไม่มีก็ปาไปข้างหน้า
        let tx = h.x + h.face * 4 * CELL;
        let ty = h.y;
        let best = BOMB_RANGE;
        const cands: { x: number; y: number; idx: number; st: string }[] = [
          ...Array.from(ghosts.current.values()).map((g) => ({ x: g.x, y: g.y, idx: Number(g.id), st: g.st })),
          ...bots.current.map((b) => ({ x: b.x, y: b.y, idx: b.idx, st: '' })),
        ];
        for (const g of cands) {
          if (g.st === 'f' || ownerOfIdx(g.idx) === myOwner) continue;
          const d = Math.hypot(g.x - h.x, g.y - h.y);
          if (d < best) {
            best = d;
            tx = g.x;
            ty = g.y;
          }
        }
        tx = Math.max(CELL, Math.min(MW - CELL, tx));
        ty = Math.max(CELL, Math.min(MH - CELL, ty));
        throws.current.push({ x0: h.x, y0: h.y, x1: tx, y1: ty, t: 0, color: TEAM_COLORS[myOwner] });
        gsfx.shoot(1);
        net.send('bomb', { i: myIdx, x: Math.round(tx), y: Math.round(ty), t });
        setTimeout(() => {
          bombAt(tx, ty, myOwner, myIdx, t);
          gsfx.splat();
        }, 450);
        say(best < BOMB_RANGE ? 'ปาระเบิดสีใส่เพื่อน!' : 'ปาระเบิดสี!', 'ok');
      }
      inv.current[id]--;
      coach.hit('item');
    },
    [over, now, myOwner, myIdx, net, bombAt, coach]
  );

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      if (e.key === '1') useItem('shoe');
      if (e.key === '2') useItem('bomb');
      if (e.key === '3') useItem('shield');
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [useItem]);

  /* ---------- ตอบคำถามในป้อม ---------- */
  const onAnswered = useCallback(
    (o: LiveOutcome) => {
      setStreak(o.streak);
      if (o.correct) {
        ink.current = INK_MAX;
        const n = o.streak >= 3 && o.streak % 3 === 0 ? 2 : 1;
        const got: string[] = [];
        for (let i = 0; i < n; i++) {
          const it = ITEMS[Math.floor(Math.random() * ITEMS.length)];
          inv.current[it.id]++;
          got.push(it.name);
        }
        stats.current.items += n;
        gsfx.levelUp();
        say(`หมึกเต็มถัง! ได้ ${got.join(' + ')}`, 'ok');
      } else {
        ink.current = Math.min(INK_MAX, ink.current + 15);
        say('ยังไม่ถูก ได้หมึกนิดหน่อย ลองข้อต่อไป', 'bad');
      }
    },
    []
  );

  /* ---------- ส่งคะแนน ---------- */
  const scoreRef = useRef(0);
  const synced = useRef(-1);
  const doSync = useCallback(
    (force = false) => {
      if (!sync) return;
      if (!force && scoreRef.current === synced.current) return;
      synced.current = scoreRef.current;
      sync(scoreRef.current, { cells: scoreRef.current, items: stats.current.items });
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
    let miniAt = 0;
    let lastSent = { x: -1, y: -1, s: '' };
    const tile = makeTile();

    const step = (dt: number) => {
      const h = hero.current;
      const t = now();
      const d = dir();
      const fast = h.shoe > t;
      const dry = ink.current <= 0;
      const sp = SPEED * (fast ? 2 : 1) * (dry ? 0.7 : 1);
      h.moving = Math.abs(d.x) + Math.abs(d.y) > 0.05;
      if (h.moving) {
        h.x = Math.max(12, Math.min(MW - 12, h.x + d.x * sp * dt));
        h.y = Math.max(12, Math.min(MH - 12, h.y + d.y * sp * dt));
        if (Math.abs(d.x) > 0.2) h.face = d.x > 0 ? 1 : -1;
        h.step += dt * (fast ? 16 : 10);
      }
      const cell = cellOf(h.x, h.y);
      if (cell >= 0 && cell !== h.last) {
        h.last = cell;
        const g = grid.current;
        if (!FORT_CELL[cell] && !(g.own[cell] === myOwner && g.by[cell] === myIdx) && ink.current > 0) {
          if (paint(cell, myOwner, myIdx, t)) {
            ink.current = Math.max(0, ink.current - 1);
            outbox.current.push(cell);
            splash(h.x, h.y + 10, TEAM_COLORS[myOwner], 3, 80);
            if (Math.random() < 0.35) gsfx.step();
          }
        }
      }

      // เพื่อนจำลอง (ทดลองเล่น)
      for (const b of bots.current) {
        const dx = b.tx - b.x;
        const dy = b.ty - b.y;
        const dd = Math.hypot(dx, dy);
        if (dd < 20) {
          b.tx = CELL + Math.random() * (MW - 2 * CELL);
          b.ty = CELL + Math.random() * (MH - 2 * CELL);
        } else {
          b.x += (dx / dd) * 170 * dt;
          b.y += (dy / dd) * 170 * dt;
          b.face = dx > 0 ? 1 : -1;
        }
        paint(cellOf(b.x, b.y), ownerOfIdx(b.idx), b.idx, t);
      }

      moveGhosts(ghosts.current, dt, Date.now());
      throws.current.forEach((th) => (th.t += dt / 0.45));
      throws.current = throws.current.filter((th) => th.t < 1);
      fx.current.forEach((f) => {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vx *= 0.9;
        f.vy *= 0.9;
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
        setOver(true);
        doSync(true);
        gsfx.fanfare();
        return;
      }
      step(dt);
      const h = hero.current;

      // ส่งตำแหน่ง + ช่องที่เพิ่งระบาย (ไม่เกิน ~7 ครั้ง/วินาที ยืนนิ่งส่งทุก 2 วินาที)
      const status = fortAt(Math.floor(h.x / CELL), Math.floor(h.y / CELL)) >= 0 ? 'f' : '';
      const movedEnough = Math.abs(h.x - lastSent.x) + Math.abs(h.y - lastSent.y) > 4 || status !== lastSent.s;
      if (info && ((nowMs - sendAt > 140 && (movedEnough || outbox.current.length)) || nowMs - beatAt > 2000)) {
        sendAt = nowMs;
        beatAt = nowMs;
        lastSent = { x: h.x, y: h.y, s: status };
        net.send('pos', { i: myIdx, x: Math.round(h.x), y: Math.round(h.y), f: h.face, s: status, c: outbox.current.splice(0, 200), t: now() });
      } else if (!info) outbox.current.length = 0;

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
      if (ctx) {
        if (nowMs - miniAt > 250 || !mini.current) {
          miniAt = nowMs;
          mini.current = drawMini(mini.current, grid.current);
        }
        draw(ctx, pw, ph, k, tile, nowMs);
      }

      if (nowMs - hudAt > 160) {
        hudAt = nowMs;
        const g = grid.current;
        const counts = new Map<number, number>();
        let mine = 0;
        for (let i = 0; i < N; i++) {
          const o = g.own[i];
          if (o < 0) continue;
          counts.set(o, (counts.get(o) || 0) + 1);
          if (o === myOwner && g.by[i] === myIdx) mine++;
        }
        scoreRef.current = mine;
        const board = Array.from(counts.entries())
          .map(([o, n]) => ({ o, n }))
          .sort((a, b) => b.n - a.n)
          .slice(0, 4);
        const t = now();
        setHud({ ink: ink.current, score: mine, left: deadline ? deadline - Date.now() : 0, inFort: status === 'f', shoe: Math.max(0, h.shoe - t), shield: Math.max(0, (shields.current.get(myOwner) || 0) - t), inv: { ...inv.current }, board });
      }
    };

    /* ---------- วาด ---------- */
    const draw = (ctx: CanvasRenderingContext2D, pw: number, ph: number, k: number, pat: CanvasPattern | null, tms: number) => {
      const h = hero.current;
      const camX = Math.max(pw / 2 / k - 60, Math.min(MW - pw / 2 / k + 60, h.x));
      const camY = Math.max(ph / 2 / k - 60, Math.min(MH - ph / 2 / k + 60, h.y));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#7a6fc0';
      ctx.fillRect(0, 0, pw, ph);
      ctx.setTransform(k, 0, 0, k, pw / 2 - camX * k, ph / 2 - camY * k);

      // พื้นแผนที่
      ctx.fillStyle = '#f6f0e1';
      ctx.fillRect(0, 0, MW, MH);
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, MW, MH);
      }
      const c0 = Math.max(0, Math.floor((camX - pw / 2 / k) / CELL));
      const c1 = Math.min(GW - 1, Math.ceil((camX + pw / 2 / k) / CELL));
      const r0 = Math.max(0, Math.floor((camY - ph / 2 / k) / CELL));
      const r1 = Math.min(GH - 1, Math.ceil((camY + ph / 2 / k) / CELL));
      const g = grid.current;
      const t = now();
      for (let r = r0; r <= r1; r++)
        for (let cc = c0; cc <= c1; cc++) {
          const i = r * GW + cc;
          const o = g.own[i];
          if (o < 0) continue;
          const x = cc * CELL;
          const y = r * CELL;
          ctx.fillStyle = TEAM_COLORS[o];
          ctx.fillRect(x, y, CELL + 0.5, CELL + 0.5);
          ctx.fillStyle = LIGHT[o];
          ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 12);
          // ติดโล่: ลายเส้นทแยง
          if ((shields.current.get(o) || 0) > t) {
            ctx.strokeStyle = 'rgba(255,255,255,0.75)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + 6, y + CELL - 6);
            ctx.lineTo(x + CELL - 6, y + 6);
            ctx.stroke();
          }
        }
      // เส้นตาราง
      ctx.strokeStyle = 'rgba(42,35,80,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let cc = c0; cc <= c1 + 1; cc++) {
        ctx.moveTo(cc * CELL, r0 * CELL);
        ctx.lineTo(cc * CELL, (r1 + 1) * CELL);
      }
      for (let r = r0; r <= r1 + 1; r++) {
        ctx.moveTo(c0 * CELL, r * CELL);
        ctx.lineTo((c1 + 1) * CELL, r * CELL);
      }
      ctx.stroke();
      // ขอบแผนที่
      ctx.strokeStyle = INK;
      ctx.lineWidth = 8;
      ctx.strokeRect(-4, -4, MW + 8, MH + 8);

      FORTS.forEach((f, i) => drawFort(ctx, f.cx, f.cy, i, tms));

      // ระเบิดลอย
      for (const th of throws.current) {
        const x = th.x0 + (th.x1 - th.x0) * th.t;
        const y = th.y0 + (th.y1 - th.y0) * th.t - Math.sin(th.t * Math.PI) * 120;
        ctx.fillStyle = th.color;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // ผู้เล่น (เรียงตาม y ให้ซ้อนกันถูก)
      const people: { x: number; y: number; face: number; idx: number; name: string; av: number; gear?: GameProps['me']['gear']; st: string; meNow?: boolean; moving: boolean; stepT: number }[] = [];
      ghosts.current.forEach((gh) => {
        const idx = Number(gh.id);
        const p = info?.players[idx];
        people.push({ x: gh.x, y: gh.y, face: gh.face, idx, name: p?.nickname || 'เพื่อน', av: p?.avatar ?? idx % 12, gear: p?.gear, st: gh.st, moving: Math.abs(gh.tx - gh.x) + Math.abs(gh.ty - gh.y) > 2, stepT: tms / 90 });
      });
      bots.current.forEach((b) => people.push({ x: b.x, y: b.y, face: b.face, idx: b.idx, name: b.idx === 1 ? 'เพื่อนจำลอง 1' : 'เพื่อนจำลอง 2', av: b.idx * 3, st: '', moving: true, stepT: tms / 90 }));
      people.push({ x: h.x, y: h.y, face: h.face, idx: myIdx, name: me.nickname, av: me.avatar, gear: me.gear, st: fortAt(Math.floor(h.x / CELL), Math.floor(h.y / CELL)) >= 0 ? 'f' : '', meNow: true, moving: h.moving, stepT: h.step });
      people.sort((a, b) => a.y - b.y);
      for (const p of people) drawPerson(ctx, p, tms);

      // ละอองสี
      for (const f of fx.current) {
        const a = Math.max(0, f.life / f.max);
        if (f.ring) {
          ctx.globalAlpha = a;
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 10 * a + 2;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * (1.1 - a * 0.6), 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.globalAlpha = a;
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * (0.5 + a * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // หมึกใกล้หมด: ลูกศรชี้ป้อมที่ใกล้ที่สุด
      if (ink.current < 12 && fortAt(Math.floor(h.x / CELL), Math.floor(h.y / CELL)) < 0) {
        let best = FORTS[0];
        let bd = Infinity;
        for (const f of FORTS) {
          const d = Math.hypot((f.cx + 0.5) * CELL - h.x, (f.cy + 0.5) * CELL - h.y);
          if (d < bd) {
            bd = d;
            best = f;
          }
        }
        const a = Math.atan2((best.cy + 0.5) * CELL - h.y, (best.cx + 0.5) * CELL - h.x);
        const bob = Math.sin(tms / 160) * 6;
        ctx.save();
        ctx.translate(h.x + Math.cos(a) * (70 + bob), h.y + Math.sin(a) * (70 + bob));
        ctx.rotate(a);
        ctx.fillStyle = '#ffcf3f';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-10, -16);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-10, 16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // แผนที่ย่อมุมขวาบน
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (mini.current) {
        const mw = Math.round(Math.min(170 * dprOf(), pw * 0.3));
        const mh = Math.round((mw * GH) / GW);
        const mx = pw - mw - 10 * dprOf();
        const my = 10 * dprOf();
        ctx.fillStyle = INK;
        ctx.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
        ctx.drawImage(mini.current, mx, my, mw, mh);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mx + (h.x / MW) * mw, my + (h.y / MH) * mh, 4 * dprOf(), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    };

    const dprOf = () => Math.min(2, window.devicePixelRatio || 1);

    const drawFort = (ctx: CanvasRenderingContext2D, cx: number, cy: number, i: number, tms: number) => {
      const x = (cx - 1) * CELL;
      const y = (cy - 1) * CELL;
      const s = CELL * 3;
      ctx.fillStyle = '#d8d0ee';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 5;
      roundRect(ctx, x + 4, y + 4, s - 8, s - 8, 16);
      ctx.fill();
      ctx.stroke();
      // ลายหิน
      ctx.strokeStyle = 'rgba(42,35,80,0.18)';
      ctx.lineWidth = 2;
      for (let k2 = 1; k2 < 3; k2++) {
        ctx.beginPath();
        ctx.moveTo(x + 12, y + (s * k2) / 3);
        ctx.lineTo(x + s - 12, y + (s * k2) / 3);
        ctx.stroke();
      }
      // หอคอยกลาง
      const tx = x + s / 2;
      const ty = y + s / 2;
      ctx.fillStyle = '#fff8ec';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      roundRect(ctx, tx - 22, ty - 18, 44, 40, 8);
      ctx.fill();
      ctx.stroke();
      for (let k2 = -1; k2 <= 1; k2++) {
        ctx.beginPath();
        ctx.rect(tx + k2 * 15 - 6, ty - 28, 12, 12);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = INK;
      roundRect(ctx, tx - 8, ty + 2, 16, 20, 7);
      ctx.fill();
      // ธงสะบัด
      const wave = Math.sin(tms / 220 + i) * 4;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tx, ty - 28);
      ctx.lineTo(tx, ty - 58);
      ctx.stroke();
      ctx.fillStyle = '#ffcf3f';
      ctx.beginPath();
      ctx.moveTo(tx, ty - 58);
      ctx.quadraticCurveTo(tx + 14, ty - 54 + wave, tx + 26, ty - 50);
      ctx.lineTo(tx, ty - 42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // หยดหมึก
      ctx.fillStyle = '#3d8bff';
      ctx.beginPath();
      ctx.arc(x + 20, y + s - 22, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s - 20, y + s - 22, 8, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawPerson = (ctx: CanvasRenderingContext2D, p: { x: number; y: number; face: number; idx: number; name: string; av: number; gear?: GameProps['me']['gear']; st: string; meNow?: boolean; moving: boolean; stepT: number }, tms: number) => {
      const owner = p.meNow ? myOwner : ownerOfIdx(p.idx);
      const col = TEAM_COLORS[owner];
      const bob = p.moving ? Math.abs(Math.sin(p.stepT)) * 6 : Math.sin(tms / 400 + p.idx) * 1.5;
      // เงา + วงสีประจำตัว
      ctx.fillStyle = 'rgba(42,35,80,0.25)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 20, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 20, 24, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      const img = avatarSprite(p.av, p.gear, redraw);
      const sz = p.meNow ? 76 : 66;
      ctx.save();
      ctx.translate(p.x, p.y - bob - 12);
      if (p.face < 0) ctx.scale(-1, 1);
      if (img) ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz * (132 / 128));
      else {
        ctx.fillStyle = col;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      // อยู่ในป้อม: ฟองโล่
      if (p.st === 'f') {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.fillStyle = 'rgba(160,220,255,0.25)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 10, 44, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // ป้ายชื่อ
      ctx.font = `800 ${p.meNow ? 15 : 13}px "Noto Sans Thai", sans-serif`;
      const name = p.meNow ? 'ฉัน' : p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name;
      const w = ctx.measureText(name).width + 16;
      ctx.fillStyle = p.meNow ? '#ffcf3f' : '#fff';
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      roundRect(ctx, p.x - w / 2, p.y - 70 - bob, w, 22, 11);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, p.x, p.y - 59 - bob);
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
  // ออกจากป้อมแล้ว: ครั้งหน้าเข้าป้อมเปิดแผงคำถามให้อีก
  useEffect(() => {
    if (!inFort) setAskOff(false);
    else coach.hit('fort');
  }, [inFort, coach]);
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

  const inkPct = Math.max(0, Math.min(1, hud.ink / INK_MAX));
  const leader = hud.board[0];
  const labelOf = (o: number) => (info?.teams ? ownerName(info, o) : o === myOwner ? 'ฉัน' : info ? info.players.find((p, i) => ownerOfIdx(i) === o)?.nickname || 'เพื่อน' : `เพื่อนจำลอง ${o}`);

  return (
    <div className="mb gm-root tw" ref={rootRef} data-over={over} data-dock={dockOpen}>
      <CoachArrow coach={coach} root={rootRef} />
      <div className="gm-main">
        <div className="mb-hud">
          <span className="cf-chip tw-ink" data-low={inkPct < 0.2}>
            <Droplet size={18} />
            <span className="tw-inkbar">
              <i style={{ width: `${inkPct * 100}%`, background: TEAM_COLORS[myOwner] }} />
            </span>
            <b>{Math.ceil(hud.ink)}</b>
          </span>
          <span className="flex-1" />
          <span className="cf-chip cf-earned">
            ยึดได้ <b>{hud.score.toLocaleString('th-TH')}</b> ช่อง
          </span>
          {deadline && (
            <span className="cf-chip cf-time" data-urgent={hud.left < 30000}>
              {fmtLeft(hud.left)}
            </span>
          )}
        </div>

        <div className="mb-stage tw-stage" ref={stage} {...handlers}>
          <canvas ref={cvs} className="mb-canvas" aria-label="แผนที่ศึกยึดอาณาจักร ใช้ปุ่มลูกศรหรือลากนิ้วเพื่อเดินระบายสี" />

          {/* ตารางคะแนนพื้นที่ */}
          <div className="tw-board" data-ui>
            {hud.board.map((b, i) => (
              <span key={b.o} data-me={b.o === myOwner}>
                <i style={{ background: TEAM_COLORS[b.o] }} />
                <em>{i + 1}</em>
                <b>{labelOf(b.o)}</b>
                <small>{Math.round((b.n / N) * 100)}%</small>
              </span>
            ))}
            {!leader && <span className="tw-board-empty">เดินระบายสีเลย!</span>}
          </div>

          {(hud.shoe > 0 || hud.shield > 0) && (
            <div className="tw-effects" data-ui>
              {hud.shoe > 0 && (
                <span style={{ background: '#3d8bff' }}>
                  <Footprints className="w-4 h-4" /> {Math.ceil(hud.shoe / 1000)}
                </span>
              )}
              {hud.shield > 0 && (
                <span style={{ background: '#25c48a' }}>
                  <Shield className="w-4 h-4" /> {Math.ceil(hud.shield / 1000)}
                </span>
              )}
            </div>
          )}

          {joy && (
            <div className="mb-joy" style={{ left: joy.ox, top: joy.oy }} aria-hidden="true">
              <span className="mb-joy-knob" style={{ transform: `translate(${joy.x}px, ${joy.y}px)` }} />
            </div>
          )}

          {hud.ink <= 0 && !inFort && (
            <div className="cf-hint mb-tip tw-dry">
              <Castle className="w-5 h-5" /> หมึกหมด! วิ่งตามลูกศรเข้าป้อมเพื่อเติมหมึก
            </div>
          )}

          {banner && (
            <div className="td-banner" data-kind={banner.kind} key={banner.at}>
              {banner.text}
            </div>
          )}
        </div>

        <div className="mb-bar tw-items">
          {ITEMS.map((it, i) => (
            <button key={it.id} type="button" className="tw-item" data-has={hud.inv[it.id] > 0} disabled={over || hud.inv[it.id] <= 0} onClick={() => useItem(it.id)} style={{ ['--ic' as string]: it.color }} title={`${it.desc} (กด ${i + 1})`}>
              <span className="tw-item-ic">{it.id === 'shoe' ? <Footprints className="w-6 h-6" /> : it.id === 'bomb' ? <Bomb className="w-6 h-6" /> : <Shield className="w-6 h-6" />}</span>
              <span>
                <b>{it.name}</b>
                <small>{it.desc}</small>
              </span>
              <em>{hud.inv[it.id]}</em>
            </button>
          ))}
          {preview && <span className="tw-note">ทดลองเล่น: มีเพื่อนจำลอง 2 คน</span>}
        </div>
      </div>

      <QuestionDock
        engine={engine}
        open={dockOpen}
        title="ป้อมเติมหมึก"
        hint="อยู่ในป้อมปลอดภัย ตอบถูก = หมึกเต็มถัง + ไอเท็ม"
        icon={<Castle className="w-5 h-5" />}
        color="#ff4fa3"
        streak={streak}
        rewardText={() => 'ถูก! หมึกเต็มถัง ได้ไอเท็ม'}
        onAnswered={onAnswered}
        onClose={() => setAskOff(true)}
      />

      {over && (
        <div className="gm-over">
          <div className="gm-over-card">
            <p className="gm-over-tag">หมดเวลา!</p>
            <div className="gm-over-big">{hud.score.toLocaleString('th-TH')}</div>
            <p className="font-bold">ช่องที่ฉันยึดได้</p>
            <div className="gm-over-stats">
              <span>
                <b>{Math.round((hud.score / N) * 100)}%</b>ของแผนที่
              </span>
              <span>
                <b>{stats.current.items}</b>ไอเท็ม
              </span>
              {leader && (
                <span>
                  <b style={{ color: TEAM_COLORS[leader.o] }}>{labelOf(leader.o)}</b>ยึดได้มากสุด
                </span>
              )}
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

/** ลายพื้นตารางหมากรุกอ่อนๆ */
function makeTile(): CanvasPattern | null {
  const t = document.createElement('canvas');
  t.width = CELL * 2;
  t.height = CELL * 2;
  const c = t.getContext('2d');
  if (!c) return null;
  c.fillStyle = '#f6f0e1';
  c.fillRect(0, 0, CELL * 2, CELL * 2);
  c.fillStyle = '#efe6d2';
  c.fillRect(0, 0, CELL, CELL);
  c.fillRect(CELL, CELL, CELL, CELL);
  c.fillStyle = 'rgba(42,35,80,0.06)';
  c.beginPath();
  c.arc(CELL / 2, CELL / 2, 3, 0, Math.PI * 2);
  c.arc(CELL * 1.5, CELL * 1.5, 3, 0, Math.PI * 2);
  c.fill();
  const ctx = document.createElement('canvas').getContext('2d');
  return ctx ? ctx.createPattern(t, 'repeat') : null;
}

/** แผนที่ย่อ (1 พิกเซลต่อช่อง ขยายตอนวาด) */
function drawMini(prev: HTMLCanvasElement | null, g: Grid): HTMLCanvasElement {
  const c = prev || document.createElement('canvas');
  c.width = GW;
  c.height = GH;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const img = ctx.createImageData(GW, GH);
  const rgb = TEAM_COLORS.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  for (let i = 0; i < N; i++) {
    const o = g.own[i];
    const [r, gg, b] = FORT_CELL[i] ? [216, 208, 238] : o >= 0 ? rgb[o] : [246, 240, 225];
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = gg;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

