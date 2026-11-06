'use client';

import React from 'react';
import { Navbar } from '@/components/navbar/Navbar';
import { DailyPuzzle } from '@/components/pet/DailyPuzzle';

export default function PuzzlePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <DailyPuzzle />
      </main>
    </div>
  );
}
