type PaymentStatus = "paid" | "overdue" | "due_soon";

interface PaymentRow {
  property: string;
  tenant: string;
  amount: string;
  due: string;
  status: PaymentStatus;
}

const statusStyles: Record<PaymentStatus, string> = {
  paid: "bg-emerald-50 text-success",
  overdue: "bg-red-50 text-critical",
  due_soon: "bg-amber-50 text-warning",
};

const statusLabels: Record<PaymentStatus, string> = {
  paid: "Paid",
  overdue: "Overdue",
  due_soon: "Due soon",
};

export function PaymentStatusTable({ rows }: { rows: PaymentRow[] }) {
  return (
    <table className="w-full text-sm text-left">
      <thead>
        <tr className="border-b border-border text-gray-500">
          <th className="py-2 font-medium">Property</th>
          <th className="py-2 font-medium">Tenant</th>
          <th className="py-2 font-medium">Amount</th>
          <th className="py-2 font-medium">Due</th>
          <th className="py-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.property} className="border-b border-border last:border-0">
            <td className="py-3 text-charcoal font-medium">{row.property}</td>
            <td className="py-3 text-gray-600">{row.tenant}</td>
            <td className="py-3 text-charcoal font-medium">{row.amount}</td>
            <td className="py-3 text-gray-600">{row.due}</td>
            <td className="py-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[row.status]}`}>
                {statusLabels[row.status]}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}