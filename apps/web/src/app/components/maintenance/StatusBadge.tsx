import type { MaintenanceStatus } from "../../lib/types";

const STATUS_STYLES: Record<MaintenanceStatus, string> = {
  logged: "bg-warning/10 text-warning",
  assigned: "bg-primary/10 text-primary",
  in_progress: "bg-navy/10 text-navy",
  resolved: "bg-success/10 text-success",
};

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  logged: "Logged",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Resolved",
};

export default function StatusBadge({ status }: { status: MaintenanceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
