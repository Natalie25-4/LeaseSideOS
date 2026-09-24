/**
 * In-memory maintenance request store.
 *
 * "As a PM, I want to log a maintenance request against a property, so
 * that it's tracked centrally" (Maintenance request logging) and "As a PM,
 * I want to assign and track maintenance progress, so that nothing is
 * forgotten" (Maintenance progress tracking) - both SPRINT 11.
 *
 * TODO: replace with PostgreSQL once the DB is wired up, same as
 * leaseStore.ts and taskStore.ts.
 *
 * There's no standalone Property store in this app yet (routes/properties.ts
 * is still an empty stub) - property and tenant info only exists denormalized
 * on Lease records, so a maintenance request is logged against a leaseId and
 * carries the property/tenant details from that lease at creation time,
 * same pattern as taskStore.ts's ClarkTask.
 */

export type MaintenanceStatus = "logged" | "assigned" | "in_progress" | "resolved";

export interface MaintenanceRequest {
  id: string;
  leaseId: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  description: string;
  status: MaintenanceStatus;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

let requests: MaintenanceRequest[] = [];

export function getAllRequests(): MaintenanceRequest[] {
  return requests;
}

export function getRequestById(id: string): MaintenanceRequest | undefined {
  return requests.find((r) => r.id === id);
}

export function addRequest(
  input: Pick<MaintenanceRequest, "leaseId" | "propertyId" | "propertyName" | "tenantName" | "description">
): MaintenanceRequest {
  const now = new Date().toISOString();
  const request: MaintenanceRequest = {
    ...input,
    id: `maint-${Date.now()}-${requests.length + 1}`,
    status: "logged",
    createdAt: now,
    updatedAt: now,
  };
  requests = [...requests, request];
  return request;
}

/**
 * Updates a request's status (logged -> assigned -> in_progress -> resolved,
 * though not strictly enforced in order - a PM might jump straight from
 * logged to in_progress). Supports the "Build status update UI" checklist
 * item on Maintenance progress tracking.
 */
export function updateRequestStatus(id: string, status: MaintenanceStatus): MaintenanceRequest | undefined {
  const request = getRequestById(id);
  if (!request) return undefined;
  request.status = status;
  request.updatedAt = new Date().toISOString();
  return request;
}

/**
 * Assigns (or reassigns) a request to someone. Supports the "Build
 * assignment UI" checklist item - assigning also bumps status from "logged"
 * to "assigned" if it hasn't moved further already, since an assigned
 * request that's still sitting at "logged" doesn't reflect reality.
 */
export function assignRequest(id: string, assignedTo: string): MaintenanceRequest | undefined {
  const request = getRequestById(id);
  if (!request) return undefined;
  request.assignedTo = assignedTo;
  if (request.status === "logged") {
    request.status = "assigned";
  }
  request.updatedAt = new Date().toISOString();
  return request;
}

/** Testing helper, same pattern as leaseStore.ts's setLeasesForTesting. */
export function setRequestsForTesting(newRequests: MaintenanceRequest[]): void {
  requests = newRequests;
}
