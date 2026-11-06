'use client';

import { useEffect, useRef, useState } from 'react';

/** true เมื่อ element พ้นจอ ใช้หยุดแอนิเมชัน/ตัวจับเวลาไม่ให้กินเครื่อง */
export function useOffscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [off, setOff] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => setOff(!en.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, off] as const;
}
