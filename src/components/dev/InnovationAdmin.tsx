'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Copy, Download, Loader2, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { INNOV_STATUS, type InnovRequest, type InnovStatus } from '@/lib/innovation';
import { cn } from '@/lib/utils/cn';

const OPEN: InnovStatus[] = ['pending', 'working', 'revision'];
const when = (iso: string) => new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
const ageDays = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

/** Dev > นวัตกรรม: รับเรื่องจากครู Master ดาวน์โหลดแผน เปลี่ยนสถานะ ส่งลิงก์ (+อีเมลถ้าตั้ง Resend แล้ว) */
export function InnovationAdmin({ onOpenCount }: { onOpenCount?: (n: number) => void }) {
  const toast = useToast();
  const [items, setItems] = useState<InnovRequest[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [emailOn, setEmailOn] = useState(false);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [sel, setSel] = useState<string | null>(null);
  const [status, setStatus] = useState<InnovStatus>('working');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch('/api/dev/innovation')
      .then((r) => r.json())
      .then((j) => {
        setItems(j.items || []);
        setMissing(!!j.missing);
        setEmailOn(!!j.email);
        onOpenCount?.((j.items || []).filter((x: InnovRequest) => OPEN.includes(x.status)).length);
      })
      .catch(() => setItems([]));
  }, [onOpenCount]);
  useEffect(load, [load]);

  const list = useMemo(() => (items || []).filter((x) => filter === 'all' || OPEN.includes(x.status)), [items, filter]);
  const cur = (items || []).find((x) => x.id === sel) || null;
  useEffect(() => {
    if (!cur) return;
    setStatus(cur.status === 'pending' ? 'working' : cur.status === 'revision' ? 'working' : cur.status);
    setLink(cur.link || '');
    setNote('');
  }, [cur?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = async (path: string) => {
    const r = await fetch(`/api/dev/innovation?file=${encodeURIComponent(path)}`).then((x) => x.json());
    if (r.url) window.open(r.url, '_blank', 'noopener');
    else toast.error(r.error || 'ดาวน์โหลดไม่ได้');
  };

  const save = async () => {
    if (!cur) return;
    setBusy(true);
    try {
      const res = await fetch('/api/dev/innovation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cur.id, status, link, note, notify: status === 'delivered' && notify }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'บันทึกไม่สำเร็จ');
      toast.success(j.mail === 'sent' ? 'บันทึกและส่งอีเมลแล้ว' : j.mail === 'off' ? 'บันทึกแล้ว (ยังไม่ได้ตั้งค่าอีเมล ส่งลิงก์ให้ครูเอง)' : j.mail === 'failed' ? 'บันทึกแล้ว แต่ส่งอีเมลไม่สำเร็จ' : 'บันทึกแล้ว');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  if (!items) return <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin" />;

  return (
    <div className="space-y-5">
      {missing && (
        <p className="flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> ยังไม่ได้รัน migration 030 (ตาราง innovation_requests)
        </p>
      )}
      {!emailOn && <p className="text-xs ui-muted">ยังไม่ได้ตั้ง RESEND_API_KEY และ EMAIL_FROM บน Vercel ระบบจะไม่ส่งอีเมลให้ ส่งลิงก์ให้ครูเองได้จากอีเมลที่แสดงในงาน</p>}

      <div className="flex items-center gap-2">
        {(['open', 'all'] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={cn('ui-pill', filter === f && 'border-foreground text-foreground')}>
            {f === 'open' ? `ต้องทำ (${(items || []).filter((x) => OPEN.includes(x.status)).length})` : `ทั้งหมด (${items.length})`}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <ul className="ui-card max-h-[70vh] divide-y overflow-y-auto">
          {list.length === 0 && <li className="p-6 text-center text-sm ui-muted">ไม่มีงาน</li>}
          {list.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => setSel(x.id)} className={cn('w-full p-4 text-left transition-colors hover:bg-muted/60', sel === x.id && 'bg-muted')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{x.title}</span>
                  <span className={cn('ui-pill h-6 shrink-0 text-[11px]', x.status === 'revision' || x.status === 'pending' ? 'border-foreground text-foreground' : '')}>{INNOV_STATUS[x.status]}</span>
                </div>
                <p className="mt-1 text-xs ui-muted">
                  {x.username} · {when(x.created_at)} · {ageDays(x.created_at)} วัน
                  {x.revisions_used > 0 && ` · แก้ ${x.revisions_used} ครั้ง`}
                </p>
              </button>
            </li>
          ))}
        </ul>

        {cur ? (
          <div className="ui-card space-y-5 p-6">
            <div>
              <p className="font-display text-xl">{cur.title}</p>
              <p className="mt-1 text-sm ui-muted">
                {cur.username} · {[cur.subject, cur.grade].filter(Boolean).join(' · ') || 'ไม่ระบุวิชา/ชั้น'}
              </p>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(cur.email).then(() => toast.success('คัดลอกอีเมลแล้ว'))}
                className="mt-2 inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline"
              >
                <Mail className="h-4 w-4" /> {cur.email} <Copy className="h-3.5 w-3.5 opacity-60" />
              </button>
            </div>

            <ol className="space-y-3 border-t pt-5">
              {(cur.events || []).map((ev) => (
                <li key={ev.id} className={cn('rounded-2xl p-4 text-sm', ev.by_dev ? 'border' : 'bg-muted')}>
                  <p className="text-xs ui-muted">
                    {ev.by_dev ? 'Dev' : cur.username} · {ev.kind === 'submit' ? 'ส่งงาน' : ev.kind === 'revision' ? 'ขอแก้ไข' : ev.kind === 'deliver' ? 'ส่งมอบ' : 'สถานะ'} · {when(ev.created_at)}
                  </p>
                  {ev.message && <p className="mt-1.5 whitespace-pre-wrap break-words">{ev.message}</p>}
                  {ev.file_path && (
                    <button type="button" onClick={() => download(ev.file_path as string)} className="ui-btn ui-btn-line mt-3 h-8 px-3 text-xs">
                      <Download className="h-3.5 w-3.5" /> {ev.file_name || 'ไฟล์แนบ'}
                    </button>
                  )}
                </li>
              ))}
            </ol>

            <div className="space-y-4 border-t pt-5">
              <div>
                <label className="ui-label">สถานะ</label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(INNOV_STATUS) as InnovStatus[]).map((s) => (
                    <button key={s} type="button" onClick={() => setStatus(s)} className={cn('ui-pill', status === s && 'border-foreground bg-foreground text-background')}>
                      {INNOV_STATUS[s]}
                    </button>
                  ))}
                </div>
              </div>
              {status === 'delivered' && (
                <div>
                  <label className="ui-label">ลิงก์นวัตกรรม</label>
                  <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className="ui-input" />
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-current" disabled={!emailOn} />
                    ส่งอีเมลแจ้งครู {!emailOn && '(ยังไม่ได้ตั้งค่าอีเมล)'}
                  </label>
                </div>
              )}
              <div>
                <label className="ui-label">ข้อความถึงครู (ไม่บังคับ)</label>
                <textarea rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} className="ui-input" />
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={save} disabled={busy} className="ui-btn ui-btn-ink">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} บันทึก
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="ui-card grid place-items-center p-10 text-sm ui-muted">เลือกงานทางซ้าย</div>
        )}
      </div>
    </div>
  );
}
