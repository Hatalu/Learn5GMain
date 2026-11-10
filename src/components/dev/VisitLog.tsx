'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Crown, Loader2, MonitorSmartphone, RefreshCw, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Row {
  id: number;
  at: string;
  member: boolean;
  username: string | null;
  name: string | null;
  paid: boolean;
  device: string | null;
  path: string | null;
}

type Who = 'all' | 'member' | 'guest';
const WHO: [Who, string][] = [
  ['all', 'ทั้งหมด'],
  ['member', 'มีบัญชี'],
  ['guest', 'ไม่มีบัญชี'],
];

const time = (iso: string) =>
  new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** รายการ "ใครเข้าเว็บบ้าง" ล่าสุดก่อน (บัญชี/ไม่มีบัญชี, เครื่อง, หน้าแรกที่เข้า) */
export function VisitLog() {
  const [who, setWho] = useState<Who>('all');
  const [rows, setRows] = useState<Row[]>([]);
  const [more, setMore] = useState(false);
  const [old, setOld] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(
    async (before?: number) => {
      setBusy(true);
      setErr('');
      try {
        const r = await fetch(`/api/dev/visits/log?who=${who}${before ? `&before=${before}` : ''}`, { cache: 'no-store' });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'โหลดไม่สำเร็จ');
        if (j.missing) throw new Error('ยังไม่มีตารางสถิติ (migration 014)');
        setRows((p) => (before ? [...p, ...j.rows] : j.rows));
        setMore(j.more);
        setOld(j.old);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ');
      } finally {
        setBusy(false);
      }
    },
    [who]
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mr-auto">ใครเข้าเว็บบ้าง (ล่าสุดก่อน)</p>
        <div role="group" aria-label="กรองผู้เข้าเว็บ" className="flex gap-1">
          {WHO.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setWho(id)}
              aria-pressed={who === id}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors',
                who === id
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => load()} disabled={busy} aria-label="โหลดใหม่" title="โหลดใหม่" className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-indigo-500">
          <RefreshCw className={cn('w-3.5 h-3.5', busy && 'animate-spin')} />
        </button>
      </div>

      {old && (
        <p className="mb-2 text-[11px] text-amber-700 dark:text-amber-300">รัน migration 028 เพื่อให้เห็นชนิดเครื่องและหน้าที่เข้า (รายการก่อนหน้านั้นจะไม่มีข้อมูลนี้)</p>
      )}
      {err && <p className="text-sm text-rose-600">{err}</p>}

      <div className="max-h-96 overflow-y-auto rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="w-24 shrink-0 text-xs text-gray-500 dark:text-gray-400 tabular-nums">{time(r.at)}</span>
            <span className="flex-1 min-w-0 flex items-center gap-1.5">
              {r.member ? (
                r.paid ? <Crown className="w-4 h-4 shrink-0 text-amber-500" aria-label="สมาชิก" /> : <UserRound className="w-4 h-4 shrink-0 text-indigo-500" aria-label="บัญชีทั่วไป" />
              ) : (
                <UserRound className="w-4 h-4 shrink-0 text-gray-300" aria-label="ไม่มีบัญชี" />
              )}
              <span className={cn('truncate font-semibold', r.member ? 'text-gray-900 dark:text-white' : 'text-gray-400')}>
                {r.member ? r.name || r.username || 'บัญชีที่ถูกลบ' : 'ไม่มีบัญชี'}
              </span>
              {r.member && r.name && r.username && <span className="truncate text-xs text-gray-400">@{r.username}</span>}
            </span>
            {r.device && (
              <span className="hidden sm:inline-flex items-center gap-1 shrink-0 text-xs text-gray-500 dark:text-gray-400">
                <MonitorSmartphone className="w-3.5 h-3.5" /> {r.device}
              </span>
            )}
            {r.path && <code className="hidden md:inline shrink-0 max-w-[10rem] truncate text-[11px] text-gray-400">{r.path}</code>}
          </div>
        ))}
        {!busy && !err && rows.length === 0 && <p className="px-3 py-6 text-center text-sm text-gray-400">ยังไม่มีรายการ</p>}
        {busy && (
          <div className="py-4 text-center text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin inline" />
          </div>
        )}
      </div>
      {more && !busy && (
        <button type="button" onClick={() => load(rows[rows.length - 1]?.id)} className="mt-2 w-full py-2 rounded-xl text-sm font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40">
          โหลดเพิ่ม
        </button>
      )}
    </div>
  );
}
