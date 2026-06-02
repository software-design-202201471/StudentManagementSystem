'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const ROLE_HOME = {
  teacher: '/teacher/grades',
  student: '/student/my-grades',
  parent: '/parent/feedback',
};

const ROLE_GUIDE = {
  teacher: '학교로부터 받은 학교(교사) 코드를 입력하세요.',
  student: '학교로부터 받은 학생 코드와 학년/반/번호를 입력하세요.',
  parent: '자녀로부터 공유받은 학생 코드를 입력하세요.',
};

export default function ActivatePage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const role = session?.user?.role;

  const [code, setCode] = useState('');
  const [grade, setGrade] = useState('');
  const [classNumber, setClassNumber] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = { code };
    if (role === 'student') {
      payload.grade = grade;
      payload.classNumber = classNumber;
      payload.studentNumber = studentNumber;
    }

    try {
      const res = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '활성화 실패');

      // JWT 최신 status 반영 후 역할별 홈으로
      await update();
      router.push(ROLE_HOME[role] || '/');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          계정 활성화
        </h1>
        <p className="text-center text-gray-500 mb-8 text-sm">
          {ROLE_GUIDE[role] || '코드를 입력해 계정을 활성화하세요.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              코드
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="예: SCH-AB12CD"
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {role === 'student' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">학년</label>
                <input
                  type="number"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">반</label>
                <input
                  type="number"
                  value={classNumber}
                  onChange={(e) => setClassNumber(e.target.value)}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">번호</label>
                <input
                  type="number"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 text-white font-medium
              rounded-md hover:bg-indigo-700 disabled:opacity-50
              disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '활성화 중...' : '활성화'}
          </button>
        </form>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
