'use client';

import React, { useRef } from 'react';
import { MediaItem } from '@/types/database';
import { MediaCard } from './MediaCard';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface MediaRailProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  favoriteIds: Set<string>;
  onToggleFavorite: (mediaId: string, currentFav: boolean) => void;
  onMediaOpened?: (mediaId: string) => void;
  icon?: React.ReactNode;
}

export function MediaRail({
  title,
  subtitle,
  items,
  favoriteIds,
  onToggleFavorite,
  onMediaOpened,
  icon,
}: MediaRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) {
    return null;
  }

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const offset = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -offset : offset,
      behavior: 'smooth',
    });
  };

  return (
    <section className="relative my-6 sm:my-8 group/rail">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon || <Sparkles className="w-5 h-5 text-indigo-500" />}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Scroll Controls (Desktop) */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => handleScroll('left')}
            className="p-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all shadow-sm active:scale-95"
            aria-label="เลื่อนไปทางซ้าย"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleScroll('right')}
            className="p-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all shadow-sm active:scale-95"
            aria-label="เลื่อนไปทางขวา"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rail Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 px-1 hide-scrollbar snap-x snap-mandatory scroll-smooth"
      >
        {items.map((media, idx) => (
          <div
            key={media.id}
            className="w-[240px] sm:w-[260px] md:w-[280px] shrink-0 snap-start"
          >
            <MediaCard
              media={media}
              isFavorite={favoriteIds.has(media.id)}
              onToggleFavorite={onToggleFavorite}
              onMediaOpened={onMediaOpened}
              priority={idx < 4}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
