"use client";

import { useEffect, useState } from "react";
import type { AccountingSummaryRow } from "../lib/types";
import { fetchAccountingSummary } from "../lib/api";
import AccountingTable from "../components/accounting/AccountingTable";
import EmptyState from "../components/accounting/EmptyState";
import LoadingState from "../components/accounting/LoadingState";

/**
 * Accounting page.
 *
 * "As a PM, I want rent, OPEX, and CPI/fixed increases tracked per lease,
 * so that I always know the current financial position" (Rent and OPEX
 * tracking) and "As a PM, I want Clark to calculate the next rent review
 * amount, so that I don't do it manually" (Rent review calculation) -
 * both SPRINT 10. Fetches from GET /accounting/summary and follows the
 * same loading/empty/error pattern as the Lease List page.
 */
export default function AccountingPage() {
  const [rows, setRows] = useState<AccountingSummaryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAccountingSummary()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load accounting figures."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-charcoal">
            Accounting
          </h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Rent, OPEX, and calculated rent review figures across your
            portfolio.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">
            {error}
          </div>
        )}

        {!error && rows === null && <LoadingState />}

        {!error && rows !== null && rows.length === 0 && <EmptyState />}

        {!error && rows !== null && rows.length > 0 && (
          <AccountingTable rows={rows} />
        )}
      </div>
    </main>
  );
}
