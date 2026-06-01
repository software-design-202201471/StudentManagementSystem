import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import { sendCounselingNotification } from '@/lib/mailer';
import { fireStudentRecompute } from '@/lib/analyticsTriggers';
import Counseling from '@/models/Counseling';
import mongoose from 'mongoose';

/**
 * GET /api/counselings/[id]
 * 단일 상담 조회 (교사 전용)
 *
 * 본인 작성 OR isShared=true 만 노출. 그 외 403.
 */
export async function GET(request, { params }) {
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
    const counseling = await Counseling.findById(id)
      .populate(
        'studentId',
        'name email grade classNumber studentNumber'
      )
      .populate('teacherId', 'name email');

    if (!counseling) {
      return Response.json(
        { error: '상담을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const isOwn =
      counseling.teacherId?._id?.toString() === session.user.id;
    if (!isOwn && !counseling.isShared) {
      return Response.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    return Response.json({ counseling });
  } catch {
    return Response.json(
      { error: '상담 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/counselings/[id]
 * 상담 수정 (교사 전용, 본인 작성만)
 *
 * 수정 가능 필드: date, content, nextPlan, isShared
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
    const counseling = await Counseling.findById(id);
    if (!counseling) {
      return Response.json(
        { error: '상담을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (counseling.teacherId.toString() !== session.user.id) {
      return Response.json(
        { error: '본인이 작성한 상담만 수정할 수 있습니다.' },
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

    if (body.date !== undefined) {
      const d = new Date(body.date);
      if (Number.isNaN(d.getTime())) {
        return Response.json(
          { error: '상담 일자 형식이 올바르지 않습니다.' },
          { status: 400 }
        );
      }
      updates.date = d;
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

    if (body.nextPlan !== undefined) {
      updates.nextPlan = String(body.nextPlan);
    }

    if (body.isShared !== undefined) {
      updates.isShared = Boolean(body.isShared);
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { error: '업데이트할 필드가 없습니다.' },
        { status: 400 }
      );
    }

    const updated = await Counseling.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    })
      .populate(
        'studentId',
        'name email grade classNumber studentNumber'
      )
      .populate('teacherId', 'name email');

    // 수정 알림 (fire-and-forget). 학생만, 내용 비공개.
    (async () => {
      try {
        await sendCounselingNotification({
          studentEmail: updated.studentId?.email,
          studentName: updated.studentId?.name,
          teacherName: updated.teacherId?.name,
          date: updated.date,
          isUpdate: true,
        });
      } catch (notifyErr) {
        // eslint-disable-next-line no-console
        console.error(
          '[notification] counseling update notification failed:',
          notifyErr.message
        );
      }
    })();

    // 분석 자동 적재 (date 변경 시 lastCounselingDate 영향)
    fireStudentRecompute(updated.studentId._id, 'counseling.update');

    return Response.json({ counseling: updated });
  } catch (err) {
    return Response.json(
      { error: err.message || '상담 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/counselings/[id]
 * 상담 삭제 (교사 전용, 본인 작성만)
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
    const counseling = await Counseling.findById(id);
    if (!counseling) {
      return Response.json(
        { error: '상담을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (counseling.teacherId.toString() !== session.user.id) {
      return Response.json(
        { error: '본인이 작성한 상담만 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    const studentId = counseling.studentId;

    await Counseling.findByIdAndDelete(id);

    // 분석 자동 적재 (counselingCount/lastCounselingDate 영향)
    fireStudentRecompute(studentId, 'counseling.delete');

    return Response.json({ message: '상담이 삭제되었습니다.' });
  } catch {
    return Response.json(
      { error: '상담 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
