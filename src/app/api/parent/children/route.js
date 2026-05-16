import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import User from '@/models/User';

/**
 * GET /api/parent/children
 * 학부모 본인의 자녀(parentOf) 목록 조회
 *
 * 응답: { children: [{ _id, name, email, grade, classNumber, studentNumber }] }
 */
export async function GET() {
  const { session, error } = await requireAuth(['parent']);
  if (error) return error;

  await connectDB();

  try {
    const parent = await User.findById(session.user.id)
      .select('parentOf')
      .populate(
        'parentOf',
        'name email grade classNumber studentNumber role'
      );

    // role === 'student'인 사용자만 (혹시 잘못 등록된 ref 방어)
    const children = (parent?.parentOf || [])
      .filter((c) => c && c.role === 'student')
      .map((c) => ({
        _id: c._id,
        name: c.name,
        email: c.email,
        grade: c.grade,
        classNumber: c.classNumber,
        studentNumber: c.studentNumber,
      }))
      .sort((a, b) => {
        const ga = a.grade ?? 0;
        const gb = b.grade ?? 0;
        if (ga !== gb) return ga - gb;
        const ca = a.classNumber ?? 0;
        const cb = b.classNumber ?? 0;
        if (ca !== cb) return ca - cb;
        const na = a.studentNumber ?? 0;
        const nb = b.studentNumber ?? 0;
        return na - nb;
      });

    return Response.json({ children });
  } catch {
    return Response.json(
      { error: '자녀 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
