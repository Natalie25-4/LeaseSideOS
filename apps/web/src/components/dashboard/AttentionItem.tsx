import { PriorityTag } from "./PriorityTag";
import { ClauseTag } from "@/components/ui/ClauseTag";
import { Button } from "@/components/ui/Button";

interface AttentionItemProps {
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  clauseLabel: string;
  actionLabel: string;
}

export function AttentionItem({ priority, title, description, clauseLabel, actionLabel }: AttentionItemProps) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-border last:border-0">
      <div className="flex gap-3">
        <div className="pt-0.5">
          <PriorityTag priority={priority} />
        </div>
        <div>
          <p className="text-sm font-semibold text-charcoal">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          <div className="mt-2">
            <ClauseTag label={clauseLabel} />
          </div>
        </div>
      </div>
      <Button variant="secondary" className="text-xs px-3 py-1.5 whitespace-nowrap">
        {actionLabel}
      </Button>
    </div>
  );
}