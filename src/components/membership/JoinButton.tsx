'use client';

import React from 'react';
import type { PlanId } from '@/lib/plans';
import { useMembership } from './MembershipProvider';

/** ปุ่มสมัคร/ต่ออายุสมาชิก: เปิดหน้าต่างจ่ายเงินทับหน้าปัจจุบัน ไม่ต้องไปหน้า /membership */
export function JoinButton({
  plan,
  onClick,
  children,
  ...rest
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & { plan?: PlanId }) {
  const { openCheckout } = useMembership();
  return (
    <button
      type="button"
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        openCheckout(plan);
      }}
    >
      {children}
    </button>
  );
}
