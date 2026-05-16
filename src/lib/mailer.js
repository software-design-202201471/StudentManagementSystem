import nodemailer from 'nodemailer';
import { CATEGORY_LABELS } from '@/lib/feedbackConstants';

/**
 * Nodemailer transporter (메모이즈).
 * SMTP 환경변수가 없으면 null 반환 — 호출자는 graceful skip.
 */
let transporter = null;
let transporterChecked = false;

function getTransporter() {
  if (transporterChecked) return transporter;
  transporterChecked = true;

  if (!process.env.SMTP_HOST) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT) || 587;

  const options = {
    host: process.env.SMTP_HOST,
    port,
    // 465 = implicit TLS, 그 외는 STARTTLS 자동 협상 (서버가 지원하면 사용)
    secure: port === 465,
  };

  // pass가 있을 때만 auth 활성 (port 25 internal relay 등 무인증 시나리오 지원)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    options.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    };
  }

  transporter = nodemailer.createTransport(options);
  return transporter;
}

/**
 * 단일 메일 발송.
 * SMTP 미설정이면 콘솔 경고 후 무시. 송신 실패는 throw.
 *
 * 디버그: MAIL_DEBUG_TO 환경변수가 설정되어 있으면 모든 수신자를
 * 그 주소로 override한다. 원래 수신자는 subject prefix로 보존.
 */
export async function sendMail({ to, subject, text, html }) {
  if (!to || (Array.isArray(to) && to.length === 0)) return;

  const t = getTransporter();
  if (!t) {
    // SMTP 미설정 — graceful skip
    // eslint-disable-next-line no-console
    console.warn('[mailer] SMTP not configured; skipping send to', to);
    return;
  }

  const from =
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    'no-reply@example.com';

  const originalTo = Array.isArray(to) ? to.join(', ') : to;
  const debugTo = process.env.MAIL_DEBUG_TO;
  const finalTo = debugTo || originalTo;
  const finalSubject = debugTo
    ? `[DEBUG → ${originalTo}] ${subject}`
    : subject;

  await t.sendMail({
    from,
    to: finalTo,
    subject: finalSubject,
    text,
    html,
  });
}

function buildBody({ headline, teacherName, category, content }) {
  const categoryLabel = CATEGORY_LABELS[category] || category;
  const preview =
    content?.length > 200 ? `${content.slice(0, 200)}…` : content || '';
  return [
    headline,
    '',
    `작성: ${teacherName || '(미상)'}`,
    `카테고리: ${categoryLabel}`,
    '',
    '내용 미리보기:',
    preview,
    '',
    '시스템에 로그인하여 전체 내용을 확인하실 수 있습니다.',
  ].join('\n');
}

/**
 * 피드백 작성 알림 발송.
 * 호출자는 await 하지 말고 .catch(() => {}) 로 fire-and-forget 권장
 * (응답 지연 방지).
 *
 * @param {object} params
 * @param {string|null} params.studentEmail - isVisibleToStudent=true일 때만 전달
 * @param {string[]} params.parentEmails - isVisibleToParent=true일 때만 전달 (빈 배열 허용)
 * @param {string} params.studentName
 * @param {string} params.teacherName
 * @param {string} params.category
 * @param {string} params.content
 */
export async function sendFeedbackNotification({
  studentEmail,
  parentEmails,
  studentName,
  teacherName,
  category,
  content,
}) {
  const categoryLabel = CATEGORY_LABELS[category] || category;

  const tasks = [];

  if (studentEmail) {
    tasks.push(
      sendMail({
        to: studentEmail,
        subject: `[학생 관리 시스템] 새 피드백이 등록되었습니다 (${categoryLabel})`,
        text: buildBody({
          headline: `${studentName || '귀하'}에게 새 피드백이 등록되었습니다.`,
          teacherName,
          category,
          content,
        }),
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[mailer] student notification failed:', err.message);
      })
    );
  }

  if (parentEmails && parentEmails.length > 0) {
    tasks.push(
      sendMail({
        to: parentEmails,
        subject: `[학생 관리 시스템] ${studentName || '자녀'}에 대한 새 피드백 (${categoryLabel})`,
        text: buildBody({
          headline: `${studentName || '자녀'}에 대한 새 피드백이 등록되었습니다.`,
          teacherName,
          category,
          content,
        }),
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[mailer] parent notification failed:', err.message);
      })
    );
  }

  await Promise.all(tasks);
}
