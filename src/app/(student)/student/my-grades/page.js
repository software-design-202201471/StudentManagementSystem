'use client';

import { useEffect, useMemo, useState } from 'react';
import GradeRadarChart from '@/components/GradeRadarChart';

export default function MyGradesPage() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 필터
  const [filterSemester, setFilterSemester] = useState('');

  async function loadGrades() {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (filterSemester) params.set('semester', filterSemester);

    try {
      const res = await fetch(`/api/grades?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || '조회 실패');
      setGrades(data.grades);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 사용 가능한 학기 목록
  const semesterOptions = useMemo(() => {
    const set = new Set(grades.map((g) => g.semester));
    return Array.from(set).sort().reverse();
  }, [grades]);

  // 차트 데이터 (필터링된 전체 성적)
  const chartData = useMemo(
    () =>
      grades.map((g) => ({
        subject: g.subject,
        percentage: g.percentage,
      })),
    [grades]
  );

  // 평균 백분율 계산
  const averagePercentage = useMemo(() => {
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + (g.percentage || 0), 0);
    return Math.round(sum / grades.length);
  }, [grades]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">내 성적</h1>
          <p className="text-sm text-gray-500 mt-1">
            등록된 성적을 학기별로 조회할 수 있습니다.
          </p>
        </div>

        {/* 필터 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4 flex gap-3 items-end">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학기
            </label>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">전체 학기</option>
              {semesterOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={loadGrades}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
          >
            조회
          </button>
        </div>

        {/* 에러 */}
        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500 mb-1">등록된 과목 수</div>
            <div className="text-2xl font-bold text-gray-800">
              {grades.length}과목
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500 mb-1">평균 백분율</div>
            <div className="text-2xl font-bold text-indigo-600">
              {averagePercentage}%
            </div>
          </div>
        </div>

        {/* 차트 */}
        <div className="mb-4">
          {loading ? (
            <div className="flex items-center justify-center h-80 text-gray-400 bg-white rounded-lg shadow-sm">
              불러오는 중...
            </div>
          ) : (
            <GradeRadarChart data={chartData} title="과목별 성적 시각화" />
          )}
        </div>

        {/* 성적 테이블 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">성적 상세</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  학기
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  과목
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  점수
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  백분율
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  등급
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  담당 교사
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    불러오는 중...
                  </td>
                </tr>
              ) : grades.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    등록된 성적이 없습니다.
                  </td>
                </tr>
              ) : (
                grades.map((g) => (
                  <tr key={g._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {g.semester}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {g.subject}
                    </td>
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
    </div>
  );
}
