'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, Loader2, MailOpen, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils/cn';

interface Idea {
  id: string;
  username: string;
  subject: string;
  topic: string;
  grade: string;
  idea: string;
  is_read: boolean;
  created_at: string;
}

/** กล่องจดหมายไอเดียจากสมาชิก */
export function IdeasInbox({ onUnread }: { onUnread?: (n: number) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const { success, error } = useToast();
  const [rows, setRows] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase.from('ideas').select('*').order('created_at', { ascending: false }).limit(300);
    if (e) {
      setMissing(true);
    } else {
      setMissing(false);
      setRows((data as Idea[]) || []);
      onUnread?.(((data as Idea[]) || []).filter((r) => !r.is_read).length);
    }
    setLoading(false);
  }, [supabase, onUnread]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleOpen = async (r: Idea) => {
    setOpenId(openId === r.id ? null : r.id);
    if (!r.is_read) {
      const { error: e } = await supabase.from('ideas').update({ is_read: true }).eq('id', r.id);
      if (!e) {
        const next = rows.map((x) => (x.id === r.id ? { ...x, is_read: true } : x));
        setRows(next);
        onUnread?.(next.filter((x) => !x.is_read).length);
      }
    }
  };

  const remove = async (r: Idea) => {
    if (!confirm(`ลบไอเดียของ ${r.username} ไหม?`)) return;
    const { error: e } = await supabase.from('ideas').delete().eq('id', r.id);
    if (e) {
      error('ลบไม่สำเร็จ');
      return;
    }
    success('ลบแล้ว');
    const next = rows.filter((x) => x.id !== r.id);
    setRows(next);
    onUnread?.(next.filter((x) => !x.is_read).length);
  };

  if (missing) {
    return (
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm text-amber-900 dark:text-amber-200">
        ยังไม่มีตารางกล่องไอเดีย เปิดไฟล์ <code className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-gray-800">supabase/migrations/008_ideas.sql</code> แล้วรันใน Supabase SQL Editor 1 ครั้ง จากนั้นรีเฟรชหน้านี้
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
        <Inbox className="w-4 h-4" /> ไอเดียจากสมาชิก ({rows.length}) · ยังไม่อ่าน {rows.filter((r) => !r.is_read).length}
      </div>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-gray-500 dark:text-gray-400">ยังไม่มีไอเดียส่งมา</p>
        ) : (
          rows.map((r) => {
            const open = openId === r.id;
            return (
              <div key={r.id} className={cn(!r.is_read && 'bg-indigo-50/60 dark:bg-indigo-950/20')}>
                <button type="button" onClick={() => toggleOpen(r)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                  <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', r.is_read ? 'bg-transparent' : 'bg-indigo-500')} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {r.topic} <span className="font-normal text-gray-500">· {r.subject} {r.grade}</span>
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                      จาก {r.username} · {new Date(r.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </span>
                  <MailOpen className="w-4 h-4 text-gray-400 shrink-0" />
                </button>
                {open && (
                  <div className="px-4 pb-4">
                    <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3.5 leading-relaxed">{r.idea}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>ผู้ส่ง: <b className="text-gray-700 dark:text-gray-200">{r.username}</b></span>
                      <button type="button" onClick={() => remove(r)} className="inline-flex items-center gap-1 text-rose-600 hover:underline font-semibold">
                        <Trash2 className="w-3.5 h-3.5" /> ลบ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
