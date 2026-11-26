'use client';

import React from 'react';
import { Check, Minus } from 'lucide-react';
import { Navbar } from '@/components/navbar/Navbar';
import { Footer } from '@/components/site/Footer';
import { PricingPlanTilt } from '@/components/ui/pricing-plan-tilt';
import { useMembership } from '@/components/membership/MembershipProvider';
import { useAuth } from '@/context/AuthContext';
import { PLANS, PLAN_DAYS } from '@/lib/plans';
import { TIERS, TIER_LABEL, capText, entLines, type Ent } from '@/lib/entitlements';
import { CONTACT_PAGE_URL } from '@/lib/membership';

type Row = { label: string; get: (e: Ent, free: boolean) => string | boolean };
const ROWS: Row[] = [
  { label: 'ชุดคำถาม/เกม', get: (e, f) => capText(e.sets, 'ชุด') + (f && e.sets !== null ? ' ตลอดอายุบัญชี' : '') },
  { label: 'สื่อการสอน', get: (e, f) => capText(e.designs, 'ชิ้น') + (f && e.designs !== null ? ' ตลอดอายุบัญชี' : '') },
  { label: 'พื้นที่รูปและคลิป', get: (e) => `${e.upload_mb} MB` },
  { label: 'คลังผลงานครู (Discover)', get: (e) => e.discover },
  { label: 'คลังเกม 3D (บันทึกไฟล์เกม)', get: (e) => e.ai_game },
  { label: 'สั่งทำนวัตกรรมตามแผนการสอน', get: (e) => (e.innovation_jobs > 0 ? `${e.innovation_jobs} งาน/เดือน` : false) },
  { label: 'แก้ไขงานนวัตกรรม', get: (e) => (e.innovation_jobs > 0 ? `${e.innovation_revisions} ครั้ง/งาน` : false) },
];

const FAQ = [
  { q: 'จ่ายเงินอย่างไร', a: 'สแกน QR พร้อมเพย์ที่ระบุยอดไว้แล้ว แล้วส่งสลิป ระบบตรวจกับธนาคารและเปิดสิทธิ์ให้ทันที' },
  { q: 'ต่ออายุแล้ววันจะหายไหม', a: `ไม่หาย ต่อแพ็กเกจเดิม วันใหม่ ${PLAN_DAYS} วันจะต่อจากวันหมดอายุเดิม` },
  { q: 'เปลี่ยนแพ็กเกจกลางเดือนได้ไหม', a: 'ได้ วันที่เหลือของแพ็กเกจเดิมจะถูกแปลงเป็นวันของแพ็กเกจใหม่ตามมูลค่า แล้วบวกเพิ่มอีก 30 วัน' },
  { q: 'หมดอายุแล้วผลงานหายไหม', a: 'ผลงานยังอยู่ครบ แต่สิทธิ์จะกลับเป็นบัญชีฟรีจนกว่าจะต่ออายุ' },
  { q: 'สั่งทำนวัตกรรมคืออะไร', a: 'สำหรับแพ็กเกจ Pro และ Master ส่งแผนการสอนมา ทีมงานจะทำนวัตกรรมให้ภายใน 3-7 วัน และส่งลิงก์ทางอีเมล' },
];

export default function PricingPage() {
  const { ents, tier, openCheckout } = useMembership();
  const { isDev } = useAuth();

  const plans = PLANS.map((p) => ({
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    price: p.price,
    popular: p.popular,
    current: tier === p.id && !isDev,
    cta: tier === p.id ? 'ต่ออายุ' : `เลือก ${p.name}`,
    note: `จ่ายครั้งละ ${PLAN_DAYS} วัน ไม่ตัดเงินอัตโนมัติ`,
    features: entLines(p.id, ents[p.id]),
  }));

  return (
    <>
      <Navbar />
      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <p className="ui-kicker ui-rise">แพ็กเกจ</p>
          <h1 className="ui-title ui-rise mx-auto mt-4 max-w-3xl text-4xl sm:text-6xl" style={{ animationDelay: '60ms' }}>
            เลือกแพ็กเกจที่เหมาะกับห้องเรียนของคุณ
          </h1>
          <p className="ui-rise mx-auto mt-5 max-w-xl ui-muted" style={{ animationDelay: '120ms' }}>
            ราคารายเดือน จ่ายด้วยพร้อมเพย์ เปิดสิทธิ์ทันทีหลังตรวจสลิป
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 sm:px-6">
          <PricingPlanTilt plans={plans} onSelect={(id) => openCheckout(id as (typeof PLANS)[number]['id'])} />
          <p className="mt-6 text-center text-sm ui-muted">
            ยังไม่พร้อม? บัญชีฟรีใช้ได้ทันที · มีคำถาม{' '}
            <a href={CONTACT_PAGE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              ติดต่อทางเพจ
            </a>
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <p className="ui-kicker">เทียบสิทธิ์</p>
          <h2 className="ui-title mt-3 text-3xl">ทุกแพ็กเกจในตารางเดียว</h2>
          <div className="mt-8 overflow-x-auto rounded-3xl border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-4 text-left font-normal ui-muted" />
                  {TIERS.map((t) => (
                    <th key={t} className="p-4 text-left font-medium">
                      {TIER_LABEL[t]}
                      <span className="block text-xs font-normal ui-muted">{t === 'free' ? '0 บาท' : `${PLANS.find((p) => p.id === t)?.price} บาท/เดือน`}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.label} className="border-b last:border-0">
                    <td className="p-4 ui-muted">{r.label}</td>
                    {TIERS.map((t) => {
                      const v = r.get(ents[t], t === 'free');
                      return (
                        <td key={t} className="p-4">
                          {v === true ? <Check className="h-4 w-4" aria-label="มี" /> : v === false ? <Minus className="h-4 w-4 opacity-30" aria-label="ไม่มี" /> : v}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-28 sm:px-6">
          <p className="ui-kicker">คำถามที่พบบ่อย</p>
          <div className="mt-6 divide-y border-y">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base">
                  {f.q}
                  <span className="text-xl font-light transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm ui-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
