import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai, IBM_Plex_Sans_Thai } from 'next/font/google';
import './globals.css';
import './ui-minimal.css';
import './ui-mono.css';
import { Providers } from './providers';
import { GFX_BOOT } from '@/lib/gfx';
import { UI_BOOT } from '@/lib/ui-look';

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-thai',
  display: 'swap',
});

// ฟอนต์หัวข้อ: IBM Plex Sans Thai เส้นบาง เรียบ ดูพรีเมียม
const display = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Learn5G - สร้างสื่อการสอนและเกมสำหรับครู',
  description: 'เครื่องมือสำหรับครู สร้างสื่อการสอน สร้างเกมห้องเรียน และใช้ AI ช่วยเตรียมการสอน',
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
