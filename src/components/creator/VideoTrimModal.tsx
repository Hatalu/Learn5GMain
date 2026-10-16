'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, Scissors, X } from 'lucide-react';
import type { MediaRef } from '@/lib/game-creator/types';
import { VIDEO_MAX_SECONDS } from '@/lib/game-creator/quiz';
import { VIDEO_UPLOAD_MAX_MB, canTrimVideo, recordSegment, uploadVideo, type VideoProbe } from '@/lib/game-creator/media';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${Math.floor((s % 1) * 10)}`;

/** เลือกช่วง 5 วินาทีของคลิป แล้วตัด/อัปโหลด */
export function VideoTrimModal({ file, probe, userId, onDone, onCancel }: { file: File; probe: VideoProbe; userId: string; onDone: (m: MediaRef) => void; onCancel: () => void }) {
  const v = useRef<HTMLVideoElement>(null);
  const dur = probe.duration || VIDEO_MAX_SECONDS;
  const len = Math.min(VIDEO_MAX_SECONDS, dur);
  const maxStart = Math.max(0, dur - len);
  const [start, setStart] = useState(0);
  const [busy, setBusy] = useState<'' | 'trim' | 'upload'>('');
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState('');
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => setMounted(true), []);

  // วนเล่นเฉพาะช่วงที่เลือก
  useEffect(() => {
    const el = v.current;
    if (!el || busy) return;
    const loop = () => {
      setNow(el.currentTime);
      if (el.currentTime >= start + len - 0.03 || el.currentTime < start - 0.2) {
        el.currentTime = start;
        el.play().catch(() => null);
      }
    };
    const iv = setInterval(loop, 80);
    el.currentTime = start;
    el.play().catch(() => null);
    return () => clearInterval(iv);
  }, [start, len, busy, mounted]);

  const confirm = async () => {
    setErr('');
    const el = v.current;
    if (!el) return;
    try {
      let blob: Blob | null = null;
      let segStart = start;
      const needTrim = dur > VIDEO_MAX_SECONDS + 0.05 || file.size > VIDEO_UPLOAD_MAX_MB * 1024 * 1024;
      if (needTrim && canTrimVideo()) {
        setBusy('trim');
        el.muted = false;
        blob = await recordSegment(el, start, len, setProgress);
        if (blob) segStart = 0;
      }
      if (!blob) {
        if (file.size > VIDEO_UPLOAD_MAX_MB * 1024 * 1024) throw new Error(`เบราว์เซอร์นี้ตัดคลิปไม่ได้ และไฟล์ใหญ่เกิน ${VIDEO_UPLOAD_MAX_MB}MB ลองตัดคลิปให้สั้นก่อนแล้วค่อยเลือกใหม่`);
        blob = file;
      }
      setBusy('upload');
      const m = await uploadVideo(userId, blob, { w: probe.w, h: probe.h, start: segStart, end: segStart + len });
      onDone(m);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ');
      setBusy('');
    }
  };

  if (!mounted) return null;
  const pct = (x: number) => `${(x / dur) * 100}%`;

  return createPortal(
    <div className="l5g-math-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div className="l5g-math-sheet l5g-trim" role="dialog" aria-modal="true" aria-label="เลือกช่วงคลิป">
        <div className="l5g-math-head">
          <span className="l5g-fx-badge" style={{ background: '#ff6b7a' }}>
            <Scissors className="w-4 h-4" />
          </span>
          <h3>เลือกช่วงคลิป {len.toFixed(len % 1 ? 1 : 0)} วินาที</h3>
          <button type="button" className="l5g-icon-btn" onClick={onCancel} disabled={!!busy} aria-label="ปิด">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="l5g-trim-stage">
          <video ref={v} src={probe.url} playsInline muted={busy !== 'trim'} preload="auto" />
          {busy && (
            <div className="l5g-trim-busy">
              <Loader2 className="w-8 h-8 animate-spin" />
              <b>{busy === 'trim' ? `กำลังตัดคลิป ${Math.round(progress * 100)}%` : 'กำลังอัปโหลด…'}</b>
            </div>
          )}
        </div>

        {maxStart > 0 ? (
          <div className="l5g-trim-track">
            <div className="l5g-trim-bar">
              <span className="l5g-trim-win" style={{ left: pct(start), width: pct(len) }} />
              <span className="l5g-trim-head" style={{ left: pct(Math.min(dur, Math.max(0, now))) }} />
            </div>
            <input
              type="range"
              min={0}
              max={maxStart}
              step={0.1}
              value={start}
              disabled={!!busy}
              onChange={(e) => setStart(Number(e.target.value))}
              aria-label="จุดเริ่มคลิป"
              className="l5g-trim-range"
            />
            <div className="l5g-trim-times">
              <span>เริ่ม {fmt(start)}</span>
              <span>ถึง {fmt(start + len)}</span>
              <span className="opacity-60">ทั้งคลิป {fmt(dur)}</span>
            </div>
          </div>
        ) : (
          <p className="l5g-trim-ok">คลิปยาว {dur.toFixed(1)} วินาที ใช้ได้เลย</p>
        )}

        {err && <p className="l5g-err">{err}</p>}

        <div className="l5g-math-foot">
          <span className="flex-1" />
          <button type="button" className="l5g-btn l5g-btn-ghost" onClick={onCancel} disabled={!!busy}>
            ยกเลิก
          </button>
          <button type="button" className="l5g-btn l5g-btn-go" onClick={confirm} disabled={!!busy}>
            <Check className="w-5 h-5" strokeWidth={3} /> ใช้ช่วงนี้
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
