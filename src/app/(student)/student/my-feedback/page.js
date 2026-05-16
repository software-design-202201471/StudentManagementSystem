'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
} from '@/lib/feedbackConstants';

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MyFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  async function loadFeedbacks() {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (filterCategory) params.set('category', filterCategory);

    try {
      const res = await fetch(`/api/feedbacks?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setFeedbacks(data.feedbacks);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeedbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 카테고리별 카운트 (요약 카드용)
  const categoryCounts = useMemo(() => {
    const counts = { grade: 0, behavior: 0, attitude: 0, attendance: 0 };
    for (const f of feedbacks) {
      if (counts[f.category] !== undefined) counts[f.category] += 1;
    }
    return counts;
  }, [feedbacks]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">내 피드백</h1>
          <p className="text-sm text-gray-500 mt-1">
            교사가 작성하고 공개한 피드백을 카테고리별로 조회할 수 있습니다.
          </p>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
          {CATEGORY_OPTIONS.map(([value, label]) => (
            <div
              key={value}
              className="bg-white p-4 rounded-lg shadow-sm"
            >
              <div className="text-sm text-gray-500 mb-1">{label}</div>
              <div className="text-xl sm:text-2xl font-bold text-indigo-600">
                {categoryCounts[value] || 0}
              </div>
            </div>
          ))}
        </div>

        {/* 필터 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4
          flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 sm:max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              카테고리
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">전체</option>
              {CATEGORY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={loadFeedbacks}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800
              w-full sm:w-auto"
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

        {/* 카드 목록 */}
        {loading ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
            불러오는 중...
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
            공개된 피드백이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((f) => (
              <div
                key={f._id}
                className="bg-white p-4 sm:p-5 rounded-lg shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700
                    rounded font-medium text-sm">
                    {CATEGORY_LABELS[f.category] || f.category}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(f.createdAt)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  작성: {f.teacherId?.name || '-'}
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                  {f.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
