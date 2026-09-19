import { calculateConfidence } from "@/app/lib/confidence";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question =
    typeof body === "object" && body !== null && "question" in body
      ? (body as { question?: unknown }).question
      : undefined;

  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json(
      { error: "Question is required" },
      { status: 400 },
    );
  }

  const confidence = calculateConfidence(question);

  return NextResponse.json({
    question: question.trim(),
    answer:
      "Clark found information related to your question. Connect the lease extraction service to replace this demonstration answer with evidence from the uploaded lease.",
    sourceClause: null,
    confidence,
  });
}
