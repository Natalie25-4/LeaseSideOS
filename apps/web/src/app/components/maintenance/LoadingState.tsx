export default function LoadingState() {
  const rows = [1, 2, 3, 4];

  return (
    <div
      className="overflow-hidden rounded-lg border border-border"
      role="status"
      aria-label="Loading maintenance requests"
    >
      <table className="w-full text-sm">
        <thead className="bg-surface">
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-charcoal/50">
            <th className="px-4 py-3 font-medium">Property</th>
            <th className="px-4 py-3 font-medium">Tenant</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Logged</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Assigned to</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row} className="border-b border-border last:border-0">
              {[32, 24, 40, 20, 20, 20].map((w, i) => (
                <td key={i} className="px-4 py-4">
                  <div
                    className="h-4 animate-pulse rounded bg-border"
                    style={{ width: `${w * 4}px` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
