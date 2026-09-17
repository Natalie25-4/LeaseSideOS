"use client";

import { useEffect, useState } from "react";
import type { Lease } from "../lib/types";
import { fetchLeases } from "../lib/api";
import LeaseTable from "../components/leases/LeaseTable";
import EmptyState from "../components/leases/EmptyState";
import LoadingState from "../components/leases/LoadingState";

/**
 * Lease List page.
 *
 * "As a PM I want to see a list of all uploaded leases so that I can find
 * the one I need." - fetches from GET /leases and handles the loading,
 * empty and error states explicitly rather than just the happy path.
 */
export default function LeasesPage() {
  const [leases, setLeases] = useState<Lease[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchLeases()
      .then((data) => {
        if (!cancelled) setLeases(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load leases."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-charcoal">Leases</h1>
        <p className="mt-1 text-sm text-charcoal/60">
          All uploaded commercial leases across your portfolio.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">
          {error}
        </div>
      )}

      {!error && leases === null && <LoadingState />}

      {!error && leases !== null && leases.length === 0 && <EmptyState />}

      {!error && leases !== null && leases.length > 0 && (
        <LeaseTable leases={leases} />
      )}
    </main>
  );
}
