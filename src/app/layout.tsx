import type { Metadata } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-thai',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'สื่อการสอน 5G - ศูนย์รวมสื่อการสอนและเกมการศึกษา',
  description: 'แพลตฟอร์มคลังสื่อการสอนและเกมการศึกษาออนไลน์ รวบรวมสื่อคุณภาพสำหรับระดับชั้นประถมศึกษา',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning className={notoSansThai.variable}>
      <body className="min-h-screen bg-background font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
