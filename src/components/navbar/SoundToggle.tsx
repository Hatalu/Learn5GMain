'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getPrefs, initPrefs, setPrefs, subscribePrefs } from '@/lib/sound';
import { GFX_LEVELS, getGfx, getServerGfx, setGfx, subscribeGfx } from '@/lib/gfx';

const SERVER = { sfx: true, bgm: true };

/** ตั้งค่าในเครื่อง: เสียงเอฟเฟกต์ เพลง และระดับกราฟิก (ใช้ในเกมห้องเรียน) */
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

  const Row = ({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) => (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-muted">
      {label}
      <span className={cn('relative h-5 w-9 rounded-full transition-colors', on ? 'bg-foreground' : 'bg-muted-foreground/30')}>
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all', on ? 'left-[1.1rem]' : 'left-0.5')} />
      </span>
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="ตั้งค่า" title="ตั้งค่า" className="ui-btn ui-btn-ghost h-9 w-9 px-0">
        <Settings2 className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border bg-popover p-2 shadow-toy-lg max-sm:fixed max-sm:right-3 max-sm:top-16">
          <Row label="เสียงเอฟเฟกต์" on={prefs.sfx} onClick={() => setPrefs({ sfx: !prefs.sfx })} />
          <Row label="เพลงพื้นหลัง" on={prefs.bgm} onClick={() => setPrefs({ bgm: !prefs.bgm })} />
          <div className="mt-1 border-t px-1 pt-3">
            <p className="ui-label px-2">กราฟิกในเกม</p>
            <div role="radiogroup" aria-label="กราฟิก" className="grid grid-cols-3 gap-1 rounded-full border p-1">
              {GFX_LEVELS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="radio"
                  aria-checked={gfx === g.id}
                  title={g.hint}
                  onClick={() => setGfx(g.id)}
                  className={cn('h-8 rounded-full text-xs transition-colors', gfx === g.id ? 'bg-foreground text-background' : 'ui-muted hover:text-foreground')}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
