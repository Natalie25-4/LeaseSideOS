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
