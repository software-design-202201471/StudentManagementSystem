// Gemini LLM 기반 학습 도우미.
// 프라이버시: 익명 집계만 전송 (이름/이메일/학년·반·번호 제외).
// 키 미설정·실패 시 호출자가 규칙 기반(studentChatbot)으로 폴백.

const CATEGORY_LABELS = {
  grade: '성적',
  behavior: '행동',
  attitude: '태도',
  attendance: '출결',
};

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

function fmtDate(d) {
  if (!d) return '없음';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '없음';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 분석 문서 → 익명 학습 지표 텍스트.
 * 이름/이메일/학년·반·번호 등 식별정보는 절대 포함하지 않는다.
 * @param {object} doc - AnalyticsStudent (lean)
 * @returns {string}
 */
export function buildAnonymousContext(doc) {
  const lines = [];
  lines.push(`전체 평균: ${doc.averagePercentage ?? 0}%`);
  lines.push(`등록 과목 수: ${doc.gradeCount ?? 0}`);

  const subjects = doc.subjectStats || [];
  if (subjects.length) {
    lines.push(
      `과목별 평균: ${subjects
        .map((s) => `${s.subject} ${s.averagePercentage}%(${s.latestGrade || '-'})`)
        .join(', ')}`
    );
  }

  const sems = doc.semesterStats || [];
  if (sems.length) {
    lines.push(
      `학기별 평균: ${sems
        .map((s) => `${s.semester} ${s.averagePercentage}%(${s.count}과목)`)
        .join(', ')}`
    );
  }

  const a = doc.attendance || {};
  lines.push(
    `출결: 결석 ${a.absent || 0}, 지각 ${a.late || 0}, 조퇴 ${a.early || 0}`
  );

  const by = doc.feedbackByCategory || {};
  lines.push(
    `피드백: ${doc.feedbackCount || 0}건 (${Object.entries(CATEGORY_LABELS)
      .map(([k, label]) => `${label} ${by[k] || 0}`)
      .join(', ')})`
  );

  lines.push(
    `상담: ${doc.counselingCount || 0}건, 최근 ${fmtDate(doc.lastCounselingDate)}`
  );

  return lines.join('\n');
}

const SYSTEM_PROMPT = [
  '당신은 중·고등학교 교사를 돕는 학생 학습 분석 도우미입니다.',
  '아래 [학생 데이터]는 특정 학생의 익명 학습 지표입니다(이름 등 식별정보 없음).',
  '이 데이터만 근거로 한국어로 간결하고 정확하게 답하세요.',
  '데이터에 없는 내용은 추측하지 말고 "데이터에 없습니다"라고 하세요.',
  '학생은 "해당 학생"으로 지칭하고, 교사에게 도움이 되는 조언을 덧붙이세요.',
].join(' ');

/**
 * Gemini로 질문 응답. 키 없거나 호출 실패 시 throw (호출자 폴백).
 * @param {object} doc - AnalyticsStudent (lean)
 * @param {string} message - 교사 질문
 * @returns {Promise<string>}
 */
export async function answerWithGemini(doc, message) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY 미설정');

  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const context = buildAnonymousContext(doc);
  const prompt = `${SYSTEM_PROMPT}\n\n[학생 데이터]\n${context}\n\n[질문]\n${
    message || '이 학생의 학습 현황을 요약해줘.'
  }`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(
      `${ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
        }),
        signal: controller.signal,
      }
    );
    if (!res.ok) {
      throw new Error(`Gemini API ${res.status}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join('')
      .trim();
    if (!text) throw new Error('Gemini 빈 응답');
    return text;
  } finally {
    clearTimeout(timer);
  }
}
