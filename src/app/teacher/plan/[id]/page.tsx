'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Printer } from 'lucide-react';
import { Navbar } from '@/components/navbar/Navbar';
import { createClient } from '@/lib/supabase/client';
import { MediaItem } from '@/types/database';

/** แผนการสอนฉบับพิมพ์ ที่สร้างจากข้อมูลของสื่อ (ครูเติมช่องว่างด้วยมือต่อได้) */
export default function LessonPlanPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const [media, setMedia] = useState<MediaItem | null | undefined>(undefined);

  useEffect(() => {
    supabase
      .from('media')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setMedia((data as MediaItem) || null));
  }, [id, supabase]);

  if (media === undefined) {
    return <div className="min-h-screen"><Navbar /><div className="py-24 flex justify-center text-indigo-500"><Loader2 className="w-8 h-8 animate-spin" /></div></div>;
  }
  if (!media) {
    return <div className="min-h-screen"><Navbar /><p className="p-10 text-center text-gray-600">ไม่พบสื่อนี้</p></div>;
  }

  const lines = (n: number) => Array.from({ length: n }).map((_, i) => <div key={i} className="border-b border-gray-400 h-8" />);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="no-print flex justify-end mb-4">
          <button onClick={() => window.print()} className="btn-primary-grad btn-jelly inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-display"><Printer className="w-5 h-5" /> พิมพ์แผนการสอน</button>
        </div>

        <article className="print-area bg-white text-gray-900 rounded-3xl border-2 border-gray-200 p-6 sm:p-10 space-y-5 leading-relaxed">
          <header className="border-b-2 border-gray-900 pb-3">
            <p className="text-sm text-gray-500">แผนการจัดกิจกรรมการเรียนรู้ · สื่อการสอน 5G</p>
            <h1 className="text-2xl font-medium">{media.title}</h1>
            <p className="text-sm mt-1">
              วิชา{media.subject} · ชั้น {media.grade_level?.join(', ')} · ประเภท {media.media_type} · เวลา 20 นาที
            </p>
          </header>

          <section>
            <h2 className="text-lg font-medium">1. จุดประสงค์การเรียนรู้</h2>
            <p>{media.learning_goal || media.description || '................................................................'}</p>
          </section>

          <section>
            <h2 className="text-lg font-medium">2. มาตรฐาน / ตัวชี้วัด</h2>
            {media.standards && media.standards.length ? (
              <ul className="list-disc ml-6">{media.standards.map((s) => <li key={s}>{s}</li>)}</ul>
            ) : (
              <div className="space-y-0">{lines(2)}</div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-medium">3. สื่อและอุปกรณ์</h2>
            <ul className="list-disc ml-6">
              <li>เกม &quot;{media.title}&quot; จาก สื่อการสอน 5G (เปิดบนจอโปรเจกเตอร์ หรือให้นักเรียนเล่นรายบุคคล)</li>
              <li>กระดานสำหรับจดสรุป</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium">4. ขั้นตอนกิจกรรม</h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-2 text-left w-28">ขั้น</th>
                  <th className="border border-gray-400 p-2 text-left">กิจกรรม</th>
                  <th className="border border-gray-400 p-2 w-20">เวลา</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-gray-400 p-2">นำเข้าสู่บทเรียน</td><td className="border border-gray-400 p-2">ถามนักเรียนว่าเกมนี้น่าจะฝึกเรื่องอะไร ให้ทายและเหตุผล</td><td className="border border-gray-400 p-2 text-center">3 นาที</td></tr>
                <tr><td className="border border-gray-400 p-2">กิจกรรมหลัก</td><td className="border border-gray-400 p-2">เล่นเกมร่วมกัน ให้นักเรียนผลัดกันออกมาตอบ ส่วนที่เหลือช่วยคิดและยกมือเห็นด้วย/ไม่เห็นด้วย</td><td className="border border-gray-400 p-2 text-center">12 นาที</td></tr>
                <tr><td className="border border-gray-400 p-2">สรุปและประเมิน</td><td className="border border-gray-400 p-2">ถามข้อที่ยากและสาเหตุ จดสรุปบนกระดาน ดูผลรายบุคคลในรายงานห้อง</td><td className="border border-gray-400 p-2 text-center">5 นาที</td></tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-lg font-medium">5. บันทึกหลังสอน</h2>
            <div>{lines(4)}</div>
          </section>
        </article>
      </main>
    </div>
  );
}
