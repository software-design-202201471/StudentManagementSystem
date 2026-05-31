import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import {
  aggregateAll,
  aggregateStudent,
  aggregateSubject,
} from '@/lib/analytics';
import AnalyticsRun from '@/models/AnalyticsRun';
import mongoose from 'mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/analytics/recompute
 * 분석 집계를 수동으로 재실행 (교사 전용).
 *
 * Body (모두 선택):
 * - scope: 'all' (default) | 'student' | 'subject'
 * - studentId: scope='student'일 때 ObjectId
 * - subject:   scope='subject'일 때 과목명
 *
 * 응답: { run: AnalyticsRun, result: { studentsProcessed, subjectsProcessed, durationMs } }
 *
 * 실행 이력은 AnalyticsRun에 status='running' → 'success'/'failed'로 기록.
 */
export async function POST(request) {
  const { session, error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  // body 없거나 잘못된 JSON이어도 scope=all default로 동작
  let body = {};
  try {
    body = (await request.json()) || {};
  } catch {
    body = {};
  }

  const scope = body.scope || 'all';
  if (!['all', 'student', 'subject'].includes(scope)) {
    return Response.json(
      { error: '유효하지 않은 scope입니다. (all|student|subject)' },
      { status: 400 }
    );
  }

  let targetStudentId = null;
  let targetSubject = null;

  if (scope === 'student') {
    if (
      !body.studentId ||
      !mongoose.Types.ObjectId.isValid(body.studentId)
    ) {
      return Response.json(
        { error: '유효한 studentId가 필요합니다.' },
        { status: 400 }
      );
    }
    targetStudentId = body.studentId;
  } else if (scope === 'subject') {
    if (typeof body.subject !== 'string' || !body.subject.trim()) {
      return Response.json(
        { error: 'subject가 필요합니다.' },
        { status: 400 }
      );
    }
    targetSubject = body.subject.trim();
  }

  // 실행 이력 시작
  const run = await AnalyticsRun.create({
    trigger: 'manual',
    scope,
    targetStudentId,
    targetSubject,
    source: 'api.recompute',
    triggeredBy: session.user.id,
    status: 'running',
    startedAt: new Date(),
  });

  const startMs = Date.now();
  let studentsProcessed = 0;
  let subjectsProcessed = 0;

  try {
    if (scope === 'all') {
      const r = await aggregateAll();
      studentsProcessed = r.studentsProcessed;
      subjectsProcessed = r.subjectsProcessed;
    } else if (scope === 'student') {
      const r = await aggregateStudent(targetStudentId);
      studentsProcessed = r ? 1 : 0;
    } else if (scope === 'subject') {
      const r = await aggregateSubject(targetSubject);
      subjectsProcessed = r ? 1 : 0;
    }

    const durationMs = Date.now() - startMs;
    const updated = await AnalyticsRun.findByIdAndUpdate(
      run._id,
      {
        $set: {
          status: 'success',
          studentsProcessed,
          subjectsProcessed,
          durationMs,
          finishedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return Response.json({
      run: updated,
      result: { studentsProcessed, subjectsProcessed, durationMs },
    });
  } catch (err) {
    const durationMs = Date.now() - startMs;
    await AnalyticsRun.findByIdAndUpdate(run._id, {
      $set: {
        status: 'failed',
        durationMs,
        error: err?.message || 'unknown',
        finishedAt: new Date(),
      },
    });
    // eslint-disable-next-line no-console
    console.error('[analytics] recompute failed:', err);
    return Response.json(
      { error: err?.message || '집계 실패' },
      { status: 500 }
    );
  }
}
