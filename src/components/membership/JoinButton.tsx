'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { PlanId } from '@/lib/plans';
import { useMembership } from './MembershipProvider';

/** ปุ่มสมัครแพ็กเกจ: ระบุ plan = เปิดหน้าต่างจ่ายเงินเลย, ไม่ระบุ = ไปหน้าเลือกแพ็กเกจ */
export function JoinButton({
  plan,
  onClick,
  children,
  ...rest
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & { plan?: PlanId }) {
  const { openCheckout } = useMembership();
  const router = useRouter();
  return (
    <button
      type="button"
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (plan) openCheckout(plan);
        else router.push('/pricing');
      }}
    >
      {children}
    </button>
  );
}
