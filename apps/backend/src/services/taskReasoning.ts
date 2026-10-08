import type { ClarkTaskEventType } from "../data/taskStore";
import { classifyUrgency, URGENCY_THRESHOLDS } from "./taskUrgency";

const EVENTS: Record<ClarkTaskEventType, { label: string; action: string }> = {
  rent_review: { label: "The recorded rent review date", action: "Review the lease terms and prepare for the rent review." },
  renewal_option: { label: "The recorded renewal option date", action: "Check the lease for the notice requirements and confirm the tenant's renewal plans." },
  expiry: { label: "The recorded lease expiry date", action: "Confirm the next steps for the tenancy and check any notice requirements in the lease." },
};

/** Explain the existing operational policy, not an inferred legal deadline. */
export function explainTaskUrgency(eventType: ClarkTaskEventType, days: number): string {
  if (!Number.isInteger(days)) throw new Error("Expected whole calendar days");
  const urgency = classifyUrgency(eventType, days);
  const { label, action } = EVENTS[eventType];
  const count = Math.abs(days);
  const duration = `${count} day${count === 1 ? "" : "s"}`;
  const timing = days < 0 ? `${label} passed ${duration} ago.`
    : days === 0 ? `${label} is today.` : `${label} is in ${duration}.`;
  const [critical, high, medium] = URGENCY_THRESHOLDS[eventType];
  const priority = days < 0 ? "This is Critical because the recorded date has passed."
    : days === 0 ? "This is Critical because the recorded date is today."
    : urgency === "low" ? `This is Low because the date is more than ${medium} days away under the current priority rules.`
    : `This is ${urgency[0].toUpperCase() + urgency.slice(1)} because the date falls within the ${urgency === "critical" ? `next ${critical}` : urgency === "high" ? `${critical + 1}-${high}` : `${high + 1}-${medium}`} day range under the current priority rules.`;
  return `${timing} ${priority} ${action}`;
}
