'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Keyboard, RotateCcw, X } from 'lucide-react';
import { MATH_DEFAULTS, assignMath, comboLabel, comboOf, conflictOf, loadMathKeys, saveMathKeys, type MathKeys } from '@/lib/studio/keys';
import { KeyFace, MATH_TABS, type Key } from './MathPopover';

/**
 * ตั้งแป้นลัดของแม่แบบสมการเอง (แบบ MathType): กด "ตั้งปุ่ม" แล้วกดปุ่มบนแป้นพิมพ์
 * ถ้าชนกับแม่แบบอื่นให้เลือก ปิดของเดิมแล้วใช้อันนี้ / เปลี่ยนปุ่ม
 */
export function MathKeysDialog({ onClose, onChange }: { onClose: () => void; onChange?: (k: MathKeys) => void }) {
  const [keys, setKeys] = useState<MathKeys>(() => loadMathKeys());
  const [cap, setCap] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [clash, setClash] = useState<{ ins: string; combo: string; other: string } | null>(null);
  const [q, setQ] = useState('');

  // แม่แบบทั้งหมด (ไม่ซ้ำ) แยกตามแท็บ
  const groups = useMemo(() => {
    const seen = new Set<string>();
    return MATH_TABS.map((t) => ({ name: t.name, keys: t.keys.filter((k) => !seen.has(k.ins) && seen.add(k.ins)) })).filter((g) => g.keys.length);
  }, []);
  const byIns = useMemo(() => new Map(groups.flatMap((g) => g.keys.map((k) => [k.ins, k] as const))), [groups]);
  const nameOf = (ins: string) => {
    const k = byIns.get(ins);
    return k?.label || k?.show.replace(/\\/g, '') || ins;
  };

  const commit = (next: MathKeys) => {
    setKeys(next);
    saveMathKeys(next);
    onChange?.(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (clash) return;
      if (!cap) {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const combo = comboOf(e);
      if (!combo) return;
      if (combo === 'Escape') {
        setCap(null);
        setErr('');
        return;
      }
      const c = conflictOf(keys, combo, cap);
      if (c?.kind === 'reserved') {
        setErr(`ใช้ ${comboLabel(combo)} ไม่ได้: ${c.label} ลองปุ่มอื่น`);
        return;
      }
      if (c?.kind === 'math') {
        setErr('');
        setClash({ ins: cap, combo, other: c.ins });
        return;
      }
      commit(assignMath(keys, cap, combo));
      setCap(null);
      setErr('');
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cap, clash, keys]);

  const match = (k: Key) => !q.trim() || `${k.label || ''} ${k.show} ${keys[k.ins] ? comboLabel(keys[k.ins]) : ''}`.toLowerCase().includes(q.trim().toLowerCase());

  return createPortal(
    <div className="l5g-math-backdrop l5g-mk-bg" onMouseDown={(e) => e.target === e.currentTarget && !cap && onClose()}>
      <div className="l5g-math-sheet l5g-mk" role="dialog" aria-modal="true" aria-label="ตั้งแป้นลัดสมการ">
        <div className="l5g-math-head">
          <span className="l5g-fx-badge">
            <Keyboard className="w-5 h-5" />
          </span>
          <h3>แป้นลัดสมการ (แบบ MathType)</h3>
          <button type="button" className="l5g-icon-btn" onClick={onClose} aria-label="ปิด">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="l5g-mk-hint">กด &quot;ตั้งปุ่ม&quot; แล้วกดปุ่มบนแป้นพิมพ์ เช่น Ctrl + E · ใช้ได้ตอนเปิดหน้าต่างสมการ · บันทึกไว้ในเครื่องนี้</p>
        <div className="l5g-mk-tools">
          <input className="l5g-mk-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาแม่แบบ เช่น เศษส่วน" aria-label="ค้นหาแม่แบบ" />
          <button type="button" className="l5g-btn l5g-btn-ghost" onClick={() => commit({ ...MATH_DEFAULTS })}>
            <RotateCcw className="w-4 h-4" /> ค่าเริ่มต้น
          </button>
        </div>

        <div className="l5g-mk-list">
          {groups.map((g) => {
            const ks = g.keys.filter(match);
            if (!ks.length) return null;
            return (
              <section key={g.name}>
                <h4>{g.name}</h4>
                {ks.map((k) => {
                  const on = cap === k.ins;
                  return (
                    <div key={k.ins} className="l5g-mk-row" data-on={on}>
                      <span className="l5g-mk-face">
                        <KeyFace k={{ ...k, label: undefined }} />
                      </span>
                      <span className="l5g-mk-name">{k.label || 'สัญลักษณ์'}</span>
                      {on ? (
                        <span className="l5g-mk-wait">กดปุ่มที่ต้องการ… (Esc = ยกเลิก)</span>
                      ) : keys[k.ins] ? (
                        <kbd className="l5g-mk-kbd">{comboLabel(keys[k.ins])}</kbd>
                      ) : (
                        <span className="l5g-mk-none">ยังไม่ตั้ง</span>
                      )}
                      <button
                        type="button"
                        className="l5g-btn l5g-btn-ghost l5g-mk-set"
                        onClick={() => {
                          setErr('');
                          setCap(on ? null : k.ins);
                        }}
                      >
                        {on ? 'ยกเลิก' : 'ตั้งปุ่ม'}
                      </button>
                      {keys[k.ins] && !on && (
                        <button
                          type="button"
                          className="l5g-icon-btn"
                          aria-label={`ลบแป้นลัดของ ${k.label || k.show}`}
                          onClick={() => {
                            const next = { ...keys };
                            delete next[k.ins];
                            commit(next);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
        {err && (
          <p className="l5g-mk-err" role="alert">
            {err}
          </p>
        )}

        {clash && (
          <div className="l5g-mk-clash" role="alertdialog" aria-label="แป้นลัดซ้ำ">
            <p>
              <b>{comboLabel(clash.combo)}</b> ใช้กับ <b>{nameOf(clash.other)}</b> อยู่แล้ว
            </p>
            <div className="l5g-mk-clash-btns">
              <button
                type="button"
                className="l5g-btn l5g-btn-go"
                onClick={() => {
                  commit(assignMath(keys, clash.ins, clash.combo));
                  setClash(null);
                  setCap(null);
                }}
              >
                ปิดของ {nameOf(clash.other)} แล้วใช้กับอันนี้
              </button>
              <button
                type="button"
                className="l5g-btn l5g-btn-ghost"
                onClick={() => {
                  setClash(null);
                  setCap(clash.ins);
                }}
              >
                เปลี่ยนปุ่ม
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
