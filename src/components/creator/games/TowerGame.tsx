'use client';

import './games.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpCircle, Coins, LogOut, Swords, Undo2, X } from 'lucide-react';
import { Coin, Clock, Flag, Heart } from './art';
import { QuestionDock } from './QuestionPad';
import type { GameProps } from './types';
import { gsfx } from '@/lib/game-creator/gsound';
import { CHARS, RARITY, STARTERS, charDef, charImg, charUri, preloadChars, rollChar, type CharDef, type CharKind } from './towerChars';

/* ============================== ค่าของเกม ============================== */

const COIN_PER_CORRECT = 40;
/** โบนัสต่อข้อเมื่อถูกติดกัน (สูงสุด 3 ขั้น) */
const STREAK_BONUS = 10;
const ROLL_COST = 60;
const START_COINS = 60;
const BAG_SIZE = 6;
const MAX_HEARTS = 10;
const FIRST_WAVE_DELAY = 10;
const WAVE_GAP = 3;
const BROKEN_DELAY = 3;
/** รัศมีวางตัวละครบนจุด (หน่วยแผนที่) */
const DROP_R = 50;
const SLIME_COLORS = ['#7ddc86', '#ff8fc4', '#ffb35c', '#ff6b7a', '#ffd84a'];

const stat = (d: CharDef, lv: number) => {
  const m = lv - 1;
  return {
    range: d.range * (1 + 0.12 * m),
    cd: d.cd * Math.pow(0.86, m),
    dmg: d.dmg * Math.pow(1.55, m),
    splash: (d.splash || 0) * (1 + 0.15 * m),
    chain: d.chain ? d.chain + m : 0,
    multi: (d.multi || 1) + (d.multi && m >= 2 ? 1 : 0),
    knock: (d.knock || 0) * (1 + 0.2 * m),
    bounty: d.bounty ? d.bounty + m : 0,
  };
};
const upCost = (k: CharKind, lv: number) => {
  if (lv >= 3) return 0;
  const base = { common: 50, rare: 70, epic: 90 }[charDef(k).rarity];
  return lv === 1 ? base : Math.round(base * 1.8);
};

/* ============================== แผนที่ ============================== */

interface Layout {
  id: 'land' | 'tall';
  w: number;
  h: number;
  path: [number, number][];
  spots: [number, number][];
  base: [number, number];
}
const LAND: Layout = {
  id: 'land',
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
    [330, 80],
    [565, 245],
    [570, 64],
    [585, 425],
    [805, 280],
    [830, 505],
    [90, 330],
    [820, 60],
    [470, 470],
  ],
  base: [895, 410],
};
const TALL: Layout = {
  id: 'tall',
  w: 560,
  h: 660,
  path: [
    [80, -40],
    [80, 150],
    [470, 150],
    [470, 330],
    [90, 330],
    [90, 510],
    [400, 510],
    [400, 720],
  ],
  spots: [
    [200, 84],
    [360, 84],
    [510, 84],
    [30, 240],
    [210, 240],
    [340, 240],
    [250, 420],
    [390, 420],
    [525, 420],
    [60, 600],
    [200, 600],
    [530, 610],
  ],
  base: [400, 605],
};

/* ============================== โลกของเกม ============================== */

interface Unit {
  uid: number;
  kind: CharKind;
  lv: number;
}
interface Tower extends Unit {
  spot: number;
  cool: number;
  shot: number;
  pop: number;
}
type SlimeType = 'norm' | 'fast' | 'tank' | 'boss';
interface Slime {
  id: number;
  d: number;
  hp: number;
  max: number;
  speed: number;
  color: string;
  type: SlimeType;
  hit: number;
  slowF: number;
  slowT: number;
  burnT: number;
  burnD: number;
  bounty: number;
}
interface Shot {
  x: number;
  y: number;
  target: number;
  def: CharDef;
  dmg: number;
  splash: number;
  chain: number;
  knock: number;
  bounty: number;
  hits: number[];
  spin: number;
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
  ring?: number;
}
type Phase = 'prep' | 'wave' | 'gap' | 'broken';

interface World {
  lay: Layout;
  segs: { x1: number; y1: number; x2: number; y2: number; len: number; at: number }[];
  total: number;
  slimes: Slime[];
  towers: Tower[];
  shots: Shot[];
  bits: Bit[];
  bag: (Unit | null)[];
  coins: number;
  hearts: number;
  wave: number;
  phase: Phase;
  timer: number;
  toSpawn: { hp: number; speed: number; color: string; type: SlimeType }[];
  spawnCd: number;
  waveTotal: number;
  waveDone: number;
  kills: number;
  bossKills: number;
  cleared: number;
  seq: number;
  t: number;
  decor: { x: number; y: number; k: number; s: number }[];
  /** ตัวที่กำลังถูกลากออกจากแผนที่ (ซ่อนไว้ ไม่ยิง) */
  lifted: number | null;
  /** สุ่มติดกันกี่ครั้งแล้วยังไม่ได้ระดับหายาก (การันตีครั้งที่ 5) */
  dry: number;
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
  for (let i = 0; i < 300 && out.length < 34; i++) {
    const x = rnd() * lay.w;
    const y = rnd() * lay.h;
    if (distToPath(lay, x, y) < 52) continue;
    if (lay.spots.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 50)) continue;
    if (Math.hypot(lay.base[0] - x, lay.base[1] - y) < 80) continue;
    if (out.some((d) => Math.hypot(d.x - x, d.y - y) < 34)) continue;
    out.push({ x, y, k: Math.floor(rnd() * 4), s: 0.7 + rnd() * 0.5 });
  }
  return out;
}

let uidSeq = 1;
const newUnit = (kind: CharKind, lv = 1): Unit => ({ uid: uidSeq++, kind, lv });

function newWorld(lay: Layout): World {
  const { segs, total } = buildSegs(lay);
  const bag: (Unit | null)[] = Array.from({ length: BAG_SIZE }, () => null);
  STARTERS.forEach((k, i) => (bag[i] = newUnit(k)));
  return {
    lay,
    segs,
    total,
    slimes: [],
    towers: [],
    shots: [],
    bits: [],
    bag,
    coins: START_COINS,
    hearts: MAX_HEARTS,
    wave: 0,
    phase: 'prep',
    timer: FIRST_WAVE_DELAY,
    toSpawn: [],
    spawnCd: 0,
    waveTotal: 0,
    waveDone: 0,
    kills: 0,
    bossKills: 0,
    cleared: 0,
    seq: 1,
    t: 0,
    decor: makeDecor(lay),
    lifted: null,
    dry: 0,
  };
}

/** หมุนจอ: เปลี่ยนผังแผนที่ แต่เก็บทุกอย่างไว้ (สไลม์เดินต่อในตำแหน่งเทียบเท่า) */
function relayout(w: World, lay: Layout) {
  const { segs, total } = buildSegs(lay);
  const k = total / w.total;
  w.slimes.forEach((s) => (s.d *= k));
  w.shots = [];
  w.bits = [];
  w.lay = lay;
  w.segs = segs;
  w.total = total;
  w.decor = makeDecor(lay);
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
  const count = Math.min(30, 6 + n * 2);
  const hp = (5 + n * 2.4) * (1 + Math.max(0, n - 6) * 0.1);
  const sp = Math.min(92, 42 + n * 2.2);
  const base = SLIME_COLORS[(n - 1) % SLIME_COLORS.length];
  for (let i = 0; i < count; i++) {
    const type: SlimeType = n >= 4 && i % 5 === 4 ? 'tank' : n >= 2 && i % 4 === 2 ? 'fast' : 'norm';
    list.push({
      hp: hp * (type === 'tank' ? 2.6 : type === 'fast' ? 0.55 : 1),
      speed: sp * (type === 'tank' ? 0.68 : type === 'fast' ? 1.6 : 1),
      color: type === 'tank' ? '#a77cf2' : type === 'fast' ? '#5ccbff' : base,
      type,
    });
  }
  if (n % 5 === 0) list.push({ hp: hp * 9, speed: sp * 0.55, color: '#2a2350', type: 'boss' });
  return list;
}

function startWave(w: World, n: number) {
  w.wave = n;
  w.toSpawn = waveList(n);
  w.waveTotal = w.toSpawn.length;
  w.waveDone = 0;
  w.spawnCd = 0.3;
  w.phase = 'wave';
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

function drawEyes(ctx: CanvasRenderingContext2D, x: number, y: number, gap: number, r: number) {
  [-1, 1].forEach((s) => {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(x + s * gap, y, r, r * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + s * gap + r * 0.35, y - r * 0.4, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** ฉากนิ่ง (หญ้า ทาง ปราสาท ของตกแต่ง) วาดครั้งเดียวเก็บไว้ ลดงานทุกเฟรม */
function drawStatic(ctx: CanvasRenderingContext2D, w: World) {
  const { lay } = w;
  ctx.fillStyle = '#9be38a';
  ctx.fillRect(0, 0, lay.w, lay.h);
  ctx.fillStyle = '#8ed97c';
  for (let y = 0; y < lay.h; y += 40) for (let x = (y / 40) % 2 ? 0 : 40; x < lay.w; x += 80) ctx.fillRect(x, y, 40, 40);
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
  ctx.restore();
}

function drawSlime(ctx: CanvasRenderingContext2D, s: Slime, x: number, y: number, t: number) {
  const r = s.type === 'boss' ? 28 : s.type === 'tank' ? 20 : s.type === 'fast' ? 12 : 15;
  const sq = Math.sin(t * (s.type === 'fast' ? 16 : 9) + s.id) * 0.12;
  const w = r * (1 + sq);
  const h = r * (1 - sq);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(42,35,80,.18)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.9, w * 0.9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (s.type === 'fast') {
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2.5;
    [-4, 4].forEach((o) => {
      ctx.beginPath();
      ctx.moveTo(-w - 6, o);
      ctx.lineTo(-w - 16, o);
      ctx.stroke();
    });
  }
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
  if (s.slowT > 0) {
    ctx.fillStyle = 'rgba(140,210,255,.45)';
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.ellipse(-w * 0.4, -h * 0.6, w * 0.22, h * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fill();
  drawEyes(ctx, 0, -h * 0.15, r * 0.36, r * 0.17);
  if (s.type === 'tank') {
    ctx.fillStyle = '#c9c2dc';
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.95, w * 0.72, h * 0.42, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  if (s.type === 'boss') {
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

function drawStars(ctx: CanvasRenderingContext2D, x: number, y: number, lv: number) {
  for (let i = 0; i < lv; i++) {
    const sx = x - (lv - 1) * 7 + i * 14;
    ctx.fillStyle = '#ffcf3f';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k * Math.PI) / 5 - Math.PI / 2;
      const r = k % 2 ? 2.6 : 6;
      ctx.lineTo(sx + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawChar(ctx: CanvasRenderingContext2D, kind: CharKind, x: number, y: number, size: number, squash = 1) {
  const im = charImg(kind);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 + (1 - squash) * 0.6, squash);
  if (im) ctx.drawImage(im, -size / 2, -size, size, size);
  else {
    ctx.fillStyle = charDef(kind).color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -size / 2, size * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

interface DrawView {
  sel: number | null;
  /** กำลังลาก: ชนิด/เลเวลที่ลาก + จุดที่ชี้อยู่ */
  drag: { kind: CharKind; lv: number; uid: number; spot: number | null } | null;
}

/** ส่วนที่ขยับ (วาดทับฉากนิ่งทุกเฟรม) */
function drawScene(ctx: CanvasRenderingContext2D, w: World, v: DrawView) {
  const { lay } = w;
  // ธงปราสาท
  const [bx, by] = lay.base;
  ctx.fillStyle = '#ff6b7a';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx, by - 76);
  ctx.lineTo(bx + 20, by - 70 + Math.sin(w.t * 4) * 2);
  ctx.lineTo(bx, by - 63);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // จุดวาง
  const pulse = 0.5 + Math.sin(w.t * 6) * 0.5;
  lay.spots.forEach(([x, y], i) => {
    const tw = w.towers.find((t) => t.spot === i && t.uid !== w.lifted);
    if (v.drag) {
      const merge = tw && tw.kind === v.drag.kind && tw.lv === v.drag.lv && tw.lv < 3 && tw.uid !== v.drag.uid;
      const hover = v.drag.spot === i;
      ctx.fillStyle = merge ? `rgba(63,214,168,${0.45 + pulse * 0.3})` : hover ? 'rgba(255,207,63,.85)' : tw ? 'rgba(255,255,255,.25)' : `rgba(255,236,150,${0.35 + pulse * 0.25})`;
      ctx.strokeStyle = merge ? '#17b07a' : INK;
      ctx.lineWidth = hover ? 4 : 2.5;
      ctx.beginPath();
      ctx.ellipse(x, y + 10, hover ? 34 : 29, hover ? 17 : 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (tw) return;
    ctx.fillStyle = 'rgba(255,255,255,.45)';
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
  const ring = (x: number, y: number, r: number) => {
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  if (v.drag && v.drag.spot !== null) ring(lay.spots[v.drag.spot][0], lay.spots[v.drag.spot][1], stat(charDef(v.drag.kind), v.drag.lv).range);
  else if (v.sel !== null) {
    const tw = w.towers.find((t) => t.spot === v.sel);
    if (tw) ring(lay.spots[tw.spot][0], lay.spots[tw.spot][1], stat(charDef(tw.kind), tw.lv).range);
  }
  // สไลม์ + ตัวละคร เรียงตามแกน y ให้ซ้อนสวย
  const items: { y: number; draw: () => void }[] = [];
  w.slimes.forEach((s) => {
    const p = posAt(w, s.d);
    items.push({ y: p[1], draw: () => drawSlime(ctx, s, p[0], p[1], w.t) });
  });
  w.towers.forEach((tw) => {
    if (tw.uid === w.lifted) return;
    const [x, y] = lay.spots[tw.spot];
    items.push({
      y: y + 4,
      draw: () => {
        ctx.fillStyle = '#c9c2dc';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, y + 14, 30, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (tw.pop > 0) {
          ctx.strokeStyle = `rgba(255,207,63,${tw.pop})`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(x, y - 10, 44 - tw.pop * 18, 0, Math.PI * 2);
          ctx.stroke();
        }
        const bob = Math.sin(w.t * 3 + tw.spot) * 1.5;
        drawChar(ctx, tw.kind, x, y + 18 + bob, 70, tw.shot > 0 ? 0.9 : 1);
        drawStars(ctx, x, y + 30, tw.lv);
        if (v.sel === tw.spot) {
          ctx.strokeStyle = '#ffcf3f';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(x, y + 14, 36, 15, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      },
    });
  });
  items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());
  // กระสุน
  w.shots.forEach((sh) => {
    const s = sh.def.shot;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.save();
    ctx.translate(sh.x, sh.y);
    if (s.kind === 'star') {
      ctx.rotate(sh.spin);
      ctx.fillStyle = s.c;
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        const r = k % 2 ? s.r * 0.45 : s.r * 1.25;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = s.c2;
      ctx.beginPath();
      ctx.arc(0, 0, s.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.kind === 'stick') {
      ctx.rotate(sh.spin);
      ctx.fillStyle = s.c;
      rr(ctx, -s.r * 1.4, -s.r * 0.5, s.r * 2.8, s.r, s.r * 0.5);
      ctx.fill();
      ctx.stroke();
    } else if (s.kind === 'tri') {
      ctx.rotate(sh.spin);
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.moveTo(-s.r, -s.r * 0.6);
      ctx.lineTo(s.r * 1.3, 0);
      ctx.lineTo(-s.r, s.r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = s.c2;
      ctx.fillRect(-s.r - 4, -2, 4, 4);
    } else {
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.arc(0, 0, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = s.c2;
      ctx.beginPath();
      ctx.arc(-s.r * 0.25, -s.r * 0.25, s.r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
  // เศษ/ตัวเลข
  w.bits.forEach((b) => {
    ctx.globalAlpha = Math.max(0, Math.min(1, b.life * 2));
    if (b.text) {
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = INK;
      ctx.strokeText(b.text, b.x, b.y);
      ctx.fillStyle = b.color;
      ctx.fillText(b.text, b.x, b.y);
    } else if (b.ring) {
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.ring * (1.2 - b.life), 0, Math.PI * 2);
      ctx.stroke();
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

interface Hud {
  coins: number;
  hearts: number;
  wave: number;
  phase: Phase;
  timer: number;
  prog: number;
  remain: number;
  boss: boolean;
  score: number;
  left: number;
}

type DragSrc = { from: 'bag'; idx: number } | { from: 'map'; uid: number };
interface DragState {
  src: DragSrc;
  kind: CharKind;
  lv: number;
  uid: number;
  sx: number;
  sy: number;
  moved: boolean;
  spot: number | null;
}

export function TowerGame({ engine, deadline, sync, preview, onLeave }: GameProps) {
  const root = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const bgCache = useRef<{ c: HTMLCanvasElement; key: string } | null>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const world = useRef<World | null>(null);
  const [lay, setLay] = useState<Layout | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [hud, setHud] = useState<Hud>({ coins: START_COINS, hearts: MAX_HEARTS, wave: 0, phase: 'prep', timer: FIRST_WAVE_DELAY, prog: 0, remain: 0, boss: false, score: 0, left: 0 });
  const [, setBump] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [ask, setAsk] = useState(false);
  const [streak, setStreak] = useState(0);
  const [over, setOver] = useState(false);
  const [toast, setToast] = useState('');
  const [banner, setBanner] = useState<{ text: string; kind: 'ok' | 'bad' | 'wave'; at: number } | null>(null);
  const [reveal, setReveal] = useState<{ kind: CharKind; at: number } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [info, setInfo] = useState<CharKind | null>(null);
  const [coinPop, setCoinPop] = useState<{ n: number; at: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const selRef = useRef(sel);
  selRef.current = sel;
  const synced = useRef(-1);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shootAt = useRef(0);

  const rerender = () => setBump((b) => b + 1);
  const flash = (t: string) => {
    setToast(t);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(''), 1700);
  };

  useEffect(() => preloadChars(), []);

  // เลือกผังตามรูปร่างจอทั้งเกม (ไม่เปลี่ยนตอนเปิดแผงคำถาม) + ขนาดแผนที่ตามพื้นที่ที่เหลือ
  useEffect(() => {
    const r0 = root.current;
    const st = wrap.current;
    if (!r0 || !st) return;
    const fit = () => {
      const rr0 = r0.getBoundingClientRect();
      const want = rr0.height > rr0.width * 1.05 ? TALL : LAND;
      setLay((cur) => (cur && cur.id === want.id ? cur : want));
      const r = st.getBoundingClientRect();
      const k = Math.min(r.width / want.w, r.height / want.h);
      setSize({ w: Math.max(40, Math.floor(want.w * k)), h: Math.max(40, Math.floor(want.h * k)) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(r0);
    ro.observe(st);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!lay) return;
    if (!world.current) world.current = newWorld(lay);
    else if (world.current.lay.id !== lay.id) relayout(world.current, lay);
    bgCache.current = null;
    setSel(null);
    rerender();
  }, [lay]);

  const doSync = useCallback(
    (force = false) => {
      const w = world.current;
      if (!w || !sync) return;
      const sc = scoreOf(w);
      if (!force && sc === synced.current) return;
      synced.current = sc;
      sync(sc, { waves: w.cleared, kills: w.kills + w.bossKills });
    },
    [sync]
  );

  /* ---------- วงจรเกม ---------- */
  useEffect(() => {
    if (over) return;
    let raf = 0;
    let last = performance.now();
    let hudAt = 0;
    const say = (text: string, kind: 'ok' | 'bad' | 'wave') => setBanner({ text, kind, at: Date.now() });

    const step = (w: World, dt: number) => {
      w.t += dt;
      // ช่วงพัก: นับถอยหลังแล้วปล่อยเวฟเอง
      if (w.phase !== 'wave') {
        w.timer -= dt;
        if (w.timer <= 0) {
          startWave(w, w.phase === 'broken' ? Math.max(1, w.wave) : w.wave + 1);
          gsfx.wave();
          say(w.toSpawn.some((s) => s.type === 'boss') ? `เวฟ ${w.wave} บอสมาแล้ว!` : `เวฟ ${w.wave} มาแล้ว!`, 'wave');
        }
      }
      if (w.phase === 'wave' && w.toSpawn.length) {
        w.spawnCd -= dt;
        if (w.spawnCd <= 0) {
          const s = w.toSpawn.shift()!;
          w.slimes.push({ id: w.seq++, d: 0, hp: s.hp, max: s.hp, speed: s.speed, color: s.color, type: s.type, hit: 0, slowF: 1, slowT: 0, burnT: 0, burnD: 0, bounty: 0 });
          w.spawnCd = Math.max(0.45, 1.0 - w.wave * 0.03) * (s.type === 'fast' ? 0.6 : 1);
        }
      }
      // เดิน + ไฟไหม้ + ช้าลง
      w.slimes.forEach((s) => {
        const slow = s.slowT > 0 ? s.slowF : 1;
        s.d += s.speed * slow * dt;
        s.hit = Math.max(0, s.hit - dt);
        if (s.slowT > 0) s.slowT -= dt;
        else s.slowF = 1;
        if (s.burnT > 0) {
          s.hp -= s.burnD * dt;
          s.burnT -= dt;
          if (Math.random() < 0.25) {
            const [x, y] = posAt(w, s.d);
            w.bits.push({ x: x + (Math.random() - 0.5) * 16, y: y - 10, vx: 0, vy: -40, life: 0.35, color: Math.random() < 0.5 ? '#ff9a3d' : '#ffd84a', r: 3 });
          }
        }
      });
      const reached = w.slimes.filter((s) => s.d >= w.total);
      if (reached.length) {
        reached.forEach((s) => (w.hearts -= s.type === 'boss' ? 3 : s.type === 'tank' ? 2 : 1));
        w.waveDone += reached.length;
        w.slimes = w.slimes.filter((s) => s.d < w.total);
        gsfx.hurt();
        if (w.hearts <= 0) {
          // ฐานแตก: ไม่แพ้ ซ่อมฐานแล้วเริ่มเวฟนี้ใหม่
          w.hearts = Math.ceil(MAX_HEARTS / 2);
          w.slimes = [];
          w.toSpawn = [];
          w.shots = [];
          w.phase = 'broken';
          w.timer = BROKEN_DELAY;
          gsfx.sad();
          say('ฐานแตก! ซ่อมแล้วสู้เวฟนี้ใหม่', 'bad');
          return;
        }
      }
      // ตัวละครยิง
      for (const tw of w.towers) {
        tw.cool -= dt;
        tw.shot = Math.max(0, tw.shot - dt);
        tw.pop = Math.max(0, tw.pop - dt * 1.4);
        if (tw.cool > 0 || tw.uid === w.lifted) continue;
        const d = charDef(tw.kind);
        const st = stat(d, tw.lv);
        const [tx, ty] = w.lay.spots[tw.spot];
        const inRange = w.slimes
          .filter((s) => {
            const [x, y] = posAt(w, s.d);
            return Math.hypot(x - tx, y - ty) <= st.range;
          })
          .sort((a, b) => b.d - a.d)
          .slice(0, st.multi);
        if (!inRange.length) continue;
        tw.cool = st.cd;
        tw.shot = 0.12;
        inRange.forEach((tg) =>
          w.shots.push({ x: tx, y: ty - 18, target: tg.id, def: d, dmg: st.dmg, splash: st.splash, chain: st.chain, knock: st.knock, bounty: st.bounty, hits: [], spin: 0 })
        );
        const now = performance.now();
        if (now - shootAt.current > 90) {
          shootAt.current = now;
          gsfx.shoot(d.splash ? 2 : d.cd < 0.6 ? 1 : 0);
        }
      }
      // กระสุน
      const keep: Shot[] = [];
      for (const sh of w.shots) {
        const tgt = w.slimes.find((s) => s.id === sh.target && s.hp > 0);
        if (!tgt) continue;
        const [x, y] = posAt(w, tgt.d);
        const dx = x - sh.x;
        const dy = y - 6 - sh.y;
        const dist = Math.hypot(dx, dy);
        const mv = sh.def.speed * dt;
        sh.spin += dt * 12;
        if (sh.def.shot.kind !== 'star') sh.spin = Math.atan2(dy, dx);
        if (dist > mv + 6) {
          sh.x += (dx / dist) * mv;
          sh.y += (dy / dist) * mv;
          if ((sh.def.burn || sh.def.chain) && Math.random() < 0.5) w.bits.push({ x: sh.x, y: sh.y, vx: 0, vy: -16, life: 0.25, color: sh.def.shot.c2, r: 2.6 });
          keep.push(sh);
          continue;
        }
        const victims = sh.splash
          ? w.slimes.filter((s) => {
              const [sx, sy] = posAt(w, s.d);
              return Math.hypot(sx - x, sy - y) <= sh.splash;
            })
          : [tgt];
        victims.forEach((v) => {
          v.hp -= sh.dmg;
          v.hit = 0.08;
          if (sh.def.slow) {
            v.slowF = Math.min(v.slowF, sh.def.slow[0]);
            v.slowT = Math.max(v.slowT, sh.def.slow[1]);
          }
          if (sh.def.burn) {
            v.burnT = sh.def.burn;
            v.burnD = sh.dmg * 0.4;
          }
          if (sh.knock) v.d = Math.max(0, v.d - sh.knock * (v.type === 'boss' ? 0.25 : v.type === 'tank' ? 0.5 : 1));
          if (sh.bounty) v.bounty = Math.max(v.bounty, sh.bounty);
        });
        if (sh.splash) w.bits.push({ x, y, vx: 0, vy: 0, life: 0.35, color: sh.def.shot.c, r: 0, ring: sh.splash });
        for (let i = 0; i < 5; i++) w.bits.push({ x, y, vx: (Math.random() - 0.5) * 150, vy: (Math.random() - 0.5) * 150, life: 0.3, color: i % 2 ? sh.def.shot.c : sh.def.shot.c2, r: 3 });
        // เด้งต่อ
        if (sh.chain > 0) {
          sh.hits.push(tgt.id);
          let best: Slime | null = null;
          let bd = 140;
          for (const s of w.slimes) {
            if (s.hp <= 0 || sh.hits.includes(s.id)) continue;
            const [sx, sy] = posAt(w, s.d);
            const dd = Math.hypot(sx - x, sy - y);
            if (dd < bd) {
              bd = dd;
              best = s;
            }
          }
          if (best) {
            sh.target = best.id;
            sh.chain--;
            sh.dmg *= 0.8;
            sh.x = x;
            sh.y = y - 6;
            keep.push(sh);
          }
        }
      }
      w.shots = keep;
      // ปราบได้
      const dead = w.slimes.filter((s) => s.hp <= 0);
      if (dead.length) {
        dead.forEach((s) => {
          const [x, y] = posAt(w, s.d);
          if (s.type === 'boss') w.bossKills++;
          else w.kills++;
          w.waveDone++;
          for (let i = 0; i < (s.type === 'boss' ? 18 : 9); i++) w.bits.push({ x, y, vx: (Math.random() - 0.5) * 220, vy: -Math.random() * 200, life: 0.6, color: s.color, r: 3 + Math.random() * 3 });
          w.bits.push({ x, y: y - 20, vx: 0, vy: -50, life: 0.9, color: '#ffcf3f', r: 0, text: `+${s.type === 'boss' ? 80 : 10}` });
          if (s.bounty) {
            w.coins += s.bounty;
            w.bits.push({ x: x + 18, y: y - 38, vx: 0, vy: -40, life: 0.9, color: '#fff6a8', r: 0, text: `เหรียญ +${s.bounty}` });
          }
        });
        w.slimes = w.slimes.filter((s) => s.hp > 0);
        gsfx.splat();
      }
      w.bits.forEach((b) => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (!b.text && !b.ring) b.vy += 420 * dt;
        b.life -= dt;
      });
      w.bits = w.bits.filter((b) => b.life > 0);
      if (w.bits.length > 260) w.bits.splice(0, w.bits.length - 260);
      // จบเวฟ: พัก 3 วินาทีแล้วไปต่อเอง
      if (w.phase === 'wave' && !w.toSpawn.length && !w.slimes.length) {
        w.cleared++;
        w.hearts = Math.min(MAX_HEARTS, w.hearts + 1);
        w.coins += 15;
        w.phase = 'gap';
        w.timer = WAVE_GAP;
        gsfx.fanfare();
        say(`ผ่านเวฟ ${w.wave}! +100 คะแนน`, 'ok');
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const w = world.current;
      const c = cvs.current;
      if (!w || !c) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (deadline && Date.now() >= deadline) {
        setOver(true);
        doSync(true);
        gsfx.fanfare();
        return;
      }
      step(w, dt);
      const ctx = c.getContext('2d');
      if (ctx) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const rect = c.getBoundingClientRect();
        const pw = Math.max(1, Math.round(rect.width * dpr));
        const ph = Math.max(1, Math.round(rect.height * dpr));
        if (c.width !== pw || c.height !== ph) {
          c.width = pw;
          c.height = ph;
        }
        // ฉากนิ่งเก็บไว้ในแคนวาสแยก
        const key = `${w.lay.id}:${pw}x${ph}`;
        if (!bgCache.current || bgCache.current.key !== key) {
          const b = document.createElement('canvas');
          b.width = pw;
          b.height = ph;
          const bctx = b.getContext('2d');
          if (bctx) {
            bctx.setTransform(pw / w.lay.w, 0, 0, ph / w.lay.h, 0, 0);
            drawStatic(bctx, w);
          }
          bgCache.current = { c: b, key };
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(bgCache.current.c, 0, 0);
        ctx.setTransform(pw / w.lay.w, 0, 0, ph / w.lay.h, 0, 0);
        const dr = dragRef.current;
        drawScene(ctx, w, {
          sel: selRef.current,
          drag: dr && dr.moved ? { kind: dr.kind, lv: dr.lv, uid: dr.uid, spot: dr.spot } : null,
        });
      }
      if (now - hudAt > 120) {
        hudAt = now;
        setHud({
          coins: w.coins,
          hearts: w.hearts,
          wave: w.wave,
          phase: w.phase,
          timer: Math.max(0, w.timer),
          prog: w.waveTotal ? Math.min(1, w.waveDone / w.waveTotal) : 0,
          remain: Math.max(0, w.waveTotal - w.waveDone),
          boss: w.phase === 'wave' && (w.toSpawn.some((s) => s.type === 'boss') || w.slimes.some((s) => s.type === 'boss')),
          score: scoreOf(w),
          left: deadline ? deadline - Date.now() : 0,
        });
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
  useEffect(() => {
    if (!reveal) return;
    const t = setTimeout(() => setReveal(null), 2600);
    return () => clearTimeout(t);
  }, [reveal]);
  useEffect(() => {
    if (!info) return;
    const t = setTimeout(() => setInfo(null), 2600);
    return () => clearTimeout(t);
  }, [info]);
  useEffect(() => {
    if (!coinPop) return;
    const t = setTimeout(() => setCoinPop(null), 1100);
    return () => clearTimeout(t);
  }, [coinPop]);

  /* ---------- ลากวางตัวละคร ---------- */
  const toWorld = (clientX: number, clientY: number) => {
    const w = world.current;
    const c = cvs.current;
    if (!w || !c) return null;
    const r = c.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
    return { x: ((clientX - r.left) / r.width) * w.lay.w, y: ((clientY - r.top) / r.height) * w.lay.h };
  };
  const spotAt = (clientX: number, clientY: number): number | null => {
    const w = world.current;
    const p = toWorld(clientX, clientY);
    if (!w || !p) return null;
    let best: number | null = null;
    let bd = DROP_R;
    w.lay.spots.forEach(([sx, sy], i) => {
      const d = Math.hypot(sx - p.x, sy + 4 - p.y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };

  const moveGhost = (x: number, y: number) => {
    const g = ghost.current;
    if (g) g.style.transform = `translate(${x}px, ${y}px)`;
  };

  const beginBagDrag = (e: React.PointerEvent, idx: number) => {
    const w = world.current;
    const u = w?.bag[idx];
    if (!w || !u || over) return;
    e.preventDefault();
    setSel(null);
    const d: DragState = { src: { from: 'bag', idx }, kind: u.kind, lv: u.lv, uid: u.uid, sx: e.clientX, sy: e.clientY, moved: false, spot: null };
    dragRef.current = d;
    setDrag({ ...d });
  };

  const onCanvasDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const w = world.current;
    if (!w || over) return;
    const i = spotAt(e.clientX, e.clientY);
    const tw = i !== null ? w.towers.find((t) => t.spot === i) : null;
    if (tw) {
      e.preventDefault();
      const d: DragState = { src: { from: 'map', uid: tw.uid }, kind: tw.kind, lv: tw.lv, uid: tw.uid, sx: e.clientX, sy: e.clientY, moved: false, spot: i };
      dragRef.current = d;
      setDrag({ ...d });
      return;
    }
    if (i !== null) {
      gsfx.tap();
      flash('ลากตัวละครจากกระเป๋ามาวางตรงนี้');
    }
    setSel(null);
  };

  // ระหว่างลาก: ฟังทั้งหน้าจอ
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 8) {
        d.moved = true;
        const w = world.current;
        if (w && d.src.from === 'map') w.lifted = d.uid;
        setDrag({ ...d });
        gsfx.pick();
      }
      if (d.moved) {
        moveGhost(e.clientX, e.clientY);
        d.spot = spotAt(e.clientX, e.clientY);
      }
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      const w = world.current;
      if (!d || !w) return;
      w.lifted = null;
      if (!d.moved) {
        if (d.src.from === 'map') {
          const tw = w.towers.find((t) => t.uid === d.uid);
          if (tw) {
            gsfx.tap();
            setSel(selRef.current === tw.spot ? null : tw.spot);
          }
        } else {
          gsfx.tap();
          setInfo(d.kind);
        }
        return;
      }
      drop(w, d, e.clientX, e.clientY);
      rerender();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!drag]);

  const levelFx = (w: World, spot: number) => {
    const [x, y] = w.lay.spots[spot];
    w.bits.push({ x, y: y - 50, vx: 0, vy: -40, life: 1.1, color: '#ffcf3f', r: 0, text: 'เลเวลอัป!' });
    for (let i = 0; i < 12; i++) w.bits.push({ x, y: y - 20, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 220, life: 0.7, color: i % 2 ? '#ffcf3f' : '#fff', r: 3.5 });
    gsfx.build();
    gsfx.sparkleish();
  };

  const drop = (w: World, d: DragState, x: number, y: number) => {
    const removeSrc = () => {
      if (d.src.from === 'bag') w.bag[d.src.idx] = null;
      else w.towers = w.towers.filter((t) => t.uid !== d.uid);
    };
    // วางลงกระเป๋า
    const slotEl = typeof document !== 'undefined' ? (document.elementFromPoint(x, y)?.closest('[data-bag]') as HTMLElement | null) : null;
    if (slotEl) {
      const j = Number(slotEl.dataset.bag);
      const there = w.bag[j];
      if (d.src.from === 'bag' && d.src.idx === j) return;
      if (there && there.kind === d.kind && there.lv === d.lv && there.lv < 3) {
        removeSrc();
        there.lv++;
        gsfx.build();
        gsfx.sparkleish();
        flash(`รวมร่าง! ${charDef(d.kind).name} เลเวล ${there.lv}`);
        return;
      }
      if (!there) {
        removeSrc();
        w.bag[j] = { uid: d.uid, kind: d.kind, lv: d.lv };
        gsfx.tap();
        return;
      }
      if (d.src.from === 'bag') {
        // สลับช่องในกระเป๋า
        w.bag[d.src.idx] = there;
        w.bag[j] = { uid: d.uid, kind: d.kind, lv: d.lv };
        gsfx.tap();
        return;
      }
      flash('ช่องนี้มีตัวละครแล้ว');
      return;
    }
    const spot = spotAt(x, y);
    if (spot === null) return;
    const there = w.towers.find((t) => t.spot === spot);
    if (there && there.uid === d.uid) return;
    if (there && there.kind === d.kind && there.lv === d.lv && there.lv < 3) {
      removeSrc();
      there.lv++;
      there.pop = 1;
      levelFx(w, spot);
      flash(`รวมร่าง! ${charDef(d.kind).name} เลเวล ${there.lv}`);
      return;
    }
    if (!there) {
      if (d.src.from === 'bag') {
        w.bag[d.src.idx] = null;
        w.towers.push({ uid: d.uid, kind: d.kind, lv: d.lv, spot, cool: 0.2, shot: 0, pop: 0.8 });
      } else {
        const tw = w.towers.find((t) => t.uid === d.uid);
        if (tw) tw.spot = spot;
      }
      gsfx.build();
      const [sx, sy] = w.lay.spots[spot];
      for (let i = 0; i < 8; i++) w.bits.push({ x: sx, y: sy + 10, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 120, life: 0.5, color: '#ffffff', r: 4 });
      return;
    }
    // สลับตำแหน่ง
    if (d.src.from === 'bag') {
      w.bag[d.src.idx] = { uid: there.uid, kind: there.kind, lv: there.lv };
      Object.assign(there, { uid: d.uid, kind: d.kind, lv: d.lv, cool: 0.2, pop: 0.8 });
    } else {
      const tw = w.towers.find((t) => t.uid === d.uid);
      if (tw) {
        there.spot = tw.spot;
        tw.spot = spot;
      }
    }
    gsfx.build();
  };

  /* ---------- สุ่มตัวละคร / อัปเกรด ---------- */
  const roll = () => {
    const w = world.current;
    if (!w || over) return;
    const free = w.bag.findIndex((b) => !b);
    if (w.coins < ROLL_COST) return flash('เหรียญไม่พอ ตอบคำถามรับเหรียญก่อนนะ'), gsfx.wrong(), setAsk(true);
    if (free < 0) return flash('กระเป๋าเต็ม ลากตัวละครไปวางก่อนนะ'), gsfx.wrong();
    w.coins -= ROLL_COST;
    const kind = rollChar(w.dry >= 4);
    w.dry = charDef(kind).rarity === 'common' ? w.dry + 1 : 0;
    w.bag[free] = newUnit(kind);
    gsfx.drum();
    setTimeout(() => (charDef(kind).rarity === 'common' ? gsfx.sparkleish() : gsfx.fanfare()), 700);
    setReveal({ kind, at: Date.now() });
    rerender();
  };

  const upgrade = () => {
    const w = world.current;
    if (!w || sel === null) return;
    const tw = w.towers.find((t) => t.spot === sel);
    if (!tw || tw.lv >= 3) return;
    const cost = upCost(tw.kind, tw.lv);
    if (w.coins < cost) return flash('เหรียญไม่พอ ตอบคำถามรับเหรียญก่อนนะ');
    w.coins -= cost;
    tw.lv++;
    tw.pop = 1;
    levelFx(w, tw.spot);
    setSel(null);
  };

  const toBag = () => {
    const w = world.current;
    if (!w || sel === null) return;
    const tw = w.towers.find((t) => t.spot === sel);
    const free = w.bag.findIndex((b) => !b);
    if (!tw) return;
    if (free < 0) return flash('กระเป๋าเต็ม');
    w.bag[free] = { uid: tw.uid, kind: tw.kind, lv: tw.lv };
    w.towers = w.towers.filter((t) => t !== tw);
    gsfx.tap();
    setSel(null);
  };

  /* ---------- ตอบคำถาม = เหรียญ ---------- */
  const onAnswered = (o: { correct: boolean; streak: number }) => {
    setStreak(o.streak);
    const w = world.current;
    if (!w || !o.correct) return;
    const n = COIN_PER_CORRECT + STREAK_BONUS * Math.min(3, Math.max(0, o.streak - 1));
    w.coins += n;
    gsfx.coin();
    setCoinPop({ n, at: Date.now() });
  };

  const w = world.current;
  const selTower = w && sel !== null ? w.towers.find((t) => t.spot === sel) : null;
  const spot = w && sel !== null ? w.lay.spots[sel] : null;
  const bag = w?.bag || [];
  const placed = w?.towers.length || 0;
  const near = hud.phase === 'wave' && hud.prog >= 0.75;

  return (
    <div className="td gm-root" ref={root} data-over={over} data-dock={ask}>
      <div className="gm-main">
        <div className="td-hud">
          <span className="cf-chip cf-cash" data-bump={coinPop ? coinPop.at : undefined} key={coinPop?.at || 0}>
            <Coin size={22} /> {hud.coins}
            {coinPop && <i className="td-coinpop">+{coinPop.n}</i>}
          </span>
          <span className="cf-chip td-hearts">
            <Heart size={18} /> {hud.hearts}/{MAX_HEARTS}
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
          <div className="td-board" data-small={!!size && size.w < 360} style={size ? { width: size.w, height: size.h } : { visibility: 'hidden' }}>
            <canvas ref={cvs} className="td-canvas" onPointerDown={onCanvasDown} aria-label="แผนที่ป้อมปราการ ลากตัวละครจากกระเป๋ามาวาง" />

            {/* ป้ายเวฟด้านบน */}
            <div className="td-wave" data-phase={hud.phase} data-near={near}>
              <span className="td-wave-no">
                <Swords className="w-4 h-4" /> เวฟ {Math.max(1, hud.phase === 'wave' || hud.phase === 'broken' ? hud.wave : hud.wave + 1)}
              </span>
              <span className="td-wave-bar">
                <i style={{ width: `${(hud.phase === 'wave' ? hud.prog : hud.phase === 'gap' ? 1 : 0) * 100}%` }} />
                <span className="td-wave-flag" data-boss={hud.boss}>
                  <Flag size={18} />
                </span>
              </span>
              <span className="td-wave-txt">
                {hud.phase === 'prep'
                  ? `เริ่มใน ${Math.ceil(hud.timer)}`
                  : hud.phase === 'gap'
                    ? `เวฟถัดไปใน ${Math.ceil(hud.timer)}`
                    : hud.phase === 'broken'
                      ? `เริ่มใหม่ใน ${Math.ceil(hud.timer)}`
                      : near
                        ? 'ใกล้จบแล้ว!'
                        : `เหลือ ${hud.remain}`}
              </span>
            </div>

            {spot && w && selTower && (
              <div className="td-pop" style={{ left: `${(spot[0] / w.lay.w) * 100}%`, top: `${(spot[1] / w.lay.h) * 100}%` }} data-up={spot[1] / w.lay.h > 0.55}>
                <div className="td-pop-who">
                  <CharIcon kind={selTower.kind} size={46} />
                  <div className="min-w-0">
                    <b>
                      {charDef(selTower.kind).name} <span className="td-lv">เลเวล {selTower.lv}</span>
                    </b>
                    <small>{charDef(selTower.kind).desc}</small>
                  </div>
                </div>
                <div className="td-pop-acts">
                  {selTower.lv < 3 ? (
                    <button type="button" className="l5g-btn l5g-btn-go l5g-btn-sm" disabled={hud.coins < upCost(selTower.kind, selTower.lv)} onClick={upgrade}>
                      <ArrowUpCircle className="w-4 h-4" /> อัปเกรด <Coin size={16} /> {upCost(selTower.kind, selTower.lv)}
                    </button>
                  ) : (
                    <span className="td-max">แรงสุดแล้ว</span>
                  )}
                  <button type="button" className="l5g-btn l5g-btn-ghost l5g-btn-sm" onClick={toBag}>
                    <Undo2 className="w-4 h-4" /> เก็บ
                  </button>
                </div>
                <small className="td-pop-tip">ลากตัวเดียวกันเลเวลเท่ากันมาทับ = รวมร่าง</small>
                <button type="button" className="td-pop-x" onClick={() => setSel(null)} aria-label="ปิด">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {banner && (
              <div className="td-banner" data-kind={banner.kind} key={banner.at}>
                {banner.text}
              </div>
            )}
            {toast && <div className="cf-hint td-toast">{toast}</div>}
            {hud.phase === 'prep' && placed === 0 && !drag && <div className="td-tip">ลากตัวละครจากกระเป๋าด้านล่าง มาวางบนวงกลม</div>}

            {reveal && (
              <button type="button" className="td-reveal" key={reveal.at} onClick={() => setReveal(null)} style={{ ['--rc' as string]: RARITY[charDef(reveal.kind).rarity].color }}>
                <span className="td-reveal-egg" aria-hidden="true">
                  <EggArt size={92} />
                </span>
                <span className="td-reveal-card">
                  <span className="td-reveal-rar">{RARITY[charDef(reveal.kind).rarity].name}</span>
                  <CharIcon kind={reveal.kind} size={96} />
                  <b>{charDef(reveal.kind).name}</b>
                  <small>{charDef(reveal.kind).desc}</small>
                  <em>ไปอยู่ในกระเป๋าแล้ว ลากไปวางได้เลย</em>
                </span>
              </button>
            )}
          </div>
        </div>

        {/* กระเป๋า + ปุ่มสุ่ม */}
        <div className="td-bagbar">
          <button type="button" className="td-roll" data-ready={hud.coins >= ROLL_COST && bag.some((b) => !b)} disabled={over} onClick={roll} title={`โอกาส: ธรรมดา ${RARITY.common.odds * 100}% หายาก ${RARITY.rare.odds * 100}% สุดยอด ${RARITY.epic.odds * 100}%`}>
            <EggArt size={40} />
            <span>
              สุ่มตัวละคร
              <small>
                <Coin size={13} /> {ROLL_COST}
              </small>
            </span>
          </button>
          <div className="td-bag" aria-label="กระเป๋าตัวละคร">
            {bag.map((u, i) => (
              <div
                key={i}
                className="td-slot"
                data-bag={i}
                data-empty={!u}
                data-drag={!!drag && drag.src.from === 'bag' && drag.src.idx === i && drag.moved}
                style={u ? { ['--rc' as string]: RARITY[charDef(u.kind).rarity].color } : undefined}
                onPointerDown={(e) => beginBagDrag(e, i)}
              >
                {u && (
                  <>
                    <CharIcon kind={u.kind} size={40} />
                    {u.lv > 1 && <span className="td-slot-lv">Lv{u.lv}</span>}
                  </>
                )}
              </div>
            ))}
          </div>
          {!ask && (
            <button type="button" className="l5g-btn l5g-btn-go td-askbtn" disabled={over} onClick={() => (gsfx.tap(), setAsk(true))}>
              <Coins className="w-6 h-6" />
              <span>
                ตอบคำถาม<small>ถูก = +{COIN_PER_CORRECT} เหรียญ</small>
              </span>
            </button>
          )}
        </div>
        {info && (
          <div className="td-info" key={info}>
            <CharIcon kind={info} size={40} />
            <div>
              <b>
                {charDef(info).name} <span style={{ color: RARITY[charDef(info).rarity].dark }}>{RARITY[charDef(info).rarity].name}</span>
              </b>
              <small>{charDef(info).desc} · ลากไปวางบนแผนที่</small>
            </div>
          </div>
        )}
      </div>

      <QuestionDock
        engine={engine}
        open={ask && !over}
        title="ตอบคำถามรับเหรียญ"
        hint={`ถูก = +${COIN_PER_CORRECT} เหรียญ ถูกติดกันได้เพิ่ม`}
        icon={<Coins className="w-5 h-5" />}
        color="#3fd6a8"
        streak={streak}
        rewardText={(o) => `ถูก! +${COIN_PER_CORRECT + STREAK_BONUS * Math.min(3, Math.max(0, o.streak - 1))} เหรียญ`}
        onAnswered={onAnswered}
        onClose={() => setAsk(false)}
      />

      {/* ตัวละครที่กำลังลาก */}
      {drag && drag.moved && (
        <div className="td-ghost" ref={ghost} style={{ transform: `translate(${drag.sx}px, ${drag.sy}px)` }}>
          <CharIcon kind={drag.kind} size={64} />
        </div>
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

export function CharIcon({ kind, size = 40 }: { kind: CharKind; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={charUri(kind)} width={size} height={size} alt={charDef(kind).name} draggable={false} className="td-char" />;
}

/** ไอคอนตัวละคร (ใช้ในการ์ดเลือกรูปแบบเกม) */
export function TowerIcon({ kind, size = 40 }: { kind: CharKind; size?: number }) {
  return <CharIcon kind={kind} size={size} />;
}

export const ALL_CHARS = CHARS;

function EggArt({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 46" width={size} height={size * 1.15} aria-hidden="true">
      <path d="M20 3 C30 3 37 18 37 28 C37 38 29 44 20 44 C11 44 3 38 3 28 C3 18 10 3 20 3 Z" fill="#fff8ec" stroke={INK} strokeWidth="2.6" />
      <circle cx="13" cy="24" r="4" fill="#ff8fc4" />
      <circle cx="26" cy="15" r="3" fill="#8fd3ff" />
      <circle cx="27" cy="31" r="4.5" fill="#ffd84a" />
      <circle cx="16" cy="36" r="2.5" fill="#7ddc86" />
      <ellipse cx="13" cy="13" rx="3" ry="5" fill="#fff" transform="rotate(25 13 13)" />
    </svg>
  );
}
