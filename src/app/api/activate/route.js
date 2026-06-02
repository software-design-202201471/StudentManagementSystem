import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import User from '@/models/User';
import School from '@/models/School';
import StudentCode from '@/models/StudentCode';

export const runtime = 'nodejs';

/**
 * POST /api/activate
 * 로그인된 사용자가 코드로 계정을 활성화 (role별 분기).
 *
 * - teacher: { code } = 학교의 teacherCode → schoolId 연결 + active
 * - student: { code, grade, classNumber, studentNumber } = 학생코드
 *            → 학년/반/번호 설정 + schoolId + active, 코드에 studentId 기록 (1회용)
 * - parent:  { code } = 자녀의 학생코드 (이미 학생이 활성화한 코드)
 *            → 코드의 studentId를 parentOf에 추가 + schoolId + active
 */
export async function POST(request) {
  const { session, error } = await requireAuth([
    'teacher',
    'student',
    'parent',
  ]);
  if (error) return error;

  await connectDB();

  const me = await User.findById(session.user.id);
  if (!me) {
    return Response.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
  }
  if (me.status === 'active') {
    return Response.json(
      { error: '이미 활성화된 계정입니다.' },
      { status: 400 }
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

  const code = (body.code || '').trim();
  if (!code) {
    return Response.json({ error: '코드를 입력해주세요.' }, { status: 400 });
  }

  // ─── 교사 ───
  if (me.role === 'teacher') {
    const school = await School.findOne({ teacherCode: code });
    if (!school) {
      return Response.json(
        { error: '유효하지 않은 학교 코드입니다.' },
        { status: 404 }
      );
    }
    if (school.status !== 'active') {
      return Response.json(
        { error: '비활성화된 학교입니다. 관리자에게 문의하세요.' },
        { status: 403 }
      );
    }
    me.schoolId = school._id;
    me.status = 'active';
    await me.save();
    return Response.json({
      message: `${school.name} 교사로 활성화되었습니다.`,
    });
  }

  // ─── 학생 ───
  if (me.role === 'student') {
    const sc = await StudentCode.findOne({ code });
    if (!sc) {
      return Response.json(
        { error: '유효하지 않은 학생 코드입니다.' },
        { status: 404 }
      );
    }
    if (sc.studentId) {
      return Response.json(
        { error: '이미 사용된 학생 코드입니다.' },
        { status: 409 }
      );
    }

    // 학년/반/번호: 코드에 값이 있으면 우선, 없으면 입력값 사용
    const grade = sc.grade ?? Number(body.grade);
    const classNumber = sc.classNumber ?? Number(body.classNumber);
    const studentNumber = sc.studentNumber ?? Number(body.studentNumber);

    if (
      !Number.isInteger(grade) ||
      !Number.isInteger(classNumber) ||
      !Number.isInteger(studentNumber)
    ) {
      return Response.json(
        { error: '학년/반/번호를 올바르게 입력해주세요.' },
        { status: 400 }
      );
    }

    me.schoolId = sc.schoolId;
    me.grade = grade;
    me.classNumber = classNumber;
    me.studentNumber = studentNumber;
    me.status = 'active';
    await me.save();

    sc.studentId = me._id;
    if (sc.grade == null) sc.grade = grade;
    if (sc.classNumber == null) sc.classNumber = classNumber;
    if (sc.studentNumber == null) sc.studentNumber = studentNumber;
    await sc.save();

    return Response.json({ message: '학생 계정이 활성화되었습니다.' });
  }

  // ─── 학부모 ───
  if (me.role === 'parent') {
    const sc = await StudentCode.findOne({ code });
    if (!sc) {
      return Response.json(
        { error: '유효하지 않은 학생 코드입니다.' },
        { status: 404 }
      );
    }
    if (!sc.studentId) {
      return Response.json(
        {
          error:
            '아직 학생이 활성화하지 않은 코드입니다. 자녀가 먼저 활성화해야 합니다.',
        },
        { status: 409 }
      );
    }

    me.schoolId = sc.schoolId;
    const childId = sc.studentId.toString();
    const already = me.parentOf?.some((id) => id.toString() === childId);
    if (!already) me.parentOf.push(sc.studentId);
    me.status = 'active';
    await me.save();

    return Response.json({ message: '학부모 계정이 활성화되고 자녀가 연결되었습니다.' });
  }

  return Response.json({ error: '처리할 수 없는 역할입니다.' }, { status: 400 });
}
