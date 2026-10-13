'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { MediaItem } from '@/types/database';
import {
  autoPickDaily,
  bkkParts,
  type Hat,
} from '@/lib/companion';
import {
  CompanionState,
  Reward,
  getServerSnapshot,
  getSnapshot,
  loadStore,
  recordPlay as storeRecordPlay,
  recordVisit,
  subscribe,
} from '@/lib/companion-store';
import { loadPrefs, sfx, unlockAudio } from '@/lib/sound';

export interface DailyGame {
  media: MediaItem;
  /** true = ปลดล็อกให้เล่นฟรีเฉพาะวันนี้แม้เป็นสื่อ Premium */
  unlock: boolean;
  source: 'dev' | 'auto';
  note: string | null;
  date: string;
}

interface Ctx {
  state: CompanionState;
  media: MediaItem[];
  mediaLoaded: boolean;
  daily: DailyGame | null;
  /** id ของเกมที่ถูกปลดล็อกฟรีวันนี้ (หรือ null) */
  dailyUnlockedId: string | null;
  dailyPlayedToday: boolean;
  /** บันทึกว่าเด็กกดเล่นเกมนี้ (ให้ดาว/สติกเกอร์) และเข้าคิวแสดงรางวัล */
  recordPlay: (m: MediaItem) => Reward;
  rewards: Reward[];
  dismissReward: () => void;
  /** เหตุการณ์เข้าเว็บของวันนี้ (ดาวเช็คอิน ฯลฯ) ใช้ในคำทักทาย */
  visit: { checkinStars: number; firstEver: boolean } | null;
}

const CompanionContext = createContext<Ctx | null>(null);

export function useCompanion(): Ctx {
  const c = useContext(CompanionContext);
  if (!c) throw new Error('useCompanion must be used within CompanionProvider');
  return c;
}

/** ปลอดภัยเมื่อใช้นอก Provider (เช่น หน้า error) */
export function useCompanionOptional(): Ctx | null {
  return useContext(CompanionContext);
}

export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const supabase = useMemo(() => createClient(), []);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [daily, setDaily] = useState<DailyGame | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [visit, setVisit] = useState<Ctx['visit']>(null);
  const visited = useRef(false);

  // โหลดข้อมูลในเครื่อง + นับการเข้าเว็บวันนี้ + ปลดล็อกเสียงเมื่อมี gesture แรก
  useEffect(() => {
    loadStore();
    loadPrefs();
    if (!visited.current) {
      visited.current = true;
      const r = recordVisit(bkkParts().date);
      setVisit({ checkinStars: r.checkinStars, firstEver: r.firstEver });
      if (r.evolved) setRewards((q) => [...q, { starsGained: r.checkinStars, evolved: r.evolved, counted: true }]);
    }
    const unlock = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    // เสียงป๊อปเมื่อกดปุ่มของเรา
    const onClick = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.('.btn-jelly, .btn-primary-grad, .media-card-hover')) sfx.pop();
    };
    window.addEventListener('pointerdown', onClick, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', onClick);
    };
  }, []);

  // รายการสื่อ + เกมประจำวันของวันนี้ (ถ้าแอดมินตั้งไว้ใช้ตามนั้น ไม่งั้นเลือกอัตโนมัติ)
  useEffect(() => {
    let off = false;
    (async () => {
      const today = bkkParts().date;
      const { data } = await supabase.from('media').select('*').order('created_at', { ascending: true });
      const list = ((data || []) as MediaItem[]).filter((m) => m.is_public !== false).map((m) => ({
        ...m,
        access_tier: (m.access_tier ? String(m.access_tier).toLowerCase().trim() : 'premium') as MediaItem['access_tier'],
      }));
      if (off) return;
      setMedia(list);
      setMediaLoaded(true);

      let chosen: DailyGame | null = null;
      try {
        const { data: row, error } = await supabase
          .from('daily_games')
          .select('media_id, unlock, note')
          .eq('day', today)
          .maybeSingle();
        if (!error && row) {
          const m = list.find((x) => x.id === row.media_id);
          if (m) chosen = { media: m, unlock: row.unlock !== false, source: 'dev', note: row.note ?? null, date: today };
        }
      } catch {
        /* ตารางยังไม่ถูกสร้าง ใช้การเลือกอัตโนมัติ */
      }
      if (!chosen) {
        const m = autoPickDaily(list, today);
        if (m) chosen = { media: m, unlock: false, source: 'auto', note: null, date: today };
      }
      if (!off) setDaily(chosen);
    })();
    return () => {
      off = true;
    };
  }, [supabase]);

  const recordPlay = useCallback(
    (m: MediaItem): Reward => {
      const r = storeRecordPlay(
        { id: m.id, title: m.title, icon_url: m.icon_url, subject: m.subject },
        { dailyId: daily?.media.id ?? null }
      );
      if (r.counted) setRewards((q) => [...q, r]);
      return r;
    },
    [daily]
  );

  const dismissReward = useCallback(() => setRewards((q) => q.slice(1)), []);

  const today = bkkParts().date;
  const value: Ctx = {
    state,
    media,
    mediaLoaded,
    daily,
    dailyUnlockedId: daily?.unlock ? daily.media.id : null,
    dailyPlayedToday: state.dailyClaimed === today,
    recordPlay,
    rewards,
    dismissReward,
    visit,
  };

  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>;
}

export type { Hat };
