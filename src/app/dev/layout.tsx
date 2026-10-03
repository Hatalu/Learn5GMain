import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dev Dashboard - Educational Media Hub',
  description: 'ระบบจัดการสื่อการสอนและสมาชิกสำหรับผู้พัฒนา',
};

export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
