import mongoose from 'mongoose';

/**
 * 분석(OLAP) 전용 — 집계 적재 실행 이력/메타.
 *
 * 언제·무엇이·어떻게 재집계를 트리거했는지 기록.
 * 용도: 대시보드 "마지막 갱신 시각" 표시, 적재 모니터링, 디버깅,
 *       멱등성/성능 검증(Sprint 10).
 *
 * - 컬렉션명 'analytics_runs'로 운영 스키마와 분리
 * - append-only 로그 성격 (학생/과목 문서와 달리 unique 제약 없음)
 */
const AnalyticsRunSchema = new mongoose.Schema(
  {
    // 트리거 출처
    trigger: {
      type: String,
      enum: ['manual', 'event', 'scheduled'],
      required: true,
    },

    // 적재 범위
    scope: {
      type: String,
      enum: ['all', 'student', 'subject'],
      required: true,
    },

    // scope 대상 (scope='student'면 targetStudentId, 'subject'면 targetSubject)
    targetStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    targetSubject: { type: String, default: null },

    // 트리거 원인 운영 이벤트 (예: 'grade.create', 'feedback.update', 'counseling.delete')
    source: { type: String, default: '' },

    // 수동 실행 시 실행 교사
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // 실행 상태
    status: {
      type: String,
      enum: ['running', 'success', 'partial', 'failed'],
      default: 'running',
    },

    // 처리 통계
    studentsProcessed: { type: Number, default: 0 },
    subjectsProcessed: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },

    // 실패 시 메시지
    error: { type: String, default: '' },

    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// 최근 실행 조회 (대시보드 "마지막 갱신")
AnalyticsRunSchema.index({ createdAt: -1 });

// 상태/트리거별 필터링
AnalyticsRunSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.AnalyticsRun ||
  mongoose.model('AnalyticsRun', AnalyticsRunSchema, 'analytics_runs');
