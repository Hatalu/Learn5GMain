'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Hourglass, Loader2, LogOut, Trophy } from 'lucide-react';
import { Avatar } from '../Avatar';
import { QuizRunner } from '../quiz/QuizRunner';
import { LiveError, liveEngine, playerApi, subscribeRoom, type PlayerCreds, type PlayerStateRes } from '@/lib/game-creator/live-client';
import type { RoomBackground } from '@/lib/game-creator/types';
import { gsfx } from '@/lib/game-creator/gsound';

export function Medal({ rank, size = 96 }: { rank: number; size?: number }) {
  const c = rank === 1 ? ['#ffd84a', '#f5a50f'] : rank === 2 ? ['#e8ecf5', '#a9b3c9'] : rank === 3 ? ['#ffc28a', '#d27a32'] : ['#e3d4ff', '#9b6cf0'];
  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2} aria-hidden="true">
      <path d="M30 0 L48 44 L36 50 L18 4 Z" fill="#ff6b7a" stroke="#2a2350" strokeWidth="4" strokeLinejoin="round" />
      <path d="M70 0 L52 44 L64 50 L82 4 Z" fill="#4a7bf0" stroke="#2a2350" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="50" cy="76" r="38" fill={c[1]} stroke="#2a2350" strokeWidth="5" />
      <circle cx="50" cy="76" r="28" fill={c[0]} stroke="#2a2350" strokeWidth="3" />
      <text x="50" y="88" textAnchor="middle" fontSize={rank > 99 ? 22 : rank > 9 ? 28 : 34} fontWeight="800" fill="#2a2350" fontFamily="var(--font-mitr), sans-serif">
        {rank}
      </text>
    </svg>
  );
}

export function Confetti() {
  const bits = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ x: Math.random() * 100, d: Math.random() * 1.6, r: Math.random() * 360, c: ['#ff6b7a', '#4a7bf0', '#ffcf3f', '#3fd6a8', '#9b6cf0'][i % 5] })), []);
  return (
    <div className="l5g-confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} style={{ left: `${b.x}%`, animationDelay: `${b.d}s`, background: b.c, transform: `rotate(${b.r}deg)` }} />
      ))}
    </div>
  );
}

/**
 * หน้าจอของผู้เล่นหนึ่งคนในห้อง (ใช้ทั้งหน้า /play และครูที่เลือก "เล่นเกมนี้ด้วย")
 */
export function PlayerSession({
  creds,
  onExit,
  onBackground,
  hostMode = false,
}: {
  creds: PlayerCreds;
  onExit: (reason: 'left' | 'kicked' | 'gone' | 'closed') => void;
  onBackground?: (bg: RoomBackground) => void;
  hostMode?: boolean;
}) {
  const [st, setSt] = useState<PlayerStateRes | null>(null);
  const [err, setErr] = useState('');
  const [live, setLive] = useState(false);
  const [running, setRunning] = useState(false);
  const [final, setFinal] = useState<number | null>(null);
  const stRef = useRef<PlayerStateRes | null>(null);
  const runningRef = useRef(false);
  runningRef.current = running;
  const c = useMemo(() => ({ playerId: creds.playerId, token: creds.token }), [creds.playerId, creds.token]);

  const apply = useCallback(
    (s: PlayerStateRes) => {
      const prev = stRef.current;
      stRef.current = s;
      setSt(s);
      onBackground?.(s.room.background);
      if (prev && prev.room.status !== s.room.status) {
        if (s.room.status === 'playing') gsfx.start();
        if (s.room.status === 'ended') gsfx.fanfare();
      }
      if (s.room.status === 'closed') onExit('closed');
    },
    [onBackground, onExit]
  );

  const handleErr = useCallback(
    (e: unknown) => {
      if (e instanceof LiveError) {
        if (e.kicked) return onExit('kicked');
        if (e.gone) return onExit('gone');
        setErr(e.message);
      }
    },
    [onExit]
  );

  const refresh = useCallback(async () => {
    try {
      const s = await playerApi.state(c);
      setErr('');
      apply(s);
    } catch (e) {
      handleErr(e);
    }
  }, [c, apply, handleErr]);

  /** ระหว่างตอบคำถามใช้ peek (ไม่ไปเริ่มจับเวลาข้อถัดไปก่อนเวลา) */
  const peek = useCallback(async () => {
    try {
      const p = await playerApi.peek(c);
      const cur = stRef.current;
      onBackground?.(p.background);
      if (!cur || p.status !== cur.room.status || p.round !== cur.room.round) {
        if (runningRef.current && p.status === 'playing' && cur && p.round === cur.room.round) return;
        setRunning(false);
        await refresh();
      }
    } catch (e) {
      handleErr(e);
    }
  }, [c, refresh, handleErr, onBackground]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // สัญญาณทันทีจาก Realtime
  useEffect(() => {
    return subscribeRoom(
      creds.roomId,
      (e) => {
        if (e.event === 'kick' && e.payload.playerId === creds.playerId) onExit('kicked');
        else if (e.event === 'bg' && e.payload.background) onBackground?.(e.payload.background as RoomBackground);
        else if (e.event === 'status') {
          if (e.payload.status !== 'playing') setRunning(false);
          refresh();
        }
      },
      setLive
    );
  }, [creds.roomId, creds.playerId, refresh, onExit, onBackground]);

  // ถามสถานะเป็นระยะ (ถี่ขึ้นถ้า Realtime ใช้ไม่ได้)
  const status = st?.room.status;
  const finished = !!st?.me.finished;
  useEffect(() => {
    if (!status) return;
    const ms = live ? (status === 'playing' && finished ? 6000 : 15000) : status === 'playing' && !finished ? 8000 : 3500;
    const iv = setInterval(() => (runningRef.current ? peek() : refresh()), ms);
    return () => clearInterval(iv);
  }, [status, finished, live, peek, refresh]);

  useEffect(() => {
    if (status === 'playing' && !finished) setRunning(true);
    if (status !== 'playing') setRunning(false);
  }, [status, finished]);

  const engine = useMemo(() => liveEngine(c, (s) => (stRef.current = s, setSt(s), onBackground?.(s.room.background))), [c, onBackground]);

  const leave = async () => {
    gsfx.tap();
    await playerApi.leave(c);
    onExit('left');
  };

  if (!st) {
    return (
      <div className="l5g-run-center">
        {err ? (
          <div className="l5g-card l5g-card-pad text-center">
            <p className="font-bold">{err}</p>
            <button type="button" className="l5g-btn l5g-btn-go mt-3" onClick={refresh}>
              ลองใหม่
            </button>
          </div>
        ) : (
          <Loader2 className="w-10 h-10 animate-spin text-white drop-shadow" />
        )}
      </div>
    );
  }

  const me = st.me;

  if (st.room.status === 'playing' && running) {
    return (
      <QuizRunner
        key={`${st.room.round}`}
        engine={engine}
        score={me.score}
        streak={me.streak}
        countdown={me.pos === 0 && me.answered === 0}
        onFinished={({ score }) => {
          setFinal(score);
          setRunning(false);
          gsfx.fanfare();
          refresh();
        }}
      />
    );
  }

  if (st.room.status === 'lobby') {
    return (
      <div className="l5g-run-center l5g-lobby-me">
        <div className="l5g-me-avatar">
          <Avatar id={me.avatar} size={140} />
        </div>
        <p className="l5g-me-name">{me.nickname}</p>
        <div className="l5g-card l5g-wait">
          <Hourglass className="w-6 h-6 l5g-spin-slow" />
          <div>
            <b>{hostMode ? 'กด "เริ่มเกม" เมื่อพร้อม' : 'เข้าห้องแล้ว รอครูเริ่มเกมนะ'}</b>
            <p className="text-sm font-semibold opacity-70">{st.room.title}</p>
          </div>
        </div>
        {!hostMode && (
          <button type="button" className="l5g-btn l5g-btn-ghost l5g-btn-sm mt-2" onClick={leave}>
            <LogOut className="w-4 h-4" /> ออกจากห้อง
          </button>
        )}
      </div>
    );
  }

  if (st.room.status === 'ended') {
    const top = me.rank > 0 && me.rank <= 3;
    return (
      <div className="l5g-run-center l5g-result">
        {top && <Confetti />}
        <p className="l5g-result-label">{top ? 'สุดยอดมาก!' : 'เก่งมาก!'}</p>
        <div className="l5g-result-medal">
          <Medal rank={me.rank || 1} size={120} />
        </div>
        <div className="l5g-card l5g-result-card">
          <div className="flex items-center gap-3">
            <Avatar id={me.avatar} size={56} mood="wow" />
            <div className="min-w-0">
              <p className="font-display text-xl truncate">{me.nickname}</p>
              <p className="font-bold opacity-75">
                อันดับ {me.rank} จาก {me.players} คน
              </p>
            </div>
          </div>
          <div className="l5g-result-stats">
            <span>
              <b>{me.score.toLocaleString('th-TH')}</b>คะแนน
            </span>
            <span>
              <b>
                {me.correct}/{st.room.total}
              </b>
              ข้อที่ถูก
            </span>
          </div>
        </div>
        {!hostMode && <p className="text-white font-bold mt-3 drop-shadow">รอครูปิดห้อง หรือเริ่มรอบใหม่</p>}
      </div>
    );
  }

  // เล่นครบแล้ว รอเพื่อน
  return (
    <div className="l5g-run-center l5g-result">
      <div className="l5g-me-avatar">
        <Avatar id={me.avatar} size={120} mood="happy" />
      </div>
      <div className="l5g-card l5g-result-card">
        <p className="font-display text-2xl text-center">ทำครบทุกข้อแล้ว!</p>
        <div className="l5g-result-stats">
          <span>
            <b>{(final ?? me.score).toLocaleString('th-TH')}</b>คะแนน
          </span>
          <span>
            <b>
              {me.correct}/{st.room.total}
            </b>
            ข้อที่ถูก
          </span>
          {me.rank > 0 && (
            <span>
              <b>
                <Trophy className="w-5 h-5 inline -mt-1" /> {me.rank}
              </b>
              อันดับตอนนี้
            </span>
          )}
        </div>
        <p className="text-center font-semibold opacity-70 mt-3">รอเพื่อนๆ ทำให้เสร็จ แล้วครูจะประกาศผล</p>
      </div>
    </div>
  );
}
