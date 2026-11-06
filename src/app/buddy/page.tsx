'use client';

import React from 'react';
import { Navbar } from '@/components/navbar/Navbar';
import { PetRoom } from '@/components/pet/PetRoom';

/** ห้องเลี้ยงปุ๋ง ทุกคนเล่นได้ สมาชิกซิงก์ข้ามเครื่อง และได้สมุดสติกเกอร์ */
export default function BuddyPage() {
  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <Navbar />
      <main className="flex-1 min-h-0 flex">
        <PetRoom />
      </main>
    </div>
  );
}
