'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import { Avatar } from '@/components/creator/Avatar';
import { ChoiceShape, choiceStyle } from '@/components/creator/ChoiceShape';
import { SetCoverArt } from '@/components/creator/CoverPicker';
import { getGfx } from '@/lib/gfx';
import { parseCover, COVER_COLORS } from '@/lib/game-creator/cover';
import { mediaPrefix } from '@/lib/game-creator/media';
import { FREE_DESIGN_LIMIT, FREE_SET_LIMIT } from '@/lib/game-creator/quota';
import type { ShowcaseItem } from '@/lib/game-creator/showcase';
import { useOffscreen } from './useOffscreen';
import z from './zones.module.css';

/* ---------- เดโมห้องเล่นสด (ข้อมูลตัวอย่าง ไม่ใช่ห้องจริง) ---------- */
const STEPS = ['นักเรียนใส่เลขห้อง 6 หลัก', 'ครูกดเริ่ม ทุกจอได้โจทย์', 'เด็กตอบ รู้ผลทันที', 'กระดานคะแนนขยับสด', 'จบเกม ได้รายงานผลรายข้อ'];
const KIDS = [
  { name: 'น้องมะลิ', av: 2, s: [0, 0, 100, 100, 280] },
  { name: 'น้องต้นกล้า', av: 5, s: [0, 0, 0, 90, 240] },
  { name: 'น้องฟ้า', av: 8, s: [0, 0, 0, 80, 190] },
];
const MAX = 280;
const CHOICES = ['10', '12', '14', '16'];
/** ลื่น/ลดการเคลื่อนไหว: ค้างที่ขั้นกระดานคะแนน */
const STILL = 3;

export function LiveDemo({ className = '' }: { className?: string }) {
  const [ref, off] = useOffscreen<HTMLElement>();
  const [step, setStep] = useState(0);
  const [still, setStill] = useState(false);
  useEffect(() => {
    const s = getGfx() === 'lite' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStill(s);
    if (s) setStep(STILL);
  }, []);
  useEffect(() => {
    if (off || still) return;
    const t = setInterval(() => setStep((v) => (v + 1) % STEPS.length), 2400);
    return () => clearInterval(t);
  }, [off, still]);

  return (
    <section ref={ref} className={`${z.panel} ${className}`} aria-labelledby="demo-title">
      <div className={z.head}>
        <div>
          <span className={z.tag}>ภาพตัวอย่าง</span>
          <h2 id="demo-title" className="font-display">เปิดห้องเล่นสด เห็นทั้งห้องบนจอเดียว</h2>
          <p>ครูฉายจอหลัก นักเรียนเล่นบนมือถือหรือแท็บเล็ตของตัวเอง</p>
        </div>
        <Link href="/create#templates" className={z.go}>
          ลองสร้างเกมแรก <ChevronRight className="w-4 h-4" strokeWidth={3} />
        </Link>
      </div>

      <div className={z.demo}>
        {/* จอครู */}
        <div className={z.board} role="img" aria-label="ตัวอย่างจอครู มีเลขห้องและกระดานคะแนน">
          <div className={z.boardTop}>
            <b>จอครู</b>
            <span className={z.code}>482 915</span>
          </div>
          {KIDS.map((k) => (
            <div key={k.name} className={z.row}>
              <Avatar id={k.av} size={34} />
              <span className={z.rowName}>{k.name}</span>
              <span className={z.bar}><i style={{ width: `${(k.s[step] / MAX) * 100}%` }} /></span>
              <b className={z.rowScore}>{k.s[step]}</b>
            </div>
          ))}
        </div>

        {/* จอเด็ก */}
        <div className={z.phone} role="img" aria-label="ตัวอย่างจอนักเรียน ตอบคำถามบนมือถือ">
          {step === 0 && (
            <div className={z.phoneJoin}>
              <span>เลขห้อง</span>
              <b>482 915</b>
              <i className={z.joinBtn}>เข้าห้อง</i>
            </div>
          )}
          {(step === 1 || step === 2) && (
            <>
              <p className={z.q}>3 x 4 = ?</p>
              <div className={z.choices}>
                {CHOICES.map((c, i) => (
                  <span key={c} className={z.choice} style={{ background: choiceStyle(i).color }} data-hit={step === 2 && i === 1 ? '' : undefined} data-dim={step === 2 && i !== 1 ? '' : undefined}>
                    <ChoiceShape i={i} size={15} /> {c}
                  </span>
                ))}
              </div>
              {step === 2 && <span className={z.correct}><Check className="w-4 h-4" strokeWidth={4} /> ถูกต้อง +100</span>}
            </>
          )}
          {step >= 3 && (
            <div className={z.phoneJoin}>
              <Avatar id={2} size={60} />
              <span>{step === 3 ? 'รอข้อต่อไป' : 'เก่งมาก!'}</span>
              <b>{KIDS[0].s[step]} คะแนน</b>
            </div>
          )}
        </div>
      </div>

      <ol className={z.steps}>
        {STEPS.map((t, i) => (
          <li key={t} data-on={i === step || undefined}>{t}</li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- ตารางรวมงานครู (ทุกแถวเป็นฟีเจอร์ที่มีจริง) ---------- */
const SET_FREE = `รวม ${FREE_SET_LIMIT} ชุด`;
const DESIGN_FREE = `รวม ${FREE_DESIGN_LIMIT} สื่อ`;
const JOBS = [
  { job: 'สร้างข้อสอบ / ชุดคำถาม', how: 'เริ่มจากแม่แบบ ป.1 - ม.6 แล้วแก้ต่อ', href: '/create#templates', free: SET_FREE },
  { job: 'นำเข้าคำถามจาก Excel', how: 'ในตัวแก้ไขชุดคำถาม', href: '/create', free: SET_FREE },
  { job: 'ให้ AI วาดใบงาน (Gemini)', how: 'ตู้แต่งตัวใบงาน: เลือกวิชา ธีม สไตล์ แล้วคัดลอก prompt', href: '/worksheet', free: 'ฟรี' },
  { job: 'นำเข้า Word / PDF', how: 'สมการ MathType แปลงมาแก้ต่อได้', href: '/studio', free: DESIGN_FREE },
  { job: 'พิมพ์สมการแบบ MathType + กราฟ', how: 'โหมด Word ในระบบสร้างสื่อ', href: '/studio', free: DESIGN_FREE },
  { job: 'เปลี่ยนชุดคำถามเป็นใบงาน', how: 'กดปุ่มใบงานที่การ์ดชุดคำถาม', href: '/create?tab=library', free: 'ชุดของตัวเอง' },
  { job: 'เปิดเกมเล่นสดทั้งห้อง', how: 'เลขห้อง 6 หลัก + QR', href: '/create?tab=library', free: 'ชุดของตัวเอง' },
  { job: 'ออกรายงานผล PDF / Excel', how: 'หลังจบห้อง ดูรายข้อและรายคน', href: '/create?tab=library', free: 'ชุดของตัวเอง' },
];

export function TeacherJobs({ className = '' }: { className?: string }) {
  return (
    <section className={`${z.panel} ${className}`} aria-labelledby="jobs-title">
      <div className={z.head}>
        <div>
          <h2 id="jobs-title" className="font-display">งานครูทั้งหมด จบในเว็บเดียว</h2>
          <p>สมาชิกใช้ได้ไม่จำกัด บัญชีฟรีเริ่มตามโควตาในตาราง</p>
        </div>
      </div>
      <div className={z.jobs} role="table" aria-label="งานครูและเครื่องมือ">
        <div className={z.jobHead} role="row">
          <span role="columnheader">งาน</span>
          <span role="columnheader">ทำอย่างไร</span>
          <span role="columnheader">บัญชีฟรี</span>
        </div>
        {JOBS.map((j) => (
          <Link key={j.job} href={j.href} className={z.job} role="row">
            <b role="cell">{j.job}</b>
            <span role="cell">{j.how}</span>
            <em role="cell">{j.free}</em>
            <ChevronRight className="w-4 h-4" strokeWidth={3} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------- แกลเลอรีผลงานครู ---------- */
export function TeacherGallery({ className = '' }: { className?: string }) {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  useEffect(() => {
    let on = true;
    fetch('/api/showcase')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => on && setItems(Array.isArray(j.items) ? j.items : []))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);
  // ของยังน้อย = ไม่โชว์ทั้งส่วน
  if (!items.length) return null;

  return (
    <section className={`${z.panel} ${className}`} aria-labelledby="gallery-title">
      <div className={z.head}>
        <div>
          <h2 id="gallery-title" className="font-display">ผลงานจากครูตัวจริง</h2>
          <p>ชุดคำถามที่ครูเปิดเป็นสาธารณะ สมาชิกทำสำเนาไปใช้ต่อได้</p>
        </div>
        <Link href="/create?tab=discover" className={z.go}>
          ดูทั้งหมดใน Discover <ChevronRight className="w-4 h-4" strokeWidth={3} />
        </Link>
      </div>
      <div className={z.gallery}>
        {items.map((g, i) => (
          <Link key={g.id} href="/create?tab=discover" className={z.work}>
            <span className={z.workArt} style={{ background: COVER_COLORS[i % COVER_COLORS.length] }}>
              {parseCover(g.cover_url, mediaPrefix()) ? <SetCoverArt cover={g.cover_url} /> : <ChoiceShape i={i % 6} size={38} />}
            </span>
            <b>{g.title}</b>
            <small>{g.question_count} ข้อ</small>
          </Link>
        ))}
      </div>
    </section>
  );
}
