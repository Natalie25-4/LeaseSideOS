type Status = "active" | "expiring" | "expired" | "under_review";

const styles: Record<Status, string> ={
    active: "bg-emerald-50 text-succes border-success/20",
    expiring: "bg-amber-50 text-warning border-warning/20",
    expired: "bg-red-50 text-critical border-critical/20",
    under_review: "bg-blue-50 text-primary border-primary/20",
};

const labels: Record<Status, string> = {
    active: "Active",
    expiring: "Expiring",
    expired: "Expired",
    under_review: "Under review",
};

export function StatusBadge({status}: {status: Status}){
    return(
    <span className = {`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
    {labels[status]}
    </span>
);
}