import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dev Dashboard - สื่อการสอน 5G',
  description: 'ระบบจัดการสื่อการสอนและสมาชิกสำหรับผู้พัฒนา',
};

export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
