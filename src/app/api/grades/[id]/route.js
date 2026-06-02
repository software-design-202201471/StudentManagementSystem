import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import { calculateGrade } from '@/lib/gradeConstants';
import { sendGradeNotification } from '@/lib/mailer';
import {
  fireStudentRecompute,
  fireSubjectRecompute,
} from '@/lib/analyticsTriggers';
import Grade from '@/models/Grade';
import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * GET /api/grades/[id]
 * 단일 성적 조회
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
    return Response.json({ error: '유효하지 않은 ID입니다.' }, { status: 400 });
  }

  try {
    const grade = await Grade.findById(id)
      .populate('studentId', 'name email')
      .populate('teacherId', 'name email');

    if (!grade) {
      return Response.json(
        { error: '성적을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 테넌트 검증 — 다른 학교 문서는 없는 것처럼 처리
    if (grade.schoolId.toString() !== session.user.schoolId) {
      return Response.json(
        { error: '성적을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const studentIdStr = grade.studentId._id.toString();

    // 학생은 본인 성적만 조회 가능
    if (
      session.user.role === 'student' &&
      studentIdStr !== session.user.id
    ) {
      return Response.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 학부모는 자녀 성적만 조회 가능 (parentOf 검증)
    if (session.user.role === 'parent') {
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

    return Response.json({ grade });
  } catch (err) {
    return Response.json(
      { error: '성적 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/grades/[id]
 * 성적 수정 (교사만 가능, 본인이 입력한 성적만)
 */
export async function PATCH(request, { params }) {
  const { session, error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: '유효하지 않은 ID입니다.' }, { status: 400 });
  }

  try {
    const grade = await Grade.findById(id);
    if (!grade) {
      return Response.json(
        { error: '성적을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 테넌트 검증
    if (grade.schoolId.toString() !== session.user.schoolId) {
      return Response.json(
        { error: '성적을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 본인이 입력한 성적만 수정 가능
    if (grade.teacherId.toString() !== session.user.id) {
      return Response.json(
        { error: '본인이 입력한 성적만 수정할 수 있습니다.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates = {};

    // 수정 가능한 필드만 추출
    if (body.semester !== undefined) updates.semester = body.semester;
    if (body.subject !== undefined) updates.subject = body.subject;
    if (body.score !== undefined) updates.score = body.score;
    if (body.totalScore !== undefined) updates.totalScore = body.totalScore;

    // score 또는 totalScore가 변경된 경우 재계산
    if (updates.score !== undefined || updates.totalScore !== undefined) {
      const newScore = updates.score ?? grade.score;
      const newTotal = updates.totalScore ?? grade.totalScore;

      if (newScore > newTotal) {
        return Response.json(
          { error: '점수는 만점을 초과할 수 없습니다.' },
          { status: 400 }
        );
      }

      const { percentage, grade: gradeLabel } = calculateGrade(
        newScore,
        newTotal
      );
      updates.percentage = percentage;
      updates.grade = gradeLabel;
    }

    const oldSubject = grade.subject;
    const updated = await Grade.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    })
      .populate('studentId', 'name email')
      .populate('teacherId', 'name email');

    // 수정 알림 (fire-and-forget). 성적은 학생/학부모 모두 자동 통보.
    (async () => {
      try {
        const parents = await User.find(
          { role: 'parent', parentOf: updated.studentId._id },
          'email'
        );
        const parentEmails = parents.map((p) => p.email).filter(Boolean);
        await sendGradeNotification({
          studentEmail: updated.studentId?.email,
          parentEmails,
          studentName: updated.studentId?.name,
          teacherName: updated.teacherId?.name,
          semester: updated.semester,
          subject: updated.subject,
          score: updated.score,
          totalScore: updated.totalScore,
          percentage: updated.percentage,
          grade: updated.grade,
          isUpdate: true,
        });
      } catch (notifyErr) {
        // eslint-disable-next-line no-console
        console.error(
          '[notification] grade update notification failed:',
          notifyErr.message
        );
      }
    })();

    // 분석 자동 적재. subject가 바뀌었으면 옛/새 과목 모두 재집계.
    const sid = session.user.schoolId;
    fireStudentRecompute(updated.studentId._id, 'grade.update');
    fireSubjectRecompute(sid, updated.subject, 'grade.update');
    if (oldSubject && oldSubject !== updated.subject) {
      fireSubjectRecompute(sid, oldSubject, 'grade.update');
    }

    return Response.json({ grade: updated });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json(
        { error: '이미 해당 학기·과목의 성적이 존재합니다.' },
        { status: 409 }
      );
    }
    return Response.json(
      { error: err.message || '성적 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/grades/[id]
 * 성적 삭제 (교사만 가능, 본인이 입력한 성적만)
 */
export async function DELETE(request, { params }) {
  const { session, error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: '유효하지 않은 ID입니다.' }, { status: 400 });
  }

  try {
    const grade = await Grade.findById(id);
    if (!grade) {
      return Response.json(
        { error: '성적을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (grade.schoolId.toString() !== session.user.schoolId) {
      return Response.json(
        { error: '성적을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (grade.teacherId.toString() !== session.user.id) {
      return Response.json(
        { error: '본인이 입력한 성적만 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    const studentId = grade.studentId;
    const subject = grade.subject;

    await Grade.findByIdAndDelete(id);

    // 분석 자동 적재 (학생/과목 평균 등 영향)
    fireStudentRecompute(studentId, 'grade.delete');
    fireSubjectRecompute(session.user.schoolId, subject, 'grade.delete');

    return Response.json({ message: '성적이 삭제되었습니다.' });
  } catch (err) {
    return Response.json(
      { error: '성적 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}