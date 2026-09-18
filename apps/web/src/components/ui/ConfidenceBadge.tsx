export function ConfidenceBadge({ score }: {score: number}){
    const percent = Math.round(score * 100);
    const isLow = score < 0.6;

    return (
        <span
         className={`īnline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isLow ? "bg-amber-50 text-warning border-warning/20" : "bg-emerald-50 text-success border-success/20"}`}

            >
                {percent}% confidence
            </span>
         
    );
}