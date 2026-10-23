'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import {
  FilterState,
  GAME_FILTER_TYPES,
  MediaItem,
  SortOption,
} from '@/types/database';
import { ALL_DOC_TYPES, DocumentItem, isMissingTable, normalizeDocument } from '@/lib/documents';
import { LibrarySwitch, LibraryKind } from '@/components/docs/LibrarySwitch';
import { DocumentCard } from '@/components/docs/DocumentCard';
import { DocumentViewerModal } from '@/components/docs/DocumentViewerModal';
import { PaperStackIcon, VideoScreenIcon } from '@/components/docs/DocIcons';
import { isVideoMedia } from '@/lib/youtube';
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
  Loader2,
  X,
} from 'lucide-react';
import { FiveGMascot } from '@/components/mascot/FiveGMascot';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { cn } from '@/lib/utils/cn';
import { OfferBanner } from '@/components/membership/Pricing';
import { SocialProof } from '@/components/membership/SocialProof';
import { PromoBanners } from '@/components/home/PromoBanners';
import { AudiencePaths } from '@/components/home/AudiencePaths';
import { useAudience } from '@/components/home/audience';

export default function HomePage() {
  const { user, isDev, isLoading: authLoading } = useAuth();
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

  // คลังที่เปิดอยู่: เกมการเรียนรู้ (ค่าเริ่มต้น) / วิดีโอ (?lib=videos) / เอกสาร-ใบงาน (?lib=docs)
  const [library, setLibrary] = useState<LibraryKind>('games');
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsReady, setDocsReady] = useState(true);
  const [openDoc, setOpenDoc] = useState<{ doc: DocumentItem; download: boolean } | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const { data, error: docErr } = await supabase
        .from('documents')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      if (docErr) {
        if (isMissingTable(docErr)) setDocsReady(false);
        return;
      }
      setDocsReady(true);
      setDocs((data || []).map((r) => normalizeDocument(r as Record<string, unknown>)));
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setDocsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  useEffect(() => {
    const lib = new URLSearchParams(window.location.search).get('lib');
    if (lib === 'docs' || lib === 'videos') setLibrary(lib);
  }, []);

  const switchLibrary = (next: LibraryKind) => {
    if (next === library) return;
    setLibrary(next);
    // ประเภทของสองคลังต่างกัน ล้างเฉพาะตัวกรองประเภท (วิชา/ชั้นคงไว้)
    setFilters((prev) => ({ ...prev, mediaTypes: [] }));
    const url = new URL(window.location.href);
    if (next !== 'games') url.searchParams.set('lib', next);
    else url.searchParams.delete('lib');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  };

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
          .filter((m: any) => m.is_public !== false && !m.is_daily)
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
            .filter((m: any) => m.is_public !== false && !m.is_daily)
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
  const openGames = () => {
    switchLibrary('games');
    scrollToLibrary();
  };
  const openDocs = () => {
    switchLibrary('docs');
    scrollToLibrary();
  };
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
    // คลังวิดีโอ = เฉพาะสื่อประเภทวิดีโอ, คลังเกม = ทุกอย่างที่ไม่ใช่วิดีโอ
    const wantVideo = library === 'videos';
    let result = allMedia.filter((m) => m.is_public !== false && isVideoMedia(m) === wantVideo);

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
  }, [allMedia, filters, sortOption, favoriteIds, user, library]);

  // คลังเอกสาร/ใบงาน: ตัวกรองวิชา/ชั้นเหมือนคลังเกม ส่วน "ประเภท" = เอกสาร / ใบงาน
  const filteredDocs = useMemo(() => {
    let result = docs;
    if (filters.subjects.length > 0) result = result.filter((d) => filters.subjects.includes(d.subject as never));
    if (filters.grades.length > 0) result = result.filter((d) => d.grade_level.some((g) => filters.grades.includes(g as never)));
    if (filters.mediaTypes.length > 0) result = result.filter((d) => filters.mediaTypes.includes(d.doc_type));
    return [...result].sort((a, b) => {
      if (sortOption === 'popular') return b.view_count + b.download_count * 3 - (a.view_count + a.download_count * 3);
      if (sortOption === 'az') return a.title.localeCompare(b.title, 'th');
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [docs, filters, sortOption]);

  const isDocs = library === 'docs';
  const isVideos = library === 'videos';
  const shownCount = isDocs ? filteredDocs.length : filteredAndSortedMedia.length;
  const typeOptions = isDocs ? ALL_DOC_TYPES : isVideos ? [] : GAME_FILTER_TYPES;
  const videoCount = useMemo(() => allMedia.filter(isVideoMedia).length, [allMedia]);

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
    <div className="min-h-screen flex flex-col bg-[#fff8ec] dark:bg-[#1f1a56] text-foreground transition-colors duration-200">
      <Navbar />

      {/* ส่วนหัว: น้องไฟว์จี 3D + แถบภาพปกเกม (พื้นท้ายฉากสีเดียวกับพื้นหน้า) */}
      <HomeHero
        media={allMedia}
        isLoading={isLoadingMedia}
        onPickSubject={handlePickSubject}
        onSelectMedia={handleSelectMedia}
        onBrowseAll={scrollToLibrary}
        onDaily={scrollToDaily}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-6">
        {/* ป้ายโฆษณาระบบต่างๆ ในเว็บ (กดปิดได้ ซ่อน 1 วัน) */}
        <PromoBanners className="mt-2" audience={audience} onDocs={openDocs} onLibrary={openGames} />

        {/* ข้อเสนอสมาชิก (ส่วนลดบัญชีใหม่ / โบนัสต่ออายุ) + ตัวเลขผู้ใช้จริง */}
        <OfferBanner className="mt-6" />
        <SocialProof className="mt-5" />

        {/* เลือกกลุ่ม ผู้ปกครอง / คุณครู แล้วได้ภารกิจลองใช้ + ความคุ้มของสมาชิก */}
        <Reveal className="mt-8 sm:mt-10">
          <AudiencePaths audience={audience} onPick={setAudience} onDocs={openDocs} onLibrary={openGames} onDaily={scrollToDaily} />
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
                <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sun-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-500/30 animate-wiggle">
                  <Sparkles className="w-5 h-5 text-white" />
                </span>
              }
            />
          </Reveal>
        )}

        {/* ---------- คลังสื่อ: สลับ เกมการเรียนรู้ / เอกสาร-ใบงาน ---------- */}
        <section id="library" data-tour="library" className="relative mt-10 sm:mt-14 scroll-mt-20">
          <div data-tour="library-head" className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] px-3 sm:px-8 pt-7 sm:pt-10 pb-5 sm:pb-7 bg-gradient-to-br from-indigo-100/80 via-white to-pink-100/70 dark:from-[#1d1745] dark:via-[#150f30] dark:to-[#2a1340] border-[3px] border-indigo-200/70 dark:border-indigo-500/25 shadow-toy text-center">
            <span aria-hidden="true" className="pointer-events-none absolute -top-20 -left-16 w-64 h-64 rounded-full bg-violet-400/25 dark:bg-violet-500/20 blur-3xl" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-10 w-72 h-72 rounded-full bg-sky-400/25 dark:bg-sky-500/15 blur-3xl" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-25 [background-image:radial-gradient(rgba(124,58,237,0.16)_1.2px,transparent_1.2px)] [background-size:20px_20px]" />
            <Sparkles aria-hidden="true" className="absolute top-6 left-[12%] w-5 h-5 text-sun-400 animate-twinkle hidden sm:block" />
            <Sparkles aria-hidden="true" className="absolute bottom-24 right-[10%] w-4 h-4 text-pink-400 animate-twinkle [animation-delay:1.2s] hidden sm:block" />

            <div className="relative">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-white/10 border-2 border-indigo-200/70 dark:border-indigo-400/30 text-xs font-bold text-indigo-700 dark:text-indigo-200">
                <LayoutGrid className="w-3.5 h-3.5" /> คลังสื่อการสอน ป.1 - ป.6
              </span>
              <h2 className="mt-3 font-display text-2xl sm:text-4xl leading-tight text-gray-900 dark:text-white">
                วันนี้อยากใช้<span className="text-gradient-brand">สื่อแบบไหน</span>
              </h2>
              <p className="mt-1.5 text-sm sm:text-base text-gray-600 dark:text-gray-300">เกมฝึกทักษะให้เด็กเล่นสนุก คลิปวิดีโอดูฟรี หรือเอกสารและใบงานพร้อมพิมพ์ใช้ในห้องเรียน</p>
              <div className="mt-5 sm:mt-7">
                <LibrarySwitch
                  value={library}
                  onChange={switchLibrary}
                  counts={{
                    games: isLoadingMedia ? null : allMedia.length - videoCount,
                    videos: isLoadingMedia ? null : videoCount,
                    docs: docsLoading ? null : docs.length,
                  }}
                />
              </div>
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b-2 border-dashed border-indigo-100 dark:border-indigo-900/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cn(
                      'w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shadow-lg',
                      isDocs
                        ? 'from-sky-400 to-indigo-500 shadow-sky-500/30'
                        : isVideos
                          ? 'from-rose-500 to-fuchsia-500 shadow-rose-500/30'
                          : 'from-indigo-500 to-fuchsia-500 shadow-indigo-500/30'
                    )}
                  >
                    {isDocs ? <PaperStackIcon className="w-7 h-7" /> : isVideos ? <VideoScreenIcon className="w-7 h-7" /> : <LayoutGrid className="w-5 h-5" />}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-xl sm:text-2xl leading-tight text-gray-900 dark:text-white truncate">
                      {hasActiveFilters ? 'ผลลัพธ์การกรอง' : isDocs ? 'เอกสารและใบงานทั้งหมด' : isVideos ? 'วิดีโอทั้งหมด' : 'เกมการเรียนรู้ทั้งหมด'}
                    </h2>
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">{shownCount} รายการ</p>
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

              {isDocs ? (
                docsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="aspect-[4/5] bg-gray-200/80 dark:bg-gray-800/80 rounded-3xl animate-pulse" />
                    ))}
                  </div>
                ) : filteredDocs.length === 0 ? (
                  docs.length === 0 ? (
                    <DocsEmpty ready={docsReady} isDev={isDev} />
                  ) : (
                    <EmptyState type="no-filter-results" onResetFilters={handleResetFilters} />
                  )
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                    {filteredDocs.map((d, i) => (
                      <div
                        key={`${d.id}-${filters.subjects.join()}-${filters.grades.join()}-${filters.mediaTypes.join()}-${sortOption}`}
                        className="h-full animate-pop-in"
                        style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}
                      >
                        <DocumentCard doc={d} onOpen={(doc, download) => setOpenDoc({ doc, download: Boolean(download) })} />
                      </div>
                    ))}
                  </div>
                )
              ) : isLoadingMedia ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="aspect-square bg-gray-200/80 dark:bg-gray-800/80 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : filteredAndSortedMedia.length === 0 ? (
                isVideos && videoCount === 0 ? (
                  <VideosEmpty isDev={isDev} />
                ) : allMedia.length === 0 ? (
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
      <footer className="mt-16 px-4 sm:px-6 lg:px-8 pb-8">
        <div className="relative max-w-7xl mx-auto overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 dark:from-[#2a1d6b] dark:via-[#3a1a6e] dark:to-[#5a1a62] text-white shadow-toy-lg">
          <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-1/4 w-72 h-40 rounded-full bg-sky-300/20 blur-3xl" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:22px_22px]" />

          <div className="relative grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-6 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="สื่อการสอน 5G" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ring-4 ring-white/30 shadow-lg shrink-0" />
              <div>
                <p className="font-display text-2xl leading-tight">สื่อการสอน 5G</p>
                <p className="mt-1 text-sm text-white/85">คลังเกมการเรียนรู้ เอกสาร และใบงาน สำหรับเด็กประถม ป.1 - ป.6</p>
                <a
                  href="https://www.facebook.com/profile.php?id=61594556657667"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-jelly mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold bg-white text-indigo-700 shadow-[0_4px_0_0_rgba(30,10,80,0.35)]"
                >
                  <FacebookIcon className="w-4 h-4 text-blue-600" />
                  <span>ติดต่อสอบถามผ่านเพจ Facebook</span>
                </a>
              </div>
            </div>

            <nav aria-label="ลิงก์ด่วน" className="grid grid-cols-2 gap-2 content-start">
              {[
                { label: 'เกมการเรียนรู้', onClick: () => { switchLibrary('games'); scrollToLibrary(); } },
                { label: 'วิดีโอ', onClick: () => { switchLibrary('videos'); scrollToLibrary(); } },
                { label: 'เอกสาร/ใบงาน', onClick: () => { switchLibrary('docs'); scrollToLibrary(); } },
                { label: 'สร้างเกมของฉัน', href: '/create' },
                { label: 'สมัครสมาชิก', href: '/membership' },
              ].map((l) =>
                l.href ? (
                  <a key={l.label} href={l.href} className="btn-jelly px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border-2 border-white/20 text-sm font-bold text-center">
                    {l.label}
                  </a>
                ) : (
                  <button key={l.label} type="button" onClick={l.onClick} className="btn-jelly px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border-2 border-white/20 text-sm font-bold">
                    {l.label}
                  </button>
                )
              )}
            </nav>
          </div>
          <div className="relative border-t border-white/15 px-6 sm:px-8 py-3 text-xs text-white/70 text-center sm:text-left">
            สื่อการสอน 5G · คลังสื่อการเรียนรู้ออนไลน์ระดับประถมศึกษา
          </div>
        </div>
      </footer>

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

      {/* เปิดดูเอกสาร/ใบงาน */}
      <DocumentViewerModal
        doc={openDoc?.doc ?? null}
        startDownload={openDoc?.download}
        onClose={() => setOpenDoc(null)}
        onViewed={(id) => setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, view_count: d.view_count + 1 } : d)))}
        onDownloaded={(id) => setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, download_count: d.download_count + 1 } : d)))}
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

/** คลังเอกสารยังว่าง (หรือยังไม่ได้รัน migration 022) */
function VideosEmpty({ isDev }: { isDev: boolean }) {
  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center px-6 py-12 sm:py-16 text-center rounded-[2rem] border-[3px] border-dashed border-pink-200 dark:border-pink-800/60 bg-white/60 dark:bg-gray-900/50 my-2">
      <span className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-fuchsia-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 animate-float-slow">
        <VideoScreenIcon className="w-12 h-12" />
      </span>
      <h3 className="mt-5 font-display text-xl text-gray-900 dark:text-white">คลิปวิดีโอกำลังมาเร็วๆ นี้</h3>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-sm">ทีมงานกำลังเตรียมคลิปการสอนให้ดูฟรี ระหว่างนี้ลองเล่นเกมการเรียนรู้ก่อนได้เลย</p>
      {isDev && (
        <Link href="/dev" className="btn-jelly btn-primary-grad mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold">
          + เพิ่มวิดีโอ (หน้า Dev เลือกประเภท &quot;วิดีโอ&quot;)
        </Link>
      )}
    </div>
  );
}

function DocsEmpty({ ready, isDev }: { ready: boolean; isDev: boolean }) {
  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center px-6 py-12 sm:py-16 text-center rounded-[2rem] border-[3px] border-dashed border-indigo-200 dark:border-indigo-800/70 bg-white/60 dark:bg-gray-900/50 my-2">
      <span className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-float-slow">
        <PaperStackIcon className="w-12 h-12" />
      </span>
      <h3 className="mt-5 font-display text-xl text-gray-900 dark:text-white">เอกสารและใบงานกำลังมาเร็วๆ นี้</h3>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-sm">ทีมงานกำลังเตรียมเอกสารการสอนและใบงานพร้อมพิมพ์ ระหว่างนี้ลองเล่นเกมการเรียนรู้ก่อนได้เลย</p>
      {isDev && (
        <Link href="/dev?tab=docs" className="btn-jelly btn-primary-grad mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold">
          {ready ? '+ เพิ่มเอกสาร/ใบงาน (หน้า Dev)' : 'Dev: รัน migration 022 ก่อนใช้งาน'}
        </Link>
      )}
    </div>
  );
}
