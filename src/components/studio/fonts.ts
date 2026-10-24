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

// ชื่อฟอนต์เป็นภาษาอังกฤษแบบ Word (ผู้ใช้สั่ง) TH SarabunPSK กับ Angsana New ขึ้นก่อน
export const FONTS: Record<FontId, { label: string; family: string; note: string }> = {
  // ฟอนต์ในเครื่อง (มีคู่กับ Word) ไม่มีจะใช้ Sarabun แทน
  thsarabun: { label: 'TH SarabunPSK', family: `'TH SarabunPSK', 'TH Sarabun New', ${sarabun.style.fontFamily}`, note: 'ค่าเริ่มต้นแบบ Word (ต้องมีฟอนต์ในเครื่อง)' },
  angsana: { label: 'Angsana New', family: `'Angsana New', 'AngsanaUPC', ${sarabun.style.fontFamily}`, note: 'แบบ Word (ต้องมีฟอนต์ในเครื่อง)' },
  sarabun: { label: 'Sarabun', family: sarabun.style.fontFamily, note: 'ทางการ อ่านง่าย' },
  kanit: { label: 'Kanit', family: kanit.style.fontFamily, note: 'หัวเรื่องหนา' },
  prompt: { label: 'Prompt', family: prompt.style.fontFamily, note: 'ทันสมัย' },
  mitr: { label: 'Mitr', family: 'var(--font-mitr)', note: 'กลมมน' },
  noto: { label: 'Noto Sans Thai', family: 'var(--font-noto-sans-thai)', note: 'มาตรฐาน' },
  itim: { label: 'Itim', family: itim.style.fontFamily, note: 'ลายมือน่ารัก' },
  mali: { label: 'Mali', family: mali.style.fontFamily, note: 'ลายมือเด็ก' },
  sriracha: { label: 'Sriracha', family: sriracha.style.fontFamily, note: 'ลายมือ' },
  chonburi: { label: 'Chonburi', family: chonburi.style.fontFamily, note: 'หัวเรื่องเด่น' },
  charm: { label: 'Charm', family: charm.style.fontFamily, note: 'ตัวเขียนสวย' },
  pattaya: { label: 'Pattaya', family: pattaya.style.fontFamily, note: 'หัวเรื่องสนุก' },
  chakra: { label: 'Chakra Petch', family: chakra.style.fontFamily, note: 'เหลี่ยมเท่' },
};

/**
 * ฟอนต์ในเนื้อเอกสารโหมด Word เก็บเป็น var(--sf-<id>) ไม่ใช่ชื่อฟอนต์จริง
 * (ชื่อจาก next/font เปลี่ยนทุกครั้งที่ build และยาวเกินที่ตัวกรอง HTML รับ ทำให้ฟอนต์หลุดกลับเป็นค่าเริ่มต้น)
 */
export const fontVar = (id: FontId) => `var(--sf-${id})`;
export const FONT_VARS_CSS = `:root{${(Object.keys(FONTS) as FontId[]).map((id) => `--sf-${id}:${FONTS[id].family}`).join(';')}}`;
/** ฟอนต์ไทยแบบ Word ตัวเล็กกว่าฟอนต์อื่นที่ขนาดเดียวกัน ขยายในรายการเลือกฟอนต์ให้อ่านง่าย */
export const FONT_PREVIEW_SCALE: Partial<Record<FontId, number>> = { thsarabun: 1.4, angsana: 1.45 };

/** ฟอนต์ที่มีแต่น้ำหนักปกติ (ตัวหนาจะเป็นตัวหนาจำลอง) */
export const NO_BOLD: FontId[] = ['itim', 'sriracha', 'chonburi', 'pattaya'];
