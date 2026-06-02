# 멀티테넌시 & 코드 기반 온보딩

> SCRUM-75~91. 학교(테넌트) 단위 데이터 격리 + 코드 활성화 온보딩.

## 1. 서비스 흐름

```
회사 ──register-school──▶ 학교 등록 (학교코드 SCH-xxx, 교사코드 TCH-xxx)
회사 ──issue-codes─────▶ 학생코드 N개 (STU-xxx) 발급 → 학교에 전달

사용자 ──/register──────▶ 가입 (status=pending, schoolId=null) → 기능 차단
교사   ──/activate──────▶ 교사코드 입력 → schoolId 연결 + active
학생   ──/activate──────▶ 학생코드 + 학년/반/번호 → schoolId + active (코드에 studentId 기록)
학부모 ──/activate──────▶ 자녀 학생코드 → 코드의 studentId를 parentOf 연결 + active
```

## 2. 데이터 모델

| 모델 | 테넌트 필드 | 비고 |
|---|---|---|
| `School` | (루트) | code, teacherCode, status, studentCodeQuota |
| `StudentCode` | schoolId | studentId(활성화 학생, 1회용 가드) |
| `User` | schoolId, status | status: pending\|active |
| Grade/Record/Feedback/Counseling | schoolId | 모든 운영 데이터 |
| AnalyticsStudent/Subject/Run | schoolId | 분석도 학교별 |

복합 유니크 인덱스에 schoolId 포함:
- Grade: `{schoolId, studentId, semester, subject}` unique
- AnalyticsSubject: `{schoolId, subject}` unique

## 3. 활성화 게이트

- `auth.js` JWT/세션에 `status`, `schoolId` 포함
- `middleware.js`: 로그인됐으나 `status !== 'active'` → `/activate` 리다이렉트
- 활성화 성공 후 클라이언트 `useSession().update()` → JWT 최신화 (jwt 콜백 `trigger==='update'`에서 DB 재조회)

## 4. 테넌트 격리 원칙

모든 API에서:
- **조회(GET)**: `filter.schoolId = session.user.schoolId`
- **생성(POST)**: `schoolId: session.user.schoolId` 주입
- **단일(`[id]`)**: 문서의 `schoolId !== session.schoolId` → 404 (타 학교는 없는 것처럼)
- **picker/목록**: `/api/students` 등 `schoolId + status:active` 학생만

분석:
- `aggregateStudent(studentId)`: 학생 schoolId 자동 반영
- `aggregateSubject(schoolId, subject)`, `aggregateAll(schoolId)`: 학교 스코프
- 트리거 `fireSubjectRecompute(schoolId, subject, source)`

## 5. 운영 스크립트

```powershell
# 학교 등록 (학교명, 학생코드 한도)
npm run register-school -- "인천중학교" 300

# 학생코드 발급 (학교코드, 수량)
npm run issue-codes -- SCH-AB12CD 50

# 기존(schoolId 없는) 데이터 일괄 귀속 (멀티테넌시 전환 1회)
npm run migrate-tenancy -- SCH-TEST01

# 테스트 시드 (테스트중학교 + 활성 계정 3종 + 자녀 연결)
npm run seed
```

## 6. 격리 검증 체크리스트

- [ ] A학교 교사 로그인 → 학생 picker에 B학교 학생 미노출
- [ ] A학교 교사가 B학교 성적 ID 직접 호출(`/api/grades/<b-id>`) → 404
- [ ] A학교 분석 대시보드에 B학교 데이터 미집계
- [ ] 학부모가 parentOf 외 자녀 조회 → 403
- [ ] pending 계정 로그인 → 모든 보호 경로에서 `/activate`로
- [ ] 학생코드 1회용: 동일 코드로 두 번째 학생 활성화 → 409
- [ ] 부모: 학생 미활성 코드로 연결 시도 → 409 (학생 먼저 안내)

## 7. 자동 테스트

```powershell
npm test   # crypto + gradeConstants + codeGen (코드 형식·유일성·혼동문자 제외)
```

## 8. 알려진 한계 / 향후

- **학생코드 재사용 트레이드오프**: 코드 유출 시 타인이 부모로 등록 가능. 향후 "학생 승인" 단계 보강 여지.
- **회사 콘솔 부재(MVP)**: 학교 등록·코드 발급은 스크립트. 추후 `admin` role + `/admin` 콘솔.
- **JWT 캐시**: 활성화 후 `update()` 미호출 시 다음 로그인까지 pending 유지 → UI에서 update() 보장.
