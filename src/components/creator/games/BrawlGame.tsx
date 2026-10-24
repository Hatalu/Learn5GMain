'use client';

import './games.css';
import './games-live.css';
import './brawl-fish.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LogOut, Sparkles, Swords, Zap } from 'lucide-react';
import { Avatar } from '../Avatar';
import { Clock, Heart } from './art';
import { QuestionDock } from './QuestionPad';
import { CoachArrow, DOCK_CHOICES, useCoach } from './Coach';
import type { GameProps } from './types';
import { gsfx } from '@/lib/game-creator/gsound';

/* ============================== ค่าของเกม ============================== */

const HERO_R = 20;
const BASE_SPEED = 185;
const BASE_HP = 100;
const BOSS_EVERY = 90;
const MAX_MONS = 140;
const PICK_SECONDS = 10;
/** ระหว่างเลือกอาวุธ / เปิดแผงคำถาม มอนสเตอร์ช้าลง (เกมไม่หยุด) */
const SLOW_PICK = 0.3;
const SLOW_ASK = 0.6;

export type WId = 'star' | 'orb' | 'hammer' | 'shield' | 'bolt' | 'boom' | 'shoes' | 'heart';
type OptId = WId | 'potion';

const WEAPONS: { id: WId; name: string; max: number; color: string; desc: (lv: number) => string }[] = [
  { id: 'star', name: 'ดาวกระจาย', max: 5, color: '#ffd84a', desc: (lv) => (lv === 0 ? 'ยิงดาวใส่ตัวที่ใกล้สุด' : `ยิงทีละ ${1 + Math.floor(lv / 2)} ดวง แรงขึ้น`) },
  { id: 'orb', name: 'ลูกไฟหมุน', max: 5, color: '#ff7a3d', desc: (lv) => (lv === 0 ? 'ลูกไฟ 2 ลูกหมุนรอบตัว' : `ลูกไฟ ${lv + 2} ลูก วงกว้างขึ้น`) },
  { id: 'hammer', name: 'ค้อนยักษ์', max: 5, color: '#a9b3c9', desc: (lv) => (lv === 0 ? 'ทุบพื้นสะเทือนรอบตัว' : 'ทุบแรงขึ้น กว้างขึ้น บ่อยขึ้น') },
  { id: 'shield', name: 'โล่แสง', max: 5, color: '#5ccbff', desc: (lv) => (lv === 0 ? 'วงแสงเผาตัวที่เข้าใกล้ กันดาเมจ' : 'วงแสงกว้างขึ้น กันดาเมจมากขึ้น') },
  { id: 'bolt', name: 'สายฟ้าฟาด', max: 5, color: '#9b6cf0', desc: (lv) => (lv === 0 ? 'ฟ้าผ่ามอนสเตอร์แบบสุ่ม' : `ผ่าทีละ ${lv + 2} ตัว`) },
  { id: 'boom', name: 'บูมเมอแรง', max: 5, color: '#3fd6a8', desc: (lv) => (lv === 0 ? 'ขว้างแล้วกลับมา ทะลุทุกตัว' : 'ขว้างได้มากขึ้น แรงขึ้น') },
  { id: 'shoes', name: 'รองเท้าติดปีก', max: 3, color: '#ff9a3d', desc: () => 'เดินเร็วขึ้น' },
  { id: 'heart', name: 'หัวใจยักษ์', max: 3, color: '#ff6b7a', desc: () => 'พลังชีวิตสูงสุดเพิ่ม และฟื้นเต็ม' },
];
const wdef = (id: WId) => WEAPONS.find((x) => x.id === id)!;

type MonKind = 'blob' | 'bat' | 'mush' | 'ghost' | 'boss';
interface Mon {
  id: number;
  kind: MonKind;
  x: number;
  y: number;
  hp: number;
  max: number;
  speed: number;
  r: number;
  dmg: number;
  color: string;
  hit: number;
  orbHit: number;
  kbx: number;
  kby: number;
  kb: number;
  ph: number;
}
interface Proj {
  kind: 'star' | 'boom';
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
  pierce: number;
  hits: number[];
  spin: number;
  back: boolean;
}
interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  r: number;
  text?: string;
  ring?: number;
}
interface Gem {
  x: number;
  y: number;
  v: number;
  pull: boolean;
}
interface World {
  t: number;
  hx: number;
  hy: number;
  hp: number;
  hpMax: number;
  inv: number;
  down: number;
  face: number;
  dirx: number;
  diry: number;
  moving: boolean;
  wl: Record<WId, number>;
  cd: Record<string, number>;
  orbAng: number;
  auraTick: number;
  slam: { t: number; x: number; y: number; r: number; dmg: number; done: boolean } | null;
  bolts: { x: number; y: number; life: number }[];
  mons: Mon[];
  projs: Proj[];
  bits: Bit[];
  gems: Gem[];
  spawnCd: number;
  nextBoss: number;
  seq: number;
  kills: number;
  bossKills: number;
  score: number;
  level: number;
  downs: number;
  shake: number;
  slow: number;
}

const fresh = (): World => ({
  t: 0,
  hx: 0,
  hy: 0,
  hp: BASE_HP,
  hpMax: BASE_HP,
  inv: 2,
  down: 0,
  face: 1,
  dirx: 1,
  diry: 0,
  moving: false,
  wl: { star: 1, orb: 0, hammer: 0, shield: 0, bolt: 0, boom: 0, shoes: 0, heart: 0 },
  cd: {},
  orbAng: 0,
  auraTick: 0,
  slam: null,
  bolts: [],
  mons: [],
  projs: [],
  bits: [],
  gems: [],
  spawnCd: 1.2,
  nextBoss: BOSS_EVERY,
  seq: 1,
  kills: 0,
  bossKills: 0,
  score: 0,
  level: 1,
  downs: 0,
  shake: 0,
  slow: 1,
});

const MON_COLORS: Record<MonKind, string[]> = {
  blob: ['#7ddc86', '#ff8fc4', '#ffb35c', '#5ccbff'],
  bat: ['#a77cf2', '#7e52cf'],
  mush: ['#ff6b7a', '#ff9a3d'],
  ghost: ['#e8e2ff', '#d6f3ff'],
  boss: ['#ff5c7a'],
};

function spawnMon(w: World, kind: MonKind, hw: number, hh: number) {
  const min = w.t / 60;
  const scale = 1 + min * 0.5;
  const a = Math.random() * Math.PI * 2;
  const dist = Math.hypot(hw, hh) + 40;
  const base = {
    blob: { hp: 22, speed: 62, r: 17, dmg: 7 },
    bat: { hp: 14, speed: 104, r: 14, dmg: 5 },
    mush: { hp: 60, speed: 44, r: 22, dmg: 11 },
    ghost: { hp: 34, speed: 78, r: 18, dmg: 8 },
    boss: { hp: 750, speed: 52, r: 56, dmg: 18 },
  }[kind];
  const cols = MON_COLORS[kind];
  const hp = base.hp * scale;
  w.mons.push({
    id: w.seq++,
    kind,
    x: w.hx + Math.cos(a) * dist,
    y: w.hy + Math.sin(a) * dist,
    hp,
    max: hp,
    speed: base.speed * (1 + Math.min(0.6, min * 0.07)),
    r: base.r,
    dmg: base.dmg * (1 + min * 0.12),
    color: cols[Math.floor(Math.random() * cols.length)],
    hit: 0,
    orbHit: 0,
    kbx: 0,
    kby: 0,
    kb: 0,
    ph: Math.random() * 6,
  });
}

const heroSpeed = (w: World) => BASE_SPEED * (1 + 0.15 * w.wl.shoes);
const shieldCut = (w: World) => Math.min(0.5, 0.1 * w.wl.shield);
const auraR = (w: World) => 62 + 11 * w.wl.shield;
const orbR = (w: World) => 74 + 8 * w.wl.orb;

function hurtMon(w: World, m: Mon, dmg: number, kx = 0, ky = 0, kb = 0) {
  m.hp -= dmg;
  m.hit = 0.1;
  if (kb > 0 && m.kind !== 'boss') {
    m.kbx = kx;
    m.kby = ky;
    m.kb = kb;
  }
  if (Math.random() < 0.35 || dmg >= 40) w.bits.push({ x: m.x + (Math.random() - 0.5) * 10, y: m.y - m.r - 4, vx: 0, vy: -46, life: 0.6, max: 0.6, color: '#fff', r: 0, text: String(Math.round(dmg)) });
}

function nova(w: World, radius: number, dmg: number) {
  w.mons.forEach((m) => {
    const d = Math.hypot(m.x - w.hx, m.y - w.hy);
    if (d < radius) hurtMon(w, m, dmg, ((m.x - w.hx) / (d || 1)) * 420, ((m.y - w.hy) / (d || 1)) * 420, 0.3);
  });
  w.bits.push({ x: w.hx, y: w.hy, vx: 0, vy: 0, life: 0.6, max: 0.6, color: '#ffd84a', r: 0, ring: radius });
  w.bits.push({ x: w.hx, y: w.hy, vx: 0, vy: 0, life: 0.45, max: 0.45, color: '#fff', r: 0, ring: radius * 0.6 });
  w.shake = 0.35;
}

/* ============================== วาด ============================== */

const INK = '#2a2350';

function makeTile(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#9fe08f';
  g.fillRect(0, 0, 256, 256);
  // หย่อมหญ้าเข้ม
  const rnd = (() => {
    let s = 7;
    return () => ((s = (s * 9301 + 49297) % 233280), s / 233280);
  })();
  for (let i = 0; i < 9; i++) {
    g.fillStyle = 'rgba(70,160,80,0.18)';
    g.beginPath();
    g.ellipse(rnd() * 256, rnd() * 256, 20 + rnd() * 30, 12 + rnd() * 16, rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    g.strokeStyle = 'rgba(60,140,70,0.55)';
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - 3, y - 7);
    g.moveTo(x + 3, y);
    g.lineTo(x + 5, y - 6);
    g.stroke();
  }
  const fl = ['#fff', '#ffd84a', '#ff9ec4'];
  for (let i = 0; i < 8; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    g.fillStyle = fl[i % 3];
    for (let k = 0; k < 5; k++) {
      g.beginPath();
      g.arc(x + Math.cos((k * Math.PI * 2) / 5) * 3, y + Math.sin((k * Math.PI * 2) / 5) * 3, 2.2, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#ffb35c';
    g.beginPath();
    g.arc(x, y, 1.6, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

function eyes(ctx: CanvasRenderingContext2D, x: number, y: number, gap: number, r: number, lx: number, ly: number, mad = false) {
  [-1, 1].forEach((s) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + s * gap, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x + s * gap + lx * r * 0.35, y + ly * r * 0.35, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    if (mad) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x + s * gap - s * r, y - r * 1.25);
      ctx.lineTo(x + s * gap + s * r * 0.6, y - r * 0.75);
      ctx.stroke();
    }
  });
}

function drawMon(ctx: CanvasRenderingContext2D, m: Mon, hx: number, hy: number, t: number) {
  const d = Math.hypot(hx - m.x, hy - m.y) || 1;
  const lx = (hx - m.x) / d;
  const ly = (hy - m.y) / d;
  const r = m.r;
  const bob = Math.sin(t * 8 + m.ph) * 0.06;
  ctx.save();
  ctx.translate(m.x, m.y);
  // เงา
  ctx.fillStyle = 'rgba(42,35,80,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.9, r * 0.9, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = INK;
  ctx.fillStyle = m.color;
  if (m.kind === 'blob' || m.kind === 'boss') {
    ctx.scale(1 + bob, 1 - bob);
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.6);
    ctx.quadraticCurveTo(-r * 1.05, -r * 0.9, 0, -r);
    ctx.quadraticCurveTo(r * 1.05, -r * 0.9, r, r * 0.6);
    ctx.quadraticCurveTo(0, r * 0.95, -r, r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // เขา
    ctx.fillStyle = '#fff8ec';
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.35, -r * 0.88);
      ctx.lineTo(s * r * 0.55, -r * 1.35);
      ctx.lineTo(s * r * 0.7, -r * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2);
    ctx.fill();
    eyes(ctx, 0, -r * 0.15, r * 0.36, r * 0.24, lx, ly, m.kind === 'boss');
    if (m.kind === 'boss') {
      // มงกุฎ
      ctx.fillStyle = '#ffd84a';
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.95);
      ctx.lineTo(-r * 0.45, -r * 1.45);
      ctx.lineTo(-r * 0.15, -r * 1.2);
      ctx.lineTo(0, -r * 1.6);
      ctx.lineTo(r * 0.15, -r * 1.2);
      ctx.lineTo(r * 0.45, -r * 1.45);
      ctx.lineTo(r * 0.4, -r * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(0, r * 0.32, r * 0.16, 0, Math.PI);
      ctx.fill();
    } else {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, r * 0.22, r * 0.16, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  } else if (m.kind === 'bat') {
    const flap = Math.sin(t * 18 + m.ph);
    ctx.fillStyle = '#5a3f9e';
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.5, -r * 0.2);
      ctx.quadraticCurveTo(s * r * 1.6, -r * (0.9 + flap * 0.6), s * r * 2.0, -r * 0.1 + flap * r * 0.3);
      ctx.quadraticCurveTo(s * r * 1.4, r * 0.1, s * r * 1.2, r * 0.45);
      ctx.quadraticCurveTo(s * r * 0.9, r * 0.2, s * r * 0.5, r * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd84a';
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.arc(s * r * 0.36 + lx * 2, -r * 0.1 + ly * 2, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 0.3);
    ctx.lineTo(-r * 0.1, r * 0.55);
    ctx.lineTo(0, r * 0.3);
    ctx.lineTo(r * 0.1, r * 0.55);
    ctx.lineTo(r * 0.2, r * 0.3);
    ctx.fill();
  } else if (m.kind === 'mush') {
    ctx.fillStyle = '#fff1d6';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.35, r * 0.6, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.moveTo(-r * 1.1, -r * 0.05);
    ctx.quadraticCurveTo(-r, -r * 1.15, 0, -r * 1.1);
    ctx.quadraticCurveTo(r, -r * 1.15, r * 1.1, -r * 0.05);
    ctx.quadraticCurveTo(0, r * 0.15, -r * 1.1, -r * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    [
      [-0.5, -0.55, 0.18],
      [0.2, -0.75, 0.2],
      [0.6, -0.35, 0.14],
    ].forEach(([a, b, c]) => {
      ctx.beginPath();
      ctx.arc(a * r, b * r, c * r, 0, Math.PI * 2);
      ctx.fill();
    });
    eyes(ctx, 0, r * 0.35, r * 0.24, r * 0.16, lx, ly);
  } else {
    // ผี
    ctx.globalAlpha = 0.88;
    const wv = Math.sin(t * 6 + m.ph) * r * 0.12;
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.8);
    ctx.lineTo(-r, -r * 0.1);
    ctx.quadraticCurveTo(-r, -r * 1.1, 0, -r * 1.1);
    ctx.quadraticCurveTo(r, -r * 1.1, r, -r * 0.1);
    ctx.lineTo(r, r * 0.8);
    ctx.quadraticCurveTo(r * 0.66, r * 0.5 + wv, r * 0.33, r * 0.85);
    ctx.quadraticCurveTo(0, r * 0.5 - wv, -r * 0.33, r * 0.85);
    ctx.quadraticCurveTo(-r * 0.66, r * 0.5 + wv, -r, r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = INK;
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.ellipse(s * r * 0.34 + lx * 2, -r * 0.2 + ly * 2, r * 0.14, r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#ff9ec4';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, r * 0.16, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (m.hit > 0) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // แถบเลือด (ตัวใหญ่)
  if ((m.kind === 'mush' || m.kind === 'boss') && m.hp < m.max) {
    const bw = r * 1.6;
    ctx.fillStyle = 'rgba(42,35,80,0.6)';
    ctx.fillRect(m.x - bw / 2, m.y - r * (m.kind === 'boss' ? 1.9 : 1.45), bw, 5);
    ctx.fillStyle = '#ff6b7a';
    ctx.fillRect(m.x - bw / 2, m.y - r * (m.kind === 'boss' ? 1.9 : 1.45), bw * Math.max(0, m.hp / m.max), 5);
  }
}

function starPath(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.48 : r;
    if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drawWorld(ctx: CanvasRenderingContext2D, w: World, cw: number, ch: number, k: number, tile: CanvasPattern | null) {
  const sx = w.shake > 0 ? (Math.random() - 0.5) * 12 * w.shake * 3 : 0;
  const sy = w.shake > 0 ? (Math.random() - 0.5) * 12 * w.shake * 3 : 0;
  ctx.setTransform(k, 0, 0, k, cw / 2 - w.hx * k + sx, ch / 2 - w.hy * k + sy);
  const hw = cw / 2 / k;
  const hh = ch / 2 / k;
  ctx.fillStyle = tile || '#9fe08f';
  ctx.fillRect(w.hx - hw - 20, w.hy - hh - 20, hw * 2 + 40, hh * 2 + 40);
  const t = w.t;

  // วงแสงโล่
  if (w.wl.shield) {
    const r = auraR(w);
    const g = ctx.createRadialGradient(w.hx, w.hy, r * 0.2, w.hx, w.hy, r);
    g.addColorStop(0, 'rgba(92,203,255,0.05)');
    g.addColorStop(1, 'rgba(92,203,255,0.32)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w.hx, w.hy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -t * 30;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // อัญมณี
  w.gems.forEach((g) => {
    ctx.save();
    ctx.translate(g.x, g.y + Math.sin(t * 5 + g.x) * 2);
    ctx.fillStyle = g.v > 5 ? '#ffd84a' : '#5ce1ff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 7);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  // มอนสเตอร์ (เรียงตามแกน y ให้ดูมีมิติ)
  const list = w.mons.filter((m) => Math.abs(m.x - w.hx) < hw + 80 && Math.abs(m.y - w.hy) < hh + 80).sort((a, b) => a.y - b.y);
  list.forEach((m) => drawMon(ctx, m, w.hx, w.hy, t));

  // ค้อนยักษ์
  if (w.slam) {
    const s = w.slam;
    const p = Math.min(1, s.t / 0.42);
    const ang = -2.2 + p * 2.6;
    const side = w.face;
    ctx.save();
    ctx.translate(s.x, s.y - 10);
    ctx.scale(side, 1);
    ctx.rotate(ang);
    ctx.fillStyle = '#b07448';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.fillRect(-5, -78, 10, 78);
    ctx.strokeRect(-5, -78, 10, 78);
    ctx.fillStyle = '#a9b3c9';
    ctx.beginPath();
    ctx.moveTo(-22, -112);
    ctx.lineTo(22, -112);
    ctx.quadraticCurveTo(30, -112, 30, -104);
    ctx.lineTo(30, -82);
    ctx.quadraticCurveTo(30, -74, 22, -74);
    ctx.lineTo(-22, -74);
    ctx.quadraticCurveTo(-30, -74, -30, -82);
    ctx.lineTo(-30, -104);
    ctx.quadraticCurveTo(-30, -112, -22, -112);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8390ab';
    ctx.fillRect(-30, -98, 60, 10);
    ctx.restore();
  }

  // ลูกไฟหมุน
  if (w.wl.orb) {
    const n = w.wl.orb + 1;
    const R = orbR(w);
    for (let i = 0; i < n; i++) {
      const a = w.orbAng + (i * Math.PI * 2) / n;
      const x = w.hx + Math.cos(a) * R;
      const y = w.hy + Math.sin(a) * R;
      const g = ctx.createRadialGradient(x, y, 2, x, y, 18);
      g.addColorStop(0, '#fff6a8');
      g.addColorStop(0.45, '#ffb35c');
      g.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff7a3d';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // กระสุน
  w.projs.forEach((p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.spin);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    if (p.kind === 'star') {
      ctx.fillStyle = '#ffd84a';
      starPath(ctx, 10);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#3fd6a8';
      ctx.beginPath();
      ctx.moveTo(-16, -6);
      ctx.quadraticCurveTo(0, -16, 16, -6);
      ctx.lineTo(12, 2);
      ctx.quadraticCurveTo(0, -6, -12, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  });

  // สายฟ้า
  w.bolts.forEach((b) => {
    ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, b.life * 8)})`;
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let x = b.x + (Math.random() - 0.5) * 30;
    let y = b.y - 260;
    ctx.moveTo(x, y);
    for (let i = 0; i < 6; i++) {
      x = b.x + (Math.random() - 0.5) * 34 * (1 - i / 6);
      y += 260 / 6;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = '#b98cff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });

  // เศษ/ตัวเลข/คลื่น
  w.bits.forEach((b) => {
    const a = Math.max(0, b.life / b.max);
    if (b.ring) {
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = a;
      ctx.lineWidth = 6 * a + 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.ring * (1.1 - a * 0.6), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (b.text) {
      ctx.globalAlpha = Math.min(1, a * 2);
      ctx.font = '800 15px Mitr, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = INK;
      ctx.strokeText(b.text, b.x, b.y);
      ctx.fillStyle = b.color;
      ctx.fillText(b.text, b.x, b.y);
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  });
}

/* ============================== ไอคอนอาวุธ ============================== */

export function WeaponIcon({ id, size = 40 }: { id: OptId; size?: number }) {
  const s = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      {id === 'star' && (
        <>
          <path d="M24 5 L29 17 L42 18 L32 27 L35 40 L24 33 L13 40 L16 27 L6 18 L19 17 Z" fill="#ffd84a" {...s} />
          <path d="M18 20 L22 19" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {id === 'orb' && (
        <>
          <circle cx="24" cy="24" r="15" fill="none" stroke="#ffb35c" strokeWidth="3" strokeDasharray="5 5" />
          <circle cx="12" cy="17" r="7" fill="#ff7a3d" {...s} />
          <circle cx="36" cy="31" r="7" fill="#ff7a3d" {...s} />
          <circle cx="10.5" cy="15.5" r="2" fill="#fff6a8" />
          <circle cx="34.5" cy="29.5" r="2" fill="#fff6a8" />
        </>
      )}
      {id === 'hammer' && (
        <g transform="rotate(-30 24 24)">
          <rect x="21" y="18" width="6" height="26" rx="2.5" fill="#b07448" {...s} />
          <rect x="9" y="6" width="30" height="15" rx="4" fill="#a9b3c9" {...s} />
          <rect x="9" y="11" width="30" height="5" fill="#8390ab" />
        </g>
      )}
      {id === 'shield' && (
        <>
          <circle cx="24" cy="24" r="20" fill="#5ccbff" opacity="0.3" />
          <path d="M12 10 L36 10 L36 24 Q36 37 24 43 Q12 37 12 24 Z" fill="#5ccbff" {...s} />
          <path d="M24 15 L26.6 21 L33 21.4 L28 25.4 L29.6 31.6 L24 28 L18.4 31.6 L20 25.4 L15 21.4 L21.4 21 Z" fill="#fff" />
        </>
      )}
      {id === 'bolt' && <path d="M27 4 L12 27 L22 27 L18 44 L36 19 L25 19 Z" fill="#b98cff" {...s} />}
      {id === 'boom' && (
        <>
          <path d="M8 14 Q24 2 40 14 L35 21 Q24 12 13 21 Z" fill="#3fd6a8" {...s} />
          <path d="M14 30 Q24 38 34 30" fill="none" stroke="#3fd6a8" strokeWidth="3" strokeDasharray="3 4" />
        </>
      )}
      {id === 'shoes' && (
        <>
          <path d="M8 30 L8 18 L20 18 L22 26 L38 30 Q42 32 40 37 L10 37 Q7 36 8 30 Z" fill="#ff9a3d" {...s} />
          <path d="M8 22 Q0 16 4 10 Q10 14 12 18 M14 18 Q12 8 18 6 Q20 12 19 18" fill="#fff" {...s} strokeWidth={2} />
          <path d="M10 33 L40 33" stroke="#fff" strokeWidth="2.4" />
        </>
      )}
      {id === 'heart' && (
        <>
          <path d="M24 42 C2 28 6 8 18 10 C21 10 23 12 24 15 C25 12 27 10 30 10 C42 8 46 28 24 42 Z" fill="#ff6b7a" {...s} />
          <path d="M14 18 Q15 14 19 14" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </>
      )}
      {id === 'potion' && (
        <>
          <path d="M19 6 L29 6 L29 14 Q40 20 38 32 Q36 42 24 42 Q12 42 10 32 Q8 20 19 14 Z" fill="#7ddc86" {...s} />
          <rect x="18" y="3" width="12" height="5" rx="2" fill="#b07448" {...s} strokeWidth={1.8} />
          <path d="M19 28 L29 28 M24 23 L24 33" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/* ============================== ตัวเกม ============================== */

function fmtClock(ms: number) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

interface Opt {
  id: OptId;
  name: string;
  lv: number;
  max: number;
  desc: string;
  isNew: boolean;
}

function rollOptions(w: World): Opt[] {
  const pool = WEAPONS.filter((d) => w.wl[d.id] < d.max).map((d) => ({ id: d.id as OptId, name: d.name, lv: w.wl[d.id], max: d.max, desc: d.desc(w.wl[d.id]), isNew: w.wl[d.id] === 0 }));
  // ชอบให้ได้อาวุธใหม่บ้าง แต่ไม่ถือเกิน 4 อย่าง (ไม่นับของติดตัว)
  const weaponsOwned = WEAPONS.filter((d) => d.max === 5 && w.wl[d.id] > 0).length;
  const usable = pool.filter((o) => !(o.isNew && WEAPONS.find((d) => d.id === o.id)!.max === 5 && weaponsOwned >= 4));
  const picks: Opt[] = [];
  const bag = usable.slice();
  while (picks.length < 3 && bag.length) picks.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
  while (picks.length < 3) picks.push({ id: 'potion', name: 'ยาฟื้นพลัง', lv: 0, max: 0, desc: 'ฟื้นพลังชีวิตครึ่งหลอด', isNew: false });
  return picks;
}

interface Hud {
  hp: number;
  hpMax: number;
  score: number;
  kills: number;
  level: number;
  left: number;
  boss: number | null;
  down: number;
  wl: Record<WId, number>;
}

export function BrawlGame({ engine, deadline, sync, me, preview, onLeave }: GameProps) {
  const stage = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const world = useRef<World>(fresh());
  const tile = useRef<CanvasPattern | null>(null);
  const input = useRef({ kx: 0, ky: 0, jx: 0, jy: 0 });
  const keys = useRef(new Set<string>());
  const [joy, setJoy] = useState<{ ox: number; oy: number; x: number; y: number } | null>(null);
  const joyRef = useRef<{ id: number; ox: number; oy: number } | null>(null);
  const [hud, setHud] = useState<Hud>({ hp: BASE_HP, hpMax: BASE_HP, score: 0, kills: 0, level: 1, left: 0, boss: null, down: 0, wl: fresh().wl });
  const [ask, setAsk] = useState(true);
  const [streak, setStreak] = useState(0);
  const [over, setOver] = useState(false);
  const [choice, setChoice] = useState<{ opts: Opt[]; until: number } | null>(null);
  const pending = useRef(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'ok' | 'bad' | 'wave'; at: number } | null>(null);
  const [heroFx, setHeroFx] = useState({ hurt: 0, moving: false, face: 1, inv: false });
  const [nudge, setNudge] = useState(false);
  const lastAnswer = useRef(Date.now());
  const synced = useRef(-1);
  const choiceRef = useRef(choice);
  choiceRef.current = choice;
  const askRef = useRef(ask);
  askRef.current = ask;
  const shootAt = useRef(0);
  const splatAt = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  // สอนเล่น: เดิน -> ตอบคำถาม -> เลือกอาวุธ (1 รอบ)
  const coach = useCoach(
    [
      { id: 'move', target: '.mb-hero', text: 'ลากนิ้วบนจอ หรือกดปุ่มลูกศร เพื่อเดินหลบ' },
      { id: 'ask', target: '.mb-askbtn', text: 'ตอบคำถามเพื่อเลเวลอัป', doneIf: () => ask },
      { id: 'answer', target: DOCK_CHOICES, text: 'เลือกตัวเลือก ตอบถูกเลเวลอัป ได้อาวุธ' },
      { id: 'pick', target: '.mb-pick-cards', text: 'เลือกอาวุธที่ชอบ 1 อย่าง', when: () => !!choice },
    ],
    { loops: 1, active: !over }
  );

  const say = (text: string, kind: 'ok' | 'bad' | 'wave') => setBanner({ text, kind, at: Date.now() });

  const doSync = useCallback(
    (force = false) => {
      const w = world.current;
      if (!sync) return;
      if (!force && w.score === synced.current) return;
      synced.current = w.score;
      sync(w.score, { kills: w.kills, boss: w.bossKills, level: w.level });
    },
    [sync]
  );

  /* ---------- ปุ่มลูกศร / WASD ---------- */
  useEffect(() => {
    const map: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1], A: [-1, 0], D: [1, 0], W: [0, -1], S: [0, 1] };
    const upd = () => {
      let x = 0;
      let y = 0;
      keys.current.forEach((k) => {
        x += map[k][0];
        y += map[k][1];
      });
      input.current.kx = x;
      input.current.ky = y;
    };
    const down = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      if (!map[e.key]) return;
      e.preventDefault();
      keys.current.add(e.key);
      upd();
    };
    const up = (e: KeyboardEvent) => {
      if (!map[e.key]) return;
      keys.current.delete(e.key);
      upd();
    };
    const blur = () => {
      keys.current.clear();
      upd();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  /* ---------- จอยสติ๊กลอย (แตะตรงไหนก็ได้บนฉากแล้วลาก) ---------- */
  const JOY_R = 54;
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (over || joyRef.current) return;
    const r = stage.current!.getBoundingClientRect();
    const ox = e.clientX - r.left;
    const oy = e.clientY - r.top;
    joyRef.current = { id: e.pointerId, ox, oy };
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
    setJoy({ ox, oy, x: 0, y: 0 });
    gsfx.unlock();
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const j = joyRef.current;
    if (!j || j.id !== e.pointerId) return;
    const r = stage.current!.getBoundingClientRect();
    let dx = e.clientX - r.left - j.ox;
    let dy = e.clientY - r.top - j.oy;
    const d = Math.hypot(dx, dy);
    if (d > JOY_R) {
      dx = (dx / d) * JOY_R;
      dy = (dy / d) * JOY_R;
    }
    input.current.jx = dx / JOY_R;
    input.current.jy = dy / JOY_R;
    setJoy({ ox: j.ox, oy: j.oy, x: dx, y: dy });
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const j = joyRef.current;
    if (!j || j.id !== e.pointerId) return;
    joyRef.current = null;
    input.current.jx = 0;
    input.current.jy = 0;
    setJoy(null);
  };

  /* ---------- เลือกอาวุธ ---------- */
  const openChoice = useCallback(() => {
    if (pending.current <= 0 || choiceRef.current) return;
    pending.current--;
    setChoice({ opts: rollOptions(world.current), until: Date.now() + PICK_SECONDS * 1000 });
  }, []);

  const pick = useCallback(
    (o: Opt) => {
      const w = world.current;
      if (o.id === 'potion') {
        w.hp = Math.min(w.hpMax, w.hp + w.hpMax * 0.5);
      } else {
        w.wl[o.id] = Math.min(wdef(o.id).max, w.wl[o.id] + 1);
        if (o.id === 'heart') {
          w.hpMax += 30;
          w.hp = w.hpMax;
        }
        w.cd[o.id] = 0.2;
      }
      w.inv = Math.max(w.inv, 1);
      gsfx.build();
      gsfx.sparkleish();
      w.bits.push({ x: w.hx, y: w.hy, vx: 0, vy: 0, life: 0.5, max: 0.5, color: o.id === 'potion' ? '#7ddc86' : wdef(o.id as WId).color, r: 0, ring: 70 });
      setChoice(null);
      coach.hit('pick');
      setTimeout(openChoice, 250);
    },
    [openChoice, coach.hit] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // หมดเวลาเลือก: สุ่มให้เอง
  useEffect(() => {
    if (!choice) return;
    const t = setTimeout(() => pick(choice.opts[Math.floor(Math.random() * choice.opts.length)]), Math.max(0, choice.until - Date.now()));
    return () => clearTimeout(t);
  }, [choice, pick]);

  /* ---------- ตอบคำถาม = เลเวลอัป ---------- */
  const onAnswered = (o: { correct: boolean; streak: number }) => {
    setStreak(o.streak);
    lastAnswer.current = Date.now();
    setNudge(false);
    if (!o.correct) return;
    coach.hit('answer');
    const w = world.current;
    w.level++;
    w.score += 50;
    pending.current++;
    gsfx.levelUp();
    if (o.streak >= 3 && o.streak % 3 === 0) {
      nova(w, 340, 260);
      gsfx.boom();
      say(`ถูก ${o.streak} ข้อติด! ระเบิดดาว!`, 'ok');
    } else say(`เลเวล ${w.level}!`, 'ok');
    openChoice();
  };

  // นานแล้วไม่ได้ตอบ: เตือนเบาๆ
  useEffect(() => {
    if (over) return;
    const iv = setInterval(() => {
      if (!askRef.current && Date.now() - lastAnswer.current > 22000) setNudge(true);
    }, 2000);
    return () => clearInterval(iv);
  }, [over]);

  /* ---------- วงจรเกม ---------- */
  useEffect(() => {
    if (over) return;
    let raf = 0;
    let last = performance.now();
    let hudAt = 0;
    let fxKey = '';
    if (!tile.current) {
      const c = cvs.current?.getContext('2d');
      if (c) tile.current = c.createPattern(makeTile(), 'repeat');
    }

    const step = (w: World, dt: number, hw: number, hh: number) => {
      w.t += dt;
      const slow = choiceRef.current ? SLOW_PICK : askRef.current ? SLOW_ASK : 1;
      w.slow += (slow - w.slow) * Math.min(1, dt * 6);
      const mdt = dt * w.slow;
      const min = w.t / 60;

      // ---- ฮีโร่ ----
      if (w.down > 0) {
        w.down -= dt;
        w.moving = false;
        if (w.down <= 0) {
          w.hp = w.hpMax;
          w.inv = 3;
          say('ฟื้นแล้ว! ลุยต่อ!', 'ok');
        }
      } else {
        const ix = input.current.kx + input.current.jx;
        const iy = input.current.ky + input.current.jy;
        const len = Math.hypot(ix, iy);
        if (len > 0.08) {
          const k = Math.min(1, len);
          const sp = heroSpeed(w);
          w.hx += (ix / len) * k * sp * dt;
          w.hy += (iy / len) * k * sp * dt;
          w.dirx = ix / len;
          w.diry = iy / len;
          if (Math.abs(ix) > 0.15) w.face = ix < 0 ? -1 : 1;
          w.moving = true;
        } else w.moving = false;
      }
      w.inv = Math.max(0, w.inv - dt);
      w.shake = Math.max(0, w.shake - dt);

      // ---- เกิดมอนสเตอร์ ----
      w.spawnCd -= mdt;
      if (w.spawnCd <= 0 && w.mons.length < MAX_MONS) {
        const rate = Math.min(6.5, 1.2 + min * 1.1);
        w.spawnCd = 1 / rate;
        const r = Math.random();
        const kind: MonKind = min > 2.5 && r < 0.18 ? 'ghost' : min > 1.4 && r < 0.36 ? 'mush' : min > 0.4 && r < 0.6 ? 'bat' : 'blob';
        const pack = min > 1.5 && Math.random() < 0.12 ? 4 : 1;
        for (let i = 0; i < pack; i++) spawnMon(w, kind, hw, hh);
      }
      if (w.t >= w.nextBoss) {
        w.nextBoss += BOSS_EVERY;
        spawnMon(w, 'boss', hw, hh);
        gsfx.wave();
        say('บอสสไลม์ราชามาแล้ว!', 'wave');
      }

      // ---- มอนสเตอร์เดิน ----
      for (const m of w.mons) {
        m.hit = Math.max(0, m.hit - dt);
        m.orbHit = Math.max(0, m.orbHit - dt);
        if (m.kb > 0) {
          m.kb -= mdt;
          m.x += m.kbx * mdt;
          m.y += m.kby * mdt;
          m.kbx *= 0.9;
          m.kby *= 0.9;
          continue;
        }
        const dx = w.hx - m.x;
        const dy = w.hy - m.y;
        const d = Math.hypot(dx, dy) || 1;
        let vx = (dx / d) * m.speed;
        let vy = (dy / d) * m.speed;
        if (m.kind === 'bat') {
          const wob = Math.sin(w.t * 5 + m.ph) * 60;
          vx += (-dy / d) * wob;
          vy += (dx / d) * wob;
        }
        if (w.down > 0 && d < 320) {
          vx *= -0.6;
          vy *= -0.6;
        }
        m.x += vx * mdt;
        m.y += vy * mdt;
        // ไกลเกินไป: วาร์ปกลับมาใกล้ๆ
        if (d > Math.hypot(hw, hh) * 2.4 && m.kind !== 'boss') {
          const a = Math.random() * Math.PI * 2;
          const r = Math.hypot(hw, hh) + 40;
          m.x = w.hx + Math.cos(a) * r;
          m.y = w.hy + Math.sin(a) * r;
        }
      }
      // ไม่ให้ซ้อนกันเป็นก้อน
      const ms = w.mons;
      for (let i = 0; i < ms.length; i++) {
        const a = ms[i];
        for (let j = i + 1; j < ms.length; j++) {
          const b = ms[j];
          const dx = b.x - a.x;
          if (dx > 60 || dx < -60) continue;
          const dy = b.y - a.y;
          const min2 = (a.r + b.r) * 0.85;
          const d2 = dx * dx + dy * dy;
          if (d2 < min2 * min2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const push = (min2 - d) / 2;
            const wa = a.kind === 'boss' ? 0.1 : 1;
            const wb = b.kind === 'boss' ? 0.1 : 1;
            a.x -= (dx / d) * push * wa;
            a.y -= (dy / d) * push * wa;
            b.x += (dx / d) * push * wb;
            b.y += (dy / d) * push * wb;
          }
        }
      }

      // ---- โดนตัว ----
      if (w.down <= 0) {
        for (const m of w.mons) {
          const d = Math.hypot(m.x - w.hx, m.y - w.hy);
          if (d < m.r + HERO_R - 4) {
            if (w.inv <= 0) {
              const dmg = m.dmg * (1 - shieldCut(w));
              w.hp -= dmg;
              w.inv = 0.8;
              gsfx.hurt();
              w.bits.push({ x: w.hx, y: w.hy - 34, vx: 0, vy: -50, life: 0.7, max: 0.7, color: '#ff6b7a', r: 0, text: `-${Math.round(dmg)}` });
              setHeroFx((f) => ({ ...f, hurt: Date.now() }));
            }
            const nx = (m.x - w.hx) / (d || 1);
            const ny = (m.y - w.hy) / (d || 1);
            if (m.kind !== 'boss') {
              m.kbx = nx * 220;
              m.kby = ny * 220;
              m.kb = 0.15;
            }
          }
        }
        if (w.hp <= 0) {
          w.hp = 0;
          w.down = 2.6;
          w.downs++;
          nova(w, 300, 0);
          gsfx.sad();
          say('หมดแรง! ฟื้นในอีกแป๊บ', 'bad');
        }
      }

      // ---- อาวุธ ----
      const cd = w.cd;
      const tick = (id: string, every: number) => {
        cd[id] = (cd[id] ?? every) - dt;
        if (cd[id] <= 0) {
          cd[id] = every;
          return true;
        }
        return false;
      };
      const nearest = (n: number, range: number) =>
        w.mons
          .map((m) => ({ m, d: Math.hypot(m.x - w.hx, m.y - w.hy) }))
          .filter((x) => x.d < range)
          .sort((a, b) => a.d - b.d)
          .slice(0, n)
          .map((x) => x.m);
      if (w.down <= 0) {
        const lv = w.wl;
        if (lv.star && tick('star', 0.8 * Math.pow(0.88, lv.star - 1))) {
          const tg = nearest(1 + Math.floor(lv.star / 2), Math.min(520, Math.max(hw, hh) * 0.92));
          tg.forEach((m) => {
            const d = Math.hypot(m.x - w.hx, m.y - w.hy) || 1;
            w.projs.push({ kind: 'star', x: w.hx, y: w.hy - 8, vx: ((m.x - w.hx) / d) * 440, vy: ((m.y - w.hy) / d) * 440, dmg: 16 + 6 * lv.star, life: 1.4, pierce: lv.star >= 4 ? 1 : 0, hits: [], spin: 0, back: false });
          });
          if (tg.length && performance.now() - shootAt.current > 120) {
            shootAt.current = performance.now();
            gsfx.shoot(1);
          }
        }
        if (lv.orb) {
          w.orbAng += dt * 3.3;
          const n = lv.orb + 1;
          const R = orbR(w);
          for (let i = 0; i < n; i++) {
            const a = w.orbAng + (i * Math.PI * 2) / n;
            const ox = w.hx + Math.cos(a) * R;
            const oy = w.hy + Math.sin(a) * R;
            for (const m of w.mons) {
              if (m.orbHit > 0) continue;
              if (Math.hypot(m.x - ox, m.y - oy) < m.r + 12) {
                m.orbHit = 0.35;
                hurtMon(w, m, 16 + 7 * lv.orb, Math.cos(a) * 200, Math.sin(a) * 200, 0.12);
                w.bits.push({ x: ox, y: oy, vx: 0, vy: -30, life: 0.3, max: 0.3, color: '#ffb35c', r: 5 });
              }
            }
          }
        }
        if (lv.hammer && !w.slam && tick('hammer', 3.3 - 0.3 * (lv.hammer - 1))) {
          w.slam = { t: 0, x: w.hx, y: w.hy, r: 95 + 18 * lv.hammer, dmg: 40 + 22 * lv.hammer, done: false };
        }
        if (lv.shield) {
          w.auraTick -= dt;
          if (w.auraTick <= 0) {
            w.auraTick = 0.25;
            const R = auraR(w);
            for (const m of w.mons) {
              if (Math.hypot(m.x - w.hx, m.y - w.hy) < R + m.r * 0.5) hurtMon(w, m, (12 + 8 * lv.shield) * 0.25);
            }
          }
        }
        if (lv.bolt && tick('bolt', 2.5 - 0.25 * (lv.bolt - 1))) {
          const vis = w.mons.filter((m) => Math.abs(m.x - w.hx) < hw && Math.abs(m.y - w.hy) < hh);
          for (let i = 0; i < lv.bolt + 1 && vis.length; i++) {
            const m = vis.splice(Math.floor(Math.random() * vis.length), 1)[0];
            hurtMon(w, m, 35 + 15 * lv.bolt);
            w.bolts.push({ x: m.x, y: m.y, life: 0.18 });
            for (let k = 0; k < 6; k++) w.bits.push({ x: m.x, y: m.y, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200, life: 0.3, max: 0.3, color: '#d9c4ff', r: 3 });
          }
          gsfx.shoot(2);
        }
        if (lv.boom && tick('boom', 2.2 - 0.15 * (lv.boom - 1))) {
          const n = 1 + Math.floor((lv.boom - 1) / 2);
          const base = Math.atan2(w.diry, w.dirx);
          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * 0.55;
            w.projs.push({ kind: 'boom', x: w.hx, y: w.hy, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, dmg: 20 + 8 * lv.boom, life: 0.75, pierce: 999, hits: [], spin: 0, back: false });
          }
        }
      }
      // ค้อน: ฟาดลงแล้วสะเทือน
      if (w.slam) {
        const s = w.slam;
        s.t += dt;
        s.x = w.hx;
        s.y = w.hy;
        if (!s.done && s.t >= 0.36) {
          s.done = true;
          w.mons.forEach((m) => {
            const d = Math.hypot(m.x - s.x, m.y - s.y);
            if (d < s.r + m.r) hurtMon(w, m, s.dmg, ((m.x - s.x) / (d || 1)) * 380, ((m.y - s.y) / (d || 1)) * 380, 0.25);
          });
          w.bits.push({ x: s.x, y: s.y, vx: 0, vy: 0, life: 0.45, max: 0.45, color: '#fff', r: 0, ring: s.r });
          for (let k = 0; k < 12; k++) w.bits.push({ x: s.x + (Math.random() - 0.5) * s.r, y: s.y + (Math.random() - 0.5) * s.r * 0.6, vx: 0, vy: -90 - Math.random() * 80, life: 0.45, max: 0.45, color: '#c8a27a', r: 4 });
          w.shake = 0.22;
          gsfx.boom();
        }
        if (s.t > 0.55) w.slam = null;
      }
      // กระสุน
      const keep: Proj[] = [];
      for (const p of w.projs) {
        p.life -= dt;
        p.spin += dt * (p.kind === 'boom' ? 16 : 9);
        if (p.kind === 'boom' && p.life <= 0 && !p.back) {
          p.back = true;
          p.hits = [];
        }
        if (p.kind === 'boom' && p.back) {
          const dx = w.hx - p.x;
          const dy = w.hy - p.y;
          const d = Math.hypot(dx, dy) || 1;
          p.vx = (dx / d) * 420;
          p.vy = (dy / d) * 420;
          if (d < 24) continue;
        } else if (p.life <= 0) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        let alive = true;
        for (const m of w.mons) {
          if (p.hits.includes(m.id)) continue;
          if (Math.hypot(m.x - p.x, m.y - p.y) < m.r + 10) {
            hurtMon(w, m, p.dmg, p.vx * 0.5, p.vy * 0.5, 0.1);
            p.hits.push(m.id);
            if (p.pierce <= 0) {
              alive = false;
              break;
            }
            p.pierce--;
          }
        }
        if (alive) keep.push(p);
      }
      w.projs = keep;
      w.bolts.forEach((b) => (b.life -= dt));
      w.bolts = w.bolts.filter((b) => b.life > 0);

      // ---- ปราบได้ ----
      const dead = w.mons.filter((m) => m.hp <= 0);
      if (dead.length) {
        dead.forEach((m) => {
          const pts = m.kind === 'boss' ? 300 : m.kind === 'mush' ? 25 : 10;
          if (m.kind === 'boss') {
            w.bossKills++;
            w.shake = 0.4;
            say('ปราบบอสได้! +300', 'ok');
            gsfx.fanfare();
          } else w.kills++;
          w.score += pts;
          const gems = m.kind === 'boss' ? 12 : Math.random() < 0.55 ? 1 : 0;
          for (let i = 0; i < gems; i++) w.gems.push({ x: m.x + (Math.random() - 0.5) * m.r * 2, y: m.y + (Math.random() - 0.5) * m.r * 2, v: m.kind === 'boss' ? 10 : 2, pull: false });
          for (let i = 0; i < (m.kind === 'boss' ? 24 : 7); i++) w.bits.push({ x: m.x, y: m.y, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, life: 0.45, max: 0.45, color: m.color, r: 3 + Math.random() * 3 });
          w.bits.push({ x: m.x, y: m.y - 16, vx: 0, vy: -40, life: 0.8, max: 0.8, color: '#ffd84a', r: 0, text: `+${pts}` });
        });
        w.mons = w.mons.filter((m) => m.hp > 0);
        if (performance.now() - splatAt.current > 90) {
          splatAt.current = performance.now();
          gsfx.splat();
        }
      }
      // ---- อัญมณี ----
      const gk: Gem[] = [];
      for (const g of w.gems) {
        const d = Math.hypot(w.hx - g.x, w.hy - g.y);
        if (d < 100) g.pull = true;
        if (g.pull) {
          g.x += ((w.hx - g.x) / (d || 1)) * 520 * dt;
          g.y += ((w.hy - g.y) / (d || 1)) * 520 * dt;
        }
        if (d < 24) {
          w.score += g.v;
          continue;
        }
        if (d < 2000) gk.push(g);
      }
      if (gk.length > 220) gk.splice(0, gk.length - 220);
      w.gems = gk;

      w.bits.forEach((b) => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (!b.text && !b.ring) {
          b.vx *= 0.93;
          b.vy *= 0.93;
        }
        b.life -= dt;
      });
      w.bits = w.bits.filter((b) => b.life > 0);
      if (w.bits.length > 320) w.bits.splice(0, w.bits.length - 320);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const w = world.current;
      const c = cvs.current;
      if (!c) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (deadline && Date.now() >= deadline) {
        setOver(true);
        doSync(true);
        gsfx.fanfare();
        return;
      }
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const rect = c.getBoundingClientRect();
      const pw = Math.max(1, Math.round(rect.width * dpr));
      const ph = Math.max(1, Math.round(rect.height * dpr));
      if (c.width !== pw || c.height !== ph) {
        c.width = pw;
        c.height = ph;
      }
      const k = Math.max(0.55, Math.min(1.3, Math.min(rect.width, rect.height) / 520)) * dpr;
      step(w, dt, pw / 2 / k, ph / 2 / k);
      const ctx = c.getContext('2d');
      if (ctx) drawWorld(ctx, w, pw, ph, k, tile.current);
      const key = `${w.moving}:${w.face}:${w.inv > 0}:${w.down > 0}`;
      if (key !== fxKey) {
        fxKey = key;
        setHeroFx((f) => ({ ...f, moving: w.moving, face: w.face, inv: w.inv > 0 && w.down <= 0 }));
      }
      if (now - hudAt > 120) {
        hudAt = now;
        const boss = w.mons.find((m) => m.kind === 'boss');
        setHud({ hp: w.hp, hpMax: w.hpMax, score: w.score, kills: w.kills + w.bossKills, level: w.level, left: deadline ? deadline - Date.now() : 0, boss: boss ? boss.hp / boss.max : null, down: w.down, wl: { ...w.wl } });
      }
    };
    raf = requestAnimationFrame(loop);
    const sv = setInterval(() => doSync(), 4000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(sv);
    };
  }, [over, deadline, doSync]);

  useEffect(() => () => doSync(true), [doSync]);
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 1800);
    return () => clearTimeout(t);
  }, [banner]);

  // ขนาดฮีโร่บนจอให้ตรงกับมาตราส่วนของโลก
  const [heroPx, setHeroPx] = useState(60);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const k = Math.max(0.55, Math.min(1.3, Math.min(r.width, r.height) / 520));
      setHeroPx(Math.round(HERO_R * 3.1 * k));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (heroFx.moving) coach.hit('move');
  }, [heroFx.moving, coach]);

  const owned = WEAPONS.filter((d) => hud.wl[d.id] > 0);
  const hpPct = Math.max(0, Math.min(1, hud.hp / hud.hpMax));
  const w = world.current;

  return (
    <div className="mb gm-root" ref={rootRef} data-over={over} data-dock={ask}>
      <CoachArrow coach={coach} root={rootRef} />
      <div className="gm-main">
        <div className="mb-hud">
          <span className="cf-chip mb-lv">
            <Zap className="w-4 h-4" /> เลเวล {hud.level}
          </span>
          <span className="cf-chip mb-hp" data-low={hpPct < 0.3}>
            <Heart size={18} />
            <span className="mb-hpbar">
              <i style={{ width: `${hpPct * 100}%` }} />
            </span>
          </span>
          <span className="flex-1" />
          <span className="cf-chip cf-earned">
            คะแนน <b>{hud.score.toLocaleString('th-TH')}</b>
          </span>
          {deadline && (
            <span className="cf-chip cf-time" data-urgent={hud.left < 30000}>
              <Clock size={18} /> {fmtClock(hud.left)}
            </span>
          )}
        </div>

        <div className="mb-stage" ref={stage} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={cvs} className="mb-canvas" aria-label="สนามมอนสเตอร์ ใช้ปุ่มลูกศรหรือลากนิ้วเพื่อเดิน" />
          <div className="mb-hero" data-move={heroFx.moving} data-inv={heroFx.inv} data-down={hud.down > 0} key={heroFx.hurt ? `h${heroFx.hurt}` : 'h'} style={{ width: heroPx, height: heroPx, ['--face' as string]: heroFx.face }}>
            <span className="mb-hero-in">
              <Avatar id={me.avatar} gear={me.gear} size={heroPx} mood={hud.down > 0 ? 'sad' : heroFx.hurt && Date.now() - heroFx.hurt < 400 ? 'wow' : 'happy'} />
            </span>
          </div>

          {/* อาวุธที่มี */}
          <div className="mb-weapons" aria-label="อาวุธที่มี">
            {owned.map((d) => (
              <span key={d.id} className="mb-wslot" style={{ ['--wc' as string]: d.color }} title={`${d.name} เลเวล ${hud.wl[d.id]}`}>
                <WeaponIcon id={d.id} size={28} />
                <b>{hud.wl[d.id]}</b>
              </span>
            ))}
          </div>

          {hud.boss !== null && (
            <div className="mb-bossbar">
              <span>บอสสไลม์ราชา</span>
              <span className="mb-bossbar-in">
                <i style={{ width: `${hud.boss * 100}%` }} />
              </span>
            </div>
          )}

          {joy && (
            <div className="mb-joy" style={{ left: joy.ox, top: joy.oy }} aria-hidden="true">
              <span className="mb-joy-knob" style={{ transform: `translate(${joy.x}px, ${joy.y}px)` }} />
            </div>
          )}

          {nudge && !ask && !choice && <div className="cf-hint mb-tip">ตอบคำถามเพื่อเลเวลอัป ได้อาวุธใหม่!</div>}

          {banner && (
            <div className="td-banner" data-kind={banner.kind} key={banner.at}>
              {banner.text}
            </div>
          )}

          {hud.down > 0 && (
            <div className="mb-down">
              <b>หมดแรง!</b>
              <span>ฟื้นใน {Math.ceil(hud.down)}</span>
            </div>
          )}

          {/* เลเวลอัป: เลือก 1 อย่าง */}
          {choice && (
            <div className="mb-pick" onPointerDown={(e) => e.stopPropagation()}>
              <p className="mb-pick-title">
                <Sparkles className="w-5 h-5" /> เลเวลอัป! เลือก 1 อย่าง
              </p>
              <div className="mb-pick-cards">
                {choice.opts.map((o, i) => (
                  <button key={`${o.id}${i}`} type="button" className="mb-card" style={{ ['--wc' as string]: o.id === 'potion' ? '#7ddc86' : wdef(o.id as WId).color, animationDelay: `${i * 70}ms` }} onClick={() => pick(o)}>
                    {o.isNew && <em className="mb-card-new">ใหม่!</em>}
                    <span className="mb-card-icon">
                      <WeaponIcon id={o.id} size={46} />
                    </span>
                    <b>{o.name}</b>
                    {o.max > 0 && (
                      <span className="mb-card-lv">
                        {Array.from({ length: o.max }).map((_, k) => (
                          <i key={k} data-on={k < o.lv + 1} data-next={k === o.lv} />
                        ))}
                      </span>
                    )}
                    <small>{o.desc}</small>
                  </button>
                ))}
              </div>
              <span className="mb-pick-time" key={choice.until} style={{ animationDuration: `${PICK_SECONDS}s` }} />
            </div>
          )}
        </div>

        <div className="mb-bar">
          {!ask && (
            <button type="button" className="l5g-btn l5g-btn-coral l5g-btn-xl mb-askbtn" disabled={over} onClick={() => (gsfx.tap(), setAsk(true))}>
              <Swords className="w-6 h-6" />
              <span>
                อัปเลเวล<small>ตอบถูก = ได้อาวุธ</small>
              </span>
            </button>
          )}
          <span className="mb-kills">
            ปราบได้ <b>{hud.kills.toLocaleString('th-TH')}</b> ตัว
          </span>
        </div>
      </div>

      <QuestionDock
        engine={engine}
        open={ask && !over}
        title="ตอบคำถามเพื่อเลเวลอัป"
        hint="ระหว่างตอบ มอนสเตอร์จะช้าลง"
        icon={<Swords className="w-5 h-5" />}
        color="#ff6b7a"
        streak={streak}
        rewardText={(o) => (o.streak >= 3 && o.streak % 3 === 0 ? 'ถูก! เลเวลอัป + ระเบิดดาว!' : 'ถูก! เลเวลอัป เลือกอาวุธได้')}
        onAnswered={onAnswered}
        onClose={() => setAsk(false)}
      />

      {over && (
        <div className="gm-over">
          <div className="gm-over-card">
            <p className="gm-over-tag">หมดเวลา!</p>
            <div className="gm-over-big">{w.score.toLocaleString('th-TH')}</div>
            <p className="font-bold">คะแนนศึกมอนสเตอร์</p>
            <div className="gm-over-stats">
              <span>
                <b>{w.kills + w.bossKills}</b>ปราบได้
              </span>
              <span>
                <b>{w.bossKills}</b>บอส
              </span>
              <span>
                <b>{w.level}</b>เลเวล
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
