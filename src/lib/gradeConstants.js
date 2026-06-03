export const GRADE_SCALE = [
  { min: 95, grade: 'A+' },
  { min: 90, grade: 'A' },
  { min: 85, grade: 'B+' },
  { min: 80, grade: 'B' },
  { min: 75, grade: 'C+' },
  { min: 70, grade: 'C' },
  { min: 60, grade: 'D' },
  { min: 0,  grade: 'F' },
];

/**
 * @param {number} score - 점수
 * @param {number} totalScore - 만점 (기본 100)
 * @returns {{ percentage: number, grade: string }}
 */
export function calculateGrade(score, totalScore = 100) {
  const percentage = Math.round((score / totalScore) * 100);
  const { grade } = GRADE_SCALE.find((g) => percentage >= g.min);
  return { percentage, grade };
}

/**
 * 성적 목록의 총점(점수 합계).
 * @param {Array<{score:number}>} grades
 * @returns {number}
 */
export function sumScores(grades) {
  if (!Array.isArray(grades)) return 0;
  return grades.reduce((acc, g) => acc + (Number(g?.score) || 0), 0);
}

/**
 * 성적 목록의 평균 점수(점수 기반, 소수 첫째자리 반올림).
 * @param {Array<{score:number}>} grades
 * @returns {number}
 */
export function averageScore(grades) {
  if (!Array.isArray(grades) || grades.length === 0) return 0;
  return Math.round((sumScores(grades) / grades.length) * 10) / 10;
}

/**
 * 성적 목록의 평균 백분율(정수 반올림).
 * @param {Array<{percentage:number}>} grades
 * @returns {number}
 */
export function averagePercentage(grades) {
  if (!Array.isArray(grades) || grades.length === 0) return 0;
  const sum = grades.reduce((acc, g) => acc + (Number(g?.percentage) || 0), 0);
  return Math.round(sum / grades.length);
}