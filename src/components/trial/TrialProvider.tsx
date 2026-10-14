'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { MediaItem } from '@/types/database';
import { TrialModal } from './TrialModal';

interface Ctx {
  /** เปิดหน้าจอทดลองเล่นของสื่อนี้ (อยู่หน้าเว็บเดิม) */
  openTrial: (media: MediaItem) => void;
}

const TrialContext = createContext<Ctx | null>(null);

export function useTrial(): Ctx {
  const c = useContext(TrialContext);
  if (!c) throw new Error('useTrial must be used within TrialProvider');
  return c;
}

export function TrialProvider({ children }: { children: React.ReactNode }) {
  const [media, setMedia] = useState<MediaItem | null>(null);
  const openTrial = useCallback((m: MediaItem) => setMedia(m), []);
  const close = useCallback(() => setMedia(null), []);

  return (
    <TrialContext.Provider value={{ openTrial }}>
      {children}
      {media && <TrialModal media={media} onClose={close} />}
    </TrialContext.Provider>
  );
}
