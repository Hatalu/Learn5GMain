'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Confetti } from '@/components/fx/Confetti';
import { CODE_DONE_KEY, CODE_LEN, PENDING_CODE_KEY, isCode, normCode, readStore, redeemCode, writeStore } from '@/lib/redeem';
import { sfx } from '@/lib/sound';
import s from './redeem.module.css';

/**
 * ช่องกรอกโค้ดรับสมาชิกฟรีในหน้าหลัก
 * ยังไม่มีบัญชี: เก็บโค้ดไว้ พาไปสมัคร หน้าสมัครใช้โค้ดให้เอง (ล็อกอินกลับมาหน้านี้ก็ใช้ให้เองเช่นกัน)
 */
export function RedeemBox() {
  const { user, isLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [won, setWon] = useState(0);
  const [shake, setShake] = useState(0);
  const auto = useRef(false);

  const celebrate = (days: number) => {
    setWon(days);
    setCode('');
    setMsg('');
    sfx.cheer();
    refreshProfile();
  };

  const submit = async (raw: string) => {
    const c = normCode(raw);
    if (!isCode(c)) {
      setMsg(`โค้ดมี ${CODE_LEN} ตัวนะ`);
      setShake(Date.now());
      return;
    }
    if (!user) {
      writeStore(PENDING_CODE_KEY, c);
      sfx.pop();
      router.push('/signup?redirect=%2Fhome');
      return;
    }
    setBusy(true);
    setMsg('');
    const r = await redeemCode(c);
    setBusy(false);
    if (!r.login) writeStore(PENDING_CODE_KEY, null);
    if (r.days) celebrate(r.days);
    else {
      setMsg(r.error || 'ใช้โค้ดไม่สำเร็จ');
      setShake(Date.now());
    }
  };

  // กลับมาหน้าหลักหลังสมัคร/ล็อกอิน: ฉลองโค้ดที่ใช้ไปแล้ว หรือใช้โค้ดที่ค้างไว้ให้เอง
  useEffect(() => {
    if (isLoading || !user || auto.current) return;
    auto.current = true;
    const done = Number(readStore(CODE_DONE_KEY));
    if (done > 0) {
      writeStore(CODE_DONE_KEY, null);
      celebrate(done);
      return;
    }
    const pending = readStore(PENDING_CODE_KEY);
    if (pending) {
      setCode(pending);
      submit(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user]);

  return (
    <>
      <form
        className={s.box}
        data-shake={shake || undefined}
        key={shake}
        onSubmit={(e) => {
          e.preventDefault();
          submit(code);
        }}
      >
        <span className={s.icon} aria-hidden="true">
          <Gift className="w-5 h-5" />
        </span>
        <input
          className={s.input}
          value={code}
          onChange={(e) => setCode(normCode(e.target.value).slice(0, CODE_LEN))}
          placeholder="มีโค้ด? กรอกรับสมาชิกฟรี"
          aria-label="โค้ดรับสมาชิกฟรี"
          autoComplete="off"
          spellCheck={false}
          maxLength={CODE_LEN + 2}
        />
        <button type="submit" className={s.go} disabled={busy || !code}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'รับสิทธิ์'}
        </button>
        {msg && (
          <span className={s.msg} role="alert">
            {msg}
          </span>
        )}
      </form>

      {won > 0 && (
        <div className={s.overlay} role="dialog" aria-label="ได้รับสมาชิกฟรี" onClick={() => setWon(0)}>
          <Confetti count={90} />
          <div className={s.card} onClick={(e) => e.stopPropagation()}>
            <span className={s.burst} aria-hidden="true" />
            <span className={s.ticket} aria-hidden="true">
              <Gift className="w-12 h-12" strokeWidth={2.5} />
            </span>
            <p className={s.big}>+{won} วัน</p>
            <p className={s.sub}>ได้สมาชิกฟรีแล้ว! เล่นได้ทุกเกมเลย</p>
            <button type="button" className={s.ok} onClick={() => setWon(0)}>
              เย้! ไปเล่นกัน
            </button>
          </div>
        </div>
      )}
    </>
  );
}
