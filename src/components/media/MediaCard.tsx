'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { MediaItem } from '@/types/database';
import { Heart, ExternalLink, Eye, Layers, Crown, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface MediaCardProps {
  media: MediaItem;
  isFavorite: boolean;
  onToggleFavorite: (mediaId: string, currentFav: boolean) => void;
  onSelectMedia?: (media: MediaItem) => void;
  priority?: boolean;
}

export function MediaCard({
  media,
  isFavorite,
  onToggleFavorite,
  onSelectMedia,
  priority = false,
}: MediaCardProps) {
  const { user } = useAuth();
  const [imgError, setImgError] = useState(false);
  const localViews = media.view_count;

  const isFree = String(media.access_tier || 'premium').toLowerCase().trim() === 'free';

  // Subject badge color scheme
  const getSubjectBadge = (subject: string) => {
    switch (subject) {
      case 'คณิตศาสตร์':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'วิทยาศาสตร์':
        return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';
      case 'ภาษาอังกฤษ':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      default:
        return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // If user clicked directly on the favorite button, do not open details modal
    if ((e.target as HTMLElement).closest('.fav-btn')) {
      return;
    }
    e.preventDefault();
    if (onSelectMedia) {
      onSelectMedia(media);
    }
  };

  const fallbackImage =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="100%" height="100%" fill="%236366f1"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="28" fill="white">Educational Media</text></svg>';

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col h-full bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 media-card-hover cursor-pointer"
    >
      {/* 1:1 Aspect Ratio Thumbnail */}
      <div className="relative aspect-square w-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {/* Tier Badge (Top Left) */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          {isFree ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
              <Unlock className="w-3 h-3" />
              <span>FREE</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30">
              <Crown className="w-3 h-3" />
              <span>PREMIUM</span>
            </span>
          )}
        </div>

        {/* Thumbnail Image */}
        <Image
          src={imgError ? fallbackImage : media.icon_url || fallbackImage}
          alt={media.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
          onError={() => setImgError(true)}
          className="object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
        />

        {/* Floating Favorite Button (Top Right) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(media.id, isFavorite);
          }}
          className={cn(
            'fav-btn absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-rose-500 z-10',
            isFavorite
              ? 'bg-rose-500 text-white hover:bg-rose-600 scale-105'
              : 'bg-black/40 text-white/90 hover:text-white hover:bg-black/60'
          )}
          aria-label={isFavorite ? 'นำออกจากรายการโปรด' : 'เพิ่มลงรายการโปรด'}
          title={isFavorite ? 'นำออกจากรายการโปรด' : 'เพิ่มลงรายการโปรด'}
        >
          <Heart
            className={cn(
              'w-4 h-4 transition-transform active:scale-75',
              isFavorite && 'fill-current text-white'
            )}
          />
        </button>

        {/* Views counter tag overlay (Bottom Left) */}
        <div className="absolute bottom-2.5 left-2.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1 shadow-sm">
          <Eye className="w-3.5 h-3.5 opacity-90" />
          <span>{localViews.toLocaleString('th-TH')}</span>
        </div>

        {/* Media type tag overlay (Bottom Right) */}
        <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-md text-gray-800 dark:text-gray-200 text-[10px] font-semibold flex items-center gap-1 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
          <Layers className="w-3 h-3 text-indigo-500" />
          <span>{media.media_type}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Badges: Subject & Grades */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span
              className={cn(
                'px-2 py-0.5 rounded-md text-[11px] font-semibold border',
                getSubjectBadge(media.subject)
              )}
            >
              {media.subject}
            </span>

            {media.grade_level?.map((grade) => (
              <span
                key={grade}
                className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/60"
              >
                {grade}
              </span>
            ))}
          </div>

          {/* Title */}
          <h4
            className="font-bold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
            title={media.title}
          >
            {media.title}
          </h4>

          {/* Description */}
          {media.description && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {media.description}
            </p>
          )}
        </div>

        {/* Action Button: Opens Details Popup */}
        <button
          type="button"
          onClick={handleCardClick}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-indigo-600 text-gray-800 hover:text-white dark:bg-gray-800 dark:hover:bg-indigo-600 dark:text-gray-200 dark:hover:text-white transition-all duration-200 border border-gray-200 dark:border-gray-700 group/btn"
        >
          <span>เข้าสู่สื่อ</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
