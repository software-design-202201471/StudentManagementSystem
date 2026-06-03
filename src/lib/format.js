/**
 * 학적(학년/반/번호) 표시 문자열을 일관되게 생성.
 * 값이 없는 항목은 생략하고, 모두 없으면 빈 문자열.
 * 예) (3, 1, 5) -> "3학년 1반 5번"
 */
export function formatEnrollment(grade, classNumber, studentNumber) {
  const parts = [];
  if (grade != null) parts.push(`${grade}학년`);
  if (classNumber != null) parts.push(`${classNumber}반`);
  if (studentNumber != null) parts.push(`${studentNumber}번`);
  return parts.join(' ');
}
