'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Eraser, HardDrive, Loader2 } from 'lucide-react';
import { USAGE_EVENT } from '@/lib/game-creator/media';
import { fmtMB } from '@/lib/game-creator/quota';

interface Usage {
  used: number;
  quota: number;
}

/**
 * แถบพื้นที่อัปโหลดรูป/คลิปของบัญชี (ใช้ไปแล้ว / โควต้า)
 * keepPaths: ไฟล์ที่ตัวแก้ไขที่เปิดอยู่ใช้งาน (ปุ่มล้างไฟล์จะไม่แตะ)
 */
export function UsageMeter({ keepPaths, compact = false }: { keepPaths?: () => string[]; compact?: boolean }) {
  const [u, setU] = useState<Usage | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/creator/usage', { cache: 'no-store' });
      if (r.ok) setU(await r.json());
    } catch {
      /* ไม่เป็นไร */
    }
  }, []);

  useEffect(() => {
    load();
    const on = () => load();
    window.addEventListener(USAGE_EVENT, on);
    return () => window.removeEventListener(USAGE_EVENT, on);
  }, [load]);

  const sweep = async () => {
    setBusy(true);
    setNote('');
    try {
      const r = await fetch('/api/creator/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keep: keepPaths ? keepPaths() : [] }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setNote(j.error || 'ล้างไม่สำเร็จ');
      else {
        setU({ used: j.used, quota: j.quota });
        setNote(j.removed ? `ล้างแล้ว ${j.removed} ไฟล์ คืนพื้นที่ ${fmtMB(j.freed)}` : 'ไม่มีไฟล์ที่ไม่ได้ใช้');
      }
    } catch {
      setNote('เชื่อมต่อไม่ได้');
    }
    setBusy(false);
  };

  if (!u) return null;
  const pct = Math.min(100, Math.round((u.used / Math.max(1, u.quota)) * 100));
  const full = pct >= 90;
  return (
    <div className={`l5g-usage ${compact ? 'l5g-usage-compact' : ''}`} data-full={full} title="พื้นที่รวมของรูปและคลิปที่อัปโหลดทั้งหมดในบัญชีนี้">
      <HardDrive className="h-4 w-4 shrink-0" />
      <span className="l5g-usage-text">
        พื้นที่อัปโหลด <b>{fmtMB(u.used)}</b> / {fmtMB(u.quota)}
      </span>
      <span className="l5g-usage-bar" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </span>
      <button type="button" className="l5g-usage-btn" onClick={sweep} disabled={busy} title="ลบรูป/คลิปที่ไม่มีเกมไหนใช้แล้ว เพื่อคืนพื้นที่">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eraser className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">ล้างไฟล์ที่ไม่ใช้</span>
      </button>
      {note && <span className="l5g-usage-note">{note}</span>}
    </div>
  );
}
