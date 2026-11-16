'use client';

/**
 * การ์ดแพ็กเกจแบบเอียงตามเมาส์ (ดัดแปลงจากคอมโพเนนต์ pricing-plan-tilt)
 * ปรับให้เข้ากับเว็บ: ขาว-ดำตามธีม (ไม่มีสีส้ม), ราคารายเดือนอย่างเดียว (ไม่มีรายปี/ส่วนลด), สกุลเงินบาท
 * ตัวเลขราคาหมุนขึ้นตอนแสดง, การ์ดเอียง+แสงสะท้อนตามเมาส์, แพ็กเกจแนะนำมีเส้นวิ่งรอบ, ปิดการเคลื่อนไหวเมื่อผู้ใช้ตั้งลดการเคลื่อนไหว
 */
import * as React from 'react';
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface TiltPlan {
  id: string;
  name: string;
  tagline: string;
  price: number;
  features: string[];
  popular?: boolean;
  cta?: string;
  /** ข้อความเล็กใต้ราคา */
  note?: string;
  /** แพ็กเกจที่ใช้อยู่ */
  current?: boolean;
}

export interface PricingPlanTiltProps {
  plans: TiltPlan[];
  currency?: string;
  per?: string;
  onSelect?: (planId: string) => void;
  className?: string;
}

/** ตัวเลขหมุนขึ้นทีละหลัก */
function Roll({ value }: { value: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="inline-flex tabular-nums" aria-label={String(value)}>
      {String(value)
        .split('')
        .map((d, i, a) => (
          <span key={a.length - i} className="relative inline-block h-[1.1em] overflow-hidden" aria-hidden>
            <AnimatePresence mode="popLayout" initial>
              <motion.span
                key={d}
                className="inline-block"
                initial={{ y: reduce ? 0 : '110%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: reduce ? 0 : '-110%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.15 + i * 0.05 }}
              >
                {d}
              </motion.span>
            </AnimatePresence>
          </span>
        ))}
    </span>
  );
}

function PlanCard({ plan, currency, per, onPick }: { plan: TiltPlan; currency: string; per: string; onPick: () => void }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 160, damping: 16 });
  const ry = useSpring(useTransform(mx, [0, 1], [-10, 10]), { stiffness: 160, damping: 16 });
  const lift = useSpring(0, { stiffness: 200, damping: 18 });
  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(220px circle at ${gx} ${gy}, hsl(var(--foreground) / 0.06), transparent 65%)`;
  const glareOn = useTransform(lift, [0, 30], [0, 1]);
  const ink = plan.popular;

  return (
    <motion.li
      className="relative list-none"
      style={{ perspective: 1000 }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const b = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - b.left) / b.width);
        my.set((e.clientY - b.top) / b.height);
        lift.set(30);
      }}
      onPointerLeave={() => {
        mx.set(0.5);
        my.set(0.5);
        lift.set(0);
      }}
      initial={{ opacity: 0, y: reduce ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        style={{ rotateX: reduce ? 0 : rx, rotateY: reduce ? 0 : ry, z: reduce ? 0 : lift, transformStyle: 'preserve-3d' }}
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-3xl border p-7',
          ink ? 'border-transparent bg-foreground text-background' : 'bg-card text-foreground'
        )}
      >
        {/* เส้นวิ่งรอบการ์ดแนะนำ */}
        {ink && !reduce && (
          <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <motion.span
              className="absolute left-1/2 top-1/2 aspect-square w-[250%] -translate-x-1/2 -translate-y-1/2"
              style={{ background: 'conic-gradient(from 0deg, transparent 0 70%, hsl(var(--background) / 0.55), transparent)' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
            />
            <span className="absolute inset-px rounded-[23px] bg-foreground" />
          </span>
        )}
        {!reduce && <motion.span aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl" style={{ background: glare, opacity: glareOn }} />}

        <div className="relative" style={{ transform: 'translateZ(30px)' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-medium">{plan.name}</h3>
            {plan.current ? (
              <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px]', ink ? 'border-background/30' : '')}>ใช้อยู่</span>
            ) : plan.popular ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                <Sparkles className="h-3 w-3" aria-hidden /> แนะนำ
              </span>
            ) : null}
          </div>
          <p className={cn('mt-1 text-sm', ink ? 'text-background/65' : 'ui-muted')}>{plan.tagline}</p>
          <p className="mt-7 flex items-baseline gap-1" style={{ transform: 'translateZ(24px)' }}>
            <span className="font-display text-5xl font-light tracking-tight">
              <Roll value={plan.price} />
            </span>
            <span className={cn('text-sm', ink ? 'text-background/65' : 'ui-muted')}>
              {currency} / {per}
            </span>
          </p>
          {plan.note && <p className={cn('mt-1 text-xs', ink ? 'text-background/55' : 'ui-muted')}>{plan.note}</p>}
        </div>

        <ul className={cn('relative mt-7 flex-1 space-y-3 border-t pt-6 text-sm', ink ? 'border-background/15' : '')} style={{ transform: 'translateZ(14px)' }}>
          {plan.features.map((f, i) => (
            <motion.li
              key={f}
              className="flex items-start gap-2.5"
              initial={{ opacity: 0, x: reduce ? 0 : -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.05 }}
            >
              <Check className={cn('mt-0.5 h-4 w-4 shrink-0', ink ? 'text-background' : 'text-foreground')} strokeWidth={2} aria-hidden />
              <span className={ink ? 'text-background/85' : ''}>{f}</span>
            </motion.li>
          ))}
        </ul>

        <motion.button
          type="button"
          onClick={onPick}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          style={{ transform: 'translateZ(36px)' }}
          className={cn(
            'relative mt-8 inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-medium transition-opacity hover:opacity-85',
            ink ? 'bg-background text-foreground' : 'bg-foreground text-background'
          )}
        >
          {plan.cta ?? 'เลือกแพ็กเกจนี้'}
        </motion.button>
      </motion.div>
    </motion.li>
  );
}

export function PricingPlanTilt({ plans, currency = 'บาท', per = 'เดือน', onSelect, className }: PricingPlanTiltProps) {
  return (
    <ul className={cn('grid items-stretch gap-5 md:grid-cols-3', className)}>
      {plans.map((p) => (
        <PlanCard key={p.id} plan={p} currency={currency} per={per} onPick={() => onSelect?.(p.id)} />
      ))}
    </ul>
  );
}

export default PricingPlanTilt;
