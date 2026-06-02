import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answerQuestion } from '../src/lib/studentChatbot.js';

const DOC = {
  name: '이학생',
  gradeCount: 3,
  averagePercentage: 78,
  subjectStats: [
    { subject: '국어', averagePercentage: 88, latestGrade: 'B+' },
    { subject: '영어', averagePercentage: 76, latestGrade: 'C+' },
    { subject: '수학', averagePercentage: 70, latestGrade: 'C' },
  ],
  semesterStats: [{ semester: '2026-1', count: 3, averagePercentage: 78 }],
  attendance: { absent: 2, late: 1, early: 0 },
  feedbackCount: 4,
  feedbackByCategory: { grade: 1, behavior: 1, attitude: 1, attendance: 1 },
  counselingCount: 2,
  lastCounselingDate: new Date('2026-05-15'),
};

test('약점 질문 → 최저 평균 과목(수학) 포함', () => {
  const r = answerQuestion(DOC, '약점 과목 알려줘');
  assert.match(r, /수학/);
  assert.match(r, /70%/);
});

test('강점 질문 → 최고 평균 과목(국어) 포함', () => {
  const r = answerQuestion(DOC, '강점 과목은?');
  assert.match(r, /국어/);
  assert.match(r, /88%/);
});

test('출결 질문 → 결석/지각 수치', () => {
  const r = answerQuestion(DOC, '출결 어때?');
  assert.match(r, /결석 2회/);
  assert.match(r, /지각 1회/);
});

test('상담 질문 → 건수 + 최근일', () => {
  const r = answerQuestion(DOC, '최근 상담 있었어?');
  assert.match(r, /2건/);
  assert.match(r, /2026-05-15/);
});

test('피드백 질문 → 건수 포함', () => {
  const r = answerQuestion(DOC, '피드백 현황');
  assert.match(r, /4건/);
});

test('추세 질문 → 학기 평균', () => {
  const r = answerQuestion(DOC, '학기별 추세');
  assert.match(r, /2026-1/);
  assert.match(r, /78%/);
});

test('종합 요약 → 평균·과목수 포함', () => {
  const r = answerQuestion(DOC, '이 학생 어때?');
  assert.match(r, /78%/);
  assert.match(r, /3개 과목/);
});

test('성적 0 학생 → graceful 요약', () => {
  const empty = {
    name: '신입생', gradeCount: 0, averagePercentage: 0,
    subjectStats: [], feedbackCount: 0, counselingCount: 0,
  };
  const r = answerQuestion(empty, '요약');
  assert.match(r, /등록된 성적이 없습니다/);
});

test('doc 없음 → 재집계 안내', () => {
  assert.match(answerQuestion(null, '요약'), /분석 데이터가 없습니다/);
});

test('빈 질문 → 도움말', () => {
  assert.match(answerQuestion(DOC, ''), /질문해 보세요/);
});
