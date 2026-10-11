import React from 'react';
import { Gamepad2, GraduationCap, MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';

const FEATURES = [
  {
    icon: Gamepad2,
    title: 'เรียนผ่านการเล่น',
    desc: 'เนื้อหาซ่อนอยู่ในภารกิจเกม',
    color: 'from-indigo-500 to-violet-500',
  },
  {
    icon: GraduationCap,
    title: 'ครอบคลุม ป.1 - ป.6',
    desc: 'แยกตามวิชาและระดับชั้น',
    color: 'from-mint-400 to-emerald-600',
  },
  {
    icon: MonitorSmartphone,
    title: 'เล่นได้ทุกจอ',
    desc: 'มือถือ แท็บเล็ต คอมพิวเตอร์',
    color: 'from-sky-400 to-blue-600',
  },
  {
    icon: ShieldCheck,
    title: 'ปลอดภัยสำหรับเด็ก',
    desc: 'ไม่มีโฆษณา ไม่มีแชท',
    color: 'from-sun-400 to-orange-500',
  },
];

export function FeatureStrip() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      {FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
        <Reveal key={title} delay={i * 90}>
          <div className="group h-full flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4 p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 shadow-toy hover:-translate-y-1 transition-transform duration-300">
            <span
              className={`shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md group-hover:rotate-[-8deg] group-hover:scale-110 transition-transform duration-300`}
            >
              <Icon className="w-6 h-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm sm:text-base text-gray-900 dark:text-white leading-snug">{title}</p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-snug">{desc}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
