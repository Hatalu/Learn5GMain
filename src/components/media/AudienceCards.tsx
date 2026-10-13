import React from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, GraduationCap, HeartHandshake } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';

const CARDS = [
  {
    href: '/kid',
    icon: Compass,
    title: 'นักเรียน',
    desc: 'ใส่รหัสนักเรียนกับ PIN แล้วผจญภัย สะสมดาว เลี้ยงคู่หู ทำภารกิจประจำวัน',
    cta: 'เข้าห้องผจญภัย',
    grad: 'from-sun-400 to-orange-500',
  },
  {
    href: '/register',
    icon: HeartHandshake,
    title: 'ผู้ปกครอง',
    desc: 'สร้างบัญชีให้ลูก ดูรายงานรายสัปดาห์ ตั้งเวลาเล่น ปลอดภัย ไม่มีโฆษณาและแชท',
    cta: 'สมัครสำหรับผู้ปกครอง',
    grad: 'from-pink-400 to-rose-500',
  },
  {
    href: '/register',
    icon: GraduationCap,
    title: 'คุณครู',
    desc: 'สร้างห้อง มอบหมายเกม ดูผลรายคน พิมพ์บัตรนักเรียนและแผนการสอนได้ในคลิกเดียว',
    cta: 'สมัครสำหรับคุณครู',
    grad: 'from-indigo-500 to-violet-500',
  },
];

/** ทางเข้า 3 กลุ่มผู้ใช้ (แสดงเฉพาะผู้ที่ยังไม่ได้ล็อกอิน) */
export function AudienceCards() {
  return (
    <section aria-labelledby="audience-h" className="mt-10">
      <h2 id="audience-h" className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-white mb-1">คุณคือใคร?</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4">เลือกทางเข้าที่ใช่ แล้วเริ่มได้เลย</p>
      <div className="grid md:grid-cols-3 gap-4">
        {CARDS.map(({ href, icon: Icon, title, desc, cta, grad }, i) => (
          <Reveal key={title} delay={i * 100}>
            <Link href={href} className="group surface h-full p-5 shadow-toy flex flex-col hover:-translate-y-1.5 hover:shadow-toy-lg transition-all duration-300">
              <span className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} text-white flex items-center justify-center shadow-md group-hover:rotate-[-8deg] group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-7 h-7" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-xl font-medium text-gray-900 dark:text-white">{title}</h3>
              <p className="mt-1 text-gray-600 dark:text-gray-300 flex-1">{desc}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 font-display text-indigo-600 dark:text-indigo-300">
                {cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
