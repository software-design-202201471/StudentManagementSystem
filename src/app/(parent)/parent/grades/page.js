'use client';

import { useEffect, useMemo, useState } from 'react';
import GradeRadarChart from '@/components/GradeRadarChart';
import { sumScores, averageScore } from '@/lib/gradeConstants';

function childLabel(c) {
  if (!c) return '';
  const parts = [];
  if (c.grade) parts.push(`${c.grade}학년`);
  if (c.classNumber) parts.push(`${c.classNumber}반`);
  if (c.studentNumber) parts.push(`${c.studentNumber}번`);
  return parts.length ? `${c.name} (${parts.join(' ')})` : c.name;
}

export default function ParentGradesPage() {
  // 자녀 목록
  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [childrenError, setChildrenError] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');

  // 성적
  const [grades, setGrades] = useState([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesError, setGradesError] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  // 자녀 목록 fetch
  useEffect(() => {
    let cancelled = false;
    fetch('/api/parent/children')
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) throw new Error(d.error || '자녀 목록 조회 실패');
        const list = d.children || [];
        setChildren(list);
        if (list.length === 1) setSelectedChildId(list[0]._id);
      })
      .catch((err) => {
        if (!cancelled) setChildrenError(err.message);
      })
      .finally(() => {
        if (!cancelled) setChildrenLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 자녀/학기 변경 시 성적 fetch
  useEffect(() => {
    if (!selectedChildId) return;
    let cancelled = false;

    const params = new URLSearchParams();
    params.set('studentId', selectedChildId);
    if (filterSemester) params.set('semester', filterSemester);

    queueMicrotask(() => {
      if (cancelled) return;
      setGradesLoading(true);
      setGradesError('');
    });

    fetch(`/api/grades?${params.toString()}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) throw new Error(d.error || '성적 조회 실패');
        setGrades(d.grades || []);
      })
      .catch((err) => {
        if (!cancelled) setGradesError(err.message);
      })
      .finally(() => {
        if (!cancelled) setGradesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedChildId, filterSemester]);

  const selectedChild = useMemo(
    () => children.find((c) => c._id === selectedChildId),
    [children, selectedChildId]
  );

  const semesterOptions = useMemo(() => {
    const set = new Set(grades.map((g) => g.semester));
    return Array.from(set).sort().reverse();
  }, [grades]);

  const chartData = useMemo(
    () =>
      grades.map((g) => ({
        subject: g.subject,
        percentage: g.percentage,
      })),
    [grades]
  );

  const averagePercentage = useMemo(() => {
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + (g.percentage || 0), 0);
    return Math.round(sum / grades.length);
  }, [grades]);

  const totalScore = useMemo(() => sumScores(grades), [grades]);
  const avgScore = useMemo(() => averageScore(grades), [grades]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">자녀 성적</h1>
          <p className="text-sm text-gray-500 mt-1">
            자녀의 등록 성적을 학기별로 조회할 수 있습니다.
          </p>
        </div>

        {/* 자녀 선택 + 학기 필터 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4
          flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              자녀
            </label>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              disabled={childrenLoading || children.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm
                disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">
                {childrenLoading
                  ? '불러오는 중...'
                  : children.length === 0
                    ? '등록된 자녀가 없습니다'
                    : '자녀를 선택하세요'}
              </option>
              {children.map((c) => (
                <option key={c._id} value={c._id}>
                  {childLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 sm:max-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학기
            </label>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              disabled={!selectedChildId}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm
                disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">전체 학기</option>
              {semesterOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 에러 */}
        {childrenError && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {childrenError}
          </div>
        )}
        {gradesError && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {gradesError}
          </div>
        )}

        {/* 자녀 미선택 안내 */}
        {!selectedChildId && !childrenLoading && !childrenError && children.length > 0 && (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
            조회할 자녀를 선택하세요.
          </div>
        )}

        {/* 자녀 선택 후 콘텐츠 */}
        {selectedChildId && (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-sm text-gray-500 mb-1">등록 과목 수</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-800">
                  {grades.length}과목
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-sm text-gray-500 mb-1">총점</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-800">
                  {totalScore}점
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-sm text-gray-500 mb-1">평균 점수</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-800">
                  {avgScore}점
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-sm text-gray-500 mb-1">평균 백분율</div>
                <div className="text-xl sm:text-2xl font-bold text-indigo-600">
                  {averagePercentage}%
                </div>
              </div>
            </div>

            {/* 차트 */}
            <div className="mb-4">
              {gradesLoading ? (
                <div className="flex items-center justify-center h-80 text-gray-400 bg-white rounded-lg shadow-sm">
                  불러오는 중...
                </div>
              ) : (
                <GradeRadarChart
                  data={chartData}
                  title={`${selectedChild?.name || '자녀'} 성적 시각화`}
                />
              )}
            </div>

            {/* 테이블 */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700">성적 상세</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">학기</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">당시 학년/반</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">과목</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">점수</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">백분율</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">등급</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">담당 교사</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {gradesLoading ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                          불러오는 중...
                        </td>
                      </tr>
                    ) : grades.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                          등록된 성적이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      grades.map((g) => (
                        <tr key={g._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-800">{g.semester}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {g.gradeLevel != null
                              ? `${g.gradeLevel}학년 ${g.classNumber ?? '-'}반 ${g.studentNumber ?? '-'}번`
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800">{g.subject}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-800">
                            {g.score} / {g.totalScore}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-800">
                            {g.percentage}%
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">
                              {g.grade}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {g.teacherId?.name || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
