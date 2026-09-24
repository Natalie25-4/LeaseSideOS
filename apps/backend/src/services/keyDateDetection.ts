/**
 * Key date detection.
 *
 * "As a PM, I want Clark to detect upcoming rent reviews, renewals,
 * options, and expiries across my whole portfolio, so that nothing slips
 * through." (SPRINT 7 - Key date detection card)
 *
 * Scans every lease for three kinds of upcoming event - rent review,
 * renewal option, and expiry - and turns anything falling inside the
 * detection window into a Clark Task record. Events in the past or further
 * out than the window are left alone (not "upcoming" yet).
 */

import { getAllLeases, Lease } from "../data/leaseStore";
import { ClarkTask, ClarkTaskEventType, replaceAllTasks } from "../data/taskStore";

// How far ahead to look for key dates. 90 days gives PMs a quarter's worth
// of runway on rent reviews/renewals/expiries - tune this once the team has
// real-world feedback on what "nothing slips through" should mean in
// practice.
export const DETECTION_WINDOW_DAYS = 90;

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  // Normalize both to midnight so partial-day drift doesn't shift the count.
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toMidnight = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toMidnight.getTime() - fromMidnight.getTime()) / msPerDay);
}

function describeEvent(eventType: ClarkTaskEventType, lease: Lease, daysUntilEvent: number): string {
  const when = daysUntilEvent === 0 ? "today" : `in ${daysUntilEvent} day${daysUntilEvent === 1 ? "" : "s"}`;
  switch (eventType) {
    case "rent_review":
      return `Rent review due ${when} for ${lease.tenantName} at ${lease.propertyName}.`;
    case "renewal_option":
      return `Renewal option window opens ${when} for ${lease.tenantName} at ${lease.propertyName}.`;
    case "expiry":
      return `Lease expires ${when} for ${lease.tenantName} at ${lease.propertyName}.`;
  }
}

function buildTaskIfUpcoming(
  lease: Lease,
  eventType: ClarkTaskEventType,
  eventDate: string | undefined,
  referenceDate: Date
): ClarkTask | null {
  if (!eventDate) return null;

  const daysUntilEvent = daysBetween(referenceDate, new Date(eventDate));

  // Only "upcoming" events count - already-passed dates and anything
  // further out than the detection window are skipped.
  if (daysUntilEvent < 0 || daysUntilEvent > DETECTION_WINDOW_DAYS) return null;

  return {
    id: `task-${lease.id}-${eventType}`,
    leaseId: lease.id,
    propertyName: lease.propertyName,
    tenantName: lease.tenantName,
    eventType,
    eventDate,
    daysUntilEvent,
    description: describeEvent(eventType, lease, daysUntilEvent),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Scans every lease in the portfolio for upcoming rent reviews, renewal
 * options, and expiries, and replaces the Clark Task store with whatever
 * it finds. Returns the freshly generated tasks (sorted soonest-first) so
 * callers - the scheduled job, or a manual test trigger - can inspect the
 * result directly.
 */
export function scanLeasesForKeyDates(referenceDate: Date = new Date()): ClarkTask[] {
  const leases = getAllLeases();
  const tasks: ClarkTask[] = [];

  for (const lease of leases) {
    const expiryTask = buildTaskIfUpcoming(lease, "expiry", lease.endDate, referenceDate);
    if (expiryTask) tasks.push(expiryTask);

    const rentReviewTask = buildTaskIfUpcoming(lease, "rent_review", lease.rentReviewDate, referenceDate);
    if (rentReviewTask) tasks.push(rentReviewTask);

    const renewalTask = buildTaskIfUpcoming(lease, "renewal_option", lease.renewalOptionDate, referenceDate);
    if (renewalTask) tasks.push(renewalTask);
  }

  tasks.sort((a, b) => a.daysUntilEvent - b.daysUntilEvent);

  replaceAllTasks(tasks);
  return tasks;
}
