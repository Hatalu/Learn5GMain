import type { PublicQuestion, QuizContent } from '@/lib/game-creator/types';
import { checkAnswer, correctIds, isTimeout, playableQuiz, publicQuestion, questionOrder, scoreFor, uid } from '@/lib/game-creator/quiz';
import type { AnswerOutcome, QuizEngine } from './QuizRunner';

/** ตัวเล่นในเครื่อง (ใช้ "ทดลองเล่น" ในหน้าแก้ไข ไม่ต้องเปิดห้อง) */
export function localEngine(content: QuizContent, opts: { shuffleQuestions?: boolean; shuffleChoices?: boolean; startAt?: number } = {}): QuizEngine {
  const quiz = playableQuiz(content);
  const seed = uid();
  const order = questionOrder(quiz.questions.length, !!opts.shuffleQuestions, seed);
  let pos = Math.min(opts.startAt ?? 0, quiz.questions.length);
  let startedAt = 0;
  let score = 0;
  let streak = 0;
  return {
    async next(): Promise<PublicQuestion | null> {
      const q = quiz.questions[order[pos]];
      if (!q) return null;
      startedAt = performance.now();
      return publicQuestion(q, pos, quiz.questions.length, { shuffleChoices: !!opts.shuffleChoices, seed, elapsedMs: 0 });
    },
    async answer(pq, picks): Promise<AnswerOutcome | null> {
      const q = quiz.questions[order[pos]];
      if (!q || q.id !== pq.id) return null;
      const elapsed = performance.now() - startedAt;
      const timeout = isTimeout(q, elapsed);
      const correct = !timeout && checkAnswer(q, picks);
      const points = scoreFor(q, correct, elapsed, streak);
      streak = correct ? streak + 1 : 0;
      score += points;
      pos++;
      return { correct, timeout, points, correctIds: correctIds(q), score, streak, finished: pos >= quiz.questions.length };
    },
  };
}
