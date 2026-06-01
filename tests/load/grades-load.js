// k6 부하 테스트 — 다수 교사 동시 접속 시 성적 조회 성능 (명세 P.1)
// 실행: k6 run -e BASE_URL=https://<배포> -e COOKIE="<next-auth 세션쿠키>" tests/load/grades-load.js
//
// 사전 준비:
// 1) 브라우저에서 교사 로그인 → DevTools → Application → Cookies →
//    next-auth.session-token 값 복사 → COOKIE 환경변수로 전달
// 2) k6 설치: https://k6.io/docs/get-started/installation/
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  // 동시 접속 점진 증가 → 유지 → 감소 (다수 교사 동시 사용 시뮬레이션)
  stages: [
    { duration: '30s', target: 20 }, // 20 VU까지 증가
    { duration: '1m', target: 20 }, // 20 VU 유지
    { duration: '30s', target: 50 }, // 50 VU로 증가
    { duration: '1m', target: 50 }, // 50 VU 유지
    { duration: '30s', target: 0 }, // 감소
  ],
  thresholds: {
    // 95%ile 응답 1.5초 이내, 실패율 1% 미만 (명세 "지연 없이 원활")
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const COOKIE = __ENV.COOKIE || '';

const params = {
  headers: COOKIE
    ? { Cookie: `next-auth.session-token=${COOKIE}` }
    : {},
};

export default function () {
  // 교사 주요 조회 경로 부하
  const endpoints = [
    `${BASE_URL}/api/grades`,
    `${BASE_URL}/api/feedbacks`,
    `${BASE_URL}/api/counselings`,
    `${BASE_URL}/api/analytics/overview`,
  ];

  for (const url of endpoints) {
    const res = http.get(url, params);
    check(res, {
      'status 200': (r) => r.status === 200,
      'duration < 1.5s': (r) => r.timings.duration < 1500,
    });
  }

  sleep(1);
}
