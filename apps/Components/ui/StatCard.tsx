export function StatCard ({ label, value, tone = "default"}: {label: string; value: string | number; tone?: "default" | "critical" | "success"}){
    const toneStyles ={
        default: "text-charcoal",
        critical: "text-critical",
        success: "text-success",
    };

    return (
        <div className="bg-surface border border-border rounded-lg p-5">
            <p className= "text-sm text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${toneStyles[tone]}`}>{value}</p>
        </div>
    );
}