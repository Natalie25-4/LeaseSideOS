import type { ApprovalAction } from "./approvals";
import type { AccountingSummaryRow, Lease, MaintenanceRequest, MaintenanceStatus } from "./types";

// Backend runs on :4000 in local dev (see apps/backend/src/index.ts).
// Override with NEXT_PUBLIC_API_URL for other environments once this
// actually gets deployed somewhere.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchLeases(): Promise<Lease[]> {
  const res = await fetch(`${API_BASE_URL}/leases`, { cache: "no-store" });

  if (!res.ok) {
    throw new ApiError(
      `Failed to load leases (${res.status})`,
      res.status
    );
  }

  const data = (await res.json()) as { leases: Lease[] };
  return data.leases;
}

/**
 * Supports the accounting page (SPRINT 10 - "Rent and OPEX tracking" /
 * "Rent review calculation"): per-lease rent, OPEX, and the calculated
 * next rent review amount.
 */
export async function fetchAccountingSummary(): Promise<AccountingSummaryRow[]> {
  const res = await fetch(`${API_BASE_URL}/accounting/summary`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new ApiError(
      `Failed to load accounting summary (${res.status})`,
      res.status
    );
  }

  const data = (await res.json()) as { summary: AccountingSummaryRow[] };
  return data.summary;
}

/**
 * Supports the maintenance page (SPRINT 11 - "Maintenance request logging"
 * / "Maintenance progress tracking"): every logged maintenance request.
 */
export async function fetchMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  const res = await fetch(`${API_BASE_URL}/maintenance`, { cache: "no-store" });

  if (!res.ok) {
    throw new ApiError(
      `Failed to load maintenance requests (${res.status})`,
      res.status
    );
  }

  const data = (await res.json()) as { requests: MaintenanceRequest[] };
  return data.requests;
}

/**
 * Logs a new maintenance request against a lease/property. Supports the
 * "Build maintenance request form" checklist item.
 */
export async function createMaintenanceRequest(input: {
  leaseId: string;
  description: string;
}): Promise<MaintenanceRequest> {
  const res = await fetch(`${API_BASE_URL}/maintenance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(
      body?.message ?? `Failed to log maintenance request (${res.status})`,
      res.status
    );
  }

  const data = (await res.json()) as { request: MaintenanceRequest };
  return data.request;
}

/** Supports the "Build status update UI" checklist item. */
export async function updateMaintenanceStatus(
  id: string,
  status: MaintenanceStatus
): Promise<ApprovalAction> {
  const res = await fetch(`${API_BASE_URL}/maintenance/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new ApiError(
      `Failed to update maintenance request status (${res.status})`,
      res.status
    );
  }

  const data = (await res.json()) as { action: ApprovalAction };
  return data.action;
}

/** Supports the "Build assignment UI" checklist item. */
export async function assignMaintenanceRequest(
  id: string,
  assignedTo: string
): Promise<ApprovalAction> {
  const res = await fetch(`${API_BASE_URL}/maintenance/${id}/assign`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignedTo }),
  });

  if (!res.ok) {
    throw new ApiError(
      `Failed to assign maintenance request (${res.status})`,
      res.status
    );
  }

  const data = (await res.json()) as { action: ApprovalAction };
  return data.action;
}
