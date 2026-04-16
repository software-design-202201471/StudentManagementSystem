import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import { calculateGrade } from '@/lib/gradeConstants';
import Grade from '@/models/Grade';

/**
 * GET /api/grades
 * 성적 목록 조회
 *
 * 권한:
 * - teacher: 본인이 입력한 성적 전체 조회 (studentId 필터 가능)
 * - student: 본인 성적만 조회
 * - parent: 자녀 성적만 조회 (studentId 필수)
 *
 * 쿼리 파라미터:
 * - studentId: 특정 학생 ID
 * - semester: 학기
 * - subject: 과목
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
  const semester = searchParams.get('semester');
  const subject = searchParams.get('subject');

  const filter = {};

  // 역할별 접근 제어
  if (session.user.role === 'student') {
    // 학생은 본인 성적만
    filter.studentId = session.user.id;
  } else if (session.user.role === 'parent') {
    // 학부모는 자녀 성적만 (studentId 파라미터 필수)
    if (!studentIdParam) {
      return Response.json(
        { error: '학생 ID가 필요합니다.' },
        { status: 400 }
      );
    }
    // TODO: parentOf 배열에 studentIdParam이 포함되는지 검증
    filter.studentId = studentIdParam;
  } else if (session.user.role === 'teacher') {
    // 교사는 studentId로 필터 가능 (없으면 전체)
    if (studentIdParam) filter.studentId = studentIdParam;
  }

  if (semester) filter.semester = semester;
  if (subject) filter.subject = subject;

  try {
    const grades = await Grade.find(filter)
      .populate('studentId', 'name email')
      .populate('teacherId', 'name email')
      .sort({ createdAt: -1 });

    return Response.json({ grades });
  } catch (err) {
    return Response.json(
      { error: '성적 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/grades
 * 성적 생성 (교사만 가능)
 *
 * Body:
 * - studentId, semester, subject, score, totalScore
 *
 * 서버에서 percentage, grade 자동 계산
 */
export async function POST(request) {
  const { session, error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  try {
    const body = await request.json();
    const { studentId, semester, subject, score, totalScore = 100 } = body;

    if (!studentId || !semester || !subject || score === undefined) {
      return Response.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (score > totalScore) {
      return Response.json(
        { error: '점수는 만점을 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 총점·등급 자동 계산
    const { percentage, grade } = calculateGrade(score, totalScore);

    const newGrade = await Grade.create({
      studentId,
      teacherId: session.user.id,
      semester,
      subject,
      score,
      totalScore,
      percentage,
      grade,
    });

    return Response.json({ grade: newGrade }, { status: 201 });
  } catch (err) {
    // 중복 키 에러 (동일 학생·학기·과목)
    if (err.code === 11000) {
      return Response.json(
        { error: '이미 해당 학기·과목의 성적이 존재합니다.' },
        { status: 409 }
      );
    }
    return Response.json(
      { error: err.message || '성적 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}