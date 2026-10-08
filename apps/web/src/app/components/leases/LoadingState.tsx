export default function LoadingState() {
  // Simple skeleton rows rather than a spinner, so the table shape doesn't
  // jump once real rows load in.
  const rows = [1, 2, 3, 4, 5];

  return (
    <div
      className="overflow-hidden rounded-lg border border-border"
      role="status"
      aria-label="Loading leases"
    >
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
          {rows.map((row) => (
            <tr key={row} className="border-b border-border last:border-0">
              <td className="px-4 py-4">
                <div className="h-4 w-32 animate-pulse rounded bg-border" />
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-40 animate-pulse rounded bg-border" />
              </td>
              <td className="px-4 py-4">
                <div className="h-5 w-20 animate-pulse rounded-full bg-border" />
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-24 animate-pulse rounded bg-border" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
