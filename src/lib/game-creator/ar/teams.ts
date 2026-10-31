/**
 * ทีมในเครื่องเดียว (กล้องตัวเดียว)
 * - 2 ทีม: จอแบ่งซ้าย-ขวา เล่นพร้อมกัน ฝั่งละคน
 * - 3-4 ทีม: ผลัดกันเล่นทีละทีมทีละข้อ (กล้องเดียวแยก 4 คนเรียงกันไม่แม่นพอ โดยเฉพาะบนมือถือ)
 * - หลายคนต่อทีม: สลับผู้ควบคุมยานทุกข้อของทีมนั้น (คนที่ 1 -> 2 -> ...)
 * - คะแนนของสมาชิกทุกคนรวมเป็นคะแนนทีม
 */
export const TEAM_NAMES = ['ทีมฟ้า', 'ทีมส้ม', 'ทีมเขียว', 'ทีมชมพู'];
export const TEAM_HEX = ['#2fb8ff', '#ff8a2f', '#3fd68a', '#ff6bb8'];

export type TeamMode = 'solo' | 'split' | 'relay';
export const teamMode = (teams: number): TeamMode => (teams === 2 ? 'split' : teams >= 3 ? 'relay' : 'solo');
export const teamCount = (teams: number) => (teams >= 2 ? teams : 1);
/** จำนวนฝั่งบนจอ (คนที่กล้องต้องจับพร้อมกัน) */
export const sidesOf = (teams: number) => (teams === 2 ? 2 : 1);

/** ทีมที่ฝั่ง s คุมในข้อ q */
export function teamOf(teams: number, side: number, q: number): number {
  const m = teamMode(teams);
  if (m === 'split') return side;
  if (m === 'relay') return q % teams;
  return 0;
}

/** ข้อนี้เป็นตาที่เท่าไรของทีมนั้น (ใช้หมุนผู้ควบคุม) */
export function turnOf(teams: number, q: number): number {
  return teamMode(teams) === 'relay' ? Math.floor(q / teams) : q;
}

/** ผู้ควบคุมยาน (ลำดับสมาชิก 0..members-1) ของทีมในข้อ q */
export const memberOf = (teams: number, q: number, members: number) => (members > 1 ? turnOf(teams, q) % members : 0);

/** อันดับ: คะแนนมากก่อน เท่ากันได้อันดับเดียวกัน */
export function ranks(scores: number[]): { team: number; score: number; rank: number }[] {
  const s = scores.map((score, team) => ({ team, score, rank: 0 })).sort((a, b) => b.score - a.score || a.team - b.team);
  s.forEach((r, i) => (r.rank = i && r.score === s[i - 1].score ? s[i - 1].rank : i + 1));
  return s;
}
