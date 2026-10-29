import { makeWrite, type Item } from '@/lib/studio/doc';
import { arrow, at, badge, blankRows, box, design, header, label, lines, nameLine, page, table, txt, type Template } from './kit';

const CONSONANTS = 'ก ไก่,ข ไข่,ฃ ขวด,ค ควาย,ฅ คน,ฆ ระฆัง,ง งู,จ จาน,ฉ ฉิ่ง,ช ช้าง,ซ โซ่,ฌ เฌอ,ญ หญิง,ฎ ชฎา,ฏ ปฏัก,ฐ ฐาน,ฑ มณโฑ,ฒ ผู้เฒ่า,ณ เณร,ด เด็ก,ต เต่า,ถ ถุง,ท ทหาร,ธ ธง,น หนู,บ ใบไม้,ป ปลา,ผ ผึ้ง,ฝ ฝา,พ พาน,ฟ ฟัน,ภ สำเภา,ม ม้า,ย ยักษ์,ร เรือ,ล ลิง,ว แหวน,ศ ศาลา,ษ ฤๅษี,ส เสือ,ห หีบ,ฬ จุฬา,อ อ่าง,ฮ นกฮูก'.split(',');
const VOWELS = '-ะ,-า,-ิ,-ี,-ึ,-ื,-ุ,-ู,เ-ะ,เ-,แ-ะ,แ-,โ-ะ,โ-,เ-าะ,-อ,เ-อะ,เ-อ,เ-ียะ,เ-ีย,เ-ือะ,เ-ือ,-ัวะ,-ัว,-ำ,ใ-,ไ-,เ-า,ฤ,ฤๅ,ฦ,ฦๅ'.split(',');
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export const THAI_TEMPLATES: Template[] = [
  {
    id: 'th-consonants',
    label: 'พยัญชนะไทย 44 ตัว',
    note: 'แผ่นภาพติดผนัง พร้อมคำประกอบ',
    cat: 'thai',
    sizeId: 'a4p',
    accent: '#e11d48',
    make: () =>
      design('a4p', [
        page(
          [
            txt('พยัญชนะไทย 44 ตัว', 48, 40, 40, 714, { bold: true, color: '#be123c', font: 'kanit', align: 'center' }),
            table(chunk(CONSONANTS, 4), 40, 140, 714, 940, { head: '#ffffff', size: 30, stroke: '#fda4af', color: '#2a2350' }),
          ],
          { bg: { color: '#fff1f2', color2: '#fff1f2', angle: 180, pattern: 'none', pcolor: '#ffffff' }, border: { style: 'flowers', color: '#fb7185', w: 3 } }
        ),
      ]),
  },
  {
    id: 'th-vowels',
    label: 'สระไทย 32 รูป',
    note: 'แผ่นภาพสระ ใช้ติดผนังหรือทบทวน',
    cat: 'thai',
    sizeId: 'a4p',
    accent: '#0d9488',
    make: () =>
      design('a4p', [
        page(
          [
            txt('สระในภาษาไทย', 48, 40, 40, 714, { bold: true, color: '#0f766e', font: 'kanit', align: 'center' }),
            table(chunk(VOWELS, 4), 40, 140, 714, 860, { head: '#ffffff', size: 40, stroke: '#5eead4' }),
            txt('เครื่องหมาย - แทนตำแหน่งของพยัญชนะ', 20, 40, 1030, 714, { align: 'center', color: '#475569' }),
          ],
          { bg: { color: '#f0fdfa', color2: '#f0fdfa', angle: 180, pattern: 'none', pcolor: '#ffffff' }, border: { style: 'leaves', color: '#5eead4', w: 3 } }
        ),
      ]),
  },
  {
    id: 'th-spell',
    label: 'แจกลูกสะกดคำ',
    note: 'แยก พยัญชนะ สระ ตัวสะกด วรรณยุกต์',
    cat: 'thai',
    sizeId: 'a4p',
    accent: '#7c3aed',
    make: () =>
      design('a4p', [
        page([
          ...header('ภาษาไทย', 'แจกลูกสะกดคำ', '#ede9fe', '#6d28d9', 't-kokai'),
          nameLine(170),
          table([['คำ', 'พยัญชนะต้น', 'สระ', 'ตัวสะกด', 'วรรณยุกต์'], ['บ้าน', 'บ', '-า', 'น', '่'], ...blankRows(['', '', '', '', ''], 9).slice(1)], 40, 226, 714, 800, { head: '#ede9fe', size: 24 }),
        ]),
      ]),
  },
  {
    id: 'th-tones',
    label: 'ผันวรรณยุกต์',
    note: 'ตาราง สามัญ เอก โท ตรี จัตวา',
    cat: 'thai',
    sizeId: 'a4p',
    accent: '#ea580c',
    make: () =>
      design('a4p', [
        page([
          ...header('ภาษาไทย', 'ผันวรรณยุกต์', '#ffedd5', '#c2410c', 't-vowel'),
          nameLine(170),
          table([['คำ', 'สามัญ', 'เอก', 'โท', 'ตรี', 'จัตวา'], ['กา', 'กา', 'ก่า', 'ก้า', 'ก๊า', 'ก๋า'], ['ปา', '', '', '', '', ''], ['มา', '', '', '', '', ''], ['ขา', '', '', '', '', ''], ['นา', '', '', '', '', ''], ['ดู', '', '', '', '', ''], ['ยา', '', '', '', '', ''], ['', '', '', '', '', ''], ['', '', '', '', '', '']], 40, 226, 714, 780, { head: '#ffedd5', size: 28 }),
        ]),
      ]),
  },
  {
    id: 'th-sentence',
    label: 'แต่งประโยคจากคำ',
    note: '6 คำ พร้อมบรรทัดเขียน',
    cat: 'thai',
    sizeId: 'a4p',
    accent: '#2563eb',
    make: () => {
      const items: Item[] = [...header('ภาษาไทย', 'แต่งประโยคจากคำที่กำหนด', '#dbeafe', '#1d4ed8', 'pencil'), nameLine(170)];
      ['โรงเรียน', 'ช่วยเหลือ', 'สนุกสนาน', 'ครอบครัว', 'ต้นไม้', 'ขยัน'].forEach((w, i) => {
        const y = 226 + i * 144;
        items.push(txt(`${i + 1}. ${w}`, 26, 40, y, 220, { bold: true, color: '#1d4ed8', bg: '#eff6ff' }));
        items.push(lines(40, y + 48, 714, 90, 44));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'th-picture-story',
    label: 'เขียนเรื่องจากภาพ',
    note: 'กรอบภาพ + บรรทัดเขียนเรื่อง',
    cat: 'thai',
    sizeId: 'a4p',
    accent: '#16a34a',
    make: () =>
      design('a4p', [
        page([
          ...header('ภาษาไทย', 'เขียนเรื่องจากภาพ', '#dcfce7', '#15803d', 't-book'),
          nameLine(170),
          box('#f0fdf4', '#86efac', 40, 220, 714, 380, 'dash'),
          txt('วาดภาพ หรือวางรูปภาพตรงนี้', 24, 40, 390, 714, { align: 'center', color: '#16a34a' }),
          txt('ชื่อเรื่อง .......................................................................', 24, 40, 626, 714, { bold: true }),
          lines(40, 676, 714, 400, 44),
        ]),
      ]),
  },
  {
    id: 'th-rhyme',
    label: 'คำคล้องจอง',
    note: 'หาคำที่สัมผัสกัน 10 ข้อ',
    cat: 'thai',
    sizeId: 'a4p',
    accent: '#db2777',
    make: () => {
      const items: Item[] = [...header('ภาษาไทย', 'คำคล้องจอง', '#fce7f3', '#be185d', 'note'), nameLine(170), txt('เขียนคำที่คล้องจองกับคำที่กำหนดให้ 2 คำ', 22, 40, 214, 714, { italic: true, color: '#475569' })];
      ['มา', 'ปลา', 'ใจ', 'ดี', 'หมู', 'ลม', 'แมว', 'เรือ', 'ฟ้า', 'ต้น'].forEach((w, i) => {
        const y = 270 + i * 82;
        items.push(badge(i + 1, '#db2777', 40, y));
        items.push(txt(w, 28, 110, y, 120, { bold: true, color: '#be185d' }));
        items.push(arrow(230, y + 24, 300, y + 24, '#f472b6'));
        items.push(txt('..........................     ..........................', 26, 320, y + 2, 434));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'th-dictation',
    label: 'เขียนตามคำบอก',
    note: '20 ข้อ 2 คอลัมน์ ช่องคะแนน',
    cat: 'thai',
    sizeId: 'a4p',
    accent: '#0891b2',
    make: () => {
      const items: Item[] = [...header('ภาษาไทย', 'เขียนตามคำบอก', '#cffafe', '#0e7490', 't-hello'), nameLine(170), txt('ได้ ........ / 20 คะแนน', 24, 40, 214, 714, { bold: true, color: '#0e7490' })];
      Array.from({ length: 20 }, (_, i) => items.push(txt(`${i + 1}.  ...................................`, 26, i < 10 ? 50 : 420, 280 + (i % 10) * 80, 330)));
      return design('a4p', [page(items, { border: { style: 'line', color: '#67e8f9', w: 2 } })]);
    },
  },
  {
    id: 'th-reading-log',
    label: 'บันทึกการอ่าน',
    note: 'แนวนอน ผู้ปกครองลงชื่อได้',
    cat: 'thai',
    sizeId: 'a4l',
    accent: '#ca8a04',
    make: () =>
      design('a4l', [
        page([
          ...header('รักการอ่าน', 'บันทึกการอ่านของฉัน', '#fef3c7', '#a16207', 'book', 1123),
          nameLine(166, 1043),
          table(blankRows(['วันที่', 'ชื่อเรื่อง', 'จำนวนหน้า', 'สิ่งที่ได้จากเรื่อง', 'ผู้ปกครองลงชื่อ'], 10), 40, 214, 1043, 540, { head: '#fef3c7', size: 20 }),
        ]),
      ]),
  },
  {
    id: 'th-story-map',
    label: 'แผนภาพโครงเรื่อง',
    note: 'ตัวละคร ฉาก ปัญหา เหตุการณ์ ตอนจบ',
    cat: 'thai',
    sizeId: 'a4p',
    accent: '#7c3aed',
    make: () => {
      const items: Item[] = [...header('อ่านจับใจความ', 'แผนภาพโครงเรื่อง', '#ede9fe', '#6d28d9', 'book'), txt('ชื่อเรื่อง ..........................................................', 24, 40, 170, 714, { bold: true })];
      const parts: [string, string, number, number, number, number][] = [
        ['ตัวละคร', '#fde68a', 40, 220, 345, 250],
        ['ฉาก (ที่ไหน เมื่อไร)', '#bbf7d0', 409, 220, 345, 250],
        ['ปัญหา', '#fecaca', 40, 500, 714, 170],
        ['เหตุการณ์สำคัญ', '#bfdbfe', 40, 700, 714, 200],
        ['ตอนจบ', '#ddd6fe', 40, 930, 714, 160],
      ];
      parts.forEach(([t, c, x, y, w, h]) => {
        items.push(box(c, '#2a2350', x, y, w, h));
        items.push(label(t, '#2a2350', y + 10, x + 20, w - 40));
        items.push(at(makeWrite('lines', { gap: 40 }), x + 20, y + 50, w - 40, h - 60));
      });
      return design('a4p', [page(items)]);
    },
  },
  {
    id: 'th-my-dict',
    label: 'สมุดคำศัพท์ของฉัน',
    note: 'คำ ความหมาย แต่งประโยค',
    cat: 'thai',
    sizeId: 'a4p',
    accent: '#0284c7',
    make: () =>
      design('a4p', [
        page([
          ...header('ภาษาไทย', 'สมุดคำศัพท์ของฉัน', '#e0f2fe', '#0369a1', 't-book'),
          nameLine(170),
          table(blankRows(['คำ', 'ความหมาย', 'แต่งประโยค'], 9), 40, 226, 714, 820, { head: '#e0f2fe', size: 22 }),
        ]),
      ]),
  },
];
