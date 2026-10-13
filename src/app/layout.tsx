import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai, Mitr } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-thai',
  display: 'swap',
});

// ฟอนต์หัวข้อ: Mitr ตัวกลมมน อ่านง่าย เป็นมิตรกับเด็ก
const mitr = Mitr({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mitr',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'สื่อการสอน 5G - ศูนย์รวมสื่อการสอนและเกมการศึกษา',
  description: 'แพลตฟอร์มคลังสื่อการสอนและเกมการศึกษาออนไลน์ รวบรวมสื่อคุณภาพสำหรับระดับชั้นประถมศึกษา',
  icons: {
    icon: '/logo.png',
  },
  openGraph: {
    title: 'สื่อการสอน 5G',
    description: 'ศูนย์รวมเกมและสื่อการเรียนรู้สำหรับเด็กประถม เล่นสนุก เรียนรู้จริง',
    images: ['/logo.png'],
    locale: 'th_TH',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f6ff' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0a1f' },
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
      className={`${notoSansThai.variable} ${mitr.variable}`}
    >
      <body className="min-h-screen bg-background font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
