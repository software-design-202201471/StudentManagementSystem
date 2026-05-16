'use client';

import { useState } from 'react';
import StudentPicker from '@/components/StudentPicker';

/**
 * ISO 날짜 → "YYYY-MM-DD" (input[type=date] 값용).
 * 빈 입력은 오늘 날짜로 default.
 */
function toDateInputValue(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 상담 작성/수정 모달
 * @param {object} props
 * @param {object|null} props.counseling - 수정 시 기존 counseling, 신규 시 null
 * @param {() => void} props.onClose
 * @param {() => void} props.onSaved
 */
export default function CounselingFormModal({
  counseling,
  onClose,
  onSaved,
}) {
  const isEdit = !!counseling;

  const [studentId, setStudentId] = useState(
    counseling?.studentId?._id || counseling?.studentId || ''
  );
  const [date, setDate] = useState(toDateInputValue(counseling?.date));
  const [content, setContent] = useState(counseling?.content || '');
  const [nextPlan, setNextPlan] = useState(counseling?.nextPlan || '');
  const [isShared, setIsShared] = useState(counseling?.isShared ?? false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!studentId) {
      setError('학생을 선택해주세요.');
      return;
    }
    if (!date) {
      setError('상담 일자를 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }

    setLoading(true);

    const payload = {
      date,
      content,
      nextPlan,
      isShared,
    };
    if (!isEdit) payload.studentId = studentId;

    try {
      const url = isEdit
        ? `/api/counselings/${counseling._id}`
        : '/api/counselings';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
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
            {isEdit ? '상담 수정' : '상담 작성'}
          </h2>
        </div>

        <form
          id="counseling-form"
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto flex-1"
        >
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {/* 학생 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학생
            </label>
            <StudentPicker
              value={studentId}
              onChange={(s) => setStudentId(s?._id || '')}
              disabled={isEdit}
              disabledStudent={counseling?.studentId}
            />
          </div>

          {/* 일자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상담 일자
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상담 내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={5000}
              required
              placeholder="상담 내용을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
            <p className="mt-1 text-xs text-gray-400 text-right">
              {content.length} / 5000
            </p>
          </div>

          {/* 다음 계획 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              다음 계획
            </label>
            <textarea
              value={nextPlan}
              onChange={(e) => setNextPlan(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="향후 계획·후속 조치를 입력하세요 (선택)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
            <p className="mt-1 text-xs text-gray-400 text-right">
              {nextPlan.length} / 2000
            </p>
          </div>

          {/* 공유 */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-1">
              공유
            </legend>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600
                  focus:ring-indigo-500"
              />
              다른 교사도 조회할 수 있도록 공유
            </label>
            <p className="mt-1 text-xs text-gray-400">
              체크하지 않으면 작성한 본인만 조회 가능합니다.
            </p>
          </fieldset>
        </form>

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
            form="counseling-form"
            disabled={loading}
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
