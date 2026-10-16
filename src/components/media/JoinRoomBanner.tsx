'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Ticket } from 'lucide-react';
import { CodeInput } from '@/components/creator/CodeInput';
import { Avatar } from '@/components/creator/Avatar';
import { LiveError, playerApi } from '@/lib/game-creator/live-client';
import { gsfx } from '@/lib/game-creator/gsound';
import '@/components/creator/creator.css';
import '@/components/creator/creator-pages.css';

type State = 'idle' | 'checking' | 'error' | 'ok';

const BUBBLE: Record<State, string> = {
  idle: 'มาเล่นด้วยกันนะ!',
  checking: 'กำลังหาห้อง…',
  error: 'ไม่พบเลขห้องนี้',
  ok: 'เจอแล้ว! ไปกันเลย',
};

function Sparkle({ style }: { style: React.CSSProperties }) {
  return (
    <svg className="l5g-jb-spark" style={style} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M12 0c.9 6.2 2.8 8.9 12 12-9.2 3.1-11.1 5.8-12 12-.9-6.2-2.8-8.9-12-12C9.2 8.9 11.1 6.2 12 0z" fill="currentColor" />
    </svg>
  );
}

/**
 * แบนเนอร์เข้าห้องเกมที่สมาชิกสร้าง (หน้าแรก ใต้เกมประจำวัน)
 * ตรวจเลขห้องกับเซิร์ฟเวอร์ก่อน เจอห้องแล้วจึงพาไปหน้า /play ไม่เจอก็บอกอยู่ในหน้าเดิม
 */
export function JoinRoomBanner() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [state, setState] = useState<State>('idle');
  const [msg, setMsg] = useState('');
  const [shake, setShake] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onCode = (v: string) => {
    setCode(v);
    if (state === 'error') {
      setState('idle');
      setMsg('');
    }
  };

  const go = async () => {
    if (code.length !== 6 || state === 'checking' || state === 'ok') return;
    gsfx.tap();
    setState('checking');
    setMsg('');
    try {
      await playerApi.check(code);
      setState('ok');
      gsfx.correct();
      timer.current = setTimeout(() => router.push(`/play?code=${code}`), 650);
    } catch (e) {
      const m = e instanceof LiveError ? e.message : '';
      setMsg(/ไม่พบห้อง/.test(m) || !m ? 'ไม่พบเลขห้องนี้ ลองเช็กเลขห้องอีกครั้งนะ' : m);
      setState('error');
      setShake((n) => n + 1);
      gsfx.wrong();
    }
  };

  const mood = state === 'error' ? 'sad' : state === 'ok' ? 'wow' : 'happy';

  return (
    <section className="l5g-jb" data-state={state} aria-label="เข้าร่วมเกมด้วยเลขห้อง">
      {/* ฉากหลัง */}
      <span className="l5g-jb-rays" aria-hidden="true" />
      <span className="l5g-jb-dots" aria-hidden="true" />
      <span className="l5g-jb-cloud l5g-jb-cloud-a" aria-hidden="true" />
      <span className="l5g-jb-cloud l5g-jb-cloud-b" aria-hidden="true" />
      <Sparkle style={{ left: '6%', top: '14%', color: '#fff7c2', animationDelay: '0s' }} />
      <Sparkle style={{ left: '40%', top: '10%', color: '#ffffff', animationDelay: '-1.1s' }} />
      <Sparkle style={{ left: '30%', bottom: '18%', color: '#ffe08a', animationDelay: '-0.6s' }} />
      <Sparkle style={{ right: '4%', top: '12%', color: '#ffffff', animationDelay: '-1.7s' }} />

      {/* ตัวการ์ตูนบนก้อนเมฆ */}
      <div className="l5g-jb-stage" aria-hidden="true">
        <div className="l5g-jb-bubble" key={state}>
          {BUBBLE[state]}
        </div>
        <div className="l5g-jb-crew">
          <span className="l5g-jb-pal l5g-jb-pal-1">
            <Avatar id={1} size={78} mood={mood} />
          </span>
          <span className="l5g-jb-pal l5g-jb-pal-2">
            <Avatar id={0} size={104} mood={mood} wave={state !== 'error'} />
          </span>
          <span className="l5g-jb-pal l5g-jb-pal-3">
            <Avatar id={4} size={78} mood={mood} />
          </span>
        </div>
        <span className="l5g-jb-platform" />
      </div>

      {/* บัตรเข้าห้อง */}
      <div className="l5g-jb-ticket">
        <span className="l5g-jb-notch l5g-jb-notch-l" aria-hidden="true" />
        <span className="l5g-jb-notch l5g-jb-notch-r" aria-hidden="true" />
        <span className="l5g-jb-tag">
          <Ticket className="w-4 h-4" /> บัตรเข้าห้องเกม
        </span>
        <h2 className="l5g-jb-title">
          เล่นเกมห้องสดด้วยกัน<span>ใส่เลขห้องได้เลย</span>
        </h2>
        <div className="l5g-jb-line" aria-hidden="true" />
        <div className="l5g-jb-form">
          <div key={shake} className={state === 'error' ? 'l5g-jb-shake' : undefined}>
            <CodeInput value={code} onChange={onCode} onEnter={go} size="md" />
          </div>
          <button type="button" className="l5g-btn l5g-btn-go l5g-jb-go" disabled={code.length !== 6 || state === 'checking' || state === 'ok'} onClick={go}>
            {state === 'checking' || state === 'ok' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" strokeWidth={3} />}
            เข้าห้อง
          </button>
        </div>
        <p className={`l5g-jb-msg ${state === 'error' ? 'l5g-jb-msg-err' : ''}`} role={state === 'error' ? 'alert' : undefined}>
          {state === 'error' ? msg : 'เลข 6 หลักจากหน้าจอเจ้าของห้อง ไม่ต้องเข้าสู่ระบบ'}
        </p>
      </div>
    </section>
  );
}
