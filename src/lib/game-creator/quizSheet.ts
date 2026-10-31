/**
 * นำเข้า/ส่งออกคำถามเป็นตาราง (CSV / Excel .xlsx) ไม่มี DOM ใช้ได้ทั้งเว็บและ selftest
 * คอลัมน์: คำถาม | ตัวเลือก 1-6 | ข้อที่ถูก | เวลา (วินาที) | ชนิด
 * - ชนิด text (พิมพ์ตอบ): ใส่คำตอบที่ยอมรับในช่องตัวเลือก 1-6 เว้นช่องข้อที่ถูก
 * - สูตรคณิตเขียนในเครื่องหมาย $...$ เช่น $\frac{1}{2}$
 * - รูป/คลิป/เสียงใส่ในตารางไม่ได้ (ตัวเลือกที่เป็นรูปล้วนจะออกมาเป็นช่องว่าง)
 */
import type { QuizChoice, QuizQuestion, Rich, Seg } from './types';
import { ANSWER_CHARS, ANSWER_MAX, DEFAULT_TIME, LIMITS, TIME_OPTIONS, quizIssues, richLength, sanitizeQuiz, uid } from './quiz';
import { parseXml, type XNode } from '../studio/xml';

export const SHEET_HEAD = ['คำถาม', 'ตัวเลือก 1', 'ตัวเลือก 2', 'ตัวเลือก 3', 'ตัวเลือก 4', 'ตัวเลือก 5', 'ตัวเลือก 6', 'ข้อที่ถูก', 'เวลา (วินาที)', 'ชนิด (choice/text)'];
const C_OK = 7;
const C_TIME = 8;
const C_KIND = 9;

/* ------------------------------- ข้อความ <-> Rich ------------------------------- */

export const richToCell = (r: Rich) => r.map((s) => (s.t === 'm' ? `$${s.v}$` : s.v)).join('');

// shortcut: ข้อความที่มี $ จริงสองตัว (เช่น $5 และ $6) จะกลายเป็นสูตร ถ้ามีครูใช้ค่อยทำตัว escape
export function cellToRich(s: string): Rich {
  const out: Seg[] = [];
  let last = 0;
  for (const m of s.matchAll(/\$([^$]+)\$/g)) {
    if (m.index! > last) out.push({ t: 'x', v: s.slice(last, m.index) });
    out.push({ t: 'm', v: m[1].trim() });
    last = m.index! + m[0].length;
  }
  if (last < s.length) out.push({ t: 'x', v: s.slice(last) });
  return out;
}

/* ------------------------------- กันแอป Excel แปลงค่าเอง ------------------------------- */

// shortcut: ไม่กันค่าที่ขึ้นต้นด้วย - (ต้องเก็บ -5 ไว้ได้) ถ้าเจอปัญหาสูตรแบบ -x ค่อยเพิ่ม
const FORMULA = /^[=+@\t\r]/;
// เลขธรรมดาที่ Excel เก็บได้ตรงตัว (12, -5, 0.5) นอกนั้นที่หน้าตาเป็นตัวเลข Excel จะแปลงเอง
// (3/4 วันที่, 9:15 เวลา, 1.50, 007, 50%, 1,000, 1e5) จึงห่อเป็น ="..." ให้เป็นข้อความ
const PLAIN = /^-?(0|[1-9]\d{0,14})(\.\d*[1-9])?$/;
const NUMLIKE = /^[-+\d\s.,:/%eE]+$/;

export function guardCell(v: string): string {
  if (FORMULA.test(v)) return `'${v}`;
  if (/\d/.test(v) && NUMLIKE.test(v) && !PLAIN.test(v)) return `="${v}"`;
  return v;
}

export function unguardCell(v: string): string {
  const f = /^="([\s\S]*)"$/.exec(v);
  if (f) return f[1].replace(/""/g, '"');
  return v.replace(/^'(?=[=+@\t\r])/, '');
}

/* ------------------------------- CSV ------------------------------- */

const csvCell = (v: string) => (/[",;\t\r\n]|^\s|\s$/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function buildCsv(rows: string[][]): string {
  return '﻿' + rows.map((r) => r.map((v) => csvCell(guardCell(v))).join(',')).join('\r\n') + '\r\n';
}

export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, '');
  const first = s.slice(0, s.search(/\r?\n|$/));
  const count = (ch: string) => first.split(ch).length;
  const sep = count('\t') > count(',') && count('\t') > count(';') ? '\t' : count(';') > count(',') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map(unguardCell));
}

/** Excel ภาษาไทยบันทึก "CSV" เป็น Windows-874 ส่วน "CSV UTF-8" เป็น UTF-8 */
export function decodeText(buf: ArrayBuffer | Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-874').decode(buf);
  }
}

/* ------------------------------- XLSX ------------------------------- */

const findAll = (n: XNode, tag: string, out: XNode[] = []): XNode[] => {
  for (const k of n.kids) {
    if (k.tag === tag) out.push(k);
    findAll(k, tag, out);
  }
  return out;
};
const textOf = (n: XNode) => findAll(n, 't').map((t) => t.text).join('');
const colOf = (ref: string) => [...(ref.match(/^[A-Z]+/)?.[0] || 'A')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

/** แถวของชีตแรก [เลขแถวใน Excel, ค่า] */
export async function xlsxRows(data: ArrayBuffer | Uint8Array): Promise<[number, string[]][]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(data);
  const read = (p: string) => zip.file(p)?.async('string') ?? Promise.resolve('');
  const book = parseXml(await read('xl/workbook.xml'));
  const rid = findAll(book, 'sheet')[0]?.attrs['r:id'];
  const rel = findAll(parseXml(await read('xl/_rels/workbook.xml.rels')), 'Relationship').find((r) => r.attrs.Id === rid);
  const target = rel?.attrs.Target || 'worksheets/sheet1.xml';
  const sheet = parseXml(await read(target.startsWith('/') ? target.slice(1) : `xl/${target}`));
  const shared = findAll(parseXml(await read('xl/sharedStrings.xml')), 'si').map(textOf);
  return findAll(sheet, 'row').map((r, i) => {
    const vals: string[] = [];
    for (const c of findAll(r, 'c')) {
      const t = c.attrs.t;
      const v = findAll(c, 'v')[0]?.text ?? '';
      vals[colOf(c.attrs.r || '')] = t === 's' ? shared[+v] ?? '' : t === 'inlineStr' ? textOf(c) : t === 'b' ? (v === '1' ? 'TRUE' : 'FALSE') : v;
    }
    return [+(r.attrs.r || i + 1), Array.from(vals, (x) => unguardCell(x ?? ''))];
  });
}

/** อ่านไฟล์ที่ผู้ใช้เลือก (.csv / .xlsx) เป็นแถว [เลขแถว, ค่า] */
export async function readSheet(name: string, buf: ArrayBuffer): Promise<[number, string[]][]> {
  const head = new Uint8Array(buf.slice(0, 4));
  if (head[0] === 0x50 && head[1] === 0x4b) return xlsxRows(buf);
  if (head[0] === 0xd0 && head[1] === 0xcf) throw new Error('ไฟล์ .xls แบบเก่าเปิดไม่ได้ ให้บันทึกเป็น .xlsx หรือ CSV ก่อนนะ');
  if (!/\.(csv|txt|tsv)$/i.test(name)) throw new Error('รองรับเฉพาะไฟล์ .csv และ .xlsx');
  return parseCsv(decodeText(buf)).map((r, i) => [i + 1, r]);
}

/* ------------------------------- ส่งออก ------------------------------- */

export function quizToRows(questions: QuizQuestion[]): string[][] {
  return [
    SHEET_HEAD,
    ...questions.map((q) => {
      const cells = q.kind === 'text' ? (q.answers || []) : q.choices.map((c) => richToCell(c.text));
      const ok = q.kind === 'text' ? '' : q.choices.flatMap((c, i) => (c.correct ? [String(i + 1)] : [])).join(', ');
      return [richToCell(q.text), ...Array.from({ length: 6 }, (_, i) => cells[i] || ''), ok, String(q.time), q.kind === 'text' ? 'text' : 'choice'];
    }),
  ];
}

export const TEMPLATE_ROWS: string[][] = [
  SHEET_HEAD,
  ['ข้อใดเท่ากับ $\\frac{1}{2}$', '$\\frac{2}{4}$', '$\\frac{1}{3}$', '$\\frac{2}{3}$', '$\\frac{3}{4}$', '', '', '1', '20', 'choice'],
  ['ข้อใดเป็นจำนวนคู่ (ตอบได้หลายข้อ)', '2', '3', '8', '11', '', '', '1, 3', '30', 'choice'],
  ['ดวงอาทิตย์ขึ้นทางทิศตะวันออก', 'ถูก', 'ผิด', '', '', '', '', '1', '10', 'choice'],
  ['5 + 7 เท่ากับเท่าไร (พิมพ์ตอบ)', '12', 'สิบสอง', '', '', '', '', '', '20', 'text'],
];

/* ------------------------------- นำเข้า ------------------------------- */

export interface SheetRow {
  row: number;
  q: QuizQuestion | null;
  errs: string[];
}

const KIND: Record<string, 'choice' | 'text'> = { '': 'choice', choice: 'choice', 'เลือก': 'choice', 'ตัวเลือก': 'choice', text: 'text', 'พิมพ์': 'text', 'พิมพ์ตอบ': 'text' };
const OK_LIST = /^[\d\s,;/|]+$/;

/** แปลงแถวเป็นคำถาม แถวแรกที่ไม่ว่างซึ่งช่อง "ข้อที่ถูก" ไม่ใช่ตัวเลข (หรือขึ้นต้นว่า "คำถาม") ถือเป็นหัวตาราง แถวว่างข้ามไป */
export function rowsToQuestions(rows: [number, string[]][], mediaPrefix: string): SheetRow[] {
  const out: SheetRow[] = [];
  let first = true;
  rows.forEach(([row, raw]) => {
    const cell = (k: number) => String(raw[k] ?? '').trim();
    if (raw.every((v) => !String(v ?? '').trim())) return;
    const head = cell(0) === SHEET_HEAD[0] || (first && !!cell(C_OK) && !OK_LIST.test(cell(C_OK)));
    first = false;
    if (head) return;
    const errs: string[] = [];
    const kind = KIND[cell(C_KIND).toLowerCase()];
    if (!kind) errs.push(`ชนิด "${cell(C_KIND)}" ไม่รู้จัก ใช้ choice หรือ text`);
    const text = cellToRich(cell(0));
    if (richLength(text) > LIMITS.questionChars) errs.push(`คำถามยาวเกิน ${LIMITS.questionChars} ตัวอักษร`);
    const t = cell(C_TIME);
    const time = t ? Number(t) : DEFAULT_TIME;
    if (!TIME_OPTIONS.includes(time as (typeof TIME_OPTIONS)[number])) errs.push(`เวลาต้องเป็น ${TIME_OPTIONS.join(' ')} วินาที (0 = ไม่จำกัด)`);
    const cells = [1, 2, 3, 4, 5, 6].map(cell);
    const q: QuizQuestion = { id: uid(), text, media: null, choices: [], multi: false, time, points: 1 };
    if (kind === 'text') {
      const answers = cells.filter(Boolean);
      if (answers.some((a) => a.length > ANSWER_CHARS)) errs.push(`คำตอบยาวเกิน ${ANSWER_CHARS} ตัวอักษร`);
      Object.assign(q, { kind: 'text', answers: answers.slice(0, ANSWER_MAX) });
    } else if (kind === 'choice') {
      const ok = cell(C_OK);
      const picks = ok.split(/[\s,;/|]+/).filter(Boolean).map(Number);
      if (ok && !OK_LIST.test(ok)) errs.push('ช่องข้อที่ถูกต้องเป็นเลข 1-6 เช่น 2 หรือ 1, 3');
      for (const p of picks) if (!cells[p - 1]) errs.push(`ข้อที่ถูก ${p} ไม่มีตัวเลือก`);
      if (cells.some((c) => cellToRich(c).length && richLength(cellToRich(c)) > LIMITS.choiceChars)) errs.push(`ตัวเลือกยาวเกิน ${LIMITS.choiceChars} ตัวอักษร`);
      q.choices = cells.flatMap((c, k): QuizChoice[] => (c ? [{ id: uid(), text: cellToRich(c), media: null, correct: picks.includes(k + 1) }] : []));
      q.multi = new Set(picks).size > 1;
    }
    const clean = sanitizeQuiz({ v: 1, questions: [q] }, mediaPrefix);
    for (const is of quizIssues(clean)) if (!errs.includes(is.msg)) errs.push(is.msg);
    out.push({ row, q: errs.length ? null : clean.questions[0], errs });
  });
  return out;
}
