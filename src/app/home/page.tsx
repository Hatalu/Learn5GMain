'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import {
  FilterState,
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
import { AddMediaModal } from '@/components/dev/AddMediaModal';
import { MediaDetailModal } from '@/components/media/MediaDetailModal';
import {
  Filter,
  Sparkles,
  LayoutGrid,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function HomePage() {
  const { user, isDev, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { success, error } = useToast();
  const supabase = createClient();

  // Media and favorites state
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);

  // Filters state with accessTiers
  const [filters, setFilters] = useState<FilterState>({
    subjects: [],
    grades: [],
    mediaTypes: [],
    accessTiers: [],
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

  // Fetch all media
  const fetchMedia = useCallback(async () => {
    setIsLoadingMedia(true);
    try {
      // 1. Try public endpoint first
      const res = await fetch('/api/media');
      if (res.ok) {
        const json = await res.json();
        if (json.media && Array.isArray(json.media)) {
          setAllMedia(json.media);
          return;
        }
      }

      // 2. Fallback to direct supabase query
      const { data, error: mediaError } = await supabase
        .from('media')
        .select('*')
        .order('created_at', { ascending: false });

      if (mediaError) throw mediaError;
      setAllMedia((data as MediaItem[]) || []);
    } catch (err) {
      console.error('Error fetching media:', err);
    } finally {
      setIsLoadingMedia(false);
    }
  }, [supabase]);

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

  // Fetch media on mount immediately
  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

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
      error('คุณยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบเพื่อบันทึกรายการโปรด');
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
        success('นำออกจากรายการโปรดแล้ว');
      } else {
        // Add to favorites
        const { error: insError } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            media_id: mediaId,
          });

        if (insError) throw insError;
        success('เพิ่มลงในรายการโปรดแล้ว');
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

  // Reset all filters
  const handleResetFilters = () => {
    setFilters({
      subjects: [],
      grades: [],
      mediaTypes: [],
      accessTiers: [],
    });
  };

  // Filter and Sort calculation
  const filteredAndSortedMedia = useMemo(() => {
    let result = [...allMedia];

    // Filter by Access Tier (Free vs Premium)
    if (filters.accessTiers.length > 0) {
      result = result.filter((m) =>
        filters.accessTiers.includes((m.access_tier || 'premium') as any)
      );
    }

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

    return result;
  }, [allMedia, filters, sortOption]);

  // Netflix Rail items: latest items
  const latestMediaList = useMemo(() => {
    return [...allMedia]
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 10);
  }, [allMedia]);

  const hasActiveFilters =
    filters.subjects.length > 0 ||
    filters.grades.length > 0 ||
    filters.mediaTypes.length > 0 ||
    filters.accessTiers.length > 0;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Netflix-style Rail: สื่อใหม่ล่าสุด (Shown when not filtering) */}
        {!hasActiveFilters && latestMediaList.length > 0 && (
          <div className="mb-8">
            <MediaRail
              title="สื่อใหม่ล่าสุด"
              subtitle="คลังสื่อการสอนและเกมการศึกษาที่เพิ่มเข้ามาใหม่ล่าสุด"
              items={latestMediaList}
              favoriteIds={favoriteIds}
              onToggleFavorite={handleToggleFavorite}
              onSelectMedia={handleSelectMedia}
              icon={<Sparkles className="w-5 h-5 text-indigo-500" />}
            />
          </div>
        )}

        {/* Main Content Layout: Sidebar + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8 items-start">
          {/* Desktop Left Sidebar Filter */}
          <div className="hidden lg:block lg:col-span-1">
            <FilterSidebar
              filters={filters}
              onFilterChange={setFilters}
              onReset={handleResetFilters}
              totalFilteredCount={filteredAndSortedMedia.length}
            />
          </div>

          {/* Right Main Media Grid */}
          <div className="lg:col-span-3 space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-200/80 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-indigo-500" />
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {hasActiveFilters ? 'ผลลัพธ์การกรองสื่อ' : 'คลังสื่อการสอนทั้งหมด'}
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                  {filteredAndSortedMedia.length} รายการ
                </span>
              </div>

              {/* Controls: Mobile Filter Trigger + Sort Dropdown */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                {/* Mobile Filter Button */}
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-300 shadow-sm"
                >
                  <Filter className="w-3.5 h-3.5 text-indigo-500" />
                  <span>ตัวกรอง</span>
                  {hasActiveFilters && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  )}
                </button>

                {/* Sort Dropdown */}
                <SortDropdown value={sortOption} onChange={setSortOption} />
              </div>
            </div>

            {/* Active Filter Tags */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ตัวกรองที่เลือก:
                </span>

                {/* Access Tier Tags */}
                {filters.accessTiers.map((tier) => (
                  <span
                    key={tier}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
                      tier === 'free'
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    )}
                  >
                    <span>{tier === 'free' ? 'ฟรี (Free)' : 'พรีเมียม (Premium)'}</span>
                    <button
                      onClick={() =>
                        setFilters({
                          ...filters,
                          accessTiers: filters.accessTiers.filter((t) => t !== tier),
                        })
                      }
                      className="hover:opacity-75"
                      aria-label={`ลบตัวกรอง ${tier}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Subject Tags */}
                {filters.subjects.map((sub) => (
                  <span
                    key={sub}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  >
                    <span>{sub}</span>
                    <button
                      onClick={() =>
                        setFilters({
                          ...filters,
                          subjects: filters.subjects.filter((s) => s !== sub),
                        })
                      }
                      className="hover:text-indigo-900 dark:hover:text-white"
                      aria-label={`ลบตัวกรอง ${sub}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Grade Tags */}
                {filters.grades.map((grade) => (
                  <span
                    key={grade}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
                  >
                    <span>{grade}</span>
                    <button
                      onClick={() =>
                        setFilters({
                          ...filters,
                          grades: filters.grades.filter((g) => g !== grade),
                        })
                      }
                      className="hover:text-violet-900 dark:hover:text-white"
                      aria-label={`ลบตัวกรอง ${grade}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Media Type Tags */}
                {filters.mediaTypes.map((type) => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  >
                    <span>{type}</span>
                    <button
                      onClick={() =>
                        setFilters({
                          ...filters,
                          mediaTypes: filters.mediaTypes.filter((t) => t !== type),
                        })
                      }
                      className="hover:text-indigo-900 dark:hover:text-white"
                      aria-label={`ลบตัวกรอง ${type}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                <button
                  onClick={handleResetFilters}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium ml-1"
                >
                  ล้างทั้งหมด
                </button>
              </div>
            )}

            {/* Loading State */}
            {isLoadingMedia ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="aspect-square bg-gray-200/80 dark:bg-gray-800/80 rounded-2xl animate-pulse"
                  />
                ))}
              </div>
            ) : filteredAndSortedMedia.length === 0 ? (
              // Empty State
              allMedia.length === 0 ? (
                <EmptyState
                  type="no-media"
                  onOpenAddModal={() => setIsAddMediaOpen(true)}
                />
              ) : (
                <EmptyState
                  type="no-filter-results"
                  onResetFilters={handleResetFilters}
                />
              )
            ) : (
              // Responsive Card Grid (1 col mobile, 2 col tablet, 3 col desktop)
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                {filteredAndSortedMedia.map((media) => (
                  <MediaCard
                    key={media.id}
                    media={media}
                    isFavorite={favoriteIds.has(media.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onSelectMedia={handleSelectMedia}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        filters={filters}
        onFilterChange={setFilters}
        onReset={handleResetFilters}
        totalFilteredCount={filteredAndSortedMedia.length}
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
