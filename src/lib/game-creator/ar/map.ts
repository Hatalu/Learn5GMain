/**
 * แผนที่จักรวาล: ดาวเคราะห์ 5 ดวง ดวงละ 3 ด่าน ยิ่งไกลยิ่งยาก
 * เพิ่มดาว/ด่าน = เพิ่มข้อมูลที่ PLANETS (id ห้ามเปลี่ยน เพราะใช้เก็บดาว/ชุดคำถามที่ครูผูกไว้ในเครื่อง)
 */
import type { BossId } from './boss';

export interface Stage {
  id: string;
  name: string;
  /** 0 ง่าย / 1 ปกติ / 2 ยาก */
  level: number;
  boss: BossId;
}
export interface Planet {
  id: string;
  name: string;
  color: string;
  ring: boolean;
  stages: Stage[];
}

const st = (id: string, name: string, level: number, boss: BossId): Stage => ({ id, name, level, boss });

export const PLANETS: Planet[] = [
  { id: 'p1', name: 'ดาวขนมหวาน', color: '#ff8fc7', ring: false, stages: [st('p1s1', 'ทุ่งลูกกวาด', 0, 'jelly'), st('p1s2', 'ทะเลเยลลี่', 0, 'jelly'), st('p1s3', 'รังจุ๊บจุ๊บ', 0, 'jelly')] },
  { id: 'p2', name: 'ดาวป่าเรืองแสง', color: '#3fe0a0', ring: true, stages: [st('p2s1', 'ป่าเห็ดไฟ', 0, 'jelly'), st('p2s2', 'ถ้ำหิ่งห้อย', 1, 'golem'), st('p2s3', 'ภูเขาหินร้อง', 1, 'golem')] },
  { id: 'p3', name: 'ดวงจันทร์คริสตัล', color: '#a98bff', ring: false, stages: [st('p3s1', 'หลุมคริสตัล', 1, 'golem'), st('p3s2', 'หุบเขาแสงจันทร์', 1, 'golem'), st('p3s3', 'บัลลังก์ยักษ์หิน', 1, 'golem')] },
  { id: 'p4', name: 'ดาวน้ำแข็งฟ้า', color: '#4fd1ff', ring: true, stages: [st('p4s1', 'ทุ่งหิมะดาว', 1, 'mecha'), st('p4s2', 'ธารน้ำแข็งร้องเพลง', 2, 'mecha'), st('p4s3', 'ฐานหุ่นยนต์', 2, 'mecha')] },
  { id: 'p5', name: 'ดาวแม่พระอาทิตย์', color: '#ffb02e', ring: true, stages: [st('p5s1', 'วงแหวนเปลวไฟ', 2, 'golem'), st('p5s2', 'สะพานดาวตก', 2, 'jelly'), st('p5s3', 'ยานแม่ตัวจริง', 2, 'mecha')] },
];

export const ALL_STAGES: Stage[] = PLANETS.flatMap((p) => p.stages);
export const stageById = (id: string) => ALL_STAGES.find((s) => s.id === id) || ALL_STAGES[0];
export const planetOf = (id: string) => PLANETS.find((p) => p.stages.some((s) => s.id === id)) || PLANETS[0];

/** ปลดล็อก: ด่านแรกเปิดเสมอ ด่านต่อไปเปิดเมื่อด่านก่อนหน้าได้ดาวอย่างน้อย 1 */
export function unlocked(stars: Record<string, number>, id: string, all = false): boolean {
  if (all) return true;
  const i = ALL_STAGES.findIndex((s) => s.id === id);
  if (i <= 0) return i === 0;
  return (stars[ALL_STAGES[i - 1].id] || 0) >= 1;
}

/** ด่านถัดไปที่ควรเล่น (ด่านแรกที่ยังไม่ได้ดาว และปลดล็อกแล้ว) */
export function nextStage(stars: Record<string, number>): Stage {
  return ALL_STAGES.find((s) => !(stars[s.id] > 0) && unlocked(stars, s.id)) || ALL_STAGES[ALL_STAGES.length - 1];
}
