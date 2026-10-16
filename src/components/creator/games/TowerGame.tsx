'use client';

import './games.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpCircle, Coins, Hammer, Play, Swords, Wrench, X } from 'lucide-react';
import { Coin, Clock, Heart } from './art';
import { QuizBatch } from './QuestionPad';
import type { GameProps } from './types';
import { gsfx } from '@/lib/game-creator/gsound';

/* ============================== ข้อมูลเกม ============================== */

type Kind = 'owl' | 'squirrel' | 'dragon';
interface TowerDef {
  kind: Kind;
  name: string;
  desc: string;
  cost: number;
  range: number;
  cd: number;
  dmg: number;
  speed: number;
  splash: number;
  color: string;
  dark: string;
}
const TOWERS: TowerDef[] = [
  { kind: 'owl', name: 'นกฮูก', desc: 'ยิงไกล แรง', cost: 60, range: 175, cd: 1.05, dmg: 3, speed: 460, splash: 0, color: '#a77cf2', dark: '#7e52cf' },
  { kind: 'squirrel', name: 'กระรอก', desc: 'ยิงรัว ระยะสั้น', cost: 45, range: 118, cd: 0.36, dmg: 1, speed: 560, splash: 0, color: '#ffb35c', dark: '#e88a2e' },
  { kind: 'dragon', name: 'มังกร', desc: 'พ่นไฟ โดนเป็นวง', cost: 100, range: 125, cd: 1.35, dmg: 2.2, speed: 320, splash: 62, color: '#7ddc86', dark: '#4fb55c' },
];
const tdef = (k: Kind) => TOWERS.find((t) => t.kind === k)!;
const upCost = (k: Kind, lv: number) => (lv >= 3 ? 0 : Math.round(tdef(k).cost * (lv === 1 ? 0.8 : 1.3)));
const stat = (k: Kind, lv: number) => {
  const d = tdef(k);
  const m = lv - 1;
  return { range: d.range * (1 + 0.12 * m), cd: d.cd * Math.pow(0.86, m), dmg: d.dmg * Math.pow(1.55, m), splash: d.splash * (1 + 0.15 * m) };
};

const COIN_PER_CORRECT = 35;
const START_COINS = 110;
const MAX_HEARTS = 10;
const SLIME_COLORS = ['#7ddc86', '#5ccbff', '#ff8fc4', '#ffb35c', '#a77cf2', '#ff6b7a'];

interface Layout {
  w: number;
  h: number;
  path: [number, number][];
  spots: [number, number][];
  base: [number, number];
}
const LAND: Layout = {
  w: 960,
  h: 540,
  path: [
    [-40, 100],
    [200, 100],
    [200, 330],
    [440, 330],
    [440, 140],
    [700, 140],
    [700, 410],
    [1000, 410],
  ],
  spots: [
    [110, 205],
    [320, 225],
    [330, 440],
    [330, 70],
    [565, 245],
    [570, 50],
    [585, 425],
    [805, 280],
    [830, 505],
  ],
  base: [895, 410],
};
const PORT: Layout = {
  w: 540,
  h: 860,
  path: [
    [100, -40],
    [100, 180],
    [420, 180],
    [420, 400],
    [130, 400],
    [130, 620],
    [420, 620],
    [420, 900],
  ],
  spots: [
    [260, 90],
    [260, 290],
    [495, 290],
    [32, 290],
    [300, 510],
    [40, 520],
    [270, 730],
    [497, 720],
  ],
  base: [420, 790],
};

interface Slime {
  id: number;
  d: number; // ระยะที่เดินไปแล้วบนเส้นทาง
  hp: number;
  max: number;
  speed: number;
  color: string;
  boss: boolean;
  hit: number;
}
interface Tower {
  spot: number;
  kind: Kind;
  lv: number;
  cool: number;
  aim: number;
  shot: number;
}
interface Shot {
  x: number;
  y: number;
  target: number;
  kind: Kind;
  dmg: number;
  splash: number;
  speed: number;
}
interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  r: number;
  text?: string;
}

interface World {
  lay: Layout;
  segs: { x1: number; y1: number; x2: number; y2: number; len: number; at: number }[];
  total: number;
  slimes: Slime[];
  towers: Tower[];
  shots: Shot[];
  bits: Bit[];
  coins: number;
  hearts: number;
  wave: number;
  waveActive: boolean;
  toSpawn: { hp: number; speed: number; color: string; boss: boolean }[];
  spawnCd: number;
  kills: number;
  bossKills: number;
  cleared: number;
  seq: number;
  t: number;
  decor: { x: number; y: number; k: number; s: number }[];
}

function buildSegs(lay: Layout) {
  const segs: World['segs'] = [];
  let at = 0;
  for (let i = 0; i < lay.path.length - 1; i++) {
    const [x1, y1] = lay.path[i];
    const [x2, y2] = lay.path[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    segs.push({ x1, y1, x2, y2, len, at });
    at += len;
  }
  return { segs, total: at };
}

function distToPath(lay: Layout, x: number, y: number) {
  let best = Infinity;
  for (let i = 0; i < lay.path.length - 1; i++) {
    const [x1, y1] = lay.path[i];
    const [x2, y2] = lay.path[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)));
  }
  return best;
}

function makeDecor(lay: Layout) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const out: World['decor'] = [];
  for (let i = 0; i < 260 && out.length < 34; i++) {
    const x = rnd() * lay.w;
    const y = rnd() * lay.h;
    if (distToPath(lay, x, y) < 52) continue;
    if (lay.spots.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 48)) continue;
    if (Math.hypot(lay.base[0] - x, lay.base[1] - y) < 80) continue;
    if (out.some((d) => Math.hypot(d.x - x, d.y - y) < 34)) continue;
    out.push({ x, y, k: Math.floor(rnd() * 4), s: 0.7 + rnd() * 0.5 });
  }
  return out;
}

function newWorld(lay: Layout): World {
  const { segs, total } = buildSegs(lay);
  return {
    lay,
    segs,
    total,
    slimes: [],
    towers: [],
    shots: [],
    bits: [],
    coins: START_COINS,
    hearts: MAX_HEARTS,
    wave: 0,
    waveActive: false,
    toSpawn: [],
    spawnCd: 0,
    kills: 0,
    bossKills: 0,
    cleared: 0,
    seq: 1,
    t: 0,
    decor: makeDecor(lay),
  };
}

function posAt(w: World, d: number): [number, number] {
  for (const s of w.segs) {
    if (d <= s.at + s.len) {
      const t = Math.max(0, (d - s.at) / s.len);
      return [s.x1 + (s.x2 - s.x1) * t, s.y1 + (s.y2 - s.y1) * t];
    }
  }
  const l = w.segs[w.segs.length - 1];
  return [l.x2, l.y2];
}

const scoreOf = (w: World) => w.kills * 10 + w.bossKills * 80 + w.cleared * 100;

function waveList(n: number) {
  const list: World['toSpawn'] = [];
  const count = 6 + n * 2;
  for (let i = 0; i < count; i++) list.push({ hp: 5 + n * 2.3, speed: 44 + n * 2.6, color: SLIME_COLORS[(n - 1) % SLIME_COLORS.length], boss: false });
  if (n % 5 === 0) list.push({ hp: (5 + n * 2.3) * 8, speed: (44 + n * 2.6) * 0.6, color: '#2a2350', boss: true });
  return list;
}

/* ============================== วาด ============================== */

const INK = '#2a2350';

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawEyes(ctx: CanvasRenderingContext2D, x: number, y: number, gap: number, r: number, lookX = 0) {
  [-1, 1].forEach((s) => {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(x + s * gap + lookX, y, r, r * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + s * gap + lookX + r * 0.35, y - r * 0.4, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawTower(ctx: CanvasRenderingContext2D, tw: Tower, x: number, y: number, t: number, selected: boolean) {
  const d = tdef(tw.kind);
  // ฐานหิน
  ctx.fillStyle = '#c9c2dc';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const bob = Math.sin(t * 3 + tw.spot) * 1.5 - (tw.shot > 0 ? 3 : 0);
  const cy = y + bob;
  ctx.save();
  // หาง/ปีก
  if (tw.kind === 'squirrel') {
    ctx.fillStyle = d.dark;
    ctx.beginPath();
    ctx.ellipse(x + 20, cy - 8, 11, 18, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (tw.kind === 'dragon') {
    ctx.fillStyle = '#4fb55c';
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(x + s * 14, cy - 2);
      ctx.lineTo(x + s * 32, cy - 16 + Math.sin(t * 8) * 3);
      ctx.lineTo(x + s * 22, cy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }
  // หู/เขา
  ctx.fillStyle = tw.kind === 'owl' ? d.dark : d.color;
  if (tw.kind === 'owl' || tw.kind === 'squirrel') {
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(x + s * 8, cy - 20);
      ctx.lineTo(x + s * 15, cy - 33);
      ctx.lineTo(x + s * 18, cy - 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  } else {
    ctx.fillStyle = '#fff8ec';
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(x + s * 7, cy - 20);
      ctx.lineTo(x + s * 11, cy - 32);
      ctx.lineTo(x + s * 15, cy - 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }
  // ตัว
  const g = ctx.createRadialGradient(x - 6, cy - 10, 3, x, cy, 24);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, d.color);
  g.addColorStop(1, d.dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, cy, 21, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // หน้า
  if (tw.kind === 'owl') {
    ctx.fillStyle = '#fff8ec';
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.arc(x + s * 8, cy - 3, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    drawEyes(ctx, x, cy - 3, 8, 3.6);
    ctx.fillStyle = '#ff9a3d';
    ctx.beginPath();
    ctx.moveTo(x - 3, cy + 4);
    ctx.lineTo(x + 3, cy + 4);
    ctx.lineTo(x, cy + 9);
    ctx.closePath();
    ctx.fill();
  } else {
    drawEyes(ctx, x, cy - 3, 7, 3.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, cy + 5, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,127,174,.55)';
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.ellipse(x + s * 13, cy + 5, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  // ดาวเลเวล
  for (let i = 0; i < tw.lv; i++) {
    const sx = x - (tw.lv - 1) * 7 + i * 14;
    ctx.fillStyle = '#ffcf3f';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k * Math.PI) / 5 - Math.PI / 2;
      const r = k % 2 ? 2.6 : 6;
      ctx.lineTo(sx + Math.cos(a) * r, y + 29 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (selected) {
    ctx.strokeStyle = '#ffcf3f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 36, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawSlime(ctx: CanvasRenderingContext2D, s: Slime, x: number, y: number, t: number) {
  const r = s.boss ? 28 : 15;
  const sq = Math.sin(t * 9 + s.id) * 0.12;
  const w = r * (1 + sq);
  const h = r * (1 - sq);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(42,35,80,.18)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.9, w * 0.9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = s.hit > 0 ? '#ffffff' : s.color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w, r * 0.85);
  ctx.bezierCurveTo(-w * 1.1, -h * 0.6, -w * 0.6, -h * 1.25, 0, -h * 1.2);
  ctx.bezierCurveTo(w * 0.6, -h * 1.25, w * 1.1, -h * 0.6, w, r * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.ellipse(-w * 0.4, -h * 0.6, w * 0.22, h * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fill();
  drawEyes(ctx, 0, -h * 0.15, r * 0.36, r * 0.17);
  if (s.boss) {
    ctx.fillStyle = '#ffcf3f';
    ctx.beginPath();
    ctx.moveTo(-12, -h * 1.1);
    ctx.lineTo(-8, -h * 1.6);
    ctx.lineTo(-2, -h * 1.25);
    ctx.lineTo(4, -h * 1.65);
    ctx.lineTo(8, -h * 1.25);
    ctx.lineTo(13, -h * 1.55);
    ctx.lineTo(14, -h * 1.1);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (s.hp < s.max) {
    const bw = r * 2;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    rr(ctx, -bw / 2, -h * 1.5 - 10, bw, 6, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = s.hp / s.max > 0.4 ? '#3fd6a8' : '#ff6b7a';
    rr(ctx, -bw / 2 + 1, -h * 1.5 - 9, Math.max(0, (bw - 2) * (s.hp / s.max)), 4, 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawScene(ctx: CanvasRenderingContext2D, w: World, sel: number | null, hoverRange: number | null) {
  const { lay } = w;
  // หญ้า
  ctx.fillStyle = '#9be38a';
  ctx.fillRect(0, 0, lay.w, lay.h);
  ctx.fillStyle = '#8ed97c';
  for (let y = 0; y < lay.h; y += 40) for (let x = (y / 40) % 2 ? 0 : 40; x < lay.w; x += 80) ctx.fillRect(x, y, 40, 40);
  // ของตกแต่ง
  w.decor.forEach((d) => {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(d.s, d.s);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    if (d.k === 0) {
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(-4, 4, 8, 14);
      ctx.strokeRect(-4, 4, 8, 14);
      ctx.fillStyle = '#4fb55c';
      ctx.beginPath();
      ctx.arc(0, -4, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#7ddc86';
      ctx.beginPath();
      ctx.arc(-5, -9, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.k === 1) {
      ['#ff8fc4', '#ffd84a', '#fff'].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(-8 + i * 8, (i % 2) * 5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    } else if (d.k === 2) {
      ctx.fillStyle = '#c9c2dc';
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#5cc46c';
      ctx.beginPath();
      ctx.moveTo(-10, 8);
      ctx.quadraticCurveTo(-8, -10, -2, 8);
      ctx.quadraticCurveTo(0, -14, 4, 8);
      ctx.quadraticCurveTo(9, -8, 11, 8);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.restore();
  });
  // เส้นทาง
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 66;
  ctx.beginPath();
  lay.path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = '#f2d39b';
  ctx.lineWidth = 58;
  ctx.stroke();
  ctx.strokeStyle = '#e8c27e';
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 14]);
  ctx.stroke();
  ctx.setLineDash([]);
  // ปราสาท
  const [bx, by] = lay.base;
  ctx.save();
  ctx.translate(bx, by);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.fillStyle = '#e7e1f6';
  rr(ctx, -34, -40, 68, 58, 6);
  ctx.fill();
  ctx.stroke();
  [-34, -6, 22].forEach((x) => {
    ctx.fillStyle = '#e7e1f6';
    ctx.fillRect(x, -52, 12, 14);
    ctx.strokeRect(x, -52, 12, 14);
  });
  ctx.fillStyle = '#8a5a2b';
  rr(ctx, -11, -8, 22, 26, 10);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -52);
  ctx.lineTo(0, -76);
  ctx.stroke();
  ctx.fillStyle = '#ff6b7a';
  ctx.beginPath();
  ctx.moveTo(0, -76);
  ctx.lineTo(20, -70 + Math.sin(w.t * 4) * 2);
  ctx.lineTo(0, -63);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // จุดวางป้อม
  lay.spots.forEach(([x, y], i) => {
    if (w.towers.some((t) => t.spot === i)) return;
    ctx.fillStyle = sel === i ? 'rgba(255,207,63,.65)' : 'rgba(255,255,255,.45)';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 28, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = INK;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', x, y + 9);
  });
  // วงระยะยิง
  if (sel !== null && hoverRange) {
    const [x, y] = lay.spots[sel];
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, hoverRange, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // สไลม์ (เรียงตามแกน y ให้ซ้อนสวย)
  const sl = w.slimes.map((s) => ({ s, p: posAt(w, s.d) })).sort((a, b) => a.p[1] - b.p[1]);
  sl.forEach(({ s, p }) => drawSlime(ctx, s, p[0], p[1], w.t));
  // ป้อม
  w.towers.forEach((tw) => drawTower(ctx, tw, lay.spots[tw.spot][0], lay.spots[tw.spot][1] - 6, w.t, sel === tw.spot));
  // กระสุน
  w.shots.forEach((sh) => {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    if (sh.kind === 'dragon') {
      ctx.fillStyle = '#ff9a3d';
      ctx.beginPath();
      ctx.arc(sh.x, sh.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd84a';
      ctx.beginPath();
      ctx.arc(sh.x, sh.y, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (sh.kind === 'owl') {
      ctx.fillStyle = '#e3d4ff';
      ctx.beginPath();
      ctx.ellipse(sh.x, sh.y, 7, 3.5, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#b07448';
      ctx.beginPath();
      ctx.arc(sh.x, sh.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  });
  // เศษ/ตัวเลข
  w.bits.forEach((b) => {
    ctx.globalAlpha = Math.max(0, Math.min(1, b.life * 2));
    if (b.text) {
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = INK;
      ctx.strokeText(b.text, b.x, b.y);
      ctx.fillStyle = b.color;
      ctx.fillText(b.text, b.x, b.y);
    } else {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

/* ============================== เกม ============================== */

function fmtClock(ms: number) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

export function TowerGame({ engine, deadline, sync, preview }: GameProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null);
  const [portrait, setPortrait] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [hud, setHud] = useState({ coins: START_COINS, hearts: MAX_HEARTS, wave: 0, active: false, score: 0, left: 0 });
  const [sel, setSel] = useState<number | null>(null);
  const [quiz, setQuiz] = useState<'coins' | 'repair' | null>(null);
  const [over, setOver] = useState(false);
  const [toast, setToast] = useState('');
  const quizRef = useRef(quiz);
  quizRef.current = quiz;
  const selRef = useRef(sel);
  selRef.current = sel;
  const synced = useRef(-1);

  // เลือกผังตามรูปร่างจอ
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const p = r.height > r.width * 1.05;
      setPortrait(p);
      const lay = p ? PORT : LAND;
      const k = Math.min(r.width / lay.w, r.height / lay.h);
      setSize({ w: Math.floor(lay.w * k), h: Math.floor(lay.h * k) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const lay = portrait ? PORT : LAND;
    const old = world.current;
    const w = newWorld(lay);
    if (old) {
      // เปลี่ยนแนวจอระหว่างเล่น: เก็บทรัพยากรเดิม ป้อมย้ายไปจุดเดียวกัน
      Object.assign(w, { coins: old.coins, hearts: old.hearts, wave: old.wave, kills: old.kills, bossKills: old.bossKills, cleared: old.cleared });
      w.towers = old.towers.filter((t) => t.spot < lay.spots.length);
      if (old.waveActive) w.cleared = old.cleared; // เวฟที่ค้างถือว่ายกเลิก
    }
    world.current = w;
    setSel(null);
  }, [portrait]);

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(''), 1600);
  };

  const doSync = useCallback(
    (force = false) => {
      const w = world.current;
      if (!w || !sync) return;
      const sc = scoreOf(w);
      if (!force && sc === synced.current) return;
      synced.current = sc;
      sync(sc, { waves: w.cleared, kills: w.kills });
    },
    [sync]
  );

  /* ---------- วงจรเกม ---------- */
  useEffect(() => {
    if (over) return;
    let raf = 0;
    let last = performance.now();
    let hudAt = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const w = world.current;
      const c = cvs.current;
      if (!w || !c) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const paused = !!quizRef.current;
      if (deadline && Date.now() >= deadline) {
        setOver(true);
        doSync(true);
        gsfx.fanfare();
        return;
      }
      if (!paused) step(w, dt);
      // วาด
      const ctx = c.getContext('2d');
      if (ctx) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const rect = c.getBoundingClientRect();
        if (c.width !== Math.round(rect.width * dpr)) {
          c.width = Math.round(rect.width * dpr);
          c.height = Math.round(rect.height * dpr);
        }
        ctx.setTransform(c.width / w.lay.w, 0, 0, c.height / w.lay.h, 0, 0);
        const s = selRef.current;
        const tw = s !== null ? w.towers.find((t) => t.spot === s) : null;
        drawScene(ctx, w, s, tw ? stat(tw.kind, tw.lv).range : null);
      }
      if (now - hudAt > 120) {
        hudAt = now;
        setHud({ coins: w.coins, hearts: w.hearts, wave: w.wave, active: w.waveActive, score: scoreOf(w), left: deadline ? deadline - Date.now() : 0 });
      }
    };
    const step = (w: World, dt: number) => {
      w.t += dt;
      // เกิดสไลม์
      if (w.waveActive && w.toSpawn.length) {
        w.spawnCd -= dt;
        if (w.spawnCd <= 0) {
          const s = w.toSpawn.shift()!;
          w.slimes.push({ id: w.seq++, d: 0, hp: s.hp, max: s.hp, speed: s.speed, color: s.color, boss: s.boss, hit: 0 });
          w.spawnCd = Math.max(0.5, 1.05 - w.wave * 0.035);
        }
      }
      // เดิน
      w.slimes.forEach((s) => {
        s.d += s.speed * dt;
        s.hit = Math.max(0, s.hit - dt);
      });
      const reached = w.slimes.filter((s) => s.d >= w.total);
      if (reached.length) {
        reached.forEach((s) => (w.hearts -= s.boss ? 3 : 1));
        w.slimes = w.slimes.filter((s) => s.d < w.total);
        gsfx.hurt();
        if (w.hearts <= 0) {
          w.hearts = 0;
          w.slimes = [];
          w.toSpawn = [];
          w.waveActive = false;
          setQuiz('repair');
          return;
        }
      }
      // ป้อมยิง
      w.towers.forEach((tw) => {
        tw.cool -= dt;
        tw.shot = Math.max(0, tw.shot - dt);
        if (tw.cool > 0) return;
        const st = stat(tw.kind, tw.lv);
        const [tx, ty] = w.lay.spots[tw.spot];
        let best: Slime | null = null;
        for (const s of w.slimes) {
          const [x, y] = posAt(w, s.d);
          if (Math.hypot(x - tx, y - ty) <= st.range && (!best || s.d > best.d)) best = s;
        }
        if (!best) return;
        tw.cool = st.cd;
        tw.shot = 0.12;
        const d = tdef(tw.kind);
        w.shots.push({ x: tx, y: ty - 14, target: best.id, kind: tw.kind, dmg: st.dmg, splash: st.splash, speed: d.speed });
        if (Math.random() < 0.5) gsfx.shoot(TOWERS.indexOf(d));
      });
      // กระสุน
      const keep: Shot[] = [];
      w.shots.forEach((sh) => {
        const tgt = w.slimes.find((s) => s.id === sh.target);
        if (!tgt) return;
        const [x, y] = posAt(w, tgt.d);
        const dx = x - sh.x;
        const dy = y - 6 - sh.y;
        const dist = Math.hypot(dx, dy);
        const mv = sh.speed * dt;
        if (dist <= mv + 6) {
          const victims = sh.splash ? w.slimes.filter((s) => {
            const [sx, sy] = posAt(w, s.d);
            return Math.hypot(sx - x, sy - y) <= sh.splash;
          }) : [tgt];
          victims.forEach((v) => {
            v.hp -= sh.dmg;
            v.hit = 0.08;
          });
          if (sh.kind === 'dragon')
            for (let i = 0; i < 8; i++) w.bits.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.4, color: i % 2 ? '#ff9a3d' : '#ffd84a', r: 4 });
        } else {
          sh.x += (dx / dist) * mv;
          sh.y += (dy / dist) * mv;
          if (sh.kind === 'dragon' && Math.random() < 0.6) w.bits.push({ x: sh.x, y: sh.y, vx: 0, vy: -20, life: 0.3, color: '#ffd84a', r: 3 });
          keep.push(sh);
        }
      });
      w.shots = keep;
      // ตาย
      const dead = w.slimes.filter((s) => s.hp <= 0);
      if (dead.length) {
        dead.forEach((s) => {
          const [x, y] = posAt(w, s.d);
          if (s.boss) w.bossKills++;
          else w.kills++;
          for (let i = 0; i < (s.boss ? 18 : 9); i++) w.bits.push({ x, y, vx: (Math.random() - 0.5) * 220, vy: -Math.random() * 200, life: 0.6, color: s.color, r: 3 + Math.random() * 3 });
          w.bits.push({ x, y: y - 20, vx: 0, vy: -50, life: 0.9, color: '#ffcf3f', r: 0, text: `+${s.boss ? 80 : 10}` });
        });
        w.slimes = w.slimes.filter((s) => s.hp > 0);
        gsfx.splat();
      }
      // เศษ
      w.bits.forEach((b) => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (!b.text) b.vy += 420 * dt;
        b.life -= dt;
      });
      w.bits = w.bits.filter((b) => b.life > 0);
      // จบเวฟ
      if (w.waveActive && !w.toSpawn.length && !w.slimes.length) {
        w.waveActive = false;
        w.cleared++;
        gsfx.fanfare();
        w.bits.push({ x: w.lay.w / 2, y: w.lay.h / 2, vx: 0, vy: -30, life: 1.4, color: '#ffffff', r: 0, text: `ผ่านเวฟ ${w.wave}! +100` });
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

  /* ---------- การกระทำ ---------- */
  const onCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const w = world.current;
    if (!w || over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * w.lay.w;
    const y = ((e.clientY - r.top) / r.height) * w.lay.h;
    let hit: number | null = null;
    w.lay.spots.forEach(([sx, sy], i) => {
      if (Math.hypot(sx - x, sy - y) < 40) hit = i;
    });
    setSel(hit === sel ? null : hit);
    if (hit !== null) gsfx.tap();
  };

  const build = (k: Kind) => {
    const w = world.current;
    if (!w || sel === null) return;
    const d = tdef(k);
    if (w.coins < d.cost) return flash('เหรียญไม่พอ ไปตอบคำถามก่อนนะ');
    w.coins -= d.cost;
    w.towers.push({ spot: sel, kind: k, lv: 1, cool: 0, aim: 0, shot: 0 });
    gsfx.build();
    setSel(null);
  };
  const upgrade = () => {
    const w = world.current;
    if (!w || sel === null) return;
    const tw = w.towers.find((t) => t.spot === sel);
    if (!tw || tw.lv >= 3) return;
    const cost = upCost(tw.kind, tw.lv);
    if (w.coins < cost) return flash('เหรียญไม่พอ ไปตอบคำถามก่อนนะ');
    w.coins -= cost;
    tw.lv++;
    gsfx.build();
    gsfx.sparkleish();
    setSel(null);
  };
  const startWave = () => {
    const w = world.current;
    if (!w || w.waveActive || over) return;
    if (!w.towers.length) return flash('วางป้อมก่อนอย่างน้อย 1 ป้อม');
    w.wave++;
    w.toSpawn = waveList(w.wave);
    w.spawnCd = 0.3;
    w.waveActive = true;
    gsfx.wave();
    setSel(null);
  };

  const w = world.current;
  const selTower = w && sel !== null ? w.towers.find((t) => t.spot === sel) : null;
  const spot = w && sel !== null ? w.lay.spots[sel] : null;

  return (
    <div className="td" data-over={over}>
      <div className="td-hud">
        <span className="cf-chip cf-cash">
          <Coin size={22} /> {hud.coins}
        </span>
        <span className="cf-chip td-hearts">
          <Heart size={18} /> {hud.hearts}/{MAX_HEARTS}
        </span>
        <span className="cf-chip">
          <Swords className="w-4 h-4" /> เวฟ {hud.wave}
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

      <div className="td-stage" ref={wrap}>
        <div className="td-board" style={size ? { width: size.w, height: size.h } : { visibility: 'hidden' }}>
          <canvas ref={cvs} className="td-canvas" onPointerDown={onCanvas} aria-label="แผนที่ป้อมปราการ แตะจุดวางป้อม" />
          {spot && w && (
            <div className="td-pop" style={{ left: `${(spot[0] / w.lay.w) * 100}%`, top: `${(spot[1] / w.lay.h) * 100}%` }} data-up={spot[1] / w.lay.h > 0.55}>
              {selTower ? (
                <>
                  <b>
                    {tdef(selTower.kind).name} เลเวล {selTower.lv}
                  </b>
                  {selTower.lv < 3 ? (
                    <button type="button" className="l5g-btn l5g-btn-go l5g-btn-sm" disabled={hud.coins < upCost(selTower.kind, selTower.lv)} onClick={upgrade}>
                      <ArrowUpCircle className="w-4 h-4" /> อัปเกรด <Coin size={16} /> {upCost(selTower.kind, selTower.lv)}
                    </button>
                  ) : (
                    <span className="td-max">แรงสุดแล้ว</span>
                  )}
                </>
              ) : (
                <>
                  <b>สร้างป้อม</b>
                  <div className="td-build">
                    {TOWERS.map((t) => (
                      <button key={t.kind} type="button" className="td-opt" disabled={hud.coins < t.cost} onClick={() => build(t.kind)} style={{ ['--tc' as string]: t.color }}>
                        <TowerIcon kind={t.kind} />
                        <b>{t.name}</b>
                        <small>{t.desc}</small>
                        <span>
                          <Coin size={14} /> {t.cost}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button type="button" className="td-pop-x" onClick={() => setSel(null)} aria-label="ปิด">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {toast && <div className="cf-hint">{toast}</div>}
          {!hud.active && hud.wave === 0 && !sel && <div className="td-tip">แตะ + เพื่อวางป้อม แล้วกด ปล่อยเวฟ</div>}
        </div>
      </div>

      <div className="cf-bar">
        <button type="button" className="l5g-btn l5g-btn-go l5g-btn-xl cf-restock" disabled={over} onClick={() => (gsfx.tap(), setQuiz('coins'))}>
          <Coins className="w-6 h-6" />
          <span>
            หาเหรียญ<small>ตอบ 3 ข้อ</small>
          </span>
        </button>
        <button type="button" className="l5g-btn l5g-btn-coral l5g-btn-xl cf-upbtn" disabled={over || hud.active} onClick={startWave}>
          {hud.active ? <Swords className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          <span>
            {hud.active ? 'กำลังบุก!' : 'ปล่อยเวฟ'}
            <small>{hud.active ? 'ป้อมกำลังป้องกัน' : `เวฟที่ ${hud.wave + 1}`}</small>
          </span>
        </button>
      </div>

      {quiz && (
        <QuizBatch
          engine={engine}
          count={3}
          title={quiz === 'repair' ? 'ฐานพัง! ตอบเพื่อซ่อม' : 'ตอบคำถามรับเหรียญ'}
          icon={quiz === 'repair' ? <Wrench className="w-5 h-5" /> : <Hammer className="w-5 h-5" />}
          color={quiz === 'repair' ? '#ff6b7a' : '#3fd6a8'}
          rewardText={() => (quiz === 'repair' ? 'ถูก! ซ่อมฐาน +2' : `ถูก! +${COIN_PER_CORRECT} เหรียญ`)}
          onAnswered={(o) => {
            const ww = world.current;
            if (!ww || !o.correct) return;
            if (quiz === 'repair') ww.hearts = Math.min(MAX_HEARTS, ww.hearts + 2);
            else {
              ww.coins += COIN_PER_CORRECT;
              gsfx.coin();
            }
          }}
          summary={(ok) =>
            quiz === 'repair' ? `ซ่อมฐานแล้ว หัวใจ ${Math.max(2, world.current?.hearts || 2)} ดวง สู้ต่อ!` : ok ? `ได้เหรียญ ${ok * COIN_PER_CORRECT} ไปวางป้อมเลย!` : 'รอบนี้ยังไม่ได้เหรียญ ลองอีกรอบนะ'
          }
          onDone={() => {
            const ww = world.current;
            if (ww && quiz === 'repair' && ww.hearts < 2) ww.hearts = 2;
            setQuiz(null);
          }}
        />
      )}

      {over && (
        <div className="gm-over">
          <div className="gm-over-card">
            <p className="gm-over-tag">หมดเวลา!</p>
            <div className="gm-over-big">{hud.score.toLocaleString('th-TH')}</div>
            <p className="font-bold">คะแนนป้อมปราการ</p>
            <div className="gm-over-stats">
              <span>
                <b>{world.current?.cleared || 0}</b>เวฟที่ผ่าน
              </span>
              <span>
                <b>{(world.current?.kills || 0) + (world.current?.bossKills || 0)}</b>สไลม์ที่ปราบ
              </span>
            </div>
            <p className="gm-over-wait">{preview ? 'นี่คือการทดลองเล่น' : 'รอครูประกาศผลนะ'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function TowerIcon({ kind, size = 40 }: { kind: Kind; size?: number }) {
  const d = tdef(kind);
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      {kind === 'squirrel' && <ellipse cx="30" cy="16" rx="7" ry="11" fill={d.dark} stroke={INK} strokeWidth="2" transform="rotate(25 30 16)" />}
      {kind === 'dragon' && (
        <>
          <path d="M8 22 L1 12 L10 18 Z" fill="#4fb55c" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M32 22 L39 12 L30 18 Z" fill="#4fb55c" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        </>
      )}
      {kind !== 'dragon' ? (
        <>
          <path d="M13 12 L15 3 L19 11 Z" fill={kind === 'owl' ? d.dark : d.color} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M27 12 L25 3 L21 11 Z" fill={kind === 'owl' ? d.dark : d.color} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <path d="M14 11 L15 3 L18 10 Z" fill="#fff8ec" stroke={INK} strokeWidth="1.6" />
          <path d="M26 11 L25 3 L22 10 Z" fill="#fff8ec" stroke={INK} strokeWidth="1.6" />
        </>
      )}
      <ellipse cx="20" cy="22" rx="13" ry="12.5" fill={d.color} stroke={INK} strokeWidth="2.2" />
      {kind === 'owl' && (
        <>
          <circle cx="15" cy="20" r="4.5" fill="#fff8ec" stroke={INK} strokeWidth="1.4" />
          <circle cx="25" cy="20" r="4.5" fill="#fff8ec" stroke={INK} strokeWidth="1.4" />
          <path d="M18 25 L22 25 L20 28 Z" fill="#ff9a3d" />
        </>
      )}
      <circle cx="15" cy="20" r="2.2" fill={INK} />
      <circle cx="25" cy="20" r="2.2" fill={INK} />
      <circle cx="16" cy="19" r="0.8" fill="#fff" />
      <circle cx="26" cy="19" r="0.8" fill="#fff" />
      {kind !== 'owl' && <path d="M17 26 Q20 28.5 23 26" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />}
    </svg>
  );
}
