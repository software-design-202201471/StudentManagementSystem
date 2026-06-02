// scripts/issueStudentCodes.js
// 학교 요청 수량만큼 학생 활성화 코드를 발급.
// 사용: npm run issue-codes -- SCH-ABC123 50
//   인자1: 학교 코드 (필수)
//   인자2: 발급 수량 (필수)
// 발급된 코드는 grade/classNumber/studentNumber 미지정 — 학생이 활성화 시 입력.
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import School from '../src/models/School.js';
import StudentCode from '../src/models/StudentCode.js';
import { generateCode } from '../src/lib/codeGen.js';

dotenv.config({ path: '.env.local' });

async function main() {
  const schoolCode = process.argv[2];
  const count = Number(process.argv[3]);

  if (!schoolCode || !Number.isInteger(count) || count <= 0) {
    console.error('사용법: npm run issue-codes -- <학교코드> <수량>');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[issue-codes] MONGODB_URI 환경변수가 없습니다.');
    process.exit(1);
  }

  await mongoose.connect(uri);

  const school = await School.findOne({ code: schoolCode });
  if (!school) {
    console.error(`[issue-codes] 학교를 찾을 수 없습니다: ${schoolCode}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 수량 한도 확인
  const remaining = school.studentCodeQuota - school.studentCodesIssued;
  if (count > remaining) {
    console.error(
      `[issue-codes] 발급 한도 초과: 요청 ${count}, 잔여 ${remaining} ` +
        `(한도 ${school.studentCodeQuota}, 기발급 ${school.studentCodesIssued})`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const codes = [];
  for (let i = 0; i < count; i += 1) {
    codes.push({ code: generateCode(6, 'STU'), schoolId: school._id });
  }
  await StudentCode.insertMany(codes);

  school.studentCodesIssued += count;
  await school.save();

  console.log(`[issue-codes] ✅ ${count}개 발급 (${school.name})`);
  codes.forEach((c) => console.log(`  ${c.code}`));
  console.log(
    `  누적 발급: ${school.studentCodesIssued} / ${school.studentCodeQuota}`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[issue-codes] 실패:', err);
  process.exit(1);
});
