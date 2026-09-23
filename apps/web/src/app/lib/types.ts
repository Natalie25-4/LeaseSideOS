/**
 * Local copy of the Lease shape used by the frontend, mirroring
 * apps/backend/src/data/leaseStore.ts and packages/shared/src/lease.ts.
 *
 * packages/shared isn't wired up as a real workspace dependency yet (no
 * "workspaces" field in the root package.json), so this stays a local
 * duplicate for now rather than a cross-package import - worth fixing once
 * the monorepo tooling is set up properly.
 */
export interface Lease {
  id: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  landlordName: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  status: "active" | "expiring" | "expired" | "under_review";
}

/**
 * Mirrors apps/backend/src/services/rentCalculations.ts's
 * RentReviewCalculation - the calculated next rent review amount for a
 * lease, or null if the lease has no rent review terms. Used by the
 * accounting page (SPRINT 10 - "Rent and OPEX tracking" /
 * "Rent review calculation").
 */
export interface RentReviewCalculation {
  leaseId: string;
  currentRentAmount: number;
  calculatedRentAmount: number;
  rawIncreasePercentage: number;
  appliedIncreasePercentage: number;
  capApplied: boolean;
  collarApplied: boolean;
  clause: string;
}

/** One row of GET /accounting/summary. */
export interface AccountingSummaryRow {
  leaseId: string;
  propertyName: string;
  tenantName: string;
  rentAmount: number;
  opexAmount: number;
  totalAmount: number;
  rentReview: RentReviewCalculation | null;
}
