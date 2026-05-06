'use client';

import { useEffect, useState } from 'react';
import RecordFormModal from './RecordFormModal';

export default function RecordsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  async function loadRecords() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/records');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setRecords(data.records);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  function openCreateModal() {
    setEditingRecord(null);
    setModalOpen(true);
  }

  function openEditModal(record) {
    setEditingRecord(record);
    setModalOpen(true);
  }

  function handleSaved() {
    setModalOpen(false);
    loadRecords();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">학생부 관리</h1>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md
              hover:bg-indigo-700 transition-colors w-full sm:w-auto"
          >
            + 학생부 작성
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
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">학생</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">학년/반/번호</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">결석</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">지각</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">조퇴</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">특이사항</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">항목</th>
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
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                      등록된 학생부가 없습니다.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const s = r.studentId || {};
                    const cls =
                      s.grade || s.classNumber || s.studentNumber
                        ? `${s.grade ?? '-'} / ${s.classNumber ?? '-'} / ${s.studentNumber ?? '-'}`
                        : '-';
                    return (
                      <tr key={r._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {s.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{cls}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-800">
                          {r.attendance?.absent ?? 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-800">
                          {r.attendance?.late ?? 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-800">
                          {r.attendance?.early ?? 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-[240px] truncate">
                          {r.specialNotes || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">
                            {r.customFields?.length ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <button
                            onClick={() => openEditModal(r)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            수정
                          </button>
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

      {/* 모달 */}
      {modalOpen && (
        <RecordFormModal
          record={editingRecord}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
