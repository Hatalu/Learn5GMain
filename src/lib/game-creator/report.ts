/**
 * รายงานผลหลังเล่นเกม (ไม่มี DOM ใช้ได้ทั้งหน้าเว็บและ selftest)
 * ข้อมูลดิบมาจาก GET /api/live/rooms/[id]?report=1 (คำถาม + คำตอบทุกครั้งของผู้เล่น)
 * โหมดเกมที่คำถามวนซ้ำ ผู้เล่นคนเดียวตอบข้อเดิมได้หลายครั้ง จึงนับเป็น "ครั้งที่ตอบ"
 */

export interface ReportQ {
  i: number;
  label: string;
  /** คำตอบที่ถูก (ข้อความ) */
  answer: string;
  choices: { id: string; label: string }[];
}
export interface ReportA {
  p: string;
  q: number;
  c: boolean;
  picks: string[];
  ms: number;
}
export interface ReportPlayerIn {
  id: string;
  nickname: string;
  score: number;
}

export interface QRow {
  i: number;
  label: string;
  answer: string;
  attempts: number;
  correct: number;
  /** ร้อยละตอบถูก null = ยังไม่มีใครตอบ */
  pct: number | null;
  /** คำตอบผิดที่เลือกบ่อยที่สุด */
  wrongTop: { label: string; n: number } | null;
  avgSec: number | null;
}
export interface PRow {
  id: string;
  nickname: string;
  score: number;
  attempts: number;
  correct: number;
  pct: number | null;
  avgSec: number | null;
  /** ข้อที่ยังไม่เคยตอบถูก (เคยตอบแต่ผิดทุกครั้ง) */
  wrong: number[];
  /** ผลรายข้อ: '' = ไม่ได้ตอบ, 'ถูก', 'ผิด', หรือ 'ถูก 2/3' เมื่อตอบหลายครั้ง */
  cells: string[];
}
export interface Report {
  questions: QRow[];
  players: PRow[];
  summary: {
    players: number;
    answered: number;
    attempts: number;
    pct: number | null;
    hardest: QRow[];
    easiest: QRow[];
    needHelp: PRow[];
    stars: PRow[];
  };
}

const pctOf = (c: number, n: number) => (n ? Math.round((c / n) * 100) : null);
const sec = (ms: number, n: number) => (n ? Math.round(ms / n / 100) / 10 : null);

export function buildReport(qs: ReportQ[], players: ReportPlayerIn[], answers: ReportA[]): Report {
  const known = new Set(players.map((p) => p.id));
  const ans = answers.filter((a) => known.has(a.p) && a.q >= 0 && a.q < qs.length);

  const questions: QRow[] = qs.map((q) => {
    const mine = ans.filter((a) => a.q === q.i);
    const correct = mine.filter((a) => a.c).length;
    const wrongs = new Map<string, number>();
    for (const a of mine) {
      if (a.c) continue;
      const label = a.picks.length ? a.picks.map((id) => q.choices.find((c) => c.id === id)?.label ?? id).join(', ') : 'ไม่ได้ตอบ (หมดเวลา)';
      wrongs.set(label, (wrongs.get(label) || 0) + 1);
    }
    const top = [...wrongs].sort((a, b) => b[1] - a[1])[0];
    return {
      i: q.i,
      label: q.label,
      answer: q.answer,
      attempts: mine.length,
      correct,
      pct: pctOf(correct, mine.length),
      wrongTop: top ? { label: top[0], n: top[1] } : null,
      avgSec: sec(
        mine.reduce((s, a) => s + a.ms, 0),
        mine.length,
      ),
    };
  });

  const rows: PRow[] = players.map((p) => {
    const mine = ans.filter((a) => a.p === p.id);
    const correct = mine.filter((a) => a.c).length;
    const cells = qs.map((q) => {
      const m = mine.filter((a) => a.q === q.i);
      if (!m.length) return '';
      const c = m.filter((a) => a.c).length;
      if (m.length === 1) return c ? 'ถูก' : 'ผิด';
      return c ? `ถูก ${c}/${m.length}` : `ผิด ${m.length}/${m.length}`;
    });
    const wrong = qs.filter((q) => cells[q.i].startsWith('ผิด')).map((q) => q.i);
    return { id: p.id, nickname: p.nickname, score: p.score, attempts: mine.length, correct, pct: pctOf(correct, mine.length), avgSec: sec(mine.reduce((s, a) => s + a.ms, 0), mine.length), wrong, cells };
  });

  const done = questions.filter((q) => q.pct !== null);
  const byPct = [...done].sort((a, b) => a.pct! - b.pct! || b.attempts - a.attempts);
  const active = rows.filter((p) => p.attempts > 0);
  const correct = ans.filter((a) => a.c).length;
  return {
    questions,
    players: [...rows].sort((a, b) => b.score - a.score || (b.pct ?? -1) - (a.pct ?? -1)),
    summary: {
      players: players.length,
      answered: active.length,
      attempts: ans.length,
      pct: pctOf(correct, ans.length),
      hardest: byPct.slice(0, 3),
      easiest: [...byPct].reverse().slice(0, 3),
      needHelp: active.filter((p) => p.pct! < 50).sort((a, b) => a.pct! - b.pct!),
      stars: [...active].sort((a, b) => b.pct! - a.pct! || b.score - a.score).slice(0, 3),
    },
  };
}

/** ตารางสำหรับไฟล์ Excel: 3 แผ่น สรุปรายข้อ / รายบุคคล / ตารางถูกผิด */
export function reportSheets(r: Report, title: string) {
  const q = (i: number) => `ข้อ ${i + 1}`;
  return [
    {
      name: 'สรุปรายข้อ',
      widths: [8, 50, 28, 12, 10, 12, 30, 12],
      rows: [
        [title],
        ['ข้อ', 'คำถาม', 'คำตอบที่ถูก', 'ตอบทั้งหมด', 'ตอบถูก', 'ร้อยละถูก', 'คำตอบผิดที่พบบ่อย', 'เวลาเฉลี่ย (วิ)'],
        ...r.questions.map((x) => [q(x.i), x.label, x.answer, x.attempts, x.correct, x.pct ?? '-', x.wrongTop ? `${x.wrongTop.label} (${x.wrongTop.n})` : '-', x.avgSec ?? '-']),
      ],
    },
    {
      name: 'รายบุคคล',
      widths: [8, 22, 10, 12, 10, 12, 14, 40],
      rows: [
        [title],
        ['อันดับ', 'ชื่อผู้เล่น', 'คะแนน', 'ตอบทั้งหมด', 'ตอบถูก', 'ร้อยละถูก', 'เวลาเฉลี่ย (วิ)', 'ข้อที่ควรทบทวน'],
        ...r.players.map((p, i) => [i + 1, p.nickname, p.score, p.attempts, p.correct, p.pct ?? '-', p.avgSec ?? '-', p.wrong.map((w) => w + 1).join(', ') || '-']),
      ],
    },
    {
      name: 'ตารางถูกผิด',
      widths: [22, ...r.questions.map(() => 9)],
      rows: [['ชื่อผู้เล่น', ...r.questions.map((x) => q(x.i))], ...r.players.map((p) => [p.nickname, ...p.cells.map((c) => c || '-')])],
    },
  ];
}
