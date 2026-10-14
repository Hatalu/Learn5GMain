'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

/** ตั้งค่าเว็บ: เปิด/ปิดมาสคอตน้องไฟว์จีบนหน้าแรก */
export function SiteSettingsAdmin() {
  const supabase = useMemo(() => createClient(), []);
  const { success, error } = useToast();
  const [on, setOn] = useState<boolean | null>(null);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'mascot_enabled')
      .maybeSingle()
      .then(({ data, error: e }) => {
        if (e) {
          setMissing(true);
          setOn(true);
          return;
        }
        setOn(data ? data.value !== false : true);
      });
  }, [supabase]);

  const toggle = async () => {
    if (on === null) return;
    const next = !on;
    setSaving(true);
    const { error: e } = await supabase
      .from('site_settings')
      .upsert({ key: 'mascot_enabled', value: next, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setSaving(false);
    if (e) {
      error('บันทึกไม่สำเร็จ: ' + e.message);
      return;
    }
    setOn(next);
    success(next ? 'เปิดน้องไฟว์จีแล้ว' : 'ปิดน้องไฟว์จีแล้ว');
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {missing && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm text-amber-900 dark:text-amber-200">
          ยังไม่มีตารางตั้งค่า เปิดไฟล์ <code className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-gray-800">supabase/migrations/007_site_settings.sql</code> แล้วรันใน Supabase SQL Editor 1 ครั้ง จากนั้นรีเฟรชหน้านี้
        </div>
      )}
      <div className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <Settings className="w-6 h-6 text-indigo-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white">มาสคอตน้องไฟว์จี (Five-G)</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">แสดงที่มุมขวาล่างของหน้าแรกให้ทุกคน</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!on}
          aria-label="เปิด/ปิดมาสคอต"
          disabled={on === null || saving || missing}
          onClick={toggle}
          className={`relative w-14 h-8 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
        >
          <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : ''}`} />
          {saving && <Loader2 className="absolute inset-0 m-auto w-4 h-4 animate-spin text-gray-600" />}
        </button>
        <span className="w-12 text-sm font-bold text-gray-700 dark:text-gray-200">{on === null ? '' : on ? 'เปิด' : 'ปิด'}</span>
      </div>
    </div>
  );
}
