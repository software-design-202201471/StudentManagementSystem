'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import FeedbackFormModal from './FeedbackFormModal';
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from '@/lib/feedbackConstants';

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function FeedbackPage() {
  const { data: session } = useSession();
  const myId = session?.user?.id;

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 필터
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMineOnly, setFilterMineOnly] = useState(false);

  // 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null);

  async function loadFeedbacks() {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (filterCategory) params.set('category', filterCategory);
    if (filterMineOnly && myId) params.set('teacherId', myId);

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

  function openCreateModal() {
    setEditingFeedback(null);
    setModalOpen(true);
  }

  function openEditModal(feedback) {
    setEditingFeedback(feedback);
    setModalOpen(true);
  }

  async function handleDelete(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/feedbacks/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '삭제 실패');
      await loadFeedbacks();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleSaved() {
    setModalOpen(false);
    loadFeedbacks();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">피드백 관리</h1>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md
              hover:bg-indigo-700 transition-colors w-full sm:w-auto"
          >
            + 피드백 작성
          </button>
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

          <label className="inline-flex items-center gap-2 text-sm text-gray-700
            sm:pb-2">
            <input
              type="checkbox"
              checked={filterMineOnly}
              onChange={(e) => setFilterMineOnly(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600
                focus:ring-indigo-500"
            />
            내가 작성한 피드백만
          </label>

          <button
            onClick={loadFeedbacks}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800
              w-full sm:w-auto"
          >
            검색
          </button>
        </div>

        {/* 에러 */}
        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* 테이블 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">학생</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">카테고리</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">내용</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">학생 공개</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">학부모 공개</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">작성 교사</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">작성일</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                      불러오는 중...
                    </td>
                  </tr>
                ) : feedbacks.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                      등록된 피드백이 없습니다.
                    </td>
                  </tr>
                ) : (
                  feedbacks.map((f) => {
                    const s = f.studentId || {};
                    const t = f.teacherId || {};
                    const isMine = t._id?.toString() === myId;
                    return (
                      <tr key={f._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800">
                          <div className="font-medium">{s.name || '-'}</div>
                          {(s.grade || s.classNumber || s.studentNumber) && (
                            <div className="text-xs text-gray-500">
                              {s.grade ?? '-'}/{s.classNumber ?? '-'}/{s.studentNumber ?? '-'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">
                            {CATEGORY_LABELS[f.category] || f.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-[280px] truncate">
                          {f.content}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {f.isVisibleToStudent ? (
                            <span className="text-indigo-600">●</span>
                          ) : (
                            <span className="text-gray-300">○</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {f.isVisibleToParent ? (
                            <span className="text-indigo-600">●</span>
                          ) : (
                            <span className="text-gray-300">○</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {t.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(f.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center space-x-2">
                          {isMine ? (
                            <>
                              <button
                                onClick={() => openEditModal(f)}
                                className="text-indigo-600 hover:text-indigo-800"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDelete(f._id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                삭제
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <FeedbackFormModal
          feedback={editingFeedback}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
