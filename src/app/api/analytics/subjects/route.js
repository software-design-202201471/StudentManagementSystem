import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import AnalyticsSubject from '@/models/AnalyticsSubject';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/subjects
 * 분석 과목 목록 (교사 전용).
 *
 * Query:
 * - sortBy: 'average' (기본, 평균 desc) | 'name' (과목명 asc) | 'students' (응시 학생 수 desc)
 */
export async function GET(request) {
  const { error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sortBy') || 'average';

  const sortMap = {
    average: { averagePercentage: -1 },
    name: { subject: 1 },
    students: { studentCount: -1 },
  };
  const sort = sortMap[sortBy] || sortMap.average;

  try {
    const subjects = await AnalyticsSubject.find().sort(sort).lean();
    return Response.json({ subjects });
  } catch {
    return Response.json(
      { error: '분석 과목 목록 조회 실패' },
      { status: 500 }
    );
  }
}
