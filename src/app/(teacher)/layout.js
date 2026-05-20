'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const NAV_ITEMS = [
  { href: '/teacher/grades', label: '성적', enabled: true },
  { href: '/teacher/records', label: '학생부', enabled: true },
  { href: '/teacher/feedback', label: '피드백', enabled: true },
  { href: '/teacher/counseling', label: '상담', enabled: true },
  { href: '/teacher/reports', label: '보고서', enabled: true },
];

function NavList({ onItemClick }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        if (!item.enabled) {
          return (
            <div
              key={item.href}
              title="준비 중"
              className="flex items-center justify-between px-3 py-2 text-sm
                text-gray-400 cursor-not-allowed rounded-md select-none"
            >
              <span>{item.label}</span>
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">
                준비 중
              </span>
            </div>
          );
        }
        const active =
          pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={`block px-3 py-2 text-sm rounded-md transition-colors ${
              active
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ onItemClick }) {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-gray-200">
        <Link
          href="/teacher/grades"
          onClick={onItemClick}
          className="text-lg font-bold text-indigo-700"
        >
          교사용 콘솔
        </Link>
      </div>

      <NavList onItemClick={onItemClick} />

      <div className="border-t border-gray-200 p-4">
        {session?.user && (
          <div className="mb-3 text-sm">
            <div className="font-medium text-gray-800 truncate">
              {session.user.name}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {session.user.email}
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300
            rounded-md hover:bg-gray-50"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}

export default function TeacherLayout({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* 데스크톱 사이드바 */}
      <aside
        className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0
          bg-white border-r border-gray-200"
      >
        <SidebarContent />
      </aside>

      {/* 모바일 드로어 */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r
              border-gray-200 md:hidden shadow-xl"
          >
            <SidebarContent onItemClick={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      {/* 본문 영역 */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-60">
        <header
          className="md:hidden sticky top-0 z-30 flex items-center gap-3
            px-4 py-3 bg-white border-b border-gray-200"
        >
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="메뉴 열기"
            className="p-1 text-gray-700 hover:text-gray-900"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <span className="text-base font-semibold text-gray-800">
            교사용 콘솔
          </span>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
