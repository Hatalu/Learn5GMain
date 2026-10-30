'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Gauge, Gem, Music2, Settings, Sparkles, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getPrefs, initPrefs, setPrefs, subscribePrefs } from '@/lib/sound';
import { GFX_LEVELS, Gfx, getGfx, getServerGfx, setGfx, subscribeGfx } from '@/lib/gfx';
import fx from '@/components/ui/fancy.module.css';

const SERVER = { sfx: true, bgm: true };

/** ปุ่มตั้งค่า: เปิด/ปิดเสียงเอฟเฟกต์ เพลงพื้นหลัง และเลือกระดับกราฟิก (จำค่าไว้ในเครื่อง) */
const GFX_ICON: Record<Gfx, React.ReactNode> = {
  lite: <Gauge className="w-4 h-4" />,
  normal: <Sparkles className="w-4 h-4" />,
  hd: <Gem className="w-4 h-4" />,
};

export function SoundToggle() {
  const prefs = useSyncExternalStore(subscribePrefs, getPrefs, () => SERVER);
  const gfx = useSyncExternalStore(subscribeGfx, getGfx, getServerGfx);
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
        aria-label="ตั้งค่า"
        title="ตั้งค่า"
        className={cn(
          'btn-jelly relative w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-colors',
          anyOn
            ? 'text-white bg-gradient-to-br from-teal-400 to-emerald-500 border-white/40 dark:border-white/15 shadow-[0_3px_0_0_rgba(5,150,105,0.45)]'
            : 'text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-[0_3px_0_0_rgba(107,114,128,0.3)]'
        )}
      >
        <Settings className={cn('w-5 h-5', anyOn && fx.wave)} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-gray-900 border-2 border-indigo-100 dark:border-indigo-900 shadow-toy-lg p-2 z-50 animate-scale-up">
          <Row label="เสียงเอฟเฟกต์" on={prefs.sfx} onClick={() => setPrefs({ sfx: !prefs.sfx })} icon={<Volume2 className="w-5 h-5" />} />
          <Row label="เพลงพื้นหลัง" on={prefs.bgm} onClick={() => setPrefs({ bgm: !prefs.bgm })} icon={<Music2 className="w-5 h-5" />} />
          <div className="mt-1 pt-2 px-1 border-t-2 border-indigo-50 dark:border-indigo-950">
            <p className="px-2 pb-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">กราฟิก</p>
            <div role="radiogroup" aria-label="ระดับกราฟิก" className="grid grid-cols-3 gap-1.5">
              {GFX_LEVELS.map((g) => {
                const on = gfx === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setGfx(g.id)}
                    title={g.hint}
                    className={cn(
                      'btn-jelly flex flex-col items-center gap-0.5 py-2 rounded-xl border-2 text-sm font-bold transition-colors',
                      on
                        ? 'text-white bg-gradient-to-br from-indigo-500 to-violet-500 border-white/40 shadow-[0_3px_0_0_rgba(79,70,229,0.45)]'
                        : 'text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    )}
                  >
                    {GFX_ICON[g.id]}
                    {g.label}
                  </button>
                );
              })}
            </div>
            <p className="px-2 pt-1.5 pb-1 text-[11px] text-gray-500 dark:text-gray-400">{GFX_LEVELS.find((g) => g.id === gfx)?.hint}</p>
          </div>
        </div>
      )}
    </div>
  );
}
