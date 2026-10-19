'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Upload, Loader2, Globe, Lock, Trash2, FileText, ClipboardList, Check, Info } from 'lucide-react';
import { ALL_GRADES, ALL_SUBJECTS, GradeLevel, Subject } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { SubjectTag } from '@/components/media/SubjectTag';
import { FileBadge } from '@/components/docs/DocIcons';
import { cn } from '@/lib/utils/cn';
import {
  ALL_DOC_TYPES,
  DOC_BUCKET,
  DOC_MAX_BYTES,
  DOC_PART_BYTES,
  DocFile,
  DocFileKind,
  DocType,
  DocumentItem,
  PDF_ACCEPT,
  PREVIEW_BUCKET,
  WORD_ACCEPT,
  fileKindOf,
  formatBytes,
  isMissingTable,
  mimeOf,
  newFileId,
  partPaths,
  previewPathFor,
  storagePathFor,
} from '@/lib/documents';

interface Props {
  isOpen: boolean;
  /** แก้ไขรายการเดิม (null = เพิ่มใหม่) */
  editing: DocumentItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = { label: string; done: number; total: number };

/** ไม่มีข้อมูลขยับเลยนานเท่านี้ = เน็ตหลุด ยกเลิกแล้วแจ้ง (แทนการค้างเงียบ) */
const STALL_MS = 60_000;

/**
 * อัปโหลดเข้า Storage ด้วย XHR เพื่อให้เห็น % จริงของไฟล์ใหญ่ (supabase-js ไม่บอกความคืบหน้า)
 * ใช้ token ของ Dev ที่ล็อกอินอยู่ สิทธิ์ยังถูกตรวจด้วย RLS ของ storage ตามเดิม
 */
async function putObject(bucket: string, path: string, body: Blob, contentType: string, onProgress?: (frac: number) => void) {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('หมดเวลาเข้าสู่ระบบ ล็อกอินใหม่แล้วลองอีกครั้ง');
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const url = `${base}/storage/v1/object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let timer = 0;
    const arm = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => xhr.abort(), STALL_MS);
    };
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.upload.onprogress = (e) => {
      arm();
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      clearTimeout(timer);
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = `HTTP ${xhr.status}`;
      try {
        msg = JSON.parse(xhr.responseText).message || msg;
      } catch {
        /* ใช้รหัสสถานะ */
      }
      reject(new Error(msg));
    };
    xhr.onerror = () => {
      clearTimeout(timer);
      reject(new Error('เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่'));
    };
    xhr.onabort = () => reject(new Error('อินเทอร์เน็ตช้าหรือหลุดระหว่างอัปโหลด ลองใหม่อีกครั้ง'));
    arm();
    xhr.send(body);
  });
}

export function DocumentFormModal({ isOpen, editing, onClose, onSuccess }: Props) {
  if (!isOpen) return null;
  return <Form key={editing?.id || 'new'} editing={editing} onClose={onClose} onSuccess={onSuccess} />;
}

function Form({ editing, onClose, onSuccess }: Omit<Props, 'isOpen'>) {
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [title, setTitle] = useState(editing?.title || '');
  const [description, setDescription] = useState(editing?.description || '');
  const [subject, setSubject] = useState<Subject>((editing?.subject as Subject) || 'คณิตศาสตร์');
  const [grades, setGrades] = useState<GradeLevel[]>((editing?.grade_level as GradeLevel[]) || ['ป.1']);
  const [docType, setDocType] = useState<DocType>(editing?.doc_type || 'ใบงาน');
  const [isPublic, setIsPublic] = useState(editing ? editing.is_public : true);
  const [keep, setKeep] = useState<DocFile[]>(editing?.files || []);
  const [added, setAdded] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [busy, onClose]);

  // กันปิดแท็บระหว่างอัปโหลด
  useEffect(() => {
    if (!busy) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [busy]);

  const addFiles = (list: FileList | File[], kind: DocFileKind) => {
    const next: File[] = [];
    const bad: string[] = [];
    Array.from(list).forEach((f) => {
      if (fileKindOf(f.name) !== kind) bad.push(`${f.name} ไม่ใช่ไฟล์ ${kind === 'pdf' ? 'PDF' : 'Word'}`);
      else if (f.size > DOC_MAX_BYTES) bad.push(`${f.name} ใหญ่เกิน ${formatBytes(DOC_MAX_BYTES)}`);
      else if (f.size === 0) bad.push(`${f.name} เป็นไฟล์ว่าง`);
      else next.push(f);
    });
    if (bad.length) error(bad.join(' / '));
    if (next.length) {
      setAdded((prev) => [...prev, ...next]);
      setErrs((e) => ({ ...e, files: '' }));
    }
  };

  const toggleGrade = (g: GradeLevel) =>
    setGrades((prev) => (prev.includes(g) ? (prev.length > 1 ? prev.filter((x) => x !== g) : prev) : [...prev, g]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (!title.trim()) v.title = 'ใส่ชื่อเอกสาร';
    if (title.trim().length > 200) v.title = 'ชื่อยาวเกิน 200 ตัวอักษร';
    if (keep.length + added.length === 0) v.files = 'ใส่ไฟล์อย่างน้อย 1 ไฟล์ (PDF หรือ Word)';
    if (!grades.length) v.grades = 'เลือกอย่างน้อย 1 ชั้น';
    setErrs(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    const supabase = createClient();
    const docId = editing?.id || crypto.randomUUID();
    const upOriginals: string[] = [];
    const upPreviews: string[] = [];
    const warn: string[] = [];

    try {
      const { renderPdfPreviews, renderDocxPreviews } = await import('@/lib/doc-render');
      // ลำดับไฟล์ใหม่: PDF ก่อน แล้ว Word
      const queue = [...added.filter((f) => fileKindOf(f.name) === 'pdf'), ...added.filter((f) => fileKindOf(f.name) === 'word')];
      // หน้าตัวอย่างสร้างจาก PDF ถ้าชุดนี้ไม่มี PDF เลยจึงจำลองจาก Word (.docx) แทน
      const hasPdf = keep.some((f) => f.kind === 'pdf') || queue.some((f) => fileKindOf(f.name) === 'pdf');
      const created: DocFile[] = [];

      for (let i = 0; i < queue.length; i++) {
        const file = queue[i];
        const kind = fileKindOf(file.name) as DocFileKind;
        const id = newFileId();
        const path = storagePathFor(docId, id, file.name);
        // ไฟล์ใหญ่เกินเพดานต่อชิ้นของ Storage แบ่งเป็นหลายชิ้น (ต่อกลับตอนดาวน์โหลด)
        const parts = Math.max(1, Math.ceil(file.size / DOC_PART_BYTES));
        const paths = partPaths({ path, parts });
        for (let k = 0; k < parts; k++) {
          const chunk = parts > 1 ? file.slice(k * DOC_PART_BYTES, (k + 1) * DOC_PART_BYTES) : file;
          upOriginals.push(paths[k]);
          await putObject(DOC_BUCKET, paths[k], chunk, mimeOf(file.name), (frac) => {
            const sent = (k + frac) / parts;
            setStep({ label: `อัปโหลด ${file.name} ${Math.round(sent * 100)}%`, done: i + sent * 0.5, total: queue.length });
          }).catch((err: Error) => {
            throw new Error(`อัปโหลด ${file.name} ไม่สำเร็จ: ${err.message}`);
          });
        }

        const preview: string[] = [];
        let pages = 0;
        const onPage = async (blob: Blob, idx: number, total: number) => {
          setStep({ label: `ทำหน้าตัวอย่าง + ลายน้ำ ${file.name} (${idx + 1}/${total})`, done: i + 0.5 + (0.5 * (idx + 1)) / total, total: queue.length });
          const p = previewPathFor(docId, id, idx + 1);
          upPreviews.push(p);
          await putObject(PREVIEW_BUCKET, p, blob, blob.type || 'image/webp').catch((err: Error) => {
            throw new Error(`อัปโหลดหน้าตัวอย่างไม่สำเร็จ: ${err.message}`);
          });
          preview.push(p);
        };
        try {
          if (kind === 'pdf') pages = await renderPdfPreviews(file, onPage);
          else if (!hasPdf && /\.docx$/i.test(file.name)) pages = await renderDocxPreviews(file, onPage);
        } catch (err) {
          if (err instanceof Error && err.message.startsWith('อัปโหลดหน้าตัวอย่าง')) throw err;
          warn.push(file.name);
        }
        created.push({ id, kind, name: file.name, size: file.size, path, parts, pages, preview });
      }

      const files = [...keep, ...created];
      const cover = files.find((f) => f.preview.length > 0)?.preview[0] || null;
      const pageCount = files.reduce((n, f) => n + (f.pages || f.preview.length), 0);
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        subject,
        grade_level: grades,
        doc_type: docType,
        is_public: isPublic,
        files,
        cover_path: cover,
        page_count: pageCount,
        updated_at: new Date().toISOString(),
      };

      setStep({ label: 'บันทึกข้อมูล', done: queue.length, total: Math.max(queue.length, 1) });
      const { error: dbErr } = editing
        ? await supabase.from('documents').update(payload).eq('id', docId)
        : await supabase.from('documents').insert({ id: docId, ...payload, created_by: user?.id || null });
      if (dbErr) {
        if (isMissingTable(dbErr)) throw new Error('ยังไม่มีตาราง documents ให้รันไฟล์ migration 022_documents.sql ใน Supabase ก่อน');
        throw new Error(dbErr.message);
      }

      // ลบไฟล์ที่เอาออกจากชุด (หลังบันทึกสำเร็จเท่านั้น)
      if (editing) {
        const removed = editing.files.filter((f) => !keep.some((k) => k.id === f.id && k.path === f.path));
        if (removed.length) {
          await supabase.storage.from(DOC_BUCKET).remove(removed.flatMap(partPaths));
          const pv = removed.flatMap((f) => f.preview);
          if (pv.length) await supabase.storage.from(PREVIEW_BUCKET).remove(pv);
        }
      }

      if (warn.length) info(`บันทึกแล้ว แต่ทำหน้าตัวอย่างไม่ได้: ${warn.join(', ')} (ไฟล์ยังดาวน์โหลดได้ตามปกติ)`);
      else success(editing ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มเอกสาร/ใบงานแล้ว');
      onSuccess();
      onClose();
    } catch (err) {
      // ย้อนไฟล์ที่อัปโหลดไปแล้วในรอบนี้
      if (upOriginals.length) await supabase.storage.from(DOC_BUCKET).remove(upOriginals).catch(() => {});
      if (upPreviews.length) await supabase.storage.from(PREVIEW_BUCKET).remove(upPreviews).catch(() => {});
      const msg = err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ';
      error(/row-level security|violates|permission/i.test(msg) ? 'ไม่มีสิทธิ์บันทึก (ต้องเป็นบัญชี Dev และรัน migration 022 แล้ว)' : msg);
    } finally {
      setBusy(false);
      setStep(null);
    }
  };

  const pct = step ? Math.min(100, Math.round((step.done / Math.max(step.total, 1)) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-5 bg-indigo-950/70 backdrop-blur-md overflow-y-auto" onMouseDown={() => !busy && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'แก้ไขเอกสาร/ใบงาน' : 'เพิ่มเอกสาร/ใบงาน'}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl my-4 bg-white dark:bg-gray-900 rounded-3xl border-2 border-indigo-200 dark:border-indigo-500/40 shadow-toy-lg overflow-hidden animate-pop-in"
      >
        <div className="relative flex items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 text-white">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <p className="font-bold text-base sm:text-lg leading-tight">{editing ? 'แก้ไขเอกสาร/ใบงาน' : 'เพิ่มเอกสาร/ใบงาน'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="btn-jelly p-1.5 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-40" aria-label="ปิดหน้าต่าง">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 1. ไฟล์: PDF ซ้าย / Word ขวา แต่ละฝั่งมีรายการของตัวเอง (เพิ่มต่อได้เสมอ) */}
          <Field label="ไฟล์ (ใส่กี่ไฟล์ก็ได้)" error={errs.files}>
            <div className="grid grid-cols-2 gap-2.5">
              {(['pdf', 'word'] as const).map((kind) => {
                const kept = keep.filter((f) => f.kind === kind);
                const fresh = added.map((f, i) => ({ f, i })).filter(({ f }) => fileKindOf(f.name) === kind);
                return (
                  <div key={kind} className="min-w-0 flex flex-col gap-1.5">
                    <DropZone kind={kind} accept={kind === 'pdf' ? PDF_ACCEPT : WORD_ACCEPT} disabled={busy} onFiles={(l) => addFiles(l, kind)} />
                    {kept.length + fresh.length > 0 && (
                      <ul className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                        {kept.map((f) => (
                          <FileRow key={f.id} kind={f.kind} name={f.name} size={f.size} tag="เดิม" disabled={busy} onRemove={() => setKeep((k) => k.filter((x) => x.id !== f.id))} />
                        ))}
                        {fresh.map(({ f, i }) => (
                          <FileRow key={`${f.name}-${i}`} kind={kind} name={f.name} size={f.size} tag="ใหม่" disabled={busy} onRemove={() => setAdded((a) => a.filter((_, j) => j !== i))} />
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-1.5 flex items-start gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              หน้าตัวอย่างสร้างจาก PDF ถ้ามีแต่ Word จะจำลองหน้าให้โดยประมาณ ไฟล์ละไม่เกิน {formatBytes(DOC_MAX_BYTES)}
            </p>
          </Field>

          {/* 2. Public / Private */}
          <Field label="การมองเห็น">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { on: true, icon: Globe, title: 'Public', sub: 'แสดงในหน้าหลัก' },
                { on: false, icon: Lock, title: 'Private', sub: 'ซ่อนไว้ เห็นเฉพาะ Dev' },
              ].map((o) => {
                const active = isPublic === o.on;
                return (
                  <button
                    key={o.title}
                    type="button"
                    disabled={busy}
                    onClick={() => setIsPublic(o.on)}
                    className={cn(
                      'btn-jelly flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left',
                      active
                        ? o.on
                          ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white border-white/30 shadow-[0_4px_0_0_rgba(55,48,163,0.45)]'
                          : 'bg-gradient-to-r from-gray-700 to-gray-900 text-white border-white/20 shadow-[0_4px_0_0_rgba(0,0,0,0.35)]'
                        : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'
                    )}
                  >
                    <o.icon className="w-4 h-4 shrink-0" />
                    <span>
                      <span className="block text-sm font-bold">{o.title}</span>
                      <span className={cn('block text-[11px]', active ? 'text-white/85' : 'text-gray-500 dark:text-gray-400')}>{o.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* 3. ชื่อ */}
          <Field label="ชื่อ" error={errs.title}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
              maxLength={200}
              placeholder="เช่น ใบงานเรื่องเศษส่วน ชุดที่ 1"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/20"
            />
          </Field>
          <Field label="คำอธิบาย (ไม่บังคับ)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
              rows={2}
              maxLength={2000}
              placeholder="เนื้อหาในชุดนี้ จุดประสงค์ หรือวิธีใช้"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/20"
            />
          </Field>

          {/* 4. วิชา */}
          <Field label="วิชา">
            <div className="grid grid-cols-3 gap-2">
              {ALL_SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() => setSubject(s)}
                  className={cn(
                    'btn-jelly flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border-2',
                    subject === s ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 ring-4 ring-indigo-400/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60'
                  )}
                >
                  <SubjectTag subject={s} size="sm" />
                  {subject === s && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-300 stroke-[3]" />}
                </button>
              ))}
            </div>
          </Field>

          {/* 5. ระดับชั้น */}
          <Field label="ระดับชั้น (เลือกได้หลายชั้น)" error={errs.grades}>
            <div className="grid grid-cols-6 gap-1.5">
              {ALL_GRADES.map((g) => {
                const on = grades.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    disabled={busy}
                    onClick={() => toggleGrade(g)}
                    className={cn(
                      'btn-jelly py-1.5 rounded-xl border-2 text-xs sm:text-sm font-bold',
                      on
                        ? 'bg-gradient-to-br from-indigo-500 to-violet-600 border-white/30 text-white shadow-[0_4px_0_0_rgba(76,29,149,0.45)]'
                        : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'
                    )}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* 6. ประเภท */}
          <Field label="ประเภท">
            <div className="grid grid-cols-2 gap-2.5">
              {ALL_DOC_TYPES.map((t) => {
                const on = docType === t;
                const Icon = t === 'ใบงาน' ? ClipboardList : FileText;
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={busy}
                    onClick={() => setDocType(t)}
                    className={cn(
                      'btn-jelly flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left',
                      on
                        ? t === 'ใบงาน'
                          ? 'bg-gradient-to-r from-pink-400 to-fuchsia-500 text-white border-white/30 shadow-[0_4px_0_0_rgba(157,23,77,0.4)]'
                          : 'bg-gradient-to-r from-sky-400 to-indigo-500 text-white border-white/30 shadow-[0_4px_0_0_rgba(55,48,163,0.45)]'
                        : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>
                      <span className="block text-sm font-bold">{t}</span>
                      <span className={cn('block text-[11px]', on ? 'text-white/85' : 'text-gray-500 dark:text-gray-400')}>
                        {t === 'ใบงาน' ? 'ให้นักเรียนทำ/ฝึก' : 'เอกสารประกอบการสอน'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          {step && (
            <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-100 dark:border-indigo-900" aria-live="polite">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-800 dark:text-indigo-200">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">{step.label}</span>
              </div>
              <div className="mt-2 h-2.5 rounded-full bg-white dark:bg-gray-800 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-500 transition-[width] duration-300" style={{ width: `${Math.max(4, pct)}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-indigo-700/80 dark:text-indigo-300/80">อย่าปิดหน้านี้จนกว่าจะเสร็จ</p>
            </div>
          )}

          <div className="pt-3 border-t-2 border-dashed border-indigo-100 dark:border-indigo-900/60 flex justify-end gap-2.5">
            <button type="button" onClick={onClose} disabled={busy} className="btn-jelly px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40">
              ยกเลิก
            </button>
            <button type="submit" disabled={busy} className="btn-jelly btn-primary-grad px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {busy ? 'กำลังบันทึก...' : editing ? 'บันทึกการแก้ไข' : 'เพิ่มเอกสาร/ใบงาน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">{label}</p>
      {children}
      {error && <p className="mt-1.5 text-xs font-semibold text-rose-500">{error}</p>}
    </div>
  );
}

function DropZone({ kind, accept, disabled, onFiles }: { kind: DocFileKind; accept: string; disabled: boolean; onFiles: (l: FileList) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const pdf = kind === 'pdf';
  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onClick={() => !disabled && ref.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled && e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      className={cn(
        'group flex items-center justify-center gap-2.5 px-2 py-3 rounded-xl border-2 border-dashed text-left cursor-pointer transition-all',
        pdf
          ? 'border-rose-200 dark:border-rose-900/70 bg-rose-50/60 dark:bg-rose-950/20 hover:border-rose-400'
          : 'border-sky-200 dark:border-sky-900/70 bg-sky-50/60 dark:bg-sky-950/20 hover:border-sky-400',
        over && (pdf ? 'border-rose-500 scale-[1.02]' : 'border-sky-500 scale-[1.02]'),
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className="relative">
        <FileBadge kind={kind} className="w-6 h-8 transition-transform group-hover:-translate-y-1 group-hover:-rotate-6" />
        <span className={cn('absolute -right-1.5 -bottom-1 w-4 h-4 rounded-full text-white flex items-center justify-center ring-2 ring-white dark:ring-gray-900', pdf ? 'bg-rose-500' : 'bg-sky-500')}>
          <Upload className="w-2.5 h-2.5" />
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100">{pdf ? '+ เพิ่มไฟล์ PDF' : '+ เพิ่มไฟล์ Word'}</span>
        <span className="block text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400">{pdf ? '.pdf' : '.docx / .doc'} · ลากมาวางได้</span>
      </span>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function FileRow({ kind, name, size, tag, disabled, onRemove }: { kind: DocFileKind; name: string; size: number; tag: string; disabled: boolean; onRemove: () => void }) {
  return (
    <li className="flex items-center gap-1.5 p-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 animate-pop-in">
      <FileBadge kind={kind} className="w-4 h-5" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate" title={name}>
          {name}
        </p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">
          {formatBytes(size)}{' '}
          <span className={cn('font-bold', tag === 'ใหม่' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500')}>· {tag}</span>
        </p>
      </div>
      <button type="button" onClick={onRemove} disabled={disabled} className="shrink-0 p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40" aria-label={'เอาไฟล์ ' + name + ' ออก'}>
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}
