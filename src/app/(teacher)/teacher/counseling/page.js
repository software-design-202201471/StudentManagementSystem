'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import CounselingFormModal from './CounselingFormModal';
import StudentPicker from '@/components/StudentPicker';
import VisibilityBadge from '@/components/VisibilityBadge';
import { formatEnrollment } from '@/lib/format';

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CounselingPage() {
  const { data: session } = useSession();
  const myId = session?.user?.id;

  const [counselings, setCounselings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 필터
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterTeacherId, setFilterTeacherId] = useState(''); // '' = 전체, myId = 내 상담
  const [filterStudent, setFilterStudent] = useState(null);
  // 교사 드롭다운 옵션 — 조회된 상담의 작성 교사 distinct (교사 필터 미적용 시에만 갱신해 안정 유지)
  const [teacherOptions, setTeacherOptions] = useState([]);

  // 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCounseling, setEditingCounseling] = useState(null);

  async function loadCounselings() {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (filterFrom) params.set('from', filterFrom);
    if (filterTo) params.set('to', filterTo);
    if (filterTeacherId) params.set('teacherId', filterTeacherId);
    if (filterStudent?._id) params.set('studentId', filterStudent._id);

    try {
      const res = await fetch(`/api/counselings?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setCounselings(data.counselings);

      // 교사 필터가 없을 때(전체 작성 교사 포함)만 옵션 갱신 → 선택 중에도 목록 안정
      if (!filterTeacherId) {
        const map = new Map();
        for (const c of data.counselings) {
          const t = c.teacherId;
          if (t?._id) map.set(t._id.toString(), t.name || '(이름 없음)');
        }
        setTeacherOptions(Array.from(map, ([id, name]) => ({ id, name })));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCounselings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreateModal() {
    setEditingCounseling(null);
    setModalOpen(true);
  }

  function openEditModal(c) {
    setEditingCounseling(c);
    setModalOpen(true);
  }

  async function handleDelete(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/counselings/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '삭제 실패');
      await loadCounselings();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleSaved() {
    setModalOpen(false);
    loadCounselings();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">상담 관리</h1>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md
              hover:bg-indigo-700 transition-colors w-full sm:w-auto"
          >
            + 상담 작성
          </button>
        </div>

        {/* 필터 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4
          flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
          <div className="flex-1 sm:max-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시작일
            </label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <div className="flex-1 sm:max-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              종료일
            </label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="flex-1 sm:max-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              작성 교사
            </label>
            <select
              value={filterTeacherId}
              onChange={(e) => setFilterTeacherId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">전체 교사</option>
              {myId && <option value={myId}>나 (내 상담)</option>}
              {teacherOptions
                .filter((t) => t.id !== myId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex-1 sm:max-w-[220px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학생
            </label>
            <StudentPicker
              value={filterStudent?._id || ''}
              onChange={(s) => setFilterStudent(s)}
            />
          </div>

          <button
            onClick={loadCounselings}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800
              w-full sm:w-auto"
          >
            검색
          </button>
        </div>

        {/* 안내 */}
        <p className="text-xs text-gray-500 mb-4">
          본인이 작성한 상담과 다른 교사가 <strong>공유</strong>한 상담만 조회됩니다.
        </p>

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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">일자</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">학생</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">내용</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">다음 계획</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">공유</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">학부모</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">작성 교사</th>
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
                ) : counselings.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                      조회된 상담이 없습니다.
                    </td>
                  </tr>
                ) : (
                  counselings.map((c) => {
                    const s = c.studentId || {};
                    const t = c.teacherId || {};
                    const isMine = t._id?.toString() === myId;
                    return (
                      <tr key={c._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                          {formatDate(c.date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          <div className="font-medium">{s.name || '-'}</div>
                          {/* 상담 시점 학적 (없으면 현재값으로 폴백) */}
                          {formatEnrollment(
                            c.gradeLevel ?? s.grade,
                            c.classNumber ?? s.classNumber,
                            c.studentNumber ?? s.studentNumber
                          ) && (
                            <div className="text-xs text-gray-500">
                              {formatEnrollment(
                                c.gradeLevel ?? s.grade,
                                c.classNumber ?? s.classNumber,
                                c.studentNumber ?? s.studentNumber
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-[260px] truncate">
                          {c.content}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                          {c.nextPlan || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <VisibilityBadge
                            on={c.isShared}
                            onLabel="공유"
                            offLabel="미공유"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <VisibilityBadge on={c.isVisibleToParent} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {t.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center space-x-2">
                          {isMine ? (
                            <>
                              <button
                                onClick={() => openEditModal(c)}
                                className="text-indigo-600 hover:text-indigo-800"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDelete(c._id)}
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
        <CounselingFormModal
          counseling={editingCounseling}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
