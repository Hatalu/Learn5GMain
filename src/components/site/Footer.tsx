import Link from 'next/link';
import { CONTACT_PAGE_URL } from '@/lib/membership';
import { Logo } from '@/components/navbar/Logo';

const COLS = [
  {
    title: 'สร้าง',
    links: [
      { href: '/create', label: 'สร้างเกม' },
      { href: '/studio', label: 'สร้างสื่อการสอน' },
      { href: '/play', label: 'เข้าห้องเกม' },
    ],
  },
  {
    title: 'บริการ',
    links: [
      { href: '/ai-game', label: 'คลังเกม' },
      { href: '/innovation', label: 'สั่งทำนวัตกรรม' },
    ],
  },
  {
    title: 'บัญชี',
    links: [
      { href: '/pricing', label: 'แพ็กเกจ' },
      { href: '/signup', label: 'สมัครบัญชีฟรี' },
      { href: '/login', label: 'เข้าสู่ระบบ' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm ui-muted">เครื่องมือสำหรับครู สร้างสื่อการสอน เกมห้องเรียน และนวัตกรรมตามแผนการสอน</p>
          <a href={CONTACT_PAGE_URL} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm underline underline-offset-4">
            ติดต่อทางเพจ Facebook
          </a>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="ui-kicker">{c.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="ui-muted transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs ui-muted sm:px-6">© {new Date().getFullYear()} Jame Studio · Learn5G</p>
      </div>
    </footer>
  );
}
