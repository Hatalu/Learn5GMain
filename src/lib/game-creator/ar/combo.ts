/**
 * คอมโบ 4 แบบของสงครามอวกาศ AR
 * - Answer Combo: ตอบถูกติดกัน (ตัวคูณคะแนนความรู้ สูงสุด x1.5)
 * - Shooting Combo: ยิงโดนติดกัน ไม่ปล่อยอุกกาบาตหลุด/ไม่โดนบอสตี (ตัวคูณคะแนนการเล่น สูงสุด x2)
 * - Perfect Combo: ข้อนั้นถูกตั้งแต่ครั้งแรก + รอบยิงไม่พลาดเลย (นับติดกัน)
 * - Super Combo: ตอบถูกติดกัน >= 5 และยิงติดกัน >= 10 พร้อมกัน = ตัวคูณทั้งสองแบบ x2 จนกว่าจะขาด
 */
export type ComboKind = 'answer' | 'shoot' | 'perfect' | 'super';

export const COMBO_TEXT: Record<ComboKind, string> = {
  answer: 'Answer Combo',
  shoot: 'Shooting Combo',
  perfect: 'Perfect Combo',
  super: 'SUPER COMBO',
};

export const SUPER_AT = { answer: 5, shoot: 10 } as const;

export class Combo {
  answer = 0;
  shoot = 0;
  perfect = 0;
  bestAnswer = 0;
  bestShoot = 0;
  bestPerfect = 0;
  perfects = 0;
  supers = 0;
  superOn = false;

  reset() {
    Object.assign(this, new Combo());
  }

  /** ตอบถูก/ผิด: คืน true ถ้าเพิ่งเข้า Super Combo */
  onAnswer(correct: boolean): boolean {
    if (correct) {
      this.answer++;
      this.bestAnswer = Math.max(this.bestAnswer, this.answer);
    } else this.answer = 0;
    return this.check();
  }

  onShot(): boolean {
    this.shoot++;
    this.bestShoot = Math.max(this.bestShoot, this.shoot);
    return this.check();
  }

  /** ปล่อยเป้าหลุด / โดนบอสตี = คอมโบยิงขาด */
  onMiss() {
    this.shoot = 0;
    this.check();
  }

  /** จบรอบยิงของข้อหนึ่ง: perfect = ถูกครั้งแรก + ไม่พลาดเลย */
  onRoundEnd(perfect: boolean): boolean {
    if (perfect) {
      this.perfect++;
      this.perfects++;
      this.bestPerfect = Math.max(this.bestPerfect, this.perfect);
    } else this.perfect = 0;
    return perfect;
  }

  private check(): boolean {
    const on = this.answer >= SUPER_AT.answer && this.shoot >= SUPER_AT.shoot;
    const fresh = on && !this.superOn;
    if (fresh) this.supers++;
    this.superOn = on;
    return fresh;
  }

  get superK() {
    return this.superOn ? 2 : 1;
  }
  /** ตัวคูณคะแนนความรู้ */
  get answerMult() {
    return (1 + Math.min(0.5, 0.1 * Math.max(0, this.answer - 1))) * this.superK;
  }
  /** ตัวคูณคะแนนการเล่น (ทุก 5 นัดติด +0.25) */
  get shootMult() {
    return (1 + Math.min(1, Math.floor(this.shoot / 5) * 0.25)) * this.superK;
  }
}
