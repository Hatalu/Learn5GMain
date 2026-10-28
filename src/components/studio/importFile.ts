'use client';

/**
 * นำเข้าไฟล์จากเครื่อง (Word / PDF / ข้อความ / Markdown / หน้าเว็บ) ใช้ร่วมกันทั้งหน้าคลังสื่อ ตัวแก้ไข และแอปออฟไลน์
 * รูปในไฟล์ส่งผ่าน uploadImage (เว็บ = อัปโหลดเข้าที่เก็บของบัญชี / แอป = ตัวแทนที่คืน data URL)
 */
import { uploadImage } from '@/lib/game-creator/media';
import { blankPage, cleanSrc, makeImage, MAX_PAGES, type Design, type Page } from '@/lib/studio/doc';
import { cleanFlowHtml, cleanWordOpt } from '@/lib/studio/flow';
import type { AddImage, ImportResult, ImportStats } from '@/lib/studio/docxImport';

export const IMPORT_ACCEPT = '.docx,.pdf,.txt,.md,.markdown,.html,.htm,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain,text/markdown,text/html';
export type ImportKind = 'docx' | 'pdf' | 'txt' | 'md' | 'html' | 'doc' | null;
export const FILE_MAX_MB = 40;

export function importKind(f: File): ImportKind {
  const n = f.name.toLowerCase();
  if (n.endsWith('.docx')) return 'docx';
  if (n.endsWith('.pdf') || f.type === 'application/pdf') return 'pdf';
  if (n.endsWith('.md') || n.endsWith('.markdown')) return 'md';
  if (n.endsWith('.html') || n.endsWith('.htm')) return 'html';
  if (n.endsWith('.txt') || f.type === 'text/plain') return 'txt';
  // Word รุ่นเก่า (.doc) เปิดตรงไม่ได้ ต้องบันทึกเป็น .docx ก่อน
  if (n.endsWith('.doc')) return 'doc';
  return null;
}
export const isImportable = (f: File) => {
  const k = importKind(f);
  return !!k && k !== 'doc';
};

/** รูปในไฟล์ -> อัปโหลดด้วยระบบเดิม (ย่อเหลือด้านยาว 1600px) คืนที่อยู่รูป */
export const uploadSink =
  (userId: string): AddImage =>
  async (bytes, mime) => {
    const type = mime === 'image/jpg' ? 'image/jpeg' : mime;
    const m = await uploadImage(userId, new File([bytes as BlobPart], `import.${type.split('/')[1]}`, { type }), 1600);
    return m.url;
  };

/** แปลงไฟล์เป็นเนื้อหาโหมดเอกสาร (ยังไม่กรอง) */
export async function importAsFlow(file: File, addImage: AddImage, onStep?: (msg: string) => void): Promise<ImportResult> {
  const kind = importKind(file);
  if (kind === 'doc') throw new Error('ไฟล์ .doc รุ่นเก่าเปิดไม่ได้ ให้เปิดใน Word แล้วบันทึกเป็น .docx ก่อน');
  if (!kind) throw new Error('รองรับไฟล์ Word (.docx) PDF ข้อความ (.txt) Markdown (.md) และหน้าเว็บ (.html)');
  if (file.size > FILE_MAX_MB * 1024 * 1024) throw new Error(`ไฟล์ต้องไม่เกิน ${FILE_MAX_MB}MB`);
  const empty = (html: string): ImportResult => ({ html, head: '', foot: '', stats: { paragraphs: 0, equations: (html.match(/data-tex=/g) || []).length, failedEq: 0, images: 0, droppedImages: 0 } });
  if (kind === 'docx') {
    onStep?.('กำลังอ่านไฟล์ Word…');
    const { docxToFlow } = await import('@/lib/studio/docxImport');
    return docxToFlow(await file.arrayBuffer(), addImage);
  }
  if (kind === 'pdf') {
    const { pdfToFlow } = await import('@/lib/studio/pdfImport');
    return pdfToFlow(new Uint8Array(await file.arrayBuffer()), (i, n) => onStep?.(`กำลังอ่าน PDF หน้า ${i}/${n}…`));
  }
  const { textToFlow, htmlToFlow } = await import('@/lib/studio/textImport');
  const text = await file.text();
  return empty(kind === 'html' ? htmlToFlow(text) : textToFlow(text, kind === 'md'));
}

/** PDF แบบเหมือนต้นฉบับ: ทุกหน้าเป็นรูปเต็มหน้า (โหมด Canva) */
export async function importPdfPages(file: File, W: number, H: number, room: number, addImage: AddImage, onStep?: (msg: string) => void): Promise<{ pages: Page[]; total: number }> {
  if (file.size > FILE_MAX_MB * 1024 * 1024) throw new Error(`ไฟล์ต้องไม่เกิน ${FILE_MAX_MB}MB`);
  const { pdfPageImages } = await import('@/lib/studio/pdfImport');
  const pages: Page[] = [];
  const r = await pdfPageImages(new Uint8Array(await file.arrayBuffer()), {
    width: 1240,
    maxPages: Math.max(1, Math.min(room, MAX_PAGES)),
    onPage: async (jpeg, i, n, ratio) => {
      onStep?.(`กำลังทำหน้า ${i + 1}/${n}…`);
      const src = await addImage(new Uint8Array(await jpeg.arrayBuffer()), 'image/jpeg');
      if (!src) throw new Error('ใส่รูปหน้าไม่สำเร็จ');
      // ย่อให้พอดีกระดาษ ไม่บิดสัดส่วน
      const w = Math.min(W, H / ratio);
      const h = w * ratio;
      pages.push({ ...blankPage(), items: [{ ...makeImage(src, Math.round(w), Math.round(h)), x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), locked: true }] });
    },
  });
  return { pages, total: r.total };
}

/** สื่อใหม่โหมดเอกสารจากผลนำเข้า (ใช้ระยะขอบและหัว/ท้ายกระดาษจากไฟล์) */
export function designFromImport(base: Design, r: ImportResult): Design {
  const word = cleanWordOpt(
    {
      ...base.word,
      std: true,
      ...(r.margins ?? {}),
      head: r.head,
      foot: r.foot,
    },
    cleanSrc
  );
  return { ...base, mode: 'word', flow: cleanFlowHtml(r.html, cleanSrc) || '<p><br></p>', word };
}

/** ต่อท้ายเนื้อหาเดิม (ขึ้นหน้าใหม่ก่อนถ้ามีเนื้อหาอยู่แล้ว) */
export function appendFlow(flow: string, html: string, hasContent: boolean): string {
  return cleanFlowHtml((hasContent ? `${flow}<div data-pb="1"></div>` : '') + html, cleanSrc);
}

/** สรุปผลนำเข้าให้ผู้ใช้อ่าน */
export function importNote(s: ImportStats, kind: ImportKind): string {
  const bits: string[] = ['นำเข้าแล้ว'];
  if (s.equations) bits.push(`สมการ ${s.equations - s.failedEq} ตัวแก้ได้ใน MathType`);
  if (s.failedEq) bits.push(`${s.failedEq} สมการอ่านไม่ได้ (ขึ้นเป็นกล่อง ?)`);
  if (s.images) bits.push(`รูป ${s.images}`);
  if (s.droppedImages) bits.push(`ข้ามรูป ${s.droppedImages} รูป (EMF/WMF หรือใหญ่เกิน)`);
  if (s.truncated) bits.push('ไฟล์ยาวมาก นำเข้าได้แค่ส่วนแรก');
  if (kind === 'pdf') bits.push('PDF เดาสมการจากตำแหน่งตัวอักษร ควรตรวจอีกครั้ง');
  return bits.join(' · ');
}

/** ให้ส่งต่อไฟล์ข้ามหน้า (คลังสื่อ -> ตัวแก้ไข) โดยไม่ต้องอัปโหลด */
let pending: { file: File; how: 'flow' | 'pages' } | null = null;
export const setPendingImport = (p: typeof pending) => (pending = p);
export const takePendingImport = () => {
  const p = pending;
  pending = null;
  return p;
};
