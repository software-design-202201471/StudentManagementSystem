'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * 학번 디지털 입력값을 "G/CC/NN" 형태로 표시용 포맷
 * 1: G, 2: G/N, 3: G/CC, 4: G/CC/N, 5: G/CC/NN
 */
function formatStudentCode(digits) {
  if (!digits) return '';
  if (digits.length === 1) return digits;
  if (digits.length === 2) return `${digits[0]}/${digits[1]}`;
  if (digits.length === 3) return `${digits[0]}/${digits.slice(1, 3)}`;
  if (digits.length === 4) {
    return `${digits[0]}/${digits.slice(1, 3)}/${digits[3]}`;
  }
  return `${digits[0]}/${digits.slice(1, 3)}/${digits.slice(3, 5)}`;
}

/**
 * 학생 객체 → "GCCNN" (zero-pad) 인코딩.
 * 학년/반/번호 중 하나라도 없으면 빈 문자열.
 */
function encodeStudent(s) {
  if (!s?.grade || !s?.classNumber || !s?.studentNumber) return '';
  const g = String(s.grade);
  const c = String(s.classNumber).padStart(2, '0');
  const n = String(s.studentNumber).padStart(2, '0');
  return `${g}${c}${n}`;
}

function studentLabel(s) {
  if (!s) return '';
  const parts = [];
  if (s.grade) parts.push(`${s.grade}학년`);
  if (s.classNumber) parts.push(`${s.classNumber}반`);
  if (s.studentNumber) parts.push(`${s.studentNumber}번`);
  return parts.length ? parts.join(' ') : '학년/반/번호 미등록';
}

/**
 * 학번 기반 학생 검색·선택 컴포넌트
 *
 * @param {object} props
 * @param {string} props.value - 선택된 학생 _id (controlled)
 * @param {(student: object|null) => void} props.onChange
 * @param {boolean} [props.disabled=false] - 변경 불가(수정 모드)
 * @param {object} [props.disabledStudent] - disabled 모드에서 표시할 학생(populate된 객체)
 */
export default function StudentPicker({
  value,
  onChange,
  disabled = false,
  disabledStudent,
}) {
  const [students, setStudents] = useState([]);
  // disabled가 아닐 때만 fetch가 발생하므로 초기 loading은 그에 맞춰 설정
  const [loading, setLoading] = useState(!disabled);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (disabled) return;
    let cancelled = false;
    fetch('/api/students')
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) throw new Error(d.error || '학생 목록 조회 실패');
        setStudents(d.students || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [disabled]);

  const filtered = useMemo(() => {
    if (!code) return students;
    return students.filter((s) => {
      const c = encodeStudent(s);
      return c && c.startsWith(code);
    });
  }, [students, code]);

  const selected = useMemo(
    () => students.find((s) => s._id === value),
    [students, value]
  );

  function handleCodeChange(e) {
    const v = e.target.value.replace(/\D/g, '').slice(0, 5);
    setCode(v);
  }

  function selectStudent(s) {
    onChange(s);
    setCode(encodeStudent(s));
  }

  function clearSelection() {
    onChange(null);
    setCode('');
  }

  if (disabled) {
    const hasClassInfo =
      disabledStudent &&
      (disabledStudent.grade ||
        disabledStudent.classNumber ||
        disabledStudent.studentNumber);
    return (
      <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-700">
        <span>{disabledStudent?.name || '-'}</span>
        {hasClassInfo && (
          <span className="ml-2 text-xs text-gray-500">
            {studentLabel(disabledStudent)}
          </span>
        )}
        <span className="ml-2 text-xs text-gray-500">
          학생은 수정할 수 없습니다.
        </span>
      </div>
    );
  }

  if (selected) {
    return (
      <div
        className="flex items-center justify-between gap-2 px-3 py-2
          bg-indigo-50 border border-indigo-200 rounded-md"
      >
        <div className="text-sm min-w-0">
          <div className="font-medium text-indigo-800 truncate">
            {selected.name}
          </div>
          <div className="text-xs text-indigo-600">{studentLabel(selected)}</div>
        </div>
        <button
          type="button"
          onClick={clearSelection}
          className="text-xs text-indigo-700 hover:text-indigo-900 underline shrink-0"
        >
          변경
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        value={formatStudentCode(code)}
        onChange={handleCodeChange}
        placeholder="학번 (예: 20315 = 2학년 3반 15번)"
        className="w-full px-3 py-2 border border-gray-300 rounded-md
          focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <p className="mt-1 text-xs text-gray-400">
        숫자 입력 시 학년/반/번호 순으로 자동 분리. 1자리=학년, 3자리=학년/반, 5자리=학년/반/번호
      </p>

      <div
        className="mt-2 max-h-48 overflow-y-auto border border-gray-200
          rounded-md divide-y divide-gray-100"
      >
        {loading ? (
          <div className="px-3 py-3 text-sm text-gray-400 text-center">
            불러오는 중...
          </div>
        ) : error ? (
          <div className="px-3 py-3 text-sm text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-3 text-sm text-gray-400 text-center">
            검색 결과가 없습니다.
          </div>
        ) : (
          filtered.map((s) => (
            <button
              key={s._id}
              type="button"
              onClick={() => selectStudent(s)}
              className="w-full flex items-center justify-between gap-2
                px-3 py-2 text-sm hover:bg-indigo-50 text-left"
            >
              <span className="text-gray-800 font-medium truncate">
                {s.name}
              </span>
              <span className="text-xs text-gray-500 shrink-0">
                {studentLabel(s)}
              </span>
            </button>
          ))
        )}
      </div>
    </>
  );
}
