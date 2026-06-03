import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import { CATEGORY_LABELS } from '@/lib/feedbackConstants';
import Grade from '@/models/Grade';
import Counseling from '@/models/Counseling';
import Feedback from '@/models/Feedback';
import User from '@/models/User';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';

const VALID_TYPES = ['grades', 'counseling', 'feedback'];

function formatDateOnly(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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
 * GET /api/reports/excel?studentId=<id>&type=grades|counseling|feedback&semester=<선택>
 * 학생 1명의 xlsx 보고서 (교사 전용).
 *
 * 응답: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 */
export async function GET(request) {
  const { session, error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const studentIdParam = searchParams.get('studentId');
  const semester = searchParams.get('semester');
  const type = searchParams.get('type') || 'grades';

  if (!VALID_TYPES.includes(type)) {
    return Response.json(
      { error: '유효하지 않은 보고서 type입니다. (grades|counseling|feedback)' },
      { status: 400 }
    );
  }

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
    'name email grade classNumber studentNumber role schoolId'
  );
  if (
    !student ||
    student.role !== 'student' ||
    student.schoolId?.toString() !== session.user.schoolId
  ) {
    return Response.json(
      { error: '학생을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  const safeName = (student.name || 'student').replace(/[^\w가-힣]/g, '_');
  const studentClass = studentClassLabel(student);

  try {
    let wb;
    let filename;

    if (type === 'grades') {
      const filter = { studentId: studentIdParam };
      if (semester) filter.semester = semester;
      const grades = await Grade.find(filter)
        .populate('teacherId', 'name')
        .sort({
          semester: -1,
          gradeLevel: 1,
          classNumber: 1,
          studentNumber: 1,
          subject: 1,
        });
      const avg =
        grades.length === 0
          ? 0
          : Math.round(
              grades.reduce((acc, g) => acc + (g.percentage || 0), 0) /
                grades.length
            );
      const rows = [
        ['학생 성적 보고서'],
        ['생성일', formatToday()],
        ['학기 범위', semester || '전체'],
        [],
        ['이름', student.name || '-'],
        ['학년/반/번호', studentClass],
        ['이메일', student.email || '-'],
        [],
        ['등록 과목 수', grades.length],
        ['평균 백분율', `${avg}%`],
        [],
        ['학기', '당시 학년/반', '과목', '점수', '만점', '백분율(%)', '등급', '담당 교사'],
        ...grades.map((g) => [
          g.semester,
          g.gradeLevel != null
            ? `${g.gradeLevel}학년 ${g.classNumber ?? '-'}반 ${g.studentNumber ?? '-'}번`
            : '-',
          g.subject,
          g.score,
          g.totalScore,
          g.percentage,
          g.grade,
          g.teacherId?.name || '',
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 8 }, { wch: 8 },
        { wch: 10 }, { wch: 8 }, { wch: 14 },
      ];
      wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '성적');
      const semSuffix = semester ? `-${semester}` : '';
      filename = `grade-report-${safeName}${semSuffix}.xlsx`;
    } else if (type === 'counseling') {
      const counselings = await Counseling.find({ studentId: studentIdParam })
        .populate('teacherId', 'name')
        .sort({ date: -1 });
      const rows = [
        ['학생 상담 요약 보고서'],
        ['생성일', formatToday()],
        ['상담 건수', counselings.length],
        [],
        ['이름', student.name || '-'],
        ['학년/반/번호', studentClass],
        [],
        ['일자', '당시 학년/반', '작성 교사', '공유', '내용', '다음 계획'],
        ...counselings.map((c) => [
          formatDateOnly(c.date),
          c.gradeLevel != null
            ? `${c.gradeLevel}학년 ${c.classNumber ?? '-'}반 ${c.studentNumber ?? '-'}번`
            : '-',
          c.teacherId?.name || '',
          c.isShared ? '공유' : '',
          c.content || '',
          c.nextPlan || '',
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 8 }, { wch: 60 }, { wch: 40 },
      ];
      wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '상담');
      filename = `counseling-report-${safeName}.xlsx`;
    } else {
      // feedback
      const feedbacks = await Feedback.find({ studentId: studentIdParam })
        .populate('teacherId', 'name')
        .sort({ createdAt: -1 });
      const categoryCounts = {
        grade: 0, behavior: 0, attitude: 0, attendance: 0,
      };
      for (const f of feedbacks) {
        if (categoryCounts[f.category] !== undefined) {
          categoryCounts[f.category] += 1;
        }
      }
      const rows = [
        ['학생 피드백 요약 보고서'],
        ['생성일', formatToday()],
        ['피드백 건수', feedbacks.length],
        [],
        ['이름', student.name || '-'],
        ['학년/반/번호', studentClass],
        [],
        ['카테고리별 카운트'],
        ...Object.entries(CATEGORY_LABELS).map(([k, label]) => [
          label,
          categoryCounts[k] ?? 0,
        ]),
        [],
        ['일자', '카테고리', '작성 교사', '학생공개', '학부모공개', '내용'],
        ...feedbacks.map((f) => [
          formatDateOnly(f.createdAt),
          CATEGORY_LABELS[f.category] || f.category,
          f.teacherId?.name || '',
          f.isVisibleToStudent ? 'Y' : 'N',
          f.isVisibleToParent ? 'Y' : 'N',
          f.content || '',
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 10 },
        { wch: 10 }, { wch: 60 },
      ];
      wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '피드백');
      filename = `feedback-report-${safeName}.xlsx`;
    }

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    });

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
