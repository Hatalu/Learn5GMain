'use client';

import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMembership } from '@/components/membership/MembershipProvider';
import type { Ent } from '@/lib/entitlements';

/**
 * ปิดหน้าเครื่องมือตามสิทธิ์ของแพ็กเกจ (Dev ตั้งในหน้า Dev > แพ็กเกจและสิทธิ์)
 * shortcut: กันฝั่งหน้าเว็บอย่างเดียว เพราะคลังเกมประกอบไฟล์ในเครื่อง ไม่มี API ให้กัน, ถ้ามี API ที่มีต้นทุนจริงค่อยตรวจที่เซิร์ฟเวอร์ด้วย
 */
export function FeatureGate({ flag, name, children }: { flag: 'ai_game'; name: string; children: React.ReactNode }) {
  const { ent } = useMembership();
  const { isDev, user } = useAuth();
  if (ent[flag as keyof Ent] || isDev) return <>{children}</>;
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border">
        <Lock className="h-5 w-5" />
      </span>
      <h1 className="ui-title mt-6 text-3xl">{name} ใช้ได้ในแพ็กเกจที่สูงขึ้น</h1>
      <p className="mt-3 ui-muted">อัปเกรดแพ็กเกจเพื่อเปิดใช้งานเครื่องมือนี้</p>
      <div className="mt-8 flex justify-center gap-2">
        <Link href="/pricing" className="ui-btn ui-btn-ink">
          ดูแพ็กเกจ
        </Link>
        {!user && (
          <Link href="/login" className="ui-btn ui-btn-line">
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </div>
  );
}
