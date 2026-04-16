import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * 역할별 접근 허용 URL prefix
 */
const ROLE_ROUTES = {
  teacher: '/teacher',
  student: '/student',
  parent: '/parent',
};

/**
 * 역할별 기본 진입 페이지 (실제 존재하는 페이지)
 */
const ROLE_HOME = {
  teacher: '/teacher/grades',
  student: '/student/my-grades',
  parent: '/parent/child',
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 루트 경로 → 로그인 또는 역할별 홈
  if (pathname === '/') {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const home = ROLE_HOME[token.role] || '/login';
    return NextResponse.redirect(new URL(home, request.url));
  }

  // 보호 대상 경로인지 확인
  const protectedRole = Object.entries(ROLE_ROUTES).find(([, prefix]) =>
    pathname.startsWith(prefix)
  );

  // 보호 대상이 아닌 경로는 통과
  if (!protectedRole) {
    return NextResponse.next();
  }

  const [requiredRole] = protectedRole;

  // JWT 토큰 추출
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 미인증 → /login 리다이렉트
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 역할 불일치 → 해당 역할의 기본 경로로 리다이렉트
  if (token.role !== requiredRole) {
    const home = ROLE_HOME[token.role] || '/login';
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

// 미들웨어 적용 대상 경로 (matcher)
export const config = {
  matcher: ['/', '/teacher/:path*', '/student/:path*', '/parent/:path*'],
};