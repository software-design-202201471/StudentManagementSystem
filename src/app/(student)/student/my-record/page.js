'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function MyRecordPage() {
  const { data: session } = useSession();
  const studentId = session?.user?.id;

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError('');
      setNotFound(false);
    });
    fetch(`/api/records/${studentId}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, status: r.status, d })))
      .then(({ ok, status, d }) => {
        if (cancelled) return;
        if (status === 404) {
          setNotFound(true);
          return;
        }
        if (!ok) throw new Error(d.error || '학생부 조회 실패');
        setRecord(d.record);
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

  const att = record?.attendance || {};

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">내 학생부</h1>
          <p className="text-sm text-gray-500 mt-1">
            출결·특기사항 등 학생부 정보를 조회할 수 있습니다.
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
        ) : notFound || !record ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
            아직 작성된 학생부가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">출결</h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-gray-500">결석</div>
                  <div className="text-xl font-bold text-gray-800">
                    {att.absent ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">지각</div>
                  <div className="text-xl font-bold text-gray-800">
                    {att.late ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">조퇴</div>
                  <div className="text-xl font-bold text-gray-800">
                    {att.early ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">
                특이사항
              </h2>
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                {record.specialNotes || '-'}
              </p>
            </div>

            {record.customFields?.length > 0 && (
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  추가 항목
                </h2>
                <div className="space-y-2">
                  {record.customFields.map((f, i) => (
                    <div
                      key={i}
                      className="flex flex-col sm:flex-row sm:gap-3 text-sm
                        border-b border-gray-100 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="font-medium text-gray-700 sm:min-w-[140px]">
                        {f.label}
                      </span>
                      <span className="text-gray-800 break-words">
                        {f.value || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
