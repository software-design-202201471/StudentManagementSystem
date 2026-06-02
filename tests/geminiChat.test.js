import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnonymousContext } from '../src/lib/geminiChat.js';

const DOC = {
  name: '이학생',
  email: 'student@test.com',
  grade: 2,
  classNumber: 1,
  studentNumber: 1,
  gradeCount: 3,
  averagePercentage: 78,
  subjectStats: [
    { subject: '국어', averagePercentage: 88, latestGrade: 'B+' },
    { subject: '수학', averagePercentage: 70, latestGrade: 'C' },
  ],
  semesterStats: [{ semester: '2026-1', count: 3, averagePercentage: 78 }],
  attendance: { absent: 2, late: 1, early: 0 },
  feedbackCount: 4,
  feedbackByCategory: { grade: 1, behavior: 1, attitude: 1, attendance: 1 },
  counselingCount: 2,
  lastCounselingDate: new Date('2026-05-15'),
};

test('익명 컨텍스트: 식별정보(이름/이메일/학번) 미포함', () => {
  const ctx = buildAnonymousContext(DOC);
  assert.ok(!ctx.includes('이학생'), '이름이 포함되면 안 됨');
  assert.ok(!ctx.includes('student@test.com'), '이메일이 포함되면 안 됨');
  assert.ok(!ctx.includes('1반'), '반 정보가 포함되면 안 됨');
});

test('익명 컨텍스트: 학습 지표 수치는 포함', () => {
  const ctx = buildAnonymousContext(DOC);
  assert.match(ctx, /78%/); // 전체 평균
  assert.match(ctx, /국어 88%/); // 과목별
  assert.match(ctx, /수학 70%/);
  assert.match(ctx, /결석 2/); // 출결
  assert.match(ctx, /피드백: 4건/);
  assert.match(ctx, /상담: 2건/);
});

test('익명 컨텍스트: 빈 데이터도 안전', () => {
  const ctx = buildAnonymousContext({ averagePercentage: 0, gradeCount: 0 });
  assert.match(ctx, /전체 평균: 0%/);
  assert.match(ctx, /등록 과목 수: 0/);
});
