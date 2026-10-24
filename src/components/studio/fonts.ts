import { Sarabun, Kanit, Prompt, Itim, Mali, Sriracha, Chonburi, Charm, Pattaya, Chakra_Petch } from 'next/font/google';
import type { FontId } from '@/lib/studio/doc';

// ฟอนต์ไทยของ Studio โหลดจากเว็บเราเอง (next/font) ตอนส่งออกเป็นรูป/PDF จึงฝังฟอนต์ได้ครบ
// ไฟล์ฟอนต์ถูกดาวน์โหลดเฉพาะตัวที่ใช้จริงบนหน้า
const sarabun = Sarabun({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap' });
const kanit = Kanit({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap' });
const prompt = Prompt({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap' });
const itim = Itim({ subsets: ['thai', 'latin'], weight: '400', display: 'swap' });
const mali = Mali({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap' });
const sriracha = Sriracha({ subsets: ['thai', 'latin'], weight: '400', display: 'swap' });
const chonburi = Chonburi({ subsets: ['thai', 'latin'], weight: '400', display: 'swap' });
const charm = Charm({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap' });
const pattaya = Pattaya({ subsets: ['thai', 'latin'], weight: '400', display: 'swap' });
const chakra = Chakra_Petch({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap' });

export const FONTS: Record<FontId, { label: string; family: string; note: string }> = {
  sarabun: { label: 'สารบรรณ', family: sarabun.style.fontFamily, note: 'ทางการ อ่านง่าย' },
  // ฟอนต์ในเครื่อง (ส่วนใหญ่มีคู่กับ Word) ไม่มีจะใช้สารบรรณแทน
  thsarabun: { label: 'TH Sarabun', family: `'TH SarabunPSK', 'TH Sarabun New', ${sarabun.style.fontFamily}`, note: 'แบบ Word (ต้องมีฟอนต์ในเครื่อง)' },
  kanit: { label: 'คณิต', family: kanit.style.fontFamily, note: 'หัวเรื่องหนา' },
  prompt: { label: 'พร้อมท์', family: prompt.style.fontFamily, note: 'ทันสมัย' },
  mitr: { label: 'มิตร', family: 'var(--font-mitr)', note: 'กลมมน' },
  noto: { label: 'โนโต', family: 'var(--font-noto-sans-thai)', note: 'มาตรฐาน' },
  itim: { label: 'ไอติม', family: itim.style.fontFamily, note: 'ลายมือน่ารัก' },
  mali: { label: 'มะลิ', family: mali.style.fontFamily, note: 'ลายมือเด็ก' },
  sriracha: { label: 'ศรีราชา', family: sriracha.style.fontFamily, note: 'ลายมือ' },
  chonburi: { label: 'ชลบุรี', family: chonburi.style.fontFamily, note: 'หัวเรื่องเด่น' },
  charm: { label: 'ชาม', family: charm.style.fontFamily, note: 'ตัวเขียนสวย' },
  pattaya: { label: 'พัทยา', family: pattaya.style.fontFamily, note: 'หัวเรื่องสนุก' },
  chakra: { label: 'จักรเพชร', family: chakra.style.fontFamily, note: 'เหลี่ยมเท่' },
};

/** ฟอนต์ที่มีแต่น้ำหนักปกติ (ตัวหนาจะเป็นตัวหนาจำลอง) */
export const NO_BOLD: FontId[] = ['itim', 'sriracha', 'chonburi', 'pattaya'];
