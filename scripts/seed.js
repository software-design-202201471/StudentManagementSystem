// scripts/seed.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// 모델 직접 정의 (scripts 폴더는 app 외부라 @/ alias 미적용)
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: String,
  parentOf: [mongoose.Schema.Types.ObjectId],
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const users = [
  { name: '김교사', email: 'teacher@test.com', password: process.env.PW, role: 'teacher' },
  { name: '이학생', email: 'student@test.com', password: process.env.PW, role: 'student' },
  { name: '박학부모', email: 'parent@test.com',  password: process.env.PW, role: 'parent' },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('DB 연결 완료');

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await User.findOneAndUpdate(
      { email: u.email },
      { name: u.name, email: u.email, passwordHash, role: u.role },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`✅ ${u.role} 계정 생성: ${u.email}`);
  }

  await mongoose.disconnect();
  console.log('시드 완료');
}

seed().catch(console.error);