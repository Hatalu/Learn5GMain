'use client';

import React, { useRef, useState } from 'react';
import { FileImage, FileText, FileType2, FileUp, Sigma } from 'lucide-react';
import { PaperModal } from '@/components/creator/PaperModal';
import { IMPORT_ACCEPT, importKind } from './importFile';
import './import.css';

export type ImportHow = 'flow' | 'pages';

/** หน้าต่างนำเข้าไฟล์: เลือก/ลากไฟล์ แล้วถ้าเป็น PDF ให้เลือกว่าจะแก้ไขได้หรือเหมือนต้นฉบับ */
export function ImportDialog({ onPick, onClose, file: initial }: { onPick: (file: File, how: ImportHow) => void; onClose: () => void; file?: File | null }) {
  const [file, setFile] = useState<File | null>(initial ?? null);
  const [over, setOver] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const take = (f: File | undefined) => {
    if (!f) return;
    const k = importKind(f);
    if (k === 'doc') return setErr('ไฟล์ .doc รุ่นเก่าเปิดไม่ได้ ให้เปิดใน Word แล้วบันทึกเป็น .docx ก่อน');
    if (!k) return setErr('ไฟล์ชนิดนี้ยังไม่รองรับ');
    setErr('');
    if (k === 'pdf') return setFile(f);
    onPick(f, 'flow');
  };
  return (
    <PaperModal title="นำเข้าไฟล์" icon={<FileUp className="w-5 h-5" />} iconBg="#22b8cf" onClose={onClose} width={560}>
      {file && importKind(file) === 'pdf' ? (
        <div className="im-body">
          <p className="im-file">
            <FileType2 className="w-5 h-5" /> {file.name}
          </p>
          <p className="im-ask">นำเข้า PDF แบบไหน</p>
          <div className="im-choices">
            <button type="button" className="im-choice" onClick={() => onPick(file, 'flow')}>
              <span className="im-ic" style={{ background: '#9b6cf0' }}>
                <FileText className="w-6 h-6" />
              </span>
              <b>แก้ไขได้ (โหมด Word)</b>
              <small>ดึงข้อความและเดาสมการเป็น MathType แก้ได้ทุกคำ รูปในไฟล์ไม่ติดมา</small>
            </button>
            <button type="button" className="im-choice" onClick={() => onPick(file, 'pages')}>
              <span className="im-ic" style={{ background: '#f59f00' }}>
                <FileImage className="w-6 h-6" />
              </span>
              <b>เหมือนต้นฉบับ (โหมด Canva)</b>
              <small>ทุกหน้าเป็นภาพ หน้าตาเหมือนเดิม 100% วางข้อความ/สติกเกอร์ทับได้</small>
            </button>
          </div>
          <button type="button" className="im-link" onClick={() => setFile(null)}>
            เลือกไฟล์อื่น
          </button>
        </div>
      ) : (
        <div className="im-body">
          <div
            className="im-drop"
            data-over={over}
            role="button"
            tabIndex={0}
            onClick={() => input.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              take(e.dataTransfer.files[0]);
            }}
          >
            <FileUp className="w-10 h-10" />
            <b>ลากไฟล์มาวาง หรือแตะเพื่อเลือกไฟล์</b>
            <small>Word (.docx) · PDF · ข้อความ (.txt) · Markdown (.md) · หน้าเว็บ (.html)</small>
          </div>
          <input ref={input} type="file" accept={IMPORT_ACCEPT} hidden onChange={(e) => (take(e.target.files?.[0]), (e.target.value = ''))} />
          {err && <p className="im-err">{err}</p>}
          <ul className="im-notes">
            <li>
              <Sigma className="w-4 h-4" /> สมการใน Word (ทั้งสมการของ Word และ MathType) กลายเป็นสมการ MathType ของเว็บ แก้ต่อได้ทันที
            </li>
            <li>
              <FileText className="w-4 h-4" /> คงตัวหนา ขนาด สี จัดกึ่งกลาง ตาราง รูป หัว/ท้ายกระดาษ และระยะขอบ
            </li>
            <li>
              <FileType2 className="w-4 h-4" /> สูตรแบบ $x^2$ ในไฟล์ข้อความ/Markdown ก็เป็นสมการให้เอง
            </li>
          </ul>
        </div>
      )}
    </PaperModal>
  );
}
