// scripts/migrateTenancy.js
// 멀티테넌시 전환 시 기존(schoolId 없는) 데이터를 기본 학교에 일괄 할당.
// 사용: npm run migrate-tenancy -- SCH-TEST01
//   인자1: 기존 데이터를 귀속시킬 학교 코드 (필수)
// - schoolId 없는 User → 해당 학교 + status active
// - schoolId 없는 Grade/Record/Feedback/Counseling → 해당 학교
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const COLLECTIONS = ['grades', 'records', 'feedbacks', 'counselings'];

async function main() {
  const schoolCode = process.argv[2];
  if (!schoolCode) {
    console.error('사용법: npm run migrate-tenancy -- <학교코드>');
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[migrate] MONGODB_URI 환경변수가 없습니다.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const school = await db.collection('schools').findOne({ code: schoolCode });
  if (!school) {
    console.error(`[migrate] 학교를 찾을 수 없습니다: ${schoolCode}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 사용자: schoolId 없으면 할당 + active
  const ur = await db.collection('users').updateMany(
    { schoolId: { $in: [null, undefined] } },
    { $set: { schoolId: school._id, status: 'active' } }
  );
  console.log(`[migrate] users: ${ur.modifiedCount}건 갱신`);

  // 운영 데이터: schoolId 없으면 할당
  for (const name of COLLECTIONS) {
    const r = await db
      .collection(name)
      .updateMany(
        { schoolId: { $in: [null, undefined] } },
        { $set: { schoolId: school._id } }
      );
    console.log(`[migrate] ${name}: ${r.modifiedCount}건 갱신`);
  }

  console.log(`[migrate] 완료 → ${school.name} (${school.code})`);
  console.log('  분석 데이터는 대시보드에서 "지금 재집계"로 재생성하세요.');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[migrate] 실패:', err);
  process.exit(1);
});
