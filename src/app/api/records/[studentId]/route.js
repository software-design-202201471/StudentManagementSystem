import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import { fireStudentRecompute } from '@/lib/analyticsTriggers';
import Record from '@/models/Record';
import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * GET /api/records/[studentId]
 * 단일 학생의 학생부 조회
 *
 * 권한:
 * - teacher: 모든 학생
 * - student: 본인만
 * - parent: parentOf에 포함된 자녀만
 */
export async function GET(request, { params }) {
  const { session, error } = await requireAuth([
    'teacher',
    'student',
    'parent',
  ]);
  if (error) return error;

  await connectDB();

  const { studentId } = await params;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return Response.json(
      { error: '유효하지 않은 학생 ID입니다.' },
      { status: 400 }
    );
  }

  // 역할별 접근 검증
  if (session.user.role === 'student') {
    if (studentId !== session.user.id) {
      return Response.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }
  } else if (session.user.role === 'parent') {
    const parent = await User.findById(session.user.id).select('parentOf');
    const isOwnChild = parent?.parentOf?.some(
      (childId) => childId.toString() === studentId
    );
    if (!isOwnChild) {
      return Response.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }
  }

  try {
    const record = await Record.findOne({ studentId }).populate(
      'studentId',
      'name email grade classNumber studentNumber'
    );

    if (!record) {
      return Response.json(
        { error: '학생부를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return Response.json({ record });
  } catch {
    return Response.json(
      { error: '학생부 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/records/[studentId]
 * 학생부 부분 업데이트 (없으면 생성, upsert)
 *
 * 권한: teacher 만
 *
 * Body (모두 선택):
 * - attendance: { absent?, late?, early? }  // 누락 필드는 유지
 * - specialNotes: string
 * - customFields: [{ label, value }]        // 배열 전체 교체
 */
export async function PATCH(request, { params }) {
  const { error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  const { studentId } = await params;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return Response.json(
      { error: '유효하지 않은 학생 ID입니다.' },
      { status: 400 }
    );
  }

  // 학생 존재 및 role 검증 (잘못된 ID로 빈 학생부 생성 방지)
  const student = await User.findById(studentId).select('role');
  if (!student || student.role !== 'student') {
    return Response.json(
      { error: '해당 학생을 찾을 수 없습니다.' },
      { status: 404 }
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

  // attendance 부분 업데이트 (dot notation으로 누락 필드 보존)
  if (body.attendance && typeof body.attendance === 'object') {
    const { absent, late, early } = body.attendance;
    if (absent !== undefined) updates['attendance.absent'] = absent;
    if (late !== undefined) updates['attendance.late'] = late;
    if (early !== undefined) updates['attendance.early'] = early;
  }

  if (body.specialNotes !== undefined) {
    updates.specialNotes = body.specialNotes;
  }

  // customFields는 배열 전체 교체
  if (Array.isArray(body.customFields)) {
    updates.customFields = body.customFields;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json(
      { error: '업데이트할 필드가 없습니다.' },
      { status: 400 }
    );
  }

  try {
    const record = await Record.findOneAndUpdate(
      { studentId },
      { $set: updates, $setOnInsert: { studentId } },
      {
        upsert: true,
        returnDocument: 'after',
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).populate('studentId', 'name email grade classNumber studentNumber');

    // 분석 자동 적재 (AnalyticsStudent.attendance 스냅샷 영향)
    fireStudentRecompute(studentId, 'record.upsert');

    return Response.json({ record });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json(
        { error: '이미 해당 학생의 학생부가 존재합니다.' },
        { status: 409 }
      );
    }
    return Response.json(
      { error: err.message || '학생부 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
