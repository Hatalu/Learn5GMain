'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { MediaItem } from '@/types/database';
import { useCompanion } from '@/components/companion/CompanionProvider';
import { TrialModal } from './TrialModal';
import { VideoModal } from '@/components/media/VideoModal';

interface Ctx {
  /** เปิดหน้าจอทดลองเล่นของสื่อนี้ (อยู่หน้าเว็บเดิม) */
  openTrial: (media: MediaItem) => void;
  /** สมาชิกกด "เล่นเลย": เปิดเกมเต็มรูปแบบบนหน้าเดิม (เหมือนทดลองเล่น แต่ไม่มีนาฬิกา เกมล็อกอินให้เอง) */
  openPlay: (media: MediaItem) => void;
  /** สื่อประเภทวิดีโอ: เปิดจอดูคลิป YouTube บนหน้าเดิม ทุกคนดูได้ */
  openVideo: (media: MediaItem) => void;
}

const TrialContext = createContext<Ctx | null>(null);

export function useTrial(): Ctx {
  const c = useContext(TrialContext);
  if (!c) throw new Error('useTrial must be used within TrialProvider');
  return c;
}

export function TrialProvider({ children }: { children: React.ReactNode }) {
  const [media, setMedia] = useState<{ item: MediaItem; mode: 'trial' | 'play' | 'video' } | null>(null);
  const openTrial = useCallback((m: MediaItem) => setMedia({ item: m, mode: 'trial' }), []);
  const openPlay = useCallback((m: MediaItem) => setMedia({ item: m, mode: 'play' }), []);
  const openVideo = useCallback((m: MediaItem) => setMedia({ item: m, mode: 'video' }), []);
  const { recordPlay } = useCompanion();
  const cur = useRef(media);
  cur.current = media;
  // เล่นเต็ม: ให้ดาว/สติกเกอร์คู่หูตอนปิดเกม (หน้าฉลองจะไม่มาบังเกมที่กำลังเล่น)
  const close = useCallback(() => {
    const c = cur.current;
    setMedia(null);
    if (c?.mode === 'play') recordPlay(c.item);
  }, [recordPlay]);

  return (
    <TrialContext.Provider value={{ openTrial, openPlay, openVideo }}>
      {children}
      {media &&
        (media.mode === 'video' ? (
          <VideoModal key={`video:${media.item.id}`} media={media.item} onClose={close} />
        ) : (
          <TrialModal key={`${media.mode}:${media.item.id}`} media={media.item} mode={media.mode} onClose={close} />
        ))}
    </TrialContext.Provider>
  );
}
