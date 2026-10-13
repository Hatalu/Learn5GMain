'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, ShieldAlert } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export interface CardInfo {
  name: string;
  code: string;
  pin?: string;
  grade?: string | null;
}

function Card({ c, origin }: { c: CardInfo; origin: string }) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    // QR มีเฉพาะ "รหัสนักเรียน" ไม่ใส่ PIN เพื่อความปลอดภัย (เด็กต้องรู้ PIN เอง)
    QRCode.toDataURL(`${origin}/kid?code=${c.code}`, { margin: 1, width: 160, color: { dark: '#271358', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [c.code, origin]);

  return (
    <div className="card-print break-inside-avoid rounded-2xl border-2 border-dashed border-indigo-300 bg-white p-4 text-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">สื่อการสอน 5G</p>
          <p className="font-display text-lg leading-tight truncate">{c.name}</p>
          {c.grade && <p className="text-sm text-gray-500">{c.grade}</p>}
        </div>
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="" width={72} height={72} className="shrink-0" />
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-indigo-50 py-2">
          <dt className="text-xs text-indigo-700">รหัสนักเรียน</dt>
          <dd className="font-display text-xl tracking-[0.2em] text-indigo-900">{c.code}</dd>
        </div>
        <div className="rounded-xl bg-amber-50 py-2">
          <dt className="text-xs text-amber-700">PIN</dt>
          <dd className="font-display text-xl tracking-[0.3em] text-amber-900">{c.pin ?? '----'}</dd>
        </div>
      </dl>
      <p className="mt-2 text-center text-[11px] text-gray-500">เข้าที่ {origin.replace(/^https?:\/\//, '')}/kid</p>
    </div>
  );
}

/** แสดงบัตรเข้าสู่ระบบของนักเรียน พิมพ์ได้ (PIN แสดงครั้งเดียวตอนสร้าง/รีเซ็ต) */
export function CredentialCardsModal({
  open,
  onClose,
  cards,
  title = 'บัตรเข้าสู่ระบบของนักเรียน',
}: {
  open: boolean;
  onClose: () => void;
  cards: CardInfo[];
  title?: string;
}) {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const hasPins = cards.some((c) => c.pin);

  return (
    <>
      <Modal open={open} onClose={onClose} title={title} wide>
        {hasPins && (
          <p className="flex items-start gap-2 mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-sm text-amber-900 dark:text-amber-200">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <span>PIN จะแสดงให้เห็นเฉพาะตอนนี้เท่านั้น (ระบบเก็บแบบเข้ารหัส ดูย้อนหลังไม่ได้) กรุณาพิมพ์หรือจดไว้ก่อนปิดหน้านี้ หากลืมสามารถรีเซ็ต PIN ใหม่ได้</span>
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto p-1">
          {cards.map((c) => (
            <Card key={c.code} c={c} origin={origin} />
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3 justify-end">
          <button onClick={onClose} className="btn-jelly px-5 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">
            ปิด
          </button>
          <button onClick={() => window.print()} className="btn-primary-grad btn-jelly px-6 py-3 rounded-2xl font-display flex items-center gap-2">
            <Printer className="w-5 h-5" /> พิมพ์บัตร
          </button>
        </div>
      </Modal>

      {/* พื้นที่พิมพ์ (แสดงเฉพาะตอนสั่งพิมพ์) */}
      {open && (
        <div className="print-area hidden print:block">
          <div className="grid grid-cols-2 gap-4 p-6">
            {cards.map((c) => (
              <Card key={c.code} c={c} origin={origin} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
