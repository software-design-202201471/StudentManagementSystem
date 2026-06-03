'use client';

import { useEffect, useState } from 'react';

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MyCounselingPage() {
  const [counselings, setCounselings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/counselings')
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
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">내 상담</h1>
          <p className="text-sm text-gray-500 mt-1">
            교사가 나에게 공개한 상담 내역만 조회됩니다.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
            불러오는 중...
          </div>
        ) : counselings.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
            공개된 상담이 없습니다.
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
        )}
      </div>
    </div>
  );
}
