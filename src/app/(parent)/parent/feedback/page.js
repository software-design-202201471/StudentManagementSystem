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

function childLabel(c) {
  if (!c) return '';
  const parts = [];
  if (c.grade) parts.push(`${c.grade}학년`);
  if (c.classNumber) parts.push(`${c.classNumber}반`);
  if (c.studentNumber) parts.push(`${c.studentNumber}번`);
  return parts.length ? `${c.name} (${parts.join(' ')})` : c.name;
}

export default function ParentFeedbackPage() {
  // 자녀 목록
  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [childrenError, setChildrenError] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');

  // 피드백
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [feedbacksError, setFeedbacksError] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // 자녀 목록 fetch (마운트 1회)
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

  // 자녀 선택 시 피드백 fetch
  useEffect(() => {
    if (!selectedChildId) return;
    let cancelled = false;

    const params = new URLSearchParams();
    params.set('studentId', selectedChildId);
    if (filterCategory) params.set('category', filterCategory);

    // effect body 동기 setState 회피 — 마이크로태스크에 위임
    queueMicrotask(() => {
      if (cancelled) return;
      setFeedbacksLoading(true);
      setFeedbacksError('');
    });

    fetch(`/api/feedbacks?${params.toString()}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) throw new Error(d.error || '피드백 조회 실패');
        setFeedbacks(d.feedbacks || []);
      })
      .catch((err) => {
        if (!cancelled) setFeedbacksError(err.message);
      })
      .finally(() => {
        if (!cancelled) setFeedbacksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedChildId, filterCategory]);

  const selectedChild = useMemo(
    () => children.find((c) => c._id === selectedChildId),
    [children, selectedChildId]
  );

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
          <h1 className="text-2xl font-bold text-gray-800">자녀 피드백</h1>
          <p className="text-sm text-gray-500 mt-1">
            교사가 자녀에 대해 작성하고 공개한 피드백을 조회할 수 있습니다.
          </p>
        </div>

        {/* 자녀 선택 + 카테고리 필터 */}
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
              카테고리
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              disabled={!selectedChildId}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm
                disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">전체</option>
              {CATEGORY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
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
        {feedbacksError && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {feedbacksError}
          </div>
        )}

        {/* 자녀 미선택 안내 */}
        {!selectedChildId && !childrenLoading && !childrenError && children.length > 0 && (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
            조회할 자녀를 선택하세요.
          </div>
        )}

        {/* 카테고리 요약 카드 (자녀 선택 시) */}
        {selectedChildId && (
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
        )}

        {/* 카드 목록 */}
        {selectedChildId &&
          (feedbacksLoading ? (
            <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
              불러오는 중...
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
              {selectedChild
                ? `${selectedChild.name} 자녀에 대해 공개된 피드백이 없습니다.`
                : '공개된 피드백이 없습니다.'}
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
          ))}
      </div>
    </div>
  );
}
