'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ArGame } from '@/components/creator/games/ar/LazyArGame';
import { createClient } from '@/lib/supabase/client';
import { sanitizeQuiz } from '@/lib/game-creator/quiz';
import { mediaPrefix } from '@/lib/game-creator/prefix';
import { modeFit, modeQuiz } from '@/lib/game-creator/modes';
import { parseArSettings } from '@/lib/game-creator/arSettings';
import type { QuizQuestion } from '@/lib/game-creator/types';
import '@/components/creator/creator.css';

/** เล่นในเครื่องเดียว: สงครามอวกาศ AR (/play/ar?id=<ชุดคำถาม>&teams=&n=&t=&lv=&music=) */
function ArInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const id = sp.get('id') || '';
  const settings = parseArSettings((k) => sp.get(k));
  const [data, setData] = useState<{ title: string; questions: QuizQuestion[] } | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      setErr('ไม่พบชุดคำถามนี้');
      return;
    }
    createClient()
      .from('user_games')
      .select('title, content')
      .eq('id', id)
      .maybeSingle()
      .then(({ data: row, error }) => {
        if (error || !row) return setErr('เปิดชุดคำถามนี้ไม่ได้ (ต้องเข้าสู่ระบบด้วยบัญชีเจ้าของชุด หรือชุดที่เปิดสาธารณะ)');
        const content = sanitizeQuiz(row.content, mediaPrefix());
        if (!modeFit(content, 'ar').ok) return setErr('ชุดคำถามนี้มีข้อแบบเลือกตอบไม่พอ (ต้องมีอย่างน้อย 3 ข้อ)');
        setData({ title: row.title, questions: modeQuiz(content, 'ar').questions });
      });
  }, [id]);

  const exit = () => (window.history.length > 1 ? router.back() : router.push('/create?tab=library'));

  if (err)
    return (
      <div className="fixed inset-0 grid place-items-center bg-[#120c3a] text-white p-6 text-center">
        <div>
          <p className="font-bold text-lg mb-4">{err}</p>
          <button type="button" className="l5g-btn l5g-btn-go" onClick={exit}>
            กลับ
          </button>
        </div>
      </div>
    );
  if (!data)
    return (
      <div className="fixed inset-0 grid place-items-center bg-[#120c3a] text-white">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  return <ArGame questions={data.questions} settings={settings} title={data.title} onExit={exit} />;
}

export default function ArPage() {
  return (
    <Suspense fallback={null}>
      <ArInner />
    </Suspense>
  );
}
