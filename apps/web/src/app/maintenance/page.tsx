"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lease, MaintenanceRequest, MaintenanceStatus } from "../lib/types";
import {
  fetchLeases,
  fetchMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceStatus,
  assignMaintenanceRequest,
} from "../lib/api";
import RequestForm from "../components/maintenance/RequestForm";
import MaintenanceTable from "../components/maintenance/MaintenanceTable";
import EmptyState from "../components/maintenance/EmptyState";
import LoadingState from "../components/maintenance/LoadingState";

/**
 * Maintenance page.
 *
 * "As a PM, I want to log a maintenance request against a property, so
 * that it's tracked centrally" (Maintenance request logging) and "As a PM,
 * I want to assign and track maintenance progress, so that nothing is
 * forgotten" (Maintenance progress tracking) - both SPRINT 11. Both cards
 * share one page since they're really the same resource: logging a
 * request, then moving it through its status/assignment lifecycle.
 */
export default function MaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[] | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchMaintenanceRequests(), fetchLeases()])
      .then(([requestsData, leasesData]) => {
        if (!cancelled) {
          setRequests(requestsData);
          setLeases(leasesData);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load maintenance requests."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(input: { leaseId: string; description: string }) {
    const request = await createMaintenanceRequest(input);
    setRequests((prev) => [request, ...(prev ?? [])]);
  }

  async function handleStatusChange(id: string, status: MaintenanceStatus) {
    try {
      await updateMaintenanceStatus(id, status);
      setNotice("Status change submitted for PM approval. The current status is unchanged.");
    } catch (err) { setNotice(err instanceof Error ? err.message : "Unable to submit change"); }
  }

  async function handleAssign(id: string, assignedTo: string) {
    try {
      await assignMaintenanceRequest(id, assignedTo);
      setNotice("Assignment submitted for PM approval. The current assignment is unchanged.");
    } catch (err) { setNotice(err instanceof Error ? err.message : "Unable to submit change"); }
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-charcoal">
            Maintenance
          </h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Log maintenance requests and track them through to resolution.
          </p>
        </div>

        <Link href="/approvals" className="mb-4 block underline">Review pending actions (PM)</Link>
        <p className="mb-4 text-sm">Status and assignment changes require PM approval. Refresh this page after approval to see the applied change.</p>
        {notice && <p role="status" className="mb-4">{notice}</p>}
        {error && (
          <div className="mb-6 rounded-lg border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">
            {error}
          </div>
        )}

        {!error && leases.length > 0 && (
          <RequestForm leases={leases} onSubmit={handleCreate} />
        )}

        {!error && requests === null && <LoadingState />}

        {!error && requests !== null && requests.length === 0 && (
          <EmptyState />
        )}

        {!error && requests !== null && requests.length > 0 && (
          <MaintenanceTable
            requests={requests}
            onStatusChange={handleStatusChange}
            onAssign={handleAssign}
          />
        )}
      </div>
    </main>
  );
}
