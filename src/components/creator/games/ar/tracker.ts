/**
 * กล้อง + ตรวจท่าทาง (MediaPipe Pose Landmarker) สำหรับเกม AR
 * - ไฟล์ WASM/โมเดลอยู่ในเว็บเราเอง (/mediapipe) ไม่ส่งภาพกล้องออกจากเครื่อง ไม่บันทึกภาพ
 * - ระดับกราฟิก "ลื่น" ใช้โมเดล lite, ระดับอื่นใช้ full (แม่นกว่า)
 * - GPU ก่อน ไม่ได้ค่อยใช้ CPU
 */
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import { getGfx } from '@/lib/gfx';
import type { Lm } from '@/lib/game-creator/arPose';

export type CamError = 'denied' | 'nocam' | 'insecure' | 'model';

export class PoseTracker {
  video: HTMLVideoElement;
  private stream: MediaStream | null = null;
  private lm: PoseLandmarker | null = null;
  private lastVideoTime = -1;
  private lastTs = 0;
  /** ผลล่าสุด: ร่างกายที่ตรวจเจอ (สูงสุดตาม numPoses) */
  poses: Lm[][] = [];
  /** เวลา (performance.now) ที่ได้ผลล่าสุด */
  stamp = 0;
  /** เฟรมต่อวินาทีของการตรวจ (โชว์ในหน้าตั้งค่ากล้อง) */
  fps = 0;
  private fpsN = 0;
  private fpsT = 0;
  stopped = false;

  constructor(video: HTMLVideoElement) {
    this.video = video;
  }

  async start(numPoses: number): Promise<CamError | null> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return window.isSecureContext ? 'nocam' : 'insecure';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      });
    } catch (e) {
      const n = (e as { name?: string })?.name;
      return n === 'NotAllowedError' || n === 'SecurityError' ? 'denied' : 'nocam';
    }
    if (this.stopped) {
      this.stop();
      return null;
    }
    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.playsInline = true;
    try {
      await this.video.play();
    } catch {
      /* autoplay บางเครื่องต้องรอแตะ แต่ muted มักเล่นได้ */
    }
    try {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      const files = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      const model = `/mediapipe/pose_landmarker_${getGfx() === 'lite' ? 'lite' : 'full'}.task`;
      const opts = (delegate: 'GPU' | 'CPU') => ({
        baseOptions: { modelAssetPath: model, delegate },
        runningMode: 'VIDEO' as const,
        numPoses,
        minPoseDetectionConfidence: 0.55,
        minPosePresenceConfidence: 0.55,
        minTrackingConfidence: 0.6,
      });
      try {
        this.lm = await PoseLandmarker.createFromOptions(files, opts('GPU'));
      } catch {
        this.lm = await PoseLandmarker.createFromOptions(files, opts('CPU'));
      }
    } catch {
      return 'model';
    }
    if (this.stopped) this.stop();
    return null;
  }

  get ready() {
    return !!this.lm && !this.stopped;
  }

  /** เรียกทุกเฟรม: ตรวจเฉพาะเมื่อวิดีโอมีเฟรมใหม่ คืน true เมื่อได้ผลใหม่ */
  tick(now: number): boolean {
    const v = this.video;
    if (!this.lm || this.stopped || v.readyState < 2 || v.currentTime === this.lastVideoTime) return false;
    this.lastVideoTime = v.currentTime;
    // MediaPipe ต้องการเวลาที่เพิ่มขึ้นเสมอ
    const ts = Math.max(now, this.lastTs + 1);
    this.lastTs = ts;
    try {
      const r = this.lm.detectForVideo(v, ts);
      this.poses = (r.landmarks || []) as Lm[][];
      this.stamp = now;
    } catch {
      return false;
    }
    this.fpsN++;
    if (now - this.fpsT > 1000) {
      this.fps = Math.round((this.fpsN * 1000) / (now - this.fpsT));
      this.fpsN = 0;
      this.fpsT = now;
    }
    return true;
  }

  /** ปิดกล้องจริง (ไฟกล้องดับ) + คืนหน่วยความจำโมเดล */
  stop() {
    this.stopped = true;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    try {
      this.video.srcObject = null;
    } catch {
      /* ignore */
    }
    try {
      this.lm?.close();
    } catch {
      /* ignore */
    }
    this.lm = null;
  }
}
