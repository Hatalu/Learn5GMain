'use client';

import './games.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpCircle, PackagePlus, Store, X } from 'lucide-react';
import { Avatar, CRITTERS } from '../Avatar';
import { Coin, Clock, Food, type FoodId } from './art';
import { QuizBatch } from './QuestionPad';
import type { GameProps } from './types';
import { gsfx } from '@/lib/game-creator/gsound';

/* ------------------------------ ข้อมูลร้าน ------------------------------ */

const FOODS: { id: FoodId; name: string; unlock: number }[] = [
  { id: 'bread', name: 'ขนมปัง', unlock: 0 },
  { id: 'milk', name: 'นม', unlock: 0 },
  { id: 'cake', name: 'เค้ก', unlock: 0 },
  { id: 'donut', name: 'โดนัท', unlock: 1 },
  { id: 'juice', name: 'น้ำส้ม', unlock: 2 },
];

type UpId = 'oven' | 'menu' | 'shelf' | 'decor' | 'staff';
const UPGRADES: { id: UpId; name: string; desc: (lv: number) => string; costs: number[] }[] = [
  { id: 'oven', name: 'เตาอบเทอร์โบ', desc: (l) => `ทำอาหารเร็วขึ้น (${(PREP[Math.min(l + 1, 3)] / 1000).toFixed(1)} วิ)`, costs: [60, 140, 260] },
  { id: 'menu', name: 'เมนูพรีเมียม', desc: (l) => (l === 0 ? 'ขายแพงขึ้น + เมนูโดนัท' : l === 1 ? 'ขายแพงขึ้น + เมนูน้ำส้ม' : 'ขายแพงขึ้นอีก'), costs: [80, 180, 320] },
  { id: 'shelf', name: 'ชั้นวางใหญ่', desc: (l) => `ตอบถูก 1 ข้อ ได้ของ ${4 + l} ชิ้น`, costs: [70, 160, 300] },
  { id: 'decor', name: 'ตกแต่งร้าน', desc: () => 'ลูกค้ารอนานขึ้น ให้ทิปมากขึ้น', costs: [50, 120, 240] },
  { id: 'staff', name: 'ผู้ช่วยเชฟ', desc: (l) => `ทำพร้อมกันได้ ${l + 2} จาน`, costs: [100, 220] },
];

const PREP = [2200, 1600, 1100, 700];

interface Customer {
  id: number;
  avatar: number;
  food: FoodId;
  slot: number;
  patience: number; // ms ที่เหลือ
  patienceMax: number;
  state: 'enter' | 'wait' | 'cook' | 'happy' | 'angry';
  cook: number; // ms ที่เหลือ
  stateAt: number;
  pay?: number;
  shake?: number;
}

interface Shop {
  cash: number;
  earned: number;
  served: number;
  lost: number;
  stock: Record<FoodId, number>;
  up: Record<UpId, number>;
  customers: Customer[];
  nextSpawn: number;
  seq: number;
}

const fresh = (): Shop => ({
  cash: 0,
  earned: 0,
  served: 0,
  lost: 0,
  stock: { bread: 2, milk: 2, cake: 2, donut: 0, juice: 0 },
  up: { oven: 0, menu: 0, shelf: 0, decor: 0, staff: 0 },
  customers: [],
  nextSpawn: 1200,
  seq: 1,
});

const unlocked = (sh: Shop) => FOODS.filter((f) => f.unlock <= sh.up.menu);
const price = (sh: Shop) => 10 + sh.up.menu * 6;
const tipOf = (sh: Shop) => 4 + sh.up.decor * 3;
const patienceOf = (sh: Shop) => 26000 + sh.up.decor * 6000;
const maxCustomers = (sh: Shop) => 3 + (sh.up.decor >= 2 ? 1 : 0);
const spawnEvery = (sh: Shop) => 4600 - sh.up.decor * 450;
const kitchens = (sh: Shop) => 1 + sh.up.staff;
const unitsPerCorrect = (sh: Shop) => 3 + sh.up.shelf;

function fmtClock(ms: number) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/** เลือกวัตถุดิบที่ร้านต้องการที่สุดตอนนี้ (มีคนสั่งแต่ของน้อย) */
function neededFood(sh: Shop): FoodId {
  const foods = unlocked(sh);
  let best = foods[0].id;
  let bestScore = -Infinity;
  foods.forEach((f) => {
    const demand = sh.customers.filter((c) => c.food === f.id && (c.state === 'wait' || c.state === 'enter')).length;
    const score = demand * 3 - sh.stock[f.id] + Math.random() * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = f.id;
    }
  });
  return best;
}

export function CafeGame({ engine, deadline, sync, me, preview }: GameProps) {
  const sh = useRef<Shop>(fresh());
  const [, setTick] = useState(0);
  const [restock, setRestock] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [pops, setPops] = useState<{ id: number; slot: number; text: string; kind: 'cash' | 'stock' }[]>([]);
  const [hint, setHint] = useState('');
  const [over, setOver] = useState(false);
  const [now, setNow] = useState(Date.now());
  const lastReward = useRef('');
  const restockRef = useRef(false);
  restockRef.current = restock;
  const synced = useRef(-1);
  const popSeq = useRef(1);
  const avatars = useMemo(() => CRITTERS.map((_, i) => i).filter((i) => i !== me.avatar), [me.avatar]);

  const render = () => setTick((t) => t + 1);
  const pop = (slot: number, text: string, kind: 'cash' | 'stock') => {
    const id = popSeq.current++;
    setPops((p) => [...p.slice(-6), { id, slot, text, kind }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1300);
  };

  const doSync = useCallback(
    (force = false) => {
      const s = sh.current;
      if (!sync || (!force && s.earned === synced.current)) return;
      synced.current = s.earned;
      sync(s.earned, { served: s.served, lost: s.lost });
    },
    [sync]
  );

  /* ---------- วงจรเกม ---------- */
  useEffect(() => {
    if (over) return;
    let last = performance.now();
    const iv = setInterval(() => {
      const t = performance.now();
      const dt = Math.min(250, t - last);
      last = t;
      const s = sh.current;
      const nowMs = Date.now();
      setNow(nowMs);
      if (deadline && nowMs >= deadline) {
        setOver(true);
        doSync(true);
        gsfx.fanfare();
        return;
      }
      // ลูกค้ารอช้าลงตอนกำลังเติมของ (ให้เวลาคิด)
      const drain = restockRef.current ? 0.35 : 1;
      s.customers.forEach((c) => {
        if (c.state === 'enter' && nowMs - c.stateAt > 600) c.state = 'wait';
        if (c.state === 'wait') {
          c.patience -= dt * drain;
          if (c.patience <= 0) {
            c.state = 'angry';
            c.stateAt = nowMs;
            s.lost++;
            gsfx.sad();
          }
        } else if (c.state === 'cook') {
          c.cook -= dt;
          if (c.cook <= 0) {
            const tip = c.patience / c.patienceMax > 0.5 ? tipOf(s) : 0;
            const pay = price(s) + tip;
            c.pay = pay;
            c.state = 'happy';
            c.stateAt = nowMs;
            s.cash += pay;
            s.earned += pay;
            s.served++;
            gsfx.cash();
            pop(c.slot, `+${pay}${tip ? ' ทิป!' : ''}`, 'cash');
          }
        }
      });
      s.customers = s.customers.filter((c) => !((c.state === 'happy' || c.state === 'angry') && nowMs - c.stateAt > 1300));
      // ลูกค้าใหม่
      s.nextSpawn -= dt;
      if (s.nextSpawn <= 0 && s.customers.length < maxCustomers(s)) {
        const used = new Set(s.customers.map((c) => c.slot));
        const free = Array.from({ length: maxCustomers(s) }, (_, i) => i).filter((i) => !used.has(i));
        const slot = free[Math.floor(Math.random() * free.length)];
        const foods = unlocked(s);
        s.customers.push({
          id: s.seq++,
          avatar: avatars[Math.floor(Math.random() * avatars.length)],
          food: foods[Math.floor(Math.random() * foods.length)].id,
          slot,
          patience: patienceOf(s),
          patienceMax: patienceOf(s),
          state: 'enter',
          cook: 0,
          stateAt: nowMs,
        });
        s.nextSpawn = spawnEvery(s) * (0.8 + Math.random() * 0.5);
        gsfx.door();
      } else if (s.nextSpawn <= 0) s.nextSpawn = 800;
      render();
    }, 100);
    const sv = setInterval(() => doSync(), 4000);
    return () => {
      clearInterval(iv);
      clearInterval(sv);
    };
  }, [over, deadline, avatars, doSync]);

  useEffect(() => () => doSync(true), [doSync]);

  /* ---------- การกระทำ ---------- */
  const serve = (c: Customer) => {
    const s = sh.current;
    if (over || c.state !== 'wait') return;
    if (s.stock[c.food] <= 0) {
      c.shake = Date.now();
      setHint(`${FOODS.find((f) => f.id === c.food)!.name}หมด! กด เติมของ`);
      setTimeout(() => setHint(''), 1800);
      gsfx.wrong();
      render();
      return;
    }
    if (s.customers.filter((x) => x.state === 'cook').length >= kitchens(s)) {
      setHint('เตาไม่ว่าง รอจานก่อนหน้าเสร็จนะ');
      setTimeout(() => setHint(''), 1500);
      gsfx.tap();
      return;
    }
    s.stock[c.food]--;
    c.state = 'cook';
    c.cook = PREP[s.up.oven];
    c.stateAt = Date.now();
    gsfx.cook();
    render();
  };

  const buy = (id: UpId) => {
    const s = sh.current;
    const up = UPGRADES.find((u) => u.id === id)!;
    const lv = s.up[id];
    const cost = up.costs[lv];
    if (cost === undefined || s.cash < cost) return;
    s.cash -= cost;
    s.up[id] = lv + 1;
    gsfx.build();
    gsfx.sparkleish();
    render();
  };

  const s = sh.current;
  const left = deadline ? deadline - now : 0;
  const foods = unlocked(s);
  const cooking = s.customers.filter((c) => c.state === 'cook').length;
  const canBuy = UPGRADES.some((u) => u.costs[s.up[u.id]] !== undefined && s.cash >= u.costs[s.up[u.id]]);

  return (
    <div className="cf" data-over={over}>
      {/* HUD */}
      <div className="cf-hud">
        <span className="cf-chip cf-cash">
          <Coin size={22} /> {s.cash.toLocaleString('th-TH')}
        </span>
        <span className="cf-chip cf-earned">
          รายได้รวม <b>{s.earned.toLocaleString('th-TH')}</b>
        </span>
        <span className="flex-1" />
        {deadline && (
          <span className="cf-chip cf-time" data-urgent={left < 30000}>
            <Clock size={18} /> {fmtClock(left)}
          </span>
        )}
      </div>

      {/* ฉากร้าน */}
      <div className="cf-scene">
        <div className="cf-wall">
          <div className="cf-sign">
            <Store className="w-4 h-4" /> Café {me.nickname}
          </div>
          <div className="cf-window" aria-hidden="true">
            <span />
            <span />
          </div>
          {s.up.decor >= 1 && <span className="cf-plant" aria-hidden="true" />}
          {s.up.decor >= 2 && <span className="cf-lamp" aria-hidden="true" />}
          <div className="cf-menu">
            <b>เมนูวันนี้</b>
            {foods.map((f) => (
              <span key={f.id}>
                <Food id={f.id} size={20} />
                {f.name}
                <i>{price(s)}</i>
              </span>
            ))}
          </div>
          <div className="cf-shelf">
            {foods.map((f) => (
              <span key={f.id} className="cf-shelf-item" data-empty={s.stock[f.id] <= 0}>
                <Food id={f.id} size={44} />
                <b>{s.stock[f.id]}</b>
              </span>
            ))}
          </div>
        </div>

        <div className="cf-floor">
          <div className="cf-queue" style={{ ['--n' as string]: maxCustomers(s) }}>
            {Array.from({ length: maxCustomers(s) }).map((_, slot) => {
              const c = s.customers.find((x) => x.slot === slot);
              return (
                <div key={slot} className="cf-spot">
                  {c && (
                    <button
                      key={c.id}
                      type="button"
                      className="cf-cust"
                      data-state={c.state}
                      data-shake={c.shake && Date.now() - c.shake < 500 ? 'true' : 'false'}
                      onClick={() => serve(c)}
                      aria-label={`ลูกค้าสั่ง${FOODS.find((f) => f.id === c.food)!.name}`}
                    >
                      <span className="cf-bubble" data-out={s.stock[c.food] <= 0 && c.state === 'wait'}>
                        <span
                          className="cf-ring"
                          style={{
                            ['--p' as string]: c.state === 'cook' ? 1 - c.cook / PREP[s.up.oven] : c.patience / c.patienceMax,
                            ['--rc' as string]: c.state === 'cook' ? '#4fb3ff' : c.patience / c.patienceMax > 0.5 ? '#3fd6a8' : c.patience / c.patienceMax > 0.25 ? '#ffcf3f' : '#ff6b7a',
                          }}
                        />
                        <Food id={c.food} size={30} />
                      </span>
                      <span className="cf-who">
                        <Avatar id={c.avatar} size={74} mood={c.state === 'angry' ? 'sad' : c.state === 'happy' ? 'wow' : 'happy'} wave={c.state === 'happy'} />
                      </span>
                      {c.state === 'cook' && <span className="cf-tag cf-tag-cook">กำลังทำ</span>}
                      {c.state === 'wait' && s.stock[c.food] > 0 && <span className="cf-tag">แตะเสิร์ฟ</span>}
                    </button>
                  )}
                  {pops
                    .filter((p) => p.slot === slot)
                    .map((p) => (
                      <span key={p.id} className="cf-pop" data-kind={p.kind}>
                        {p.kind === 'cash' && <Coin size={18} />}
                        {p.text}
                      </span>
                    ))}
                </div>
              );
            })}
          </div>
          <div className="cf-counter">
            <span className="cf-kitchen">
              เตา {cooking}/{kitchens(s)}
            </span>
            <span className="cf-register" aria-hidden="true" />
          </div>
        </div>
        {hint && <div className="cf-hint">{hint}</div>}
      </div>

      {/* ปุ่มล่าง */}
      <div className="cf-bar">
        <button type="button" className="l5g-btn l5g-btn-go l5g-btn-xl cf-restock" disabled={over} onClick={() => (gsfx.tap(), setRestock(true))}>
          <PackagePlus className="w-6 h-6" />
          <span>
            เติมของ<small>ตอบ 3 ข้อ</small>
          </span>
        </button>
        <button type="button" className="l5g-btn l5g-btn-violet l5g-btn-xl cf-upbtn" data-ready={canBuy} disabled={over} onClick={() => (gsfx.tap(), setShopOpen(true))}>
          <ArrowUpCircle className="w-6 h-6" />
          <span>
            อัปเกรด<small>{canBuy ? 'ซื้อได้แล้ว!' : 'ร้านค้า'}</small>
          </span>
        </button>
      </div>

      {restock && (
        <QuizBatch
          engine={engine}
          count={3}
          title="เติมของเข้าครัว"
          icon={<PackagePlus className="w-5 h-5" />}
          color="#ff9a3d"
          rewardText={() => lastReward.current}
          onAnswered={(o) => {
            if (!o.correct) return;
            const f = neededFood(sh.current);
            const n = unitsPerCorrect(sh.current);
            sh.current.stock[f] += n;
            lastReward.current = `ถูก! ${FOODS.find((x) => x.id === f)!.name} +${n}`;
            render();
          }}
          summary={(ok) => (ok ? `ได้ของเข้าครัวแล้ว ${ok * unitsPerCorrect(sh.current)} ชิ้น ไปเสิร์ฟกันเลย!` : 'รอบนี้ยังไม่ได้ของ ลองเติมอีกรอบนะ')}
          onDone={() => setRestock(false)}
        />
      )}

      {shopOpen && (
        <div className="l5g-batch-back" onMouseDown={(e) => e.target === e.currentTarget && setShopOpen(false)}>
          <div className="l5g-batch cf-shop" style={{ ['--bc' as string]: '#9b6cf0' }}>
            <div className="l5g-batch-head">
              <span className="l5g-batch-icon">
                <ArrowUpCircle className="w-5 h-5" />
              </span>
              <b>อัปเกรดร้าน</b>
              <span className="flex-1" />
              <span className="cf-chip cf-cash">
                <Coin size={20} /> {s.cash}
              </span>
              <button type="button" className="l5g-icon-btn" onClick={() => setShopOpen(false)} aria-label="ปิด">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="cf-ups">
              {UPGRADES.map((u) => {
                const lv = s.up[u.id];
                const cost = u.costs[lv];
                const max = cost === undefined;
                return (
                  <div key={u.id} className="cf-up" data-max={max}>
                    <span className="cf-up-icon" data-id={u.id}>
                      <UpIcon id={u.id} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <b>{u.name}</b>
                      <span className="cf-up-lv">
                        {u.costs.map((_, i) => (
                          <i key={i} data-on={i < lv} />
                        ))}
                      </span>
                      <p>{max ? 'อัปเกรดสูงสุดแล้ว' : u.desc(lv)}</p>
                    </div>
                    <button type="button" className="l5g-btn l5g-btn-go l5g-btn-sm" disabled={max || s.cash < cost} onClick={() => buy(u.id)}>
                      {max ? 'เต็ม' : (
                        <>
                          <Coin size={16} /> {cost}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="cf-shop-note">เงินได้จากการเสิร์ฟลูกค้า ของในครัวได้จากการตอบคำถามถูก</p>
          </div>
        </div>
      )}

      {over && (
        <div className="gm-over">
          <div className="gm-over-card">
            <p className="gm-over-tag">ปิดร้านแล้ว!</p>
            <div className="gm-over-big">
              <Coin size={40} /> {s.earned.toLocaleString('th-TH')}
            </div>
            <p className="font-bold">รายได้รวมของร้าน</p>
            <div className="gm-over-stats">
              <span>
                <b>{s.served}</b>เสิร์ฟสำเร็จ
              </span>
              <span>
                <b>{s.lost}</b>ลูกค้ารอไม่ไหว
              </span>
            </div>
            <p className="gm-over-wait">{preview ? 'นี่คือการทดลองเล่น' : 'รอครูประกาศผลนะ'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function UpIcon({ id }: { id: UpId }) {
  const INK = '#2a2350';
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
      {id === 'oven' && (
        <>
          <rect x="4" y="7" width="24" height="20" rx="4" fill="#ffb35c" stroke={INK} strokeWidth="2.2" />
          <rect x="8" y="13" width="16" height="10" rx="2" fill="#2a2350" />
          <path d="M11 18 Q13 15 15 18 Q17 21 19 18 Q21 15 22 18" stroke="#ff9a3d" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="9" cy="10" r="1.4" fill={INK} />
          <circle cx="13" cy="10" r="1.4" fill={INK} />
        </>
      )}
      {id === 'menu' && (
        <>
          <rect x="6" y="4" width="20" height="25" rx="3" fill="#fff8ec" stroke={INK} strokeWidth="2.2" />
          <path d="M10 11 H22 M10 16 H22 M10 21 H17" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <circle cx="23" cy="23" r="6" fill="#ffcf3f" stroke={INK} strokeWidth="2" />
          <path d="M23 20 V26 M20 23 H26" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {id === 'shelf' && (
        <>
          <rect x="4" y="5" width="24" height="23" rx="2" fill="#d39a6a" stroke={INK} strokeWidth="2.2" />
          <path d="M4 16 H28" stroke={INK} strokeWidth="2.2" />
          <rect x="7" y="9" width="5" height="6" rx="1" fill="#fff" stroke={INK} strokeWidth="1.5" />
          <rect x="14" y="8" width="5" height="7" rx="1" fill="#ff8fb1" stroke={INK} strokeWidth="1.5" />
          <rect x="9" y="19" width="6" height="7" rx="1" fill="#ffdc54" stroke={INK} strokeWidth="1.5" />
          <rect x="18" y="20" width="6" height="6" rx="1" fill="#7ddc86" stroke={INK} strokeWidth="1.5" />
        </>
      )}
      {id === 'decor' && (
        <>
          <path d="M16 28 C9 23 5 18 5 13 C5 9 8 6 11 6 C13.5 6 15 7.5 16 9 C17 7.5 18.5 6 21 6 C24 6 27 9 27 13 C27 18 23 23 16 28 Z" fill="#ff8fb1" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M23 3 L24 6 L27 7 L24 8 L23 11 L22 8 L19 7 L22 6 Z" fill="#ffcf3f" stroke={INK} strokeWidth="1.2" />
        </>
      )}
      {id === 'staff' && (
        <>
          <path d="M9 13 C6 13 5 9 8 7 C9 4 13 3 16 5 C19 3 23 4 24 7 C27 9 26 13 23 13 Z" fill="#fff" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <rect x="9" y="12" width="14" height="4" fill="#fff" stroke={INK} strokeWidth="2" />
          <circle cx="16" cy="22" r="7" fill="#ffd9a1" stroke={INK} strokeWidth="2.2" />
          <circle cx="13.5" cy="21.5" r="1.2" fill={INK} />
          <circle cx="18.5" cy="21.5" r="1.2" fill={INK} />
          <path d="M14 24.5 Q16 26 18 24.5" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
