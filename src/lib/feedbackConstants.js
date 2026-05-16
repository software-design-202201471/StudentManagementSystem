/**
 * 피드백 카테고리 enum과 한국어 라벨 매핑.
 * 백엔드 모델/API의 enum과 반드시 일치시켜 유지한다.
 */
export const CATEGORY_LABELS = {
  grade: '성적',
  behavior: '행동',
  attitude: '태도',
  attendance: '출결',
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS);
