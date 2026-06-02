// 규칙 기반 학습 도우미 응답 엔진 (Gemini 폴백용).
// 분석 문서(AnalyticsStudent)만 사용 — 외부 전송 없음.
// 순수 함수: (doc, message) → 응답 문자열.

const CATEGORY_LABELS = {
  grade: '성적',
  behavior: '행동',
  attitude: '태도',
  attendance: '출결',
};

function fmtDate(d) {
  if (!d) return '없음';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '없음';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sortedSubjects(doc) {
  return [...(doc.subjectStats || [])].sort(
    (a, b) => a.averagePercentage - b.averagePercentage
  );
}

function weakest(doc) {
  const s = sortedSubjects(doc);
  return s.length ? s[0] : null;
}

function strongest(doc) {
  const s = sortedSubjects(doc);
  return s.length ? s[s.length - 1] : null;
}

function summary(doc) {
  const name = doc.name || '학생';
  if (!doc.gradeCount) {
    return `${name} 학생은 아직 등록된 성적이 없습니다. 피드백 ${doc.feedbackCount || 0}건, 상담 ${doc.counselingCount || 0}건이 기록되어 있습니다.`;
  }
  const w = weakest(doc);
  const st = strongest(doc);
  const parts = [
    `${name} 학생의 전체 평균은 ${doc.averagePercentage}%이며, ${doc.gradeCount}개 과목이 등록되어 있습니다.`,
  ];
  if (st && w && st.subject !== w.subject) {
    parts.push(
      `가장 강한 과목은 ${st.subject}(${st.averagePercentage}%), 가장 약한 과목은 ${w.subject}(${w.averagePercentage}%)입니다.`
    );
  }
  parts.push(
    `피드백 ${doc.feedbackCount || 0}건, 상담 ${doc.counselingCount || 0}건이 있습니다.`
  );
  return parts.join(' ');
}

function helpText() {
  return [
    '다음과 같이 질문해 보세요:',
    '· "종합 요약" / "이 학생 어때?"',
    '· "약점 과목" / "강점 과목"',
    '· "출결 어때?"',
    '· "최근 상담" / "피드백"',
    '· "학기별 추세"',
  ].join('\n');
}

const INTENTS = [
  {
    keys: ['약점', '취약', '부족', '낮', '못하', '안되'],
    answer(doc) {
      const w = weakest(doc);
      if (!w) return '등록된 성적이 없어 약점 과목을 알 수 없습니다.';
      return `${doc.name || '학생'} 학생의 가장 약한 과목은 ${w.subject}로, 평균 ${w.averagePercentage}%(최근 등급 ${w.latestGrade || '-'})입니다. 보완 지도가 필요합니다.`;
    },
  },
  {
    keys: ['강점', '잘하', '잘 하', '우수', '높', '제일 잘'],
    answer(doc) {
      const s = strongest(doc);
      if (!s) return '등록된 성적이 없어 강점 과목을 알 수 없습니다.';
      return `${doc.name || '학생'} 학생의 가장 강한 과목은 ${s.subject}로, 평균 ${s.averagePercentage}%(최근 등급 ${s.latestGrade || '-'})입니다.`;
    },
  },
  {
    keys: ['출결', '결석', '지각', '조퇴', '출석'],
    answer(doc) {
      const a = doc.attendance || {};
      return `${doc.name || '학생'} 학생의 출결은 결석 ${a.absent || 0}회, 지각 ${a.late || 0}회, 조퇴 ${a.early || 0}회입니다.`;
    },
  },
  {
    keys: ['상담'],
    answer(doc) {
      const cnt = doc.counselingCount || 0;
      if (cnt === 0) return `${doc.name || '학생'} 학생은 상담 기록이 없습니다.`;
      return `${doc.name || '학생'} 학생은 상담 ${cnt}건이 있으며, 최근 상담일은 ${fmtDate(doc.lastCounselingDate)}입니다.`;
    },
  },
  {
    keys: ['피드백'],
    answer(doc) {
      const cnt = doc.feedbackCount || 0;
      if (cnt === 0) return `${doc.name || '학생'} 학생은 피드백 기록이 없습니다.`;
      const by = doc.feedbackByCategory || {};
      const detail = Object.entries(CATEGORY_LABELS)
        .map(([k, label]) => `${label} ${by[k] || 0}`)
        .join(', ');
      return `${doc.name || '학생'} 학생은 피드백 ${cnt}건이 있습니다. (${detail})`;
    },
  },
  {
    keys: ['학기', '추세', '변화', '추이', '흐름'],
    answer(doc) {
      const ss = doc.semesterStats || [];
      if (ss.length === 0) return '학기별 데이터가 없습니다.';
      const line = ss
        .map((s) => `${s.semester} ${s.averagePercentage}%(${s.count}과목)`)
        .join(', ');
      return `${doc.name || '학생'} 학생의 학기별 평균: ${line}.`;
    },
  },
  {
    keys: ['평균', '성적', '요약', '어때', '현황', '전체', '종합', '정리'],
    answer: summary,
  },
];

/**
 * 학생 분석 문서 기반 질문 응답 (규칙 기반).
 * @param {object} doc - AnalyticsStudent (lean)
 * @param {string} message
 * @returns {string}
 */
export function answerQuestion(doc, message) {
  if (!doc) {
    return '해당 학생의 분석 데이터가 없습니다. 대시보드에서 재집계를 먼저 실행해주세요.';
  }
  const text = String(message || '').toLowerCase();
  if (!text.trim()) return helpText();

  for (const intent of INTENTS) {
    if (intent.keys.some((k) => text.includes(k.toLowerCase()))) {
      return intent.answer(doc);
    }
  }
  return `${summary(doc)}\n\n(더 궁금하면 "약점 과목", "출결", "최근 상담" 등으로 질문해 보세요.)`;
}
