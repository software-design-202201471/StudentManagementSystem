'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

/**
 * 학생 성적 레이더 차트
 * @param {object} props
 * @param {Array<{subject: string, percentage: number}>} props.data
 *   과목별 백분율 데이터
 * @param {string} [props.title] - 차트 제목
 */
export default function GradeRadarChart({ data, title }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-gray-400 bg-gray-50 rounded-lg">
        표시할 성적 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      {title && (
        <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#374151', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
          />
          <Radar
            name="백분율"
            dataKey="percentage"
            stroke="#4f46e5"
            fill="#4f46e5"
            fillOpacity={0.3}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, '백분율']}
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
