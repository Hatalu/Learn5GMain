'use client';

import React, { Suspense } from 'react';
import { Navbar } from '@/components/navbar/Navbar';
import { NightSky } from '@/components/fx/NightSky';
import { WorksheetBuilder } from '@/components/worksheet/WorksheetBuilder';
import '@/components/creator/creator.css';
import '@/components/creator/creator-pages.css';

/** ตู้แต่งตัวใบงาน AI: ครูเลือกตัวเลือก > ได้ prompt > Gemini วาด > ใส่ข้อความใน Studio / ส่งประกวด */
export default function WorksheetPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="l5g-world l5g-world-edit flex-1 relative">
        <NightSky />
        <Suspense fallback={null}>
          <WorksheetBuilder />
        </Suspense>
      </main>
    </div>
  );
}
