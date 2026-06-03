// scripts/promote.js
// 진급 처리 — 활성 학생의 현재 학년(User.grade)을 1 올린다(연말 진급).
//
// 핵심: 과거 성적·상담에 저장된 학년/반/번호 스냅샷(gradeLevel/classNumber/
// studentNumber)은 그대로 보존되고, 진급 이후 생성되는 레코드는 새 학년으로
// 스냅샷된다. 즉 학생 계정은 그대로지만 학년이 바뀌는 상황을 정확히 반영.
//
// grade는 평문 숫자 필드이므로 native updateMany로 안전하게 일괄 처리한다.
// 안전장치: CONFIRM_PROMOTE=yes 필요. (반/번호 재배정은 학교 정책상 별도 처리)
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function promote() {
  if (process.env.CONFIRM_PROMOTE !== 'yes') {
    // eslint-disable-next-line no-console
    console.log(
      '안전장치: 실행하려면 CONFIRM_PROMOTE=yes 환경변수를 설정하세요.\n' +
      '  bash : CONFIRM_PROMOTE=yes npm run promote\n' +
      "  PowerShell : $env:CONFIRM_PROMOTE='yes'; npm run promote"
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.db.collection('users');

  const res = await users.updateMany(
    { role: 'student' },
    { $inc: { grade: 1 } }
  );

  // eslint-disable-next-line no-console
  console.log(`✅ 학생 ${res.modifiedCount}명 진급 처리 (현재 학년 +1)`);
  // eslint-disable-next-line no-console
  console.log(
    '※ 반/번호 재배정은 학교 운영 정책에 따라 별도 처리하세요.\n' +
    '※ 과거 성적·상담의 당시 학적 스냅샷은 변경되지 않습니다.'
  );

  await mongoose.disconnect();
}

promote().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
