import { Router } from "express";
import { pool } from "../db.js";
import { env } from "../config/env.js";

export const portfolioRouter = Router();

/** Leases in the exact shape the dashboard's store already expects. */
portfolioRouter.get("/leases", async (_req, res) => {
  const { rows } = await pool.query(`
    select d.filename,
           coalesce(
             json_agg(
               json_build_object(
                 'category', case c.clause_type
                               when 'renewal' then 'renewal_option'
                               else c.clause_type
                             end,
                 'page',       c.page_number,
                 'text',       c.source_text,
                 'confidence', coalesce(c.confidence, 0)::float
               ) order by c.page_number, c.char_start
             ) filter (where c.id is not null),
             '[]'
           ) as clauses
      from documents d
      left join clauses c on c.document_id = d.id
     group by d.id
     order by d.created_at desc
  `);
  res.json(rows);
});

/** Same request/response contract as the existing /ask, backed by Postgres and the service. */
portfolioRouter.post("/ask", async (req, res) => {
  const question = String(req.body?.question ?? "").trim();
  if (!question) return res.status(400).json({ error: "question is required" });

  const posted = Array.isArray(req.body?.clauses) ? req.body.clauses : [];
  const clauses = posted
    .map((c: any) => ({
      clause_type: c.category ?? c.clause_type ?? "unknown",
      page_number: Number(c.page ?? c.page_number ?? 1),
      source_text: String(c.text ?? c.source_text ?? ""),
      clause_reference: c.clause_reference ?? null,
    }))
    .filter((c: any) => c.source_text);

  if (clauses.length === 0) {
    return res.status(409).json({ error: "no clauses supplied for this lease" });
  }

  const r = await fetch(`${env.LEASE_INTELLIGENCE_URL}/clauses/answer`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question, clauses }),
  });
  if (!r.ok) return res.status(502).json({ error: "answer failed" });

  const data = (await r.json()) as any;
  const cite = data.citations?.[0];

  res.json({
    answer: data.answer,
    sourcePage: cite?.page_number ?? null,
    sourceCategory: data.clause_type ?? null,
    confidence: data.verified ? 1 : 0,
  });
});