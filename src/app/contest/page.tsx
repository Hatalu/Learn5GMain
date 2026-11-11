'use client';

import React, { Suspense } from 'react';
import { Navbar } from '@/components/navbar/Navbar';
import { NightSky } from '@/components/fx/NightSky';
import { ContestGallery } from '@/components/worksheet/ContestGallery';
import '@/components/creator/creator.css';
import '@/components/creator/creator-pages.css';

/** กิจกรรมประกวดออกแบบใบงาน: แกลเลอรี กดใจ อันดับ ประกาศผล */
export default function ContestPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="l5g-world l5g-world-edit flex-1 relative">
        <NightSky />
        <Suspense fallback={null}>
          <ContestGallery />
        </Suspense>
      </main>
    </div>
  );
}
