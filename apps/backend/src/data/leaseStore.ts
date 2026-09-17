/**
 * In-memory lease store.
 *
 * TODO: replace with PostgreSQL once the DB is wired up (see FR2/FR8 in the
 * project doc, and src/db/.gitkeep). Kept as a simple array for now so the
 * "Lease List page" card can be built and tested end-to-end without waiting
 * on that.
 *
 * The Lease shape here mirrors packages/shared/src/lease.ts. That package
 * isn't linked into this app as a real workspace dependency yet (root
 * package.json has no "workspaces" field), so this is a local copy rather
 * than an import - someone should wire up npm/pnpm workspaces properly and
 * then this type can just be imported from "shared" instead of duplicated.
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

let leases: Lease[] = [
  {
    id: "lease-001",
    propertyId: "prop-101",
    propertyName: "12 Queen Street, Auckland CBD",
    tenantName: "Tarocash Ltd",
    landlordName: "Acme Property Trust",
    startDate: "2023-02-01",
    endDate: "2027-01-31",
    rentAmount: 8500,
    status: "active",
  },
  {
    id: "lease-002",
    propertyId: "prop-102",
    propertyName: "45 Karangahape Road, Auckland",
    tenantName: "Everbrew Coffee Co.",
    landlordName: "Northgate Holdings",
    startDate: "2021-06-15",
    endDate: "2026-11-30",
    rentAmount: 5200,
    status: "expiring",
  },
  {
    id: "lease-003",
    propertyId: "prop-103",
    propertyName: "8 Fanshawe Street, Auckland",
    tenantName: "Bright Path Legal",
    landlordName: "Waterview Estates",
    startDate: "2019-01-01",
    endDate: "2025-12-31",
    rentAmount: 12000,
    status: "expired",
  },
  {
    id: "lease-004",
    propertyId: "prop-104",
    propertyName: "3 Ponsonby Road, Auckland",
    tenantName: "Sunrise Physio",
    landlordName: "Acme Property Trust",
    startDate: "2024-03-01",
    endDate: "2029-02-28",
    rentAmount: 6800,
    status: "active",
  },
  {
    id: "lease-005",
    propertyId: "prop-105",
    propertyName: "21 Nelson Street, Auckland",
    tenantName: "Kova Design Studio",
    landlordName: "Northgate Holdings",
    startDate: "2022-09-01",
    endDate: "2026-10-15",
    rentAmount: 4100,
    status: "under_review",
  },
  {
    id: "lease-006",
    propertyId: "prop-106",
    propertyName: "150 Great South Road, Auckland",
    tenantName: "Metro Fitness",
    landlordName: "Waterview Estates",
    startDate: "2020-05-01",
    endDate: "2026-12-20",
    rentAmount: 9700,
    status: "expiring",
  },
];

export function getAllLeases(): Lease[] {
  return leases;
}

export function addLease(lease: Omit<Lease, "id">): Lease {
  const newLease: Lease = {
    ...lease,
    id: `lease-${String(leases.length + 1).padStart(3, "0")}-${Date.now()}`,
  };
  leases = [...leases, newLease];
  return newLease;
}

