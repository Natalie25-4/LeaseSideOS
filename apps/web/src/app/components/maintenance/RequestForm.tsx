"use client";

import { useState } from "react";
import type { Lease } from "../../lib/types";

/**
 * "Build maintenance request form" + "Link request to property/lease"
 * (Maintenance request logging, SPRINT 11). Leases stand in for properties
 * here since there's no standalone Property picker yet - each lease
 * carries its property/tenant info.
 */
export default function RequestForm({
  leases,
  onSubmit,
}: {
  leases: Lease[];
  onSubmit: (input: { leaseId: string; description: string }) => Promise<void>;
}) {
  const [leaseId, setLeaseId] = useState(leases[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leaseId || !description.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ leaseId, description: description.trim() });
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-lg border border-border p-4"
    >
      <h2 className="mb-3 text-sm font-medium text-charcoal">
        Log a maintenance request
      </h2>

      {error && (
        <div className="mb-3 rounded-lg border border-critical/30 bg-critical/5 px-3 py-2 text-sm text-critical">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={leaseId}
          onChange={(e) => setLeaseId(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-charcoal sm:w-64"
        >
          {leases.map((lease) => (
            <option key={lease.id} value={lease.id}>
              {lease.propertyName} ({lease.tenantName})
            </option>
          ))}
        </select>

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What needs attention?"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/40"
        />

        <button
          type="submit"
          disabled={submitting || !leaseId || !description.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Logging..." : "Log request"}
        </button>
      </div>
    </form>
  );
}
