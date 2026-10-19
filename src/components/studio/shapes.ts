/** รูปทรงพื้นฐานของ Studio: path ในกรอบ 0-100 (ยืดตามกล่องด้วย preserveAspectRatio="none") */

const poly = (n: number, r = 50, rot = -90, cx = 50, cy = 50) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((rot + (360 / n) * i) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  });
const star = (n: number, inner: number) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 ? inner : 50;
    const a = ((-90 + (180 / n) * i) * Math.PI) / 180;
    return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
  });
const P = (pts: string[]) => `M${pts.join(' L')} Z`;

export interface ShapeDef {
  id: string;
  label: string;
  d: string;
  /** กล่องเริ่มต้น (ก x ส) */
  box?: [number, number];
}

export const SHAPES: ShapeDef[] = [
  { id: 'rect', label: 'สี่เหลี่ยม', d: 'M0,0 H100 V100 H0 Z', box: [240, 160] },
  { id: 'round', label: 'สี่เหลี่ยมมุมมน', d: 'M14,0 H86 Q100,0 100,14 V86 Q100,100 86,100 H14 Q0,100 0,86 V14 Q0,0 14,0 Z', box: [240, 160] },
  { id: 'pill', label: 'แคปซูล', d: 'M25,0 H75 A25,50 0 0 1 75,100 H25 A25,50 0 0 1 25,0 Z', box: [260, 90] },
  { id: 'circle', label: 'วงกลม', d: 'M50,0 A50,50 0 1 1 49.99,0 Z' },
  { id: 'triangle', label: 'สามเหลี่ยม', d: 'M50,0 L100,100 L0,100 Z' },
  { id: 'rtriangle', label: 'สามเหลี่ยมมุมฉาก', d: 'M0,0 L100,100 L0,100 Z' },
  { id: 'diamond', label: 'ข้าวหลามตัด', d: 'M50,0 L100,50 L50,100 L0,50 Z' },
  { id: 'pentagon', label: 'ห้าเหลี่ยม', d: P(poly(5)) },
  { id: 'hexagon', label: 'หกเหลี่ยม', d: P(poly(6, 50, 0)) },
  { id: 'octagon', label: 'แปดเหลี่ยม', d: P(poly(8, 50, 22.5)) },
  { id: 'parallel', label: 'สี่เหลี่ยมด้านขนาน', d: 'M22,0 H100 L78,100 H0 Z', box: [240, 140] },
  { id: 'trapezoid', label: 'สี่เหลี่ยมคางหมู', d: 'M22,0 H78 L100,100 H0 Z', box: [240, 150] },
  { id: 'star', label: 'ดาว', d: P(star(5, 21)) },
  { id: 'star4', label: 'ประกาย', d: 'M50,0 Q56,44 100,50 Q56,56 50,100 Q44,56 0,50 Q44,44 50,0 Z' },
  { id: 'burst', label: 'ป้ายระเบิด', d: P(star(12, 38)) },
  { id: 'badge', label: 'ตราดอกไม้', d: P(star(16, 44)) },
  { id: 'heart', label: 'หัวใจ', d: 'M50,92 C18,70 0,52 0,30 C0,12 14,2 28,2 C40,2 47,10 50,18 C53,10 60,2 72,2 C86,2 100,12 100,30 C100,52 82,70 50,92 Z' },
  { id: 'cloud', label: 'เมฆ', d: 'M24,88 C8,88 0,76 4,64 C-2,50 10,38 24,42 C24,22 44,12 58,22 C66,8 90,12 92,32 C102,40 102,62 90,70 C96,82 84,92 72,88 Z', box: [240, 170] },
  { id: 'bubble', label: 'กล่องคำพูด', d: 'M12,0 H88 Q100,0 100,12 V64 Q100,76 88,76 H40 L18,100 L22,76 H12 Q0,76 0,64 V12 Q0,0 12,0 Z', box: [260, 190] },
  { id: 'think', label: 'กล่องความคิด', d: 'M50,4 C72,4 92,14 92,34 C92,54 72,64 50,64 C28,64 8,54 8,34 C8,14 28,4 50,4 Z M22,70 a8,7 0 1 0 0.1,0 Z M10,86 a5,5 0 1 0 0.1,0 Z', box: [260, 200] },
  { id: 'banner', label: 'ริบบิ้นป้าย', d: 'M12,20 H88 V80 H12 Z M12,30 H0 L8,50 L0,70 H12 Z M88,30 H100 L92,50 L100,70 H88 Z', box: [320, 110] },
  { id: 'arrow', label: 'ลูกศร', d: 'M0,32 H60 V8 L100,50 L60,92 V68 H0 Z', box: [220, 140] },
  { id: 'darrow', label: 'ลูกศรสองทาง', d: 'M0,50 L30,10 V32 H70 V10 L100,50 L70,90 V68 H30 V90 Z', box: [240, 130] },
  { id: 'chevron', label: 'บั้ง', d: 'M0,0 H70 L100,50 L70,100 H0 L30,50 Z', box: [180, 130] },
  { id: 'plus', label: 'บวก', d: 'M36,0 H64 V36 H100 V64 H64 V100 H36 V64 H0 V36 H36 Z' },
  { id: 'cross', label: 'กากบาท', d: 'M20,0 L50,30 L80,0 L100,20 L70,50 L100,80 L80,100 L50,70 L20,100 L0,80 L30,50 L0,20 Z' },
  { id: 'moon', label: 'พระจันทร์เสี้ยว', d: 'M62,2 A48,48 0 1 0 98,64 A38,38 0 1 1 62,2 Z' },
  { id: 'drop', label: 'หยดน้ำ', d: 'M50,0 C64,24 86,44 86,64 C86,84 70,100 50,100 C30,100 14,84 14,64 C14,44 36,24 50,0 Z' },
  { id: 'ring', label: 'วงแหวน', d: 'M50,0 A50,50 0 1 1 49.99,0 Z M50,22 A28,28 0 1 0 50.01,22 Z' },
  { id: 'frame', label: 'กรอบสี่เหลี่ยม', d: 'M0,0 H100 V100 H0 Z M10,10 V90 H90 V10 Z', box: [260, 200] },
];

export const shapeById = (id: string) => SHAPES.find((s) => s.id === id) ?? SHAPES[0];
