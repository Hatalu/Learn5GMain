'use client';

import React, { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

/** รายการแป้นลัดของตัวแก้ไขสื่อ (ต้องตรงกับตัวจัดการแป้นใน Editor.tsx) */
const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: 'เพิ่มชิ้นงาน',
    keys: [
      ['T', 'ข้อความ'],
      ['R', 'สี่เหลี่ยม'],
      ['C', 'วงกลม'],
      ['L', 'เส้น'],
      ['E', 'สมการ (แบบ MathType)'],
      ['G', 'กราฟ / รูปคณิต'],
      ['Ctrl + V', 'วางรูป ข้อความ หรือชิ้นที่คัดลอก'],
    ],
  },
  {
    title: 'แก้ไข',
    keys: [
      ['Ctrl + Z', 'ย้อนกลับ'],
      ['Ctrl + Y', 'ทำซ้ำ'],
      ['Ctrl + C / X', 'คัดลอก / ตัด'],
      ['Ctrl + D', 'ทำสำเนา'],
      ['Delete', 'ลบ'],
      ['Ctrl + Alt + C', 'คัดลอกสไตล์'],
      ['Ctrl + Alt + V', 'วางสไตล์'],
      ['Alt + Shift + L', 'ล็อก / ปลดล็อก'],
    ],
  },
  {
    title: 'เลือกและจัดวาง',
    keys: [
      ['Shift + คลิก', 'เลือกหลายชิ้น / เอาออก'],
      ['ลากบนพื้นที่ว่าง', 'ลากคลุมเลือกหลายชิ้น'],
      ['Ctrl + A / Alt + A', 'เลือกทุกชิ้นในหน้า'],
      ['Ctrl + G', 'จัดกลุ่ม'],
      ['Ctrl + Shift + G', 'แยกกลุ่ม'],
      ['Alt + ลาก', 'ทำสำเนาแล้วลากออกไป'],
      ['Ctrl ค้างขณะลาก', 'ปิดการดูดเข้าแนว'],
      ['Tab', 'เลือกชิ้นถัดไป'],
      ['Esc', 'เลิกเลือก'],
      ['ลูกศร', 'ขยับ 1 จุด (Shift = 10 จุด)'],
      ['Ctrl + ]  /  [', 'ขึ้นหน้า / ลงหลัง 1 ชั้น'],
      ['Ctrl + Alt + ]  /  [', 'ไว้หน้าสุด / หลังสุด'],
    ],
  },
  {
    title: 'ข้อความ',
    keys: [
      ['Enter', 'เริ่มพิมพ์ในกล่องที่เลือก'],
      ['Ctrl + B / I / U', 'ตัวหนา / เอียง / ขีดเส้นใต้'],
      ['Ctrl + Shift + L / E / R', 'ชิดซ้าย / กลาง / ขวา'],
      ['Ctrl + Shift + <  >', 'ตัวอักษรเล็กลง / ใหญ่ขึ้น'],
    ],
  },
  {
    title: 'หน้าและมุมมอง',
    keys: [
      ['Ctrl + Enter', 'เพิ่มหน้าใหม่'],
      ['Page Up / Down', 'ไปหน้าก่อน / ถัดไป'],
      ['Ctrl + +  /  -', 'ซูมเข้า / ออก'],
      ['Ctrl + ลูกกลิ้งเมาส์', 'ซูมตรงจุดเมาส์'],
      ['Ctrl + 0', 'พอดีจอ'],
      ['Ctrl + S', 'บันทึกทันที'],
      ['Ctrl + Alt + P', 'นำเสนอเต็มจอ'],
      ['?', 'เปิดหน้านี้'],
    ],
  },
  {
    title: 'โหมดเอกสาร (Word)',
    keys: [
      ['Ctrl + B / I / U', 'ตัวหนา / เอียง / ขีดเส้นใต้'],
      ['Ctrl + L / E / R / J', 'ชิดซ้าย / กึ่งกลาง / ชิดขวา / เต็มบรรทัด'],
      ['Ctrl + Shift + <  >', 'ตัวอักษรเล็กลง / ใหญ่ขึ้น'],
      ['Ctrl + [  /  ]', 'ตัวอักษร -1 / +1'],
      ['Ctrl + =  /  Ctrl + Shift + =', 'ตัวห้อย / ตัวยก'],
      ['Ctrl + Space', 'ล้างรูปแบบตัวอักษร'],
      ['Ctrl + 1 / 2 / 5', 'ระยะบรรทัด 1 / 2 / 1.5'],
      ['Ctrl + M  /  Ctrl + Shift + M', 'เพิ่ม / ลดการเยื้อง'],
      ['Ctrl + Shift + L', 'สัญลักษณ์แสดงหัวข้อ'],
      ['Ctrl + Alt + 1 / 2 / 3', 'หัวเรื่อง 1 / 2 / 3'],
      ['Tab', 'ช่องถัดไปในตาราง / เยื้องรายการ'],
      ['Ctrl + Enter', 'ขึ้นหน้าใหม่'],
      ['Alt + =  /  Alt + Q', 'สมการในบรรทัด / แยกบรรทัด (MathType)'],
      ['Ctrl + F  /  Ctrl + H', 'ค้นหา / แทนที่'],
      ['แตะกราฟในโหมด Canva', 'ยกกราฟจากเอกสารออกมาลาก/แก้ได้'],
      ['ดับเบิลคลิกสมการ/กราฟ', 'แก้ไข'],
      ['ลากรูป/กราฟ / ลากมุม', 'ย้าย / ย่อขยาย'],
      ['ลูกศร', 'ขยับรูปที่วางหน้า/หลังข้อความ'],
      ['Ctrl + Z / Y', 'ย้อนกลับ / ทำซ้ำ'],
      ['Ctrl + ลูกกลิ้งเมาส์', 'ย่อ / ขยายหน้ากระดาษ'],
    ],
  },
];

export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="st-keys-bg" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="st-keys" role="dialog" aria-modal="true" aria-label="แป้นพิมพ์ลัด">
        <header>
          <span className="st-keys-ic">
            <Keyboard className="w-5 h-5" />
          </span>
          <div className="flex-1">
            <h2>แป้นพิมพ์ลัด</h2>
            <p>ทำงานไวขึ้นแบบโปรแกรมออกแบบ บน Mac ใช้ Cmd แทน Ctrl</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="st-keys-x">
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="st-keys-grid">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3>{g.title}</h3>
              {g.keys.map(([k, d]) => (
                <p key={k}>
                  <kbd>{k}</kbd>
                  <span>{d}</span>
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
