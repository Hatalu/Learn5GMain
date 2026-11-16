'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useMembership } from '@/components/membership/MembershipProvider';
import { DEFAULT_ENTS, TIERS, TIER_LABEL, entLines, tierPrice, type Ent, type EntTable, type Tier } from '@/lib/entitlements';
import { cn } from '@/lib/utils/cn';

type NumKey = 'sets' | 'designs';
const CAPS: { k: NumKey; label: string; unit: string }[] = [
  { k: 'sets', label: 'ชุดคำถาม/เกม', unit: 'ชุด' },
  { k: 'designs', label: 'สื่อการสอน', unit: 'ชิ้น' },
];
const FLAGS: { k: 'discover' | 'ai_game' | 'worksheet'; label: string }[] = [
  { k: 'discover', label: 'ใช้ผลงานในคลังครู (Discover)' },
  { k: 'ai_game', label: 'เกม AI' },
  { k: 'worksheet', label: 'ใบงาน AI' },
];

/** Dev > แพ็กเกจและสิทธิ์: ตั้งว่าแต่ละแพ็กเกจได้อะไร เท่าไร (ตาราง plan_entitlements) */
export function EntitlementsAdmin() {
  const toast = useToast();
  const { refresh } = useMembership();
  const [ents, setEnts] = useState<EntTable | null>(null);
  const [missing, setMissing] = useState(false);
  const [tier, setTier] = useState<Tier>('plus');
  const [draft, setDraft] = useState<Ent>(DEFAULT_ENTS.plus);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/dev/entitlements')
      .then((r) => r.json())
      .then((j) => {
        setEnts(j.ents || DEFAULT_ENTS);
        setMissing(!!j.missing);
      })
      .catch(() => setEnts(DEFAULT_ENTS));
  }, []);
  useEffect(() => {
    if (ents) setDraft(ents[tier]);
  }, [ents, tier]);

  const set = <K extends keyof Ent>(k: K, v: Ent[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = !!ents && JSON.stringify(ents[tier]) !== JSON.stringify(draft);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/dev/entitlements', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier, ...draft }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'บันทึกไม่สำเร็จ');
      setEnts(j.ents);
      refresh();
      toast.success(`บันทึกสิทธิ์ ${TIER_LABEL[tier]} แล้ว`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  if (!ents) return <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin" />;

  return (
    <div className="space-y-6">
      {missing && (
        <p className="flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ยังไม่ได้รัน migration 030 ระบบใช้ค่าเริ่มต้นอยู่ และบันทึกไม่ได้จนกว่าจะรัน
        </p>
      )}

      <div role="tablist" className="inline-grid grid-cols-4 gap-1 rounded-full border p-1">
        {TIERS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tier === t}
            onClick={() => setTier(t)}
            className={cn('h-9 rounded-full px-4 text-sm transition-colors', tier === t ? 'bg-foreground text-background' : 'ui-muted hover:text-foreground')}
          >
            {TIER_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="ui-card space-y-6 p-6">
          <div>
            <p className="font-display text-xl">{TIER_LABEL[tier]}</p>
            <p className="text-sm ui-muted">{tier === 'free' ? 'บัญชีที่ไม่มีแพ็กเกจ (นับชุด/สื่อตลอดอายุบัญชี ลบแล้วไม่คืน)' : `${tierPrice(tier)} บาท / 30 วัน (ราคาแก้ที่ src/lib/plans.ts)`}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {CAPS.map((c) => (
              <div key={c.k}>
                <label className="ui-label">{c.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    disabled={draft[c.k] === null}
                    value={draft[c.k] ?? ''}
                    onChange={(e) => set(c.k, Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                    className="ui-input flex-1"
                  />
                  <label className="flex shrink-0 items-center gap-1.5 text-sm">
                    <input type="checkbox" checked={draft[c.k] === null} onChange={(e) => set(c.k, e.target.checked ? null : 10)} className="accent-current" />
                    ไม่จำกัด
                  </label>
                </div>
              </div>
            ))}
            <div>
              <label className="ui-label">พื้นที่รูปและคลิป (MB)</label>
              <input type="number" min={0} max={2000} value={draft.upload_mb} onChange={(e) => set('upload_mb', Math.max(0, Math.min(2000, Math.floor(Number(e.target.value) || 0))))} className="ui-input" />
            </div>
          </div>

          <div className="space-y-2 border-t pt-5">
            {FLAGS.map((f) => (
              <label key={f.k} className="flex items-center justify-between gap-3 py-1 text-sm">
                {f.label}
                <input type="checkbox" checked={draft[f.k]} onChange={(e) => set(f.k, e.target.checked)} className="h-4 w-4 accent-current" />
              </label>
            ))}
          </div>

          <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
            <div>
              <label className="ui-label">สั่งทำนวัตกรรม (งาน/เดือน)</label>
              <input type="number" min={0} max={50} value={draft.innovation_jobs} onChange={(e) => set('innovation_jobs', Math.max(0, Math.min(50, Math.floor(Number(e.target.value) || 0))))} className="ui-input" />
              <p className="mt-1 text-xs ui-muted">0 = ไม่มีสิทธิ์สั่งทำ</p>
            </div>
            <div>
              <label className="ui-label">แก้ไขได้ (ครั้ง/งาน)</label>
              <input type="number" min={0} max={50} value={draft.innovation_revisions} onChange={(e) => set('innovation_revisions', Math.max(0, Math.min(50, Math.floor(Number(e.target.value) || 0))))} className="ui-input" />
            </div>
          </div>

          <div className="border-t pt-5">
            <label className="ui-label">ข้อความเพิ่มบนการ์ดแพ็กเกจ (บรรทัดละ 1 ข้อ)</label>
            <textarea rows={3} maxLength={1000} value={draft.extra} onChange={(e) => set('extra', e.target.value)} className="ui-input" placeholder="เช่น ตอบคำถามทางแชตภายใน 24 ชม." />
          </div>

          <div className="flex justify-end gap-2 border-t pt-5">
            <button type="button" disabled={!dirty || busy} onClick={() => setDraft(ents[tier])} className="ui-btn ui-btn-line">
              ยกเลิก
            </button>
            <button type="button" disabled={!dirty || busy || missing} onClick={save} className="ui-btn ui-btn-ink">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} บันทึก
            </button>
          </div>
        </div>

        <aside className="ui-card h-fit p-6">
          <p className="ui-kicker">ตัวอย่างบนการ์ด</p>
          <ul className="mt-4 space-y-2 text-sm">
            {entLines(tier, draft).map((l) => (
              <li key={l} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                {l}
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t pt-4 text-xs ui-muted">มีผลทันทีกับทุกบัญชีในแพ็กเกจนี้ (ภายใน 30 วินาที) บัญชีที่มีผลงานเกินค่าใหม่ ผลงานเดิมยังอยู่ แต่สร้างเพิ่มไม่ได้</p>
        </aside>
      </div>
    </div>
  );
}
