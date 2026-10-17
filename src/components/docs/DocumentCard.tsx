'use client';

import React, { useState } from 'react';
import { Eye, Download, Lock, FileText, Files } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { hasMembership } from '@/lib/membership';
import { SubjectTag } from '@/components/media/SubjectTag';
import { cn } from '@/lib/utils/cn';
import { DocumentItem, formatsOf, previewUrl } from '@/lib/documents';
import { FileBadge, PaperStackIcon } from './DocIcons';
import { DOC_TYPE_STYLE } from './DocumentViewerModal';

const BG: Record<string, string> = {
  คณิตศาสตร์: 'from-emerald-100 via-teal-50 to-mint-100 dark:from-emerald-950/60 dark:via-gray-900 dark:to-teal-950/50',
  วิทยาศาสตร์: 'from-sky-100 via-blue-50 to-indigo-100 dark:from-sky-950/60 dark:via-gray-900 dark:to-indigo-950/50',
  ภาษาอังกฤษ: 'from-amber-100 via-orange-50 to-yellow-100 dark:from-amber-950/50 dark:via-gray-900 dark:to-orange-950/40',
};

export function DocumentCard({ doc, onOpen }: { doc: DocumentItem; onOpen: (doc: DocumentItem, download?: boolean) => void }) {
  const { user, profile } = useAuth();
  const isMember = Boolean(user) && hasMembership(profile);
  const [imgError, setImgError] = useState(false);
  const cover = previewUrl(doc.cover_path);
  const fmt = formatsOf(doc.files);
  const typeStyle = DOC_TYPE_STYLE[doc.doc_type] || DOC_TYPE_STYLE['เอกสาร'];
  const open = () => onOpen(doc);

  return (
    <article
      onClick={open}
      className="group relative flex flex-col h-full bg-white dark:bg-gray-900 border-[3px] border-indigo-300/80 dark:border-indigo-400/55 hover:border-indigo-500 dark:hover:border-indigo-300 rounded-3xl overflow-hidden shadow-toy hover:shadow-toy-lg media-card-hover cursor-pointer"
    >
      {/* ปก: หน้าแรกของเอกสารวางบนพื้นสีตามวิชา */}
      <div className={cn('relative aspect-square w-full overflow-hidden bg-gradient-to-br', BG[doc.subject] || BG['วิทยาศาสตร์'])}>
        <div aria-hidden="true" className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(124,58,237,0.16)_1.2px,transparent_1.2px)] [background-size:16px_16px]" />

        <div className="absolute inset-0 flex items-center justify-center pt-4 pb-10">
          <div className="relative h-full aspect-[1/1.414] max-w-[70%] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-1.5 group-hover:-rotate-1">
            {doc.page_count > 1 && (
              <>
                <span aria-hidden="true" className="absolute inset-0 rounded-md bg-white/80 dark:bg-gray-200/80 shadow-md rotate-[7deg] translate-x-2 transition-transform duration-500 group-hover:rotate-[11deg] group-hover:translate-x-4" />
                <span aria-hidden="true" className="absolute inset-0 rounded-md bg-white/90 dark:bg-gray-100/90 shadow-md rotate-[3deg] translate-x-1 transition-transform duration-500 group-hover:rotate-[5deg] group-hover:translate-x-2" />
              </>
            )}
            <div className="absolute inset-0 rounded-md bg-white shadow-[0_8px_22px_-6px_rgba(49,24,120,0.45)] ring-1 ring-black/5 overflow-hidden">
              {cover && !imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt={doc.title}
                  loading="lazy"
                  draggable={false}
                  onError={() => setImgError(true)}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-indigo-400">
                  <PaperStackIcon className="w-14 h-14" />
                  <span className="text-[11px] font-bold text-indigo-500/80">ไม่มีหน้าตัวอย่าง</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <span className="card-shine" aria-hidden="true" />

        {/* ป้ายประเภท */}
        <span className={cn('absolute top-3 left-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r text-white text-xs font-bold ring-2 ring-white/70', typeStyle.grad, typeStyle.shadow)}>
          <FileText className="w-3 h-3" />
          {doc.doc_type}
        </span>

        {/* รูปแบบไฟล์ที่มี */}
        <span className="absolute top-3 right-3 inline-flex items-center gap-0.5 px-1.5 py-1 rounded-full bg-white/95 dark:bg-gray-900/90 shadow-sm">
          {fmt.pdf && <FileBadge kind="pdf" className="w-4 h-5" />}
          {fmt.word && <FileBadge kind="word" className="w-4 h-5" />}
        </span>

        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1 shadow-sm">
          <Eye className="w-3.5 h-3.5 opacity-90" />
          <span>{doc.view_count.toLocaleString('th-TH')}</span>
        </div>
        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-white/95 dark:bg-gray-900/90 text-gray-800 dark:text-gray-100 text-xs font-semibold flex items-center gap-1 shadow-sm">
          <Files className="w-3 h-3 text-indigo-500" />
          <span>
            {doc.files.length} ไฟล์{doc.page_count > 0 ? ` · ${doc.page_count} หน้า` : ''}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            <SubjectTag subject={doc.subject} size="sm" />
            {doc.grade_level.map((g) => (
              <span key={g} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {g}
              </span>
            ))}
          </div>
          <h3
            className="font-display font-medium text-base sm:text-lg text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors"
            title={doc.title}
          >
            {doc.title}
          </h3>
        </div>

        <div className="mt-1 flex flex-wrap items-stretch gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            className="btn-jelly btn-primary-grad flex-1 min-w-[6.5rem] inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-sm font-bold"
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span className="truncate">ดูตัวอย่าง</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(doc, true);
            }}
            className={cn(
              'btn-jelly flex-1 min-w-[6.5rem] inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-sm font-bold border-2',
              isMember
                ? 'bg-mint-400/15 text-emerald-800 dark:text-mint-300 border-mint-500/50'
                : 'bg-sun-400/20 text-amber-900 dark:text-sun-300 border-sun-500/60'
            )}
          >
            {isMember ? <Download className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>ดาวน์โหลด</span>
          </button>
        </div>
      </div>
    </article>
  );
}
