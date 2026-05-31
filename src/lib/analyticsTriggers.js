import { connectDB } from '@/lib/mongoose';
import { aggregateStudent, aggregateSubject } from '@/lib/analytics';
import AnalyticsRun from '@/models/AnalyticsRun';

/**
 * 변경 이벤트 기반 분석 자동 적재 트리거.
 *
 * 운영 API(Grade/Feedback/Counseling/Record CUD) 직후 호출.
 * fire-and-forget — 호출자는 await 안 해도 됨, 응답 지연 0.
 * 실패는 콘솔 로깅 + AnalyticsRun에 status='failed' 기록, 운영 응답엔 영향 없음.
 *
 * Vercel serverless 주의: 함수 종료와 cleanup 사이 race 가능성 있으나,
 * 단일 학생/과목 집계는 수 ms~수십 ms로 보통 응답 전 완료. 안정성 강화 필요 시
 * 큐 시스템 도입 검토 (Sprint 10).
 */

/**
 * 학생 1명의 분석 재집계를 fire-and-forget으로 트리거.
 * @param {string|object} studentId
 * @param {string} source - 트리거 출처 (예: 'grade.create', 'feedback.update')
 */
export function fireStudentRecompute(studentId, source) {
  runStudent(studentId, source).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[analyticsTriggers] student uncaught:', err?.message);
  });
}

/**
 * 과목 1개의 분석 재집계를 fire-and-forget으로 트리거.
 * @param {string} subject
 * @param {string} source
 */
export function fireSubjectRecompute(subject, source) {
  runSubject(subject, source).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[analyticsTriggers] subject uncaught:', err?.message);
  });
}

async function runStudent(studentId, source) {
  await connectDB();
  const run = await AnalyticsRun.create({
    trigger: 'event',
    scope: 'student',
    targetStudentId: studentId,
    source: source || 'unknown',
    status: 'running',
    startedAt: new Date(),
  });
  const start = Date.now();
  try {
    const r = await aggregateStudent(studentId);
    await AnalyticsRun.findByIdAndUpdate(run._id, {
      $set: {
        status: 'success',
        studentsProcessed: r ? 1 : 0,
        durationMs: Date.now() - start,
        finishedAt: new Date(),
      },
    });
  } catch (err) {
    await AnalyticsRun.findByIdAndUpdate(run._id, {
      $set: {
        status: 'failed',
        durationMs: Date.now() - start,
        error: err?.message || 'unknown',
        finishedAt: new Date(),
      },
    });
    // eslint-disable-next-line no-console
    console.error(
      '[analyticsTriggers] student aggregate failed:',
      err?.message
    );
  }
}

async function runSubject(subject, source) {
  await connectDB();
  const run = await AnalyticsRun.create({
    trigger: 'event',
    scope: 'subject',
    targetSubject: subject,
    source: source || 'unknown',
    status: 'running',
    startedAt: new Date(),
  });
  const start = Date.now();
  try {
    const r = await aggregateSubject(subject);
    await AnalyticsRun.findByIdAndUpdate(run._id, {
      $set: {
        status: 'success',
        subjectsProcessed: r ? 1 : 0,
        durationMs: Date.now() - start,
        finishedAt: new Date(),
      },
    });
  } catch (err) {
    await AnalyticsRun.findByIdAndUpdate(run._id, {
      $set: {
        status: 'failed',
        durationMs: Date.now() - start,
        error: err?.message || 'unknown',
        finishedAt: new Date(),
      },
    });
    // eslint-disable-next-line no-console
    console.error(
      '[analyticsTriggers] subject aggregate failed:',
      err?.message
    );
  }
}
