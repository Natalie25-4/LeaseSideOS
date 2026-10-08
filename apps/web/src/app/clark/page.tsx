"use client";

import { FormEvent, useState } from "react";
import { ChatBubble } from "@/app/components/clark/ChatBubble";

interface Message {
  id: number;
  role: "user" | "clark";
  message: string;
  confidence?: number;
}

interface ClarkResponse {
  answer?: string;
  confidence?: number;
  error?: string;
}

export default function ClarkPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "clark",
      message: "Ask me a question about a lease. Every answer includes a confidence score.",
      confidence: 0.95,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isLoading) return;

    setQuestion("");
    setIsLoading(true);
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", message: trimmedQuestion },
    ]);

    try {
      const response = await fetch("/api/clark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion }),
      });
      const data = (await response.json()) as ClarkResponse;

      if (!response.ok || typeof data.answer !== "string") {
        throw new Error(data.error ?? "Clark could not answer the question");
      }

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "clark",
          message: data.answer as string,
          confidence: data.confidence,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "clark",
          message:
            error instanceof Error ? error.message : "Clark could not answer the question",
          confidence: 0,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <section className="mx-auto flex min-h-[75vh] max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-xl">
        <header className="border-b border-slate-200 bg-white px-6 py-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Lease intelligence
          </p>
          <h1 className="mt-1 text-2xl font-bold">Ask Clark</h1>
          <p className="mt-1 text-sm text-slate-500">
            Confidence is shown as a percentage on every Clark answer.
          </p>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          {messages.map((message) => (
            <ChatBubble key={message.id} {...message} />
          ))}
          {isLoading && <p className="text-sm text-slate-500">Clark is checking the lease…</p>}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3 border-t border-slate-200 bg-white p-4">
          <label htmlFor="question" className="sr-only">
            Ask Clark a question
          </label>
          <input
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="When does this lease expire?"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isLoading ? "Checking…" : "Ask"}
          </button>
        </form>
      </section>
    </main>
  );
}
