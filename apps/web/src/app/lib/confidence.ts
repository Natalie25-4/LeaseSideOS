export type ConfidenceLevel = "high" | "medium" | "low";

export function clampConfidence(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(1, Math.max(0, score));
}

export function getConfidenceLevel(score: number): ConfidenceLevel {
  const normalizedScore = clampConfidence(score);

  if (normalizedScore >= 0.8) return "high";
  if (normalizedScore >= 0.6) return "medium";
  return "low";
}

export function calculateConfidence(question: string): number {
  const normalizedQuestion = question.trim().toLowerCase();
  let score = 0.55;

  if (normalizedQuestion.length >= 12) score += 0.1;
  if (/rent|expiry|expire|term|tenant|landlord|renewal/.test(normalizedQuestion)) {
    score += 0.2;
  }
  if (/which|what|when|how much|who/.test(normalizedQuestion)) score += 0.08;

  return clampConfidence(score);
}
