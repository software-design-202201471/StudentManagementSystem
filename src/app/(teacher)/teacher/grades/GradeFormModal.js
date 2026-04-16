'use client';

import { useState } from 'react';

/**
 * 성적 입력/수정 모달
 * @param {object} props
 * @param {object|null} props.grade - 수정 시 기존 grade 객체, 생성 시 null
 * @param {() => void} props.onClose
 * @param {() => void} props.onSaved
 */
export default function GradeFormModal({ grade, onClose, onSaved }) {
  const isEdit = !!grade;

  const [studentId, setStudentId] = useState(
    grade?.studentId?._id || grade?.studentId || ''
  );
  const [semester, setSemester] = useState(grade?.semester || '');
  const [subject, setSubject] = useState(grade?.subject || '');
  const [score, setScore] = useState(grade?.score ?? '');
  const [totalScore, setTotalScore] = useState(grade?.totalScore ?? 100);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      semester,
      subject,
      score: Number(score),
      totalScore: Number(totalScore),
    };

    // 생성 시에만 studentId 포함 (수정 시에는 학생 변경 불가)
    if (!isEdit) payload.studentId = studentId;

    try {
      const url = isEdit ? `/api/grades/${grade._id}` : '/api/grades';
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit ? '성적 수정' : '성적 입력'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          {/* 학기 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학기
            </label>
            <input
              type="text"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              required
              placeholder="예: 2025-1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 과목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              과목
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="예: 수학"
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 점수 / 만점 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                점수
              </label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                만점
              </label>
              <input
                type="number"
                value={totalScore}
                onChange={(e) => setTotalScore(e.target.value)}
                required
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md
                hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md
                hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
