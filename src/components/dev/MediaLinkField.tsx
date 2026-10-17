'use client';

import React from 'react';
import { CheckCircle2, Link2, PlayCircle } from 'lucide-react';
import type { MediaType } from '@/types/database';
import { VIDEO_TYPE, youTubeId, youTubeStart, youTubeThumb } from '@/lib/youtube';
import { cn } from '@/lib/utils/cn';

/** ช่องลิงก์ของสื่อ: ประเภทวิดีโอ = ลิงก์คลิป YouTube (มีภาพปกตัวอย่าง) / ประเภทอื่น = ลิงก์เว็บไซต์เกม */
export function MediaLinkField({
  mediaType,
  value,
  onChange,
  error,
}: {
  mediaType: MediaType;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const video = mediaType === VIDEO_TYPE;
  const id = video ? youTubeId(value) : null;
  const start = id ? youTubeStart(value) : 0;
  const typed = value.trim().length > 0;

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
        {video ? 'Link คลิป YouTube *' : 'Link เว็บไซต์เกม / สื่อ *'}
      </label>
      <div className="relative">
        <span className={cn('absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none', video ? 'text-rose-500' : 'text-gray-400')}>
          {video ? <PlayCircle className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        </span>
        <input
          type="url"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={video ? 'https://www.youtube.com/watch?v=... หรือ https://youtu.be/...' : 'https://...'}
          className={cn(
            'w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
            video && typed && !id ? 'border-rose-400 dark:border-rose-500/70' : 'border-gray-300 dark:border-gray-700'
          )}
        />
      </div>

      {video && (
        <div className="mt-2">
          {id ? (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
              <div className="relative w-28 aspect-video shrink-0 rounded-lg overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={youTubeThumb(id)} alt="ภาพปกคลิป" className="w-full h-full object-cover" />
                <span className="absolute inset-0 m-auto w-8 h-6 rounded-lg bg-rose-600/90 flex items-center justify-center">
                  <span className="ml-0.5 w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-white" />
                </span>
              </div>
              <div className="min-w-0 text-xs">
                <p className="font-semibold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ลิงก์คลิปใช้ได้
                </p>
                <p className="mt-0.5 text-gray-500 dark:text-gray-400">
                  รหัสคลิป {id}
                  {start > 0 && ` · เริ่มที่ ${Math.floor(start / 60)}:${String(start % 60).padStart(2, '0')}`}
                </p>
                <p className="mt-0.5 text-gray-500 dark:text-gray-400">ทุกคนกดดูได้เลย ไม่ต้องเป็นสมาชิก</p>
              </div>
            </div>
          ) : (
            <p className={cn('text-xs', typed ? 'text-rose-500' : 'text-gray-500 dark:text-gray-400')}>
              {typed ? 'ยังไม่ใช่ลิงก์คลิป YouTube' : 'คัดลอกลิงก์จากปุ่ม "แชร์" ของคลิปใน YouTube มาวางได้เลย รองรับคลิปปกติและ Shorts'}
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
}
