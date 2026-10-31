'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { MagicGame } from '@/components/creator/games/magic/LazyMagicGame';
import { createClient } from '@/lib/supabase/client';
import { sanitizeQuiz } from '@/lib/game-creator/quiz';
import { mediaPrefix } from '@/lib/game-creator/prefix';
import { modeFit, modeQuiz } from '@/lib/game-creator/modes';
import { parseArSettings } from '@/lib/game-creator/arSettings';
import { MAGIC_BOSSES } from '@/lib/game-creator/magic/data';
import type { QuizQuestion } from '@/lib/game-creator/types';
import '@/components/creator/creator.css';

/** เล่นในเครื่องเดียว: Magic Kingdom AR (/play/magic?id=<ชุดคำถาม>&teams=&n=&t=&lv=&b=&st=&music=) */
function MagicInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const id = sp.get('id') || '';
  const settings = parseArSettings((k) => sp.get(k), MAGIC_BOSSES.map((b) => b.id));
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
        if (!modeFit(content, 'magic').ok) return setErr('ชุดคำถามนี้มีข้อแบบเลือกตอบไม่พอ (ต้องมีอย่างน้อย 3 ข้อ)');
        setData({ title: row.title, questions: modeQuiz(content, 'magic').questions });
      });
  }, [id]);

  const exit = () => (window.history.length > 1 ? router.back() : router.push('/create?tab=library'));

  if (err)
    return (
      <div className="fixed inset-0 grid place-items-center bg-[#2a1660] text-white p-6 text-center">
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
      <div className="fixed inset-0 grid place-items-center bg-[#2a1660] text-white">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  return <MagicGame questions={data.questions} settings={settings} title={data.title} onExit={exit} />;
}

export default function MagicPage() {
  return (
    <Suspense fallback={null}>
      <MagicInner />
    </Suspense>
  );
}
