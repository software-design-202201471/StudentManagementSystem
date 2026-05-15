import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import Feedback from '@/models/Feedback';
import User from '@/models/User';
import mongoose from 'mongoose';

const VALID_CATEGORIES = ['grade', 'behavior', 'attitude', 'attendance'];

/**
 * GET /api/feedbacks/[id]
 * 단일 피드백 조회
 *
 * 권한:
 * - teacher: 모두
 * - student: 본인 피드백 + isVisibleToStudent=true
 * - parent: 자녀 피드백 + isVisibleToParent=true (parentOf 검증)
 */
export async function GET(request, { params }) {
  const { session, error } = await requireAuth([
    'teacher',
    'student',
    'parent',
  ]);
  if (error) return error;

  await connectDB();

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json(
      { error: '유효하지 않은 ID입니다.' },
      { status: 400 }
    );
  }

  try {
    const feedback = await Feedback.findById(id)
      .populate(
        'studentId',
        'name email grade classNumber studentNumber'
      )
      .populate('teacherId', 'name email');

    if (!feedback) {
      return Response.json(
        { error: '피드백을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const studentIdStr = feedback.studentId?._id?.toString();

    // 학생: 본인 + 공개
    if (session.user.role === 'student') {
      if (studentIdStr !== session.user.id || !feedback.isVisibleToStudent) {
        return Response.json(
          { error: '접근 권한이 없습니다.' },
          { status: 403 }
        );
      }
    }

    // 학부모: 자녀 + 공개
    if (session.user.role === 'parent') {
      if (!feedback.isVisibleToParent) {
        return Response.json(
          { error: '접근 권한이 없습니다.' },
          { status: 403 }
        );
      }
      const parent = await User.findById(session.user.id).select('parentOf');
      const isOwnChild = parent?.parentOf?.some(
        (childId) => childId.toString() === studentIdStr
      );
      if (!isOwnChild) {
        return Response.json(
          { error: '접근 권한이 없습니다.' },
          { status: 403 }
        );
      }
    }

    return Response.json({ feedback });
  } catch {
    return Response.json(
      { error: '피드백 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/feedbacks/[id]
 * 피드백 수정 (교사 전용, 본인 작성만)
 *
 * 수정 가능 필드: category, content, isVisibleToStudent, isVisibleToParent
 * (studentId/teacherId는 변경 불가)
 */
export async function PATCH(request, { params }) {
  const { session, error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json(
      { error: '유효하지 않은 ID입니다.' },
      { status: 400 }
    );
  }

  try {
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return Response.json(
        { error: '피드백을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (feedback.teacherId.toString() !== session.user.id) {
      return Response.json(
        { error: '본인이 작성한 피드백만 수정할 수 있습니다.' },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: '요청 본문이 유효하지 않습니다.' },
        { status: 400 }
      );
    }

    const updates = {};

    if (body.category !== undefined) {
      if (!VALID_CATEGORIES.includes(body.category)) {
        return Response.json(
          { error: '유효하지 않은 카테고리입니다.' },
          { status: 400 }
        );
      }
      updates.category = body.category;
    }

    if (body.content !== undefined) {
      if (typeof body.content !== 'string' || body.content.trim() === '') {
        return Response.json(
          { error: '내용은 빈 문자열일 수 없습니다.' },
          { status: 400 }
        );
      }
      updates.content = body.content;
    }

    if (body.isVisibleToStudent !== undefined) {
      updates.isVisibleToStudent = Boolean(body.isVisibleToStudent);
    }

    if (body.isVisibleToParent !== undefined) {
      updates.isVisibleToParent = Boolean(body.isVisibleToParent);
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { error: '업데이트할 필드가 없습니다.' },
        { status: 400 }
      );
    }

    const updated = await Feedback.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    })
      .populate(
        'studentId',
        'name email grade classNumber studentNumber'
      )
      .populate('teacherId', 'name email');

    return Response.json({ feedback: updated });
  } catch (err) {
    return Response.json(
      { error: err.message || '피드백 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/feedbacks/[id]
 * 피드백 삭제 (교사 전용, 본인 작성만)
 */
export async function DELETE(request, { params }) {
  const { session, error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json(
      { error: '유효하지 않은 ID입니다.' },
      { status: 400 }
    );
  }

  try {
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return Response.json(
        { error: '피드백을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (feedback.teacherId.toString() !== session.user.id) {
      return Response.json(
        { error: '본인이 작성한 피드백만 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    await Feedback.findByIdAndDelete(id);

    return Response.json({ message: '피드백이 삭제되었습니다.' });
  } catch {
    return Response.json(
      { error: '피드백 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
