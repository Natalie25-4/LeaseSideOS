"use client";
import { useState } from "react";
import { ArrowUp, ChevronDown } from "lucide-react";
import { ClarkMessage } from "./ClarkMessage";
import { UserMessage } from "./UserMessage";
import { useLeaseStore } from "@/lib/leaseStore";

interface Message {
  role: "user" | "clark";
  text: string;
  clauseLabel?: string;
}

const SUGGESTED_PROMPTS = [
  "When is the next rent review?",
  "What are the maintenance obligations?",
  "What's the notice period for termination?",
  "Can the tenant sublet without consent?",
];

export function AskClarkPanel() {
  const { leases } = useLeaseStore();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedLease = leases[selectedIndex];

  const sendQuestion = async (question: string) => {
    if (!question.trim() || !selectedLease) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, clauses: selectedLease.clauses }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, { role: "clark", text: `Sorry, something went wrong: ${data.error}` }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "clark",
            text: data.answer,
            clauseLabel: data.sourcePage ? `Page ${data.sourcePage} · ${data.sourceCategory}` : undefined,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "clark", text: "Couldn't reach Clark's backend. Is the Python service running?" }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePickLease = (index: number) => {
    setSelectedIndex(index);
    setMessages([]); // switching leases starts a fresh conversation
    setPickerOpen(false);
  };

  return (
    <div className="bg-surface border border-border rounded-lg flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-charcoal mb-2">Ask Clark</h3>

        {leases.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setPickerOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-md border border-border text-xs text-charcoal hover:bg-gray-50"
            >
              <span className="truncate">{selectedLease?.filename ?? "Select a lease"}</span>
              <ChevronDown size={14} />
            </button>
            {pickerOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {leases.map((lease, i) => (
                  <button
                    key={i}
                    onClick={() => handlePickLease(i)}
                    className={
                      "w-full text-left px-3 py-2 text-xs hover:bg-gray-50 " +
                      (i === selectedIndex ? "bg-blue-50 text-primary" : "text-charcoal")
                    }
                  >
                    {lease.filename}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {leases.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm font-medium text-charcoal">Ask Clark anything</p>
            <p className="text-xs text-gray-500 mt-1 max-w-[220px]">
              Upload a lease first, then ask questions about it.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 gap-3">
            <p className="text-sm font-medium text-charcoal">Ask about {selectedLease?.filename}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendQuestion(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border text-gray-600 hover:bg-gray-50 hover:text-charcoal transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) =>
            msg.role === "user" ? (
              <UserMessage key={i} message={msg.text} />
            ) : (
              <ClarkMessage key={i} message={msg.text} clauseLabel={msg.clauseLabel} />
            )
          )
        )}
        {loading && (
          <div className="flex gap-1 px-1">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendQuestion(input)}
          placeholder={leases.length === 0 ? "Upload a lease first..." : "Ask about this lease..."}
          disabled={leases.length === 0}
          className="flex-1 px-3 py-2 rounded-md border border-border text-sm text-charcoal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50"
        />
        <button
          onClick={() => sendQuestion(input)}
          disabled={!input.trim() || leases.length === 0}
          className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center hover:bg-charcoal transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  );
}