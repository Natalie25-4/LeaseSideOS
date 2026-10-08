import type { ClarkTaskEventType } from "../data/taskStore";

export type Urgency = "critical" | "high" | "medium" | "low";

const rank: Record<Urgency, number> = { critical: 0, high: 1, medium: 2, low: 3 };
export function compareTaskUrgency(a: { urgency: Urgency; daysUntilEvent: number }, b: { urgency: Urgency; daysUntilEvent: number }): number {
  return rank[a.urgency] - rank[b.urgency] || a.daysUntilEvent - b.daysUntilEvent;
}

// Initial operational policy, pending team review. Inclusive calendar days.
export const URGENCY_THRESHOLDS: Record<ClarkTaskEventType, readonly [number, number, number]> = {
  rent_review: [7, 30, 60],
  renewal_option: [14, 45, 75],
  expiry: [14, 30, 60],
};

export function classifyUrgency(eventType: ClarkTaskEventType, days: number): Urgency {
  if (!Number.isFinite(days)) throw new Error("Invalid event date");
  const [critical, high, medium] = URGENCY_THRESHOLDS[eventType];
  if (days <= critical) return "critical";
  if (days <= high) return "high";
  if (days <= medium) return "medium";
  return "low";
}

// Calendar days in the server timezone, without DST hour drift.
export function daysUntil(eventDate: string, referenceDate: Date): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(eventDate);
  if (!match || !Number.isFinite(referenceDate.getTime())) throw new Error("Invalid event date");
  const [, year, month, day] = match.map(Number);
  const event = new Date(Date.UTC(year, month - 1, day));
  if (event.getUTCFullYear() !== year || event.getUTCMonth() !== month - 1 || event.getUTCDate() !== day) {
    throw new Error("Invalid event date");
  }
  const today = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  return (event.getTime() - today) / 86400000;
}
