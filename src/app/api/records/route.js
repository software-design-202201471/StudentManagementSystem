import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import Record from '@/models/Record';
import mongoose from 'mongoose';

/**
 * GET /api/records
 * 학생부 목록 조회 (교사 전용)
 *
 * 쿼리 파라미터:
 * - studentId: 특정 학생 ID로 필터링 (선택)
 */
export async function GET(request) {
  const { session, error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const studentIdParam = searchParams.get('studentId');

  // 테넌트 스코프
  const filter = { schoolId: session.user.schoolId };
  if (studentIdParam) {
    if (!mongoose.Types.ObjectId.isValid(studentIdParam)) {
      return Response.json(
        { error: '유효하지 않은 학생 ID입니다.' },
        { status: 400 }
      );
    }
    filter.studentId = studentIdParam;
  }

  try {
    const records = await Record.find(filter)
      .populate('studentId', 'name email grade classNumber studentNumber')
      .sort({ updatedAt: -1 });

    return Response.json({ records });
  } catch {
    return Response.json(
      { error: '학생부 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
