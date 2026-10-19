'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Globe, Lock, Loader2, Eye, Download, AlertTriangle, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { FileBadge, PaperStackIcon } from '@/components/docs/DocIcons';
import { DocumentViewerModal } from '@/components/docs/DocumentViewerModal';
import { cn } from '@/lib/utils/cn';
import { DOC_BUCKET, DocumentItem, PREVIEW_BUCKET, formatsOf, isMissingTable, normalizeDocument, partPaths, previewUrl } from '@/lib/documents';

interface Props {
  /** เปลี่ยนค่าเมื่อมีการเพิ่ม/แก้ไขจากหน้าต่างฟอร์ม ให้โหลดรายการใหม่ */
  refreshKey: number;
  onAdd: () => void;
  onEdit: (doc: DocumentItem) => void;
  onCount?: (n: number) => void;
}

/** แท็บ Dev: จัดการเอกสาร/ใบงาน (เปิด/ซ่อน แก้ไข ลบ ดูตัวอย่าง) */
export function DocumentsAdmin({ refreshKey, onAdd, onEdit, onCount }: Props) {
  const { success, error } = useToast();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DocumentItem | null>(null);
  const [viewing, setViewing] = useState<DocumentItem | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await createClient().from('documents').select('*').order('created_at', { ascending: false });
    if (err) {
      setMissing(isMissingTable(err));
      if (!isMissingTable(err)) error(err.message);
    } else {
      setMissing(false);
      const list = (data || []).map((r) => normalizeDocument(r as Record<string, unknown>));
      setDocs(list);
      onCount?.(list.length);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const shown = useMemo(() => (filter === 'all' ? docs : docs.filter((d) => d.is_public === (filter === 'public'))), [docs, filter]);

  const toggle = async (d: DocumentItem) => {
    setBusyId(d.id);
    const { error: err } = await createClient().from('documents').update({ is_public: !d.is_public, updated_at: new Date().toISOString() }).eq('id', d.id);
    setBusyId(null);
    if (err) return error(err.message);
    setDocs((prev) => prev.map((x) => (x.id === d.id ? { ...x, is_public: !d.is_public } : x)));
    success(!d.is_public ? `เผยแพร่ "${d.title}" แล้ว` : `ซ่อน "${d.title}" แล้ว`);
  };

  const remove = async (d: DocumentItem) => {
    setBusyId(d.id);
    const supabase = createClient();
    const { error: err } = await supabase.from('documents').delete().eq('id', d.id);
    if (err) {
      setBusyId(null);
      return error(err.message);
    }
    // ลบไฟล์ต้นฉบับและหน้าตัวอย่างทั้งหมดของชุดนี้
    const originals = d.files.flatMap(partPaths);
    const previews = d.files.flatMap((f) => f.preview);
    if (originals.length) await supabase.storage.from(DOC_BUCKET).remove(originals);
    if (previews.length) await supabase.storage.from(PREVIEW_BUCKET).remove(previews);
    setBusyId(null);
    setDeleting(null);
    const next = docs.filter((x) => x.id !== d.id);
    setDocs(next);
    onCount?.(next.length);
    success(`ลบ "${d.title}" แล้ว`);
  };

  if (missing) {
    return (
      <div className="p-6 rounded-3xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
        <div className="text-sm text-amber-900 dark:text-amber-200">
          <p className="font-bold">ยังไม่มีตาราง/ที่เก็บไฟล์สำหรับเอกสาร</p>
          <p className="mt-1">เปิด Supabase &gt; SQL Editor แล้วรันไฟล์ <code className="px-1 rounded bg-white/70 dark:bg-black/30">supabase/migrations/022_documents.sql</code> จากนั้นรีเฟรชหน้านี้</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">เอกสาร/ใบงานทั้งหมด</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{docs.length} รายการ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60 text-xs">
            {(
              [
                ['all', `ทั้งหมด (${docs.length})`],
                ['public', `Public (${docs.filter((d) => d.is_public).length})`],
                ['private', `Private (${docs.filter((d) => !d.is_public).length})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={cn('px-3 py-1.5 rounded-lg font-medium', filter === k ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-300 font-semibold shadow-sm' : 'text-gray-600 dark:text-gray-400')}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={onAdd} className="btn-jelly inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md">
            <Plus className="w-4 h-4" /> เพิ่ม
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50">
          <PaperStackIcon className="w-12 h-12 mx-auto text-indigo-400" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{docs.length ? 'ไม่มีรายการในสถานะนี้' : 'ยังไม่มีเอกสาร/ใบงาน'}</p>
          {!docs.length && (
            <button type="button" onClick={onAdd} className="btn-jelly mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white">
              <Plus className="w-4 h-4" /> เพิ่มเอกสาร/ใบงาน
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3.5 px-4">ชื่อ</th>
                <th className="py-3.5 px-4 hidden md:table-cell">วิชา / ชั้น</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">ไฟล์</th>
                <th className="py-3.5 px-4">สถานะ</th>
                <th className="py-3.5 px-4 text-center hidden sm:table-cell">ดู / โหลด</th>
                <th className="py-3.5 px-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {shown.map((d) => {
                const f = formatsOf(d.files);
                return (
                  <tr key={d.id} className={cn('hover:bg-gray-50/70 dark:hover:bg-gray-800/40', !d.is_public && 'bg-amber-50/30 dark:bg-amber-950/10')}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-14 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-200 dark:border-gray-700">
                          {d.cover_path ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={previewUrl(d.cover_path)} alt="" className="w-full h-full object-cover object-top" />
                          ) : (
                            <PaperStackIcon className="w-full h-full p-1.5 text-indigo-300" />
                          )}
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{d.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            <span className={cn('font-bold', d.doc_type === 'ใบงาน' ? 'text-pink-600 dark:text-pink-300' : 'text-sky-600 dark:text-sky-300')}>{d.doc_type}</span>
                            {' · '}
                            {d.page_count} หน้า
                          </p>
                          <button type="button" onClick={() => setViewing(d)} className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                            ดูตัวอย่าง <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <span className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">{d.subject}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {d.grade_level.map((g) => (
                          <span key={g} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            {g}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1">
                        {f.pdf && <FileBadge kind="pdf" className="w-4 h-5" />}
                        {f.word && <FileBadge kind="word" className="w-4 h-5" />}
                        <span className="text-xs text-gray-600 dark:text-gray-300">{d.files.length} ไฟล์</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => toggle(d)}
                        disabled={busyId === d.id}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border active:scale-95 disabled:opacity-50',
                          d.is_public
                            ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                        )}
                        title={d.is_public ? 'คลิกเพื่อซ่อน (Private)' : 'คลิกเพื่อเผยแพร่ (Public)'}
                      >
                        {busyId === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : d.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3 text-amber-500" />}
                        {d.is_public ? 'Public' : 'Private'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center hidden sm:table-cell">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <span className="inline-flex items-center gap-0.5">
                          <Eye className="w-3 h-3 text-gray-400" />
                          {d.view_count.toLocaleString('th-TH')}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <Download className="w-3 h-3 text-gray-400" />
                          {d.download_count.toLocaleString('th-TH')}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => onEdit(d)} className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800" title="แก้ไข" aria-label="แก้ไข">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setDeleting(d)} className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="ลบ" aria-label="ลบ">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/70 backdrop-blur-sm" onMouseDown={() => busyId !== deleting.id && setDeleting(null)}>
          <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl border-[3px] border-rose-200 dark:border-rose-900 p-6 shadow-toy-lg animate-pop-in">
            <span className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </span>
            <p className="mt-3 font-display text-lg text-gray-900 dark:text-white">ลบ &quot;{deleting.title}&quot;?</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ไฟล์ทั้งหมด {deleting.files.length} ไฟล์และหน้าตัวอย่างจะถูกลบถาวร กู้คืนไม่ได้</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleting(null)} disabled={busyId === deleting.id} className="px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                ยกเลิก
              </button>
              <button type="button" onClick={() => remove(deleting)} disabled={busyId === deleting.id} className="btn-jelly px-4 py-2.5 rounded-xl text-sm font-bold bg-rose-600 text-white inline-flex items-center gap-1.5 disabled:opacity-60">
                {busyId === deleting.id && <Loader2 className="w-4 h-4 animate-spin" />} ลบถาวร
              </button>
            </div>
          </div>
        </div>
      )}

      <DocumentViewerModal doc={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
