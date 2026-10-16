'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { hasMembership } from '@/lib/membership';
import { QuizEditor } from '@/components/creator/quiz/QuizEditor';
import { NightSky } from '@/components/fx/NightSky';
import '@/components/creator/creator.css';
import '@/components/creator/creator-pages.css';

function EditInner() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  // ใช้ค่าตอนเปิดหน้าเท่านั้น (หลังบันทึกเกมใหม่ URL จะเปลี่ยนเป็น ?id=... โดยไม่ต้องโหลดตัวแก้ไขใหม่)
  const [id] = React.useState(() => sp.get('id'));
  const template = sp.get('template') || 'quiz';
  const member = !!user && hasMembership(profile) && !String(profile?.username || '').startsWith('trial_');

  useEffect(() => {
    if (!isLoading && !member) router.replace('/create');
  }, [isLoading, member, router]);

  if (isLoading || !member || !user || !profile) {
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
  return <QuizEditor gameId={id && /^[0-9a-f-]{36}$/i.test(id) ? id : null} userId={user.id} username={profile.username} />;
}

export default function EditPage() {
  return (
    <main className="l5g-world l5g-world-edit min-h-screen">
      <NightSky />
      <Suspense fallback={null}>
        <EditInner />
      </Suspense>
    </main>
  );
}
