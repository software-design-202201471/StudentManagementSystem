import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import { sendCounselingNotification } from '@/lib/mailer';
import { fireStudentRecompute } from '@/lib/analyticsTriggers';
import Counseling from '@/models/Counseling';
import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * 권한 필터: 본인이 작성한 상담 + 공유(isShared=true) 상담
 */
function buildAccessFilter(userId) {
  return {
    $or: [{ teacherId: userId }, { isShared: true }],
  };
}

/**
 * 날짜 범위 필터 (from/to ISO 문자열).
 * 잘못된 형식이면 throw — 호출자가 400 응답.
 */
function buildDateFilter(fromStr, toStr) {
  if (!fromStr && !toStr) return null;
  const range = {};
  if (fromStr) {
    const d = new Date(fromStr);
    if (Number.isNaN(d.getTime())) {
      throw new Error('from 날짜 형식이 올바르지 않습니다.');
    }
    range.$gte = d;
  }
  if (toStr) {
    const d = new Date(toStr);
    if (Number.isNaN(d.getTime())) {
      throw new Error('to 날짜 형식이 올바르지 않습니다.');
    }
    range.$lte = d;
  }
  return range;
}

/**
 * GET /api/counselings
 * 상담 목록 조회 (교사 + 학부모)
 *
 * 권한:
 * - teacher: 본인 작성 + 다른 교사 작성 중 isShared=true
 * - parent:  자녀(parentOf) 상담 중 isVisibleToParent=true (studentId 필수)
 *
 * 쿼리 파라미터:
 * - studentId: 특정 학생 (parent는 필수)
 * - teacherId: 특정 교사 (teacher 전용)
 * - from / to: 날짜 범위 (ISO 8601, inclusive)
 */
export async function GET(request) {
  const { session, error } = await requireAuth(['teacher', 'parent']);
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const studentIdParam = searchParams.get('studentId');
  const teacherIdParam = searchParams.get('teacherId');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  let dateRange;
  try {
    dateRange = buildDateFilter(fromParam, toParam);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  // 학부모 분기 — 자녀 + isVisibleToParent=true 만
  if (session.user.role === 'parent') {
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
    const parentFilter = {
      studentId: studentIdParam,
      isVisibleToParent: true,
    };
    if (dateRange) parentFilter.date = dateRange;

    try {
      const counselings = await Counseling.find(parentFilter)
        .populate('studentId', 'name email grade classNumber studentNumber')
        .populate('teacherId', 'name email')
        .sort({ date: -1 });
      return Response.json({ counselings });
    } catch {
      return Response.json(
        { error: '상담 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
  }

  // 교사 분기 — 본인 작성 + 공유
  const baseFilter = {};

  if (studentIdParam) {
    if (!mongoose.Types.ObjectId.isValid(studentIdParam)) {
      return Response.json(
        { error: '유효하지 않은 학생 ID입니다.' },
        { status: 400 }
      );
    }
    baseFilter.studentId = studentIdParam;
  }

  if (teacherIdParam) {
    if (!mongoose.Types.ObjectId.isValid(teacherIdParam)) {
      return Response.json(
        { error: '유효하지 않은 교사 ID입니다.' },
        { status: 400 }
      );
    }
    baseFilter.teacherId = teacherIdParam;
  }

  if (dateRange) baseFilter.date = dateRange;

  const accessFilter = buildAccessFilter(session.user.id);
  const finalFilter = { $and: [baseFilter, accessFilter] };

  try {
    const counselings = await Counseling.find(finalFilter)
      .populate(
        'studentId',
        'name email grade classNumber studentNumber'
      )
      .populate('teacherId', 'name email')
      .sort({ date: -1 });

    return Response.json({ counselings });
  } catch {
    return Response.json(
      { error: '상담 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/counselings
 * 상담 작성 (교사 전용)
 *
 * Body:
 * - studentId: ObjectId (필수)
 * - date:      ISO 8601 string (필수)
 * - content:   string (필수)
 * - nextPlan?: string
 * - isShared?: boolean (default false)
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

  const { studentId, date, content, nextPlan, isShared, isVisibleToParent } =
    body;

  if (!studentId || !date || !content) {
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

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return Response.json(
      { error: '상담 일자 형식이 올바르지 않습니다.' },
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
    const created = await Counseling.create({
      studentId,
      teacherId: session.user.id,
      date: parsedDate,
      content,
      nextPlan: nextPlan ?? '',
      isShared: Boolean(isShared),
      isVisibleToParent: Boolean(isVisibleToParent),
    });

    const populated = await Counseling.findById(created._id)
      .populate(
        'studentId',
        'name email grade classNumber studentNumber'
      )
      .populate('teacherId', 'name email');

    // 알림 발송 (fire-and-forget — 응답 지연 방지).
    // 상담은 학생 본인에게만 발송, 내용은 미공개 (민감성 보호).
    (async () => {
      try {
        await sendCounselingNotification({
          studentEmail: populated.studentId?.email,
          studentName: populated.studentId?.name,
          teacherName: populated.teacherId?.name,
          date: populated.date,
        });
      } catch (notifyErr) {
        // eslint-disable-next-line no-console
        console.error(
          '[notification] counseling notification failed:',
          notifyErr.message
        );
      }
    })();

    // 분석 자동 적재 (counselingCount/lastCounselingDate 영향)
    fireStudentRecompute(populated.studentId._id, 'counseling.create');

    return Response.json({ counseling: populated }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: err.message || '상담 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
