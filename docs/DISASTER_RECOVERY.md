# 장애 복구 절차 (Disaster Recovery)

> 관련 요구사항: 명세 B.1 "정기 백업", B.2 "장애 시 데이터 복구"
> 관련 SCRUM: SCRUM-64(백업), SCRUM-65(복구)

---

## 1. 백업 전략 요약

| 계층 | 방식 | 주기 | 보관 |
|---|---|---|---|
| **Atlas 자동 스냅샷** | MongoDB Atlas Cloud Backup (continuous / snapshot) | Atlas 정책(기본 6h~daily) | Atlas 정책 |
| **애플리케이션 백업** | `scripts/backup.js` → JSON 덤프 → GitHub Actions Artifact | 매일 03:00 KST (`.github/workflows/backup.yml`) | 30일 |

이중화: Atlas 인프라 장애 시 애플리케이션 백업으로, 애플리케이션 실수(잘못된 대량 삭제) 시 Atlas PITR로 상호 보완.

## 2. 복구 목표

| 지표 | 목표 | 근거 |
|---|---|---|
| **RPO** (복구 시점 목표) | ≤ 24시간 | 일일 백업 기준. Atlas PITR 사용 시 분 단위 |
| **RTO** (복구 소요 목표) | ≤ 1시간 | JSON 복원 + 검증 시간 |

## 3. 복구 시나리오

### 시나리오 A — 애플리케이션 실수 (잘못된 삭제/수정)
**권장: Atlas Point-in-Time Recovery (PITR)**
1. Atlas 콘솔 → 클러스터 → **Backup** 탭
2. **Restore** → 시점 선택(문제 발생 직전) → 새 클러스터 또는 동일 클러스터로 복원
3. 앱 `MONGODB_URI`를 복원된 클러스터로 교체(필요 시)
4. 검증(아래 5절)

### 시나리오 B — Atlas 장애 / 클러스터 손실
**애플리케이션 JSON 백업으로 복원**
1. GitHub Actions → `DB Backup` 워크플로우 → 최신 성공 run → Artifact(`mongodb-backup-<run_id>`) 다운로드
2. 압축 해제 → `backups/<타임스탬프>/` 확보
3. 신규 Atlas 클러스터 생성(또는 임시 DB), 연결 문자열 확보
4. 복원 실행:
   ```powershell
   $env:MONGODB_URI = "<신규 클러스터 URI>"
   $env:CONFIRM_RESTORE = "yes"
   npm run restore -- backups/2026-05-21T03-00-00-000Z
   ```
5. 검증(5절)

### 시나리오 C — 로컬 개발 DB 초기화
```powershell
$env:CONFIRM_RESTORE = "yes"
npm run restore -- backups/<최근>
```
또는 시드만: `npm run seed`

## 4. 복원 스크립트 동작 (`scripts/restore.js`)

- 인자로 백업 디렉토리 받음: `npm run restore -- <dir>`
- 안전장치: `CONFIRM_RESTORE=yes` 없으면 거부 (기존 데이터 덮어쓰기 방지)
- 각 컬렉션 `deleteMany({})` 후 `insertMany(docs)` — **전체 교체**
- **암호화 필드 주의**: 백업은 암호문 그대로 저장됨. 복원 후 앱에서 복호화하려면
  **백업 시점과 동일한 `ENCRYPTION_KEY`** 가 `.env.local`/Vercel에 있어야 함.
  키 분실 시 피드백/상담 본문은 복호화 불가 → **키는 별도 안전 보관 필수**.
- 한계: `_id`는 JSON 직렬화로 문자열화될 수 있음. 정밀 복원이 필요하면 EJSON 기반 복원
  또는 `mongorestore`(Atlas 스냅샷) 사용 권장.

## 5. 복원 검증 체크리스트

- [ ] `manifest.json`의 컬렉션별 건수와 복원 후 `db.<col>.countDocuments()` 일치
- [ ] 로그인 동작 (`users` 복원 확인)
- [ ] 교사 성적/학생부/피드백/상담 페이지 정상 조회
- [ ] 피드백/상담 본문이 **평문으로** 보임 (= ENCRYPTION_KEY 정상)
- [ ] 분석 대시보드 → "지금 재집계" → 분석 컬렉션 재생성 확인
- [ ] 권한 격리: 학생/학부모 계정으로 타인 데이터 접근 차단 확인

## 6. 정기 복구 훈련 (권장)

- 분기 1회, 시나리오 B를 임시 클러스터로 수행
- RTO 실측 → 본 문서 갱신
- 백업 Artifact 무결성(다운로드·복원 성공) 확인

## 7. 운영 전제

- GitHub Secrets: `MONGODB_URI` 등록
- Atlas Network Access: GitHub Actions 러너 IP 허용(동적 → `0.0.0.0/0` 또는 워크플로 IP 추가 step)
- `ENCRYPTION_KEY`: 백업/복원 환경 모두 동일 값, 비밀 저장소에 별도 보관
