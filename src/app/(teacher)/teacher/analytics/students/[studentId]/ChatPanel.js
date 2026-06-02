'use client';

import { useState } from 'react';

const QUICK = ['종합 요약', '약점 과목', '강점 과목', '출결', '최근 상담', '피드백'];

export default function ChatPanel({ studentId, studentName }) {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: `${studentName || '학생'} 학생에 대해 무엇이든 물어보세요. 아래 버튼으로 빠르게 질문할 수도 있습니다.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, message: q }),
      });
      const data = await res.json();
      const reply = res.ok
        ? data.reply
        : data.error || '응답을 가져오지 못했습니다.';
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: err.message || '오류가 발생했습니다.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">
          학습 도우미 챗봇
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          AI 응답 (익명 집계만 사용)
        </p>
      </div>

      {/* 대화 */}
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-lg text-sm bg-gray-100 text-gray-400">
              생각 중...
            </div>
          </div>
        )}
      </div>

      {/* 빠른 질문 */}
      <div className="px-4 pb-2 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            disabled={loading}
            className="px-2.5 py-1 text-xs rounded-full border border-gray-300
              text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* 입력 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 p-4 border-t border-gray-200"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="예: 약점 과목 분석하고 조언해줘"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
            focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md
            hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          전송
        </button>
      </form>
    </div>
  );
}
