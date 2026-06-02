// scripts/registerSchool.js
// 회사가 구매 학교를 등록하고 학교코드·교사코드를 발급.
// 사용: npm run register-school -- "인천중학교" 300
//   인자1: 학교명 (필수)
//   인자2: 학생코드 발급 허용 수량 (선택, 기본 0)
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import School from '../src/models/School.js';
import { generateCode } from '../src/lib/codeGen.js';

dotenv.config({ path: '.env.local' });

async function main() {
  const name = process.argv[2];
  const quota = Number(process.argv[3] || 0);

  if (!name) {
    console.error('사용법: npm run register-school -- "<학교명>" [학생코드수량]');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[register-school] MONGODB_URI 환경변수가 없습니다.');
    process.exit(1);
  }

  await mongoose.connect(uri);

  const code = generateCode(6, 'SCH');
  const teacherCode = generateCode(6, 'TCH');

  const school = await School.create({
    name,
    code,
    teacherCode,
    studentCodeQuota: Number.isFinite(quota) ? quota : 0,
  });

  console.log('[register-school] ✅ 학교 등록 완료');
  console.log(`  학교명     : ${school.name}`);
  console.log(`  학교 코드  : ${school.code}`);
  console.log(`  교사 코드  : ${school.teacherCode}  ← 교사 활성화용`);
  console.log(`  학생코드 한도: ${school.studentCodeQuota}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[register-school] 실패:', err);
  process.exit(1);
});
