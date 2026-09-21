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
 *
 * rentReviewDate / renewalOptionDate are optional because most leases don't
 * have one of each - added for the "Key date detection" card (SPRINT 7),
 * which needs all three date types (rent review, renewal option, expiry) to
 * scan for. endDate already covers expiry.
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
  rentReviewDate?: string;
  renewalOptionDate?: string;
}

/**
 * Formats "today + offsetDays" as an ISO date (YYYY-MM-DD), so the seeded
 * rent review / renewal option dates below stay "varying distances from
 * today" no matter when the server actually runs - needed for the "Seed
 * leases with dates at varying distances from today" testing checklist item
 * on the Key date detection card.
 */
function daysFromNow(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
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
    // Rent review coming up soon - inside the detection window.
    rentReviewDate: daysFromNow(15),
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
    // Rent review far out - deliberately outside the detection window, so
    // it should NOT produce a task. Boundary-testing data point.
    rentReviewDate: daysFromNow(200),
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
    // Renewal option coming up - inside the detection window.
    renewalOptionDate: daysFromNow(45),
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
    // Renewal option far out - outside the detection window.
    renewalOptionDate: daysFromNow(120),
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

/**
 * Testing helper for the "test a portfolio with zero upcoming events" case
 * on the Key date detection card - lets that scenario be exercised via the
 * API instead of hand-editing this file and restarting the server.
 * Not used by any real feature code.
 */
export function setLeasesForTesting(newLeases: Lease[]): void {
  leases = newLeases;
}
