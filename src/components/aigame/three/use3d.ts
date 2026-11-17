'use client';

import { useEffect, useRef, useState } from 'react';
import { createStage, type Stage3D } from './stage3d';

/**
 * สร้างฉาก 3D ครั้งเดียวต่อการ mount แล้วให้ build() สร้างของในฉาก (คืนตัวควบคุมฉาก)
 * ready = สร้างเสร็จแล้ว (effect อื่นที่สั่งฉากควรรอค่านี้) · failed = WebGL ใช้ไม่ได้ (ให้แสดงเกมตัวอย่างแบบ 2D แทน)
 */
export function use3D<S>(sky: string, build: (st: Stage3D) => S) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const scene = useRef<S | null>(null);
  const [ready, setReady] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!host.current || !labels.current) return;
    const st = createStage(host.current, labels.current, sky);
    if (!st) {
      setFailed(true);
      return;
    }
    scene.current = build(st);
    setReady((r) => r + 1);
    return () => {
      scene.current = null;
      st.dispose();
    };
    // สร้างครั้งเดียว: build อ่านค่าล่าสุดผ่าน ref เอง
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { host, labels, scene, ready, failed };
}
