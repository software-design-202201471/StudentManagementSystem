'use client';

import { useEffect, useMemo, useState } from 'react';
import GradeFormModal from './GradeFormModal';
import GradeRadarChart from '@/components/GradeRadarChart';
import StudentPicker from '@/components/StudentPicker';
import {
  sumScores,
  averageScore,
  averagePercentage,
} from '@/lib/gradeConstants';

export default function GradesPage() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 필터
  const [filterSemester, setFilterSemester] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  // 차트용 선택된 학생 (StudentPicker가 전달하는 객체)
  const [selectedStudent, setSelectedStudent] = useState(null);
  const selectedStudentId = selectedStudent?._id || '';

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);

  async function loadGrades() {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (filterSemester) params.set('semester', filterSemester);
    if (filterSubject) params.set('subject', filterSubject);

    try {
      const res = await fetch(`/api/grades?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || '조회 실패');
      setGrades(data.grades);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 선택된 학생의 성적 (현재 조회된 성적에서 필터)
  const selectedStudentGrades = useMemo(() => {
    if (!selectedStudentId) return [];
    return grades.filter((g) => {
      const id = g.studentId?._id || g.studentId;
      return id === selectedStudentId;
    });
  }, [grades, selectedStudentId]);

  // 선택된 학생의 차트 데이터
  const chartData = useMemo(
    () =>
      selectedStudentGrades.map((g) => ({
        subject: g.subject,
        percentage: g.percentage,
      })),
    [selectedStudentGrades]
  );

  const selectedStudentName = selectedStudent?.name || '';

  function openCreateModal() {
    setEditingGrade(null);
    setModalOpen(true);
  }

  function openEditModal(grade) {
    setEditingGrade(grade);
    setModalOpen(true);
  }

  async function handleDelete(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/grades/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '삭제 실패');
      await loadGrades();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleSaved() {
    setModalOpen(false);
    loadGrades();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">성적 관리</h1>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md
              hover:bg-indigo-700 transition-colors w-full sm:w-auto"
          >
            + 성적 입력
          </button>
        </div>

        {/* 필터 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학기
            </label>
            <input
              type="text"
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              placeholder="예: 2025-1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              과목
            </label>
            <input
              type="text"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              placeholder="예: 수학"
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={loadGrades}
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

        {/* 차트 영역 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3 mb-4">
            <label className="text-sm font-medium text-gray-700 sm:pt-2 shrink-0">
              성적 차트 보기
            </label>
            <div className="flex-1 sm:max-w-md">
              <StudentPicker
                value={selectedStudentId}
                onChange={(s) => setSelectedStudent(s)}
              />
            </div>
          </div>

          {selectedStudentId ? (
            <>
              {/* 선택 학생 총점·평균 요약 */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-xs text-gray-500 mb-1">총점</div>
                  <div className="text-lg font-bold text-gray-800">
                    {sumScores(selectedStudentGrades)}점
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-xs text-gray-500 mb-1">평균 점수</div>
                  <div className="text-lg font-bold text-gray-800">
                    {averageScore(selectedStudentGrades)}점
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-xs text-gray-500 mb-1">평균 백분율</div>
                  <div className="text-lg font-bold text-indigo-600">
                    {averagePercentage(selectedStudentGrades)}%
                  </div>
                </div>
              </div>
              <GradeRadarChart
                data={chartData}
                title={`${selectedStudentName} 학생 성적`}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 bg-gray-50 rounded-lg">
              학생을 선택하면 레이더 차트가 표시됩니다.
            </div>
          )}
        </div>

        {/* 성적 테이블 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">학생</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">학기</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">당시 학년/반</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">과목</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">점수</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">백분율</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">등급</th>
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
              ) : grades.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                    등록된 성적이 없습니다.
                  </td>
                </tr>
              ) : (
                grades.map((g) => (
                  <tr key={g._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {g.studentId?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{g.semester}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {g.gradeLevel != null
                        ? `${g.gradeLevel}학년 ${g.classNumber ?? '-'}반 ${g.studentNumber ?? '-'}번`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{g.subject}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-800">
                      {g.score} / {g.totalScore}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-800">
                      {g.percentage}%
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">
                        {g.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center space-x-2">
                      <button
                        onClick={() => openEditModal(g)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(g._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
         </div>
        </div>
      </div>

      {/* 모달 */}
      {modalOpen && (
        <GradeFormModal
          grade={editingGrade}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
