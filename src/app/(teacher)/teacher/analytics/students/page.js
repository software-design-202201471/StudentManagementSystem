'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function classCell(s) {
  if (!s.grade && !s.classNumber && !s.studentNumber) return '-';
  return `${s.grade ?? '-'} / ${s.classNumber ?? '-'} / ${s.studentNumber ?? '-'}`;
}

export default function AnalyticsStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterGrade, setFilterGrade] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [sortBy, setSortBy] = useState('class');

  async function load() {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (filterGrade) params.set('grade', filterGrade);
    if (filterClass) params.set('classNumber', filterClass);
    if (sortBy) params.set('sortBy', sortBy);
    try {
      const res = await fetch(`/api/analytics/students?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setStudents(data.students);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 데이터에서 distinct 학년·반 추출 (필터 select용)
  const gradeOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.grade).filter(Boolean));
    return Array.from(set).sort((a, b) => a - b);
  }, [students]);
  const classOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.classNumber).filter(Boolean));
    return Array.from(set).sort((a, b) => a - b);
  }, [students]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <Link
            href="/teacher/analytics"
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            ← 분석 대시보드
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">학생별 분석</h1>
          <p className="text-sm text-gray-500 mt-1">
            학생별 학습 현황 집계 ({students.length}명)
          </p>
        </div>

        {/* 필터 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4
          flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 sm:max-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">전체</option>
              {gradeOptions.map((g) => (
                <option key={g} value={g}>{g}학년</option>
              ))}
            </select>
          </div>
          <div className="flex-1 sm:max-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">반</label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">전체</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>{c}반</option>
              ))}
            </select>
          </div>
          <div className="flex-1 sm:max-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">정렬</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="class">학년/반/번호</option>
              <option value="average">평균 (높은 순)</option>
              <option value="name">이름</option>
            </select>
          </div>
          <button
            onClick={load}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800
              w-full sm:w-auto"
          >
            적용
          </button>
        </div>

        {/* 에러 */}
        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* 테이블 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">학생</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">학년/반/번호</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">평균</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">과목수</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">피드백</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">상담</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">마지막 상담</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                      불러오는 중...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                      분석 데이터가 없습니다. 대시보드에서 재집계를 실행하세요.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                        {s.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{classCell(s)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="font-semibold text-indigo-700">
                          {s.averagePercentage ?? 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {s.gradeCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {s.feedbackCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {s.counselingCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(s.lastCounselingDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <Link
                          href={`/teacher/analytics/students/${s.studentId}`}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          보기
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
