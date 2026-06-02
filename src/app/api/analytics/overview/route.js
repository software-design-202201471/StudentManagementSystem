import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import AnalyticsStudent from '@/models/AnalyticsStudent';
import AnalyticsSubject from '@/models/AnalyticsSubject';
import AnalyticsRun from '@/models/AnalyticsRun';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/overview
 * 대시보드 요약 카드용 (교사 전용).
 *
 * 응답: { overview: {
 *   totalStudents, totalSubjects, overallAverage,
 *   totalGradeRecords, totalFeedbacks, totalCounselings,
 *   lastAggregatedAt, recentRuns: [...최근 5건]
 * }}
 *
 * overallAverage는 성적이 1건 이상 있는 학생들의 평균(평균).
 * 성적 없는 학생은 평균에서 제외 (왜곡 방지).
 */
export async function GET() {
  const { session, error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  const sid = session.user.schoolId;

  try {
    const [students, subjects, lastRun, recentRuns] = await Promise.all([
      AnalyticsStudent.find({ schoolId: sid })
        .select(
          'averagePercentage gradeCount feedbackCount counselingCount'
        )
        .lean(),
      AnalyticsSubject.find({ schoolId: sid })
        .select('subject averagePercentage studentCount gradeCount')
        .lean(),
      AnalyticsRun.findOne({ schoolId: sid }).sort({ createdAt: -1 }).lean(),
      AnalyticsRun.find({ schoolId: sid })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const totalStudents = students.length;
    const totalSubjects = subjects.length;

    const withGrades = students.filter((s) => (s.gradeCount || 0) > 0);
    const overallAverage = withGrades.length
      ? Math.round(
          withGrades.reduce(
            (a, s) => a + (s.averagePercentage || 0),
            0
          ) / withGrades.length
        )
      : 0;

    const totalGradeRecords = students.reduce(
      (a, s) => a + (s.gradeCount || 0),
      0
    );
    const totalFeedbacks = students.reduce(
      (a, s) => a + (s.feedbackCount || 0),
      0
    );
    const totalCounselings = students.reduce(
      (a, s) => a + (s.counselingCount || 0),
      0
    );

    return Response.json({
      overview: {
        totalStudents,
        totalSubjects,
        overallAverage,
        totalGradeRecords,
        totalFeedbacks,
        totalCounselings,
        lastAggregatedAt:
          lastRun?.finishedAt || lastRun?.createdAt || null,
        recentRuns,
      },
    });
  } catch {
    return Response.json(
      { error: '분석 개요 조회 실패' },
      { status: 500 }
    );
  }
}
