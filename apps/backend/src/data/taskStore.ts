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

import { classifyUrgency, daysUntil, Urgency } from "../services/taskUrgency";

export type ClarkTaskEventType = "rent_review" | "renewal_option" | "expiry";

export interface ClarkTask {
  id: string;
  leaseId: string;
  propertyName: string;
  tenantName: string;
  eventType: ClarkTaskEventType;
  eventDate: string; // ISO date the event falls on
  daysUntilEvent: number;
  urgency: Urgency;
  description: string;
  createdAt: string; // ISO timestamp of when this task record was generated
}

let tasks: ClarkTask[] = [];

export function getAllTasks(referenceDate: Date = new Date()): ClarkTask[] {
  tasks = tasks.map((task) => {
    const daysUntilEvent = daysUntil(task.eventDate, referenceDate);
    const when = daysUntilEvent < 0 ? `${-daysUntilEvent} day(s) overdue`
      : daysUntilEvent === 0 ? "today" : `in ${daysUntilEvent} day(s)`;
    return { ...task, daysUntilEvent, urgency: classifyUrgency(task.eventType, daysUntilEvent),
      description: `${task.eventType.replace(/_/g, " ")} ${when} for ${task.tenantName} at ${task.propertyName}.` };
  });
  return tasks;
}

/**
 * Replace a scan's snapshot (including previously detected overdue events)
 * rather than accumulating duplicate records on every scheduled run.
 */
export function replaceAllTasks(newTasks: ClarkTask[]): void {
  tasks = newTasks;
}
