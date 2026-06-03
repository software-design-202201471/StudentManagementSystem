'use client';

import { useEffect, useMemo, useState } from 'react';

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

export default function ParentCounselingPage() {
  // 자녀 목록
  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [childrenError, setChildrenError] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');

  // 상담
  const [counselings, setCounselings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  // 자녀 선택 시 상담 fetch (학부모 공개분만)
  useEffect(() => {
    if (!selectedChildId) return;
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError('');
    });

    fetch(`/api/counselings?studentId=${selectedChildId}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) throw new Error(d.error || '상담 조회 실패');
        setCounselings(d.counselings || []);
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
  }, [selectedChildId]);

  const selectedChild = useMemo(
    () => children.find((c) => c._id === selectedChildId),
    [children, selectedChildId]
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">자녀 상담</h1>
          <p className="text-sm text-gray-500 mt-1">
            교사가 학부모에게 공개한 상담 내역만 조회됩니다.
          </p>
        </div>

        {/* 자녀 선택 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            자녀
          </label>
          <select
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            disabled={childrenLoading || children.length === 0}
            className="w-full sm:max-w-sm px-3 py-2 border border-gray-300 rounded-md
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

        {/* 에러 */}
        {childrenError && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {childrenError}
          </div>
        )}
        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* 미선택 안내 */}
        {!selectedChildId && !childrenLoading && !childrenError && children.length > 0 && (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
            조회할 자녀를 선택하세요.
          </div>
        )}

        {/* 카드 목록 */}
        {selectedChildId &&
          (loading ? (
            <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
              불러오는 중...
            </div>
          ) : counselings.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
              {selectedChild
                ? `${selectedChild.name} 자녀에 대해 공개된 상담이 없습니다.`
                : '공개된 상담이 없습니다.'}
            </div>
          ) : (
            <div className="space-y-3">
              {counselings.map((c) => (
                <div key={c._id} className="bg-white p-4 sm:p-5 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {formatDate(c.date)}
                      {c.gradeLevel != null && (
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          당시 {c.gradeLevel}학년 {c.classNumber ?? '-'}반
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      상담 교사: {c.teacherId?.name || '-'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                    {c.content}
                  </p>
                  {c.nextPlan && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">다음 계획</div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                        {c.nextPlan}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
