'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/** น้องไฟว์จี มุมขวาล่าง เปิด/ปิดได้จากหน้า Dev > ตั้งค่าเว็บ (ถ้ายังไม่มีตารางตั้งค่า ถือว่าเปิด) */
export function FiveGMascot() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    let off = false;
    createClient()
      .from('site_settings')
      .select('value')
      .eq('key', 'mascot_enabled')
      .maybeSingle()
      .then(({ data }) => {
        if (!off && data && data.value === false) setOn(false);
      });
    return () => {
      off = true;
    };
  }, []);

  if (!on) return null;
  return (
    <div className="fixed bottom-0 right-0 z-40 pointer-events-none select-none w-[280px] sm:w-[420px]" aria-hidden="true">
      <video src="/mascot/welcome.webm" autoPlay loop muted playsInline preload="auto" className="block w-full h-auto" />
    </div>
  );
}
