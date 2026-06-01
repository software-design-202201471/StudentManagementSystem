# 테스트 가이드

> 관련 요구사항: 명세 6절 검증 기준 (기능·보안·성능 테스트)
> 관련 SCRUM: SCRUM-66(보안), SCRUM-67(성능)

---

## 1. 단위·보안 테스트 (Node 내장 test runner)

추가 의존성 없이 Node 20+ 내장 `node:test`로 실행.

```powershell
npm test
```

### 커버리지

| 파일 | 검증 내용 | 명세 |
|---|---|---|
| `tests/crypto.test.js` | AES-256-GCM 암호화 round-trip, IV 랜덤성, 멱등성, 변조 암호문 격리, 평문 호환 | S.1 데이터 보안 |
| `tests/gradeConstants.test.js` | 등급 경계값, 백분율 환산·반올림, 전 구간 매핑 누락 없음 | 1.2 자동 계산 정확성 |

보안 핵심 검증:
- 암호문은 평문과 항상 다름 (실제 암호화 동작)
- 동일 평문도 매번 다른 암호문 (IV 랜덤 → 패턴 분석 방어)
- 변조된 암호문은 GCM 인증 실패로 원문 평문 미노출
- 복호화 실패 시 앱 크래시 없이 격리

### 신규 테스트 추가
`tests/<name>.test.js` 작성 후 `package.json`의 `test` 스크립트 파일 목록에 추가.
(Node 24의 `--test <dir>` 디렉토리 인자가 불안정해 명시적 파일 목록 사용)

---

## 2. 권한·접근 제어 검증 (수동 / 통합)

API route 통합 테스트는 Next.js 런타임 + MongoDB가 필요해 별도 환경에서 수행.
현재는 수동 검증 + 코드 리뷰 수준:

- 학생 계정 → 타 학생 성적 API 호출 시 403/필터링 확인
- 학부모 계정 → `parentOf` 미포함 자녀 조회 시 403
- 비교사 → POST/PATCH/DELETE 차단
- 미인증 → `/teacher/*` 접근 시 `/login` 리다이렉트 (middleware)

> 향후 개선: `@/lib/apiAuth`, route handler를 `node:test` + MongoDB Memory Server로
> 통합 테스트화 가능 (별도 task).

---

## 3. 성능·부하 테스트 (k6)

명세 P.1 "다수 교사 동시 접속 시 원활 동작" 검증.

### 설치
[k6 공식 설치 가이드](https://k6.io/docs/get-started/installation/)
(Windows: `winget install k6` 또는 `choco install k6`)

### 세션 쿠키 확보
1. 브라우저에서 교사 로그인
2. DevTools → Application → Cookies → `next-auth.session-token` 값 복사

### 실행
```powershell
k6 run -e BASE_URL=https://<배포주소> -e COOKIE="<세션토큰>" tests/load/grades-load.js
```

### 시나리오 (`tests/load/grades-load.js`)
- VU(가상 사용자) 20 → 50까지 점진 증가, 각 단계 유지
- 교사 주요 조회 경로 4종 부하: 성적/피드백/상담/분석 overview

### 합격 기준 (thresholds)
| 지표 | 기준 |
|---|---|
| `http_req_duration` p(95) | < 1500ms |
| `http_req_failed` rate | < 1% |

기준 미달 시 k6가 exit code 1로 실패 → CI 통합 가능.

> 주의: Vercel serverless cold start로 첫 요청이 느릴 수 있음. warm-up 후 측정 권장.
> Atlas connection pool·M0 무료 티어 한계가 병목일 수 있으니 티어별로 재측정.

---

## 4. 검증 기준 매핑 (명세 6절)

| 명세 검증 기준 | 수단 | 상태 |
|---|---|---|
| 기능 테스트 | `npm test`(단위) + 수동 E2E | ✅ 단위 자동화 / E2E 수동 |
| 보안 테스트 | `tests/crypto.test.js` + 권한 수동 검증 | ✅ 암호화 자동화 / 권한 수동 |
| 성능 테스트 | `tests/load/grades-load.js` (k6) | ✅ 스크립트 제공 (실행은 k6 설치 후) |
