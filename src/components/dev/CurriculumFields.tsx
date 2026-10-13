'use client';

import React from 'react';

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

/** ช่องข้อมูลหลักสูตร (เป้าหมายการเรียนรู้ + ตัวชี้วัด) สำหรับครู */
export function CurriculumFields({
  goal,
  onGoal,
  standards,
  onStandards,
}: {
  goal: string;
  onGoal: (v: string) => void;
  standards: string;
  onStandards: (v: string) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
          เป้าหมายการเรียนรู้ (ให้ครูเห็น)
        </label>
        <input
          value={goal}
          onChange={(e) => onGoal(e.target.value)}
          maxLength={300}
          placeholder="เช่น อ่านเวลาจากนาฬิกาเข็มได้ถึงระดับนาที"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
          ตัวชี้วัด / มาตรฐาน (คั่นด้วยจุลภาค)
        </label>
        <input
          value={standards}
          onChange={(e) => onStandards(e.target.value)}
          placeholder="เช่น ค 2.1 ป.4/1, ค 2.1 ป.4/2"
          className={inputCls}
        />
      </div>
    </>
  );
}

export const parseStandards = (text: string): string[] =>
  Array.from(new Set(text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))).slice(0, 12);

/** ลองบันทึก ถ้าคอลัมน์ใดยังไม่มีในฐานข้อมูล (ยังไม่รัน migration) ให้ตัดฟิลด์นั้นออกแล้วลองใหม่ */
export async function saveWithColumnFallback<T extends Record<string, unknown>>(
  run: (payload: T) => PromiseLike<{ error: { message?: string; code?: string } | null }>,
  payload: T
): Promise<{ message?: string } | null> {
  const body: Record<string, unknown> = { ...payload };
  for (let i = 0; i < 5; i++) {
    const { error } = await run(body as T);
    if (!error) return null;
    const m = /'([a-z_]+)' column/i.exec(error.message || '');
    if (error.code === 'PGRST204' && m && m[1] in body) {
      delete body[m[1]];
      continue;
    }
    return error;
  }
  return { message: 'บันทึกไม่สำเร็จ' };
}
