import { connectDB } from '@/lib/mongoose';
import { requireAuth } from '@/lib/apiAuth';
import Grade from '@/models/Grade';
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
 * 한글 폰트 등록.
 * public/fonts/NotoSansKR-Regular.ttf, NotoSansKR-Bold.ttf 가 있으면 사용.
 * 없으면 fallback 폰트로 렌더 (한글 깨질 수 있음).
 * 모듈 평가 시 1회만 시도.
 */
let fontRegistered = false;
function tryRegisterFont() {
  if (fontRegistered) return;
  fontRegistered = true;
  try {
    const dir = path.join(process.cwd(), 'public', 'fonts');
    const regular = path.join(dir, 'NotoSansKR-Regular.ttf');
    const bold = path.join(dir, 'NotoSansKR-Bold.ttf');
    if (!existsSync(regular)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[pdf] NotoSansKR-Regular.ttf not found at public/fonts/. ' +
          'Korean characters may render as blanks.'
      );
      return;
    }
    Font.register({
      family: 'NotoSansKR',
      fonts: [
        { src: regular, fontWeight: 'normal' },
        ...(existsSync(bold)
          ? [{ src: bold, fontWeight: 'bold' }]
          : []),
      ],
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[pdf] Font registration failed:', err.message);
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'NotoSansKR',
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
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
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

/**
 * GET /api/reports/pdf?studentId=...&semester=...
 * 학생 1명의 성적 보고서를 PDF로 생성 (교사 전용).
 *
 * 응답: application/pdf 스트림 (attachment).
 */
export async function GET(request) {
  const { error } = await requireAuth(['teacher']);
  if (error) return error;

  await connectDB();
  tryRegisterFont();

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

  const reportElement = (
    <GradeReportDocument
      student={student.toObject()}
      grades={grades.map((g) => g.toObject())}
      semesterLabel={semester || '전체'}
      averagePercentage={avg}
    />
  );

  try {
    const buffer = await renderToBuffer(reportElement);

    const safeName = (student.name || 'student').replace(/[^\w가-힣]/g, '_');
    const semSuffix = semester ? `-${semester}` : '';
    const filename = `grade-report-${safeName}${semSuffix}.pdf`;

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
