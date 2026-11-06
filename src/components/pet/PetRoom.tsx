'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, BookImage, Check, Cloud, Crown, Gamepad2, Gift, HardDrive, Lock, Moon, Puzzle, RotateCcw, ShowerHead, Shirt, ShoppingBag, Sparkles, Sun, Trophy, UtensilsCrossed, X, Smile, Sofa, Bath, BedDouble } from 'lucide-react';
import { Buddy, type BuddyExpr } from '@/components/companion/Buddy';
import { StarIcon } from '@/components/companion/Stars';
import { useCompanion } from '@/components/companion/CompanionProvider';
import { StickerArt } from '@/components/studio/stickers';
import { Modal } from '@/components/ui/Modal';
import { JoinButton } from '@/components/membership/JoinButton';
import { petAct, resetStore, setColor } from '@/lib/companion-store';
import { BUDDY_COLORS, BUDDY_COLOR_HEX, BUDDY_NAME, COLOR_LABEL, TIER_INFO, bkkParts, buddyStage, phaseOf, stickerTier, unlockedHats } from '@/lib/companion';
import { ROOMS, isRoomSlot, roomById, type RoomId } from '@/lib/pet/rooms';
import { FOODS, ITEMS, SEASON_STAR_PRIZE, SEASON_STEPS, WEAR_SLOTS, foodById, itemById, seasonOfMonth, type RoomSlot, type Slot, type WearSlot } from '@/lib/pet/catalog';
import {
  bodyAt, bodyLook, sleepDone, wakeTime, GROW_FULL, STAGE_DAYS, STAGE_LABEL, WEIGHT_LABEL, weightBand, tiredLevel, pickSpecies, balance, buy, buyCheck, claimAllBonus, claimMission, claimSeason, equip, feed, gameDone, hatch, missionRows, moodOf, needsAt, ownsItem, petLevel, petTap, roll, sleepStart, track, wakeUp, washDone,
  type MissionRow, type NeedKey, type PS,
} from '@/lib/pet/logic';
import { sfx } from '@/lib/sound';
import { ACTIONS, IDLE_ACTIONS, SPECIES, openSpeciesCount, speciesById, speciesOpen, unlockText, type ActionId, type Species } from '@/lib/pet/species';
import { RoomFront, RoomScene, RoomThumb } from './roomArt';
import { BalloonGame, CatchGame, MatchGame, type GameKind } from './PetGames';
import './pet.css';

type Panel = null | 'body' | 'food' | 'shop' | 'play' | 'missions' | 'season' | 'album';
const CARE_LINES = ['ลูบอีกสิ ชอบจัง', 'จั๊กจี้นะ', 'วันนี้เรียนอะไรมา', 'เธอเก่งมากเลย', 'พักสายตาบ้างนะ', 'อยากไปทายปริศนาจัง'];
const MOOD_LINE = { happy: '', hungry: 'หิวแล้ว ขอข้าวหน่อย', bored: 'เบื่อจัง มาเล่นกันไหม', dirty: 'ตัวเหนียว อยากอาบน้ำ', sleepy: 'ง่วงแล้ว ขอนอนหน่อย' } as const;

interface Fx { id: number; kind: 'star' | 'heart' | 'bubble' | 'yum'; x: number; y: number; label?: string }

function NeedBtn({ pct, label, icon, onClick, active }: { pct?: number; label: string; icon: React.ReactNode; onClick: () => void; active?: boolean }) {
  const color = pct === undefined ? '#7c5cff' : pct >= 60 ? '#37c871' : pct >= 35 ? '#ffb020' : '#ff6b6b';
  return (
    <button type="button" className="pr-dock-btn" data-active={active || undefined} onClick={onClick} aria-label={pct === undefined ? label : `${label} ${Math.round(pct)} เปอร์เซ็นต์`}>
      <span className="pr-ring" style={{ background: pct === undefined ? color : `conic-gradient(${color} ${pct * 3.6}deg, rgba(42,35,80,.16) 0)` }}>
        <span className="pr-ring-in" style={{ color }}>{icon}</span>
      </span>
      <small>{pct === undefined ? label : `${Math.round(pct)}%`}</small>
    </button>
  );
}

export function PetRoom() {
  const router = useRouter();
  const { state, ready, entitled, loggedIn, media, syncStatus } = useCompanion();
  const ps: PS = useMemo(() => ({ stars: state.stars, pet: state.pet }), [state.stars, state.pet]);
  const [now, setNow] = useState(() => Date.now());
  const parts = useMemo(() => bkkParts(new Date(now)), [now]);
  const today = parts.date;
  const [panel, setPanel] = useState<Panel>(null);
  const [where, setWhere] = useState<RoomId>('living');
  const [shopTab, setShopTab] = useState<'pet' | 'wear' | 'room'>('wear');
  const [game, setGame] = useState<GameKind | null>(null);
  const [washing, setWashing] = useState(0); // 0 = ไม่ได้อาบ, >0 = ความคืบหน้า + 1
  const [expr, setExpr] = useState<BuddyExpr | null>(null);
  const [act, setAct] = useState<{ id: ActionId; key: number } | null>(null);
  const [newPet, setNewPet] = useState<Species | null>(null);
  const lastOpen = useRef<number | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const [flying, setFlying] = useState<string | null>(null);
  const [eggTaps, setEggTaps] = useState(0);
  const [trial, setTrial] = useState<{ slot: Slot; id: string } | null>(null);
  const [lvUp, setLvUp] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fxId = useRef(1);
  const lineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const petEl = useRef<HTMLButtonElement>(null);
  const lastLv = useRef<number | null>(null);
  const lastPet = useRef(0);

  const mySpecies = speciesById(state.pet.species) || SPECIES[0];
  const sleeping = !!state.pet.sleepAt;
  const wakeAtMs = wakeTime(state.pet);
  const hatched = state.pet.hatched || buddyStage(state.stars).index >= 1;
  const body = bodyLook(state.pet, hatched, now);
  const stage = body.stage;
  const bodyNow = bodyAt(state.pet, now);
  const needs = needsAt(state.pet, now);
  const level = petLevel(state.stars);
  const season = seasonOfMonth(parts.month);
  const rows = useMemo(() => missionRows(ps, today), [ps, today]);
  const legacyOpen = useMemo(() => unlockedHats(state.stars, state.visitDays.length), [state.stars, state.visitDays.length]);
  const seasonPet = roll(ps, today).pet.season;
  const seasonReady = SEASON_STEPS.some((need, i) => seasonPet.pts >= need && !seasonPet.got.includes(i));

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), sleeping ? 60000 : 15000);
    return () => clearInterval(t);
  }, [sleeping]);

  const say = useCallback((text: string, ms = 2800) => {
    setLine(text);
    if (lineTimer.current) clearTimeout(lineTimer.current);
    lineTimer.current = setTimeout(() => setLine(null), ms);
  }, []);

  const burst = useCallback((kind: Fx['kind'], n: number, label?: string) => {
    const items: Fx[] = Array.from({ length: n }, () => ({ id: fxId.current++, kind, x: 30 + Math.random() * 40, y: 35 + Math.random() * 25, label }));
    setFx((f) => [...f, ...items]);
    const ids = new Set(items.map((i) => i.id));
    setTimeout(() => setFx((f) => f.filter((x) => !ids.has(x.id))), 1100);
  }, []);

  const flashExpr = useCallback((e: BuddyExpr, ms = 1400) => {
    setExpr(e);
    setTimeout(() => setExpr(null), ms);
  }, []);

  // ทักตามอารมณ์เมื่อเปิดห้อง และเมื่อหลอดต่ำ
  useEffect(() => {
    if (!ready || !hatched || sleeping) return;
    const m = moodOf(needs);
    if (m !== 'happy') say(MOOD_LINE[m], 4000);
    // เช็กเมื่อโหลดเสร็จเท่านั้น ไม่ทวงซ้ำทุกครั้งที่นาฬิกาเดิน
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hatched]);

  useEffect(() => {
    if (!ready) return;
    if (lastLv.current !== null && level.lv > lastLv.current) {
      setLvUp(level.lv);
      sfx.cheer();
    }
    lastLv.current = level.lv;
  }, [level.lv, ready]);

  // นอนครบตามเวลาจริงแล้วตื่นเอง กลับมาเปิดเว็บทีหลังก็คิดจากเวลาที่เข้านอน
  useEffect(() => {
    if (!ready || !sleepDone(state.pet, now)) return;
    const hours = Math.round((wakeAtMs - state.pet.sleepAt) / 360000) / 10;
    petAct((p) => wakeUp(p, Date.now()));
    sfx.wake();
    flashExpr('happy');
    say(`ตื่นแล้ว นอนไป ${hours} ชั่วโมง สดชื่นจัง`, 4500);
  }, [ready, state.pet, now, wakeAtMs, flashExpr, say]);

  // โตข้ามขั้นตามเวลาจริง: ฉลองเมื่อเห็นครั้งแรก
  const lastStage = useRef<number | null>(null);
  useEffect(() => {
    if (!ready || !hatched) return;
    if (lastStage.current !== null && stage > lastStage.current) {
      sfx.cheer();
      say(`โตเป็น${STAGE_LABEL[stage]}แล้ว!`, 5000);
    }
    lastStage.current = stage;
  }, [ready, hatched, stage, say]);

  const playAct = useCallback((id: ActionId) => setAct({ id, key: Date.now() }), []);
  useEffect(() => {
    if (!act) return;
    const t = setTimeout(() => setAct(null), 1200);
    return () => clearTimeout(t);
  }, [act]);

  // อยู่เฉยๆ ก็ขยับเองเป็นระยะ
  useEffect(() => {
    if (!hatched || sleeping || washing) return;
    const t = setInterval(() => setAct((a) => a ?? { id: IDLE_ACTIONS[Math.floor(Math.random() * IDLE_ACTIONS.length)], key: Date.now() }), 9000);
    return () => clearInterval(t);
  }, [hatched, sleeping, washing]);

  // ทำภารกิจจนปลดล็อกคู่หูใหม่: ฉลองทันที
  const openCount = openSpeciesCount(state.pet);
  useEffect(() => {
    if (!ready) return;
    if (lastOpen.current !== null && openCount > lastOpen.current) {
      const fresh = SPECIES.filter((s) => s.ev && speciesOpen(state.pet, s) && state.pet.total[s.ev] === s.need);
      setNewPet(fresh[fresh.length - 1] || null);
      sfx.cheer();
    }
    lastOpen.current = openCount;
    // ดูแค่จำนวนที่เปิดแล้ว
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCount, ready]);

  /* ---------------------------- การกระทำ ---------------------------- */

  const openPanel = (p: Panel) => {
    sfx.pop();
    setTrial(null);
    // ดูร้านค้า/ภารกิจไม่ปลุก ปลุกเฉพาะเล่นกับกินซึ่งต้องลุกจริง
    if (sleeping && (p === 'play' || p === 'food')) wake();
    setPanel((c) => (c === p ? null : p));
    if (p === 'album') petAct((x) => track(x, 'album', today));
  };

  const wake = () => {
    petAct((p) => wakeUp(p, Date.now()));
    sfx.wake();
  };

  const onPet = () => {
    if (!hatched) return;
    if (washing) return;
    if (sleeping) {
      say(`ชู่ว หลับอยู่ อีก ${wakeLeft(wakeAtMs, Date.now())} จะตื่น`);
      return;
    }
    const t = Date.now();
    playAct(Math.random() < 0.3 ? mySpecies.move : ACTIONS[Math.floor(Math.random() * ACTIONS.length)].id);
    sfx.pop();
    burst('heart', 2);
    if (t - lastPet.current > 500) {
      lastPet.current = t;
      petAct((p) => petTap(p, t, today));
    }
    flashExpr('happy', 700);
    if (Math.random() < 0.35) say(CARE_LINES[Math.floor(Math.random() * CARE_LINES.length)], 1800);
  };

  const giveFood = (id: string) => {
    const f = foodById(id)!;
    if (flying) return;
    if (balance(ps) < f.price) {
      say('ดาวไม่พอ ไปตอบคำถามกันไหม');
      return;
    }
    setFlying(id);
    sfx.pop();
    setTimeout(() => {
      setFlying(null);
      const t = Date.now();
      petAct((p) => feed(p, id, t, today).ps);
      setNow(t);
      flashExpr('eat', 1300);
      burst('yum', 1, f.good ? 'มีประโยชน์' : f.sweet ? 'หวานจัง' : 'อร่อย');
      if (f.sweet && bodyNow.w + 4 >= 65) setTimeout(() => say('ของหวานเยอะแล้วนะ ลองผักผลไม้ หรือมาวิ่งเล่นกัน', 3500), 700);
      sfx.sparkle();
    }, 560);
  };

  const startWash = () => {
    setPanel(null);
    if (sleeping) wake();
    sfx.pop();
    setWhere('bath');
    setWashing(1);
    say('ถูตัวปุ๋งเลย');
  };

  const scrub = (e: React.PointerEvent) => {
    if (!washing || washing > 100) return;
    e.preventDefault();
    setWashing((w) => Math.min(101, w + 1.1));
    if (Math.random() < 0.2) burst('bubble', 1);
  };

  // ถูครบแล้วโชว์ฝักบัวก่อนจบ
  const washFull = washing >= 101;
  useEffect(() => {
    if (!washFull) return;
    const timer = setTimeout(() => {
      const t = Date.now();
      petAct((p) => washDone(p, t, bkkParts(new Date(t)).date));
      setNow(t);
      setWashing(0);
      flashExpr('happy', 1600);
      sfx.cheer();
      say('หอมจัง ขอบคุณนะ');
    }, 900);
    return () => clearTimeout(timer);
  }, [washFull, flashExpr, say]);

  const toggleSleep = () => {
    setPanel(null);
    if (sleeping) {
      wake();
      say('ตื่นก่อนเวลา ยังง่วงอยู่เลย');
      return;
    }
    if (needs.energy >= 90) {
      say('ยังไม่ง่วงเลย มาเล่นกันก่อนไหม');
      return;
    }
    sfx.pop();
    setWhere('bed');
    const t = Date.now();
    petAct((p) => sleepStart(p, t, today));
    setNow(t);
  };

  const gameFinish = useCallback(
    (kind: GameKind) => {
      const t = Date.now();
      petAct((p) => gameDone(p, kind, t, bkkParts(new Date(t)).date));
      setNow(t);
      sfx.cheer();
    },
    []
  );

  const claim = (m: MissionRow) => {
    let got = 0;
    petAct((p) => {
      const r = claimMission(p, m.id, today);
      got = r.stars;
      return r.ps;
    });
    if (got) {
      sfx.sparkle();
      burst('star', 4);
    }
  };

  const goMission = (m: MissionRow) => {
    setPanel(null);
    switch (m.go) {
      case 'puzzle': router.push('/puzzle'); break;
      case 'home': router.push('/home'); break;
      case 'report': router.push('/report'); break;
      case 'food': setWhere('dining'); setPanel('food'); break;
      case 'wash': startWash(); break;
      case 'sleep': toggleSleep(); break;
      case 'play': setPanel('play'); break;
      case 'shop': setPanel('shop'); break;
      case 'room': setShopTab('room'); setPanel('shop'); break;
      case 'album': openPanel('album'); break;
      default: say('ลูบหัวฉันเลย');
    }
  };

  /* ---------------------------- ภาพที่แสดง ---------------------------- */

  const shownWear = useMemo(() => {
    const w = { ...state.pet.wear };
    if (trial && WEAR_SLOTS.some((s) => s.id === trial.slot)) w[trial.slot as WearSlot] = trial.id;
    return w;
  }, [state.pet.wear, trial]);
  const shownRoom = useMemo(() => {
    const r = { ...state.pet.room };
    if (trial && isRoomSlot(trial.slot)) r[trial.slot] = trial.id;
    return r;
  }, [state.pet.room, trial]);

  const mood = moodOf(needs);
  const face: BuddyExpr = expr || (mood === 'sleepy' ? 'sleepy' : mood === 'happy' ? 'smile' : 'sad');
  const phase = sleeping ? 'night' : phaseOf(parts.hour);
  const look = { stage, grow: body.grow, weight: body.weight, tired: body.tired, color: state.color, wear: shownWear, species: state.pet.species };

  if (!ready) return <div className="pr-root pr-loading">กำลังเปิดห้องปุ๋ง...</div>;

  return (
    <div className="pr-root">
      <div className="pr-stage" data-sheet={panel ? '1' : undefined} data-sleep={sleeping || undefined}>
        <div key={where} className="pr-room-in"><RoomScene where={where} room={shownRoom} season={season} phase={phase} /></div>
        {sleeping && <div className="pr-night" />}

        {/* แถบบน */}
        <div className="pr-hud">
          <button type="button" className="pr-level" onClick={() => openPanel('missions')} aria-label={`เลเวล ${level.lv} เปิดภารกิจ`}>
            <span className="pr-level-ring" style={{ background: `conic-gradient(#ffc53a ${level.pct * 3.6}deg, rgba(255,255,255,.55) 0)` }}>
              <b>{level.lv}</b>
            </span>
          </button>
          {hatched && (
            <button type="button" className="pr-age" onClick={() => openPanel('body')} aria-label="ดูร่างกายคู่หู">
              <b>{STAGE_LABEL[stage]}</b>
              <small>อายุ {ageDays(bodyNow.born, now)} วัน</small>
            </button>
          )}
          <div className="pr-stars" title="ดาวที่ใช้ได้">
            <StarIcon className="w-5 h-5" />
            <b>{balance(ps)}</b>
          </div>
          <div className="pr-hud-right">
            <button type="button" className="pr-icon-btn" onClick={() => openPanel('missions')} aria-label="ภารกิจ">
              <Trophy className="w-5 h-5" />
              {rows.claimable > 0 && <i className="pr-badge">{rows.claimable}</i>}
            </button>
            <button type="button" className="pr-icon-btn" onClick={() => openPanel('season')} aria-label={`ซีซัน ${season.name}`} style={{ color: season.c1 }}>
              <Gift className="w-5 h-5" />
              {seasonReady && <i className="pr-badge">!</i>}
            </button>
            <Link href="/puzzle" className="pr-icon-btn" aria-label="ปริศนาประจำวัน"><Puzzle className="w-5 h-5" /></Link>
            <Link href="/report" className="pr-icon-btn" aria-label="รายงานสัปดาห์"><BarChart3 className="w-5 h-5" /></Link>
            <button type="button" className="pr-icon-btn" onClick={() => openPanel('album')} aria-label="สมุดสติกเกอร์"><BookImage className="w-5 h-5" /></button>
          </div>
        </div>

        {/* เปลี่ยนห้อง */}
        {hatched && !washing && (
          <div className="pr-rooms" role="tablist" aria-label="เลือกห้อง">
            {ROOMS.map((r) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={where === r.id}
                data-on={where === r.id || undefined}
                onClick={() => {
                  if (sleeping) wake();
                  sfx.pop();
                  setTrial(null);
                  setWhere(r.id);
                }}
              >
                {r.id === 'living' ? <Sofa className="w-4 h-4" /> : r.id === 'dining' ? <UtensilsCrossed className="w-4 h-4" /> : r.id === 'bath' ? <Bath className="w-4 h-4" /> : <BedDouble className="w-4 h-4" />}
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ปุ๋ง */}
        <RoomFront key={`f${where}`} where={where} room={shownRoom} />
        <div className="pr-pet-wrap" data-spot={where !== 'living' || undefined}>
          {line && <div key={line} className="pr-bubble" role="status">{line}</div>}
          {!hatched ? (
            <button
              type="button"
              className="pr-pet pr-egg"
              key={eggTaps}
              onClick={() => {
                const n = eggTaps + 1;
                setEggTaps(n);
                sfx.pop();
                if (n >= 5) {
                  petAct((p) => hatch(p, Date.now()));
                  sfx.cheer();
                  burst('star', 8);
                  say(`สวัสดี ฉันชื่อ${BUDDY_NAME}!`, 4000);
                }
              }}
              aria-label="แตะไข่ให้ฟัก"
            >
              <Buddy stage={0} color={state.color} size={300} animate={false} />
              <span className="pr-egg-tip">แตะไข่อีก {5 - eggTaps} ครั้ง</span>
            </button>
          ) : (
            <button ref={petEl} type="button" className="pr-pet" onClick={onPet} onPointerMove={scrub} aria-label={`ลูบหัว${BUDDY_NAME}`} data-wash={washing > 0 || undefined}>
              <span key={act?.key} className="pr-act" data-act={act?.id}>
                <Buddy {...body} color={state.color} wear={shownWear} species={state.pet.species} size={300} asleep={sleeping} expr={face} animate={!sleeping && !expr && !act} />
              </span>
              {sleeping && <span className="pr-zzz" aria-hidden="true"><i>Z</i><i>z</i><i>z</i></span>}
              {washing > 0 && <span className="pr-foam" style={{ opacity: Math.min(1, washing / 40) }} aria-hidden="true" />}
              {washing > 100 && <span className="pr-shower" aria-hidden="true" />}
            </button>
          )}
          {flying && <span className="pr-flying" aria-hidden="true"><StickerArt id={flying} /></span>}
          {fx.map((f) => (
            <span key={f.id} className={`pr-fx pr-fx-${f.kind}`} style={{ left: `${f.x}%`, top: `${f.y}%` }} aria-hidden="true">
              {f.kind === 'star' && <StarIcon className="w-7 h-7" />}
              {f.kind === 'heart' && <svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 21 C-6 9 6 -3 12 5 C18 -3 30 9 12 21 Z" fill="#ff6f91" stroke="#2a2350" strokeWidth="2" /></svg>}
              {f.kind === 'bubble' && <i />}
              {f.kind === 'yum' && <b>{f.label}</b>}
            </span>
          ))}
        </div>

        {washing > 0 && (
          <div className="pr-wash-bar" role="progressbar" aria-valuenow={Math.min(100, Math.round(washing))} aria-label="ความสะอาด">
            <ShowerHead className="w-5 h-5" />
            <span><i style={{ width: `${Math.min(100, washing)}%` }} /></span>
            <button type="button" onClick={() => setWashing(0)} aria-label="หยุดอาบน้ำ"><X className="w-4 h-4" /></button>
          </div>
        )}

        {sleeping && !panel && (
          <div className="pr-sleep-card" role="status">
            <Moon className="w-5 h-5" />
            <span>
              <b>หลับอยู่ ตื่นเวลา {new Date(wakeAtMs).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น. (อีก {wakeLeft(wakeAtMs, now)})</b>
              <small>ปิดเว็บได้เลย กลับมาจะนับเวลาจริงให้</small>
            </span>
          </div>
        )}

        {/* ปุ่มล่าง */}
        {hatched && !washing && (
          <nav className="pr-dock" aria-label="ดูแลปุ๋ง">
            <NeedBtn label="ร้านค้า" icon={<ShoppingBag className="w-6 h-6" />} onClick={() => openPanel('shop')} active={panel === 'shop'} />
            <NeedBtn pct={needs.fun} label="เล่น" icon={<Smile className="w-6 h-6" />} onClick={() => openPanel('play')} active={panel === 'play'} />
            <NeedBtn pct={needs.food} label="อาหาร" icon={<UtensilsCrossed className="w-6 h-6" />} onClick={() => { setWhere('dining'); openPanel('food'); }} active={panel === 'food'} />
            <NeedBtn pct={needs.clean} label="อาบน้ำ" icon={<ShowerHead className="w-6 h-6" />} onClick={startWash} />
            <NeedBtn pct={needs.energy} label="นอน" icon={sleeping ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />} onClick={toggleSleep} active={sleeping} />
          </nav>
        )}

        {/* แผงล่าง */}
        {panel && (
          <section className="pr-sheet" aria-label="แผงควบคุม">
            <button type="button" className="pr-sheet-close" onClick={() => { setPanel(null); setTrial(null); }} aria-label="ปิด"><X className="w-5 h-5" /></button>
            {panel === 'food' && <FoodPanel ps={ps} onGive={giveFood} onGoPlay={() => setPanel('play')} />}
            {panel === 'play' && <PlayPanel onPick={(g) => { setPanel(null); setGame(g); }} puzzleDone={state.pet.puzzles.some((p) => p.d === today)} onAct={(id) => { sfx.pop(); flashExpr('happy', 1000); playAct(id); petAct((p) => petTap(p, Date.now(), today)); }} move={mySpecies.move} />}
            {panel === 'shop' && <ShopPanel where={where} initialTab={shopTab} ps={ps} today={today} legacyOpen={legacyOpen} trial={trial} setTrial={setTrial} color={state.color} look={look} onBought={() => { sfx.cheer(); burst('star', 3); }} onPicked={(s) => playAct(s.move)} />}
            {panel === 'missions' && <MissionPanel rows={rows} level={level} onClaim={claim} onGo={goMission} onAll={() => { petAct((p) => claimAllBonus(p, today).ps); sfx.cheer(); burst('star', 6); }} />}
            {panel === 'season' && <SeasonPanel season={season} pts={seasonPet.pts} got={seasonPet.got} onClaim={() => { petAct((p) => claimSeason(p, today)); sfx.cheer(); burst('star', 6); }} />}
            {panel === 'body' && <BodyPanel body={bodyNow} energy={needs.energy} look={{ ...body, color: state.color, species: state.pet.species, wear: state.pet.wear }} now={now} />}
            {panel === 'album' && <AlbumPanel entitled={entitled} loggedIn={loggedIn} media={media} plays={state.plays} syncStatus={syncStatus} onReset={() => setConfirmReset(true)} />}
          </section>
        )}

        {game === 'balloon' && <BalloonGame onClose={() => setGame(null)} onDone={gameFinish} look={look} />}
        {game === 'catch' && <CatchGame onClose={() => setGame(null)} onDone={gameFinish} look={look} />}
        {game === 'match' && <MatchGame onClose={() => setGame(null)} onDone={gameFinish} look={look} />}

        {newPet && !game && !lvUp && (
          <div className="pr-game-end" onClick={() => setNewPet(null)}>
            <div className="pr-pop-card">
              <Buddy stage={Math.max(1, stage)} species={newPet.id} size={120} expr="happy" />
              <h3>ปลดล็อก{newPet.label}!</h3>
              <p>{unlockText(newPet)} สำเร็จแล้ว</p>
              <button type="button" className="pr-btn" onClick={() => { petAct((p) => pickSpecies(p, newPet.id)); setNewPet(null); playAct(newPet.move); }}>เลือกเป็นคู่หู</button>
            </div>
          </div>
        )}

        {lvUp && !game && (
          <div className="pr-game-end" onClick={() => setLvUp(null)}>
            <div className="pr-pop-card">
              <Sparkles className="w-9 h-9 mx-auto text-sun-500" />
              <h3>เลเวล {lvUp} แล้ว!</h3>
              <p>ของใหม่ในร้านรอเธออยู่</p>
              <button type="button" className="pr-btn" onClick={() => { setLvUp(null); setPanel('shop'); }}>ไปดูร้าน</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="ล้างข้อมูลคู่หู?">
        <p className="text-gray-700 dark:text-gray-300">ดาว สติกเกอร์ ของทั้งหมด และห้องจะถูกลบ และ{BUDDY_NAME}จะกลับไปเป็นไข่ <b className="text-rose-600">กู้คืนไม่ได้</b></p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setConfirmReset(false)} className="btn-jelly px-5 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">ยกเลิก</button>
          <button onClick={() => { resetStore(); setConfirmReset(false); setPanel(null); setEggTaps(0); }} className="btn-jelly px-5 py-3 rounded-2xl bg-rose-600 text-white font-semibold">ล้างข้อมูล</button>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------ แผงอาหาร ------------------------------ */

function FoodPanel({ ps, onGive, onGoPlay }: { ps: PS; onGive: (id: string) => void; onGoPlay: () => void }) {
  const have = balance(ps);
  return (
    <div>
      <h3 className="pr-sheet-h"><UtensilsCrossed className="w-5 h-5" /> เลือกอาหารให้ปุ๋ง</h3>
      <div className="pr-tray">
        {FOODS.map((f) => (
          <button key={f.id} type="button" className="pr-food" onClick={() => onGive(f.id)} data-poor={have < f.price || undefined} aria-label={`${f.label} ราคา ${f.price} ดาว`}>
            <StickerArt id={f.id} className="pr-food-art" />
            <span>{f.label}</span>
            <b>{f.price === 0 ? 'ฟรี' : <><StarIcon className="w-3.5 h-3.5" /> {f.price}</>}</b>
            {f.good && <i className="pr-tag">ดี</i>}
          </button>
        ))}
      </div>
      {have < 2 && <button type="button" className="pr-link" onClick={onGoPlay}>ดาวใกล้หมด ไปตอบคำถามรับดาว</button>}
    </div>
  );
}

/* ------------------------------ แผงเล่น ------------------------------ */

function PlayPanel({ onPick, puzzleDone, onAct, move }: { onPick: (g: GameKind) => void; puzzleDone: boolean; onAct: (id: ActionId) => void; move: ActionId }) {
  return (
    <div>
      <h3 className="pr-sheet-h"><Gamepad2 className="w-5 h-5" /> เล่นกับปุ๋ง</h3>
      <div className="pr-play-grid">
        <Link href="/puzzle" className="pr-play-card" data-hot={!puzzleDone || undefined}>
          <StickerArt id="sp-starface" />
          <b>ปริศนาวันนี้</b>
          <small>{puzzleDone ? 'เล่นแล้ว ดูผลได้' : 'ได้ดาวเยอะสุด'}</small>
        </Link>
        <button type="button" className="pr-play-card" onClick={() => onPick('balloon')}>
          <StickerArt id="fe-balloons" />
          <b>ลูกโป่งคำตอบ</b>
          <small>ตอบถูกได้ดาว</small>
        </button>
        <button type="button" className="pr-play-card" onClick={() => onPick('catch')}>
          <StickerArt id="f-watermelon" />
          <b>รับผักผลไม้</b>
          <small>หลอดสนุกเพิ่ม</small>
        </button>
        <button type="button" className="pr-play-card" onClick={() => onPick('match')}>
          <StickerArt id="b-butterfly" />
          <b>จับคู่ภาพ</b>
          <small>หลอดสนุกเพิ่ม</small>
        </button>
      </div>
      <h3 className="pr-sheet-h" style={{ marginTop: 14 }}><Sparkles className="w-5 h-5" /> สั่งให้ทำท่า</h3>
      <div className="pr-acts">
        {ACTIONS.map((a) => (
          <button key={a.id} type="button" data-on={a.id === move || undefined} onClick={() => onAct(a.id)}>{a.label}</button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ เลือกคู่หู ------------------------------ */

function SpeciesPick({ ps, today, onPicked }: { ps: PS; today: string; onPicked: (s: Species) => void }) {
  const open = SPECIES.filter((s) => speciesOpen(ps.pet, s)).length;
  return (
    <div>
      <p className="pr-lv-line">ปลดล็อกแล้ว {open}/{SPECIES.length} แบบ ทำภารกิจเพื่อเปิดตัวใหม่</p>
      <div className="pr-shop">
        {SPECIES.map((s) => {
          const on = ps.pet.species === s.id;
          const isOpen = speciesOpen(ps.pet, s);
          const have = s.ev ? Math.min(ps.pet.total[s.ev] || 0, s.need || 0) : 0;
          return (
            <div key={s.id} className="pr-item" data-on={on || undefined}>
              <button
                type="button"
                className="pr-item-main"
                disabled={!isOpen}
                aria-pressed={on}
                onClick={() => {
                  petAct((p) => pickSpecies(roll(p, today), s.id));
                  sfx.sparkle();
                  onPicked(s);
                }}
              >
                <span className={isOpen ? '' : 'pr-locked-art'}><Buddy stage={1} species={s.id} size={70} animate={false} /></span>
                <span>{isOpen ? s.label : 'ยังล็อกอยู่'}</span>
                {on && <i className="pr-tick"><Check className="w-3.5 h-3.5" /></i>}
              </button>
              {isOpen ? (
                <small className="pr-owned">{on ? 'คู่หูตอนนี้' : 'แตะเพื่อเลือก'}</small>
              ) : (
                <div className="pr-unlock">
                  <small><Lock className="w-3 h-3" /> {unlockText(s)}</small>
                  <div className="pr-bar"><i style={{ width: `${(have / (s.need || 1)) * 100}%` }} /></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ ร้านค้า ------------------------------ */

function ShopPanel({ where, initialTab, ps, today, legacyOpen, trial, setTrial, color, look, onBought, onPicked }: {
  where: RoomId; initialTab: 'pet' | 'wear' | 'room'; ps: PS; today: string; legacyOpen: readonly string[]; trial: { slot: Slot; id: string } | null; setTrial: (t: { slot: Slot; id: string } | null) => void; color: string;
  look: { stage: number; color: string; species: string; wear: Partial<Record<WearSlot, string>> };
  onBought: () => void;
  onPicked: (s: Species) => void;
}) {
  const [tab, setTab] = useState<'pet' | 'wear' | 'room'>(initialTab);
  const roomSlots = roomById(where).slots;
  const [slot, setSlot] = useState<string>(initialTab === 'room' ? roomSlots[0].id : 'hat');
  // เปลี่ยนห้องระหว่างเปิดร้าน: ย้ายไปช่องของห้องนั้น
  useEffect(() => {
    if (tab === 'room') setSlot(roomById(where).slots[0].id);
  }, [where, tab]);
  const list = useMemo(() => ITEMS.filter((i) => i.slot === slot), [slot]);
  const lv = petLevel(ps.stars).lv;
  const slots = tab === 'wear' ? [...WEAR_SLOTS, { id: 'color', label: 'สีตัว' }] : roomSlots;
  const isOn = (id: string) => (ps.pet.wear as Record<string, string>)[slot] === id || (ps.pet.room as Record<string, string>)[slot] === id;

  const tap = (id: string) => {
    sfx.pop();
    if (ownsItem(ps.pet, id, legacyOpen)) {
      setTrial(null);
      petAct((p) => equip(p, slot as Slot, id, today));
    } else {
      setTrial(trial?.id === id ? null : { slot: slot as Slot, id });
    }
  };

  return (
    <div>
      <div className="pr-tabs">
        <button type="button" data-on={tab === 'wear' || undefined} onClick={() => { setTab('wear'); setSlot('hat'); setTrial(null); }}><Shirt className="w-4 h-4" /> แต่งตัว</button>
        <button type="button" data-on={tab === 'room' || undefined} onClick={() => { setTab('room'); setSlot(roomSlots[0].id); setTrial(null); }}><Sparkles className="w-4 h-4" /> แต่ง{roomById(where).label.replace('ห้อง', '')}</button>
        <button type="button" data-on={tab === 'pet' || undefined} onClick={() => { setTab('pet'); setTrial(null); }}><Smile className="w-4 h-4" /> คู่หู</button>
      </div>
      {tab === 'pet' ? <SpeciesPick ps={ps} today={today} onPicked={onPicked} /> : <>
      <div className="pr-chips">
        {slots.map((s) => (
          <button key={s.id} type="button" data-on={slot === s.id || undefined} onClick={() => { setSlot(s.id); setTrial(null); }}>{s.label}</button>
        ))}
      </div>
      {slot === 'color' ? (
        <div className="pr-colors">
          {look.species !== 'pung' && <p className="pr-note">เปลี่ยนสีได้เฉพาะตอนเลือกปุ๋งเป็นคู่หู</p>}
          {BUDDY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`สี${COLOR_LABEL[c]}`}
              aria-pressed={color === c}
              data-on={color === c || undefined}
              style={{ background: BUDDY_COLOR_HEX[c].body }}
              onClick={() => {
                setColor(c);
                petAct((p) => track(p, 'color', today));
                sfx.sparkle();
              }}
            />
          ))}
        </div>
      ) : (
        <div className="pr-shop">
          {list.length === 0 && <p className="pr-empty">รับของเทศกาลได้จากปุ่มซีซัน</p>}
          {list.map((it) => {
            const owned = ownsItem(ps.pet, it.id, legacyOpen);
            const on = isOn(it.id);
            const fail = owned ? null : buyCheck(ps, it.id);
            const trying = trial?.id === it.id;
            const hidden = it.season && !owned;
            if (hidden) return null;
            return (
              <div key={it.id} className="pr-item" data-on={on || undefined} data-try={trying || undefined}>
                <button type="button" className="pr-item-main" onClick={() => tap(it.id)} aria-pressed={on}>
                  {!isRoomSlot(it.slot) ? (
                    <Buddy stage={Math.max(1, look.stage)} color={look.color} species={look.species} wear={{ [it.slot]: it.id }} size={70} animate={false} />
                  ) : (
                    <RoomThumb id={it.id} />
                  )}
                  <span>{it.label}</span>
                  {on && <i className="pr-tick"><Check className="w-3.5 h-3.5" /></i>}
                </button>
                {owned ? (
                  <small className="pr-owned">{on ? 'ใช้อยู่' : 'มีแล้ว'}</small>
                ) : fail === 'season' ? (
                  <small className="pr-lock"><Lock className="w-3 h-3" /> {it.id === 'cap' ? '12 ดาวสะสม' : it.id === 'glasses' ? '25 ดาวสะสม' : it.id === 'crown' ? '60 ดาวสะสม' : 'มาเยี่ยม 3 วัน'}</small>
                ) : (it.lv || 1) > lv ? (
                  <small className="pr-lock"><Lock className="w-3 h-3" /> เลเวล {it.lv}</small>
                ) : (
                  <button
                    type="button"
                    className="pr-buy"
                    data-poor={fail === 'stars' || undefined}
                    disabled={fail === 'stars'}
                    onClick={() => {
                      let ok = false;
                      petAct((p) => {
                        const r = buy(p, it.id, today);
                        ok = r.ok;
                        return r.ok ? equip(r.ps, it.slot, it.id, today) : p;
                      });
                      if (ok) {
                        setTrial(null);
                        onBought();
                      }
                    }}
                  >
                    <StarIcon className="w-3.5 h-3.5" /> {it.price}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      </>}
    </div>
  );
}

/* ------------------------------ ภารกิจ ------------------------------ */

function MissionRowView({ m, onClaim, onGo }: { m: MissionRow; onClaim: (m: MissionRow) => void; onGo: (m: MissionRow) => void }) {
  const pct = Math.round((m.have / m.need) * 100);
  return (
    <li className="pr-mission" data-done={m.claimed || undefined}>
      <div className="pr-mission-text">
        <span>{m.text}{m.learn && <i className="pr-tag">เรียนรู้</i>}</span>
        <div className="pr-bar"><i style={{ width: `${pct}%` }} /></div>
        <small>{m.have}/{m.need}</small>
      </div>
      {m.claimed ? (
        <span className="pr-mission-ok"><Check className="w-5 h-5" /></span>
      ) : m.claimable ? (
        <button type="button" className="pr-claim" onClick={() => onClaim(m)}>รับ <StarIcon className="w-4 h-4" /> {m.stars}</button>
      ) : (
        <button type="button" className="pr-go" onClick={() => onGo(m)} disabled={!m.go}><StarIcon className="w-4 h-4" /> {m.stars}</button>
      )}
    </li>
  );
}

function MissionPanel({ rows, level, onClaim, onGo, onAll }: { rows: ReturnType<typeof missionRows>; level: ReturnType<typeof petLevel>; onClaim: (m: MissionRow) => void; onGo: (m: MissionRow) => void; onAll: () => void }) {
  const [tab, setTab] = useState<'day' | 'week' | 'ach'>('day');
  const list = tab === 'day' ? rows.daily : tab === 'week' ? rows.weekly : rows.achievements;
  return (
    <div>
      <p className="pr-lv-line">เลเวล {level.lv} · อีก {level.next - (level.from + Math.round(((level.next - level.from) * level.pct) / 100))} ดาวสะสมจะขึ้นเลเวล</p>
      <div className="pr-tabs">
        <button type="button" data-on={tab === 'day' || undefined} onClick={() => setTab('day')}>วันนี้</button>
        <button type="button" data-on={tab === 'week' || undefined} onClick={() => setTab('week')}>สัปดาห์นี้</button>
        <button type="button" data-on={tab === 'ach' || undefined} onClick={() => setTab('ach')}>ความสำเร็จ {rows.achDone}/{rows.achTotal}</button>
      </div>
      <ul className="pr-missions">
        {list.map((m) => <MissionRowView key={m.id} m={m} onClaim={onClaim} onGo={onGo} />)}
      </ul>
      {tab === 'day' && (
        <button type="button" className="pr-all" disabled={!rows.allBonus.ready} data-done={rows.allBonus.done || undefined} onClick={onAll}>
          {rows.allBonus.done ? 'รับโบนัสวันนี้แล้ว' : <>ทำครบทุกข้อ รับเพิ่ม <StarIcon className="w-4 h-4" /> {rows.allBonus.stars}</>}
        </button>
      )}
    </div>
  );
}

/* ------------------------------ ซีซัน ------------------------------ */

function SeasonPanel({ season, pts, got, onClaim }: { season: ReturnType<typeof seasonOfMonth>; pts: number; got: number[]; onClaim: () => void }) {
  const max = SEASON_STEPS[2];
  const ready = SEASON_STEPS.some((need, i) => pts >= need && !got.includes(i));
  return (
    <div>
      <div className="pr-season-head" style={{ background: `linear-gradient(120deg, ${season.c1}, ${season.c2})` }}>
        <b>{season.name}</b>
        <small>{season.line} · แต้ม {pts}/{max}</small>
      </div>
      <div className="pr-season-bar">
        <i style={{ width: `${Math.min(100, (pts / max) * 100)}%` }} />
      </div>
      <div className="pr-season-steps">
        {[
          { need: SEASON_STEPS[0], label: season.decor.label, art: <StickerArt id={season.decor.sticker} /> },
          { need: SEASON_STEPS[1], label: season.wear.label, art: <Buddy stage={1} wear={{ [season.wear.slot]: season.wear.id }} size={64} animate={false} /> },
          { need: SEASON_STEPS[2], label: `ดาว ${SEASON_STAR_PRIZE} ดวง`, art: <StarIcon className="w-14 h-14" /> },
        ].map((s, i) => (
          <div key={s.need} className="pr-season-step" data-got={got.includes(i) || undefined} data-ready={(pts >= s.need && !got.includes(i)) || undefined}>
            <span>{s.art}</span>
            <b>{s.label}</b>
            <small>{got.includes(i) ? 'ได้แล้ว' : `${s.need} แต้ม`}</small>
          </div>
        ))}
      </div>
      <button type="button" className="pr-btn pr-w-full" disabled={!ready} onClick={onClaim}>{ready ? 'รับรางวัล' : 'ตอบถูก ทำภารกิจ เล่นปริศนา ได้แต้ม'}</button>
      <p className="pr-note">ของเทศกาลได้จากการเล่นเท่านั้น ซื้อไม่ได้ ถ้าไม่ทันปีหน้ายังมีอีก</p>
    </div>
  );
}

/* ------------------------------ สมุดสติกเกอร์ ------------------------------ */

const FRAME: Record<number, string> = { 1: '#fff', 2: '#cbd5e1', 3: '#ffc53a' };

function AlbumPanel({ entitled, loggedIn, media, plays, syncStatus, onReset }: {
  entitled: boolean; loggedIn: boolean; media: ReturnType<typeof useCompanion>['media']; plays: ReturnType<typeof useCompanion>['state']['plays']; syncStatus: string; onReset: () => void;
}) {
  const stickers = media.map((m) => ({ m, c: plays[m.id]?.c || 0, tier: stickerTier(plays[m.id]?.c || 0) }));
  const collected = stickers.filter((s) => s.tier > 0).length;
  return (
    <div>
      <h3 className="pr-sheet-h"><BookImage className="w-5 h-5" /> สมุดสติกเกอร์ {collected}/{stickers.length}</h3>
      {!entitled ? (
        <div className="pr-member-note">
          <Crown className="w-6 h-6 text-sun-500" />
          <p>สติกเกอร์เกมและการเก็บข้อมูลข้ามเครื่องเป็นสิทธิ์ของสมาชิก ตอนนี้ปุ๋งของเธอเก็บในเครื่องนี้</p>
          <JoinButton className="pr-btn">สมัครสมาชิก</JoinButton>
          {!loggedIn && <Link className="pr-link" href="/login">มีบัญชีแล้ว เข้าสู่ระบบ</Link>}
        </div>
      ) : (
        <>
          <p className="pr-note">เล่นเกมครั้งแรกได้สติกเกอร์ ครบ {TIER_INFO[2].need} ครั้งได้ระดับเงิน ครบ {TIER_INFO[3].need} ครั้งได้ระดับทอง (นับใหม่เมื่อห่าง 10 นาที)</p>
          <ul className="pr-album">
            {stickers.map(({ m, c, tier }) => (
              <li key={m.id}>
                <span style={{ borderColor: tier ? FRAME[tier] : undefined }} data-none={!tier || undefined}>
                  <Image src={m.icon_url} alt={tier ? m.title : 'สติกเกอร์ที่ยังไม่ได้'} fill sizes="110px" className={tier ? 'object-cover' : 'object-cover brightness-0 opacity-25'} />
                </span>
                <small>{tier ? `${TIER_INFO[tier].label} · ${c} ครั้ง` : 'ยังไม่ได้'}</small>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="pr-sync">
        {entitled ? <><Cloud className="w-4 h-4" /> {syncStatus === 'saved' ? 'บันทึกกับบัญชีแล้ว' : syncStatus === 'error' || syncStatus === 'missing' ? 'ยังบันทึกขึ้นระบบไม่ได้ ข้อมูลอยู่ในเครื่องนี้' : 'กำลังบันทึก'}</> : <><HardDrive className="w-4 h-4" /> เก็บในเครื่องนี้</>}
      </p>
      <button type="button" className="pr-reset" onClick={onReset}><RotateCcw className="w-4 h-4" /> เริ่มเลี้ยงใหม่ทั้งหมด</button>
    </div>
  );
}

export type { NeedKey };

/** เวลาที่เหลือก่อนตื่น */
function wakeLeft(at: number, now: number) {
  const m = Math.max(1, Math.round((at - now) / 60000));
  return m >= 60 ? `${Math.floor(m / 60)} ชม. ${m % 60} นาที` : `${m} นาที`;
}
const ageDays = (born: number, now: number) => (born ? Math.max(0, Math.floor((now - born) / 86400000)) : 0);

/** ร่างกายคู่หู: อายุ ความสูง น้ำหนัก การนอน และคำแนะนำ */
function BodyPanel({ body, energy, look, now }: { body: { born: number; g: number; w: number; debt: number }; energy: number; look: React.ComponentProps<typeof Buddy>; now: number }) {
  const band = weightBand(body.w);
  const grow = Math.min(1, body.g / GROW_FULL);
  const tired = tiredLevel(energy, body.debt);
  const next = STAGE_DAYS.find((d) => d > body.g);
  const tip = tired ? 'ขอบตาดำแล้ว พาเข้านอนให้ครบ 8 ชั่วโมงนะ' : band === 'chubby' || band === 'round' ? 'ลดของหวาน เพิ่มผักผลไม้ แล้วชวนเล่นเกมรับผลไม้' : band === 'thin' ? 'ป้อนอาหารให้บ่อยขึ้นหน่อยนะ' : 'ดูแลดีมาก กินดี นอนพอ จะโตเร็วขึ้น';
  return (
    <div className="pr-body">
      <div className="pr-body-art"><Buddy {...look} size={110} animate={false} /></div>
      <div className="pr-body-rows">
        <p><b>อายุ</b> {ageDays(body.born, now)} วัน · {STAGE_LABEL[look.stage ?? 1]}</p>
        <p><b>สูง</b> {Math.round(18 + grow * 42)} ซม. {next != null ? `· โตขั้นต่อไปอีกราว ${Math.ceil(next - body.g)} วัน` : '· โตเต็มวัยแล้ว'}</p>
        <p><b>หนัก</b> {(3 + grow * 12) * (body.w / 50) >= 10 ? Math.round((3 + grow * 12) * (body.w / 50)) : ((3 + grow * 12) * (body.w / 50)).toFixed(1)} กก. · {WEIGHT_LABEL[band]}</p>
        <p><b>การนอน</b> {tired === 2 ? 'อดนอนมาก' : tired === 1 ? 'เริ่มอดนอน' : 'นอนเพียงพอ'}</p>
        <em>{tip}</em>
      </div>
    </div>
  );
}
