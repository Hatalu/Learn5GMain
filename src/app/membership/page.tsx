'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, CalendarPlus, Check, Gamepad2, Lightbulb, MonitorSmartphone, QrCode, Receipt, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { Navbar } from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import { hasMembership, CONTACT_PAGE_URL } from '@/lib/membership';
import { PLANS, Plan, perDay, savePercent } from '@/lib/plans';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { CheckoutModal } from '@/components/membership/CheckoutModal';
import s from './membership.module.css';

const FLAG_COLORS = ['#ff6b7a', '#ffcf3f', '#3fd6a8', '#4a7bf0', '#9b6cf0', '#ff9a3d'];

const FEATURES = ['เล่นได้ทุกเกมในคลังไม่จำกัด', 'คู่หูปุ๋งและสติกเกอร์บันทึกในบัญชี', 'ส่งไอเดียเกมใหม่ถึงทีมได้'];

export default function MembershipPage() {
  const { user, profile } = useAuth();
  const [ready, setReady] = useState<boolean | null>(null);
  const [picked, setPicked] = useState<Plan | null>(null);
  const member = !!user && hasMembership(profile);
  const until = profile?.premium_until ? new Date(profile.premium_until) : null;

  useEffect(() => {
    fetch('/api/membership/config', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setReady(!!j.ready))
      .catch(() => setReady(false));
  }, []);

  const choose = (p: Plan) => {
    if (ready === false) {
      window.open(CONTACT_PAGE_URL, '_blank', 'noopener');
      return;
    }
    setPicked(p);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className={`${s.world} flex-1`}>
        <div className={s.dots} />
        <span className={s.cloud} style={{ top: '9%', animationDelay: '-12s' }} />
        <span className={s.cloud} style={{ top: '34%', animationDelay: '-40s', ['--s' as string]: 0.7 }} />
        <span className={s.cloud} style={{ top: '62%', animationDelay: '-25s', ['--s' as string]: 0.85 }} />

        <div className={s.bunting} aria-hidden="true">
          {Array.from({ length: 40 }).map((_, i) => (
            <i key={i} style={{ background: FLAG_COLORS[i % FLAG_COLORS.length], animationDelay: `${(i % 7) * 0.25}s` }} />
          ))}
        </div>

        {/* ---------- Hero ---------- */}
        <section className="max-w-6xl mx-auto px-4 pt-6 sm:pt-10 pb-6 text-center">
          <span className={`${s.paper} inline-flex items-center gap-2 px-4 py-1.5 text-sm font-bold`} style={{ borderRadius: 999, boxShadow: '0 4px 0 #2a2350' }}>
            <Sparkles className="w-4 h-4 text-orange-500" /> สมาชิกสื่อการสอน 5G
          </span>
          <h1 className="mt-4 font-display text-[2.1rem] leading-tight sm:text-6xl text-white" style={{ textShadow: '0 4px 0 #2a2350, 0 0 24px rgba(42,35,80,.25)' }}>
            เลี้ยงน้องไฟว์จีให้โต
            <br />
            <span className="text-[#ffcf3f]">ปลดล็อกทุกเกมในคลัง</span>
          </h1>
          <p className="mt-3 text-base sm:text-lg font-semibold text-[#2a2350]/85 max-w-xl mx-auto">
            สแกนจ่ายพร้อมเพย์ ส่งสลิป ระบบเปิดสิทธิ์ให้ทันที ไม่ต้องรอแอดมิน
          </p>

          {/* เส้นทางการเติบโต */}
          <div className="mt-6 flex items-end justify-center gap-2 sm:gap-6">
            {PLANS.map((p, i) => (
              <React.Fragment key={p.id}>
                {i > 0 && <ArrowRight className="mb-10 w-6 h-6 sm:w-8 sm:h-8 text-[#2a2350] shrink-0" strokeWidth={3} />}
                <div className="flex flex-col items-center">
                  <div className={`relative ${s.bob}`} style={{ animationDelay: `${i * 0.4}s`, width: [70, 92, 120][i], height: [100, 122, 160][i] }}>
                    <Image src={p.image} alt={p.stage} fill sizes="160px" className="object-contain drop-shadow-[0_6px_0_rgba(42,35,80,.25)]" priority />
                  </div>
                  <span className="mt-1 text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full border-2 border-[#2a2350]" style={{ background: p.color.soft }}>
                    {p.days} วัน
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>

          {member && until && (
            <div className={`${s.paper} mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold`}>
              <BadgeCheck className="w-5 h-5 text-emerald-600" />
              คุณเป็นสมาชิกถึง {until.toLocaleDateString('th-TH', { dateStyle: 'long' })} ซื้อเพิ่มได้ วันจะต่อจากเดิม
            </div>
          )}
        </section>

        {ready === false && (
          <div className="max-w-3xl mx-auto px-4 mb-4">
            <div className={`${s.paper} p-4 text-center text-sm font-semibold`}>
              ระบบชำระเงินออนไลน์ยังไม่เปิด กดเลือกแพลนเพื่อติดต่อสมัครทางเพจได้เลย
            </div>
          </div>
        )}

        {/* ---------- แพลน ---------- */}
        <section className="max-w-6xl mx-auto px-4 pt-6 pb-12" aria-label="แพลนสมาชิก">
          <div className="grid gap-9 md:grid-cols-3 md:items-end">
            {PLANS.map((p) => {
              const best = p.id === 'grown';
              const save = savePercent(p);
              return (
                <article
                  key={p.id}
                  className={`${s.booth} flex flex-col ${best ? 'md:-translate-y-5 md:scale-[1.04] md:hover:-translate-y-7' : ''}`}
                  style={{ ['--a' as string]: p.color.main }}
                >
                  {p.badge && (
                    <span className={s.ribbon} style={{ background: best ? '#ff6b7a' : '#ffcf3f', color: best ? '#fff' : '#2a2350' }}>
                      {p.badge}
                    </span>
                  )}
                  <div className={s.awning} />
                  <div className="relative px-5 pt-7 pb-6 flex flex-col flex-1">
                    <div className="relative mx-auto w-40 h-44 sm:w-44 sm:h-48">
                      <span className={s.glow} style={{ background: p.color.main }} />
                      <div className={`absolute inset-0 ${s.bob}`}>
                        <Image src={p.image} alt={p.name} fill sizes="200px" className="object-contain z-10" />
                      </div>
                    </div>
                    <p className="mt-2 text-center text-xs font-bold uppercase tracking-widest" style={{ color: p.color.text }}>
                      {p.stage} · {p.tagline}
                    </p>
                    <h2 className="text-center font-display text-2xl sm:text-3xl mt-0.5">{p.name}</h2>

                    <div className="mt-3 flex items-end justify-center gap-1.5">
                      <span className="font-display text-6xl leading-none" style={{ color: '#2a2350' }}>
                        {p.price}
                      </span>
                      <span className="mb-1.5 font-bold">บาท / {p.days === 30 ? '1 เดือน' : `${p.days} วัน`}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm font-bold">
                      <span className="px-3 py-1 rounded-full border-2 border-[#2a2350]" style={{ background: p.color.soft }}>
                        ตกวันละ {perDay(p)} บาท
                      </span>
                      {save > 0 && <span className="px-3 py-1 rounded-full border-2 border-[#2a2350] bg-[#ff6b7a] text-white">ประหยัด {save}%</span>}
                    </div>

                    <ul className="mt-5 space-y-2 text-[15px] font-semibold">
                      {FEATURES.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <span className="mt-0.5 w-5 h-5 rounded-full border-2 border-[#2a2350] flex items-center justify-center shrink-0" style={{ background: p.color.main }}>
                            <Check className="w-3 h-3" strokeWidth={4} />
                          </span>
                          {f}
                        </li>
                      ))}
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 w-5 h-5 rounded-full border-2 border-[#2a2350] flex items-center justify-center shrink-0" style={{ background: p.color.main }}>
                          <Check className="w-3 h-3" strokeWidth={4} />
                        </span>
                        ใช้ได้ {p.days} วันเต็ม ไม่ตัดเงินซ้ำ
                      </li>
                    </ul>

                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => choose(p)}
                      className={`${s.btn} mt-6 w-full py-3.5 text-lg font-display`}
                      style={{ background: best ? '#ffcf3f' : p.color.main }}
                    >
                      {ready === false ? <FacebookIcon className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
                      {member ? 'ต่ออายุด้วยแพลนนี้' : 'เลือกแพลนนี้'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ---------- ขั้นตอน ---------- */}
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <h2 className="text-center font-display text-3xl sm:text-4xl text-white" style={{ textShadow: '0 3px 0 #2a2350' }}>
            สมัครง่าย 3 ขั้น
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Sparkles, t: 'เลือกแพลน', d: 'เลือกร่างน้องไฟว์จีที่ชอบ', c: '#ffcf3f' },
              { icon: QrCode, t: 'สแกนจ่ายพร้อมเพย์', d: 'QR ใส่ยอดเงินให้แล้ว แค่สแกน', c: '#3fd6a8' },
              { icon: Upload, t: 'ส่งสลิป รับสิทธิ์ทันที', d: 'ระบบตรวจสลิปอัตโนมัติ', c: '#ff8fb1' },
            ].map((x, i) => (
              <div key={x.t} className={`${s.paper} p-5 flex items-center gap-4`}>
                <span className="relative w-14 h-14 rounded-2xl border-[3px] border-[#2a2350] flex items-center justify-center shrink-0" style={{ background: x.c, boxShadow: '0 4px 0 #2a2350' }}>
                  <x.icon className="w-7 h-7" />
                  <span className="absolute -top-2.5 -left-2.5 w-7 h-7 rounded-full bg-[#2a2350] text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
                </span>
                <div>
                  <p className="font-display text-lg">{x.t}</p>
                  <p className="text-sm font-semibold opacity-75">{x.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- สิ่งที่ได้ ---------- */}
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <div className={`${s.paper} p-6 sm:p-8`}>
            <h2 className="text-center font-display text-2xl sm:text-3xl">สมาชิกได้อะไรบ้าง</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Gamepad2, t: 'ทุกเกม ทุกวิชา', d: 'คณิต วิทย์ อังกฤษ เล่นได้ไม่จำกัด', c: '#4fb3ff' },
                { icon: MonitorSmartphone, t: 'ทุกอุปกรณ์', d: 'มือถือ ไอแพด คอม ใช้บัญชีเดียว', c: '#3fd6a8' },
                { icon: ShieldCheck, t: 'ปลอดภัยสำหรับเด็ก', d: 'ไม่มีโฆษณา ไม่มีแชต ไม่มีสุ่มรางวัล', c: '#9b6cf0' },
                { icon: Lightbulb, t: 'ส่งไอเดียเกม', d: 'อยากได้เกมเรื่องไหน บอกทีมได้เลย', c: '#ffcf3f' },
              ].map((b) => (
                <div key={b.t} className="text-center">
                  <span className="mx-auto w-14 h-14 rounded-full border-[3px] border-[#2a2350] flex items-center justify-center" style={{ background: b.c }}>
                    <b.icon className="w-7 h-7" />
                  </span>
                  <p className="mt-2 font-display text-lg">{b.t}</p>
                  <p className="text-sm font-semibold opacity-75">{b.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- คำถามที่พบบ่อย ---------- */}
        <section className="max-w-3xl mx-auto px-4 pb-16">
          <h2 className="text-center font-display text-3xl text-white" style={{ textShadow: '0 3px 0 #2a2350' }}>
            คำถามที่พบบ่อย
          </h2>
          <div className="mt-5 space-y-3">
            {[
              { icon: Receipt, q: 'ต่ออายุอัตโนมัติไหม', a: 'ไม่ จ่ายครั้งเดียวต่อรอบ ไม่มีการตัดเงินซ้ำ หมดแล้วค่อยซื้อใหม่' },
              { icon: CalendarPlus, q: 'ซื้อเพิ่มตอนยังไม่หมดอายุได้ไหม', a: 'ได้ วันใหม่จะต่อจากวันหมดอายุเดิม ไม่เสียวันที่เหลือ' },
              { icon: BadgeCheck, q: 'มีบัญชีอยู่แล้ว', a: 'เข้าสู่ระบบก่อนแล้วเลือกแพลน ระบบจะต่ออายุให้บัญชีเดิม' },
              { icon: FacebookIcon, q: 'โอนแล้วแต่ระบบไม่ผ่าน', a: 'ทักเพจ สื่อการสอน 5G พร้อมแนบสลิป แอดมินช่วยตรวจให้' },
            ].map((f) => (
              <details key={f.q} className={`${s.paper} group px-5 py-4`} style={{ boxShadow: '0 4px 0 #2a2350' }}>
                <summary className="flex items-center gap-3 cursor-pointer list-none font-bold">
                  <f.icon className="w-5 h-5 shrink-0" />
                  <span className="flex-1">{f.q}</span>
                  <span className="text-xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 pl-8 text-sm font-semibold opacity-80">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-center text-sm font-bold text-[#2a2350]/80">
            ยังไม่แน่ใจ?{' '}
            <Link href="/home" className="underline decoration-2 underline-offset-4">
              ลองเล่นฟรี 5 นาทีได้ทุกเกม
            </Link>
          </p>
        </section>
      </main>

      {picked && <CheckoutModal plan={picked} onClose={() => setPicked(null)} />}
    </div>
  );
}
