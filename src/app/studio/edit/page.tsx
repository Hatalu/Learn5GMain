'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { StudioEditor } from '@/components/studio/Editor';
import '@/components/creator/creator.css';

function Inner() {
  const id = useSearchParams().get('id') || '';
  return <StudioEditor key={id} id={id} />;
}

export default function StudioEditPage() {
  return (
    <div className="st-screen">
      {/* ตัวแก้ไขเต็มจอ ไม่มีแถบนำทางของเว็บ (ปุ่มออกอยู่ซ้ายบนของตัวแก้ไข) */}
      <Suspense fallback={null}>
        <Inner />
      </Suspense>
    </div>
  );
}
