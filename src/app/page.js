// 루트 진입은 middleware가 /login 또는 역할별 홈으로 리다이렉트하므로
// 이 컴포넌트는 거의 렌더되지 않음. 폴백으로만 존재.
export default function HomePage() {
  return null;
}
