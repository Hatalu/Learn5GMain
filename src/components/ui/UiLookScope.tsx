'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isToolRoute } from '@/lib/ui-look';

/** บอก CSS ว่าหน้านี้เป็นเครื่องมือ/เกมเต็มจอ (ธีมมินิมอลไม่แตะ) เปลี่ยนตามการเปลี่ยนหน้าในแอป */
export function UiLookScope() {
  const path = usePathname() || '';
  useEffect(() => {
    document.documentElement.toggleAttribute('data-tool', isToolRoute(path));
  }, [path]);
  return null;
}
