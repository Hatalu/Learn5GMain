'use client';

import React, { Suspense } from 'react';
import { Navbar } from '@/components/navbar/Navbar';
import { AiGameBuilder } from '@/components/aigame/AiGameBuilder';
import { FeatureGate } from '@/components/site/FeatureGate';
import '@/components/creator/creator.css';
import '@/components/creator/creator-pages.css';
import '@/components/worksheet/worksheet.css';

/** สร้างเกมด้วย AI: เลือกเกม > ปรับเนื้อหา > คัดลอก prompt ไป Gemini Canvas (ไม่ต้องล็อกอิน ยกเว้นใช้ชุดคำถามของตัวเอง) */
export default function AiGamePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="l5g-world l5g-world-edit flex-1 relative">
        <Suspense fallback={null}>
          <FeatureGate flag="ai_game" name="เกม AI">
            <AiGameBuilder />
          </FeatureGate>
        </Suspense>
      </main>
    </div>
  );
}
