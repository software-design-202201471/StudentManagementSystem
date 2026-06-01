// scripts/backup.js
// MongoDB 전체 컬렉션을 JSON으로 덤프하는 백업 스크립트.
// - mongodump 등 외부 도구 불필요 (순수 Node + mongoose 드라이버)
// - db.collection().find() 로 raw BSON 직접 읽음 → 암호화 필드는 암호문 그대로
//   백업됨(복원 시 동일 ENCRYPTION_KEY로 복호화, 평문 유출 방지)
// - 실행: npm run backup
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

dotenv.config({ path: '.env.local' });

// 백업 대상 컬렉션 (운영 + 분석)
const COLLECTIONS = [
  'users',
  'grades',
  'records',
  'feedbacks',
  'counselings',
  'analytics_students',
  'analytics_subjects',
  'analytics_runs',
];

async function backup() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[backup] MONGODB_URI 환경변수가 없습니다.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('[backup] DB 연결 완료');

  const db = mongoose.connection.db;

  // 타임스탬프 디렉토리 (예: backups/2026-05-21T03-00-00-000Z)
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join('backups', ts);
  await mkdir(dir, { recursive: true });

  const manifest = {
    createdAt: new Date().toISOString(),
    database: db.databaseName,
    collections: {},
  };

  for (const name of COLLECTIONS) {
    try {
      const docs = await db.collection(name).find({}).toArray();
      await writeFile(
        path.join(dir, `${name}.json`),
        JSON.stringify(docs, null, 2)
      );
      manifest.collections[name] = docs.length;
      console.log(`[backup] ✅ ${name}: ${docs.length} docs`);
    } catch (err) {
      // 컬렉션이 아직 없으면(분석 미실행 등) 0건으로 기록하고 계속
      manifest.collections[name] = 0;
      console.warn(`[backup] ⚠️ ${name} 건너뜀: ${err.message}`);
    }
  }

  await writeFile(
    path.join(dir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  await mongoose.disconnect();
  console.log(`[backup] 완료 → ${dir}`);
}

backup().catch((err) => {
  console.error('[backup] 실패:', err);
  process.exit(1);
});
