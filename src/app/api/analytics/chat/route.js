import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import { answerQuestion } from '@/lib/studentChatbot';
import { answerWithGemini } from '@/lib/geminiChat';
import AnalyticsStudent from '@/models/AnalyticsStudent';
import mongoose from 'mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/analytics/chat
 * 학습 도우미 — 학생 분석 데이터 기반 질문 응답 (교사 전용).
 * GEMINI_API_KEY 있으면 Gemini(익명 집계만 전송), 실패/미설정 시 규칙 기반 폴백.
 * 분석 문서는 본인 학교 범위만.
 *
 * Body: { studentId, message }
 * 응답: { reply, engine: 'gemini'|'rule' }
 */
export async function POST(request) {
  const { session, error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: '요청 본문이 유효하지 않습니다.' },
      { status: 400 }
    );
  }

  const { studentId, message } = body;
  if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
    return Response.json(
      { error: '유효한 학생 ID가 필요합니다.' },
      { status: 400 }
    );
  }

  const doc = await AnalyticsStudent.findOne({
    studentId,
    schoolId: session.user.schoolId,
  }).lean();

  // Gemini 우선 (익명 집계만 전송) → 실패 시 규칙 기반 폴백
  let reply = null;
  let engine = 'rule';
  if (doc && process.env.GEMINI_API_KEY) {
    try {
      reply = await answerWithGemini(doc, message);
      engine = 'gemini';
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[chat] Gemini 폴백:', err?.message);
      reply = null;
    }
  }
  if (!reply) {
    reply = answerQuestion(doc, message);
    engine = 'rule';
  }

  return Response.json({ reply, engine });
}
