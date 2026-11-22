import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai_Looped, IBM_Plex_Sans_Thai_Looped } from 'next/font/google';
import './globals.css';
import './ui-minimal.css';
import './ui-mono.css';
import './ui-depth.css';
import { Providers } from './providers';
import { GFX_BOOT } from '@/lib/gfx';
import { UI_BOOT } from '@/lib/ui-look';

// ฟอนต์ไทยแบบมีหัวกลม (looped) อ่านง่าย ผู้ใช้สั่ง 16 พ.ย. 2026 (ชื่อตัวแปร CSS เดิมเพื่อไม่ต้องแก้ไฟล์อื่น)
const notoSansThai = Noto_Sans_Thai_Looped({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-noto-sans-thai',
  display: 'swap',
});

// ฟอนต์หัวข้อ: IBM Plex Sans Thai Looped เส้นเรียบ มีหัว ดูพรีเมียม
const display = IBM_Plex_Sans_Thai_Looped({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Learn5G - สร้างสื่อการสอนและเกมสำหรับครู',
  description: 'เครื่องมือสำหรับครู สร้างสื่อการสอน สร้างเกมห้องเรียน และคลังเกม 3D พร้อมใช้ในห้องเรียน',
  icons: {
    icon: '/logo.png',
  },
  openGraph: {
    title: 'Learn5G',
    description: 'สร้างสื่อการสอนและเกมห้องเรียนสำหรับครู',
    images: ['/logo.png'],
    locale: 'th_TH',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#080808' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      data-ui="minimal"
      className={`${notoSansThai.variable} ${display.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: GFX_BOOT + UI_BOOT }} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
