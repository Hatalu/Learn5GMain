'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, DoorOpen } from 'lucide-react';
import { CodeInput } from '@/components/creator/CodeInput';
import { Avatar } from '@/components/creator/Avatar';
import { ChoiceShape } from '@/components/creator/ChoiceShape';
import { gsfx } from '@/lib/game-creator/gsound';
import '@/components/creator/creator.css';
import '@/components/creator/creator-pages.css';

/** แบนเนอร์เข้าห้องเกมที่ครู/เพื่อนสร้าง ใส่เลข 6 หลักแล้วไปหน้า /play */
export function JoinRoomBanner() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const go = () => {
    if (code.length !== 6) return;
    gsfx.join();
    router.push(`/play?code=${code}`);
  };

  return (
    <section className="l5g-joinban" aria-label="เข้าร่วมเกมด้วยเลขห้อง">
      <span className="l5g-joinban-glow" aria-hidden="true" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="l5g-joinban-shape" style={{ ['--i' as string]: i }} aria-hidden="true">
          <ChoiceShape i={i} size={26} />
        </span>
      ))}

      <div className="l5g-joinban-crew" aria-hidden="true">
        {[1, 4, 9, 2].map((a, i) => (
          <span key={i} style={{ ['--i' as string]: i }}>
            <Avatar id={a} size={64} mood={i === 1 ? 'wow' : 'happy'} />
          </span>
        ))}
      </div>

      <div className="l5g-joinban-main">
        <span className="l5g-joinban-tag">
          <DoorOpen className="w-4 h-4" /> เข้าร่วมเกม
        </span>
        <h2 className="l5g-joinban-title">ครูสร้างเกมให้เล่น? ใส่เลขห้องเลย</h2>
        <p className="l5g-joinban-sub">เลข 6 หลักจากหน้าจอครู ไม่ต้องเข้าสู่ระบบ</p>
        <div className="l5g-joinban-form">
          <CodeInput value={code} onChange={setCode} onEnter={go} size="md" />
          <button type="button" className="l5g-btn l5g-btn-go" disabled={code.length !== 6} onClick={go}>
            เข้าห้อง <ArrowRight className="w-5 h-5" strokeWidth={3} />
          </button>
        </div>
      </div>
    </section>
  );
}

