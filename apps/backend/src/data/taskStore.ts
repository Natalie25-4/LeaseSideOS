/**
 * In-memory Clark Task store.
 *
 * "Clark Task records" as referenced by the Key date detection card
 * (SPRINT 7 - Portfolio risk and opportunity intelligence): the output of
 * scanning every lease for upcoming rent reviews, renewal options, and
 * expiries. Other cards in this sprint ("task urgency classification",
 * "task reasoning") build on top of these records.
 *
 * TODO: replace with PostgreSQL once the DB is wired up, same as
 * leaseStore.ts.
 */

export type ClarkTaskEventType = "rent_review" | "renewal_option" | "expiry";

export interface ClarkTask {
  id: string;
  leaseId: string;
  propertyName: string;
  tenantName: string;
  eventType: ClarkTaskEventType;
  eventDate: string; // ISO date the event falls on
  daysUntilEvent: number;
  description: string;
  createdAt: string; // ISO timestamp of when this task record was generated
}

let tasks: ClarkTask[] = [];

export function getAllTasks(): ClarkTask[] {
  return tasks;
}

/**
 * Each scan represents "what's currently upcoming", so a fresh scan
 * replaces the previous batch rather than piling up duplicates every time
 * the scheduled job runs.
 */
export function replaceAllTasks(newTasks: ClarkTask[]): void {
  tasks = newTasks;
}
