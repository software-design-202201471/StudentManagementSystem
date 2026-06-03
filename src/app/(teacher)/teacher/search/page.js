'use client';

import { useMemo, useState } from 'react';
import StudentPicker from '@/components/StudentPicker';
import GradeRadarChart from '@/components/GradeRadarChart';
import { CATEGORY_LABELS } from '@/lib/feedbackConstants';

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const TABS = [
  { key: 'grades', label: '성적' },
  { key: 'record', label: '학생부' },
  { key: 'feedbacks', label: '피드백' },
  { key: 'counselings', label: '상담' },
];

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div
        className={`text-xl sm:text-2xl font-bold ${
          accent ? 'text-indigo-600' : 'text-gray-800'
        }`}
      >
        {value ?? '-'}
      </div>
    </div>
  );
}

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS);

export default function UnifiedSearchPage() {
  const [studentId, setStudentId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('grades');

  // 필터 — 기간(피드백/상담), 과목(성적), 카테고리(피드백)
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [data, setData] = useState(null); // { grades, record, feedbacks, counselings }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 현재 필터 상태로 학생 1명의 통합 데이터를 조회.
  async function loadData(id) {
    if (!id) return;
    setLoading(true);
    setError('');

    // 엔드포인트별 쿼리 구성
    const gradeParams = new URLSearchParams({ studentId: id });
    if (filterSubject) gradeParams.set('subject', filterSubject);

    const fbParams = new URLSearchParams({ studentId: id });
    if (filterCategory) fbParams.set('category', filterCategory);
    if (filterFrom) fbParams.set('from', filterFrom);
    if (filterTo) fbParams.set('to', filterTo);

    const csParams = new URLSearchParams({ studentId: id });
    if (filterFrom) csParams.set('from', filterFrom);
    if (filterTo) csParams.set('to', filterTo);

    try {
      const [grades, record, feedbacks, counselings] = await Promise.all([
        fetch(`/api/grades?${gradeParams}`)
          .then((r) => r.json())
          .then((d) => d.grades || []),
        fetch(`/api/records/${id}`)
          .then((r) => (r.ok ? r.json().then((d) => d.record) : null))
          .catch(() => null),
        fetch(`/api/feedbacks?${fbParams}`)
          .then((r) => r.json())
          .then((d) => d.feedbacks || []),
        fetch(`/api/counselings?${csParams}`)
          .then((r) => r.json())
          .then((d) => d.counselings || []),
      ]);
      setData({ grades, record, feedbacks, counselings });
    } catch (err) {
      setError(err.message || '조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function handlePick(student) {
    setSelectedStudent(student || null);
    setStudentId(student?._id || '');
    setData(null);
    setError('');
    if (student?._id) loadData(student._id);
  }

  const summary = useMemo(() => {
    if (!data) return null;
    const ps = data.grades.map((g) => g.percentage || 0);
    const avg = ps.length
      ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length)
      : 0;
    return {
      avg,
      gradeCount: data.grades.length,
      feedbackCount: data.feedbacks.length,
      counselingCount: data.counselings.length,
    };
  }, [data]);

  const chartData = useMemo(
    () =>
      data?.grades.map((g) => ({
        subject: g.subject,
        percentage: g.percentage,
      })) || [],
    [data]
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">통합 검색</h1>
          <p className="text-sm text-gray-500 mt-1">
            학생 1명의 성적·학생부·피드백·상담을 한 화면에서 조회합니다.
          </p>
        </div>

        {/* 학생 선택 */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            학생
          </label>
          <StudentPicker value={studentId} onChange={handlePick} />
        </div>

        {/* 필터 (기간: 피드백·상담 / 과목: 성적 / 카테고리: 피드백) */}
        {studentId && (
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  시작일
                </label>
                <input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  종료일
                </label>
                <input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  과목 (성적)
                </label>
                <input
                  type="text"
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  placeholder="예: 수학"
                  className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  카테고리 (피드백)
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">전체</option>
                  {CATEGORY_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1 flex gap-2">
                <button
                  onClick={() => loadData(studentId)}
                  className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded-md
                    hover:bg-indigo-700"
                >
                  적용
                </button>
                <button
                  onClick={() => {
                    setFilterFrom('');
                    setFilterTo('');
                    setFilterSubject('');
                    setFilterCategory('');
                  }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md
                    hover:bg-gray-200"
                >
                  초기화
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              기간은 피드백·상담에, 과목은 성적에, 카테고리는 피드백에 적용됩니다.
            </p>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* 미선택 안내 */}
        {!studentId && (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
            학생을 검색·선택하면 통합 정보가 표시됩니다.
          </div>
        )}

        {/* 로딩 */}
        {studentId && loading && (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
            불러오는 중...
          </div>
        )}

        {/* 결과 */}
        {studentId && !loading && data && (
          <>
            {/* 선택 학생 */}
            {selectedStudent && (
              <div className="mb-3">
                <span className="text-lg font-semibold text-gray-800">
                  {selectedStudent.name}
                </span>
                {(selectedStudent.grade ||
                  selectedStudent.classNumber ||
                  selectedStudent.studentNumber) && (
                  <span className="ml-2 text-sm text-gray-500">
                    {selectedStudent.grade ?? '-'}학년 {selectedStudent.classNumber ?? '-'}반{' '}
                    {selectedStudent.studentNumber ?? '-'}번
                  </span>
                )}
              </div>
            )}

            {/* 요약 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatCard label="평균 백분율" value={`${summary.avg}%`} accent />
              <StatCard label="등록 과목" value={summary.gradeCount} />
              <StatCard label="피드백" value={summary.feedbackCount} />
              <StatCard label="상담" value={summary.counselingCount} />
            </div>

            {/* 탭 */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-200 overflow-x-auto">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap
                      border-b-2 transition-colors ${
                        activeTab === t.key
                          ? 'border-indigo-600 text-indigo-700'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {activeTab === 'grades' && (
                  <GradesTab grades={data.grades} chartData={chartData} />
                )}
                {activeTab === 'record' && <RecordTab record={data.record} />}
                {activeTab === 'feedbacks' && (
                  <FeedbacksTab feedbacks={data.feedbacks} />
                )}
                {activeTab === 'counselings' && (
                  <CounselingsTab counselings={data.counselings} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GradesTab({ grades, chartData }) {
  if (grades.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">등록된 성적이 없습니다.</p>;
  }
  return (
    <div className="space-y-4">
      <GradeRadarChart data={chartData} title="과목별 성적 시각화" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">학기</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">당시 학년/반</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">과목</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">점수</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">백분율</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-700">등급</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grades.map((g) => (
              <tr key={g._id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-800">{g.semester}</td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  {g.gradeLevel != null
                    ? `${g.gradeLevel}학년 ${g.classNumber ?? '-'}반 ${g.studentNumber ?? '-'}번`
                    : '-'}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800">{g.subject}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-800">
                  {g.score} / {g.totalScore}
                </td>
                <td className="px-4 py-2 text-sm text-right text-gray-800">{g.percentage}%</td>
                <td className="px-4 py-2 text-sm text-center">
                  <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">
                    {g.grade}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecordTab({ record }) {
  if (!record) {
    return <p className="text-sm text-gray-400 text-center py-6">작성된 학생부가 없습니다.</p>;
  }
  const att = record.attendance || {};
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-gray-500 mb-2">출결</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-gray-500">결석</div>
            <div className="text-lg font-semibold text-gray-800">{att.absent ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">지각</div>
            <div className="text-lg font-semibold text-gray-800">{att.late ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">조퇴</div>
            <div className="text-lg font-semibold text-gray-800">{att.early ?? 0}</div>
          </div>
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-500 mb-1">특이사항</div>
        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
          {record.specialNotes || '-'}
        </p>
      </div>
      {record.customFields?.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-2">추가 항목</div>
          <div className="space-y-2">
            {record.customFields.map((f, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="font-medium text-gray-700 min-w-[100px]">{f.label}</span>
                <span className="text-gray-800">{f.value || '-'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbacksTab({ feedbacks }) {
  if (feedbacks.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">등록된 피드백이 없습니다.</p>;
  }
  return (
    <div className="space-y-3">
      {feedbacks.map((f) => (
        <div key={f._id} className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium text-sm">
              {CATEGORY_LABELS[f.category] || f.category}
            </span>
            <span className="text-xs text-gray-500">
              {formatDate(f.createdAt)} · {f.teacherId?.name || '-'}
            </span>
          </div>
          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{f.content}</p>
          <div className="mt-2 text-xs text-gray-400">
            공개:{' '}
            {[
              f.isVisibleToStudent ? '학생' : null,
              f.isVisibleToParent ? '학부모' : null,
            ]
              .filter(Boolean)
              .join('·') || '비공개 (교사만)'}
          </div>
        </div>
      ))}
    </div>
  );
}

function CounselingsTab({ counselings }) {
  if (counselings.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        조회 가능한 상담이 없습니다. (본인 작성 또는 공유된 상담만 표시)
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {counselings.map((c) => (
        <div key={c._id} className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-medium text-gray-800">
              {formatDate(c.date)}
              {c.gradeLevel != null && (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  당시 {c.gradeLevel}학년 {c.classNumber ?? '-'}반
                </span>
              )}
            </span>
            <span className="text-xs text-gray-500">
              {c.teacherId?.name || '-'}
              {c.isShared ? ' · 공유' : ''}
            </span>
          </div>
          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{c.content}</p>
          {c.nextPlan && (
            <div className="mt-2 text-xs text-gray-500">
              다음 계획: {c.nextPlan}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
