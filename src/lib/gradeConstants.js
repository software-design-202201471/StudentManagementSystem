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