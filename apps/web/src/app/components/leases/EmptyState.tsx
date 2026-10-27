export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
      <p className="text-base font-medium text-charcoal">
        No leases uploaded yet
      </p>
      <p className="max-w-sm text-sm text-charcoal/60">
        Once a commercial lease PDF is uploaded, it will show up here with
        its tenant, property, status, and expiry date.
      </p>
    </div>
  );
}
