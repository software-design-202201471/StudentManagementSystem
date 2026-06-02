import mongoose from 'mongoose';

/**
 * 분석(OLAP) 전용 — 과목별 학습 현황 집계 문서.
 *
 * 학교 전체 차원에서 과목 단위로 성적을 집계한 read-optimized 스냅샷.
 * - 컬렉션명 'analytics_subjects'로 운영 스키마와 분리
 * - 과목당 1개 문서 (subject unique), 변경 이벤트 기반 재집계
 */

const SemesterStatSchema = new mongoose.Schema(
  {
    semester: { type: String, required: true },
    count: { type: Number, default: 0 },
    averagePercentage: { type: Number, default: 0 },
  },
  { _id: false }
);

// 등급 분포: grade 키에 'A+','B+' 등 '+' 포함되어 객체 키로 부적합 → 배열로 저장
const GradeDistributionSchema = new mongoose.Schema(
  {
    grade: { type: String, required: true },
    count: { type: Number, default: 0 },
  },
  { _id: false }
);

const AnalyticsSubjectSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },

    // 성적 집계
    gradeCount: { type: Number, default: 0 }, // 등록 성적 레코드 수
    studentCount: { type: Number, default: 0 }, // 응시 학생 수 (중복 제거)
    averagePercentage: { type: Number, default: 0 },
    maxPercentage: { type: Number, default: 0 },
    minPercentage: { type: Number, default: 0 },

    // 등급 분포 (GRADE_SCALE 순서대로: A+, A, B+, B, C+, C, D, F)
    gradeDistribution: { type: [GradeDistributionSchema], default: [] },

    // 학기별 통계
    semesterStats: { type: [SemesterStatSchema], default: [] },

    // 집계 메타
    lastAggregatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// 학교 내 과목 유일성
AnalyticsSubjectSchema.index({ schoolId: 1, subject: 1 }, { unique: true });

// 평균 백분율 랭킹/정렬
AnalyticsSubjectSchema.index({ schoolId: 1, averagePercentage: -1 });

export default mongoose.models.AnalyticsSubject ||
  mongoose.model(
    'AnalyticsSubject',
    AnalyticsSubjectSchema,
    'analytics_subjects'
  );
