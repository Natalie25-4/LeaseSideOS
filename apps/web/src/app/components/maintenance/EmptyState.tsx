export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
      <p className="text-base font-medium text-charcoal">
        No maintenance requests logged yet
      </p>
      <p className="max-w-sm text-sm text-charcoal/60">
        Use the form above to log a request against a property - it'll show
        up here with its status.
      </p>
    </div>
  );
}
