import { ConfidenceBadge } from "./ConfidenceBadge";

interface ChatBubbleProps {
  role: "user" | "clark";
  message: string;
  confidence?: number;
}

export function ChatBubble({ role, message, confidence }: ChatBubbleProps) {
  const isClark = role === "clark";

  return (
    <div className={`flex ${isClark ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-xl rounded-2xl px-4 py-3 shadow-sm ${
          isClark
            ? "border border-slate-200 bg-white text-slate-800"
            : "bg-slate-900 text-white"
        }`}
      >
        <p className="text-sm leading-6">{message}</p>
        {isClark && confidence !== undefined && (
          <div className="mt-3">
            <ConfidenceBadge score={confidence} />
          </div>
        )}
      </div>
    </div>
  );
}
