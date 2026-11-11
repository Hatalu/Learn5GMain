/** กิจกรรมประกวดใบงาน: ตรรกะล้วน (ช่วงเวลา, จัดอันดับ, รางวัล) ใช้ทั้งเว็บและเซิร์ฟเวอร์ */

export interface Contest {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  /** วันสมาชิกฟรีของอันดับ 1, 2, 3 */
  prize_days: number[];
  /** วันสมาชิกฟรีของทุกคนที่ผลงานผ่านการอนุมัติ (0 = ไม่มี) */
  join_days: number;
  /** นับใจจากบัญชีที่สมัครหลังเริ่มกิจกรรมไหม */
  count_new: boolean;
  awarded_at: string | null;
  winners: Winner[] | null;
}

export interface Winner {
  rank: number;
  entry: string;
  owner: string;
  name: string;
  likes: number;
  days: number;
}

export interface RankRow {
  id: string;
  owner_id: string;
  created_at: string;
  like_count: number;
}

export type Phase = 'soon' | 'open' | 'ended' | 'awarded';

export function phaseOf(c: Pick<Contest, 'starts_at' | 'ends_at' | 'awarded_at'>, now = Date.now()): Phase {
  if (c.awarded_at) return 'awarded';
  if (now < new Date(c.starts_at).getTime()) return 'soon';
  if (now < new Date(c.ends_at).getTime()) return 'open';
  return 'ended';
}

/** ใจมากก่อน เท่ากัน = ส่งก่อนชนะ (แน่นอนทุกครั้ง) แล้วเทียบ id กันเสมอกันสนิท */
export function rankEntries<T extends RankRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.like_count - a.like_count || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

/** ผู้ชนะ 1 คนได้รางวัลเดียว (อันดับดีที่สุดของตัวเอง) ผลงานถัดไปของคนเดิมถูกข้าม · ต้องมีใจอย่างน้อย 1 */
export function pickWinners<T extends RankRow>(rows: T[], places: number): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const r of rankEntries(rows)) {
    if (out.length >= places) break;
    if (r.like_count < 1 || seen.has(r.owner_id)) continue;
    seen.add(r.owner_id);
    out.push(r);
  }
  return out;
}

export const MAX_ENTRIES = 3;
export const PLACE_LABEL = ['ชนะเลิศ', 'รองชนะเลิศอันดับ 1', 'รองชนะเลิศอันดับ 2'];

/** ตรวจค่าที่ Dev ตั้ง: วันรางวัล 3 ช่อง 0-365, วันร่วมสนุก 0-30 */
export function cleanPrizes(v: unknown): number[] {
  const a = Array.isArray(v) ? v : [];
  return [0, 1, 2].map((i) => Math.min(365, Math.max(0, Math.round(Number(a[i])) || 0)));
}

/** เวลาที่เหลือแบบอ่านง่าย */
export function leftText(ms: number): string {
  if (ms <= 0) return 'หมดเวลาแล้ว';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d} วัน ${h} ชม.`;
  if (h > 0) return `${h} ชม. ${m} นาที`;
  return `${Math.max(1, m)} นาที`;
}
