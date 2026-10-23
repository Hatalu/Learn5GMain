'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { MediaRef } from '@/lib/game-creator/types';
import { VIDEO_MAX_SECONDS } from '@/lib/game-creator/quiz';

/** แสดงรูป/คลิป/เสียงในเกม: คลิปเล่นวนเฉพาะช่วงที่กำหนด (ไม่เกิน VIDEO_MAX_SECONDS) เริ่มแบบปิดเสียง แตะเพื่อเปิดเสียง */
export function MediaView({ media, className, fit = 'contain', controls = true }: { media: MediaRef; className?: string; fit?: 'contain' | 'cover'; controls?: boolean }) {
  const v = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const start = media.start ?? 0;
  const end = Math.min(media.end ?? start + VIDEO_MAX_SECONDS, start + VIDEO_MAX_SECONDS);

  useEffect(() => {
    const el = v.current;
    if (!el || media.kind !== 'video') return;
    const restart = () => {
      try {
        el.currentTime = start;
      } catch {
        /* ignore */
      }
      el.play().catch(() => null);
    };
    const onTime = () => {
      if (el.currentTime >= end - 0.02 || el.currentTime < start - 0.3) restart();
    };
    const onMeta = () => restart();
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', restart);
    // timeupdate ห่าง ~250ms บางเครื่อง เสริมด้วยตัวจับเวลา
    const iv = setInterval(onTime, 120);
    return () => {
      clearInterval(iv);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', restart);
    };
  }, [media.kind, media.url, start, end]);

  if (media.kind === 'audio') {
    return (
      <span className={`l5g-audio ${className || ''}`} onClick={(e) => e.stopPropagation()}>
        <audio src={media.url} controls preload="metadata" controlsList="nodownload noplaybackrate" />
      </span>
    );
  }
  if (media.kind === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={media.url} alt="" draggable={false} className={className} style={{ objectFit: fit }} width={media.w} height={media.h} loading="lazy" />
    );
  }
  return (
    <span className={`l5g-video ${className || ''}`}>
      <video ref={v} src={media.url} muted={muted} playsInline autoPlay preload="auto" style={{ objectFit: fit }} disablePictureInPicture controlsList="nodownload nofullscreen noremoteplayback" />
      {controls && (
        <button
          type="button"
          className="l5g-video-sound"
          onClick={(e) => {
            e.stopPropagation();
            setMuted((m) => !m);
            v.current?.play().catch(() => null);
          }}
          aria-label={muted ? 'เปิดเสียงคลิป' : 'ปิดเสียงคลิป'}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      )}
    </span>
  );
}
