'use client';

import React from 'react';
import { Navbar } from '@/components/navbar/Navbar';
import { WeeklyReport } from '@/components/pet/WeeklyReport';

export default function ReportPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <WeeklyReport />
      </main>
    </div>
  );
}
