import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import User from '@/models/User';

/**
 * GET /api/students
 * 학생 목록 조회 (교사 전용)
 *
 * 응답 필드: _id, name, email, grade, classNumber, studentNumber
 * 정렬: 학년 → 반 → 번호 → 이름
 */
export async function GET() {
  const { session, error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  try {
    // 테넌트 스코프 — 본인 학교 + 활성 학생만
    const students = await User.find({
      role: 'student',
      schoolId: session.user.schoolId,
      status: 'active',
    })
      .select('name email grade classNumber studentNumber')
      .sort({ grade: 1, classNumber: 1, studentNumber: 1, name: 1 });

    return Response.json({ students });
  } catch {
    return Response.json(
      { error: '학생 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
