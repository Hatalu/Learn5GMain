'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Gamepad2, Loader2, MonitorPlay, Rocket, Shuffle } from 'lucide-react';
import { PaperModal } from './PaperModal';
import { cleanNickname, NICK_MAX } from '@/lib/game-creator/templates';
import { gsfx } from '@/lib/game-creator/gsound';
import type { RoomMode } from '@/lib/game-creator/types';

const LAST_BG = 'l5g_room_bg';

export function lastBackground(): unknown {
  try {
    const s = localStorage.getItem(LAST_BG);
    return s ? JSON.parse(s) : undefined;
  } catch {
    return undefined;
  }
}
export function rememberBackground(bg: unknown) {
  try {
    localStorage.setItem(LAST_BG, JSON.stringify(bg));
  } catch {
    /* ignore */
  }
}

/** เปิดใช้งานเกม: เลือก Host (ดูคนอื่น) หรือ เล่นเกมนี้ด้วย -> ได้เลขห้อง 6 หลัก */
export function OpenGameModal({ gameId, title, username, onClose }: { gameId: string; title: string; username: string; onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<RoomMode>('watch');
  const [shuffleQuestions, setSQ] = useState(false);
  const [shuffleChoices, setSC] = useState(false);
  const [nick, setNick] = useState(cleanNickname(username) || 'ครู');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const open = async () => {
    setBusy(true);
    setErr('');
    gsfx.tap();
    try {
      const r = await fetch('/api/live/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, mode, nickname: nick, settings: { shuffleQuestions, shuffleChoices }, background: lastBackground() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'เปิดห้องไม่สำเร็จ');
      if (j.hostPlayer) {
        try {
          sessionStorage.setItem(`l5g_hostp_${j.roomId}`, JSON.stringify(j.hostPlayer));
        } catch {
          /* ignore */
        }
      }
      gsfx.start();
      router.push(`/create/host?room=${j.roomId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'เปิดห้องไม่สำเร็จ');
      setBusy(false);
    }
  };

  const Opt = ({ id, icon, name, desc, color }: { id: RoomMode; icon: React.ReactNode; name: string; desc: string; color: string }) => (
    <button type="button" className="l5g-mode" data-on={mode === id} style={{ ['--m' as string]: color }} onClick={() => (gsfx.pick(), setMode(id))}>
      <span className="l5g-mode-icon">{icon}</span>
      <b>{name}</b>
      <span>{desc}</span>
      <span className="l5g-mode-tick">{mode === id && <Check className="w-4 h-4" strokeWidth={4} />}</span>
    </button>
  );

  return (
    <PaperModal title="เปิดใช้งานเกม" icon={<Rocket className="w-5 h-5" />} iconBg="#ffcf3f" onClose={onClose} busy={busy} width={560}>
      <p className="font-bold opacity-80 -mt-1 mb-3 truncate">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        <Opt id="watch" icon={<MonitorPlay className="w-7 h-7" />} name="Host" desc="ดูคนอื่นเล่น ขึ้นจอใหญ่" color="#4fb3ff" />
        <Opt id="play" icon={<Gamepad2 className="w-7 h-7" />} name="เล่นเกมนี้ด้วย" desc="เปิดห้องแล้วร่วมแข่งเอง" color="#ff9a3d" />
      </div>

      {mode === 'play' && (
        <label className="block mt-4">
          <span className="font-bold text-sm">ชื่อของคุณในเกม</span>
          <input className="l5g-input mt-1" value={nick} maxLength={NICK_MAX} onChange={(e) => setNick(e.target.value)} />
        </label>
      )}

      <div className="mt-4 grid gap-2">
        <label className="l5g-switch">
          <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setSQ(e.target.checked)} />
          <span className="l5g-switch-ui" />
          <Shuffle className="w-4 h-4" /> สลับลำดับคำถามของแต่ละคน
        </label>
        <label className="l5g-switch">
          <input type="checkbox" checked={shuffleChoices} onChange={(e) => setSC(e.target.checked)} />
          <span className="l5g-switch-ui" />
          <Shuffle className="w-4 h-4" /> สลับตำแหน่งตัวเลือก
        </label>
      </div>

      {err && <p className="l5g-err mt-3">{err}</p>}

      <div className="l5g-math-foot">
        <span className="flex-1" />
        <button type="button" className="l5g-btn l5g-btn-ghost" onClick={onClose} disabled={busy}>
          ยกเลิก
        </button>
        <button type="button" className="l5g-btn l5g-btn-go" onClick={open} disabled={busy || (mode === 'play' && !cleanNickname(nick))}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />} เปิดห้อง
        </button>
      </div>
    </PaperModal>
  );
}
