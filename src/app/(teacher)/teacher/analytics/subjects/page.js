'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function Stat({ label, value, accent }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div
        className={`text-base font-semibold ${
          accent ? 'text-indigo-600' : 'text-gray-800'
        }`}
      >
        {value ?? '-'}
      </div>
    </div>
  );
}

function SubjectCard({ subject }) {
  const distData = (subject.gradeDistribution || []).map((d) => ({
    grade: d.grade,
    count: d.count,
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">
          {subject.subject}
        </h3>
        <span className="text-xs text-gray-500">
          평균{' '}
          <strong className="text-indigo-600">
            {subject.averagePercentage ?? 0}%
          </strong>
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* 통계 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="등록 성적" value={subject.gradeCount} />
          <Stat label="응시 학생" value={subject.studentCount} />
          <Stat label="최고" value={`${subject.maxPercentage ?? 0}%`} />
          <Stat label="최저" value={`${subject.minPercentage ?? 0}%`} />
        </div>

        {/* 등급 분포 */}
        <div>
          <div className="text-xs text-gray-500 mb-2">등급 분포</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={distData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="grade" tick={{ fill: '#374151', fontSize: 11 }} />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#9ca3af', fontSize: 10 }}
              />
              <Tooltip
                formatter={(v) => [`${v}명`, '학생수']}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 학기별 */}
        {subject.semesterStats?.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-2">학기별 평균</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {subject.semesterStats.map((s) => (
                <div
                  key={s.semester}
                  className="border border-gray-200 rounded-md p-2"
                >
                  <div className="text-xs text-gray-500">{s.semester}</div>
                  <div className="text-sm font-semibold text-gray-800">
                    {s.averagePercentage}% ({s.count})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsSubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('average');

  async function load() {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (sortBy) params.set('sortBy', sortBy);
    try {
      const res = await fetch(`/api/analytics/subjects?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setSubjects(data.subjects);
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

  // 전체 비교 차트 데이터
  const compareData = useMemo(
    () =>
      subjects.map((s) => ({
        subject: s.subject,
        average: s.averagePercentage,
      })),
    [subjects]
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <Link
              href="/teacher/analytics"
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              ← 분석 대시보드
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 mt-2">
              과목별 분석
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              과목별 평균·등급 분포 ({subjects.length}개 과목)
            </p>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1 sm:w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                정렬
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="average">평균 (높은 순)</option>
                <option value="name">과목명</option>
                <option value="students">응시 학생 수</option>
              </select>
            </div>
            <button
              onClick={load}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 text-sm"
            >
              적용
            </button>
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* 전체 비교 차트 */}
        {compareData.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              과목별 평균 백분율 비교
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={compareData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="subject"
                  tick={{ fill: '#374151', fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, '평균']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="average" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 과목 카드 목록 */}
        {loading ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
            불러오는 중...
          </div>
        ) : subjects.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
            과목 분석 데이터가 없습니다. 대시보드에서 재집계를 실행하세요.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {subjects.map((s) => (
              <SubjectCard key={s._id} subject={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
