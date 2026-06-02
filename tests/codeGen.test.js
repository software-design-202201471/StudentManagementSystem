import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateCode } from '../src/lib/codeGen.js';

test('코드: prefix 형식 (PREFIX-XXXXXX)', () => {
  assert.match(generateCode(6, 'SCH'), /^SCH-[A-Z2-9]{6}$/);
  assert.match(generateCode(6, 'STU'), /^STU-[A-Z2-9]{6}$/);
});

test('코드: prefix 없으면 본문만', () => {
  assert.match(generateCode(8), /^[A-Z2-9]{8}$/);
});

test('보안: 혼동 문자(0,1,O,I,L) 제외', () => {
  const c = generateCode(200);
  assert.ok(!/[01OIL]/.test(c), '혼동 문자가 포함되면 안 됨');
});

test('유일성: 1000개 생성 시 중복 거의 없음', () => {
  const set = new Set();
  for (let i = 0; i < 1000; i += 1) set.add(generateCode(6, 'STU'));
  // 30^6 공간에서 1000개 → 충돌 확률 극히 낮음
  assert.ok(set.size >= 995, `유일성 부족: ${set.size}/1000`);
});
