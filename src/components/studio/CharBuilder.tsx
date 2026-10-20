'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, FlipHorizontal2, Loader2, Save, Shuffle, X } from 'lucide-react';
import {
  ACCS,
  BOTTOMS,
  BROWS,
  CLOTH_COLORS,
  EYES,
  FACES,
  HAIR_COLORS,
  HAIRS,
  LEGS,
  MOUTHS,
  POSES,
  SHOES,
  SKINS,
  SPECIES,
  TOPS,
  cleanLook,
  randomLook,
  toggleAcc,
  withSpecies,
  type CharLook,
  type Opt,
} from '@/lib/studio/char';
import { CharArt } from './CharArt';
import { Slider } from './ui';

type Tab = 'kind' | 'face' | 'hair' | 'outfit' | 'acc' | 'pose';
const TABS: { id: Tab; label: string }[] = [
  { id: 'kind', label: 'คน/สัตว์' },
  { id: 'face', label: 'ใบหน้า' },
  { id: 'hair', label: 'ทรงผม' },
  { id: 'outfit', label: 'เสื้อผ้า' },
  { id: 'acc', label: 'เครื่องประดับ' },
  { id: 'pose', label: 'ท่าทาง' },
];

/** หน้าต่างแต่งตัวละคร: แต่งหน้า ผม ชุด เครื่องประดับ จัดท่า แล้วใส่ลงหน้า/บันทึกเป็นตัวละครของฉัน */
export function CharBuilder({
  initial,
  initialFlip = false,
  mode,
  onDone,
  onSave,
  onClose,
}: {
  initial: CharLook;
  initialFlip?: boolean;
  mode: 'add' | 'edit';
  onDone: (look: CharLook, flip: boolean) => void;
  onSave?: (look: CharLook, name: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [look, setLook] = useState<CharLook>(() => cleanLook(initial));
  const [tab, setTab] = useState<Tab>('kind');
  const animal = look.species !== 'human';
  const [flip, setFlip] = useState(initialFlip);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState<'idle' | 'busy' | 'done'>('idle');
  const set = (p: Partial<CharLook>) => {
    setLook((l) => cleanLook({ ...l, ...p }));
    setSaving('idle');
  };

  const Grid = ({ opts, value, onPick, view, multi }: { opts: Opt[]; value: string | string[]; onPick: (id: string) => void; view: string; multi?: boolean }) => (
    <div className="cb-grid">
      {opts.map((o) => {
        const on = multi ? (value as string[]).includes(o.id) : value === o.id;
        return (
          <button key={o.id} type="button" className="cb-opt" data-on={on} onClick={() => onPick(o.id)} title={o.label} aria-pressed={on}>
            <CharArt look={previewFor(look, tab, o.id)} viewBox={view} className="w-full h-16" />
            <small>{o.label}</small>
          </button>
        );
      })}
    </div>
  );
  const Swatches = ({ list, value, onPick, label }: { list: string[]; value: string; onPick: (c: string) => void; label: string }) => (
    <div className="cb-row">
      <span className="cb-lbl">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {list.map((c) => (
          <button key={c} type="button" className="cb-sw" data-on={value === c} style={{ background: c }} onClick={() => onPick(c)} aria-label={`${label} ${c}`} />
        ))}
        <label className="cb-sw cb-sw-pick" title="เลือกสีเอง">
          <input type="color" value={value} onChange={(e) => onPick(e.target.value)} aria-label={`${label} เลือกเอง`} />
        </label>
      </div>
    </div>
  );
  const sub = (t: string) => <h4 className="cb-sub">{t}</h4>;

  return createPortal(
    <div className="cb-back" onMouseDown={onClose}>
      <div className="cb-box" role="dialog" aria-label="แต่งตัวละคร" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cb-head">
          <h2>แต่งตัวละคร</h2>
          <button type="button" className="st-tb" onClick={onClose} aria-label="ปิด">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="cb-main">
          <div className="cb-stage">
            <div className="cb-stage-art" style={{ transform: flip ? 'scaleX(-1)' : undefined }}>
              <CharArt look={look} className="w-full h-full" />
            </div>
            <div className="flex gap-2 justify-center">
              <button type="button" className="cb-ghost" onClick={() => (setLook(randomLook()), setSaving('idle'))}>
                <Shuffle className="w-4 h-4" /> สุ่ม
              </button>
              <button type="button" className="cb-ghost" onClick={() => setFlip(!flip)} data-on={flip}>
                <FlipHorizontal2 className="w-4 h-4" /> กลับด้าน
              </button>
            </div>
          </div>
          <div className="cb-side">
            <div className="cb-tabs" role="tablist">
              {TABS.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} data-on={tab === t.id} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="cb-body">
              {tab === 'kind' && (
                <>
                  <p className="st-note">เลือกเป็นคนหรือสัตว์ แล้วแต่งหน้า ชุด เครื่องประดับ และท่าทางได้เหมือนกันทุกตัว</p>
                  <div className="cb-grid">
                    {SPECIES.map((o) => (
                      <button key={o.id} type="button" className="cb-opt" data-on={look.species === o.id} onClick={() => (setLook(withSpecies(look, o.id)), setSaving('idle'))} title={o.label} aria-pressed={look.species === o.id}>
                        <CharArt look={withSpecies(look, o.id)} viewBox="6 0 188 180" className="w-full h-16" />
                        <small>{o.label}</small>
                      </button>
                    ))}
                  </div>
                  {animal && (
                    <>
                      <Swatches label="สีขน" list={[...new Set([SPECIES.find((x) => x.id === look.species)!.fur, ...SKINS.slice(0, 2), '#ffffff', '#f6b35e', '#c98a5a', '#a46a3f', '#2a2350', '#b9b6c8', '#7ed37a', '#ff8fb8', '#7cc6ff', '#a78bfa'])]} value={look.skin} onPick={(skin) => set({ skin })} />
                      <Swatches label={look.species === 'lion' ? 'สีแผงคอ' : look.species === 'tiger' ? 'สีลาย' : 'สีรอง'} list={[...new Set([SPECIES.find((x) => x.id === look.species)!.fur2, '#ffffff', '#fff3e0', '#ffc2d6', '#2a2350', '#b85a1f', '#ff9a3d', '#ffd166', '#7cc6ff', '#a78bfa'])]} value={look.fur2} onPick={(fur2) => set({ fur2 })} />
                    </>
                  )}
                </>
              )}
              {tab === 'face' && (
                <>
                  <Swatches label={animal ? 'สีขน' : 'สีผิว'} list={animal ? [look.skin, '#ffffff', '#f6b35e', '#c98a5a', '#a46a3f', '#2a2350', '#b9b6c8', '#7ed37a', '#ff8fb8', '#7cc6ff'] : SKINS} value={look.skin} onPick={(skin) => set({ skin })} />
                  {sub('รูปหน้า')}
                  <Grid opts={FACES} value={look.face} onPick={(face) => set({ face })} view="34 24 132 132" />
                  {sub('ดวงตา')}
                  <Grid opts={EYES} value={look.eyes} onPick={(eyes) => set({ eyes })} view="58 72 84 50" />
                  {sub('คิ้ว')}
                  <Grid opts={BROWS} value={look.brows} onPick={(brows) => set({ brows })} view="58 62 84 50" />
                  {sub('ปาก')}
                  <Grid opts={MOUTHS} value={look.mouth} onPick={(mouth) => set({ mouth })} view="72 100 56 38" />
                  <label className="st-check">
                    <input type="checkbox" checked={look.blush} onChange={(e) => set({ blush: e.target.checked })} />
                    <span>แก้มแดง</span>
                  </label>
                </>
              )}
              {tab === 'hair' && (
                <>
                  <Swatches label="สีผม" list={HAIR_COLORS} value={look.hairColor} onPick={(hairColor) => set({ hairColor })} />
                  {sub('ทรงผม')}
                  <Grid opts={HAIRS} value={look.hair} onPick={(hair) => set({ hair })} view="14 0 172 210" />
                </>
              )}
              {tab === 'outfit' && (
                <>
                  {sub('เสื้อ')}
                  <Grid opts={TOPS} value={look.top} onPick={(top) => set({ top })} view="30 120 140 150" />
                  <Swatches label="สีเสื้อ" list={CLOTH_COLORS} value={look.topColor} onPick={(topColor) => set({ topColor })} />
                  <Swatches label="สีรอง" list={CLOTH_COLORS} value={look.topColor2} onPick={(topColor2) => set({ topColor2 })} />
                  {look.top !== 'dress' && (
                    <>
                      {sub('กางเกง / กระโปรง')}
                      <Grid opts={BOTTOMS} value={look.bottom} onPick={(bottom) => set({ bottom })} view="40 190 120 110" />
                    </>
                  )}
                  <Swatches label={look.top === 'overall' ? 'สีเอี๊ยม' : 'สีกางเกง'} list={CLOTH_COLORS} value={look.bottomColor} onPick={(bottomColor) => set({ bottomColor })} />
                  {sub('รองเท้า')}
                  <Grid opts={SHOES} value={look.shoes} onPick={(shoes) => set({ shoes })} view="50 240 100 60" />
                  <Swatches label="สีรองเท้า" list={CLOTH_COLORS} value={look.shoesColor} onPick={(shoesColor) => set({ shoesColor })} />
                </>
              )}
              {tab === 'acc' && (
                <>
                  <p className="st-note">ใส่ได้หลายชิ้น (หมวก แว่น และของในมือ อย่างละ 1 ชิ้น)</p>
                  <Grid opts={ACCS} value={look.accs} multi onPick={(id) => set({ accs: toggleAcc(look.accs, id) })} view="0 0 200 300" />
                  <Swatches label="สีเครื่องประดับ" list={CLOTH_COLORS} value={look.accColor} onPick={(accColor) => set({ accColor })} />
                </>
              )}
              {tab === 'pose' && (
                <>
                  {sub('ท่าสำเร็จรูป')}
                  <div className="cb-grid">
                    {POSES.map((p) => (
                      <button key={p.id} type="button" className="cb-opt" onClick={() => set({ l: p.l, r: p.r, legs: p.legs })} title={p.label}>
                        <CharArt look={{ ...look, l: p.l, r: p.r, legs: p.legs }} className="w-full h-16" />
                        <small>{p.label}</small>
                      </button>
                    ))}
                  </div>
                  {sub('ท่าขา')}
                  <Grid opts={LEGS} value={look.legs} onPick={(legs) => set({ legs })} view="40 180 120 120" />
                  {sub('ปรับแขนเอง')}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <Slider label="แขนซ้าย ยกขึ้น" value={look.l.sh} min={-30} max={180} unit="°" onChange={(sh) => set({ l: { ...look.l, sh } })} />
                    <Slider label="แขนขวา ยกขึ้น" value={look.r.sh} min={-30} max={180} unit="°" onChange={(sh) => set({ r: { ...look.r, sh } })} />
                    <Slider label="แขนซ้าย งอศอก" value={look.l.el} min={-160} max={160} unit="°" onChange={(el) => set({ l: { ...look.l, el } })} />
                    <Slider label="แขนขวา งอศอก" value={look.r.el} min={-160} max={160} unit="°" onChange={(el) => set({ r: { ...look.r, el } })} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="cb-foot">
          {onSave && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input className="st-input flex-1 min-w-0" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="ตั้งชื่อตัวละคร เช่น ครูใจดี" aria-label="ชื่อตัวละคร" />
              <button
                type="button"
                className="cb-ghost"
                disabled={saving === 'busy'}
                onClick={async () => {
                  setSaving('busy');
                  setSaving((await onSave(look, name.trim() || 'ตัวละครของฉัน')) ? 'done' : 'idle');
                }}
              >
                {saving === 'busy' ? <Loader2 className="w-4 h-4 animate-spin" /> : saving === 'done' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saving === 'done' ? 'บันทึกแล้ว' : 'บันทึกเป็นตัวละครของฉัน'}
              </button>
            </div>
          )}
          <button type="button" className="cb-primary" onClick={() => onDone(look, flip)}>
            <Check className="w-5 h-5" /> {mode === 'edit' ? 'อัปเดตตัวละคร' : 'ใส่ลงหน้า'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** รูปตัวอย่างของตัวเลือก: ใช้ตัวละครปัจจุบันแต่เปลี่ยนเฉพาะค่าที่กำลังดู */
function previewFor(look: CharLook, tab: Tab, id: string): CharLook {
  if (tab === 'kind') return withSpecies(look, id);
  if (FACES.some((x) => x.id === id) && tab === 'face') return { ...look, face: id };
  if (EYES.some((x) => x.id === id)) return { ...look, eyes: id };
  if (BROWS.some((x) => x.id === id)) return { ...look, brows: id };
  if (MOUTHS.some((x) => x.id === id)) return { ...look, mouth: id };
  if (HAIRS.some((x) => x.id === id)) return { ...look, hair: id, accs: [] };
  if (TOPS.some((x) => x.id === id)) return { ...look, top: id };
  if (BOTTOMS.some((x) => x.id === id)) return { ...look, bottom: id, top: look.top === 'dress' ? 'tshirt' : look.top };
  if (SHOES.some((x) => x.id === id)) return { ...look, shoes: id };
  if (LEGS.some((x) => x.id === id)) return { ...look, legs: id };
  if (ACCS.some((x) => x.id === id)) return { ...look, accs: [id] };
  return look;
}

