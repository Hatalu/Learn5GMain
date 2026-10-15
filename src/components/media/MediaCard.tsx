'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { MediaItem } from '@/types/database';
import { Heart, Pin, Play, Eye, Layers, Unlock, Lock, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { SubjectTag } from '@/components/media/SubjectTag';
import { useCompanionOptional } from '@/components/companion/CompanionProvider';
import { useTrial } from '@/components/trial/TrialProvider';
import { hasMembership } from '@/lib/membership';

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
  const { user, profile } = useAuth();
  const { openTrial } = useTrial();
  const [imgError, setImgError] = useState(false);
  const localViews = media.view_count;

  // ทุกสื่อสำหรับสมาชิก: ล็อกถ้ายังไม่ใช่สมาชิก (เกมประจำวันที่แอดมินเปิดให้ทุกคนเล่นเฉพาะวันนั้นไม่ล็อก)
  const dailyFree = useCompanionOptional()?.dailyUnlockedId === media.id;
  const isLocked = !dailyFree && !(user && hasMembership(profile));

  const openDetail = () => onSelectMedia?.(media);

  const fallbackImage =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%237140f0"/><stop offset="1" stop-color="%23f53d9b"/></linearGradient></defs><rect width="100%" height="100%" fill="url(%23g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="700" fill="white">5G</text></svg>';

  return (
    <article
      onClick={openDetail}
      className={cn(
        'group relative flex flex-col h-full bg-white dark:bg-gray-900 border-[3px] rounded-3xl overflow-hidden shadow-toy hover:shadow-toy-lg media-card-hover cursor-pointer',
        isFavorite
          ? 'border-amber-400 dark:border-amber-400/80 ring-2 ring-amber-300/40'
          : 'border-indigo-300/80 dark:border-indigo-400/55 hover:border-indigo-500 dark:hover:border-indigo-300 ring-1 ring-white/50 dark:ring-white/5'
      )}
    >
      {/* 1:1 Thumbnail */}
      <div className="relative aspect-square w-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {/* ป้ายสถานะ */}
        {(dailyFree || isLocked) && (
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            {dailyFree ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-mint-500 text-white shadow-md shadow-mint-500/40 ring-2 ring-white/70">
                <Unlock className="w-3 h-3" />
                <span>ฟรีวันนี้</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-sun-500 to-orange-500 text-white shadow-md shadow-amber-500/40 ring-2 ring-white/70">
                <Lock className="w-3 h-3" />
                <span>สำหรับสมาชิก</span>
              </span>
            )}
          </div>
        )}

        <Image
          src={imgError ? fallbackImage : media.icon_url || fallbackImage}
          alt={media.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
          onError={() => setImgError(true)}
          className={cn(
            'object-cover group-hover:scale-110 transition-transform duration-500 ease-out',
            isLocked && 'saturate-[0.85]'
          )}
        />

        <span className="card-shine" aria-hidden="true" />

        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
          <span className="w-16 h-16 rounded-full bg-white/95 text-indigo-600 flex items-center justify-center shadow-xl scale-75 group-hover:scale-100 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
            {isLocked ? <Lock className="w-7 h-7" /> : <Play className="w-7 h-7 fill-current ml-1" />}
          </span>
        </div>

        {/* Favorite */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!user) return; // ยังไม่ได้เข้าสู่ระบบ: ปักหมุดไม่ได้
            onToggleFavorite(media.id, isFavorite);
          }}
          disabled={!user}
          className={cn(
            'fav-btn btn-jelly absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md shadow-md z-10 ring-2 ring-white/60',
            !user
              ? 'bg-black/30 text-white/50 cursor-not-allowed'
              : isFavorite
                ? 'bg-amber-500 text-white'
                : 'bg-black/40 text-white/90 hover:text-white hover:bg-black/60'
          )}
          aria-label={!user ? 'เข้าสู่ระบบเพื่อปักหมุดเกม' : isFavorite ? 'เลิกปักหมุด' : 'ปักหมุดเกมนี้ไว้ด้านบน'}
          aria-pressed={isFavorite}
          title={!user ? 'เข้าสู่ระบบเพื่อปักหมุดเกม' : isFavorite ? 'เลิกปักหมุด' : 'ปักหมุดเกมนี้ไว้ด้านบน'}
        >
          {isFavorite ? <Pin className="w-4 h-4 fill-current" /> : <Heart className="w-4 h-4" />}
        </button>

        {/* Views */}
        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1 shadow-sm">
          <Eye className="w-3.5 h-3.5 opacity-90" />
          <span>{localViews.toLocaleString('th-TH')}</span>
        </div>

        {/* Media type */}
        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-white/95 dark:bg-gray-900/90 backdrop-blur-md text-gray-800 dark:text-gray-100 text-xs font-semibold flex items-center gap-1 shadow-sm">
          <Layers className="w-3 h-3 text-indigo-500" />
          <span>{media.media_type}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            <SubjectTag subject={media.subject} size="sm" />
            {media.grade_level?.map((grade) => (
              <span
                key={grade}
                className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              >
                {grade}
              </span>
            ))}
          </div>

          <h3
            className="font-display font-medium text-base sm:text-lg text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors"
            title={media.title}
          >
            {media.title}
          </h3>

          {media.description && (
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {media.description}
            </p>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-stretch gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDetail();
            }}
            className={cn(
              'btn-jelly flex-1 min-w-[6.5rem] inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-sm font-bold',
              isLocked
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200 border-2 border-indigo-200 dark:border-indigo-800'
                : 'btn-primary-grad'
            )}
          >
            {isLocked ? <Lock className="w-4 h-4 shrink-0" /> : <Play className="w-4 h-4 fill-current shrink-0" />}
            <span className="truncate">{isLocked ? 'ดูข้อมูล' : 'เล่นเลย'}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openTrial(media);
            }}
            className="btn-jelly flex-1 min-w-[7rem] inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-sm font-bold bg-sun-400/25 text-amber-900 dark:text-sun-300 border-2 border-sun-500/60"
            title="ทดลองเล่น 5 นาที ไม่ต้องใส่รหัส"
            aria-label={`ทดลองเล่น ${media.title} 5 นาที`}
          >
            <PlayCircle className="w-4 h-4" />
            <span>ทดลองเล่น</span>
          </button>
        </div>
      </div>
    </article>
  );
}
