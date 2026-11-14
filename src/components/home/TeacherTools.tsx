'use client';

/** เครื่องมือครูหน้าแรก: การ์ดใหญ่ "สร้างเกมด้วย AI" + การ์ดระบบอื่นๆ ทุกการ์ดลิงก์ไปของจริง */
import React from 'react';
import Link from 'next/link';
import { ChevronRight, FileText, GraduationCap, Library, Palette, Radio, Trophy, Wand2 } from 'lucide-react';
import { AI_GAMES } from '@/lib/aigame/games';
import { FREE_DESIGN_LIMIT, FREE_SET_LIMIT } from '@/lib/game-creator/quota';
import { GameArt } from '@/components/aigame/GameArt';
import t from './tools.module.css';

const TOOLS = [
  { href: '/create', icon: Radio, color: '#ff6b7a', title: 'ชุดคำถาม + ห้องเกมเล่นสด', desc: 'แม่แบบ 500+ ชุด ป.1 - ม.6 เปิดห้องด้วยเลข 6 หลัก นักเรียนเล่นพร้อมกันทั้งห้อง มีรายงานผล', tag: `ฟรี ${FREE_SET_LIMIT} ชุด`, tour: 'tool-create' },
  { href: '/studio', icon: Palette, color: '#9b6cf0', title: 'สร้างสื่อการสอน', desc: 'แบบ Canva หรือแบบ Word ใบงาน บัตรคำ สมการ MathType กราฟ แม่แบบ 300+ แบบ', tag: `ฟรี ${FREE_DESIGN_LIMIT} สื่อ`, tour: 'tool-studio' },
  { href: '/worksheet', icon: FileText, color: '#3fd6a8', title: 'ใบงาน AI', desc: 'เลือกวิชา ธีม สไตล์ แล้วให้ Gemini วาดใบงานสวยๆ ให้', tag: 'ฟรี' },
  { href: '/secondary', icon: GraduationCap, color: '#4fb3ff', title: 'สำหรับครูมัธยม', desc: 'ชุดคำถาม ม.1 - ม.6 สูตรคณิต กราฟ และเครื่องมือที่ครูมัธยมใช้บ่อย', tag: 'ม.1 - ม.6' },
  { href: '/contest', icon: Trophy, color: '#ffcf3f', title: 'ประกวดใบงาน', desc: 'ส่งใบงานที่ออกแบบ ให้ครูทั่วประเทศกดถูกใจ ลุ้นรับสมาชิกฟรี', tag: 'กิจกรรม' },
] as const;

export function TeacherTools({ onLibrary, className = '' }: { onLibrary: () => void; className?: string }) {
  return (
    <section id="tools" className={`${t.wrap} ${className}`} aria-labelledby="tools-title" data-tour="tools">
      <div className={t.head}>
        <h2 id="tools-title" className="font-display">
          เครื่องมือของคุณครู
        </h2>
        <p>เลือกงานที่อยากทำ ทุกระบบใช้ได้บนคอม แท็บเล็ต และมือถือ</p>
      </div>

      <div className={t.grid}>
        {/* การ์ดเด่น: สร้างเกมด้วย AI */}
        <div className={t.hero} data-tour="tool-ai">
          <div className={t.heroCopy}>
            <span className={t.new}>ใหม่</span>
            <h3 className="font-display">
              <Wand2 className="w-6 h-6" /> สร้างเกมด้วย AI
            </h3>
            <p>เลือกเกมที่ชอบ ปรับวิชา ชั้น เนื้อหา หรือใช้ชุดคำถามของครูเอง แล้วคัดลอก prompt ไปให้ Gemini สร้างเกมของตัวเอง</p>
            <Link href="/ai-game" className={t.go}>
              เลือกเกม <ChevronRight className="w-5 h-5" strokeWidth={3} />
            </Link>
          </div>
          <div className={t.picks} aria-label="เกมที่ให้ AI สร้างได้">
            {AI_GAMES.slice(0, 4).map((g) => (
              <Link key={g.id} href={`/ai-game?g=${g.id}`} className={t.pick} style={{ ['--c' as string]: g.color }}>
                <span className={t.pickArt}>
                  <GameArt id={g.id} />
                  <i>{g.dim}</i>
                </span>
                <b>{g.name}</b>
              </Link>
            ))}
          </div>
        </div>

        {TOOLS.map((x) => (
          <Link key={x.href} href={x.href} className={t.card} style={{ ['--c' as string]: x.color }} data-tour={'tour' in x ? x.tour : undefined}>
            <span className={t.icon}>
              <x.icon className="w-6 h-6" />
            </span>
            <b>{x.title}</b>
            <span className={t.desc}>{x.desc}</span>
            <em>{x.tag}</em>
          </Link>
        ))}

        <button type="button" onClick={onLibrary} className={t.card} style={{ ['--c' as string]: '#ff9a3d' }}>
          <span className={t.icon}>
            <Library className="w-6 h-6" />
          </span>
          <b>คลังเกมการเรียนรู้</b>
          <span className={t.desc}>เกมผจญภัย ป.1 - ป.6 พร้อมใช้สอน เปิดบนจอหน้าห้องหรือให้นักเรียนเล่นเอง</span>
          <em>สมาชิกเล่นเต็ม</em>
        </button>
      </div>
    </section>
  );
}
