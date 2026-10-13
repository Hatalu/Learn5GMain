'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/** ม่านดาวปัดผ่านหน้าจอตอนเปลี่ยนหน้า (ไม่ขึ้นตอนเข้าเว็บครั้งแรก/ตอนผู้ใช้ปิดแอนิเมชัน) */
export function RouteCurtain() {
  const path = usePathname();
  const first = useRef(true);
  const [key, setKey] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (path.startsWith('/dev')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setKey((k) => k + 1);
    setActive(true);
    const t = setTimeout(() => setActive(false), 800);
    return () => clearTimeout(t);
  }, [path]);

  if (!active) return null;
  return (
    <div key={key} className="curtain" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="w-24 h-24 text-white animate-spin [animation-duration:1.2s]">
        <path d="M12 0c.9 6.2 2.8 8.9 12 12-9.2 3.1-11.1 5.8-12 12-.9-6.2-2.8-8.9-12-12C9.2 8.9 11.1 6.2 12 0z" fill="currentColor" />
      </svg>
    </div>
  );
}
