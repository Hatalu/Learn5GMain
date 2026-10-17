/**
 * คลัง "เอกสาร/ใบงาน" (migration 022)
 * ไฟล์ต้นฉบับอยู่ bucket `documents` (ส่วนตัว) รูปตัวอย่างที่ฝังลายน้ำแล้วอยู่ bucket `doc-previews` (สาธารณะ)
 * ใช้ได้ทั้งฝั่งเบราว์เซอร์และเซิร์ฟเวอร์ (ไม่มีโค้ดเฉพาะฝั่งใด)
 */

export type DocType = 'เอกสาร' | 'ใบงาน';
export const ALL_DOC_TYPES: DocType[] = ['เอกสาร', 'ใบงาน'];

export type DocFileKind = 'pdf' | 'word';
/** รูปแบบที่เลือกดาวน์โหลดได้ */
export type DownloadFormat = 'pdf' | 'word' | 'both';

export const DOC_BUCKET = 'documents';
export const PREVIEW_BUCKET = 'doc-previews';
/** เพดานขนาดต่อไฟล์ (ตรงกับ file_size_limit ของ bucket) */
export const DOC_MAX_BYTES = 50 * 1024 * 1024;
/** ทำรูปตัวอย่างไม่เกินกี่หน้าต่อไฟล์ (กันไฟล์ใหญ่มากกินพื้นที่) */
export const PREVIEW_MAX_PAGES = 120;

export interface DocFile {
  /** รหัสสั้นของไฟล์ในเอกสารนี้ ใช้ตั้งชื่อไฟล์ใน storage */
  id: string;
  kind: DocFileKind;
  /** ชื่อไฟล์เดิมตอนอัปโหลด (ใช้เป็นชื่อตอนดาวน์โหลด) */
  name: string;
  size: number;
  /** พาธใน bucket documents */
  path: string;
  /** จำนวนหน้าของไฟล์ (0 = ไม่ทราบ) */
  pages: number;
  /** พาธรูปตัวอย่างแต่ละหน้าใน bucket doc-previews (ว่าง = ไม่มีตัวอย่าง) */
  preview: string[];
}

export interface DocumentItem {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  grade_level: string[];
  doc_type: DocType;
  is_public: boolean;
  files: DocFile[];
  cover_path: string | null;
  page_count: number;
  view_count: number;
  download_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const WORD_EXT = ['.doc', '.docx'];
export const PDF_EXT = ['.pdf'];
export const WORD_ACCEPT =
  '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const PDF_ACCEPT = '.pdf,application/pdf';

const ext = (name: string) => {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i).toLowerCase();
};

/** ชนิดไฟล์จากชื่อ (null = ไม่รองรับ) */
export function fileKindOf(name: string): DocFileKind | null {
  const e = ext(name);
  if (PDF_EXT.includes(e)) return 'pdf';
  if (WORD_EXT.includes(e)) return 'word';
  return null;
}

/** content-type ที่ใช้ตอนอัปโหลด (ต้องอยู่ใน allowed_mime_types ของ bucket) */
export function mimeOf(name: string): string {
  const e = ext(name);
  if (e === '.pdf') return 'application/pdf';
  if (e === '.doc') return 'application/msword';
  return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

/** พาธใน storage ห้ามมีอักษรไทย/ช่องว่าง จึงใช้รหัสแทนชื่อจริง */
export function storagePathFor(docId: string, fileId: string, name: string): string {
  const e = ext(name).replace(/[^a-z.]/g, '') || '.bin';
  return `${docId}/${fileId}${e}`;
}

export function newFileId(): string {
  const a = new Uint8Array(6);
  globalThis.crypto.getRandomValues(a);
  return 'f' + Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function previewPathFor(docId: string, fileId: string, page: number): string {
  return `${docId}/${fileId}-${String(page).padStart(3, '0')}.webp`;
}

/** ลิงก์สาธารณะของรูปตัวอย่าง */
export function previewUrl(path: string | null | undefined): string {
  if (!path) return '';
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${PREVIEW_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export function formatBytes(n: number): string {
  if (!n || n < 1024) return `${n || 0} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

/** มีไฟล์รูปแบบไหนให้ดาวน์โหลดบ้าง */
export function formatsOf(files: Pick<DocFile, 'kind'>[]): { pdf: boolean; word: boolean; both: boolean } {
  const pdf = files.some((f) => f.kind === 'pdf');
  const word = files.some((f) => f.kind === 'word');
  return { pdf, word, both: pdf && word };
}

/** ไฟล์ที่ต้องส่งให้ตามรูปแบบที่เลือก (ว่าง = เลือกรูปแบบที่ไม่มีไฟล์) */
export function filesForFormat<T extends Pick<DocFile, 'kind'>>(files: T[], format: DownloadFormat): T[] {
  if (format === 'both') {
    const f = formatsOf(files);
    return f.both ? files.filter((x) => x.kind === 'pdf' || x.kind === 'word') : [];
  }
  return files.filter((x) => x.kind === format);
}

/** ไฟล์ที่มีรูปตัวอย่าง เรียงตามลำดับในเอกสาร */
export function previewFiles(files: DocFile[]): DocFile[] {
  return files.filter((f) => Array.isArray(f.preview) && f.preview.length > 0);
}

/** ชื่อไฟล์ปลอดภัยสำหรับบันทึกลงเครื่อง/ใน zip (คงภาษาไทยไว้ ตัดอักขระต้องห้ามของระบบไฟล์) */
export function safeFileName(name: string, fallback = 'file'): string {
  const s = String(name || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150);
  return s || fallback;
}

/** ชื่อไฟล์ไม่ซ้ำกันใน zip (ชื่อซ้ำเติม (2) (3) ...) */
export function uniqueNames(names: string[]): string[] {
  const used = new Map<string, number>();
  return names.map((raw) => {
    const n = safeFileName(raw);
    const key = n.toLowerCase();
    const c = used.get(key) || 0;
    used.set(key, c + 1);
    if (!c) return n;
    const i = n.lastIndexOf('.');
    return i > 0 ? `${n.slice(0, i)} (${c + 1})${n.slice(i)}` : `${n} (${c + 1})`;
  });
}

/** แปลงแถวจากฐานข้อมูลให้เป็นรูปที่ปลอดภัย (คอลัมน์ jsonb อาจเพี้ยน) */
export function normalizeDocument(row: Record<string, unknown>): DocumentItem {
  const files = Array.isArray(row.files) ? (row.files as Record<string, unknown>[]) : [];
  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: row.description ? String(row.description) : null,
    subject: String(row.subject || ''),
    grade_level: Array.isArray(row.grade_level) ? (row.grade_level as string[]) : [],
    doc_type: row.doc_type === 'ใบงาน' ? 'ใบงาน' : 'เอกสาร',
    is_public: row.is_public !== false,
    files: files
      .filter((f) => f && typeof f.path === 'string' && (f.kind === 'pdf' || f.kind === 'word'))
      .map((f) => ({
        id: String(f.id || ''),
        kind: f.kind as DocFileKind,
        name: String(f.name || 'file'),
        size: Number(f.size) || 0,
        path: String(f.path),
        pages: Number(f.pages) || 0,
        preview: Array.isArray(f.preview) ? (f.preview as unknown[]).map(String) : [],
      })),
    cover_path: row.cover_path ? String(row.cover_path) : null,
    page_count: Number(row.page_count) || 0,
    view_count: Number(row.view_count) || 0,
    download_count: Number(row.download_count) || 0,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
  };
}

/** ตารางยังไม่ถูกสร้าง (ยังไม่ได้รัน migration 022) */
export function isMissingTable(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === '42P01' || err.code === 'PGRST205' || /documents/.test(err.message || '') && /not find|does not exist/i.test(err.message || '');
}
