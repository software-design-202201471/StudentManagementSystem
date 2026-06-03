import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';
import { CATEGORY_LABELS } from '@/lib/feedbackConstants';

/**
 * 상담·피드백 PDF 보고서 Document 컴포넌트.
 * (성적 보고서는 reports/pdf/route.js 안에 GradeReportDocument로 인라인 정의됨)
 */

function formatDate(d) {
  if (!d) return '-';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '-';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatToday() {
  return formatDate(new Date());
}

function studentClassLabel(s) {
  const parts = [];
  if (s.grade) parts.push(`${s.grade}학년`);
  if (s.classNumber) parts.push(`${s.classNumber}반`);
  if (s.studentNumber) parts.push(`${s.studentNumber}번`);
  return parts.length ? parts.join(' ') : '미등록';
}

function truncate(s, n) {
  if (!s) return '';
  if (s.length <= n) return s;
  return `${s.slice(0, n)}…`;
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: '#1f2937' },
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
  summary: { flexDirection: 'row', marginTop: 16, marginBottom: 12, gap: 8 },
  summaryCard: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  summaryLabel: { fontSize: 9, color: '#6b7280', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: '#4f46e5' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
  },
  itemBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemMeta: { fontSize: 9, color: '#6b7280' },
  itemBadge: {
    fontSize: 9,
    color: '#4f46e5',
    backgroundColor: '#eef2ff',
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 2,
    paddingBottom: 2,
    borderRadius: 3,
  },
  itemBody: { fontSize: 10, marginTop: 2 },
  itemSub: { fontSize: 9, color: '#6b7280', marginTop: 4 },
  empty: {
    padding: 16,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

function StudentHeader({ student, title, subtitle, fontFamily }) {
  return (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, fontFamily ? { fontFamily } : {}]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, fontFamily ? { fontFamily } : {}]}>
          생성일: {formatToday()} {subtitle ? `· ${subtitle}` : ''}
        </Text>
      </View>
      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, fontFamily ? { fontFamily } : {}]}>
            이름
          </Text>
          <Text style={[styles.infoValue, fontFamily ? { fontFamily } : {}]}>
            {student.name || '-'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, fontFamily ? { fontFamily } : {}]}>
            학년/반/번호
          </Text>
          <Text style={[styles.infoValue, fontFamily ? { fontFamily } : {}]}>
            {studentClassLabel(student)}
          </Text>
        </View>
      </View>
    </>
  );
}

/**
 * 상담 요약 보고서.
 * 학생 1명의 상담 내역을 시간순으로 카드 리스트로 표시.
 * 각 카드: 날짜·교사·내용 미리보기(200자)·다음 계획 미리보기(120자).
 */
export function CounselingReportDocument({ student, counselings, fontFamily }) {
  const baseStyle = fontFamily ? { fontFamily } : {};
  return (
    <Document>
      <Page size="A4" style={[styles.page, baseStyle]}>
        <StudentHeader
          student={student}
          title="학생 상담 요약 보고서"
          subtitle={`상담 ${counselings.length}건`}
          fontFamily={fontFamily}
        />

        <Text style={styles.sectionTitle}>상담 내역 (최신순)</Text>

        {counselings.length === 0 ? (
          <Text style={styles.empty}>등록된 상담이 없습니다.</Text>
        ) : (
          counselings.map((c) => (
            <View key={String(c._id)} style={styles.itemBox} wrap={false}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemMeta}>
                  {formatDate(c.date)} · {c.teacherId?.name || '교사 미상'}
                  {c.gradeLevel != null
                    ? ` · 당시 ${c.gradeLevel}학년 ${c.classNumber ?? '-'}반`
                    : ''}
                  {c.isShared ? ' · 공유' : ''}
                </Text>
              </View>
              <Text style={styles.itemBody}>{truncate(c.content, 200)}</Text>
              {c.nextPlan ? (
                <Text style={styles.itemSub}>
                  다음 계획: {truncate(c.nextPlan, 120)}
                </Text>
              ) : null}
            </View>
          ))
        )}

        <Text style={styles.footer} fixed>
          학생 성적 및 상담 관리 시스템 · 자동 생성 문서
        </Text>
      </Page>
    </Document>
  );
}

/**
 * 피드백 요약 보고서.
 * 카테고리별 카운트 카드 + 피드백 카드 리스트(시간순).
 * 각 카드: 카테고리 배지·작성 교사·일자·내용 미리보기(200자)·공개 범위.
 */
export function FeedbackReportDocument({
  student,
  feedbacks,
  categoryCounts,
  fontFamily,
}) {
  const baseStyle = fontFamily ? { fontFamily } : {};
  return (
    <Document>
      <Page size="A4" style={[styles.page, baseStyle]}>
        <StudentHeader
          student={student}
          title="학생 피드백 요약 보고서"
          subtitle={`피드백 ${feedbacks.length}건`}
          fontFamily={fontFamily}
        />

        {/* 카테고리별 카운트 */}
        <View style={styles.summary}>
          {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
            <View key={k} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{label}</Text>
              <Text style={styles.summaryValue}>
                {categoryCounts?.[k] ?? 0}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>피드백 내역 (최신순)</Text>

        {feedbacks.length === 0 ? (
          <Text style={styles.empty}>등록된 피드백이 없습니다.</Text>
        ) : (
          feedbacks.map((f) => {
            const visibility = [
              f.isVisibleToStudent ? '학생' : null,
              f.isVisibleToParent ? '학부모' : null,
            ]
              .filter(Boolean)
              .join('·');
            return (
              <View key={String(f._id)} style={styles.itemBox} wrap={false}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemBadge}>
                    {CATEGORY_LABELS[f.category] || f.category}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {formatDate(f.createdAt)} ·{' '}
                    {f.teacherId?.name || '교사 미상'}
                  </Text>
                </View>
                <Text style={styles.itemBody}>{truncate(f.content, 200)}</Text>
                {visibility ? (
                  <Text style={styles.itemSub}>공개: {visibility}</Text>
                ) : (
                  <Text style={styles.itemSub}>비공개 (교사만)</Text>
                )}
              </View>
            );
          })
        )}

        <Text style={styles.footer} fixed>
          학생 성적 및 상담 관리 시스템 · 자동 생성 문서
        </Text>
      </Page>
    </Document>
  );
}
