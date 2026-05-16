'use client';

import { useState } from 'react';
import StudentPicker from '@/components/StudentPicker';
import { CATEGORY_OPTIONS } from '@/lib/feedbackConstants';

/**
 * 피드백 작성/수정 모달
 * @param {object} props
 * @param {object|null} props.feedback - 수정 시 기존 feedback, 신규 시 null
 * @param {() => void} props.onClose
 * @param {() => void} props.onSaved
 */
export default function FeedbackFormModal({ feedback, onClose, onSaved }) {
  const isEdit = !!feedback;

  const [studentId, setStudentId] = useState(
    feedback?.studentId?._id || feedback?.studentId || ''
  );
  const [category, setCategory] = useState(feedback?.category || 'behavior');
  const [content, setContent] = useState(feedback?.content || '');
  const [isVisibleToStudent, setIsVisibleToStudent] = useState(
    feedback?.isVisibleToStudent ?? false
  );
  const [isVisibleToParent, setIsVisibleToParent] = useState(
    feedback?.isVisibleToParent ?? false
  );

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!studentId) {
      setError('학생을 선택해주세요.');
      return;
    }
    if (!content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }

    setLoading(true);

    const payload = {
      category,
      content,
      isVisibleToStudent,
      isVisibleToParent,
    };
    if (!isEdit) payload.studentId = studentId;

    try {
      const url = isEdit ? `/api/feedbacks/${feedback._id}` : '/api/feedbacks';
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
            {isEdit ? '피드백 수정' : '피드백 작성'}
          </h2>
        </div>

        <form
          id="feedback-form"
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
              disabledStudent={feedback?.studentId}
            />
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              카테고리
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={5000}
              required
              placeholder="피드백 내용을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
            <p className="mt-1 text-xs text-gray-400 text-right">
              {content.length} / 5000
            </p>
          </div>

          {/* 공개 범위 */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-1">
              공개 범위
            </legend>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isVisibleToStudent}
                  onChange={(e) => setIsVisibleToStudent(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600
                    focus:ring-indigo-500"
                />
                학생 본인에게 공개
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isVisibleToParent}
                  onChange={(e) => setIsVisibleToParent(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600
                    focus:ring-indigo-500"
                />
                학부모에게 공개
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              체크하지 않으면 교사만 조회 가능합니다.
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
            form="feedback-form"
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
