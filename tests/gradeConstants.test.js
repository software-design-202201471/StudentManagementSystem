import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateGrade, GRADE_SCALE } from '../src/lib/gradeConstants.js';

test('등급: A+ 경계 (95% 이상)', () => {
  assert.equal(calculateGrade(95, 100).grade, 'A+');
  assert.equal(calculateGrade(100, 100).grade, 'A+');
});

test('등급: A (90~94%)', () => {
  assert.equal(calculateGrade(90, 100).grade, 'A');
  assert.equal(calculateGrade(94, 100).grade, 'A');
});

test('등급: F (60% 미만)', () => {
  assert.equal(calculateGrade(59, 100).grade, 'F');
  assert.equal(calculateGrade(0, 100).grade, 'F');
});

test('백분율: 만점 다를 때 정확히 환산', () => {
  const r = calculateGrade(45, 50);
  assert.equal(r.percentage, 90);
  assert.equal(r.grade, 'A');
});

test('백분율: 반올림 처리', () => {
  // 1/3 = 33.33 → 33
  assert.equal(calculateGrade(1, 3).percentage, 33);
});

test('GRADE_SCALE: 내림차순 정렬되어 있어 find가 항상 매칭', () => {
  for (let i = 1; i < GRADE_SCALE.length; i += 1) {
    assert.ok(
      GRADE_SCALE[i - 1].min > GRADE_SCALE[i].min,
      'min 값이 내림차순이어야 함'
    );
  }
  // 가장 낮은 경계가 0이어야 모든 점수 매칭
  assert.equal(GRADE_SCALE[GRADE_SCALE.length - 1].min, 0);
});

test('경계: 모든 0~100 백분율이 등급에 매핑됨 (누락 없음)', () => {
  for (let p = 0; p <= 100; p += 1) {
    const { grade } = calculateGrade(p, 100);
    assert.ok(typeof grade === 'string' && grade.length > 0, `${p}% 매핑 실패`);
  }
});
