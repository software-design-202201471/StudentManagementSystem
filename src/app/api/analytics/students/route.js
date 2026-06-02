import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import AnalyticsStudent from '@/models/AnalyticsStudent';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/students
 * 분석 학생 목록 (교사 전용).
 *
 * Query:
 * - grade: Number (학년 필터)
 * - classNumber: Number (반 필터)
 * - sortBy: 'class' (기본, 학년/반/번호) | 'average' (평균 백분율 desc) | 'name'
 */
export async function GET(request) {
  const { session, error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const grade = searchParams.get('grade');
  const classNumber = searchParams.get('classNumber');
  const sortBy = searchParams.get('sortBy') || 'class';

  // 테넌트 스코프
  const filter = { schoolId: session.user.schoolId };
  if (grade) filter.grade = Number(grade);
  if (classNumber) filter.classNumber = Number(classNumber);

  const sortMap = {
    class: { grade: 1, classNumber: 1, studentNumber: 1 },
    average: { averagePercentage: -1 },
    name: { name: 1 },
  };
  const sort = sortMap[sortBy] || sortMap.class;

  try {
    const students = await AnalyticsStudent.find(filter).sort(sort).lean();
    return Response.json({ students });
  } catch {
    return Response.json(
      { error: '분석 학생 목록 조회 실패' },
      { status: 500 }
    );
  }
}
