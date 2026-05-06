'use client';

import { useState } from 'react';

/**
 * 학생부 작성/수정 모달
 * @param {object} props
 * @param {object|null} props.record - 수정 시 기존 record, 신규 시 null
 * @param {() => void} props.onClose
 * @param {() => void} props.onSaved
 */
export default function RecordFormModal({ record, onClose, onSaved }) {
  const isEdit = !!record;

  const [studentId, setStudentId] = useState(
    record?.studentId?._id || record?.studentId || ''
  );
  const [absent, setAbsent] = useState(record?.attendance?.absent ?? 0);
  const [late, setLate] = useState(record?.attendance?.late ?? 0);
  const [early, setEarly] = useState(record?.attendance?.early ?? 0);
  const [specialNotes, setSpecialNotes] = useState(record?.specialNotes || '');
  const [customFields, setCustomFields] = useState(
    record?.customFields?.map((f) => ({ label: f.label, value: f.value })) || []
  );

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function addCustomField() {
    setCustomFields((prev) => [...prev, { label: '', value: '' }]);
  }

  function removeCustomField(index) {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCustomField(index, key, value) {
    setCustomFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [key]: value } : f))
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // customFields label 비어있는 항목 제외
    const cleanedFields = customFields
      .map((f) => ({ label: f.label.trim(), value: f.value }))
      .filter((f) => f.label.length > 0);

    const payload = {
      attendance: {
        absent: Number(absent) || 0,
        late: Number(late) || 0,
        early: Number(early) || 0,
      },
      specialNotes,
      customFields: cleanedFields,
    };

    setLoading(true);
    try {
      const res = await fetch(`/api/records/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '저장 실패');
      onSaved();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit ? '학생부 수정' : '학생부 작성'}
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto flex-1"
        >
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {/* 학생 ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학생 ID
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={isEdit}
              required
              placeholder="학생의 MongoDB ObjectId"
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500
                disabled:bg-gray-100 disabled:text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              {isEdit ? '학생은 수정할 수 없습니다.' : '임시: 학생 선택 UI는 추후 추가'}
            </p>
          </div>

          {/* 출결 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              출결
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="block text-xs text-gray-500 mb-1">결석</span>
                <input
                  type="number"
                  value={absent}
                  onChange={(e) => setAbsent(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <span className="block text-xs text-gray-500 mb-1">지각</span>
                <input
                  type="number"
                  value={late}
                  onChange={(e) => setLate(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <span className="block text-xs text-gray-500 mb-1">조퇴</span>
                <input
                  type="number"
                  value={early}
                  onChange={(e) => setEarly(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* 특이사항 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              특이사항
            </label>
            <textarea
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              rows={3}
              placeholder="특이사항을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>

          {/* 커스텀 필드 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                커스텀 항목
              </label>
              <button
                type="button"
                onClick={addCustomField}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                + 항목 추가
              </button>
            </div>

            {customFields.length === 0 ? (
              <p className="text-xs text-gray-400">
                추가된 항목이 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {customFields.map((f, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
                  >
                    <input
                      type="text"
                      value={f.label}
                      onChange={(e) =>
                        updateCustomField(i, 'label', e.target.value)
                      }
                      placeholder="항목명 (예: 진로희망)"
                      className="sm:w-1/3 px-3 py-2 border border-gray-300 rounded-md
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <input
                      type="text"
                      value={f.value}
                      onChange={(e) =>
                        updateCustomField(i, 'value', e.target.value)
                      }
                      placeholder="내용"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomField(i)}
                      className="px-3 py-2 text-sm text-red-600 hover:text-red-800
                        border border-gray-200 rounded-md sm:border-0"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* 버튼 (sticky footer) */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md
              hover:bg-gray-100 bg-white"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md
              hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
