import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import AnalyticsStudent from '@/models/AnalyticsStudent';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/students/[studentId]
 * 단일 학생 분석 상세 (교사 전용).
 */
export async function GET(request, { params }) {
  const { session, error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  const { studentId } = await params;
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return Response.json(
      { error: '유효하지 않은 학생 ID입니다.' },
      { status: 400 }
    );
  }

  try {
    const student = await AnalyticsStudent.findOne({
      studentId,
      schoolId: session.user.schoolId,
    }).lean();
    if (!student) {
      return Response.json(
        { error: '해당 학생의 분석 데이터를 찾을 수 없습니다. (재집계 필요)' },
        { status: 404 }
      );
    }
    return Response.json({ student });
  } catch {
    return Response.json(
      { error: '분석 학생 조회 실패' },
      { status: 500 }
    );
  }
}
