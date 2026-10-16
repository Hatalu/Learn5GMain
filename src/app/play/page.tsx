'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, DoorOpen, Home, Loader2, Shuffle, Volume2, VolumeX } from 'lucide-react';
import { RoomBackdrop, bgIsLight } from '@/components/creator/RoomBackdrop';
import { CodeInput } from '@/components/creator/CodeInput';
import { Avatar, CRITTERS } from '@/components/creator/Avatar';
import { PlayerSession } from '@/components/creator/live/PlayerSession';
import { DEFAULT_BG } from '@/lib/game-creator/backgrounds';
import { NICK_MAX, cleanNickname, isRoomCode } from '@/lib/game-creator/templates';
import { LiveError, clearCreds, loadCreds, playerApi, saveCreds, type PlayerCreds } from '@/lib/game-creator/live-client';
import type { RoomBackground } from '@/lib/game-creator/types';
import { gsfx, isGameMuted, setGameMuted } from '@/lib/game-creator/gsound';
import '@/components/creator/creator.css';
import '@/components/creator/creator-pages.css';

type Step = 'code' | 'name' | 'room' | 'bye';
const NICK_KEY = 'l5g_nick';

const BYE: Record<string, { t: string; d: string }> = {
  closed: { t: 'ปิดห้องแล้ว', d: 'ขอบคุณที่มาเล่นด้วยกันนะ' },
  kicked: { t: 'ออกจากห้องแล้ว', d: 'เจ้าของห้องเชิญออกจากห้องนี้' },
  gone: { t: 'ไม่พบห้องนี้แล้ว', d: 'ห้องอาจถูกปิดไปแล้ว' },
  left: { t: 'ออกจากห้องแล้ว', d: 'อยากเล่นอีก ใส่เลขห้องใหม่ได้เลย' },
};

function PlayInner() {
  const sp = useSearchParams();
  const initCode = (sp.get('code') || '').replace(/\D/g, '').slice(0, 6);
  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState(initCode);
  const [title, setTitle] = useState('');
  const [nick, setNick] = useState('');
  const [avatar, setAvatar] = useState(() => Math.floor(Math.random() * CRITTERS.length));
  const [bg, setBg] = useState<RoomBackground>(DEFAULT_BG);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [creds, setCreds] = useState<PlayerCreds | null>(null);
  const [bye, setBye] = useState('left');
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    try {
      setNick(localStorage.getItem(NICK_KEY) || '');
    } catch {
      /* ignore */
    }
    setMuted(isGameMuted());
  }, []);

  const check = useCallback(
    async (c: string) => {
      if (!isRoomCode(c)) return;
      gsfx.unlock();
      setBusy(true);
      setErr('');
      // เคยเข้าห้องนี้ในเครื่องนี้แล้ว: กลับเข้าห้องเดิม
      const saved = loadCreds(c);
      if (saved) {
        try {
          const s = await playerApi.state(saved);
          if (s.room.status !== 'closed') {
            setCreds(saved);
            setBg(s.room.background);
            setStep('room');
            setBusy(false);
            return;
          }
        } catch {
          /* เข้าใหม่ */
        }
        clearCreds(c);
      }
      try {
        const r = await playerApi.check(c);
        setTitle(r.title);
        setBg(r.background);
        setStep('name');
        gsfx.join();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'ไม่พบห้องนี้');
        gsfx.wrong();
      } finally {
        setBusy(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isRoomCode(initCode)) check(initCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = async () => {
    const n = cleanNickname(nick);
    if (!n) return;
    setBusy(true);
    setErr('');
    gsfx.tap();
    try {
      const r = await playerApi.join(code, n, avatar);
      const c: PlayerCreds = { playerId: r.playerId, token: r.token, roomId: r.roomId, code: r.code };
      saveCreds(c);
      try {
        localStorage.setItem(NICK_KEY, n);
      } catch {
        /* ignore */
      }
      setCreds(c);
      setStep('room');
      gsfx.join();
    } catch (e) {
      setErr(e instanceof LiveError ? e.message : 'เข้าห้องไม่สำเร็จ');
      gsfx.wrong();
    } finally {
      setBusy(false);
    }
  };

  const exit = useCallback(
    (reason: 'left' | 'kicked' | 'gone' | 'closed') => {
      if (creds) clearCreds(creds.code);
      setCreds(null);
      setBye(reason);
      setStep('bye');
    },
    [creds]
  );

  const light = bgIsLight(bg);

  return (
    <div className="l5g-stage" data-light={light} onPointerDown={() => gsfx.unlock()}>
      <RoomBackdrop bg={bg} />
      <div className="l5g-stage-top">
        {step === 'name' ? (
          <button type="button" className="l5g-icon-btn" onClick={() => (setStep('code'), setErr(''))} aria-label="ย้อนกลับ">
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : step !== 'room' ? (
          <Link href="/home" className="l5g-icon-btn" aria-label="หน้าแรก">
            <Home className="w-5 h-5" />
          </Link>
        ) : (
          <span className="l5g-pill">ห้อง {creds?.code}</span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          className="l5g-icon-btn"
          onClick={() => {
            setGameMuted(!muted);
            setMuted(!muted);
          }}
          aria-label={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      <div className="l5g-stage-body">
        {step === 'code' && (
          <div className="l5g-join">
            <div className="l5g-join-logo" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} style={{ ['--i' as string]: i }}>
                  <Avatar id={(i * 3 + 1) % CRITTERS.length} size={56} />
                </span>
              ))}
            </div>
            <h1 className="l5g-join-title">เข้าห้องเกม</h1>
            <div className="l5g-card l5g-join-card">
              <p className="font-bold text-center mb-3">ใส่เลขห้อง 6 หลัก</p>
              <CodeInput value={code} onChange={(v) => (setCode(v), setErr(''))} onEnter={() => check(code)} autoFocus={!initCode} />
              {err && <p className="l5g-err text-center mt-3">{err}</p>}
              <button type="button" className="l5g-btn l5g-btn-go l5g-btn-xl w-full mt-4" disabled={code.length !== 6 || busy} onClick={() => check(code)}>
                {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <DoorOpen className="w-6 h-6" />} เข้าห้อง
              </button>
            </div>
            <p className="l5g-join-foot">ไม่ต้องมีบัญชี เล่นได้เลย</p>
          </div>
        )}

        {step === 'name' && (
          <div className="l5g-join">
            <p className="l5g-join-room">{title}</p>
            <div className="l5g-card l5g-join-card">
              <div className="l5g-pick-preview">
                <Avatar id={avatar} size={110} />
                <button type="button" className="l5g-icon-btn l5g-pick-dice" onClick={() => (gsfx.pick(), setAvatar(Math.floor(Math.random() * CRITTERS.length)))} aria-label="สุ่มตัวละคร">
                  <Shuffle className="w-5 h-5" />
                </button>
              </div>
              <div className="l5g-pick-grid" role="radiogroup" aria-label="เลือกตัวละคร">
                {CRITTERS.map((c, i) => (
                  <button key={i} type="button" role="radio" aria-checked={avatar === i} aria-label={c.name} data-on={avatar === i} onClick={() => (gsfx.tap(), setAvatar(i))}>
                    <Avatar id={i} size={44} />
                  </button>
                ))}
              </div>
              <label className="block mt-4">
                <span className="font-bold">ชื่อเล่นของฉัน</span>
                <input
                  className="l5g-input l5g-input-lg mt-1"
                  value={nick}
                  maxLength={NICK_MAX}
                  placeholder="เช่น น้องฟ้า"
                  autoFocus
                  onChange={(e) => (setNick(e.target.value), setErr(''))}
                  onKeyDown={(e) => e.key === 'Enter' && join()}
                />
              </label>
              {err && <p className="l5g-err text-center mt-3">{err}</p>}
              <button type="button" className="l5g-btn l5g-btn-go l5g-btn-xl w-full mt-4" disabled={!cleanNickname(nick) || busy} onClick={join}>
                {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowRight className="w-6 h-6" />} ไปเลย!
              </button>
            </div>
          </div>
        )}

        {step === 'room' && creds && <PlayerSession creds={creds} onExit={exit} onBackground={setBg} />}

        {step === 'bye' && (
          <div className="l5g-join">
            <div className="l5g-card l5g-join-card text-center">
              <Avatar id={avatar} size={96} mood={bye === 'kicked' ? 'sad' : 'happy'} />
              <h2 className="font-display text-2xl mt-2">{BYE[bye]?.t}</h2>
              <p className="font-semibold opacity-75">{BYE[bye]?.d}</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                <button
                  type="button"
                  className="l5g-btn l5g-btn-go"
                  onClick={() => {
                    setCode('');
                    setBg(DEFAULT_BG);
                    setStep('code');
                  }}
                >
                  <DoorOpen className="w-5 h-5" /> เข้าห้องอื่น
                </button>
                <Link href="/home" className="l5g-btn l5g-btn-ghost">
                  <Home className="w-5 h-5" /> หน้าแรก
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayInner />
    </Suspense>
  );
}
