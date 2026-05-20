'use client';

import { useState } from 'react';
import StudentPicker from '@/components/StudentPicker';

function buildReportUrl(format, studentId, semester) {
  const params = new URLSearchParams();
  params.set('studentId', studentId);
  if (semester.trim()) params.set('semester', semester.trim());
  return `/api/reports/${format}?${params.toString()}`;
}

export default function ReportsPage() {
  const [studentId, setStudentId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [semester, setSemester] = useState('');

  function handlePickerChange(student) {
    setStudentId(student?._id || '');
    setSelectedStudent(student || null);
  }

  const ready = !!studentId;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">보고서 다운로드</h1>
          <p className="text-sm text-gray-500 mt-1">
            학생의 성적 보고서를 PDF 또는 Excel로 다운로드합니다.
          </p>
        </div>

        {/* 학생 + 학기 선택 */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm mb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학생
            </label>
            <StudentPicker
              value={studentId}
              onChange={handlePickerChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학기 (선택)
            </label>
            <input
              type="text"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="예: 2025-1 (비우면 전체 학기)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* 다운로드 버튼 */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={ready ? buildReportUrl('pdf', studentId, semester) : '#'}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!ready}
              onClick={(e) => {
                if (!ready) e.preventDefault();
              }}
              className={`flex-1 px-4 py-3 rounded-md text-center font-medium
                ${
                  ready
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
              📄 PDF 다운로드
            </a>
            <a
              href={ready ? buildReportUrl('excel', studentId, semester) : '#'}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!ready}
              onClick={(e) => {
                if (!ready) e.preventDefault();
              }}
              className={`flex-1 px-4 py-3 rounded-md text-center font-medium
                ${
                  ready
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
              📊 Excel 다운로드
            </a>
          </div>

          {!ready && (
            <p className="mt-3 text-xs text-gray-400 text-center">
              학생을 선택하면 다운로드 버튼이 활성화됩니다.
            </p>
          )}

          {ready && selectedStudent && (
            <p className="mt-3 text-xs text-gray-500 text-center">
              대상: <strong>{selectedStudent.name}</strong>
              {semester.trim() && (
                <>
                  {' · '}학기: <strong>{semester.trim()}</strong>
                </>
              )}
            </p>
          )}
        </div>

        {/* 안내 */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg
          text-xs text-amber-800 space-y-1">
          <p className="font-medium">참고 사항</p>
          <ul className="list-disc list-inside space-y-1">
            <li>PDF의 한글이 깨져 보이면 <code>public/fonts/NotoSansKR-Regular.ttf</code>
              파일을 추가해야 합니다.</li>
            <li>Excel은 별도 폰트 설정 없이 한글 정상 표시됩니다.</li>
            <li>학기를 비우면 등록된 모든 학기의 성적이 포함됩니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
