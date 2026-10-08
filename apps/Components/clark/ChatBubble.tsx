interface ChatBubbleProps {
  role: "user" | "clark";
  message: string;
  confidence?: number;
  sourceClause?: string;
}

function ConfidenceBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-700">
      Confidence: {Math.round(score * 100)}%
    </span>
  );
}

export function ChatBubble({ role, message, confidence, sourceClause }: ChatBubbleProps) {
  const isClark = role === "clark";

  return (
    <div className={`flex ${isClark ? "justify-start" : "justify-end"} mb-3`}>
      <div
        className={`max-w-md rounded-lg px-4 py-3 text-sm ${
          isClark ? "bg-gray-50 text-charcoal" : "bg-primary text-white"
        }`}
      >
        <p>{message}</p>
        {isClark && sourceClause && (
          <p className="text-xs text-gray-500 mt-2 border-t border-border pt-2">
            Source: {sourceClause}
          </p>
        )}
        {isClark && confidence !== undefined && (
          <div className="mt-2">
            <ConfidenceBadge score={confidence} />
          </div>
        )}
      </div>
    </div>
  );
}