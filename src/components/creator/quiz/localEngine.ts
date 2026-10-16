import type { PublicQuestion, QuizContent } from '@/lib/game-creator/types';
import { checkAnswer, correctIds, endlessIndex, isTimeout, playableQuiz, publicQuestion, questionOrder, scoreFor, uid } from '@/lib/game-creator/quiz';
import type { AnswerOutcome, QuizEngine } from './QuizRunner';

/**
 * ตัวเล่นในเครื่อง (ใช้ "ทดลองเล่น" ในหน้าแก้ไข ไม่ต้องเปิดห้อง)
 * endless = คำถามวนซ้ำไม่จำกัด (โหมดเกม Café / Tower / Racing)
 */
export function localEngine(content: QuizContent, opts: { shuffleQuestions?: boolean; shuffleChoices?: boolean; startAt?: number; endless?: boolean } = {}): QuizEngine {
  const quiz = playableQuiz(content);
  const n = quiz.questions.length;
  const seed = uid();
  const order = questionOrder(n, !!opts.shuffleQuestions, seed);
  let pos = Math.min(opts.startAt ?? 0, n);
  let startedAt = 0;
  let score = 0;
  let streak = 0;
  const at = (p: number) => (opts.endless ? quiz.questions[endlessIndex(n, p, seed)] : quiz.questions[order[p]]);
  return {
    async next(): Promise<PublicQuestion | null> {
      const q = at(pos);
      if (!q) return null;
      startedAt = performance.now();
      const pq = publicQuestion(q, pos, opts.endless ? 0 : n, { shuffleChoices: !!opts.shuffleChoices || !!opts.endless, seed: `${seed}:${pos}`, elapsedMs: 0 });
      if (opts.endless) pq.time = 0;
      return pq;
    },
    async answer(pq, picks): Promise<AnswerOutcome | null> {
      const q = at(pos);
      if (!q || q.id !== pq.id) return null;
      const elapsed = performance.now() - startedAt;
      const timeout = !opts.endless && isTimeout(q, elapsed);
      const correct = !timeout && checkAnswer(q, picks);
      const points = opts.endless ? 0 : scoreFor(q, correct, elapsed, streak);
      streak = correct ? streak + 1 : 0;
      score += points;
      pos++;
      return { correct, timeout, points, correctIds: correctIds(q), score, streak, finished: !opts.endless && pos >= n };
    },
  };
}
