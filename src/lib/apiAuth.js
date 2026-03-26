import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

/**
 * API Route 내부에서 세션 및 role 검증
 * @param {Request} req
 * @param {string[]} allowedRoles - 허용할 role 배열 (ex. ['teacher'])
 * @returns {{ session: object } | { error: Response }} 
 */
export async function requireAuth(allowedRoles = []) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      error: Response.json({ error: '인증이 필요합니다.' }, { status: 401 }),
    };
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.user.role)) {
    return {
      error: Response.json({ error: '접근 권한이 없습니다.' }, { status: 403 }),
    };
  }

  return { session };
}