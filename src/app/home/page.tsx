'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import {
  ALL_SUBJECTS,
  FilterState,
  GAME_FILTER_TYPES,
  MediaItem,
  SortOption,
} from '@/types/database';
import { Navbar } from '@/components/navbar/Navbar';
import { MediaRail } from '@/components/media/MediaRail';
import { MediaCard } from '@/components/media/MediaCard';
import { FilterSidebar } from '@/components/media/FilterSidebar';
import { MobileFilterDrawer } from '@/components/media/MobileFilterDrawer';
import { SortDropdown } from '@/components/media/SortDropdown';
import { EmptyState } from '@/components/media/EmptyState';
import { HomeHero } from '@/components/home/HomeHero';
import { FeatureStrip } from '@/components/media/FeatureStrip';
import { DailyGameCard } from '@/components/media/DailyGameCard';
import { JoinRoomBanner } from '@/components/media/JoinRoomBanner';
import { BuddyLoader } from '@/components/fx/BuddyLoader';
import { Reveal } from '@/components/ui/Reveal';
import { AddMediaModal } from '@/components/dev/AddMediaModal';
import { MediaDetailModal } from '@/components/media/MediaDetailModal';
import {
  Filter,
  Sparkles,
  LayoutGrid,
  Gamepad2,
  Loader2,
  X,
} from 'lucide-react';
import { FiveGMascot } from '@/components/mascot/FiveGMascot';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { OfferBanner } from '@/components/membership/Pricing';
import { SocialProof } from '@/components/membership/SocialProof';
import { PromoBanners } from '@/components/home/PromoBanners';
import { AudiencePaths } from '@/components/home/AudiencePaths';
import { useAudience } from '@/components/home/audience';
import hp from '@/components/home/home-page.module.css';

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { error } = useToast();
  const supabase = createClient();

  // Media and favorites state
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);

  // Filters state
  const [filters, setFilters] = useState<FilterState>({
    subjects: [],
    grades: [],
    mediaTypes: [],
  });
  const [sortOption, setSortOption] = useState<SortOption>('latest');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Dev add modal trigger
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false);

  // Media Detail Modal (Center Popup)
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleSelectMedia = useCallback((media: MediaItem) => {
    setSelectedMedia(media);
    setIsDetailModalOpen(true);
  }, []);

  // ถูกเด้งมาจาก /dev: บอกเหตุผล แล้วล้างพารามิเตอร์ออกจาก URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'unauthorized_dev') {
      error('บัญชีนี้ไม่มีสิทธิ์เข้าหน้า Dev หรือ session หมดอายุ ลองออกจากระบบแล้วเข้าสู่ระบบใหม่ด้วยบัญชี Dev');
      window.history.replaceState(null, '', '/home');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch all media
  const fetchMedia = useCallback(async () => {
    // แสดง skeleton เฉพาะการโหลดครั้งแรก (กันตารางกะพริบตอนสลับแท็บ/realtime)
    try {
      // 1. Direct Supabase query (always fresh directly from DB without HTTP proxy cache)
      const { data, error: mediaError } = await supabase
        .from('media')
        .select('*')
        .order('created_at', { ascending: false });

      if (!mediaError && data) {
        const publicOnly = data
          .filter((m: any) => m.is_public !== false && !m.is_daily && m.media_type !== 'วิดีโอ')
          .map((m: any) => ({
            ...m,
            access_tier: m.access_tier ? String(m.access_tier).toLowerCase().trim() : 'premium',
            is_public: true,
          }));
        setAllMedia(publicOnly as MediaItem[]);
        return;
      }

      // 2. Fallback to API endpoint with cache-busting timestamp
      const res = await fetch(`/api/media?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.media && Array.isArray(json.media)) {
          const publicOnly = json.media
            .filter((m: any) => m.is_public !== false && !m.is_daily && m.media_type !== 'วิดีโอ')
            .map((m: any) => ({
              ...m,
              access_tier: m.access_tier ? String(m.access_tier).toLowerCase().trim() : 'premium',
              is_public: true,
            }));
          setAllMedia(publicOnly);
          return;
        }
      }
    } catch (err) {
      console.error('Error fetching media:', err);
    } finally {
      setIsLoadingMedia(false);
    }
  }, [supabase]);

  // Keep selectedMedia in sync if allMedia updates
  useEffect(() => {
    if (selectedMedia) {
      const updated = allMedia.find((m) => m.id === selectedMedia.id);
      if (updated && updated.access_tier !== selectedMedia.access_tier) {
        setSelectedMedia(updated);
      }
    }
  }, [allMedia, selectedMedia]);

  // Fetch user favorites
  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error: favError } = await supabase
        .from('favorites')
        .select('media_id')
        .eq('user_id', user.id);

      if (favError) throw favError;
      const favSet = new Set((data || []).map((f) => f.media_id));
      setFavoriteIds(favSet);
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  }, [user, supabase]);

  // Fetch media on mount + window focus + Supabase realtime changes
  useEffect(() => {
    fetchMedia();

    const handleFocus = () => {
      fetchMedia();
    };
    window.addEventListener('focus', handleFocus);

    // Realtime postgres changes listener on 'media' table
    const channel = supabase
      .channel('public:media-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media' },
        () => {
          fetchMedia();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('focus', handleFocus);
      supabase.removeChannel(channel);
    };
  }, [fetchMedia, supabase]);

  // Fetch favorites when user auth state changes
  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setFavoriteIds(new Set());
    }
  }, [user, fetchFavorites]);

  // Toggle favorite
  const handleToggleFavorite = async (mediaId: string, currentFav: boolean) => {
    if (!user) {
      error('เข้าสู่ระบบก่อน ถึงจะปักหมุดเกมได้');
      return;
    }

    // Optimistic update
    const nextFavs = new Set(favoriteIds);
    if (currentFav) {
      nextFavs.delete(mediaId);
    } else {
      nextFavs.add(mediaId);
    }
    setFavoriteIds(nextFavs);

    try {
      if (currentFav) {
        // Remove from favorites
        const { error: delError } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', mediaId);

        if (delError) throw delError;
        // ไม่แสดงข้อความแจ้งเตือน
      } else {
        // Add to favorites
        const { error: insError } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            media_id: mediaId,
          });

        if (insError) throw insError;
        // ไม่แสดงข้อความแจ้งเตือน
      }
    } catch (err: unknown) {
      // Revert optimistic update
      setFavoriteIds(favoriteIds);
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกรายการโปรด';
      error(msg);
    }
  };

  // Callback when a media is opened to increment view count locally
  const handleMediaOpened = (mediaId: string) => {
    setAllMedia((prev) =>
      prev.map((item) =>
        item.id === mediaId ? { ...item, view_count: item.view_count + 1 } : item
      )
    );
  };

  const scrollToLibrary = () => {
    document.getElementById('library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  // ปุ่มจากป้ายโฆษณา/ภารกิจลองใช้
  const [audience, setAudience] = useAudience();
  const openGames = scrollToLibrary;
  const scrollToDaily = () => document.getElementById('daily')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // เลือกวิชาจากป้ายหน้าแรก: กรองเฉพาะวิชานั้น แล้วเลื่อนลงไปที่คลังสื่อ
  const handlePickSubject = (subject: FilterState['subjects'][number]) => {
    setFilters((prev) => ({
      ...prev,
      subjects:
        prev.subjects.length === 1 && prev.subjects[0] === subject ? [] : [subject],
    }));
    scrollToLibrary();
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilters({
      subjects: [],
      grades: [],
      mediaTypes: [],
    });
  };

  // Filter and Sort calculation
  const filteredAndSortedMedia = useMemo(() => {
    // Only public media is shown on the Home page (Private media is only visible in Dev dashboard)
    let result = allMedia.filter((m) => m.is_public !== false);

    // Filter by Subject (multi-select)
    if (filters.subjects.length > 0) {
      result = result.filter((m) => filters.subjects.includes(m.subject));
    }

    // Filter by Grade (multi-select: if any selected grade matches)
    if (filters.grades.length > 0) {
      result = result.filter((m) =>
        m.grade_level?.some((g) => filters.grades.includes(g as any))
      );
    }

    // Filter by Media Type (multi-select)
    if (filters.mediaTypes.length > 0) {
      result = result.filter((m) => filters.mediaTypes.includes(m.media_type));
    }

    // Sort
    result.sort((a, b) => {
      if (sortOption === 'latest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortOption === 'popular') {
        return (b.view_count || 0) - (a.view_count || 0);
      }
      if (sortOption === 'az') {
        return a.title.localeCompare(b.title, 'th');
      }
      return 0;
    });

    // เกมที่ถูกใจขึ้นก่อนทันทีที่กดหัวใจ ส่วนที่เหลือเรียงตามที่เลือก
    if (user && favoriteIds.size > 0) {
      const pinned = result.filter((m) => favoriteIds.has(m.id));
      const rest = result.filter((m) => !favoriteIds.has(m.id));
      result = [...pinned, ...rest];
    }

    return result;
  }, [allMedia, filters, sortOption, favoriteIds, user]);

  const shownCount = filteredAndSortedMedia.length;
  const typeOptions = GAME_FILTER_TYPES;

  // Netflix Rail items: latest items
  const latestMediaList = useMemo(() => {
    return allMedia
      .filter((m) => m.is_public !== false)
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 10);
  }, [allMedia]);

  const hasActiveFilters =
    filters.subjects.length > 0 ||
    filters.grades.length > 0 ||
    filters.mediaTypes.length > 0;

  if (authLoading) {
    return <BuddyLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <Navbar />
      <div className={`${hp.world} flex-1 flex flex-col`}>

      {/* ส่วนหัว: น้องไฟว์จี 3D + แถบภาพปกเกม (พื้นท้ายฉากสีเดียวกับพื้นหน้า) */}
      <HomeHero
        media={allMedia}
        isLoading={isLoadingMedia}
        onPickSubject={handlePickSubject}
        onSelectMedia={handleSelectMedia}
        onBrowseAll={scrollToLibrary}
        onDaily={scrollToDaily}
      />

      <div className={hp.dots} aria-hidden="true" />
      {[
        ['18%', '-10s', 1],
        ['41%', '-44s', 0.75],
        ['67%', '-26s', 0.9],
        ['88%', '-60s', 0.7],
      ].map(([top, delay, sc]) => (
        <span key={String(top)} className={hp.cloud} style={{ top: String(top), animationDelay: String(delay), ['--s' as string]: sc }} aria-hidden="true" />
      ))}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-6">
        {/* ป้ายโฆษณาระบบต่างๆ ในเว็บ (กดปิดได้ ซ่อน 1 วัน) */}
        <PromoBanners className="mt-2" audience={audience} onLibrary={openGames} />

        {/* ข้อเสนอสมาชิก (ส่วนลดบัญชีใหม่ / โบนัสต่ออายุ) + ตัวเลขผู้ใช้จริง */}
        <OfferBanner className="mt-6" />
        <SocialProof className="mt-5" />

        {/* เลือกกลุ่ม ผู้ปกครอง / คุณครู แล้วได้ภารกิจลองใช้ + ความคุ้มของสมาชิก */}
        <Reveal className="mt-8 sm:mt-10">
          <AudiencePaths audience={audience} onPick={setAudience} onLibrary={openGames} onDaily={scrollToDaily} />
        </Reveal>

        {/* เกมประจำวัน: เปลี่ยนทุกวัน แอดมินกำหนดได้ที่หน้า Dev */}
        <Reveal className="mt-6 sm:mt-8">
          <div id="daily" className="scroll-mt-24">
            <DailyGameCard onSelect={handleSelectMedia} />
          </div>
        </Reveal>

        {/* เข้าร่วมเกมที่สมาชิกสร้างด้วยเลขห้อง 6 หลัก */}
        <Reveal className="mt-6 sm:mt-8">
          <JoinRoomBanner />
        </Reveal>

        <div className="mt-6 sm:mt-8">
          <FeatureStrip />
        </div>

        {/* Netflix-style Rail: สื่อใหม่ล่าสุด */}
        {latestMediaList.length > 0 && (
          <Reveal className="mb-8">
            <MediaRail
              title="สื่อใหม่ล่าสุด"
              subtitle="คลังสื่อการสอนและเกมการศึกษาที่เพิ่มเข้ามาใหม่ล่าสุด"
              items={latestMediaList}
              favoriteIds={favoriteIds}
              onToggleFavorite={handleToggleFavorite}
              onSelectMedia={handleSelectMedia}
              icon={
                <span className={hp.chip} style={{ background: '#ffcf3f' }}>
                  <Sparkles className="w-5 h-5" />
                </span>
              }
            />
          </Reveal>
        )}

        {/* ---------- คลังเกม: ซุ้มแบบหน้าสมาชิก + เลือกวิชาได้ทันที ---------- */}
        <section id="library" data-tour="library" className="relative mt-12 sm:mt-16 scroll-mt-24">
          <div data-tour="library-head" className={hp.booth}>
            <span className={hp.awning} aria-hidden="true" />
            <div className={hp.boothRow}>
              <span className={hp.boothArt} aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none">
                  <path d="M14 22h36a10 10 0 0 1 9.6 7.3l3.2 11.6A7 7 0 0 1 50 46.4L44 40H20l-6 6.4A7 7 0 0 1 1.2 40.9l3.2-11.6A10 10 0 0 1 14 22Z" fill="#fff8ec" stroke="#2a2350" strokeWidth="3.5" strokeLinejoin="round" />
                  <path d="M17 28v10M12 33h10" stroke="#2a2350" strokeWidth="3.5" strokeLinecap="round" />
                  <circle cx="44" cy="30" r="3.4" fill="#ff6b7a" stroke="#2a2350" strokeWidth="2.5" />
                  <circle cx="51" cy="36" r="3.4" fill="#3fd6a8" stroke="#2a2350" strokeWidth="2.5" />
                </svg>
              </span>
              <div className="min-w-0 text-left">
                <h2 className={`${hp.boothTitle} font-display`}>
                  คลังเกมการเรียนรู้
                  {!isLoadingMedia && <span className={hp.count}>{allMedia.length} เกม</span>}
                </h2>
                <p className={hp.boothSub}>ป.1 - ป.6 เล่นได้ทุกจอ เลือกวิชาแล้วเริ่มเล่นได้เลย</p>
              </div>
            </div>
            <div className={hp.picks} role="group" aria-label="เลือกวิชา">
              <button type="button" className={hp.pick} data-on={filters.subjects.length === 0} style={{ ['--c' as string]: '#9b6cf0' }} onClick={() => setFilters((p) => ({ ...p, subjects: [] }))}>
                <Gamepad2 className="w-4 h-4" /> ทุกวิชา
              </button>
              {ALL_SUBJECTS.map((sj) => {
                const on = filters.subjects.length === 1 && filters.subjects[0] === sj;
                return (
                  <button
                    key={sj}
                    type="button"
                    className={hp.pick}
                    data-on={on}
                    style={{ ['--c' as string]: SUBJECT_COLOR[sj] }}
                    onClick={() => setFilters((p) => ({ ...p, subjects: on ? [] : [sj] }))}
                  >
                    <i /> {sj}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8 items-start">
            {/* Desktop Left Sidebar Filter */}
            <div className="hidden lg:block lg:col-span-1">
              <FilterSidebar
                filters={filters}
                onFilterChange={setFilters}
                onReset={handleResetFilters}
                totalFilteredCount={shownCount}
                typeOptions={typeOptions}
              />
            </div>

            {/* Right Main Grid */}
            <div className="lg:col-span-3 space-y-5 min-h-[500px]">
              {/* Top Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b-2 border-dashed border-indigo-900/20 dark:border-indigo-300/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={hp.chip} style={{ background: '#9b6cf0', color: '#fff' }}>
                    <LayoutGrid className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-xl sm:text-2xl leading-tight text-gray-900 dark:text-white truncate">
                      {hasActiveFilters ? 'ผลลัพธ์การกรอง' : 'เกมการเรียนรู้ทั้งหมด'}
                    </h2>
                    <p className="text-xs font-bold text-indigo-900/70 dark:text-indigo-200">{shownCount} เกม</p>
                  </div>
                </div>

                {/* Controls: Mobile Filter Trigger + Sort Dropdown */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(true)}
                    className="btn-jelly lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-900 text-sm font-bold text-indigo-700 dark:text-indigo-200 shadow-sm"
                  >
                    <Filter className="w-4 h-4" />
                    <span>ตัวกรอง</span>
                    {hasActiveFilters && (
                      <span className="min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {filters.subjects.length + filters.grades.length + filters.mediaTypes.length}
                      </span>
                    )}
                  </button>
                  <SortDropdown value={sortOption} onChange={setSortOption} />
                </div>
              </div>

              {/* Active Filter Tags */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">ตัวกรองที่เลือก:</span>
                  {[
                    ...filters.subjects.map((v) => ({ v: v as string, key: 'subjects' as const })),
                    ...filters.grades.map((v) => ({ v: v as string, key: 'grades' as const })),
                    ...filters.mediaTypes.map((v) => ({ v, key: 'mediaTypes' as const })),
                  ].map(({ v, key }) => (
                    <span
                      key={`${key}-${v}`}
                      className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-xs font-bold bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-200 border-2 border-indigo-200 dark:border-indigo-800 shadow-sm animate-pop-in"
                    >
                      <span>{v}</span>
                      <button
                        type="button"
                        onClick={() => setFilters({ ...filters, [key]: (filters[key] as string[]).filter((x) => x !== v) })}
                        className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900"
                        aria-label={`ลบตัวกรอง ${v}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button type="button" onClick={handleResetFilters} className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold ml-1">
                    ล้างทั้งหมด
                  </button>
                </div>
              )}

              {isLoadingMedia ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="aspect-square bg-gray-200/80 dark:bg-gray-800/80 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : filteredAndSortedMedia.length === 0 ? (
                allMedia.length === 0 ? (
                  <EmptyState type="no-media" onOpenAddModal={() => setIsAddMediaOpen(true)} />
                ) : (
                  <EmptyState type="no-filter-results" onResetFilters={handleResetFilters} />
                )
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                  {filteredAndSortedMedia.map((media, i) => (
                    // การ์ดเด้งเข้าทีละใบ (key รวมตัวกรอง เพื่อให้เล่นใหม่ทุกครั้งที่กรอง)
                    <div
                      key={`${media.id}-${filters.subjects.join()}-${filters.grades.join()}-${filters.mediaTypes.join()}-${sortOption}`}
                      className="h-full animate-pop-in"
                      style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}
                    >
                      <MediaCard
                        media={media}
                        isFavorite={favoriteIds.has(media.id)}
                        onToggleFavorite={handleToggleFavorite}
                        onSelectMedia={handleSelectMedia}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative mt-16 px-4 sm:px-6 lg:px-8 pb-8">
        <div className={hp.footer}>
          <div className={hp.footerFlags} aria-hidden="true">
            {Array.from({ length: 48 }).map((_, i) => (
              <i key={i} style={{ background: ['#ff6b7a', '#ffcf3f', '#3fd6a8', '#4fb3ff', '#9b6cf0'][i % 5] }} />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-6 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="สื่อการสอน 5G" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-[3px] border-[#fff8ec] shrink-0" />
              <div>
                <p className="font-display text-2xl leading-tight">สื่อการสอน 5G</p>
                <p className="mt-1 text-sm opacity-80">เกมการเรียนรู้และระบบสร้างสื่อการสอน สำหรับเด็กประถม ป.1 - ป.6</p>
                <a
                  href="https://www.facebook.com/profile.php?id=61594556657667"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-jelly mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold bg-[#ffcf3f] text-[#2a2350] border-[3px] border-[#fff8ec]"
                >
                  <FacebookIcon className="w-4 h-4 text-blue-700" />
                  <span>ติดต่อสอบถามผ่านเพจ Facebook</span>
                </a>
              </div>
            </div>

            <nav aria-label="ลิงก์ด่วน" className="grid grid-cols-2 gap-2 content-start">
              <button type="button" onClick={scrollToLibrary} className={hp.footBtn}>
                เกมการเรียนรู้
              </button>
              {[
                { label: 'สร้างเกมของฉัน', href: '/create' },
                { label: 'สร้างสื่อการสอน', href: '/studio' },
                { label: 'สมัครสมาชิก', href: '/membership' },
              ].map((l) => (
                <a key={l.label} href={l.href} className={hp.footBtn}>
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="border-t-2 border-dashed border-white/20 px-6 sm:px-8 py-3 text-xs opacity-70 text-center sm:text-left">สื่อการสอน 5G · เกมการเรียนรู้ออนไลน์ระดับประถมศึกษา</div>
        </div>
      </footer>

      </div>

      {/* มาสคอต น้องไฟว์จี มุมขวาล่าง (คลิปพื้นหลังโปร่งใส ไม่บังการกด) */}
      <FiveGMascot />

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        filters={filters}
        onFilterChange={setFilters}
        onReset={handleResetFilters}
        totalFilteredCount={shownCount}
        typeOptions={typeOptions}
      />

      {/* Dev Add Media Modal */}
      <AddMediaModal
        isOpen={isAddMediaOpen}
        onClose={() => setIsAddMediaOpen(false)}
        onSuccess={fetchMedia}
      />

      {/* Media Detail Popup (Netflix-style center quick view & play) */}
      <MediaDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        media={selectedMedia}
        isFavorite={selectedMedia ? favoriteIds.has(selectedMedia.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onMediaOpened={handleMediaOpened}
      />
    </div>
  );
}

/** สีวิชาบนปุ่มเลือกวิชา (โทนเดียวกับแท็กวิชา) */
const SUBJECT_COLOR: Record<string, string> = { คณิตศาสตร์: '#20b486', วิทยาศาสตร์: '#3b82f6', ภาษาอังกฤษ: '#f08a24' };
