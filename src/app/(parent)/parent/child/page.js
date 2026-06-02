import { redirect } from 'next/navigation';

// 구 placeholder 경로 — 자녀 피드백으로 통합 리다이렉트.
export default function ChildPage() {
  redirect('/parent/feedback');
}
