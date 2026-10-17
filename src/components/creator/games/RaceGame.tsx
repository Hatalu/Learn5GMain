'use client';

import './games.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, LogOut, Trophy } from 'lucide-react';
import { Avatar } from '../Avatar';
import { Banana, Bolt, Flag } from './art';
import { QuestionPad } from './QuestionPad';
import { CoachArrow, useCoach } from './Coach';
import type { GameProps } from './types';
import type { LiveOutcome, Rival } from '@/lib/game-creator/live-client';
import { gsfx } from '@/lib/game-creator/gsound';

export interface RaceLive {
  myId: string;
  progress: number;
  rivals: Rival[];
  power: string | null;
  slipAt: string | null;
  rank: number;
  players: number;
  usePower: () => Promise<{ ok: boolean; power?: string; progress?: number; target?: string; reason?: string }>;
  onOutcome?: (o: LiveOutcome) => void;
}

const BOT_NAMES = ['จรวดน้อย', 'สายฟ้า', 'ลมกรด', 'เต่าซิ่ง'];

/** ลู่วิ่ง: แต่ละเลนคือผู้เล่นหนึ่งคน (ใช้ทั้งจอผู้เล่นและจอหลัก) */
export function RaceTrack({ racers, goal, meId, big = false }: { racers: (Rival & { boost?: boolean; slip?: boolean })[]; goal: number; meId?: string; big?: boolean }) {
  return (
    <div className="rc-track" data-big={big}>
      <div className="rc-finish" aria-hidden="true" />
      {racers.map((r, i) => {
        const pct = Math.min(100, (r.progress / Math.max(1, goal)) * 100);
        const me = r.id === meId;
        return (
          <div key={r.id} className="rc-lane" data-me={me} data-done={r.finished}>
            <span className="rc-lane-no">{i + 1}</span>
            <div className="rc-lane-road">
              <div className="rc-runner" style={{ left: `calc(${pct}% * 0.9)` }} data-boost={!!r.boost} data-slip={!!r.slip}>
                <span className="rc-runner-body">
                  <Avatar id={r.avatar} gear={r.gear} size={big ? 46 : 38} mood={r.slip ? 'sad' : r.finished ? 'wow' : 'happy'} />
                </span>
                <span className="rc-runner-name">{me ? 'ฉัน' : r.nickname}</span>
                {r.finished && <Trophy className="rc-runner-cup w-4 h-4" />}
              </div>
            </div>
            <span className="rc-lane-flag">
              <Flag size={big ? 18 : 14} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function RaceGame({ engine, goal, me, preview, live, onLeave }: GameProps & { live?: RaceLive }) {
  const [hidePad, setHidePad] = useState(false);
  const myId = live?.myId || 'me';
  // ---------- ทดลองเล่น: วิ่งกับบอท ----------
  const [bots, setBots] = useState<Rival[]>(() => BOT_NAMES.map((n, i) => ({ id: `bot${i}`, nickname: n, avatar: (i * 3 + 2) % 12, progress: 0, finished: false })));
  const [localProgress, setLocalProgress] = useState(0);
  const [localPower, setLocalPower] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [fx, setFx] = useState<{ kind: 'boost' | 'slip' | 'step' | 'banana'; text: string; at: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const lastSlip = useRef<string | null>(live?.slipAt || null);
  const rootRef = useRef<HTMLDivElement>(null);

  const progress = live ? live.progress : localProgress;
  const power = live ? live.power : localPower;
  const finished = progress >= goal;

  useEffect(() => {
    if (live || finished) return;
    const iv = setInterval(() => {
      setBots((bs) =>
        bs.map((b, i) => {
          if (b.progress >= goal || Math.random() > 0.38 + i * 0.05) return b;
          const p = Math.min(goal, b.progress + 1);
          return { ...b, progress: p, finished: p >= goal };
        })
      );
    }, 1600);
    return () => clearInterval(iv);
  }, [live, finished, goal]);

  // โดนกล้วย (แจ้งจากเซิร์ฟเวอร์)
  useEffect(() => {
    if (!live?.slipAt || live.slipAt === lastSlip.current) return;
    lastSlip.current = live.slipAt;
    gsfx.slip();
    setFx({ kind: 'slip', text: 'โดนกล้วย! ถอย 1 ก้าว', at: Date.now() });
  }, [live?.slipAt]);

  useEffect(() => {
    if (!fx) return;
    const t = setTimeout(() => setFx(null), 1500);
    return () => clearTimeout(t);
  }, [fx]);

  // สอนเล่น: ตอบถูก = ก้าว / มีไอเท็มให้กดใช้ (1 รอบ)
  const coach = useCoach(
    [
      { id: 'answer', target: ['.rc-pad-in .l5g-qp-choices', '.rc-pad-open'], text: 'เลือกตัวเลือก ตอบถูกวิ่งไปข้างหน้า 1 ก้าว', texts: ['เลือกตัวเลือก ตอบถูกวิ่งไปข้างหน้า 1 ก้าว', 'กดตรงนี้ เพื่อเปิดคำถาม'] },
      { id: 'power', target: '.rc-power', text: 'ได้ไอเท็มแล้ว! กดใช้เลย', when: () => !!power, optional: true },
    ],
    { loops: 1, active: !finished }
  );

  const racers = useMemo(() => {
    const mine: Rival = { id: myId, nickname: me.nickname, avatar: me.avatar, gear: me.gear, progress, finished };
    const list = live ? live.rivals.map((r) => (r.id === myId ? { ...r, progress, finished } : r)) : [mine, ...bots];
    if (!list.some((r) => r.id === myId)) list.push(mine);
    return list
      .slice()
      .sort((a, b) => b.progress - a.progress)
      .map((r) => ({ ...r, boost: r.id === myId && fx?.kind === 'boost', slip: r.id === myId && fx?.kind === 'slip' }));
  }, [live, bots, myId, me, progress, finished, fx]);

  const rank = live ? live.rank : racers.findIndex((r) => r.id === myId) + 1;
  const players = live ? live.players : racers.length;

  const onAnswered = (o: LiveOutcome) => {
    if (o.correct) coach.hit('answer');
    if (live) {
      live.onOutcome?.(o);
      if (o.correct) {
        gsfx.step();
        setFx({ kind: 'step', text: '+1 ก้าว', at: Date.now() });
      }
      if (o.gotPower) setTimeout(() => (gsfx.sparkleish(), setFx({ kind: 'boost', text: o.gotPower === 'boost' ? 'ได้ บูสต์!' : 'ได้ กล้วย!', at: Date.now() })), 400);
      return;
    }
    if (o.correct) {
      gsfx.step();
      setLocalProgress((p) => Math.min(goal, p + 1));
      const s = streak + 1;
      setStreak(s);
      setFx({ kind: 'step', text: '+1 ก้าว', at: Date.now() });
      if (s % 3 === 0 && !localPower) setLocalPower(Math.random() < 0.5 ? 'boost' : 'banana');
    } else setStreak(0);
  };

  const usePower = async () => {
    if (!power || busy) return;
    coach.hit('power');
    setBusy(true);
    if (live) {
      const r = await live.usePower().catch(() => ({ ok: false, reason: '' }) as { ok: boolean; reason?: string; target?: string; power?: string });
      if (r.ok && r.power === 'boost') {
        gsfx.boost();
        setFx({ kind: 'boost', text: 'บูสต์! +2 ก้าว', at: Date.now() });
      } else if (r.ok) {
        gsfx.slip();
        setFx({ kind: 'banana', text: `ปากล้วยใส่ ${r.target}!`, at: Date.now() });
      } else if (r.reason === 'ahead') setFx({ kind: 'banana', text: 'ไม่มีใครนำหน้า เก็บไว้ก่อน', at: Date.now() });
    } else if (power === 'boost') {
      gsfx.boost();
      setLocalProgress((p) => Math.min(goal, p + 2));
      setLocalPower(null);
      setFx({ kind: 'boost', text: 'บูสต์! +2 ก้าว', at: Date.now() });
    } else {
      const ahead = bots.filter((b) => b.progress > localProgress && !b.finished).sort((a, b) => a.progress - b.progress)[0];
      if (ahead) {
        setBots((bs) => bs.map((b) => (b.id === ahead.id ? { ...b, progress: Math.max(0, b.progress - 1) } : b)));
        setLocalPower(null);
        gsfx.slip();
        setFx({ kind: 'banana', text: `ปากล้วยใส่ ${ahead.nickname}!`, at: Date.now() });
      } else setFx({ kind: 'banana', text: 'ไม่มีใครนำหน้า เก็บไว้ก่อน', at: Date.now() });
    }
    setBusy(false);
  };

  return (
    <div className="rc" ref={rootRef}>
      <CoachArrow coach={coach} root={rootRef} />
      <RaceTrack racers={racers} goal={goal} meId={myId} />

      <div className="rc-hud">
        <span className="cf-chip rc-steps">
          ก้าว <b>{progress}</b>/{goal}
        </span>
        <span className="cf-chip">
          <Trophy className="w-4 h-4" /> อันดับ {rank}/{players}
        </span>
        <span className="flex-1" />
        {power ? (
          <button type="button" className="rc-power" data-kind={power} onClick={usePower} disabled={busy || finished}>
            {power === 'boost' ? <Bolt size={26} /> : <Banana size={26} />}
            <span>{power === 'boost' ? 'บูสต์ +2' : 'ปากล้วย'}</span>
          </button>
        ) : (
          <span className="rc-power-hint">ถูกติดกัน 3 ข้อ ได้ไอเท็ม</span>
        )}
        {!finished && (
          <button type="button" className="rc-padtoggle" onClick={() => (gsfx.tap(), setHidePad((h) => !h))} aria-expanded={!hidePad}>
            {hidePad ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {hidePad ? 'ตอบคำถาม' : 'ซ่อนคำถาม'}
          </button>
        )}
      </div>

      {!finished ? (
        <div className="rc-pad" data-hidden={hidePad}>
          {hidePad ? (
            <button type="button" className="l5g-btn l5g-btn-go l5g-btn-xl rc-pad-open" onClick={() => (gsfx.tap(), setHidePad(false))}>
              <ChevronUp className="w-6 h-6" /> ตอบคำถามเพื่อวิ่งต่อ
            </button>
          ) : null}
          <div className="rc-pad-in" hidden={hidePad}>
            <QuestionPad engine={engine} onAnswered={onAnswered} lockMs={1500} rewardText={() => 'ถูก! วิ่งไปข้างหน้า'} />
          </div>
        </div>
      ) : (
        <div className="rc-done">
          <div className="rc-done-cup">
            <Flag size={40} />
          </div>
          <b>เข้าเส้นชัยแล้ว!</b>
          <p>อันดับ {rank} จาก {players} คน</p>
          <p className="gm-over-wait">{preview ? 'นี่คือการทดลองเล่น' : 'รอเพื่อนๆ วิ่งให้ถึงเส้นชัยนะ'}</p>
          {onLeave && (
            <button type="button" className="l5g-btn l5g-btn-ghost l5g-btn-sm mt-2" onClick={onLeave}>
              <LogOut className="w-4 h-4" /> ออกจากห้อง
            </button>
          )}
        </div>
      )}

      {fx && fx.kind !== 'step' && (
        <div className="rc-fx" data-kind={fx.kind} key={fx.at}>
          {fx.kind === 'slip' || fx.kind === 'banana' ? <Banana size={40} /> : <Bolt size={40} />}
          <b>{fx.text}</b>
        </div>
      )}
    </div>
  );
}
