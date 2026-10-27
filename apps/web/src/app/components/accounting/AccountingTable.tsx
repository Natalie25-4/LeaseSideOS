import type { AccountingSummaryRow } from "../../lib/types";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  });
}

export default function AccountingTable({
  rows,
}: {
  rows: AccountingSummaryRow[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface">
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-charcoal/50">
            <th className="px-4 py-3 font-medium">Tenant</th>
            <th className="px-4 py-3 font-medium">Property</th>
            <th className="px-4 py-3 font-medium">Rent</th>
            <th className="px-4 py-3 font-medium">OPEX</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Next rent review</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.leaseId}
              className="border-b border-border last:border-0 hover:bg-surface"
            >
              <td className="px-4 py-4 font-medium text-charcoal">
                {row.tenantName}
              </td>
              <td className="px-4 py-4 text-charcoal/80">
                {row.propertyName}
              </td>
              <td className="px-4 py-4 text-charcoal/80">
                {formatCurrency(row.rentAmount)}
              </td>
              <td className="px-4 py-4 text-charcoal/80">
                {formatCurrency(row.opexAmount)}
              </td>
              <td className="px-4 py-4 font-medium text-charcoal">
                {formatCurrency(row.totalAmount)}
              </td>
              <td className="px-4 py-4 text-charcoal/80">
                {row.rentReview ? (
                  <div>
                    <div className="font-medium text-charcoal">
                      {formatCurrency(row.rentReview.calculatedRentAmount)}
                    </div>
                    <div className="text-xs text-charcoal/50">
                      {row.rentReview.clause}
                    </div>
                  </div>
                ) : (
                  <span className="text-charcoal/40">No review terms</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
