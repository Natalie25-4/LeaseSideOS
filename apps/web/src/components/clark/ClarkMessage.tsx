import { FileText } from "lucide-react";

interface ClarkMessageProps {
  message: string;
  clauseLabel?: string;
  showActions?: boolean;
}

export function ClarkMessage({ message, clauseLabel, showActions }: ClarkMessageProps) {
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] bg-navy text-white rounded-lg px-4 py-3 text-sm">
        <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">Clark · AI generated</p>
        <p>{message}</p>
        {clauseLabel && (
          <p className="flex items-center gap-1 text-xs text-slate-300 mt-2">
            <FileText size={12} />
            {clauseLabel}
          </p>
        )}
        {showActions && (
          <div className="flex gap-2 mt-3">
            <button className="text-xs bg-white/10 hover:bg-white/20 rounded px-2.5 py-1 transition-colors">
              Open clause
            </button>
            <button className="text-xs bg-white/10 hover:bg-white/20 rounded px-2.5 py-1 transition-colors">
              Create task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}