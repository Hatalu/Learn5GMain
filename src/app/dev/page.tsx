'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MediaItem, SystemStats } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { Navbar } from '@/components/navbar/Navbar';
import { StatCards } from '@/components/dev/StatCards';
import { MemberManagement } from '@/components/dev/MemberManagement';
import { AddMediaModal } from '@/components/dev/AddMediaModal';
import { EditMediaModal } from '@/components/dev/EditMediaModal';
import { DeleteConfirmModal } from '@/components/dev/DeleteConfirmModal';
import {
  ShieldCheck,
  BookOpen,
  Users,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ExternalLink,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function DevDashboardPage() {
  const { isDev, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'media' | 'members'>('media');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);

  // Modal states
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [deletingMedia, setDeletingMedia] = useState<MediaItem | null>(null);

  // Guard: if not dev after loading, push to /home
  useEffect(() => {
    if (!authLoading && !isDev) {
      router.replace('/home');
    }
  }, [authLoading, isDev, router]);

  // Fetch system stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/dev/stats');
      const data = await res.json();
      if (res.ok && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch all media for management
  const fetchMedia = useCallback(async () => {
    setMediaLoading(true);
    try {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMediaList((data as MediaItem[]) || []);
    } catch (err) {
      console.error('Error fetching media:', err);
    } finally {
      setMediaLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (isDev) {
      fetchStats();
      fetchMedia();
    }
  }, [isDev, fetchStats, fetchMedia]);

  const handleMediaChanged = () => {
    fetchMedia();
    fetchStats();
  };

  if (authLoading || (!isDev && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Title & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Dev Administration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              แดชบอร์ดผู้ดูแลระบบ
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              จัดการคลังสื่อการสอน สมาชิกในระบบ และสถิติภาพรวม
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsAddMediaOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/25 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มสื่อการสอน</span>
            </button>
          </div>
        </div>

        {/* 1. Stat Cards */}
        <StatCards stats={stats} isLoading={statsLoading} />

        {/* 2. Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 mb-6">
          <button
            onClick={() => setActiveTab('media')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all',
              activeTab === 'media'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <BookOpen className="w-4 h-4" />
            <span>จัดการสื่อ ({mediaList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all',
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <Users className="w-4 h-4" />
            <span>จัดการสมาชิก</span>
          </button>
        </div>

        {/* Tab 1: Media Management */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                รายการสื่อการสอนทั้งหมด
              </h2>
            </div>

            {mediaLoading ? (
              <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-xs">กำลังโหลดคลังสื่อ...</p>
              </div>
            ) : mediaList.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  ยังไม่มีสื่อการสอนในระบบ
                </p>
                <button
                  onClick={() => setIsAddMediaOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ เพิ่มสื่อการสอนรายการแรก</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="py-3.5 px-4">Icon & ชื่อสื่อ</th>
                      <th className="py-3.5 px-4">วิชา</th>
                      <th className="py-3.5 px-4 hidden md:table-cell">ระดับชั้น</th>
                      <th className="py-3.5 px-4 hidden sm:table-cell">ประเภท</th>
                      <th className="py-3.5 px-4 text-center">ยอดชม</th>
                      <th className="py-3.5 px-4 hidden lg:table-cell">วันที่สร้าง</th>
                      <th className="py-3.5 px-4 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {mediaList.map((m) => (
                      <tr
                        key={m.id}
                        className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        {/* Icon & Title */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-200 dark:border-gray-700">
                              <Image
                                src={m.icon_url}
                                alt={m.title}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 max-w-xs">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">
                                {m.title}
                              </p>
                              <a
                                href={m.game_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5 truncate"
                              >
                                <span>เปิดสื่อ</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                            {m.subject}
                          </span>
                        </td>

                        {/* Grades */}
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {m.grade_level?.map((g) => (
                              <span
                                key={g}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Media Type */}
                        <td className="py-3.5 px-4 hidden sm:table-cell">
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {m.media_type}
                          </span>
                        </td>

                        {/* Views */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                            <Eye className="w-3 h-3 text-gray-400" />
                            {m.view_count.toLocaleString('th-TH')}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 text-xs hidden lg:table-cell">
                          {new Date(m.created_at).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingMedia(m)}
                              className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title="แก้ไขสื่อ"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingMedia(m)}
                              className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="ลบสื่อ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Member Management */}
        {activeTab === 'members' && <MemberManagement />}
      </main>

      {/* Modals */}
      <AddMediaModal
        isOpen={isAddMediaOpen}
        onClose={() => setIsAddMediaOpen(false)}
        onSuccess={handleMediaChanged}
      />

      <EditMediaModal
        media={editingMedia}
        isOpen={!!editingMedia}
        onClose={() => setEditingMedia(null)}
        onSuccess={handleMediaChanged}
      />

      <DeleteConfirmModal
        media={deletingMedia}
        isOpen={!!deletingMedia}
        onClose={() => setDeletingMedia(null)}
        onSuccess={handleMediaChanged}
      />
    </div>
  );
}
