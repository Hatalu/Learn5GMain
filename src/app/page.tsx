'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowUpRight, FileText, Gamepad2, Layers, Sparkles } from 'lucide-react';
import { Navbar } from '@/components/navbar/Navbar';
import { Footer } from '@/components/site/Footer';
import { WaveBackdrop } from '@/components/ui/wave-backdrop';
import { useAuth } from '@/context/AuthContext';
import { useMembership } from '@/components/membership/MembershipProvider';
import { PLANS } from '@/lib/plans';
import { isRoomCode } from '@/lib/game-creator/templates';

const TOOLS = [
  { href: '/create', icon: Gamepad2, no: '01', title: 'สร้างเกม', desc: 'ทำชุดคำถามครั้งเดียว เปิดห้องให้นักเรียนเล่นได้หลายรูปแบบ ผ่านเลขห้อง 6 หลัก พร้อมรายงานผลรายข้อ' },
  { href: '/studio', icon: Layers, no: '02', title: 'สร้างสื่อการสอน', desc: 'ใบงาน ใบความรู้ ป้าย และสไลด์ แบบ Canva หรือแบบ Word พร้อมแม่แบบหลายร้อยแบบ ส่งออก PDF ได้' },
  { href: '/ai-game', icon: Sparkles, no: '03', title: 'เกม AI', desc: 'เลือกแบบเกมและคำถาม ระบบเขียนคำสั่งให้ AI สร้างเกมเฉพาะบทเรียนของคุณ' },
  { href: '/worksheet', icon: FileText, no: '04', title: 'ใบงาน AI', desc: 'กำหนดหัวข้อ ระดับชั้น และรูปแบบ แล้วให้ AI ช่วยร่างใบงานที่พร้อมพิมพ์' },
];

const STEPS = [
  { t: 'ส่งแผนการสอน', d: 'แนบไฟล์แผนและบอกสิ่งที่อยากได้' },
  { t: 'รอ 3-7 วัน', d: 'ทีมงานออกแบบนวัตกรรมให้ตรงแผน' },
  { t: 'รับลิงก์ทางอีเมล', d: 'ขอแก้ไขได้ตามสิทธิ์ของแพ็กเกจ' },
];

export default function HomePage() {
  const { user } = useAuth();
  const { ents } = useMembership();
  const router = useRouter();
  const [code, setCode] = useState('');
  const okCode = isRoomCode(code);

  return (
    <>
      <Navbar />
      <main>
        {/* hero */}
        <section className="relative overflow-hidden border-b">
          <WaveBackdrop />
          <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-20 sm:px-6 sm:pb-36 sm:pt-28">
            <p className="ui-kicker ui-rise">สำหรับครู</p>
            <h1 className="ui-title ui-rise mt-5 max-w-4xl text-[2.6rem] leading-[1.12] sm:text-7xl sm:leading-[1.05]" style={{ animationDelay: '60ms' }}>
              สร้างสื่อการสอน
              <br />
              และเกมห้องเรียน
              <span className="text-primary whitespace-nowrap"> ในที่เดียว</span>
            </h1>
            <p className="ui-rise mt-7 max-w-xl text-base ui-muted sm:text-lg" style={{ animationDelay: '120ms' }}>
              เครื่องมือที่ทำให้การเตรียมสอนเร็วขึ้น ตั้งแต่ใบงาน เกมตอบคำถาม จนถึงนวัตกรรมตามแผนการสอนของคุณ
            </p>
            <div className="ui-rise mt-10 flex flex-wrap gap-3" style={{ animationDelay: '180ms' }}>
              <Link href={user ? '/create' : '/signup'} className="ui-btn ui-btn-ink h-12 px-7">
                {user ? 'เริ่มสร้างเกม' : 'เริ่มใช้ฟรี'} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pricing" className="ui-btn ui-btn-line h-12 px-7">
                ดูแพ็กเกจ
              </Link>
            </div>
          </div>
        </section>

        {/* tools */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="ui-kicker">เครื่องมือ</p>
              <h2 className="ui-title mt-3 text-3xl sm:text-5xl">ทุกอย่างที่ครูต้องใช้</h2>
            </div>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border bg-border sm:grid-cols-2">
            {TOOLS.map((t) => (
              <Link key={t.href} href={t.href} className="group relative bg-background p-8 transition-colors hover:bg-muted/60 sm:p-10">
                <div className="flex items-start justify-between">
                  <t.icon className="h-6 w-6" strokeWidth={1.5} />
                  <span className="text-xs tabular-nums ui-muted">{t.no}</span>
                </div>
                <h3 className="mt-12 font-display text-2xl font-normal">{t.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed ui-muted">{t.desc}</p>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium">
                  เปิดใช้งาน <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* innovation (Master) */}
        <section className="bg-foreground text-background">
          <div className="mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-background/55">เฉพาะแพ็กเกจ Master</p>
              <h2 className="ui-title mt-4 text-3xl sm:text-5xl">สั่งทำนวัตกรรม ตามแผนการสอนของคุณ</h2>
              <p className="mt-6 max-w-md text-background/65">
                ส่งแผนการสอนมา ทีมงานจะทำนวัตกรรมให้เหมาะกับบทเรียนจริงของห้องคุณ เดือนละ {ents.master.innovation_jobs} งาน แก้ไขได้งานละ {ents.master.innovation_revisions} ครั้ง
              </p>
              <Link href="/innovation" className="ui-btn mt-10 h-12 bg-background px-7 text-foreground hover:opacity-85">
                ส่งแผนการสอน <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ol className="divide-y divide-background/15 border-y border-background/15">
              {STEPS.map((s, i) => (
                <li key={s.t} className="flex gap-6 py-7">
                  <span className="font-display text-sm tabular-nums text-background/45">0{i + 1}</span>
                  <div>
                    <p className="text-lg">{s.t}</p>
                    <p className="mt-1 text-sm text-background/55">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* join room + pricing teaser */}
        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-2">
          <div className="ui-card p-8 sm:p-10">
            <p className="ui-kicker">นักเรียน</p>
            <h2 className="ui-title mt-3 text-3xl">เข้าห้องเกมด้วยเลข 6 หลัก</h2>
            <p className="mt-3 text-sm ui-muted">ไม่ต้องสมัคร ไม่ต้องเข้าสู่ระบบ</p>
            <form
              className="mt-8 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (okCode) router.push(`/play?code=${code}`);
              }}
            >
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                aria-label="เลขห้อง 6 หลัก"
                placeholder="000000"
                className="ui-input h-12 flex-1 text-center font-display text-xl tracking-[0.4em]"
              />
              <button type="submit" disabled={!okCode} className="ui-btn ui-btn-ink h-12 px-6">
                เข้าห้อง
              </button>
            </form>
          </div>
          <div className="ui-card flex flex-col p-8 sm:p-10">
            <p className="ui-kicker">แพ็กเกจ</p>
            <h2 className="ui-title mt-3 text-3xl">เริ่มต้น {PLANS[0].price} บาท / เดือน</h2>
            <ul className="mt-6 flex-1 divide-y border-y text-sm">
              {PLANS.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3.5">
                  <span>
                    {p.name} <span className="ui-muted">· {p.tagline}</span>
                  </span>
                  <span className="tabular-nums">{p.price}</span>
                </li>
              ))}
            </ul>
            <Link href="/pricing" className="ui-btn ui-btn-line mt-6 self-start">
              เทียบแพ็กเกจ <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
