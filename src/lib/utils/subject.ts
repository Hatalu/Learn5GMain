import type { Subject } from '@/types/database';

/** สีประจำวิชา (ใช้ร่วมกันทุกที่เพื่อความสม่ำเสมอ) */
export function getSubjectBadge(subject: string): string {
  switch (subject) {
    case 'คณิตศาสตร์':
      return 'bg-mint-500/15 text-emerald-700 dark:text-mint-400 border-mint-500/40';
    case 'วิทยาศาสตร์':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/40';
    case 'ภาษาอังกฤษ':
      return 'bg-sun-500/20 text-amber-700 dark:text-sun-300 border-sun-500/50';
    default:
      return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
  }
}

/** กราเดียนต์เล็กๆ ประจำวิชา ใช้กับชิปทางลัดหน้าแรก */
export const SUBJECT_STYLE: Record<
  Subject,
  { gradient: string; ring: string; label: string }
> = {
  คณิตศาสตร์: {
    gradient: 'from-mint-400 to-emerald-500',
    ring: 'ring-mint-500/50',
    label: 'เกมตัวเลข รูปทรง เวลา',
  },
  วิทยาศาสตร์: {
    gradient: 'from-sky-400 to-blue-500',
    ring: 'ring-sky-500/50',
    label: 'สำรวจโลกรอบตัว',
  },
  ภาษาอังกฤษ: {
    gradient: 'from-sun-400 to-orange-500',
    ring: 'ring-sun-500/50',
    label: 'คำศัพท์ และ Tenses',
  },
};
