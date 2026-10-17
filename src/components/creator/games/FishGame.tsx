'use client';

import './games.css';
import './games-live.css';
import './brawl-fish.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Anchor, Fish, LogOut, Sparkles, Trophy } from 'lucide-react';
import { Avatar } from '../Avatar';
import { Clock } from './art';
import { QuestionDock } from './QuestionPad';
import { CoachArrow, DOCK_CHOICES, useCoach } from './Coach';
import { BaitIcon, FishArt, MagnetIcon, type FishId } from './fishArt';
import type { GameProps } from './types';
import { gsfx } from '@/lib/game-creator/gsound';

/* ============================== ข้อมูลปลา ============================== */

type Rarity = 'common' | 'rare' | 'epic' | 'legend';
type Zone = 1 | 2 | 3 | 4;

const RARITY: Record<Rarity, { name: string; color: string; taps: number; decay: number; time: number }> = {
  common: { name: 'ธรรมดา', color: '#7ddc86', taps: 6, decay: 0.08, time: 9 },
  rare: { name: 'หายาก', color: '#4fb3ff', taps: 9, decay: 0.1, time: 10 },
  epic: { name: 'หายากมาก', color: '#b98cff', taps: 13, decay: 0.13, time: 11 },
  legend: { name: 'ตำนาน', color: '#ffb020', taps: 18, decay: 0.16, time: 13 },
};

const FISH: { id: FishId; name: string; zone: Zone; rarity: Rarity; min: number; max: number; w: number }[] = [
  { id: 'goldfish', name: 'ปลาทอง', zone: 1, rarity: 'common', min: 1, max: 3, w: 4 },
  { id: 'clown', name: 'ปลาการ์ตูน', zone: 1, rarity: 'common', min: 1, max: 4, w: 4 },
  { id: 'tilapia', name: 'ปลานิล', zone: 1, rarity: 'common', min: 3, max: 9, w: 4 },
  { id: 'boot', name: 'รองเท้าบู๊ตเก่า', zone: 1, rarity: 'common', min: 1, max: 2, w: 1.5 },
  { id: 'puffer', name: 'ปลาปักเป้า', zone: 2, rarity: 'rare', min: 8, max: 25, w: 4 },
  { id: 'squid', name: 'หมึกน้อย', zone: 2, rarity: 'rare', min: 15, max: 40, w: 4 },
  { id: 'ray', name: 'ปลากระเบน', zone: 2, rarity: 'rare', min: 50, max: 150, w: 3 },
  { id: 'shark', name: 'ฉลามน้อย', zone: 3, rarity: 'epic', min: 200, max: 600, w: 4 },
  { id: 'turtle', name: 'เต่าทะเล', zone: 3, rarity: 'epic', min: 250, max: 700, w: 4 },
  { id: 'sword', name: 'ปลากระโทงดาบ', zone: 3, rarity: 'epic', min: 400, max: 1200, w: 3 },
  { id: 'angler', name: 'ปลาตกเบ็ดเรืองแสง', zone: 4, rarity: 'legend', min: 1500, max: 4000, w: 5 },
  { id: 'kraken', name: 'หมึกยักษ์คราเคน', zone: 4, rarity: 'legend', min: 8000, max: 25000, w: 3 },
  { id: 'whale', name: 'วาฬสีน้ำเงิน', zone: 4, rarity: 'legend', min: 20000, max: 40000, w: 1.5 },
];

const ZONES: { z: Zone; name: string; depth: string }[] = [
  { z: 1, name: 'ผิวน้ำ', depth: '5 ม.' },
  { z: 2, name: 'กลางน้ำ', depth: '40 ม.' },
  { z: 3, name: 'น้ำลึก', depth: '200 ม.' },
  { z: 4, name: 'ใต้ทะเลลึก', depth: '1,000 ม.' },
];

/** ตัวคูณความลึกตามจำนวนข้อที่ถูกติดกัน */
const DEPTH = [1, 1, 1.5, 2, 3, 4, 5];
const depthOf = (tier: number) => DEPTH[Math.max(0, Math.min(6, tier))];

/** โอกาสลงไปถึงแต่ละชั้นน้ำ ตามตัวคูณความลึก */
function rollZone(mult: number): Zone {
  const table: Record<string, number[]> = {
    '1': [70, 27, 3, 0],
    '1.5': [50, 40, 9, 1],
    '2': [30, 45, 21, 4],
    '3': [15, 35, 38, 12],
    '4': [5, 25, 45, 25],
    '5': [0, 15, 45, 40],
  };
  const t = table[String(mult)] || table['1'];
  let r = Math.random() * 100;
  for (let i = 0; i < 4; i++) {
    r -= t[i];
    if (r < 0) return (i + 1) as Zone;
  }
  return 1;
}

type ItemId = 'magnet' | 'giant' | 'bait';
const ITEMS: Record<ItemId, { name: string; desc: string }> = {
  magnet: { name: 'แม่เหล็กดูดแต้ม', desc: 'ปลาตัวถัดไปน้ำหนัก x2' },
  giant: { name: 'เหยื่อปลายักษ์', desc: 'เหวี่ยงครั้งถัดไป ลงใต้ทะเลลึกแน่นอน' },
  bait: { name: 'เหยื่อแถม', desc: 'ได้เหยื่อเพิ่ม 2 ชิ้น' },
};

interface Catch {
  kind: 'fish' | 'item';
  fish?: (typeof FISH)[number];
  item?: ItemId;
  weight: number;
  magnet: boolean;
  zone: Zone;
}

function rollCatch(zone: Zone): Catch {
  if (Math.random() < 0.09) {
    const r = Math.random();
    return { kind: 'item', item: r < 0.4 ? 'magnet' : r < 0.7 ? 'giant' : 'bait', weight: 0, magnet: false, zone };
  }
  const pool = FISH.filter((f) => f.zone === zone);
  let r = Math.random() * pool.reduce((a, f) => a + f.w, 0);
  let fish = pool[0];
  for (const f of pool) {
    r -= f.w;
    if (r < 0) {
      fish = f;
      break;
    }
  }
  const weight = Math.round(fish.min + (fish.max - fish.min) * Math.pow(Math.random(), 1.6));
  return { kind: 'fish', fish, weight, magnet: false, zone };
}

const CATCH_LOCK_MS = 1500;

type Phase = 'idle' | 'cast' | 'sink' | 'wait' | 'bite' | 'reel' | 'catch';

function fmtClock(ms: number) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}
const lb = (n: number) => n.toLocaleString('th-TH');

/* ============================== ตัวเกม ============================== */

export function FishGame({ engine, deadline, sync, me, preview, onLeave }: GameProps) {
  const scene = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPolylineElement>(null);
  const hookRef = useRef<SVGGElement>(null);
  const bobRef = useRef<SVGGElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: 600, h: 420 });
  const dimRef = useRef(dim);
  dimRef.current = dim;

  const [baits, setBaits] = useState<number[]>([]);
  const [total, setTotal] = useState(0);
  const [caught, setCaught] = useState(0);
  const [best, setBest] = useState<{ name: string; weight: number } | null>(null);
  const [magnet, setMagnet] = useState(0);
  const [giant, setGiant] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [catchRes, setCatchRes] = useState<Catch | null>(null);
  // ได้ปลาแล้วแตะจอไม่ได้ 1.5 วินาที (กันแตะรัวๆ จนการ์ดปลาหายก่อนมองทัน)
  const [lock, setLock] = useState(false);
  const [reel, setReel] = useState(0);
  const [reelLeft, setReelLeft] = useState(0);
  const [splash, setSplash] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'ok' | 'bad' | 'wave'; at: number } | null>(null);
  const [ask, setAsk] = useState(true);
  const [streak, setStreak] = useState(0);
  const [over, setOver] = useState(false);
  const [now, setNow] = useState(Date.now());

  // สถานะการตกปลาที่ใช้ในวงจรแอนิเมชัน
  const cur = useRef({ phase: 'idle' as Phase, t0: 0, tx: 0.65, zone: 1 as Zone, wait: 1.5, fish: null as Catch | null, prog: 0, until: 0, tier: 1, lastTap: 0 });
  const totalRef = useRef(0);
  const synced = useRef(-1);
  const say = (text: string, kind: 'ok' | 'bad' | 'wave') => setBanner({ text, kind, at: Date.now() });
  const rootRef = useRef<HTMLDivElement>(null);
  // สอนเล่น: ตอบถูกได้เหยื่อ -> เหวี่ยงเบ็ด -> แตะรัวๆ ดึงปลา (2 รอบ)
  const coach = useCoach(
    [
      { id: 'answer', target: [...DOCK_CHOICES, '.fs-askbtn'], text: 'เลือกตัวเลือก ตอบถูกได้เหยื่อ 1 ชิ้น', texts: ['เลือกตัวเลือก ตอบถูกได้เหยื่อ 1 ชิ้น', 'เลือกตัวเลือก ตอบถูกได้เหยื่อ 1 ชิ้น', 'กดตรงนี้ แล้วตอบคำถามเพื่อรับเหยื่อ'], doneIf: () => baits.length > 0, when: () => phase === 'idle' },
      { id: 'cast', target: '.fs-castbtn', text: 'มีเหยื่อแล้ว กดเหวี่ยงเบ็ด!', doneIf: () => phase !== 'idle' && phase !== 'catch', when: () => phase === 'idle' },
      { id: 'reel', target: ['.fs-bite', '.fs-reel-btn'], text: 'ปลากินเบ็ด! แตะรัวๆ ดึงขึ้นมา', when: () => phase === 'bite' || phase === 'reel' },
    ],
    { loops: 2, active: !over }
  );
  const coachHit = useRef(coach.hit);
  coachHit.current = coach.hit;

  const doSync = useCallback(
    (force = false) => {
      if (!sync) return;
      if (!force && totalRef.current === synced.current) return;
      synced.current = totalRef.current;
      sync(totalRef.current, { fish: caught, best: best?.weight || 0 });
    },
    [sync, caught, best]
  );
  const syncRef = useRef(doSync);
  syncRef.current = doSync;

  // ขนาดฉาก
  useEffect(() => {
    const el = scene.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      setDim({ w: Math.max(200, r.width), h: Math.max(220, r.height) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- ตำแหน่งในฉาก (px) ---------- */
  const geo = useMemo(() => {
    const { w, h } = dim;
    const S = h * 0.3;
    const A = Math.max(54, Math.min(110, h * 0.17));
    const pierW = Math.max(A * 1.9, w * 0.24);
    const P = S - h * 0.04;
    const fx = Math.max(A * 0.62, pierW * 0.42);
    const hand = { x: fx + A * 0.36, y: P - A * 0.34 };
    const tip = { x: hand.x + A * 1.05, y: P - A * 1.45 };
    const depthY = (z: Zone) => S + (h - S) * [0, 0.2, 0.44, 0.67, 0.88][z];
    return { S, A, pierW, P, fx, hand, tip, depthY, w, h };
  }, [dim]);
  const geoRef = useRef(geo);
  geoRef.current = geo;

  /* ---------- วงจรแอนิเมชันเบ็ด ---------- */
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const g = geoRef.current;
      const c = cur.current;
      const t = (performance.now() - c.t0) / 1000;
      const tx = g.w * c.tx;
      let hx = g.tip.x;
      let hy = g.tip.y + 34;
      let bx = tx;
      let by = g.S;
      let inWater = false;
      const dy = c.zone ? g.depthY(c.zone) : g.S;
      if (c.phase === 'cast') {
        const p = Math.min(1, t / 0.6);
        // โค้งพาราโบลาจากปลายคันไปจุดตกน้ำ
        hx = g.tip.x + (tx - g.tip.x) * p;
        hy = g.tip.y + (g.S - g.tip.y) * p - Math.sin(p * Math.PI) * g.h * 0.16;
        bx = hx;
        by = hy;
      } else if (c.phase === 'sink') {
        const dur = 0.7 + c.zone * 0.35;
        const p = Math.min(1, t / dur);
        hx = tx;
        hy = g.S + (dy - g.S) * (1 - Math.pow(1 - p, 2));
        inWater = true;
      } else if (c.phase === 'wait') {
        hx = tx + Math.sin(t * 2) * 3;
        hy = dy + Math.sin(t * 3) * 3;
        inWater = true;
        by = g.S + Math.sin(t * 3) * 1.5;
      } else if (c.phase === 'bite') {
        hx = tx + Math.sin(t * 30) * 4;
        hy = dy + Math.sin(t * 24) * 4;
        inWater = true;
        by = g.S + 6 + Math.sin(t * 20) * 5;
      } else if (c.phase === 'reel') {
        hx = tx + Math.sin(t * 26) * 5;
        hy = dy - (dy - g.S) * c.prog + Math.sin(t * 19) * 3;
        inWater = true;
        by = g.S + 4 + Math.sin(t * 18) * 4;
      }
      const line = lineRef.current;
      if (line) {
        const pts = inWater ? `${g.tip.x},${g.tip.y} ${bx},${by} ${hx},${hy}` : `${g.tip.x},${g.tip.y} ${hx},${hy}`;
        line.setAttribute('points', pts);
      }
      if (hookRef.current) hookRef.current.setAttribute('transform', `translate(${hx} ${hy})`);
      if (bobRef.current) {
        bobRef.current.setAttribute('transform', `translate(${bx} ${by})`);
        bobRef.current.style.opacity = inWater ? '1' : '0';
      }
      const sh = shadowRef.current;
      if (sh) {
        const show = c.phase === 'wait' || c.phase === 'bite' || c.phase === 'reel';
        sh.style.opacity = show ? (c.phase === 'wait' ? String(Math.min(0.5, t * 0.2)) : '0.75') : '0';
        const off = c.phase === 'wait' ? Math.max(0, 140 - t * 60) : 0;
        sh.style.transform = `translate(${hx + 6 + off}px, ${hy - 14}px)`;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const setP = (p: Phase) => {
    cur.current.phase = p;
    cur.current.t0 = performance.now();
    setPhase(p);
  };

  /* ---------- ลำดับการตกปลา ---------- */
  useEffect(() => {
    const c = cur.current;
    if (phase === 'cast') {
      const t = setTimeout(() => {
        gsfx.plop();
        setSplash(Date.now());
        setP('sink');
      }, 600);
      return () => clearTimeout(t);
    }
    if (phase === 'sink') {
      const t = setTimeout(() => setP('wait'), (0.7 + c.zone * 0.35) * 1000);
      return () => clearTimeout(t);
    }
    if (phase === 'wait') {
      const t = setTimeout(() => {
        gsfx.bite();
        setP('bite');
      }, c.wait * 1000);
      return () => clearTimeout(t);
    }
    if (phase === 'bite') {
      // ไม่แตะเลย: เริ่มดึงให้เอง
      const t = setTimeout(() => startReel(), 5000);
      return () => clearTimeout(t);
    }
    if (phase === 'reel') {
      const iv = setInterval(() => {
        const fish = c.fish!;
        const rar = fish.kind === 'item' ? RARITY.rare : RARITY[fish.fish!.rarity];
        c.prog = Math.max(0, c.prog - rar.decay * 0.1);
        setReel(c.prog);
        const left = c.until - Date.now();
        setReelLeft(Math.max(0, left));
        if (left <= 0) {
          // ปลาหลุด: คืนเหยื่อ ไม่เสียอะไร
          clearInterval(iv);
          setBaits((b) => [...b, c.tier]);
          coachHit.current('reel');
          gsfx.sad();
          say('ปลาหลุด! ได้เหยื่อคืน', 'bad');
          setP('idle');
        }
      }, 100);
      return () => clearInterval(iv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startReel = () => {
    const c = cur.current;
    if (c.phase !== 'bite') return;
    const fish = c.fish!;
    const rar = fish.kind === 'item' ? RARITY.rare : RARITY[fish.fish!.rarity];
    c.prog = 0.06;
    c.until = Date.now() + rar.time * 1000;
    setReel(c.prog);
    setReelLeft(rar.time * 1000);
    setP('reel');
  };

  const land = () => {
    const c = cur.current;
    const res = { ...c.fish! };
    if (res.kind === 'fish' && magnet > 0) {
      res.weight *= 2;
      res.magnet = true;
      setMagnet((m) => m - 1);
    }
    if (res.kind === 'item') {
      if (res.item === 'magnet') setMagnet((m) => m + 1);
      if (res.item === 'giant') setGiant((g) => g + 1);
      if (res.item === 'bait') setBaits((b) => [...b, c.tier, c.tier]);
      gsfx.sparkleish();
      gsfx.coin();
    } else {
      totalRef.current += res.weight;
      setTotal(totalRef.current);
      setCaught((n) => n + 1);
      setBest((b) => (!b || res.weight > b.weight ? { name: res.fish!.name, weight: res.weight } : b));
      if (res.fish!.rarity === 'legend') gsfx.fanfare();
      else if (res.fish!.rarity === 'epic') gsfx.reveal(2);
      else gsfx.cash();
    }
    setSplash(Date.now());
    setCatchRes(res);
    setLock(true);
    coachHit.current('reel');
    setP('catch');
  };

  const tapReel = () => {
    const c = cur.current;
    if (over) return;
    if (c.phase === 'bite') {
      startReel();
      return;
    }
    if (c.phase !== 'reel') return;
    const fish = c.fish!;
    const rar = fish.kind === 'item' ? RARITY.rare : RARITY[fish.fish!.rarity];
    c.prog = Math.min(1, c.prog + 1 / rar.taps);
    setReel(c.prog);
    gsfx.reel();
    if (c.prog >= 1) land();
  };

  // ปิดการ์ดปลาที่ได้
  useEffect(() => {
    if (phase !== 'catch') return;
    const lt = setTimeout(() => setLock(false), CATCH_LOCK_MS);
    const t = setTimeout(() => {
      setCatchRes(null);
      setP('idle');
    }, catchRes?.fish?.rarity === 'legend' ? 3400 : 2400);
    return () => (clearTimeout(t), clearTimeout(lt));
  }, [phase, catchRes]);

  const cast = () => {
    const c = cur.current;
    if (over || c.phase !== 'idle' || !baits.length) return;
    // ใช้เหยื่อที่ลึกที่สุดก่อน
    const sorted = baits.slice().sort((a, b) => a - b);
    const tier = sorted.pop()!;
    setBaits(sorted);
    const useGiant = giant > 0;
    if (useGiant) setGiant((g) => g - 1);
    const zone = useGiant ? 4 : rollZone(depthOf(tier));
    c.tier = tier;
    c.zone = zone;
    c.tx = 0.5 + Math.random() * 0.36;
    c.wait = 0.8 + Math.random() * 1.6;
    c.fish = rollCatch(zone);
    c.prog = 0;
    gsfx.cast();
    if (zone >= 3) say(zone === 4 ? 'ลงไปถึงใต้ทะเลลึก!' : 'ลงไปถึงน้ำลึก!', 'wave');
    setP('cast');
  };

  // ปุ่มเว้นวรรค = เหวี่ยง/ดึง
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'BUTTON')) return;
      if (e.code !== 'Space') return;
      e.preventDefault();
      if (cur.current.phase === 'idle') cast();
      else tapReel();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  /* ---------- ตอบคำถาม = เหยื่อ ---------- */
  const onAnswered = (o: { correct: boolean; streak: number }) => {
    setStreak(o.streak);
    if (!o.correct) return;
    const tier = Math.min(6, Math.max(1, o.streak));
    setBaits((b) => [...b, tier]);
    gsfx.coin();
  };

  /* ---------- เวลา ---------- */
  useEffect(() => {
    if (over) return;
    const iv = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (deadline && n >= deadline) {
        setOver(true);
        syncRef.current(true);
        gsfx.fanfare();
      }
    }, 250);
    const sv = setInterval(() => syncRef.current(), 4000);
    return () => {
      clearInterval(iv);
      clearInterval(sv);
    };
  }, [over, deadline]);
  useEffect(() => () => syncRef.current(true), []);
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 1800);
    return () => clearTimeout(t);
  }, [banner]);

  const left = deadline ? deadline - now : 0;
  const nextMult = depthOf(Math.min(6, streak + 1));
  const busy = phase !== 'idle';
  const baitsSorted = baits.slice().sort((a, b) => b - a);
  const g = geo;
  const res = catchRes;
  const resRar = res?.kind === 'fish' ? RARITY[res.fish!.rarity] : null;
  const myLook = me.gear ? { ...me.gear, i: 0 } : null;

  return (
    <div className="fs gm-root" ref={rootRef} data-over={over} data-dock={ask} data-lock={lock}>
      <CoachArrow coach={coach} root={rootRef} />
      <div className="gm-main">
        <div className="fs-hud">
          <span className="cf-chip fs-total" key={total}>
            <Fish className="w-5 h-5" /> {lb(total)} <small>ปอนด์</small>
          </span>
          <span className="cf-chip fs-baits" title="เหยื่อที่มี">
            <BaitIcon tier={baitsSorted[0] || 1} size={20} /> x{baits.length}
          </span>
          <span className="cf-chip fs-depth" data-hot={nextMult >= 2} title="ตอบถูกติดกัน ตัวคูณความลึกของเหยื่อชิ้นถัดไปจะสูงขึ้น">
            <Anchor className="w-4 h-4" /> ลึก x{nextMult}
          </span>
          {magnet > 0 && (
            <span className="cf-chip fs-item">
              <MagnetIcon size={18} /> x2 {magnet > 1 ? `(${magnet})` : ''}
            </span>
          )}
          {giant > 0 && (
            <span className="cf-chip fs-item fs-item-giant">
              <Sparkles className="w-4 h-4" /> ปลายักษ์ {giant > 1 ? `(${giant})` : ''}
            </span>
          )}
          <span className="flex-1" />
          {deadline && (
            <span className="cf-chip cf-time" data-urgent={left < 30000}>
              <Clock size={18} /> {fmtClock(left)}
            </span>
          )}
        </div>

        <div className="fs-scene" ref={scene} data-phase={phase} onPointerDown={() => (phase === 'bite' || phase === 'reel' ? tapReel() : null)}>
          {/* ท้องฟ้า */}
          <div className="fs-sky" style={{ height: g.S }}>
            <span className="fs-sun" />
            <span className="fs-cloud" style={{ top: '18%', animationDuration: '46s' }} />
            <span className="fs-cloud fs-cloud-s" style={{ top: '42%', animationDuration: '64s', animationDelay: '-30s' }} />
          </div>
          {/* น้ำ 4 ชั้น */}
          <div className="fs-water" style={{ top: g.S }}>
            {ZONES.map((z, i) => (
              <div key={z.z} className="fs-zone" data-z={z.z} data-hit={res?.zone === z.z && phase === 'catch'}>
                <span className="fs-zone-label">
                  {z.name} <small>{z.depth}</small>
                </span>
                {[0, 1].map((k) => {
                  const pool = FISH.filter((f) => f.zone === z.z && f.id !== 'boot');
                  const f = pool[(i + k * 2) % pool.length];
                  return (
                    <span key={k} className="fs-amb" data-dir={k ? 'l' : 'r'} style={{ top: `${28 + k * 34}%`, animationDuration: `${16 + i * 5 + k * 7}s`, animationDelay: `${-k * 9 - i * 3}s` }}>
                      <FishArt id={f.id} size={[34, 44, 58, 70][i]} glow={f.id === 'angler'} />
                    </span>
                  );
                })}
              </div>
            ))}
            <span className="fs-wave" aria-hidden="true" />
          </div>

          {/* ท่าเรือ + ผู้เล่น */}
          <div className="fs-pier" style={{ width: g.pierW, top: g.P }}>
            <span className="fs-post" style={{ left: '22%' }} />
            <span className="fs-post" style={{ left: '78%' }} />
          </div>
          <div className="fs-fisher" style={{ left: g.fx - g.A / 2, top: g.P - g.A + 6, width: g.A, height: g.A }} data-pull={phase === 'reel'}>
            <Avatar id={me.avatar} gear={myLook} size={g.A} mood={phase === 'catch' ? 'wow' : 'happy'} />
          </div>

          {/* คันเบ็ด + สาย + ตะขอ */}
          <svg className="fs-rig" width={g.w} height={g.h} viewBox={`0 0 ${g.w} ${g.h}`} aria-hidden="true">
            <path d={`M${g.hand.x} ${g.hand.y} Q${(g.hand.x + g.tip.x) / 2 - 6} ${(g.hand.y + g.tip.y) / 2 - (phase === 'reel' ? 22 : 8)} ${g.tip.x} ${g.tip.y}`} fill="none" stroke="#7d5536" strokeWidth="5" strokeLinecap="round" />
            <circle cx={g.hand.x + 6} cy={g.hand.y - 6} r="6" fill="#a9b3c9" stroke="#2a2350" strokeWidth="2" />
            <polyline ref={lineRef} fill="none" stroke="#fff" strokeWidth="1.6" strokeOpacity="0.9" />
            <g ref={bobRef}>
              <circle r="6" fill="#ff6b7a" stroke="#2a2350" strokeWidth="2" />
              <path d="M-6 0 A6 6 0 0 0 6 0 Z" fill="#fff" />
            </g>
            <g ref={hookRef}>
              <path d="M0 -6 L0 4 Q0 9 4 9 Q7 9 7 5" fill="none" stroke="#2a2350" strokeWidth="2.4" strokeLinecap="round" />
              <circle cy="-6" r="2.2" fill="#ff9ec4" stroke="#2a2350" strokeWidth="1.4" />
            </g>
          </svg>
          <div className="fs-shadow" ref={shadowRef} aria-hidden="true">
            <FishArt id={cur.current.fish?.fish?.id || 'tilapia'} size={cur.current.zone >= 4 ? 96 : cur.current.zone >= 3 ? 76 : 56} />
          </div>
          {splash > 0 && <span className="fs-splash" key={splash} style={{ left: g.w * cur.current.tx, top: g.S }} aria-hidden="true" />}

          {/* ปลากินเบ็ด / ดึง */}
          {phase === 'bite' && (
            <button type="button" className="fs-bite" onPointerDown={(e) => (e.stopPropagation(), tapReel())}>
              ปลากินเบ็ด! แตะเพื่อดึง
            </button>
          )}
          {phase === 'reel' && (
            <div className="fs-reel">
              <span className="fs-reel-bar">
                <i style={{ width: `${reel * 100}%` }} />
              </span>
              <span className="fs-reel-time">{Math.ceil(reelLeft / 1000)}</span>
              <button type="button" className="fs-reel-btn" onPointerDown={(e) => (e.stopPropagation(), tapReel())}>
                ดึง! ดึง!
                <small>แตะรัวๆ</small>
              </button>
            </div>
          )}
          {phase === 'idle' && !over && baits.length === 0 && <div className="cf-hint fs-tip">ตอบคำถามให้ถูก เพื่อรับเหยื่อ</div>}

          {banner && (
            <div className="td-banner" data-kind={banner.kind} key={banner.at}>
              {banner.text}
            </div>
          )}

          {/* ได้ปลา! */}
          {phase === 'catch' && res && (
            <button type="button" className="fs-got" style={{ ['--rc' as string]: resRar?.color || '#ffd84a' }} onClick={() => {
              if (lock) return;
              setCatchRes(null);
              setP('idle');
            }}>
              <span className="fs-got-rays" aria-hidden="true" />
              <span className="fs-got-card">
                {res.kind === 'fish' ? (
                  <>
                    <span className="fs-got-rar">{resRar!.name}</span>
                    <span className="fs-got-art">
                      <FishArt id={res.fish!.id} size={150} glow />
                    </span>
                    <b>{res.fish!.name}</b>
                    <span className="fs-got-w">
                      {lb(res.weight)} <small>ปอนด์</small>
                    </span>
                    {res.magnet && (
                      <em>
                        <MagnetIcon size={16} /> แม่เหล็ก x2
                      </em>
                    )}
                  </>
                ) : (
                  <>
                    <span className="fs-got-rar">หีบสมบัติ</span>
                    <span className="fs-got-art">
                      <FishArt id="chest" size={120} glow />
                    </span>
                    <b>{ITEMS[res.item!].name}</b>
                    <small className="fs-got-desc">{ITEMS[res.item!].desc}</small>
                  </>
                )}
              </span>
            </button>
          )}
        </div>

        <div className="fs-bar">
          {!ask && (
            <button type="button" className="l5g-btn l5g-btn-go l5g-btn-xl fs-askbtn" disabled={over} onClick={() => (gsfx.tap(), setAsk(true))}>
              <BaitIcon tier={3} size={26} />
              <span>
                หาเหยื่อ<small>ตอบถูก = ได้เหยื่อ</small>
              </span>
            </button>
          )}
          <button type="button" className="l5g-btn l5g-btn-blue l5g-btn-xl fs-castbtn" data-ready={!busy && baits.length > 0} disabled={over || busy || baits.length === 0} onClick={cast}>
            <Anchor className="w-6 h-6" />
            <span>
              เหวี่ยงเบ็ด<small>{baits.length ? `มีเหยื่อ ${baits.length} ชิ้น` : 'ยังไม่มีเหยื่อ'}</small>
            </span>
          </button>
          {best && (
            <span className="fs-best">
              <Trophy className="w-4 h-4" /> ตัวใหญ่สุด {best.name} {lb(best.weight)} ปอนด์
            </span>
          )}
        </div>
      </div>

      <QuestionDock
        engine={engine}
        open={ask && !over}
        title="หาเหยื่อตกปลา"
        hint="ตอบถูก = ได้เหยื่อ ถูกติดกันเหยื่อยิ่งลึก"
        icon={<Fish className="w-5 h-5" />}
        color="#29b6d8"
        streak={streak}
        rewardText={(o) => `ถูก! ได้เหยื่อ ลึก x${depthOf(Math.min(6, Math.max(1, o.streak)))}`}
        onAnswered={onAnswered}
        onClose={() => setAsk(false)}
      />

      {over && (
        <div className="gm-over">
          <div className="gm-over-card">
            <p className="gm-over-tag">หมดเวลา!</p>
            <div className="gm-over-big">{lb(total)}</div>
            <p className="font-bold">น้ำหนักปลารวม (ปอนด์)</p>
            <div className="gm-over-stats">
              <span>
                <b>{caught}</b>ปลาที่ได้
              </span>
              <span>
                <b>{best ? lb(best.weight) : 0}</b>ตัวใหญ่สุด
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
