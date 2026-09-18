export function StatCard({
  label,
  value,
  delta,
  deltaTone = "default",
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "default" | "critical" | "success";
}) {
  const deltaStyles = {
    default: "text-gray-500",
    critical: "text-critical",
    success: "text-success",
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-charcoal mt-1">{value}</p>
      {delta && <p className={`text-xs mt-1 ${deltaStyles[deltaTone]}`}>{delta}</p>}
    </div>
  );
}