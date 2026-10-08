import {
  clampConfidence,
  getConfidenceLevel,
} from "@/app/lib/confidence";

const levelStyles = {
  high: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-red-200 bg-red-50 text-red-700",
};

const levelLabels = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

export function ConfidenceBadge({ score }: { score: number }) {
  const normalizedScore = clampConfidence(score);
  const level = getConfidenceLevel(normalizedScore);
  const percentage = Math.round(normalizedScore * 100);

  return (
    <span
      aria-label={`${levelLabels[level]}: ${percentage}%`}
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${levelStyles[level]}`}
      title={`${levelLabels[level]} (${percentage}%)`}
    >
      {percentage}% confidence
    </span>
  );
}
