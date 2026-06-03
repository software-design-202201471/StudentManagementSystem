/**
 * 공개/공유 여부를 명확한 배지로 표시.
 * on=true 면 강조 배지(onLabel), 아니면 흐린 텍스트(offLabel).
 */
export default function VisibilityBadge({ on, onLabel = '공개', offLabel = '비공개' }) {
  if (on) {
    return (
      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
        {onLabel}
      </span>
    );
  }
  return <span className="text-xs text-gray-400">{offLabel}</span>;
}
