'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

const STATUS_BADGE = {
  success: { label: '성공', cls: 'bg-emerald-50 text-emerald-700' },
  running: { label: '진행', cls: 'bg-amber-50 text-amber-700' },
  failed: { label: '실패', cls: 'bg-red-50 text-red-700' },
  partial: { label: '부분', cls: 'bg-amber-50 text-amber-700' },
};

const TRIGGER_LABEL = {
  manual: '수동',
  event: '이벤트',
  scheduled: '스케줄',
};

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

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] || {
    label: status,
    cls: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function AnalyticsDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recomputing, setRecomputing] = useState(false);

  async function loadOverview() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analytics/overview');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setOverview(data.overview);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecompute() {
    if (!confirm('전체 분석 데이터를 재집계합니다. 진행하시겠습니까?')) {
      return;
    }
    setRecomputing(true);
    try {
      const res = await fetch('/api/analytics/recompute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '재집계 실패');
      alert(
        `완료: 학생 ${data.result.studentsProcessed}명, ` +
          `과목 ${data.result.subjectsProcessed}개 (${data.result.durationMs}ms)`
      );
      await loadOverview();
    } catch (err) {
      alert(err.message);
    } finally {
      setRecomputing(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">분석 대시보드</h1>
            <p className="text-sm text-gray-500 mt-1">
              학생·과목 학습 현황 요약 (OLAP)
            </p>
            <p className="text-xs text-gray-400 mt-1">
              마지막 갱신: {formatDateTime(overview?.lastAggregatedAt)}
            </p>
          </div>
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md
              hover:bg-indigo-700 transition-colors w-full sm:w-auto
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {recomputing ? '재집계 중...' : '🔄 지금 재집계'}
          </button>
        </div>

        {/* 에러 */}
        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* 요약 카드 6개 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="총 학생" value={loading ? '...' : overview?.totalStudents} />
          <StatCard label="총 과목" value={loading ? '...' : overview?.totalSubjects} />
          <StatCard
            label="전체 평균"
            value={loading ? '...' : `${overview?.overallAverage ?? 0}%`}
            accent
          />
          <StatCard label="성적 레코드" value={loading ? '...' : overview?.totalGradeRecords} />
          <StatCard label="피드백" value={loading ? '...' : overview?.totalFeedbacks} />
          <StatCard label="상담" value={loading ? '...' : overview?.totalCounselings} />
        </div>

        {/* 상세 페이지 링크 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <Link
            href="/teacher/analytics/students"
            className="block bg-white p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow
              border-l-4 border-indigo-500"
          >
            <div className="text-sm text-gray-500 mb-1">학생별 분석</div>
            <div className="text-lg font-semibold text-gray-800">
              학생 목록·상세 →
            </div>
          </Link>
          <Link
            href="/teacher/analytics/subjects"
            className="block bg-white p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow
              border-l-4 border-emerald-500"
          >
            <div className="text-sm text-gray-500 mb-1">과목별 분석</div>
            <div className="text-lg font-semibold text-gray-800">
              과목별 평균·등급 분포 →
            </div>
          </Link>
        </div>

        {/* 최근 적재 이력 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">
              최근 적재 이력
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">시각</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">트리거</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">범위</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">출처</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700">상태</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">처리</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">소요(ms)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-gray-400 text-sm">
                      불러오는 중...
                    </td>
                  </tr>
                ) : !overview?.recentRuns?.length ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-gray-400 text-sm">
                      적재 이력이 없습니다. 지금 재집계 버튼으로 시작하세요.
                    </td>
                  </tr>
                ) : (
                  overview.recentRuns.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs text-gray-700 whitespace-nowrap">
                        {formatDateTime(r.finishedAt || r.createdAt)}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-700">
                        {TRIGGER_LABEL[r.trigger] || r.trigger}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-700">{r.scope}</td>
                      <td className="px-4 py-2 text-xs text-gray-500 max-w-[180px] truncate">
                        {r.source || '-'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-2 text-xs text-right text-gray-700">
                        {r.studentsProcessed || 0}/{r.subjectsProcessed || 0}
                      </td>
                      <td className="px-4 py-2 text-xs text-right text-gray-700">
                        {r.durationMs ?? '-'}
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
