import { test } from 'node:test';
import assert from 'node:assert/strict';

// 테스트용 32바이트 hex 키 (a-f는 유효 hex). crypto 모듈 import 전에 설정.
process.env.ENCRYPTION_KEY = 'a'.repeat(64);

// env 설정 후 동적 import (정적 import는 hoisting되어 순서 보장 안 됨)
const { encryptString, decryptString, isEncryptionEnabled } = await import(
  '../src/lib/crypto.js'
);

test('보안: ENCRYPTION_KEY가 있으면 암호화 활성화', () => {
  assert.equal(isEncryptionEnabled(), true);
});

test('보안: 암호화 round-trip (평문 → 암호문 → 평문)', () => {
  const plain = '민감한 상담 내용: 학생 A는...';
  const enc = encryptString(plain);
  assert.notEqual(enc, plain, '암호문은 평문과 달라야 함');
  assert.ok(enc.startsWith('enc:v1:'), 'enc:v1: prefix 포함');
  assert.equal(decryptString(enc), plain, '복호화 시 원문 복원');
});

test('보안: 동일 평문도 매번 다른 암호문 (IV 랜덤)', () => {
  const a = encryptString('같은 내용');
  const b = encryptString('같은 내용');
  assert.notEqual(a, b, 'IV가 랜덤이라 암호문이 매번 달라야 함');
  assert.equal(decryptString(a), '같은 내용');
  assert.equal(decryptString(b), '같은 내용');
});

test('보안: 이미 암호문이면 재암호화하지 않음 (멱등)', () => {
  const enc = encryptString('test');
  assert.equal(encryptString(enc), enc);
});

test('호환: prefix 없는 레거시 평문은 그대로 통과', () => {
  assert.equal(decryptString('레거시 평문 데이터'), '레거시 평문 데이터');
});

test('안전: 비문자열 입력은 그대로 반환', () => {
  assert.equal(encryptString(null), null);
  assert.equal(encryptString(undefined), undefined);
  assert.equal(decryptString(123), 123);
});

test('보안: 변조된 암호문(GCM 인증 실패)은 원본 반환 (예외 격리)', () => {
  const enc = encryptString('원본');
  // 마지막 base64 문자 변조
  const tampered = enc.slice(0, -2) + (enc.endsWith('A') ? 'B' : 'A') + '=';
  const result = decryptString(tampered);
  // 복호화 실패 시 입력 그대로 반환 (앱 크래시 방지) — 평문 '원본'은 절대 노출 안 됨
  assert.notEqual(result, '원본');
});
