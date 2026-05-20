import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import Grade from '@/models/Grade';
import User from '@/models/User';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function studentClassLabel(s) {
  const parts = [];
  if (s.grade) parts.push(`${s.grade}학년`);
  if (s.classNumber) parts.push(`${s.classNumber}반`);
  if (s.studentNumber) parts.push(`${s.studentNumber}번`);
  return parts.length ? parts.join(' ') : '미등록';
}

function formatToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * GET /api/reports/excel?studentId=<id>&semester=<선택>
 * 학생 1명의 성적 보고서를 xlsx로 생성 (교사 전용).
 *
 * 구성:
 * - "성적" 시트: 학생 정보 헤더 + 성적 테이블 + 평균
 *
 * 응답: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 */
export async function GET(request) {
  const { error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const studentIdParam = searchParams.get('studentId');
  const semester = searchParams.get('semester');

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

  const student = await User.findById(studentIdParam).select(
    'name email grade classNumber studentNumber role'
  );
  if (!student || student.role !== 'student') {
    return Response.json(
      { error: '학생을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  const filter = { studentId: studentIdParam };
  if (semester) filter.semester = semester;

  const grades = await Grade.find(filter)
    .populate('teacherId', 'name')
    .sort({ semester: 1, subject: 1 });

  const avg =
    grades.length === 0
      ? 0
      : Math.round(
          grades.reduce((acc, g) => acc + (g.percentage || 0), 0) /
            grades.length
        );

  try {
    // 시트 데이터를 2D 배열로 구성 (헤더 영역 + 빈 줄 + 테이블 헤더 + 행들)
    const rows = [
      ['학생 성적 보고서'],
      ['생성일', formatToday()],
      ['학기 범위', semester || '전체'],
      [],
      ['이름', student.name || '-'],
      ['학년/반/번호', studentClassLabel(student)],
      ['이메일', student.email || '-'],
      [],
      ['등록 과목 수', grades.length],
      ['평균 백분율', `${avg}%`],
      [],
      ['학기', '과목', '점수', '만점', '백분율(%)', '등급', '담당 교사'],
      ...grades.map((g) => [
        g.semester,
        g.subject,
        g.score,
        g.totalScore,
        g.percentage,
        g.grade,
        g.teacherId?.name || '',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // 컬럼 폭 자동(대략) 설정
    ws['!cols'] = [
      { wch: 12 }, // 학기
      { wch: 14 }, // 과목
      { wch: 8 },  // 점수
      { wch: 8 },  // 만점
      { wch: 10 }, // 백분율
      { wch: 8 },  // 등급
      { wch: 14 }, // 담당 교사
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '성적');

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    const safeName = (student.name || 'student').replace(/[^\w가-힣]/g, '_');
    const semSuffix = semester ? `-${semester}` : '';
    const filename = `grade-report-${safeName}${semSuffix}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[excel] generate failed:', err);
    return Response.json(
      { error: err.message || 'Excel 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
