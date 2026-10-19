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
import { useAuth } from '@/context/AuthContext';
import { MediaItem } from '@/types/database';
import { bkkParts, type Hat, msUntilMidnight } from '@/lib/companion';
import {
  CompanionState,
  Reward,
  attach,
  clearLegacy,
  getServerSnapshot,
  getSnapshot,
  hydrate,
  readLegacy,
  recordPlay as storeRecordPlay,
  recordVisit,
  setChangeHandler,
  snapshotForSave,
  subscribe,
} from '@/lib/companion-store';
import { SyncStatus, fetchRemote, isMissingTable, saveRemote } from '@/lib/companion-sync';
import { loadPrefs, sfx, unlockAudio } from '@/lib/sound';

export interface DailyGame {
  media: MediaItem;
  /** true = แจกให้ทุกคนเล่นฟรีเฉพาะวันนี้ (โปรโมชัน) */
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
  /** มีสิทธิ์ใช้ปุ๋ง/สติกเกอร์ (สมาชิกที่ยังไม่หมดอายุ หรือ Dev) */
  entitled: boolean;
  /** ล็อกอินอยู่แต่สมาชิกหมดอายุ/ไม่มี (ใช้เลือกข้อความบนหน้าล็อก) */
  loggedIn: boolean;
  /** รู้สถานะสิทธิ์และโหลดข้อมูลเสร็จแล้ว */
  ready: boolean;
  syncStatus: SyncStatus;
  /** บันทึกว่าเด็กกดเล่นเกมนี้ (ให้ดาว/สติกเกอร์) และเข้าคิวแสดงรางวัล */
  recordPlay: (m: MediaItem) => Reward;
  rewards: Reward[];
  dismissReward: () => void;
  /** เหตุการณ์เข้าเว็บของวันนี้ (ดาวเช็คอิน ฯลฯ) ใช้ในคำทักทาย */
  visit: { checkinStars: number; firstEver: boolean } | null;
  /** โหลดรายการสื่อ + เกมประจำวันใหม่ (เช่น Dev เพิ่งตั้งเกมของวันนี้ หรือข้ามเที่ยงคืน) */
  refreshDaily: (opts?: { ifOlderThanMs?: number }) => void;
}

/** ส่งเหตุการณ์นี้หลัง Dev แก้ตารางเกมประจำวัน ให้ทุกหน้าที่เปิดอยู่โหลดใหม่ */
export const DAILY_CHANGED_EVENT = 'l5g:daily-changed';

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

const SAVE_DELAY_MS = 1500;

export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const supabase = useMemo(() => createClient(), []);
  const { user, profile, isLoading: authLoading } = useAuth();

  const uid = user?.id ?? null;
  const entitled =
    !!user &&
    !!profile &&
    (profile.role === 'dev' ||
      (!!profile.premium_until && new Date(profile.premium_until).getTime() > Date.now()));

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [daily, setDaily] = useState<DailyGame | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [visit, setVisit] = useState<Ctx['visit']>(null);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [reloadKey, setReloadKey] = useState(0);
  const lastLoad = useRef(0);
  const mediaLoadedRef = useRef(false);
  const loading = useRef(false);
  const refreshDaily = useCallback((opts?: { ifOlderThanMs?: number }) => {
    if (opts?.ifOlderThanMs && (loading.current || Date.now() - lastLoad.current < opts.ifOlderThanMs)) return;
    setReloadKey((k) => k + 1);
  }, []);

  const canSync = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uidRef = useRef<string | null>(null);

  const doSave = useCallback(async () => {
    const id = uidRef.current;
    if (!id || !canSync.current) return;
    setSyncStatus('saving');
    const err = await saveRemote(supabase, id, snapshotForSave());
    if (err) {
      setSyncStatus(isMissingTable(err) ? 'missing' : 'error');
      return;
    }
    clearLegacy();
    setSyncStatus('saved');
  }, [supabase]);

  const scheduleSave = useCallback(
    (immediate = false) => {
      if (!canSync.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        void doSave();
      }, immediate ? 0 : SAVE_DELAY_MS);
    },
    [doSave]
  );

  // ตั้งค่าเสียง + ปลดล็อกเสียงเมื่อมี gesture แรก + เสียงป๊อปเมื่อกดปุ่มของเรา
  useEffect(() => {
    loadPrefs();
    const unlock = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
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

  // ผูกที่เก็บข้อมูลกับสิทธิ์ของผู้ใช้: ดึงจาก Supabase -> รวมกับของเครื่องนี้ -> เช็คอินวันนี้ -> บันทึกกลับ
  useEffect(() => {
    if (authLoading) return;
    let off = false;
    uidRef.current = uid;
    canSync.current = false;
    setChangeHandler(null);
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setReady(false);
    setVisit(null);
    attach({ userId: uid, entitled });

    if (!entitled || !uid) {
      setVisit({ checkinStars: 0, firstEver: false });
      setSyncStatus('idle');
      setReady(true);
      return;
    }

    (async () => {
      setSyncStatus('loading');
      const { data, error } = await fetchRemote(supabase, uid);
      if (off) return;

      if (error) {
        // ใช้ต่อได้จากแคชในเครื่อง แต่ยังไม่ซิงก์ขึ้นระบบจนกว่าจะแก้ปัญหา
        setSyncStatus(isMissingTable(error) ? 'missing' : 'error');
      } else {
        canSync.current = true;
      }

      const legacy = !data && !error ? readLegacy() : null;
      const needsPush = hydrate(error ? null : data, legacy);
      const r = recordVisit(bkkParts().date);
      setVisit({ checkinStars: r.checkinStars, firstEver: r.firstEver });
      if (r.evolved) setRewards((q) => [...q, { starsGained: r.checkinStars, evolved: r.evolved, counted: true }]);

      setChangeHandler(() => scheduleSave());
      setReady(true);
      if (canSync.current) {
        if (needsPush || r.checkinStars > 0) scheduleSave(true);
        else setSyncStatus('saved');
      }
    })();

    return () => {
      off = true;
    };
  }, [authLoading, uid, entitled, supabase, scheduleSave]);

  // ออกจากหน้า/สลับแท็บ: บันทึกที่ค้างอยู่ทันที (ไม่รอ debounce)
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void doSave();
      }
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flush);
    };
  }, [doSave]);

  // โหลดใหม่เมื่อ: Dev แก้ตาราง (เหตุการณ์), กลับมาที่แท็บ (ไม่ถี่กว่า 20 วิ), ข้ามเที่ยงคืนเวลาไทย
  useEffect(() => {
    const soft = () => {
      if (document.visibilityState === 'visible') refreshDaily({ ifOlderThanMs: 20_000 });
    };
    const force = () => refreshDaily();
    window.addEventListener(DAILY_CHANGED_EVENT, force);
    window.addEventListener('focus', soft);
    document.addEventListener('visibilitychange', soft);
    const midnight = setTimeout(force, msUntilMidnight(bkkParts()) + 2000);
    return () => {
      window.removeEventListener(DAILY_CHANGED_EVENT, force);
      window.removeEventListener('focus', soft);
      document.removeEventListener('visibilitychange', soft);
      clearTimeout(midnight);
    };
  }, [refreshDaily, reloadKey]);

  // รายการสื่อ + เกมประจำวันของวันนี้ (Dev ตั้งเองเท่านั้น ไม่ตั้ง = ไม่มี)
  useEffect(() => {
    let off = false;
    lastLoad.current = Date.now();
    loading.current = true;
    (async () => {
      const today = bkkParts().date;
      const { data, error: mediaErr } = await supabase.from('media').select('*').order('created_at', { ascending: true });
      // โหลดซ้ำแล้วเน็ตสะดุด: คงข้อมูลเดิมไว้ ไม่ล้างเกมประจำวันทิ้ง
      if (mediaErr && mediaLoadedRef.current) return;
      const all = ((data || []) as MediaItem[]).filter((m) => m.is_public !== false).map((m) => ({
        ...m,
        access_tier: (m.access_tier ? String(m.access_tier).toLowerCase().trim() : 'premium') as MediaItem['access_tier'],
      }));
      // คลังสื่อปกติ (สติกเกอร์ ฯลฯ) ไม่รวมเกมประจำวัน
      const list = all.filter((m) => !m.is_daily);
      if (off) return;
      setMedia(list);

      let chosen: DailyGame | null = null;
      try {
        const { data: row, error } = await supabase
          .from('daily_games')
          .select('media_id, unlock, note')
          .eq('day', today)
          .maybeSingle();
        if (!error && row) {
          const m = all.find((x) => x.id === row.media_id);
          if (m) chosen = { media: m, unlock: row.unlock !== false, source: 'dev', note: row.note ?? null, date: today };
        }
      } catch {
        /* ตารางยังไม่ถูกสร้าง = ไม่มีเกมประจำวัน */
      }
      if (off) return;
      // บอกว่าโหลดเสร็จหลังรู้เกมประจำวันแล้วเท่านั้น (เดิมขึ้น "ยังไม่มีเกมประจำวัน" ระหว่างรอ)
      setDaily(chosen);
      setMediaLoaded(true);
      mediaLoadedRef.current = true;
    })().finally(() => {
      if (!off) loading.current = false;
    });
    return () => {
      off = true;
    };
  }, [supabase, reloadKey]);

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
    entitled,
    loggedIn: !!user,
    ready: ready && !authLoading,
    syncStatus,
    recordPlay,
    rewards,
    dismissReward,
    visit,
    refreshDaily,
  };

  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>;
}

export type { Hat };
