import type { Lease } from "../../lib/types";

const STATUS_STYLES: Record<Lease["status"], string> = {
  active: "bg-success/10 text-success",
  expiring: "bg-warning/10 text-warning",
  expired: "bg-critical/10 text-critical",
  under_review: "bg-primary/10 text-primary",
};

const STATUS_LABELS: Record<Lease["status"], string> = {
  active: "Active",
  expiring: "Expiring soon",
  expired: "Expired",
  under_review: "Under review",
};

export default function StatusBadge({ status }: { status: Lease["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
