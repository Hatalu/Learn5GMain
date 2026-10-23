'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import {
  BarChart3,
  Check,
  Crown,
  Expand,
  Eye,
  Flag,
  Gamepad2,
  Loader2,
  MonitorPlay,
  Music,
  Palette,
  Play,
  Power,
  RotateCcw,
  Shrink,
  Shuffle,
  Trophy,
  Users,
  VolumeX,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { RoomBackdrop, bgIsLight } from '@/components/creator/RoomBackdrop';
import { Avatar } from '@/components/creator/Avatar';
import { PaperModal } from '@/components/creator/PaperModal';
import { BackgroundPicker } from '@/components/creator/live/BackgroundPicker';
import { Confetti, Medal, PlayerSession, podiumValue } from '@/components/creator/live/PlayerSession';
import { PodiumShow } from '@/components/creator/live/PodiumShow';
import { rememberBackground } from '@/components/creator/OpenGameModal';
import { subscribeRoom, type PlayerCreds } from '@/lib/game-creator/live-client';
import { DEFAULT_BG } from '@/lib/game-creator/backgrounds';
import type { PlayerPublic, RoomBackground, RoomMode, RoomSettings, RoomStatus } from '@/lib/game-creator/types';
import { modeById, type GameMode } from '@/lib/game-creator/modes';
import { RaceTrack } from '@/components/creator/games/RaceGame';
import { ModeSteps } from '@/components/creator/OpenGameModal';
import { gsfx, isGameMuted, setGameMuted } from '@/lib/game-creator/gsound';
import { releaseMusic, setMusic as playRoomMusic } from '@/lib/music';
import { roomTrack } from '@/lib/music-tracks';
import { MusicPicker, musicLabel } from '@/components/creator/live/MusicPicker';
import '@/components/creator/creator.css';
import '@/components/creator/creator-pages.css';

interface HostState {
  room: {
    id: string;
    code: string;
    title: string;
    status: RoomStatus;
    mode: RoomMode;
    background: RoomBackground;
    settings: RoomSettings;
    round: number;
    total: number;
    game: GameMode;
    startedAt: string | null;
  };
  serverNow?: number;
  players: PlayerPublic[];
  hostPlayerId: string | null;
  stats: { i: number; label: string; answered: number; correct: number }[] | null;
}

const ROW = 62;

function CodeTiles({ code, small }: { code: string; small?: boolean }) {
  return (
    <div className="l5g-codetiles" data-small={small ? 'true' : 'false'} aria-label={`เลขห้อง ${code}`}>
      {code.split('').map((d, i) => (
        <span key={i} style={{ animationDelay: `${i * 70}ms` }}>
          {d}
        </span>
      ))}
    </div>
  );
}

/** ค่าที่แสดงบนกระดานตามโหมด */
function boardValue(game: GameMode, p: PlayerPublic, goal: number) {
  return podiumValue(game, p, goal);
}
function boardSub(game: GameMode, p: PlayerPublic) {
  if (game === 'cafe') return `เสิร์ฟ ${p.stats.served || 0} จาน · ตอบถูก ${p.correct}`;
  if (game === 'tower') return `ผ่าน ${p.stats.waves || 0} เวฟ · ตอบถูก ${p.correct}`;
  if (game === 'racing') return `ตอบถูก ${p.correct} ข้อ`;
  if (game === 'brawl') return `เลเวล ${p.stats.level || 1} · ปราบ ${p.stats.kills || 0} ตัว`;
  if (game === 'fishing') return `ได้ปลา ${p.stats.fish || 0} ตัว · ตอบถูก ${p.correct}`;
  if (game === 'turf') return `ไอเท็ม ${p.stats.items || 0} ชิ้น · ตอบถูก ${p.correct}`;
  if (game === 'treasure') return `เปิดหีบ ${p.stats.chests || 0} ใบ · ตอบถูก ${p.correct}`;
  return '';
}

function Leaderboard({ players, total, onKick, game = 'quiz', goal = 0 }: { players: PlayerPublic[]; total: number; onKick?: (p: PlayerPublic) => void; game?: GameMode; goal?: number }) {
  const shown = players.slice(0, 60);
  return (
    <div className="l5g-board" style={{ height: Math.max(1, shown.length) * ROW }}>
      {shown.map((p, i) => (
        <div key={p.id} className="l5g-board-row" style={{ transform: `translateY(${i * ROW}px)` }} data-top={i < 3}>
          <span className="l5g-board-rank">{i + 1}</span>
          <Avatar id={p.avatar} gear={p.gear} size={40} />
          <span className="l5g-board-name">
            <b>{p.nickname}</b>
            {p.isHost && <span className="l5g-board-host">เจ้าของห้อง</span>}
            {game === 'quiz' || game === 'racing' ? (
              <span className="l5g-board-prog">
                <i style={{ width: `${game === 'racing' ? (goal ? (p.progress / goal) * 100 : 0) : total ? (p.answered / total) * 100 : 0}%` }} />
              </span>
            ) : (
              <small className="l5g-board-sub">{boardSub(game, p)}</small>
            )}
          </span>
          {p.finished ? (
            <span className="l5g-board-done" title="ทำครบแล้ว">
              <Flag className="w-4 h-4" />
            </span>
          ) : p.lastCorrect !== null ? (
            <span className="l5g-board-last" data-ok={p.lastCorrect}>
              {p.lastCorrect ? <Check className="w-4 h-4" strokeWidth={4} /> : <X className="w-4 h-4" strokeWidth={4} />}
            </span>
          ) : null}
          <span className="l5g-board-score">{boardValue(game, p, goal)}</span>
          {onKick && !p.isHost && (
            <button type="button" className="l5g-board-kick" onClick={() => onKick(p)} aria-label={`เชิญ ${p.nickname} ออก`}>
              <X className="w-3.5 h-3.5" strokeWidth={3} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function Podium({ players, game = 'quiz', goal = 0 }: { players: PlayerPublic[]; game?: GameMode; goal?: number }) {
  const order = [1, 0, 2];
  return (
    <div className="l5g-podium">
      {order.map((idx) => {
        const p = players[idx];
        if (!p) return <div key={idx} className="l5g-podium-col" />;
        return (
          <div key={p.id} className="l5g-podium-col" data-place={idx + 1} style={{ animationDelay: `${(2 - idx) * 0.45}s` }}>
            {idx === 0 && <Crown className="l5g-podium-crown w-9 h-9" />}
            <Avatar id={p.avatar} gear={p.gear} size={idx === 0 ? 96 : 76} mood="wow" />
            <b className="l5g-podium-name">{p.nickname}</b>
            <span className="l5g-podium-score">{boardValue(game, p, goal)}</span>
            <div className="l5g-podium-block">
              <Medal rank={idx + 1} size={idx === 0 ? 62 : 52} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HostInner() {
  const sp = useSearchParams();
  const roomId = sp.get('room') || '';
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [st, setSt] = useState<HostState | null>(null);
  const [err, setErr] = useState('');
  const [qr, setQr] = useState('');
  const [joinHost, setJoinHost] = useState('');
  const [view, setView] = useState<'host' | 'play'>('host');
  const [hostCreds, setHostCreds] = useState<PlayerCreds | null>(null);
  const [bgOpen, setBgOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [kick, setKick] = useState<PlayerPublic | null>(null);
  const [acting, setActing] = useState(false);
  const [music, setMusic] = useState(true);
  const [musicOpen, setMusicOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [full, setFull] = useState(false);
  const [tab, setTab] = useState<'rank' | 'stats'>('rank');
  const [live, setLive] = useState(false);
  const [bgLocal, setBgLocal] = useState<RoomBackground | null>(null);
  /** คัตซีนประกาศผล (เลขรอบที่กำลังโชว์) */
  const [show, setShow] = useState<number | null>(null);
  const prevCount = useRef(0);
  const prevStatus = useRef<RoomStatus | null>(null);

  const load = useCallback(
    async (withStats = false) => {
      if (!roomId) return;
      try {
        const r = await fetch(`/api/live/rooms/${roomId}${withStats ? '?stats=1' : ''}`, { cache: 'no-store' });
        const j = await r.json();
        if (!r.ok) {
          setErr(j.error || 'ไม่พบห้องนี้');
          return;
        }
        setErr('');
        setSt((old) => ({ ...(j as HostState), stats: (j as HostState).stats ?? old?.stats ?? null }));
      } catch {
        /* เน็ตสะดุด รอรอบถัดไป */
      }
    },
    [roomId]
  );

  useEffect(() => {
    if (!isLoading) load();
  }, [isLoading, load]);

  useEffect(() => {
    setJoinHost(window.location.host);
    setMuted(isGameMuted());
    const f = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);

  const status = st?.room.status;
  const code = st?.room.code;

  // QR สำหรับเข้าห้อง
  useEffect(() => {
    if (!code) return;
    const url = `${window.location.origin}/play?code=${code}`;
    QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 520, color: { dark: '#2a2350', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [code]);

  // ถามสถานะเป็นระยะ + ฟังสัญญาณผู้เล่นเข้า
  useEffect(() => {
    if (!status || status === 'closed') return;
    const ms = status === 'lobby' ? (live ? 4000 : 1600) : status === 'playing' ? 2000 : 6000;
    const iv = setInterval(() => load(tab === 'stats'), ms);
    return () => clearInterval(iv);
  }, [status, load, live, tab]);

  useEffect(() => {
    if (!roomId) return;
    return subscribeRoom(
      roomId,
      (e) => {
        if (e.event === 'join' || e.event === 'kick') load();
      },
      setLive
    );
  }, [roomId, load]);

  // เสียงคนเข้า / เปลี่ยนสถานะ
  useEffect(() => {
    if (!st) return;
    const n = st.players.length;
    if (n > prevCount.current && prevStatus.current !== null) gsfx.join();
    prevCount.current = n;
    if (prevStatus.current && prevStatus.current !== st.room.status) {
      if (st.room.status === 'ended') {
        // รอคะแนนสุดท้ายของทุกคนเข้ามาก่อน แล้วค่อยเริ่มคัตซีน 3 -> 2 -> 1
        const round = st.room.round;
        setTimeout(async () => {
          await load(true);
          setShow(round);
        }, 1200);
      }
    }
    prevStatus.current = st.room.status;
  }, [st, load]);

  // เพลงห้องรอ
  useEffect(() => {
    // เพลงของห้องดังที่จอหลักตอนรอและตอนเล่น (จบเกมให้คัตซีนเล่นเสียงของมันเอง)
    const track = st ? roomTrack(st.room.settings.music, st.room.game) : null;
    playRoomMusic('room', (status === 'lobby' || status === 'playing') && music && track ? track : null);
  }, [status, music, st?.room.settings.music, st?.room.game]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => releaseMusic('room'), []);

  // เจ้าของห้องเล่นด้วย: ขอโทเคนผู้เล่นของครู
  useEffect(() => {
    if (!st || st.room.mode !== 'play' || hostCreds) return;
    let saved: { id: string; token: string } | null = null;
    try {
      const raw = sessionStorage.getItem(`l5g_hostp_${st.room.id}`);
      saved = raw ? JSON.parse(raw) : null;
    } catch {
      /* ignore */
    }
    if (saved) {
      setHostCreds({ playerId: saved.id, token: saved.token, roomId: st.room.id, code: st.room.code });
      return;
    }
    fetch(`/api/live/rooms/${st.room.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hostToken' }) })
      .then((r) => r.json())
      .then((j) => {
        if (j.playerId) {
          try {
            sessionStorage.setItem(`l5g_hostp_${st.room.id}`, JSON.stringify({ id: j.playerId, token: j.token }));
          } catch {
            /* ignore */
          }
          setHostCreds({ playerId: j.playerId, token: j.token, roomId: st.room.id, code: st.room.code });
        }
      })
      .catch(() => null);
  }, [st, hostCreds]);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!st) return;
    setActing(true);
    try {
      const r = await fetch(`/api/live/rooms/${st.room.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErr(j.error || 'ทำรายการไม่สำเร็จ');
      await load(action === 'end');
      return r.ok;
    } finally {
      setActing(false);
    }
  };

  const start = async () => {
    gsfx.start();
    await act('start');
    if (st?.room.mode === 'play') setView('play');
  };

  const close = async () => {
    const ok = await act('close');
    if (ok !== false) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => null);
      router.push('/create?tab=library');
    }
  };

  const changeBg = async (bg: RoomBackground) => {
    setBgLocal(bg);
    rememberBackground(bg);
    await act('background', { background: bg });
    setBgLocal(null);
  };

  const toggleFull = () => {
    gsfx.tap();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => null);
    else document.documentElement.requestFullscreen?.().catch(() => null);
  };

  const [nowTick, setNowTick] = useState(Date.now());
  const offset = useRef(0);
  const autoEnded = useRef(false);
  useEffect(() => {
    if (st?.serverNow) offset.current = st.serverNow - Date.now();
  }, [st?.serverNow]);
  const duration = st?.room.settings.duration || 0;
  const timed = !!st && !!modeById(st.room.game).durations && st.room.status === 'playing' && !!st.room.startedAt && duration > 0;
  const timeLeft = timed ? new Date(st!.room.startedAt!).getTime() + duration * 1000 - (nowTick + offset.current) : 0;
  useEffect(() => {
    if (!timed) return;
    const iv = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(iv);
  }, [timed]);
  useEffect(() => {
    if (!timed) {
      autoEnded.current = false;
      return;
    }
    if (timeLeft <= -1500 && !autoEnded.current) {
      autoEnded.current = true;
      act('end');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timed, timeLeft]);

  const players = st?.players || [];
  const total = st?.room.total || 0;
  const finishedCount = players.filter((p) => p.finished).length;
  const accuracy = useMemo(() => {
    const a = players.reduce((s, p) => s + p.answered, 0);
    const c = players.reduce((s, p) => s + p.correct, 0);
    return a ? Math.round((c / a) * 100) : 0;
  }, [players]);

  if (!roomId) {
    return (
      <div className="l5g-stage">
        <RoomBackdrop bg={DEFAULT_BG} />
        <div className="l5g-stage-body">
          <div className="l5g-card l5g-card-pad text-center">
            <p className="font-bold">ไม่พบห้อง</p>
            <Link href="/create?tab=library" className="l5g-btn l5g-btn-go mt-3">
              กลับไปคลังเกม
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!st) {
    return (
      <div className="l5g-stage">
        <RoomBackdrop bg={DEFAULT_BG} />
        <div className="l5g-stage-body">
          {err || (!isLoading && !user) ? (
            <div className="l5g-card l5g-card-pad text-center">
              <p className="font-bold">{!user && !isLoading ? 'กรุณาเข้าสู่ระบบด้วยบัญชีที่เปิดห้องนี้' : err}</p>
              <Link href={user ? '/create?tab=library' : `/login?redirect=/create/host?room=${roomId}`} className="l5g-btn l5g-btn-go mt-3">
                {user ? 'กลับไปคลังเกม' : 'เข้าสู่ระบบ'}
              </Link>
            </div>
          ) : (
            <Loader2 className="w-10 h-10 animate-spin text-white" />
          )}
        </div>
      </div>
    );
  }

  const room = st.room;
  const bg = bgLocal || room.background;
  const light = bgIsLight(bg);

  if (room.status === 'closed') {
    return (
      <div className="l5g-stage" data-light={light}>
        <RoomBackdrop bg={bg} />
        <div className="l5g-stage-body">
          <div className="l5g-card l5g-card-pad text-center">
            <p className="font-display text-2xl">ห้องนี้ปิดแล้ว</p>
            <Link href="/create?tab=library" className="l5g-btn l5g-btn-go mt-4">
              กลับไปคลังเกม
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const showPlay = room.mode === 'play' && view === 'play' && hostCreds;

  return (
    <div className="l5g-stage l5g-host" data-light={light}>
      <RoomBackdrop bg={bg} />

      {/* ---------- แถบบน ---------- */}
      <header className="l5g-host-bar">
        <div className="l5g-host-title">
          <span className="l5g-pill">{room.status === 'lobby' ? 'รอผู้เล่น' : room.status === 'playing' ? 'กำลังเล่น' : 'จบเกม'}</span>
          <b className="truncate">{room.title}</b>
        </div>
        <span className="l5g-modechip l5g-modechip-sm" style={{ ['--mc' as string]: modeById(room.game).color }}>
          {modeById(room.game).name}
        </span>
        {timed && (
          <span className="l5g-pill l5g-timepill" data-urgent={timeLeft < 30000}>
            {Math.floor(Math.max(0, timeLeft) / 60000)}:{String(Math.floor((Math.max(0, timeLeft) % 60000) / 1000)).padStart(2, '0')}
          </span>
        )}
        <span className="l5g-pill" title="จำนวนผู้เล่น">
          <Users className="w-4 h-4" /> {players.length}
        </span>
        {room.mode === 'play' && (
          <div className="l5g-viewseg">
            <button type="button" data-on={view === 'host'} onClick={() => (gsfx.tap(), setView('host'))}>
              <MonitorPlay className="w-4 h-4" /> <span>จอหลัก</span>
            </button>
            <button type="button" data-on={view === 'play'} onClick={() => (gsfx.tap(), setView('play'))} disabled={!hostCreds}>
              <Gamepad2 className="w-4 h-4" /> <span>เล่นเกม</span>
            </button>
          </div>
        )}
        <span className="flex-1" />
        <button type="button" className="l5g-icon-btn" onClick={() => (gsfx.tap(), setBgOpen(true))} title="เปลี่ยนพื้นหลัง" aria-label="เปลี่ยนพื้นหลัง">
          <Palette className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="l5g-icon-btn"
          onClick={() => {
            // ปิด = ปิดทั้งเพลงและเสียงเอฟเฟกต์
            const on = !(music && !muted);
            setMusic(on);
            setGameMuted(!on);
            setMuted(!on);
          }}
          title={music && !muted ? 'ปิดเสียง' : 'เปิดเสียง'}
          aria-label="เปิดปิดเสียง"
        >
          {music && !muted ? <Music className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
        <button type="button" className="l5g-btn l5g-btn-ghost l5g-btn-sm l5g-musicbtn" onClick={() => (gsfx.tap(), setMusicOpen(true))} title="เลือกเพลงประกอบ">
          <Music className="w-4 h-4" /> <span className="hidden md:inline">{musicLabel(room.settings.music, room.game)}</span>
        </button>
        <button type="button" className="l5g-icon-btn hidden sm:inline-flex" onClick={toggleFull} title="เต็มจอ" aria-label="เต็มจอ">
          {full ? <Shrink className="w-5 h-5" /> : <Expand className="w-5 h-5" />}
        </button>
        <button type="button" className="l5g-btn l5g-btn-coral l5g-btn-sm" onClick={() => (gsfx.tap(), setConfirmClose(true))}>
          <Power className="w-4 h-4" /> <span className="hidden sm:inline">ปิดเกม</span>
        </button>
      </header>

      {err && (
        <div className="l5g-ebar-msgs">
          <div className="l5g-note l5g-note-err">
            {err}
            <button type="button" onClick={() => setErr('')} aria-label="ปิด">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="l5g-stage-body l5g-host-body">
        {showPlay ? (
          <PlayerSession creds={hostCreds!} hostMode onExit={() => setView('host')} />
        ) : room.status === 'lobby' ? (
          /* ---------- ห้องรอ ---------- */
          <div className="l5g-lobby">
            <div className="l5g-card l5g-joinpanel">
              <div className="l5g-joinpanel-text">
                <p className="l5g-joinpanel-step">
                  <span>1</span> เข้าเว็บ
                </p>
                <p className="l5g-joinpanel-url">{joinHost}</p>
                <p className="l5g-joinpanel-step mt-3">
                  <span>2</span> ใส่เลขห้อง
                </p>
                <CodeTiles code={room.code} />
              </div>
              <div className="l5g-joinpanel-or">หรือ</div>
              <div className="l5g-joinpanel-qr">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt={`QR Code เข้าห้อง ${room.code}`} />
                ) : (
                  <Loader2 className="w-8 h-8 animate-spin" />
                )}
                <span>สแกนเพื่อเข้าเล่น</span>
              </div>
            </div>

            <div className="l5g-lobby-players">
              {players.length === 0 ? (
                <p className="l5g-lobby-empty">
                  <Loader2 className="w-5 h-5 animate-spin" /> รอผู้เล่นเข้าห้อง…
                </p>
              ) : (
                players.map((p) => (
                  <button key={p.id} type="button" className="l5g-bubble" onClick={() => !p.isHost && setKick(p)} title={p.isHost ? 'คุณ' : 'แตะเพื่อเชิญออก'}>
                    <Avatar id={p.avatar} gear={p.gear} size={42} />
                    <span>{p.nickname}</span>
                    {p.isHost && <em>เจ้าของห้อง</em>}
                  </button>
                ))
              )}
            </div>

            {room.game !== 'quiz' && (
              <div className="l5g-card l5g-lobby-how">
                <b>วิธีเล่น {modeById(room.game).name}</b>
                <ModeSteps mode={room.game} />
              </div>
            )}

            <div className="l5g-lobby-actions">
              {room.game === 'quiz' && (

              <label className="l5g-switch l5g-switch-light">
                <input type="checkbox" checked={room.settings.shuffleQuestions} disabled={acting} onChange={(e) => act('settings', { settings: { ...room.settings, shuffleQuestions: e.target.checked } })} />
                <span className="l5g-switch-ui" />
                <Shuffle className="w-4 h-4" /> สลับคำถาม
              </label>
              )}
              {room.game === 'quiz' && (
              <label className="l5g-switch l5g-switch-light">
                <input type="checkbox" checked={room.settings.shuffleChoices} disabled={acting} onChange={(e) => act('settings', { settings: { ...room.settings, shuffleChoices: e.target.checked } })} />
                <span className="l5g-switch-ui" />
                <Shuffle className="w-4 h-4" /> สลับตัวเลือก
              </label>
              )}
              <label className="l5g-switch l5g-switch-light">
                <input type="checkbox" checked={room.settings.revealAnswer !== false} disabled={acting} onChange={(e) => act('settings', { settings: { ...room.settings, revealAnswer: e.target.checked } })} />
                <span className="l5g-switch-ui" />
                <Eye className="w-4 h-4" /> เฉลยเมื่อตอบผิด
              </label>
              <button type="button" className="l5g-btn l5g-btn-go l5g-btn-xl l5g-startbtn" disabled={acting || players.length === 0} onClick={start}>
                {acting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />} เริ่มเกม
              </button>
            </div>
          </div>
        ) : (
          /* ---------- กำลังเล่น / จบเกม ---------- */
          <div className="l5g-live">
            {room.status === 'ended' && players.length > 0 && (
              <>
                <Confetti key={room.round} />
                <Podium players={players} game={room.game} goal={room.settings.goal} />
              </>
            )}

            <div className="l5g-live-grid">
              <div className="l5g-card l5g-live-main">
                <div className="l5g-live-head">
                  {room.status === 'ended' ? (
                    <div className="l5g-tabs" style={{ margin: 0 }}>
                      <button type="button" className="l5g-tab" data-on={tab === 'rank'} onClick={() => setTab('rank')}>
                        อันดับทั้งหมด
                      </button>
                      <button
                        type="button"
                        className="l5g-tab"
                        data-on={tab === 'stats'}
                        onClick={() => {
                          setTab('stats');
                          load(true);
                        }}
                      >
                        <BarChart3 className="w-4 h-4 inline -mt-0.5" /> สรุปรายข้อ
                      </button>
                    </div>
                  ) : (
                    <h2 className="font-display text-xl">กระดานคะแนนสด</h2>
                  )}
                  <span className="flex-1" />
                  <span className="text-sm font-bold opacity-70">{room.game === 'racing' ? `เส้นชัย ${room.settings.goal} ก้าว` : total ? `${total} ข้อ` : modeById(room.game).scoreLabel}</span>
                </div>
                {tab === 'stats' && room.status === 'ended' ? (
                  <div className="l5g-qstats">
                    {(st.stats || []).map((s) => {
                      const pct = s.answered ? Math.round((s.correct / s.answered) * 100) : 0;
                      return (
                        <div key={s.i} className="l5g-qstat">
                          <span className="l5g-qstat-num">{s.i + 1}</span>
                          <span className="l5g-qstat-label">{s.label}</span>
                          <span className="l5g-qstat-bar" data-level={pct >= 70 ? 'good' : pct >= 40 ? 'mid' : 'low'}>
                            <i style={{ width: `${pct}%` }} />
                          </span>
                          <b className="l5g-qstat-pct">{s.answered ? `${pct}%` : '-'}</b>
                        </div>
                      );
                    })}
                    {!st.stats && <Loader2 className="w-6 h-6 animate-spin mx-auto" />}
                    <p className="text-xs font-bold opacity-60 mt-2">เปอร์เซ็นต์ตอบถูกของแต่ละข้อ ข้อสีแดงคือเรื่องที่ควรสอนเพิ่ม</p>
                  </div>
                ) : players.length ? (
                  <div className="l5g-board-scroll">
                    {room.game === 'racing' && (
                      <div className="mb-3">
                        <RaceTrack big goal={room.settings.goal} racers={players.map((p) => ({ id: p.id, nickname: p.nickname, avatar: p.avatar, gear: p.gear, progress: p.progress, finished: p.finished }))} />
                      </div>
                    )}
                    <Leaderboard players={players} total={total} game={room.game} goal={room.settings.goal} onKick={room.status === 'playing' ? setKick : undefined} />
                  </div>
                ) : (
                  <p className="font-bold opacity-60 py-6 text-center">ยังไม่มีผู้เล่น</p>
                )}
              </div>

              <div className="l5g-live-side">
                {room.status === 'playing' && (
                  <div className="l5g-card l5g-latejoin">
                    <p className="font-bold text-sm">ยังเข้าร่วมได้</p>
                    <CodeTiles code={room.code} small />
                    {qr && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qr} alt="QR Code เข้าห้อง" />
                    )}
                  </div>
                )}
                <div className="l5g-card l5g-livestats">
                  <span>
                    <b>{players.length}</b>ผู้เล่น
                  </span>
                  <span>
                    <b>{finishedCount}</b>ทำครบ
                  </span>
                  <span>
                    <b>{accuracy}%</b>ตอบถูก
                  </span>
                </div>
                {room.status === 'playing' ? (
                  <button type="button" className="l5g-btn l5g-btn-go l5g-btn-xl w-full" onClick={() => (gsfx.tap(), setConfirmEnd(true))} disabled={acting}>
                    <Flag className="w-6 h-6" /> จบเกม &amp; ประกาศผล
                  </button>
                ) : (
                  <>
                    {players.length > 0 && (
                      <button type="button" className="l5g-btn l5g-btn-go w-full" onClick={() => (gsfx.tap(), setShow(room.round))}>
                        <Trophy className="w-5 h-5" /> ดูประกาศผลอีกครั้ง
                      </button>
                    )}
                    <button type="button" className="l5g-btn l5g-btn-mint l5g-btn-xl w-full" onClick={() => act('reset')} disabled={acting}>
                      <RotateCcw className="w-6 h-6" /> เล่นอีกรอบ
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {show !== null && show === room.round && room.status === 'ended' && players.length > 0 && (
        <PodiumShow
          key={show}
          top={players.slice(0, 3).map((p) => ({ id: p.id, nickname: p.nickname, avatar: p.avatar, gear: p.gear, value: boardValue(room.game, p, room.settings.goal) }))}
          label={modeById(room.game).scoreLabel}
          doneText="ดูอันดับทั้งหมด"
          onDone={() => setShow(null)}
        />
      )}

      {musicOpen && (
        <PaperModal title="เพลงประกอบ" icon={<Music className="w-5 h-5" />} iconBg="#9b6cf0" onClose={() => setMusicOpen(false)} width={640}>
          <MusicPicker value={room.settings.music || 'auto'} mode={room.game} onPick={(v) => act('music', { music: v })} />
          <label className="l5g-switch mt-3">
            <input type="checkbox" checked={room.settings.musicPlayers !== false} disabled={acting} onChange={(e) => act('music', { music: room.settings.music, musicPlayers: e.target.checked })} />
            <span className="l5g-switch-ui" />
            เปิดเพลงในเครื่องผู้เล่นด้วย
          </label>
          <div className="l5g-math-foot">
            <span className="flex-1" />
            <button type="button" className="l5g-btn l5g-btn-go" onClick={() => setMusicOpen(false)}>
              เรียบร้อย
            </button>
          </div>
        </PaperModal>
      )}

      {bgOpen && user && <BackgroundPicker value={bg} userId={user.id} onPick={changeBg} onClose={() => setBgOpen(false)} />}

      {confirmClose && (
        <PaperModal title="ปิดเกมนี้?" icon={<Power className="w-5 h-5" />} iconBg="#ff6b7a" onClose={() => setConfirmClose(false)} busy={acting}>
          <p className="font-semibold">ผู้เล่นทุกคนจะออกจากห้อง และเลข {room.code} จะใช้ไม่ได้อีก</p>
          <div className="l5g-math-foot">
            <span className="flex-1" />
            <button type="button" className="l5g-btn l5g-btn-ghost" onClick={() => setConfirmClose(false)} disabled={acting}>
              ยังก่อน
            </button>
            <button type="button" className="l5g-btn l5g-btn-coral" onClick={close} disabled={acting}>
              {acting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Power className="w-5 h-5" />} ปิดเกม
            </button>
          </div>
        </PaperModal>
      )}

      {confirmEnd && (
        <PaperModal title="จบเกมและประกาศผล?" icon={<Flag className="w-5 h-5" />} iconBg="#ffcf3f" onClose={() => setConfirmEnd(false)} busy={acting}>
          <p className="font-semibold">
            ทำครบแล้ว {finishedCount} จาก {players.length} คน คนที่ยังไม่เสร็จจะหยุดที่คะแนนตอนนี้
          </p>
          <div className="l5g-math-foot">
            <span className="flex-1" />
            <button type="button" className="l5g-btn l5g-btn-ghost" onClick={() => setConfirmEnd(false)} disabled={acting}>
              รอก่อน
            </button>
            <button
              type="button"
              className="l5g-btn l5g-btn-go"
              disabled={acting}
              onClick={async () => {
                await act('end');
                setConfirmEnd(false);
                setView('host');
                setTab('rank');
              }}
            >
              <Flag className="w-5 h-5" /> ประกาศผล
            </button>
          </div>
        </PaperModal>
      )}

      {kick && (
        <PaperModal title="เชิญออกจากห้อง?" icon={<X className="w-5 h-5" />} iconBg="#ff9a3d" onClose={() => setKick(null)} busy={acting}>
          <div className="flex items-center gap-3">
            <Avatar id={kick.avatar} size={56} mood="sad" />
            <p className="font-semibold">&quot;{kick.nickname}&quot; จะออกจากห้อง (เข้าใหม่ได้ด้วยชื่ออื่น)</p>
          </div>
          <div className="l5g-math-foot">
            <span className="flex-1" />
            <button type="button" className="l5g-btn l5g-btn-ghost" onClick={() => setKick(null)}>
              ยกเลิก
            </button>
            <button
              type="button"
              className="l5g-btn l5g-btn-coral"
              disabled={acting}
              onClick={async () => {
                await act('kick', { playerId: kick.id });
                setKick(null);
              }}
            >
              เชิญออก
            </button>
          </div>
        </PaperModal>
      )}
    </div>
  );
}

export default function HostPage() {
  return (
    <Suspense fallback={null}>
      <HostInner />
    </Suspense>
  );
}
