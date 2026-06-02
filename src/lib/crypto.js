import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

let cachedKey;
let keyChecked = false;

/**
 * ENCRYPTION_KEY 환경변수에서 32바이트 키를 로드.
 * - hex(64 chars) 또는 base64(보통 44 chars) 자동 감지
 * - 키가 없거나 형식 불일치면 null → 호출자가 graceful skip
 */
function getKey() {
  if (keyChecked) return cachedKey;
  keyChecked = true;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    cachedKey = null;
    return null;
  }
  try {
    let buf;
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      buf = Buffer.from(raw, 'hex');
    } else {
      buf = Buffer.from(raw, 'base64');
    }
    if (buf.length !== 32) {
      // eslint-disable-next-line no-console
      console.warn(
        '[crypto] ENCRYPTION_KEY length is not 32 bytes; encryption disabled.'
      );
      cachedKey = null;
      return null;
    }
    cachedKey = buf;
    return buf;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[crypto] ENCRYPTION_KEY parse failed:', err.message);
    cachedKey = null;
    return null;
  }
}

export function isEncryptionEnabled() {
  return !!getKey();
}

const BLIND_INDEX_LABEL = 'email-blind-index:v1';

/**
 * 이메일 blind index 생성 — 암호화된 email을 조회/유니크 검사하기 위한
 * 결정적(deterministic) HMAC-SHA256 해시.
 * - 입력을 trim + 소문자 정규화하여 대소문자 무관 유니크 보장
 * - 암호화 키에서 별도 HMAC 키를 파생해 용도 분리(AES 키와 직접 재사용 회피)
 * - 키 미설정 시 정규화 평문을 그대로 반환 (graceful — 키 없으면 평문 인덱스)
 * @param {string} email
 * @returns {string}
 */
export function emailHash(email) {
  if (typeof email !== 'string') return email;
  const norm = email.trim().toLowerCase();
  const key = getKey();
  if (!key) return norm;
  const hmacKey = crypto
    .createHash('sha256')
    .update(Buffer.concat([key, Buffer.from(BLIND_INDEX_LABEL)]))
    .digest();
  return crypto.createHmac('sha256', hmacKey).update(norm).digest('hex');
}

/**
 * 문자열을 AES-256-GCM으로 암호화.
 * 키 없으면 입력 그대로 반환 (graceful skip).
 * 이미 암호문(prefix 일치)이면 재암호화하지 않음.
 */
export function encryptString(plaintext) {
  if (typeof plaintext !== 'string') return plaintext;
  if (plaintext.startsWith(PREFIX)) return plaintext;
  const key = getKey();
  if (!key) return plaintext;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

/**
 * 암호문 복호화. prefix 없으면 평문으로 간주 그대로 반환 (기존 데이터 호환).
 * 키 없거나 복호화 실패 시 입력 그대로 반환.
 */
export function decryptString(value) {
  if (typeof value !== 'string') return value;
  if (!value.startsWith(PREFIX)) return value;
  const key = getKey();
  if (!key) return value;

  try {
    const body = value.slice(PREFIX.length);
    const [ivB64, tagB64, ctB64] = body.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const ct = Buffer.from(ctB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString('utf8');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[crypto] decrypt failed:', err.message);
    return value;
  }
}

/**
 * findOneAndUpdate 등에서 사용되는 update 객체의 지정 필드를 암호화.
 * mongoose가 raw update 또는 $set 안에 필드를 둘 수 있어 둘 다 처리.
 */
export function encryptUpdateFields(update, fields) {
  if (!update || typeof update !== 'object') return;
  for (const f of fields) {
    if (typeof update[f] === 'string') {
      update[f] = encryptString(update[f]);
    }
    if (update.$set && typeof update.$set[f] === 'string') {
      update.$set[f] = encryptString(update.$set[f]);
    }
  }
}
