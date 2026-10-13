'use client';

import React from 'react';

/** เนื้อหาของแต่ละหน้าค่อยๆ ลอยเข้ามาทุกครั้งที่เปลี่ยนหน้า */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
