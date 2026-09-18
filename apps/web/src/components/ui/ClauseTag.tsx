import { FileText } from "lucide-react";

export function ClauseTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-blue-50 text-primary text-xs px-2 py-1 rounded-md">
      <FileText size={12} />
      {label}
    </span>
  );
}