'use client';

import { useCallback, useState } from 'react';
import type { DownloadFormat } from '@/lib/documents';

export type DownloadState =
  | { phase: 'idle' }
  | { phase: 'asking' }
  | { phase: 'fetching'; done: number; total: number }
  | { phase: 'zipping' }
  | { phase: 'done' }
  | { phase: 'error'; message: string; need?: 'login' | 'member' };

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** ขอลิงก์ชั่วคราวจากเซิร์ฟเวอร์ (ตรวจสิทธิ์สมาชิก) ไฟล์เดียวบันทึกตรง หลายไฟล์รวมเป็น .zip ในเครื่อง */
export function useDocDownload() {
  const [state, setState] = useState<DownloadState>({ phase: 'idle' });

  const download = useCallback(async (docId: string, format: DownloadFormat) => {
    setState({ phase: 'asking' });
    try {
      const res = await fetch(`/api/documents/${docId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ phase: 'error', message: data?.error || 'ดาวน์โหลดไม่สำเร็จ', need: data?.need });
        return false;
      }
      const files: { name: string; url: string }[] = data.files || [];
      // โหลดเป็น blob แล้วบันทึกด้วยชื่อจริง (ภาษาไทยไม่เพี้ยน) หลายไฟล์รวมเป็น .zip
      const blobs: Blob[] = [];
      for (let i = 0; i < files.length; i++) {
        setState({ phase: 'fetching', done: i, total: files.length });
        const r = await fetch(files[i].url);
        if (!r.ok) throw new Error('fetch');
        blobs.push(await r.blob());
      }
      if (files.length === 1) {
        saveBlob(blobs[0], files[0].name);
        setState({ phase: 'done' });
        return true;
      }
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      files.forEach((f, i) => zip.file(f.name, blobs[i]));
      setState({ phase: 'zipping' });
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      saveBlob(blob, data.zipName || 'documents.zip');
      setState({ phase: 'done' });
      return true;
    } catch {
      setState({ phase: 'error', message: 'ดาวน์โหลดไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่อีกครั้งนะ' });
      return false;
    }
  }, []);

  const reset = useCallback(() => setState({ phase: 'idle' }), []);
  return { state, download, reset };
}
