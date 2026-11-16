'use client';

import React from 'react';
import Link from 'next/link';
import { useMembership } from '@/components/membership/MembershipProvider';
import { TIERS, TIER_LABEL, capText } from '@/lib/entitlements';

/** ตารางเทียบสิทธิ์สั้นๆ ของทุกแพ็กเกจ (ค่าจริงจากตาราง plan_entitlements) */
export function TierCompare({ className = '' }: { className?: string }) {
  const { ents } = useMembership();
  const rows = [
    { label: 'ชุดคำถาม', get: (t: (typeof TIERS)[number]) => capText(ents[t].sets, 'ชุด') },
    { label: 'สื่อการสอน', get: (t: (typeof TIERS)[number]) => capText(ents[t].designs, 'ชิ้น') },
    { label: 'พื้นที่ไฟล์', get: (t: (typeof TIERS)[number]) => `${ents[t].upload_mb} MB` },
    { label: 'Discover', get: (t: (typeof TIERS)[number]) => (ents[t].discover ? 'ได้' : '-') },
  ];
  return (
    <div className={`overflow-x-auto rounded-2xl border text-sm ${className}`}>
      <table className="w-full min-w-[460px]">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left font-normal" />
            {TIERS.map((t) => (
              <th key={t} className="p-3 text-left font-medium">
                {TIER_LABEL[t]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b last:border-0">
              <td className="p-3 ui-muted">{r.label}</td>
              {TIERS.map((t) => (
                <td key={t} className="p-3">
                  {r.get(t)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Link href="/pricing" className="block border-t p-3 text-center text-xs underline-offset-4 hover:underline">
        ดูรายละเอียดแพ็กเกจ
      </Link>
    </div>
  );
}
