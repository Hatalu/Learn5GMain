'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, ExternalLink, FileUp, Loader2, Paperclip, X } from 'lucide-react';
import { Navbar } from '@/components/navbar/Navbar';
import { Footer } from '@/components/site/Footer';
import { useAuth } from '@/context/AuthContext';
import { useMembership } from '@/components/membership/MembershipProvider';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { INNOV_BUCKET, INNOV_FILE_TYPES, INNOV_MAX_MB, INNOV_STATUS, INNOV_WAIT, type InnovRequest } from '@/lib/innovation';
import { cn } from '@/lib/utils/cn';

interface Data {
  missing?: boolean;
  jobs: number;
  revisions: number;
  used: number;
  items: InnovRequest[];
  email: string;
}

const ACCEPT = Object.keys(INNOV_FILE_TYPES).join(',');
const when = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { dateStyle: 'medium' });

async function uploadPlan(file: File): Promise<{ path: string; name: string; size: number }> {
  if (!INNOV_FILE_TYPES[file.type]) throw new Error('รองรับไฟล์ PDF Word PowerPoint และรูปภาพ');
  if (file.size > INNOV_MAX_MB * 1024 * 1024) throw new Error(`ไฟล์ใหญ่เกิน ${INNOV_MAX_MB} MB`);
  const res = await fetch('/api/innovation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'upload-url', type: file.type, size: file.size }) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'อัปโหลดไม่สำเร็จ');
  const { error } = await createClient().storage.from(INNOV_BUCKET).uploadToSignedUrl(j.path, j.token, file, { contentType: file.type });
  if (error) throw new Error('อัปโหลดไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง');
  return { path: j.path, name: file.name.slice(0, 200), size: file.size };
}

function FilePick({ file, setFile }: { file: File | null; setFile: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={ref} type="file" accept={ACCEPT} className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm">
          <Paperclip className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{file.name}</span>
          <span className="shrink-0 text-xs ui-muted">{(file.size / 1048576).toFixed(1)} MB</span>
          <button type="button" onClick={() => setFile(null)} aria-label="เอาไฟล์ออก" className="ui-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-sm ui-muted transition-colors hover:border-foreground/50 hover:text-foreground">
          <FileUp className="h-4 w-4" /> แนบไฟล์แผนการสอน (PDF Word PowerPoint รูป ไม่เกิน {INNOV_MAX_MB} MB)
        </button>
      )}
    </div>
  );
}

function Revise({ item, left, onDone }: { item: InnovRequest; left: number; onDone: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      const f = file ? await uploadPlan(file) : null;
      const res = await fetch('/api/innovation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'revise', id: item.id, message: msg, file: f }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'ส่งไม่สำเร็จ');
      toast.success('ส่งคำขอแก้ไขแล้ว');
      setOpen(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ส่งไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };
  if (left <= 0) return <p className="text-xs ui-muted">ขอแก้ไขครบแล้ว</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="ui-btn ui-btn-line h-9 px-4">
        ขอแก้ไข (เหลือ {left} ครั้ง)
      </button>
    );
  return (
    <div className="w-full space-y-3 rounded-2xl bg-muted p-4">
      <textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={4000} placeholder="บอกสิ่งที่อยากให้แก้" className="ui-input" />
      <FilePick file={file} setFile={setFile} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="ui-btn ui-btn-ghost h-9">
          ยกเลิก
        </button>
        <button type="button" onClick={send} disabled={busy || msg.trim().length < 5} className="ui-btn ui-btn-ink h-9">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} ส่งคำขอแก้ไข
        </button>
      </div>
    </div>
  );
}

export default function InnovationPage() {
  const { user, isLoading } = useAuth();
  const { ents, openCheckout } = useMembership();
  const toast = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [f, setF] = useState({ title: '', subject: '', grade: '', details: '', email: '' });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    fetch('/api/innovation', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return;
        setData(j);
        setF((o) => (o.email ? o : { ...o, email: j.email || '' }));
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const master = !!data && data.jobs > 0;
  const left = data ? Math.max(0, data.jobs - data.used) : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!f.title.trim()) return setErr('ตั้งชื่องานก่อน');
    if (!file && f.details.trim().length < 20) return setErr('แนบไฟล์แผนการสอน หรือเล่ารายละเอียดอย่างน้อย 20 ตัวอักษร');
    setBusy(true);
    try {
      const up = file ? await uploadPlan(file) : null;
      const res = await fetch('/api/innovation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'create', ...f, file: up }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'ส่งงานไม่สำเร็จ');
      toast.success(`ส่งแผนการสอนแล้ว รอรับงานภายใน ${INNOV_WAIT}`);
      setF((o) => ({ ...o, title: '', subject: '', grade: '', details: '' }));
      setFile(null);
      load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'ส่งงานไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Navbar />
      <main>
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-16 sm:px-6 sm:pt-24">
          <p className="ui-kicker ui-rise">เฉพาะแพ็กเกจ Master</p>
          <h1 className="ui-title ui-rise mt-4 max-w-3xl text-4xl sm:text-6xl" style={{ animationDelay: '60ms' }}>
            สั่งทำนวัตกรรมตามแผนการสอน
          </h1>
          <p className="ui-rise mt-5 max-w-xl ui-muted" style={{ animationDelay: '120ms' }}>
            ส่งแผนการสอนมา ทีมงานทำนวัตกรรมให้ภายใน {INNOV_WAIT} แล้วส่งลิงก์ไปทางอีเมล สั่งได้เดือนละ {ents.master.innovation_jobs} งาน แก้ไขได้งานละ {ents.master.innovation_revisions} ครั้ง
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-28 sm:px-6">
          {isLoading || (user && !data) ? (
            <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin" />
          ) : !user ? (
            <div className="ui-card flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
              <p>เข้าสู่ระบบด้วยบัญชีแพ็กเกจ Master เพื่อส่งแผนการสอน</p>
              <Link href="/login?redirect=%2Finnovation" className="ui-btn ui-btn-ink">
                เข้าสู่ระบบ
              </Link>
            </div>
          ) : data?.missing ? (
            <div className="ui-card p-8 text-sm ui-muted">ระบบนี้กำลังเตรียมพร้อม ลองใหม่อีกครั้งภายหลัง</div>
          ) : !master ? (
            <div className="rounded-3xl bg-foreground p-8 text-background sm:p-12">
              <h2 className="ui-title text-3xl">อัปเกรดเป็น Master เพื่อสั่งทำนวัตกรรม</h2>
              <p className="mt-3 max-w-lg text-background/65">นอกจากสั่งทำนวัตกรรม ยังได้สิทธิ์สูงสุดของระบบสร้างเกมและสื่อการสอนทั้งหมด</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" onClick={() => openCheckout('master')} className="ui-btn h-12 bg-background px-7 text-foreground hover:opacity-85">
                  สมัคร Master <ArrowRight className="h-4 w-4" />
                </button>
                <Link href="/pricing" className="ui-btn h-12 border border-background/30 px-7">
                  เทียบแพ็กเกจ
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
              <form onSubmit={submit} className="ui-card h-fit space-y-4 p-6 sm:p-8" noValidate>
                <div className="flex items-end justify-between">
                  <h2 className="font-display text-2xl font-light">ส่งแผนการสอน</h2>
                  <span className="text-sm ui-muted">
                    เดือนนี้เหลือ <b className="font-medium text-foreground">{left}</b> / {data!.jobs} งาน
                  </span>
                </div>
                <div>
                  <label className="ui-label" htmlFor="in-title">
                    ชื่องาน / เรื่อง
                  </label>
                  <input id="in-title" value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="เช่น เกมเศษส่วน ป.4" className="ui-input" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="ui-label" htmlFor="in-subj">
                      วิชา
                    </label>
                    <input id="in-subj" value={f.subject} maxLength={60} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="คณิตศาสตร์" className="ui-input" />
                  </div>
                  <div>
                    <label className="ui-label" htmlFor="in-grade">
                      ระดับชั้น
                    </label>
                    <input id="in-grade" value={f.grade} maxLength={40} onChange={(e) => setF({ ...f, grade: e.target.value })} placeholder="ป.4" className="ui-input" />
                  </div>
                </div>
                <div>
                  <label className="ui-label" htmlFor="in-det">
                    สิ่งที่อยากได้
                  </label>
                  <textarea
                    id="in-det"
                    rows={5}
                    maxLength={4000}
                    value={f.details}
                    onChange={(e) => setF({ ...f, details: e.target.value })}
                    placeholder="รูปแบบนวัตกรรม จุดประสงค์ จำนวนนักเรียน อุปกรณ์ในห้อง หรืออะไรที่อยากเน้น"
                    className="ui-input"
                  />
                </div>
                <FilePick file={file} setFile={setFile} />
                <div>
                  <label className="ui-label" htmlFor="in-mail">
                    อีเมลสำหรับรับลิงก์
                  </label>
                  <input id="in-mail" type="email" value={f.email} maxLength={200} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name@gmail.com" className="ui-input" />
                </div>
                {err && (
                  <p role="alert" className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {err}
                  </p>
                )}
                <button type="submit" disabled={busy || left <= 0} className="ui-btn ui-btn-ink h-12 w-full">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {left <= 0 ? 'เดือนนี้สั่งครบแล้ว' : 'ส่งแผนการสอน'}
                </button>
                <p className="text-center text-xs ui-muted">ได้รับงานภายใน {INNOV_WAIT} หลังทีมงานรับเรื่อง</p>
              </form>

              <div>
                <p className="ui-kicker">งานของฉัน</p>
                {data!.items.length === 0 ? (
                  <p className="mt-6 text-sm ui-muted">ยังไม่มีงาน</p>
                ) : (
                  <ul className="mt-4 divide-y border-y">
                    {data!.items.map((x) => (
                      <li key={x.id} className="py-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base">{x.title}</p>
                            <p className="mt-0.5 text-xs ui-muted">
                              ส่งเมื่อ {when(x.created_at)}
                              {x.revisions_used > 0 && ` · แก้ไขแล้ว ${x.revisions_used} ครั้ง`}
                            </p>
                          </div>
                          <span className={cn('ui-pill shrink-0', x.status === 'delivered' && 'border-foreground bg-foreground text-background')}>{INNOV_STATUS[x.status]}</span>
                        </div>
                        {x.status === 'delivered' && x.link && (
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <a href={x.link} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-ink h-9 px-4">
                              เปิดนวัตกรรม <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <Revise item={x} left={data!.revisions - x.revisions_used} onDone={load} />
                          </div>
                        )}
                        {x.dev_note && <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-muted p-4 text-sm">{x.dev_note}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
