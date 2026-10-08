export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
      <p className="text-base font-medium text-charcoal">
        No leases to show figures for yet
      </p>
      <p className="max-w-sm text-sm text-charcoal/60">
        Once leases are uploaded, their rent, OPEX, and rent review figures
        will show up here.
      </p>
    </div>
  );
}
