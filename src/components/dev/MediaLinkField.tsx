'use client';

import React from 'react';
import { Link2 } from 'lucide-react';
import type { MediaType } from '@/types/database';

/** ช่องลิงก์เว็บไซต์เกม/สื่อ */
export function MediaLinkField({
  value,
  onChange,
  error,
}: {
  mediaType?: MediaType;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Link เว็บไซต์เกม / สื่อ *</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <Link2 className="w-4 h-4" />
        </span>
        <input
          type="url"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
}
