import mongoose from 'mongoose';

/**
 * 분석(OLAP) 전용 — 학생별 학습 현황 집계 문서.
 *
 * 운영 컬렉션(grades/records/feedbacks/counselings)을 집계해 저장하는
 * read-optimized 스냅샷. 대시보드에서 join/aggregate 없이 즉시 조회용.
 *
 * - 컬렉션명을 'analytics_students'로 명시해 운영 스키마와 분리
 *   (동일 클러스터 내 운영/분석 스키마 구분 — 과제 요구사항 충족)
 * - 학생당 1개 문서 (studentId unique), 변경 이벤트 기반으로 재집계됨
 */

const SemesterStatSchema = new mongoose.Schema(
  {
    semester: { type: String, required: true },
    count: { type: Number, default: 0 },
    averagePercentage: { type: Number, default: 0 },
  },
  { _id: false }
);

const SubjectStatSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    count: { type: Number, default: 0 },
    averagePercentage: { type: Number, default: 0 },
    latestGrade: { type: String, default: '' },
  },
  { _id: false }
);

const AnalyticsStudentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // 신상 스냅샷 (집계 시점 복사 — populate 없이 바로 표시/필터용)
    name: { type: String, default: '' },
    grade: { type: Number, default: null },
    classNumber: { type: Number, default: null },
    studentNumber: { type: Number, default: null },

    // 성적 집계
    gradeCount: { type: Number, default: 0 },
    averagePercentage: { type: Number, default: 0 },
    semesterStats: { type: [SemesterStatSchema], default: [] },
    subjectStats: { type: [SubjectStatSchema], default: [] },

    // 출결 집계 (Record.attendance 스냅샷)
    attendance: {
      absent: { type: Number, default: 0 },
      late: { type: Number, default: 0 },
      early: { type: Number, default: 0 },
    },

    // 피드백 집계
    feedbackCount: { type: Number, default: 0 },
    feedbackByCategory: {
      grade: { type: Number, default: 0 },
      behavior: { type: Number, default: 0 },
      attitude: { type: Number, default: 0 },
      attendance: { type: Number, default: 0 },
    },

    // 상담 집계
    counselingCount: { type: Number, default: 0 },
    lastCounselingDate: { type: Date, default: null },

    // 집계 메타
    lastAggregatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// 반별 조회·정렬 (대시보드 학생 목록)
AnalyticsStudentSchema.index({ grade: 1, classNumber: 1, studentNumber: 1 });

// 평균 백분율 랭킹/정렬
AnalyticsStudentSchema.index({ averagePercentage: -1 });

export default mongoose.models.AnalyticsStudent ||
  mongoose.model(
    'AnalyticsStudent',
    AnalyticsStudentSchema,
    'analytics_students'
  );
