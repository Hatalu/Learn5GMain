import { Sarabun, Kanit, Prompt, Itim, Mali, Sriracha, Chonburi, Charm, Pattaya, Chakra_Petch, Anuphan, IBM_Plex_Sans_Thai, Noto_Sans_Thai_Looped, K2D, Krub, Niramit, Bai_Jamjuree, Athiti, Kodchasan, KoHo, Playpen_Sans_Thai, Thasadith, Noto_Serif_Thai, Taviraj, Trirong, Pridi, Maitree, Fahkwang, Srisakdi, Charmonman } from 'next/font/google';
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
// ฟอนต์ไทยฟรีเพิ่ม (Google Fonts ใช้ได้ทุกงานรวมงานขาย) ไม่ preload: ดึงไฟล์เมื่อมีข้อความใช้จริงเท่านั้น
const f_anuphan = Anuphan({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_plexthai = IBM_Plex_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_notoloop = Noto_Sans_Thai_Looped({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_k2d = K2D({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_krub = Krub({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_niramit = Niramit({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_bai = Bai_Jamjuree({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_athiti = Athiti({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_kodchasan = Kodchasan({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_koho = KoHo({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_playpen = Playpen_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_thasadith = Thasadith({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_notoserif = Noto_Serif_Thai({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_taviraj = Taviraj({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_trirong = Trirong({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_pridi = Pridi({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_maitree = Maitree({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_fahkwang = Fahkwang({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_srisakdi = Srisakdi({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });
const f_charmonman = Charmonman({ subsets: ['thai', 'latin'], weight: ['400', '700'], display: 'swap', preload: false });

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
  anuphan: { label: 'Anuphan', family: f_anuphan.style.fontFamily, note: 'ทันสมัย เรียบสะอาด' },
  plexthai: { label: 'IBM Plex Sans Thai', family: f_plexthai.style.fontFamily, note: 'ดูเป็นมืออาชีพ' },
  notoloop: { label: 'Noto Sans Thai Looped', family: f_notoloop.style.fontFamily, note: 'มีหัว อ่านง่ายสำหรับเด็ก' },
  k2d: { label: 'K2D', family: f_k2d.style.fontFamily, note: 'เหลี่ยมมนทันสมัย' },
  krub: { label: 'Krub', family: f_krub.style.fontFamily, note: 'เรียบ อ่านสบาย' },
  niramit: { label: 'Niramit', family: f_niramit.style.fontFamily, note: 'เรียบ เนื้อหาทั่วไป' },
  bai: { label: 'Bai Jamjuree', family: f_bai.style.fontFamily, note: 'เหลี่ยมโค้งสมัยใหม่' },
  athiti: { label: 'Athiti', family: f_athiti.style.fontFamily, note: 'นุ่มนวล' },
  kodchasan: { label: 'Kodchasan', family: f_kodchasan.style.fontFamily, note: 'เอียงน่ารัก' },
  koho: { label: 'KoHo', family: f_koho.style.fontFamily, note: 'กลมสนุก' },
  playpen: { label: 'Playpen Sans Thai', family: f_playpen.style.fontFamily, note: 'ลายมือเด็ก คัดไทย' },
  thasadith: { label: 'Thasadith', family: f_thasadith.style.fontFamily, note: 'บางเรียว หัวข้อสวย' },
  notoserif: { label: 'Noto Serif Thai', family: f_notoserif.style.fontFamily, note: 'มีหัว ทางการ' },
  taviraj: { label: 'Taviraj', family: f_taviraj.style.fontFamily, note: 'มีหัว สง่า' },
  trirong: { label: 'Trirong', family: f_trirong.style.fontFamily, note: 'มีหัว ประกาศนียบัตร' },
  pridi: { label: 'Pridi', family: f_pridi.style.fontFamily, note: 'มีหัว นุ่มตา' },
  maitree: { label: 'Maitree', family: f_maitree.style.fontFamily, note: 'มีหัว อบอุ่น' },
  fahkwang: { label: 'Fahkwang', family: f_fahkwang.style.fontFamily, note: 'มีหัว คลาสสิก' },
  srisakdi: { label: 'Srisakdi', family: f_srisakdi.style.fontFamily, note: 'ลายมือหัวข้อ' },
  charmonman: { label: 'Charmonman', family: f_charmonman.style.fontFamily, note: 'ตัวเขียนพู่กัน' },
};

/** กลุ่มฟอนต์ในรายการเลือก (ทุกตัวฟรี ใช้ได้ไม่มีค่าลิขสิทธิ์) */
export const FONT_GROUPS: { label: string; ids: FontId[] }[] = [
  { label: 'แบบ Word / เอกสาร', ids: ['thsarabun', 'angsana', 'sarabun', 'noto', 'notoloop', 'krub', 'niramit', 'athiti'] },
  { label: 'ทันสมัย / หัวข้อ', ids: ['kanit', 'prompt', 'mitr', 'anuphan', 'plexthai', 'k2d', 'bai', 'thasadith', 'chakra'] },
  { label: 'มีหัว (ทางการ)', ids: ['notoserif', 'taviraj', 'trirong', 'pridi', 'maitree', 'fahkwang'] },
  { label: 'ลายมือ / น่ารัก', ids: ['itim', 'mali', 'sriracha', 'kodchasan', 'koho', 'playpen'] },
  { label: 'ตกแต่ง / หัวเรื่อง', ids: ['chonburi', 'charm', 'pattaya', 'srisakdi', 'charmonman'] },
];

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
