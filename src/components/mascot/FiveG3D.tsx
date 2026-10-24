'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useRef, useState } from 'react';

/**
 * น้องไฟว์จีแบบ 3D (three.js สร้างจากรูปทรงล้วน ไม่มีไฟล์โมเดล) แรเงาแบบการ์ตูน + เส้นขอบหมึก ให้เข้ากับธีมขอบหนาของเว็บ
 * - ไม่ส่ง mood = โหมดโชว์ (หน้าหลัก): เปลี่ยนท่าวนไปเรื่อยๆ กดที่ตัวเพื่อข้ามไปท่าถัดไป
 * - ส่ง mood = ทำท่าตามฟอร์ม (หน้าเข้าสู่ระบบ/สมัครบัญชี)
 * โหลด three แบบแยกไฟล์ตอนใช้งาน ระหว่างรอ/เครื่องไม่รองรับ WebGL แสดงรูปนิ่งแทน
 */

export type FiveGMood = 'idle' | 'focus' | 'secret' | 'error' | 'happy';
export const SHOW_POSES = ['wave', 'jump', 'groove', 'dance', 'spin', 'cheer', 'tablet'] as const;
export type ShowPose = (typeof SHOW_POSES)[number];

interface Pose {
  x: number;
  y: number;
  ry: number;
  rz: number;
  sq: number;
  hx: number;
  hy: number;
  hz: number;
  /** แขนขวาของจอ (+ = ยกออกด้านข้าง) */
  az: number;
  ax: number;
  /** แขนซ้ายของจอที่ถือแท็บเล็ต (- = ยกออกด้านข้าง) */
  bz: number;
  bx: number;
  la: number;
  lb: number;
  /** ตายิ้ม ^ ^ */
  happy: number;
  mouth: number;
  /** น้ำหนักการหันตามเมาส์ */
  look: number;
}
const REST: Pose = { x: 0, y: 0, ry: 0, rz: 0, sq: 1, hx: 0, hy: 0, hz: 0, az: 0.2, ax: 0, bz: -0.2, bx: -0.35, la: 0, lb: 0, happy: 0, mouth: 1, look: 1 };
const KEYS = Object.keys(REST) as (keyof Pose)[];
const TAU = Math.PI * 2;
const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** ท่าทั้งหมด: u = วินาทีตั้งแต่เริ่มท่า */
function posed(name: ShowPose | FiveGMood, u: number): Pose {
  const p: Pose = { ...REST };
  const s = Math.sin;
  switch (name) {
    case 'idle':
      p.az = 0.22 + 0.06 * s(u * 2);
      p.bz = -0.22 - 0.06 * s(u * 2 + 1);
      p.hz = 0.05 * s(u * 1.3);
      // ทักทายสั้นๆ ทุก 7 วินาที
      if (u % 7 < 1.8) {
        p.az = 2.45 + 0.35 * s(u * 9);
        p.happy = 1;
      }
      break;
    case 'wave':
      p.az = 2.45 + 0.38 * s(u * 9);
      p.ax = -0.25;
      p.hz = 0.12;
      p.y = 0.05 * Math.abs(s(u * 4.5));
      p.happy = 1;
      break;
    case 'jump': {
      const ph = (u % 0.82) / 0.82;
      const h = s(ph * Math.PI);
      p.y = h * 0.62;
      p.sq = 1 - 0.13 * Math.cos(ph * TAU);
      p.az = 0.4 + 1.9 * h;
      p.bz = -0.4 - 1.5 * h;
      p.la = -0.35 * h;
      p.lb = 0.35 * h;
      p.happy = 1;
      p.mouth = 1.25;
      break;
    }
    case 'groove': {
      const b = s(u * 8);
      p.hx = 0.14 * b;
      p.hz = 0.1 * s(u * 4);
      p.y = 0.07 * Math.abs(s(u * 4));
      p.az = 0.75 + 0.35 * b;
      p.bz = -0.75 - 0.35 * b;
      p.rz = 0.05 * s(u * 4);
      p.happy = 0.8;
      p.look = 0.3;
      break;
    }
    case 'dance': {
      const d = s(u * 5);
      p.x = 0.2 * d;
      p.rz = -0.13 * d;
      p.az = 1.25 + 0.85 * d;
      p.bz = -1.25 + 0.85 * d;
      p.hz = 0.16 * d;
      p.y = 0.1 * Math.abs(d);
      p.la = 0.35 * Math.max(0, d);
      p.lb = -0.35 * Math.max(0, -d);
      p.happy = 0.7;
      p.look = 0.3;
      break;
    }
    case 'spin': {
      const k = clamp01(u / 1.25);
      p.ry = ease(k) * TAU;
      p.y = s(k * Math.PI) * 0.45;
      p.az = 1.5;
      p.bz = -1.5;
      p.happy = 1;
      p.look = 0;
      if (u > 1.4) {
        p.az = 2.45 + 0.38 * s(u * 9);
        p.bz = REST.bz;
      }
      break;
    }
    case 'happy':
    case 'cheer':
      p.az = 2.75 + 0.22 * s(u * 14);
      p.bz = -2.75 - 0.22 * s(u * 14 + 1);
      p.bx = 0;
      p.y = 0.34 * Math.abs(s(u * 5.2));
      p.sq = 1 + 0.05 * s(u * 10.4);
      p.happy = 1;
      p.mouth = 1.3;
      break;
    case 'tablet':
      p.bz = -0.55;
      p.bx = -1.25;
      p.hx = 0.28;
      p.hy = -0.32;
      p.look = 0;
      if (u > 1.7) {
        p.hx = -0.05;
        p.hy = 0;
        p.az = 2.1 + 0.3 * s(u * 10);
        p.happy = 1;
        p.y = 0.12 * Math.abs(s(u * 6));
        p.look = 0.6;
      }
      break;
    case 'focus':
      p.hy = 0.38;
      p.hz = -0.1 + 0.03 * s(u * 1.6);
      p.rz = -0.05;
      p.az = 0.35;
      p.look = 0.25;
      break;
    case 'secret':
      // หันหลังให้ ไม่แอบดูรหัส
      p.ry = Math.PI;
      p.hx = 0.08;
      p.az = 0.5 + 0.08 * s(u * 7);
      p.bz = -0.5 - 0.08 * s(u * 7);
      p.look = 0;
      break;
    case 'error': {
      const k = Math.exp(-u * 2.2);
      p.hy = 0.42 * s(u * 15) * k;
      p.hz = -0.1;
      p.mouth = 0.45;
      p.az = 0.3;
      p.bz = -0.3;
      p.sq = 0.97;
      p.look = 0;
      break;
    }
  }
  return p;
}

const POSE_MS = 3600;

export function FiveG3D({ mood, onPose, className = '', label = 'น้องไฟว์จี' }: { mood?: FiveGMood; onPose?: (p: ShowPose) => void; className?: string; label?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const moodRef = useRef(mood);
  const onPoseRef = useRef(onPose);
  const nextRef = useRef<() => void>(() => undefined);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  moodRef.current = mood;
  onPoseRef.current = onPose;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let stop = () => undefined as void;

    (async () => {
      const THREE = await import('three');
      if (disposed) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:manipulation';
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      camera.position.set(0, 3.1, 13.2);
      camera.lookAt(0, 2.15, 0);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x9cc4ff, 1.5));
      const sun = new THREE.DirectionalLight(0xffffff, 1.9);
      sun.position.set(3.5, 6, 7);
      scene.add(sun);

      /* ---------------- วัสดุ ---------------- */
      const grad = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
      grad.minFilter = grad.magFilter = THREE.NearestFilter;
      grad.needsUpdate = true;
      const toon = (color: number, extra: Record<string, unknown> = {}) => new THREE.MeshToonMaterial({ color, gradientMap: grad, ...extra });
      const INK = new THREE.MeshBasicMaterial({ color: 0x2a2350, side: THREE.BackSide });
      const M = {
        body: toon(0xf3f8ff),
        blue: toon(0x3a78e6),
        navy: toon(0x1d3f8f),
        orange: toon(0xff8a2b),
        orange2: toon(0xffb347),
        white: toon(0xffffff),
        eye: toon(0x17306b),
        iris: toon(0x3f8cff),
        green: toon(0x4fcf8f),
        green2: toon(0x7ee6ad),
        mouth: new THREE.MeshBasicMaterial({ color: 0x5a1838 }),
        tongue: new THREE.MeshBasicMaterial({ color: 0xff7a95 }),
        blush: new THREE.MeshBasicMaterial({ color: 0xff8fae, transparent: true, opacity: 0.75, depthWrite: false }),
        glint: new THREE.MeshBasicMaterial({ color: 0xffffff }),
        screen: toon(0x9be3ff),
      };

      const geos: { dispose: () => void }[] = [];
      const G = <T extends { dispose: () => void }>(g: T) => (geos.push(g), g);
      /** ชิ้นส่วน + เส้นขอบหมึก (inverted hull) หนาประมาณ t หน่วย */
      const part = (parent: InstanceType<typeof THREE.Object3D>, geo: ConstructorParameters<typeof THREE.Mesh>[0], mat: InstanceType<typeof THREE.Material>, pos: [number, number, number], opt: { s?: [number, number, number]; r?: [number, number, number]; size?: number; t?: number } = {}) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(...pos);
        if (opt.s) m.scale.set(...opt.s);
        if (opt.r) m.rotation.set(...opt.r);
        if (opt.size) {
          const hull = new THREE.Mesh(geo, INK);
          hull.scale.setScalar(1 + (opt.t ?? 0.045) / opt.size);
          m.add(hull);
        }
        parent.add(m);
        return m;
      };
      const sphere = (r: number, seg = 32) => G(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)));

      /** ข้อความบนผืนผ้าใบ (ไม่โหลดฟอนต์จากภายนอก) */
      const font = getComputedStyle(document.body).fontFamily || 'sans-serif';
      const textTex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        draw(cv.getContext('2d')!);
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        geos.push(t);
        return t;
      };
      const label5G = (c: CanvasRenderingContext2D, w: number, h: number, fill: string, stroke: string, size: number) => {
        c.font = `900 ${size}px ${font}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.lineJoin = 'round';
        c.lineWidth = size * 0.16;
        c.strokeStyle = stroke;
        c.strokeText('5G', w / 2, h / 2 + size * 0.04);
        c.fillStyle = fill;
        c.fillText('5G', w / 2, h / 2 + size * 0.04);
      };

      /* ---------------- ประกอบตัว ---------------- */
      const root = new THREE.Group();
      scene.add(root);

      // เกาะหญ้าที่ยืน
      const island = new THREE.Group();
      island.position.y = -0.02;
      scene.add(island);
      part(island, G(new THREE.CylinderGeometry(1.75, 1.35, 0.42, 48)), M.green, [0, -0.21, 0], { size: 1.75, t: 0.06 });
      part(island, G(new THREE.CylinderGeometry(1.62, 1.62, 0.04, 48)), M.green2, [0, 0.005, 0]);
      const shadow = new THREE.Mesh(
        G(new THREE.CircleGeometry(0.9, 40)),
        new THREE.MeshBasicMaterial({ color: 0x1d6b48, transparent: true, opacity: 0.35, depthWrite: false })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.03;
      island.add(shadow);

      const squash = new THREE.Group();
      root.add(squash);

      // ขา + รองเท้า
      const legs: InstanceType<typeof THREE.Group>[] = [];
      for (const sx of [1, -1]) {
        const leg = new THREE.Group();
        leg.position.set(0.3 * sx, 0.5, 0);
        squash.add(leg);
        part(leg, G(new THREE.CapsuleGeometry(0.17, 0.2, 6, 16)), M.body, [0, -0.17, 0], { size: 0.17 });
        part(leg, sphere(0.27), M.orange, [0.02 * sx, -0.4, 0.1], { s: [1.05, 0.6, 1.45], size: 0.27, t: 0.05 });
        part(leg, sphere(0.27), M.white, [0.02 * sx, -0.47, 0.12], { s: [1.08, 0.3, 1.48] });
        legs.push(leg);
      }

      // ลำตัว
      part(squash, sphere(0.8, 40), M.body, [0, 1.1, 0], { s: [1, 0.9, 0.85], size: 0.8 });
      // จอที่พุง (กรอบฟ้า + สีรุ้ง "5G")
      const rr = (w: number, h: number, r: number) => {
        const sh = new THREE.Shape();
        sh.moveTo(-w / 2 + r, -h / 2);
        sh.lineTo(w / 2 - r, -h / 2);
        sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
        sh.lineTo(w / 2, h / 2 - r);
        sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
        sh.lineTo(-w / 2 + r, h / 2);
        sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
        sh.lineTo(-w / 2, -h / 2 + r);
        sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
        return sh;
      };
      const frame = part(squash, G(new THREE.ExtrudeGeometry(rr(1.02, 0.74, 0.14), { depth: 0.16, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 })), M.blue, [0, 1.12, 0.5], { size: 0.5, t: 0.03 });
      frame.rotation.x = -0.08;
      const bellyTex = textTex(512, 360, (c) => {
        const g = c.createLinearGradient(0, 0, 512, 360);
        ['#ff7ab6', '#ffd166', '#7ee6ad', '#6cc7ff', '#b28dff'].forEach((col, i) => g.addColorStop(i / 4, col));
        c.fillStyle = g;
        c.fillRect(0, 0, 512, 360);
        c.globalAlpha = 0.35;
        c.fillStyle = '#fff';
        c.beginPath();
        c.ellipse(150, 90, 160, 50, -0.3, 0, TAU);
        c.fill();
        c.globalAlpha = 1;
        label5G(c, 512, 360, '#ffcf3f', '#2a2350', 230);
      });
      const screen = new THREE.Mesh(G(new THREE.ShapeGeometry(rr(0.88, 0.6, 0.1))), new THREE.MeshBasicMaterial({ map: bellyTex }));
      screen.position.set(0, 0, 0.21);
      // ShapeGeometry ใช้พิกัดจริงเป็น uv: แปลงเป็น 0..1
      const uv = screen.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 0.88 + 0.5, uv.getY(i) / 0.6 + 0.5);
      frame.add(screen);

      // เข็มขัดกระเป๋าสีส้ม
      part(squash, G(new THREE.TorusGeometry(0.62, 0.065, 10, 48)), M.orange, [0, 0.66, 0], { r: [Math.PI / 2, 0, 0], s: [1, 0.87, 1], size: 0.62, t: 0.03 });
      const pouch = part(squash, G(new THREE.CapsuleGeometry(0.15, 0.42, 6, 16)), M.orange2, [0, 0.6, 0.56], { r: [0, 0, Math.PI / 2], s: [1, 1, 0.75], size: 0.2, t: 0.035 });
      part(pouch, sphere(0.045, 12), M.navy, [0.02, 0.12, 0.12]);
      part(pouch, sphere(0.045, 12), M.navy, [-0.03, -0.1, 0.12]);

      // แขน (จุดหมุนที่ไหล่)
      const arm = (sx: number) => {
        const a = new THREE.Group();
        a.position.set(0.7 * sx, 1.42, 0.05);
        a.rotation.order = 'ZXY';
        squash.add(a);
        part(a, G(new THREE.CapsuleGeometry(0.15, 0.3, 6, 16)), M.body, [0, -0.28, 0], { size: 0.15 });
        part(a, sphere(0.22), M.body, [0, -0.6, 0.02], { s: [1, 0.95, 0.9], size: 0.22 });
        return a;
      };
      const armA = arm(1);
      const armB = arm(-1);
      // แท็บเล็ตในมือซ้ายของจอ
      const tablet = new THREE.Group();
      tablet.position.set(-0.08, -0.72, 0.26);
      armB.add(tablet);
      part(tablet, G(new THREE.BoxGeometry(0.5, 0.7, 0.07)), M.blue, [0, 0, 0], { size: 0.35, t: 0.03 });
      part(tablet, G(new THREE.PlaneGeometry(0.4, 0.56)), M.screen, [0, 0.01, 0.04]);

      // หัว (จุดหมุนที่คอ)
      const neck = new THREE.Group();
      neck.position.set(0, 1.86, 0);
      squash.add(neck);
      const head = new THREE.Group();
      head.position.y = 0.84;
      neck.add(head);
      part(head, sphere(1, 48), M.body, [0, 0, 0], { s: [1.15, 0.95, 0.9], size: 1 });
      // ปุยเมฆ
      for (const [x, y, z, r] of [
        [-0.92, 0.28, -0.05, 0.5],
        [0.92, 0.28, -0.05, 0.5],
        [-0.55, 0.72, -0.08, 0.52],
        [0.55, 0.72, -0.08, 0.52],
        [0, 0.86, -0.12, 0.5],
        [-0.28, 0.7, -0.45, 0.48],
        [0.28, 0.7, -0.45, 0.48],
        [0, 0.35, -0.6, 0.6],
      ] as const)
        part(head, sphere(r, 28), M.body, [x, y, z], { size: r, t: 0.04 });

      // หูฟัง
      const band = part(head, G(new THREE.TorusGeometry(1.24, 0.085, 10, 48, Math.PI)), M.blue, [0, 0.04, -0.12], { s: [1, 1.12, 1], size: 1.24, t: 0.03 });
      band.rotation.x = -0.12;
      for (const sx of [1, -1]) {
        const cup = part(head, G(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 28)), M.blue, [1.2 * sx, 0.02, 0], { r: [0, 0, Math.PI / 2], size: 0.34, t: 0.04 });
        part(cup, G(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24)), M.navy, [0, 0.14 * sx, 0]);
      }

      // เสาอากาศ + ป้าย 5G
      const ant = new THREE.Group();
      ant.position.set(0, 1.25, -0.12);
      head.add(ant);
      part(ant, G(new THREE.CylinderGeometry(0.035, 0.045, 0.5, 10)), M.navy, [0, 0.25, 0], { size: 0.05, t: 0.02 });
      part(ant, sphere(0.09, 16), M.blue, [0, 0.52, 0], { size: 0.09, t: 0.03 });
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTex(256, 160, (c) => label5G(c, 256, 160, '#7fd3ff', '#1d3f8f', 130)), depthTest: true }));
      tag.scale.set(0.62, 0.39, 1);
      tag.position.set(0, 0.86, 0);
      ant.add(tag);

      // ป้าย 5G ที่หน้าผาก
      const badge = new THREE.Mesh(
        G(new THREE.CircleGeometry(0.2, 32)),
        new THREE.MeshBasicMaterial({
          map: textTex(200, 200, (c) => {
            c.fillStyle = '#3a78e6';
            c.beginPath();
            c.arc(100, 100, 100, 0, TAU);
            c.fill();
            label5G(c, 200, 200, '#ffffff', '#1d3f8f', 96);
          }),
        })
      );
      badge.position.set(0, 0.55, 0.74);
      badge.rotation.x = -0.62;
      head.add(badge);

      // หน้า: ตา แก้ม ปาก
      const face = new THREE.Group();
      head.add(face);
      const eyes = new THREE.Group();
      face.add(eyes);
      const happyEyes = new THREE.Group();
      face.add(happyEyes);
      for (const sx of [1, -1]) {
        const e = part(eyes, sphere(0.2, 24), M.eye, [0.36 * sx, -0.02, 0.8], { s: [1, 1.18, 0.5] });
        part(e, sphere(0.14, 20), M.iris, [0, -0.05, 0.12], { s: [1, 1, 0.6] });
        part(e, sphere(0.06, 12), M.glint, [0.05, 0.08, 0.2]);
        part(e, sphere(0.03, 10), M.glint, [-0.06, -0.08, 0.2]);
        const arc = part(happyEyes, G(new THREE.TorusGeometry(0.13, 0.035, 8, 20, Math.PI)), M.eye, [0.36 * sx, -0.02, 0.86]);
        arc.rotation.z = 0;
        const blush = new THREE.Mesh(G(new THREE.CircleGeometry(0.13, 24)), M.blush);
        blush.position.set(0.63 * sx, -0.2, 0.74);
        blush.rotation.y = 0.62 * sx;
        face.add(blush);
      }
      const mouthShape = new THREE.Shape();
      mouthShape.absellipse(0, 0, 0.19, 0.17, Math.PI, TAU, false, 0);
      const mouth = new THREE.Mesh(G(new THREE.ShapeGeometry(mouthShape, 20)), M.mouth);
      mouth.position.set(0, -0.3, 0.862);
      mouth.rotation.x = -0.3;
      face.add(mouth);
      const tongueShape = new THREE.Shape();
      tongueShape.absellipse(0, -0.11, 0.1, 0.06, 0, TAU, false, 0);
      const tongue = new THREE.Mesh(G(new THREE.ShapeGeometry(tongueShape, 16)), M.tongue);
      tongue.position.z = 0.004;
      mouth.add(tongue);

      /* ---------------- ขนาดจอ ---------------- */
      const fit = () => {
        const w = el.clientWidth || 1;
        const h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // จอแคบ: ถอยกล้องให้ตัวไม่ล้นด้านข้าง
        camera.position.z = 13.2 * Math.max(1, 0.78 / camera.aspect);
        camera.updateProjectionMatrix();
      };
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(el);

      /* ---------------- เมาส์/สัมผัส ---------------- */
      const ptr = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        ptr.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
        ptr.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.3)) / (window.innerHeight / 2)));
      };
      window.addEventListener('pointermove', onMove, { passive: true });

      /* ---------------- วนท่า ---------------- */
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let show = 0;
      let poseStart = performance.now();
      let lastMood = moodRef.current;
      let poke = -10;
      const cur: Pose = { ...REST };
      let blinkAt = performance.now() + 2500;
      const announce = () => onPoseRef.current?.(SHOW_POSES[show]);
      announce();
      nextRef.current = () => {
        if (moodRef.current) poke = performance.now();
        else {
          show = (show + 1) % SHOW_POSES.length;
          poseStart = performance.now();
          cur.ry %= TAU;
          announce();
        }
      };

      let raf = 0;
      let last = performance.now();
      let visible = true;
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        if (!visible) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const m = moodRef.current;
        if (m !== lastMood) {
          lastMood = m;
          poseStart = now;
          cur.ry %= TAU;
        }
        if (!m && !reduce && now - poseStart > POSE_MS) nextRef.current();
        const u = (now - poseStart) / 1000;
        const name: ShowPose | FiveGMood = reduce ? m ?? 'idle' : now - poke < 900 ? 'cheer' : m ?? SHOW_POSES[show];
        const tgt = reduce ? { ...posed(name === 'secret' || name === 'focus' ? name : 'idle', 0), az: 0.22, happy: name === 'happy' ? 1 : 0 } : posed(name, u);
        const k = 1 - Math.exp(-dt * 13);
        for (const key of KEYS) cur[key] += (tgt[key] - cur[key]) * k;

        const t = now / 1000;
        const breathe = reduce ? 0 : 0.018 * Math.sin(t * 2.3);
        root.position.set(cur.x, Math.max(0, cur.y), 0);
        root.rotation.set(0, cur.ry, cur.rz);
        const sq = cur.sq + breathe;
        squash.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
        neck.rotation.set(cur.hx + cur.look * ptr.y * 0.22, cur.hy + cur.look * ptr.x * 0.45, cur.hz);
        armA.rotation.set(cur.ax, 0, cur.az);
        armB.rotation.set(cur.bx, 0, cur.bz);
        legs[0].rotation.x = cur.la;
        legs[1].rotation.x = cur.lb;
        ant.rotation.z = reduce ? 0 : 0.12 * Math.sin(t * 3.1) - cur.rz * 0.8 - (cur.y > 0.05 ? 0.1 : 0);
        // กะพริบตา
        let open = 1;
        if (now > blinkAt) {
          const b = (now - blinkAt) / 140;
          open = b < 1 ? Math.abs(1 - b * 2) : 1;
          if (b >= 1) blinkAt = now + 2200 + Math.random() * 2600;
        }
        eyes.scale.y = Math.max(0.08, open) * (1 - cur.happy);
        eyes.visible = cur.happy < 0.92;
        happyEyes.visible = cur.happy > 0.5;
        mouth.scale.set(1, Math.max(0.35, cur.mouth), 1);
        const lift = Math.max(0, cur.y);
        shadow.scale.setScalar(Math.max(0.45, 1 - lift * 0.7));
        (shadow.material as InstanceType<typeof THREE.MeshBasicMaterial>).opacity = 0.35 * (1 - lift * 0.6);
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);
      setReady(true);

      // หยุดวาดเมื่อเลื่อนพ้นจอ
      const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
      io.observe(el);

      stop = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener('pointermove', onMove);
        geos.forEach((g) => g.dispose());
        Object.values(M).forEach((mt) => mt.dispose());
        INK.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => !disposed && setFailed(true));

    return () => {
      disposed = true;
      stop();
    };
  }, []);

  return (
    <div
      ref={host}
      className={`relative ${className}`}
      role="img"
      aria-label={label}
      onClick={() => nextRef.current()}
      style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
    >
      {(!ready || failed) && (
        <img
          src="/plans/fiveg-grown.webp"
          alt=""
          draggable={false}
          className={`absolute left-1/2 bottom-[8%] h-[78%] w-auto -translate-x-1/2 select-none ${failed ? 'animate-float-slow' : 'opacity-60'}`}
        />
      )}
    </div>
  );
}
