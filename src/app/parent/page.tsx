'use client';

import React from 'react';
import Link from 'next/link';
import { Compass } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/navbar/Navbar';
import { StudentManager } from '@/components/kids/StudentManager';
import { PremiumPanel } from '@/components/account/PremiumPanel';
import { DangerZone } from '@/components/account/DangerZone';

export default function ParentPage() {
  const { profile, isLoading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        <header>
          <h1 className="text-3xl sm:text-4xl font-medium text-gray-900 dark:text-white">
            สวัสดี{isLoading ? '' : ` ${profile?.display_name || 'ผู้ปกครอง'}`}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">จัดการบัญชีของลูก ดูความก้าวหน้า และกำหนดเวลาเล่นได้ที่นี่</p>
        </header>

        <section className="surface p-5 shadow-toy flex flex-wrap items-center gap-4 justify-between">
          <div>
            <p className="font-display text-lg text-gray-900 dark:text-white">ให้ลูกเข้าเล่นอย่างไร</p>
            <ol className="text-sm text-gray-600 dark:text-gray-300 list-decimal ml-5 mt-1 space-y-0.5">
              <li>กด &quot;เพิ่มลูก&quot; แล้วพิมพ์ชื่อเล่น</li>
              <li>พิมพ์หรือจดบัตรรหัสนักเรียน + PIN ให้ลูก</li>
              <li>ลูกเข้าที่ปุ่ม &quot;นักเรียน&quot; แล้วใส่รหัสกับ PIN (ไม่ต้องมีอีเมล)</li>
            </ol>
          </div>
          <Link href="/home" className="btn-jelly inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200 font-semibold">
            <Compass className="w-5 h-5" /> ดูคลังเกมทั้งหมด
          </Link>
        </section>

        <StudentManager mode="parent" />
        <PremiumPanel defaultPlan="family" />
        <DangerZone />
      </main>
    </div>
  );
}
