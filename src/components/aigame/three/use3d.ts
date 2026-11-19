'use client';

import { useEffect, useRef, useState } from 'react';
import { useDemo } from '../demoCtx';
import { createStage, type Stage3D } from './stage3d';

/**
 * สร้างฉาก 3D ครั้งเดียวต่อการ mount แล้วให้ build() สร้างของในฉาก (คืนตัวควบคุมฉาก)
 * ready = สร้างเสร็จแล้ว (effect อื่นที่สั่งฉากควรรอค่านี้) · failed = WebGL ใช้ไม่ได้ (ให้แสดงเกมตัวอย่างแบบ 2D แทน)
 * สไตล์ภาพพิกเซล = วาดความละเอียดต่ำ (GameDemo สร้างใหม่เมื่อเปลี่ยนสไตล์) · ความเร็วส่งเข้า st.pace ทุกครั้งที่เปลี่ยน
 */
export function use3D<S>(sky: string, build: (st: Stage3D) => S) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const scene = useRef<S | null>(null);
  const stage = useRef<Stage3D | null>(null);
  const [ready, setReady] = useState(0);
  const [failed, setFailed] = useState(false);
  const { o, pace } = useDemo();
  useEffect(() => {
    if (!host.current || !labels.current) return;
    const st = createStage(host.current, labels.current, sky, o.art === 'pixel');
    if (!st) {
      setFailed(true);
      return;
    }
    st.pace = pace;
    stage.current = st;
    scene.current = build(st);
    setReady((r) => r + 1);
    return () => {
      scene.current = null;
      stage.current = null;
      st.dispose();
    };
    // สร้างครั้งเดียว: build อ่านค่าล่าสุดผ่าน ref เอง
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (stage.current) stage.current.pace = pace;
  }, [pace]);
  return { host, labels, scene, ready, failed };
}
