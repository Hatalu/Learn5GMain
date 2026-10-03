'use client';

import React from 'react';
import { SystemStats } from '@/types/database';
import { BookOpen, Users, Eye, Heart } from 'lucide-react';

interface StatCardsProps {
  stats: SystemStats | null;
  isLoading: boolean;
}

export function StatCards({ stats, isLoading }: StatCardsProps) {
  const cards = [
    {
      title: 'สื่อทั้งหมด',
      value: stats?.totalMedia ?? 0,
      icon: BookOpen,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/60',
      borderColor: 'border-indigo-100 dark:border-indigo-900/60',
    },
    {
      title: 'สมาชิกทั้งหมด',
      value: stats?.totalMembers ?? 0,
      icon: Users,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-950/60',
      borderColor: 'border-violet-100 dark:border-violet-900/60',
    },
    {
      title: 'ยอดเข้าชมทั้งหมด',
      value: stats?.totalViews ?? 0,
      icon: Eye,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/60',
      borderColor: 'border-emerald-100 dark:border-emerald-900/60',
    },
    {
      title: 'รายการโปรดทั้งหมด',
      value: stats?.totalFavorites ?? 0,
      icon: Heart,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/60',
      borderColor: 'border-rose-100 dark:border-rose-900/60',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.title}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 shadow-sm flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
          >
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.title}</p>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {isLoading ? (
                  <span className="inline-block w-12 h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                ) : (
                  c.value.toLocaleString('th-TH')
                )}
              </h3>
            </div>
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${c.bgColor} ${c.color} ${c.borderColor}`}
            >
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
