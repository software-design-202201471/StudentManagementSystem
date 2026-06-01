'use client';

import { useEffect, useMemo, useState } from 'react';

function childLabel(c) {
  if (!c) return '';
  const parts = [];
  if (c.grade) parts.push(`${c.grade}학년`);
  if (c.classNumber) parts.push(`${c.classNumber}반`);
  if (c.studentNumber) parts.push(`${c.studentNumber}번`);
  return parts.length ? `${c.name} (${parts.join(' ')})` : c.name;
}

export default function ParentRecordPage() {
  // 자녀 목록
  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [childrenError, setChildrenError] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');

  // 학생부
  const [record, setRecord] = useState(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState('');
  const [notFound, setNotFound] = useState(false);

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

  // 자녀 선택 시 학생부 fetch
  useEffect(() => {
    if (!selectedChildId) return;
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setRecordLoading(true);
      setRecordError('');
      setNotFound(false);
      setRecord(null);
    });

    fetch(`/api/records/${selectedChildId}`)
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
        if (!cancelled) setRecordError(err.message);
      })
      .finally(() => {
        if (!cancelled) setRecordLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedChildId]);

  const selectedChild = useMemo(
    () => children.find((c) => c._id === selectedChildId),
    [children, selectedChildId]
  );

  const att = record?.attendance || {};

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">자녀 학생부</h1>
          <p className="text-sm text-gray-500 mt-1">
            자녀의 출결·특기사항 등 학생부 정보를 조회할 수 있습니다.
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
        {recordError && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {recordError}
          </div>
        )}

        {/* 미선택 안내 */}
        {!selectedChildId && !childrenLoading && !childrenError && children.length > 0 && (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
            조회할 자녀를 선택하세요.
          </div>
        )}

        {/* 학생부 내용 */}
        {selectedChildId && (
          recordLoading ? (
            <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
              불러오는 중...
            </div>
          ) : notFound ? (
            <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-400">
              {selectedChild
                ? `${selectedChild.name} 자녀의 학생부가 아직 작성되지 않았습니다.`
                : '작성된 학생부가 없습니다.'}
            </div>
          ) : record ? (
            <div className="space-y-4">
              {/* 출결 카드 */}
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

              {/* 특이사항 */}
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">
                  특이사항
                </h2>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                  {record.specialNotes || '-'}
                </p>
              </div>

              {/* 커스텀 항목 */}
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
          ) : null
        )}
      </div>
    </div>
  );
}
