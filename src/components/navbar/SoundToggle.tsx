'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Music2, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getPrefs, initPrefs, setPrefs, subscribePrefs } from '@/lib/sound';

const SERVER = { sfx: true, bgm: false };

/** ปุ่มเสียง: เปิด/ปิดเสียงเอฟเฟกต์ และเพลงพื้นหลัง (จำค่าไว้ในเครื่อง) */
export function SoundToggle() {
  const prefs = useSyncExternalStore(subscribePrefs, getPrefs, () => SERVER);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initPrefs();
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const anyOn = prefs.sfx || prefs.bgm;

  const Row = ({ label, on, onClick, icon }: { label: string; on: boolean; onClick: () => void; icon: React.ReactNode }) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
    >
      <span className="text-indigo-500">{icon}</span>
      <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</span>
      <span className={cn('relative w-10 h-6 rounded-full transition-colors', on ? 'bg-mint-500' : 'bg-gray-300 dark:bg-gray-600')}>
        <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', on ? 'left-[1.15rem]' : 'left-0.5')} />
      </span>
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="ตั้งค่าเสียง"
        title="ตั้งค่าเสียง"
        className="p-2 rounded-xl text-gray-600 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800/80 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700/60 shadow-sm transition-all"
      >
        {anyOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-gray-900 border-2 border-indigo-100 dark:border-indigo-900 shadow-toy-lg p-2 z-50 animate-scale-up">
          <Row label="เสียงเอฟเฟกต์" on={prefs.sfx} onClick={() => setPrefs({ sfx: !prefs.sfx })} icon={<Volume2 className="w-5 h-5" />} />
          <Row label="เพลงพื้นหลัง" on={prefs.bgm} onClick={() => setPrefs({ bgm: !prefs.bgm })} icon={<Music2 className="w-5 h-5" />} />
        </div>
      )}
    </div>
  );
}
