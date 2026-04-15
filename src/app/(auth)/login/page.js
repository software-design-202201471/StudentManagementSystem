'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 역할별 기본 경로
  const ROLE_HOME = {
    teacher: '/teacher/grades',
    student: '/student/my-grades',
    parent: '/parent/child',
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        setLoading(false);
        return;
      }

      // 로그인 성공 → 세션에서 role을 가져와 적절한 페이지로 이동
      const res = await fetch('/api/auth/session');
      const session = await res.json();
      const role = session?.user?.role;

      const destination = callbackUrl || ROLE_HOME[role] || '/';
      router.push(destination);
      router.refresh();
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          학생 관리 시스템
        </h1>
        <p className="text-center text-gray-500 mb-8">
          로그인하여 시작하세요
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@school.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-500
                focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="비밀번호를 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-500
                focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white font-medium
              rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2
              focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50
              disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
