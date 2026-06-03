import { formatEnrollment } from '@/lib/format';

/**
 * 학적(학년/반/번호)을 표시하는 중립적 회색 배지.
 * 값이 없으면 아무것도 렌더하지 않는다.
 */
export default function EnrollmentBadge({
  grade,
  classNumber,
  studentNumber,
  className = '',
}) {
  const label = formatEnrollment(grade, classNumber, studentNumber);
  if (!label) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 ${className}`}
    >
      {label}
    </span>
  );
}
