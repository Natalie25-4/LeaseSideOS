import type { Lease } from "../../lib/types";
import StatusBadge from "./StatusBadge";

function formatExpiry(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LeaseTable({ leases }: { leases: Lease[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface">
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-charcoal/50">
            <th className="px-4 py-3 font-medium">Tenant</th>
            <th className="px-4 py-3 font-medium">Property</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Expiry</th>
          </tr>
        </thead>
        <tbody>
          {leases.map((lease) => (
            <tr
              key={lease.id}
              className="border-b border-border last:border-0 hover:bg-surface"
            >
              <td className="px-4 py-4 font-medium text-charcoal">
                {lease.tenantName}
              </td>
              <td className="px-4 py-4 text-charcoal/80">
                {lease.propertyName}
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={lease.status} />
              </td>
              <td className="px-4 py-4 text-charcoal/80">
                {formatExpiry(lease.endDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
