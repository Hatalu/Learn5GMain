'use client';

import React from 'react';
import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowDownToLine,
  ArrowUpToLine,
  Bold,
  BringToFront,
  Copy,
  FlipHorizontal2,
  Italic,
  Layers,
  Lock,
  MoveHorizontal,
  Pencil,
  SendToBack,
  Sparkles,
  SquareDashed,
  Trash2,
  Underline,
  Unlock,
  Columns3,
  Rows3,
  Type,
  PaintBucket,
  RotateCw,
  Wand2,
  Hash,
} from 'lucide-react';
import { clampEdu, EDU_KINDS, FONT_IDS, type Cap, type Dash, type EduItem, type Item, type TableItem, type WriteKind } from '@/lib/studio/doc';
import { FONTS } from './fonts';
import { ColorGrid, ColorPop, Pop, Seg, Slider, Stepper } from './ui';
import type { Ctl } from './Editor';

const TYPE_LABEL: Record<Item['type'], string> = {
  text: 'ข้อความ',
  shape: 'รูปทรง',
  line: 'เส้น',
  image: 'รูปภาพ',
  sticker: 'สติกเกอร์',
  table: 'ตาราง',
  write: 'บรรทัดใบงาน',
  edu: 'สื่อการสอน',
  char: 'ตัวละคร',
};

const DASHES: { id: Dash; label: React.ReactNode; title: string }[] = [
  { id: 'solid', label: <span className="st-dash" />, title: 'เส้นทึบ' },
  { id: 'dash', label: <span className="st-dash" data-k="dash" />, title: 'เส้นประ' },
  { id: 'dot', label: <span className="st-dash" data-k="dot" />, title: 'เส้นจุด' },
];
const capIcon = (k: Cap) => (
  <svg viewBox="0 0 24 12" className="w-6 h-3">
    <line x1="2" x2={k === 'none' ? 22 : 16} y1="6" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {k === 'arrow' && <path d="M23,6 L15,1.5 L15,10.5 Z" fill="currentColor" />}
    {k === 'dot' && <circle cx="19" cy="6" r="4" fill="currentColor" />}
  </svg>
);
const CAPS: { id: Cap; label: React.ReactNode; title: string }[] = [
  { id: 'none', label: capIcon('none'), title: 'ไม่มีหัว' },
  { id: 'arrow', label: capIcon('arrow'), title: 'หัวลูกศร' },
  { id: 'dot', label: capIcon('dot'), title: 'หัวจุด' },
];

export function Inspector({ ctl }: { ctl: Ctl }) {
  const it = ctl.sel;
  if (!it) {
    return (
      <div className="st-insp st-insp-empty">
        <span>เลือกชิ้นงานบนหน้าเพื่อปรับแต่ง หรือเลือกเครื่องมือด้านซ้ายเพื่อเพิ่มของใหม่</span>
      </div>
    );
  }
  const up = (patch: Partial<Item>, key?: string) => ctl.update(it.id, patch, key);

  return (
    <div className="st-insp" role="toolbar" aria-label={`ตั้งค่า${TYPE_LABEL[it.type]}`}>
      <span className="st-insp-tag">{TYPE_LABEL[it.type]}</span>
      {it.locked ? (
        <span className="text-sm font-bold opacity-75 px-1">ล็อกอยู่ ปลดล็อกเพื่อแก้ไข</span>
      ) : (
        <>
          {it.type === 'text' && (
            <>
              <button type="button" className="st-tb" onClick={() => ctl.editText(it.id)} title="แก้ข้อความ (ดับเบิลคลิกก็ได้)" aria-label="แก้ข้อความ">
                <Pencil className="w-4 h-4" />
              </button>
              <FontPick value={it.font} onChange={(font) => up({ font })} />
              <Stepper label="ขนาดตัวอักษร" value={it.size} min={6} max={400} step={2} onChange={(size) => up({ size }, 'size')} />
              <ColorPop title="สีตัวอักษร" value={it.color} onChange={(color) => up({ color }, 'color')} icon={<Type className="w-4 h-4" />} />
              <button type="button" className="st-tb" data-on={it.bold} onClick={() => up({ bold: !it.bold })} title="ตัวหนา" aria-label="ตัวหนา">
                <Bold className="w-4 h-4" />
              </button>
              <button type="button" className="st-tb" data-on={it.italic} onClick={() => up({ italic: !it.italic })} title="ตัวเอียง" aria-label="ตัวเอียง">
                <Italic className="w-4 h-4" />
              </button>
              <button type="button" className="st-tb" data-on={it.underline} onClick={() => up({ underline: !it.underline })} title="ขีดเส้นใต้" aria-label="ขีดเส้นใต้">
                <Underline className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="st-tb"
                onClick={() => up({ align: it.align === 'left' ? 'center' : it.align === 'center' ? 'right' : 'left' })}
                title="จัดข้อความ ชิดซ้าย/กึ่งกลาง/ชิดขวา"
                aria-label="จัดข้อความ"
              >
                {it.align === 'left' ? <AlignLeft className="w-4 h-4" /> : it.align === 'right' ? <AlignRight className="w-4 h-4" /> : <AlignCenter className="w-4 h-4" />}
              </button>
              <Pop title="ระยะบรรทัดและตัวอักษร" button={<MoveHorizontal className="w-4 h-4" />}>
                <Slider label="ระยะบรรทัด" value={it.lh} min={0.8} max={3} step={0.05} onChange={(lh) => up({ lh }, 'lh')} />
                <Slider label="ระยะห่างตัวอักษร" value={it.ls} min={-5} max={40} step={0.5} unit="px" onChange={(ls) => up({ ls }, 'ls')} />
              </Pop>
              <Pop title="เอฟเฟกต์ข้อความ" button={<Sparkles className="w-4 h-4" />} width={268} active={!!(it.bg || it.strokeW || it.shadow)}>
                <p className="text-xs font-bold mb-1">พื้นหลังป้าย</p>
                <ColorGrid value={it.bg} onChange={(bg) => up({ bg }, 'bg')} allowNone />
                <p className="text-xs font-bold mb-1 mt-3">เส้นขอบตัวอักษร</p>
                <ColorGrid value={it.stroke} onChange={(stroke) => up({ stroke, strokeW: stroke ? it.strokeW || 3 : 0 }, 'stroke')} allowNone />
                {it.stroke && <Slider label="ความหนาขอบ" value={it.strokeW} min={0} max={20} step={0.5} onChange={(strokeW) => up({ strokeW }, 'sw')} />}
                <label className="st-check mt-2">
                  <input type="checkbox" checked={it.shadow} onChange={(e) => up({ shadow: e.target.checked })} />
                  <span>เงาทึบ</span>
                </label>
              </Pop>
            </>
          )}

          {it.type === 'shape' && (
            <>
              <ColorPop title="สีพื้น" value={it.fill} onChange={(fill) => up({ fill }, 'fill')} allowNone icon={<PaintBucket className="w-4 h-4" />} />
              <StrokeControls it={it} up={up} />
            </>
          )}

          {it.type === 'line' && (
            <>
              <ColorPop title="สีเส้น" value={it.stroke} onChange={(stroke) => up({ stroke }, 'stroke')} />
              <Stepper label="ความหนาเส้น" value={it.sw} min={1} max={60} onChange={(sw) => up({ sw, h: Math.max(24, sw * 4) }, 'sw')} />
              <Seg value={it.dash} options={DASHES} onChange={(dash) => up({ dash })} />
              <Pop title="หัวเส้น" button={<span className="text-xs font-black">หัว</span>} width={220}>
                <p className="text-xs font-bold mb-1">ต้นเส้น</p>
                <Seg value={it.start} options={CAPS} onChange={(start) => up({ start })} />
                <p className="text-xs font-bold mb-1 mt-2">ปลายเส้น</p>
                <Seg value={it.end} options={CAPS} onChange={(end) => up({ end })} />
              </Pop>
            </>
          )}

          {it.type === 'image' && (
            <>
              <Pop title="มุมโค้งและขอบรูป" button={<SquareDashed className="w-4 h-4" />} width={268}>
                <Slider label="ความโค้งมุม" value={it.radius} min={0} max={50} onChange={(radius) => up({ radius }, 'r')} unit="%" />
                <Slider label="ความหนาขอบ" value={it.bw} min={0} max={40} onChange={(bw) => up({ bw }, 'bw')} />
                {it.bw > 0 && <ColorGrid value={it.border} onChange={(border) => up({ border: border || '#ffffff' }, 'bc')} />}
              </Pop>
              <button type="button" className="st-tb" data-on={it.flip} onClick={() => up({ flip: !it.flip })} title="กลับด้านซ้าย-ขวา" aria-label="กลับด้าน">
                <FlipHorizontal2 className="w-4 h-4" />
              </button>
            </>
          )}

          {it.type === 'edu' && <EduControls it={it} up={up} />}

          {it.type === 'char' && (
            <>
              <button type="button" className="st-tb st-tb-text" onClick={() => ctl.openChar(it.look, it.id)} title="แต่งตัวละคร (ดับเบิลคลิกก็ได้)">
                <Wand2 className="w-4 h-4" /> แต่งตัว/จัดท่า
              </button>
              <button type="button" className="st-tb" data-on={it.flip} onClick={() => up({ flip: !it.flip })} title="กลับด้านซ้าย-ขวา" aria-label="กลับด้าน">
                <FlipHorizontal2 className="w-4 h-4" />
              </button>
            </>
          )}

          {it.type === 'sticker' && (
            <button type="button" className="st-tb" data-on={it.flip} onClick={() => up({ flip: !it.flip })} title="กลับด้านซ้าย-ขวา" aria-label="กลับด้าน">
              <FlipHorizontal2 className="w-4 h-4" />
            </button>
          )}

          {it.type === 'table' && <TableControls it={it} up={up} />}

          {it.type === 'write' && (
            <>
              <select className="st-select" value={it.kind} onChange={(e) => up({ kind: e.target.value as WriteKind })} aria-label="แบบบรรทัด">
                <option value="lines">บรรทัดเขียน</option>
                <option value="dotted">จุดไข่ปลา</option>
                <option value="four">4 เส้น</option>
                <option value="grid">ตาราง</option>
                <option value="dots">จุดตาราง</option>
                <option value="box">กรอบคำตอบ</option>
              </select>
              {it.kind !== 'box' && <Stepper label="ระยะห่างบรรทัด" value={it.gap} min={12} max={200} step={2} onChange={(gap) => up({ gap }, 'gap')} />}
              <ColorPop title="สีเส้น" value={it.stroke} onChange={(stroke) => up({ stroke }, 'stroke')} />
              <Stepper label="ความหนาเส้น" value={it.sw} min={1} max={12} onChange={(sw) => up({ sw }, 'sw')} />
            </>
          )}

          <span className="st-insp-sep" />
          <Pop title="ตำแหน่งบนหน้า" button={<AlignHorizontalJustifyCenter className="w-4 h-4" />} width={236}>
            {(close) => (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ['l', <AlignHorizontalJustifyStart key="l" className="w-4 h-4" />, 'ชิดซ้าย'],
                      ['c', <AlignHorizontalJustifyCenter key="c" className="w-4 h-4" />, 'กึ่งกลางแนวนอน'],
                      ['r', <AlignHorizontalJustifyEnd key="r" className="w-4 h-4" />, 'ชิดขวา'],
                      ['t', <AlignVerticalJustifyStart key="t" className="w-4 h-4" />, 'ชิดบน'],
                      ['m', <AlignVerticalJustifyCenter key="m" className="w-4 h-4" />, 'กึ่งกลางแนวตั้ง'],
                      ['b', <AlignVerticalJustifyEnd key="b" className="w-4 h-4" />, 'ชิดล่าง'],
                    ] as const
                  ).map(([k, ic, label]) => (
                    <button key={k} type="button" className="st-mini" onClick={() => (ctl.alignTo(it.id, k), close())} title={label}>
                      {ic}
                      <small>{label}</small>
                    </button>
                  ))}
                </div>
                <Slider label="หมุน" value={it.rot} min={-180} max={180} unit="°" onChange={(rot) => up({ rot }, 'rot')} />
                <button type="button" className="st-link" onClick={() => up({ rot: 0 })}>
                  <RotateCw className="w-3.5 h-3.5 inline" /> ตั้งตรง
                </button>
              </>
            )}
          </Pop>
          <Pop title="ลำดับชั้นและความโปร่ง" button={<Layers className="w-4 h-4" />} width={236}>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" className="st-mini" onClick={() => ctl.order(it.id, 'front')}>
                <BringToFront className="w-4 h-4" />
                <small>หน้าสุด</small>
              </button>
              <button type="button" className="st-mini" onClick={() => ctl.order(it.id, 'back')}>
                <SendToBack className="w-4 h-4" />
                <small>หลังสุด</small>
              </button>
              <button type="button" className="st-mini" onClick={() => ctl.order(it.id, 'up')}>
                <ArrowUpToLine className="w-4 h-4" />
                <small>ขึ้น 1 ชั้น</small>
              </button>
              <button type="button" className="st-mini" onClick={() => ctl.order(it.id, 'down')}>
                <ArrowDownToLine className="w-4 h-4" />
                <small>ลง 1 ชั้น</small>
              </button>
            </div>
            <Slider label="ความทึบ" value={Math.round(it.opacity * 100)} min={5} max={100} unit="%" onChange={(v) => up({ opacity: v / 100 }, 'op')} />
          </Pop>
          <button type="button" className="st-tb" onClick={() => ctl.duplicate(it.id)} title="ทำสำเนา (Ctrl+D)" aria-label="ทำสำเนา">
            <Copy className="w-4 h-4" />
          </button>
        </>
      )}
      <button type="button" className="st-tb" data-on={it.locked} onClick={() => up({ locked: !it.locked })} title={it.locked ? 'ปลดล็อก' : 'ล็อกไม่ให้ขยับ'} aria-label={it.locked ? 'ปลดล็อก' : 'ล็อก'}>
        {it.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
      </button>
      <button type="button" className="st-tb st-danger" onClick={() => ctl.remove(it.id)} title="ลบ (Delete)" aria-label="ลบ">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function FontPick({ value, onChange }: { value: (typeof FONT_IDS)[number]; onChange: (f: (typeof FONT_IDS)[number]) => void }) {
  return (
    <Pop title="ฟอนต์" width={240} className="st-font-btn" button={<span style={{ fontFamily: FONTS[value].family }}>{FONTS[value].label}</span>}>
      {(close) => (
        <div className="st-fontlist">
          {FONT_IDS.map((f) => (
            <button key={f} type="button" data-on={f === value} onClick={() => (onChange(f), close())}>
              <span style={{ fontFamily: FONTS[f].family, fontSize: 20 }}>{FONTS[f].label} กขค</span>
              <small>{FONTS[f].note}</small>
            </button>
          ))}
        </div>
      )}
    </Pop>
  );
}

function StrokeControls({ it, up }: { it: Extract<Item, { type: 'shape' }>; up: (p: Partial<Item>, k?: string) => void }) {
  return (
    <Pop title="เส้นขอบ" button={<span className="st-colorbtn"><SquareDashed className="w-4 h-4" /><i style={{ background: it.sw ? it.stroke : 'transparent', borderStyle: it.sw ? 'solid' : 'dashed' }} /></span>} width={268} active={it.sw > 0}>
      <Slider label="ความหนาขอบ" value={it.sw} min={0} max={30} onChange={(sw) => up({ sw }, 'sw')} />
      {it.sw > 0 && (
        <>
          <Seg value={it.dash} options={DASHES} onChange={(dash) => up({ dash })} />
          <div className="mt-2">
            <ColorGrid value={it.stroke} onChange={(stroke) => up({ stroke: stroke || '#2a2350' }, 'stroke')} />
          </div>
        </>
      )}
    </Pop>
  );
}

function TableControls({ it, up }: { it: TableItem; up: (p: Partial<Item>, k?: string) => void }) {
  const rows = it.cells.length;
  const cols = it.cells[0]?.length || 1;
  const setRows = (n: number) => {
    n = Math.max(1, Math.min(30, n));
    const cells = n > rows ? [...it.cells, ...Array.from({ length: n - rows }, () => Array(cols).fill(''))] : it.cells.slice(0, n);
    up({ cells, h: (it.h / rows) * n } as Partial<Item>);
  };
  const setCols = (n: number) => {
    n = Math.max(1, Math.min(12, n));
    const cells = it.cells.map((r) => (n > cols ? [...r, ...Array(n - cols).fill('')] : r.slice(0, n)));
    up({ cells, w: (it.w / cols) * n } as Partial<Item>);
  };
  return (
    <>
      <span className="st-hint">ดับเบิลคลิกช่องเพื่อพิมพ์</span>
      <span className="st-lbl">
        <Rows3 className="w-4 h-4" />
      </span>
      <Stepper label="จำนวนแถว" value={rows} min={1} max={30} onChange={setRows} />
      <span className="st-lbl">
        <Columns3 className="w-4 h-4" />
      </span>
      <Stepper label="จำนวนคอลัมน์" value={cols} min={1} max={12} onChange={setCols} />
      <FontPick value={it.font} onChange={(font) => up({ font })} />
      <Stepper label="ขนาดตัวอักษร" value={it.size} min={6} max={120} step={2} onChange={(size) => up({ size }, 'size')} />
      <ColorPop title="สีตัวอักษร" value={it.color} onChange={(color) => up({ color }, 'color')} icon={<Type className="w-4 h-4" />} />
      <ColorPop title="สีแถวหัวตาราง" value={it.head} onChange={(head) => up({ head }, 'head')} allowNone icon={<PaintBucket className="w-4 h-4" />} />
      <Pop title="เส้นตาราง" button={<SquareDashed className="w-4 h-4" />} width={268}>
        <Slider label="ความหนาเส้น" value={it.sw} min={0} max={12} step={0.5} onChange={(sw) => up({ sw }, 'sw')} />
        <ColorGrid value={it.stroke} onChange={(stroke) => up({ stroke: stroke || '#2a2350' }, 'stroke')} />
      </Pop>
      <button
        type="button"
        className="st-tb"
        onClick={() => up({ align: it.align === 'left' ? 'center' : it.align === 'center' ? 'right' : 'left' })}
        title="จัดข้อความในช่อง"
        aria-label="จัดข้อความในช่อง"
      >
        {it.align === 'left' ? <AlignLeft className="w-4 h-4" /> : it.align === 'right' ? <AlignRight className="w-4 h-4" /> : <AlignCenter className="w-4 h-4" />}
      </button>
    </>
  );
}

function EduControls({ it, up }: { it: EduItem; up: (p: Partial<Item>, k?: string) => void }) {
  const set = (a: number, b: number, c: number, key: string) => {
    const [na, nb, nc] = clampEdu(it.kind, a, b, c);
    up({ a: na, b: nb, c: nc } as Partial<Item>, key);
  };
  const label = EDU_KINDS.find((k) => k.kind === it.kind)?.label;
  const lbl = (t: string) => <span className="st-hint">{t}</span>;
  const labelsBtn = (
    <button type="button" className="st-tb" data-on={it.labels} onClick={() => up({ labels: !it.labels } as Partial<Item>)} title="แสดงตัวเลข" aria-label="แสดงตัวเลข">
      <Hash className="w-4 h-4" />
    </button>
  );
  return (
    <>
      <span className="st-hint">{label}</span>
      {it.kind === 'numberline' && (
        <>
          {lbl('เริ่ม')}
          <Stepper label="เริ่มที่" value={it.a} min={-1000} max={1000} onChange={(v) => set(v, Math.max(it.b, v + 1), it.c, 'a')} />
          {lbl('ถึง')}
          <Stepper label="ถึง" value={it.b} min={-999} max={2000} onChange={(v) => set(it.a, v, it.c, 'b')} />
          {lbl('ทีละ')}
          <Stepper label="ทีละ" value={it.c} min={1} max={1000} onChange={(v) => set(it.a, it.b, v, 'c')} />
          {labelsBtn}
        </>
      )}
      {it.kind === 'clock' && (
        <>
          {lbl('ชั่วโมง')}
          <Stepper label="ชั่วโมง" value={it.a} min={1} max={12} onChange={(v) => set(v, it.b, 0, 'a')} />
          {lbl('นาที')}
          <Stepper label="นาที" value={it.b} min={0} max={59} step={5} onChange={(v) => set(it.a, v, 0, 'b')} />
          {labelsBtn}
        </>
      )}
      {(it.kind === 'pie' || it.kind === 'bar') && (
        <>
          {lbl('แบ่ง')}
          <Stepper label="จำนวนส่วน" value={it.a} min={1} max={24} onChange={(v) => set(v, Math.min(it.b, v), 0, 'a')} />
          {lbl('ระบาย')}
          <Stepper label="ส่วนที่ระบาย" value={it.b} min={0} max={it.a} onChange={(v) => set(it.a, v, 0, 'b')} />
        </>
      )}
      {(it.kind === 'tenframe' || it.kind === 'tally') && (
        <>
          {lbl('จำนวน')}
          <Stepper label="จำนวน" value={it.a} min={it.kind === 'tally' ? 1 : 0} max={it.kind === 'tally' ? 50 : 20} onChange={(v) => set(v, 0, 0, 'a')} />
        </>
      )}
      {it.kind === 'dice' && (
        <>
          {lbl('แต้ม')}
          <Stepper label="แต้ม" value={it.a} min={1} max={6} onChange={(v) => set(v, 0, 0, 'a')} />
        </>
      )}
      {it.kind === 'ruler' && (
        <>
          {lbl('ยาว (ซม.)')}
          <Stepper label="ความยาว" value={it.a} min={5} max={30} onChange={(v) => set(v, 0, 0, 'a')} />
          {labelsBtn}
        </>
      )}
      {it.kind === 'coord' && (
        <>
          {lbl('ช่วง ±')}
          <Stepper label="ช่วงแกน" value={it.a} min={2} max={10} onChange={(v) => set(v, 0, 0, 'a')} />
          {labelsBtn}
        </>
      )}
      <ColorPop title="สีหลัก" value={it.color} onChange={(color) => up({ color: color || '#7c5cf0' } as Partial<Item>, 'color')} icon={<PaintBucket className="w-4 h-4" />} />
      <ColorPop title="สีเส้น" value={it.stroke} onChange={(stroke) => up({ stroke: stroke || '#2a2350' } as Partial<Item>, 'stroke')} />
    </>
  );
}
