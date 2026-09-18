type Priority = "critical" | "high" | "medium" | "low";

const styles: Record<Priority, string> = {
  critical: "bg-critical text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-warning text-white",
  low: "bg-success text-white",
};

export function PriorityTag({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${styles[priority]}`}>
      {priority}
    </span>
  );
}