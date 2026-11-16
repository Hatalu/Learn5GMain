import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'หลังบ้าน - Learn5G',
  description: 'จัดการสมาชิก แพ็กเกจ และงานนวัตกรรม',
};

export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
