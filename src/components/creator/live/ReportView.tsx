'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Award, FileSpreadsheet, FileText, Loader2, Star, ThumbsUp } from 'lucide-react';
import type { PlayerPublic } from '@/lib/game-creator/types';
import { buildReport, reportSheets, type QRow, type Report, type ReportA, type ReportQ } from '@/lib/game-creator/report';

type Sub = 'all' | 'q' | 'p';
const W = 794;
const H = 1123;
const Q_PER_PAGE = 13;
const P_PER_PAGE = 19;

const level = (pct: number | null) => (pct === null ? 'none' : pct >= 70 ? 'good' : pct >= 40 ? 'mid' : 'low');
const pctText = (pct: number | null) => (pct === null ? '-' : `${pct}%`);
const fileName = (t: string) => `รายงานผล ${t}`.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').trim().slice(0, 70);

function Bar({ pct }: { pct: number | null }) {
  return (
    <span className="rp-bar" data-level={level(pct)}>
      <i style={{ width: `${pct ?? 0}%` }} />
    </span>
  );
}

function QItem({ q, wrong }: { q: QRow; wrong?: boolean }) {
  return (
    <li className="rp-qitem">
      <span className="rp-qnum">ข้อ {q.i + 1}</span>
      <span className="rp-qlabel">{q.label}</span>
      <b data-level={level(q.pct)}>{pctText(q.pct)}</b>
      {wrong && q.wrongTop && (
        <span className="rp-qhint">
          ตอบผิดบ่อย: {q.wrongTop.label} ({q.wrongTop.n} ครั้ง) · ที่ถูก: {q.answer}
        </span>
      )}
    </li>
  );
}

/** หน้าสรุปภาพรวม (ใช้ทั้งบนจอและหน้าแรกของ PDF) */
function Overview({ r }: { r: Report }) {
  const s = r.summary;
  return (
    <div className="rp-overview">
      <div className="rp-tiles">
        <span>
          <b>{s.players}</b>ผู้เล่น
        </span>
        <span>
          <b>{s.attempts}</b>ครั้งที่ตอบ
        </span>
        <span data-level={level(s.pct)}>
          <b>{pctText(s.pct)}</b>ตอบถูกเฉลี่ย
        </span>
        <span>
          <b>{r.questions.filter((q) => (q.pct ?? 100) < 50).length}</b>ข้อที่ควรสอนซ้ำ
        </span>
      </div>
      <div className="rp-cols">
        <section className="rp-box" data-kind="bad">
          <h4>
            <AlertTriangle className="w-4 h-4" /> ข้อที่ผิดเยอะที่สุด
          </h4>
          {s.hardest.length ? <ul>{s.hardest.map((q) => <QItem key={q.i} q={q} wrong />)}</ul> : <p>ยังไม่มีคำตอบ</p>}
        </section>
        <section className="rp-box" data-kind="good">
          <h4>
            <ThumbsUp className="w-4 h-4" /> ข้อที่ถูกเยอะที่สุด
          </h4>
          {s.easiest.length ? <ul>{s.easiest.map((q) => <QItem key={q.i} q={q} />)}</ul> : <p>ยังไม่มีคำตอบ</p>}
        </section>
        <section className="rp-box" data-kind="star">
          <h4>
            <Star className="w-4 h-4" /> ตอบถูกมากที่สุด
          </h4>
          {s.stars.length ? (
            <ul>
              {s.stars.map((p) => (
                <li key={p.id} className="rp-pitem">
                  <span>{p.nickname}</span>
                  <b>{pctText(p.pct)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p>ยังไม่มีคำตอบ</p>
          )}
        </section>
        <section className="rp-box" data-kind="help">
          <h4>
            <Award className="w-4 h-4" /> ควรช่วยเพิ่ม (ถูกไม่ถึงครึ่ง)
          </h4>
          {s.needHelp.length ? (
            <ul>
              {s.needHelp.slice(0, 8).map((p) => (
                <li key={p.id} className="rp-pitem">
                  <span>{p.nickname}</span>
                  <b>{pctText(p.pct)}</b>
                </li>
              ))}
              {s.needHelp.length > 8 && <li className="rp-more">และอีก {s.needHelp.length - 8} คน</li>}
            </ul>
          ) : (
            <p>ทุกคนตอบถูกตั้งแต่ครึ่งหนึ่งขึ้นไป</p>
          )}
        </section>
      </div>
    </div>
  );
}

function QTable({ rows }: { rows: QRow[] }) {
  return (
    <div className="rp-qtable">
      {rows.map((q) => (
        <div key={q.i} className="rp-qrow">
          <span className="rp-qnum">{q.i + 1}</span>
          <div className="rp-qmain">
            <span className="rp-qlabel">{q.label}</span>
            <span className="rp-qhint">
              ที่ถูก: {q.answer || '-'}
              {q.wrongTop ? ` · ผิดบ่อย: ${q.wrongTop.label} (${q.wrongTop.n})` : ''}
            </span>
          </div>
          <Bar pct={q.pct} />
          <b className="rp-qpct" data-level={level(q.pct)}>
            {pctText(q.pct)}
          </b>
          <span className="rp-qn">
            {q.correct}/{q.attempts}
          </span>
        </div>
      ))}
    </div>
  );
}

function PTable({ r, rows, start = 0, cells = true }: { r: Report; rows: Report['players']; start?: number; cells?: boolean }) {
  return (
    <div className="rp-ptable">
      {rows.map((p, k) => (
        <div key={p.id} className="rp-prow">
          <span className="rp-rank">{start + k + 1}</span>
          <span className="rp-pname">{p.nickname}</span>
          <span className="rp-pscore">{p.score}</span>
          <Bar pct={p.pct} />
          <b className="rp-qpct" data-level={level(p.pct)}>
            {pctText(p.pct)}
          </b>
          {cells ? (
            <span className="rp-cells">
              {p.cells.map((c, i) => (
                <i key={i} data-c={c ? (c.startsWith('ผิด') ? 'bad' : 'good') : 'none'} title={`ข้อ ${i + 1}: ${c || 'ไม่ได้ตอบ'}`}>
                  {i + 1}
                </i>
              ))}
            </span>
          ) : (
            <span className="rp-review">{p.wrong.length ? `ทบทวนข้อ ${p.wrong.map((w) => w + 1).join(', ')}` : r.questions.length ? 'ไม่มีข้อที่ผิดทุกครั้ง' : '-'}</span>
          )}
        </div>
      ))}
    </div>
  );
}

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/** หน้ากระดาษ A4 สำหรับส่งออก PDF (วาดนอกจอ โทนสว่างเสมอ) */
function PdfPages({ r, title, when, refs }: { r: Report; title: string; when: string; refs: React.MutableRefObject<HTMLDivElement[]> }) {
  const qPages = chunk(r.questions, Q_PER_PAGE);
  const pPages = chunk(r.players, P_PER_PAGE);
  const total = 1 + qPages.length + pPages.length;
  let n = 0;
  const page = (body: React.ReactNode, head: string) => {
    const i = n++;
    return (
      <div key={i} className="rp-page" ref={(el) => void (el && (refs.current[i] = el))} style={{ width: W, height: H }}>
        <header>
          <b>{head}</b>
          <span>
            {title} · {when}
          </span>
        </header>
        <div className="rp-page-body">{body}</div>
        <footer>
          หน้า {i + 1} / {total} · สร้างจาก Learn5G
        </footer>
      </div>
    );
  };
  return (
    <div className="rp-pdf">
      {page(<Overview r={r} />, 'รายงานผลหลังเล่นเกม: ภาพรวม')}
      {qPages.map((rows) => page(<QTable rows={rows} />, 'วิเคราะห์รายข้อ'))}
      {pPages.map((rows, k) => page(<PTable r={r} rows={rows} start={k * P_PER_PAGE} cells={false} />, 'วิเคราะห์รายบุคคล'))}
    </div>
  );
}

/** แท็บ "รายงานผล" บนจอเจ้าของห้องหลังจบเกม: ภาพรวม / รายข้อ / รายบุคคล + ดาวน์โหลด PDF, Excel */
export function ReportView({ roomId, title, players, round }: { roomId: string; title: string; players: PlayerPublic[]; round: number }) {
  const [raw, setRaw] = useState<{ questions: ReportQ[]; answers: ReportA[] } | null>(null);
  const [err, setErr] = useState('');
  const [sub, setSub] = useState<Sub>('all');
  const [busy, setBusy] = useState<'' | 'pdf' | 'xlsx'>('');
  const [pdfOn, setPdfOn] = useState(false);
  const pages = useRef<HTMLDivElement[]>([]);
  const [when] = useState(() => new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }));

  useEffect(() => {
    let alive = true;
    setRaw(null);
    fetch(`/api/live/rooms/${roomId}?report=1`, { cache: 'no-store' })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!alive) return;
        if (!ok || !j.report) setErr(j.error || 'โหลดรายงานไม่สำเร็จ');
        else setRaw(j.report);
      })
      .catch(() => alive && setErr('เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง'));
    return () => {
      alive = false;
    };
  }, [roomId, round]);

  const players2 = useMemo(() => players.map((p) => ({ id: p.id, nickname: p.nickname, score: p.score })), [players]);
  const r = useMemo(() => (raw ? buildReport(raw.questions, players2, raw.answers) : null), [raw, players2]);

  const excel = async () => {
    if (!r) return;
    setBusy('xlsx');
    try {
      const [{ buildXlsx }, { saveBlob }] = await Promise.all([import('@/lib/game-creator/xlsxWrite'), import('@/lib/studio/export')]);
      saveBlob(await buildXlsx(reportSheets(r, `${title} (${when})`)), `${fileName(title)}.xlsx`);
    } finally {
      setBusy('');
    }
  };
  const pdf = async () => {
    if (!r) return;
    setBusy('pdf');
    pages.current = [];
    setPdfOn(true);
    try {
      // รอให้หน้ากระดาษนอกจอวาดเสร็จก่อนถ่าย
      await new Promise((ok) => setTimeout(ok, 120));
      const { exportPdf } = await import('@/lib/studio/export');
      await exportPdf(pages.current.filter(Boolean), W, H, fileName(title));
    } catch {
      setErr('สร้าง PDF ไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setPdfOn(false);
      setBusy('');
    }
  };

  if (err && !r) return <p className="font-bold text-center py-6">{err}</p>;
  if (!r) return <Loader2 className="w-6 h-6 animate-spin mx-auto my-6" />;

  return (
    <div className="rp">
      <div className="rp-bar-top">
        <div className="l5g-tabs" style={{ margin: 0 }}>
          {(
            [
              ['all', 'ภาพรวม'],
              ['q', 'รายข้อ'],
              ['p', 'รายบุคคล'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className="l5g-tab" data-on={sub === id} onClick={() => setSub(id)}>
              {label}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <button type="button" className="l5g-btn l5g-btn-sm l5g-btn-violet" disabled={!!busy} onClick={pdf}>
          {busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF
        </button>
        <button type="button" className="l5g-btn l5g-btn-sm l5g-btn-mint" disabled={!!busy} onClick={excel}>
          {busy === 'xlsx' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Excel
        </button>
      </div>
      {err && <p className="rp-err">{err}</p>}
      {sub === 'all' && <Overview r={r} />}
      {sub === 'q' && <QTable rows={r.questions} />}
      {sub === 'p' && (r.players.length ? <PTable r={r} rows={r.players} /> : <p className="font-bold opacity-60 py-6 text-center">ยังไม่มีผู้เล่น</p>)}
      <p className="text-xs font-bold opacity-60 mt-3">โหมดเกมที่คำถามวนซ้ำ นับทุกครั้งที่ตอบ · สีแดง = ตอบถูกไม่ถึง 40% ควรสอนเพิ่ม</p>
      {pdfOn && typeof document !== 'undefined' && createPortal(<PdfPages r={r} title={title} when={when} refs={pages} />, document.body)}
    </div>
  );
}
