"use client";
import { useState } from "react";

export function ChatInput({ onSend }: { onSend: (message: string) => void }) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    if (!value.trim()) return;
    onSend(value);
    setValue("");
  };

  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Ask Clark about this lease..."
        className="flex-1 px-3 py-2 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
      <button
        type="button"
        onClick={handleSend}
        className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90"
      >
        Ask
      </button>
    </div>
  );
}