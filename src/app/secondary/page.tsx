'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BarChart3, BookOpen, FileText, FlaskConical, Gamepad2, Languages, Loader2, Sigma, Timer, Upload } from 'lucide-react';
import { Navbar } from '@/components/navbar/Navbar';
import { NightSky } from '@/components/fx/NightSky';
import { MathInline } from '@/components/creator/math/MathText';
import { SET_SUBJECTS, type SetSubject } from '@/lib/game-creator/setTemplates';
import { texToPlain } from '@/lib/game-creator/quiz';
import '@/components/creator/creator.css';
import s from './secondary.module.css';

type Bank = typeof import('@/lib/game-creator/setBank');
const GRADES = [7, 8, 9, 10, 11, 12];
const ICON: Record<SetSubject, React.ReactNode> = {
  math: <Sigma className="w-5 h-5" />,
  sci: <FlaskConical className="w-5 h-5" />,
  eng: <Languages className="w-5 h-5" />,
};
const sample = (q: string) => (q.startsWith('$') ? texToPlain(q.slice(1).split('$')[0]) : q);

/** กราฟตัวอย่าง y = x² - 2x - 3 และ y = x + 1 (วาดเอง ไม่ใช่รูป) */
function GraphArt() {
  const X = (x: number) => 120 + x * 26;
  const Y = (y: number) => 110 - y * 13;
  const para = Array.from({ length: 41 }, (_, i) => {
    const x = -2.2 + i * 0.165;
    return `${X(x).toFixed(1)},${Y(x * x - 2 * x - 3).toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 240 220" className={s.graph} role="img" aria-label="กราฟพาราโบลาตัดกับเส้นตรง">
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`v${i}`} x1={X(i - 4)} y1="4" x2={X(i - 4)} y2="216" stroke="#e4ddfa" strokeWidth="1.5" />
      ))}
      {Array.from({ length: 16 }, (_, i) => (
        <line key={`h${i}`} x1="4" y1={Y(i - 8)} x2="236" y2={Y(i - 8)} stroke="#e4ddfa" strokeWidth="1.5" />
      ))}
      <line x1="4" y1={Y(0)} x2="236" y2={Y(0)} stroke="#2a2350" strokeWidth="2.5" />
      <line x1={X(0)} y1="4" x2={X(0)} y2="216" stroke="#2a2350" strokeWidth="2.5" />
      <polyline points={para} fill="none" stroke="#9b6cf0" strokeWidth="4" strokeLinecap="round" />
      <line x1={X(-3)} y1={Y(-2)} x2={X(4.2)} y2={Y(5.2)} stroke="#ff9a3d" strokeWidth="4" strokeLinecap="round" />
      <circle cx={X(-1)} cy={Y(0)} r="6" fill="#ff6b7a" stroke="#2a2350" strokeWidth="2.5" />
      <circle cx={X(4)} cy={Y(5)} r="6" fill="#ff6b7a" stroke="#2a2350" strokeWidth="2.5" />
    </svg>
  );
}

const FEATURES = [
  { icon: <Sigma className="w-6 h-6" />, color: '#9b6cf0', title: 'สูตรคณิตแบบ MathType', text: 'พิมพ์เศษส่วน ราก ลิมิต ปริพันธ์ เมทริกซ์ ได้ทั้งในชุดคำถามและเอกสาร ตั้งแป้นลัดเองได้', href: '/studio' },
  { icon: <BarChart3 className="w-6 h-6" />, color: '#4a7bf0', title: 'สร้างกราฟฟังก์ชัน', text: 'พิมพ์สมการแล้ววาดกราฟให้ทันที หาจุดตัด คัดลอกเป็นรูปหรือวางในใบงาน', href: '/studio' },
  { icon: <Upload className="w-6 h-6" />, color: '#3fd6a8', title: 'นำเข้า Word ที่มีสมการ', text: 'เปิดไฟล์ .docx ที่ใช้ MathType หรือสมการ Word แล้วแก้ต่อบนเว็บ คัดลอกกลับไป Word ได้', href: '/studio' },
  { icon: <Gamepad2 className="w-6 h-6" />, color: '#ff9a3d', title: 'เกมทั้งห้อง 13 รูปแบบ', text: 'ชุดคำถามเดียว เล่นเป็นควิซ แข่งรถ ตกปลา Tower Defense หรือเกม AR ขยับตัวตอบ', href: '/create' },
  { icon: <FileText className="w-6 h-6" />, color: '#ff6b7a', title: 'รายงานผลหลังเล่น', text: 'ข้อไหนผิดเยอะ ใครควรช่วยเพิ่ม ดาวน์โหลดเป็น PDF หรือ Excel เก็บเป็นหลักฐานการวัดผล', href: '/create' },
];

export default function SecondaryPage() {
  const router = useRouter();
  const [bank, setBank] = useState<Bank | null>(null);
  const [grade, setGrade] = useState(7);
  const [sub, setSub] = useState<SetSubject>('math');

  useEffect(() => {
    import('@/lib/game-creator/setBank').then(setBank, () => setBank(null));
  }, []);
  const hi = useMemo(() => (bank ? bank.allSets().filter((t) => t.g >= 7) : []), [bank]);
  // หัวข้อเดียวมีหลายระดับ: โชว์การ์ดละหัวข้อ ใช้ระดับกลางเป็นตัวแทน
  const topics = useMemo(() => {
    const seen = new Map<string, (typeof hi)[number]>();
    for (const t of hi) {
      if (t.g !== grade || t.subject !== sub) continue;
      const cur = seen.get(t.title);
      if (!cur || t.level === 2) seen.set(t.title, t);
    }
    return [...seen.values()];
  }, [hi, grade, sub]);
  const count = (x: SetSubject) => hi.filter((t) => t.subject === x).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className={`${s.world} flex-1`}>
        <NightSky />
        <section className={s.hero}>
          <div className={s.heroText}>
            <span className={s.badge}>สำหรับครูมัธยม ม.1 - ม.6</span>
            <h1>สอนคณิต วิทย์ อังกฤษ ม.ต้น ม.ปลาย ให้ห้องเรียนตื่นตัว</h1>
            <p>แม่แบบชุดคำถามตามหลักสูตร สูตรแบบ MathType กราฟฟังก์ชัน และรายงานผลรายข้อ ในที่เดียว</p>
            <div className={s.cta}>
              <a href="#topics" className="l5g-btn l5g-btn-go l5g-btn-xl">
                <Timer className="w-6 h-6" /> สร้างเกมแรกใน 1 นาที
              </a>
              <Link href="/studio" className="l5g-btn l5g-btn-violet">
                <Sigma className="w-5 h-5" /> เปิดสูตรและกราฟใน Studio
              </Link>
            </div>
            <p className={s.free}>ลองสร้างและทดลองเล่นได้โดยไม่ต้องสมัคร สมัครบัญชีฟรีตอนจะบันทึก</p>
          </div>
          <div className={s.board} aria-hidden="true">
            <div className={s.eq}>
              <MathInline tex="\lim_{x\to 2}\frac{x^2-4}{x-2}=4" />
            </div>
            <GraphArt />
            <div className={s.eq} data-alt="1">
              <MathInline tex="\int_0^3 (2x+1)\,dx = 12" />
            </div>
          </div>
        </section>

        <section className={s.section} id="topics">
          <h2>เลือกชั้น แล้วกดหัวข้อเพื่อเริ่มเลย</h2>
          {bank ? (
            <p className={s.note}>
              แม่แบบ ม.1 - ม.6 รวม {hi.length} ชุด (คณิต {count('math')} · วิทย์ {count('sci')} · อังกฤษ {count('eng')}) แต่ละหัวข้อคณิตมี 3 ระดับความยาก
            </p>
          ) : (
            <p className={s.note}>
              <Loader2 className="w-4 h-4 inline animate-spin" /> กำลังโหลดแม่แบบ
            </p>
          )}
          <div className={s.chips} role="tablist" aria-label="เลือกชั้น">
            {GRADES.map((g) => (
              <button key={g} type="button" role="tab" aria-selected={grade === g} data-on={grade === g} onClick={() => setGrade(g)}>
                ม.{g - 6}
              </button>
            ))}
          </div>
          <div className={s.chips} role="tablist" aria-label="เลือกวิชา">
            {SET_SUBJECTS.map((x) => (
              <button key={x.id} type="button" role="tab" aria-selected={sub === x.id} data-on={sub === x.id} style={{ ['--c' as string]: x.color }} onClick={() => setSub(x.id)}>
                {ICON[x.id]} {x.label}
              </button>
            ))}
          </div>
          <div className={s.grid}>
            {topics.map((t) => (
              <button key={t.id} type="button" className={s.topic} style={{ ['--c' as string]: SET_SUBJECTS.find((x) => x.id === t.subject)!.color }} onClick={() => router.push(`/create/edit?tpl=${t.id}`)}>
                <b>{t.title}</b>
                <span>{sample(t.sample)}</span>
                <i>
                  {t.count} ข้อ เริ่มเลย <ArrowRight className="w-4 h-4" />
                </i>
              </button>
            ))}
          </div>
          <Link href="/create#templates" className={s.more}>
            <BookOpen className="w-4 h-4" /> ดูแม่แบบทั้งหมดพร้อมตัวกรองระดับความยาก
          </Link>
        </section>

        <section className={s.section}>
          <h2>เครื่องมือที่ครูมัธยมใช้บ่อย</h2>
          <div className={s.features}>
            {FEATURES.map((f) => (
              <Link key={f.title} href={f.href} className={s.feature} style={{ ['--c' as string]: f.color }}>
                <span className={s.ficon}>{f.icon}</span>
                <b>{f.title}</b>
                <span>{f.text}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
