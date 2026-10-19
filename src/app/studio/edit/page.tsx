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
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
