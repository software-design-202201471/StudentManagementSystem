// scripts/restore.js
// backup.js로 생성한 JSON 백업을 DB로 복원하는 스크립트.
// - 사용: npm run restore -- backups/2026-05-21T03-00-00-000Z
// - 각 컬렉션을 deleteMany({}) 후 insertMany (전체 교체)
// - 암호화 필드는 암호문 그대로 복원됨 → 동일 ENCRYPTION_KEY 있어야 앱에서 복호화 가능
// - 위험: 대상 DB의 기존 데이터를 덮어씀. CONFIRM_RESTORE=yes 필요.
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

dotenv.config({ path: '.env.local' });

async function restore() {
  const dir = process.argv[2];
  if (!dir) {
    console.error('[restore] 사용법: npm run restore -- <백업디렉토리>');
    console.error('  예: npm run restore -- backups/2026-05-21T03-00-00-000Z');
    process.exit(1);
  }

  if (process.env.CONFIRM_RESTORE !== 'yes') {
    console.error(
      '[restore] 안전장치: 기존 데이터를 덮어씁니다. ' +
        '실행하려면 CONFIRM_RESTORE=yes 환경변수를 설정하세요.'
    );
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[restore] MONGODB_URI 환경변수가 없습니다.');
    process.exit(1);
  }

  // 백업 디렉토리의 *.json (manifest 제외) 수집
  const files = (await readdir(dir)).filter(
    (f) => f.endsWith('.json') && f !== 'manifest.json'
  );
  if (files.length === 0) {
    console.error(`[restore] ${dir} 에 복원할 컬렉션 파일이 없습니다.`);
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('[restore] DB 연결 완료');
  const db = mongoose.connection.db;

  for (const file of files) {
    const name = path.basename(file, '.json');
    const raw = await readFile(path.join(dir, file), 'utf8');
    const docs = JSON.parse(raw);

    const col = db.collection(name);
    await col.deleteMany({});
    if (docs.length > 0) {
      // _id($oid 등)는 JSON.stringify 시 문자열화됨 — 드라이버가 그대로 수용.
      // ObjectId 재변환이 필요하면 EJSON 사용 권장(여기선 단순 복원).
      await col.insertMany(docs);
    }
    console.log(`[restore] ✅ ${name}: ${docs.length} docs 복원`);
  }

  await mongoose.disconnect();
  console.log('[restore] 완료');
}

restore().catch((err) => {
  console.error('[restore] 실패:', err);
  process.exit(1);
});
