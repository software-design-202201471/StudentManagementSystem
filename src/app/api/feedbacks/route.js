import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import Feedback from '@/models/Feedback';
import User from '@/models/User';
import mongoose from 'mongoose';

const VALID_CATEGORIES = ['grade', 'behavior', 'attitude', 'attendance'];

/**
 * GET /api/feedbacks
 * 피드백 목록 조회
 *
 * 권한:
 * - teacher: 전체 피드백 (studentId/teacherId/category 필터 가능)
 * - student: 본인 피드백 중 isVisibleToStudent=true 만
 * - parent: 자녀 피드백 중 isVisibleToParent=true 만 (studentId 필수, parentOf 검증)
 *
 * 쿼리 파라미터:
 * - studentId: 특정 학생 ID
 * - teacherId: 특정 교사 ID
 * - category: 'grade' | 'behavior' | 'attitude' | 'attendance'
 */
export async function GET(request) {
  const { session, error } = await requireAuth([
    'teacher',
    'student',
    'parent',
  ]);
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const studentIdParam = searchParams.get('studentId');
  const teacherIdParam = searchParams.get('teacherId');
  const categoryParam = searchParams.get('category');

  const filter = {};

  // 역할별 접근 제어
  if (session.user.role === 'student') {
    filter.studentId = session.user.id;
    filter.isVisibleToStudent = true;
  } else if (session.user.role === 'parent') {
    if (!studentIdParam) {
      return Response.json(
        { error: '학생 ID가 필요합니다.' },
        { status: 400 }
      );
    }
    if (!mongoose.Types.ObjectId.isValid(studentIdParam)) {
      return Response.json(
        { error: '유효하지 않은 학생 ID입니다.' },
        { status: 400 }
      );
    }
    // parentOf 검증
    const parent = await User.findById(session.user.id).select('parentOf');
    const isOwnChild = parent?.parentOf?.some(
      (childId) => childId.toString() === studentIdParam
    );
    if (!isOwnChild) {
      return Response.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }
    filter.studentId = studentIdParam;
    filter.isVisibleToParent = true;
  } else if (session.user.role === 'teacher') {
    if (studentIdParam) {
      if (!mongoose.Types.ObjectId.isValid(studentIdParam)) {
        return Response.json(
          { error: '유효하지 않은 학생 ID입니다.' },
          { status: 400 }
        );
      }
      filter.studentId = studentIdParam;
    }
    if (teacherIdParam) {
      if (!mongoose.Types.ObjectId.isValid(teacherIdParam)) {
        return Response.json(
          { error: '유효하지 않은 교사 ID입니다.' },
          { status: 400 }
        );
      }
      filter.teacherId = teacherIdParam;
    }
  }

  if (categoryParam) {
    if (!VALID_CATEGORIES.includes(categoryParam)) {
      return Response.json(
        { error: '유효하지 않은 카테고리입니다.' },
        { status: 400 }
      );
    }
    filter.category = categoryParam;
  }

  try {
    const feedbacks = await Feedback.find(filter)
      .populate(
        'studentId',
        'name email grade classNumber studentNumber'
      )
      .populate('teacherId', 'name email')
      .sort({ createdAt: -1 });

    return Response.json({ feedbacks });
  } catch {
    return Response.json(
      { error: '피드백 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feedbacks
 * 피드백 작성 (교사 전용)
 *
 * Body:
 * - studentId: ObjectId (필수)
 * - category: 'grade' | 'behavior' | 'attitude' | 'attendance' (필수)
 * - content: string (필수)
 * - isVisibleToStudent?: boolean (default false)
 * - isVisibleToParent?: boolean (default false)
 */
export async function POST(request) {
  const { session, error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: '요청 본문이 유효하지 않습니다.' },
      { status: 400 }
    );
  }

  const { studentId, category, content, isVisibleToStudent, isVisibleToParent } =
    body;

  if (!studentId || !category || !content) {
    return Response.json(
      { error: '필수 필드가 누락되었습니다.' },
      { status: 400 }
    );
  }

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return Response.json(
      { error: '유효하지 않은 학생 ID입니다.' },
      { status: 400 }
    );
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return Response.json(
      { error: '유효하지 않은 카테고리입니다.' },
      { status: 400 }
    );
  }

  // 학생 존재 검증
  const student = await User.findById(studentId).select('role');
  if (!student || student.role !== 'student') {
    return Response.json(
      { error: '해당 학생을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  try {
    const created = await Feedback.create({
      studentId,
      teacherId: session.user.id,
      category,
      content,
      isVisibleToStudent: Boolean(isVisibleToStudent),
      isVisibleToParent: Boolean(isVisibleToParent),
    });

    const populated = await Feedback.findById(created._id)
      .populate(
        'studentId',
        'name email grade classNumber studentNumber'
      )
      .populate('teacherId', 'name email');

    return Response.json({ feedback: populated }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: err.message || '피드백 작성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
