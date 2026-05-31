'use client';

import { useEffect, useState, use } from 'react';
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

function classLabel(s) {
  if (!s) return '';
  const parts = [];
  if (s.grade) parts.push(`${s.grade}학년`);
  if (s.classNumber) parts.push(`${s.classNumber}반`);
  if (s.studentNumber) parts.push(`${s.studentNumber}번`);
  return parts.length ? parts.join(' ') : '학년/반/번호 미등록';
}

function Stat({ label, value, accent }) {
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

export default function AnalyticsStudentDetailPage({ params }) {
  // Next.js 15+ params는 Promise
  const { studentId } = use(params);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    // effect body 동기 setState 회피 — 마이크로태스크로 위임
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError('');
    });
    fetch(`/api/analytics/students/${studentId}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) throw new Error(d.error || '조회 실패');
        setStudent(d.student);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-5xl mx-auto bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
          불러오는 중...
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/teacher/analytics/students"
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            ← 학생 목록
          </Link>
          <div className="mt-4 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error || '학생 분석 데이터를 찾을 수 없습니다. 대시보드에서 재집계를 실행하세요.'}
          </div>
        </div>
      </div>
    );
  }

  const subjectChartData = (student.subjectStats || []).map((s) => ({
    subject: s.subject,
    average: s.averagePercentage,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <Link
            href="/teacher/analytics/students"
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            ← 학생 목록
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">
            {student.name || '-'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{classLabel(student)}</p>
          <p className="text-xs text-gray-400 mt-1">
            마지막 집계: {formatDate(student.lastAggregatedAt)}
          </p>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Stat
            label="평균 백분율"
            value={`${student.averagePercentage ?? 0}%`}
            accent
          />
          <Stat label="등록 과목" value={student.gradeCount} />
          <Stat label="피드백" value={student.feedbackCount} />
          <Stat label="상담" value={student.counselingCount} />
        </div>

        {/* 출결 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">출결</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-gray-500">결석</div>
              <div className="text-lg font-semibold text-gray-800">
                {student.attendance?.absent ?? 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">지각</div>
              <div className="text-lg font-semibold text-gray-800">
                {student.attendance?.late ?? 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">조퇴</div>
              <div className="text-lg font-semibold text-gray-800">
                {student.attendance?.early ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* 과목별 평균 차트 */}
        {subjectChartData.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              과목별 평균 백분율
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={subjectChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="subject" tick={{ fill: '#374151', fontSize: 12 }} />
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
                <Bar dataKey="average" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 과목별 상세 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">과목별 상세</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">과목</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">건수</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">평균(%)</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">최근 등급</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {student.subjectStats?.length ? (
                  student.subjectStats.map((s) => (
                    <tr key={s.subject} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-800">{s.subject}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-700">{s.count}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-700">{s.averagePercentage}%</td>
                      <td className="px-4 py-2 text-sm text-center">
                        <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">
                          {s.latestGrade || '-'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-6 text-center text-gray-400 text-sm">
                      등록된 성적이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 학기별 통계 + 피드백 카테고리 (2열) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {/* 학기별 */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">학기별 통계</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">학기</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">과목수</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">평균(%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {student.semesterStats?.length ? (
                    student.semesterStats.map((s) => (
                      <tr key={s.semester} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-800">{s.semester}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-700">{s.count}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-700">{s.averagePercentage}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-4 py-6 text-center text-gray-400 text-sm">
                        학기 데이터 없음
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 피드백 카테고리 */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">피드백 카테고리</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                <div key={k} className="border border-gray-200 rounded-md p-3">
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className="text-lg font-semibold text-gray-800">
                    {student.feedbackByCategory?.[k] ?? 0}
                  </div>
                </div>
              ))}
            </div>
            {student.lastCounselingDate && (
              <div className="px-4 pb-4 text-xs text-gray-500">
                최근 상담: {formatDate(student.lastCounselingDate)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
