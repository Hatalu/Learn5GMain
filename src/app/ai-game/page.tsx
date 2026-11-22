'use client';

import React, { Suspense } from 'react';
import { Navbar } from '@/components/navbar/Navbar';
import { GameLibrary } from '@/components/aigame/GameLibrary';
import { FeatureGate } from '@/components/site/FeatureGate';

/** คลังเกม 3D: เลือกเกม > ใส่เนื้อหา > ลองเล่น > บันทึกไฟล์เกมไปใช้ในห้องเรียน (ไม่ต้องล็อกอิน ยกเว้นใช้ชุดคำถามของตัวเอง) */
export default function GameLibraryPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative">
        <Suspense fallback={null}>
          <FeatureGate flag="ai_game" name="คลังเกม">
            <GameLibrary />
          </FeatureGate>
        </Suspense>
      </main>
    </div>
  );
}
