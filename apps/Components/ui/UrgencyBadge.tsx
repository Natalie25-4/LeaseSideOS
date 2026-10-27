/* clarks Critical/high/medium/low tasks*/

type Urgency = "critical" | "high" | "medium" | "low";

const styles: Record<Urgency, string> = {
    critical: "bg-red-50 text-critical border-critical/20",
    high: "bg-orange-50 text-orange-600 border-orange-200",
    medium: "bg-amber-50 text-warning border-warning/20",
    low: "bg-emerald-50 text-success border-success/20",
};

const labels: Record<Urgency, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
};

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[urgency]}`}>
            {labels[urgency]}
        </span>
    );
}