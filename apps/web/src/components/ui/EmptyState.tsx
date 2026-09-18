import { Inbox } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps{
    title: string;
    description?: string;
    action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
        <Inbox size={20} className="text-gray-400" />
      </div>
      <h3 className="block text-charcoal font-medium text-sm">{title}</h3>
      {description && (
        <p className="block text-sm text-gray-500 mt-2 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}