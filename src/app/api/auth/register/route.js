import { connectDB } from '@/lib/mongoose';
import bcrypt from 'bcryptjs';
import User from '@/models/User';

export const runtime = 'nodejs';

const VALID_ROLES = ['teacher', 'student', 'parent'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register
 * 회원가입 — status='pending'으로 생성 (코드 활성화 전까지 기능 차단).
 *
 * Body: { name, email, password, role }
 */
export async function POST(request) {
  await connectDB();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: '요청 본문이 유효하지 않습니다.' },
      { status: 400 }
    );
  }

  const { name, email, password, role } = body;

  if (!name || !email || !password || !role) {
    return Response.json(
      { error: '모든 필드를 입력해주세요.' },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return Response.json(
      { error: '이메일 형식이 올바르지 않습니다.' },
      { status: 400 }
    );
  }
  if (String(password).length < 8) {
    return Response.json(
      { error: '비밀번호는 8자 이상이어야 합니다.' },
      { status: 400 }
    );
  }
  if (!VALID_ROLES.includes(role)) {
    return Response.json(
      { error: '유효하지 않은 역할입니다.' },
      { status: 400 }
    );
  }

  const exists = await User.findOne({ email });
  if (exists) {
    return Response.json(
      { error: '이미 등록된 이메일입니다.' },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await User.create({
    name,
    email,
    passwordHash,
    role,
    status: 'pending',
    schoolId: null,
  });

  return Response.json(
    {
      message: '회원가입이 완료되었습니다. 로그인 후 코드로 활성화하세요.',
    },
    { status: 201 }
  );
}
