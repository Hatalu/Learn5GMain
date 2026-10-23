'use client';

/**
 * ของใช้ร่วมของโหมด "โลกเดียวกัน" (ศึกยึดอาณาจักร / เกาะมหาสมบัติ)
 * - ทุกเครื่องจำลองโลกเอง แล้วส่งเหตุการณ์ (ตำแหน่ง ระบายสี เปิดหีบ โจมตี) ให้กันผ่าน Supabase Realtime Broadcast
 * - คะแนนส่งเซิร์ฟเวอร์ทาง sync เดิม (เซิร์ฟเวอร์จำกัดเพดานตามข้อที่ตอบถูก) เหตุการณ์ในโลกเป็นแค่ภาพ/การเล่น
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Gear } from '@/lib/game-creator/gear';
import { gsfx } from '@/lib/game-creator/gsound';

export interface WorldPlayer {
  id: string;
  nickname: string;
  avatar: number;
  gear: Gear;
}

/** ข้อมูลห้องที่ตัวเกมโลกเดียวกันต้องใช้ (ไม่มี = ทดลองเล่นคนเดียว) */
export interface WorldInfo {
  roomId: string;
  myId: string;
  /** ทุกคนในห้อง เรียงตามเวลาเข้า (ใช้แบ่งทีม/สีให้ตรงกันทุกเครื่อง) */
  players: WorldPlayer[];
  /** 0 = ต่างคนต่างสี */
  teams: number;
  round: number;
  /** เวลาตามนาฬิกาเซิร์ฟเวอร์ (ms) ใช้เทียบลำดับเหตุการณ์ข้ามเครื่อง */
  now: () => number;
}

export type NetMsg = { e: string; p: Record<string, unknown> };

/** ช่องสัญญาณของโลก: ส่ง/รับเหตุการณ์ระหว่างผู้เล่น (ไม่มีห้อง = ไม่ส่งอะไร) */
export function useWorldNet(info: WorldInfo | undefined, onMsg: (m: NetMsg) => void) {
  const cb = useRef(onMsg);
  cb.current = onMsg;
  const chRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const [live, setLive] = useState(false);
  const roomId = info?.roomId;
  const round = info?.round;
  useEffect(() => {
    if (!roomId) return;
    const sb = createClient();
    // ตัวนับข้อความต่อวินาทีของ client ไม่ให้เกินเพดาน Realtime
    const ch = sb.channel(`l5g-world-${roomId}-${round}`, { config: { broadcast: { self: false, ack: false } } });
    ch.on('broadcast', { event: '*' }, (m: { event: string; payload?: Record<string, unknown> }) => cb.current({ e: m.event, p: m.payload || {} }));
    ch.subscribe((s: string) => setLive(s === 'SUBSCRIBED'));
    chRef.current = ch;
    return () => {
      chRef.current = null;
      try {
        sb.removeChannel(ch);
      } catch {
        /* ignore */
      }
    };
  }, [roomId, round]);
  const send = useCallback((e: string, p: Record<string, unknown>) => {
    const ch = chRef.current;
    if (!ch) return;
    ch.send({ type: 'broadcast', event: e, payload: p }).catch(() => null);
  }, []);
  return { send, live };
}

/* ------------------------------------------------------------------ สีผู้เล่น/ทีม */

export const TEAM_COLORS = ['#ff4fa3', '#3d8bff', '#ffb31a', '#25c48a', '#9b6cf0', '#ff7a3d', '#18b7d6', '#e0457b', '#7cc242', '#c26dff', '#ff5d5d', '#2fa4a0'];
export const TEAM_NAMES = ['ทีมชมพู', 'ทีมฟ้า', 'ทีมเหลือง', 'ทีมเขียว'];

/** เจ้าของ (ทีม หรือ ลำดับผู้เล่น) ของผู้เล่นคนนี้ ใช้เป็นเลขสีบนแผนที่ */
export function ownerOf(info: WorldInfo | undefined, id: string): number {
  if (!info) return 0;
  const i = Math.max(0, info.players.findIndex((p) => p.id === id));
  return info.teams > 0 ? i % info.teams : i % TEAM_COLORS.length;
}

export const ownerName = (info: WorldInfo | undefined, owner: number) => (info && info.teams > 0 ? TEAM_NAMES[owner] || `ทีม ${owner + 1}` : '');

/* ------------------------------------------------------------------ รูปตัวละคร (SVG -> รูปสำหรับ canvas) */

const spriteCache = new Map<string, HTMLImageElement>();

/** ตัวละครของผู้เล่นเป็นรูป (ใช้วาดคนอื่นบน canvas) โหลดครั้งเดียวต่อหน้าตา */
export function avatarSprite(avatar: number, gear: Gear | undefined, onReady: () => void): HTMLImageElement | null {
  const key = `${avatar}:${JSON.stringify(gear || {})}`;
  const hit = spriteCache.get(key);
  if (hit) return hit.complete && hit.naturalWidth ? hit : null;
  const img = new Image();
  spriteCache.set(key, img);
  Promise.all([import('react-dom/server'), import('react'), import('../Avatar')])
    .then(([server, React, mod]) => {
      let svg = server.renderToStaticMarkup(React.createElement(mod.Avatar, { id: avatar, gear, size: 120 }));
      // เผื่อขอบให้หมวก/ของถือที่ล้นกรอบ และใส่ xmlns ให้เปิดเป็นรูปได้
      svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"').replace(/viewBox="0 0 100 100"/, 'viewBox="-14 -22 128 132"');
      img.onload = onReady;
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    })
    .catch(() => null);
  return null;
}

/* ------------------------------------------------------------------ เดิน: ปุ่มลูกศร/WASD + จอยลอยบนจอสัมผัส */

export const JOY_R = 54;

export function useMoveInput(enabled: boolean) {
  const input = useRef({ kx: 0, ky: 0, jx: 0, jy: 0 });
  const keys = useRef(new Set<string>());
  const joyRef = useRef<{ id: number; ox: number; oy: number } | null>(null);
  const [joy, setJoy] = useState<{ ox: number; oy: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const map: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1], A: [-1, 0], D: [1, 0], W: [0, -1], S: [0, 1] };
    const upd = () => {
      let x = 0;
      let y = 0;
      keys.current.forEach((k) => {
        x += map[k][0];
        y += map[k][1];
      });
      input.current.kx = x;
      input.current.ky = y;
    };
    const down = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null;
      // กำลังพิมพ์คำตอบ: ปุ่ม WASD ต้องเป็นตัวอักษร ไม่ใช่เดิน
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      if (!map[e.key]) return;
      e.preventDefault();
      keys.current.add(e.key);
      upd();
    };
    const up = (e: KeyboardEvent) => {
      if (!map[e.key]) return;
      keys.current.delete(e.key);
      upd();
    };
    const blur = () => {
      keys.current.clear();
      upd();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || joyRef.current) return;
      if ((e.target as HTMLElement).closest('button, input, [data-ui]')) return;
      const r = e.currentTarget.getBoundingClientRect();
      const ox = e.clientX - r.left;
      const oy = e.clientY - r.top;
      joyRef.current = { id: e.pointerId, ox, oy };
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setJoy({ ox, oy, x: 0, y: 0 });
      gsfx.unlock();
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const j = joyRef.current;
      if (!j || j.id !== e.pointerId) return;
      const r = e.currentTarget.getBoundingClientRect();
      let dx = e.clientX - r.left - j.ox;
      let dy = e.clientY - r.top - j.oy;
      const d = Math.hypot(dx, dy);
      if (d > JOY_R) {
        dx = (dx / d) * JOY_R;
        dy = (dy / d) * JOY_R;
      }
      input.current.jx = dx / JOY_R;
      input.current.jy = dy / JOY_R;
      setJoy({ ox: j.ox, oy: j.oy, x: dx, y: dy });
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      const j = joyRef.current;
      if (!j || j.id !== e.pointerId) return;
      joyRef.current = null;
      input.current.jx = 0;
      input.current.jy = 0;
      setJoy(null);
    },
  };
  const dir = () => {
    const i = input.current;
    let x = i.kx + i.jx;
    let y = i.ky + i.jy;
    const d = Math.hypot(x, y);
    if (d > 1) {
      x /= d;
      y /= d;
    }
    return { x, y };
  };
  return { joy, handlers: { ...handlers, onPointerCancel: handlers.onPointerUp }, dir };
}

/** นาฬิกาเหลือเวลา m:ss */
export function fmtLeft(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** สุ่มแบบกำหนด seed (ทุกเครื่องได้ผลเดียวกัน) */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** ผู้เล่นคนอื่นที่เห็นบนแผนที่ (ขยับเข้าหาตำแหน่งล่าสุดแบบนุ่มๆ) */
export interface Ghost {
  id: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  face: number;
  seen: number;
  /** สถานะพิเศษที่ส่งมา (อยู่ในป้อม แข็ง มึน ถอดรหัส ฯลฯ) */
  st: string;
}

export function moveGhosts(ghosts: Map<string, Ghost>, dt: number, now: number) {
  ghosts.forEach((g, id) => {
    const k = Math.min(1, dt * 12);
    g.x += (g.tx - g.x) * k;
    g.y += (g.ty - g.y) * k;
    // ไม่ได้ข่าว 12 วินาที = ออกไปแล้ว/หลุด
    if (now - g.seen > 12000) ghosts.delete(id);
  });
}
