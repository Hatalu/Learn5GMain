'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { atCap, creatorTier } from '@/lib/game-creator/quota';
import { useMembership } from '@/components/membership/MembershipProvider';

import { createClient } from '@/lib/supabase/client';
import { QuizEditor } from '@/components/creator/quiz/QuizEditor';
import type { QuizContent } from '@/lib/game-creator/types';
import '@/components/creator/creator.css';
import '@/components/creator/creator-pages.css';

function EditInner() {
  const { user, profile, isLoading, isDev } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  // ใช้ค่าตอนเปิดหน้าเท่านั้น (หลังบันทึกเกมใหม่ URL จะเปลี่ยนเป็น ?id=... โดยไม่ต้องโหลดตัวแก้ไขใหม่)
  const [id] = React.useState(() => sp.get('id'));
  const template = sp.get('template') || 'quiz';
  // ชุดใหม่จากแม่แบบวิชา (?tpl=) สร้างครั้งเดียวตอนเปิดหน้า
  // คลังแม่แบบใหญ่ โหลดแยกไฟล์: ยังไม่ได้ = undefined, ไม่มีแม่แบบ = null
  const [tpl] = React.useState(() => sp.get('tpl'));
  const [initial, setInitial] = React.useState<{ title: string; content: QuizContent } | null | undefined>(tpl ? undefined : null);
  useEffect(() => {
    if (!tpl) return;
    import('@/lib/game-creator/setBank').then(
      (b) => setInitial(b.buildSet(tpl)),
      () => setInitial(null),
    );
  }, [tpl]);
  const tier = creatorTier(!!user, profile);
  const { ent, tier: planT } = useMembership();
  const allowed = tier !== 'guest';
  const [checked, setChecked] = React.useState(false);

  useEffect(() => {
    if (isLoading) return;
    // ยังไม่ล็อกอิน: ลองสร้าง/ทดลองเล่นชุดใหม่ได้ (บันทึกเป็นฉบับร่างในเครื่อง) ขอสมัครตอนกดบันทึก · แก้ชุดที่มีอยู่ไม่ได้
    if (!allowed || !user) {
      if (id) router.replace('/create?gate=guest');
      else setChecked(true);
      return;
    }
    // ชุดคำถามครบโควต้าของแพ็กเกจ สร้างชุดใหม่ไม่ได้ (แก้ชุดเดิมได้)
    if (ent.sets !== null && !isDev && !id) {
      const supabase = createClient();
      Promise.all([
        supabase.from('user_games').select('id').eq('owner_id', user.id),
        supabase.from('profiles').select('games_created').eq('id', user.id).maybeSingle(),
      ]).then(([g, p]) => {
        if (atCap(planT, ent.sets, p.data?.games_created, g.data?.length ?? 0)) router.replace('/create?tab=library&gate=limit');
        else setChecked(true);
      });
      return;
    }
    setChecked(true);
  }, [isLoading, allowed, tier, id, user, router]);

  const guest = !allowed || !user || !profile;
  if (isLoading || !checked || (guest && id) || initial === undefined) {
    return (
      <div className="l5g-edit-loading">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }
  if (template !== 'quiz') {
    router.replace('/create');
    return null;
  }
  if (guest) return <QuizEditor gameId={null} userId="" username="" guest initial={initial || undefined} />;
  return <QuizEditor gameId={id && /^[0-9a-f-]{36}$/i.test(id) ? id : null} userId={user.id} username={profile.username} initial={id ? undefined : initial || undefined} />;
}

export default function EditPage() {
  return (
    <main className="l5g-world l5g-world-edit min-h-screen">
      <Suspense fallback={null}>
        <EditInner />
      </Suspense>
    </main>
  );
}
