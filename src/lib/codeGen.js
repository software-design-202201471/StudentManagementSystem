import crypto from 'node:crypto';

// 혼동되는 문자(0/O, 1/I/L) 제외한 base32 유사 알파벳
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * 사람이 읽기 쉬운 랜덤 코드 생성.
 * @param {number} len - 본문 길이 (기본 6)
 * @param {string} prefix - 접두사 (예: 'SCH', 'STU'). 결과: PREFIX-XXXXXX
 */
export function generateCode(len = 6, prefix = '') {
  let body = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i += 1) {
    body += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return prefix ? `${prefix}-${body}` : body;
}
