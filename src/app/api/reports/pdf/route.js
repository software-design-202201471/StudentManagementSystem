import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import {
  CounselingReportDocument,
  FeedbackReportDocument,
} from '@/lib/reportDocuments';
import Grade from '@/models/Grade';
import Counseling from '@/models/Counseling';
import Feedback from '@/models/Feedback';
import User from '@/models/User';
import mongoose from 'mongoose';
import path from 'node:path';
import { existsSync } from 'node:fs';
import {
  renderToBuffer,
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 한글 폰트 등록. public/fonts/NotoSansKR-Regular.ttf(+Bold) 가 있으면 사용.
 * 없으면 fallback 폰트(Helvetica)로 렌더 — 한글은 공란이지만 PDF는 정상 생성.
 *
 * @returns {string|null} 등록 성공 시 family 이름, 실패 시 null
 */
let fontChecked = false;
let fontFamilyResult = null;
function tryRegisterFont() {
  if (fontChecked) return fontFamilyResult;
  fontChecked = true;
  try {
    const dir = path.join(process.cwd(), 'public', 'fonts');
    const regular = path.join(dir, 'NotoSansKR-Regular.ttf');
    const bold = path.join(dir, 'NotoSansKR-Bold.ttf');
    if (!existsSync(regular)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[pdf] NotoSansKR-Regular.ttf not found at public/fonts/. ' +
          'PDF will render but Korean characters may not display.'
      );
      return (fontFamilyResult = null);
    }
    Font.register({
      family: 'NotoSansKR',
      fonts: [
        { src: regular, fontWeight: 'normal' },
        ...(existsSync(bold) ? [{ src: bold, fontWeight: 'bold' }] : []),
      ],
    });
    return (fontFamilyResult = 'NotoSansKR');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[pdf] Font registration failed:', err.message);
    return (fontFamilyResult = null);
  }
}

const styles = StyleSheet.create({
  // fontFamily는 폰트 등록 결과에 따라 GET 핸들러에서 동적으로 주입
  page: {
    padding: 36,
    fontSize: 10,
    color: '#1f2937',
  },
  header: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#6b7280' },
  infoBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  infoRow: { flexDirection: 'row', marginBottom: 2 },
  infoLabel: { width: 72, color: '#6b7280' },
  infoValue: { flex: 1 },
  summary: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 12,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  summaryLabel: { fontSize: 9, color: '#6b7280', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: '#4f46e5' },
  table: { marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  tHead: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tCell: { padding: 6 },
  tCellSemester: { width: '18%' },
  tCellSubject: { width: '24%' },
  tCellScore: { width: '20%', textAlign: 'right' },
  tCellPercent: { width: '14%', textAlign: 'right' },
  tCellGrade: { width: '10%', textAlign: 'center' },
  tCellTeacher: { width: '14%' },
  tHeadText: { fontWeight: 'bold', fontSize: 9 },
  tBodyText: { fontSize: 9 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
  empty: {
    padding: 16,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 10,
  },
});

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

function GradeReportDocument({
  student,
  grades,
  semesterLabel,
  averagePercentage,
  fontFamily,
}) {
  const pageStyle = fontFamily
    ? { ...styles.page, fontFamily }
    : styles.page;
  return (
    <Document>
      <Page size="A4" style={pageStyle}>
        <View style={styles.header}>
          <Text style={styles.title}>학생 성적 보고서</Text>
          <Text style={styles.subtitle}>
            생성일: {formatToday()} · 학기 범위: {semesterLabel}
          </Text>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>이름</Text>
            <Text style={styles.infoValue}>{student.name || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>학년/반/번호</Text>
            <Text style={styles.infoValue}>{studentClassLabel(student)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>이메일</Text>
            <Text style={styles.infoValue}>{student.email || '-'}</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>등록 과목 수</Text>
            <Text style={styles.summaryValue}>{grades.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>평균 백분율</Text>
            <Text style={styles.summaryValue}>{averagePercentage}%</Text>
          </View>
        </View>

        {grades.length === 0 ? (
          <Text style={styles.empty}>등록된 성적이 없습니다.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tHead}>
              <Text style={[styles.tCell, styles.tCellSemester, styles.tHeadText]}>학기</Text>
              <Text style={[styles.tCell, styles.tCellSubject, styles.tHeadText]}>과목</Text>
              <Text style={[styles.tCell, styles.tCellScore, styles.tHeadText]}>점수</Text>
              <Text style={[styles.tCell, styles.tCellPercent, styles.tHeadText]}>%</Text>
              <Text style={[styles.tCell, styles.tCellGrade, styles.tHeadText]}>등급</Text>
              <Text style={[styles.tCell, styles.tCellTeacher, styles.tHeadText]}>교사</Text>
            </View>
            {grades.map((g) => (
              <View key={g._id.toString()} style={styles.tRow}>
                <Text style={[styles.tCell, styles.tCellSemester, styles.tBodyText]}>
                  {g.semester}
                </Text>
                <Text style={[styles.tCell, styles.tCellSubject, styles.tBodyText]}>
                  {g.subject}
                </Text>
                <Text style={[styles.tCell, styles.tCellScore, styles.tBodyText]}>
                  {g.score} / {g.totalScore}
                </Text>
                <Text style={[styles.tCell, styles.tCellPercent, styles.tBodyText]}>
                  {g.percentage}%
                </Text>
                <Text style={[styles.tCell, styles.tCellGrade, styles.tBodyText]}>
                  {g.grade}
                </Text>
                <Text style={[styles.tCell, styles.tCellTeacher, styles.tBodyText]}>
                  {g.teacherId?.name || '-'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer} fixed>
          학생 성적 및 상담 관리 시스템 · 자동 생성 문서
        </Text>
      </Page>
    </Document>
  );
}

const VALID_TYPES = ['grades', 'counseling', 'feedback'];

/**
 * GET /api/reports/pdf?studentId=...&type=grades|counseling|feedback&semester=...
 * 학생 1명의 PDF 보고서 (교사 전용).
 *
 * type:
 * - grades (default): 성적 보고서 (semester 필터 가능)
 * - counseling:       상담 요약
 * - feedback:         피드백 요약 (카테고리 카운트 + 내역)
 *
 * 응답: application/pdf 스트림 (attachment).
 */
export async function GET(request) {
  const { session, error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();
  const fontFamily = tryRegisterFont();

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

  let reportElement;
  let filename;

  if (type === 'grades') {
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
    reportElement = (
      <GradeReportDocument
        student={student.toObject()}
        grades={grades.map((g) => g.toObject())}
        semesterLabel={semester || '전체'}
        averagePercentage={avg}
        fontFamily={fontFamily}
      />
    );
    const semSuffix = semester ? `-${semester}` : '';
    filename = `grade-report-${safeName}${semSuffix}.pdf`;
  } else if (type === 'counseling') {
    // 본인 작성 + 공유받은 상담 모두 포함 (보고서이므로 학생 전체 시각)
    const counselings = await Counseling.find({ studentId: studentIdParam })
      .populate('teacherId', 'name')
      .sort({ date: -1 });
    reportElement = (
      <CounselingReportDocument
        student={student.toObject()}
        counselings={counselings.map((c) => c.toObject())}
        fontFamily={fontFamily}
      />
    );
    filename = `counseling-report-${safeName}.pdf`;
  } else {
    // feedback
    const feedbacks = await Feedback.find({ studentId: studentIdParam })
      .populate('teacherId', 'name')
      .sort({ createdAt: -1 });
    const categoryCounts = { grade: 0, behavior: 0, attitude: 0, attendance: 0 };
    for (const f of feedbacks) {
      if (categoryCounts[f.category] !== undefined) {
        categoryCounts[f.category] += 1;
      }
    }
    reportElement = (
      <FeedbackReportDocument
        student={student.toObject()}
        feedbacks={feedbacks.map((f) => f.toObject())}
        categoryCounts={categoryCounts}
        fontFamily={fontFamily}
      />
    );
    filename = `feedback-report-${safeName}.pdf`;
  }

  try {
    const buffer = await renderToBuffer(reportElement);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[pdf] render failed:', err);
    return Response.json(
      { error: err.message || 'PDF 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
